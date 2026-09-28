"""
backend/app/services/calibration_service.py
Application service for Physical Parameter Tuning, Rheology Calibration, and Sensor Screening.
"""

from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from backend.app.calibration.engine import CalibrationEngine
from backend.app.calibration.sensor_quality import SensorQualityEngine
from backend.app.calibration.reconciliation import OutcomeReconciliationEngine
from backend.app.calibration.field_import import FieldDataImporter
from backend.app.repositories.calibration_repo import CalibrationRepository
from backend.app.services.audit_service import AuditService
from backend.app.twin.engine import twin_manager


class CalibrationService:
    def __init__(self, db: Session):
        self.db = db
        self.calib_engine = CalibrationEngine()
        self.sensor_engine = SensorQualityEngine()
        self.reconcile_engine = OutcomeReconciliationEngine()
        self.importer = FieldDataImporter()
        self.calib_repo = CalibrationRepository(db)
        self.audit_service = AuditService(db)

    def calibrate_viscosity_rheology(
        self,
        temperatures_c: List[float],
        viscosities_cp: List[float],
        t_ref_c: float = 20.0,
        apply_to_well: bool = False,
        actor: str = "FIELD_PETROPHYSICIST"
    ) -> Dict[str, Any]:
        result = self.calib_engine.fit_viscosity_curve(temperatures_c, viscosities_cp, t_ref_c)
        if result.get("success"):
            fitted = result["fitted_parameters"]
            # Save run in DB
            self.calib_repo.record_run(
                well_id="BGW-17A",
                run_name="ANDRADE_VISCOSITY_CALIBRATION",
                parameters_tuned={
                    "mu_ref_cp": fitted["mu_ref_cp"],
                    "activation_energy_b": fitted["activation_energy_b"]
                },
                residual_error=result.get("rms_error_cp", 0.0),
                notes="Fitted heavy oil Andrade temperature-viscosity exponential curve."
            )
            # Log audit
            self.audit_service.log_action(
                actor=actor,
                action="CALIBRATE_VISCOSITY_CURVE",
                entity_type="PHYSICS_CALIBRATION",
                entity_id="BGW-17A",
                details=fitted
            )
            if apply_to_well:
                well = twin_manager.get_active_well()
                well.set_parameter("mu_ref_cp", fitted["mu_ref_cp"])
                well.set_parameter("t_ref_c", fitted["t_ref_c"])
                well.set_parameter("visc_energy_b", fitted["activation_energy_b"])

        return result

    def calibrate_permeability(
        self,
        rates_m3_d: List[float],
        drawdowns_bar: List[float],
        viscosity_cp: float = 120.0,
        apply_to_well: bool = False,
        actor: str = "RESERVOIR_ENGINEER"
    ) -> Dict[str, Any]:
        result = self.calib_engine.fit_permeability(rates_m3_d, drawdowns_bar, viscosity_cp)
        if result.get("success"):
            perm = result["estimated_permeability_md"]
            self.calib_repo.record_run(
                well_id="BGW-17A",
                run_name="DARCY_VOGEL_IPR_CALIBRATION",
                parameters_tuned={"perm_md": perm},
                residual_error=result.get("residual_error", 0.0),
                notes="Calibrated formation permeability from steady-state inflow drawdowns."
            )
            self.audit_service.log_action(
                actor=actor,
                action="CALIBRATE_PERMEABILITY",
                entity_type="PHYSICS_CALIBRATION",
                entity_id="BGW-17A",
                details={"perm_md": perm}
            )
            if apply_to_well:
                well = twin_manager.get_active_well()
                well.set_parameter("perm_md", perm)

        return result
