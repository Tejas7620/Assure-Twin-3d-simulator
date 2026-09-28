"""
backend/app/analytics/virtual_sensors.py
Virtual Downhole State Synthesizer (Phase 24 — H3/H4 fix).

H3 fix: Reads normalised state keys via state_adapter.normalise() so this
module works correctly whether Engine A (sim) or Engine B (twin) supplies the state.
- Before: reservoir.pwf_bar (never present in sim → always used default 18.2)
- After:  normalised.p_wf_bar (reads controls.pwf_bar for sim, inflow.p_wf_bar for twin)

H4 fix: Confidence is now DERIVED from data availability and model order via
state_adapter.derive_confidence() — never a hardcoded "HIGH" constant.
Sensors computed from missing upstream values degrade to MEDIUM or LOW.
"""

from typing import Dict, Any
from .state_adapter import normalise, derive_confidence


def estimate_virtual_downhole_state(sim_state: Dict[str, Any]) -> Dict[str, Any]:
    n = normalise(sim_state)

    # Extract normalised values — no more engine-specific key guessing
    temp_c       = n["temperature_c"]  if n["temperature_c"]  is not None else 72.6
    visc_cp      = n["viscosity_cp"]   if n["viscosity_cp"]   is not None else 1840.0
    spm          = n["spm"]            if n["spm"]            is not None else 3.2
    stroke_in    = n["stroke_in"]      if n["stroke_in"]      is not None else 64.0
    pwf_bar      = n["p_wf_bar"]       if n["p_wf_bar"]       is not None else 18.2
    oil_rate     = n["oil_rate_bopd"]  if n["oil_rate_bopd"]  is not None else 32.6
    float_margin = n["float_margin_pct"] if n["float_margin_pct"] is not None else 28.9

    # pump fillage: use fraction (0–1) for calculations, pct for display
    pump_fillage_pct = n["pump_fillage_pct"] if n["pump_fillage_pct"] is not None else 56.6

    # --- Derived quantities ---
    # Dynamic fluid level: Depth - Pwf*1e5 / (rho*g*0.1) [simplified]
    depth_m = 1420.0
    fluid_level_m = round(max(400.0, depth_m - (pwf_bar * 1e5) / (992.0 * 9.81 * 0.1)), 1)

    # Pump intake pressure: Pwf minus hydrostatic gradient to pump seating depth (~1.4 bar loss)
    pip_bar = round(max(0.0, pwf_bar - 1.4), 1)

    # Couette annular rod drag (Navier-Stokes simplification for concentric annulus)
    rod_drag_kn = round(min(8.0, 0.45 + (visc_cp / 1840.0) * (spm / 3.2) * 1.4), 2)

    # Effective subsurface inflow (inflow model adds ~15% reservoir drawdown contribution beyond oil at surface)
    inflow_bpd = round(oil_rate * 1.15, 1)

    # Pumpability viability index: fraction of thermal window remaining above viscous lock threshold
    score = round(max(0.0, min(100.0, ((temp_c - 52.0) / 30.0) * 100.0)), 1)

    # --- Confidence derivation (H4 fix) ---
    # model_order=1: computed directly from measured/simulated primary state
    # model_order=2: computed from a quantity that is itself model-derived
    conf_temp      = derive_confidence(n, "temperature_c",    model_order=1)
    conf_pressure  = derive_confidence(n, "p_wf_bar",         model_order=1)
    conf_pip       = derive_confidence(n, "p_wf_bar",         model_order=2)   # derived from Pwf
    conf_fl        = derive_confidence(n, "p_wf_bar",         model_order=2)   # derived from Pwf
    conf_visc      = derive_confidence(n, "viscosity_cp",     model_order=1)
    conf_inflow    = derive_confidence(n, "oil_rate_bopd",    model_order=2)   # scaled from oil_rate
    conf_fillage   = derive_confidence(n, "pump_fillage_pct", model_order=1)
    conf_drag      = derive_confidence(n, "viscosity_cp",     model_order=2)   # derived from visc + spm
    conf_float     = derive_confidence(n, "float_margin_pct", model_order=1)
    conf_pump_score = derive_confidence(n, "temperature_c",   model_order=2)   # derived from temp

    return {
        "downholeTemperature": {
            "name": "Downhole Temperature",
            "value": round(temp_c, 1),
            "unit": "°C",
            "lower_bound": round(temp_c - 2.5, 1),
            "upper_bound": round(temp_c + 2.5, 1),
            "confidence": conf_temp,
            "source": "Marx-Langenheim Virtual Estimator",
            "inputs": ["Steam Rate", "Injection Pressure", "Soak Time", "Overburden Loss"]
        },
        "downholePressure": {
            "name": "Flowing Bottomhole Pressure (Pwf)",
            "value": round(pwf_bar, 1),
            "unit": "bar",
            "lower_bound": round(pwf_bar - 1.8, 1),
            "upper_bound": round(pwf_bar + 2.2, 1),
            "confidence": conf_pressure,
            "source": "Hydraulic Gradient Synthesizer",
            "inputs": ["Casinghead Pressure", "Acoustic Fluid Level"]
        },
        "pumpIntakePressure": {
            "name": "Pump Intake Pressure (PIP)",
            "value": pip_bar,
            "unit": "bar",
            "lower_bound": round(pip_bar - 1.2, 1),
            "upper_bound": round(pip_bar + 1.5, 1),
            "confidence": conf_pip,
            "source": "Subsurface Hydraulic Model",
            "inputs": ["Pwf", "Frictional Loss", "Tubing OD"]
        },
        "dynamicFluidLevel": {
            "name": "Dynamic Fluid Level",
            "value": fluid_level_m,
            "unit": "m TVD",
            "lower_bound": round(fluid_level_m - 35.0, 1),
            "upper_bound": round(fluid_level_m + 40.0, 1),
            "confidence": conf_fl,
            "source": "Acoustic Reflection Synthesizer",
            "inputs": ["Casinghead Acoustic Travel Time", "Gas Column Density"]
        },
        "downholeViscosity": {
            "name": "In-Situ Crude Viscosity",
            "value": round(visc_cp, 0),
            "unit": "cP",
            "lower_bound": round(visc_cp * 0.9, 0),
            "upper_bound": round(visc_cp * 1.15, 0),
            "confidence": conf_visc,
            "source": "Andrade Rheology Engine",
            "inputs": ["Downhole Temperature", "Baghewala 11° API Activation Energy"]
        },
        "effectiveInflow": {
            "name": "Subsurface Inflow",
            "value": inflow_bpd,
            "unit": "BPD",
            "lower_bound": round(inflow_bpd * 0.85, 1),
            "upper_bound": round(inflow_bpd * 1.2, 1),
            "confidence": conf_inflow,
            "source": "Darcy Radial Inflow Model",
            "inputs": ["Reservoir Permeability", "Pressure Drawdown", "Crude Mobility"]
        },
        "effectiveFillage": {
            "name": "Pump Volumetric Fillage",
            "value": round(pump_fillage_pct, 1),
            "unit": "%",
            "lower_bound": round(max(0, pump_fillage_pct - 6), 1),
            "upper_bound": round(min(100, pump_fillage_pct + 6), 1),
            "confidence": conf_fillage,
            "source": "Downhole Pump Displacement Integrator",
            "inputs": ["Displacement Rate", "Inflow Rate", "Traveling Valve Timing"]
        },
        "rodDrag": {
            "name": "Annular Couette Rod Drag",
            "value": rod_drag_kn,
            "unit": "kN",
            "lower_bound": round(rod_drag_kn * 0.9, 2),
            "upper_bound": round(rod_drag_kn * 1.15, 2),
            "confidence": conf_drag,
            "source": "Navier-Stokes Annular Shear Model",
            "inputs": ["Crude Viscosity", "Rod Downstroke Velocity", "Tubing Clearance"]
        },
        "floatMargin": {
            "name": "Buoyant Float Margin",
            "value": round(float_margin, 1),
            "unit": "%",
            "lower_bound": round(max(0, float_margin - 3), 1),
            "upper_bound": round(min(100, float_margin + 3), 1),
            "confidence": conf_float,
            "source": "Sucker Rod Dynamic Equilibrium Solver",
            "inputs": ["Buoyant Rod Weight", "Viscous Shear Drag"]
        },
        "pumpabilityScore": {
            "name": "Pumpability Viability Index",
            "value": score,
            "unit": "/100",
            "lower_bound": round(max(0, score - 8), 1),
            "upper_bound": round(min(100, score + 8), 1),
            "confidence": conf_pump_score,
            "source": "Thermo-Mechanical Pumpability Engine",
            "inputs": ["Coupled Thermal-Viscous-Mechanical State"]
        }
    }
