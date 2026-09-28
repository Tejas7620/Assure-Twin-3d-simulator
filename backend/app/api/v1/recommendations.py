"""
backend/app/api/v1/recommendations.py
Explainable Decision Recommendations & Engineer Approval Sign-off (Phase 30).
"""

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from datetime import datetime

from backend.app.database import get_db
from backend.app.schemas.domain import (
    RecommendationCaseResponse, RecommendationActionRequest
)
from backend.app.simulation.manager import get_sim_engine

router = APIRouter(prefix="/recommendations", tags=["Recommendations"])

# In-memory recommendation registry with default Baghewala high-confidence case
DEFAULT_RECOMMENDATION = {
    "case_id": "REC-2026-BGW-004",
    "well_id": "BGW-17A",
    "status": "AWAITING_APPROVAL",
    "title": "Optimize Stroke to 74\" and De-rate SPM to 2.8 for Cycle 4 Thermal Window Extension",
    "proposed_controls": {
        "spm": 2.8,
        "stroke_inches": 74.0,
        "vfd_frequency_hz": 52.0,
        "steam_volume_tons": 2400.0,
        "soak_time_days": 5.0
    },
    "expected_outcomes": {
        "oil_rate_gain_bopd": "+5.8 BOPD (+17.8%)",
        "sor_improvement": "Reduced from 2.84 to 2.62 (-7.7%)",
        "thermal_window_extension": "+14.5 Days (from 24.0d to 38.5d)",
        "rod_float_safety_margin": "Enhanced from 28.9% to 34.2% (+18.3%)",
        "monthly_net_revenue_inr": "₹ 12,80,000 net value addition"
    },
    "causal_reasons_why": [
        "Near-wellbore thermal decay rate is 0.34°C/day. Lowering SPM to 2.8 reduces Couette annular shear heating loss and preserves downward rod momentum.",
        "Increasing stroke length from 64\" to 74\" recovers displacement volume loss while operating at lower rod cycle frequency, lowering cyclic fatigue stress.",
        "Maintains pump fillage at 68.4% without inducing fluid pound or gas locking."
    ],
    "counterfactual_rejections_why_not": [
        "Rejected SPM 3.8: Downstroke rod float margin decreases below 14.0%, causing severe risk of sinker bar buckling and unseated traveling valve.",
        "Rejected Steam Volume 3200 Tons: Thermal efficiency exhibits diminishing returns (SOR > 3.8); steam cap breaching risk at overburden interface.",
        "Rejected Shut-in / Soak Extension > 7 Days: Reservoir conductive heat dissipation to barren underburden exceeds 28% total injected enthalpy."
    ],
    "preconditions": [
        "Confirm polished rod load cell calibration within 30 days (Verified: 14 days ago)",
        "Confirm wellhead backpressure <= 12.5 bar (Verified: 8.4 bar)",
        "Verify acoustic fluid level above pump intake by at least 150m (Verified: 480m submergence)"
    ],
    "assurance_status": "PASSED_ALL_12_CHECKPOINTS",
    "created_at": datetime.utcnow(),
    "approved_by": None,
    "approval_timestamp": None
}

recommendations_store = {
    DEFAULT_RECOMMENDATION["case_id"]: dict(DEFAULT_RECOMMENDATION)
}

@router.get("", response_model=List[RecommendationCaseResponse])
def list_recommendations() -> List[Dict[str, Any]]:
    return list(recommendations_store.values())

@router.get("/{case_id}", response_model=RecommendationCaseResponse)
def get_recommendation_by_id(case_id: str) -> Dict[str, Any]:
    if case_id not in recommendations_store:
        raise HTTPException(status_code=404, detail=f"Recommendation {case_id} not found")
    return recommendations_store[case_id]

@router.post("/{case_id}/approve", response_model=RecommendationCaseResponse)
def approve_recommendation(case_id: str, action: RecommendationActionRequest) -> Dict[str, Any]:
    if case_id not in recommendations_store:
        raise HTTPException(status_code=404, detail=f"Recommendation {case_id} not found")
    
    rec = recommendations_store[case_id]
    rec["status"] = "APPROVED_BY_ENGINEER"
    rec["approved_by"] = action.actor
    rec["approval_timestamp"] = datetime.utcnow()

    # Automatically apply proposed controls to active simulation engine
    sim = get_sim_engine()
    controls = rec["proposed_controls"]
    if "spm" in controls:
        sim.set_control("spm", controls["spm"])
    if "stroke_inches" in controls:
        sim.set_control("stroke_inches", controls["stroke_inches"])

    return rec

@router.post("/{case_id}/reject", response_model=RecommendationCaseResponse)
def reject_recommendation(case_id: str, action: RecommendationActionRequest) -> Dict[str, Any]:
    if case_id not in recommendations_store:
        raise HTTPException(status_code=404, detail=f"Recommendation {case_id} not found")
    
    rec = recommendations_store[case_id]
    rec["status"] = "REJECTED_BY_ENGINEER"
    rec["approved_by"] = f"Rejected by: {action.actor} ({action.notes or 'No reason provided'})"
    rec["approval_timestamp"] = datetime.utcnow()
    return rec
