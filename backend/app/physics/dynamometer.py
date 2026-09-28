"""
dynamometer.py - Surface and Downhole Dynamometer Card Synthesis Engine.
Implements:
1. Full 360-degree cycle position-load curve generation (72 points at 5-degree increments).
2. Elastic rod string elongation and phase delay between surface and pump.
3. Accurate valve transfer physics: standing valve opening on upstroke, traveling valve opening on downstroke.
4. Downstroke heavy oil viscous drag depression and rod float signatures.
5. Fluid pound impact notch for incomplete pump fillage (fillage < 0.85).
6. Downhole pump card (plunger load vs plunger displacement).
7. Dynamometer metrics: Peak Polished Rod Load (PPRL), Minimum Load (MPRL), cyclic work.
"""

import math
from typing import Dict, Any, List

class DynamometerModel:
    def __init__(self, num_points: int = 72):
        self.num_points = max(36, int(num_points))

    def generate_cards(
        self,
        stroke_inches: float,
        spm: float,
        buoyant_weight_kn: float,
        fluid_load_kn: float,
        upstroke_drag_kn: float,
        downstroke_drag_kn: float,
        upstroke_accel_factor: float,
        downstroke_accel_factor: float,
        pump_fillage: float,
        rod_float_status: str,
        fluid_pound_magnitude_kn: float = 0.0,
        rod_stretch_in: float = 4.2
    ) -> Dict[str, Any]:
        """
        Synthesizes paired Surface and Downhole Dynamometer cards.
        """
        n = self.num_points
        stroke_in = max(12.0, float(stroke_inches))
        fillage = max(0.10, min(1.0, float(pump_fillage)))

        # Dynamic inertial load components
        W_b = float(buoyant_weight_kn)
        F_fluid = float(fluid_load_kn)
        f_drag_up = float(upstroke_drag_kn)
        f_drag_down = float(downstroke_drag_kn)

        inertia_up = W_b * abs(float(upstroke_accel_factor))
        inertia_down = W_b * abs(float(downstroke_accel_factor))

        # Peak Polished Rod Load (PPRL) on Upstroke
        pprl_kn = W_b + F_fluid + inertia_up + f_drag_up
        # Minimum Polished Rod Load (MPRL) on Downstroke
        mprl_kn = max(0.0, W_b - inertia_down - f_drag_down)

        surface_card: List[Dict[str, float]] = []
        pump_card: List[Dict[str, float]] = []

        work_integral_j = 0.0

        for i in range(n):
            angle = (i / n) * 2.0 * math.pi
            # Exact surface kinematics position (0 at BDC, stroke_in at TDC)
            # x = (S/2) * (1 - cos(angle))
            pos_surface_in = (stroke_in / 2.0) * (1.0 - math.cos(angle))

            # Downhole plunger motion has phase lag due to acoustic wave travel
            # delta_phi ~ omega * (2L / a)
            phase_lag_rad = min(0.35, (spm * 2.0 * math.pi / 60.0) * 0.45)
            angle_pump = (angle - phase_lag_rad) % (2.0 * math.pi)
            pos_pump_in = max(0.0, (stroke_in - rod_stretch_in) / 2.0) * (1.0 - math.cos(angle_pump))

            # 1. Surface Card Load Calculation
            if angle < math.pi:
                # UPSTROKE: 0 -> pi
                # Transition at beginning of upstroke: load increases as rod stretches and picks up fluid
                transfer_fraction = min(1.0, angle / 0.45) # Valve transfer transition
                dyn_inertia = inertia_up * math.cos(angle)
                drag_term = f_drag_up * math.sin(angle)
                harmonic_ripple = 0.03 * F_fluid * math.sin(4.0 * angle) # Acoustic stress wave ripple

                surface_load = W_b + (F_fluid * transfer_fraction) + dyn_inertia + drag_term + harmonic_ripple
            else:
                # DOWNSTROKE: pi -> 2*pi
                down_angle = angle - math.pi # 0 -> pi
                transfer_down = max(0.0, 1.0 - (down_angle / 0.45))
                dyn_inertia = -inertia_down * math.cos(down_angle)
                drag_term = -f_drag_down * math.sin(down_angle)

                # Base downstroke load
                surface_load = W_b + (F_fluid * transfer_down) + dyn_inertia + drag_term

                # Fluid Pound signature: if fillage < 1.0, plunger hits fluid midway through downstroke
                # Pound occurrence around down_angle_fraction ~ (1.0 - fillage)
                pound_pos_frac = down_angle / math.pi
                if pound_pos_frac > (1.0 - fillage) and fillage < 0.85:
                    # Sharp deceleration shock and load oscillation
                    decay = math.exp(-6.0 * (pound_pos_frac - (1.0 - fillage)))
                    shock = fluid_pound_magnitude_kn * math.sin((pound_pos_frac - (1.0 - fillage)) * 18.0) * decay
                    surface_load += shock

                # Rod Float signature: compression causes load to flatline near zero
                if rod_float_status == "FLOATING":
                    surface_load = max(0.5, surface_load * 0.40)
                elif rod_float_status == "WARNING":
                    surface_load = max(1.5, surface_load * 0.75)

            surface_load = max(0.1, surface_load)

            # 2. Downhole Pump Card Load Calculation
            if angle_pump < math.pi:
                # Plunger lifting fluid
                pump_load = F_fluid * min(1.0, angle_pump / 0.30)
            else:
                down_pump_angle = angle_pump - math.pi
                pump_pos_frac = down_pump_angle / math.pi
                if pump_pos_frac < (1.0 - fillage):
                    # Plunger moving through gas / empty barrel
                    pump_load = 0.5
                else:
                    # Fluid pound impact & traveling valve open
                    pump_load = 1.2

            surface_card.append({
                "pos_in": round(pos_surface_in, 2),
                "load_kn": round(surface_load, 2),
                "load_lb": round(surface_load * 224.809, 1)
            })

            pump_card.append({
                "pos_in": round(pos_pump_in, 2),
                "load_kn": round(pump_load, 2)
            })

            # Numerical integration of work (Area of card = Work per stroke)
            if i > 0:
                dx_m = (pos_surface_in - surface_card[i-1]["pos_in"]) * 0.0254
                avg_f_n = (surface_load + surface_card[i-1]["load_kn"]) * 500.0
                work_integral_j += avg_f_n * dx_m

        # Hydraulic polished rod horsepower (PRHP)
        cycle_work_kj = abs(work_integral_j) / 1000.0
        prhp_kw = (cycle_work_kj * spm) / 60.0
        prhp_hp = prhp_kw * 1.34102

        return {
            "surface_card": surface_card,
            "pump_card": pump_card,
            "pprl_kn": round(pprl_kn, 2),
            "mprl_kn": round(mprl_kn, 2),
            "pprl_lb": round(pprl_kn * 224.809, 1),
            "mprl_lb": round(mprl_kn * 224.809, 1),
            "cycle_work_kj": round(cycle_work_kj, 2),
            "prhp_kw": round(prhp_kw, 2),
            "prhp_hp": round(prhp_hp, 2),
            "num_points": n
        }
