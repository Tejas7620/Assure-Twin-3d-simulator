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
from typing import Dict, Any, List, Optional
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
        is_upstroke: bool = True,
        fluid_model: Optional[FluidProperties] = None
    ) -> Dict[str, Any]:
        """
        Integrates viscous shear drag along depth z using local tubing temperature and viscosity.
        Couples to Herschel-Bulkley shear rate gamma_dot = v_rel / gap if fluid_model is provided.
        F_drag = sum [ (2 * pi * mu(z) * v_rel / ln(r_t / r_r)) * dz ]
        """
        depths_m = tubing_profiles["depths_m"]
        viscosities_cp = tubing_profiles["viscosities_cp"]
        temps_c = tubing_profiles.get("temperatures_c", [])
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

            # Annular radial clearance / gap
            gap_m = max(0.001, self.r_tubing_m - r_rod)
            shear_rate_s1 = v_rel / gap_m

            # Viscosity accounting for Herschel-Bulkley non-Newtonian shear thinning if active
            if fluid_model is not None and getattr(fluid_model, "model_type", "") == "herschel_bulkley":
                t_z = temps_c[i] if i < len(temps_c) else 54.0
                mu_cp = fluid_model.calculate_viscosity(t_z, shear_rate=shear_rate_s1)
                mu_pa_s = mu_cp * 1e-3
            else:
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
            "top_section_viscosity_cp": viscosities_cp[0] if viscosities_cp else 0.0,
            "bottom_section_viscosity_cp": viscosities_cp[-1] if viscosities_cp else 0.0
        }

    def calculate_breakout_force(
        self,
        tubing_profiles: Dict[str, Any],
        rod_string: TaperedRodStringModel,
        fluid_model: FluidProperties,
        fluid_density_kg_m3: float = 950.0
    ) -> Dict[str, Any]:
        """
        Calculates cold-start static breakout force F_breakout due to crude yield stress tau_y(T):
        F_breakout = sum_i [ tau_y(T_i) * pi * d_rod(z_i) * dz_i ]

        Compares against buoyant rod string weight W_buoyant:
        If F_breakout > W_buoyant, downstroke gravity settling is physically impossible
        without severe rod compression / buckling.
        Advisory: SAFE SPM = 0 (thermal soak / downhole electric heating mandatory).
        Provenance: SYNTHETIC / ASSUMPTION.
        """
        depths_m = tubing_profiles.get("depths_m", [])
        temps_c = tubing_profiles.get("temperatures_c", [])
        n = len(depths_m)
        if n < 2 or not hasattr(fluid_model, "calculate_yield_stress"):
            return {
                "breakout_force_n": 0.0,
                "breakout_force_kn": 0.0,
                "buoyant_weight_n": 0.0,
                "buoyant_weight_kn": 0.0,
                "is_breakout_locked": False,
                "breakout_ratio": 0.0,
                "safe_spm_override": None
            }

        dz = (depths_m[-1] - depths_m[0]) / (n - 1)
        sec1 = rod_string.sections[0]
        sec1_len = sec1.length_m
        sec1_d = sec1.diameter_m
        sec2 = rod_string.sections[1] if len(rod_string.sections) > 1 else sec1
        sec2_d = sec2.diameter_m

        total_breakout_n = 0.0
        yield_stresses_pa: List[float] = []

        for i in range(n):
            z = depths_m[i]
            d_rod = sec1_d if z <= sec1_len else sec2_d
            t_z = temps_c[i] if i < len(temps_c) else 25.0
            tau_y = fluid_model.calculate_yield_stress(t_z)
            yield_stresses_pa.append(round(tau_y, 2))

            # Annular wetted perimeter: pi * d_rod
            dF_dz = tau_y * math.pi * d_rod
            total_breakout_n += dF_dz * dz

        # Compare with buoyant rod string weight
        bw_res = rod_string.calculate_buoyant_weight(fluid_density_kg_m3)
        w_buoyant_n = bw_res.get("buoyant_weight_n", bw_res.get("buoyant_weight_kn", 0.0) * 1000.0)

        is_breakout_locked = bool(total_breakout_n > w_buoyant_n)
        ratio = total_breakout_n / max(1.0, w_buoyant_n)

        return {
            "breakout_force_n": round(total_breakout_n, 1),
            "breakout_force_kn": round(total_breakout_n / 1000.0, 3),
            "buoyant_weight_n": round(w_buoyant_n, 1),
            "buoyant_weight_kn": round(w_buoyant_n / 1000.0, 3),
            "is_breakout_locked": is_breakout_locked,
            "breakout_ratio": round(ratio, 3),
            "yield_stress_top_pa": yield_stresses_pa[0] if yield_stresses_pa else 0.0,
            "yield_stress_bottom_pa": yield_stresses_pa[-1] if yield_stresses_pa else 0.0,
            "safe_spm_override": 0.0 if is_breakout_locked else None,
            "provenance": "SYNTHETIC / ASSUMPTION"
        }
