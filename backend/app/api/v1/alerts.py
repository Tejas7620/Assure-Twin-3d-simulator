"""
backend/app/api/v1/alerts.py
Operational Threshold Alarming & Notification Endpoints.
"""

from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
from datetime import datetime
from backend.app.schemas.domain import AlertSchema

router = APIRouter(prefix="/alerts", tags=["Alerts"])

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
        "created_at": datetime.utcnow()
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
        "created_at": datetime.utcnow()
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
        "created_at": datetime.utcnow()
    }
]

alerts_store = {a["id"]: dict(a) for a in INITIAL_ALERTS}

@router.get("", response_model=List[AlertSchema])
def list_alerts() -> List[Dict[str, Any]]:
    return list(alerts_store.values())

@router.post("/{alert_id}/acknowledge", response_model=AlertSchema)
def acknowledge_alert(alert_id: str) -> Dict[str, Any]:
    if alert_id not in alerts_store:
        raise HTTPException(status_code=404, detail=f"Alert {alert_id} not found")
    alerts_store[alert_id]["status"] = "ACKNOWLEDGED"
    return alerts_store[alert_id]
