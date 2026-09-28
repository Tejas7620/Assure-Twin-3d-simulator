"""
pump.py
Downhole Sucker Rod Pump (SRP) hydraulic capacity and fillage model.
API Spec 11AX reduced-order reciprocating pump simulation:
- Plunger displacement
- Volumetric efficiency
- Fillage ratio (Inflow / Pump Capacity)
- Valve dynamics (Standing Valve & Traveling Valve)
- Fluid pound detection
"""

import math

class DownholePumpModel:
    def __init__(self, plunger_dia_in: float = 2.25):
        self.plunger_dia_in = plunger_dia_in
        self.plunger_area_sq_in = (math.pi / 4.0) * (plunger_dia_in ** 2)

    def calculate_capacity(self, stroke_inches: float, spm: float) -> float:
        """
        API 11L theoretical pump displacement in barrels per day (BPD):
        V_disp (BPD) = 0.1166 * (D_plunger_in)^2 * S_in * SPM
        """
        capacity_bpd = 0.1166 * (self.plunger_dia_in ** 2) * max(10.0, stroke_inches) * max(0.1, spm)
        return capacity_bpd

    def evaluate_pump_state(self, stroke_inches: float, spm: float, inflow_bpd: float, viscosity_cp: float):
        """
        Evaluates full downhole pump hydraulic performance:
        1. Theoretical displacement capacity
        2. Volumetric efficiency (accounting for viscous valve lag & slippage)
        3. Pump fillage ratio
        4. Fillage status (NORMAL, LOW, CRITICAL)
        """
        capacity_bpd = self.calculate_capacity(stroke_inches, spm)

        # Volumetric efficiency drops if oil is extremely viscous (valve throttling & delayed ball seating)
        visc_penalty = 1.0 / (1.0 + 0.08 * (viscosity_cp / 1000.0)**0.8)
        base_efficiency = 0.88 * visc_penalty
        pump_efficiency = max(0.40, min(0.95, base_efficiency))

        # Pump fillage ratio = Available Inflow / Theoretical Capacity
        fillage_ratio = min(1.0, max(0.05, inflow_bpd / max(1.0, capacity_bpd)))

        # Operational fillage status classification
        if fillage_ratio >= 0.70:
            fillage_status = "NORMAL"
        elif fillage_ratio >= 0.40:
            fillage_status = "LOW"
        else:
            fillage_status = "CRITICAL"  # Fluid pound conditions

        return {
            "pump_capacity_bpd": round(capacity_bpd, 1),
            "pump_efficiency": round(pump_efficiency, 2),
            "pump_efficiency_pct": round(pump_efficiency * 100, 1),
            "pump_fillage": round(fillage_ratio, 2),
            "pump_fillage_pct": round(fillage_ratio * 100, 1),
            "fillage_status": fillage_status
        }
