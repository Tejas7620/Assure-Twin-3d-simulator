"""
time_stepper.py - Stateful Physics Integration Engine with Accumulated State Preservation.
Implements:
1. Coupled physics evaluation across all 15 engineering domains.
2. Stateful persistence: heated reservoir volume, cumulative oil, pressure drawdown, fatigue cycles.
3. Declarative 43-parameter workbench coupling with atomic next-step application.
4. Deep-copy cloning for preview isolation and scenario analysis without corrupting live state.
5. High-resolution kinematic synchronization for 3D simulator telemetry.
"""

import copy
import math
from typing import Dict, Any, Optional

from ..physics.fluids import FluidProperties
from ..physics.thermal import ThermalModel
from ..physics.reservoir import ReservoirModel
from ..physics.tubing import TubingTemperatureModel
from ..physics.inflow import CompositeInflowModel
from ..physics.wellbore import WellboreHydraulicsModel
from ..physics.rod_string import TaperedRodStringModel
from ..physics.srp import SRPKinematicsModel
from ..physics.drag import RodViscousDragModel
from ..physics.float_model import RodFloatModel
from ..physics.impact import ImpactLoadingModel
from ..physics.dynamometer import DynamometerModel
from ..physics.pump import DownholePumpModel
from ..physics.production import ProductionModel
from ..physics.economics import EconomicsModel

from .parameters import ParameterRegistry
from .css_engine import CSSEngine

