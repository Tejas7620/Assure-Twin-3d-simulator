"""
tubing.py - Depth-Dependent Tubing Temperature and Viscosity Profile Model.
Implements:
1. Ramey's wellbore heat transfer formulation for producing wells.
2. Geothermal gradient coupling from downhole reservoir to surface wellhead.
3. Mass flow rate and fluid heat capacity dependency.
4. Depth-dependent temperature profile T(z).
5. Depth-dependent viscosity profile mu(z) along the entire sucker rod string.
"""

import math
from typing import List, Dict, Any, Optional
from .fluids import FluidProperties

class TubingTemperatureModel:
    def __init__(
        self,
        well_depth_m: float = 1200.0,
        surface_temp_c: float = 28.0,
        geothermal_gradient_c_per_100m: float = 2.0,
        tubing_od_in: float = 2.875,
        tubing_id_in: float = 2.441,
        casing_id_in: float = 6.276,
        overall_u_w_m2_k: float = 18.0, # Overall wellbore heat transfer coeff
        num_depth_nodes: int = 24
    ):
        self.well_depth_m = float(well_depth_m)
        self.surface_temp_c = float(surface_temp_c)
        self.geothermal_grad = float(geothermal_gradient_c_per_100m) / 100.0 # °C/m
        self.tubing_od_m = tubing_od_in * 0.0254
        self.tubing_id_m = tubing_id_in * 0.0254
        self.casing_id_m = casing_id_in * 0.0254
        self.U = float(overall_u_w_m2_k)
        self.num_nodes = int(num_depth_nodes)

    def calculate_geothermal_temp(self, depth_m: float) -> float:
        """Undisturbed earth temperature at depth z (z=0 surface, z=L reservoir)."""
        return self.surface_temp_c + (self.geothermal_grad * depth_m)

    def calculate_profiles(
        self,
        downhole_temp_c: float,
        production_rate_m3_d: float,
        fluid_model: FluidProperties,
        oil_cut: float = 0.85
    ) -> Dict[str, Any]:
        """
        Calculates depth-dependent temperature and viscosity profiles along the tubing.
        Depth z: 0 (wellhead surface) to L (downhole pump intake).
        """
        L = self.well_depth_m
        n = self.num_nodes
        dz = L / (n - 1)

        # Fluid properties
        rho_fluid = fluid_model.calculate_density(downhole_temp_c)
        # Mixture specific heat capacity (J / kg * K)
        cp_oil = 2100.0
        cp_water = 4184.0
        cp_mix = (oil_cut * cp_oil) + ((1.0 - oil_cut) * cp_water)

        # Mass flow rate w (kg/s)
        q_m3_s = (max(0.1, production_rate_m3_d) * 0.158987) / 86400.0
        w_kg_s = q_m3_s * rho_fluid

        # Ramey's relaxation distance A (meters):
        # A = (w * cp) / (2 * pi * r_to * U)
        r_to = self.tubing_od_m / 2.0
        denom = 2.0 * math.pi * r_to * self.U
        A_relaxation_m = max(10.0, (w_kg_s * cp_mix) / denom)

        depths_m: List[float] = []
        temps_c: List[float] = []
        viscosities_cp: List[float] = []
        geothermal_temps_c: List[float] = []

        t_bottom_earth = self.calculate_geothermal_temp(L)
        t_fluid_bottom = max(t_bottom_earth, float(downhole_temp_c))

        for i in range(n):
            z = i * dz
            depths_m.append(round(z, 1))
            t_earth_z = self.calculate_geothermal_temp(z)
            geothermal_temps_c.append(round(t_earth_z, 1))

            # Distance from bottom reservoir
            dist_from_bottom = L - z

            # Ramey's temperature distribution for upward fluid flow:
            # T(z) = T_earth(z) - g_G * A + (T_in - T_earth(L) + g_G * A) * exp(-(L - z)/A)
            decay = math.exp(-dist_from_bottom / A_relaxation_m)
            gG_A = self.geothermal_grad * A_relaxation_m
            t_fluid_z = t_earth_z - gG_A + (t_fluid_bottom - t_bottom_earth + gG_A) * decay

            # Bound between surface ambient and downhole temp
            t_fluid_z = max(self.surface_temp_c, min(t_fluid_bottom, t_fluid_z))
            temps_c.append(round(t_fluid_z, 2))

            # Compute local dynamic viscosity at depth z
            mu_z = fluid_model.calculate_viscosity(t_fluid_z)
            viscosities_cp.append(round(mu_z, 2))

        # Wellhead surface fluid temperature
        wellhead_temp_c = temps_c[0]
        # Average viscosity integrated along tubing
        avg_viscosity_cp = sum(viscosities_cp) / len(viscosities_cp)

        return {
            "depths_m": depths_m,
            "temperatures_c": temps_c,
            "viscosities_cp": viscosities_cp,
            "geothermal_c": geothermal_temps_c,
            "wellhead_temp_c": wellhead_temp_c,
            "downhole_temp_c": round(t_fluid_bottom, 1),
            "average_viscosity_cp": round(avg_viscosity_cp, 1),
            "relaxation_distance_m": round(A_relaxation_m, 1)
        }
