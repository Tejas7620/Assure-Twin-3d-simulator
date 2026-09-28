"""
backend/app/domain/rules.py
Petroleum engineering domain rules and boundary invariants for ASSURE-TWIN.
Governs mechanical sucker rod integrity (API RP 11L), thermal thresholds, and OOD limits.
"""

from typing import Dict, Any, Tuple, List
from .exceptions import MechanicalSafetyViolation, OutOfDistributionError

# Petroleum & Mechanical Engineering Constants
MIN_FLOAT_MARGIN_PCT = 10.0      # Absolute mechanical minimum to avoid rod buckling
RECOMMENDED_FLOAT_MARGIN_PCT = 15.0 # Normal operational safety target
MAX_PPRL_KN = 115.0              # API Grade D sucker rod yield threshold (7/8" top taper)
MAX_GEARBOX_TORQUE_PCT = 100.0   # API C-912 nominal gearbox torque limit
MAX_ECONOMIC_SOR = 4.5           # Steam-Oil Ratio economic limit for Baghewala heavy oil
CUTOFF_TEMPERATURE_C = 58.0      # Critical production temperature before viscosity spike
MIN_PERMISSIBLE_SPM = 0.5        # Minimum VFD operating frequency equivalent
MAX_PERMISSIBLE_SPM = 8.0        # Maximum pumping speed for high-viscosity crude
MIN_STROKE_INCHES = 40.0         # Minimum surface pumpjack stroke
MAX_STROKE_INCHES = 120.0        # Maximum surface pumpjack stroke


def validate_operating_controls(spm: float, stroke_inches: float) -> Tuple[bool, List[str]]:
    """
    Validates whether proposed surface pumping setpoints reside within
    valid mechanical and physical limits.
    """
    violations = []
    if spm < MIN_PERMISSIBLE_SPM or spm > MAX_PERMISSIBLE_SPM:
        violations.append(
            f"SPM {spm:.2f} is outside permissible physical operating range [{MIN_PERMISSIBLE_SPM}, {MAX_PERMISSIBLE_SPM}]."
        )
    if stroke_inches < MIN_STROKE_INCHES or stroke_inches > MAX_STROKE_INCHES:
        violations.append(
            f"Stroke length {stroke_inches:.1f}\" is outside mechanical unit capabilities [{MIN_STROKE_INCHES}\", {MAX_STROKE_INCHES}\"]."
        )
    return len(violations) == 0, violations


def assert_mechanical_safety(float_margin_pct: float, pprl_kn: float) -> None:
    """
    Asserts that real-time or candidate loads do not compromise rod integrity.
    Raises MechanicalSafetyViolation if critical safety boundaries are crossed.
    """
    if float_margin_pct < MIN_FLOAT_MARGIN_PCT:
        raise MechanicalSafetyViolation(
            f"Rod float margin collapsed to {float_margin_pct:.1f}% (< {MIN_FLOAT_MARGIN_PCT}% threshold). "
            f"Severe compression and buckling risk in heavy crude.",
            float_margin_pct=float_margin_pct
        )
    if pprl_kn > MAX_PPRL_KN:
        raise MechanicalSafetyViolation(
            f"Peak polished rod load {pprl_kn:.1f} kN exceeds API Grade D rod rating ({MAX_PPRL_KN} kN).",
            float_margin_pct=float_margin_pct
        )


def evaluate_thermal_feasibility(near_well_temp_c: float, sor: float) -> Tuple[bool, str]:
    """
    Evaluates whether the well has sufficient thermodynamic energy to remain in production.
    """
    if near_well_temp_c < CUTOFF_TEMPERATURE_C:
        return False, (
            f"Near-well temperature {near_well_temp_c:.1f}°C is below critical {CUTOFF_TEMPERATURE_C}°C cutoff. "
            f"Viscosity surge will cause annular fluid drag and rod float."
        )
    if sor > MAX_ECONOMIC_SOR:
        return False, (
            f"Steam-to-oil ratio {sor:.2f} exceeds economic boundary ({MAX_ECONOMIC_SOR}). "
            f"Excessive steam consumption relative to crude recovery."
        )
    return True, "Thermal conditions within safe operating limits."
