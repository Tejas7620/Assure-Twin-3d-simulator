"""
impact.py - Sucker Rod Impact Loading and Stress-Wave Propagation Model.
Implements:
1. Fluid pound impact shock when plunger hits liquid level on downstroke (fillage < 0.85).
2. Carrier bar separation and rod slap impact during rod float.
3. Acoustic stress wave magnitude: sigma_impact = rho * a * delta_v.
4. Cumulative cycle impact count and mechanical fatigue exposure tracking (Goodman criterion).
"""

import math
from typing import Dict, Any

class ImpactLoadingModel:
    def __init__(
        self,
        rod_steel_density_kg_m3: float = 7850.0,
        acoustic_velocity_m_s: float = 5132.0,
        fluid_speed_of_sound_m_s: float = 1250.0
    ):
        self.rho_steel = float(rod_steel_density_kg_m3)
        self.a_steel = float(acoustic_velocity_m_s)
        self.c_fluid = float(fluid_speed_of_sound_m_s)

        # Cumulative impact fatigue counters
        self.fluid_pound_count = 0
        self.rod_slap_count = 0
        self.cumulative_impact_energy_kj = 0.0

    def evaluate_impacts(
        self,
        pump_fillage: float,
        rod_float_status: str,
        plunger_velocity_m_s: float,
        top_rod_area_m2: float,
        stroke_inches: float,
        spm: float
    ) -> Dict[str, Any]:
        """
        Evaluates impact shock loads per pumping cycle.
        """
        v_plunger = abs(float(plunger_velocity_m_s))
        area = max(1e-4, float(top_rod_area_m2))

        has_fluid_pound = False
        pound_magnitude_kn = 0.0
        pound_stress_mpa = 0.0

        has_rod_slap = False
        slap_magnitude_kn = 0.0
        slap_stress_mpa = 0.0

        # 1. Fluid Pound Evaluation:
        # Occurs if pump fillage is incomplete (< 0.85)
        if pump_fillage < 0.85:
            has_fluid_pound = True
            self.fluid_pound_count += 1
            # Severity scales with plunger velocity and fillage deficit
            fillage_deficit = 1.0 - pump_fillage
            # Peak impact velocity occurs midway through downstroke
            impact_vel = v_plunger * (1.0 + 0.5 * fillage_deficit)
            # Fluid acoustic shock: delta_P = rho_fluid * c_fluid * v_rel
            rho_oil = 920.0
            delta_p_pa = rho_oil * self.c_fluid * impact_vel * fillage_deficit
            plunger_area_m2 = (math.pi / 4.0) * (0.05715 ** 2) # 2-1/4" plunger
            pound_force_n = delta_p_pa * plunger_area_m2
            pound_magnitude_kn = min(85.0, pound_force_n / 1000.0)
            pound_stress_mpa = (pound_magnitude_kn * 1000.0) / (area * 1e6)

        # 2. Rod Float Slap Evaluation:
        # Carrier bar separates from polished rod clamp and slams at bottom of stroke
        if rod_float_status == "FLOATING":
            has_rod_slap = True
            self.rod_slap_count += 1
            # Relative impact velocity between ascending carrier bar and descending rod
            delta_v = max(0.2, v_plunger * 1.4)
            # Water hammer / acoustic stress in steel rod: sigma = rho * a * delta_v
            sigma_pa = self.rho_steel * self.a_steel * delta_v * 0.25 # Attenuated by rod coupling elasticity
            slap_force_n = sigma_pa * area
            slap_magnitude_kn = min(120.0, slap_force_n / 1000.0)
            slap_stress_mpa = sigma_pa / 1e6

        # Peak impact force
        peak_impact_kn = max(pound_magnitude_kn, slap_magnitude_kn)
        peak_stress_mpa = max(pound_stress_mpa, slap_stress_mpa)

        # Cumulative energy per cycle (Joules ~ 0.5 * F * delta_L)
        if peak_impact_kn > 0:
            cycle_energy_j = 0.5 * (peak_impact_kn * 1000.0) * 0.02
            self.cumulative_impact_energy_kj += cycle_energy_j / 1000.0

        # Fatigue severity level:
        if peak_stress_mpa > 150.0 or self.rod_slap_count > 50:
            fatigue_severity = "CRITICAL"
        elif peak_stress_mpa > 70.0 or self.fluid_pound_count > 100:
            fatigue_severity = "ELEVATED"
        else:
            fatigue_severity = "NORMAL"

        return {
            "has_impact": has_fluid_pound or has_rod_slap,
            "has_fluid_pound": has_fluid_pound,
            "has_rod_slap": has_rod_slap,
            "pound_magnitude_kn": round(pound_magnitude_kn, 2),
            "slap_magnitude_kn": round(slap_magnitude_kn, 2),
            "peak_impact_kn": round(peak_impact_kn, 2),
            "peak_stress_mpa": round(peak_stress_mpa, 1),
            "fatigue_severity": fatigue_severity,
            "fluid_pound_count": self.fluid_pound_count,
            "rod_slap_count": self.rod_slap_count,
            "cumulative_impact_energy_kj": round(self.cumulative_impact_energy_kj, 2)
        }
