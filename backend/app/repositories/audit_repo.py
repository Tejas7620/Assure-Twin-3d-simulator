"""
backend/app/repositories/audit_repo.py
Repository for Immutable Audit Events and Cryptographic Integrity Tracking.
"""

from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import hashlib
import json
from sqlalchemy.orm import Session
from backend.app.models.entities import AuditEvent
from .base import BaseRepository


class AuditRepository(BaseRepository[AuditEvent]):
    def __init__(self, db: Session):
        super().__init__(AuditEvent, db)

    def log_event(
        self,
        actor: str,
        action: str,
        entity_type: str,
        entity_id: str,
        details: Optional[Dict[str, Any]] = None
    ) -> AuditEvent:
        now = datetime.now(timezone.utc)
        payload_str = json.dumps({
            "actor": actor,
            "action": action,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "timestamp": now.isoformat(),
            "details": details or {}
        }, sort_keys=True)
        sha_hash = hashlib.sha256(payload_str.encode()).hexdigest()

        event_details = dict(details or {})
        event_details["_sha256"] = sha_hash

        event = AuditEvent(
            actor=actor,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            timestamp=now,
            details=event_details
        )
        return self.add(event)

    def get_trail(
        self,
        entity_id: Optional[str] = None,
        entity_type: Optional[str] = None,
        limit: int = 100
    ) -> List[AuditEvent]:
        query = self.db.query(AuditEvent)
        if entity_id:
            query = query.filter(AuditEvent.entity_id == entity_id)
        if entity_type:
            query = query.filter(AuditEvent.entity_type == entity_type)
        return query.order_by(AuditEvent.timestamp.desc()).limit(limit).all()
