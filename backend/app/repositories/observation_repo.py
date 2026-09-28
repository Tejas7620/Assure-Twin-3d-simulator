"""
backend/app/repositories/observation_repo.py
Repository for time-series Production Observations and Virtual Sensor Telemetry.
"""

from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from backend.app.models.entities import ProductionObservation, SensorObservation
from .base import BaseRepository


class ObservationRepository(BaseRepository[ProductionObservation]):
    def __init__(self, db: Session):
        super().__init__(ProductionObservation, db)

    def get_recent_by_well(self, well_id: str, limit: int = 30) -> List[ProductionObservation]:
        return self.db.query(ProductionObservation).filter(
            ProductionObservation.well_id == well_id
        ).order_by(ProductionObservation.timestamp.desc()).limit(limit).all()

    def record_production_step(
        self,
        well_id: str,
        oil_rate: float,
        liquid_rate: float,
        water_cut: float,
        sor: float,
        temperature: float,
        pressure: float,
        energy: float = 0.0,
        source: str = "TWIN_ENGINE_B"
    ) -> ProductionObservation:
        obs = ProductionObservation(
            well_id=well_id,
            timestamp=datetime.now(timezone.utc),
            oil_rate=oil_rate,
            liquid_rate=liquid_rate,
            water_cut=water_cut,
            sor=sor,
            temperature=temperature,
            pressure=pressure,
            energy=energy,
            source=source
        )
        return self.add(obs)

    def record_sensor_telemetry(
        self,
        well_id: str,
        sensor_name: str,
        sensor_type: str,
        value: float,
        unit: str,
        quality: str = "GOOD",
        is_virtual: bool = True
    ) -> SensorObservation:
        sensor_obs = SensorObservation(
            well_id=well_id,
            sensor_name=sensor_name,
            sensor_type=sensor_type,
            value=value,
            unit=unit,
            quality=quality,
            is_virtual=is_virtual,
            timestamp=datetime.now(timezone.utc)
        )
        self.db.add(sensor_obs)
        self.db.commit()
        self.db.refresh(sensor_obs)
        return sensor_obs
