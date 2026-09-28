"""
inflow_limited.py - Inflow-Limited Well Detection and Dynamic Speed Governor.
Implements:
1. Continuous detection of reservoir inflow constraints vs pump displacement capacity.
2. Identifies severe drawdown, low pump fillage (< 0.70), and declining bottomhole pressure.
3. Automatically computes governed SPM to match reservoir inflow rate.
4. Prevents destructive fluid pound shock waves, unanchored tubing wear, and gas locking.
"""

import math
from typing import Dict, Any

class InflowLimitedGovernor:
    def __init__(
        self,
        critical_fillage_threshold: float = 0.75,
        target_optimal_fillage: float = 0.88
    ):
        self.critical_fillage = float(critical_fillage_threshold)
        self.target_fillage = float(target_optimal_fillage)

    def analyze_well(
        self,
        current_spm: float,
        stroke_inches: float,
        inflow_rate_m3_d: float,
        theoretical_displacement_m3_d: float,
        pump_fillage: float,
        p_wf_bar: float,
        p_res_bar: float
    ) -> Dict[str, Any]:
        """
        Analyzes whether well is inflow-limited and prescribes speed governing.
        """
        q_inflow = max(0.01, float(inflow_rate_m3_d))
        q_disp = max(0.1, float(theoretical_displacement_m3_d))
        fillage = float(pump_fillage)
        pwf = float(p_wf_bar)
        pres = float(p_res_bar)
        spm = float(current_spm)

        # Inflow capacity ratio
        capacity_ratio = q_inflow / q_disp
        drawdown_fraction = (pres - pwf) / max(1.0, pres)

        is_inflow_limited = (fillage < self.critical_fillage) or (capacity_ratio < 0.80) or (drawdown_fraction > 0.85)

        severity = "NORMAL"
        recommended_spm = spm
        rationale = "Well operation balanced with reservoir inflow."

        if is_inflow_limited:
            if fillage < 0.50:
                severity = "SEVERE_OVERPUMP"
                # Heavy fluid pound occurring
                target_disp = q_inflow / self.target_fillage
                recommended_spm = max(0.8, spm * (target_disp / q_disp))
                rationale = f"Severe fluid pound detected (fillage {fillage*100:.1f}%). Reservoir inflow ({q_inflow:.1f} m³/d) cannot sustain current displacement ({q_disp:.1f} m³/d). Governor prescribes throttling SPM to {recommended_spm:.1f}."
            elif fillage < self.critical_fillage:
                severity = "MODERATE_DEFICIT"
                target_disp = q_inflow / self.target_fillage
                recommended_spm = max(1.0, spm * (target_disp / q_disp))
                rationale = f"Moderate inflow deficit (fillage {fillage*100:.1f}%). Adjusting SPM from {spm:.1f} to {recommended_spm:.1f} to stabilize pump fillage at {self.target_fillage*100:.0f}%."
            else:
                severity = "DRAWDOWN_LIMITED"
                rationale = "Operating near maximum allowable formation drawdown."

        return {
            "is_inflow_limited": is_inflow_limited,
            "severity": severity,
            "current_spm": round(spm, 1),
            "recommended_spm": round(recommended_spm, 1),
            "pump_fillage_pct": round(fillage * 100.0, 1),
            "inflow_rate_m3_d": round(q_inflow, 2),
            "displacement_m3_d": round(q_disp, 2),
            "capacity_ratio": round(capacity_ratio, 2),
            "drawdown_bar": round(pres - pwf, 2),
            "rationale": rationale
        }
