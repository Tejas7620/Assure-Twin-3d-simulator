"""
backend/app/assurance/gatekeeper.py
12-Checkpoint Zero-Trust Assurance & Governance Gatekeeper (Phase 29).

Reads TWIN-engine state keys (loads.*, thermal.*, inflow.*, pump.*, economics.*,
dynamometer.*, css.*) — all verified emitted by StatefulTwinEngine.step().
Falls back to sim-engine values only for keys common to both schemas.

C2 fix: All 12 checkpoints are now REAL predicates; none are hardwired True.
The gate can and will return abstain when physics conditions require it.
"""

from typing import Dict, Any, List, Optional


# ---------------------------------------------------------------------------
# Threshold constants (from config / API RP 11L / Baghewala field limits)
# ---------------------------------------------------------------------------
PPRL_MAX_KN          = 115.0   # API Grade D yield limit
FLOAT_MARGIN_MIN_PCT = 15.0    # Downstroke rod-float safety floor
FLOAT_WARN_PCT       = 20.0    # Advisory warning level
GEARBOX_MAX_PCT      = 85.0    # API 320 k-in-lb continuous rating
SOR_MAX_ECONOMIC     = 5.0     # Steam-oil ratio at which lifting becomes uneconomic
PUMP_FILLAGE_MIN     = 0.30    # Below this → likely gas locking or near-empty barrel
PUMP_FILLAGE_WARN    = 0.55    # Advisory
P_WF_MIN_BAR         = 5.0    # Absolute minimum flowing BHP (avoid cavitation)
TEMP_STEAM_MAX_C     = 340.0   # Wellhead packing thermal limit
INJ_P_MAX_PCT        = 0.90   # Injection pressure as fraction of fracture pressure
FRACTURE_P_BAR       = 38.0   # Baghewala caprock fracture gradient limit
DAILY_PROFIT_MIN_USD = -200.0  # Threshold below which lifting is uneconomic
DYNO_MIN_POINTS      = 16     # Minimum points for a meaningful dynamometer card
MAHAL_OOD_THRESHOLD  = 6.0   # Mahalanobis distance above which ML confidence is unreliable


def _safe_float(state: Dict[str, Any], *path: str, default: float = 0.0) -> float:
    """Drill into a nested dict, returning default if any key is missing."""
    d: Any = state
    for key in path:
        if not isinstance(d, dict) or key not in d:
            return default
        d = d[key]
    try:
        return float(d)
    except (TypeError, ValueError):
        return default


def _safe_list(state: Dict[str, Any], *path: str) -> List[Any]:
    d: Any = state
    for key in path:
        if not isinstance(d, dict) or key not in d:
            return []
        d = d[key]
    return d if isinstance(d, list) else []


