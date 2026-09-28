"""
test_calibration.py - Unit Tests for Field Calibration, Sensor Quality, and Data Import (WP7).
"""

import pytest
from backend.app.calibration import (
    SensorQualityEngine,
    CalibrationEngine,
    OutcomeReconciliationEngine,
    FieldDataImporter
)

def test_sensor_quality_screening():
    engine = SensorQualityEngine()

    # Healthy channel
    healthy_readings = [72.1, 72.3, 72.5, 72.4, 72.2, 72.6]
    res_healthy = engine.screen_channel("Wellhead_Temp", healthy_readings, min_bound=20.0, max_bound=150.0)
    assert res_healthy["is_healthy"] is True
    assert res_healthy["quality_score"] > 80.0

    # Flatline failure
    flatline_readings = [72.0, 72.0, 72.0, 72.0, 72.0, 72.0]
    res_flat = engine.screen_channel("Frozen_Transducer", flatline_readings, min_bound=20.0, max_bound=150.0)
    assert res_flat["is_healthy"] is False
    assert any("Flatline" in issue for issue in res_flat["issues"])

def test_viscosity_curve_fit():
    calib = CalibrationEngine()
    temps = [20.0, 40.0, 60.0, 80.0, 100.0, 120.0, 150.0]
    # Synthetic Andrade values with noise
    import math
    viscs = [10000.0 * math.exp(3800.0 * (1.0/(t+273.15) - 1.0/293.15)) for t in temps]

    fit_res = calib.fit_viscosity_curve(temps, viscs)
    assert fit_res["success"] is True
    assert fit_res["metrics"]["r_squared"] > 0.98
    params = fit_res["fitted_parameters"]
    assert 9000.0 <= params["mu_ref_cp"] <= 11000.0
    assert 3500.0 <= params["activation_energy_b"] <= 4100.0

def test_outcome_reconciliation():
    reconciler = OutcomeReconciliationEngine()
    pred = [30.0, 28.0, 26.0, 25.0, 24.0]
    act = [29.5, 27.8, 26.2, 24.9, 23.8] # Close match
    res = reconciler.reconcile_production(pred, act)
    assert res["diagnosis"] == "EXCELLENT_MATCH"
    assert res["mape_pct"] < 5.0

def test_csv_field_import():
    importer = FieldDataImporter()
    csv_sample = """Date,Oil_Rate_BPD,Water_Cut,Temp_C,SPM,Stroke_in,Steam_t
Day_1,34.2,0.12,78.5,3.2,64.0,0.0
Day_2,33.8,0.13,77.9,3.2,64.0,0.0
Day_3,32.9,0.13,77.1,3.2,64.0,0.0
Day_4,32.1,0.14,76.4,3.2,64.0,0.0
"""
    parsed = importer.parse_csv(csv_sample)
    assert parsed["success"] is True
    assert parsed["rows_parsed"] == 4
    assert parsed["records"][0]["oil_rate_bpd"] == 34.2
