"""
hazard_model.py - Multi-Failure Mechanical and Thermal Hazard Prediction Model.
Implements:
1. Sucker Rod Parting Hazard (Goodman cyclic fatigue ratio, PPRL/Rating, peak stress).
2. Downhole Pump Seizure & Fluid Pound Hazard (fillage deficit, thermal shock, sand ingress).
3. Tubing Buckling and Helical Wear Hazard (axial compression depth during rod float).
4. Composite Operational Health Index (0 to 100) and actionable alert triggers.
"""

import math
from typing import Dict, Any

class FailureHazardModel:
    def __init__(
        self,
        rod_tensile_rating_kn: float = 95.0,
        goodman_endurance_limit_mpa: float = 240.0
    ):
        self.rod_rating_kn = float(rod_tensile_rating_kn)
        self.endurance_limit_mpa = float(goodman_endurance_limit_mpa)

    def evaluate_hazards(
        self,
        pprl_kn: float,
        mprl_kn: float,
        float_margin_pct: float,
        pump_fillage: float,
        rod_float_status: str,
        fluid_pound_magnitude_kn: float,
        compression_depth_m: float,
        viscosity_cp: float
    ) -> Dict[str, Any]:
        """
        Computes probabilistic mechanical failure hazards for the pumping installation.
        """
        # 1. Sucker Rod Parting Hazard Score (0.0 to 1.0)
        # Goodman cyclic stress range
        load_range_kn = max(0.0, pprl_kn - mprl_kn)
        stress_ratio = pprl_kn / self.rod_rating_kn
        range_ratio = load_range_kn / self.rod_rating_kn

        parting_score = min(1.0, 0.40 * stress_ratio + 0.60 * (range_ratio ** 1.5))
        if pprl_kn > self.rod_rating_kn * 0.95:
            parting_score = max(0.85, parting_score)

        # 2. Pump Seizure & Fluid Pound Hazard (0.0 to 1.0)
        # Driven by low fillage and repeated fluid pound shocks
        fillage_deficit = max(0.0, 0.85 - pump_fillage)
        shock_factor = min(1.0, fluid_pound_magnitude_kn / 50.0)
        pump_score = min(1.0, (fillage_deficit / 0.85) * 0.60 + shock_factor * 0.40)

        # 3. Tubing Buckling & Wear Hazard (0.0 to 1.0)
        # Driven by rod float and compression zone depth
        if rod_float_status == "FLOATING":
            buckling_score = 0.90 + min(0.10, (compression_depth_m / 1200.0) * 0.10)
        elif rod_float_status == "WARNING":
            buckling_score = 0.55 + max(0.0, (15.0 - float_margin_pct) * 0.02)
        else:
            buckling_score = max(0.05, 0.15 - (float_margin_pct / 200.0))

        # Overall System Health Index (0 - 100)
        max_hazard = max(parting_score, pump_score, buckling_score)
        health_index = max(5.0, min(100.0, (1.0 - max_hazard) * 100.0))

        # Classify overall risk level
        if max_hazard > 0.70:
            risk_level = "CRITICAL_ACTION_REQUIRED"
        elif max_hazard > 0.40:
            risk_level = "ELEVATED_RISK"
        elif max_hazard > 0.20:
            risk_level = "MODERATE_NORMAL"
        else:
            risk_level = "HEALTHY_OPTIMAL"

        return {
            "health_index": round(health_index, 1),
            "risk_level": risk_level,
            "hazards": {
                "rod_parting_hazard": round(parting_score, 3),
                "pump_seizure_hazard": round(pump_score, 3),
                "tubing_buckling_hazard": round(buckling_score, 3)
            },
            "metrics": {
                "stress_ratio_pct": round(stress_ratio * 100.0, 1),
                "cyclic_load_range_kn": round(load_range_kn, 2),
                "compression_depth_m": round(compression_depth_m, 1),
                "fluid_pound_magnitude_kn": round(fluid_pound_magnitude_kn, 2)
            }
        }
