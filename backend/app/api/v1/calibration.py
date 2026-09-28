"""
backend/app/api/v1/calibration.py - Parameter Calibration, Field Data Import, and Sensor Quality REST Endpoints.
"""

from fastapi import APIRouter, HTTPException, UploadFile, File
from typing import Dict, Any, List, Optional
from pydantic import BaseModel

from backend.app.calibration.engine import CalibrationEngine
from backend.app.calibration.sensor_quality import SensorQualityEngine
from backend.app.calibration.reconciliation import OutcomeReconciliationEngine
from backend.app.calibration.field_import import FieldDataImporter
from backend.app.twin.engine import twin_manager

router = APIRouter(prefix="/calibration", tags=["Calibration"])

calib_engine = CalibrationEngine()
sensor_engine = SensorQualityEngine()
reconcile_engine = OutcomeReconciliationEngine()
importer = FieldDataImporter()

class ViscosityFitRequest(BaseModel):
    temperatures_c: List[float]
    viscosities_cp: List[float]
    t_ref_c: float = 20.0
    apply_to_active_well: bool = False

class PermeabilityFitRequest(BaseModel):
    rates_m3_d: List[float]
    drawdowns_bar: List[float]
    viscosity_cp: float = 120.0
    apply_to_active_well: bool = False

class ReconcileRequest(BaseModel):
    predicted_oil_bpd: List[float]
    actual_oil_bpd: List[float]

class SensorScreenRequest(BaseModel):
    channel_name: str
    values: List[float]
    min_bound: float
    max_bound: float

@router.post("/fit-viscosity")
def fit_viscosity(req: ViscosityFitRequest) -> Dict[str, Any]:
    res = calib_engine.fit_viscosity_curve(req.temperatures_c, req.viscosities_cp, req.t_ref_c)
    if res.get("success") and req.apply_to_active_well:
        fitted = res["fitted_parameters"]
        well = twin_manager.get_active_well()
        well.set_parameter("mu_ref_cp", fitted["mu_ref_cp"])
        well.set_parameter("t_ref_c", fitted["t_ref_c"])
        well.set_parameter("visc_energy_b", fitted["activation_energy_b"])
    return res

@router.post("/fit-permeability")
def fit_permeability(req: PermeabilityFitRequest) -> Dict[str, Any]:
    res = calib_engine.fit_permeability(req.rates_m3_d, req.drawdowns_bar, req.viscosity_cp)
    if res.get("success") and req.apply_to_active_well:
        well = twin_manager.get_active_well()
        well.set_parameter("perm_md", res["estimated_permeability_md"])
    return res

@router.post("/reconcile")
def reconcile_production(req: ReconcileRequest) -> Dict[str, Any]:
    return reconcile_engine.reconcile_production(req.predicted_oil_bpd, req.actual_oil_bpd)

@router.post("/screen-sensor")
def screen_sensor(req: SensorScreenRequest) -> Dict[str, Any]:
    return sensor_engine.screen_channel(req.channel_name, req.values, req.min_bound, req.max_bound)

@router.post("/import-csv-text")
def import_csv_text(payload: Dict[str, str]) -> Dict[str, Any]:
    csv_content = payload.get("csv_text", "")
    return importer.parse_csv(csv_content)
