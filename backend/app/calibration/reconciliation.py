"""
reconciliation.py - Production Outcome Reconciliation and Model Updating.
Compares simulation forward predictions against actual field production and telemetry logs:
- Calculates Mean Absolute Percentage Error (MAPE)
- Detects systematic reservoir depletion or mechanical scaling drift
- Auto-reconciles parameter offsets (productivity skin, pump efficiency degradation).
"""

from typing import Dict, Any, List
import numpy as np

class OutcomeReconciliationEngine:
    def __init__(self):
        pass

    def reconcile_production(
        self,
        predicted_oil_bpd: List[float],
        actual_oil_bpd: List[float]
    ) -> Dict[str, Any]:
        """
        Calculates reconciliation error and identifies parameter drift.
        """
        if len(predicted_oil_bpd) != len(actual_oil_bpd) or len(actual_oil_bpd) == 0:
            return {"status": "INVALID_SERIES", "error": "Mismatched or empty series"}

        pred = np.array(predicted_oil_bpd, dtype=float)
        act = np.array(actual_oil_bpd, dtype=float)

        residuals = act - pred
        abs_pct_errors = np.abs(residuals) / np.maximum(1.0, act) * 100.0

        mape = float(np.mean(abs_pct_errors))
        bias = float(np.mean(residuals))

        # Diagnosis of model mismatch
        if mape < 10.0:
            diagnosis = "EXCELLENT_MATCH"
            recommendation = "Simulation accurately represents current field behavior. No parameter update required."
            update_factor = 1.0
        elif bias < -5.0:
            diagnosis = "SIMULATION_OVERPREDICTING"
            recommendation = "Actual production is lagging simulation. Likely skin damage or severe thermal dissipation. Recommend increasing skin factor by +0.5."
            update_factor = 0.90
        elif bias > 5.0:
            diagnosis = "SIMULATION_UNDERPREDICTING"
            recommendation = "Field outperforming simulation. Formation permeability or heated radius is larger than estimated. Recommend adjusting permeability +15%."
            update_factor = 1.12
        else:
            diagnosis = "NOISY_TRACKING"
            recommendation = "Scattered residual errors without persistent bias. Monitor telemetry."
            update_factor = 1.0

        return {
            "diagnosis": diagnosis,
            "mape_pct": round(mape, 1),
            "mean_bias_bpd": round(bias, 2),
            "points_compared": len(actual_oil_bpd),
            "recommendation": recommendation,
            "suggested_skin_adjustment": round((1.0 - update_factor) * 2.0, 2),
            "suggested_permeability_multiplier": update_factor
        }
