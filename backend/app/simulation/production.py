"""
production.py
Calculates actual delivered surface production rates (Liquid, Oil, Water)
strictly coupled to reservoir inflow, downhole pump capacity, fillage, and water cut.
"""

class ProductionModel:
    def __init__(self):
        self.cumulative_oil_bbl = 0.0
        self.cumulative_liquid_bbl = 0.0
        self.cumulative_water_bbl = 0.0

    def calculate_production(self, inflow_bpd: float, pump_capacity_bpd: float,
                             pump_efficiency: float, pump_fillage: float,
                             water_cut: float, is_pumping: bool, dt_days: float):
        """
        Coupled multi-phase production calculation:
        Actual liquid rate is governed by physical constraint:
        Liquid cannot exceed inflow OR pump lifting capacity!
        """
        if not is_pumping:
            liquid_rate_bpd = 0.0
            oil_rate_bopd = 0.0
            water_rate_bpd = 0.0
        else:
            # Constrained liquid rate
            effective_capacity = pump_capacity_bpd * pump_efficiency * pump_fillage
            liquid_rate_bpd = min(inflow_bpd, effective_capacity)

            # Partition into oil and water
            water_cut = max(0.0, min(0.99, water_cut))
            oil_rate_bopd = liquid_rate_bpd * (1.0 - water_cut)
            water_rate_bpd = liquid_rate_bpd * water_cut

        # Accumulate production
        self.cumulative_liquid_bbl += liquid_rate_bpd * dt_days
        self.cumulative_oil_bbl += oil_rate_bopd * dt_days
        self.cumulative_water_bbl += water_rate_bpd * dt_days

        # Normalized flow factor (0.0 to 1.0) for driving 3D particle speed & density in Three.js
        # Reference max rate ~ 120 BOPD
        flow_speed_factor = min(1.0, oil_rate_bopd / 80.0) if oil_rate_bopd > 0.05 else 0.0

        return {
            "liquid_rate_bpd": round(liquid_rate_bpd, 1),
            "oil_rate_bopd": round(oil_rate_bopd, 1),
            "water_rate_bpd": round(water_rate_bpd, 1),
            "cumulative_oil_bbl": round(self.cumulative_oil_bbl, 1),
            "cumulative_liquid_bbl": round(self.cumulative_liquid_bbl, 1),
            "flow_speed_factor": round(flow_speed_factor, 3)
        }
