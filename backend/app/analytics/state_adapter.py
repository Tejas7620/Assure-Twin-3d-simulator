"""
backend/app/analytics/state_adapter.py
Engine-Agnostic State Normalisation Adapter (Phase 2 — H3 fix).

The ASSURE-TWIN codebase has two physics engines with different state key schemas:
  Engine A (SimulationEngine):  produces sim_state with keys like reservoir.*, srp.*, controls.*
  Engine B (StatefulTwinEngine): produces twin_state with keys like thermal.*, loads.*, inflow.*, pump.*, economics.*

This adapter presents a NORMALISED state dict to all analytics consumers so they
read consistent keys regardless of which engine produced the state.

Key mappings (Engine A → Normalised → Engine B):
  temperature_c:      reservoir.temperature_c      thermal.near_well_temp_c
  viscosity_cp:       reservoir.viscosity_cp        fluid.viscosity_near_well_cp
  p_wf_bar:           controls.pwf_bar              inflow.p_wf_bar
  p_res_bar:          reservoir.pressure_bar        inflow.p_res_bar
  spm:                controls.spm                  controls.spm
  stroke_in:          controls.stroke_inches        controls.stroke_inches
  float_margin_pct:   srp.float_margin_pct          loads.float_margin_pct
  pprl_kn:            srp.pprl_kn                   loads.pprl_kn
  pump_fillage:       pump.pump_fillage             pump.pump_fillage
  pump_fillage_pct:   pump.pump_fillage_pct         pump.pump_fillage_pct
  oil_rate_bopd:      production.oil_rate_bopd      production.oil_rate_bpd
  perm_md:            reservoir.permeability_md     reservoir.permeability_md
  daily_profit_usd:   economics.daily_profit_usd    economics.daily_profit_usd
  css_phase:          time.css_phase                css.phase
"""

from typing import Dict, Any


# ---------------------------------------------------------------------------
# Sentinel: distinguishes "key present with value 0.0" from "key absent"
# ---------------------------------------------------------------------------
_MISSING = object()


def _first(*args: Any) -> Any:
    """Return the first non-_MISSING value."""
    for a in args:
        if a is not _MISSING:
            return a
    return None


def _get(d: Dict[str, Any], *path: str, default: Any = _MISSING) -> Any:
    """Safe nested dict accessor. Returns default if any key is absent."""
    node: Any = d
    for key in path:
        if not isinstance(node, dict) or key not in node:
            return default
        node = node[key]
    return node if node is not _MISSING else default


