"""
rod_string.py - Multi-Section Tapered Sucker Rod String Mechanics.
Implements:
1. Multi-taper rod sections (API Grade D / KD sucker rods, 1", 7/8", 3/4").
2. Section weight, cross-sectional area, linear mass, and elastic modulus.
3. Buoyancy factor in wellbore fluid mixture: BF = 1 - rho_fluid / rho_steel.
4. Elastic rod stretch calculation under fluid and dynamic loads.
5. Acoustic wave velocity and fundamental period of vibration (API RP 11L).
"""

import math
from typing import List, Dict, Any, Optional

class RodSection:
    def __init__(self, diameter_in: float, length_m: float, grade: str = "D"):
        self.diameter_in = float(diameter_in)
        self.diameter_m = self.diameter_in * 0.0254
        self.length_m = float(length_m)
        self.length_ft = self.length_m * 3.28084
        self.grade = grade

        # Steel physical properties
        self.density_kg_m3 = 7850.0 # Standard carbon/alloy steel
        self.elastic_modulus_pa = 2.068e11 # 30 x 10^6 psi

        # Geometry
        self.area_m2 = (math.pi / 4.0) * (self.diameter_m ** 2)
        self.area_sq_in = (math.pi / 4.0) * (self.diameter_in ** 2)

        # Weight per unit length
        # Weight in air: w = rho * A * g (N/m), and lb/ft
        self.mass_per_m_kg = self.density_kg_m3 * self.area_m2
        self.weight_per_ft_lb = self.mass_per_m_kg * 0.671969
        self.total_weight_air_n = self.mass_per_m_kg * self.length_m * 9.80665
        self.total_weight_air_lb = self.weight_per_ft_lb * self.length_ft

class TaperedRodStringModel:
    def __init__(
        self,
        sections: Optional[List[RodSection]] = None,
        total_depth_m: float = 1200.0
    ):
        self.total_depth_m = float(total_depth_m)
        if sections is not None and len(sections) > 0:
            self.sections = sections
        else:
            # Standard API 2-taper or 3-taper string for 1200m heavy oil well:
            # Top section: 7/8" (400 m)
            # Bottom section: 3/4" (800 m)
            s1 = RodSection(diameter_in=0.875, length_m=450.0, grade="D")
            s2 = RodSection(diameter_in=0.750, length_m=750.0, grade="D")
            self.sections = [s1, s2]

        self._recompute_properties()

    def _recompute_properties(self):
        self.total_length_m = sum(s.length_m for s in self.sections)
        self.total_weight_air_n = sum(s.total_weight_air_n for s in self.sections)
        self.total_weight_air_lb = sum(s.total_weight_air_lb for s in self.sections)

        # Average diameter
        weighted_diam = sum(s.diameter_in * s.length_m for s in self.sections)
        self.average_diameter_in = weighted_diam / max(1.0, self.total_length_m)

        # Acoustic velocity a = sqrt(E / rho)
        self.acoustic_velocity_m_s = math.sqrt(2.068e11 / 7850.0) # ~ 5132 m/s (~16,800 ft/s)

        # Fundamental period of vibration T = 4L / a (seconds)
        self.fundamental_period_s = (4.0 * self.total_length_m) / self.acoustic_velocity_m_s

        # Elastic stretch coefficient: Delta_L = (1/E) * sum(L_i / A_i)
        self.elastic_compliance_m_per_n = sum(s.length_m / (s.elastic_modulus_pa * s.area_m2) for s in self.sections)

    def calculate_buoyant_weight(self, fluid_density_kg_m3: float) -> Dict[str, float]:
        """
        Buoyancy factor: BF = 1 - (rho_fluid / rho_steel)
        Buoyant rod weight = W_air * BF
        """
        rho_steel = 7850.0
        rho_fluid = max(700.0, min(1200.0, float(fluid_density_kg_m3)))
        buoyancy_factor = max(0.5, 1.0 - (rho_fluid / rho_steel))

        w_buoyant_n = self.total_weight_air_n * buoyancy_factor
        w_buoyant_lb = self.total_weight_air_lb * buoyancy_factor
        w_buoyant_kn = w_buoyant_n / 1000.0

        return {
            "buoyancy_factor": round(buoyancy_factor, 4),
            "total_weight_air_n": round(self.total_weight_air_n, 1),
            "total_weight_air_kn": round(self.total_weight_air_n / 1000.0, 2),
            "total_weight_air_lb": round(self.total_weight_air_lb, 1),
            "buoyant_weight_n": round(w_buoyant_n, 1),
            "buoyant_weight_kn": round(w_buoyant_kn, 2),
            "buoyant_weight_lb": round(w_buoyant_lb, 1)
        }

    def calculate_rod_stretch_m(self, load_n: float) -> float:
        """Calculates elastic stretch (elongation) of rod string under axial load."""
        return float(load_n * self.elastic_compliance_m_per_n)

    def get_section_details(self) -> List[Dict[str, Any]]:
        details = []
        for i, s in enumerate(self.sections):
            details.append({
                "section": i + 1,
                "diameter_in": s.diameter_in,
                "length_m": s.length_m,
                "area_sq_in": round(s.area_sq_in, 3),
                "weight_air_lb": round(s.total_weight_air_lb, 1),
                "grade": s.grade
            })
        return details
