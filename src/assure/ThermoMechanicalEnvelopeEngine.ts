/**
 * src/assure/ThermoMechanicalEnvelopeEngine.ts
 * Dynamic Thermo-Mechanical Operating Envelope (Phases 8 & 9).
 * Core Innovation: "The safe operating window moves with the well."
 * As the heavy oil well cools, viscosity surges exponentially, causing viscous rod drag to spike
 * and MPRL to collapse towards zero (rod float). Thus, permissible SPM limits contract.
 */

import type { ThermoMechanicalEnvelope } from './types.ts';
import type { SimulationState } from '../sim/SimulationClient.ts';

export class ThermoMechanicalEnvelopeEngine {
  /**
   * Evaluates the dynamic operating envelope based on the current thermo-mechanical state
   */
  public static evaluate(state: SimulationState): ThermoMechanicalEnvelope {
    const tempC = state.reservoir.temperature_c;
    const viscCp = state.reservoir.viscosity_cp;
    const spm = state.controls.spm;
    const strokeIn = state.controls.stroke_inches;

    // Baseline reference: at high temperature (90°C), preferred SPM is [2.5, 4.2]
    // As temperature declines towards baseline (38°C), rod drag forces upper limit down:
    // Upper critical SPM limit (rod float boundary):
    // Rod float occurs when viscous downward drag exceeds buoyant rod weight.
    // F_drag = C * (visc / 500)^0.65 * SPM * stroke
    // Solving for critical SPM where float margin drops below 8%:
    const maxSafeDrag = 3.2; // kN
    const dragCoeff = 0.18 * ((viscCp / 500.0) ** 0.65) * (strokeIn / 64.0) * 0.00444822 * 8500.0 / 3.0;
    const criticalSpmUpper = Math.max(1.8, Math.min(5.5, maxSafeDrag / Math.max(0.2, dragCoeff)));

    // Lower critical SPM limit (fluid stagnation & pump chamber starvation):
    // If SPM is too low, fluid cools inside the tubing string and velocity drops below critical settling
    const criticalSpmLower = Math.max(0.6, Math.min(2.0, 0.8 + (100.0 - Math.min(100.0, tempC)) * 0.008));

    // Preferred operating window (centered in safe zone with 20% margin):
    const preferredSpmMax = Math.round(Math.max(1.5, criticalSpmUpper * 0.82) * 10) / 10;
    const preferredSpmMin = Math.round(Math.min(preferredSpmMax - 0.6, criticalSpmLower * 1.35) * 10) / 10;

    // Warning boundaries
    const warningSpmMax = Math.round(criticalSpmUpper * 0.94 * 10) / 10;
    const warningSpmMin = Math.round(criticalSpmLower * 1.12 * 10) / 10;

    // Determine current status
    let status: ThermoMechanicalEnvelope['status'] = 'SAFE';
    if (spm > criticalSpmUpper || spm < criticalSpmLower) {
      status = 'CRITICAL';
    } else if (spm > preferredSpmMax || spm < preferredSpmMin) {
      status = 'WARNING';
    }

    // Shrinkage factor: relative contraction of preferred window compared to peak post-steam window (width 1.7 SPM)
    const currentWindowWidth = Math.max(0.1, preferredSpmMax - preferredSpmMin);
    const baselineWindowWidth = 1.7;
    const shrinkageFactorPct = Math.round(Math.max(0, Math.min(95, (1.0 - currentWindowWidth / baselineWindowWidth) * 100)));

    // Normalized coordinates for 2D plot rendering (X: Temp 35C-105C, Y: SPM 0.5-5.5)
    const normX = Math.max(0, Math.min(1, (tempC - 35.0) / (105.0 - 35.0)));
    const normY = Math.max(0, Math.min(1, (spm - 0.5) / (5.5 - 0.5)));

    return {
      currentTempC: tempC,
      currentViscCp: viscCp,
      currentSpm: spm,
      currentStrokeIn: strokeIn,
      preferredSpmMin,
      preferredSpmMax,
      warningSpmMin,
      warningSpmMax,
      criticalSpmUpper: Math.round(criticalSpmUpper * 10) / 10,
      criticalSpmLower: Math.round(criticalSpmLower * 10) / 10,
      status,
      shrinkageFactorPct,
      operatingPointNormalized: { x: normX, y: normY }
    };
  }

  /**
   * Generates boundary curve coordinates for the 2D Canvas Envelope plot
   * (SPM as a function of Temperature from 35°C to 100°C)
   */
  public static getEnvelopeCurves(): {
    temps: number[];
    upperCritical: number[];
    upperPreferred: number[];
    lowerPreferred: number[];
    lowerCritical: number[];
  } {
    const temps: number[] = [];
    const upperCritical: number[] = [];
    const upperPreferred: number[] = [];
    const lowerPreferred: number[] = [];
    const lowerCritical: number[] = [];

    for (let t = 35; t <= 100; t += 2.5) {
      temps.push(t);
      const v = Math.max(20.0, 10000.0 * Math.exp(3800.0 * (1.0 / (t + 273.15) - 1.0 / 293.15)));
      const dragCoeff = 0.18 * ((v / 500.0) ** 0.65) * 0.00444822 * 8500.0 / 3.0;
      const uCrit = Math.max(1.8, Math.min(5.2, 3.2 / Math.max(0.2, dragCoeff)));
      const lCrit = Math.max(0.6, Math.min(1.8, 0.8 + (100.0 - t) * 0.008));

      upperCritical.push(Math.round(uCrit * 100) / 100);
      upperPreferred.push(Math.round(uCrit * 0.82 * 100) / 100);
      lowerPreferred.push(Math.round(lCrit * 1.35 * 100) / 100);
      lowerCritical.push(Math.round(lCrit * 100) / 100);
    }

    return { temps, upperCritical, upperPreferred, lowerPreferred, lowerCritical };
  }
}
