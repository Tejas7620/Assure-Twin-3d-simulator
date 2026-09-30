"""
test_herschel_bulkley.py - Comprehensive Unit and Integration Tests for Feature 3.
Covers:
1. Newtonian backward-compatibility (Andrade / Walther / Beggs-Robinson unmodified when shear_rate is None).
2. Yield stress tau_y(T) monotonic temperature decay and strict vanishing above T_gel (45°C).
3. Shear thinning: mu_app decreases monotonically with shear rate gamma_dot (n=0.75).
4. Regularised Papanastasiou behaviour: finite, well-behaved viscosity at gamma_dot = 0 (no ZeroDivisionError or NaN).
5. Thermal thinning of consistency index K(T).
6. Annular shear rate coupling in RodViscousDragModel.
7. Cold-start Breakout Force vs Buoyant Weight calculation (is_breakout_locked).
8. Warm state breakout release when T > T_gel.
9. Gatekeeper Checkpoint 6 failure on breakout lock with safe SPM=0 recommendation.
10. SRPPhysicsController gel lock advisory enforcement (recommended_spm = 0.0).
11. Provenance compliance: SYNTHETIC / ASSUMPTION labels.
"""

import pytest
import math
from backend.app.physics.fluids import FluidProperties
from backend.app.physics.rod_string import TaperedRodStringModel
from backend.app.physics.drag import RodViscousDragModel
from backend.app.assurance.gatekeeper import evaluate_assurance_gate
from backend.app.optimization.srp_controller import SRPPhysicsController
from backend.app.twin.parameters import ParameterRegistry


def test_newtonian_compatibility_and_defaults():
    """Default FluidProperties must preserve exact Newtonian behavior."""
    fluid_default = FluidProperties()
    assert fluid_default.model_type == "andrade"
    
    # calculate_viscosity without shear_rate
    v1 = fluid_default.calculate_viscosity(54.0)
    # calculate_viscosity with explicit None
    v2 = fluid_default.calculate_viscosity(54.0, shear_rate=None)
    assert v1 == v2
    assert 500.0 < v1 < 4000.0  # Typical Baghewala viscosity at 54°C


def test_herschel_bulkley_yield_stress_temperature_decay():
    """tau_y(T) must be positive at cold temp, decrease monotonically, and reach 0.0 at T >= T_gel."""
    fluid = FluidProperties(
        model_type="herschel_bulkley",
        hb_yield_stress_ref_pa=20.0,
        hb_t_gel_c=45.0,
        t_ref_c=20.0
    )
    
    # At reference temp (20°C)
    tau_20 = fluid.calculate_yield_stress(20.0)
    assert abs(tau_20 - 20.0) < 1e-3
    
    # At intermediate temp (30°C and 40°C)
    tau_30 = fluid.calculate_yield_stress(30.0)
    tau_40 = fluid.calculate_yield_stress(40.0)
    assert tau_20 > tau_30 > tau_40 > 0.0
    
    # At and above gel temperature (45°C, 50°C, 80°C)
    assert fluid.calculate_yield_stress(45.0) == 0.0
    assert fluid.calculate_yield_stress(50.0) == 0.0
    assert fluid.calculate_yield_stress(80.0) == 0.0


def test_herschel_bulkley_shear_thinning():
    """For n < 1.0, apparent viscosity must decrease monotonically as shear rate increases."""
    fluid = FluidProperties(
        model_type="herschel_bulkley",
        hb_yield_stress_ref_pa=15.0,
        hb_t_gel_c=45.0,
        hb_k_ref_pa_sn=10.0,
        hb_n_flow_index=0.75,
        t_ref_c=20.0
    )
    
    # Compare apparent viscosity at 25°C across increasing shear rates
    mu_1 = fluid.calculate_apparent_viscosity(25.0, shear_rate=1.0)
    mu_10 = fluid.calculate_apparent_viscosity(25.0, shear_rate=10.0)
    mu_50 = fluid.calculate_apparent_viscosity(25.0, shear_rate=50.0)
    mu_200 = fluid.calculate_apparent_viscosity(25.0, shear_rate=200.0)
    
    assert mu_1 > mu_10 > mu_50 > mu_200
    # calculate_viscosity with shear_rate should match calculate_apparent_viscosity
    assert fluid.calculate_viscosity(25.0, shear_rate=10.0) == mu_10


