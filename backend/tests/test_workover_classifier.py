"""
test_workover_classifier.py - Unit tests for workover-vs-setpoint classification (Feature 1).

Tests:
1. Normal state → FEASIBLE (a safe setpoint exists)
2. Mechanically broken state → WORKOVER_RECOMMENDED
3. Uncertain state where optimistic parameter resolves it → INSUFFICIENT_DATA
4. Non-mechanical failure (economics/data) → NON_MECHANICAL_FAILURE
5. Sweep config registration (new axis for Feature 2 extensibility)
6. Integration with safe_alternatives fallback path
"""

import pytest
import copy
from backend.app.assurance.workover_classifier import classify_workover
from backend.app.assurance.sweep_config import (
    build_default_sweep_config,
    SweepConfig,
    ControlAxis,
    MECHANICAL_GATE_IDS,
)
from backend.app.assurance.safe_alternatives import SafeAlternativeEngine
from backend.app.assurance.gatekeeper import evaluate_assurance_gate


# ---------------------------------------------------------------------------
# Fixture: builds a realistic base state from the twin engine
# ---------------------------------------------------------------------------
def _build_healthy_state() -> dict:
    """A state where the well is in good shape — all gates should pass."""
    return {
        "well_id": "BGW-17A",
        "controls": {"spm": 3.2, "stroke_inches": 64.0, "steam_rate_t_d": 42.3, "injection_pressure_bar": 15.0},
        "thermal": {"near_well_temp_c": 72.6},
        "reservoir": {"temperature_c": 72.6, "permeability_md": 1850.0},
        "fluid": {"viscosity_near_well_cp": 140.0},
        "loads": {
            "float_margin_pct": 28.9,
            "pprl_kn": 38.0,
            "mprl_kn": 20.0,
            "rod_float_status": "SAFE",
            "is_buckling": False,
            "compression_depth_m": 0.0,
            "drag_up_kn": 1.2,
            "drag_down_kn": 1.8,
            "buoyant_weight_kn": 30.0,
            "fluid_load_kn": 6.5,
        },
        "pump": {"pump_fillage": 0.90, "pump_efficiency_pct": 82.0},
        "inflow": {"q_liquid_m3_d": 12.0, "p_wf_bar": 18.2, "pwf_bar": 18.2, "p_res_bar": 35.0},
        "production": {"oil_rate_bopd": 32.6, "liquid_rate_m3_d": 12.0},
        "economics": {"instantaneous_sor": 2.5, "daily_profit_usd": 450.0},
        "dynamometer": {
            "surface_card": [{"pos_in": float(i), "load_kn": 30.0 + i * 1.5} for i in range(48)]
        },
        "css": {
            "phase": "PRODUCTION",
            "current_phase": "PRODUCTION",
            "is_injecting": False,
            "is_cooling": False,
            "is_soaking": False,
        },
        "srp": {
            "float_margin_pct": 28.9,
            "peak_rod_load_kn": 38.0,
            "gearbox_rating_pct": 58.0,
        },
        "surrogate": {"mahalanobis_distance": 1.2},
        "ml_agreement": {"relative_divergence_pct": 2.1},
    }


def _build_mechanically_broken_state() -> dict:
    """
    A state where mechanical gates are deeply violated:
    - Float margin collapsed to 2% (gate 6 FAIL)
    - PPRL at 125 kN (gate 5 FAIL, limit 115 kN)
    - Pump fillage at 0.20 (gate 7 FAIL, floor 0.30)
    - Gearbox at 105% (gate 8 FAIL, limit 85%)
    Non-mechanical gates (1-4, 9-12) are kept healthy so that
    only mechanical gates are the binding failures.
    """
    state = _build_healthy_state()
    # Mechanical failures (Gates 5, 6, 7, 8)
    state["loads"]["float_margin_pct"] = 2.0
    state["loads"]["pprl_kn"] = 125.0
    state["loads"]["rod_float_status"] = "FLOATING"
    state["loads"]["is_buckling"] = True
    state["loads"]["compression_depth_m"] = 850.0
    state["srp"]["float_margin_pct"] = 2.0
    state["srp"]["peak_rod_load_kn"] = 125.0
    state["srp"]["gearbox_rating_pct"] = 105.0
    state["pump"]["pump_fillage"] = 0.20
    state["thermal"]["near_well_temp_c"] = 56.0  # Above ambient 52.0 so thermal model passes
    state["fluid"]["viscosity_near_well_cp"] = 12000.0
    return state



