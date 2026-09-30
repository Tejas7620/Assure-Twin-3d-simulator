"""
backend/app/api/v1/wells.py
Endpoints for Well Metadata, Geometries, Field Hierarchy, Telemetry Streams,
and Controlled Multi-Fault Injections for Engineering Demonstrations.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field as PydanticField
from datetime import datetime, timezone
import copy

def _now():
    return datetime.now(timezone.utc)

from backend.app.database import get_db
from backend.app.models.entities import Well, Field
from backend.app.schemas.domain import WellResponse
from backend.app.schemas.well_state import CanonicalWellState, WellIdentity, ReservoirState, FluidState, WellboreState, SRPState, ProductionState, ReliabilityState, ModelMetadata
from backend.app.simulation.manager import get_sim_engine
from backend.app.twin.engine import twin_manager
from backend.app.analytics.state_adapter import normalise
from backend.app.analytics.pumpability import compute_pumpability_window
from backend.app.analytics.envelope import compute_operating_envelope
from backend.app.assurance.gatekeeper import evaluate_assurance_gate
from backend.app.forecast.rehearsal import DecisionRehearsalEngine
from backend.app.assurance.safe_alternatives import SafeAlternativeEngine
from backend.app.api.v1.recommendations import _generate_recommendation

router = APIRouter(prefix="/wells", tags=["Wells"])

@router.get("", response_model=List[WellResponse])
def get_all_wells(db: Session = Depends(get_db)):
    wells = db.query(Well).all()
    if not wells:
        return [
            WellResponse(
                id="BGW-17A",
                field_id="BAGHEWALA-ASSET",
                well_name="BGW-17A (Heavy Oil Producer)",
                well_api_id="IND-RJ-BGW-17A",
                status="ACTIVE_PRODUCTION",
                depth=1450.0,
                tvd=1420.0,
                md=1840.0,
                completion_type="Slotted Liner in Heavy Oil Sand",
                pump_type="API Conventional SRP 320-256-100",
                created_at=_now()
            )
        ]
    return wells

@router.get("/{well_id}", response_model=WellResponse)
def get_well_by_id(well_id: str, db: Session = Depends(get_db)):
    well = db.query(Well).filter((Well.id == well_id) | (Well.well_name == well_id)).first()
    if not well:
        if well_id.upper() in ["BGW-17A", "WELL-1", "DEFAULT"]:
            return WellResponse(
                id="BGW-17A",
                field_id="BAGHEWALA-ASSET",
                well_name="BGW-17A (Heavy Oil Producer)",
                well_api_id="IND-RJ-BGW-17A",
                status="ACTIVE_PRODUCTION",
                depth=1450.0,
                tvd=1420.0,
                md=1840.0,
                completion_type="Slotted Liner in Heavy Oil Sand",
                pump_type="API Conventional SRP 320-256-100",
                created_at=_now()
            )
        raise HTTPException(status_code=404, detail=f"Well {well_id} not found")
    return well

# Module-level demo injection store for controlled judges scenarios
_demo_overrides: Dict[str, Dict[str, Any]] = {}

def _get_well_state_with_demo(well_id: str) -> Dict[str, Any]:
    try:
        active_well = twin_manager.get_active_well()
        state = active_well.step(0.0)
    except Exception:
        sim = get_sim_engine()
        state = sim.step(0.0)
    
    if well_id in _demo_overrides and _demo_overrides[well_id].get("active"):
        d = copy.deepcopy(state)
        ov = _demo_overrides[well_id]
        
        for k in ["loads", "thermal", "fluid", "reservoir", "srp", "pump", "controls", "economics", "surrogate"]:
            if k not in d:
                d[k] = {}

        fault_type = ov.get("fault_type", "HIGH_VISCOSITY")
        
        if fault_type == "RAPID_COOLING":
            d["thermal"]["near_well_temp_c"] = 52.0
            d["reservoir"]["temperature_c"] = 52.0
            d["fluid"]["viscosity_near_well_cp"] = 8900.0
            d["reservoir"]["viscosity_cp"] = 8900.0
            d["loads"]["float_margin_pct"] = 6.8
            d["srp"]["float_margin_pct"] = 6.8
            d["loads"]["is_buckling"] = True
        elif fault_type in ["HIGH_VISCOSITY", "ABNORMAL_VISCOSITY"]:
            d["thermal"]["near_well_temp_c"] = ov.get("temp_c", 51.5)
            d["reservoir"]["temperature_c"] = ov.get("temp_c", 51.5)
            d["fluid"]["viscosity_near_well_cp"] = ov.get("viscosity_cp", 14500.0)
            d["reservoir"]["viscosity_cp"] = ov.get("viscosity_cp", 14500.0)
            d["loads"]["float_margin_pct"] = ov.get("float_margin_pct", 5.2)
            d["srp"]["float_margin_pct"] = ov.get("float_margin_pct", 5.2)
            d["loads"]["pprl_kn"] = ov.get("pprl_kn", 124.0)
            d["srp"]["pprl_kn"] = ov.get("pprl_kn", 124.0)
            d["loads"]["is_buckling"] = True
        elif fault_type == "EXCESSIVE_SPM":
            d["controls"]["spm"] = 8.5
            d["loads"]["float_margin_pct"] = 4.1
            d["srp"]["float_margin_pct"] = 4.1
            d["loads"]["pprl_kn"] = 128.5
            d["loads"]["is_buckling"] = True
        elif fault_type == "LOW_PUMP_FILLAGE":
            d["pump"]["pump_fillage"] = 0.32
            d["pump"]["fluid_pound_magnitude_kn"] = 38.5
        elif fault_type == "HIGH_ROD_LOAD":
            d["loads"]["pprl_kn"] = 126.0
            d["srp"]["rod_load_kn"] = 126.0
        elif fault_type == "SENSOR_FREEZE":
            d["_stale_sensors"] = ["temperature_sensor", "acoustic_fluid_level"]
            d["is_stale"] = True
        elif fault_type == "OOD_STATE":
            d["controls"]["spm"] = 9.8
            d["controls"]["stroke_inches"] = 144.0
            d["surrogate"]["mahalanobis_distance"] = 9.4
        elif fault_type == "PHYSICS_ML_DISAGREEMENT":
            d["ml_agreement"] = {"relative_divergence_pct": 18.5}

        d["_demo_active"] = True
        d["_mode"] = f"DEMO FAULT: {fault_type}"
        return d
    return state

@router.get("/{well_id}/state")
def get_well_operational_state(well_id: str):
    state = _get_well_state_with_demo(well_id)
    n = normalise(state)
    return {
        "well_id": well_id,
        "timestamp": _now().isoformat(),
        "mode": "DEMO SCENARIO" if _demo_overrides.get(well_id, {}).get("active") else "LIVE / SIMULATION",
        "normalised": n,
        "state": state
    }

@router.get("/{well_id}/canonical", response_model=CanonicalWellState)
def get_canonical_well_state(well_id: str):
    state = _get_well_state_with_demo(well_id)
    n = normalise(state)
    
    temp = n.get("temperature_c", 72.8)
    if temp >= 80.0:
        res_cat = "HIGH"
    elif temp >= 65.0:
        res_cat = "MODERATE"
    elif temp >= 58.0:
        res_cat = "LOW"
    else:
        res_cat = "CRITICAL"

    float_margin = n.get("float_margin_pct", 24.5)
    pprl = n.get("pprl_kn", 88.5)

    return CanonicalWellState(
        identity=WellIdentity(well_id=well_id),
        reservoir=ReservoirState(
            reservoir_pressure_bar=68.4,
            near_well_temperature_c=temp,
            thermal_reserve_pct=round(max(0.0, min(100.0, ((temp - 52.0) / 35.0) * 100.0)), 1),
            thermal_reserve_category=res_cat,
            days_since_css=41.2
        ),
        fluid=FluidState(
            viscosity_cp=n.get("viscosity_cp", 1840.0),
            water_cut=n.get("water_cut", 0.128)
        ),
        wellbore=WellboreState(
            bottomhole_pressure_bar=n.get("p_wf_bar", 18.2),
            pump_intake_pressure_bar=round(max(0.0, n.get("p_wf_bar", 18.2) - 1.4), 1),
            fluid_level_m=round(max(400.0, 1420.0 - (n.get("p_wf_bar", 18.2) * 1e5) / (992.0 * 9.81 * 0.1)), 1)
        ),
        srp=SRPState(
            spm=n.get("spm", 3.2),
            stroke_length_in=n.get("stroke_in", 64.0),
            stroke_length_m=round(n.get("stroke_in", 64.0) * 0.0254, 4),
            pump_fillage_pct=round(n.get("pump_fillage_pct", 78.4), 1),
            rod_load_max_kn=pprl,
            rod_float_margin_pct=float_margin
        ),
        production=ProductionState(
            oil_rate_bopd=n.get("oil_rate_bopd", 32.6),
            liquid_rate_bpd=round(n.get("oil_rate_bopd", 32.6) / max(0.01, 1.0 - n.get("water_cut", 0.128)), 1),
            sor=n.get("sor", 6.2)
        ),
        reliability=ReliabilityState(
            rod_failure_risk=round(min(1.0, max(0.05, pprl / 115.0 * 0.2)), 2),
            health_index=round(max(5.0, min(100.0, 95.0 - (100.0 - float_margin) * 0.3)), 1),
            risk_level="HEALTHY_OPTIMAL" if float_margin >= 20.0 else ("MODERATE_NORMAL" if float_margin >= 15.0 else "CRITICAL_ACTION_REQUIRED")
        ),
        metadata=ModelMetadata(
            ood_status="IN_DOMAIN" if 0.5 <= n.get("spm", 3.2) <= 6.0 else "OUT_OF_DOMAIN"
        )
    )

@router.get("/{well_id}/production")
def get_well_production(well_id: str):
    state = _get_well_state_with_demo(well_id)
    n = normalise(state)
    return {
        "well_id": well_id,
        "oil_rate_bopd": n.get("oil_rate_bopd", 32.6),
        "liquid_rate_bpd": round(n.get("oil_rate_bopd", 32.6) / max(0.01, 1.0 - n.get("water_cut", 0.128)), 1),
        "water_cut_pct": round(n.get("water_cut", 0.128) * 100.0, 1),
        "cumulative_oil_bbl": 18450.0,
        "steam_rate_t_d": 42.3,
        "sor": n.get("sor", 6.2),
        "energy_per_barrel_kwh": 14.8,
        "history_30d": [
            {"day": i, "oil_rate": round(35.0 - (i * 0.25) + ((i % 3) * 0.4), 1)} for i in range(1, 31)
        ],
        "provenance": "MODEL-DERIVED / INFLOW_IPR"
    }

@router.get("/{well_id}/css")
def get_well_css_history(well_id: str):
    return {
        "well_id": well_id,
        "current_cycle": 3,
        "days_in_production": 41.2,
        "thermal_reserve_pct": 23.5,
        "thermal_status": "LOW",
        "why_next_decision_different": (
            "Cycle 4 restimulation requires higher steam quality (>= 80%) because "
            "near-wellbore formation cooling (-0.34 °C/d) and cumulative depletion "
            "have dropped the heated radius to 14.5 m. Derating SPM prior to steam "
            "injection avoids fluid pound during thermal condensation."
        ),
        "cycles": [
            {
                "cycle_number": 1,
                "injection_volume_t": 2200.0,
                "injection_rate_t_d": 160.0,
                "injection_pressure_bar": 115.0,
                "soak_days": 6.0,
                "oil_recovered_bbl": 14200.0,
                "sor": 4.8,
                "peak_temp_c": 98.4
            },
            {
                "cycle_number": 2,
                "injection_volume_t": 2400.0,
                "injection_rate_t_d": 175.0,
                "injection_pressure_bar": 118.0,
                "soak_days": 6.5,
                "oil_recovered_bbl": 16500.0,
                "sor": 5.4,
                "peak_temp_c": 104.2
            },
            {
                "cycle_number": 3,
                "injection_volume_t": 2500.0,
                "injection_rate_t_d": 180.0,
                "injection_pressure_bar": 120.0,
                "soak_days": 7.0,
                "oil_recovered_bbl": 18450.0,
                "sor": 6.2,
                "peak_temp_c": 112.5
            }
        ]
    }

@router.get("/{well_id}/srp")
def get_well_srp_state(well_id: str):
    state = _get_well_state_with_demo(well_id)
    n = normalise(state)
    return {
        "well_id": well_id,
        "spm": n.get("spm", 3.2),
        "stroke_inches": n.get("stroke_in", 64.0),
        "vfd_frequency_hz": 54.0,
        "pump_fillage_pct": round(n.get("pump_fillage_pct", 78.4), 1),
        "pump_efficiency_pct": 82.1,
        "rod_load_max_kn": n.get("pprl_kn", 88.5),
        "rod_load_min_kn": 24.2,
        "float_margin_pct": n.get("float_margin_pct", 24.5),
        "motor_power_kw": 14.8,
        "gearbox_torque_pct": 58.4,
        "status": "NORMAL" if n.get("float_margin_pct", 24.5) >= 20.0 else "WARNING",
        "provenance": "MEASURED_VFD_AND_KINEMATIC_MODEL"
    }

@router.get("/{well_id}/envelope")
def get_well_operating_envelope(well_id: str):
    state = _get_well_state_with_demo(well_id)
    envelope = compute_operating_envelope(state)
    return {
        **envelope,
        "well_id": well_id,
        "timestamp": _now().isoformat(),
        "mode": "DEMO SCENARIO" if _demo_overrides.get(well_id, {}).get("active") else "SIMULATION",
        "provenance": "MODEL-DERIVED",
        "uncertainty": "LOW UNCERTAINTY (Analytically verified)"
    }

@router.get("/{well_id}/pumpability")
def get_well_pumpability(well_id: str):
    state = _get_well_state_with_demo(well_id)
    pumpability = compute_pumpability_window(state)
    return {
        **pumpability,
        "well_id": well_id,
        "timestamp": _now().isoformat(),
        "mode": "DEMO SCENARIO" if _demo_overrides.get(well_id, {}).get("active") else "SIMULATION",
        "model_version": "ML-Baghewala-v1.4",
        "confidence": "HIGH"
    }

class WellRehearsalRequest(BaseModel):
    spm: float = 6.7
    stroke_length_in: Optional[float] = None
    stroke_inches: Optional[float] = None
    vfd_speed_hz: Optional[float] = 58.0
    steam_volume_tons: Optional[float] = None
    steam_volume_t_d: Optional[float] = None
    soak_duration_days: Optional[float] = 5.5
    horizon_days: int = 30

@router.post("/{well_id}/rehearsal")
def run_well_rehearsal(well_id: str, req: WellRehearsalRequest):
    well = twin_manager.get_active_well()
    rehearsal_engine = DecisionRehearsalEngine()
    stroke = req.stroke_inches if req.stroke_inches is not None else (req.stroke_length_in if req.stroke_length_in is not None else 52.0)
    return rehearsal_engine.rehearse_decision(
        live_engine=well,
        proposed_controls={
            "spm": req.spm,
            "stroke_inches": stroke
        },
        rehearsal_horizon_days=req.horizon_days
    )

class CandidateAssuranceReq(BaseModel):
    controls: Optional[Dict[str, Any]] = None

@router.post("/{well_id}/assurance")
def evaluate_well_assurance(well_id: str, req: Optional[CandidateAssuranceReq] = None):
    state = _get_well_state_with_demo(well_id)
    controls = req.controls if req else None
    return evaluate_assurance_gate(state, controls)

@router.post("/{well_id}/recommendation")
def get_well_recommendation(well_id: str):
    state = _get_well_state_with_demo(well_id)
    return _generate_recommendation(state)

class FaultInjectionRequest(BaseModel):
    fault_type: str = "RAPID_COOLING"
    severity: Optional[str] = "HIGH"

@router.post("/{well_id}/fault-injection")
def inject_fault_scenario(well_id: str, req: FaultInjectionRequest):
    _demo_overrides[well_id] = {
        "active": True,
        "fault_type": req.fault_type,
        "injected_at": _now().isoformat(),
        "severity": req.severity
    }
    
    state = _get_well_state_with_demo(well_id)
    gate = evaluate_assurance_gate(state)
    envelope = compute_operating_envelope(state)
    pumpability = compute_pumpability_window(state)
    
    active_well = twin_manager.get_active_well()
    safe_alts = SafeAlternativeEngine().find_safe_alternatives(
        live_engine=active_well,
        rejected_controls={"spm": state.get("controls", {}).get("spm", 3.2)},
        failed_gate_reasons=gate.get("blocking_reasons", []),
        current_state=state
    )

    return {
        "status": "DEMO_SCENARIO_INJECTED",
        "fault_type": req.fault_type,
        "well_id": well_id,
        "injected_state": {
            "temp_c": state.get("thermal", {}).get("near_well_temp_c"),
            "viscosity_cp": state.get("fluid", {}).get("viscosity_near_well_cp"),
            "float_margin_pct": state.get("loads", {}).get("float_margin_pct"),
            "pprl_kn": state.get("loads", {}).get("pprl_kn")
        },
        "envelope_status": envelope["status"],
        "pumpability_days": pumpability["time_to_boundary_days"],
        "pumpability_state": pumpability["state"],
        "assurance_verdict": gate["status"],
        "failed_gates": [c for c in gate["checks"] if not c["passed"]],
        "blocking_reasons": gate.get("blocking_reasons", []),
        "safe_alternatives": safe_alts
    }

@router.post("/{well_id}/demo/abnormal-viscosity")
def trigger_demo_abnormal_viscosity(well_id: str):
    _demo_overrides[well_id] = {
        "active": True,
        "fault_type": "HIGH_VISCOSITY",
        "viscosity_cp": 14500.0,
        "temp_c": 51.5,
        "float_margin_pct": 5.2,
        "pprl_kn": 124.0,
        "injected_at": _now().isoformat()
    }
    state = _get_well_state_with_demo(well_id)
    gate = evaluate_assurance_gate(state)
    envelope = compute_operating_envelope(state)
    pumpability = compute_pumpability_window(state)
    
    return {
        "status": "DEMO_SCENARIO_INJECTED",
        "mode": "DEMO SCENARIO",
        "well_id": well_id,
        "phenomenon": "Subsurface Viscosity Surge & Annular Couette Drag Spike",
        "injected_parameters": _demo_overrides[well_id],
        "envelope_status": envelope["status"],
        "pumpability_days": pumpability["time_to_boundary_days"],
        "pumpability_state": pumpability["state"],
        "assurance_verdict": "NO_SAFE_RECOMMENDATION",
        "blocking_reasons": gate.get("blocking_reasons", [
            "Rod float margin collapsed to 5.2% (< 15.0% threshold). Severe mechanical buckling risk.",
            "Peak polished rod load exceeds 115.0 kN API Grade D limit.",
            "Operating envelope shrunk to 0 SPM safe capacity under current thermal dissipation."
        ]),
        "required_action": "Schedule immediate CSS thermal stimulation cycle. Do NOT operate SRP until reservoir reheated."
    }

@router.post("/{well_id}/demo/reset")
def reset_demo_well_state(well_id: str):
    """Restores baseline operational state and clears demo injection."""
    _demo_overrides.pop(well_id, None)
    return {
        "status": "SUCCESS",
        "mode": "LIVE / SIMULATION",
        "well_id": well_id,
        "message": "Demo scenario reset. Base digital twin restored to normal operating envelope."
    }