def test_herschel_bulkley_papanastasiou_regularization():
    """At zero shear rate, Papanastasiou regularisation prevents division by zero and returns finite value."""
    fluid = FluidProperties(
        model_type="herschel_bulkley",
        hb_yield_stress_ref_pa=18.0,
        hb_papanastasiou_m=100.0
    )
    
    # Call at gamma_dot = 0.0
    mu_zero = fluid.calculate_apparent_viscosity(20.0, shear_rate=0.0)
    assert not math.isnan(mu_zero)
    assert not math.isinf(mu_zero)
    assert mu_zero > 0.0
    
    # Very small shear rate
    mu_tiny = fluid.calculate_apparent_viscosity(20.0, shear_rate=1e-8)
    assert abs(mu_tiny - mu_zero) / mu_zero < 0.05


def test_herschel_bulkley_consistency_index_thermal_thinning():
    """Consistency index K(T) must decrease monotonically with temperature."""
    fluid = FluidProperties(model_type="herschel_bulkley", hb_k_ref_pa_sn=12.0)
    k_20 = fluid.calculate_consistency_index(20.0)
    k_40 = fluid.calculate_consistency_index(40.0)
    k_60 = fluid.calculate_consistency_index(60.0)
    assert k_20 > k_40 > k_60 > 0.0


def test_rod_drag_shear_rate_coupling():
    """RodViscousDragModel integrates drag coupling to local annular shear rate."""
    drag_model = RodViscousDragModel(tubing_id_in=2.441)
    rod_string = TaperedRodStringModel(total_depth_m=1200.0)
    
    tubing_profiles = {
        "depths_m": [0.0, 300.0, 600.0, 900.0, 1200.0],
        "temperatures_c": [30.0, 35.0, 40.0, 45.0, 50.0],
        "viscosities_cp": [3000.0, 2000.0, 1500.0, 1000.0, 800.0]
    }
    
    # Newtonian baseline (without fluid_model)
    res_base = drag_model.calculate_integrated_drag(
        tubing_profiles=tubing_profiles,
        rod_string=rod_string,
        rod_velocity_m_s=0.35,
        is_upstroke=False
    )
    assert res_base["drag_force_kn"] > 0.0
    
    # With Herschel-Bulkley fluid_model
    fluid_hb = FluidProperties(
        model_type="herschel_bulkley",
        hb_yield_stress_ref_pa=18.0,
        hb_t_gel_c=45.0
    )
    res_hb = drag_model.calculate_integrated_drag(
        tubing_profiles=tubing_profiles,
        rod_string=rod_string,
        rod_velocity_m_s=0.35,
        is_upstroke=False,
        fluid_model=fluid_hb
    )
    assert res_hb["drag_force_kn"] > 0.0
    assert "drag_force_n" in res_hb


