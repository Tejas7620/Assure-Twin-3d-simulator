/**
 * src/assure/FutureTrajectoryEngine.ts
 * Multi-Horizon Future Trajectory Generator (Phase 14).
 * Generates immutable projection vectors for +1d, +3d, +7d, +14d forward in time.
 * Never mutates live simulator state.
 */

import type { FutureTrajectory, TrajectoryPoint, CandidateAction } from './types.ts';
import type { SimulationState } from '../sim/SimulationClient.ts';
import { ThermalReserveEngine } from './ThermalReserveEngine.ts';

export class FutureTrajectoryEngine {
  /**
   * Generates a forward trajectory scenario under specified or default operating controls
   */
  public static project(
    state: SimulationState,
    candidate?: CandidateAction
  ): FutureTrajectory {
    const horizons = [0, 1, 3, 7, 14];
    const initialTemp = state.reservoir.temperature_c;
    const initialPwf = state.controls.pwf_bar;
    const baseTemp = ThermalReserveEngine.BASELINE_FORMATION_TEMP_C;

    // Operating controls applied in this projection
    const spm = candidate ? candidate.controls.spm : state.controls.spm;
    const strokeIn = candidate ? candidate.controls.strokeInches : state.controls.stroke_inches;
    const isCssCandidate = candidate && candidate.id === 'CSS_ONLY';
    const isJointCandidate = candidate && candidate.id === 'JOINT';

    const points: TrajectoryPoint[] = [];
    let cumOil = state.production.cumulative_oil_bbl;

    // Physics parameters for Baghewala sandstone
    const lambda = 0.022; // cooling decay constant
    let previousDay = 0;

    for (const day of horizons) {
      const dtDays = day - previousDay;
      previousDay = day;

      let temp = initialTemp;
      if (isCssCandidate || isJointCandidate) {
        // Steam injection boosts temperature initially
        temp = Math.min(175.0, initialTemp + (candidate?.controls.steamVolumeTons || 2500) / 120.0 * Math.min(1.0, day / 3.0));
      } else {
        // Natural cooling
        temp = baseTemp + (initialTemp - baseTemp) * Math.exp(-lambda * day);
      }

      // Viscosity calculation
      const visc = Math.max(20.0, 10000.0 * Math.exp(3800.0 * (1.0 / (temp + 273.15) - 1.0 / 293.15)));

      // Inflow rate via Vogel IPR with CSS thermal skin cleanup factor
      const stimFactor = isCssCandidate || isJointCandidate ? 1.65 : 1.0;
      const drawdown = Math.max(0.0, state.reservoir.pressure_bar - initialPwf);
      const inflow = Math.max(0.0, (1250.0 * stimFactor * 12.0 * 0.00708 * drawdown * 14.5) / (visc * 1.05 * 5.5));

      // Pump volumetric capacity
      const pumpCap = 0.1166 * (2.25 ** 2) * strokeIn * spm;
      const fillageRatio = Math.min(1.0, Math.max(0.40, inflow / Math.max(1.0, pumpCap)));
      const fillagePct = Math.round(fillageRatio * 100);

      // Liquid and oil production
      const liquid = Math.min(inflow, pumpCap * 0.74 * fillageRatio);
      const waterCut = state.controls.water_cut;
      const oil = liquid * (1.0 - waterCut);
      const water = liquid - oil;

      cumOil += oil * dtDays;

      // Sucker rod loading & float margin
      const spmFactor = (spm / 3.0) * (strokeIn / 64.0);
      const drag = 0.18 * ((visc / 500.0) ** 0.65) * 8500.0 * spmFactor;
      const pprl = (8500.0 * 0.86 + 4800.0 + drag) * 0.00444822;
      const mprl = Math.max(0.0, (8500.0 * 0.86 - drag) * 0.00444822);
      const floatMargin = Math.max(0.0, (mprl / (8500.0 * 0.86 * 0.00444822)) * 100.0);

      // Energy consumption (Polished rod mechanical power + surface gearbox/motor losses)
      const powerKw = Math.max(2.5, 0.035 * pprl * (strokeIn * 0.0254) * spm + 3.8);
      const sor = isCssCandidate ? 5.2 : (isJointCandidate ? 4.6 : state.economics.sor);

      // Estimated remaining pumpability days from this future point
      const remainingPumpability = Math.max(0.0, Math.round((temp > 52 ? (temp - 52) / (lambda * (temp - baseTemp)) : 0.0) * 10) / 10);

      points.push({
        dayOffset: day,
        temperatureC: Math.round(temp * 10) / 10,
        viscosityCp: Math.round(visc),
        inflowBpd: Math.round(inflow * 10) / 10,
        oilRateBopd: Math.round(oil * 10) / 10,
        waterRateBpd: Math.round(water * 10) / 10,
        cumOilBbl: Math.round(cumOil * 10) / 10,
        sor: Math.round(sor * 10) / 10,
        pumpFillagePct: fillagePct,
        rodLoadKn: Math.round(pprl * 10) / 10,
        floatMarginPct: Math.round(floatMargin * 10) / 10,
        powerKw: Math.round(powerKw * 10) / 10,
        pumpabilityDays: remainingPumpability
      });
    }

    return {
      scenarioId: candidate ? `TRAJ_${candidate.id}` : 'TRAJ_CURRENT',
      scenarioName: candidate ? candidate.name : 'Current Operating Strategy',
      points,
      isImmutable: true,
      generatedAt: Date.now()
    };
  }
}
