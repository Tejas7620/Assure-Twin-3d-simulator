"""
test_assurance.py - Unit Tests for Assurance, Explainability, and Alerting Package (WP6).
"""

import pytest
from backend.app.assurance import (
    evaluate_assurance_gate,
    NoSafeRecommendationHandler,
    RequestMoreDataHandler,
    WhyExplainabilityEngine,
    AlertEngine,
    AssuranceEngine
)

def test_no_safe_recommendation_trigger():
    handler = NoSafeRecommendationHandler()

    # Normal state
    normal = handler.evaluate(
        float_margin_pct=25.0,
        pprl_kn=55.0,
        rod_rating_kn=95.0,
        temperature_c=75.0,
        injection_pressure_bar=18.0,
        fracture_pressure_bar=38.0,
        pump_fillage=0.90
    )
    assert normal["has_safe_recommendation"] is True

    # Catastrophic state: rod float collapsed and tensile overload
    unsafe = handler.evaluate(
        float_margin_pct=-2.0, # Negative margin!
        pprl_kn=105.0, # Overload!
        rod_rating_kn=95.0,
        temperature_c=75.0,
        injection_pressure_bar=18.0,
        fracture_pressure_bar=38.0,
        pump_fillage=0.90
    )
    assert unsafe["has_safe_recommendation"] is False
    assert unsafe["status"] == "NO_SAFE_RECOMMENDATION_AVAILABLE"
    assert len(unsafe["limiting_constraints"]) >= 2

def test_request_more_data_trigger():
    handler = RequestMoreDataHandler(max_stale_seconds=30.0)

    # Adequate data
    ok = handler.evaluate_telemetry_sufficiency(
        has_dynamometer_card=True,
        card_point_count=48,
        temp_sensor_healthy=True,
        press_sensor_healthy=True,
        water_cut_tested=True,
        telemetry_age_seconds=1.5
    )
    assert ok["is_sufficient"] is True

    # Missing card and stale RTU
    stale = handler.evaluate_telemetry_sufficiency(
        has_dynamometer_card=False,
        card_point_count=0,
        temp_sensor_healthy=True,
        press_sensor_healthy=True,
        water_cut_tested=True,
        telemetry_age_seconds=120.0
    )
    assert stale["is_sufficient"] is False
    assert stale["status"] == "REQUEST_MORE_DATA"
    assert len(stale["missing_telemetry"]) >= 2

def test_why_engine():
    why = WhyExplainabilityEngine()
    current_state = {
        "controls": {"spm": 3.2},
        "loads": {"float_margin_pct": 24.0},
        "thermal": {"near_well_temp_c": 72.6},
        "fluid": {"viscosity_near_well_cp": 140.0},
        "pump": {"pump_fillage": 0.90}
    }
    explanation = why.explain_recommendation("Increase SPM to 3.5", current_state, {"spm": 3.5})
    assert len(explanation["why_justification"]) >= 3
    assert len(explanation["why_not_counterfactuals"]) >= 3
    assert any("ROD_FLOAT" in c["failure_mode"] for c in explanation["why_not_counterfactuals"])

def test_alert_engine():
    alerts = AlertEngine()
    state_float = {
        "loads": {"float_margin_pct": 4.5, "rod_float_status": "FLOATING", "pprl_kn": 40.0},
        "pump": {"pump_fillage": 0.85},
        "thermal": {"near_well_temp_c": 60.0},
        "css": {"current_phase": "PRODUCTION"}
    }
    active = alerts.evaluate_state(state_float)
    assert len(active) > 0
    assert any(a["severity"] == "CRITICAL" for a in active)

def test_assurance_engine_integration():
    engine = AssuranceEngine()
    state = {
        "reservoir": {"temperature_c": 72.6, "viscosity_cp": 1840.0, "pwf_bar": 18.2},
        "controls": {"spm": 3.2, "stroke_inches": 64.0, "injection_pressure_bar": 18.6},
        "srp": {"float_margin_pct": 28.9, "peak_rod_load_kn": 65.0, "gearbox_rating_pct": 62.0},
        "loads": {"float_margin_pct": 28.9, "pprl_kn": 65.0, "rod_float_status": "SAFE"},
        "thermal": {"near_well_temp_c": 72.6},
        "pump": {"pump_fillage": 0.90},
        "dynamometer": {"surface_card": [{"pos_in": float(i), "load_kn": 40.0} for i in range(24)]}
    }
    res = engine.evaluate_system(state)
    assert "assurance_cleared" in res
    assert "gatekeeper" in res
    assert "safety_envelope" in res
