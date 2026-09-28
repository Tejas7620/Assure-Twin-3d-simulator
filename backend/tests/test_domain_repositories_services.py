"""
backend/tests/test_domain_repositories_services.py
Comprehensive Unit & Integration Test Suite for ASSURE-TWIN
Testing:
1. Domain layer (models, business rules, exceptions, safety invariants)
2. Repository layer (well, alert, recommendation, observation, audit, calibration)
3. Application service layer (well, alert, recommendation, audit, calibration, report)
"""

import pytest
import uuid
from datetime import datetime, timezone

from backend.app.database import SessionLocal, init_db
from backend.app.domain.models import (
    WellSpecification, OperatingSetpoints, RodFloatStatus, RecommendationStatus,
    AssuranceGateVerdict, CSSPhase
)
from backend.app.domain.rules import (
    validate_operating_controls, assert_mechanical_safety, evaluate_thermal_feasibility,
    MIN_FLOAT_MARGIN_PCT, MAX_PPRL_KN
)
from backend.app.domain.exceptions import MechanicalSafetyViolation
from backend.app.repositories import (
    WellRepository, AlertRepository, RecommendationRepository,
    ObservationRepository, AuditRepository, CalibrationRepository
)
from backend.app.services import (
    WellService, AlertService, RecommendationService,
    AuditService, CalibrationService, ReportService
)
from backend.app.twin.engine import twin_manager


@pytest.fixture(scope="module")
def db_session():
    init_db()
    session = SessionLocal()
    yield session
    session.close()


# ---------------------------------------------------------------------------
# 1. Domain Layer Tests
# ---------------------------------------------------------------------------

def test_domain_well_specification_and_controls():
    spec = WellSpecification(well_id="BGW-17A")
    assert spec.well_id == "BGW-17A"
    assert spec.field_name == "Baghewala Heavy Oil Field"
    assert spec.pump_depth_m == 1420.0

    controls = OperatingSetpoints(spm=3.2, stroke_length_in=64.0)
    assert controls.spm == 3.2
    assert controls.stroke_length_in == 64.0


def test_domain_rules_operating_controls():
    # Valid controls
    valid, violations = validate_operating_controls(3.5, 72.0)
    assert valid is True
    assert len(violations) == 0

    # Invalid SPM (too high)
    valid, violations = validate_operating_controls(9.5, 72.0)
    assert valid is False
    assert any("SPM" in v for v in violations)

    # Invalid stroke (too low)
    valid, violations = validate_operating_controls(3.0, 20.0)
    assert valid is False
    assert any("Stroke" in v for v in violations)


def test_domain_rules_mechanical_safety():
    # Safe condition — should not raise
    assert_mechanical_safety(float_margin_pct=22.5, pprl_kn=65.0)

    # Violating float margin (< 10%)
    with pytest.raises(MechanicalSafetyViolation) as exc_info:
        assert_mechanical_safety(float_margin_pct=6.5, pprl_kn=65.0)
    assert exc_info.value.float_margin_pct == 6.5

    # Violating PPRL (> 115 kN)
    with pytest.raises(MechanicalSafetyViolation):
        assert_mechanical_safety(float_margin_pct=20.0, pprl_kn=125.0)


def test_domain_rules_thermal_feasibility():
    # Feasible condition
    ok, msg = evaluate_thermal_feasibility(near_well_temp_c=72.6, sor=2.84)
    assert ok is True

    # Temperature below cutoff (58 C)
    ok, msg = evaluate_thermal_feasibility(near_well_temp_c=51.0, sor=2.84)
    assert ok is False
    assert "cutoff" in msg.lower()

    # SOR above economic limit (4.5)
    ok, msg = evaluate_thermal_feasibility(near_well_temp_c=75.0, sor=5.2)
    assert ok is False
    assert "economic" in msg.lower()


# ---------------------------------------------------------------------------
# 2. Repository Layer Tests
# ---------------------------------------------------------------------------

def test_well_repository(db_session):
    repo = WellRepository(db_session)
    well = repo.get_by_name_or_id("BGW-17A")
    assert well is not None
    assert "BGW-17A" in well.well_name

    srp_cfg = repo.get_well_srp_config(well.id)
    assert srp_cfg is not None
    assert srp_cfg.pump_diameter > 0

    cycles = repo.get_well_css_cycles(well.id)
    assert len(cycles) >= 1


def test_alert_repository(db_session):
    repo = AlertRepository(db_session)
    test_alert_id = f"TEST-ALT-{str(uuid.uuid4())[:6]}"
    
    alert = repo.upsert_by_id({
        "id": test_alert_id,
        "well_id": "BGW-17A",
        "severity": "WARNING",
        "type": "TEST_TYPE",
        "title": "Unit Test Alert",
        "description": "Verification of alert persistence",
        "value": 15.0,
        "threshold": 10.0,
        "status": "ACTIVE"
    })
    assert alert.id == test_alert_id

    # Test acknowledgement
    ack_alert = repo.acknowledge(test_alert_id)
    assert ack_alert is not None
    assert ack_alert.status == "ACKNOWLEDGED"


