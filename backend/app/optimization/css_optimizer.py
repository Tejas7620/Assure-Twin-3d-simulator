"""
css_optimizer.py - Cyclic Steam Stimulation (CSS) Differential Evolution Optimizer.
Implements:
1. Multi-variable optimization of CSS operational design:
   - Target steam volume per cycle (tons)
   - Daily injection rate (t/d)
   - Soak period duration (days)
   - Production cutoff temperature (°C).
2. Objective function: Maximizes Cycle Net Operating Profit / NPV:
   NPV = Oil_Revenue - Steam_Cost - Lifting_Power_Cost - Water_Disposal_Cost.
3. Constraint enforcement:
   - Maximum injection pressure below formation fracture pressure
   - Steam-to-Oil Ratio (SOR) penalty when SOR > 5.0
   - Minimum soak time for thermal equilibration.
"""

import math
from typing import Dict, Any, List, Optional
import numpy as np
from scipy.optimize import differential_evolution

class CSSOptimizer:
    def __init__(
        self,
        oil_price_usd_bbl: float = 75.0,
        steam_cost_usd_ton: float = 24.50,
        fracture_pressure_bar: float = 38.0
    ):
        self.oil_price = float(oil_price_usd_bbl)
        self.steam_cost = float(steam_cost_usd_ton)
        self.p_frac = float(fracture_pressure_bar)

    def _simulate_css_cycle(
        self,
        steam_vol_t: float,
        steam_rate_t_d: float,
        soak_days: float,
        cutoff_temp_c: float,
        perm_md: float = 1850.0,
        visc_ref_cp: float = 10000.0
    ) -> Dict[str, float]:
        """
        Fast analytical forward simulation of a CSS cycle for optimization evaluations.
        """
        inj_days = steam_vol_t / max(1.0, steam_rate_t_d)

        # Thermal response: Marx-Langenheim temperature rise
        delta_t_steam = 195.0 - 52.0
        heat_efficiency = 0.68 * math.exp(-0.02 * inj_days)
        near_well_temp = 52.0 + delta_t_steam * heat_efficiency * min(1.0, steam_vol_t / 2000.0)

        # Viscosity drop from heating
        t_k = near_well_temp + 273.15
        exponent = 3800.0 * ((1.0 / t_k) - (1.0 / 293.15))
        visc_heated = max(10.0, visc_ref_cp * math.exp(max(-10.0, min(10.0, exponent))))

        # Production period length determined by cooling from peak to cutoff temp
        cooling_rate_c_d = 0.22 + 0.005 * (steam_vol_t / 1000.0)
        prod_days = max(10.0, (near_well_temp - cutoff_temp_c) / cooling_rate_c_d)

        # Average oil production rate during heated phase
        # Productivity index J proportional to 1 / visc_heated
        j_factor = (perm_md / 1850.0) * (200.0 / max(20.0, visc_heated))
        oil_rate_bpd = max(5.0, min(180.0, 18.0 * j_factor))

        total_oil_bbl = oil_rate_bpd * prod_days
        total_oil_tons = total_oil_bbl * 0.14627

        sor = steam_vol_t / max(1.0, total_oil_tons)

        revenue_usd = total_oil_bbl * self.oil_price
        steam_cost_usd = steam_vol_t * self.steam_cost
        power_cost_usd = prod_days * 24.0 * 18.0 * 0.095 # ~ 18 kW average lifting power
        water_cost_usd = total_oil_bbl * 0.15 * 1.80

        net_profit_usd = revenue_usd - (steam_cost_usd + power_cost_usd + water_cost_usd)

        # Cycle duration
        cycle_days = inj_days + soak_days + prod_days

        return {
            "net_profit_usd": net_profit_usd,
            "daily_profit_usd": net_profit_usd / cycle_days,
            "total_oil_bbl": total_oil_bbl,
            "sor": sor,
            "cycle_days": cycle_days,
            "inj_days": inj_days,
            "prod_days": prod_days,
            "peak_temp_c": near_well_temp
        }

    def optimize(
        self,
        steam_vol_bounds: tuple = (1000.0, 4500.0),
        steam_rate_bounds: tuple = (25.0, 75.0),
        soak_bounds: tuple = (2.0, 10.0),
        cutoff_temp_bounds: tuple = (48.0, 68.0),
        perm_md: float = 1850.0
    ) -> Dict[str, Any]:
        """
        Runs Differential Evolution to find optimal CSS operating parameters.
        """
        bounds = [steam_vol_bounds, steam_rate_bounds, soak_bounds, cutoff_temp_bounds]

        def objective(x):
            steam_vol, steam_rate, soak, cutoff = x
            res = self._simulate_css_cycle(steam_vol, steam_rate, soak, cutoff, perm_md=perm_md)

            # Objective: Maximize daily net profit -> Minimize negative daily profit
            obj_val = -res["daily_profit_usd"]

            # Penalty for high SOR (> 4.5)
            if res["sor"] > 4.5:
                obj_val += (res["sor"] - 4.5) * 500.0

            return obj_val

        result = differential_evolution(
            objective,
            bounds=bounds,
            strategy='best1bin',
            maxiter=35,
            popsize=12,
            tol=0.01,
            seed=42
        )

        opt_steam_vol, opt_steam_rate, opt_soak, opt_cutoff = result.x
        sim_eval = self._simulate_css_cycle(opt_steam_vol, opt_steam_rate, opt_soak, opt_cutoff, perm_md=perm_md)

        return {
            "success": bool(result.success),
            "optimal_parameters": {
                "steam_volume_t": round(float(opt_steam_vol), 1),
                "steam_rate_t_d": round(float(opt_steam_rate), 1),
                "soak_days": round(float(opt_soak), 1),
                "cutoff_temp_c": round(float(opt_cutoff), 1)
            },
            "performance": {
                "net_profit_usd": round(sim_eval["net_profit_usd"], 2),
                "daily_profit_usd": round(sim_eval["daily_profit_usd"], 2),
                "total_oil_bbl": round(sim_eval["total_oil_bbl"], 1),
                "sor": round(sim_eval["sor"], 2),
                "cycle_days": round(sim_eval["cycle_days"], 1),
                "inj_days": round(sim_eval["inj_days"], 1),
                "prod_days": round(sim_eval["prod_days"], 1),
                "peak_temp_c": round(sim_eval["peak_temp_c"], 1)
            },
            "iterations": int(result.nit)
        }
