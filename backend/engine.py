"""
engine.py
Central authoritative physics simulation engine.
Integrates Reservoir, Thermal, Viscosity, Inflow, SRP, Pump, Production, and Economics.
Publishes simulationState to WebSocket clients.
"""

import time
import math
from typing import Dict, Any

from .viscosity import ViscosityModel
from .thermal import ThermalModel
from .reservoir import ReservoirModel
from .inflow import InflowModel
from .pump import DownholePumpModel
from .production import ProductionModel
from .srp import SRPDynamicsModel
from .economics import EconomicsModel

class SimulationEngine:
    def __init__(self):
        # 1. Initialize Subsystem Models
        self.viscosity_model = ViscosityModel()
        self.thermal_model = ThermalModel()
        self.reservoir_model = ReservoirModel()
        self.inflow_model = InflowModel()
        self.pump_model = DownholePumpModel()
        self.production_model = ProductionModel()
        self.srp_model = SRPDynamicsModel()
        self.economics_model = EconomicsModel()

        # 2. Simulation Time Controls
        self.sim_time_days = 30.0   # Default starting at Day 30
        self.time_scale = 1.0       # Speed multiplier (1x, 2x, 5x, 20x, 100x)
        self.is_running = True

        # 3. User Controls (Authoritative)
        self.spm = 3.2
        self.stroke_inches = 64.0
        self.steam_volume_t_d = 42.3 # Steam injection rate (t/h or t/d)
        self.water_cut = 0.128       # 12.8%
        self.pwf_bar = 18.2          # Flowing bottomhole pressure
        self.injection_pressure_bar = 18.6
        self.soak_time_days = 5.0
        self.active_scenario = "JOINT" # "CURRENT PRACTICE", "CSS ONLY", "SRP ONLY", "JOINT"

        # CSS Cycle State: INJECTION, SOAK, PRODUCTION, COOLING
        self.css_phase = "PRODUCTION"
        self.phase_time_elapsed = 0.0

        # Kinematics state for 3D pumpjack & downhole pump synchronization
        self.crank_angle_rad = 0.0
        self.rod_displacement_m = 0.0

        # Demo sequence states
        self.demo_mode = None
        self.demo_timer = 0.0

        # Cache of latest state
        self._last_state: Dict[str, Any] = {}
        self.step(0.01)

    def set_control(self, param: str, value: Any):
        """
        Updates an authoritative control parameter and triggers immediate physics update.
        """
        if param == "spm":
            self.spm = max(0.5, min(12.0, float(value)))
        elif param == "stroke_inches":
            self.stroke_inches = max(24.0, min(120.0, float(value)))
        elif param == "steam_volume":
            self.steam_volume_t_d = max(0.0, min(150.0, float(value)))
        elif param == "water_cut":
            self.water_cut = max(0.0, min(0.95, float(value)))
        elif param == "pwf_bar":
            self.pwf_bar = max(5.0, min(65.0, float(value)))
        elif param == "time_scale":
            self.time_scale = max(0.1, min(200.0, float(value)))
        elif param == "scenario":
            self.set_scenario(str(value))
        elif param == "css_phase":
            self.css_phase = str(value)
        elif param == "is_running":
            self.is_running = bool(value)

    def set_scenario(self, scenario_name: str):
        self.active_scenario = scenario_name
        if scenario_name == "CSS ONLY":
            self.spm = 0.5
            self.steam_volume_t_d = 50.0
            self.css_phase = "INJECTION"
        elif scenario_name == "SRP ONLY":
            self.spm = 3.2
            self.steam_volume_t_d = 0.0
            self.css_phase = "PRODUCTION"
        elif scenario_name == "CURRENT PRACTICE":
            self.spm = 2.4
            self.stroke_inches = 48.0
            self.steam_volume_t_d = 20.0
            self.css_phase = "PRODUCTION"
        elif scenario_name == "JOINT":
            self.spm = 3.2
            self.stroke_inches = 64.0
            self.steam_volume_t_d = 42.3
            self.css_phase = "PRODUCTION"

    def start_physics_demo(self):
        """
        Runs the full causal physics demo sequence:
        Day 30 cooling -> Viscosity up -> Rod load up -> Float margin down -> Production down ->
        Start CSS -> Steam flows -> Thermal front expands -> Temp up -> Viscosity down -> Production up!
        """
        self.demo_mode = "PHYSICS_DEMO"
        self.demo_timer = 0.0
        self.sim_time_days = 30.0
        self.css_phase = "COOLING"
        self.steam_volume_t_d = 0.0
        self.time_scale = 5.0

    def start_spm_experiment(self):
        """
        Runs the SPM experiment: 5 cycles at SPM 2.0 then 5 cycles at SPM 4.0.
        """
        self.demo_mode = "SPM_EXPERIMENT"
        self.demo_timer = 0.0
        self.spm = 2.0
        self.time_scale = 1.0

    def step(self, dt_real_sec: float) -> Dict[str, Any]:
        """
        Main physics timestep step.
        dt_real_sec: Wall clock delta in seconds.
        """
        if not self.is_running:
            return self._last_state

        # Convert wall-clock time to simulation time in days
        # Base: 1 real second = 0.2 sim days at 1x
        dt_sim_days = (dt_real_sec * 0.2 * self.time_scale)
        self.sim_time_days += dt_sim_days

        # Handle automated demos
        if self.demo_mode == "PHYSICS_DEMO":
            self.demo_timer += dt_real_sec
            if self.demo_timer < 6.0:
                self.css_phase = "COOLING"
                self.steam_volume_t_d = 0.0
            elif self.demo_timer < 14.0:
                self.css_phase = "INJECTION"
                self.steam_volume_t_d = 55.0
            else:
                self.css_phase = "PRODUCTION"
                self.steam_volume_t_d = 0.0
                if self.demo_timer > 20.0:
                    self.demo_mode = None

        elif self.demo_mode == "SPM_EXPERIMENT":
            self.demo_timer += dt_real_sec
            if self.demo_timer < 8.0:
                self.spm = 2.0
            elif self.demo_timer < 16.0:
                self.spm = 4.0
            else:
                self.spm = 3.2
                self.demo_mode = None

        # 1. Update Crank Kinematics & Rod Motion
        omega = (self.spm * 2.0 * math.pi) / 60.0
        self.crank_angle_rad = (self.crank_angle_rad + omega * dt_real_sec) % (2.0 * math.pi)
        stroke_m = self.stroke_inches * 0.0254
        # Polished rod vertical position normalized [0, stroke_m]
        self.rod_displacement_m = (stroke_m / 2.0) * (1.0 - math.cos(self.crank_angle_rad))

        # 2. Thermal Energy Transport
        is_injecting = (self.css_phase == "INJECTION") and (self.steam_volume_t_d > 0.0)
        is_cooling = (self.css_phase in ["COOLING", "PRODUCTION"]) and (self.steam_volume_t_d <= 0.0)
        near_well_temp_c, thermal_front_r_m = self.thermal_model.step(
            dt_sim_days, self.steam_volume_t_d, is_injecting, is_cooling
        )

        # 3. Viscosity Evaluation
        viscosity_cp = self.viscosity_model.calculate_viscosity(near_well_temp_c)

        # 4. Reservoir Pressure & Inflow
        res_pressure_bar = self.reservoir_model.current_pressure_bar
        inflow_bpd = self.inflow_model.calculate_inflow(
            res_pressure_bar, self.pwf_bar, self.reservoir_model.permeability_md, viscosity_cp
        )

        # 5. Downhole Pump Hydraulic Performance
        is_pumping = self.css_phase != "INJECTION"
        pump_eval = self.pump_model.evaluate_pump_state(
            self.stroke_inches, self.spm, inflow_bpd, viscosity_cp
        )

        # 6. Actual Surface Production Rates
        prod_eval = self.production_model.calculate_production(
            inflow_bpd, pump_eval["pump_capacity_bpd"],
            pump_eval["pump_efficiency"], pump_eval["pump_fillage"],
            self.water_cut, is_pumping, dt_sim_days
        )

        # Update reservoir material balance
        self.reservoir_model.step(prod_eval["cumulative_liquid_bbl"], self.economics_model.cumulative_steam_tons)

        # 7. Sucker Rod Dynamics & Live Dynamometer Card
        srp_eval = self.srp_model.calculate_loads_and_dyno(
            self.stroke_inches, self.spm, viscosity_cp, pump_eval["pump_fillage"]
        )

        # 8. Power Consumption & Steam-to-Oil Ratio
        steam_rate_t_d = self.steam_volume_t_d if is_injecting else 0.0
        econ_eval = self.economics_model.calculate_energy_and_sor(
            self.spm, self.stroke_inches, srp_eval["pprl_kn"],
            prod_eval["oil_rate_bopd"], steam_rate_t_d,
            prod_eval["cumulative_oil_bbl"], dt_sim_days
        )

        # Assemble authoritative simulation state payload
        self._last_state = {
            "time": {
                "sim_time_days": round(self.sim_time_days, 1),
                "time_scale": self.time_scale,
                "css_phase": self.css_phase,
                "demo_mode": self.demo_mode
            },
            "controls": {
                "spm": round(self.spm, 1),
                "stroke_inches": round(self.stroke_inches, 1),
                "stroke_m": round(stroke_m, 2),
                "steam_volume_t_d": round(self.steam_volume_t_d, 1),
                "water_cut": round(self.water_cut, 3),
                "water_cut_pct": round(self.water_cut * 100, 1),
                "pwf_bar": round(self.pwf_bar, 1),
                "scenario": self.active_scenario
            },
            "kinematics": {
                "crank_angle_rad": round(self.crank_angle_rad, 3),
                "crank_angle_deg": round(math.degrees(self.crank_angle_rad), 1),
                "rod_displacement_m": round(self.rod_displacement_m, 3),
                "stroke_phase": "UPSTROKE" if self.crank_angle_rad <= math.pi else "DOWNSTROKE"
            },
            "reservoir": {
                "pressure_bar": round(res_pressure_bar, 1),
                "temperature_c": round(near_well_temp_c, 1),
                "viscosity_cp": round(viscosity_cp, 1),
                "thermal_front_m": round(thermal_front_r_m, 2),
                "porosity_pct": 22.4,
                "permeability_md": 1250,
                "oil_saturation": 0.68,
                "inflow_bpd": round(inflow_bpd, 1)
            },
            "pump": pump_eval,
            "production": prod_eval,
            "srp": srp_eval,
            "economics": econ_eval,
            "thermal_grid_slice": self.thermal_model.get_summary_slice()
        }

        return self._last_state
