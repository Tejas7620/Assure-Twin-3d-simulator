"""
readiness.py - Cyclic Steam Stimulation (CSS) Cycle Readiness Index.
Implements:
1. Thermodynamic decay readiness: evaluates thermal reserve exhaustion (T_nw approaching T_ambient).
2. Economic depletion readiness: marginal lifting cost vs daily heavy oil revenue.
3. Flow performance degradation: inflow productivity index drop.
4. Readiness Index (0 to 100%) and optimal steam slug timing advisor.
"""

import math
from typing import Dict, Any

class CSSReadinessEngine:
    def __init__(
        self,
        ambient_temp_c: float = 52.0,
        steam_temp_c: float = 195.0,
        economic_cutoff_bpd: float = 8.0
    ):
        self.t_ambient = float(ambient_temp_c)
        self.t_steam = float(steam_temp_c)
        self.min_economic_bpd = float(economic_cutoff_bpd)

    def evaluate_readiness(
        self,
        current_temp_c: float,
        current_oil_rate_bpd: float,
        current_sor: float,
        days_in_production: float,
        daily_profit_usd: float
    ) -> Dict[str, Any]:
        """
        Computes composite CSS readiness score and recommended intervention date.
        """
        t_c = float(current_temp_c)
        q_oil = float(current_oil_rate_bpd)
        sor = float(current_sor)
        days = float(days_in_production)
        profit = float(daily_profit_usd)

        # 1. Thermal Exhaustion Score (0 to 100)
        # 100% when near-well temp cools down to ambient
        delta_total = max(10.0, self.t_steam - self.t_ambient)
        delta_remaining = max(0.0, t_c - self.t_ambient)
        thermal_exhaustion_pct = max(0.0, min(100.0, (1.0 - (delta_remaining / delta_total)) * 100.0))

        # 2. Production Depletion Score (0 to 100)
        prod_exhaustion_pct = max(0.0, min(100.0, (1.0 - (q_oil / 35.0)) * 100.0))

        # 3. Economic Cutoff Score
        if profit <= 150.0 or q_oil <= self.min_economic_bpd:
            econ_score = 95.0
        else:
            econ_score = max(0.0, min(80.0, (1.0 - (profit / 1200.0)) * 80.0))

        # Composite Readiness Index (weighted combination)
        readiness_index = 0.45 * thermal_exhaustion_pct + 0.35 * prod_exhaustion_pct + 0.20 * econ_score
        readiness_index = max(5.0, min(100.0, readiness_index))

        # Status and Recommendation
        if readiness_index >= 80.0:
            urgency = "IMMINENT_RESTIMULATION"
            recommendation = "Current cycle exhausted. Initiate CSS Cycle transition to INJECTION within 3-7 days."
            days_until_recommended_steam = 3.0
        elif readiness_index >= 60.0:
            urgency = "PREPARE_STEAM_SLUG"
            recommendation = "Thermal decay progressing. Schedule boiler fuel allocation and steam generator hookup."
            days_until_recommended_steam = round(max(5.0, (t_c - 56.0) / 0.35), 1)
        elif readiness_index >= 40.0:
            urgency = "NORMAL_PRODUCTION"
            recommendation = "Optimal heated production regime. Continue mechanical lift optimization."
            days_until_recommended_steam = round(max(15.0, (t_c - 56.0) / 0.35), 1)
        else:
            urgency = "EARLY_HOT_CYCLE"
            recommendation = "Post-steam peak production. High thermal reserve and minimum viscosity."
            days_until_recommended_steam = 45.0

        # Estimated benefit of next cycle
        estimated_incremental_oil_bbl = 1800.0 * (1.0 - min(0.40, days / 300.0))

        return {
            "readiness_index_pct": round(readiness_index, 1),
            "urgency": urgency,
            "days_until_recommended_steam": days_until_recommended_steam,
            "thermal_exhaustion_pct": round(thermal_exhaustion_pct, 1),
            "production_exhaustion_pct": round(prod_exhaustion_pct, 1),
            "estimated_incremental_oil_bbl": round(estimated_incremental_oil_bbl, 0),
            "recommendation": recommendation
        }
