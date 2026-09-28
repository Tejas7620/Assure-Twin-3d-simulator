"""
wellbore.py - Multiphase Wellbore Hydraulics and Annular Flow Dynamics.
Implements:
1. Annular geometry between sucker rod string and production tubing.
2. Hydraulic diameter, cross-sectional area, and fluid annular velocity.
3. Hydrostatic pressure gradient taking into account fluid mixture density.
4. Frictional pressure drop for laminar/turbulent Bingham/Newtonian flow.
5. Wellhead pressure coupling to downhole pump intake pressure.
"""

import math
from typing import Dict, Any, List

class WellboreHydraulicsModel:
    def __init__(
        self,
        tubing_id_in: float = 2.441,
        rod_avg_od_in: float = 0.875,
        well_depth_m: float = 1200.0,
        surface_backpressure_bar: float = 2.5
    ):
        self.tubing_id_m = float(tubing_id_in) * 0.0254
        self.rod_od_m = float(rod_avg_od_in) * 0.0254
        self.depth_m = float(well_depth_m)
        self.p_surface_bar = float(surface_backpressure_bar)

        # Cross-sectional areas
        self.area_tubing_m2 = (math.pi / 4.0) * (self.tubing_id_m ** 2)
        self.area_rod_m2 = (math.pi / 4.0) * (self.rod_od_m ** 2)
        self.area_annular_m2 = max(1e-4, self.area_tubing_m2 - self.area_rod_m2)

        # Hydraulic diameter: D_h = 4 * A / P_wetted = (D_tubing - D_rod)
        self.d_hydraulic_m = max(0.01, self.tubing_id_m - self.rod_od_m)

    def calculate_hydraulics(
        self,
        liquid_rate_m3_d: float,
        average_density_kg_m3: float,
        average_viscosity_cp: float
    ) -> Dict[str, Any]:
        """
        Calculates fluid velocity, Reynolds number, friction factor,
        hydrostatic head, and tubing pressure distribution.
        """
        q_m3_s = (max(0.01, liquid_rate_m3_d) * 0.158987) / 86400.0
        v_fluid_m_s = q_m3_s / self.area_annular_m2

        rho = max(700.0, min(1100.0, float(average_density_kg_m3)))
        mu_pa_s = max(1e-3, float(average_viscosity_cp) * 1e-3)

        # Reynolds number in annulus: Re = rho * v * D_h / mu
        reynolds = (rho * v_fluid_m_s * self.d_hydraulic_m) / mu_pa_s

        # Friction factor f (Darcy-Weisbach)
        if reynolds < 2100.0:
            # Laminar annular flow
            f = 64.0 / max(1.0, reynolds)
        else:
            # Colebrook-White / Haaland approximation for turbulent flow
            eps_relative = 0.00015 / self.d_hydraulic_m
            f = (-1.8 * math.log10((eps_relative / 3.7)**1.11 + 6.9 / reynolds)) ** -2

        # Frictional pressure gradient: dp/dz_fric = f * rho * v^2 / (2 * D_h)
        dp_dz_fric_pa_m = (f * rho * (v_fluid_m_s ** 2)) / (2.0 * self.d_hydraulic_m)
        dp_fric_total_bar = (dp_dz_fric_pa_m * self.depth_m) / 1e5

        # Hydrostatic pressure: dp_hydro = rho * g * h
        g = 9.80665
        dp_hydro_total_bar = (rho * g * self.depth_m) / 1e5

        # Total tubing bottom discharge pressure required to reach surface
        p_tubing_bottom_bar = self.p_surface_bar + dp_hydro_total_bar + dp_fric_total_bar

        return {
            "fluid_velocity_m_s": round(v_fluid_m_s, 3),
            "reynolds_number": round(reynolds, 1),
            "flow_regime": "LAMINAR" if reynolds < 2100.0 else "TURBULENT",
            "friction_factor": round(f, 4),
            "hydrostatic_loss_bar": round(dp_hydro_total_bar, 2),
            "friction_loss_bar": round(dp_fric_total_bar, 2),
            "p_tubing_bottom_bar": round(p_tubing_bottom_bar, 2),
            "annular_area_cm2": round(self.area_annular_m2 * 10000.0, 1),
            "hydraulic_diameter_mm": round(self.d_hydraulic_m * 1000.0, 1)
        }
