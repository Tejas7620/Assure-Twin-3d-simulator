"""
backend/app/api/v1/forecast.py
Multi-Horizon Dynamic Production & Thermal Forecast Endpoints.
"""

from fastapi import APIRouter, Query
from typing import Dict, Any

from backend.app.simulation.manager import get_sim_engine
from backend.app.forecast.service import generate_forecast
from backend.app.schemas.domain import ForecastResponse

router = APIRouter(prefix="/forecast", tags=["Forecast"])

@router.get("", response_model=ForecastResponse)
def get_forecast(horizon_days: int = Query(default=30, ge=7, le=180)) -> Dict[str, Any]:
    sim = get_sim_engine()
    state = sim.step(0.0)
    return generate_forecast(state, horizon_days=horizon_days)
