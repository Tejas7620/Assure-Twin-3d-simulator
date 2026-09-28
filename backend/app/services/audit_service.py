"""
backend/app/services/audit_service.py
Application service for Cryptographic Audit Logging and Governance Compliance.
SIH 2026 - Problem Statement 26120.
"""

from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from backend.app.repositories.audit_repo import AuditRepository


class AuditService:
    def __init__(self, db: Session):
        self.db = db
        self.audit_repo = AuditRepository(db)

    def log_action(
        self,
        actor: str,
        action: str,
        entity_type: str,
        entity_id: str,
        details: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        event = self.audit_repo.log_event(
            actor=actor,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            details=details
        )
        return {
            "event_id": event.id,
            "actor": event.actor,
            "action": event.action,
            "entity_type": event.entity_type,
            "entity_id": event.entity_id,
            "timestamp": event.timestamp.isoformat() if event.timestamp else None,
            "sha256": event.details.get("_sha256") if event.details else None
        }

    def get_audit_trail(self, entity_id: Optional[str] = None, limit: int = 50) -> List[Dict[str, Any]]:
        events = self.audit_repo.get_trail(entity_id=entity_id, limit=limit)
        return [
            {
                "event_id": e.id,
                "actor": e.actor,
                "action": e.action,
                "entity_type": e.entity_type,
                "entity_id": e.entity_id,
                "timestamp": e.timestamp.isoformat() if e.timestamp else None,
                "details": e.details
            }
            for e in events
        ]
