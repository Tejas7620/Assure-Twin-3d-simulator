"""
float_model.py - Sucker Rod Float, Axial Buckling, and Downstroke Margin Model.
Implements:
1. Minimum Polished Rod Load (MPRL) on downstroke.
2. Net downhole axial force profile (tension vs compression).
3. Compression zone depth calculation (depth at which rod string buckles).
4. Float Index (FI) and Float Margin Percentage (FM%).
5. Rod float status classification: SAFE, WARNING, FLOATING, UNKNOWN.
"""

import math
from typing import Dict, Any, List
from .rod_string import TaperedRodStringModel

class RodFloatModel:
    def __init__(
        self,
        safe_margin_threshold_pct: float = 25.0,
        warning_margin_threshold_pct: float = 10.0
    ):
        self.safe_threshold = float(safe_margin_threshold_pct)
        self.warning_threshold = float(warning_margin_threshold_pct)

    def analyze_float(
        self,
        rod_string: TaperedRodStringModel,
        buoyant_weight_n: float,
        total_weight_air_n: float,
        downstroke_drag_n: float,
        downstroke_accel_factor: float,
        plunger_valve_resistance_n: float = 1200.0,
        depths_m: List[float] = None,
        viscosities_cp: List[float] = None
    ) -> Dict[str, Any]:
        """
        Analyzes sucker rod float risk and axial stress condition on downstroke.
        """
        # Downward gravity driving force
        W_b = max(1.0, float(buoyant_weight_n))
        W_air = float(total_weight_air_n)

        # Dynamic inertia resisting downward acceleration: F_inertia = m * |a_down|
        # Note: downstroke_accel_factor alpha_down is negative or absolute
        inertia_down_n = W_air * abs(float(downstroke_accel_factor))
        f_drag = max(0.0, float(downstroke_drag_n))
        f_valve = max(0.0, float(plunger_valve_resistance_n))

        # Total upward resistance force opposing rod fall on downstroke
        total_upward_resistance_n = inertia_down_n + f_drag + f_valve

        # Minimum Polished Rod Load (MPRL) at surface
        mprl_n = W_b - total_upward_resistance_n
        mprl_kn = mprl_n / 1000.0
        mprl_lb = mprl_n * 0.224809

        # Float Index: Ratio of upward retarding force to downward gravity force
        float_index = total_upward_resistance_n / W_b

        # Float Margin Percentage:
        # Remaining positive tension margin at surface
        if W_b > 0:
            float_margin_pct = max(0.0, (mprl_n / W_b) * 100.0)
        else:
            float_margin_pct = 0.0

        # Calculate compression depth:
        # If float_index > 0.8 or mprl < 0, determine where axial tension drops to zero
        compression_depth_m = 0.0
        is_buckling = False
        if depths_m and len(depths_m) > 1 and float_index > 0.70:
            # Integrate downwards to find where cumulative rod weight equals cumulative drag
            n = len(depths_m)
            cum_w = 0.0
            cum_d = 0.0
            dz = (depths_m[-1] - depths_m[0]) / (n - 1)
            unit_w_b = W_b / rod_string.total_length_m
            unit_d = f_drag / rod_string.total_length_m

            for z in depths_m:
                cum_w += unit_w_b * dz
                cum_d += unit_d * dz
                if (cum_w - cum_d - (f_valve / n)) < 0.0 and compression_depth_m == 0.0:
                    compression_depth_m = z
                    is_buckling = True

        if compression_depth_m == 0.0 and float_margin_pct < 5.0:
            compression_depth_m = rod_string.total_length_m * 0.65
            is_buckling = True

        # Determine rod float status
        if float_margin_pct >= self.safe_threshold and float_index < 0.75:
            status = "SAFE"
        elif float_margin_pct >= self.warning_threshold or float_index < 0.90:
            status = "WARNING"
        elif float_margin_pct < self.warning_threshold or float_index >= 0.90 or mprl_n <= 0.0:
            status = "FLOATING"
        else:
            status = "UNKNOWN"

        return {
            "status": status,
            "float_margin_pct": round(float_margin_pct, 1),
            "float_index": round(float_index, 3),
            "mprl_kn": round(mprl_kn, 2),
            "mprl_lb": round(mprl_lb, 1),
            "buoyant_weight_kn": round(W_b / 1000.0, 2),
            "downstroke_drag_kn": round(f_drag / 1000.0, 2),
            "downstroke_inertia_kn": round(inertia_down_n / 1000.0, 2),
            "is_buckling": is_buckling,
            "compression_depth_m": round(compression_depth_m, 1)
        }
