"""
backend/app/api/v1/simulation.py
Authoritative Physics Simulation REST Endpoints.
"""

from fastapi import APIRouter, HTTPException
from typing import Dict, Any, Optional
from pydantic import BaseModel

from backend.app.simulation.manager import get_sim_engine
from backend.app.schemas.domain import ControlRequest, SetControlsRequest

router = APIRouter(prefix="/simulation", tags=["Simulation"])

class StepRequest(BaseModel):
    dt_sec: float = 0.05

class DemoRequest(BaseModel):
    mode: str = "PHYSICS_DEMO" # PHYSICS_DEMO, SPM_EXPERIMENT

@router.get("/state")
def get_simulation_state() -> Dict[str, Any]:
    sim = get_sim_engine()
    return sim.step(0.0)

@router.post("/step")
def step_simulation(req: StepRequest) -> Dict[str, Any]:
    sim = get_sim_engine()
    state = sim.step(req.dt_sec)
    return state

@router.post("/reset")
def reset_simulation() -> Dict[str, Any]:
    sim = get_sim_engine()
    sim.sim_time_days = 30.0
    sim.spm = 3.2
    sim.stroke_inches = 64.0
    sim.steam_volume_t_d = 42.3
    sim.water_cut = 0.128
    sim.pwf_bar = 18.2
    sim.active_scenario = "JOINT"
    sim.css_phase = "PRODUCTION"
    sim.demo_mode = None
    state = sim.step(0.01)
    return {"message": "Simulation reset to baseline state", "state": state}

@router.post("/control")
def update_single_control(req: ControlRequest) -> Dict[str, Any]:
    sim = get_sim_engine()
    sim.set_control(req.param, req.value)
    state = sim.step(0.01)
    return {"message": f"Updated {req.param} to {req.value}", "state": state}

@router.post("/controls")
def update_multiple_controls(req: SetControlsRequest) -> Dict[str, Any]:
    sim = get_sim_engine()
    if req.spm is not None:
        sim.set_control("spm", req.spm)
    if req.stroke_length_in is not None:
        sim.set_control("stroke_inches", req.stroke_length_in)
    if req.steam_volume_t_d is not None:
        sim.set_control("steam_volume", req.steam_volume_t_d)
    if req.water_cut is not None:
        sim.set_control("water_cut", req.water_cut)
    if req.flowing_pwf_bar is not None:
        sim.set_control("pwf_bar", req.flowing_pwf_bar)
    
    state = sim.step(0.01)
    return {"message": "Controls updated successfully", "state": state}

@router.post("/demo")
def trigger_demo(req: DemoRequest) -> Dict[str, Any]:
    sim = get_sim_engine()
    if req.mode == "PHYSICS_DEMO":
        sim.start_physics_demo()
    elif req.mode == "SPM_EXPERIMENT":
        sim.start_spm_experiment()
    else:
        raise HTTPException(status_code=400, detail=f"Unknown demo mode: {req.mode}")
    return {"message": f"Started demo mode: {req.mode}", "state": sim.step(0.01)}

# --- 43-Parameter Workbench Registry Endpoints ---

from backend.app.twin.engine import twin_manager

@router.get("/parameters")
def get_all_parameters() -> Dict[str, Any]:
    well = twin_manager.get_active_well()
    return {
        "well_id": well.well_id,
        "total_parameters": len(well.params.get_all()),
        "parameters": well.params.to_dict()
    }

@router.put("/parameters/{key}")
def update_parameter(key: str, payload: Dict[str, float]) -> Dict[str, Any]:
    val = payload.get("value")
    if val is None:
        raise HTTPException(status_code=400, detail="Missing 'value' field in payload")
    well = twin_manager.get_active_well()
    ok = well.set_parameter(key, float(val))
    if not ok:
        raise HTTPException(status_code=404, detail=f"Parameter '{key}' not found in registry")
    return {"success": True, "key": key, "new_value": well.params.get_value(key)}

@router.post("/parameters/batch")
def update_parameters_batch(payload: Dict[str, float]) -> Dict[str, Any]:
    well = twin_manager.get_active_well()
    updated = {}
    for k, v in payload.items():
        if well.set_parameter(k, float(v)):
            updated[k] = well.params.get_value(k)
    return {"success": True, "updated_count": len(updated), "updated": updated}

@router.post("/parameters/reset")
def reset_parameters() -> Dict[str, Any]:
    well = twin_manager.get_active_well()
    well.params.reset_to_defaults()
    return {"success": True, "message": "All 43 parameters reset to default baseline values"}

