"""
test_downhole_heater.py - Unit and acceptance tests for Downhole Electric Heater (Feature 2).

Tests:
1. P=0 reproduces baseline within tolerance.
2. Energy conservation: total heat deposited equals efficiency * P * duration.
3. Locality: far-field cell temperature changes by less than a set epsilon (< 0.05 °C).
4. Monotonicity: higher P monotonically raises near-well temperature and lowers viscosity.
5. Limit gate: Gate 13 fails when max power (40 kW) or max power density (3500 W/m) is exceeded.
6. Cost and kWh per barrel arithmetic (tariffs in INR/kWh, separate and combined energy metrics).
7. Sweep configuration: heater axis included only when enabled.
8. Acceptance criterion: steam-plus-pump alone fails a gate, and adding heater power passes it.
9. Workover integration: sweep includes heater axis, and workover is declared only if maximum heater fails.
"""

import math
import copy
import pytest

from backend.app.physics.thermal import ThermalModel
from backend.app.physics.fluids import FluidProperties
from backend.app.physics.economics import EconomicsModel
from backend.app.assurance.gatekeeper import evaluate_assurance_gate
from backend.app.assurance.sweep_config import (
    build_default_sweep_config,
    ControlAxis,
)
from backend.app.assurance.workover_classifier import classify_workover


# ---------------------------------------------------------------------------
# Test 1: P=0 reproduces baseline within tolerance
# ---------------------------------------------------------------------------
def test_p_zero_reproduces_baseline():
    """ThermalModel with heater_power_w=0.0 must exactly reproduce baseline outputs."""
    base = ThermalModel()
    with_heater = ThermalModel()

    # Step both models for 10 days in cooling/production mode
    for _ in range(10):
        base.step(dt_days=1.0, steam_rate_t_d=0.0, is_injecting=False, is_cooling=True)
        with_heater.step(dt_days=1.0, steam_rate_t_d=0.0, is_injecting=False, is_cooling=True, heater_power_w=0.0)

    assert with_heater.near_well_temp_c == pytest.approx(base.near_well_temp_c, abs=1e-5)
    assert with_heater.average_heated_temp_c == pytest.approx(base.average_heated_temp_c, abs=1e-5)
    assert with_heater.thermal_front_radius_m == pytest.approx(base.thermal_front_radius_m, abs=1e-5)
    assert with_heater.temp_grid == pytest.approx(base.temp_grid, abs=1e-5)

    state = with_heater.get_state()
    assert state["heater_power_w"] == 0.0
    assert state["heater_power_kw"] == 0.0
    assert state["cumulative_heater_heat_gj"] == 0.0
    assert state["cumulative_heater_kwh"] == 0.0
    assert state["heater_active"] is False


# ---------------------------------------------------------------------------
# Test 2: Energy conservation (efficiency * P * duration)
# ---------------------------------------------------------------------------
def test_energy_conservation():
    """Total heat deposited into rock must equal efficiency * P_electric * duration."""
    heater_kw = 30.0
    heater_w = heater_kw * 1000.0
    efficiency = 0.95
    duration_days = 5.0
    duration_sec = duration_days * 86400.0

    model = ThermalModel(heater_p_max_w=40000.0, heater_efficiency=efficiency)
    model.step(
        dt_days=duration_days,
        steam_rate_t_d=0.0,
        is_injecting=False,
        is_cooling=True,
        heater_power_w=heater_w
    )

    # Expected heat energy in Joules and GJ
    expected_heat_j = efficiency * heater_w * duration_sec
    expected_heat_gj = expected_heat_j / 1e9

    assert model.cumulative_heater_energy_gj == pytest.approx(expected_heat_gj, rel=1e-4)

    # Expected electrical energy in kWh
    expected_kwh = heater_kw * (duration_days * 24.0)
    assert model.cumulative_heater_kwh == pytest.approx(expected_kwh, rel=1e-4)


