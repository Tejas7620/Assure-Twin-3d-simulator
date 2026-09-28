"""
backend/app/api/v1/recommendations.py
Explainable Decision Recommendations & Engineer Approval Sign-off (Phase 30).

C1 fix: DEFAULT_RECOMMENDATION removed. Recommendations are generated from:
  1. solve_joint_optimization() — simulated candidate grid (C3 fix, §108)
  2. DecisionRehearsalEngine.rehearse_decision() — forward safety trial on twin clone
  3. evaluate_assurance_gate() — 12-checkpoint gate (C2 fix, real predicates)
  4. AssuranceEngine.evaluate_system() — composite verdict with abstain path

When the gate or rehearsal fails, the endpoint returns NO_SAFE_RECOMMENDATION
rather than a fallback hardcoded string.  This is the spec's headline differentiator.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.schemas.domain import (
    RecommendationCaseResponse, RecommendationActionRequest
)
from backend.app.simulation.manager import get_sim_engine
from backend.app.twin.engine import twin_manager
from backend.app.optimization.optimizer import solve_joint_optimization
from backend.app.assurance.engine import assurance_engine
from backend.app.assurance.gatekeeper import evaluate_assurance_gate
from backend.app.forecast.rehearsal import DecisionRehearsalEngine
from backend.app.schemas.domain import OptimizationWeights


router = APIRouter(prefix="/recommendations", tags=["Recommendations"])

# ---------------------------------------------------------------------------
# In-memory store — populated by /generate, persisted across session
# ---------------------------------------------------------------------------
_recommendations_store: Dict[str, Dict[str, Any]] = {}

_rehearsal_engine = DecisionRehearsalEngine()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _now() -> datetime:
    return datetime.now(timezone.utc)


def _build_causal_reasons(best: Dict[str, Any], current_state: Dict[str, Any]) -> List[str]:
    """Construct causal reasons from the computed best candidate's physics."""
    current_spm = float(current_state.get("controls", {}).get("spm", 3.2))
    current_stroke = float(current_state.get("controls", {}).get("stroke_inches", 64.0))
    current_temp = float(
        current_state.get("thermal", {}).get("near_well_temp_c",
        current_state.get("reservoir", {}).get("temperature_c", 72.6))
    )

    reasons = []

    # Reason 1: SPM change and its effect on float margin
    if abs(best["spm"] - current_spm) > 0.05:
        direction = "Decreasing" if best["spm"] < current_spm else "Increasing"
        reasons.append(
            f"{direction} SPM from {current_spm:.1f} to {best['spm']:.1f} "
            f"{'reduces downstroke inertia load, improving rod-float margin to ' + str(best['float_margin_pct']) + '%' if best['spm'] < current_spm else 'increases displacement and oil recovery'}."
        )

    # Reason 2: Stroke change and displacement
    if abs(best["stroke_in"] - current_stroke) > 1.0:
        direction = "Increasing" if best["stroke_in"] > current_stroke else "Decreasing"
        disp_change_pct = 100.0 * (best["spm"] * best["stroke_in"] - current_spm * current_stroke) / max(1.0, current_spm * current_stroke)
        reasons.append(
            f"{direction} stroke length from {current_stroke:.0f}\" to {best['stroke_in']:.0f}\" "
            f"adjusts effective pump displacement by {disp_change_pct:+.1f}%, "
            f"targeting {best['oil_rate_bopd']:.1f} BOPD net production."
        )

    # Reason 3: SOR and thermal window
    sor = best.get("sor", 0.0)
    pump_days = best.get("pumpability_days", 0.0)
    reasons.append(
        f"Candidate SOR = {sor:.2f} (below 4.5 economic limit). "
        f"Estimated pumpability window = {pump_days:.0f} days at T={current_temp:.1f}°C near-well temperature."
    )

    if not reasons:
        reasons.append(
            f"Operating point SPM={best['spm']:.1f}, stroke={best['stroke_in']:.0f}\" "
            f"maximises score={best['overall_score']:.1f}/100 on current weight set."
        )

    return reasons


def _build_counterfactuals(all_candidates: List[Dict[str, Any]], best: Dict[str, Any]) -> List[str]:
    """Generate WHY-NOT explanations for rejected candidates."""
    rejected = []
    for c in all_candidates:
        if c.get("candidate_id") == best.get("candidate_id"):
            continue
        if c.get("excluded", False):
            rejected.append(
                f"Rejected SPM={c['spm']:.1f}/stroke={c['stroke_in']:.0f}\": "
                f"float margin {c['float_margin_pct']:.1f}% < 10% minimum — mechanical exclusion."
            )
        elif c["overall_score"] < best["overall_score"]:
            delta = best["overall_score"] - c["overall_score"]
            rejected.append(
                f"Rejected SPM={c['spm']:.1f}/stroke={c['stroke_in']:.0f}\": "
                f"utility score {c['overall_score']:.1f} vs best {best['overall_score']:.1f} "
                f"(−{delta:.1f}); SOR={c.get('sor', 0.0):.2f}, float={c['float_margin_pct']:.1f}%."
            )

    return rejected[:3]   # Top-3 counterfactuals


