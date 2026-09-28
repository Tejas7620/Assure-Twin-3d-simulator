"""
backend/app/repositories/recommendation_repo.py
Repository for Explainable Decision Recommendations and Engineer Sign-off Records.
"""

from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from backend.app.models.entities import Recommendation, RecommendationEvent
from .base import BaseRepository


class RecommendationRepository(BaseRepository[Recommendation]):
    def __init__(self, db: Session):
        super().__init__(Recommendation, db)

    def get_by_case_id(self, case_id: str) -> Optional[Recommendation]:
        return self.db.query(Recommendation).filter(Recommendation.id == case_id).first()

    def get_by_well(self, well_id: str, limit: int = 20) -> List[Recommendation]:
        return self.db.query(Recommendation).filter(
            Recommendation.well_id == well_id
        ).order_by(Recommendation.created_at.desc()).limit(limit).all()

    def list_recent(self, limit: int = 50) -> List[Recommendation]:
        return self.db.query(Recommendation).order_by(Recommendation.created_at.desc()).limit(limit).all()

    def save_case(self, case_dict: Dict[str, Any]) -> Recommendation:
        case_id = case_dict.get("case_id") or case_dict.get("id")
        existing = self.get_by_case_id(case_id) if case_id else None
        
        status = case_dict.get("status", "AWAITING_APPROVAL")
        if existing:
            existing.status = status
            existing.proposed_controls = case_dict.get("proposed_controls", {})
            existing.expected_outcome = case_dict.get("expected_outcomes", {})
            self.db.commit()
            self.db.refresh(existing)
            return existing
        
        rec = Recommendation(
            id=case_id,
            well_id=case_dict.get("well_id", "BGW-17A"),
            status=status,
            title=case_dict.get("title", "Optimization Recommendation"),
            rationale="; ".join(case_dict.get("causal_reasons_why", [])),
            proposed_controls=case_dict.get("proposed_controls", {}),
            expected_outcome=case_dict.get("expected_outcomes", {}),
            preconditions=case_dict.get("preconditions", []),
            abort_conditions=case_dict.get("blocking_reasons", []),
            physics_result=case_dict.get("optimization_detail", {}),
            ml_result=case_dict.get("rehearsal_detail", {}),
            created_at=datetime.now(timezone.utc)
        )
        self.add(rec)

        # Log event
        event = RecommendationEvent(
            recommendation_id=rec.id,
            event_type="CREATED",
            actor=case_dict.get("created_by", "SYSTEM_TWIN"),
            metadata_json={"status": status}
        )
        self.db.add(event)
        self.db.commit()
        return rec

    def record_signoff(self, case_id: str, actor: str, approved: bool, notes: Optional[str] = None) -> Optional[Recommendation]:
        rec = self.get_by_case_id(case_id)
        if not rec:
            return None
        
        now = datetime.now(timezone.utc)
        if approved:
            rec.status = "APPROVED_BY_ENGINEER"
            rec.approved_at = now
            event_type = "APPROVED"
        else:
            rec.status = "REJECTED_BY_ENGINEER"
            rec.rejected_at = now
            event_type = "REJECTED"

        event = RecommendationEvent(
            recommendation_id=rec.id,
            event_type=event_type,
            actor=actor,
            comment=notes or "",
            metadata_json={"timestamp": now.isoformat()}
        )
        self.db.add(event)
        self.db.commit()
        self.db.refresh(rec)
        return rec