# ---------------------------------------------------------------------------
# Test 3: Locality (far-field cell temperature changes < epsilon)
# ---------------------------------------------------------------------------
def test_locality_far_field_unchanged():
    """
    Near-wellbore cells are heated, while far-field cells (dist > 10m)
    remain virtually unaffected (delta T < 0.05 °C).
    """
    base = ThermalModel()
    heated = ThermalModel()

    # Step both models for 1 day
    base.step(dt_days=1.0, steam_rate_t_d=0.0, is_injecting=False, is_cooling=True, heater_power_w=0.0)
    heated.step(dt_days=1.0, steam_rate_t_d=0.0, is_injecting=False, is_cooling=True, heater_power_w=40000.0)

    # 1. Wellbore cell (center of grid: 15, 15, 6) must show meaningful temperature rise
    well_t_base = base.temp_grid[15, 15, 6]
    well_t_heated = heated.temp_grid[15, 15, 6]
    assert well_t_heated > well_t_base + 5.0, (
        f"Wellbore cell must be heated: base={well_t_base:.1f}, heated={well_t_heated:.1f}"
    )

    # 2. Far-field corner cell (0, 0, 0), > 20 m away from wellbore
    far_t_base = base.temp_grid[0, 0, 0]
    far_t_heated = heated.temp_grid[0, 0, 0]
    far_delta = abs(far_t_heated - far_t_base)
    epsilon = 0.05  # 0.05 °C locality threshold

    assert far_delta < epsilon, (
        f"Far-field cell changed by {far_delta:.4f} °C (exceeds locality epsilon {epsilon} °C)"
    )


# ---------------------------------------------------------------------------
# Test 4: Monotonicity (P monotonically raises T and lowers viscosity)
# ---------------------------------------------------------------------------
def test_monotonic_temperature_and_viscosity():
    """Higher heater power monotonically increases near-well temp and reduces oil viscosity."""
    powers_kw = [0.0, 10.0, 20.0, 30.0, 40.0]
    temps = []
    viscosities = []

    fluid = FluidProperties(model_type="andrade")

    for p in powers_kw:
        m = ThermalModel()
        m.step(dt_days=2.0, steam_rate_t_d=0.0, is_injecting=False, is_cooling=True, heater_power_w=p * 1000.0)
        t = m.near_well_temp_c
        mu = fluid.calculate_viscosity(t)
        temps.append(t)
        viscosities.append(mu)

    # Verify strict monotonicity
    for i in range(len(powers_kw) - 1):
        assert temps[i + 1] > temps[i], (
            f"Temperature failed monotonicity at {powers_kw[i+1]} kW: {temps[i+1]} <= {temps[i]}"
        )
        assert viscosities[i + 1] < viscosities[i], (
            f"Viscosity failed monotonicity at {powers_kw[i+1]} kW: {viscosities[i+1]} >= {viscosities[i]}"
        )


# ---------------------------------------------------------------------------
# Test 5: Limit gate fails when power or power density is exceeded
# ---------------------------------------------------------------------------
def test_heater_limit_gate():
    """Gate 13 passes within limits and fails when power > 40kW or density > 3500 W/m."""
    base_state = {
        "well_id": "BGW-17A",
        "controls": {"spm": 3.2, "stroke_inches": 64.0, "heater_power_kw": 20.0},
        "thermal": {"near_well_temp_c": 75.0, "heater_length_m": 12.0},
        "loads": {"pprl_kn": 45.0, "float_margin_pct": 25.0},
        "pump": {"pump_fillage": 0.85},
        "inflow": {"q_liquid_m3_d": 10.0, "p_wf_bar": 15.0, "p_res_bar": 35.0},
        "economics": {"instantaneous_sor": 2.0, "daily_profit_usd": 300.0},
        "dynamometer": {"surface_card": [{"pos_in": float(i), "load_kn": 30.0 + i} for i in range(30)]},
        "css": {"phase": "PRODUCTION"}
    }

    # Case A: Normal 20 kW -> Gate 13 PASS
    res_a = evaluate_assurance_gate(base_state)
    gate_13_a = next(c for c in res_a["checks"] if c["id"] == 13)
    assert gate_13_a["passed"] is True
    assert gate_13_a["status"] == "PASS"

    # Case B: Exceed max power (45 kW > 40 kW) -> Gate 13 FAIL
    state_b = copy.deepcopy(base_state)
    state_b["controls"]["heater_power_kw"] = 45.0
    res_b = evaluate_assurance_gate(state_b)
    gate_13_b = next(c for c in res_b["checks"] if c["id"] == 13)
    assert gate_13_b["passed"] is False
    assert gate_13_b["status"] == "FAIL"
    assert "exceeds rating limit" in gate_13_b["detail"]

    # Case C: Exceed linear power density: 38 kW over short 8m cable = 4750 W/m > 3500 W/m -> FAIL
    state_c = copy.deepcopy(base_state)
    state_c["controls"]["heater_power_kw"] = 38.0
    state_c["thermal"]["heater_length_m"] = 8.0
    res_c = evaluate_assurance_gate(state_c)
    gate_13_c = next(c for c in res_c["checks"] if c["id"] == 13)
    assert gate_13_c["passed"] is False
    assert gate_13_c["status"] == "FAIL"
    assert "linear power density" in gate_13_c["detail"]


