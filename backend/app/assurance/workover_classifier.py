"""
backend/app/assurance/workover_classifier.py
Workover-vs-Setpoint Classification Engine for ASSURE-TWIN.

When no setpoint change can clear the mechanical assurance gates (5-8),
this engine distinguishes two cases:
  1. WORKOVER_RECOMMENDED: the equipment itself is physically incapable —
     even with the most optimistic parameter values, no candidate passes.
  2. INSUFFICIENT_DATA: better measurement data could potentially resolve
     the infeasibility — at least one epistemic parameter, if set to its
     optimistic bound, causes a candidate to pass all gates.

This is advisory only: it requires human approval, is written to the
audit trail, and appears in the generated report. It does NOT create
anything that looks like an automatic work order.
"""

import copy
import itertools
from typing import Dict, Any, List, Optional, Tuple, Set

from .gatekeeper import evaluate_assurance_gate
from .sweep_config import (
    SweepConfig,
    build_default_sweep_config,
    MECHANICAL_GATE_IDS,
    GATE_INTERVENTION_MAP,
)


def _set_nested(d: dict, path: List[str], value: float) -> dict:
    """Set a value in a nested dict by key path, creating intermediate dicts."""
    current = d
    for key in path[:-1]:
        if key not in current or not isinstance(current[key], dict):
            current[key] = {}
        current = current[key]
    current[path[-1]] = value
    return d


def _extract_gate_margins(gate_result: Dict[str, Any]) -> Dict[int, Dict[str, Any]]:
    """
    Extract per-gate pass/fail and numeric margins from a gatekeeper result.
    Returns {gate_id: {passed, status, detail, margin_info}}.
    """
    margins = {}
    for check in gate_result.get("checks", []):
        gate_id = check["id"]
        margins[gate_id] = {
            "id": gate_id,
            "name": check["name"],
            "category": check["category"],
            "passed": check["passed"],
            "status": check["status"],
            "detail": check["detail"],
        }
    return margins


def _identify_binding_gates(
    gate_margins: Dict[int, Dict[str, Any]],
    mechanical_ids: Set[int]
) -> Tuple[List[Dict[str, Any]], bool]:
    """
    Identify which gates are binding (failed) and whether they are all mechanical.
    Returns (binding_gates_list, all_mechanical).
    """
    binding = []
    for gid, info in gate_margins.items():
        if not info["passed"]:
            binding.append(info)

    if not binding:
        return [], False

    all_mechanical = all(g["id"] in mechanical_ids for g in binding)
    return binding, all_mechanical


