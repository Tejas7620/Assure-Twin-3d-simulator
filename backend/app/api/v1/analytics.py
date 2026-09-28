"""
backend/app/api/v1/analytics.py — Advanced Analytics Endpoints (Phase 2 — H3 fix).

Engine routing strategy (Phase 2 decision):
  - /virtual-downhole, /pumpability, /envelope:
      Use twin engine (Engine B) as PRIMARY. If twin state is unavailable, fall
      back to sim engine (Engine A). State is normalised by state_adapter before
      reaching the analytics layer — so analytics modules are engine-agnostic.
  - /readiness, /thermal-memory, /sensitivity, /rehearsal:
      These already used twin_manager (Engine B) — no change needed.
  - /twin-state (NEW):
      Direct twin-engine state read for the frontend to use as its authoritative
      source of ground truth, bypassing the sim-engine WebSocket for assurance logic.
"""

from fastapi import APIRouter
from typing import Dict, Any, Optional
from pydantic import BaseModel

from backend.app.simulation.manager import get_sim_engine
from backend.app.analytics.virtual_sensors import estimate_virtual_downhole_state
from backend.app.analytics.pumpability import compute_pumpability_window
from backend.app.analytics.envelope import compute_operating_envelope
from backend.app.analytics.state_adapter import normalise
from backend.app.forecast.readiness import CSSReadinessEngine
from backend.app.forecast.thermal_memory import ThermalMemoryEngine
from backend.app.forecast.sensitivity import SensitivityEngine
from backend.app.forecast.rehearsal import DecisionRehearsalEngine
from backend.app.twin.engine import twin_manager
from backend.app.schemas.domain import PumpabilityResponse, OperatingEnvelopeResponse

router = APIRouter(prefix="/analytics", tags=["Analytics"])

readiness_engine = CSSReadinessEngine()
thermal_memory = ThermalMemoryEngine()
sensitivity_engine = SensitivityEngine()
rehearsal_engine = DecisionRehearsalEngine()


class RehearsalRequest(BaseModel):
    controls: Dict[str, float]
    horizon_days: int = 21


def _get_best_state() -> Dict[str, Any]:
    """
    Returns the most authoritative available state.
    Prefer twin engine (Engine B); fall back to sim engine (Engine A).
    Twin engine has proper RTU schema keys (loads.*, thermal.*, inflow.*);
    sim engine uses reservoir.*, srp.*, controls.* — both are normalised by
    state_adapter before reaching any analytics module.
    """
    try:
        well = twin_manager.get_active_well()
        state = well.step(0.0)
        if state and "thermal" in state:
            return state  # Twin engine state — richest
    except Exception:
        pass
    # Fall back to sim engine
    sim = get_sim_engine()
    return sim.step(0.0)


@router.get("/virtual-downhole")
def get_virtual_downhole_state() -> Dict[str, Any]:
    """
    H3 fix: Uses twin engine if available, falls back to sim. State is
    normalised before reaching estimate_virtual_downhole_state().
    H4 fix: Sensor confidence is derived from data availability (not hardcoded HIGH).
    """
    state = _get_best_state()
    sensors = estimate_virtual_downhole_state(state)
    n = normalise(state)
    return {
        "well_id": n.get("well_id", "BGW-17A"),
        "engine": n.get("_engine", "sim"),
        "sensors": sensors
    }


@router.get("/pumpability")
def get_pumpability_window() -> Dict[str, Any]:
    """
    H3 fix: Uses twin engine if available. Float margin now correctly read
    from loads.float_margin_pct (twin) or srp.float_margin_pct (sim).
    """
    state = _get_best_state()
    return compute_pumpability_window(state)


@router.get("/envelope")
def get_operating_envelope() -> Dict[str, Any]:
    """H3 fix: Uses twin engine if available. Adds smooth interpolation."""
    state = _get_best_state()
    return compute_operating_envelope(state)


@router.get("/twin-state")
def get_twin_state() -> Dict[str, Any]:
    """
    NEW endpoint: Returns the raw twin-engine state dict for the frontend
    to use as its authoritative source of ground truth (bypasses sim-engine
    WebSocket stream for assurance/recommendation pages).
    Also returns normalised keys for easy client consumption.
    """
    try:
        well = twin_manager.get_active_well()
        raw = well.step(0.0)
        n = normalise(raw)
        return {
            "source": "twin",
            "well_id": raw.get("well_id", "BGW-17A"),
            "normalised": n,
            "raw": raw
        }
    except Exception as e:
        # Fall back to sim engine if twin unavailable
        sim = get_sim_engine()
        raw = sim.step(0.0)
        n = normalise(raw)
        return {
            "source": "sim_fallback",
            "fallback_reason": str(e),
            "well_id": "BGW-17A",
            "normalised": n,
            "raw": raw
        }


@router.get("/readiness")
def get_css_readiness() -> Dict[str, Any]:
    well = twin_manager.get_active_well()
    state = well.step(0.0)
    return readiness_engine.evaluate_readiness(
        current_temp_c=state["thermal"]["near_well_temp_c"],
        current_oil_rate_bpd=state["production"]["oil_rate_bpd"],
        current_sor=state["economics"]["instantaneous_sor"],
        days_in_production=state["css"]["phase_time_elapsed_days"],
        daily_profit_usd=state["economics"]["daily_profit_usd"]
    )


@router.get("/thermal-memory")
def get_thermal_memory() -> Dict[str, Any]:
    return thermal_memory.get_memory_summary()


@router.get("/sensitivity")
def get_sensitivity_analysis() -> Dict[str, Any]:
    well = twin_manager.get_active_well()
    state = well.step(0.0)
    return sensitivity_engine.analyze_sensitivities(
        base_daily_oil_bpd=state["production"]["oil_rate_bpd"],
        base_daily_profit_usd=state["economics"]["daily_profit_usd"]
    )


@router.post("/rehearsal")
def run_decision_rehearsal(req: RehearsalRequest) -> Dict[str, Any]:
    well = twin_manager.get_active_well()
    return rehearsal_engine.rehearse_decision(
        live_engine=well,
        proposed_controls=req.controls,
        rehearsal_horizon_days=req.horizon_days
    )
