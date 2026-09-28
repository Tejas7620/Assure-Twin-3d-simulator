"""
backend/app/api/v1/forecast.py
Multi-Horizon Dynamic Production & Thermal Forecast Endpoints (Phase 2 fix).

Phase 2 fix: Uses twin engine as primary state source. The forecast service
reads reservoir.temperature_c and production.oil_rate_bopd which both work
for sim engine, but we prefer twin's more precise thermal.near_well_temp_c
for a more accurate initial condition. The state_adapter normalises these
before passing to generate_forecast().
"""

from fastapi import APIRouter, Query
from typing import Dict, Any

from backend.app.simulation.manager import get_sim_engine
from backend.app.forecast.service import generate_forecast
from backend.app.analytics.state_adapter import normalise
from backend.app.twin.engine import twin_manager

router = APIRouter(prefix="/forecast", tags=["Forecast"])


def _get_best_state() -> Dict[str, Any]:
    try:
        well = twin_manager.get_active_well()
        state = well.step(0.0)
        if state and "thermal" in state:
            return state
    except Exception:
        pass
    return get_sim_engine().step(0.0)


def _adapt_for_forecast(raw_state: Dict[str, Any]) -> Dict[str, Any]:
    """
    The forecast service reads reservoir.temperature_c, controls.spm, etc.
    from the raw state. We inject normalised values into the reservoir/controls
    keys so the existing forecast service code keeps working regardless of engine.
    """
    n = normalise(raw_state)
    # Build a synthetic "sim-compatible" state from normalised values
    adapted = dict(raw_state)
    if "reservoir" not in adapted:
        adapted["reservoir"] = {}
    if n["temperature_c"] is not None:
        adapted["reservoir"]["temperature_c"] = n["temperature_c"]
    if n["viscosity_cp"] is not None:
        adapted["reservoir"]["viscosity_cp"] = n["viscosity_cp"]
    if "controls" not in adapted:
        adapted["controls"] = {}
    if n["spm"] is not None:
        adapted["controls"]["spm"] = n["spm"]
    if n["stroke_in"] is not None:
        adapted["controls"]["stroke_inches"] = n["stroke_in"]
    if "production" not in adapted:
        adapted["production"] = {}
    if n["oil_rate_bopd"] is not None:
        adapted["production"]["oil_rate_bopd"] = n["oil_rate_bopd"]
    if "economics" not in adapted:
        adapted["economics"] = {}
    if n["sor"] is not None:
        adapted["economics"]["instantaneous_sor"] = n["sor"]
    return adapted


@router.get("")
def get_forecast(horizon_days: int = Query(default=30, ge=7, le=180)) -> Dict[str, Any]:
    """
    Phase 2 fix: Uses twin engine as primary, sim as fallback.
    Injects normalised temperature/SPM into the adapted state for the forecast
    service so it always starts from the most accurate initial conditions.
    """
    raw = _get_best_state()
    adapted = _adapt_for_forecast(raw)
    return generate_forecast(adapted, horizon_days=horizon_days)
