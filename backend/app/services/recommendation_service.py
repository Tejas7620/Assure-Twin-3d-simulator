"""
backend/app/services/recommendation_service.py
Application service for Decision Recommendation Lifecycle and Engineer Approvals.
SIH 2026 - Problem Statement 26120: Coupled CSS & SRP Digital Twin.
"""

from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from backend.app.repositories.recommendation_repo import RecommendationRepository
from backend.app.services.audit_service import AuditService
from backend.app.twin.engine import twin_manager
from backend.app.simulation.manager import get_sim_engine
from backend.app.api.v1.recommendations import _generate_recommendation, _recommendations_store
from backend.app.schemas.domain import OptimizationWeights


class RecommendationService:
    def __init__(self, db: Session):
        self.db = db
        self.rec_repo = RecommendationRepository(db)
        self.audit_service = AuditService(db)

    def generate_and_persist(
        self,
        well_id: str = "BGW-17A",
        weights: Optional[OptimizationWeights] = None
    ) -> Dict[str, Any]:
        """
        Executes end-to-end 5-stage pipeline:
        1. Optimization
        2. 21-day digital twin safety rehearsal
        3. 12-checkpoint assurance gate
        4. Causal why / why-not synthesis
        5. Database persistence and audit logging
        """
        try:
            active_well = twin_manager.get_active_well()
            twin_state = active_well.step(0.0)
        except Exception:
            sim = get_sim_engine()
            twin_state = sim.step(0.0)

        twin_state["well_id"] = well_id
        rec = _generate_recommendation(twin_state, weights)
        _recommendations_store[rec["case_id"]] = rec

        # Persist to database
        self.rec_repo.save_case(rec)

        # Audit log creation
        self.audit_service.log_action(
            actor="ASSURE_TWIN_PIPELINE",
            action="GENERATE_RECOMMENDATION",
            entity_type="RECOMMENDATION",
            entity_id=rec["case_id"],
            details={
                "status": rec.get("status"),
                "recommendation_type": rec.get("recommendation_type"),
                "title": rec.get("title")
            }
        )

        return rec

    def approve_recommendation(
        self,
        case_id: str,
        actor: str,
        notes: Optional[str] = None
    ) -> Dict[str, Any]:
        rec = _recommendations_store.get(case_id)
        if not rec:
            db_rec = self.rec_repo.get_by_case_id(case_id)
            if not db_rec:
                raise ValueError(f"Recommendation {case_id} not found")
            rec = {
                "case_id": db_rec.id,
                "well_id": db_rec.well_id,
                "status": db_rec.status,
                "proposed_controls": db_rec.proposed_controls,
                "expected_outcomes": db_rec.expected_outcome
            }

        rec["status"] = "APPROVED_BY_ENGINEER"
        rec["approved_by"] = actor
        rec["approval_timestamp"] = datetime.now(timezone.utc)

        # Apply controls to active twin engine
        controls = rec.get("proposed_controls", {})
        try:
            active_well = twin_manager.get_active_well()
            if "spm" in controls:
                active_well.set_parameter("spm", float(controls["spm"]))
            if "stroke_inches" in controls:
                active_well.set_parameter("stroke_inches", float(controls["stroke_inches"]))
        except Exception:
            pass

        # Also sync sim engine
        try:
            sim = get_sim_engine()
            if "spm" in controls:
                sim.set_control("spm", float(controls["spm"]))
            if "stroke_inches" in controls:
                sim.set_control("stroke_inches", float(controls["stroke_inches"]))
        except Exception:
            pass

        # Update in database and audit
        self.rec_repo.record_signoff(case_id, actor=actor, approved=True, notes=notes)
        self.audit_service.log_action(
            actor=actor,
            action="APPROVE_RECOMMENDATION",
            entity_type="RECOMMENDATION",
            entity_id=case_id,
            details={"controls": controls, "notes": notes}
        )

        return rec

    def reject_recommendation(
        self,
        case_id: str,
        actor: str,
        notes: Optional[str] = None
    ) -> Dict[str, Any]:
        rec = _recommendations_store.get(case_id)
        if not rec:
            db_rec = self.rec_repo.get_by_case_id(case_id)
            if not db_rec:
                raise ValueError(f"Recommendation {case_id} not found")
            rec = {"case_id": db_rec.id, "well_id": db_rec.well_id}

        rec["status"] = "REJECTED_BY_ENGINEER"
        rec["approved_by"] = f"Rejected by: {actor}"
        rec["rejection_notes"] = notes or "Engineer rejected proposed controls."
        rec["approval_timestamp"] = datetime.now(timezone.utc)

        self.rec_repo.record_signoff(case_id, actor=actor, approved=False, notes=notes)
        self.audit_service.log_action(
            actor=actor,
            action="REJECT_RECOMMENDATION",
            entity_type="RECOMMENDATION",
            entity_id=case_id,
            details={"rejection_notes": notes}
        )

        return rec
