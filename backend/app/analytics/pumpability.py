"""
backend/app/analytics/pumpability.py
Pumpability Window and Thermal Reserve Decay Calculator (Phase 24 — H3 fix).

H3 fix: Reads float_margin_pct via state_adapter.normalise() so it correctly
reads srp.float_margin_pct (sim) or loads.float_margin_pct (twin).
Previously read srp.float_margin_pct with a default of 28.9 — this silently
passed through the default whenever the sim engine state lacked that key.

The pumpability model physics are unchanged:
- Critical threshold: 58.2°C (viscosity exceeds mechanical rod fall velocity)
- Calibrated Baghewala cooling rate: 0.34 °C/day
- SPM-adjusted effective cooling with rod drag feedback
"""

from typing import Dict, Any
from .state_adapter import normalise


def compute_pumpability_window(sim_state: Dict[str, Any]) -> Dict[str, Any]:
    n = normalise(sim_state)

    temp_c       = n["temperature_c"]    if n["temperature_c"]    is not None else 72.6
    spm          = n["spm"]              if n["spm"]              is not None else 3.2
    float_margin = n["float_margin_pct"] if n["float_margin_pct"] is not None else 28.9

    # Note whether float margin came from a real source or the default
    float_margin_source = (
        "twin.loads.float_margin_pct" if n.get("_engine") == "twin"
        else ("sim.srp.float_margin_pct" if n["float_margin_pct"] is not None else "default-28.9%")
    )

    # Critical threshold for Baghewala heavy oil: ~58.2°C (viscosity > 8,200 cP)
    T_crit = 58.2
    # Calibrated daily cooling rate: 0.34 °C/day (Marx-Langenheim + Baghewala field data)
    daily_cooling_rate = 0.34

    # SPM penalty: higher SPM increases viscous shear heating slightly, but squeezes rod-float margin
    # Net effect: slightly faster effective cooling as SPM increases (float margin becomes limiting sooner)
    spm_penalty_factor = max(0.8, 1.0 + (spm - 3.0) * 0.12)
    effective_cooling = daily_cooling_rate * spm_penalty_factor

    delta_T = max(0.0, temp_c - T_crit)
    days_thermal = round(delta_T / max(0.001, effective_cooling), 1)

    # Mechanical constraint: if float margin is low, this is the binding constraint
    # Rod float < 10% → mechanical limit; < 20% → marginal
    if float_margin < 10.0:
        days_mechanical = 0.0
        mech_binding = True
    elif float_margin < 20.0:
        # Linear interpolation: 10% margin → 0 days, 30% margin → 15 days headroom
        days_mechanical = ((float_margin - 10.0) / 20.0) * 15.0
        mech_binding = True
    else:
        days_mechanical = 999.0  # Mechanical not binding
        mech_binding = False

    # Binding constraint is the minimum of thermal and mechanical
    days_to_boundary = round(min(days_thermal, days_mechanical), 1)

    # State classification
    if days_to_boundary > 25.0 and float_margin > 20.0:
        state = "SAFE"
        badge = "STABLE OPERATING WINDOW"
        limiting_factor = "Normal Thermal Dissipation (Conduction to Overburden/Underburden)"
    elif days_to_boundary > 10.0 or float_margin > 12.0:
        state = "WARNING"
        badge = "DECAY APPROACHING LIMIT"
        if mech_binding:
            limiting_factor = f"Rod Downstroke Float Margin Marginal ({float_margin:.1f}% — source: {float_margin_source})"
        else:
            limiting_factor = "Rod Downstroke Retardation (Couette Annular Drag Rising)"
    else:
        state = "CRITICAL"
        badge = "IMMINENT HYDRAULIC LOCK / ROD FLOAT"
        if mech_binding:
            limiting_factor = f"Float Margin Critical ({float_margin:.1f}% < 10% safety floor)"
        else:
            limiting_factor = "Crude Viscosity Surpassing Rod String Gravity Fall Velocity"

    return {
        "well_id": "BGW-17A",
        "time_to_boundary_days": days_to_boundary,
        "state": state,
        "critical_limiting_factor": limiting_factor,
        "decay_rate_days_per_day": round(effective_cooling, 2),
        "status_badge": badge,
        "provenance": (
            f"Marx-Langenheim / Beggs-Robinson Coupled Thermal-Viscosity Model "
            f"(Calibrated Baghewala 17A) — engine: {n.get('_engine', 'sim')}, "
            f"float_margin source: {float_margin_source}"
        )
    }