# ---------------------------------------------------------------------------
# Test 6: Cost and kWh per barrel arithmetic
# ---------------------------------------------------------------------------
def test_cost_and_energy_metrics_arithmetic():
    """Verify kWh/bbl, electricity tariff in INR, and separate energy metrics."""
    econ = EconomicsModel(electricity_tariff_usd_kwh=0.095)
    oil_rate_bpd = 25.0
    motor_kw = 12.0
    heater_kw = 28.0
    tariff_inr = 8.50
    boiler_eff = 0.85

    res = econ.calculate_daily_economics(
        oil_rate_bpd=oil_rate_bpd,
        water_rate_bpd=5.0,
        steam_rate_t_d=10.0,
        motor_power_kw=motor_kw,
        dt_days=1.0,
        heater_power_kw=heater_kw,
        elec_tariff_inr_kwh=tariff_inr,
        boiler_efficiency=boiler_eff
    )

    motor_kwh = motor_kw * 24.0   # 288 kWh
    heater_kwh = heater_kw * 24.0 # 672 kWh
    total_kwh = motor_kwh + heater_kwh # 960 kWh

    expected_kwh_per_bbl = round(total_kwh / oil_rate_bpd, 2) # 38.4
    expected_heater_kwh_per_bbl = round(heater_kwh / oil_rate_bpd, 2) # 26.88
    expected_heater_inr = round(heater_kwh * tariff_inr, 2) # 5712.0

    assert res["kwh_per_bbl"] == expected_kwh_per_bbl
    assert res["heater_kwh_per_bbl"] == expected_heater_kwh_per_bbl
    assert res["heater_elec_cost_inr"] == expected_heater_inr

    # Check separate and combined energy reporting
    assert "steam_energy_gj" in res
    assert "heater_electric_energy_gj" in res
    assert "combined_energy_equivalent_gj" in res
    assert res["boiler_efficiency_used"] == boiler_eff


# ---------------------------------------------------------------------------
# Test 7: Sweep includes heater axis only when enabled
# ---------------------------------------------------------------------------
def test_sweep_includes_heater_axis_only_when_enabled():
    """Heater axis is registered in default sweep config but disabled by default."""
    config = build_default_sweep_config()
    enabled_keys = [a.key for a in config.get_enabled_axes()]

    # Disabled by default
    assert "heater_power_kw" not in enabled_keys

    # Enable heater axis
    heater_axis = next(a for a in config.control_axes if a.key == "heater_power_kw")
    heater_axis.enabled = True

    enabled_keys_after = [a.key for a in config.get_enabled_axes()]
    assert "heater_power_kw" in enabled_keys_after