def test_breakout_force_cold_start_locked_vs_warm_unlocked():
    """At cold start (T < T_gel), static yield stress exceeds buoyant rod weight -> locked.
    When warmed (T >= T_gel), breakout force vanishes -> unlocked."""
    drag_model = RodViscousDragModel(tubing_id_in=2.441)
    rod_string = TaperedRodStringModel(total_depth_m=1200.0)
    
    fluid_hb = FluidProperties(
        model_type="herschel_bulkley",
        hb_yield_stress_ref_pa=450.0,  # Cold static gel yield stress in shut-in well
        hb_t_gel_c=45.0,
        t_ref_c=20.0
    )
    
    # 1. Cold start profile: uniform 20°C (well shut in, unheated)
    cold_profiles = {
        "depths_m": [0.0, 300.0, 600.0, 900.0, 1200.0],
        "temperatures_c": [20.0, 20.0, 20.0, 20.0, 20.0],
        "viscosities_cp": [10000.0] * 5
    }
    cold_bo = drag_model.calculate_breakout_force(
        tubing_profiles=cold_profiles,
        rod_string=rod_string,
        fluid_model=fluid_hb
    )
    
    assert cold_bo["breakout_force_n"] > 0.0
    assert cold_bo["buoyant_weight_n"] > 0.0
    # With 450 Pa static gel yield stress along 1200m rod string, F_breakout ≈ 34 kN > W_buoyant (27.8 kN)
    assert cold_bo["is_breakout_locked"] is True
    assert cold_bo["safe_spm_override"] == 0.0
    
    # 2. Warm profile: uniform 60°C (after steam soak or downhole heater active)
    warm_profiles = {
        "depths_m": [0.0, 300.0, 600.0, 900.0, 1200.0],
        "temperatures_c": [60.0, 60.0, 60.0, 60.0, 60.0],
        "viscosities_cp": [400.0] * 5
    }
    warm_bo = drag_model.calculate_breakout_force(
        tubing_profiles=warm_profiles,
        rod_string=rod_string,
        fluid_model=fluid_hb
    )
    assert warm_bo["breakout_force_n"] == 0.0
    assert warm_bo["is_breakout_locked"] is False
    assert warm_bo["safe_spm_override"] is None


def test_gatekeeper_checkpoint_6_breakout_lock():
    """Checkpoint 6 in Gatekeeper fails when breakout is locked."""
    sim_state = {
        "loads": {
            "pprl_kn": 42.0,
            "float_margin_pct": 22.0,
            "is_buckling": False,
            "breakout": {
                "is_breakout_locked": True,
                "breakout_force_kn": 34.5,
                "buoyant_weight_kn": 28.0
            }
        },
        "thermal": {"near_well_temp_c": 54.0},
        "inflow": {"p_wf_bar": 20.0, "p_res_bar": 24.5, "q_liquid_m3_d": 12.0},
        "pump": {"pump_fillage": 0.85},
        "economics": {"instantaneous_sor": 4.5, "daily_profit_usd": 150.0},
        "css": {"phase": "PRODUCTION"},
        "controls": {"spm": 3.2, "stroke_inches": 64.0}
    }
    
    res = evaluate_assurance_gate(sim_state)
    gate_6 = next(c for c in res["checks"] if c["id"] == 6)
    assert gate_6["passed"] is False
    assert gate_6["status"] == "FAIL"
    assert "breakout force" in gate_6["detail"].lower()
    assert "safe spm = 0" in gate_6["detail"].lower()


def test_srp_controller_breakout_locked_spm_zero():
    """SRP controller recommends SPM = 0 when breakout_locked is True."""
    controller = SRPPhysicsController()
    result = controller.evaluate_setpoint(
        current_spm=3.2,
        current_stroke_in=64.0,
        current_float_margin_pct=25.0,
        current_fillage=0.88,
        current_pprl_kn=45.0,
        current_viscosity_cp=1200.0,
        breakout_locked=True
    )
    assert result["recommended_spm"] == 0.0
    assert result["status"] == "GEL_LOCKED_SHUTIN"
    assert result["is_gel_locked"] is True
    assert any("SAFE SPM = 0" in action for action in result["actions"])


def test_provenance_marking():
    """Ensure Herschel-Bulkley parameters and dict representation carry SYNTHETIC / ASSUMPTION labels."""
    fluid = FluidProperties(model_type="herschel_bulkley")
    d = fluid.to_dict()
    assert d["provenance_hb"] == "SYNTHETIC / ASSUMPTION"
    assert "hb_yield_stress_ref_pa" in d
    assert "hb_t_gel_c" in d

    registry = ParameterRegistry()
    param = registry.get_parameter("hb_yield_stress_ref_pa")
    assert param is not None
    assert "SYNTHETIC" in param.description
