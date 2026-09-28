"""
backend/app/api/v1/assurance.py - Zero-Trust Safety Gatekeeper, Why Engine, and Audit Endpoints.
"""

from fastapi import APIRouter
from typing import Dict, Any, Optional
from pydantic import BaseModel

from backend.app.simulation.manager import get_sim_engine
from backend.app.assurance.gatekeeper import evaluate_assurance_gate
from backend.app.assurance.engine import assurance_engine
from backend.app.twin.engine import twin_manager
from backend.app.schemas.domain import AssuranceResponse

router = APIRouter(prefix="/assurance", tags=["Assurance"])

class CandidateAssuranceRequest(BaseModel):
    controls: Optional[Dict[str, Any]] = None

class WhyRequest(BaseModel):
    action: str = "Optimize Pumping Speed and Steam Injection"
    proposed_setpoints: Dict[str, float] = {"spm": 3.2, "stroke_inches": 64.0}

@router.get("/evaluate", response_model=AssuranceResponse)
def evaluate_current_assurance() -> Dict[str, Any]:
    sim = get_sim_engine()
    state = sim.step(0.0)
    return evaluate_assurance_gate(state)

@router.post("/evaluate-candidate", response_model=AssuranceResponse)
def evaluate_candidate_assurance(req: CandidateAssuranceRequest) -> Dict[str, Any]:
    sim = get_sim_engine()
    state = sim.step(0.0)
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
