"""
backend/app/api/v1/optimization.py - Multi-Objective Constrained Well-to-Surface Pareto Optimizer Endpoints.
"""

from fastapi import APIRouter
from typing import Dict, Any, Optional
from pydantic import BaseModel

from backend.app.simulation.manager import get_sim_engine
from backend.app.optimization.optimizer import solve_joint_optimization
from backend.app.optimization.joint_optimizer import JointOptimizer
from backend.app.optimization.css_optimizer import CSSOptimizer
from backend.app.optimization.srp_controller import SRPPhysicsController
from backend.app.optimization.vfd_shaping import VFDStrokeShaper
from backend.app.optimization.inflow_limited import InflowLimitedGovernor
from backend.app.schemas.domain import OptimizationRequest, OptimizationResponse
from backend.app.twin.engine import twin_manager

router = APIRouter(prefix="/optimization", tags=["Optimization"])

joint_optimizer = JointOptimizer()
css_optimizer = CSSOptimizer()
srp_controller = SRPPhysicsController()
vfd_shaper = VFDStrokeShaper()
inflow_governor = InflowLimitedGovernor()

@router.post("/solve")
def solve_optimization(req: OptimizationRequest) -> Dict[str, Any]:
    sim = get_sim_engine()
    state = sim.step(0.0)
    return solve_joint_optimization(state, req.weights)

@router.post("/joint")
def run_joint_optimization() -> Dict[str, Any]:
    well = twin_manager.get_active_well()
    state = well.step(0.0)
    return joint_optimizer.run_co_optimization(state)

@router.post("/css")
def run_css_optimization() -> Dict[str, Any]:
    return css_optimizer.optimize()

@router.post("/srp")
def run_srp_controller() -> Dict[str, Any]:
    well = twin_manager.get_active_well()
    state = well.step(0.0)
    return srp_controller.evaluate_setpoint(
        current_spm=state["controls"]["spm"],
        current_stroke_in=state["controls"]["stroke_inches"],
        current_float_margin_pct=state["loads"]["float_margin_pct"],
        current_fillage=state["pump"]["pump_fillage"],
        current_pprl_kn=state["loads"]["pprl_kn"],
        current_viscosity_cp=state["fluid"]["viscosity_near_well_cp"]
    )

@router.post("/vfd")
def run_vfd_profile() -> Dict[str, Any]:
    well = twin_manager.get_active_well()
    state = well.step(0.0)
    return vfd_shaper.calculate_shaping_profile(
        target_spm=state["controls"]["spm"],
        stroke_inches=state["controls"]["stroke_inches"],
        viscosity_cp=state["fluid"]["viscosity_near_well_cp"],
        float_margin_pct=state["loads"]["float_margin_pct"]
    )

@router.post("/inflow-governor")
def run_inflow_governor() -> Dict[str, Any]:
    well = twin_manager.get_active_well()
    state = well.step(0.0)
    return inflow_governor.analyze_well(
        current_spm=state["controls"]["spm"],
        stroke_inches=state["controls"]["stroke_inches"],
        inflow_rate_m3_d=state["inflow"]["q_liquid_m3_d"],
        theoretical_displacement_m3_d=state["pump"]["theoretical_displacement_m3_d"],
        pump_fillage=state["pump"]["pump_fillage"],
        p_wf_bar=state["inflow"]["p_wf_bar"],
        p_res_bar=state["inflow"]["p_res_bar"]
    )