def classify_workover(
    current_state: Dict[str, Any],
    sweep_config: Optional[SweepConfig] = None,
) -> Dict[str, Any]:
    """
    Main classification entry point.

    Called after the normal SafeAlternativeEngine has exhausted all candidates
    and found none passing all gates.

    Returns a classification dict:
    {
        "reason_code": "WORKOVER_RECOMMENDED" | "INSUFFICIENT_DATA" | "NON_MECHANICAL_FAILURE",
        "binding_gates": [...],
        "closest_candidate": {...},
        "margin_to_feasibility": float,
        "optimistic_bound_evidence": [...],
        "suggested_intervention_categories": [...],
        "confidence": str,
        "detail": str,
    }
    """
    if sweep_config is None:
        sweep_config = build_default_sweep_config()

    mechanical_ids = sweep_config.mechanical_gate_ids
    enabled_axes = sweep_config.get_enabled_axes()

    # ------------------------------------------------------------------
    # Phase A: Full sweep of the decision space at nominal parameters
    # Record per-candidate, per-gate margins.
    # ------------------------------------------------------------------
    candidates = _sweep_decision_space(current_state, enabled_axes)

    if not candidates:
        return {
            "reason_code": "INSUFFICIENT_DATA",
            "binding_gates": [],
            "closest_candidate": None,
            "margin_to_feasibility": float("inf"),
            "optimistic_bound_evidence": [],
            "suggested_intervention_categories": [],
            "confidence": "LOW",
            "detail": "No candidates could be evaluated — sweep produced zero trials.",
        }

    # Find the closest-to-feasible candidate (highest gate_score_pct)
    candidates.sort(key=lambda c: c["gate_score_pct"], reverse=True)
    closest = candidates[0]

    # If the closest candidate actually passes all gates, no workover needed
    if closest["all_pass"]:
        return {
            "reason_code": "FEASIBLE",
            "binding_gates": [],
            "closest_candidate": _serialize_candidate(closest),
            "margin_to_feasibility": 0.0,
            "optimistic_bound_evidence": [],
            "suggested_intervention_categories": [],
            "confidence": "HIGH",
            "detail": "At least one candidate passes all assurance gates.",
        }

    # Identify binding gates on the closest candidate
    binding_gates, all_mechanical = _identify_binding_gates(
        closest["gate_margins"], mechanical_ids
    )

    # ------------------------------------------------------------------
    # Phase B: If binding failures are NOT in mechanical gates, keep
    # existing reason (non-mechanical). Don't classify as workover.
    # ------------------------------------------------------------------
    if not all_mechanical:
        return {
            "reason_code": "NON_MECHANICAL_FAILURE",
            "binding_gates": binding_gates,
            "closest_candidate": _serialize_candidate(closest),
            "margin_to_feasibility": _compute_margin_to_feasibility(closest),
            "optimistic_bound_evidence": [],
            "suggested_intervention_categories": [],
            "confidence": "MEDIUM",
            "detail": (
                "Binding failures are not exclusively in mechanical gates (5-8). "
                "Existing abstain reason applies (e.g. economics, data quality, "
                "wellhead envelope, or ML agreement)."
            ),
        }

    # ------------------------------------------------------------------
    # Phase C: Robust-infeasibility test.
    # Re-run the sweep with each epistemic parameter set to its most
    # optimistic bound. If ANY candidate then passes, the answer is
    # INSUFFICIENT_DATA (better measurement could resolve it).
    # ------------------------------------------------------------------
    optimistic_evidence = []
    most_sensitive_param = None
    best_optimistic_score = closest["gate_score_pct"]

    for ep in sweep_config.epistemic_params:
        # Create a modified state with this parameter at its optimistic value
        optimistic_state = copy.deepcopy(current_state)

        # Apply optimistic value to the state
        # The optimistic value is set into the appropriate state path
        _apply_epistemic_optimistic(optimistic_state, ep)

        # Re-sweep with this optimistic state
        opt_candidates = _sweep_decision_space(optimistic_state, enabled_axes)
        if not opt_candidates:
            optimistic_evidence.append({
                "parameter": ep.key,
                "parameter_name": ep.name,
                "optimistic_value": ep.optimistic_value,
                "provenance": ep.provenance,
                "has_declared_bounds": ep.has_declared_bounds,
                "result": "NO_CANDIDATES",
                "passed_any": False,
            })
            continue

        opt_candidates.sort(key=lambda c: c["gate_score_pct"], reverse=True)
        opt_best = opt_candidates[0]

        passed_any = opt_best["all_pass"]
        if passed_any:
            # This epistemic parameter, at its optimistic bound, resolves infeasibility!
            optimistic_evidence.append({
                "parameter": ep.key,
                "parameter_name": ep.name,
                "optimistic_value": ep.optimistic_value,
                "provenance": ep.provenance,
                "has_declared_bounds": ep.has_declared_bounds,
                "result": "RESOLVES_INFEASIBILITY",
                "passed_any": True,
                "best_candidate": _serialize_candidate(opt_best),
            })
            if most_sensitive_param is None:
                most_sensitive_param = ep

        else:
            if opt_best["gate_score_pct"] > best_optimistic_score:
                best_optimistic_score = opt_best["gate_score_pct"]
            optimistic_evidence.append({
                "parameter": ep.key,
                "parameter_name": ep.name,
                "optimistic_value": ep.optimistic_value,
                "provenance": ep.provenance,
                "has_declared_bounds": ep.has_declared_bounds,
                "result": "STILL_INFEASIBLE",
                "passed_any": False,
            })

    # ------------------------------------------------------------------
    # Phase D: Decision
    # ------------------------------------------------------------------
    any_resolves = any(e["passed_any"] for e in optimistic_evidence)

    if any_resolves:
        # INSUFFICIENT_DATA: better data on the most sensitive parameter could help
        resolving_params = [e for e in optimistic_evidence if e["passed_any"]]
        return {
            "reason_code": "INSUFFICIENT_DATA",
            "binding_gates": binding_gates,
            "closest_candidate": _serialize_candidate(closest),
            "margin_to_feasibility": _compute_margin_to_feasibility(closest),
            "optimistic_bound_evidence": optimistic_evidence,
            "suggested_intervention_categories": [],
            "most_sensitive_parameter": resolving_params[0]["parameter_name"] if resolving_params else None,
            "data_request": (
                f"Measure or re-calibrate '{resolving_params[0]['parameter_name']}' — "
                f"if its true value is near {resolving_params[0]['optimistic_value']} "
                f"({resolving_params[0]['provenance']}), a safe setpoint may exist."
            ) if resolving_params else None,
            "confidence": "MEDIUM",
            "detail": (
                "At least one epistemic parameter, if set to its optimistic bound, "
                "allows a candidate to pass all assurance gates. "
                "Recommend acquiring better measurement data before concluding workover."
            ),
        }

    # WORKOVER_RECOMMENDED: robustly infeasible even under optimistic assumptions
    interventions = _build_intervention_categories(binding_gates, mechanical_ids)
    return {
        "reason_code": "WORKOVER_RECOMMENDED",
        "binding_gates": binding_gates,
        "closest_candidate": _serialize_candidate(closest),
        "margin_to_feasibility": _compute_margin_to_feasibility(closest),
        "optimistic_bound_evidence": optimistic_evidence,
        "suggested_intervention_categories": interventions,
        "confidence": "HIGH",
        "detail": (
            "No setpoint change within the current equipment limits can clear the "
            "mechanical assurance gates (5-8), even when all epistemic parameters "
            "are set to their most optimistic declared bounds. "
            "Equipment-level intervention (workover) is required."
        ),
    }


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _sweep_decision_space(
    base_state: Dict[str, Any],
    axes: list,
    max_candidates: int = 500,
) -> List[Dict[str, Any]]:
    """
    Sweep all combinations of control axis levels.
    Evaluate each through the 12-point assurance gate.
    Returns list of candidate dicts with gate results and margins.
    """
    if not axes:
        return []

    # Build cartesian product of all axis levels
    axis_levels = [a.levels for a in axes]
    axis_keys = [a.key for a in axes]
    axis_paths = [a.state_path for a in axes]

    results = []
    count = 0

    for combo in itertools.product(*axis_levels):
        if count >= max_candidates:
            break

        # Build candidate state
        candidate_state = copy.deepcopy(base_state)
        controls = {}
        for i, val in enumerate(combo):
            _set_nested(candidate_state, axis_paths[i], val)
            controls[axis_keys[i]] = val

        # Feature 2 coupling: If heater power is swept, apply physical near-well thermal boost & float margin recovery
        heater_kw = controls.get("heater_power_kw", 0.0)
        if heater_kw > 0.0:
            current_temp = candidate_state.get("thermal", {}).get("near_well_temp_c", 52.0)
            heater_boost = heater_kw * 0.45
            new_temp = min(195.0, current_temp + heater_boost)
            if "thermal" not in candidate_state:
                candidate_state["thermal"] = {}
            candidate_state["thermal"]["near_well_temp_c"] = new_temp
            candidate_state["thermal"]["heater_power_w"] = heater_kw * 1000.0

            current_fm = candidate_state.get("loads", {}).get("float_margin_pct", 0.0)
            fm_boost = (heater_kw / 40.0) * 16.0
            if "loads" not in candidate_state:
                candidate_state["loads"] = {}
            candidate_state["loads"]["float_margin_pct"] = min(60.0, current_fm + fm_boost)
            if candidate_state["loads"]["float_margin_pct"] >= 15.0:
                candidate_state["loads"]["is_buckling"] = False
                candidate_state["loads"]["rod_float_status"] = "SAFE"

        # Evaluate through assurance gate
        gate_result = evaluate_assurance_gate(candidate_state, controls)

        gate_margins = _extract_gate_margins(gate_result)
        all_pass = not gate_result.get("abstain_active", True)

        results.append({
            "controls": controls,
            "gate_result": gate_result,
            "gate_margins": gate_margins,
            "gate_score_pct": gate_result.get("gate_score_pct", 0.0),
            "all_pass": all_pass,
            "failed_count": gate_result.get("failed_count", 12),
        })
        count += 1

    return results


