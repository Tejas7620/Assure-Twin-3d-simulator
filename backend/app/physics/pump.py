"""
pump.py - Downhole Plunger Pump Displacement, Slippage, and Efficiency Model.
Implements:
1. Plunger displacement per stroke and 24-hr theoretical capacity (API 11AX).
2. Annular slippage leakage past plunger clearance (Hagen-Poiseuille slot flow).
3. Pump fillage calculation as ratio of available reservoir inflow to displacement.
4. Volumetric efficiency, mechanical efficiency, and overall efficiency.
"""

import math
from typing import Dict, Any

class DownholePumpModel:
    def __init__(
        self,
        plunger_diameter_in: float = 2.25,
        plunger_length_in: float = 48.0,
        radial_clearance_in: float = 0.0035, # -3 fit
        mechanical_efficiency: float = 0.92
    ):
        self.plunger_diameter_in = float(plunger_diameter_in)
        self.plunger_diameter_m = self.plunger_diameter_in * 0.0254
        self.plunger_length_m = float(plunger_length_in) * 0.0254
        self.clearance_m = float(radial_clearance_in) * 0.0254
        self.eta_m = float(mechanical_efficiency)

        # Cross-sectional plunger area
        self.area_m2 = (math.pi / 4.0) * (self.plunger_diameter_m ** 2)
        self.area_sq_in = (math.pi / 4.0) * (self.plunger_diameter_in ** 2)

        # Displacement constant: bpd per inch stroke per SPM
        # V_bpd = 0.1166 * (d_in ^ 2) * S_in * SPM
        self.k_displacement_bpd = 0.1166 * (self.plunger_diameter_in ** 2)

    def calculate_displacement(self, stroke_inches: float, spm: float) -> Dict[str, float]:
        """
        Calculates theoretical pump displacement without slippage or fillage loss.
        """
        s_in = max(1.0, float(stroke_inches))
        s_m = s_in * 0.0254
        n_spm = max(0.1, float(spm))

        # Displacement volume per stroke
        disp_per_stroke_m3 = self.area_m2 * s_m
        # Displacement volume per day (1440 min/day)
        disp_daily_m3_d = disp_per_stroke_m3 * n_spm * 1440.0
        disp_daily_bpd = self.k_displacement_bpd * s_in * n_spm

        return {
            "displacement_per_stroke_m3": disp_per_stroke_m3,
            "displacement_per_stroke_liters": disp_per_stroke_m3 * 1000.0,
            "theoretical_displacement_m3_d": float(disp_daily_m3_d),
            "theoretical_displacement_bpd": float(disp_daily_bpd)
        }

    def calculate_slippage(
        self,
        differential_pressure_bar: float,
        viscosity_cp: float
    ) -> float:
        """
        Laminar slippage leakage through narrow annular plunger-barrel gap:
        q_slip = (pi * d * c^3 * delta_P) / (12 * mu * L)
        """
        dp_pa = max(1e5, float(differential_pressure_bar) * 1e5)
        mu_pa_s = max(1e-3, float(viscosity_cp) * 1e-3)

        d = self.plunger_diameter_m
        c = self.clearance_m
        L = self.plunger_length_m

        q_slip_m3_s = (math.pi * d * (c ** 3) * dp_pa) / (12.0 * mu_pa_s * L)
        q_slip_m3_d = q_slip_m3_s * 86400.0
        return float(max(0.01, min(15.0, q_slip_m3_d)))

    def evaluate_performance(
        self,
        stroke_inches: float,
        spm: float,
        inflow_rate_m3_d: float,
        differential_pressure_bar: float,
        viscosity_cp: float
    ) -> Dict[str, Any]:
        """
        Calculates pump fillage, volumetric efficiency, and actual pump liquid throughput.
        """
        disp = self.calculate_displacement(stroke_inches, spm)
        v_theor_m3_d = disp["theoretical_displacement_m3_d"]

        q_slip_m3_d = self.calculate_slippage(differential_pressure_bar, viscosity_cp)
        effective_capacity_m3_d = max(0.1, v_theor_m3_d - q_slip_m3_d)

        # Inflow availability
        q_avail_m3_d = max(0.0, float(inflow_rate_m3_d))

        # Pump fillage: ratio of available fluid inflow to effective capacity
        pump_fillage = min(1.0, max(0.10, q_avail_m3_d / effective_capacity_m3_d))

        # Actual liquid lifted by the pump
        q_lifted_m3_d = min(effective_capacity_m3_d * pump_fillage, q_avail_m3_d)

        # Volumetric efficiency: actual production / theoretical displacement
        volumetric_efficiency = max(0.05, min(0.98, q_lifted_m3_d / max(0.1, v_theor_m3_d)))

        # Overall efficiency: eta_total = eta_v * eta_m
        overall_efficiency = volumetric_efficiency * self.eta_m

        return {
            "theoretical_displacement_m3_d": round(v_theor_m3_d, 2),
            "theoretical_displacement_bpd": round(disp["theoretical_displacement_bpd"], 1),
            "slippage_rate_m3_d": round(q_slip_m3_d, 3),
            "pump_fillage": round(pump_fillage, 3),
            "pump_fillage_pct": round(pump_fillage * 100.0, 1),
            "volumetric_efficiency": round(volumetric_efficiency, 3),
            "volumetric_efficiency_pct": round(volumetric_efficiency * 100.0, 1),
            "mechanical_efficiency": self.eta_m,
            "overall_efficiency": round(overall_efficiency, 3),
            "liquid_lifted_m3_d": round(q_lifted_m3_d, 2),
            "liquid_lifted_bpd": round(q_lifted_m3_d * 6.28981, 1)
        }
