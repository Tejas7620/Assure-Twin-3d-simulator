"""
backend/app/repositories/alert_repo.py
Repository for operational alarms, mechanical thresholds, and acknowledgement lifecycle.
"""

from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from backend.app.models.entities import Alert
from .base import BaseRepository


class AlertRepository(BaseRepository[Alert]):
    def __init__(self, db: Session):
        super().__init__(Alert, db)

    def get_active_alerts(self, well_id: Optional[str] = None) -> List[Alert]:
        query = self.db.query(Alert).filter(Alert.status == "ACTIVE")
        if well_id:
            query = query.filter(Alert.well_id == well_id)
        return query.order_by(Alert.created_at.desc()).all()

    def get_by_well(self, well_id: str, limit: int = 50) -> List[Alert]:
        return self.db.query(Alert).filter(Alert.well_id == well_id).order_by(Alert.created_at.desc()).limit(limit).all()

    def get_by_severity(self, severity: str) -> List[Alert]:
        return self.db.query(Alert).filter(Alert.severity == severity).order_by(Alert.created_at.desc()).all()

    def acknowledge(self, alert_id: str) -> Optional[Alert]:
        alert = self.get_by_id(alert_id)
        if alert:
            alert.status = "ACKNOWLEDGED"
            alert.acknowledged_at = datetime.now(timezone.utc)
            self.db.commit()
            self.db.refresh(alert)
        return alert

    def resolve(self, alert_id: str) -> Optional[Alert]:
        alert = self.get_by_id(alert_id)
        if alert:
            alert.status = "RESOLVED"
            alert.resolved_at = datetime.now(timezone.utc)
            self.db.commit()
            self.db.refresh(alert)
        return alert

    def upsert_by_id(self, alert_dict: Dict[str, Any]) -> Alert:
        alert_id = alert_dict.get("id")
        existing = self.get_by_id(alert_id) if alert_id else None
        if existing:
            for k, v in alert_dict.items():
                if hasattr(existing, k) and k != "id":
                    setattr(existing, k, v)
            self.db.commit()
            self.db.refresh(existing)
            return existing
        else:
            new_alert = Alert(
                id=alert_id,
                well_id=alert_dict.get("well_id", "BGW-17A"),
                severity=alert_dict.get("severity", "WARNING"),
                type=alert_dict.get("type", "OPERATIONAL_THRESHOLD"),
                title=alert_dict.get("title", "Operational Alert"),
                description=alert_dict.get("description", ""),
                value=alert_dict.get("value"),
                threshold=alert_dict.get("threshold"),
                status=alert_dict.get("status", "ACTIVE"),
                created_at=datetime.now(timezone.utc),
                metadata_json=alert_dict.get("metadata", {})
            )
            return self.add(new_alert)