def _apply_epistemic_optimistic(state: Dict[str, Any], ep) -> None:
    """
    Apply an epistemic parameter's optimistic value to the simulation state.
    Maps parameter registry keys to state dict paths.
    """
    # Map from parameter keys to state paths where they affect the simulation
    # These are the paths that the gatekeeper reads
    param_state_map = {
        "perm_md": [("reservoir", "permeability_md")],
        "mu_ref_cp": [],  # Affects viscosity which affects drag → float margin
        "visc_energy_b": [],  # Same chain
        "pump_mech_eff": [("pump", "pump_fillage")],  # Higher eff → better fillage
        "skin_factor": [],  # Affects inflow
    }

    # For viscosity parameters, we need to recalculate the downstream effects
    # The most important effect is on float_margin_pct via drag
    if ep.key == "mu_ref_cp":
        # Lower viscosity → less drag → better float margin
        # Approximate: float margin improves proportionally to viscosity reduction
        current_fm = state.get("loads", {}).get("float_margin_pct", 0.0)
        visc_ratio = ep.optimistic_value / max(1.0, ep.default_value)
        # Drag scales ~linearly with viscosity; float margin inversely correlated
        drag_reduction_factor = visc_ratio
        # Rough model: each 1% drag reduction improves float margin by ~0.5%
        improved_fm = current_fm + (1.0 - drag_reduction_factor) * 40.0
        if "loads" not in state:
            state["loads"] = {}
        state["loads"]["float_margin_pct"] = max(0.0, improved_fm)

    elif ep.key == "visc_energy_b":
        # Lower activation energy → viscosity is less sensitive to temperature
        # At cold temps, this means lower viscosity → better float margin
        current_fm = state.get("loads", {}).get("float_margin_pct", 0.0)
        b_ratio = ep.optimistic_value / max(1.0, ep.default_value)
        improved_fm = current_fm + (1.0 - b_ratio) * 25.0
        if "loads" not in state:
            state["loads"] = {}
        state["loads"]["float_margin_pct"] = max(0.0, improved_fm)

    elif ep.key == "perm_md":
        # Higher perm → better inflow → better fillage
        current_fillage = state.get("pump", {}).get("pump_fillage", 0.30)
        perm_ratio = ep.optimistic_value / max(1.0, ep.default_value)
        improved_fillage = min(0.98, current_fillage * min(1.5, perm_ratio ** 0.3))
        if "pump" not in state:
            state["pump"] = {}
        state["pump"]["pump_fillage"] = improved_fillage
        # Also improves inflow rate
        current_q = state.get("inflow", {}).get("q_liquid_m3_d", 5.0)
        if "inflow" not in state:
            state["inflow"] = {}
        state["inflow"]["q_liquid_m3_d"] = current_q * min(2.0, perm_ratio ** 0.4)

    elif ep.key == "pump_mech_eff":
        current_fillage = state.get("pump", {}).get("pump_fillage", 0.30)
        eff_ratio = ep.optimistic_value / max(0.5, ep.default_value)
        improved_fillage = min(0.98, current_fillage * eff_ratio)
        if "pump" not in state:
            state["pump"] = {}
        state["pump"]["pump_fillage"] = improved_fillage

    elif ep.key == "skin_factor":
        # More negative skin → better inflow
        current_q = state.get("inflow", {}).get("q_liquid_m3_d", 5.0)
        if "inflow" not in state:
            state["inflow"] = {}
        # Skin improvement factor (Hawkins formula approximation)
        skin_improvement = max(0.5, (ep.default_value - ep.optimistic_value) * 0.05)
        state["inflow"]["q_liquid_m3_d"] = current_q * (1.0 + skin_improvement)


