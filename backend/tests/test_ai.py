"""
test_ai.py - Unit Tests for AI / Machine Learning Layer (WP4).
"""

import pytest
from backend.app.ai import (
    SyntheticDataGenerator,
    CSSSurrogateModel,
    FailureHazardModel,
    DynoCardClassifier,
    ModelAgreementEngine
)

def test_synthetic_data_generator():
    gen = SyntheticDataGenerator()
    data = gen.generate_css_dataset(num_samples=25)
    assert len(data) == 25
    sample = data[0]
    assert "steam_volume_t" in sample
    assert "cum_oil_90d_bbl" in sample
    assert sample["sor"] > 0.0

def test_css_surrogate_model():
    model = CSSSurrogateModel()
    assert model.is_trained is True

    # In-distribution prediction
    res = model.predict(
        perm_md=1850.0,
        visc_ref_cp=10000.0,
        steam_volume_t=2500.0,
        steam_rate_t_d=45.0,
        soak_days=5.0,
        spm=3.2,
        stroke_in=64.0,
        water_cut=0.15
    )
    assert res["source"] == "ML_SURROGATE"
    assert res["predicted_peak_temp_c"] > 70.0
    assert res["predicted_90d_oil_bbl"] > 0.0

    # Out-of-bounds fallback
    fallback_res = model.predict(
        perm_md=50.0, # Out of range
        visc_ref_cp=10000.0,
        steam_volume_t=2500.0,
        steam_rate_t_d=45.0,
        soak_days=5.0,
        spm=3.2,
        stroke_in=64.0,
        water_cut=0.15
    )
    assert fallback_res["source"] == "PHYSICS_FALLBACK"
    assert fallback_res["fallback_used"] is True

def test_failure_hazard_model():
    hazard = FailureHazardModel()
    res = hazard.evaluate_hazards(
        pprl_kn=55.0,
        mprl_kn=28.0,
        float_margin_pct=32.0,
        pump_fillage=0.92,
        rod_float_status="SAFE",
        fluid_pound_magnitude_kn=0.0,
        compression_depth_m=0.0,
        viscosity_cp=120.0
    )
    assert res["risk_level"] in ["HEALTHY_OPTIMAL", "MODERATE_NORMAL"]
    assert res["health_index"] > 60.0

def test_dyno_classifier():
    classifier = DynoCardClassifier()
    # Mock card points
    card = [{"pos_in": float(i), "load_kn": 40.0} for i in range(20)]

    # Fluid pound case
    res_pound = classifier.classify_card(card, pump_fillage=0.55, float_margin_pct=28.0, rod_float_status="SAFE", fluid_pound_magnitude_kn=25.0)
    assert res_pound["diagnosis"] == "FLUID_POUND"

    # Rod float case
    res_float = classifier.classify_card(card, pump_fillage=0.90, float_margin_pct=5.0, rod_float_status="FLOATING", fluid_pound_magnitude_kn=0.0)
    assert res_float["diagnosis"] == "HEAVY_OIL_ROD_FLOAT"

def test_model_agreement():
    engine = ModelAgreementEngine(max_tolerable_divergence_pct=15.0)

    # Agreement case
    phys = {"oil_rate": 35.0, "peak_temp": 82.0}
    ai_close = {"oil_rate": 36.2, "peak_temp": 83.5}
    res_agree = engine.evaluate_agreement(phys, ai_close)
    assert res_agree["is_agreed"] is True
    assert res_agree["status"] == "STRONG_CONSENSUS"

    # Disagreement case
    ai_divergent = {"oil_rate": 55.0, "peak_temp": 82.0}
    res_disagree = engine.evaluate_agreement(phys, ai_divergent)
    assert res_disagree["disagreement_alert"] is True
