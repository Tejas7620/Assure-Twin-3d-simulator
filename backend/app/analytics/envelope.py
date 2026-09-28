"""
backend/app/analytics/envelope.py
Thermo-Mechanical Operating Envelope (Phase 25).
Evaluates safe dynamic limits of Sucker Rod Pump operations as a function of downhole temperature and viscosity.
"""

from typing import Dict, Any

def compute_operating_envelope(sim_state: Dict[str, Any]) -> Dict[str, Any]:
    temp_c = sim_state.get("reservoir", {}).get("temperature_c", 72.6)
    spm = sim_state.get("controls", {}).get("spm", 3.2)
    visc_cp = sim_state.get("reservoir", {}).get("viscosity_cp", 1840.0)
    
    # Pristine post-steam baseline: Temp = 120 C -> Safe SPM range: 1.0 - 6.5 (Span = 5.5)
    baseline_span = 5.5
    
    # Calculate permissible SPM boundaries as temperature decreases
    # Lower temp -> Viscosity explodes -> Downstroke rod float limit drops
    if temp_c >= 95.0:
        pref_min = 2.0
        pref_max = 5.2
        warn_min = 1.2
        warn_max = 6.2
        crit_max = 6.8
    elif temp_c >= 75.0:
        pref_min = 1.8
        pref_max = 4.2
        warn_min = 1.0
        warn_max = 4.8
        crit_max = 5.4
    elif temp_c >= 65.0:
        pref_min = 1.5
        pref_max = 3.6
        warn_min = 0.8
        warn_max = 4.0
        crit_max = 4.5
    elif temp_c >= 58.0:
        pref_min = 1.0
        pref_max = 2.8
        warn_min = 0.6
        warn_max = 3.2
        crit_max = 3.6
    else:
        pref_min = 0.5
        pref_max = 1.8
        warn_min = 0.4
        warn_max = 2.2
        crit_max = 2.5

    current_span = pref_max - pref_min
    shrinkage_pct = round(max(0.0, min(100.0, (1.0 - (current_span / baseline_span)) * 100.0)), 1)
    
    # Evaluate status
    if pref_min <= spm <= pref_max:
        status = "OPTIMAL_PREFERRED_ZONE"
    elif warn_min <= spm <= warn_max:
        status = "MARGINAL_WARNING_ZONE"
    else:
        status = "OUT_OF_ENVELOPE_CRITICAL"

    return {
        "well_id": "BGW-17A",
        "current_temp_c": round(temp_c, 1),
        "current_spm": round(spm, 2),
        "preferred_spm_min": pref_min,
        "preferred_spm_max": pref_max,
        "warning_spm_min": warn_min,
        "warning_spm_max": warn_max,
        "critical_spm_upper": crit_max,
        "status": status,
        "shrinkage_factor_pct": shrinkage_pct
    }
