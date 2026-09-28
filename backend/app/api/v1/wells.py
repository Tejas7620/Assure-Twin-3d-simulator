"""
backend/app/api/v1/wells.py
Endpoints for Well Metadata, Geometries, and Field Hierarchy.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from datetime import datetime

from backend.app.database import get_db
from backend.app.models.entities import Well, Field
from backend.app.schemas.domain import WellResponse, FieldResponse
from backend.app.simulation.manager import get_sim_engine

router = APIRouter(prefix="/wells", tags=["Wells"])

@router.get("", response_model=List[WellResponse])
def get_all_wells(db: Session = Depends(get_db)):
    wells = db.query(Well).all()
    if not wells:
        # Fallback to default Baghewala well asset
        return [
            WellResponse(
                id="BGW-17A",
                field_id="BAGHEWALA-ASSET",
                well_name="BGW-17A (Heavy Oil Producer)",
                well_api_id="IND-RJ-BGW-17A",
                status="ACTIVE_PRODUCTION",
                depth=1450.0,
                tvd=1420.0,
                md=1840.0,
                completion_type="Slotted Liner in Heavy Oil Sand",
                pump_type="API Conventional SRP 320-256-100",
                created_at=datetime.utcnow()
            )
        ]
    return wells

@router.get("/{well_id}", response_model=WellResponse)
def get_well_by_id(well_id: str, db: Session = Depends(get_db)):
    well = db.query(Well).filter((Well.id == well_id) | (Well.well_name == well_id)).first()
    if not well:
        if well_id.upper() in ["BGW-17A", "WELL-1", "DEFAULT"]:
            return WellResponse(
                id="BGW-17A",
                field_id="BAGHEWALA-ASSET",
                well_name="BGW-17A (Heavy Oil Producer)",
                well_api_id="IND-RJ-BGW-17A",
                status="ACTIVE_PRODUCTION",
                depth=1450.0,
                tvd=1420.0,
                md=1840.0,
                completion_type="Slotted Liner in Heavy Oil Sand",
                pump_type="API Conventional SRP 320-256-100",
                created_at=datetime.utcnow()
            )
        raise HTTPException(status_code=404, detail=f"Well {well_id} not found")
    return well

@router.get("/{well_id}/state")
def get_well_operational_state(well_id: str):
    sim = get_sim_engine()
    state = sim.step(0.0)
    return {
        "well_id": well_id,
        "timestamp": datetime.utcnow().isoformat(),
        "state": state
    }
