"""
parameters.py - Declarative 43-Parameter Workbench Registry for ASSURE-TWIN.
Defines all operational, reservoir, fluid, completion, pump/rod, CSS, and economic controls.
Matches technical reference architecture with strong typing, bounds clamping, and metadata.
"""

from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field

class ParameterDefinition(BaseModel):
    key: str
    name: str
    group: str # "reservoir", "fluid", "completion", "pump_rod", "operation", "css", "economics"
    unit: str
    min_value: float
    max_value: float
    default_value: float
    current_value: float
    step_size: float
    description: str
    is_optimizable: bool = False

class ParameterRegistry:
    def __init__(self):
        self._definitions: Dict[str, ParameterDefinition] = {}
        self._build_registry()

    def _register(
        self,
        key: str,
        name: str,
        group: str,
        unit: str,
        min_val: float,
        max_val: float,
        default_val: float,
        step: float,
        desc: str,
        optimizable: bool = False
    ):
        self._definitions[key] = ParameterDefinition(
            key=key,
            name=name,
            group=group,
            unit=unit,
            min_value=min_val,
            max_value=max_val,
            default_value=default_val,
            current_value=default_val,
            step_size=step,
            description=desc,
            is_optimizable=optimizable
        )

    def _build_registry(self):
        # GROUP 1: RESERVOIR / ROCK (8 Parameters)
        self._register("perm_md", "Permeability", "reservoir", "mD", 100.0, 5000.0, 1850.0, 50.0, "Absolute horizontal reservoir permeability")
        self._register("porosity", "Porosity", "reservoir", "frac", 0.15, 0.40, 0.28, 0.01, "Effective reservoir rock porosity")
        self._register("pay_thickness_m", "Pay Thickness", "reservoir", "m", 4.0, 30.0, 12.0, 0.5, "Net pay zone thickness")
        self._register("p_res_bar", "Initial Reservoir Pressure", "reservoir", "bar", 10.0, 60.0, 24.5, 0.5, "Undisturbed reservoir pore pressure")
        self._register("temp_res_c", "Ambient Reservoir Temp", "reservoir", "°C", 35.0, 80.0, 52.0, 1.0, "Initial reservoir formation temperature")
        self._register("rock_heat_cap", "Rock Heat Capacity", "reservoir", "MJ/m³·K", 1.5, 3.5, 2.2, 0.1, "Volumetric rock matrix heat capacity")
        self._register("rock_conduct", "Rock Conductivity", "reservoir", "W/m·K", 1.0, 3.5, 1.8, 0.1, "Overburden thermal conductivity")
        self._register("drainage_r_m", "Drainage Radius", "reservoir", "m", 50.0, 300.0, 120.0, 10.0, "Outer reservoir boundary radius")

        # GROUP 2: FLUID (7 Parameters)
        self._register("api_gravity", "API Gravity", "fluid", "°API", 10.0, 25.0, 17.5, 0.5, "Crude oil API gravity")
        self._register("mu_ref_cp", "Reference Viscosity", "fluid", "cP", 1000.0, 50000.0, 10000.0, 500.0, "Dead oil viscosity at reference temperature")
        self._register("t_ref_c", "Reference Temperature", "fluid", "°C", 10.0, 50.0, 20.0, 1.0, "Reference temperature for viscosity anchor")
        self._register("visc_energy_b", "Viscosity Act. Energy (b)", "fluid", "K", 2000.0, 6000.0, 3800.0, 50.0, "Andrade equation temperature sensitivity coefficient")
        self._register("water_cut", "Water Cut", "fluid", "frac", 0.0, 0.95, 0.128, 0.01, "Produced water volume fraction", optimizable=False)
        self._register("gas_oil_ratio", "Gas Oil Ratio", "fluid", "m³/m³", 1.0, 50.0, 12.0, 1.0, "Solution gas-oil ratio")
        self._register("bubble_point_bar", "Bubble Point Pressure", "fluid", "bar", 5.0, 35.0, 15.0, 0.5, "Saturation bubble point pressure")

        # GROUP 3: COMPLETION (6 Parameters)
        self._register("well_depth_m", "Well Depth", "completion", "m", 500.0, 2500.0, 1200.0, 50.0, "Total measured well depth")
        self._register("wellbore_r_m", "Wellbore Radius", "completion", "m", 0.08, 0.18, 0.108, 0.005, "Wellbore drilled hole radius")
        self._register("tubing_id_in", "Tubing ID", "completion", "in", 1.995, 3.958, 2.441, 0.1, "Production tubing inner diameter")
        self._register("tubing_od_in", "Tubing OD", "completion", "in", 2.375, 4.500, 2.875, 0.1, "Production tubing outer diameter")
        self._register("casing_id_in", "Casing ID", "completion", "in", 5.0, 9.0, 6.276, 0.1, "Production casing inner diameter")
        self._register("skin_factor", "Skin Factor", "completion", "-", -3.0, 15.0, 0.5, 0.1, "Mechanical skin damage / stimulation factor")

        # GROUP 4: PUMP & ROD (7 Parameters)
        self._register("plunger_diam_in", "Plunger Diameter", "pump_rod", "in", 1.25, 3.25, 2.25, 0.25, "Downhole pump plunger diameter", optimizable=False)
        self._register("plunger_clearance_in", "Plunger Clearance", "pump_rod", "in", 0.001, 0.010, 0.0035, 0.0005, "Radial barrel-plunger clearance")
        self._register("rod1_diam_in", "Rod Sec 1 Diameter", "pump_rod", "in", 0.75, 1.125, 0.875, 0.125, "Upper sucker rod section diameter")
        self._register("rod1_length_m", "Rod Sec 1 Length", "pump_rod", "m", 100.0, 1000.0, 450.0, 25.0, "Upper sucker rod section length")
        self._register("rod2_diam_in", "Rod Sec 2 Diameter", "pump_rod", "in", 0.625, 1.0, 0.750, 0.125, "Lower sucker rod section diameter")
        self._register("rod2_length_m", "Rod Sec 2 Length", "pump_rod", "m", 100.0, 1500.0, 750.0, 25.0, "Lower sucker rod section length")
        self._register("pump_mech_eff", "Pump Mech Efficiency", "pump_rod", "frac", 0.75, 0.98, 0.92, 0.01, "Mechanical pump lifting efficiency")

        # GROUP 5: UNIT OPERATION (5 Parameters)
        self._register("spm", "Pumping Speed (SPM)", "operation", "SPM", 0.5, 12.0, 3.2, 0.1, "Pumping unit strokes per minute", optimizable=True)
        self._register("stroke_inches", "Stroke Length", "operation", "in", 24.0, 144.0, 64.0, 2.0, "Polished rod stroke length", optimizable=True)
        self._register("surface_pressure_bar", "Wellhead Backpressure", "operation", "bar", 1.0, 15.0, 2.5, 0.2, "Surface flowline backpressure")
        self._register("motor_eff", "Motor Efficiency", "operation", "frac", 0.65, 0.95, 0.85, 0.01, "Drive motor electrical efficiency")
        self._register("pitman_len_m", "Pitman Arm Length", "operation", "m", 1.5, 4.0, 2.40, 0.1, "Crank-slider pitman rod length")

        # GROUP 6: CSS CONTROLS (6 Parameters)
        self._register("steam_rate_t_d", "Steam Injection Rate", "css", "t/d", 10.0, 150.0, 42.3, 1.0, "Daily steam injection rate", optimizable=True)
        self._register("steam_volume_target_t", "Target Steam Volume", "css", "tons", 500.0, 8000.0, 2500.0, 100.0, "Total target steam mass per CSS cycle", optimizable=True)
        self._register("steam_temp_c", "Steam Temperature", "css", "°C", 150.0, 320.0, 195.0, 5.0, "Saturated steam injection temperature")
        self._register("steam_quality", "Steam Quality", "css", "frac", 0.50, 0.95, 0.80, 0.02, "Vapor mass fraction at sandface")
        self._register("soak_days", "Soak Period", "css", "days", 1.0, 20.0, 5.0, 0.5, "Post-steam soak shut-in duration", optimizable=True)
        self._register("production_cutoff_temp_c", "CSS Cutoff Temp", "css", "°C", 40.0, 85.0, 58.0, 1.0, "Production phase cutoff temperature before next cycle", optimizable=True)

        # GROUP 7: ECONOMICS (4 Parameters)
        self._register("oil_price_usd_bbl", "Crude Oil Price", "economics", "$/bbl", 30.0, 150.0, 75.0, 1.0, "Benchmark crude oil realization price")
        self._register("steam_cost_usd_ton", "Steam Generation Cost", "economics", "$/ton", 10.0, 60.0, 24.50, 0.5, "Steam cost including boiler fuel and treatment")
        self._register("elec_tariff_kwh", "Electricity Tariff", "economics", "$/kWh", 0.03, 0.30, 0.095, 0.005, "Electric power utility tariff rate")
        self._register("water_cost_bbl", "Water Disposal Cost", "economics", "$/bbl", 0.20, 5.00, 1.80, 0.10, "Produced water handling and disposal expense")

    def get_parameter(self, key: str) -> Optional[ParameterDefinition]:
        return self._definitions.get(key)

    def set_value(self, key: str, value: float) -> bool:
        if key not in self._definitions:
            return False
        param = self._definitions[key]
        clamped = max(param.min_value, min(param.max_value, float(value)))
        param.current_value = clamped
        return True

    def get_value(self, key: str, default: float = 0.0) -> float:
        param = self._definitions.get(key)
        return param.current_value if param is not None else default

    def get_all(self) -> Dict[str, ParameterDefinition]:
        return self._definitions

    def to_dict(self) -> Dict[str, Any]:
        return {k: p.model_dump() for k, p in self._definitions.items()}

    def get_by_group(self, group: str) -> List[ParameterDefinition]:
        return [p for p in self._definitions.values() if p.group == group]

    def get_optimizable_keys(self) -> List[str]:
        return [k for k, p in self._definitions.items() if p.is_optimizable]

    def reset_to_defaults(self):
        for p in self._definitions.values():
            p.current_value = p.default_value
