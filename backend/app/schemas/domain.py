"""
backend/app/schemas/domain.py
Pydantic v2 Schemas for Requests, Responses, and Operational Data Contracts.
"""

from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone

def utc_now() -> datetime:
    return datetime.now(timezone.utc)

class StatusResponse(BaseModel):
    status: str
    message: Optional[str] = None
    timestamp: datetime = Field(default_factory=utc_now)

class FieldResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    description: Optional[str] = None
    location: Optional[str] = None
    created_at: datetime

class WellResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    field_id: str
    well_name: str
    well_api_id: str
    status: str
    depth: float
    tvd: float
    md: float
    completion_type: str
    pump_type: str
    created_at: datetime

class ControlRequest(BaseModel):
    param: str
    value: Any

class SetControlsRequest(BaseModel):
    spm: Optional[float] = None
    stroke_length_in: Optional[float] = None
    vfd_speed_hz: Optional[float] = None
    steam_volume_t_d: Optional[float] = None
    water_cut: Optional[float] = None
    flowing_pwf_bar: Optional[float] = None

class VirtualSensorItem(BaseModel):
    name: str
    value: float
    unit: str
    lower_bound: float
    upper_bound: float
    confidence: str # HIGH, MEDIUM, LOW
    source: str
    inputs: List[str]

class VirtualDownholeStateResponse(BaseModel):
    well_id: str
    timestamp: datetime
    sensors: Dict[str, VirtualSensorItem]

class PumpabilityResponse(BaseModel):
    well_id: str
    time_to_boundary_days: float
    state: str # SAFE, WARNING, CRITICAL
    critical_limiting_factor: str
    decay_rate_days_per_day: float
    status_badge: str
    provenance: str

class OperatingEnvelopeResponse(BaseModel):
    well_id: str
    current_temp_c: float
    current_spm: float
    preferred_spm_min: float
    preferred_spm_max: float
    warning_spm_min: float
    warning_spm_max: float
    critical_spm_upper: float
    status: str
    shrinkage_factor_pct: float

class ForecastPointSchema(BaseModel):
    day: int
    temperature: float
    viscosity: float
    oil_rate: float
    sor: float
    energy: float
    pump_fillage: float
    rod_load: float
    float_margin: float
    confidence_lower: float
    confidence_upper: float

class ForecastResponse(BaseModel):
    well_id: str
    horizon_days: int
    points: List[ForecastPointSchema]
    generated_at: datetime

class ScenarioResultSchema(BaseModel):
    scenario_id: str
    name: str
    type: str
    oil_rate: float
    sor: float
    steam_rate: float
    energy_kw: float
    float_margin_pct: float
    pumpability_days: float
    robustness: str
    assurance_pass: bool

class ScenariosComparisonResponse(BaseModel):
    well_id: str
    scenarios: List[ScenarioResultSchema]

class CustomRehearsalRequest(BaseModel):
    well_id: str = "BGW-17A"
    spm: float = 2.8
    stroke_length_in: float = 74.0
    vfd_speed_hz: float = 55.0
    steam_volume_tons: float = 2400.0
    soak_duration_days: float = 5.0

class OptimizationWeights(BaseModel):
    crude_revenue: float = 1.0
    steam_penalty: float = 0.45
    power_penalty: float = 0.15
    mechanical_risk: float = 0.85

class OptimizationRequest(BaseModel):
    well_id: str = "BGW-17A"
    weights: OptimizationWeights = Field(default_factory=OptimizationWeights)

class OptimizationCandidateSchema(BaseModel):
    candidate_id: str
    title: str
    spm: float
    stroke_in: float
    steam_volume_tons: float
    projected_gain_bopd: float
    sor: float
    float_margin_pct: float
    pumpability_days: float
    robustness: str
    overall_score: float

class OptimizationResponse(BaseModel):
    well_id: str
    best_candidate: OptimizationCandidateSchema
    candidates: List[OptimizationCandidateSchema]
    solver_rationale: str

class AssuranceGateCheckSchema(BaseModel):
    id: int
    name: str
    category: str
    passed: bool = Field(default=True, alias="passed")
    status: str # PASS, WARNING, FAIL
    detail: str

class AssuranceResponse(BaseModel):
    well_id: str
    status: str # VERIFIED FOR ENGINEER REVIEW, NO SAFE RECOMMENDATION
    overall_pass: bool
    gate_score_pct: float
    checks: List[AssuranceGateCheckSchema]
    abstain_active: bool
    blocking_reasons: List[str]
    required_data: List[str]

class RecommendationCaseResponse(BaseModel):
    case_id: str
    well_id: str
    status: str
    title: str
    proposed_controls: Dict[str, Any]
    expected_outcomes: Dict[str, Any]
    causal_reasons_why: List[str]
    counterfactual_rejections_why_not: List[str]
    preconditions: List[str]
    assurance_status: str
    created_at: datetime
    approved_by: Optional[str] = None
    approval_timestamp: Optional[datetime] = None

class RecommendationActionRequest(BaseModel):
    actor: str = "Senior Production Engineer (ONGC / Baghewala Asset)"
    notes: Optional[str] = None

class AlertSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    well_id: str
    severity: str
    title: str
    description: str
    value: Optional[float] = None
    threshold: Optional[float] = None
    status: str
    created_at: datetime

class AuditEventSchema(BaseModel):
    event_id: str
    timestamp: datetime
    stage: str
    description: str
    passed: bool
