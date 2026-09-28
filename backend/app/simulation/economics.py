"""
economics.py
Energy consumption, power requirements, and Steam-to-Oil Ratio (SOR) model.
Calculates electrical motor power (kW), energy per barrel (kWh/bbl),
and tracking of thermal efficiency metrics.
"""

class EconomicsModel:
    def __init__(self):
        self.cumulative_kwh = 0.0
        self.cumulative_steam_tons = 0.0

    def calculate_energy_and_sor(self, spm: float, stroke_inches: float, pprl_kn: float,
                                 oil_rate_bopd: float, steam_rate_t_d: float,
                                 cumulative_oil_bbl: float, dt_days: float):
        """
        Calculates electrical power consumption and cumulative SOR:
        Mechanical hydraulic + friction power:
        HP ≈ (PPRL * Stroke * SPM) / Constant + Motor baseline
        """
        # Mechanical power in kW
        # 1 kN = 224.8 lb, 1 in = 0.0833 ft
        # Work per stroke = Force * Distance
        work_per_stroke_j = (pprl_kn * 1000.0) * (stroke_inches * 0.0254) * 0.65
        strokes_per_sec = spm / 60.0
        mech_power_kw = (work_per_stroke_j * strokes_per_sec) / 1000.0

        # Electric motor efficiency and gearbox losses (~75% efficiency)
        electrical_power_kw = max(2.5, (mech_power_kw / 0.75) + 1.2)
        daily_kwh = electrical_power_kw * 24.0

        # Energy per barrel produced (kWh/bbl)
        energy_per_bbl = (daily_kwh / max(0.5, oil_rate_bopd)) if oil_rate_bopd > 0.1 else 0.0

        # Steam consumption accumulation
        self.cumulative_kwh += daily_kwh * dt_days
        self.cumulative_steam_tons += steam_rate_t_d * dt_days

        # Cumulative Steam-to-Oil Ratio (SOR):
        # Tons of steam / m^3 of oil, or Tons of steam / bbl of oil (standard oilfield unit: bbl steam eq / bbl oil or t/bbl)
        # Using tons of steam per bbl of oil * 6.29 bbl_steam/ton -> volumetric SOR
        if cumulative_oil_bbl > 1.0:
            sor = (self.cumulative_steam_tons * 6.29) / cumulative_oil_bbl
        else:
            sor = 6.7 if self.cumulative_steam_tons > 0 else 0.0
        sor = max(0.0, min(25.0, sor))

        return {
            "power_kw": round(electrical_power_kw, 1),
            "daily_kwh": round(daily_kwh, 1),
            "energy_per_bbl": round(energy_per_bbl, 1),
            "sor": round(sor, 1),
            "cumulative_steam_tons": round(self.cumulative_steam_tons, 1)
        }
