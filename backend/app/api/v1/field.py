"""
backend/app/api/v1/field.py
Field-Level Steam Scheduling & Central Boiler Allocation API (Feature 4).
Provides multi-well CSS scheduling endpoints coordinating steam injection windows
across BGW-17A, BW-02, BW-03, and BW-04 to respect centralized boiler limits.
"""

from fastapi import APIRouter, HTTPException
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field

from backend.app.config import settings
from backend.app.optimization.field_scheduler import FieldSteamScheduler, WellCandidate, field_scheduler

router = APIRouter(prefix="/field", tags=["Field-Level Scheduling"])


class OptimizeScheduleRequest(BaseModel):
    boiler_capacity_t_d: Optional[float] = Field(default=120.0, description="Central boiler steam generation limit (t/d)")
    planning_horizon_days: Optional[int] = Field(default=30, description="Scheduling lookahead duration (days)")
    wells: Optional[List[Dict[str, Any]]] = Field(default=None, description="Optional custom well list overrides")


@router.get("/schedule")
def get_field_schedule() -> Dict[str, Any]:
    """
    Returns the current field-wide steam allocation schedule, boiler constraints,
    and multi-well Gantt timeline for Baghewala Field CSS producers.
    """
    if not settings.FIELD_SCHEDULING_ENABLED:
        return {
            "status": "DISABLED",
            "message": "Field-level scheduling is disabled by configuration (FIELD_SCHEDULING_ENABLED=False).",
            "enabled": False
        }

    res = field_scheduler.optimize_schedule()
    res["enabled"] = True
    return res


@router.post("/schedule/optimize")
def optimize_field_schedule(req: OptimizeScheduleRequest) -> Dict[str, Any]:
    """
    Optimizes multi-well steam injection sequencing given a specified boiler capacity
    and planning horizon to avoid boiler oversubscription and maximize oil recovery.
    """
    if not settings.FIELD_SCHEDULING_ENABLED:
        raise HTTPException(
            status_code=400,
            detail="Field-level scheduling is disabled by configuration."
        )

    capacity = req.boiler_capacity_t_d or settings.FIELD_TOTAL_STEAM_CAPACITY_T_D
    horizon = req.planning_horizon_days or 30

    scheduler = FieldSteamScheduler(
        boiler_capacity_t_d=capacity,
        planning_horizon_days=horizon
    )

    candidates = None
    if req.wells:
        candidates = []
        for w in req.wells:
            candidates.append(WellCandidate(
                well_id=w.get("well_id", "WELL"),
                well_name=w.get("well_name", "Well"),
                current_phase=w.get("current_phase", "PRODUCTION"),
                near_well_temp_c=w.get("near_well_temp_c", 50.0),
                current_oil_bopd=w.get("current_oil_bopd", 20.0),
                target_steam_tons=w.get("target_steam_tons", 500.0),
                injection_rate_t_d=w.get("injection_rate_t_d", 50.0),
                soak_days=w.get("soak_days", 5),
                css_cycle=w.get("css_cycle", 2),
                estimated_sor=w.get("estimated_sor", 6.5)
            ))

    res = scheduler.optimize_schedule(candidates=candidates)
    res["enabled"] = True
    return res