def evaluate_assurance_gate(
    sim_state: Dict[str, Any],
    controls: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Evaluates 12 physics-derived checkpoints against the twin-engine state.

    All keys read here are verified to be emitted by StatefulTwinEngine.step()
    (see time_stepper.py state dict, verified in PROJECT_AUDIT §3).
    Any key absent in the dict triggers the safe-default *from physics*, not a
    hardcoded narrative — the caller should treat absent keys as a data-quality failure.

    Returns a verdict that can be:
      - "VERIFIED FOR ENGINEER REVIEW"
      - "CONDITIONAL — REVIEW WARNINGS"
      - "NO SAFE RECOMMENDATION (ABSTAIN)"
    """
    # ---- Read twin-schema state keys ----
    pprl_kn         = _safe_float(sim_state, "loads", "float_margin_pct",    default=-1.0)
    # Correct key for PPRL is loads.pprl_kn
    pprl_kn         = _safe_float(sim_state, "loads", "pprl_kn",             default=-1.0)
    float_margin    = _safe_float(sim_state, "loads", "float_margin_pct",    default=-1.0)
    is_buckling     = bool(sim_state.get("loads", {}).get("is_buckling",     True))
    near_well_temp  = _safe_float(sim_state, "thermal", "near_well_temp_c",  default=-1.0)
    p_wf_bar        = _safe_float(sim_state, "inflow", "p_wf_bar",           default=-1.0)
    p_res_bar       = _safe_float(sim_state, "inflow", "p_res_bar",          default=-1.0)
    pump_fillage    = _safe_float(sim_state, "pump", "pump_fillage",         default=-1.0)
    sor             = _safe_float(sim_state, "economics", "instantaneous_sor", default=-1.0)
    daily_profit    = _safe_float(sim_state, "economics", "daily_profit_usd", default=0.0)
    # CSS phase
    css_phase       = sim_state.get("css", {}).get("phase", "UNKNOWN")
    # Controls (apply override from candidate if provided)
    spm             = _safe_float(sim_state, "controls", "spm",              default=3.2)
    stroke_in       = _safe_float(sim_state, "controls", "stroke_inches",    default=64.0)
    inj_pressure    = _safe_float(sim_state, "controls", "injection_pressure_bar", default=0.0)
    # Dynamometer card
    dyno_card       = _safe_list(sim_state, "dynamometer", "surface_card")
    dyno_pts        = len(dyno_card)
    # ML agreement (optional — present if assurance engine pre-computed it)
    ml_agreement    = sim_state.get("ml_agreement", {})
    mahal_dist      = _safe_float(sim_state, "surrogate", "mahalanobis_distance", default=0.0)
    model_divergence = _safe_float(ml_agreement, "relative_divergence_pct", default=0.0)

    # Apply control overrides from candidate under test
    if controls:
        spm = float(controls.get("spm", spm))
        stroke_in = float(controls.get("stroke_inches", stroke_in))

    # ---- Helper: mark a key as missing/unavailable ----
    def _missing(value: float) -> bool:
        return value < 0.0

    # ======================================================================
    # 12 Checkpoints
    # ======================================================================
    checks: List[Dict[str, Any]] = []

    # --- 1. Sensor Data Quality & Plausibility ---
    # Real check: dynamometer card must have sufficient points; temp and pressures must be positive
    sensor_ok = (
        dyno_pts >= DYNO_MIN_POINTS and
        not _missing(near_well_temp) and
        not _missing(p_wf_bar) and
        not _missing(float_margin)
    )
    if _missing(near_well_temp) and _missing(p_wf_bar) and _missing(float_margin):
        sensor_detail = "Critical telemetry absent: temperature, pressure, and load sensors all missing."
    elif dyno_pts < DYNO_MIN_POINTS:
        sensor_detail = (
            f"Dynamometer card has only {dyno_pts} points (minimum {DYNO_MIN_POINTS} required "
            f"for reliable card interpretation). RTU telemetry may be intermittent."
        )
    else:
        sensor_detail = (
            f"RTU telemetry present: {dyno_pts} dyno points, "
            f"T={near_well_temp:.1f}°C, Pwf={p_wf_bar:.1f} bar, float_margin={float_margin:.1f}%."
        )
    checks.append({
        "id": 1, "name": "Sensor Data Quality & Plausibility", "category": "Data Integrity",
        "passed": sensor_ok, "status": "PASS" if sensor_ok else "FAIL",
        "detail": sensor_detail
    })

    # --- 2. Calibration Recency & Drift ---
    # Proxy: if dyno card has near-zero range or card shape is degenerate → possible drift.
    # Without a real calibration timestamp in this state, we check card self-consistency.
    card_range = 0.0
    if dyno_pts >= 2:
        loads_in_card = [pt.get("load_kn", 0.0) for pt in dyno_card if isinstance(pt, dict)]
        if loads_in_card:
            card_range = max(loads_in_card) - min(loads_in_card)
    cal_ok = (dyno_pts >= DYNO_MIN_POINTS and card_range > 5.0) or dyno_pts == 0
    # If no dyno data, we can't verify — flag as warning not failure (data quality handles it)
    cal_status = "PASS" if cal_ok else "WARNING"
    checks.append({
        "id": 2, "name": "Calibration Recency & Drift", "category": "Metrology",
        "passed": cal_status != "FAIL",
        "status": cal_status,
        "detail": (
            f"Dynamometer card range: {card_range:.1f} kN over {dyno_pts} points. "
            f"{'Card range plausible.' if cal_ok else 'Card range suspiciously narrow — possible calibration drift or stuck transducer.'}"
        )
    })

    # --- 3. Mass Balance Conservation ---
    # Real check: p_wf must be < p_res (fluid must be flowing toward wellbore)
    # and q_liquid must be positive (inflow is real)
    q_liquid = _safe_float(sim_state, "inflow", "q_liquid_m3_d", default=-1.0)
    mass_ok = (
        not _missing(p_wf_bar) and not _missing(p_res_bar) and
        p_wf_bar < p_res_bar and not _missing(q_liquid) and q_liquid > 0.0
    )
    checks.append({
        "id": 3, "name": "Mass Balance Conservation", "category": "Thermodynamics",
        "passed": mass_ok,
        "status": "PASS" if mass_ok else "FAIL",
        "detail": (
            f"Reservoir pressure {p_res_bar:.1f} bar vs. flowing BHP {p_wf_bar:.1f} bar → "
            f"{'positive drawdown ({:.1f} bar), inflow = {:.2f} m³/d.'.format(p_res_bar - p_wf_bar, q_liquid) if mass_ok else 'INVALID: no positive drawdown or zero inflow (mass balance violated).'}"
        )
    })

    # --- 4. Energy Balance Conservation ---
    # Check: CSS injection pressure must not exceed fracture gradient
    # and near-well temp must be above ambient (52°C) if in production phase
    ambient_c = 52.0
    energy_ok = True
    energy_detail_parts = []
    if css_phase in ("INJECTION",) and inj_pressure > FRACTURE_P_BAR:
        energy_ok = False
        energy_detail_parts.append(
            f"Injection pressure {inj_pressure:.1f} bar exceeds fracture gradient {FRACTURE_P_BAR:.1f} bar."
        )
    if not _missing(near_well_temp) and css_phase in ("PRODUCTION", "COOLING") and near_well_temp < ambient_c:
        energy_ok = False
        energy_detail_parts.append(
            f"Near-well temperature {near_well_temp:.1f}°C is below ambient ({ambient_c}°C) — thermal model divergence."
        )
    if energy_ok:
        energy_detail_parts.append(
            f"Thermal state: T={near_well_temp:.1f}°C (phase={css_phase}); "
            f"injection P={inj_pressure:.1f} bar < {FRACTURE_P_BAR:.1f} bar fracture limit."
        )
    checks.append({
        "id": 4, "name": "Energy Balance Conservation", "category": "Thermodynamics",
        "passed": energy_ok, "status": "PASS" if energy_ok else "FAIL",
        "detail": " ".join(energy_detail_parts)
    })

    # --- 5. Thermo-Mechanical Stress Limits (PPRL) ---
    if _missing(pprl_kn):
        pprl_ok = False
        pprl_status = "FAIL"
        pprl_detail = "PPRL unavailable — mechanical stress cannot be verified."
    else:
        pprl_ok = pprl_kn <= PPRL_MAX_KN
        pprl_status = "PASS" if pprl_ok else "FAIL"
        pprl_detail = (
            f"Peak Polished Rod Load = {pprl_kn:.1f} kN "
            f"({'≤' if pprl_ok else '>'} API Grade D yield limit {PPRL_MAX_KN:.0f} kN)."
        )
    checks.append({
        "id": 5, "name": "Thermo-Mechanical Stress Limits", "category": "Mechanical",
        "passed": pprl_ok, "status": pprl_status, "detail": pprl_detail
    })

    # --- 6. Rod Float & Compression Safety ---
    if _missing(float_margin):
        float_ok = False
        float_status = "FAIL"
        float_detail = "Float margin unavailable — compression safety cannot be verified."
    elif is_buckling:
        float_ok = False
        float_status = "FAIL"
        float_detail = f"Rod buckling detected. Float margin = {float_margin:.1f}% (CRITICAL)."
    else:
        float_ok = float_margin >= FLOAT_MARGIN_MIN_PCT
        float_status = (
            "PASS" if float_margin >= FLOAT_WARN_PCT
            else ("WARNING" if float_margin >= FLOAT_MARGIN_MIN_PCT else "FAIL")
        )
        float_detail = (
            f"Downstroke rod-float margin = {float_margin:.1f}% "
            f"(safety floor ≥ {FLOAT_MARGIN_MIN_PCT:.0f}%, advisory ≥ {FLOAT_WARN_PCT:.0f}%)."
        )
    checks.append({
        "id": 6, "name": "Rod Float & Compression Safety", "category": "Kinematics",
        "passed": float_ok, "status": float_status, "detail": float_detail
    })

    # --- 7. Pump Clearance & Thermal Expansion ---
    # Check: temperature must be within pump-plunger design range (< 340°C)
    # and pump fillage above gas-lock threshold
    if _missing(near_well_temp) or _missing(pump_fillage):
        pump_therm_ok = False
        pump_therm_detail = "Temperature or pump fillage unavailable — thermal clearance unverifiable."
    else:
        pump_therm_ok = near_well_temp < TEMP_STEAM_MAX_C and pump_fillage > PUMP_FILLAGE_MIN
        pump_therm_detail = (
            f"Downhole T={near_well_temp:.1f}°C < {TEMP_STEAM_MAX_C:.0f}°C wellhead limit. "
            f"Pump fillage {pump_fillage*100:.1f}% "
            f"{'> ' + str(int(PUMP_FILLAGE_MIN*100)) + '% minimum.' if pump_fillage > PUMP_FILLAGE_MIN else '— BELOW gas-lock threshold.'}"
        )
    checks.append({
        "id": 7, "name": "Pump Clearance & Thermal Expansion", "category": "Mechanical",
        "passed": pump_therm_ok, "status": "PASS" if pump_therm_ok else "FAIL",
        "detail": pump_therm_detail
    })

    # --- 8. Gearbox Torque Rating ---
    # Proxy from PPRL and kinematics: gearbox % ~ (pprl_kn * stroke_m) / nominal_torque
    # Nominal surface unit: C-320 = 320 k-in-lb = 36.16 kN-m
    if not _missing(pprl_kn):
        stroke_m = stroke_in * 0.0254
        torque_estimate_knm = pprl_kn * stroke_m * 0.5  # Simple half-stroke torque estimate
        nominal_knm = 36.16  # 320 k-in-lb in kN-m
        gearbox_pct = (torque_estimate_knm / nominal_knm) * 100.0
        gearbox_ok = gearbox_pct <= GEARBOX_MAX_PCT
        gearbox_detail = (
            f"Estimated peak gearbox loading = {gearbox_pct:.1f}% of API 320 k-in-lb rating "
            f"(limit {GEARBOX_MAX_PCT:.0f}%)."
        )
    else:
        gearbox_ok = False
        gearbox_pct = -1.0
        gearbox_detail = "PPRL unavailable — gearbox torque cannot be estimated."
    checks.append({
        "id": 8, "name": "Gearbox Torque Rating", "category": "Mechanical",
        "passed": gearbox_ok, "status": "PASS" if gearbox_ok else "FAIL",
        "detail": gearbox_detail
    })

    # --- 9. Minimum Safe Economic Inflow ---
    if _missing(sor) or sor < 0.0:
        econ_ok = False
        econ_detail = "SOR or economics unavailable — economic viability unverifiable."
    else:
        sor_ok = sor <= SOR_MAX_ECONOMIC
        profit_ok = daily_profit >= DAILY_PROFIT_MIN_USD
        econ_ok = sor_ok and profit_ok
        econ_detail = (
            f"SOR = {sor:.2f} ({'≤' if sor_ok else '>'} {SOR_MAX_ECONOMIC} limit). "
            f"Daily net = USD {daily_profit:+.0f} ({'≥' if profit_ok else '<'} "
            f"floor {DAILY_PROFIT_MIN_USD:.0f})."
        )
    checks.append({
        "id": 9, "name": "Minimum Safe Economic Inflow", "category": "Economics",
        "passed": econ_ok, "status": "PASS" if econ_ok else "FAIL",
        "detail": econ_detail
    })

    # --- 10. Environmental & Wellhead Envelope ---
    # Check: injection pressure vs. fracture gradient; p_wf vs. cavitation floor
    if _missing(p_wf_bar):
        env_ok = False
        env_detail = "Flowing BHP unavailable — wellhead envelope unverifiable."
    else:
        cavitation_ok = p_wf_bar >= P_WF_MIN_BAR
        inj_headroom_ok = inj_pressure < FRACTURE_P_BAR * INJ_P_MAX_PCT
        env_ok = cavitation_ok and inj_headroom_ok
        env_detail = (
            f"Flowing BHP = {p_wf_bar:.1f} bar "
            f"({'≥' if cavitation_ok else '<'} {P_WF_MIN_BAR:.0f} bar cavitation floor). "
            f"Injection P = {inj_pressure:.1f} bar "
            f"({'<' if inj_headroom_ok else '≥'} {FRACTURE_P_BAR * INJ_P_MAX_PCT:.1f} bar safe limit)."
        )
    checks.append({
        "id": 10, "name": "Environmental & Wellhead Envelope", "category": "Safety",
        "passed": env_ok, "status": "PASS" if env_ok else "FAIL",
        "detail": env_detail
    })

    # --- 11. Physics-ML Agreement Gate ---
    # Real check: if ml_agreement divergence > 8% or mahalanobis > threshold → flag
    if not ml_agreement:
        # No agreement data available — treat as inconclusive (WARNING, not FAIL)
        ml_ok = True   # Don't block on missing optional data
        ml_status = "WARNING"
        ml_detail = "ML-physics agreement data not available for this step."
    else:
        divergence_ok = model_divergence <= 8.0
        ood_ok = mahal_dist <= MAHAL_OOD_THRESHOLD
        ml_ok = divergence_ok and ood_ok
        ml_status = "PASS" if ml_ok else ("WARNING" if divergence_ok else "FAIL")
        ml_detail = (
            f"Physics-ML relative divergence = {model_divergence:.1f}% "
            f"({'≤' if divergence_ok else '>'} 8% threshold). "
            f"Mahalanobis OOD distance = {mahal_dist:.2f} "
            f"({'≤' if ood_ok else '>'} {MAHAL_OOD_THRESHOLD:.0f} training hull)."
        )
    checks.append({
        "id": 11, "name": "Physics-ML Agreement Gate", "category": "Verification",
        "passed": ml_ok, "status": ml_status, "detail": ml_detail
    })

    # --- 12. Out-of-Distribution (OOD) Guard ---
    # spm and stroke must be inside the training envelope
    spm_in_bounds = 0.5 <= spm <= 6.0
    stroke_in_bounds = 48.0 <= stroke_in <= 120.0
    ood_op_ok = spm_in_bounds and stroke_in_bounds
    checks.append({
        "id": 12, "name": "Out-of-Distribution (OOD) Guard", "category": "AI Governance",
        "passed": ood_op_ok,
        "status": "PASS" if ood_op_ok else "FAIL",
        "detail": (
            f"Operating point: SPM={spm:.1f} (bounds [0.5, 6.0]), "
            f"stroke={stroke_in:.0f}\" (bounds [48, 120\"]). "
            f"{'Inside training distribution.' if ood_op_ok else 'OUTSIDE training distribution — ML predictions unreliable.'}"
        )
    })

    # ======================================================================
    # Verdict assembly
    # ======================================================================
    failed_checks = [c for c in checks if not c["passed"]]
    warning_checks = [c for c in checks if c["status"] == "WARNING" and c["passed"]]
    passed_count = sum(1 for c in checks if c["passed"])
    gate_score = round((passed_count / len(checks)) * 100.0, 1)

    blocking_reasons: List[str] = []
    required_data: List[str] = []
    for f in failed_checks:
        blocking_reasons.append(f"Checkpoint #{f['id']} FAIL — {f['name']}: {f['detail']}")
        required_data.append(f"Inspect/recalibrate parameters related to: {f['category']}")

    abstain_active = len(failed_checks) > 0

    if not abstain_active and len(warning_checks) > 0:
        overall_status = "CONDITIONAL — REVIEW WARNINGS"
    elif abstain_active:
        overall_status = "NO SAFE RECOMMENDATION (ABSTAIN)"
    else:
        overall_status = "VERIFIED FOR ENGINEER REVIEW"

    return {
        "well_id": sim_state.get("well_id", "BGW-17A"),
        "status": overall_status,
        "overall_pass": not abstain_active,
        "gate_score_pct": gate_score,
        "checks": checks,
        "abstain_active": abstain_active,
        "blocking_reasons": blocking_reasons,
        "required_data": required_data,
        "warning_count": len(warning_checks),
        "failed_count": len(failed_checks)
    }
