"""
backend/tests/test_phase2.py
Phase 2 contract tests: H3 (engine-agnostic analytics), H4 (derived confidence).
"""
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.analytics.state_adapter import normalise, derive_confidence


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


# ---------------------------------------------------------------------------
# H3: State adapter correctness
# ---------------------------------------------------------------------------

def test_normalise_sim_state_p_wf_bar():
    """H3 fix: p_wf_bar must resolve from controls.pwf_bar in sim state, not reservoir."""
    sim_state = {
        "controls": {"spm": 3.2, "stroke_inches": 64.0, "pwf_bar": 19.5},
        "reservoir": {"temperature_c": 74.1, "viscosity_cp": 1650.0},
        "srp": {"float_margin_pct": 27.4},
        "pump": {"pump_fillage": 0.61, "pump_fillage_pct": 61.0},
        "production": {"oil_rate_bopd": 34.2}
    }
    n = normalise(sim_state)
    assert n["p_wf_bar"] == 19.5, "p_wf_bar must read from controls.pwf_bar"
    assert n["float_margin_pct"] == 27.4
    assert n["_engine"] == "sim"


def test_normalise_twin_state_keys():
    """H3 fix: Twin engine keys (thermal.*, loads.*, inflow.*) resolve correctly."""
    twin_state = {
        "thermal": {"near_well_temp_c": 78.0},
        "fluid": {"viscosity_near_well_cp": 1200.0},
        "loads": {"float_margin_pct": 32.1, "pprl_kn": 68.0},
        "inflow": {"p_wf_bar": 16.4, "p_res_bar": 28.5, "q_liquid_m3_d": 6.2},
        "pump": {"pump_fillage": 0.74, "pump_fillage_pct": 74.0},
        "production": {"oil_rate_bpd": 38.1},
        "controls": {"spm": 2.8, "stroke_inches": 74.0},
        "economics": {"daily_profit_usd": 1250.0, "instantaneous_sor": 2.6}
    }
    n = normalise(twin_state)
    assert n["temperature_c"] == 78.0, "Should prefer thermal.near_well_temp_c over reservoir.temperature_c"
    assert n["viscosity_cp"] == 1200.0, "Should prefer fluid.viscosity_near_well_cp"
    assert n["p_wf_bar"] == 16.4, "Should prefer inflow.p_wf_bar over controls.pwf_bar"
    assert n["float_margin_pct"] == 32.1, "Should prefer loads.float_margin_pct"
    assert n["oil_rate_bopd"] == 38.1, "Should read twin's oil_rate_bpd"
    assert n["_engine"] == "twin"


def test_normalise_empty_state_no_crash():
    """H3: normalise must not crash on an empty state — return Nones gracefully."""
    n = normalise({})
    assert n["temperature_c"] is None
    assert n["p_wf_bar"] is None
    assert n["_engine"] == "sim"


# ---------------------------------------------------------------------------
# H4: Confidence derivation
# ---------------------------------------------------------------------------

def test_confidence_degrades_for_sim_engine():
    """H4 fix: Confidence must be MEDIUM (not HIGH) for sim engine model-1 sensors."""
    sim_n = {
        "temperature_c": 72.6,
        "p_wf_bar": 18.2,
        "oil_rate_bopd": 32.6,
        "pump_fillage_pct": 61.0,
        "float_margin_pct": 28.9,
        "viscosity_cp": 1840.0,
        "_engine": "sim"
    }
    conf = derive_confidence(sim_n, "temperature_c", model_order=1)
    assert conf == "MEDIUM", f"Sim engine should degrade to MEDIUM, got {conf}"


def test_confidence_high_for_twin_engine():
    """H4: Confidence must be HIGH for twin engine model-1 sensors with both T and P available."""
    twin_n = {
        "temperature_c": 78.0,
        "p_wf_bar": 16.4,
        "oil_rate_bopd": 38.1,
        "pump_fillage_pct": 74.0,
        "float_margin_pct": 32.1,
        "viscosity_cp": 1200.0,
        "_engine": "twin"
    }
    conf = derive_confidence(twin_n, "temperature_c", model_order=1)
    assert conf == "HIGH", f"Twin engine should be HIGH, got {conf}"


def test_confidence_low_for_missing_value():
    """H4: Confidence must be LOW when the value itself is None."""
    n = {"temperature_c": None, "_engine": "sim"}
    conf = derive_confidence(n, "temperature_c", model_order=1)
    assert conf == "LOW"


def test_confidence_model_order_2_is_medium_or_lower():
    """H4: Model-order-2 derivations must be MEDIUM or LOW, never HIGH."""
    n = {"temperature_c": 72.6, "p_wf_bar": 18.2, "_engine": "sim"}
    conf = derive_confidence(n, "p_wf_bar", model_order=2)
    assert conf in ("MEDIUM", "LOW"), f"Model-2 should not be HIGH, got {conf}"


# ---------------------------------------------------------------------------
# End-to-end: API confidence check
# ---------------------------------------------------------------------------

def test_virtual_downhole_confidence_not_all_high(client):
    """H4 fix: At least one sensor must have MEDIUM or LOW confidence (never all HIGH)."""
    response = client.get("/api/v1/analytics/virtual-downhole")
    assert response.status_code == 200
    sensors = response.json()["sensors"]
    confidences = [s["confidence"] for s in sensors.values()]
    assert "HIGH" not in confidences or "MEDIUM" in confidences, (
        "All sensors returned HIGH — H4 fix not working, sim engine should yield MEDIUM"
    )


def test_twin_state_endpoint(client):
    """New /twin-state endpoint returns normalised keys."""
    response = client.get("/api/v1/analytics/twin-state")
    assert response.status_code == 200
    data = response.json()
    assert "source" in data
    assert "normalised" in data
    n = data["normalised"]
    assert "temperature_c" in n
    assert "p_wf_bar" in n
    assert "_engine" in n


def test_pumpability_provenance_includes_engine(client):
    """H3: Pumpability response must include engine traceability in provenance."""
    response = client.get("/api/v1/analytics/pumpability")
    assert response.status_code == 200
    data = response.json()
    assert "provenance" in data
    assert "engine" in data["provenance"].lower() or "source" in data["provenance"].lower()


def test_envelope_includes_engine_field(client):
    """H3: Envelope response must include engine field."""
    response = client.get("/api/v1/analytics/envelope")
    assert response.status_code == 200
    data = response.json()
    assert "engine" in data


def test_scenarios_compare_uses_simulated_sor(client):
    """Phase 2: Compare endpoint must return sor values computed from CSSOptimizer."""
    response = client.get("/api/v1/scenarios/compare")
    assert response.status_code == 200
    data = response.json()
    assert len(data["scenarios"]) == 4
    for s in data["scenarios"]:
        assert "sor" in s
        # SOR must be positive — no upper bound imposed because SCEN-01 (baseline)
        # is deliberately uneconomic and the CSSOptimizer legitimately computes high SOR.
        assert s["sor"] > 0.0, f"SOR must be positive, got {s['sor']}"
        assert "float_margin_pct" in s
        assert "assurance_pass" in s
        assert isinstance(s["assurance_pass"], bool)
        assert "engine" not in s  # engine is in outer wrapper, not per-scenario
    assert "engine" in data


