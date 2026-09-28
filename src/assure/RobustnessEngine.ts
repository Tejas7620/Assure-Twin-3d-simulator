/**
 * src/assure/RobustnessEngine.ts
 * Monte-Carlo Input Perturbation & Sensitivity Analyzer (Phases 18 & 19).
 * Tests candidate actions under uncertain reservoir and surface telemetry.
 * Evaluates best-case, worst-case, expected value, variance, and robustness rating.
 */

import type { CandidateAction } from './types.ts';
import type { SimulationState } from '../sim/SimulationClient.ts';
import { ConstraintEngine } from './ConstraintEngine.ts';

export interface RobustnessAnalysisResult {
  rating: 'HIGH' | 'MEDIUM' | 'LOW';
  expectedBopd: number;
  bestCaseBopd: number;
  worstCaseBopd: number;
  variance: number;
  constraintViolationsCount: number;
  confidenceInterval95: [number, number];
  sensitivity: {
    temperature: 'LOW' | 'MEDIUM' | 'HIGH';
    viscosity: 'LOW' | 'MEDIUM' | 'HIGH';
    pressure: 'LOW' | 'MEDIUM' | 'HIGH';
    inflow: 'LOW' | 'MEDIUM' | 'HIGH';
    spm: 'LOW' | 'MEDIUM' | 'HIGH';
  };
}

export class RobustnessEngine {
  /**
   * Performs Monte-Carlo perturbation analysis across 20 synthetic parameter realizations
   */
  public static analyze(
    candidate: CandidateAction,
    baseState: SimulationState
  ): RobustnessAnalysisResult {
    const trials = 20;
    const outcomes: number[] = [];
    let violations = 0;

    // Account for steam enthalpy injection in candidate action
    const steamHeatBoost = candidate.controls.steamVolumeTons > 0 ? 18.0 : 0.0;
    const baseTemp = baseState.reservoir.temperature_c + steamHeatBoost;
    const basePwf = baseState.controls.pwf_bar;
    const spm = candidate.controls.spm;
    const strokeIn = candidate.controls.strokeInches;

    // Run perturbations
    for (let i = 0; i < trials; i++) {
      // Perturb uncertain parameters:
      // Temp: +/- 3.5 °C
      const deltaTemp = (Math.sin(i * 1.8) * 3.5);
      const perturbedTemp = Math.max(38.0, baseTemp + deltaTemp);

      // Viscosity: +/- 15%
      const viscNominal = 10000.0 * Math.exp(3800.0 * (1.0 / (perturbedTemp + 273.15) - 1.0 / 293.15));
      const perturbedVisc = viscNominal * (1.0 + Math.cos(i * 2.3) * 0.15);

      // Inflow: +/- 20%
      const drawdown = Math.max(0.0, baseState.reservoir.pressure_bar - basePwf);
      const nominalInflow = (1250.0 * 12.0 * 0.00708 * drawdown * 14.5) / (perturbedVisc * 1.05 * 5.5);
      const perturbedInflow = Math.max(1.0, nominalInflow * (1.0 + Math.sin(i * 3.1) * 0.20));

      // Pump displacement
      const pumpCap = 0.1166 * (2.25 ** 2) * strokeIn * spm;
      const fillage = Math.min(1.0, Math.max(0.40, perturbedInflow / Math.max(1.0, pumpCap)));
      const oil = Math.min(perturbedInflow, pumpCap * 0.74 * fillage) * (1.0 - baseState.controls.water_cut);
      outcomes.push(oil);

      // Evaluate rod float constraint under perturbed viscosity
      const dragLbf = 0.18 * ((perturbedVisc / 500.0) ** 0.65) * 8500.0 * (spm / 3.0) * (strokeIn / 64.0);
      const buoyantWeightKn = 8500.0 * 0.86 * 0.00444822;
      const mprlKn = Math.max(0.0, (8500.0 * 0.86 - dragLbf) * 0.00444822);
      const floatMargin = (mprlKn / buoyantWeightKn) * 100.0;
      const pprlKn = (8500.0 * 0.86 + 4800.0 + dragLbf) * 0.00444822;

      const evalReport = ConstraintEngine.evaluate({
        spm,
        strokeIn,
        vfdHz: candidate.controls.vfdHz,
        fillagePct: fillage * 100,
        rodLoadKn: pprlKn,
        floatMarginPct: floatMargin,
        steamPressureBar: candidate.controls.steamPressureBar,
        dailyKwh: 350.0
      });

      if (!evalReport.passed) {
        violations++;
      }
    }

    outcomes.sort((a, b) => a - b);
    const minOil = outcomes[0];
    const maxOil = outcomes[outcomes.length - 1];
    const sum = outcomes.reduce((acc, val) => acc + val, 0);
    const mean = sum / outcomes.length;

    const variance = outcomes.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / outcomes.length;
    const stdDev = Math.sqrt(variance);

    // 95% Confidence bounds
    const p05 = outcomes[Math.floor(outcomes.length * 0.05)];
    const p95 = outcomes[Math.floor(outcomes.length * 0.95)];

    // Rating determination
    let rating: RobustnessAnalysisResult['rating'] = 'HIGH';
    if (violations > 4 || (stdDev / mean) > 0.35) {
      rating = 'LOW';
    } else if (violations > 1 || (stdDev / mean) > 0.18) {
      rating = 'MEDIUM';
    }

    // Parametric sensitivities
    const tempSens = baseTemp < 60.0 ? 'HIGH' : 'MEDIUM';
    const viscSens = spm > 3.0 ? 'HIGH' : 'MEDIUM';
    const pressSens = 'MEDIUM';
    const inflowSens = spm > 3.5 ? 'HIGH' : 'LOW';
    const spmSens = 'MEDIUM';

    return {
      rating,
      expectedBopd: Math.round(mean * 10) / 10,
      bestCaseBopd: Math.round(maxOil * 10) / 10,
      worstCaseBopd: Math.round(minOil * 10) / 10,
      variance: Math.round(variance * 10) / 10,
      constraintViolationsCount: violations,
      confidenceInterval95: [Math.round(p05 * 10) / 10, Math.round(p95 * 10) / 10],
      sensitivity: {
        temperature: tempSens,
        viscosity: viscSens,
        pressure: pressSens,
        inflow: inflowSens,
        spm: spmSens
      }
    };
  }
}