def _serialize_candidate(candidate: Dict[str, Any]) -> Dict[str, Any]:
    """Serialize a candidate for API output (drop heavy gate_result)."""
    return {
        "controls": candidate["controls"],
        "gate_score_pct": candidate["gate_score_pct"],
        "all_pass": candidate["all_pass"],
        "failed_count": candidate["failed_count"],
        "per_gate_summary": [
            {
                "id": gid,
                "name": info["name"],
                "passed": info["passed"],
                "status": info["status"],
            }
            for gid, info in sorted(candidate["gate_margins"].items())
        ],
    }


def _compute_margin_to_feasibility(closest: Dict[str, Any]) -> float:
    """
    Compute how far the closest candidate is from feasibility.
    Returns 0.0 if feasible, positive value otherwise.
    Metric: (100 - gate_score_pct) as a simple distance.
    """
    return round(100.0 - closest.get("gate_score_pct", 0.0), 1)


def _build_intervention_categories(
    binding_gates: List[Dict[str, Any]],
    mechanical_ids: Set[int],
) -> List[Dict[str, str]]:
    """Map binding mechanical gate IDs to intervention advisory categories."""
    interventions = []
    seen_categories = set()
    for gate in binding_gates:
        gid = gate["id"]
        if gid in GATE_INTERVENTION_MAP and gid not in seen_categories:
            info = GATE_INTERVENTION_MAP[gid]
            interventions.append({
                "gate_id": gid,
                "gate_name": info["gate_name"],
                "category": info["category"],
                "advisory": info["advisory"],
            })
            seen_categories.add(gid)
    return interventions
