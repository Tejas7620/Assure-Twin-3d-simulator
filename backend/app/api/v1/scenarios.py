"""
backend/app/api/v1/scenarios.py
Decision Rehearsal & Multi-Scenario Comparison Endpoints (Phase 27).
Compares Baseline, Accelerated Inflow, Viscosity Bound, and Aggressive Drawdown scenarios.
"""

from fastapi import APIRouter
from typing import Dict, Any, List

from backend.app.simulation.manager import get_sim_engine
from backend.app.schemas.domain import (
    ScenariosComparisonResponse, ScenarioResultSchema, CustomRehearsalRequest
)

router = APIRouter(prefix="/scenarios", tags=["Scenarios"])

@router.get("/compare", response_model=ScenariosComparisonResponse)
def compare_scenarios() -> Dict[str, Any]:
    sim = get_sim_engine()
    state = sim.step(0.0)
    current_oil = state.get("production", {}).get("oil_rate_bopd", 32.6)
    
    scenarios: List[Dict[str, Any]] = [
        {
            "scenario_id": "SCEN-01",
            "name": "Current Practice (Uncoordinated)",
            "type": "BASELINE",
            "oil_rate": round(current_oil * 0.88, 1),
            "sor": 3.82,
            "steam_rate": 20.0,
            "energy_kw": 22.4,
            "float_margin_pct": 21.0,
            "pumpability_days": 18.5,
            "robustness": "MARGINAL (78%)",
            "assurance_pass": True
        },
        {
            "scenario_id": "SCEN-02",
            "name": "Accelerated Inflow Optimization",
            "type": "RECOMMENDED",
            "oil_rate": round(current_oil * 1.28, 1),
            "sor": 2.55,
            "steam_rate": 42.0,
            "energy_kw": 26.8,
            "float_margin_pct": 34.2,
            "pumpability_days": 38.0,
            "robustness": "STABLE (96%)",
            "assurance_pass": True
        },
        {
            "scenario_id": "SCEN-03",
            "name": "Viscosity-Bound Conservative",
            "type": "DEFENSIVE",
            "oil_rate": round(current_oil * 0.95, 1),
            "sor": 2.30,
            "steam_rate": 35.0,
            "energy_kw": 18.2,
            "float_margin_pct": 42.5,
            "pumpability_days": 44.0,
            "robustness": "HIGH (99%)",
            "assurance_pass": True
        },
        {
            "scenario_id": "SCEN-04",
            "name": "Aggressive Drawdown (High SPM)",
            "type": "HIGH_RISK",
            "oil_rate": round(current_oil * 1.34, 1),
            "sor": 3.10,
            "steam_rate": 48.0,
            "energy_kw": 36.5,
            "float_margin_pct": 8.5,
            "pumpability_days": 9.0,
            "robustness": "FAILED (42%)",
            "assurance_pass": False
        }
    ]

    return {
        "well_id": "BGW-17A",
        "scenarios": scenarios
    }

@router.post("/rehearse")
def rehearse_custom_scenario(req: CustomRehearsalRequest) -> Dict[str, Any]:
    # Calculate physics impact of custom parameters
    oil_rate = round(32.6 * (req.spm / 3.2) * (req.stroke_length_in / 64.0) * (req.steam_volume_tons / 2400.0) ** 0.35, 1)
    sor = round((req.steam_volume_tons / 2400.0) * 2.84 / max(0.5, (oil_rate / 32.6)), 2)
    float_margin = round(max(0.0, 48.0 - (req.spm * 6.5) - ((80.0 - req.stroke_length_in) * 0.2)), 1)
    pumpability_days = round(max(2.0, 35.0 * (req.steam_volume_tons / 2400.0) - (req.spm * 2.0)), 1)
    energy_kw = round(14.0 + (req.spm * 3.4) + (req.vfd_speed_hz * 0.12), 1)
    
    pass_assurance = float_margin >= 15.0 and req.spm <= 4.5

    return {
        "well_id": req.well_id,
        "parameters": {
            "spm": req.spm,
            "stroke_length_in": req.stroke_length_in,
            "vfd_speed_hz": req.vfd_speed_hz,
            "steam_volume_tons": req.steam_volume_tons,
            "soak_duration_days": req.soak_duration_days
        },
        "simulation_outcomes": {
            "oil_rate_bopd": oil_rate,
            "sor": sor,
            "float_margin_pct": float_margin,
            "pumpability_days": pumpability_days,
            "energy_kw": energy_kw,
            "assurance_pass": pass_assurance,
            "status": "SAFE_FOR_DEPLOYMENT" if pass_assurance else "BLOCKED_BY_ASSURANCE_GATE"
        }
    }
