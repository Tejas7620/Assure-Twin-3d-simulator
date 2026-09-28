"""
model_agreement.py - Dual-Model Physics-AI Agreement and Cross-Validation Engine.
Evaluates residual divergence and consensus between:
1. Analytical First-Principles Physics Models
2. Machine Learning Fast Surrogates / Diagnostic Classifiers
Flags model disagreement when deviation exceeds safe tolerance boundaries.
"""

import math
from typing import Dict, Any

class ModelAgreementEngine:
    def __init__(self, max_tolerable_divergence_pct: float = 12.0):
        self.max_tol_pct = float(max_tolerable_divergence_pct)

    def evaluate_agreement(
        self,
        physics_values: Dict[str, float],
        ai_values: Dict[str, float]
    ) -> Dict[str, Any]:
        """
        Calculates consensus metrics and agreement score (0 to 100).
        """
        comparisons = {}
        divergences = []

        common_keys = set(physics_values.keys()).intersection(set(ai_values.keys()))
        for k in common_keys:
            v_phys = float(physics_values[k])
            v_ai = float(ai_values[k])
            denom = max(1e-3, abs(v_phys))
            rel_diff_pct = abs(v_phys - v_ai) / denom * 100.0

            divergences.append(rel_diff_pct)
            comparisons[k] = {
                "physics": round(v_phys, 2),
                "ai": round(v_ai, 2),
                "divergence_pct": round(rel_diff_pct, 1),
                "is_concordant": rel_diff_pct <= self.max_tol_pct
            }

        avg_divergence = sum(divergences) / len(divergences) if divergences else 0.0
        agreement_score = max(0.0, min(100.0, 100.0 - avg_divergence))

        is_agreed = avg_divergence <= self.max_tol_pct
        status = "STRONG_CONSENSUS" if agreement_score > 90.0 else ("ACCEPTABLE_AGREEMENT" if is_agreed else "MODEL_DISAGREEMENT")

        return {
            "status": status,
            "is_agreed": is_agreed,
            "agreement_score": round(agreement_score, 1),
            "average_divergence_pct": round(avg_divergence, 1),
            "comparisons": comparisons,
            "disagreement_alert": not is_agreed
        }
