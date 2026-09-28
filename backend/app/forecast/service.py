"""
backend/app/forecast/service.py
Multi-Horizon Dynamic Forward Trajectory Simulator (Phase 26).
Forecasts CSS-SRP thermal decay, oil production rates, power consumption, and mechanical risk over 7 to 180 days.
"""

from typing import List, Dict, Any
from datetime import datetime
import math
from backend.app.simulation.viscosity import calculate_viscosity

def generate_forecast(sim_state: Dict[str, Any], horizon_days: int = 30) -> Dict[str, Any]:
    temp_0 = sim_state.get("reservoir", {}).get("temperature_c", 72.6)
    t_res = 52.0 # Baseline unheated reservoir temperature
    spm = sim_state.get("controls", {}).get("spm", 3.2)
    stroke_in = sim_state.get("controls", {}).get("stroke_inches", 64.0)
    current_oil = sim_state.get("production", {}).get("oil_rate_bopd", 32.6)
    current_sor = sim_state.get("economics", {}).get("instantaneous_sor", 2.84)
    steam_ton = sim_state.get("controls", {}).get("steam_volume_tons", 2400.0)

    # Thermal dissipation coefficient (Marx-Langenheim conduction)
    decay_rate = 0.0145 
    
    # SRP displacement capacity in bpd (API 1.75" plunger: 0.148 bbl/in/spm)
    disp_bpd = spm * stroke_in * 0.148 * 1.44

    points: List[Dict[str, Any]] = []

    # Choose step size based on horizon
    if horizon_days <= 14:
        step = 1
    elif horizon_days <= 45:
        step = 2
    elif horizon_days <= 90:
        step = 3
    else:
        step = 5

    for day in range(0, horizon_days + 1, step):
        # 1. Thermal dissipation: T(t) = T_res + (T_0 - T_res) * e^(-alpha * t)
        temp_t = t_res + (temp_0 - t_res) * math.exp(-decay_rate * day)
        
        # 2. Temperature-dependent viscosity
        visc_t = calculate_viscosity(temp_t)
        
        # 3. Oil inflow proportional to 1 / viscosity relative to day 0
        visc_0 = calculate_viscosity(temp_0)
        rel_mobility = max(0.12, (visc_0 / max(1.0, visc_t)) ** 0.55)
        inflow_t = current_oil * rel_mobility
        
        # 4. Actual production constrained by SRP displacement and fillage
        fillage_pct = min(96.0, max(25.0, (inflow_t / max(1.0, disp_bpd)) * 100.0))
        oil_prod_t = min(inflow_t, disp_bpd * (fillage_pct / 100.0) * 0.88)
        
        # 5. Energy and loads
        rod_load_kn = round(min(125.0, 78.0 + (visc_t / 3000.0) * 6.5 + (spm / 3.0) * 8.0), 1)
        energy_kw = round(16.5 + (rod_load_kn / 100.0) * 11.2, 1)
        
        # 6. Rod Float Margin
        float_margin_pct = round(max(0.0, 42.0 - (visc_t / 2200.0) * 14.5 - (spm - 2.0) * 4.0), 1)
        
        # 7. Dynamic SOR (steam injected / cumulative oil)
        sor_t = round(current_sor + (day * 0.024), 2)
        
        # 8. Confidence interval spreads with horizon uncertainty (+- 3% to +- 22%)
        uncertainty = 0.03 + (day / horizon_days) * 0.18
        conf_lower = round(oil_prod_t * (1.0 - uncertainty), 1)
        conf_upper = round(oil_prod_t * (1.0 + uncertainty), 1)

        points.append({
            "day": day,
            "temperature": round(temp_t, 1),
            "viscosity": round(visc_t, 0),
            "oil_rate": round(oil_prod_t, 1),
            "sor": sor_t,
            "energy": energy_kw,
            "pump_fillage": round(fillage_pct, 1),
            "rod_load": rod_load_kn,
            "float_margin": float_margin_pct,
            "confidence_lower": conf_lower,
            "confidence_upper": conf_upper
        })

    return {
        "well_id": "BGW-17A",
        "horizon_days": horizon_days,
        "points": points,
        "generated_at": datetime.utcnow()
    }
