"""
viscosity.py
Heavy oil viscosity and thermal mobility models.
Uses Walther-ASTM / Andrade exponential temperature-viscosity relationship
calibrated for heavy crude oil / bitumen (e.g. 10,000 cP at 20°C down to 50 cP at 180°C).
"""

import math

class ViscosityModel:
    def __init__(self, mu_ref: float = 10000.0, t_ref_c: float = 20.0, activation_energy_b: float = 3800.0):
        """
        mu_ref: Reference dead oil viscosity in cP at reference temperature T_ref (in °C)
        activation_energy_b: Viscosity-temperature characteristic coefficient (Kelvin)
        """
        self.mu_ref = mu_ref
        self.t_ref_k = t_ref_c + 273.15
        self.b = activation_energy_b

    def calculate_viscosity(self, temp_c: float) -> float:
        """
        Calculates dynamic viscosity in cP for given temperature in °C.
        Andrade formula: mu(T) = mu_ref * exp(b * (1/T - 1/T_ref))
        """
        t_k = max(5.0, temp_c) + 273.15
        exponent = self.b * ((1.0 / t_k) - (1.0 / self.t_ref_k))
        # Clamp exponent to prevent numerical overflow
        exponent = max(-10.0, min(10.0, exponent))
        visc = self.mu_ref * math.exp(exponent)
        return max(5.0, min(50000.0, visc))

    def calculate_mobility(self, perm_md: float, temp_c: float) -> float:
        """
        Darcy mobility lambda = k / mu (mD / cP)
        """
        mu = self.calculate_viscosity(temp_c)
        return perm_md / max(1.0, mu)