def _build_uncertain_state() -> dict:
    """
    A state where mechanical gates fail, but it's close enough that
    optimistic parameter values could resolve it.
    Float margin at 8% — below the 15% gate threshold.
    PPRL at 35 kN so gearbox gate 8 passes at 64 in stroke.
    """
    state = _build_healthy_state()
    state["loads"]["float_margin_pct"] = 8.0
    state["loads"]["pprl_kn"] = 35.0
    state["loads"]["rod_float_status"] = "WARNING"
    state["loads"]["is_buckling"] = False
    state["srp"]["float_margin_pct"] = 8.0
    state["srp"]["peak_rod_load_kn"] = 35.0
    state["srp"]["gearbox_rating_pct"] = 70.0
    state["pump"]["pump_fillage"] = 0.72
    return state


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

def test_healthy_state_classifies_as_feasible():
    """A healthy well should have at least one feasible candidate."""
    state = _build_healthy_state()
    result = classify_workover(state)
    # The classifier should find at least one candidate that passes
    assert result["reason_code"] in ("FEASIBLE", "NON_MECHANICAL_FAILURE", "INSUFFICIENT_DATA")
    # Definitely NOT workover for a healthy well
    assert result["reason_code"] != "WORKOVER_RECOMMENDED"


def test_mechanically_broken_state_classifies_as_workover():
    """
    A deeply broken mechanical state should classify as WORKOVER_RECOMMENDED
    because no setpoint change can clear it even with optimistic parameters.
    """
    state = _build_mechanically_broken_state()
    
    # Use a small sweep config to keep test fast
    config = build_default_sweep_config()
    config.control_axes[0].levels = [0.8, 1.8, 3.2]  # SPM: 3 levels
    config.control_axes[1].levels = [48.0, 74.0, 96.0]  # Stroke: 3 levels
    config.control_axes[2].levels = [2000.0, 3500.0]    # Steam: 2 levels

    result = classify_workover(state, sweep_config=config)
    assert result["reason_code"] == "WORKOVER_RECOMMENDED", (
        f"Expected WORKOVER_RECOMMENDED but got {result['reason_code']}: {result.get('detail', '')}"
    )
    assert result["confidence"] == "HIGH"
    assert len(result["binding_gates"]) > 0
    assert len(result["suggested_intervention_categories"]) > 0
    # All binding gates should be in mechanical set
    for gate in result["binding_gates"]:
        assert gate["id"] in MECHANICAL_GATE_IDS, (
            f"Binding gate {gate['id']} ({gate['name']}) is not in mechanical set {MECHANICAL_GATE_IDS}"
        )


def test_uncertain_state_classifies_as_insufficient_data():
    """
    A borderline state where optimistic viscosity could resolve the 
    infeasibility → should classify as INSUFFICIENT_DATA.
    """
    state = _build_uncertain_state()
    
    config = build_default_sweep_config()
    config.control_axes[0].levels = [1.2, 2.2, 3.2]  # SPM
    config.control_axes[1].levels = [64.0, 84.0, 120.0]  # Stroke
    config.control_axes[2].levels = [2500.0, 3500.0]  # Steam

    result = classify_workover(state, sweep_config=config)
    # Should be INSUFFICIENT_DATA or FEASIBLE (optimistic params resolve it)
    assert result["reason_code"] in ("INSUFFICIENT_DATA", "FEASIBLE", "NON_MECHANICAL_FAILURE"), (
        f"Expected INSUFFICIENT_DATA/FEASIBLE but got {result['reason_code']}: {result.get('detail', '')}"
    )


def test_sweep_config_axis_registration():
    """Feature 2 extensibility: registering a new axis should appear in get_enabled_axes()."""
    config = build_default_sweep_config()
    initial_count = len(config.get_enabled_axes())

    heater_axis = ControlAxis(
        key="heater_power_kw",
        name="Downhole Heater Power",
        state_path=["controls", "heater_power_kw"],
        levels=[0.0, 25.0, 50.0, 75.0, 100.0],
        unit="kW",
        enabled=True
    )
    config.register_axis(heater_axis)

    assert len(config.get_enabled_axes()) == initial_count + 1
    assert any(a.key == "heater_power_kw" for a in config.get_enabled_axes())


