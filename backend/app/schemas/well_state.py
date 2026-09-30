"""
backend/app/schemas/well_state.py
Canonical WellState Domain Model for ASSURE-TWIN.
Explicitly defines the full cyber-physical state across Reservoir, Fluid,
Wellbore, SRP, Production, Reliability, and Model Metadata tiers.
"""

from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone

def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

class WellIdentity(BaseModel):
    field_id: str = "BAGHEWALA-ASSET"
    well_id: str = "BGW-17A"
    well_name: str = "BGW-17A (Heavy Oil Thermal Producer)"
    timestamp: str = Field(default_factory=utc_now_iso)

class ReservoirState(BaseModel):
    reservoir_pressure_bar: float = 68.4
    reservoir_temperature_c: float = 38.0
    near_well_temperature_c: float = 72.8
    productivity_index_bpd_bar: float = 0.52
    thermal_reserve_pct: float = 23.5
    thermal_reserve_category: str = "LOW"  # HIGH, MODERATE, LOW, CRITICAL
    days_since_css: float = 41.2
    thermal_front_radius_m: float = 14.5
    cooling_rate_c_per_day: float = 0.34

class FluidState(BaseModel):
    viscosity_cp: float = 1840.0
    viscosity_temperature_sensitivity_b: float = 4650.0  # Andrade activation energy constant
    density_kg_m3: float = 992.0
    water_cut: float = 0.128
    api_gravity: float = 11.2
    bubble_point_bar: float = 18.0

class WellboreState(BaseModel):
    bottomhole_pressure_bar: float = 18.2
    pump_intake_pressure_bar: float = 16.8
    fluid_level_m: float = 973.0
    tubing_temperature_c: float = 68.4
    rod_string_temperature_c: float = 64.2
    casinghead_pressure_bar: float = 3.2
    perforation_depth_tvd_m: float = 1420.0

class SRPState(BaseModel):
    spm: float = 3.2
    stroke_length_in: float = 64.0
    stroke_length_m: float = 1.6256
    vfd_frequency_hz: float = 54.0
    pump_fillage_pct: float = 78.4
    pump_efficiency_pct: float = 82.1
    rod_load_max_kn: float = 88.5
    rod_load_min_kn: float = 24.2
    motor_load_pct: float = 68.0
    motor_power_kw: float = 14.8
    rod_float_margin_pct: float = 24.5
    rod_viscous_drag_kn: float = 1.85
    impact_loading_index: float = 0.12  # Fluid pound deceleration severity
    gearbox_torque_pct: float = 58.4

class ProductionState(BaseModel):
    oil_rate_bopd: float = 32.6
    liquid_rate_bpd: float = 37.4
    water_cut_pct: float = 12.8
    cumulative_oil_bbl: float = 18450.0
    steam_rate_t_d: float = 42.3
    steam_volume_tons: float = 2500.0
    sor: float = 6.2
    energy_per_barrel_kwh: float = 14.8
    daily_gross_revenue_usd: float = 2445.0
    daily_operating_cost_usd: float = 880.0
    daily_net_profit_usd: float = 1565.0

class ReliabilityState(BaseModel):
    rod_failure_risk: float = 0.14  # 0.0 to 1.0 probability
    pump_failure_risk: float = 0.08
    pump_unsetting_risk: float = 0.04
    anomaly_score: float = 0.06
    health_index: float = 88.5  # 0 to 100
    mtbf_days: float = 245.0
    downtime_hours_ytd: float = 18.5
    risk_level: str = "HEALTHY_OPTIMAL"  # HEALTHY_OPTIMAL, MODERATE_NORMAL, ELEVATED_RISK, CRITICAL_ACTION_REQUIRED

class ModelMetadata(BaseModel):
    state_source: str = "COUPLED_PHYSICS_ENGINE"
    provenance: str = "MODEL-DERIVED"  # MEASURED, PUBLIC, CALIBRATED, ASSUMED, SYNTHETIC, PREDICTED, MODEL-DERIVED, DEMO
    state_confidence: float = 0.94
    model_versions: Dict[str, str] = Field(default_factory=lambda: {
        "thermal_model": "MarxLangenheim-v3.2",
        "inflow_model": "VogelComposite-v2.1",
        "kinematics_engine": "API-RP11L-4Bar-v2.4",
        "drag_model": "CouetteAnnular-v2.0",
        "ml_surrogate": "RandomForest-HoldoutEvaluated-v1.7",
        "assurance_gatekeeper": "Assure12Gate-v3.0"
    })
    ood_status: str = "IN_DOMAIN"  # IN_DOMAIN, NEAR_BOUNDARY, OUT_OF_DOMAIN
    physics_ml_delta_pct: float = 4.2
    last_calibration: str = "2026-09-15T08:00:00Z"
    provenance_badges: Dict[str, str] = Field(default_factory=lambda: {
        "temperature": "MODEL-DERIVED",
        "pressure": "MODEL-DERIVED",
        "viscosity": "CALIBRATED",
        "spm": "MEASURED",
        "stroke": "MEASURED",
        "oil_rate": "MODEL-DERIVED",
        "steam_volume": "DEMO"
    })

class CanonicalWellState(BaseModel):
    identity: WellIdentity = Field(default_factory=WellIdentity)
    reservoir: ReservoirState = Field(default_factory=ReservoirState)
    fluid: FluidState = Field(default_factory=FluidState)
    wellbore: WellboreState = Field(default_factory=WellboreState)
    srp: SRPState = Field(default_factory=SRPState)
    production: ProductionState = Field(default_factory=ProductionState)
    reliability: ReliabilityState = Field(default_factory=ReliabilityState)
    metadata: ModelMetadata = Field(default_factory=ModelMetadata)
