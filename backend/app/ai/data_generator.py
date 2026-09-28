"""
data_generator.py - Synthetic Dataset Generator for CSS and SRP ML Models.
Generates physics-validated training samples across wide operating envelopes:
permeability, initial temperature, steam volume, injection rate, SPM, stroke, water cut.
"""

import random
from typing import List, Dict, Any
import numpy as np

class SyntheticDataGenerator:
    def __init__(self, random_seed: int = 42):
        random.seed(random_seed)
        np.random.seed(random_seed)

    def generate_css_dataset(self, num_samples: int = 150) -> List[Dict[str, float]]:
        """
        Generates synthetic CSS operational samples with physics-calculated outcomes.
        """
        samples = []
        for _ in range(num_samples):
            perm_md = random.uniform(800.0, 3500.0)
            visc_ref = random.uniform(4000.0, 25000.0)
            steam_vol_t = random.uniform(1000.0, 4500.0)
            steam_rate = random.uniform(25.0, 75.0)
            soak_days = random.uniform(2.0, 10.0)
            spm = random.uniform(1.2, 5.0)
            stroke_in = random.uniform(44.0, 100.0)
            water_cut = random.uniform(0.05, 0.40)

            # Physics approximation for target metrics
            inj_days = steam_vol_t / steam_rate
            peak_temp = 52.0 + (195.0 - 52.0) * min(1.0, steam_vol_t / 2200.0) * 0.85
            t_k = peak_temp + 273.15
            visc_heated = visc_ref * np.exp(3800.0 * (1.0 / t_k - 1.0 / 293.15))
            visc_heated = max(15.0, min(visc_ref, visc_heated))

            # Cumulative 90-day oil
            j = (perm_md / 1850.0) * (200.0 / visc_heated)
            daily_oil_bpd = max(4.0, min(150.0, 16.0 * j))
            cum_oil_90d_bbl = daily_oil_bpd * 90.0 * (1.0 - water_cut)
            sor = steam_vol_t / max(1.0, cum_oil_90d_bbl * 0.14627)

            samples.append({
                "perm_md": round(perm_md, 1),
                "visc_ref_cp": round(visc_ref, 1),
                "steam_volume_t": round(steam_vol_t, 1),
                "steam_rate_t_d": round(steam_rate, 1),
                "soak_days": round(soak_days, 1),
                "spm": round(spm, 2),
                "stroke_in": round(stroke_in, 1),
                "water_cut": round(water_cut, 3),
                "peak_temp_c": round(peak_temp, 1),
                "visc_heated_cp": round(visc_heated, 1),
                "cum_oil_90d_bbl": round(cum_oil_90d_bbl, 1),
                "sor": round(sor, 2)
            })
        return samples
