"""
backend/app/api/v1/dynacard.py
Real Dynamometer Card Feature Extraction, Anomaly Detection & Diagnostic Classification.
SIH 2026 - Problem Statement 26120.
"""

from fastapi import APIRouter
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field

from backend.app.twin.engine import twin_manager
from backend.app.simulation.manager import get_sim_engine
from backend.app.physics.dynamometer import DynamometerModel
from backend.app.ai.dyno_classifier import DynoCardClassifier

router = APIRouter(prefix="/dynacard", tags=["Dynamometer Card"])

classifier = DynoCardClassifier()
dyno_model = DynamometerModel(num_points=72)

class DynacardAnalyzeRequest(BaseModel):
    well_id: str = "BGW-17A"
    surface_points: Optional[List[Dict[str, float]]] = None
    spm: Optional[float] = None
    stroke_inches: Optional[float] = None

@router.post("/analyze")
def analyze_dynamometer_card(req: DynacardAnalyzeRequest) -> Dict[str, Any]:
    # 1. Fetch current twin or simulation state
    try:
        active_well = twin_manager.get_active_well()
        state = active_well.step(0.0)
    except Exception:
        sim = get_sim_engine()
        state = sim.step(0.0)

    spm = req.spm if req.spm is not None else float(state.get("controls", {}).get("spm", 3.2))
    stroke = req.stroke_inches if req.stroke_inches is not None else float(state.get("controls", {}).get("stroke_inches", 64.0))
    float_margin = float(state.get("loads", {}).get("float_margin_pct", state.get("srp", {}).get("float_margin_pct", 24.5)))
    pump_fillage = float(state.get("pump", {}).get("pump_fillage", 0.78))
    rod_float_status = state.get("loads", {}).get("rod_float_status", "NORMAL" if float_margin > 18 else ("WARNING" if float_margin > 10 else "FLOATING"))
    viscosity = float(state.get("fluid", {}).get("viscosity_near_well_cp", state.get("reservoir", {}).get("viscosity_cp", 1840.0)))

    # 2. Use supplied surface points or synthesize with physical dynamometer model
    if req.surface_points and len(req.surface_points) >= 16:
        surface_card = req.surface_points
        pump_card = []
        is_synthetic = False
    else:
        # Calculate mechanical parameters from physics
        buoyant_w = 42.0
        fluid_load = 18.5
        up_drag = min(12.0, 1.2 + (viscosity / 1840.0) * 1.5)
        down_drag = min(14.0, 1.4 + (viscosity / 1840.0) * 1.8)
        accel_up = min(0.35, (spm / 10.0) ** 2 * (stroke / 64.0) * 0.25)
        accel_down = accel_up
        pound_magnitude = max(0.0, (0.85 - pump_fillage) * 35.0)

        cards = dyno_model.generate_cards(
            stroke_inches=stroke,
            spm=spm,
            buoyant_weight_kn=buoyant_w,
            fluid_load_kn=fluid_load,
            upstroke_drag_kn=up_drag,
            downstroke_drag_kn=down_drag,
            upstroke_accel_factor=accel_up,
            downstroke_accel_factor=accel_down,
            pump_fillage=pump_fillage,
            rod_float_status=rod_float_status,
            fluid_pound_magnitude_kn=pound_magnitude
        )
        surface_card = cards["surface_card"]
        pump_card = cards["pump_card"]
        is_synthetic = True

    # 3. Extract card geometric features
    loads = [p["load_kn"] for p in surface_card]
    positions = [p["pos_in"] for p in surface_card]
    pprl_kn = round(max(loads), 1)
    mprl_kn = round(min(loads), 1)
    load_range_kn = round(pprl_kn - mprl_kn, 1)

    # Cyclic work calculation (trapezoidal integration of polygon area)
    work_area = 0.0
    for i in range(len(surface_card) - 1):
        dx = (positions[i+1] - positions[i]) * 0.0254 # m
        avg_f = (loads[i+1] + loads[i]) * 0.5 * 1000.0 # N
        work_area += avg_f * dx
    cyclic_work_kj = round(abs(work_area) / 1000.0, 2)

    # 4. Diagnostic Pattern Classification
    pound_mag = max(0.0, (0.85 - pump_fillage) * 35.0)
    classification = classifier.classify_card(
        surface_card_points=surface_card,
        pump_fillage=pump_fillage,
        float_margin_pct=float_margin,
        rod_float_status=rod_float_status,
        fluid_pound_magnitude_kn=pound_mag
    )

    # 5. Physical Interpretation & Assurance Impact
    diagnosis = classification["diagnosis"]
    if diagnosis == "HEAVY_OIL_ROD_FLOAT":
        assurance_impact = "Gate 6 Rod Float FAIL — Annular drag exceeds buoyant fall velocity"
        gate_status = "FAIL"
    elif diagnosis == "FLUID_POUND":
        assurance_impact = "Gate 7 Pump Clearance / Fillage WARNING — Deceleration shock during downstroke"
        gate_status = "WARN"
    elif diagnosis in ["LEAKING_TRAVELING_VALVE", "LEAKING_STANDING_VALVE"]:
        assurance_impact = "Gate 9 Volumetric Efficiency WARNING — Valve seal leakage detected"
        gate_status = "WARN"
    else:
        assurance_impact = "All Dynacard Mechanical Gates PASS — Normal load transmission loop"
        gate_status = "PASS"

    return {
        "well_id": req.well_id,
        "is_synthetic": is_synthetic,
        "provenance": "SYNTHETIC_API_RP11L" if is_synthetic else "SCADA_DYNACARD_TELEMETRY",
        "surface_card": surface_card,
        "pump_card": pump_card,
        "features": {
            "pprl_kn": pprl_kn,
            "mprl_kn": mprl_kn,
            "load_range_kn": load_range_kn,
            "cyclic_work_kj": cyclic_work_kj,
            "estimated_pump_fillage_pct": round(pump_fillage * 100.0, 1),
            "float_margin_pct": round(float_margin, 1)
        },
        "diagnosis": classification["diagnosis"],
        "confidence": classification["confidence"],
        "probabilities": classification["probabilities"],
        "physical_interpretation": classification["explanation"],
        "assurance_impact": assurance_impact,
        "gate_status": gate_status
    }
