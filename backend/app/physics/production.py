"""
production.py - Coupled Reservoir-to-Surface Production System Model.
Implements:
1. Physical nodal constraint between available reservoir inflow and SRP pump lifting capacity.
2. Inflow-limited vs pump-limited regime identification.
3. Separation of total liquid rate into oil and water rates using live water cut.
4. Cumulative production tracking (oil, water, liquid).
5. Enforces mass balance and drawdown conservation.
"""

import math
from typing import Dict, Any

class ProductionModel:
    def __init__(self):
        self.cumulative_oil_m3 = 1420.0
        self.cumulative_water_m3 = 210.0
        self.cumulative_liquid_m3 = 1630.0

    def compute_production(
        self,
        inflow_rate_m3_d: float,
        pump_capacity_m3_d: float,
        water_cut: float,
        dt_days: float = 0.0
    ) -> Dict[str, Any]:
        """
        Determines actual well production rate by solving the nodal constraint
        between available inflow and pump capacity.
        """
        q_inflow = max(0.0, float(inflow_rate_m3_d))
        q_pump = max(0.0, float(pump_capacity_m3_d))
        wc = max(0.0, min(0.99, float(water_cut)))

        # Physical constraint: well cannot lift more than what reservoir can supply
        if q_pump >= q_inflow:
            # Well is inflow-limited!
            regime = "INFLOW_LIMITED"
            q_liquid = q_inflow
        else:
            # Well is pump-displacement limited!
            regime = "PUMP_LIMITED"
            q_liquid = q_pump

        # Split into oil and water phases
        q_water = q_liquid * wc
        q_oil = q_liquid * (1.0 - wc)

        # Update cumulative totals if stepping forward
        if dt_days > 0.0:
            self.cumulative_oil_m3 += q_oil * dt_days
            self.cumulative_water_m3 += q_water * dt_days
            self.cumulative_liquid_m3 += q_liquid * dt_days

        return {
            "operating_regime": regime,
            "liquid_rate_m3_d": round(q_liquid, 2),
            "liquid_rate_bpd": round(q_liquid * 6.28981, 1),
            "oil_rate_m3_d": round(q_oil, 2),
            "oil_rate_bpd": round(q_oil * 6.28981, 1),
            "oil_rate_t_d": round(q_oil * 0.92, 2), # Using heavy oil density ~ 0.92 t/m3
            "water_rate_m3_d": round(q_water, 2),
            "water_rate_bpd": round(q_water * 6.28981, 1),
            "water_cut": round(wc, 4),
            "water_cut_pct": round(wc * 100.0, 1),
            "cumulative_oil_m3": round(self.cumulative_oil_m3, 1),
            "cumulative_oil_bbl": round(self.cumulative_oil_m3 * 6.28981, 1),
            "cumulative_water_m3": round(self.cumulative_water_m3, 1),
            "cumulative_liquid_m3": round(self.cumulative_liquid_m3, 1)
        }

    def reset_cumulatives(self, oil_m3: float = 0.0, water_m3: float = 0.0):
        self.cumulative_oil_m3 = float(oil_m3)
        self.cumulative_water_m3 = float(water_m3)
        self.cumulative_liquid_m3 = float(oil_m3 + water_m3)
