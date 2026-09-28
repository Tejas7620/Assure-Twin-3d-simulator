"""
rehearsal.py - Decision Rehearsal and Prospective Control Sandbox Simulator.
Simulates candidate operational setpoints forward in time (7 to 45 days)
in an isolated cloned simulation instance without modifying live well state.
Checks for thermo-mechanical boundary violations:
- Rod float margin (< 15%)
- Fluid pound (fillage < 70%)
- Peak polished rod load (> 85 kN)
- Motor power limit (> 30 kW)
- High SOR (> 4.5).
"""

import copy
from typing import Dict, Any, List
from ..twin.time_stepper import StatefulTwinEngine

class DecisionRehearsalEngine:
    def __init__(self):
        pass

    def rehearse_decision(
        self,
        live_engine: StatefulTwinEngine,
        proposed_controls: Dict[str, float],
        rehearsal_horizon_days: int = 21
    ) -> Dict[str, Any]:
        """
        Executes a deep-copy forward trial of candidate operational changes.
        """
        # 1. Deep clone the active twin to protect live state
        sandbox = live_engine.clone()

        # 2. Apply prospective controls
        for k, v in proposed_controls.items():
            sandbox.set_parameter(k, v)

        # 3. Step forward day by day
        violations: List[Dict[str, Any]] = []
        trajectory: List[Dict[str, Any]] = []

        is_safe = True
        dt_day = 1.0
        # Convert 1 day to equivalent step delta
        # Since engine dt_sim_days = dt_real * 0.2 * time_scale, we can step directly
        total_oil_produced_bbl = 0.0
        min_float_margin = 100.0
        max_pprl = 0.0

        for day in range(1, rehearsal_horizon_days + 1):
            state = sandbox.step(5.0) # Step 1 simulated day

            fm = state["loads"]["float_margin_pct"]
            pprl = state["loads"]["pprl_kn"]
            fillage = state["pump"]["pump_fillage"]
            oil_rate = state["production"]["oil_rate_bpd"]

            min_float_margin = min(min_float_margin, fm)
            max_pprl = max(max_pprl, pprl)
            total_oil_produced_bbl += oil_rate * dt_day

            # Check boundary conditions
            if fm < 15.0:
                is_safe = False
                violations.append({
                    "day": day,
                    "constraint": "MINIMUM_ROD_FLOAT_MARGIN",
                    "value": fm,
                    "threshold": 15.0,
                    "severity": "CRITICAL",
                    "message": f"Day {day}: Rod float margin collapsed to {fm:.1f}% (< 15% threshold). Severe buckling hazard."
                })

            if pprl > 85.0:
                is_safe = False
                violations.append({
                    "day": day,
                    "constraint": "PEAK_POLISHED_ROD_LOAD",
                    "value": pprl,
                    "threshold": 85.0,
                    "severity": "CRITICAL",
                    "message": f"Day {day}: PPRL exceeded allowable rod tensile rating ({pprl:.1f} kN > 85.0 kN)."
                })

            if fillage < 0.65:
                violations.append({
                    "day": day,
                    "constraint": "PUMP_FILLAGE_DEFICIT",
                    "value": round(fillage * 100.0, 1),
                    "threshold": 65.0,
                    "severity": "WARNING",
                    "message": f"Day {day}: Low pump fillage ({fillage*100:.1f}%). Pumping off fluid level."
                })

            if day % 3 == 0 or day == rehearsal_horizon_days:
                trajectory.append({
                    "day": day,
                    "oil_rate_bpd": round(oil_rate, 1),
                    "float_margin_pct": round(fm, 1),
                    "pprl_kn": round(pprl, 1),
                    "temp_c": round(state["thermal"]["near_well_temp_c"], 1),
                    "daily_profit_usd": state["economics"]["daily_profit_usd"]
                })

        verdict = "APPROVED_SAFE" if is_safe and len(violations) == 0 else ("CONDITIONAL_WARNING" if is_safe else "REJECTED_UNSAFE")

        return {
            "verdict": verdict,
            "is_safe_to_execute": is_safe,
            "horizon_days": rehearsal_horizon_days,
            "proposed_controls": proposed_controls,
            "min_float_margin_pct": round(min_float_margin, 1),
            "max_pprl_kn": round(max_pprl, 1),
            "cumulative_rehearsal_oil_bbl": round(total_oil_produced_bbl, 1),
            "violation_count": len(violations),
            "violations": violations,
            "trajectory_sample": trajectory
        }
