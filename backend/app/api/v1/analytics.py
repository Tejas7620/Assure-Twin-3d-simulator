"""
backend/app/api/v1/analytics.py - Advanced Analytics Endpoints: Virtual Sensors, Pumpability, Envelope, Readiness, Thermal Memory, and Rehearsal.
"""

from fastapi import APIRouter
from typing import Dict, Any, Optional
from pydantic import BaseModel

from backend.app.simulation.manager import get_sim_engine
from backend.app.analytics.virtual_sensors import estimate_virtual_downhole_state
from backend.app.analytics.pumpability import compute_pumpability_window
from backend.app.analytics.envelope import compute_operating_envelope
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

@router.get("/virtual-downhole")
def get_virtual_downhole_state() -> Dict[str, Any]:
    sim = get_sim_engine()
    state = sim.step(0.0)
    sensors = estimate_virtual_downhole_state(state)
    return {
        "well_id": "BGW-17A",
        "sensors": sensors
    }

@router.get("/pumpability", response_model=PumpabilityResponse)
def get_pumpability_window() -> Dict[str, Any]:
    sim = get_sim_engine()
    state = sim.step(0.0)
    return compute_pumpability_window(state)

@router.get("/envelope", response_model=OperatingEnvelopeResponse)
def get_operating_envelope() -> Dict[str, Any]:
    sim = get_sim_engine()
    state = sim.step(0.0)
    return compute_operating_envelope(state)

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
