"""
backend/app/repositories/well_repo.py
Repository for Well Assets, Field Hierarchy, CSS History, and Subsurface Geometries.
"""

from typing import Optional, List
from sqlalchemy.orm import Session
from backend.app.models.entities import Well, Field, CSSCycle, SRPConfiguration, Reservoir, Completion
from .base import BaseRepository


class WellRepository(BaseRepository[Well]):
    def __init__(self, db: Session):
        super().__init__(Well, db)

    def get_by_name_or_id(self, well_identifier: str) -> Optional[Well]:
        return self.db.query(Well).filter(
            (Well.id == well_identifier) | 
            (Well.well_name == well_identifier) |
            (Well.well_api_id == well_identifier)
        ).first()

    def get_all_wells(self) -> List[Well]:
        return self.db.query(Well).all()

    def get_well_srp_config(self, well_id: str) -> Optional[SRPConfiguration]:
        return self.db.query(SRPConfiguration).filter(SRPConfiguration.well_id == well_id).first()

    def get_well_css_cycles(self, well_id: str) -> List[CSSCycle]:
        return self.db.query(CSSCycle).filter(CSSCycle.well_id == well_id).order_by(CSSCycle.cycle_number.asc()).all()

    def get_well_completion(self, well_id: str) -> Optional[Completion]:
        return self.db.query(Completion).filter(Completion.well_id == well_id).first()

    def get_well_reservoir(self, reservoir_id: str) -> Optional[Reservoir]:
        return self.db.query(Reservoir).filter(Reservoir.id == reservoir_id).first()


class FieldRepository(BaseRepository[Field]):
    def __init__(self, db: Session):
        super().__init__(Field, db)

    def get_by_name(self, name: str) -> Optional[Field]:
        return self.db.query(Field).filter(Field.name == name).first()
