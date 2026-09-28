"""
srp.py - Surface Sucker Rod Pump (SRP) Crank-Slider Kinematics and Motion Profile.
Implements:
1. Exact crank-slider kinematics with pitman arm ratio lambda = R / L_pitman.
2. Polished rod position x(theta), velocity v(theta), and acceleration a(theta) as functions of crank angle.
3. Maximum and minimum acceleration factors for inertia load calculations.
4. Continuous cyclic kinematic motion evaluation for 3D simulator synchronization.
"""

import math
from typing import Dict, Any, Tuple

class SRPKinematicsModel:
    def __init__(
        self,
        pitman_length_m: float = 2.40,
        walking_beam_ratio: float = 1.0
    ):
        self.pitman_length_m = float(pitman_length_m)
        self.beam_ratio = float(walking_beam_ratio)

    def calculate_kinematics_at_angle(
        self,
        crank_angle_rad: float,
        stroke_m: float,
        spm: float
    ) -> Dict[str, float]:
        """
        Calculates exact kinematic state of polished rod at crank angle theta.
        theta = 0 at Bottom Dead Center (BDC, beginning of upstroke),
        theta = pi at Top Dead Center (TDC, beginning of downstroke).
        """
        theta = crank_angle_rad % (2.0 * math.pi)
        omega = (max(0.1, spm) * 2.0 * math.pi) / 60.0  # rad/s

        # Crank radius R = stroke / (2 * beam_ratio)
        R = (stroke_m / 2.0) / self.beam_ratio
        lam = R / max(0.5, self.pitman_length_m)  # Pitman rod ratio

        # Displacement from BDC: x(theta)
        # x(theta) = R * [ (1 - cos(theta)) + (lam / 2) * sin(theta)^2 ] * beam_ratio
        disp_m = R * ((1.0 - math.cos(theta)) + (lam / 2.0) * (math.sin(theta) ** 2)) * self.beam_ratio

        # Velocity: v(theta) = dx/dt
        # v(theta) = R * omega * [ sin(theta) + (lam / 2) * sin(2 * theta) ] * beam_ratio
        vel_m_s = R * omega * (math.sin(theta) + (lam / 2.0) * math.sin(2.0 * theta)) * self.beam_ratio

        # Acceleration: a(theta) = dv/dt
        # a(theta) = R * omega^2 * [ cos(theta) + lam * cos(2 * theta) ] * beam_ratio
        accel_m_s2 = R * (omega ** 2) * (math.cos(theta) + lam * math.cos(2.0 * theta)) * self.beam_ratio

        # Dimensionless acceleration factor alpha = a / g
        g = 9.80665
        alpha = accel_m_s2 / g

        return {
            "crank_angle_rad": theta,
            "crank_angle_deg": math.degrees(theta),
            "displacement_m": float(disp_m),
            "displacement_in": float(disp_m * 39.3701),
            "velocity_m_s": float(vel_m_s),
            "velocity_ft_s": float(vel_m_s * 3.28084),
            "acceleration_m_s2": float(accel_m_s2),
            "accel_factor_alpha": float(alpha),
            "is_upstroke": bool(theta < math.pi),
            "omega_rad_s": float(omega)
        }

    def get_peak_acceleration_factors(self, stroke_m: float, spm: float) -> Tuple[float, float]:
        """
        Returns (alpha_max_upstroke, alpha_min_downstroke).
        alpha_max occurs at BDC (theta = 0): (R * omega^2 / g) * (1 + lambda)
        alpha_min occurs at TDC (theta = pi): -(R * omega^2 / g) * (1 - lambda)
        """
        omega = (max(0.1, spm) * 2.0 * math.pi) / 60.0
        R = (stroke_m / 2.0) / self.beam_ratio
        lam = R / max(0.5, self.pitman_length_m)
        g = 9.80665

        base = (R * (omega ** 2)) / g * self.beam_ratio
        alpha_up = base * (1.0 + lam)
        alpha_down = -base * (1.0 - lam)
        return float(alpha_up), float(alpha_down)
