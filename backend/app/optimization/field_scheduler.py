"""
field_scheduler.py - Multi-Well Field-Level Steam Scheduling Coordinator (Feature 4).
Solves the central boiler constraint problem:
Multiple heavy oil wells (BGW-17A, BW-02, BW-03, BW-04) share a centralized steam generation
plant with finite daily generation capacity Q_steam_max (e.g. 120.0 t/d).

Unscheduled simultaneous injection causes steam pressure deficit and under-stimulated cycles.
FieldSteamScheduler generates conflict-free injection, soak, and production schedules,
maximizing field-wide oil production while strictly respecting the boiler budget.
All multi-well assumptions marked SYNTHETIC / ASSUMPTION.
"""

import math
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone


class WellCandidate:
    """Represents a candidate well for field-level steam scheduling."""
    def __init__(
        self,
        well_id: str,
        well_name: str,
        current_phase: str = "PRODUCTION",
        near_well_temp_c: float = 54.0,
        current_oil_bopd: float = 25.0,
        target_steam_tons: float = 600.0,
        injection_rate_t_d: float = 50.0,
        soak_days: int = 5,
        css_cycle: int = 3,
        estimated_sor: float = 6.2
    ):
        self.well_id = well_id
        self.well_name = well_name
        self.current_phase = current_phase.upper()
        self.near_well_temp_c = float(near_well_temp_c)
        self.current_oil_bopd = float(current_oil_bopd)
        self.target_steam_tons = float(target_steam_tons)
        self.injection_rate_t_d = float(injection_rate_t_d)
        self.soak_days = int(soak_days)
        self.css_cycle = int(css_cycle)
        self.estimated_sor = float(estimated_sor)

        # Days required for full steam volume target
        self.injection_days = max(1, math.ceil(self.target_steam_tons / max(1.0, self.injection_rate_t_d)))

    def compute_urgency_score(self) -> float:
        """
        Computes steam injection priority score:
        Higher score = higher priority for immediate steam allocation.
        Favors cold wells with high thermal recovery potential and lower SOR.
        """
        # Thermal deficit factor (colder wells get higher urgency)
        temp_deficit = max(1.0, 75.0 - self.near_well_temp_c)
        # Efficiency factor
        sor_efficiency = 10.0 / max(2.0, self.estimated_sor)
        # Scale with current oil production potential
        return float(temp_deficit * sor_efficiency * (self.current_oil_bopd / 20.0))

    def to_dict(self) -> Dict[str, Any]:
        return {
            "well_id": self.well_id,
            "well_name": self.well_name,
            "current_phase": self.current_phase,
            "near_well_temp_c": round(self.near_well_temp_c, 1),
            "current_oil_bopd": round(self.current_oil_bopd, 1),
            "target_steam_tons": self.target_steam_tons,
            "injection_rate_t_d": self.injection_rate_t_d,
            "injection_days": self.injection_days,
            "soak_days": self.soak_days,
            "css_cycle": self.css_cycle,
            "estimated_sor": self.estimated_sor,
            "priority_score": round(self.compute_urgency_score(), 2)
        }


