"""
reservoir.py
Reservoir geological and petrophysical model.
Tracks pore volume, permeability field, initial pressure, current depletion pressure,
and oil/water saturations across the reservoir domain.
"""

import numpy as np

class ReservoirModel:
    def __init__(self, nx: int = 30, ny: int = 30, nz: int = 12):
        self.nx = nx
        self.ny = ny
        self.nz = nz

        # Petrophysical properties
        self.initial_pressure_bar = 70.0
        self.current_pressure_bar = 68.4
        self.porosity = 0.224            # 22.4%
        self.permeability_md = 1250.0     # 1250 mD
        self.oil_saturation = 0.68       # 68%
        self.water_saturation = 0.32     # 32%
        self.rock_compressibility = 4.5e-5 # 1/bar

        # Grid properties
        self.pressure_grid = np.full((nx, ny, nz), self.current_pressure_bar, dtype=np.float32)
        self.oil_sat_grid = np.full((nx, ny, nz), self.oil_saturation, dtype=np.float32)

    def step(self, cumulative_produced_bbl: float, cumulative_injected_t: float):
        """
        Updates average reservoir pressure based on material balance:
        Voidage replacement and pressure depletion.
        """
        # Estimated pore volume in barrels
        # 30m x 30m x 10m = 9000 m^3 * 0.224 = ~2016 m^3 pore volume = ~12,680 bbl
        pore_volume_bbl = 12680.0

        # Net voidage = Produced Liquid - Injected Water/Steam equivalent (1 ton steam ≈ 6.29 bbl)
        net_voidage_bbl = cumulative_produced_bbl - (cumulative_injected_t * 6.29 * 0.8)
        delta_p = (net_voidage_bbl / (pore_volume_bbl * self.rock_compressibility * 1e4 + 1e-4)) * 0.05
        self.current_pressure_bar = float(np.clip(self.initial_pressure_bar - delta_p, 25.0, 95.0))
        self.pressure_grid.fill(self.current_pressure_bar)

        return self.current_pressure_bar