class StatefulTwinEngine:
    def __init__(self, well_id: str = "BW-01"):
        self.well_id = well_id

        # 1. 43-Parameter Registry
        self.params = ParameterRegistry()

        # 2. Physics Subsystem Models
        self.fluid = FluidProperties(
            mu_ref_cp=self.params.get_value("mu_ref_cp"),
            t_ref_c=self.params.get_value("t_ref_c"),
            activation_energy_b=self.params.get_value("visc_energy_b"),
            api_gravity=self.params.get_value("api_gravity"),
            water_cut=self.params.get_value("water_cut")
        )
        self.thermal = ThermalModel(
            ambient_temp_c=self.params.get_value("temp_res_c"),
            steam_temp_c=self.params.get_value("steam_temp_c"),
            pay_zone_thickness_m=self.params.get_value("pay_thickness_m")
        )
        self.reservoir = ReservoirModel(
            initial_pressure_bar=self.params.get_value("p_res_bar"),
            ambient_temp_c=self.params.get_value("temp_res_c"),
            drainage_radius_m=self.params.get_value("drainage_r_m"),
            wellbore_radius_m=self.params.get_value("wellbore_r_m"),
            absolute_permeability_md=self.params.get_value("perm_md"),
            porosity=self.params.get_value("porosity"),
            pay_zone_thickness_m=self.params.get_value("pay_thickness_m")
        )
        self.tubing = TubingTemperatureModel(
            well_depth_m=self.params.get_value("well_depth_m"),
            tubing_id_in=self.params.get_value("tubing_id_in"),
            tubing_od_in=self.params.get_value("tubing_od_in")
        )
        self.inflow = CompositeInflowModel(
            wellbore_radius_m=self.params.get_value("wellbore_r_m"),
            drainage_radius_m=self.params.get_value("drainage_r_m"),
            pay_zone_thickness_m=self.params.get_value("pay_thickness_m"),
            permeability_md=self.params.get_value("perm_md"),
            bubble_point_bar=self.params.get_value("bubble_point_bar"),
            skin_factor=self.params.get_value("skin_factor")
        )
        self.wellbore = WellboreHydraulicsModel(
            tubing_id_in=self.params.get_value("tubing_id_in"),
            well_depth_m=self.params.get_value("well_depth_m"),
            surface_backpressure_bar=self.params.get_value("surface_pressure_bar")
        )
        self.rod_string = TaperedRodStringModel(total_depth_m=self.params.get_value("well_depth_m"))
        self.srp_kinematics = SRPKinematicsModel(pitman_length_m=self.params.get_value("pitman_len_m"))
        self.drag = RodViscousDragModel(tubing_id_in=self.params.get_value("tubing_id_in"))
        self.float_model = RodFloatModel()
        self.impact = ImpactLoadingModel()
        self.dynamometer = DynamometerModel(num_points=48)
        self.pump = DownholePumpModel(
            plunger_diameter_in=self.params.get_value("plunger_diam_in"),
            radial_clearance_in=self.params.get_value("plunger_clearance_in"),
            mechanical_efficiency=self.params.get_value("pump_mech_eff")
        )
        self.production = ProductionModel()
        self.economics = EconomicsModel(
            oil_price_usd_bbl=self.params.get_value("oil_price_usd_bbl"),
            steam_cost_usd_ton=self.params.get_value("steam_cost_usd_ton"),
            electricity_tariff_usd_kwh=self.params.get_value("elec_tariff_kwh"),
            water_disposal_cost_usd_bbl=self.params.get_value("water_cost_bbl")
        )

        # 3. CSS Lifecycle Engine
        self.css = CSSEngine(
            cycle_number=1,
            initial_phase="PRODUCTION",
            steam_rate_t_d=self.params.get_value("steam_rate_t_d"),
            steam_volume_target_t=self.params.get_value("steam_volume_target_t"),
            soak_days=self.params.get_value("soak_days"),
            cutoff_temp_c=self.params.get_value("production_cutoff_temp_c")
        )

        # 4. Simulation Clock
        self.sim_time_days = 30.0
        self.time_scale = 1.0
        self.is_running = True
        self.active_scenario = "CURRENT PRACTICE"

        # 5. Live Kinematic States (high frequency 3D sync)
        self.crank_angle_rad = 0.0

        # Cached state
        self._last_state: Dict[str, Any] = {}
        self.step(0.01)

    def set_parameter(self, key: str, value: float) -> bool:
        """Sets a parameter and synchronizes corresponding model instance."""
        ok = self.params.set_value(key, value)
        if ok:
            # Sync key into specific model
            if key in ["mu_ref_cp", "t_ref_c", "visc_energy_b", "api_gravity", "water_cut"]:
                self.fluid.update_calibration(
                    mu_ref=self.params.get_value("mu_ref_cp"),
                    t_ref=self.params.get_value("t_ref_c"),
                    b=self.params.get_value("visc_energy_b")
                )
                self.fluid.water_cut = self.params.get_value("water_cut")
            elif key == "oil_price_usd_bbl":
                self.economics.oil_price_usd_bbl = float(value)
            elif key == "steam_cost_usd_ton":
                self.economics.steam_cost_usd_ton = float(value)
            elif key in ["heater_power_kw", "heater_kw"]:
                self.thermal.heater_power_w = float(value) * 1000.0
            elif key == "heater_efficiency":
                self.thermal.heater_efficiency = float(value)
        return ok

    def step(self, dt_real_sec: float) -> Dict[str, Any]:
        """
        Advances the entire coupled physics loop by real-time delta dt_real_sec.
        dt_sim_days = dt_real_sec * 0.2 * time_scale.
        """
        if not self.is_running:
            return self._last_state

        dt_sim_days = dt_real_sec * 0.2 * self.time_scale
        self.sim_time_days += dt_sim_days

        # Pumping and downhole heating controls from parameter registry
        spm = self.params.get_value("spm")
        stroke_in = self.params.get_value("stroke_inches")
        stroke_m = stroke_in * 0.0254
        heater_power_kw = self.params.get_value("heater_power_kw", default=0.0)
        heater_power_w = heater_power_kw * 1000.0

        # Crank rotation step: omega = 2 * pi * SPM / 60
        omega = (spm * 2.0 * math.pi) / 60.0
        self.crank_angle_rad = (self.crank_angle_rad + omega * dt_real_sec) % (2.0 * math.pi)

        # 1. Crank-slider Kinematics
        kinematics = self.srp_kinematics.calculate_kinematics_at_angle(self.crank_angle_rad, stroke_m, spm)
        alpha_up, alpha_down = self.srp_kinematics.get_peak_acceleration_factors(stroke_m, spm)

        # 2. CSS Lifecycle Step
        css_state = self.css.step(
            dt_days=dt_sim_days,
            current_temp_c=self.thermal.near_well_temp_c,
            oil_rate_m3_d=self.production.cumulative_oil_m3 / max(1.0, self.sim_time_days)
        )

        # 3. Thermal Model Step (Coupled steam + electric downhole heater)
        steam_rate = self.params.get_value("steam_rate_t_d") if css_state["is_injecting"] else 0.0
        near_well_temp, r_heated = self.thermal.step(
            dt_days=dt_sim_days,
            steam_rate_t_d=steam_rate,
            is_injecting=css_state["is_injecting"],
            is_cooling=css_state["is_cooling"] or css_state["is_soaking"],
            liquid_rate_m3_d=self._last_state.get("production", {}).get("liquid_rate_m3_d", 12.0),
            heater_power_w=heater_power_w
        )

        # 4. Fluid Viscosities in Heated and Cold Zones
        visc_heated = self.fluid.calculate_viscosity(near_well_temp)
        visc_cold = self.fluid.calculate_viscosity(self.params.get_value("temp_res_c"))

        # 5. Tubing Depth-Dependent Temperature and Viscosity Profiles
        tubing_profiles = self.tubing.calculate_profiles(
            downhole_temp_c=near_well_temp,
            production_rate_m3_d=self._last_state.get("production", {}).get("liquid_rate_m3_d", 12.0),
            fluid_model=self.fluid,
            oil_cut=1.0 - self.params.get_value("water_cut")
        )

        # 6. Reservoir State and Inflow IPR
        p_res = self.reservoir.get_effective_pressure_bar()
        p_wf = self.params.get_value("surface_pressure_bar") + 15.0 # Typical flowing bottomhole pressure
        inflow_res = self.inflow.calculate_inflow(
            p_res_bar=p_res,
            p_wf_bar=p_wf,
            r_heated_m=r_heated,
            viscosity_heated_cp=visc_heated,
            viscosity_cold_cp=visc_cold
        )

        # 7. Pump Displacement and Performance
        diff_pressure = max(10.0, 55.0 - p_wf) # Pump differential head
        pump_perf = self.pump.evaluate_performance(
            stroke_inches=stroke_in,
            spm=spm,
            inflow_rate_m3_d=inflow_res["q_liquid_m3_d"],
            differential_pressure_bar=diff_pressure,
            viscosity_cp=visc_heated
        )

        # 8. Production Coupling
        prod_res = self.production.compute_production(
            inflow_rate_m3_d=inflow_res["q_liquid_m3_d"],
            pump_capacity_m3_d=pump_perf["liquid_lifted_m3_d"],
            water_cut=self.params.get_value("water_cut"),
            dt_days=dt_sim_days
        )

        # Update reservoir state with produced volumes
        self.reservoir.update_state(
            dt_days=dt_sim_days,
            temp_heated_c=near_well_temp,
            r_heated_m=r_heated,
            injection_rate_t_d=steam_rate,
            production_rate_m3_d=prod_res["liquid_rate_m3_d"],
            viscosity_heated_cp=visc_heated,
            viscosity_cold_cp=visc_cold
        )

        # 9. Sucker Rod String Buoyancy and Viscous Drag
        avg_density = self.fluid.calculate_density(tubing_profiles["downhole_temp_c"])
        buoyancy = self.rod_string.calculate_buoyant_weight(avg_density)

        drag_up = self.drag.calculate_integrated_drag(
            tubing_profiles=tubing_profiles,
            rod_string=self.rod_string,
            rod_velocity_m_s=abs(kinematics["velocity_m_s"]),
            is_upstroke=True,
            fluid_model=self.fluid
        )
        drag_down = self.drag.calculate_integrated_drag(
            tubing_profiles=tubing_profiles,
            rod_string=self.rod_string,
            rod_velocity_m_s=abs(kinematics["velocity_m_s"]),
            is_upstroke=False,
            fluid_model=self.fluid
        )

        # Breakout Force Analysis (Feature 3: Herschel-Bulkley Gel Yield Stress)
        breakout_res = self.drag.calculate_breakout_force(
            tubing_profiles=tubing_profiles,
            rod_string=self.rod_string,
            fluid_model=self.fluid,
            fluid_density_kg_m3=avg_density
        )

        # 10. Rod Float Analysis
        float_res = self.float_model.analyze_float(
            rod_string=self.rod_string,
            buoyant_weight_n=buoyancy["buoyant_weight_kn"] * 1000.0,
            total_weight_air_n=self.rod_string.total_weight_air_n,
            downstroke_drag_n=drag_down["drag_force_n"],
            downstroke_accel_factor=alpha_down,
            depths_m=tubing_profiles["depths_m"],
            viscosities_cp=tubing_profiles["viscosities_cp"]
        )

        # 11. Impact Loading
        top_rod_area = self.rod_string.sections[0].area_m2
        impact_res = self.impact.evaluate_impacts(
            pump_fillage=pump_perf["pump_fillage"],
            rod_float_status=float_res["status"],
            plunger_velocity_m_s=kinematics["velocity_m_s"],
            top_rod_area_m2=top_rod_area,
            stroke_inches=stroke_in,
            spm=spm
        )

        # 12. Fluid Load on Plunger
        # F_fluid = A_plunger * (P_discharge - P_intake)
        p_discharge_pa = (self.params.get_value("surface_pressure_bar") + 85.0) * 1e5
        p_intake_pa = p_wf * 1e5
        fluid_load_n = self.pump.area_m2 * (p_discharge_pa - p_intake_pa)
        fluid_load_kn = fluid_load_n / 1000.0

        # 13. Dynamometer Synthesis
        dyno_res = self.dynamometer.generate_cards(
            stroke_inches=stroke_in,
            spm=spm,
            buoyant_weight_kn=buoyancy["buoyant_weight_kn"],
            fluid_load_kn=fluid_load_kn,
            upstroke_drag_kn=drag_up["drag_force_kn"],
            downstroke_drag_kn=drag_down["drag_force_kn"],
            upstroke_accel_factor=alpha_up,
            downstroke_accel_factor=alpha_down,
            pump_fillage=pump_perf["pump_fillage"],
            rod_float_status=float_res["status"],
            fluid_pound_magnitude_kn=impact_res["pound_magnitude_kn"]
        )

        # 14. Economics
        econ_res = self.economics.calculate_daily_economics(
            oil_rate_bpd=prod_res["oil_rate_bpd"],
            water_rate_bpd=prod_res["water_rate_bpd"],
            steam_rate_t_d=steam_rate,
            motor_power_kw=dyno_res["prhp_kw"] / self.params.get_value("motor_eff"),
            dt_days=dt_sim_days,
            heater_power_kw=heater_power_kw,
            elec_tariff_inr_kwh=self.params.get_value("elec_tariff_inr_kwh", default=8.50),
            boiler_efficiency=self.params.get_value("boiler_efficiency", default=0.85)
        )

        # 15. Wellbore Hydraulics
        hydraulics = self.wellbore.calculate_hydraulics(
            liquid_rate_m3_d=prod_res["liquid_rate_m3_d"],
            average_density_kg_m3=avg_density,
            average_viscosity_cp=tubing_profiles["average_viscosity_cp"]
        )

        state = {
            "well_id": self.well_id,
            "sim_time_days": round(self.sim_time_days, 2),
            "time_scale": self.time_scale,
            "is_running": self.is_running,
            "scenario": self.active_scenario,
            "controls": {
                "spm": round(spm, 1),
                "stroke_inches": round(stroke_in, 1),
                "steam_rate_t_d": round(steam_rate, 1),
                "heater_power_kw": round(heater_power_kw, 2),
                "heater_power_w": round(heater_power_w, 1),
                "water_cut": self.params.get_value("water_cut")
            },
            "kinematics": kinematics,
            "css": css_state,
            "thermal": self.thermal.get_state(),
            "reservoir": self.reservoir.get_state(),
            "fluid": {
                "viscosity_near_well_cp": round(visc_heated, 1),
                "viscosity_cold_res_cp": round(visc_cold, 1),
                "viscosity_wellhead_cp": round(tubing_profiles["viscosities_cp"][0], 1)
            },
            "tubing_profiles": tubing_profiles,
            "inflow": inflow_res,
            "pump": pump_perf,
            "production": prod_res,
            "loads": {
                "pprl_kn": dyno_res["pprl_kn"],
                "mprl_kn": dyno_res["mprl_kn"],
                "buoyant_weight_kn": buoyancy["buoyant_weight_kn"],
                "fluid_load_kn": round(fluid_load_kn, 2),
                "drag_up_kn": drag_up["drag_force_kn"],
                "drag_down_kn": drag_down["drag_force_kn"],
                "float_margin_pct": float_res["float_margin_pct"],
                "float_index": float_res["float_index"],
                "rod_float_status": float_res["status"],
                "is_buckling": float_res["is_buckling"],
                "compression_depth_m": float_res["compression_depth_m"],
                "breakout": breakout_res
            },
            "breakout": breakout_res,
            "impact": impact_res,
            "dynamometer": dyno_res,
            "hydraulics": hydraulics,
            "economics": econ_res,
            "thermal_slice": self.thermal.get_summary_slice()
        }
        self._last_state = state
        return state

    def clone(self) -> "StatefulTwinEngine":
        """Deep copy for preview isolation or what-if scenario testing."""
        return copy.deepcopy(self)
