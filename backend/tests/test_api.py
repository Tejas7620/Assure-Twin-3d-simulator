"""
backend/tests/test_api.py
Comprehensive End-to-End API and Physics Verification Tests for ASSURE-TWIN.
SIH 2026 — PS 26120.
"""

import pytest
from fastapi.testclient import TestClient

from backend.app.main import app

@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c

def test_health_check(client):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "HEALTHY"
    assert "Baghewala" in data["asset"]
    assert "sim_time_days" in data

def test_get_wells(client):
    response = client.get("/api/v1/wells")
    assert response.status_code == 200
    wells = response.json()
    assert len(wells) >= 1
    assert any("BGW-17A" in w["well_name"] or w["id"] == "BGW-17A" for w in wells)

def test_simulation_state_and_controls(client):
    # Test state retrieval
    response = client.get("/api/v1/simulation/state")
    assert response.status_code == 200
    state = response.json()
    assert "controls" in state
    assert "reservoir" in state
    assert "pump" in state
    assert "production" in state
    assert "srp" in state
    assert state["reservoir"]["temperature_c"] > 0
    assert state["reservoir"]["viscosity_cp"] > 0

    # Test updating a control parameter
    ctrl_res = client.post("/api/v1/simulation/control", json={"param": "spm", "value": 3.6})
    assert ctrl_res.status_code == 200
    updated_state = ctrl_res.json()["state"]
    assert updated_state["controls"]["spm"] == 3.6

def test_virtual_downhole_analytics(client):
    response = client.get("/api/v1/analytics/virtual-downhole")
    assert response.status_code == 200
    data = response.json()
    assert "sensors" in data
    sensors = data["sensors"]
    assert "downholeTemperature" in sensors
    assert "downholePressure" in sensors
    assert "pumpIntakePressure" in sensors
    assert "dynamicFluidLevel" in sensors
    assert "rodDrag" in sensors
    assert sensors["downholeTemperature"]["confidence"] in ["HIGH", "MEDIUM"]

def test_pumpability_window(client):
    response = client.get("/api/v1/analytics/pumpability")
    assert response.status_code == 200
    data = response.json()
    assert "time_to_boundary_days" in data
    assert data["time_to_boundary_days"] > 0
    assert data["state"] in ["SAFE", "WARNING", "CRITICAL"]
    assert "critical_limiting_factor" in data

def test_operating_envelope(client):
    response = client.get("/api/v1/analytics/envelope")
    assert response.status_code == 200
    data = response.json()
    assert "preferred_spm_min" in data
    assert "preferred_spm_max" in data
    assert data["preferred_spm_min"] < data["preferred_spm_max"]
    assert "shrinkage_factor_pct" in data

def test_forecast_horizons(client):
    response = client.get("/api/v1/forecast?horizon_days=30")
    assert response.status_code == 200
    data = response.json()
    assert data["horizon_days"] == 30
    assert len(data["points"]) > 5
    # Verify temperature decays and viscosity increases over time
    first_pt = data["points"][0]
    last_pt = data["points"][-1]
    assert first_pt["temperature"] >= last_pt["temperature"]
    assert first_pt["viscosity"] <= last_pt["viscosity"]

def test_scenarios_comparison_and_rehearsal(client):
    # Comparison of 4 scenarios
    response = client.get("/api/v1/scenarios/compare")
    assert response.status_code == 200
    data = response.json()
    assert len(data["scenarios"]) == 4

    # Custom Rehearsal
    reh_res = client.post("/api/v1/scenarios/rehearse", json={
        "well_id": "BGW-17A",
        "spm": 2.8,
        "stroke_length_in": 74.0,
        "vfd_speed_hz": 52.0,
        "steam_volume_tons": 2400.0,
        "soak_duration_days": 5.0
    })
    assert reh_res.status_code == 200
    reh_data = reh_res.json()
    assert "simulation_outcomes" in reh_data
    assert reh_data["simulation_outcomes"]["oil_rate_bopd"] > 0

def test_joint_optimization(client):
    opt_res = client.post("/api/v1/optimization/solve", json={
        "well_id": "BGW-17A",
        "weights": {
            "crude_revenue": 1.0,
            "steam_penalty": 0.45,
            "power_penalty": 0.15,
            "mechanical_risk": 0.85
        }
    })
    assert opt_res.status_code == 200
    opt_data = opt_res.json()
    assert "best_candidate" in opt_data
    # C3 fix: candidates are now simulated; check real computed fields exist
    assert "candidates" in opt_data
    best = opt_data["best_candidate"]
    assert "spm" in best
    assert "stroke_in" in best
    assert "float_margin_pct" in best
    assert "sor" in best
    assert "overall_score" in best
    assert "solver_rationale" in opt_data
    assert "all_evaluated" in opt_data  # New field confirming grid search ran

def test_recommendation_and_approval(client):
    # C1 fix: Generate a fresh recommendation from twin state (not hardcoded default)
    gen_res = client.post("/api/v1/recommendations/generate")
    assert gen_res.status_code == 200
    rec_data = gen_res.json()
    # Must have a real case_id (not hardcoded REC-2026-BGW-004)
    assert "case_id" in rec_data
    assert rec_data["case_id"] != "REC-2026-BGW-004"
    assert "recommendation_type" in rec_data  # New field: SAFE_RECOMMENDATION or ABSTAIN
    case_id = rec_data["case_id"]

    if rec_data["recommendation_type"] == "ABSTAIN":
        # Valid: gate or rehearsal abstained — verify abstain structure
        assert rec_data["status"] == "NO_SAFE_RECOMMENDATION"
        assert len(rec_data.get("blocking_reasons", [])) > 0
    else:
        # Safe recommendation: verify it can be approved
        app_res = client.post(f"/api/v1/recommendations/{case_id}/approve", json={
            "actor": "Lead Asset Petroleum Engineer",
            "notes": "Verified thermal window safety margin."
        })
        assert app_res.status_code == 200
        app_data = app_res.json()
        assert app_data["status"] == "APPROVED_BY_ENGINEER"
        assert app_data["approved_by"] == "Lead Asset Petroleum Engineer"

def test_assurance_12_checkpoints(client):
    response = client.get("/api/v1/assurance/evaluate")
    assert response.status_code == 200
    data = response.json()
    assert len(data["checks"]) == 12
    assert "gate_score_pct" in data
    assert 0.0 <= data["gate_score_pct"] <= 100.0  # Real range, not asserting fake >=75
    # C2 fix: gate now returns real verdicts; verify structure
    assert "abstain_active" in data
    assert "blocking_reasons" in data
    assert "status" in data
    assert data["status"] in [
        "VERIFIED FOR ENGINEER REVIEW",
        "CONDITIONAL \u2014 REVIEW WARNINGS",
        "NO SAFE RECOMMENDATION (ABSTAIN)"
    ]
    # All 12 checks must have required fields
    for check in data["checks"]:
        assert "id" in check
        assert "passed" in check
        assert "status" in check
        assert check["status"] in ["PASS", "WARNING", "FAIL"]

def test_alerts(client):
    response = client.get("/api/v1/alerts")
    assert response.status_code == 200
    alerts = response.json()
    assert len(alerts) >= 1
    alt_id = alerts[0]["id"]

    # Acknowledge
    ack_res = client.post(f"/api/v1/alerts/{alt_id}/acknowledge")
    assert ack_res.status_code == 200
    assert ack_res.json()["status"] == "ACKNOWLEDGED"
