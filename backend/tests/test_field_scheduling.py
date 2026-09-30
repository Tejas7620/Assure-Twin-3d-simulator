"""
test_field_scheduling.py - Unit and Integration Tests for Field-Level Steam Scheduling (Feature 4).
Covers:
1. Multi-well candidate initialization and priority score computation.
2. Strict boiler capacity constraint enforcement (scheduled_steam <= boiler_capacity for all days).
3. Unconstrained demand deficit demonstration (quantifies avoided boiler overload).
4. Urgency priority sequencing: highest priority wells receive earlier steam windows.
5. Custom boiler capacity and planning horizon elasticity.
6. API endpoint GET /api/v1/field/schedule.
7. API endpoint POST /api/v1/field/schedule/optimize.
8. Config flag handling (FIELD_SCHEDULING_ENABLED).
9. Provenance compliance (SYNTHETIC / ASSUMPTION labels).
"""

import pytest
from starlette.testclient import TestClient

from backend.app.main import app
from backend.app.config import settings
from backend.app.optimization.field_scheduler import (
    FieldSteamScheduler,
    WellCandidate,
    field_scheduler
)


@pytest.fixture
def client():
    return TestClient(app)


def test_field_scheduler_default_candidates():
    """Default candidates must represent 4 Baghewala wells with valid properties."""
    candidates = field_scheduler.get_default_candidates()
    assert len(candidates) == 4
    well_ids = [c.well_id for c in candidates]
    assert "BGW-17A" in well_ids
    assert "BW-02" in well_ids
    assert "BW-03" in well_ids
    assert "BW-04" in well_ids

    for c in candidates:
        assert c.target_steam_tons > 0
        assert c.injection_rate_t_d > 0
        assert c.injection_days >= 1
        score = c.compute_urgency_score()
        assert score > 0.0


def test_boiler_capacity_constraint_strictly_respected():
    """Across every single day in the planning horizon, allocated steam must never exceed boiler capacity."""
    boiler_cap = 100.0  # Constrained 100 t/d central boiler
    scheduler = FieldSteamScheduler(boiler_capacity_t_d=boiler_cap, planning_horizon_days=30)
    
    result = scheduler.optimize_schedule()
    assert result["status"] == "OPTIMAL_SCHEDULE_GENERATED"
    assert result["boiler_capacity_t_d"] == boiler_cap
    assert result["peak_scheduled_steam_t_d"] <= boiler_cap + 1e-6

    # Verify daily profile
    for day_rec in result["daily_profile"]:
        assert day_rec["scheduled_steam_t_d"] <= boiler_cap + 1e-6
        assert day_rec["field_oil_bopd"] >= 0.0


def test_unconstrained_demand_comparison_demonstrates_avoided_deficit():
    """Unscheduled simultaneous injection must exceed boiler capacity, proving scheduler's value."""
    boiler_cap = 100.0
    scheduler = FieldSteamScheduler(boiler_capacity_t_d=boiler_cap, planning_horizon_days=30)
    result = scheduler.optimize_schedule()

    # Total simultaneous injection demand of 4 wells is 50+50+50+60 = 210 t/d > 100 t/d
    assert result["unconstrained_peak_demand_t_d"] > boiler_cap
    assert result["boiler_deficit_avoided_t_d"] > 0.0
    assert result["boiler_utilization_pct"] <= 100.0


def test_urgency_priority_sequencing():
    """The well with highest priority score must be allocated an injection window starting at day 0."""
    scheduler = FieldSteamScheduler(boiler_capacity_t_d=120.0, planning_horizon_days=30)
    candidates = scheduler.get_default_candidates()
    
    # Sort candidates to find the highest priority
    highest_priority_well = max(candidates, key=lambda w: w.compute_urgency_score())
    
    result = scheduler.optimize_schedule(candidates=candidates)
    sched = result["well_schedules"][highest_priority_well.well_id]
    
    # First interval should either be INJECTION at day 0 or have start_day 0
    inj_interval = next(i for i in sched if i["phase"] == "INJECTION")
    assert inj_interval["start_day"] == 0


def test_custom_boiler_capacity_and_horizon():
    """Scheduler must dynamically adjust to custom boiler capacities and horizon lengths."""
    scheduler = FieldSteamScheduler(boiler_capacity_t_d=60.0, planning_horizon_days=45)
    result = scheduler.optimize_schedule()
    
    assert result["planning_horizon_days"] == 45
    assert len(result["daily_profile"]) == 45
    assert result["peak_scheduled_steam_t_d"] <= 60.0 + 1e-6


def test_field_schedule_get_api_endpoint(client):
    """GET /api/v1/field/schedule returns complete schedule and metadata."""
    res = client.get("/api/v1/field/schedule")
    assert res.status_code == 200
    data = res.json()
    assert data["enabled"] is True
    assert "boiler_capacity_t_d" in data
    assert "well_schedules" in data
    assert "daily_profile" in data
    assert "BGW-17A" in data["well_schedules"]
    assert data["provenance"] == "SYNTHETIC / ASSUMPTION"


def test_field_schedule_optimize_post_api_endpoint(client):
    """POST /api/v1/field/schedule/optimize recalculates schedule with custom parameters."""
    req_payload = {
        "boiler_capacity_t_d": 90.0,
        "planning_horizon_days": 20,
        "wells": [
            {
                "well_id": "BGW-17A",
                "well_name": "BGW-17A Test",
                "current_phase": "PRODUCTION",
                "near_well_temp_c": 50.0,
                "current_oil_bopd": 30.0,
                "target_steam_tons": 400.0,
                "injection_rate_t_d": 40.0,
                "soak_days": 4,
                "css_cycle": 3,
                "estimated_sor": 5.5
            },
            {
                "well_id": "BW-02",
                "well_name": "BW-02 Test",
                "current_phase": "PRODUCTION",
                "near_well_temp_c": 42.0,
                "current_oil_bopd": 20.0,
                "target_steam_tons": 360.0,
                "injection_rate_t_d": 40.0,
                "soak_days": 4,
                "css_cycle": 2,
                "estimated_sor": 6.0
            }
        ]
    }
    res = client.post("/api/v1/field/schedule/optimize", json=req_payload)
    assert res.status_code == 200
    data = res.json()
    assert data["boiler_capacity_t_d"] == 90.0
    assert data["planning_horizon_days"] == 20
    assert "BGW-17A" in data["well_schedules"]
    assert "BW-02" in data["well_schedules"]
    assert data["peak_scheduled_steam_t_d"] <= 90.0


def test_field_scheduling_disabled_flag(client, monkeypatch):
    """When FIELD_SCHEDULING_ENABLED is False, GET endpoint gracefully reports disabled."""
    monkeypatch.setattr(settings, "FIELD_SCHEDULING_ENABLED", False)
    res = client.get("/api/v1/field/schedule")
    assert res.status_code == 200
    data = res.json()
    assert data["enabled"] is False
    assert data["status"] == "DISABLED"
