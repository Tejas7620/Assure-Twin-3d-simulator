"""
inflow.py
Reservoir-to-wellbore Inflow Performance Relationship (IPR).
Calculates potential liquid inflow rate based on Darcy radial flow,
reservoir pressure, flowing bottomhole pressure, and thermal viscosity.
"""

import math

class InflowModel:
    def __init__(self, h_pay_m: float = 12.0, r_drainage_m: float = 80.0, r_well_m: float = 0.114, skin: float = 1.5):
        self.h_pay_m = h_pay_m          # Formation net pay thickness in meters
        self.r_drainage_m = r_drainage_m# Outer drainage radius in meters
        self.r_well_m = r_well_m        # Wellbore radius in meters
        self.skin = skin                # Mechanical skin factor
        self.b_oil = 1.05               # Formation volume factor (RB/STB)

    def calculate_inflow(self, res_pressure_bar: float, pwf_bar: float, perm_md: float, viscosity_cp: float) -> float:
        """
        Calculates theoretical liquid inflow rate in bbl/day (STB/D).
        Uses Darcy steady-state radial flow:
        Q = (2 * pi * k * h * Delta_P) / (mu * ln(re/rw + skin))
        Converted to oilfield units:
        J (STB/D/psi) = 0.00708 * k * h / (mu * B_o * (ln(re/rw) - 0.75 + s))
        """
        # Convert bar to psi (1 bar = 14.5038 psi)
        pr_psi = res_pressure_bar * 14.5038
        pwf_psi = max(5.0, pwf_bar) * 14.5038
        drawdown_psi = max(0.0, pr_psi - pwf_psi)

        # Geometric factor ln(re/rw)
        ln_re_rw = math.log(max(10.0, self.r_drainage_m / self.r_well_m))
        denom_geom = ln_re_rw - 0.75 + self.skin

        # Pay thickness in feet (1m = 3.28084 ft)
        h_ft = self.h_pay_m * 3.28084

        # Productivity index J in STB/D/psi
        mu = max(1.0, viscosity_cp)
        pi_j = (0.00708 * perm_md * h_ft) / (mu * self.b_oil * denom_geom)

        # Inflow rate in barrels per day
        q_inflow_bpd = pi_j * drawdown_psi

        # Physical realistic clamp (0 to 600 BOPD for heavy oil horizontal well)
        return max(0.0, min(600.0, q_inflow_bpd))
