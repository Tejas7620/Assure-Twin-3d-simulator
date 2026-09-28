"""
backend/app/domain/exceptions.py
Domain-specific exceptions for ASSURE-TWIN digital twin platform.
"""

class AssureTwinException(Exception):
    """Base domain exception for ASSURE-TWIN."""
    def __init__(self, message: str, code: str = "DOMAIN_ERROR"):
        super().__init__(message)
        self.message = message
        self.code = code


class MechanicalSafetyViolation(AssureTwinException):
    """Raised when an operating condition violates mechanical safety constraints (e.g. rod float < 10%)."""
    def __init__(self, message: str, float_margin_pct: float = 0.0):
        super().__init__(message, code="MECHANICAL_SAFETY_VIOLATION")
        self.float_margin_pct = float_margin_pct


class OutOfDistributionError(AssureTwinException):
    """Raised when operating setpoints or sensor telemetry fall outside the verified training distribution."""
    def __init__(self, message: str, mahalanobis_distance: float = 0.0):
        super().__init__(message, code="OUT_OF_DISTRIBUTION")
        self.mahalanobis_distance = mahalanobis_distance


class UnsafeRehearsalError(AssureTwinException):
    """Raised when a 21-day digital twin forward trial encounters limit boundary violations."""
    def __init__(self, message: str, violation_count: int = 0):
        super().__init__(message, code="UNSAFE_REHEARSAL")
        self.violation_count = violation_count


class WellNotFoundError(AssureTwinException):
    """Raised when a queried well asset ID does not exist in the field hierarchy."""
    def __init__(self, well_id: str):
        super().__init__(f"Well asset '{well_id}' not found in registry.", code="WELL_NOT_FOUND")
        self.well_id = well_id


class StaleCalibrationError(AssureTwinException):
    """Raised when physical calibration coefficients have exceeded their valid operational window."""
    def __init__(self, message: str):
        super().__init__(message, code="STALE_CALIBRATION")
