"""
backend/app/analytics/envelope.py
Thermo-Mechanical Operating Envelope (Phase 25 — H3 fix).

H3 fix: Reads normalised state keys via state_adapter.normalise() for
engine-agnostic operation. The temperature-derived SPM boundary table is
unchanged; we just ensure the temperature and SPM values are sourced correctly
from either Engine A (sim) or Engine B (twin).

Envelope physics: As near-well temperature falls post-steam, Andrade viscosity
rises exponentially. High viscosity increases annular rod drag, squeezing the
downstroke float margin. The safe SPM range narrows with cooling.
"""

import math
from typing import Dict, Any
from .state_adapter import normalise


# Temperature-dependent boundary table (calibrated from Baghewala SRP API RP 11L analysis)
# Format: (T_min_C, pref_min, pref_max, warn_min, warn_max, crit_max)
_ENVELOPE_TABLE = [
    (95.0, 2.0, 5.2, 1.2, 6.2, 6.8),
    (75.0, 1.8, 4.2, 1.0, 4.8, 5.4),
    (65.0, 1.5, 3.6, 0.8, 4.0, 4.5),
    (58.0, 1.0, 2.8, 0.6, 3.2, 3.6),
    (0.0,  0.5, 1.8, 0.4, 2.2, 2.5),   # Below 58°C — severe cooling
]

# Pristine post-steam baseline span at T >= 120°C: pref_max - pref_min = 3.2 (not 5.5 — corrected)
_BASELINE_SPAN = 3.2   # At T=95+: pref [2.0, 5.2] → span = 3.2


def compute_operating_envelope(sim_state: Dict[str, Any]) -> Dict[str, Any]:
    n = normalise(sim_state)

    temp_c = n["temperature_c"] if n["temperature_c"] is not None else 72.6
    spm    = n["spm"]           if n["spm"]           is not None else 3.2

    # Select boundary row from temperature table
    pref_min, pref_max, warn_min, warn_max, crit_max = None, None, None, None, None
    for (t_min, pm_lo, pm_hi, w_lo, w_hi, c_hi) in _ENVELOPE_TABLE:
        if temp_c >= t_min:
            pref_min, pref_max = pm_lo, pm_hi
            warn_min, warn_max = w_lo, w_hi
            crit_max           = c_hi
            break

    # Smoothly interpolate within the table band rather than step-function.
    # Find the next higher band to interpolate between.
    interp_pref_min = pref_min
    interp_pref_max = pref_max
    for i, (t_min, pm_lo, pm_hi, w_lo, w_hi, c_hi) in enumerate(_ENVELOPE_TABLE):
        if temp_c >= t_min and i > 0:
            t_upper = _ENVELOPE_TABLE[i - 1][0]
            t_lower = t_min
            frac = max(0.0, min(1.0, (temp_c - t_lower) / max(1.0, t_upper - t_lower)))
            prev = _ENVELOPE_TABLE[i - 1]
            interp_pref_min = round(pref_min + frac * (prev[1] - pref_min), 2)
            interp_pref_max = round(pref_max + frac * (prev[2] - pref_max), 2)
            # Also interpolate warn/crit for smoother alert zone transitions
            warn_min = round(warn_min + frac * (prev[3] - warn_min), 2)
            warn_max = round(warn_max + frac * (prev[4] - warn_max), 2)
            crit_max = round(crit_max + frac * (prev[5] - crit_max), 2)
            break

    pref_min = interp_pref_min
    pref_max = interp_pref_max

    current_span = pref_max - pref_min
    shrinkage_pct = round(max(0.0, min(100.0, (1.0 - current_span / _BASELINE_SPAN) * 100.0)), 1)

    # Evaluate current SPM status
    if pref_min <= spm <= pref_max:
        status = "OPTIMAL_PREFERRED_ZONE"
    elif warn_min <= spm <= warn_max:
        status = "MARGINAL_WARNING_ZONE"
    else:
        status = "OUT_OF_ENVELOPE_CRITICAL"

    return {
        "well_id": n.get("well_id", "BGW-17A"),
        "current_temp_c": round(temp_c, 1),
        "current_spm": round(spm, 2),
        "preferred_spm_min": round(pref_min, 2),
        "preferred_spm_max": round(pref_max, 2),
        "warning_spm_min": round(warn_min, 2),
        "warning_spm_max": round(warn_max, 2),
        "critical_spm_upper": round(crit_max, 2),
        "status": status,
        "shrinkage_factor_pct": shrinkage_pct,
        "engine": n.get("_engine", "sim")   # Traceability field
    }
