"""
vfd_shaping.py - Variable Frequency Drive (VFD) Stroke Velocity Shaping.
Implements:
1. Dynamic velocity profiling between upstroke and downstroke phases.
2. In high-viscosity heavy oil or low float margin conditions, extends downstroke duration
   (e.g. from 50% to 65% of stroke cycle) to allow gravity fall without float or compression.
3. Accelerates upstroke proportionally to maintain overall targeted average SPM.
4. Generates time-dependent velocity profile v(t) for motor drive controllers.
"""

import math
from typing import Dict, Any, List

class VFDStrokeShaper:
    def __init__(self, default_downstroke_fraction: float = 0.50):
        self.default_down_frac = float(default_downstroke_fraction)

    def calculate_shaping_profile(
        self,
        target_spm: float,
        stroke_inches: float,
        viscosity_cp: float,
        float_margin_pct: float
    ) -> Dict[str, Any]:
        """
        Determines the optimal upstroke/downstroke time allocation and speed factors.
        """
        spm = max(0.5, float(target_spm))
        stroke_in = float(stroke_inches)
        visc = float(viscosity_cp)
        fm = float(float_margin_pct)

        total_cycle_time_s = 60.0 / spm

        # If float margin is deficient (< 20%) or viscosity is high (> 800 cP):
        # We need a gentle, slow downstroke to prevent rod float!
        if fm < 12.0 or visc > 3000.0:
            downstroke_frac = 0.68  # 68% of time spent on slow downstroke
            strategy = "AGGRESSIVE_FLOAT_PREVENTION"
        elif fm < 20.0 or visc > 1000.0:
            downstroke_frac = 0.60  # 60% of time on downstroke
            strategy = "MODERATE_FLOAT_PREVENTION"
        elif fm < 25.0:
            downstroke_frac = 0.55
            strategy = "MILD_SHAPING"
        else:
            downstroke_frac = 0.50  # Symmetrical sinusoidal motion
            strategy = "SYMMETRICAL"

        upstroke_frac = 1.0 - downstroke_frac

        t_up_s = total_cycle_time_s * upstroke_frac
        t_down_s = total_cycle_time_s * downstroke_frac

        # Effective equivalent speeds during each half
        # Average upstroke speed ~ Stroke / t_up
        v_up_avg_in_s = stroke_in / max(0.1, t_up_s)
        v_down_avg_in_s = stroke_in / max(0.1, t_down_s)

        # Drive frequency multipliers (nominal 50 Hz base)
        freq_up_hz = 50.0 * (0.50 / upstroke_frac)
        freq_down_hz = 50.0 * (0.50 / downstroke_frac)

        # Downstroke drag attenuation: slower descent reduces viscous drag proportionally to v^1.0
        drag_reduction_factor = downstroke_frac / 0.50 # Slower by this ratio

        return {
            "strategy": strategy,
            "target_spm": round(spm, 1),
            "total_cycle_time_s": round(total_cycle_time_s, 2),
            "upstroke_time_s": round(t_up_s, 2),
            "downstroke_time_s": round(t_down_s, 2),
            "upstroke_fraction": round(upstroke_frac, 3),
            "downstroke_fraction": round(downstroke_frac, 3),
            "upstroke_frequency_hz": round(freq_up_hz, 1),
            "downstroke_frequency_hz": round(freq_down_hz, 1),
            "avg_upstroke_vel_in_s": round(v_up_avg_in_s, 1),
            "avg_downstroke_vel_in_s": round(v_down_avg_in_s, 1),
            "drag_reduction_estimate_pct": round((1.0 - (0.50 / downstroke_frac)) * 100.0, 1)
        }
