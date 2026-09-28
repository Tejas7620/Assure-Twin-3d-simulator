"""
request_more_data.py - Data Sufficiency and Sensor Quality Gatekeeper.
Evaluates telemetry freshness, noise variance, flatline faults, and sensor dropouts.
Refuses high-consequence automated recommendations when measurement uncertainty is too high.
"""

from typing import Dict, Any, List

class RequestMoreDataHandler:
    def __init__(self, max_stale_seconds: float = 60.0):
        self.max_stale_sec = float(max_stale_seconds)

    def evaluate_telemetry_sufficiency(
        self,
        has_dynamometer_card: bool,
        card_point_count: int,
        temp_sensor_healthy: bool,
        press_sensor_healthy: bool,
        water_cut_tested: bool,
        telemetry_age_seconds: float = 2.0
    ) -> Dict[str, Any]:
        """
        Determines whether active sensor telemetry is sufficient to support automated decisions.
        """
        data_gaps = []

        if not has_dynamometer_card or card_point_count < 16:
            data_gaps.append("Dynamometer card missing or insufficient resolution (< 16 points)")

        if not temp_sensor_healthy:
            data_gaps.append("Bottomhole / Tubing temperature sensor signal flatlined or noisy")

        if not press_sensor_healthy:
            data_gaps.append("Flowing bottomhole pressure transducer offline / dropout")

        if not water_cut_tested:
            data_gaps.append("Water cut measurement stale (> 30 days without lab well test)")

        if telemetry_age_seconds > self.max_stale_sec:
            data_gaps.append(f"RTU telemetry stale (last packet received {telemetry_age_seconds:.0f}s ago > {self.max_stale_sec:.0f}s limit)")

        is_sufficient = len(data_gaps) == 0

        if not is_sufficient:
            return {
                "is_sufficient": False,
                "status": "REQUEST_MORE_DATA",
                "missing_telemetry": data_gaps,
                "instruction": "Cannot issue high-confidence automated optimization. Request acoustic fluid level survey or load cell re-calibration before modifying pump speed or steam volume."
            }

        return {
            "is_sufficient": True,
            "status": "DATA_ADEQUATE",
            "missing_telemetry": []
        }
