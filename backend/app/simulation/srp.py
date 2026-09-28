"""
srp.py
Sucker Rod Pumping (SRP) mechanical dynamics and live Dynamometer card synthesis.
Models rod string buoyant weight, fluid load, dynamic inertia, viscous drag,
peak polished rod load (PPRL), minimum load (MPRL), and rod float margin.
"""

import math

class SRPDynamicsModel:
    def __init__(self, well_depth_m: float = 1200.0, rod_size_in: float = 0.875):
        self.well_depth_m = well_depth_m
        self.well_depth_ft = well_depth_m * 3.28084
        self.rod_size_in = rod_size_in

        # Weight of 7/8" rod string in air (~2.22 lb/ft = 3.30 kg/m)
        self.rod_weight_air_lb = 2.22 * self.well_depth_ft
        # Buoyant weight in liquid (SG ~ 0.95 -> buoyancy factor ~ 0.86)
        self.rod_weight_buoyant_lb = self.rod_weight_air_lb * 0.86

        # Fluid load F_o = 0.433 * SG * Depth * Area_plunger (lb)
        plunger_area_sq_in = (math.pi / 4.0) * (2.25 ** 2)
        self.fluid_load_lb = 0.433 * 0.92 * self.well_depth_ft * plunger_area_sq_in

    def calculate_loads_and_dyno(self, stroke_inches: float, spm: float, viscosity_cp: float, pump_fillage: float):
        """
        Calculates rod loading, float margin, and generates a live Dynamometer Card (Load vs Position).
        """
        # Convert to SI/Engineering
        stroke_ft = stroke_inches / 12.0
        omega = (spm * 2.0 * math.pi) / 60.0  # rad/s

        # Acceleration factor: alpha = (S * omega^2) / g
        g_ft_s2 = 32.174
        accel_factor = (stroke_ft * (omega ** 2)) / (2.0 * g_ft_s2)

        # Viscous drag force on rod string:
        # Increases directly with heavy oil viscosity!
        # When viscosity rises from 100 cP to 5000 cP, drag surges!
        drag_coeff = 0.18 * (viscosity_cp / 500.0)**0.65
        viscous_drag_lb = drag_coeff * self.rod_weight_air_lb * (spm / 3.0)

        # Dynamic inertia load
        dynamic_load_lb = self.rod_weight_air_lb * accel_factor

        # Peak Polished Rod Load (PPRL) on Upstroke
        pprl_lb = self.rod_weight_buoyant_lb + self.fluid_load_lb + dynamic_load_lb + viscous_drag_lb

        # Minimum Polished Rod Load (MPRL) on Downstroke
        mprl_lb = self.rod_weight_buoyant_lb - dynamic_load_lb - viscous_drag_lb

        # Float Margin: Percentage of rod buoyant weight remaining on downstroke
        float_margin_pct = max(0.0, (mprl_lb / max(1.0, self.rod_weight_buoyant_lb)) * 100.0)

        # Convert loads to kN for international display
        pprl_kn = pprl_lb * 0.00444822
        mprl_kn = mprl_lb * 0.00444822

        # Synthesize Live Dynamometer Card: 48 (x, y) points across 360 deg
        surface_card_points = []
        pump_card_points = []
        num_points = 48

        for i in range(num_points):
            angle = (i / num_points) * 2.0 * math.pi
            # Position: 0 at BDC to stroke_inches at TDC
            pos = (stroke_inches / 2.0) * (1.0 - math.cos(angle))

            # Upstroke (0 to pi): Rod lifting fluid
            if angle <= math.pi:
                frac = angle / math.pi
                load = self.rod_weight_buoyant_lb + self.fluid_load_lb * (0.9 + 0.1 * math.sin(frac * math.pi)) + viscous_drag_lb
            # Downstroke (pi to 2*pi): Fluid transferred through traveling valve
            else:
                frac = (angle - math.pi) / math.pi
                # Fluid pound effect if pump fillage is low!
                # If fillage < 1.0, plunger hits fluid surface midway through downstroke with a sharp load drop/spike!
                pound_factor = 1.0
                if frac > pump_fillage and pump_fillage < 0.85:
                    pound_factor = 0.75 + 0.25 * math.sin((frac - pump_fillage) * 5.0)

                load = (self.rod_weight_buoyant_lb - viscous_drag_lb) * pound_factor

            surface_card_points.append({
                "pos_in": round(pos, 1),
                "load_kn": round(load * 0.00444822, 2)
            })

            # Downhole pump card (idealized rectangle with fluid pound cutoff)
            if angle <= math.pi:
                pump_load = self.fluid_load_lb
            else:
                pump_load = 0.0 if (angle - math.pi) / math.pi > (1.0 - pump_fillage) else self.fluid_load_lb * 0.2
            pump_card_points.append({
                "pos_in": round(pos, 1),
                "load_kn": round(pump_load * 0.00444822, 2)
            })

        return {
            "pprl_kn": round(pprl_kn, 1),
            "mprl_kn": round(mprl_kn, 1),
            "rod_load_kn": round(pprl_kn, 1),
            "float_margin_pct": round(float_margin_pct, 1),
            "viscous_drag_kn": round(viscous_drag_lb * 0.00444822, 2),
            "surface_card": surface_card_points,
            "pump_card": pump_card_points
        }
