"""
backend/app/api/v1/assurance.py - Zero-Trust Safety Gatekeeper, Why Engine, and Audit Endpoints.

Phase 2 fix: /evaluate and /evaluate-candidate now use the twin engine as primary
state source (same _get_best_state() strategy as analytics.py). Strict response_model
removed — gatekeeper now returns richer data (warning_count, failed_count, etc.)
that would fail the old narrow AssuranceResponse schema.
"""

from fastapi import APIRouter
from typing import Dict, Any, Optional
from pydantic import BaseModel

from backend.app.simulation.manager import get_sim_engine
from backend.app.assurance.gatekeeper import evaluate_assurance_gate
from backend.app.assurance.engine import assurance_engine
from backend.app.twin.engine import twin_manager

router = APIRouter(prefix="/assurance", tags=["Assurance"])


class CandidateAssuranceRequest(BaseModel):
    controls: Optional[Dict[str, Any]] = None


class WhyRequest(BaseModel):
    action: str = "Optimize Pumping Speed and Steam Injection"
    proposed_setpoints: Dict[str, float] = {"spm": 3.2, "stroke_inches": 64.0}


def _get_best_state() -> Dict[str, Any]:
    """Twin engine (B) preferred; sim engine (A) fallback."""
    try:
        well = twin_manager.get_active_well()
        state = well.step(0.0)
        if state and "thermal" in state:
            return state
    except Exception:
        pass
    return get_sim_engine().step(0.0)


@router.get("/evaluate")
def evaluate_current_assurance() -> Dict[str, Any]:
    """
    12-checkpoint zero-trust assurance gate.
    Uses twin engine state (with its correct loads.*, thermal.*, inflow.* keys);
    falls back to sim engine state. Returns real physics-derived verdicts (C2 fix).
    """
    state = _get_best_state()
    return evaluate_assurance_gate(state)


@router.post("/evaluate-candidate")
def evaluate_candidate_assurance(req: CandidateAssuranceRequest) -> Dict[str, Any]:
    """Evaluate a proposed control candidate against the assurance gate."""
    state = _get_best_state()
    return evaluate_assurance_gate(state, req.controls)


@router.get("/audit")
def run_full_assurance_audit() -> Dict[str, Any]:
    well = twin_manager.get_active_well()
    state = well.step(0.0)
    return assurance_engine.evaluate_system(state)


@router.post("/why")
def explain_decision(req: WhyRequest) -> Dict[str, Any]:
    well = twin_manager.get_active_well()
    state = well.step(0.0)
    return assurance_engine.explain(req.action, state, req.proposed_setpoints)
