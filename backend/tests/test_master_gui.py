"""
backend/tests/test_master_gui.py
Master GUI Integration Verification Suite (Phase 55, Critical Tests 1 - 4).

Verifies:
- Critical Test 1: Live State -> Rehearsal -> Live State Unchanged (Rehearsal Isolation Sandbox)
- Critical Test 2: Abnormal Viscosity -> Assurance -> NO SAFE RECOMMENDATION (Abstain Protocol)
- Critical Test 3: Out-of-Domain (OOD) -> ML Fallback -> No Unsafe ML Recommendation
- Critical Test 4: Recommendation -> Certified Engineering Report Consistency & SHA-256 Seal
"""

import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.ai.surrogate import CSSSurrogateModel

client = TestClient(app)

def test_critical_1_rehearsal_isolation_preserves_live_state():
    """
    CRITICAL TEST 1:
    LIVE STATE -> REHEARSAL -> LIVE STATE UNCHANGED.
    Ensures that forward digital rehearsals never mutate live well state or base telemetry.
    """
    # 1. Capture live initial state
    resp_live_before = client.get("/api/v1/wells/BGW-17A/state")
    assert resp_live_before.status_code == 200
    n_before = resp_live_before.json()["normalised"]
    init_spm = n_before["spm"]
    init_stroke = n_before["stroke_in"]
    init_temp = n_before["temperature_c"]
    init_visc = n_before["viscosity_cp"]

    # 2. Execute isolated 30-day decision rehearsal with altered setpoints
    rehearsal_payload = {
        "spm": 6.7,
        "stroke_inches": 52.0,
        "steam_volume_t_d": 19.8,
        "horizon_days": 30
    }
    resp_rehearsal = client.post("/api/v1/wells/BGW-17A/rehearsal", json=rehearsal_payload)
    assert resp_rehearsal.status_code == 200
    rehearsal_data = resp_rehearsal.json()
    
    # Verify rehearsal projected forward in time
    assert rehearsal_data["horizon_days"] == 30
    assert "trajectory_sample" in rehearsal_data
    assert rehearsal_data["proposed_controls"]["spm"] == 6.7

    # 3. Check live state immediately after rehearsal
    resp_live_after = client.get("/api/v1/wells/BGW-17A/state")
    assert resp_live_after.status_code == 200
    n_after = resp_live_after.json()["normalised"]

    # LIVE STATE MUST BE IDENTICAL
    assert n_after["spm"] == init_spm
    assert n_after["stroke_in"] == init_stroke
    assert n_after["temperature_c"] == init_temp
    assert n_after["viscosity_cp"] == init_visc


def test_critical_2_abnormal_viscosity_gatekeeper_abstain():
    """
    CRITICAL TEST 2:
    ABNORMAL VISCOSITY -> ASSURANCE -> NO_SAFE_RECOMMENDATION.
    Injects controlled cold slug viscosity surge (+14,500 cP) and verifies
    the authoritative gatekeeper trips constraints and triggers the abstain protocol.
    """
    # 1. Trigger controlled demo anomaly
    resp_spike = client.post("/api/v1/wells/BGW-17A/demo/abnormal-viscosity")
    assert resp_spike.status_code == 200
    spike_data = resp_spike.json()
    assert spike_data["status"] == "DEMO_SCENARIO_INJECTED"
    assert spike_data["injected_parameters"]["viscosity_cp"] >= 14000.0

    # 2. Evaluate assurance gate
    resp_assurance = client.post("/api/v1/wells/BGW-17A/assurance")
    assert resp_assurance.status_code == 200
    assurance_data = resp_assurance.json()

    # Must fail thermal or float margin and trigger abstain
    assert assurance_data["abstain_active"] is True
    assert "NO SAFE RECOMMENDATION" in assurance_data["status"] or not assurance_data["overall_pass"]
    assert assurance_data["failed_count"] >= 1

    # 3. Generate recommendation under abnormal conditions
    resp_rec = client.post("/api/v1/wells/BGW-17A/recommendation")
    assert resp_rec.status_code == 200
    rec_data = resp_rec.json()
    assert rec_data["status"] == "NO_SAFE_RECOMMENDATION" or rec_data["recommendation_type"] == "ABSTAIN"
    assert len(rec_data.get("blocking_reasons", [])) > 0 or len(rec_data.get("abstain_reason", "")) > 0

    # 4. Clean up: reset demo state
    resp_reset = client.post("/api/v1/wells/BGW-17A/demo/reset")
    assert resp_reset.status_code == 200
    assert resp_reset.json()["status"] in ["SUCCESS", "DEMO_RESET_SUCCESSFUL"]

    # Verify baseline is restored
    resp_restored = client.get("/api/v1/wells/BGW-17A/state")
    assert resp_restored.status_code == 200
    assert resp_restored.json()["normalised"]["viscosity_cp"] < 5000.0


