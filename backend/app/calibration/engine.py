"""
engine.py - Non-Linear Parameter Calibration Engine for Baghewala Field Data.
Uses Scipy curve fitting / least squares to calibrate:
1. Andrade heavy oil viscosity curve: mu(T) = mu_ref * exp(b * (1/T - 1/T_ref))
2. Effective reservoir permeability (k_md) from drawdown vs production rate.
3. Overburden thermal dissipation rate.
"""

from typing import Dict, Any, List, Tuple
import numpy as np
from scipy.optimize import curve_fit

class CalibrationEngine:
    def __init__(self):
        pass

    def fit_viscosity_curve(
        self,
        temperatures_c: List[float],
        viscosities_cp: List[float],
        t_ref_c: float = 20.0
    ) -> Dict[str, Any]:
        """
        Fits Andrade equation: mu(T) = mu_ref * exp(b * (1/(T+273.15) - 1/(T_ref+273.15)))
        """
        if len(temperatures_c) < 3 or len(viscosities_cp) < 3:
            return {"success": False, "error": "At least 3 temperature-viscosity calibration points required"}

        t_arr = np.array(temperatures_c, dtype=float) + 273.15
        mu_arr = np.array(viscosities_cp, dtype=float)
        t_ref_k = t_ref_c + 273.15

        def andrade_func(t_k, mu_ref, b):
            exponent = b * ((1.0 / t_k) - (1.0 / t_ref_k))
            exponent = np.clip(exponent, -12.0, 12.0)
            return mu_ref * np.exp(exponent)

        try:
            # Initial guess: [10000.0, 3800.0]
            popt, pcov = curve_fit(
                andrade_func,
                t_arr,
                mu_arr,
                p0=[10000.0, 3800.0],
                bounds=([500.0, 1000.0], [80000.0, 8000.0])
            )
            mu_ref_fit, b_fit = popt

            # R^2 calculation
            pred_mu = andrade_func(t_arr, mu_ref_fit, b_fit)
            ss_res = np.sum((mu_arr - pred_mu) ** 2)
            ss_tot = np.sum((mu_arr - np.mean(mu_arr)) ** 2)
            r2 = 1.0 - (ss_res / max(1e-6, ss_tot))

            return {
                "success": True,
                "fitted_parameters": {
                    "mu_ref_cp": round(float(mu_ref_fit), 1),
                    "t_ref_c": t_ref_c,
                    "activation_energy_b": round(float(b_fit), 1)
                },
                "metrics": {
                    "r_squared": round(float(r2), 4),
                    "rmse_cp": round(float(np.sqrt(np.mean((mu_arr - pred_mu)**2))), 1),
                    "points_fitted": len(temperatures_c)
                }
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    def fit_permeability(
        self,
        rates_m3_d: List[float],
        drawdowns_bar: List[float],
        viscosity_cp: float = 120.0,
        pay_thickness_m: float = 12.0
    ) -> Dict[str, Any]:
        """
        Fits Darcy permeability from well test drawdown points: q = J * delta_P.
        """
        if len(rates_m3_d) < 2:
            return {"success": False, "error": "Insufficient rate-drawdown points"}

        q_arr = np.array(rates_m3_d, dtype=float)
        dp_arr = np.array(drawdowns_bar, dtype=float)

        # Slope J = q / dp via least squares
        J_fit, _, _, _ = np.linalg.lstsq(dp_arr[:, np.newaxis], q_arr, rcond=None)
        J_val = float(J_fit[0])

        # Back-calculate permeability k from J
        # J ~ (2 * pi * k * h * 1e5 * 86400) / (mu * ln(re/rw))
        # k_md ~ J * mu * ln(re/rw) / (constant * h)
        geom_factor = 7.0 # ln(re/rw) approx
        k_est_md = (J_val * viscosity_cp * geom_factor) / (max(1.0, pay_thickness_m) * 0.054)
        k_est_md = max(100.0, min(5000.0, k_est_md))

        return {
            "success": True,
            "fitted_productivity_index_m3_d_bar": round(J_val, 3),
            "estimated_permeability_md": round(k_est_md, 1)
        }
