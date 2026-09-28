"""
backend/app/domain/models.py
Domain models and value objects for ASSURE-TWIN.
Pure Python dataclasses encapsulating core petroleum engineering domain entities.
"""

from __future__ import annotations
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from enum import Enum


class CSSPhase(str, Enum):
    INJECTION = "INJECTION"
    SOAK = "SOAK"
    PRODUCTION = "PRODUCTION"
    COOLING = "COOLING"
    DEPLETED = "DEPLETED"


class RodFloatStatus(str, Enum):
    SAFE = "SAFE"
    WARNING = "WARNING"
    FLOATING = "FLOATING"
    CRITICAL_BUCKLING = "CRITICAL_BUCKLING"


class RecommendationStatus(str, Enum):
    AWAITING_APPROVAL = "AWAITING_APPROVAL"
    APPROVED_BY_ENGINEER = "APPROVED_BY_ENGINEER"
    REJECTED_BY_ENGINEER = "REJECTED_BY_ENGINEER"
    NO_SAFE_RECOMMENDATION = "NO_SAFE_RECOMMENDATION"
    EXECUTED = "EXECUTED"


class AssuranceGateVerdict(str, Enum):
    PASSED = "PASSED"
    PASSED_WITH_WARNINGS = "PASSED_WITH_WARNINGS"
    FAILED = "FAILED"
    ABSTAINED = "ABSTAINED"


@dataclass(frozen=True)
class WellSpecification:
    """Subsurface asset physical design and completion geometry."""
    well_id: str
    field_name: str = "Baghewala Heavy Oil Field"
    formation: str = "Jodhpur Sandstone"
    tvd_m: float = 1420.0
    md_m: float = 1840.0
    casing_od_in: float = 7.0
    tubing_od_in: float = 2.875
    pump_depth_m: float = 1420.0
    pump_diameter_in: float = 1.75
    api_gravity: float = 11.2
    permeability_md: float = 1250.0
    initial_pressure_bar: float = 68.4
    native_temperature_c: float = 38.0


@dataclass(frozen=True)
class OperatingSetpoints:
    """Control setpoints applied to surface pumping unit and thermal injection."""
    spm: float
    stroke_length_in: float
    steam_rate_t_d: float = 180.0
    steam_volume_tons: float = 2400.0
    soak_duration_days: float = 5.0


@dataclass
class RodMechanicsState:
    """Real-time kinematic load state on the sucker rod string."""
    pprl_kn: float
    mprl_kn: float
    buoyant_weight_kn: float
    downstroke_drag_kn: float
    inertia_load_kn: float
    float_margin_pct: float
    rod_status: RodFloatStatus
    is_buckling: bool = False
    gearbox_torque_pct: float = 0.0


@dataclass
class ThermalReservoirState:
    """Thermodynamic state of near-wellbore reservoir sand during CSS."""
    near_well_temp_c: float
    far_field_temp_c: float
    steam_chamber_radius_m: float
    viscosity_near_well_cp: float
    cumulative_heat_loss_gj: float
    current_sor: float
    days_in_phase: float
    active_phase: CSSPhase


@dataclass
class OperatingEnvelopeDomain:
    """Dynamic permissible operating window derived from thermodynamics and mechanics."""
    min_spm: float
    max_spm: float
    recommended_spm: float
    min_stroke_in: float
    max_stroke_in: float
    recommended_stroke_in: float
    current_spm: float
    current_stroke_in: float
    is_within_envelope: bool
    status: str
    thermal_boundary_temp_c: float = 58.0
    days_to_boundary: float = 24.3


@dataclass
class AssuranceCheckpoint:
    """Individual checkpoint verdict within the 12-point zero-trust gatekeeper."""
    id: int
    name: str
    category: str
    passed: bool
    severity: str  # BLOCKING, WARNING, ADVISORY
    actual_value: Any
    threshold: Any
    message: str


@dataclass
class DecisionRecommendationDomain:
    """Explainable decision contract presented to lead petroleum engineers."""
    case_id: str
    well_id: str
    status: RecommendationStatus
    title: str
    proposed_controls: Dict[str, float]
    expected_outcomes: Dict[str, Any]
    causal_reasons_why: List[str]
    counterfactual_rejections: List[str]
    preconditions: List[str]
    assurance_verdict: AssuranceGateVerdict
    blocking_reasons: List[str] = field(default_factory=list)
    required_actions: List[str] = field(default_factory=list)
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    approved_by: Optional[str] = None
    approval_timestamp: Optional[datetime] = None
    rejection_notes: Optional[str] = None
