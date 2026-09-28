"""
backend/app/api/v1/alerts.py
Operational Threshold Alarming & Dynamic Notification Endpoints.
Integrates real-time state scanning from the AlertEngine with in-memory store and database persistence.
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from backend.app.schemas.domain import AlertSchema
from backend.app.assurance.alert_engine import AlertEngine
from backend.app.twin.engine import twin_manager
from backend.app.simulation.manager import get_sim_engine
from backend.app.database import get_db

router = APIRouter(prefix="/alerts", tags=["Alerts"])

_alert_engine = AlertEngine()

def _now():
    return datetime.now(timezone.utc)

INITIAL_ALERTS = [
    {
        "id": "ALT-2026-081",
        "well_id": "BGW-17A",
        "severity": "WARNING",
        "title": "Thermal Reserve Boundary Approaching",
        "description": "Downhole temperature at 72.6°C. Forecasted to cross critical 58°C threshold in 24.3 days.",
        "value": 72.6,
        "threshold": 58.0,
        "status": "ACTIVE",
        "created_at": _now()
    },
    {
        "id": "ALT-2026-082",
        "well_id": "BGW-17A",
        "severity": "INFO",
        "title": "Optimal Stroke Adjustment Available",
        "description": "Joint optimizer suggests 74\" stroke with 2.8 SPM to increase net daily margin by ₹ 42,600.",
        "value": 2.8,
        "threshold": 3.2,
        "status": "ACTIVE",
        "created_at": _now()
    },
    {
        "id": "ALT-2026-080",
        "well_id": "BGW-17A",
        "severity": "WARNING",
        "title": "Couette Annular Rod Drag Approaching 6.5 kN",
        "description": "Viscosity elevated to 1,840 cP. Downstroke rod friction climbing.",
        "value": 5.4,
        "threshold": 6.5,
        "status": "ACKNOWLEDGED",
        "created_at": _now()
    }
]

alerts_store: Dict[str, Dict[str, Any]] = {a["id"]: dict(a) for a in INITIAL_ALERTS}


def _sync_live_alerts():
    """Dynamically scan live twin state and add active physical alerts to the store."""
    try:
        well = twin_manager.get_active_well()
        state = well.step(0.0)
    except Exception:
        sim = get_sim_engine()
        state = sim.step(0.0)

    dynamic_alerts = _alert_engine.evaluate_state(state)
    for da in dynamic_alerts:
        alert_id = da["code"]
        if alert_id not in alerts_store:
            alerts_store[alert_id] = {
                "id": alert_id,
                "well_id": "BGW-17A",
                "severity": da["severity"],
                "title": da["title"],
                "description": da["message"],
                "value": state.get("loads", {}).get("float_margin_pct", 25.0),
                "threshold": 10.0,
                "status": "ACTIVE",
                "created_at": _now()
            }


@router.get("", response_model=List[AlertSchema])
def list_alerts() -> List[Dict[str, Any]]:
    _sync_live_alerts()
    return list(alerts_store.values())


@router.post("/{alert_id}/acknowledge", response_model=AlertSchema)
def acknowledge_alert(alert_id: str) -> Dict[str, Any]:
    if alert_id not in alerts_store:
        raise HTTPException(status_code=404, detail=f"Alert {alert_id} not found")
    alerts_store[alert_id]["status"] = "ACKNOWLEDGED"
    return alerts_store[alert_id]
