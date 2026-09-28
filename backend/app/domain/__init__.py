"""
backend/app/domain/__init__.py
Clean exports for ASSURE-TWIN domain models, exceptions, and business rules.
"""

from .models import (
    CSSPhase,
    RodFloatStatus,
    RecommendationStatus,
    AssuranceGateVerdict,
    WellSpecification,
    OperatingSetpoints,
    RodMechanicsState,
    ThermalReservoirState,
    OperatingEnvelopeDomain,
    AssuranceCheckpoint,
    DecisionRecommendationDomain
)

from .exceptions import (
    AssureTwinException,
    MechanicalSafetyViolation,
    OutOfDistributionError,
    UnsafeRehearsalError,
    WellNotFoundError,
    StaleCalibrationError
)

from .rules import (
    MIN_FLOAT_MARGIN_PCT,
    RECOMMENDED_FLOAT_MARGIN_PCT,
    MAX_PPRL_KN,
    MAX_GEARBOX_TORQUE_PCT,
    MAX_ECONOMIC_SOR,
    CUTOFF_TEMPERATURE_C,
    MIN_PERMISSIBLE_SPM,
    MAX_PERMISSIBLE_SPM,
    MIN_STROKE_INCHES,
    MAX_STROKE_INCHES,
    validate_operating_controls,
    assert_mechanical_safety,
    evaluate_thermal_feasibility
)

__all__ = [
    "CSSPhase",
    "RodFloatStatus",
    "RecommendationStatus",
    "AssuranceGateVerdict",
    "WellSpecification",
    "OperatingSetpoints",
    "RodMechanicsState",
    "ThermalReservoirState",
    "OperatingEnvelopeDomain",
    "AssuranceCheckpoint",
    "DecisionRecommendationDomain",
    "AssureTwinException",
    "MechanicalSafetyViolation",
    "OutOfDistributionError",
    "UnsafeRehearsalError",
    "WellNotFoundError",
    "StaleCalibrationError",
    "MIN_FLOAT_MARGIN_PCT",
    "RECOMMENDED_FLOAT_MARGIN_PCT",
    "MAX_PPRL_KN",
    "MAX_GEARBOX_TORQUE_PCT",
    "MAX_ECONOMIC_SOR",
    "CUTOFF_TEMPERATURE_C",
    "MIN_PERMISSIBLE_SPM",
    "MAX_PERMISSIBLE_SPM",
    "MIN_STROKE_INCHES",
    "MAX_STROKE_INCHES",
    "validate_operating_controls",
    "assert_mechanical_safety",
    "evaluate_thermal_feasibility"
]
