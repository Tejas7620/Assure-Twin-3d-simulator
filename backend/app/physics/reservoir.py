"""
reservoir.py - Reduced-order Two-Region (Heated + Cold Zone) Heavy Oil Reservoir Model.
Implements:
1. Two-region radial reservoir architecture (heated near-well zone + unheated far-field zone).
2. Regional pressures (P_heated, P_cold) with inter-zone pressure equilibration.
3. Oil and water saturation tracking with Corey-type relative permeability.
4. Regional fluid mobilities lambda_h = k*k_ro/mu_h, lambda_c = k*k_ro/mu_c.
5. Modular abstraction ready for future full gridded reservoir simulation.
"""

import math
from typing import Dict, Any, Optional

class ReservoirModel:
    def __init__(
        self,
        initial_pressure_bar: float = 24.5,
        ambient_temp_c: float = 52.0,
        drainage_radius_m: float = 120.0,
        wellbore_radius_m: float = 0.108,
        absolute_permeability_md: float = 1850.0,
        porosity: float = 0.28,
        pay_zone_thickness_m: float = 12.0,
        initial_oil_saturation: float = 0.78,
        connate_water_saturation: float = 0.22,
        rock_compressibility_1_bar: float = 4.5e-5,
        oil_compressibility_1_bar: float = 7.0e-5
    ):
        self.p_initial = float(initial_pressure_bar)
        self.ambient_temp_c = float(ambient_temp_c)
        self.r_e = float(drainage_radius_m)
        self.r_w = float(wellbore_radius_m)
        self.k_abs_md = float(absolute_permeability_md)
        self.phi = float(porosity)
        self.h = float(pay_zone_thickness_m)

        # Saturations
        self.s_or = 0.15 # Residual oil saturation
        self.s_wc = float(connate_water_saturation)
        self.s_o = float(initial_oil_saturation)
        self.s_w = 1.0 - self.s_o

        # Regional State
        self.p_cold_bar = float(initial_pressure_bar)
        self.p_heated_bar = float(initial_pressure_bar)
        self.temp_cold_c = float(ambient_temp_c)
        self.temp_heated_c = float(ambient_temp_c)
        self.r_heated_m = 4.2

        # Mobilities
        self.mobility_heated_md_cp = 1.5
        self.mobility_cold_md_cp = 0.05

        # Compressibility
        self.c_t = float(rock_compressibility_1_bar + oil_compressibility_1_bar)

    def calculate_relative_permeabilities(self, s_w: Optional[float] = None) -> Dict[str, float]:
        """
        Corey relative permeability correlation for heavy oil sandstone.
        k_ro = k_ro_max * ((1 - S_w - S_or) / (1 - S_wc - S_or))^n_o
        k_rw = k_rw_max * ((S_w - S_wc) / (1 - S_wc - S_or))^n_w
        """
        sw = self.s_w if s_w is None else float(s_w)
        denom = max(0.01, 1.0 - self.s_wc - self.s_or)

        # Normalized saturations
        s_w_norm = max(0.0, min(1.0, (sw - self.s_wc) / denom))
        s_o_norm = max(0.0, min(1.0, (1.0 - sw - self.s_or) / denom))

        k_ro = 0.85 * (s_o_norm ** 2.2)
        k_rw = 0.25 * (s_w_norm ** 2.0)
        return {
            "k_ro": float(max(0.001, min(1.0, k_ro))),
            "k_rw": float(max(0.0, min(1.0, k_rw)))
        }

    def update_state(
        self,
        dt_days: float,
        temp_heated_c: float,
        r_heated_m: float,
        injection_rate_t_d: float,
        production_rate_m3_d: float,
        viscosity_heated_cp: float,
        viscosity_cold_cp: float
    ):
        """
        Steps reservoir pressure and saturation states.
        Accounts for steam injection repressurization and production drawdown.
        """
        self.temp_heated_c = float(temp_heated_c)
        self.r_heated_m = max(self.r_w * 1.5, min(self.r_e * 0.9, float(r_heated_m)))

        # Update relative permeabilities
        rel_perm = self.calculate_relative_permeabilities(self.s_w)
        k_ro = rel_perm["k_ro"]

        # Calculate regional mobilities
        self.mobility_heated_md_cp = (self.k_abs_md * k_ro) / max(0.5, float(viscosity_heated_cp))
        self.mobility_cold_md_cp = (self.k_abs_md * k_ro) / max(1.0, float(viscosity_cold_cp))

        # Pore volume of heated vs cold zones
        pv_heated_m3 = math.pi * ((self.r_heated_m ** 2) - (self.r_w ** 2)) * self.h * self.phi
        pv_cold_m3 = math.pi * ((self.r_e ** 2) - (self.r_heated_m ** 2)) * self.h * self.phi

        # Steam injection increases pressure in heated zone
        # 1 ton of steam condensed ~ 1 m^3 cold water equivalent
        if injection_rate_t_d > 0.0:
            vol_injected_m3 = injection_rate_t_d * dt_days
            delta_p_inj = vol_injected_m3 / max(100.0, pv_heated_m3 * self.c_t)
            self.p_heated_bar = min(45.0, self.p_heated_bar + delta_p_inj)

        # Fluid production causes drawdown
        if production_rate_m3_d > 0.0:
            vol_produced_m3 = production_rate_m3_d * dt_days
            delta_p_prod = vol_produced_m3 / max(100.0, pv_heated_m3 * self.c_t)
            self.p_heated_bar = max(8.0, self.p_heated_bar - delta_p_prod)

            # Gradual depletion of oil saturation in heated zone
            delta_so = (vol_produced_m3 * 0.85) / max(1000.0, pv_heated_m3 * self.phi)
            self.s_o = max(self.s_or, self.s_o - delta_so)
            self.s_w = 1.0 - self.s_o

        # Inter-zone pressure equilibration (Darcy cross-flow between cold and heated zone)
        dp = self.p_cold_bar - self.p_heated_bar
        # Transmissibility T_inter
        geom_factor = 2.0 * math.pi * self.k_abs_md * self.h / math.log(self.r_e / self.r_heated_m)
        flow_rate_inter = 0.001127 * geom_factor * (self.mobility_cold_md_cp) * dp # bbl/d equivalent factor
        dp_equil = flow_rate_inter * dt_days * 0.005
        self.p_heated_bar += dp_equil
        self.p_cold_bar -= dp_equil * (pv_heated_m3 / max(1.0, pv_cold_m3))

        self.p_heated_bar = max(6.0, min(50.0, self.p_heated_bar))
        self.p_cold_bar = max(10.0, min(35.0, self.p_cold_bar))

    def get_effective_pressure_bar(self) -> float:
        """Returns the drainage-area weighted average reservoir pressure."""
        area_h = math.pi * (self.r_heated_m ** 2)
        area_tot = math.pi * (self.r_e ** 2)
        weight_h = area_h / area_tot
        return float(weight_h * self.p_heated_bar + (1.0 - weight_h) * self.p_cold_bar)

    def get_state(self) -> Dict[str, Any]:
        return {
            "p_heated_bar": round(self.p_heated_bar, 2),
            "p_cold_bar": round(self.p_cold_bar, 2),
            "p_average_bar": round(self.get_effective_pressure_bar(), 2),
            "r_heated_m": round(self.r_heated_m, 2),
            "drainage_radius_m": self.r_e,
            "oil_saturation": round(self.s_o, 3),
            "water_saturation": round(self.s_w, 3),
            "mobility_heated_md_cp": round(self.mobility_heated_md_cp, 3),
            "mobility_cold_md_cp": round(self.mobility_cold_md_cp, 4)
        }