class FieldSteamScheduler:
    """
    Field-level steam allocation coordinator across multiple CSS producer wells.
    Enforces boiler daily steam generation capacity constraint:
    sum(steam_rate_i(t)) <= Q_boiler_max for all days t.
    """
    def __init__(
        self,
        boiler_capacity_t_d: float = 120.0,
        planning_horizon_days: int = 30
    ):
        self.boiler_capacity_t_d = float(boiler_capacity_t_d)
        self.horizon_days = int(planning_horizon_days)

    def get_default_candidates(self) -> List[WellCandidate]:
        """Provides Baghewala multi-well cluster candidate list (SYNTHETIC / ASSUMPTION)."""
        return [
            WellCandidate(
                well_id="BGW-17A",
                well_name="BGW-17A (Primary Asset)",
                current_phase="PRODUCTION",
                near_well_temp_c=52.0,
                current_oil_bopd=32.4,
                target_steam_tons=600.0,
                injection_rate_t_d=50.0,
                soak_days=5,
                css_cycle=3,
                estimated_sor=5.8
            ),
            WellCandidate(
                well_id="BW-02",
                well_name="BW-02 (Offset Producer)",
                current_phase="PRODUCTION",
                near_well_temp_c=46.0,
                current_oil_bopd=24.5,
                target_steam_tons=500.0,
                injection_rate_t_d=50.0,
                soak_days=5,
                css_cycle=2,
                estimated_sor=6.4
            ),
            WellCandidate(
                well_id="BW-03",
                well_name="BW-03 (Depleted Producer)",
                current_phase="PRODUCTION",
                near_well_temp_c=41.0,
                current_oil_bopd=17.2,
                target_steam_tons=550.0,
                injection_rate_t_d=50.0,
                soak_days=4,
                css_cycle=2,
                estimated_sor=6.9
            ),
            WellCandidate(
                well_id="BW-04",
                well_name="BW-04 (Cold Shut-In)",
                current_phase="SHUT_IN",
                near_well_temp_c=36.0,
                current_oil_bopd=12.0,
                target_steam_tons=600.0,
                injection_rate_t_d=60.0,
                soak_days=6,
                css_cycle=1,
                estimated_sor=7.2
            )
        ]

    def optimize_schedule(
        self,
        candidates: Optional[List[WellCandidate]] = None
    ) -> Dict[str, Any]:
        """
        Schedules steam injection windows to prevent boiler overload and maximize oil.
        Returns:
        - timeline: Gantt intervals per well
        - daily_metrics: daily steam usage, boiler capacity, and field oil production
        - unconstrained_comparison: demonstrates peak boiler deficit without scheduler
        - summary: total steam allocated, total oil gain, peak utilization %
        """
        wells = candidates if candidates is not None else self.get_default_candidates()
        
        # Sort wells by urgency priority descending
        sorted_wells = sorted(wells, key=lambda w: w.compute_urgency_score(), reverse=True)

        # Track daily boiler steam usage across planning horizon
        daily_steam_allocated = [0.0] * self.horizon_days
        daily_unconstrained_steam = [0.0] * self.horizon_days
        daily_field_oil = [0.0] * self.horizon_days

        # Base production before new stimulation
        base_oil_total = sum(w.current_oil_bopd for w in wells)

        well_schedules: Dict[str, List[Dict[str, Any]]] = {}

        # 1. Unconstrained demand scenario (if all wells started injecting on day 0)
        for w in wells:
            inj_rate = w.injection_rate_t_d
            for d in range(min(w.injection_days, self.horizon_days)):
                daily_unconstrained_steam[d] += inj_rate

        # 2. Constrained priority-based scheduling
        for w in sorted_wells:
            intervals = []
            inj_days = w.injection_days
            inj_rate = w.injection_rate_t_d
            soak_days = w.soak_days

            # Find the earliest start day where boiler capacity is not violated
            best_start_day = 0
            for start_candidate in range(self.horizon_days):
                can_fit = True
                for d in range(start_candidate, min(self.horizon_days, start_candidate + inj_days)):
                    if daily_steam_allocated[d] + inj_rate > self.boiler_capacity_t_d + 1e-4:
                        can_fit = False
                        break
                if can_fit:
                    best_start_day = start_candidate
                    break
            else:
                # If could not fit entire duration, schedule at end of horizon
                best_start_day = self.horizon_days

            # Pre-injection interval
            if best_start_day > 0:
                intervals.append({
                    "phase": "PRE_STEAM_PROD" if w.current_phase != "SHUT_IN" else "STANDBY",
                    "start_day": 0,
                    "end_day": min(best_start_day, self.horizon_days),
                    "steam_rate_t_d": 0.0,
                    "oil_rate_bopd": w.current_oil_bopd if w.current_phase != "SHUT_IN" else 0.0
                })

            # Injection interval
            inj_end = min(self.horizon_days, best_start_day + inj_days)
            if best_start_day < self.horizon_days:
                for d in range(best_start_day, inj_end):
                    daily_steam_allocated[d] += inj_rate

                intervals.append({
                    "phase": "INJECTION",
                    "start_day": best_start_day,
                    "end_day": inj_end,
                    "steam_rate_t_d": inj_rate,
                    "oil_rate_bopd": 0.0  # Well is shut in for injection
                })

                # Soak interval
                soak_start = inj_end
                soak_end = min(self.horizon_days, soak_start + soak_days)
                if soak_start < self.horizon_days:
                    intervals.append({
                        "phase": "SOAK",
                        "start_day": soak_start,
                        "end_day": soak_end,
                        "steam_rate_t_d": 0.0,
                        "oil_rate_bopd": 0.0
                    })

                    # Post-steam production interval (thermal boost)
                    prod_start = soak_end
                    if prod_start < self.horizon_days:
                        boosted_oil = w.current_oil_bopd * 1.85  # Thermal stimulation boost
                        intervals.append({
                            "phase": "POST_STEAM_PROD",
                            "start_day": prod_start,
                            "end_day": self.horizon_days,
                            "steam_rate_t_d": 0.0,
                            "oil_rate_bopd": round(boosted_oil, 1)
                        })

            well_schedules[w.well_id] = intervals

        # Compute daily field oil lifting rate under scheduled operation
        for d in range(self.horizon_days):
            day_oil = 0.0
            for w in wells:
                intervals = well_schedules.get(w.well_id, [])
                for inter in intervals:
                    if inter["start_day"] <= d < inter["end_day"]:
                        day_oil += inter["oil_rate_bopd"]
                        break
                else:
                    # Default to current oil if before scheduled window
                    day_oil += w.current_oil_bopd if w.current_phase != "SHUT_IN" else 0.0
            daily_field_oil[d] = round(day_oil, 1)

        # Metrics & Summary
        peak_allocated = max(daily_steam_allocated) if daily_steam_allocated else 0.0
        peak_unconstrained = max(daily_unconstrained_steam) if daily_unconstrained_steam else 0.0
        boiler_deficit = max(0.0, peak_unconstrained - self.boiler_capacity_t_d)
        total_steam_allocated = sum(daily_steam_allocated)
        total_oil_produced_bbl = sum(daily_field_oil)

        return {
            "status": "OPTIMAL_SCHEDULE_GENERATED",
            "boiler_capacity_t_d": self.boiler_capacity_t_d,
            "planning_horizon_days": self.horizon_days,
            "peak_scheduled_steam_t_d": round(peak_allocated, 1),
            "boiler_utilization_pct": round((peak_allocated / self.boiler_capacity_t_d) * 100.0, 1),
            "unconstrained_peak_demand_t_d": round(peak_unconstrained, 1),
            "boiler_deficit_avoided_t_d": round(boiler_deficit, 1),
            "total_steam_consumed_tons": round(total_steam_allocated, 1),
            "total_field_oil_bbl": round(total_oil_produced_bbl, 1),
            "base_field_oil_bopd": round(base_oil_total, 1),
            "end_field_oil_bopd": daily_field_oil[-1] if daily_field_oil else round(base_oil_total, 1),
            "well_candidates": [w.to_dict() for w in sorted_wells],
            "well_schedules": well_schedules,
            "daily_profile": [
                {
                    "day": d,
                    "scheduled_steam_t_d": round(daily_steam_allocated[d], 1),
                    "boiler_capacity_t_d": self.boiler_capacity_t_d,
                    "unconstrained_steam_t_d": round(daily_unconstrained_steam[d], 1),
                    "field_oil_bopd": daily_field_oil[d]
                }
                for d in range(self.horizon_days)
            ],
            "provenance": "SYNTHETIC / ASSUMPTION",
            "disclaimer": "Multi-well scheduling assumes centralized boiler distribution header in Baghewala Field."
        }


# Global instance
field_scheduler = FieldSteamScheduler()
