"""
backend/app/services/well_service.py
Application service for Well Asset Management, Subsurface Geometries, and Engine State Synchronization.
"""

from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from backend.app.repositories.well_repo import WellRepository
from backend.app.repositories.observation_repo import ObservationRepository
from backend.app.twin.engine import twin_manager
from backend.app.simulation.manager import get_sim_engine
from backend.app.analytics.state_adapter import normalise
from backend.app.domain.models import WellSpecification


class WellService:
    def __init__(self, db: Session):
        self.db = db
        self.well_repo = WellRepository(db)
        self.obs_repo = ObservationRepository(db)

    def get_well_details(self, well_id: str) -> Optional[Dict[str, Any]]:
        well = self.well_repo.get_by_name_or_id(well_id)
        if not well:
            return None
        
        srp_cfg = self.well_repo.get_well_srp_config(well.id)
        cycles = self.well_repo.get_well_css_cycles(well.id)
        completion = self.well_repo.get_well_completion(well.id)

        return {
            "well_id": well.id,
            "well_name": well.well_name,
            "api_id": well.well_api_id,
            "status": well.status,
            "depth_tvd_m": well.tvd,
            "depth_md_m": well.md,
            "completion_type": well.completion_type,
            "pump_type": well.pump_type,
            "srp_configuration": {
                "pump_diameter_in": srp_cfg.pump_diameter if srp_cfg else 1.75,
                "stroke_length_in": srp_cfg.stroke_length if srp_cfg else 64.0,
                "spm_range": [srp_cfg.spm_min if srp_cfg else 0.5, srp_cfg.spm_max if srp_cfg else 8.0]
            } if srp_cfg else None,
            "total_css_cycles": len(cycles),
            "completion": {
                "casing_od_in": completion.casing_od if completion else 7.0,
                "tubing_od_in": completion.tubing_od if completion else 2.875
            } if completion else None
        }

    def get_authoritative_state(self, well_id: str = "BGW-17A") -> Dict[str, Any]:
        """
        Retrieves the synchronized physical state, favoring Engine B (twin engine),
        falling back to Engine A (simulation engine) with normalized telemetry.
        """
        try:
            active_well = twin_manager.get_active_well()
            state = active_well.step(0.0)
            if state and "thermal" in state:
                return state
        except Exception:
            pass

        sim = get_sim_engine()
        return sim.step(0.0)

    def record_production_telemetry(self, well_id: str, state: Dict[str, Any]):
        n = normalise(state)
        self.obs_repo.record_production_step(
            well_id=well_id,
            oil_rate=n.get("oil_rate_bopd", 32.6),
            liquid_rate=n.get("liquid_rate_bopd", 38.0),
            water_cut=n.get("water_cut", 0.128),
            sor=n.get("sor", 2.84),
            temperature=n.get("temperature_c", 72.6),
            pressure=n.get("p_wf_bar", 18.2),
            energy=n.get("power_kw", 22.4),
            source="ASSURE_TWIN_SERVICE"
        )
