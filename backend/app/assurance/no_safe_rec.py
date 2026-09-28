"""
no_safe_rec.py - "No Safe Recommendation Available" Fail-Safe Logic.
Refuses to generate or endorse automated recommendations when operations
exceed thermo-mechanical safety envelopes or violate fundamental engineering laws.
"""

from typing import Dict, Any, List

class NoSafeRecommendationError(Exception):
    """Raised when no operational change can satisfy all safety and economic constraints."""
    def __init__(self, message: str, limiting_constraints: List[str]):
        super().__init__(message)
        self.limiting_constraints = limiting_constraints

class NoSafeRecommendationHandler:
    def __init__(self):
        pass

    def evaluate(
        self,
        float_margin_pct: float,
        pprl_kn: float,
        rod_rating_kn: float,
        temperature_c: float,
        injection_pressure_bar: float,
        fracture_pressure_bar: float,
        pump_fillage: float
    ) -> Dict[str, Any]:
        """
        Determines whether any safe recommendation can be made, or if safe intervention is impossible.
        """
        violations = []

        if float_margin_pct <= 0.0:
            violations.append("Catastrophic rod float / negative polished rod load (rod string fully floating)")

        if pprl_kn > rod_rating_kn * 1.05:
            violations.append(f"Extreme tensile overload ({pprl_kn:.1f} kN > {rod_rating_kn:.1f} kN yield rating)")

        if injection_pressure_bar >= fracture_pressure_bar:
            violations.append(f"Formation breakdown hazard: Injection pressure ({injection_pressure_bar:.1f} bar) exceeds caprock fracture limit ({fracture_pressure_bar:.1f} bar)")

        if temperature_c > 340.0:
            violations.append("Thermal limit breached: Steam temperature exceeds wellhead packing rating")

        has_safe_path = len(violations) == 0

        if not has_safe_path:
            return {
                "has_safe_recommendation": False,
                "status": "NO_SAFE_RECOMMENDATION_AVAILABLE",
                "severity": "CRITICAL_HAZARD",
                "limiting_constraints": violations,
                "operator_instruction": "EMERGENCY INTERVENTION REQUIRED. Automated optimization suspended. Perform immediate manual well inspection and shut-in sequence if buckling or parting is imminent."
            }

        return {
            "has_safe_recommendation": True,
            "status": "SAFE_OPERATIONAL_SPACE",
            "severity": "NORMAL",
            "limiting_constraints": []
        }
