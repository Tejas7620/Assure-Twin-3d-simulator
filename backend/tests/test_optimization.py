"""
test_optimization.py - Unit Tests for Optimization and Control Package (WP3).
"""

import pytest
from backend.app.optimization import (
    CSSOptimizer,
    SRPPhysicsController,
    VFDStrokeShaper,
    InflowLimitedGovernor,
    JointOptimizer
)

def test_css_optimizer():
    opt = CSSOptimizer()
    res = opt.optimize()
    assert res["success"] is True
    assert "optimal_parameters" in res
    params = res["optimal_parameters"]
    assert 1000.0 <= params["steam_volume_t"] <= 4500.0
    assert 25.0 <= params["steam_rate_t_d"] <= 75.0
    assert res["performance"]["net_profit_usd"] > 0.0

def test_srp_controller_float_hazard():
    ctrl = SRPPhysicsController()
    # Test low float margin condition (FM = 8%)
    res = ctrl.evaluate_setpoint(
        current_spm=3.8,
        current_stroke_in=64.0,
        current_float_margin_pct=8.0,
        current_fillage=0.90,
        current_pprl_kn=52.0,
        current_viscosity_cp=1500.0
    )
    assert res["status"] == "RESTRICTED"
    assert res["recommended_spm"] < 3.8
    assert res["is_action_required"] is True

def test_srp_controller_overpumped():
    ctrl = SRPPhysicsController()
    # Test low pump fillage (fluid pound)
    res = ctrl.evaluate_setpoint(
        current_spm=4.5,
        current_stroke_in=64.0,
        current_float_margin_pct=30.0,
        current_fillage=0.62, # Low fillage!
        current_pprl_kn=48.0,
        current_viscosity_cp=80.0
    )
    assert res["status"] == "OVERPUMPED"
    assert res["recommended_spm"] < 4.5

def test_vfd_stroke_shaping():
    shaper = VFDStrokeShaper()
    # In cold heavy oil with low margin, downstroke fraction should expand
    profile = shaper.calculate_shaping_profile(
        target_spm=3.2,
        stroke_inches=64.0,
        viscosity_cp=3500.0,
        float_margin_pct=10.0
    )
    assert profile["downstroke_fraction"] > 0.50
    assert profile["upstroke_fraction"] < 0.50
    assert profile["downstroke_time_s"] > profile["upstroke_time_s"]

def test_inflow_limited_governor():
    gov = InflowLimitedGovernor()
    res = gov.analyze_well(
        current_spm=4.2,
        stroke_inches=64.0,
        inflow_rate_m3_d=8.0,
        theoretical_displacement_m3_d=18.0, # Pumping more than double the inflow!
        pump_fillage=0.45,
        p_wf_bar=8.0,
        p_res_bar=24.0
    )
    assert res["is_inflow_limited"] is True
    assert res["recommended_spm"] < 4.2

def test_joint_co_optimizer():
    optimizer = JointOptimizer()
    state = {
        "controls": {"spm": 3.2, "stroke_inches": 64.0},
        "loads": {"float_margin_pct": 22.0, "pprl_kn": 50.0},
        "pump": {"pump_fillage": 0.88},
        "fluid": {"viscosity_near_well_cp": 140.0}
    }
    joint_res = optimizer.run_co_optimization(state)
    assert "recommended_css" in joint_res
    assert "recommended_srp" in joint_res
    assert "scenarios_matrix" in joint_res
    assert len(joint_res["scenarios_matrix"]) == 4
