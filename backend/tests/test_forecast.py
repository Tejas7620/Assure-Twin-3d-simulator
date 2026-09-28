"""
test_forecast.py - Unit Tests for Forecast, Analytics, and Decision Pipeline (WP5).
"""

import pytest
from backend.app.forecast import (
    generate_forecast,
    CSSReadinessEngine,
    ThermalMemoryEngine,
    DecisionRehearsalEngine,
    SensitivityEngine,
    DecisionEnginePipeline
)
from backend.app.analytics.pumpability import compute_pumpability_window
from backend.app.analytics.envelope import compute_operating_envelope
from backend.app.twin.time_stepper import StatefulTwinEngine

def test_generate_forecast():
    sim_state = {
        "reservoir": {"temperature_c": 72.6, "viscosity_cp": 1840.0},
        "controls": {"spm": 3.2, "stroke_inches": 64.0},
        "production": {"oil_rate_bopd": 32.6},
        "economics": {"instantaneous_sor": 2.84}
    }
    res = generate_forecast(sim_state, horizon_days=30)
    assert len(res["points"]) > 5
    assert res["horizon_days"] == 30

def test_pumpability_window():
    sim_state = {
        "reservoir": {"temperature_c": 72.6, "viscosity_cp": 1840.0},
        "controls": {"spm": 3.2, "stroke_inches": 64.0},
        "srp": {"float_margin_pct": 28.9}
    }
    res = compute_pumpability_window(sim_state)
    assert res["state"] in ["SAFE", "WARNING", "CRITICAL"]
    assert res["time_to_boundary_days"] > 0.0

def test_operating_envelope():
    sim_state = {
        "reservoir": {"temperature_c": 72.6, "viscosity_cp": 1840.0},
        "controls": {"spm": 3.2}
    }
    res = compute_operating_envelope(sim_state)
    assert "status" in res
    assert res["preferred_spm_max"] > res["preferred_spm_min"]

def test_css_readiness():
    readiness = CSSReadinessEngine()
    # High temp case (not ready for restimulation)
    res_hot = readiness.evaluate_readiness(current_temp_c=110.0, current_oil_rate_bpd=45.0, current_sor=2.2, days_in_production=10.0, daily_profit_usd=2200.0)
    assert res_hot["readiness_index_pct"] < 50.0

    # Low temp exhausted case (urgent restimulation)
    res_cold = readiness.evaluate_readiness(current_temp_c=53.0, current_oil_rate_bpd=6.0, current_sor=6.5, days_in_production=120.0, daily_profit_usd=80.0)
    assert res_cold["readiness_index_pct"] > 75.0
    assert res_cold["urgency"] in ["PREPARE_STEAM_SLUG", "IMMINENT_RESTIMULATION"]

def test_thermal_memory():
    mem = ThermalMemoryEngine()
    mem.record_cycle(2, steam_tons=2800.0, heat_injected_gj=6100.0, heat_produced_gj=950.0, heat_loss_gj=1600.0, final_radius_m=6.5)
    summary = mem.get_memory_summary()
    assert summary["cycle_count"] == 2
    assert summary["cumulative_retained_gj"] > 0.0

def test_decision_rehearsal():
    engine = StatefulTwinEngine(well_id="BW-01")
    rehearsal = DecisionRehearsalEngine()

    # Rehearse safe adjustment
    res_safe = rehearsal.rehearse_decision(engine, {"spm": 3.4}, rehearsal_horizon_days=7)
    assert res_safe["is_safe_to_execute"] is True

    # Rehearse dangerously high SPM in heavy oil -> triggers float hazard
    res_unsafe = rehearsal.rehearse_decision(engine, {"spm": 9.5}, rehearsal_horizon_days=7)
    assert len(res_unsafe["violations"]) > 0

def test_sensitivity_engine():
    sens = SensitivityEngine()
    res = sens.analyze_sensitivities()
    assert len(res["tornado_drivers"]) == 5
    assert res["robustness_score_pct"] > 50.0

def test_decision_pipeline():
    engine = StatefulTwinEngine(well_id="BW-01")
    pipeline = DecisionEnginePipeline()
    res = pipeline.generate_recommendations(engine)
    assert res["total_candidates_evaluated"] > 0
    assert res["top_recommendation"] is not None
