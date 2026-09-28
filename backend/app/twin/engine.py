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
        # Multi-well architecture: BW-01, BW-02, BW-03, BW-04
        self.wells: Dict[str, StatefulTwinEngine] = {
            "BW-01": StatefulTwinEngine(well_id="BW-01"),
            "BW-02": StatefulTwinEngine(well_id="BW-02"),
            "BW-03": StatefulTwinEngine(well_id="BW-03"),
            "BW-04": StatefulTwinEngine(well_id="BW-04")
        }
        self.active_well_id = "BW-01"

    @classmethod
    def get_instance(cls) -> "TwinEngineManager":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def get_active_well(self) -> StatefulTwinEngine:
        return self.wells.get(self.active_well_id, self.wells["BW-01"])

    def set_active_well(self, well_id: str) -> bool:
        if well_id in self.wells:
            self.active_well_id = well_id
            return True
        return False

    def step_all(self, dt_real_sec: float):
        for well in self.wells.values():
            if well.is_running:
                well.step(dt_real_sec)

    def get_active_state(self) -> Dict[str, Any]:
        return self.get_active_well().step(0.0)

# Global singleton accessor
twin_manager = TwinEngineManager.get_instance()
