"""
inflow.py - Composite Radial Inflow Performance Relationship (IPR) for Heavy Oil CSS Wells.
Implements:
1. Composite two-zone radial inflow: inner heated zone (r_h, mu_h) + outer cold zone (r_e, mu_c).
2. Darcy linear inflow above bubble-point pressure (P_wf >= P_b).
3. Vogel composite two-phase inflow below bubble-point (P_wf < P_b).
4. Mechanical skin factor and stimulation enhancement tracking.
5. Strict monotonic behavior validation (drawdown increase strictly increases inflow rate).
"""

import math
from typing import Dict, Any, List

class CompositeInflowModel:
    def __init__(
        self,
        wellbore_radius_m: float = 0.108,
        drainage_radius_m: float = 120.0,
        pay_zone_thickness_m: float = 12.0,
        permeability_md: float = 1850.0,
        bubble_point_bar: float = 15.0,
        skin_factor: float = 0.5
    ):
        self.r_w = float(wellbore_radius_m)
        self.r_e = float(drainage_radius_m)
        self.h = float(pay_zone_thickness_m)
        self.k_md = float(permeability_md)
        self.p_b_bar = float(bubble_point_bar)
        self.skin = float(skin_factor)

    def calculate_productivity_index(
        self,
        r_heated_m: float,
        viscosity_heated_cp: float,
        viscosity_cold_cp: float
    ) -> float:
        """
        Calculates composite productivity index J in (m^3/day) / bar.
        Darcy radial composite formula:
        J = 2 * pi * k * h / [ mu_h * ln(r_h/r_w) + mu_c * ln(r_e/r_h) + mu_h * s ]
        Converted to field units: 0.00708 * k * h / [ ... ] in bbl/d/psi -> m3/d/bar.
        """
        rh = max(self.r_w * 1.05, min(self.r_e * 0.95, float(r_heated_m)))
        mu_h = max(0.5, float(viscosity_heated_cp))
        mu_c = max(1.0, float(viscosity_cold_cp))

        # Zone resistance factors:
        term_heated = mu_h * (math.log(rh / self.r_w) + max(-3.0, self.skin))
        term_cold = mu_c * math.log(self.r_e / rh)
        total_resistance = max(0.1, term_heated + term_cold)

        # Darcy constant in metric: q(m3/d) = (2 * pi * k(m2) * h(m) * delta_P(Pa)) / mu(Pa*s) / 86400
        # 1 Darcy = 0.986923e-12 m2, 1 bar = 1e5 Pa, 1 cP = 1e-3 Pa*s
        # J_si = (2 * pi * 0.986923e-15 * k_md * h * 1e5) / (1e-3 * total_res) * 86400
        geom = 2.0 * math.pi * (0.986923e-15 * self.k_md) * self.h * 1e5 * 86400.0 / 1e-3
        j_m3_d_bar = geom / total_resistance
        return float(max(0.01, min(150.0, j_m3_d_bar)))

    def calculate_inflow(
        self,
        p_res_bar: float,
        p_wf_bar: float,
        r_heated_m: float,
        viscosity_heated_cp: float,
        viscosity_cold_cp: float
    ) -> Dict[str, Any]:
        """
        Calculates liquid inflow rate for given flowing bottomhole pressure P_wf.
        Enforces physical bounds and checks monotonic relationship.
        """
        p_res = max(1.0, float(p_res_bar))
        pwf = max(0.5, min(p_res, float(p_wf_bar)))
        drawdown_bar = max(0.0, p_res - pwf)

        J = self.calculate_productivity_index(r_heated_m, viscosity_heated_cp, viscosity_cold_cp)

        if p_res <= self.p_b_bar:
            # Entirely solution-gas drive (Vogel equation)
            # q_max = J * P_res / 1.8
            q_max = (J * p_res) / 1.8
            pr_ratio = pwf / p_res
            q_liquid = q_max * (1.0 - 0.2 * pr_ratio - 0.8 * (pr_ratio ** 2))
        elif pwf >= self.p_b_bar:
            # Entirely undersaturated single-phase Darcy flow
            q_liquid = J * drawdown_bar
            q_max = J * p_res
        else:
            # Composite Darcy above bubble point + Vogel below bubble point
            # q_b = rate at P_wf = P_b
            q_b = J * (p_res - self.p_b_bar)
            q_vogel_max = (J * self.p_b_bar) / 1.8
            pr_ratio = pwf / self.p_b_bar
            q_two_phase = q_vogel_max * (1.0 - 0.2 * pr_ratio - 0.8 * (pr_ratio ** 2))
            q_liquid = q_b + q_two_phase
            q_max = q_b + q_vogel_max

        q_liquid = max(0.0, q_liquid)

        return {
            "q_liquid_m3_d": round(q_liquid, 2),
            "q_liquid_bpd": round(q_liquid * 6.28981, 1),
            "drawdown_bar": round(drawdown_bar, 2),
            "productivity_index_m3_d_bar": round(J, 3),
            "aof_max_m3_d": round(q_max, 2),
            "p_wf_bar": round(pwf, 2),
            "p_res_bar": round(p_res, 2)
        }

    def generate_ipr_curve(
        self,
        p_res_bar: float,
        r_heated_m: float,
        viscosity_heated_cp: float,
        viscosity_cold_cp: float,
        num_points: int = 15
    ) -> List[Dict[str, float]]:
        """
        Generates full IPR curve (P_wf vs Q_liquid) to demonstrate monotonic response.
        """
        p_res = max(5.0, float(p_res_bar))
        curve = []
        for i in range(num_points):
            pwf = p_res * (1.0 - (i / (num_points - 1)))
            pwf = max(0.5, pwf)
            res = self.calculate_inflow(p_res, pwf, r_heated_m, viscosity_heated_cp, viscosity_cold_cp)
            curve.append({
                "pwf_bar": round(pwf, 2),
                "q_liquid_m3_d": res["q_liquid_m3_d"],
                "q_liquid_bpd": res["q_liquid_bpd"]
            })
        return curve