def normalise(raw_state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Convert either engine's state dict into a normalised schema that all
    analytics consumers can read without engine-specific conditionals.

    The result dict uses short, stable key names documented in this module's
    docstring. Each key carries a `_source` entry recording which engine
    key was used, for traceability.
    """
    # Temperature: prefer twin's near_well_temp_c (more precise), fall back to sim
    temperature_c = _first(
        _get(raw_state, "thermal", "near_well_temp_c"),
        _get(raw_state, "reservoir", "temperature_c"),
    )

    # Viscosity
    viscosity_cp = _first(
        _get(raw_state, "fluid", "viscosity_near_well_cp"),
        _get(raw_state, "reservoir", "viscosity_cp"),
    )

    # Flowing BHP: sim stores under controls.pwf_bar; twin stores under inflow.p_wf_bar
    p_wf_bar = _first(
        _get(raw_state, "inflow", "p_wf_bar"),
        _get(raw_state, "controls", "pwf_bar"),
        _get(raw_state, "reservoir", "pwf_bar"),  # legacy fallback
    )

    # Reservoir pressure
    p_res_bar = _first(
        _get(raw_state, "inflow", "p_res_bar"),
        _get(raw_state, "reservoir", "pressure_bar"),
    )

    # SPM
    spm = _first(
        _get(raw_state, "controls", "spm"),
    )

    # Stroke
    stroke_in = _first(
        _get(raw_state, "controls", "stroke_inches"),
    )

    # Float margin: sim has it under 'srp', twin under 'loads'
    float_margin_pct = _first(
        _get(raw_state, "loads", "float_margin_pct"),
        _get(raw_state, "srp", "float_margin_pct"),
    )

    # PPRL
    pprl_kn = _first(
        _get(raw_state, "loads", "pprl_kn"),
        _get(raw_state, "srp", "pprl_kn"),
    )

    # Pump fillage (fraction 0–1): both engines use pump.pump_fillage
    pump_fillage = _first(
        _get(raw_state, "pump", "pump_fillage"),
    )

    # Pump fillage percent
    pump_fillage_pct = _first(
        _get(raw_state, "pump", "pump_fillage_pct"),
    )
    if pump_fillage_pct is None and pump_fillage is not None:
        pump_fillage_pct = pump_fillage * 100.0

    # Oil rate (bopd): sim has oil_rate_bopd; twin has oil_rate_bpd
    oil_rate_bopd = _first(
        _get(raw_state, "production", "oil_rate_bopd"),
        _get(raw_state, "production", "oil_rate_bpd"),
    )

    # Liquid inflow
    inflow_bpd = _first(
        _get(raw_state, "reservoir", "inflow_bpd"),
        _get(raw_state, "inflow", "q_liquid_m3_d"),    # twin in m³/d — leave unconverted; caller decides unit
    )

    # Permeability
    perm_md = _first(
        _get(raw_state, "reservoir", "permeability_md"),
    )

    # Dynamometer surface card: sim has it under srp.surface_card; twin under dynamometer.surface_card
    dyno_card = _first(
        _get(raw_state, "dynamometer", "surface_card"),
        _get(raw_state, "srp", "surface_card"),
    )

    # Economics
    daily_profit_usd = _first(
        _get(raw_state, "economics", "daily_profit_usd"),
    )
    sor = _first(
        _get(raw_state, "economics", "instantaneous_sor"),
        _get(raw_state, "economics", "sor"),
    )

    # CSS phase: sim stores in time.css_phase; twin in css.phase
    css_phase = _first(
        _get(raw_state, "css", "phase"),
        _get(raw_state, "time", "css_phase"),
    )

    # Injection pressure
    inj_pressure_bar = _first(
        _get(raw_state, "controls", "injection_pressure_bar"),
        _get(raw_state, "controls", "steam_volume_t_d"),   # not exact, but used as proxy fallback
    )

    # Water cut
    water_cut = _first(
        _get(raw_state, "controls", "water_cut"),
    )

    return {
        "temperature_c":    temperature_c,
        "viscosity_cp":     viscosity_cp,
        "p_wf_bar":         p_wf_bar,
        "p_res_bar":        p_res_bar,
        "spm":              spm,
        "stroke_in":        stroke_in,
        "float_margin_pct": float_margin_pct,
        "pprl_kn":          pprl_kn,
        "pump_fillage":     pump_fillage,
        "pump_fillage_pct": pump_fillage_pct,
        "oil_rate_bopd":    oil_rate_bopd,
        "inflow_bpd":       inflow_bpd,
        "perm_md":          perm_md,
        "dyno_card":        dyno_card or [],
        "daily_profit_usd": daily_profit_usd,
        "sor":              sor,
        "css_phase":        css_phase,
        "inj_pressure_bar": inj_pressure_bar,
        "water_cut":        water_cut,
        # Passthrough well ID for response assembly
        "well_id":          raw_state.get("well_id", "BGW-17A"),
        # Track which engine emitted this state
        "_engine":          "twin" if "thermal" in raw_state or "loads" in raw_state else "sim"
    }


def derive_confidence(
    normalised: Dict[str, Any],
    key: str,
    is_direct_measurement: bool = False,
    model_order: int = 1
) -> str:
    """
    H4 fix: Derive sensor confidence from data availability and model order.

    Rules:
    - If value is None (missing from state) → 'LOW'
    - If directly measured (RTU sensor passthrough) → 'HIGH'
    - If model_order==1 (direct analytical calc from measured inputs) → 'HIGH' if p_wf and T present
    - If model_order==2 (derived from a derived quantity) → 'MEDIUM'
    - If model_order==3+ → 'LOW'
    - Degrade one level if engine is 'sim' (proxy state, not RTU-fed twin)
    """
    value = normalised.get(key)
    if value is None:
        return "LOW"

    if is_direct_measurement:
        return "HIGH"

    # Check if primary physical inputs are available
    has_temperature = normalised.get("temperature_c") is not None
    has_pressure    = normalised.get("p_wf_bar") is not None
    is_twin         = normalised.get("_engine") == "twin"

    if model_order == 1 and has_temperature and has_pressure:
        base = "HIGH"
    elif model_order == 1 and (has_temperature or has_pressure):
        base = "MEDIUM"
    elif model_order == 2:
        base = "MEDIUM"
    else:
        base = "LOW"

    # Sim engine degrades by one level (it's a physics model, not RTU-backed)
    if not is_twin:
        if base == "HIGH":
            base = "MEDIUM"

    return base
