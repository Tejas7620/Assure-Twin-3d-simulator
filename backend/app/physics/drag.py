"""
drag.py - Depth-Integrated Sucker Rod Viscous Drag Model.
Implements:
1. Annular viscous shear stress integration along the entire wellbore depth.
2. Direct coupling to depth-dependent tubing temperature T(z) and viscosity mu(z) profiles.
3. Upstroke and downstroke drag calculations based on relative rod-fluid velocity.
4. Accounts for tapered rod diameter variations along depth.
5. Critical engineering model ensuring rod drag correctly reflects cold surface tubing conditions.
"""

import math
from typing import Dict, Any, List
from .tubing import TubingTemperatureModel
from .rod_string import TaperedRodStringModel
from .fluids import FluidProperties

class RodViscousDragModel:
    def __init__(
        self,
        tubing_id_in: float = 2.441
    ):
        self.tubing_id_m = float(tubing_id_in) * 0.0254
        self.r_tubing_m = self.tubing_id_m / 2.0

    def calculate_integrated_drag(
        self,
        tubing_profiles: Dict[str, Any],
        rod_string: TaperedRodStringModel,
        rod_velocity_m_s: float,
        fluid_velocity_m_s: float = 0.05,
        is_upstroke: bool = True
    ) -> Dict[str, Any]:
        """
        Integrates viscous shear drag along depth z using local tubing temperature and viscosity.
        F_drag = sum [ (2 * pi * mu(z) * v_rel / ln(r_t / r_r)) * dz ]
        """
        depths_m = tubing_profiles["depths_m"]
        viscosities_cp = tubing_profiles["viscosities_cp"]
        n = len(depths_m)
        if n < 2:
            return {"drag_force_n": 0.0, "drag_force_kn": 0.0, "drag_force_lb": 0.0}

        dz = (depths_m[-1] - depths_m[0]) / (n - 1)
        total_drag_n = 0.0
        depth_drags: List[float] = []

        # Map rod diameter by depth
        # Section 1 (top), Section 2 (bottom)
        sec1 = rod_string.sections[0]
        sec1_len = sec1.length_m
        sec1_r = sec1.diameter_m / 2.0

        sec2 = rod_string.sections[1] if len(rod_string.sections) > 1 else sec1
        sec2_r = sec2.diameter_m / 2.0

        v_rod = abs(float(rod_velocity_m_s))
        v_fluid = abs(float(fluid_velocity_m_s))

        # Relative shear velocity in annulus:
        # On upstroke: rod moves UP, fluid pumped UP.
        # On downstroke: rod moves DOWN through fluid, relative velocity is v_rod + v_fluid!
        if is_upstroke:
            v_rel = max(0.01, v_rod - 0.5 * v_fluid)
        else:
            v_rel = v_rod + v_fluid

        for i in range(n):
            z = depths_m[i]
            r_rod = sec1_r if z <= sec1_len else sec2_r
            mu_pa_s = viscosities_cp[i] * 1e-3 # Convert cP to Pa*s

            # Couette-Poiseuille annular shear factor:
            # Shear stress tau = mu * v_rel / (r_rod * ln(r_tubing / r_rod))
            geom_factor = (2.0 * math.pi) / math.log(max(1.01, self.r_tubing_m / r_rod))
            dF_dz = geom_factor * mu_pa_s * v_rel # Force per unit length (N/m)

            drag_segment_n = dF_dz * dz
            total_drag_n += drag_segment_n
            depth_drags.append(round(drag_segment_n, 2))

        drag_kn = total_drag_n / 1000.0
        drag_lb = total_drag_n * 0.224809

        return {
            "drag_force_n": round(total_drag_n, 1),
            "drag_force_kn": round(drag_kn, 3),
            "drag_force_lb": round(drag_lb, 1),
            "is_upstroke": is_upstroke,
            "relative_velocity_m_s": round(v_rel, 3),
            "top_section_viscosity_cp": viscosities_cp[0],
            "bottom_section_viscosity_cp": viscosities_cp[-1]
        }
