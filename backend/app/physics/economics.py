"""
economics.py - Baghewala Heavy Oil Techno-Economic and Energy Efficiency Model.
Implements:
1. Daily and cumulative gross revenue from heavy oil production.
2. Operational expenses (OPEX): steam generation fuel/water cost, electrical lifting power tariff, produced water disposal.
3. Instantaneous and cumulative Steam-to-Oil Ratio (SOR).
4. Daily net operating cash flow, operating margin, and cumulative project NPV/profit.
5. Energy accounting: thermal energy injected vs chemical energy recovered.
"""

import math
from typing import Dict, Any

class EconomicsModel:
    def __init__(
        self,
        oil_price_usd_bbl: float = 75.0,
        steam_cost_usd_ton: float = 24.50,
        electricity_tariff_usd_kwh: float = 0.095,
        water_disposal_cost_usd_bbl: float = 1.80,
        fixed_daily_opex_usd: float = 120.0
    ):
        self.oil_price_usd_bbl = float(oil_price_usd_bbl)
        self.steam_cost_usd_ton = float(steam_cost_usd_ton)
        self.elec_tariff = float(electricity_tariff_usd_kwh)
        self.water_cost = float(water_disposal_cost_usd_bbl)
        self.fixed_daily_opex = float(fixed_daily_opex_usd)

        # Cumulative accounts
        self.cumulative_revenue_usd = 850000.0
        self.cumulative_cost_usd = 420000.0
        self.cumulative_profit_usd = self.cumulative_revenue_usd - self.cumulative_cost_usd
        self.cumulative_steam_injected_tons = 3800.0
        self.cumulative_oil_produced_tons = 1306.4 # ~ 1420 m3 * 0.92

    def calculate_daily_economics(
        self,
        oil_rate_bpd: float,
        water_rate_bpd: float,
        steam_rate_t_d: float,
        motor_power_kw: float,
        dt_days: float = 0.0,
        heater_power_kw: float = 0.0,
        elec_tariff_inr_kwh: float = 8.50,
        inr_per_usd: float = 83.0,
        boiler_efficiency: float = 0.85
    ) -> Dict[str, Any]:
        """
        Calculates daily revenue, energy costs, lifting costs, SOR, and net cash flow.
        """
        q_oil_bpd = max(0.0, float(oil_rate_bpd))
        q_water_bpd = max(0.0, float(water_rate_bpd))
        steam_t_d = max(0.0, float(steam_rate_t_d))
        power_kw = max(0.0, float(motor_power_kw))
        heater_kw = max(0.0, float(heater_power_kw))
        tariff_inr = float(elec_tariff_inr_kwh)
        usd_to_inr = float(inr_per_usd)
        b_eff = max(0.1, min(1.0, float(boiler_efficiency)))

        # 1. Gross Daily Revenue
        daily_revenue_usd = q_oil_bpd * self.oil_price_usd_bbl

        # 2. Operating Costs
        steam_cost_usd = steam_t_d * self.steam_cost_usd_ton
        motor_kwh = power_kw * 24.0
        heater_kwh = heater_kw * 24.0
        total_elec_kwh = motor_kwh + heater_kwh

        motor_elec_cost_usd = motor_kwh * self.elec_tariff
        heater_elec_cost_usd = heater_kwh * self.elec_tariff
        heater_elec_cost_inr = heater_kwh * tariff_inr
        electricity_cost_usd = motor_elec_cost_usd + heater_elec_cost_usd

        water_handling_usd = q_water_bpd * self.water_cost
        total_variable_cost_usd = steam_cost_usd + electricity_cost_usd + water_handling_usd
        total_daily_cost_usd = total_variable_cost_usd + self.fixed_daily_opex

        # 3. Net Daily Profit
        daily_profit_usd = daily_revenue_usd - total_daily_cost_usd

        # 4. Energy Accounting & kWh per barrel (Feature 2)
        kwh_per_bbl = round(total_elec_kwh / max(0.01, q_oil_bpd), 2)
        heater_kwh_per_bbl = round(heater_kwh / max(0.01, q_oil_bpd), 2)
        steam_energy_gj = round((steam_t_d * 1000.0 * 2.278e6) / 1e9, 2)
        heater_electric_energy_gj = round((heater_kwh * 3.6e6) / 1e9, 2)
        combined_energy_equivalent_gj = round(steam_energy_gj + (heater_electric_energy_gj / b_eff), 2)

        # 5. Steam-to-Oil Ratio (SOR): tons of steam injected / tons of oil produced
        # Oil density ~ 0.92 t/m3; 1 bbl = 0.158987 m3 -> 1 bbl ~ 0.14627 tons
        oil_t_d = q_oil_bpd * 0.14627
        if oil_t_d > 0.01:
            instantaneous_sor = steam_t_d / oil_t_d
        else:
            instantaneous_sor = 99.0 if steam_t_d > 0.0 else 0.0

        # Update cumulative metrics
        if dt_days > 0.0:
            self.cumulative_revenue_usd += daily_revenue_usd * dt_days
            self.cumulative_cost_usd += total_daily_cost_usd * dt_days
            self.cumulative_profit_usd = self.cumulative_revenue_usd - self.cumulative_cost_usd
            self.cumulative_steam_injected_tons += steam_t_d * dt_days
            self.cumulative_oil_produced_tons += oil_t_d * dt_days

        cum_sor = self.cumulative_steam_injected_tons / max(1.0, self.cumulative_oil_produced_tons)

        # Operating margin %
        margin_pct = (daily_profit_usd / max(1.0, daily_revenue_usd)) * 100.0 if daily_revenue_usd > 0 else -100.0

        return {
            "daily_revenue_usd": round(daily_revenue_usd, 2),
            "steam_cost_usd": round(steam_cost_usd, 2),
            "electricity_cost_usd": round(electricity_cost_usd, 2),
            "motor_elec_cost_usd": round(motor_elec_cost_usd, 2),
            "heater_elec_cost_usd": round(heater_elec_cost_usd, 2),
            "heater_elec_cost_inr": round(heater_elec_cost_inr, 2),
            "water_handling_usd": round(water_handling_usd, 2),
            "total_daily_cost_usd": round(total_daily_cost_usd, 2),
            "daily_profit_usd": round(daily_profit_usd, 2),
            "operating_margin_pct": round(margin_pct, 1),
            "instantaneous_sor": round(instantaneous_sor, 2),
            "cumulative_sor": round(cum_sor, 2),
            "cumulative_revenue_usd": round(self.cumulative_revenue_usd, 1),
            "cumulative_cost_usd": round(self.cumulative_cost_usd, 1),
            "cumulative_profit_usd": round(self.cumulative_profit_usd, 1),
            "lifting_cost_per_bbl": round(total_daily_cost_usd / max(0.1, q_oil_bpd), 2),
            # Feature 2 Metrics
            "kwh_per_bbl": kwh_per_bbl,
            "heater_kwh_per_bbl": heater_kwh_per_bbl,
            "steam_energy_gj": steam_energy_gj,
            "heater_electric_energy_gj": heater_electric_energy_gj,
            "combined_energy_equivalent_gj": combined_energy_equivalent_gj,
            "boiler_efficiency_used": b_eff,
            "elec_tariff_inr_kwh": tariff_inr,
        }
