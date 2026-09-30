"""
backend/tests/test_assure_twin_platform.py
Comprehensive Platform Unit & Integration Tests for ASSURE-TWIN.
Tests:
1. Canonical WellState Model integrity
2. Data Quality Gate auditor (GOOD, DEGRADED, BLOCKED)
3. Dynacard feature extraction & pattern diagnostic classification
4. SRP Reliability & Hazard prediction
5. Model Registry & Provenance Registry
6. 18-Point Decision Report with SHA-256 integrity seal
7. Safe Alternative Engine search on gate failure
8. Fault Injection propagation and NO SAFE RECOMMENDATION trigger
"""

import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.schemas.well_state import CanonicalWellState
from backend.app.assurance.data_quality import DataQualityAuditor
from backend.app.assurance.safe_alternatives import SafeAlternativeEngine
from backend.app.twin.engine import twin_manager

client = TestClient(app)

def test_canonical_well_state_schema():
    state = CanonicalWellState()
    assert state.identity.well_id == "BGW-17A"
    assert state.reservoir.near_well_temperature_c > 35.0
    assert state.fluid.viscosity_cp > 100.0
    assert state.srp.spm > 0.0
    assert state.srp.rod_float_margin_pct >= 0.0
    assert state.reliability.health_index > 0.0
    assert state.metadata.ood_status in ["IN_DOMAIN", "NEAR_BOUNDARY", "OUT_OF_DOMAIN"]

def test_data_quality_auditor_clean():
    auditor = DataQualityAuditor()
    clean_telemetry = {
        "temperature_c": 72.8,
        "p_wf_bar": 18.2,
        "p_res_bar": 68.4,
        "spm": 3.2,
        "stroke_inches": 64.0,
        "oil_rate_bopd": 32.6,
        "liquid_rate_bpd": 38.0,
        "water_cut": 0.128,
        "viscosity_cp": 1840.0,
        "float_margin_pct": 24.5,
        "pprl_kn": 88.5
    }
    res = auditor.audit_telemetry(clean_telemetry)
    assert res.overall_status == "GOOD"
    assert res.score >= 90.0
    assert len(res.blocking_conditions) == 0

def test_data_quality_auditor_blocked():
    auditor = DataQualityAuditor()
    # Missing temperature and inverted production rates
    bad_telemetry = {
        "p_wf_bar": 18.2,
        "oil_rate_bopd": 120.0,
        "liquid_rate_bpd": 40.0 # Contradictory: oil > liquid!
    }
    res = auditor.audit_telemetry(bad_telemetry)
    assert res.overall_status == "BLOCKED"
    assert len(res.blocking_conditions) > 0

def test_dynacard_analysis_endpoint():
    resp = client.post("/api/v1/dynacard/analyze", json={"well_id": "BGW-17A", "spm": 3.2, "stroke_inches": 64.0})
    assert resp.status_code == 200
    data = resp.json()
    assert "surface_card" in data
    assert "features" in data
    assert data["features"]["pprl_kn"] > 0
    assert data["features"]["cyclic_work_kj"] > 0
    assert "diagnosis" in data
    assert "assurance_impact" in data

def test_reliability_risk_endpoint():
    resp = client.post("/api/v1/reliability/risk", json={"well_id": "BGW-17A"})
    assert resp.status_code == 200
    data = resp.json()
    assert "health_index" in data
    assert "hazards" in data
    assert "rod_parting_hazard" in data["hazards"]
    assert "mtbf_days" in data["metrics"]
    assert len(data["maintenance_history"]) > 0

def test_model_registry_endpoint():
    resp = client.get("/api/v1/models")
    assert resp.status_code == 200
    models = resp.json()
    assert len(models) >= 4
    model_names = [m["name"] for m in models]
    assert any("Marx-Langenheim" in name for name in model_names)
    assert any("Random Forest" in name for name in model_names)

def test_provenance_endpoint():
    resp = client.get("/api/v1/provenance")
    assert resp.status_code == 200
    data = resp.json()
    assert "signals" in data
    assert "categories" in data
    assert data["signals"]["downhole_temperature"]["badge"] == "MODEL-DERIVED"

def test_decision_report_with_sha256():
    req = {
        "well_id": "BGW-17A",
        "scenario_id": "SCEN-JOINT-OPT",
        "author": "Chief Petroleum Engineer",
        "rehearsal_horizon_days": 30
    }
    resp = client.post("/api/v1/reports/decision", json=req)
    assert resp.status_code == 200
    rep = resp.json()
    assert "SHA256:" in rep["sha256_hash"]
    assert rep["contract_title"] == "ASSURE-TWIN AUDITABLE ENGINEERING DECISION REPORT"
    assert "why" in rep
    assert "why_not" in rep
    assert "operating_envelope_result" in rep
    assert "disclaimer" in rep

    # Test HTML export
    report_id = rep["report_id"]
    resp_html = client.get(f"/api/v1/reports/decision/{report_id}/html")
    assert resp_html.status_code == 200
    assert "text/html" in resp_html.headers["content-type"]
    assert "ASSURE-TWIN" in resp_html.text

def test_safe_alternatives_engine():
    well = twin_manager.get_active_well()
    state = well.step(0.0)
    engine = SafeAlternativeEngine()
    # Given an aggressive setpoint that trips constraints
    rejected = {"spm": 6.8, "stroke_inches": 64.0}
    alts = engine.find_safe_alternatives(
        live_engine=well,
        rejected_controls=rejected,
        failed_gate_reasons=["Rod float margin collapsed"],
        current_state=state
    )
    assert len(alts) >= 1
    # Check that at least one alternative provides safe setpoints
    best_alt = alts[0]
    assert "proposed_controls" in best_alt
    assert "explanation" in best_alt

def test_controlled_fault_injection_propagation():
    # 1. Inject Rapid Cooling Fault
    resp_fault = client.post("/api/v1/wells/BGW-17A/fault-injection", json={"fault_type": "RAPID_COOLING"})
    assert resp_fault.status_code == 200
    data = resp_fault.json()
    assert data["status"] == "DEMO_SCENARIO_INJECTED"
    assert data["assurance_verdict"] == "NO SAFE RECOMMENDATION (ABSTAIN)"
    assert len(data["failed_gates"]) >= 1
    assert len(data["safe_alternatives"]) >= 1

    # 2. Reset back to baseline
    resp_reset = client.post("/api/v1/wells/BGW-17A/demo/reset")
    assert resp_reset.status_code == 200
    assert resp_reset.json()["status"] == "SUCCESS"

    # Verify baseline restored
    resp_state = client.get("/api/v1/wells/BGW-17A/state")
    assert resp_state.status_code == 200
    assert resp_state.json()["normalised"]["viscosity_cp"] < 5000.0
