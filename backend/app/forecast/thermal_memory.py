"""
thermal_memory.py - Multi-Cycle Reservoir Thermal Memory and Heat Retention Model.
Tracks cumulative heat accumulation across successive CSS cycles:
1. Residual heat retention in rock matrix from prior injection cycles.
2. Progressive expansion of the heated zone radius with cycle count.
3. Decreasing steam requirements per unit incremental oil in later cycles.
"""

import math
from typing import Dict, Any, List

class ThermalMemoryEngine:
    def __init__(self, initial_ambient_temp_c: float = 52.0):
        self.t_ambient = float(initial_ambient_temp_c)
        self.cycle_records: List[Dict[str, Any]] = [
            {"cycle": 1, "steam_tons": 2400.0, "heat_injected_gj": 5400.0, "heat_produced_gj": 820.0, "heat_loss_gj": 1450.0, "retained_heat_gj": 3130.0, "final_front_m": 4.2}
        ]

    def record_cycle(
        self,
        cycle_number: int,
        steam_tons: float,
        heat_injected_gj: float,
        heat_produced_gj: float,
        heat_loss_gj: float,
        final_radius_m: float
    ):
        retained = max(0.0, heat_injected_gj - (heat_produced_gj + heat_loss_gj))
        self.cycle_records.append({
            "cycle": int(cycle_number),
            "steam_tons": round(float(steam_tons), 1),
            "heat_injected_gj": round(float(heat_injected_gj), 1),
            "heat_produced_gj": round(float(heat_produced_gj), 1),
            "heat_loss_gj": round(float(heat_loss_gj), 1),
            "retained_heat_gj": round(retained, 1),
            "final_front_m": round(float(final_radius_m), 2)
        })

    def get_memory_summary(self) -> Dict[str, Any]:
        """
        Returns multi-cycle cumulative heat balance and efficiency metrics.
        """
        total_injected_gj = sum(c["heat_injected_gj"] for c in self.cycle_records)
        total_produced_gj = sum(c["heat_produced_gj"] for c in self.cycle_records)
        total_loss_gj = sum(c["heat_loss_gj"] for c in self.cycle_records)
        cumulative_retained_gj = sum(c["retained_heat_gj"] for c in self.cycle_records)

        # Baseline heated zone radius expansion
        current_front_m = self.cycle_records[-1]["final_front_m"] if self.cycle_records else 4.2

        # Effective elevated far-field reservoir temperature due to thermal memory
        # T_elevated = T_ambient + delta_T_memory
        delta_t_memory = min(15.0, cumulative_retained_gj / 450.0)
        elevated_baseline_temp_c = self.t_ambient + delta_t_memory

        retention_efficiency_pct = (cumulative_retained_gj / max(1.0, total_injected_gj)) * 100.0

        return {
            "cycle_count": len(self.cycle_records),
            "total_heat_injected_gj": round(total_injected_gj, 1),
            "total_heat_produced_gj": round(total_produced_gj, 1),
            "total_heat_loss_gj": round(total_loss_gj, 1),
            "cumulative_retained_gj": round(cumulative_retained_gj, 1),
            "retention_efficiency_pct": round(retention_efficiency_pct, 1),
            "elevated_baseline_temp_c": round(elevated_baseline_temp_c, 1),
            "thermal_front_radius_m": current_front_m,
            "cycle_history": self.cycle_records
        }
