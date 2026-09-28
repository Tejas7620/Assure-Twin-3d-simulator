/**
 * src/assure/ThermalTrajectoryEngine.ts
 * Multi-Horizon Thermal Trajectory & Cooling Projection (Phase 6).
 * Computes forward temperature and thermal front propagation over +1d, +3d, +7d, +14d.
 */

import type { SimulationState } from '../sim/SimulationClient.ts';
import { ThermalReserveEngine } from './ThermalReserveEngine.ts';

export interface ThermalTrajectoryForecast {
  dayOffset: number;
  temperatureC: number;
  thermalFrontM: number;
  viscosityCp: number;
  coolingRateCPerDay: number;
}

export class ThermalTrajectoryEngine {
  /**
   * Projects thermal decay forward across standard planning horizons
   */
  public static forecast(state: SimulationState): ThermalTrajectoryForecast[] {
    const horizons = [0, 1, 3, 7, 14];
    const initialTemp = state.reservoir.temperature_c;
    const initialFront = state.reservoir.thermal_front_m;
    const isInjecting = state.time.css_phase === 'INJECTION';
    const baseTemp = ThermalReserveEngine.BASELINE_FORMATION_TEMP_C;

    // Decay rate constant lambda derived from thermal conductivity of sand/shale caprock
    const lambda = 0.022; // day^-1

    return horizons.map(days => {
      let temp = initialTemp;
      let front = initialFront;

      if (isInjecting) {
        // Heating phase
        temp = Math.min(185.0, initialTemp + days * 4.2);
        front = Math.min(25.0, initialFront + days * 0.4);
      } else {
        // Cooling phase: Newton/Marx-Langenheim exponential thermal decay
        temp = baseTemp + (initialTemp - baseTemp) * Math.exp(-lambda * days);
        front = Math.max(3.0, initialFront * Math.exp(-0.015 * days));
      }

      // Andrade heavy oil viscosity relation
      const visc = Math.max(20.0, 10000.0 * Math.exp(3800.0 * (1.0 / (temp + 273.15) - 1.0 / 293.15)));
      const coolingRate = Math.round((temp - baseTemp) * lambda * 100) / 100;

      return {
        dayOffset: days,
        temperatureC: Math.round(temp * 10) / 10,
        thermalFrontM: Math.round(front * 10) / 10,
        viscosityCp: Math.round(visc),
        coolingRateCPerDay: coolingRate
      };
    });
  }
}
