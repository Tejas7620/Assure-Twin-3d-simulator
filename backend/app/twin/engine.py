"""
engine.py - Twin Manager and Multi-Well Registry for ASSURE-TWIN.
Provides centralized access to active well twin instances,
background simulation loop, and websocket telemetry publishing.
"""

import time
from typing import Dict, Any, Optional
from .time_stepper import StatefulTwinEngine

class TwinEngineManager:
    _instance: Optional["TwinEngineManager"] = None

    def __init__(self):
        # Multi-well architecture: BGW-17A (primary Baghewala asset), BW-01, BW-02, BW-03, BW-04
        primary_well = StatefulTwinEngine(well_id="BGW-17A")
        self.wells: Dict[str, StatefulTwinEngine] = {
            "BGW-17A": primary_well,
            "BW-01": primary_well,  # Alias to primary
            "BW-02": StatefulTwinEngine(well_id="BW-02"),
            "BW-03": StatefulTwinEngine(well_id="BW-03"),
            "BW-04": StatefulTwinEngine(well_id="BW-04")
        }
        self.active_well_id = "BGW-17A"

    @classmethod
    def get_instance(cls) -> "TwinEngineManager":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def get_active_well(self) -> StatefulTwinEngine:
        return self.wells.get(self.active_well_id, self.wells.get("BGW-17A", list(self.wells.values())[0]))

    def get_well(self, well_id: str) -> StatefulTwinEngine:
        wid = (well_id or "").upper()
        return self.wells.get(wid, self.get_active_well())

    def set_active_well(self, well_id: str) -> bool:
        wid = (well_id or "").upper()
        if wid in self.wells:
            self.active_well_id = wid
            return True
        return False

    def step_all(self, dt_real_sec: float):
        # Step unique instances
        seen = set()
        for well in self.wells.values():
            if id(well) not in seen:
                seen.add(id(well))
                if well.is_running:
                    well.step(dt_real_sec)

    def get_active_state(self) -> Dict[str, Any]:
        return self.get_active_well().step(0.0)

# Global singleton accessor
twin_manager = TwinEngineManager.get_instance()