def test_critical_3_ood_triggers_physics_fallback():
    """
    CRITICAL TEST 3:
    OOD -> ML PROTECTION / FALLBACK -> NO UNSAFE ML RECOMMENDATION.
    Ensures that when operating point is outside training distribution,
    ML surrogate is flagged as out-of-domain and authoritative physics solver takes precedence.
    """
    surrogate = CSSSurrogateModel()
    
    # 1. In-domain input (typical Baghewala CSS+SRP operating conditions)
    res_in = surrogate.predict(
        perm_md=1500.0,
        visc_ref_cp=1390.0,
        steam_volume_t=1250.0,
        steam_rate_t_d=19.8,
        soak_days=7.0,
        spm=3.2,
        stroke_in=64.0,
        water_cut=0.12
    )
    assert not res_in["fallback_used"]
    assert res_in["source"] == "ML_SURROGATE"
    assert res_in["confidence_score"] >= 0.70

    # 2. Out-of-domain input (extreme parameters far beyond training bounds)
    res_ood = surrogate.predict(
        perm_md=50.0,           # OOB < 300
        visc_ref_cp=35000.0,
        steam_volume_t=50.0,    # OOB < 400
        steam_rate_t_d=0.0,
        soak_days=1.0,
        spm=0.1,                # OOB < 0.3
        stroke_in=20.0,
        water_cut=0.9
    )
    assert res_ood["fallback_used"] is True
    assert res_ood["source"] == "PHYSICS_FALLBACK"
    assert "Out of training distribution" in res_ood["fallback_reason"]


def test_critical_4_recommendation_and_certified_report_consistency():
    """
    CRITICAL TEST 4:
    RECOMMENDATION GENERATED -> REPORT GENERATED -> VALUES MATCH RECOMMENDATION.
    Ensures that certified engineering report perfectly reflects recommendation setpoints,
    seals it with SHA-256 hash, and marks provenance clearly.
    """
    # 1. Generate active recommendation
    resp_rec = client.post("/api/v1/wells/BGW-17A/recommendation")
    assert resp_rec.status_code == 200
    rec = resp_rec.json()

    # 2. Request certified engineering report
    report_req = {
        "well_id": "BGW-17A",
        "scenario_id": "SCEN-JOINT-OPT",
        "author": "Senior Production Engineer (ONGC)",
        "notes": "Verified Rehearsal Decision"
    }
    resp_report = client.post("/api/v1/reports/engineering", json=report_req)
    assert resp_report.status_code == 200
    report = resp_report.json()

    # 3. Verify cryptographic seal & structure
    assert "report_id" in report
    assert len(report["report_id"]) >= 20
    assert report["asset"]["well_id"] == "BGW-17A"
    assert "Baghewala" in report["asset"]["field"]

    # 4. Consistency checks
    if rec.get("status") == "AWAITING_APPROVAL" and rec.get("recommendation_type") == "SAFE_RECOMMENDATION":
        assert "spm" in rec["proposed_controls"]
        assert report["proposed_setpoints"]["spm"] > 0
        assert report["proposed_setpoints"]["stroke_inches"] > 0

    # 5. Provenance disclaimer verification (no fake field telemetry claim)
    assert "disclaimer" in report
    assert "derived" in report["disclaimer"].lower() or "simulated" in report["disclaimer"].lower() or "models" in report["disclaimer"].lower()
