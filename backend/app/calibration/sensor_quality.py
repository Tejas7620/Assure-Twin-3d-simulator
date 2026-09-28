"""
sensor_quality.py - Sensor Data Quality, Flatline, and Outlier Screening Engine.
Implements:
1. Flatline detection (zero standard deviation over N successive readings).
2. Outlier rejection (Z-score and physical range bounds).
3. Signal noise standard deviation estimation.
4. Data quality score (0 to 100) per sensor channel (Temp, Pressure, SPM, Load).
"""

from typing import Dict, Any, List
import numpy as np

class SensorQualityEngine:
    def __init__(self, z_score_threshold: float = 3.0):
        self.z_thresh = float(z_score_threshold)

    def screen_channel(self, channel_name: str, values: List[float], min_bound: float, max_bound: float) -> Dict[str, Any]:
        """
        Screens a single time-series sensor channel for data anomalies.
        """
        if not values or len(values) < 5:
            return {
                "channel": channel_name,
                "status": "INSUFFICIENT_DATA",
                "quality_score": 0.0,
                "is_healthy": False,
                "issues": ["Sample count too low (< 5)"]
            }

        arr = np.array(values, dtype=float)
        issues = []
        is_healthy = True

        # 1. Physical Bounds Check
        oob_count = int(np.sum((arr < min_bound) | (arr > max_bound)))
        if oob_count > 0:
            issues.append(f"{oob_count} readings violated physical bounds [{min_bound}, {max_bound}]")
            is_healthy = False

        # 2. Flatline Detection
        std_dev = float(np.std(arr))
        if std_dev < 1e-4:
            issues.append("Flatline detected (signal stuck / transducer frozen)")
            is_healthy = False

        # 3. Outlier Detection (Z-score)
        if std_dev > 1e-4:
            mean_val = float(np.mean(arr))
            z_scores = np.abs((arr - mean_val) / std_dev)
            outlier_count = int(np.sum(z_scores > self.z_thresh))
            if outlier_count > 0:
                issues.append(f"{outlier_count} statistical outlier spikes detected (|Z| > {self.z_thresh})")

        quality_score = 100.0
        if not is_healthy:
            quality_score -= 40.0
        quality_score -= min(40.0, len(issues) * 15.0)
        quality_score = max(5.0, quality_score)

        return {
            "channel": channel_name,
            "status": "HEALTHY" if is_healthy and len(issues) == 0 else ("DEGRADED" if quality_score > 50 else "FAULT"),
            "quality_score": round(quality_score, 1),
            "is_healthy": is_healthy and len(issues) == 0,
            "mean": round(float(np.mean(arr)), 2),
            "std_dev": round(std_dev, 4),
            "sample_count": len(values),
            "issues": issues
        }
