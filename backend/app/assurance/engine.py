"""
engine.py - Core Assurance and Governance Engine for ASSURE-TWIN.
Unifies:
1. 12-checkpoint zero-trust safety gatekeeper
2. No safe recommendation fail-safe handler
3. Request more data telemetry validator
4. Explainable AI why/why-not rationale generator
5. Multi-tier alert management.
"""

from typing import Dict, Any, List, Optional
from .gatekeeper import evaluate_assurance_gate
from .no_safe_rec import NoSafeRecommendationHandler
from .request_more_data import RequestMoreDataHandler
from .why_engine import WhyExplainabilityEngine
from .alert_engine import AlertEngine

class AssuranceEngine:
    def __init__(self):
        self.no_safe_handler = NoSafeRecommendationHandler()
        self.data_sufficiency = RequestMoreDataHandler()
        self.why_engine = WhyExplainabilityEngine()
        self.alert_engine = AlertEngine()

    def evaluate_system(
        self,
        current_state: Dict[str, Any],
        proposed_controls: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Runs comprehensive assurance audit on current or proposed state.
        """
        # 1. 12-Checkpoint Gatekeeper
        gate_results = evaluate_assurance_gate(current_state, proposed_controls)

        # 2. No Safe Recommendation Check
        fm = current_state.get("loads", {}).get("float_margin_pct", 24.0)
        pprl = current_state.get("loads", {}).get("pprl_kn", 52.0)
        temp = current_state.get("thermal", {}).get("near_well_temp_c", 72.6)
        inj_p = current_state.get("controls", {}).get("injection_pressure_bar", 18.6)
        fillage = current_state.get("pump", {}).get("pump_fillage", 0.90)

        safe_eval = self.no_safe_handler.evaluate(
            float_margin_pct=fm,
            pprl_kn=pprl,
            rod_rating_kn=95.0,
            temperature_c=temp,
            injection_pressure_bar=inj_p,
            fracture_pressure_bar=38.0,
            pump_fillage=fillage
        )

        # 3. Telemetry Data Quality / Sufficiency
        dyno_pts = len(current_state.get("dynamometer", {}).get("surface_card", []))
        data_eval = self.data_sufficiency.evaluate_telemetry_sufficiency(
            has_dynamometer_card=dyno_pts > 0,
            card_point_count=dyno_pts,
            temp_sensor_healthy=True,
            press_sensor_healthy=True,
            water_cut_tested=True
        )

        # 4. Multi-tier alerts
        active_alerts = self.alert_engine.evaluate_state(current_state)

        # Overall Assurance Verdict
        is_cleared = gate_results.get("overall_status") in ["PASS", "PASSED"] and safe_eval["has_safe_recommendation"] and data_eval["is_sufficient"]

        return {
            "assurance_cleared": is_cleared,
            "overall_status": "APPROVED" if is_cleared else ("CONDITIONAL" if safe_eval["has_safe_recommendation"] else "HALTED"),
            "gatekeeper": gate_results,
            "safety_envelope": safe_eval,
            "telemetry_quality": data_eval,
            "active_alerts": active_alerts,
            "alert_count": len(active_alerts)
        }

    def explain(
        self,
        recommended_action: str,
        current_state: Dict[str, Any],
        proposed_setpoints: Dict[str, float]
    ) -> Dict[str, Any]:
        return self.why_engine.explain_recommendation(recommended_action, current_state, proposed_setpoints)

# Singleton assurance engine
assurance_engine = AssuranceEngine()
