"""
thermal.py
3D thermal energy transport and heat diffusion model for steam injection (CSS / Steam Flood).
Simulates thermal front expansion, reservoir heating, and thermal decay during soaking/cooling.
"""

import math
import numpy as np

class ThermalModel:
    def __init__(self, nx: int = 30, ny: int = 30, nz: int = 12, dx: float = 1.0, dy: float = 1.0, dz: float = 0.8):
        self.nx = nx
        self.ny = ny
        self.nz = nz
        self.dx = dx
        self.dy = dy
        self.dz = dz

        # Thermal properties: heavy sandstone + bitumen
        self.rock_heat_capacity = 2.2e6  # J / (m^3 * K)
        self.thermal_conductivity = 1.8  # W / (m * K)
        self.ambient_temp_c = 52.0       # Initial undisturbed Baghewala reservoir temperature
        self.steam_temp_c = 195.0        # Saturated steam temperature at injection pressure

        # 3D Temperature field array [nx, ny, nz] in °C
        self.temp_grid = np.full((nx, ny, nz), self.ambient_temp_c, dtype=np.float32)

        # Well location in grid coordinates (deviated horizontal section center)
        self.well_ix = nx // 2
        self.well_iy = ny // 2
        self.well_iz = nz // 2

        self.thermal_front_radius_m = 4.2
        self.near_well_temp_c = 72.6     # Calibrated Day 30 post-steam production temperature
        self.cumulative_heat_injected_gj = 5400.0

    def step(self, dt_days: float, steam_rate_t_d: float, is_injecting: bool, is_cooling: bool):
        """
        Steps the 3D temperature field forward in time.
        dt_days: Simulation time increment in days
        steam_rate_t_d: Steam injection rate (tons per day)
        is_injecting: Steam injection active
        is_cooling: Natural reservoir heat loss active
        """
        dt_sec = dt_days * 86400.0

        if is_injecting and steam_rate_t_d > 0.0:
            # Heat injection rate Q_in = steam_rate * latent_heat (~2.1 MJ/kg = 2.1e9 J/ton)
            heat_per_ton = 2.1e9 # J/ton
            q_in_w = (steam_rate_t_d * heat_per_ton) / 86400.0 # Watts
            self.cumulative_heat_injected_gj += (q_in_w * dt_sec) / 1e9

            # Radial heating around horizontal well axis
            # Energy deposition: increases near-well temperature towards steam saturation temp
            heating_rate = 0.15 * (steam_rate_t_d / 40.0) * dt_days
            self.near_well_temp_c = min(self.steam_temp_c, self.near_well_temp_c + heating_rate * (self.steam_temp_c - self.near_well_temp_c))

            # Thermal front expansion: R(t) = sqrt(Q_cum / (pi * h * C_v * Delta_T))
            delta_t = max(10.0, self.near_well_temp_c - self.ambient_temp_c)
            heated_vol = (self.cumulative_heat_injected_gj * 1e9) / (self.rock_heat_capacity * delta_t + 1e-6)
            self.thermal_front_radius_m = min(18.0, math.sqrt(max(0.25, heated_vol / (math.pi * 10.0))))

        elif is_cooling:
            # Cooling phase: Conductive heat loss to overburden and underburden rock
            cooling_rate = 0.012 * dt_days
            self.near_well_temp_c = max(self.ambient_temp_c, self.near_well_temp_c - cooling_rate * (self.near_well_temp_c - self.ambient_temp_c))
            self.thermal_front_radius_m = max(0.5, self.thermal_front_radius_m - 0.008 * dt_days)

        # Update 3D temperature field based on distance from well axis
        r_front = max(0.5, self.thermal_front_radius_m)
        center_x = (self.well_ix + 0.5) * self.dx
        center_y = (self.well_iy + 0.5) * self.dy
        center_z = (self.well_iz + 0.5) * self.dz

        # Analytical radial temperature distribution
        for iz in range(self.nz):
            z = (iz + 0.5) * self.dz
            for iy in range(self.ny):
                y = (iy + 0.5) * self.dy
                for ix in range(self.nx):
                    x = (ix + 0.5) * self.dx
                    # Distance from well axis in XZ plane
                    dist = math.sqrt((x - center_x)**2 + (y - center_y)**2 + (z - center_z)**2)
                    if dist <= r_front:
                        factor = 1.0 - (dist / r_front)**1.8
                        temp = self.ambient_temp_c + factor * (self.near_well_temp_c - self.ambient_temp_c)
                    else:
                        decay = math.exp(-0.4 * (dist - r_front))
                        temp = self.ambient_temp_c + decay * 0.15 * (self.near_well_temp_c - self.ambient_temp_c)
                    self.temp_grid[ix, iy, iz] = float(np.clip(temp, self.ambient_temp_c, self.steam_temp_c))

        return self.near_well_temp_c, self.thermal_front_radius_m

    def get_summary_slice(self) -> list:
        """
        Returns a 2D horizontal slice [nx, ny] at the reservoir pay-zone center
        for lightweight JSON transport to the 3D client.
        """
        slice_2d = self.temp_grid[:, :, self.well_iz]
        return slice_2d.round(1).tolist()