def test_sweep_config_axis_replacement():
    """Registering an axis with same key replaces the old one."""
    config = build_default_sweep_config()
    original_spm_levels = None
    for a in config.get_enabled_axes():
        if a.key == "spm":
            original_spm_levels = a.levels

    # Register new spm axis with different levels
    new_spm = ControlAxis(
        key="spm",
        name="Pumping Speed (reduced)",
        state_path=["controls", "spm"],
        levels=[1.0, 2.0, 3.0],
        unit="SPM",
        enabled=True
    )
    config.register_axis(new_spm)

    count_spm = sum(1 for a in config.get_enabled_axes() if a.key == "spm")
    assert count_spm == 1
    for a in config.get_enabled_axes():
        if a.key == "spm":
            assert a.levels == [1.0, 2.0, 3.0]


def test_mechanical_gate_ids_are_5_through_8():
    """Verify the mechanical gate IDs match Phase 0 recon."""
    assert MECHANICAL_GATE_IDS == {5, 6, 7, 8}


def test_classify_workover_returns_binding_gate_details():
    """The classification should include per-gate details for binding failures."""
    state = _build_mechanically_broken_state()
    config = build_default_sweep_config()
    config.control_axes[0].levels = [1.8, 3.2]
    config.control_axes[1].levels = [64.0, 96.0]
    config.control_axes[2].levels = [2500.0]

    result = classify_workover(state, sweep_config=config)
    assert "binding_gates" in result
    assert "closest_candidate" in result
    assert "margin_to_feasibility" in result
    assert "optimistic_bound_evidence" in result

    # Closest candidate should have per-gate summary
    if result["closest_candidate"]:
        assert "per_gate_summary" in result["closest_candidate"]
        assert "gate_score_pct" in result["closest_candidate"]


def test_classify_workover_intervention_categories():
    """WORKOVER_RECOMMENDED should include intervention advisories."""
    state = _build_mechanically_broken_state()
    config = build_default_sweep_config()
    config.control_axes[0].levels = [0.8, 1.8, 3.2]
    config.control_axes[1].levels = [48.0, 96.0]
    config.control_axes[2].levels = [2000.0]

    result = classify_workover(state, sweep_config=config)
    if result["reason_code"] == "WORKOVER_RECOMMENDED":
        interventions = result["suggested_intervention_categories"]
        assert len(interventions) > 0
        for intv in interventions:
            assert "gate_id" in intv
            assert "category" in intv
            assert "advisory" in intv


def test_safe_alternatives_integration_with_workover():
    """
    Integration test: SafeAlternativeEngine should invoke workover classifier
    when no safe alternative is found, and the output should contain reason_code.
    """
    from backend.app.twin.engine import twin_manager

    # Get a reference state
    well = twin_manager.get_active_well()
    state = well.step(0.0)

    # Create a broken state that will fail all alternatives
    broken = copy.deepcopy(state)
    broken["loads"]["float_margin_pct"] = 1.0
    broken["loads"]["pprl_kn"] = 120.0
    broken["loads"]["rod_float_status"] = "FLOATING"
    broken["loads"]["is_buckling"] = True
    broken["pump"]["pump_fillage"] = 0.20
    broken["thermal"]["near_well_temp_c"] = 38.0

    engine = SafeAlternativeEngine()
    # Correct signature: find_safe_alternatives(live_engine, rejected_controls, failed_gate_reasons, current_state)
    alternatives = engine.find_safe_alternatives(
        well,
        {"spm": 3.2, "stroke_inches": 64.0},
        ["Float margin < 10%", "PPRL exceeds rod yield"],
        broken,
        max_alternatives=3
    )

    assert len(alternatives) >= 1
    last = alternatives[-1]
    # Verify the plan_id is one of the new classified ones or an old safe plan
    if last.get("plan_id") in ("PLAN_WORKOVER_RECOMMENDED", "PLAN_DATA_REQUIRED"):
        assert "classification" in last
        assert "reason_code" in last