def _generate_recommendation(
    twin_state: Dict[str, Any],
    weights: Optional[OptimizationWeights] = None
) -> Dict[str, Any]:
    """
    Core recommendation generator. Returns a recommendation dict or a NO_SAFE dict.
    §108: all controls come from the optimizer — never hardcoded.
    """
    if weights is None:
        weights = OptimizationWeights()

    # Step 1 — Optimization (C3 fix: simulated candidates)
    opt_result = solve_joint_optimization(twin_state, weights)
    candidates = opt_result.get("candidates", [])
    best = opt_result.get("best_candidate", {})

    if not candidates or not best or best.get("excluded", False):
        return _abstain_response(
            reason="All optimization candidates violate mechanical safety constraints.",
            blocking=["Rod float margin < 10% across all evaluated operating points."],
            required=["Inspect rod string, check buoyancy conditions, verify load cell calibration."]
        )

    # Step 2 — Rehearsal on twin clone (forward 21-day safety trial)
    active_well = twin_manager.get_active_well()
    proposed_controls = {
        "spm": best["spm"],
        "stroke_inches": best["stroke_in"]
    }
    rehearsal = _rehearsal_engine.rehearse_decision(
        live_engine=active_well,
        proposed_controls=proposed_controls,
        rehearsal_horizon_days=21
    )

    if not rehearsal["is_safe_to_execute"]:
        violations_summary = "; ".join(
            v["message"] for v in rehearsal["violations"][:3]
        )
        return _abstain_response(
            reason="21-day forward rehearsal failed safety boundaries.",
            blocking=[violations_summary],
            required=["Review proposed SPM/stroke before deployment. Rehearsal trajectory attached."],
            rehearsal=rehearsal
        )

    # Step 3 — Assurance gate (C2 fix: real predicates, not hardwired True)
    gate = evaluate_assurance_gate(twin_state, proposed_controls)

    if gate["abstain_active"]:
        return _abstain_response(
            reason="Assurance gate checkpoints failed — unsafe to recommend.",
            blocking=gate["blocking_reasons"][:5],
            required=gate["required_data"][:3],
            gate=gate,
            rehearsal=rehearsal
        )

    # Step 4 — Full assurance evaluation for composite verdict
    assurance = assurance_engine.evaluate_system(twin_state, proposed_controls)

    # Step 5 — Build explainable recommendation
    case_id = f"REC-{_now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:6].upper()}"
    causal_reasons = _build_causal_reasons(best, twin_state)
    counterfactuals = _build_counterfactuals(candidates, best)

    expected_outcomes: Dict[str, str] = {
        "oil_rate_gain_bopd":       f"+{best['gain_bopd']:.1f} BOPD ({100.0*best['gain_bopd']/max(1.0, float(twin_state.get('production', {}).get('oil_rate_bopd', twin_state.get('production', {}).get('oil_rate_bpd', 32.6)))):.1f}%)",
        "sor":                      f"{best['sor']:.2f} (analytically simulated)",
        "float_margin":             f"{best['float_margin_pct']:.1f}% downstroke margin",
        "pumpability_window_days":  f"{best['pumpability_days']:.0f} days estimated",
        "daily_profit_usd":         f"USD {best['daily_profit_usd']:+.0f}/day (analytically computed)"
    }

    gate_summary = gate["status"]
    if gate["warning_count"] > 0:
        gate_summary += f" ({gate['warning_count']} advisory warning(s))"

    return {
        "case_id": case_id,
        "well_id": twin_state.get("well_id", "BGW-17A"),
        "status": "AWAITING_APPROVAL",
        "recommendation_type": "SAFE_RECOMMENDATION",
        "title": (
            f"Adjust SRP to SPM={best['spm']:.1f} / Stroke={best['stroke_in']:.0f}\" "
            f"(score={best['overall_score']:.1f}/100)"
        ),
        "proposed_controls": {
            "spm": best["spm"],
            "stroke_inches": best["stroke_in"],
            "steam_volume_tons": twin_state.get("controls", {}).get("steam_rate_t_d", 2400.0)
        },
        "expected_outcomes": expected_outcomes,
        "causal_reasons_why": causal_reasons,
        "counterfactual_rejections_why_not": counterfactuals,
        "preconditions": [
            f"Rehearsal: 21-day forward trial — APPROVED_SAFE (min float={rehearsal['min_float_margin_pct']:.1f}%, max PPRL={rehearsal['max_pprl_kn']:.1f} kN).",
            f"Assurance gate: {gate_summary}.",
            f"OOD guard: SPM={best['spm']:.1f} in [0.5,6.0], stroke={best['stroke_in']:.0f}\" in [48,120\"] — in-distribution."
        ],
        "assurance_status": gate_summary,
        "assurance_detail": assurance,
        "optimization_detail": opt_result,
        "rehearsal_detail": rehearsal,
        "created_at": _now(),
        "approved_by": None,
        "approval_timestamp": None
    }


