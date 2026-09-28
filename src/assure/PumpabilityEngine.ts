/**
 * src/assure/PumpabilityEngine.ts
 * Dynamic Pumpability Window Calculation (Phases 10 & 11).
 * Calculates exact forward time (in days) until the current operating trajectory
 * intersects an unfavorable thermo-mechanical boundary (rod float or pump starvation).
 * Output labeled MODEL-DERIVED / SIMULATION-DERIVED.
 */

import type { PumpabilityState } from './types.ts';
import type { SimulationState } from '../sim/SimulationClient.ts';
import { ThermalReserveEngine } from './ThermalReserveEngine.ts';

export class PumpabilityEngine {
  /**
   * Computes the exact time remaining before the well state crosses outside the safe envelope
   */
  public static calculate(state: SimulationState): PumpabilityState {
    const temp = state.reservoir.temperature_c;
    const spm = state.controls.spm;
    const strokeIn = state.controls.stroke_inches;
    const baseTemp = ThermalReserveEngine.BASELINE_FORMATION_TEMP_C;
    const lambda = 0.022; // Thermal decay constant (day^-1)

    // Critical limit: Rod float occurs when viscous drag causes MPRL < 0.8 kN (float margin < 10%)
    // Allowable max drag force = 3.2 kN
    // Drag = 0.18 * ((visc / 500)^0.65) * 8500 * (spm / 3.0) * (stroke / 64) * 0.00444822
    // Solving for critical viscosity:
    const spmFactor = (spm / 3.0) * (strokeIn / 64.0);
    const maxViscForSafeFloat = 500.0 * Math.pow(3.2 / (0.18 * 8500.0 * 0.00444822 * Math.max(0.1, spmFactor)), 1.0 / 0.65);

    // Finding temperature corresponding to maxViscForSafeFloat via Andrade equation:
    // ln(visc / 10000) = 3800 * (1/T_k - 1/293.15)
    // 1/T_k = (ln(visc / 10000) / 3800) + (1 / 293.15)
    let criticalTempC = 52.0; // default engineering fallback
    try {
      const invTk = (Math.log(Math.max(10.0, maxViscForSafeFloat) / 10000.0) / 3800.0) + (1.0 / 293.15);
      if (invTk > 0) {
        criticalTempC = (1.0 / invTk) - 273.15;
      }
    } catch {
      criticalTempC = 52.0;
    }

    // Now calculate time t in days until reservoir cools from current Temp to criticalTempC:
    // T(t) = T_base + (T_0 - T_base) * exp(-lambda * t)
    // exp(-lambda * t) = (T_crit - T_base) / (T_0 - T_base)
    // t = -ln((T_crit - T_base) / (T_0 - T_base)) / lambda
    let timeToBoundaryDays: number;
    let criticalLimitingFactor = 'Viscous rod drag exceeding buoyant float margin (< 10%)';

    if (temp <= criticalTempC) {
      // Already at or past the boundary!
      timeToBoundaryDays = 0.0;
    } else if (temp <= baseTemp + 1.0) {
      timeToBoundaryDays = 0.0;
    } else {
      const ratio = Math.max(0.01, (criticalTempC - baseTemp) / (temp - baseTemp));
      if (ratio >= 1.0) {
        timeToBoundaryDays = 0.0;
      } else {
        const rawDays = -Math.log(ratio) / lambda;
        timeToBoundaryDays = Math.round(Math.max(0.1, Math.min(60.0, rawDays)) * 10) / 10;
      }
    }

    // If currently injecting steam, the boundary is expanding
    if (state.time.css_phase === 'INJECTION') {
      timeToBoundaryDays = 45.0;
      criticalLimitingFactor = 'Steam cycle active (Thermal reservoir recharging)';
    }

    // Rate of window consumption (days of window lost per day of elapsed time)
    const decayRateDaysPerDay = 1.0;
    const forecastBoundaryDay = Math.round((state.time.sim_time_days + timeToBoundaryDays) * 10) / 10;

    let stateStatus: PumpabilityState['state'] = 'SAFE';
    if (timeToBoundaryDays <= 2.0) {
      stateStatus = 'CRITICAL';
    } else if (timeToBoundaryDays <= 7.0) {
      stateStatus = 'WARNING';
    }

    return {
      timeToBoundaryDays,
      state: stateStatus,
      criticalLimitingFactor,
      decayRateDaysPerDay,
      forecastBoundaryDay,
      provenance: 'MODEL-DERIVED'
    };
  }
}
