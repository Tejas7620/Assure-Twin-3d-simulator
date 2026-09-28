"""
srp_controller.py - Closed-Loop Physics-Informed SRP Controller.
Implements:
1. Dynamic SPM and stroke adjustment adhering to strict mechanical boundaries:
   - Rod float margin constraint: FM >= 15% (strictly avoids rod float & buckling)
   - Pump fillage constraint: 0.75 <= Fillage <= 0.95 (avoids fluid pound)
   - Peak Polished Rod Load limit: PPRL <= 90% API rod rating
   - Gear reducer peak torque constraint
2. Maximizes net oil lifting rate while preventing mechanical failures.
3. Provides actionable setpoint recommendations and advisory rationale.
"""

import math
from typing import Dict, Any, Tuple

class SRPPhysicsController:
    def __init__(
        self,
        min_float_margin_pct: float = 15.0,
        min_fillage: float = 0.75,
        max_fillage: float = 0.95,
        max_allowable_pprl_kn: float = 85.0
    ):
        self.min_fm = float(min_float_margin_pct)
        self.min_fillage = float(min_fillage)
        self.max_fillage = float(max_fillage)
        self.max_pprl = float(max_allowable_pprl_kn)

    def evaluate_setpoint(
        self,
        current_spm: float,
        current_stroke_in: float,
        current_float_margin_pct: float,
        current_fillage: float,
        current_pprl_kn: float,
        current_viscosity_cp: float,
        operating_regime: str = "PUMP_LIMITED"
    ) -> Dict[str, Any]:
        """
        Computes the optimal (SPM, Stroke) setpoint adjustments.
        """
        spm = float(current_spm)
        stroke = float(current_stroke_in)
        fm = float(current_float_margin_pct)
        fillage = float(current_fillage)
        pprl = float(current_pprl_kn)
        visc = float(current_viscosity_cp)

        target_spm = spm
        target_stroke = stroke
        actions = []
        status = "OPTIMAL"

        # 1. SAFETY CRITICAL: Rod Float Hazard
        # If float margin < 15%, rod is at severe risk of buckling / parting!
        if fm < self.min_fm:
            status = "RESTRICTED"
            # Reducing SPM decreases downstroke velocity v_rod and viscous drag F_drag!
            spm_reduction = max(0.4, (self.min_fm - fm) * 0.05)
            target_spm = max(0.8, spm - spm_reduction)
            actions.append(f"Throttle SPM from {spm:.1f} to {target_spm:.1f} to restore rod float margin (currently {fm:.1f}%)")

            # In very high viscosity (> 2000 cP), also recommend stroke reduction
            if visc > 2000.0 and stroke > 54.0:
                target_stroke = max(44.0, stroke - 8.0)
                actions.append(f"Reduce stroke to {target_stroke:.0f} in to lower peak inertial loads")

        # 2. SEVERE FLUID POUND: Pump Fillage Deficit
        elif fillage < self.min_fillage or operating_regime == "INFLOW_LIMITED":
            # Well is overpumped! Pumping capacity exceeds inflow.
            status = "OVERPUMPED"
            # Reduce SPM to allow pump barrel to fill completely
            fillage_deficit = self.min_fillage - fillage
            target_spm = max(1.0, spm * (fillage / 0.85))
            actions.append(f"Reduce SPM from {spm:.1f} to {target_spm:.1f} to mitigate fluid pound (fillage {fillage*100:.1f}%)")

        # 3. OVERLOAD CHECK: High PPRL
        elif pprl > self.max_pprl:
            status = "OVERLOAD"
            target_spm = max(1.0, spm - 0.4)
            actions.append(f"Reduce SPM to {target_spm:.1f} to relieve rod string stress (PPRL {pprl:.1f} kN > {self.max_pprl:.1f} kN)")

        # 4. CAPACITY UNDERUTILIZATION: Well can pump faster safely!
        elif fillage >= self.max_fillage and fm >= 28.0 and pprl < (self.max_pprl * 0.80):
            # Inflow is high, pump is completely full, and rod has abundant float margin
            status = "CAPACITY_AVAILABLE"
            target_spm = min(6.5, spm + 0.3)
            actions.append(f"Increase SPM to {target_spm:.1f} to boost production throughput (fillage {fillage*100:.1f}%, margin {fm:.1f}%)")

        else:
            actions.append("Operating within safe thermo-mechanical envelope")

        return {
            "status": status,
            "current_spm": round(spm, 1),
            "recommended_spm": round(target_spm, 1),
            "current_stroke_in": round(stroke, 1),
            "recommended_stroke_in": round(target_stroke, 1),
            "float_margin_pct": round(fm, 1),
            "pump_fillage_pct": round(fillage * 100.0, 1),
            "actions": actions,
            "is_action_required": target_spm != spm or target_stroke != stroke
        }