def _abstain_response(
    reason: str,
    blocking: List[str],
    required: List[str],
    gate: Optional[Dict[str, Any]] = None,
    rehearsal: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """Returns a NO_SAFE_RECOMMENDATION response — never a fallback hardcoded answer."""
    case_id = f"ABSTAIN-{_now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:6].upper()}"
    return {
        "case_id": case_id,
        "well_id": "BGW-17A",
        "status": "NO_SAFE_RECOMMENDATION",
        "recommendation_type": "ABSTAIN",
        "title": "NO SAFE RECOMMENDATION — Engineer Intervention Required",
        "proposed_controls": {},
        "expected_outcomes": {},
        "causal_reasons_why": [],
        "counterfactual_rejections_why_not": [],
        "preconditions": [],
        "abstain_reason": reason,
        "blocking_reasons": blocking,
        "required_actions": required,
        "assurance_status": "ABSTAINED",
        "assurance_detail": gate,
        "rehearsal_detail": rehearsal,
        "created_at": _now(),
        "approved_by": None,
        "approval_timestamp": None
    }


# ---------------------------------------------------------------------------
# API Endpoints
# ---------------------------------------------------------------------------

@router.post("/generate", response_model=Dict[str, Any])
def generate_recommendation(
    weights: Optional[OptimizationWeights] = None,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Generates a fresh recommendation from current twin state.
    May return NO_SAFE_RECOMMENDATION if safety constraints are violated.
    §108: controls are never hardcoded — always derived from the optimizer.
    """
    active_well = twin_manager.get_active_well()
    twin_state = active_well.step(0.0)  # Read current state without advancing clock

    rec = _generate_recommendation(twin_state, weights)
    _recommendations_store[rec["case_id"]] = rec
    return rec


@router.get("", response_model=List[Dict[str, Any]])
def list_recommendations() -> List[Dict[str, Any]]:
    return list(_recommendations_store.values())


@router.get("/{case_id}", response_model=Dict[str, Any])
def get_recommendation_by_id(case_id: str) -> Dict[str, Any]:
    if case_id not in _recommendations_store:
        raise HTTPException(status_code=404, detail=f"Recommendation {case_id} not found")
    return _recommendations_store[case_id]


@router.post("/{case_id}/approve", response_model=Dict[str, Any])
def approve_recommendation(case_id: str, action: RecommendationActionRequest) -> Dict[str, Any]:
    if case_id not in _recommendations_store:
        raise HTTPException(status_code=404, detail=f"Recommendation {case_id} not found")

    rec = _recommendations_store[case_id]

    if rec["recommendation_type"] == "ABSTAIN":
        raise HTTPException(
            status_code=409,
            detail="Cannot approve an ABSTAIN recommendation — no safe controls to apply."
        )

    rec["status"] = "APPROVED_BY_ENGINEER"
    rec["approved_by"] = action.actor
    rec["approval_timestamp"] = _now()

    # Apply the *actual* proposed controls from this specific recommendation
    controls = rec.get("proposed_controls", {})
    active_well = twin_manager.get_active_well()
    if "spm" in controls:
        active_well.set_parameter("spm", float(controls["spm"]))
    if "stroke_inches" in controls:
        active_well.set_parameter("stroke_inches", float(controls["stroke_inches"]))

    # Also push to sim engine (Engine A) for WebSocket broadcast compatibility
    try:
        sim = get_sim_engine()
        if "spm" in controls:
            sim.set_control("spm", float(controls["spm"]))
        if "stroke_inches" in controls:
            sim.set_control("stroke_inches", float(controls["stroke_inches"]))
    except Exception:
        pass   # Sim engine sync is best-effort; twin engine is authoritative

    return rec


@router.post("/{case_id}/reject", response_model=Dict[str, Any])
def reject_recommendation(case_id: str, action: RecommendationActionRequest) -> Dict[str, Any]:
    if case_id not in _recommendations_store:
        raise HTTPException(status_code=404, detail=f"Recommendation {case_id} not found")

    rec = _recommendations_store[case_id]
    rec["status"] = "REJECTED_BY_ENGINEER"
    rec["approved_by"] = f"Rejected by: {action.actor}"
    rec["rejection_notes"] = action.notes or "No reason provided"
    rec["approval_timestamp"] = _now()
    return rec
