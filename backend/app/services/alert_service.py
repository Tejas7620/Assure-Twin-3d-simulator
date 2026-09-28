"""
backend/app/services/alert_service.py
Application service for Intelligent Dynamic Alerting and Safety Alarms.
Coordinates between the in-memory AlertEngine, persistent AlertRepository, and AuditService.
"""

from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from backend.app.assurance.alert_engine import AlertEngine
from backend.app.repositories.alert_repo import AlertRepository
from backend.app.services.audit_service import AuditService

_alert_engine = AlertEngine()


class AlertService:
    def __init__(self, db: Session):
        self.db = db
        self.alert_repo = AlertRepository(db)
        self.audit_service = AuditService(db)

    def evaluate_live_alerts(self, state: Dict[str, Any], well_id: str = "BGW-17A") -> List[Dict[str, Any]]:
        """
        Dynamically analyzes state using AlertEngine, persists new alerts to DB,
        and returns all active and acknowledged alerts for the well.
        """
        engine_alerts = _alert_engine.evaluate_state(state)

        # Upsert detected alerts into DB
        for ea in engine_alerts:
            self.alert_repo.upsert_by_id({
                "id": ea["code"],
                "well_id": well_id,
                "severity": ea["severity"],
                "type": ea["code"],
                "title": ea["title"],
                "description": ea["message"],
                "value": state.get("loads", {}).get("float_margin_pct"),
                "threshold": 10.0,
                "status": "ACTIVE",
                "metadata": {"action": ea.get("action")}
            })

        # Fetch from repository
        db_alerts = self.alert_repo.get_by_well(well_id)
        if not db_alerts:
            # Fallback to in-memory active alerts if DB is unseeded
            return [
                {
                    "id": a["code"],
                    "well_id": well_id,
                    "severity": a["severity"],
                    "title": a["title"],
                    "description": a["message"],
                    "value": state.get("loads", {}).get("float_margin_pct", 25.0),
                    "threshold": 10.0,
                    "status": "ACTIVE",
                    "created_at": datetime.now(timezone.utc)
                }
                for a in engine_alerts
            ]

        results = []
        for a in db_alerts:
            results.append({
                "id": a.id,
                "well_id": a.well_id,
                "severity": a.severity,
                "title": a.title,
                "description": a.description,
                "value": a.value,
                "threshold": a.threshold,
                "status": a.status,
                "created_at": a.created_at
            })
        return results

    def acknowledge_alert(self, alert_id: str, actor: str = "FIELD_OPERATOR") -> Optional[Dict[str, Any]]:
        alert = self.alert_repo.acknowledge(alert_id)
        if alert:
            self.audit_service.log_action(
                actor=actor,
                action="ACKNOWLEDGE_ALERT",
                entity_type="ALERT",
                entity_id=alert_id,
                details={"title": alert.title, "severity": alert.severity}
            )
            return {
                "id": alert.id,
                "well_id": alert.well_id,
                "severity": alert.severity,
                "title": alert.title,
                "description": alert.description,
                "value": alert.value,
                "threshold": alert.threshold,
                "status": alert.status,
                "created_at": alert.created_at
            }
        return None
