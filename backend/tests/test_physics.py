"""
test_physics.py - Comprehensive Unit Tests for ASSURE-TWIN Physics Engine Core (WP1).
"""

import math
import pytest
from backend.app.physics import (
    FluidProperties,
    ThermalModel,
    ReservoirModel,
    TubingTemperatureModel,
    CompositeInflowModel,
    WellboreHydraulicsModel,
    TaperedRodStringModel,
    SRPKinematicsModel,
    RodViscousDragModel,
    RodFloatModel,
    ImpactLoadingModel,
    DynamometerModel,
    DownholePumpModel,
    ProductionModel,
    EconomicsModel
)

def test_fluid_viscosity_monotonic():
    fp = FluidProperties(mu_ref_cp=10000.0, t_ref_c=20.0, activation_energy_b=3800.0)
    v20 = fp.calculate_viscosity(20.0)
    v60 = fp.calculate_viscosity(60.0)
    v120 = fp.calculate_viscosity(120.0)
    v180 = fp.calculate_viscosity(180.0)

    assert v20 > v60 > v120 > v180, "Viscosity must decrease strictly monotonically with temperature"
    assert math.isclose(v20, 10000.0, rel_tol=0.01)

def test_thermal_model_growth_and_decay():
    tm = ThermalModel(ambient_temp_c=52.0, steam_temp_c=195.0)
    t_init = tm.near_well_temp_c
    r_init = tm.thermal_front_radius_m

    # Steam injection step
    t_inj, r_inj = tm.step(dt_days=2.0, steam_rate_t_d=45.0, is_injecting=True, is_cooling=False)
    assert t_inj > t_init, "Injection must increase near-well temperature"
    assert r_inj >= r_init, "Injection must expand thermal front radius"
    assert tm.thermal_reserve_gj > 0.0

    # Cooling step
    t_cool, r_cool = tm.step(dt_days=10.0, steam_rate_t_d=0.0, is_injecting=False, is_cooling=True, liquid_rate_m3_d=15.0)
    assert t_cool < t_inj, "Cooling must decrease near-well temperature"

def test_tubing_temperature_and_viscosity_profile():
    fp = FluidProperties(mu_ref_cp=10000.0, t_ref_c=20.0)
    ttm = TubingTemperatureModel(well_depth_m=1200.0, surface_temp_c=28.0)
    res = ttm.calculate_profiles(downhole_temp_c=75.0, production_rate_m3_d=12.0, fluid_model=fp)

    # Wellhead temp must be lower than downhole temp
    assert res["wellhead_temp_c"] < res["downhole_temp_c"]
    # Surface viscosity must be substantially higher than downhole viscosity
    surf_visc = res["viscosities_cp"][0]
    bot_visc = res["viscosities_cp"][-1]
    assert surf_visc > bot_visc, "Upper tubing oil is cooler and thus more viscous"

def test_composite_ipr_monotonicity():
    ipr = CompositeInflowModel()
    p_res = 25.0
    res_high_pwf = ipr.calculate_inflow(p_res_bar=p_res, p_wf_bar=20.0, r_heated_m=4.5, viscosity_heated_cp=120.0, viscosity_cold_cp=2500.0)
    res_low_pwf = ipr.calculate_inflow(p_res_bar=p_res, p_wf_bar=10.0, r_heated_m=4.5, viscosity_heated_cp=120.0, viscosity_cold_cp=2500.0)

    assert res_low_pwf["q_liquid_m3_d"] > res_high_pwf["q_liquid_m3_d"], "Lower Pwf (higher drawdown) must yield higher rate"
    assert res_low_pwf["drawdown_bar"] > res_high_pwf["drawdown_bar"]

def test_tapered_rod_string_and_drag():
    rod = TaperedRodStringModel()
    fp = FluidProperties()
    ttm = TubingTemperatureModel()
    profiles = ttm.calculate_profiles(downhole_temp_c=70.0, production_rate_m3_d=10.0, fluid_model=fp)

    drag_calc = RodViscousDragModel()
    drag_up = drag_calc.calculate_integrated_drag(profiles, rod, rod_velocity_m_s=0.5, is_upstroke=True)
    drag_down = drag_calc.calculate_integrated_drag(profiles, rod, rod_velocity_m_s=0.5, is_upstroke=False)

    assert drag_up["drag_force_kn"] > 0.0
    assert drag_down["drag_force_kn"] > 0.0

def test_rod_float_detection():
    rod = TaperedRodStringModel()
    float_model = RodFloatModel()
    bw = rod.calculate_buoyant_weight(920.0)
    w_buoyant_n = bw["buoyant_weight_kn"] * 1000.0

    # Low drag case -> SAFE
    safe_res = float_model.analyze_float(
        rod_string=rod,
        buoyant_weight_n=w_buoyant_n,
        total_weight_air_n=rod.total_weight_air_n,
        downstroke_drag_n=5000.0,
        downstroke_accel_factor=0.10
    )
    assert safe_res["status"] == "SAFE"
    assert safe_res["float_margin_pct"] > 50.0

    # Extreme high drag case -> FLOATING
    float_res = float_model.analyze_float(
        rod_string=rod,
        buoyant_weight_n=w_buoyant_n,
        total_weight_air_n=rod.total_weight_air_n,
        downstroke_drag_n=w_buoyant_n * 1.2, # Drag exceeds buoyant weight!
        downstroke_accel_factor=0.10
    )
    assert float_res["status"] == "FLOATING"
    assert float_res["float_margin_pct"] < 10.0

def test_dynamometer_synthesis():
    dyno = DynamometerModel(num_points=48)
    cards = dyno.generate_cards(
        stroke_inches=64.0,
        spm=3.2,
        buoyant_weight_kn=38.0,
        fluid_load_kn=22.0,
        upstroke_drag_kn=6.0,
        downstroke_drag_kn=7.0,
        upstroke_accel_factor=0.18,
        downstroke_accel_factor=-0.14,
        pump_fillage=0.90,
        rod_float_status="SAFE"
    )

    assert len(cards["surface_card"]) == 48
    assert len(cards["pump_card"]) == 48
    assert cards["pprl_kn"] > cards["mprl_kn"]
    assert cards["prhp_kw"] > 0.0

def test_pump_and_production_coupling():
    pump = DownholePumpModel()
    perf = pump.evaluate_performance(
        stroke_inches=64.0,
        spm=3.2,
        inflow_rate_m3_d=14.5,
        differential_pressure_bar=45.0,
        viscosity_cp=150.0
    )
    assert perf["theoretical_displacement_m3_d"] > 0.0
    assert 0.0 < perf["pump_fillage"] <= 1.0

    prod_model = ProductionModel()
    prod = prod_model.compute_production(
        inflow_rate_m3_d=14.5,
        pump_capacity_m3_d=perf["liquid_lifted_m3_d"],
        water_cut=0.15,
        dt_days=1.0
    )
    assert prod["liquid_rate_m3_d"] > 0.0
    assert math.isclose(prod["oil_rate_m3_d"] + prod["water_rate_m3_d"], prod["liquid_rate_m3_d"], rel_tol=1e-3)
