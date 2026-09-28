"""
thermal.py - Coupled Reservoir and Wellbore Thermal Model for Cyclic Steam Stimulation (CSS).
Implements:
1. Marx-Langenheim thermal zone growth during steam injection.
2. Boberg-Lantz analytical temperature decay and heat redistribution during soak & production.
3. Produced-fluid enthalpy feedback (tracking reservoir heat removal by produced fluids).
4. Conductive heat loss to overburden and underburden formations.
5. 3D analytical temperature field generator for visualization slice export.
"""

import math
from typing import Tuple, Dict, Any, List
import numpy as np

class ThermalModel:
    def __init__(
        self,
        ambient_temp_c: float = 52.0,
        steam_temp_c: float = 195.0,
        pay_zone_thickness_m: float = 12.0,
        rock_vol_heat_capacity_j_m3_k: float = 2.2e6,
        overburden_conductivity_w_m_k: float = 1.8,
        thermal_diffusivity_m2_s: float = 8.5e-7,
        steam_latent_heat_j_kg: float = 2.1e6,
        steam_quality: float = 0.80,
        nx: int = 30,
        ny: int = 30,
        nz: int = 12,
        dx: float = 1.0,
        dy: float = 1.0,
        dz: float = 0.8
    ):
        # Physical parameters
        self.ambient_temp_c = float(ambient_temp_c)
        self.steam_temp_c = float(steam_temp_c)
        self.h_t = float(pay_zone_thickness_m)
        self.M_r = float(rock_vol_heat_capacity_j_m3_k)  # Rock volumetric heat capacity (J / m^3 * K)
        self.k_ob = float(overburden_conductivity_w_m_k) # Overburden thermal conductivity (W / m * K)
        self.alpha_ob = float(thermal_diffusivity_m2_s)  # Thermal diffusivity of rock (m^2 / s)
        self.latent_heat = float(steam_latent_heat_j_kg)
        self.steam_quality = float(steam_quality)

        # 3D Grid parameters
        self.nx = nx
        self.ny = ny
        self.nz = nz
        self.dx = dx
        self.dy = dy
        self.dz = dz
        self.well_ix = nx // 2
        self.well_iy = ny // 2
        self.well_iz = nz // 2

        # Dynamic State Variables
        self.near_well_temp_c = 72.6      # Calibrated Day 30 post-steam baseline
        self.average_heated_temp_c = 68.0
        self.thermal_front_radius_m = 4.2 # Heated zone radius (m)
        self.cumulative_heat_injected_gj = 5400.0
        self.cumulative_heat_produced_gj = 820.0
        self.cumulative_heat_loss_gj = 1450.0

        # Heating / cooling rate metrics
        self.heating_rate_c_per_day = 0.0
        self.cooling_rate_c_per_day = 0.0

        # Thermal history tracking
        self.time_history_days: List[float] = [0.0]
        self.temp_history_c: List[float] = [self.near_well_temp_c]
        self.radius_history_m: List[float] = [self.thermal_front_radius_m]

        # 3D Temperature field array [nx, ny, nz]
        self.temp_grid = np.full((nx, ny, nz), self.ambient_temp_c, dtype=np.float32)
        self._update_grid()

    @property
    def thermal_reserve_gj(self) -> float:
        """Remaining usable thermal energy above ambient temperature in reservoir."""
        delta_t = max(0.0, self.average_heated_temp_c - self.ambient_temp_c)
        heated_volume_m3 = math.pi * (self.thermal_front_radius_m ** 2) * self.h_t
        energy_j = self.M_r * heated_volume_m3 * delta_t
        return float(energy_j / 1e9)

    def step(
        self,
        dt_days: float,
        steam_rate_t_d: float,
        is_injecting: bool,
        is_cooling: bool,
        liquid_rate_m3_d: float = 0.0,
        oil_cut: float = 0.85
    ) -> Tuple[float, float]:
        """
        Advances the thermal state by dt_days.
        Incorporates Marx-Langenheim growth, conductive overburden loss,
        and produced fluid enthalpy feedback.
        """
        dt_sec = dt_days * 86400.0
        delta_t_steam = max(10.0, self.steam_temp_c - self.ambient_temp_c)

        if is_injecting and steam_rate_t_d > 0.0:
            # Heat injection rate (Watts)
            # Enthalpy of saturated steam = sensible heat + steam_quality * latent_heat
            specific_heat_water = 4184.0  # J / (kg * K)
            h_steam = (specific_heat_water * (self.steam_temp_c - self.ambient_temp_c)) + (self.steam_quality * self.latent_heat)
            q_in_w = (steam_rate_t_d * 1000.0 * h_steam) / 86400.0
            heat_injected_gj = (q_in_w * dt_sec) / 1e9
            self.cumulative_heat_injected_gj += heat_injected_gj

            # Marx-Langenheim thermal front advance:
            # dV/dt = (Q_in - Q_loss) / (M_r * delta_t)
            # Conductive heat loss across upper and lower boundary surfaces:
            area_m2 = math.pi * (self.thermal_front_radius_m ** 2)
            # Heat flux to overburden: q_loss = 2 * k_ob * area * delta_t / sqrt(pi * alpha * t)
            loss_flux_w_m2 = 2.0 * self.k_ob * (self.near_well_temp_c - self.ambient_temp_c) / max(0.5, math.sqrt(math.pi * self.alpha_ob * max(1.0, dt_sec)))
            q_loss_w = min(q_in_w * 0.7, loss_flux_w_m2 * area_m2)
            self.cumulative_heat_loss_gj += (q_loss_w * dt_sec) / 1e9

            net_heat_j = (q_in_w - q_loss_w) * dt_sec
            delta_heated_vol_m3 = max(0.0, net_heat_j / (self.M_r * delta_t_steam))
            new_heated_vol_m3 = (math.pi * (self.thermal_front_radius_m ** 2) * self.h_t) + delta_heated_vol_m3
            new_radius = math.sqrt(new_heated_vol_m3 / (math.pi * self.h_t))
            self.thermal_front_radius_m = min(25.0, max(0.5, new_radius))

            # Heating rate towards steam temperature
            prev_temp = self.near_well_temp_c
            rate = 0.22 * (steam_rate_t_d / 40.0) * dt_days
            self.near_well_temp_c = min(self.steam_temp_c, self.near_well_temp_c + rate * (self.steam_temp_c - self.near_well_temp_c))
            self.average_heated_temp_c = 0.75 * self.near_well_temp_c + 0.25 * self.ambient_temp_c
            self.heating_rate_c_per_day = (self.near_well_temp_c - prev_temp) / max(1e-4, dt_days)
            self.cooling_rate_c_per_day = 0.0

        elif is_cooling or (not is_injecting):
            # Boberg-Lantz cooling: Overburden conductive loss + Produced fluid heat removal
            prev_temp = self.near_well_temp_c

            # 1. Produced fluid enthalpy feedback (sensible heat extracted by produced fluid)
            rho_oil = 920.0     # kg/m^3
            c_oil = 2100.0      # J / (kg * K)
            rho_water = 1000.0  # kg/m^3
            c_water = 4184.0    # J / (kg * K)

            q_liquid_m3_s = (liquid_rate_m3_d * 0.158987) / 86400.0  # m3/s
            c_fluid_vol = (oil_cut * rho_oil * c_oil) + ((1.0 - oil_cut) * rho_water * c_water)
            q_produced_heat_w = q_liquid_m3_s * c_fluid_vol * max(0.0, self.near_well_temp_c - self.ambient_temp_c)
            self.cumulative_heat_produced_gj += (q_produced_heat_w * dt_sec) / 1e9

            # 2. Overburden/underburden thermal conduction
            conductive_cooling_coeff = 0.015 * dt_days
            enthalpy_cooling_coeff = (q_produced_heat_w * dt_sec) / max(1e6, self.thermal_reserve_gj * 1e9)

            total_decay_fraction = min(0.35, conductive_cooling_coeff + enthalpy_cooling_coeff)
            temp_drop = total_decay_fraction * (self.near_well_temp_c - self.ambient_temp_c)
            self.near_well_temp_c = max(self.ambient_temp_c, self.near_well_temp_c - temp_drop)
            self.average_heated_temp_c = max(self.ambient_temp_c, 0.75 * self.near_well_temp_c + 0.25 * self.ambient_temp_c)

            # Gradual contraction of thermal front during long cooling
            self.thermal_front_radius_m = max(0.8, self.thermal_front_radius_m - 0.006 * dt_days)
            self.cooling_rate_c_per_day = (prev_temp - self.near_well_temp_c) / max(1e-4, dt_days)
            self.heating_rate_c_per_day = 0.0

        # Update 3D grid
        self._update_grid()
        return self.near_well_temp_c, self.thermal_front_radius_m

    def _update_grid(self):
        """Calculates 3D spatial temperature distribution around the well."""
        r_front = max(0.5, self.thermal_front_radius_m)
        cx = (self.well_ix + 0.5) * self.dx
        cy = (self.well_iy + 0.5) * self.dy
        cz = (self.well_iz + 0.5) * self.dz

        for iz in range(self.nz):
            z = (iz + 0.5) * self.dz
            for iy in range(self.ny):
                y = (iy + 0.5) * self.dy
                for ix in range(self.nx):
                    x = (ix + 0.5) * self.dx
                    dist = math.sqrt((x - cx)**2 + (y - cy)**2 + (z - cz)**2)
                    if dist <= r_front:
                        factor = 1.0 - (dist / r_front)**1.75
                        t = self.ambient_temp_c + factor * (self.near_well_temp_c - self.ambient_temp_c)
                    else:
                        decay = math.exp(-0.35 * (dist - r_front))
                        t = self.ambient_temp_c + decay * 0.15 * (self.near_well_temp_c - self.ambient_temp_c)
                    self.temp_grid[ix, iy, iz] = float(np.clip(t, self.ambient_temp_c, self.steam_temp_c))

    def get_summary_slice(self) -> List[List[float]]:
        """Returns 2D horizontal slice at reservoir midpoint for fast JSON client telemetry."""
        slice_2d = self.temp_grid[:, :, self.well_iz]
        return slice_2d.round(1).tolist()

    def get_state(self) -> Dict[str, Any]:
        return {
            "near_well_temp_c": round(self.near_well_temp_c, 2),
            "average_heated_temp_c": round(self.average_heated_temp_c, 2),
            "ambient_temp_c": self.ambient_temp_c,
            "steam_temp_c": self.steam_temp_c,
            "thermal_front_radius_m": round(self.thermal_front_radius_m, 2),
            "thermal_reserve_gj": round(self.thermal_reserve_gj, 1),
            "heating_rate_c_per_day": round(self.heating_rate_c_per_day, 3),
            "cooling_rate_c_per_day": round(self.cooling_rate_c_per_day, 3),
            "cumulative_heat_injected_gj": round(self.cumulative_heat_injected_gj, 1),
            "cumulative_heat_produced_gj": round(self.cumulative_heat_produced_gj, 1),
            "cumulative_heat_loss_gj": round(self.cumulative_heat_loss_gj, 1)
        }
