"""
fluids.py - Configurable heavy oil fluid properties and viscosity models.
Supports:
1. Andrade exponential viscosity model: mu(T) = mu_ref * exp(b * (1/T - 1/T_ref))
2. Walther-ASTM D341 kinematic viscosity model: log10(log10(nu + 0.7)) = A - B * log10(T)
3. Beggs-Robinson dead heavy oil correlation
4. Field calibration anchor points (mu_ref, T_ref, activation energy b)
5. Oil density variation with temperature and water-cut emulsion viscosity
"""

import math
from typing import Dict, Any, Optional

class FluidProperties:
    def __init__(
        self,
        mu_ref_cp: float = 10000.0,
        t_ref_c: float = 20.0,
        activation_energy_b: float = 3800.0,
        api_gravity: float = 17.5,
        model_type: str = "andrade",
        astm_a: float = 9.85,
        astm_b: float = 3.65,
        thermal_expansion_coeff: float = 0.00075,
        water_cut: float = 0.128,
        gas_oil_ratio: float = 12.0
    ):
        self.mu_ref_cp = float(mu_ref_cp)
        self.t_ref_c = float(t_ref_c)
        self.t_ref_k = self.t_ref_c + 273.15
        self.b = float(activation_energy_b)
        self.api_gravity = float(api_gravity)
        self.model_type = model_type.lower()
        self.astm_a = float(astm_a)
        self.astm_b = float(astm_b)
        self.beta = float(thermal_expansion_coeff)
        self.water_cut = float(water_cut)
        self.gas_oil_ratio = float(gas_oil_ratio)

        # Standard specific gravity at 15.6°C (60°F): SG = 141.5 / (API + 131.5)
        self.sg_15_6 = 141.5 / (self.api_gravity + 131.5)
        self.density_ref_kg_m3 = self.sg_15_6 * 1000.0

    def calculate_viscosity(self, temp_c: float) -> float:
        """
        Calculates dead oil dynamic viscosity in cP at given temperature (°C).
        Field-calibrated for Baghewala heavy crude.
        """
        t_c = max(0.0, float(temp_c))
        t_k = t_c + 273.15

        if self.model_type == "walther":
            # ASTM D341: log10(log10(nu + 0.7)) = A - B * log10(T_k)
            # nu = mu / rho
            log_tk = math.log10(max(273.15, t_k))
            val = self.astm_a - self.astm_b * log_tk
            val = max(-1.0, min(1.2, val))
            nu_cst = max(0.5, 10.0 ** (10.0 ** val) - 0.7)
            rho_g_cm3 = self.calculate_density(t_c) / 1000.0
            visc = nu_cst * rho_g_cm3
        elif self.model_type == "beggs_robinson":
            # Beggs & Robinson (1975) correlation for dead oil
            # x = y * T^(-1.163), where y = 10^(3.0324 - 0.02023 * API)
            # mu_dead = 10^x - 1
            y = 10.0 ** (3.0324 - 0.02023 * self.api_gravity)
            t_f = (t_c * 9.0 / 5.0) + 32.0
            x = y * (max(32.0, t_f) ** -1.163)
            visc = max(1.0, (10.0 ** x) - 1.0)
        else:
            # Default: Andrade exponential formula
            exponent = self.b * ((1.0 / t_k) - (1.0 / self.t_ref_k))
            exponent = max(-12.0, min(12.0, exponent))
            visc = self.mu_ref_cp * math.exp(exponent)

        # Enforce realistic physical bounds for Baghewala oil
        return float(max(2.0, min(150000.0, visc)))

    def calculate_emulsion_viscosity(self, temp_c: float, water_cut: Optional[float] = None) -> float:
        """
        Viscosity of oil-water mixture.
        At high water cut (>0.6), inversion occurs to water-continuous emulsion.
        """
        wc = self.water_cut if water_cut is None else float(water_cut)
        mu_oil = self.calculate_viscosity(temp_c)
        mu_water = 1.002 * math.exp(-0.02 * (temp_c - 20.0))  # Water viscosity in cP
        mu_water = max(0.2, mu_water)

        if wc < 0.50:
            # Water-in-oil emulsion (Brinkman-type increase in viscosity)
            return float(mu_oil * ((1.0 - min(0.48, wc)) ** -2.5))
        elif wc > 0.70:
            # Inverted oil-in-water emulsion
            return float(mu_water * (1.0 + 2.5 * (1.0 - wc)))
        else:
            # Transition / inversion zone
            f = (wc - 0.50) / 0.20
            mu_wio = mu_oil * ((1.0 - 0.48) ** -2.5)
            mu_oiw = mu_water * (1.0 + 2.5 * 0.30)
            return float((1.0 - f) * mu_wio + f * mu_oiw)

    def calculate_density(self, temp_c: float) -> float:
        """
        Density in kg/m^3 taking into account thermal expansion.
        """
        t_c = float(temp_c)
        rho = self.density_ref_kg_m3 * (1.0 - self.beta * (t_c - 15.6))
        return float(max(700.0, min(1050.0, rho)))

    def calculate_mobility(self, perm_md: float, temp_c: float) -> float:
        """
        Darcy fluid mobility lambda = k / mu (mD / cP)
        """
        mu = self.calculate_viscosity(temp_c)
        return float(perm_md / max(0.1, mu))

    def update_calibration(self, mu_ref: Optional[float] = None, t_ref: Optional[float] = None, b: Optional[float] = None):
        """
        Updates live calibration parameters without reallocating models.
        """
        if mu_ref is not None:
            self.mu_ref_cp = float(mu_ref)
        if t_ref is not None:
            self.t_ref_c = float(t_ref)
            self.t_ref_k = self.t_ref_c + 273.15
        if b is not None:
            self.b = float(b)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "mu_ref_cp": self.mu_ref_cp,
            "t_ref_c": self.t_ref_c,
            "activation_energy_b": self.b,
            "api_gravity": self.api_gravity,
            "model_type": self.model_type,
            "density_ref_kg_m3": self.density_ref_kg_m3,
            "water_cut": self.water_cut
        }
