"""
css_engine.py - Cyclic Steam Stimulation (CSS) State Machine and Cycle Engine.
Implements:
1. Complete 5-phase lifecycle: INJECTION -> SOAK -> PRODUCTION -> COOLING -> NEXT_CYCLE.
2. Cycle parameters: steam volume target, injection rate, soak duration, production cutoff temp.
3. Multi-cycle tracking: cycle number, cycle time, cumulative steam and oil per cycle.
4. Automatic and manual transition triggers.
"""

from typing import Dict, Any, Optional

class CSSEngine:
    VALID_PHASES = ["INJECTION", "SOAK", "PRODUCTION", "COOLING", "NEXT_CYCLE"]

    def __init__(
        self,
        cycle_number: int = 1,
        initial_phase: str = "PRODUCTION",
        steam_rate_t_d: float = 42.3,
        steam_volume_target_t: float = 2500.0,
        soak_days: float = 5.0,
        cutoff_temp_c: float = 58.0
    ):
        self.cycle_number = int(cycle_number)
        self.current_phase = initial_phase if initial_phase in self.VALID_PHASES else "PRODUCTION"
        self.phase_time_elapsed_days = 0.0
        self.cycle_time_elapsed_days = 30.0

        # Cycle controls
        self.steam_rate_t_d = float(steam_rate_t_d)
        self.steam_volume_target_t = float(steam_volume_target_t)
        self.soak_days = float(soak_days)
        self.cutoff_temp_c = float(cutoff_temp_c)

        # In-cycle tracking
        self.cycle_steam_injected_t = 2200.0
        self.cycle_oil_produced_m3 = 1150.0

    def step(
        self,
        dt_days: float,
        current_temp_c: float,
        oil_rate_m3_d: float,
        auto_advance: bool = True
    ) -> Dict[str, Any]:
        """
        Advances CSS phase timer and checks transition criteria.
        """
        self.phase_time_elapsed_days += dt_days
        self.cycle_time_elapsed_days += dt_days

        transitioned = False
        prev_phase = self.current_phase

        if self.current_phase == "INJECTION":
            # Accumulate injected steam
            steam_step = self.steam_rate_t_d * dt_days
            self.cycle_steam_injected_t += steam_step
            if auto_advance and self.cycle_steam_injected_t >= self.steam_volume_target_t:
                self.set_phase("SOAK")
                transitioned = True

        elif self.current_phase == "SOAK":
            if auto_advance and self.phase_time_elapsed_days >= self.soak_days:
                self.set_phase("PRODUCTION")
                transitioned = True

        elif self.current_phase == "PRODUCTION":
            self.cycle_oil_produced_m3 += oil_rate_m3_d * dt_days
            if auto_advance and current_temp_c <= self.cutoff_temp_c:
                self.set_phase("COOLING")
                transitioned = True

        elif self.current_phase == "COOLING":
            # Wells cool down until operator decides to steam again or automatic trigger
            if auto_advance and self.phase_time_elapsed_days >= 30.0:
                self.set_phase("NEXT_CYCLE")
                transitioned = True

        elif self.current_phase == "NEXT_CYCLE":
            if auto_advance:
                self.cycle_number += 1
                self.cycle_steam_injected_t = 0.0
                self.cycle_oil_produced_m3 = 0.0
                self.cycle_time_elapsed_days = 0.0
                self.set_phase("INJECTION")
                transitioned = True

        return {
            "current_phase": self.current_phase,
            "cycle_number": self.cycle_number,
            "phase_time_elapsed_days": round(self.phase_time_elapsed_days, 2),
            "cycle_time_elapsed_days": round(self.cycle_time_elapsed_days, 2),
            "cycle_steam_injected_t": round(self.cycle_steam_injected_t, 1),
            "cycle_oil_produced_m3": round(self.cycle_oil_produced_m3, 1),
            "steam_volume_target_t": self.steam_volume_target_t,
            "soak_days": self.soak_days,
            "cutoff_temp_c": self.cutoff_temp_c,
            "transitioned": transitioned,
            "prev_phase": prev_phase,
            "is_injecting": self.current_phase == "INJECTION",
            "is_soaking": self.current_phase == "SOAK",
            "is_producing": self.current_phase == "PRODUCTION",
            "is_cooling": self.current_phase == "COOLING"
        }

    def set_phase(self, new_phase: str):
        if new_phase in self.VALID_PHASES:
            self.current_phase = new_phase
            self.phase_time_elapsed_days = 0.0

    def trigger_next_cycle(self):
        self.cycle_number += 1
        self.cycle_steam_injected_t = 0.0
        self.cycle_oil_produced_m3 = 0.0
        self.cycle_time_elapsed_days = 0.0
        self.set_phase("INJECTION")
