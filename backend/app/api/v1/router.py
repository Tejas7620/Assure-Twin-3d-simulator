"""
backend/app/api/v1/router.py
Master API v1 Router aggregating all domain sub-routers and core specification endpoints.
SIH 2026 - Problem Statement SIH26120: Digital Twin for CSS & SRP Optimization.
"""

from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any, List
from datetime import datetime, timezone

from backend.app.api.v1.wells import router as wells_router
from backend.app.api.v1.simulation import router as simulation_router
from backend.app.api.v1.analytics import router as analytics_router
from backend.app.api.v1.forecast import router as forecast_router
from backend.app.api.v1.scenarios import router as scenarios_router
from backend.app.api.v1.optimization import router as optimization_router
from backend.app.api.v1.recommendations import router as recommendations_router
from backend.app.api.v1.assurance import router as assurance_router
from backend.app.api.v1.alerts import router as alerts_router
from backend.app.api.v1.websocket import router as websocket_router
from backend.app.api.v1.calibration import router as calibration_router
from backend.app.api.v1.reports import router as reports_router
from backend.app.api.v1.dynacard import router as dynacard_router
from backend.app.api.v1.reliability import router as reliability_router
from backend.app.api.v1.models_registry import router as models_router
from backend.app.api.v1.provenance import router as provenance_router
from backend.app.api.v1.field import router as field_router

from backend.app.simulation.manager import get_sim_engine
from backend.app.twin.engine import twin_manager
from backend.app.analytics.pumpability import compute_pumpability_window
from backend.app.analytics.envelope import compute_operating_envelope
from backend.app.assurance.engine import assurance_engine

api_v1_router = APIRouter(prefix="/api/v1")

# Sub-domain routers
api_v1_router.include_router(wells_router)
api_v1_router.include_router(simulation_router)
api_v1_router.include_router(analytics_router)
api_v1_router.include_router(forecast_router)
api_v1_router.include_router(scenarios_router)
api_v1_router.include_router(optimization_router)
api_v1_router.include_router(recommendations_router)
api_v1_router.include_router(assurance_router)
api_v1_router.include_router(alerts_router)
api_v1_router.include_router(websocket_router)
api_v1_router.include_router(calibration_router)
api_v1_router.include_router(reports_router)
api_v1_router.include_router(dynacard_router)
api_v1_router.include_router(reliability_router)
api_v1_router.include_router(models_router)
api_v1_router.include_router(provenance_router)
api_v1_router.include_router(field_router)

# Top-level specification endpoints (Phase 47)

@api_v1_router.get("/health", tags=["Health"])
def api_health_check():
    sim = get_sim_engine()
    return {
        "status": "HEALTHY",
        "service": "ASSURE-TWIN API v1",
        "problem_statement": "SIH 2026 - PS 26120",
        "target_field": "Baghewala Heavy Oil Field, Rajasthan",
        "demo_well": "BGW-17A",
        "sim_time_days": round(sim.sim_time_days, 1),
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

@api_v1_router.get("/fields", tags=["Wells"])
def get_fields() -> List[Dict[str, Any]]:
    return [
        {
            "id": "BAGHEWALA-ASSET",
            "name": "Baghewala Heavy Oil Field",
            "basin": "Bikaner-Nagaur Basin",
            "state": "Rajasthan, India",
            "operator": "Oil India Limited (OIL)",
            "primary_formation": "Jodhpur Sandstone",
            "lithology": "Consolidated Sandstone with Heavy Asphaltic Crude",
            "oil_api_gravity": 11.2,
            "viscosity_range_cp": "1,200 - 15,000 cP",
            "active_wells_count": 1,
            "demo_well": "BGW-17A"
        }
    ]

@api_v1_router.get("/audit", tags=["Assurance"])
def get_audit_trail() -> Dict[str, Any]:
    try:
        active_well = twin_manager.get_active_well()
        state = active_well.step(0.0)
    except Exception:
        sim = get_sim_engine()
        state = sim.step(0.0)
    return assurance_engine.evaluate_system(state)

@api_v1_router.get("/pumpability/{well_id}", tags=["Analytics"])
def get_well_pumpability_top(well_id: str):
    from backend.app.api.v1.wells import _get_well_state_with_demo
    state = _get_well_state_with_demo(well_id)
    return compute_pumpability_window(state)

@api_v1_router.get("/envelope/{well_id}", tags=["Analytics"])
def get_well_envelope_top(well_id: str):
    from backend.app.api.v1.wells import _get_well_state_with_demo
    state = _get_well_state_with_demo(well_id)
    return compute_operating_envelope(state)