def test_recommendation_repository(db_session):
    repo = RecommendationRepository(db_session)
    case_id = f"TEST-REC-{str(uuid.uuid4())[:6]}"
    
    rec = repo.save_case({
        "case_id": case_id,
        "well_id": "BGW-17A",
        "status": "AWAITING_APPROVAL",
        "title": "Test Recommendation",
        "proposed_controls": {"spm": 3.5, "stroke_inches": 64.0},
        "expected_outcomes": {"oil_gain": "+3.2 BOPD"},
        "causal_reasons_why": ["Increases pump displacement while keeping float margin safe"],
        "preconditions": ["Rehearsal passed"],
        "blocking_reasons": []
    })
    assert rec.id == case_id

    # Test approval
    approved = repo.record_signoff(case_id, actor="LEAD_PETRO_ENGINEER", approved=True, notes="Approved for deployment")
    assert approved is not None
    assert approved.status == "APPROVED_BY_ENGINEER"


def test_observation_repository(db_session):
    repo = ObservationRepository(db_session)
    obs = repo.record_production_step(
        well_id="BGW-17A",
        oil_rate=34.5,
        liquid_rate=40.0,
        water_cut=0.13,
        sor=2.9,
        temperature=74.0,
        pressure=18.5,
        energy=23.0
    )
    assert obs.id is not None
    assert obs.oil_rate == 34.5

    recent = repo.get_recent_by_well("BGW-17A", limit=5)
    assert len(recent) > 0


def test_audit_repository_and_cryptographic_hash(db_session):
    repo = AuditRepository(db_session)
    event = repo.log_event(
        actor="CHIEF_ENGINEER",
        action="TEST_SYSTEM_AUDIT",
        entity_type="SYSTEM",
        entity_id="BGW-17A",
        details={"verification": "passed"}
    )
    assert event.id is not None
    assert "_sha256" in event.details
    assert len(event.details["_sha256"]) == 64  # Valid SHA-256 length


def test_calibration_repository(db_session):
    repo = CalibrationRepository(db_session)
    run = repo.record_run(
        well_id="BGW-17A",
        run_name="TEST_RHEOLOGY_FIT",
        parameters_tuned={"mu_ref_cp": 1840.0, "activation_energy_b": 2400.0},
        residual_error=0.012,
        notes="Automated test rheology run"
    )
    assert run.id is not None
    assert len(run.parameters) == 2


# ---------------------------------------------------------------------------
# 3. Application Service Layer Tests
# ---------------------------------------------------------------------------

def test_well_service(db_session):
    service = WellService(db_session)
    details = service.get_well_details("BGW-17A")
    assert details is not None
    assert details["well_id"] == "BGW-17A"
    assert "srp_configuration" in details

    state = service.get_authoritative_state("BGW-17A")
    assert "loads" in state or "srp" in state or "controls" in state


def test_audit_service(db_session):
    service = AuditService(db_session)
    res = service.log_action(
        actor="AUTOMATION_BOT",
        action="SERVICE_TEST_ACTION",
        entity_type="PUMP_UNIT",
        entity_id="BGW-17A",
        details={"status": "OK"}
    )
    assert res["sha256"] is not None
    assert len(res["sha256"]) == 64

    trail = service.get_audit_trail(entity_id="BGW-17A", limit=10)
    assert len(trail) > 0


def test_alert_service(db_session):
    service = AlertService(db_session)
    state = {
        "loads": {"float_margin_pct": 24.0, "rod_float_status": "SAFE", "pprl_kn": 60.0},
        "pump": {"pump_fillage": 0.88},
        "thermal": {"near_well_temp_c": 72.0},
        "css": {"current_phase": "PRODUCTION"}
    }
    alerts = service.evaluate_live_alerts(state, well_id="BGW-17A")
    assert isinstance(alerts, list)
    assert len(alerts) > 0


def test_recommendation_service(db_session):
    service = RecommendationService(db_session)
    rec = service.generate_and_persist(well_id="BGW-17A")
    assert "case_id" in rec
    assert rec["status"] in ["AWAITING_APPROVAL", "NO_SAFE_RECOMMENDATION"]

    if rec["status"] == "AWAITING_APPROVAL":
        approved = service.approve_recommendation(
            case_id=rec["case_id"],
            actor="SUPERINTENDENT_ENGINEER",
            notes="Ready for production dispatch"
        )
        assert approved["status"] == "APPROVED_BY_ENGINEER"


def test_calibration_service(db_session):
    service = CalibrationService(db_session)
    temps = [40.0, 50.0, 60.0, 70.0, 80.0]
    viscs = [12000.0, 5400.0, 2600.0, 1350.0, 750.0]
    res = service.calibrate_viscosity_rheology(temps, viscs, apply_to_well=False)
    assert res.get("success") is True
    assert "fitted_parameters" in res


def test_report_service(db_session):
    service = ReportService(db_session)
    report = service.create_engineering_report(
        well_id="BGW-17A",
        author="Senior Field Engineer",
        notes="End-of-shift decision report"
    )
    assert "report_id" in report
    assert "cryptographic_signature" in report
    assert report["cryptographic_signature"]["algorithm"] == "SHA-256"
    assert len(report["cryptographic_signature"]["digest"]) == 64
