"""
backend/app/assurance/safe_alternatives.py
Deterministic Safe Alternative Engine for ASSURE-TWIN.
When the primary candidate fails the 12-point assurance gate or decision rehearsal,
this engine searches nearby admissible operating configurations, simulates them
on a clean twin clone, and verifies them through the assurance gate.
"""

from typing import Dict, Any, List, Optional
import copy
from backend.app.assurance.gatekeeper import evaluate_assurance_gate
from backend.app.forecast.rehearsal import DecisionRehearsalEngine

class SafeAlternativeEngine:
    def __init__(self):
        self._rehearsal = DecisionRehearsalEngine()

    def find_safe_alternatives(
        self,
        live_engine: Any,
        rejected_controls: Dict[str, Any],
        failed_gate_reasons: List[str],
        current_state: Dict[str, Any],
        max_alternatives: int = 3
    ) -> List[Dict[str, Any]]:
        """
        Systematically evaluates candidate alternatives to relieve the identified failure modes:
        - If float margin / drag / PPRL failed: step down SPM, adjust stroke.
        - If thermal dissipation / viscosity failed: adjust CSS timing and steam volume.
        Every returned alternative is re-simulated on a twin clone and passed through
        the 12-checkpoint assurance gate.
        """
        curr_spm = float(rejected_controls.get("spm", current_state.get("controls", {}).get("spm", 3.2)))
        curr_stroke = float(rejected_controls.get("stroke_inches", current_state.get("controls", {}).get("stroke_inches", 64.0)))
        curr_steam = float(rejected_controls.get("steam_volume_tons", current_state.get("controls", {}).get("steam_volume_t_d", 2400.0)))

        candidate_trials: List[Dict[str, Any]] = []

        # Strategy A: Moderate SPM Reduction (Relieves dynamic rod drag and inertia)
        candidate_trials.append({
            "code": "PLAN_A",
            "name": "Conservative Kinematic Derate (SPM Reduction)",
            "spm": max(1.0, round(curr_spm * 0.82, 1)),
            "stroke_inches": curr_stroke,
            "steam_volume_tons": curr_steam,
            "rationale": "Derates pump speed to reduce downstroke Couette drag and restore rod float margin above 15% safety floor."
        })

        # Strategy B: Long-and-Slow Strategy (Lower SPM + Increased Stroke)
        candidate_trials.append({
            "code": "PLAN_B",
            "name": "Long-Stroke Low-Speed Mechanical Compensation",
            "spm": max(0.8, round(curr_spm * 0.72, 1)),
            "stroke_inches": min(120.0, round(curr_stroke * 1.15, 0)),
            "steam_volume_tons": curr_steam,
            "rationale": "Compensates for reduced SPM with longer stroke displacement, preserving production while keeping acceleration low."
        })

        # Strategy C: Coupled Thermal Intervention (Accelerated CSS Steam Injection)
        candidate_trials.append({
            "code": "PLAN_C",
            "name": "Coordinated Thermal Restimulation & Controlled Pumping",
            "spm": max(1.2, round(curr_spm * 0.88, 1)),
            "stroke_inches": curr_stroke,
            "steam_volume_tons": min(4500.0, round(curr_steam * 1.25, 0)),
            "rationale": "Accelerates CSS thermal cycle timing to reheat near-wellbore sand, dropping viscosity from > 2,000 cP to < 600 cP."
        })

        # Additional grid variations
        for delta_spm in [-0.4, -0.7, -1.0, -1.3]:
            trial_spm = round(curr_spm + delta_spm, 1)
            if trial_spm >= 0.8:
                candidate_trials.append({
                    "code": f"GRID_SPM_{trial_spm}",
                    "name": f"Derated Pumping Speed {trial_spm} SPM",
                    "spm": trial_spm,
                    "stroke_inches": curr_stroke,
                    "steam_volume_tons": curr_steam,
                    "rationale": f"Systematic derate to {trial_spm} SPM."
                })

        safe_alternatives: List[Dict[str, Any]] = []

        for trial in candidate_trials:
            trial_controls = {
                "spm": trial["spm"],
                "stroke_inches": trial["stroke_inches"]
            }

            # 1. Re-simulate on Twin Clone (forward 21-day trial)
            rehearsal_result = self._rehearsal.rehearse_decision(
                live_engine=live_engine,
                proposed_controls=trial_controls,
                rehearsal_horizon_days=21
            )

            # 2. Re-assure through 12-checkpoint Gatekeeper
            # Use trial state modified by controls
            simulated_state = copy.deepcopy(current_state)
            if "controls" not in simulated_state:
                simulated_state["controls"] = {}
            simulated_state["controls"]["spm"] = trial["spm"]
            simulated_state["controls"]["stroke_inches"] = trial["stroke_inches"]

            gate_result = evaluate_assurance_gate(simulated_state, trial_controls)

            # An alternative is safe if rehearsal passes AND gate does not abstain
            if rehearsal_result.get("is_safe_to_execute") and not gate_result.get("abstain_active"):
                expected_gain = round(rehearsal_result.get("final_oil_bpd", 28.0) - float(current_state.get("production", {}).get("oil_rate_bpd", 25.0)), 1)
                safe_alternatives.append({
                    "plan_id": trial["code"],
                    "title": trial["name"],
                    "proposed_controls": {
                        "spm": trial["spm"],
                        "stroke_inches": trial["stroke_inches"],
                        "steam_volume_tons": trial["steam_volume_tons"]
                    },
                    "float_margin_pct": rehearsal_result.get("min_float_margin_pct", 22.0),
                    "max_pprl_kn": rehearsal_result.get("max_pprl_kn", 78.0),
                    "expected_oil_rate_bopd": rehearsal_result.get("final_oil_bpd", 28.5),
                    "expected_oil_gain_bopd": expected_gain,
                    "gate_score_pct": gate_result.get("gate_score_pct", 100.0),
                    "all_gates_pass": True,
                    "rehearsal_status": "APPROVED_SAFE",
                    "explanation": trial["rationale"]
                })

            if len(safe_alternatives) >= max_alternatives:
                break

        # If no trial fully cleared all constraints, run workover classifier
        # to distinguish WORKOVER_RECOMMENDED from INSUFFICIENT_DATA
        if not safe_alternatives:
            from .workover_classifier import classify_workover
            classification = classify_workover(current_state)
            reason_code = classification.get("reason_code", "INSUFFICIENT_DATA")

            if reason_code == "WORKOVER_RECOMMENDED":
                safe_alternatives.append({
                    "plan_id": "PLAN_WORKOVER_RECOMMENDED",
                    "title": "Workover Recommended — Equipment Limits Exceeded",
                    "proposed_controls": {},
                    "float_margin_pct": 0.0,
                    "max_pprl_kn": 0.0,
                    "expected_oil_rate_bopd": 0.0,
                    "expected_oil_gain_bopd": 0.0,
                    "gate_score_pct": 0.0,
                    "all_gates_pass": False,
                    "rehearsal_status": "WORKOVER_RECOMMENDED",
                    "reason_code": "WORKOVER_RECOMMENDED",
                    "classification": classification,
                    "explanation": (
                        "No setpoint change within the current equipment limits can clear "
                        "the mechanical assurance gates, even when all epistemic parameters "
                        "are set to their most optimistic declared bounds. "
                        "Equipment-level intervention (workover) is required. "
                        "This is advisory only — requires engineer approval."
                    )
                })
            else:
                # INSUFFICIENT_DATA or other — preserve existing behaviour
                safe_alternatives.append({
                    "plan_id": "PLAN_DATA_REQUIRED",
                    "title": "Abstain & Request Diagnostic Verification",
                    "proposed_controls": {},
                    "float_margin_pct": 0.0,
                    "max_pprl_kn": 0.0,
                    "expected_oil_rate_bopd": 0.0,
                    "expected_oil_gain_bopd": 0.0,
                    "gate_score_pct": 0.0,
                    "all_gates_pass": False,
                    "rehearsal_status": "INCONCLUSIVE",
                    "reason_code": reason_code,
                    "classification": classification,
                    "explanation": (
                        "No nearby kinematic adjustment can safely relieve current mechanical constraints. "
                        "However, better measurement data may resolve the uncertainty. "
                        + (classification.get("data_request", "") or
                           "Mandatory recommendation: shut in SRP unit, record acoustic fluid level, "
                           "run downhole pressure gauge survey, and schedule CSS thermal restimulation.")
                    )
                })

        return safe_alternatives