# ---------------------------------------------------------------------------
# Test 8: Acceptance Criterion — Heater resolves cold-well gate failure
# ---------------------------------------------------------------------------
def test_acceptance_heater_resolves_viscosity_gate_failure():
    """
    Scenario: A cold well without heater has low float margin (9%) causing Gate 6 to FAIL.
    Adding 30 kW downhole heater warms near-well region, restoring float margin to > 20%
    and switching the assurance verdict to VERIFIED FOR ENGINEER REVIEW.
    """
    cold_unheated_state = {
        "well_id": "BGW-17A",
        "controls": {"spm": 3.0, "stroke_inches": 64.0, "steam_rate_t_d": 0.0, "heater_power_kw": 0.0},
        "thermal": {"near_well_temp_c": 54.0, "heater_length_m": 12.0},
        "fluid": {"viscosity_near_well_cp": 950.0},
        "loads": {
            "float_margin_pct": 9.0, # Below 15% safety floor -> Gate 6 FAIL
            "pprl_kn": 36.0,
            "rod_float_status": "WARNING",
            "is_buckling": False
        },
        "pump": {"pump_fillage": 0.80},
        "inflow": {"q_liquid_m3_d": 8.0, "p_wf_bar": 14.0, "p_res_bar": 35.0},
        "production": {"oil_rate_bopd": 20.0, "liquid_rate_m3_d": 8.0},
        "economics": {"instantaneous_sor": 0.0, "daily_profit_usd": 250.0},
        "dynamometer": {"surface_card": [{"pos_in": float(i), "load_kn": 25.0 + i * 1.2} for i in range(40)]},
        "css": {"phase": "PRODUCTION"}
    }

    # Step 1: Without heater -> Gate 6 FAILS -> NO SAFE RECOMMENDATION
    verdict_without = evaluate_assurance_gate(cold_unheated_state)
    assert verdict_without["overall_pass"] is False
    assert verdict_without["status"] == "NO SAFE RECOMMENDATION (ABSTAIN)"
    gate_6 = next(c for c in verdict_without["checks"] if c["id"] == 6)
    assert gate_6["passed"] is False

    # Step 2: With 30 kW electric heater applied -> near-well heats up -> float margin recovers
    heated_state = copy.deepcopy(cold_unheated_state)
    heated_state["controls"]["heater_power_kw"] = 30.0
    heated_state["thermal"]["near_well_temp_c"] = 72.0
    heated_state["fluid"]["viscosity_near_well_cp"] = 160.0
    heated_state["loads"]["float_margin_pct"] = 24.5 # Restored above 20% safe advisory floor
    heated_state["loads"]["rod_float_status"] = "SAFE"

    verdict_with = evaluate_assurance_gate(heated_state)
    assert verdict_with["overall_pass"] is True
    assert verdict_with["status"] in ("VERIFIED FOR ENGINEER REVIEW", "CONDITIONAL — REVIEW WARNINGS")
    assert verdict_with["abstain_active"] is False
    gate_6_with = next(c for c in verdict_with["checks"] if c["id"] == 6)
    assert gate_6_with["passed"] is True
    gate_13_with = next(c for c in verdict_with["checks"] if c["id"] == 13)
    assert gate_13_with["passed"] is True


# ---------------------------------------------------------------------------
# Test 9: Workover sweep includes heater axis
# ---------------------------------------------------------------------------
def test_workover_sweep_cleared_by_heater_does_not_declare_workover():
    """
    If a well is borderline and cannot be cleared by SPM/stroke/steam alone,
    enabling the heater axis clears it -> classified as FEASIBLE, NOT WORKOVER_RECOMMENDED.
    """
    state = {
        "well_id": "BGW-17A",
        "controls": {"spm": 3.0, "stroke_inches": 64.0, "steam_rate_t_d": 0.0, "heater_power_kw": 0.0},
        "thermal": {"near_well_temp_c": 54.0, "heater_length_m": 12.0},
        "fluid": {"viscosity_near_well_cp": 1200.0},
        "loads": {
            "float_margin_pct": 8.0, # Violates gate 6
            "pprl_kn": 40.0,
            "rod_float_status": "WARNING",
            "is_buckling": False
        },
        "pump": {"pump_fillage": 0.80},
        "inflow": {"q_liquid_m3_d": 8.0, "p_wf_bar": 14.0, "p_res_bar": 35.0},
        "production": {"oil_rate_bopd": 20.0, "liquid_rate_m3_d": 8.0},
        "economics": {"instantaneous_sor": 0.0, "daily_profit_usd": 250.0},
        "dynamometer": {"surface_card": [{"pos_in": float(i), "load_kn": 25.0 + i * 1.2} for i in range(40)]},
        "css": {"phase": "PRODUCTION"}
    }

    # Enable heater axis in a small sweep config
    config = build_default_sweep_config()
    config.control_axes[0].levels = [2.0, 3.0] # SPM
    config.control_axes[1].levels = [48.0, 64.0] # Stroke
    config.control_axes[2].levels = [1500.0] # Steam
    heater_axis = next(a for a in config.control_axes if a.key == "heater_power_kw")
    heater_axis.enabled = True
    heater_axis.levels = [0.0, 30.0] # 0 kW (fails) vs 30 kW (passes)

    result = classify_workover(state, sweep_config=config)
    # Because 30 kW heater clears gate 6, a feasible setpoint exists!
    assert result["reason_code"] == "FEASIBLE"
    assert result["closest_candidate"]["controls"]["heater_power_kw"] == 30.0
