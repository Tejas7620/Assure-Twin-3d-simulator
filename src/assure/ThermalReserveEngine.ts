/**
 * src/assure/ThermalReserveEngine.ts
 * Thermal Memory & Thermal Reserve Tracking (Phase 7).
 * Tracks cumulative enthalpy stored in near-wellbore matrix above baseline formation temperature.
 * All quantities labeled MODEL-DERIVED.
 */

import type { ThermalReserveState } from './types.ts';
import type { SimulationState } from '../sim/SimulationClient.ts';

export class ThermalReserveEngine {
  // Baseline Baghewala formation static temperature before CSS (38.0 °C)
  public static readonly BASELINE_FORMATION_TEMP_C: number = 38.0;
  // Maximum peak post-soak near-wellbore matrix temperature (185.0 °C)
  public static readonly PEAK_SOAK_TEMP_C: number = 185.0;

  /**
   * Calculates thermal reserve percentage and active decline metrics
   */
  public static evaluate(state: SimulationState): ThermalReserveState {
    const currentTemp = state.reservoir.temperature_c;
    const deltaTCurrent = Math.max(0.0, currentTemp - this.BASELINE_FORMATION_TEMP_C);
    const deltaTMax = this.PEAK_SOAK_TEMP_C - this.BASELINE_FORMATION_TEMP_C;

    // Thermal Reserve percentage based on available sensible enthalpy
    const rawReservePct = (deltaTCurrent / deltaTMax) * 100.0;
    const reservePct = Math.round(Math.max(0.0, Math.min(100.0, rawReservePct)) * 10) / 10;

    // Marx-Langenheim heat loss decay rate (°C/day)
    // Cooling rate is proportional to temperature gradient with surrounding overburden/underburden
    const coolingRate = state.time.css_phase === 'INJECTION' 
      ? -4.5 // Heating up during steam injection
      : Math.round((0.024 * (currentTemp - this.BASELINE_FORMATION_TEMP_C) + 0.35) * 100) / 100;

    const timeSinceLastCssDays = Math.round(state.time.sim_time_days % 60.0);
    const cssCycleCount = Math.floor(state.time.sim_time_days / 60.0) + 1;

    let status: ThermalReserveState['status'] = 'OPTIMAL';
    if (reservePct < 30.0) {
      status = 'DEPLETED';
    } else if (reservePct < 60.0) {
      status = 'MODERATE';
    }

    return {
      reservePct,
      currentTempC: currentTemp,
      referenceTempC: this.BASELINE_FORMATION_TEMP_C,
      coolingRateCPerDay: coolingRate,
      thermalFrontMeters: state.reservoir.thermal_front_m,
      timeSinceLastCssDays,
      cssCycleCount,
      status,
      provenance: 'MODEL-DERIVED'
    };
  }
}
