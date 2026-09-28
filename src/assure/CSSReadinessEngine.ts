/**
 * src/assure/CSSReadinessEngine.ts
 * CSS Cycle Timing & Readiness Evaluator (Phases 12 & 13).
 * Answers "WHEN SHOULD THE NEXT CSS CYCLE BE PREPARED?" by evaluating
 * thermal depletion, SOR trends, oil production decline, and pumpability limits.
 */

import type { CSSReadinessState } from './types.ts';
import type { SimulationState } from '../sim/SimulationClient.ts';
import { ThermalReserveEngine } from './ThermalReserveEngine.ts';
import { PumpabilityEngine } from './PumpabilityEngine.ts';

export class CSSReadinessEngine {
  /**
   * Evaluates the readiness of the well to undergo its next Cyclic Steam Stimulation cycle
   */
  public static evaluate(state: SimulationState): CSSReadinessState {
    const thermalState = ThermalReserveEngine.evaluate(state);
    const pumpability = PumpabilityEngine.calculate(state);
    const oilRate = state.production.oil_rate_bopd;
    const sor = state.economics.sor;

    const totalCycleTargetDays = 60.0;
    const currentCycleDay = Math.round(state.time.sim_time_days % totalCycleTargetDays);

    // Multi-factor readiness scoring (0 to 100%)
    // High score means CSS cycle is strongly indicated
    let score = 0;

    // 1. Thermal reserve depletion (weight: 35%)
    if (thermalState.reservePct < 25.0) score += 35;
    else if (thermalState.reservePct < 45.0) score += 20;
    else if (thermalState.reservePct < 65.0) score += 10;

    // 2. Pumpability window shrinking (weight: 30%)
    if (pumpability.timeToBoundaryDays < 3.0) score += 30;
    else if (pumpability.timeToBoundaryDays < 7.0) score += 20;
    else if (pumpability.timeToBoundaryDays < 12.0) score += 10;

    // 3. Oil rate decline below economic threshold (weight: 20%)
    if (oilRate < 12.0) score += 20;
    else if (oilRate < 20.0) score += 15;
    else if (oilRate < 30.0) score += 5;

    // 4. Cycle elapsed duration (weight: 15%)
    if (currentCycleDay >= 48) score += 15;
    else if (currentCycleDay >= 40) score += 10;

    let status: CSSReadinessState['status'] = 'NOT READY';
    let explanation = 'Well exhibits robust thermal reserve and stable production; artificial lift is well within safe boundaries.';

    if (score >= 75 || pumpability.timeToBoundaryDays <= 2.0) {
      status = 'URGENT';
      explanation = 'Severe thermal decay and rod-float hazard imminent. Immediate steam cycle mobilization required.';
    } else if (score >= 55 || currentCycleDay >= 44) {
      status = 'WINDOW OPEN';
      explanation = 'Optimal thermal-economic window reached. Steam generation and surface flowline prep should commence.';
    } else if (score >= 35 || currentCycleDay >= 36) {
      status = 'PREPARE';
      explanation = 'Approaching late cycle inflection. Schedule boiler fuel allocation and water treatment for Day 44–48.';
    }

    const sorTrend: CSSReadinessState['sorTrend'] = sor > 8.0 ? 'EXCESSIVE' : (sor > 6.0 ? 'RISING' : 'STABLE');
    const economicInflectionReached = (oilRate < 15.0) || (pumpability.timeToBoundaryDays < 4.0);

    // Recommended steam opportunity window in cycle days
    const windowStart = Math.max(38, Math.round(totalCycleTargetDays * 0.72));
    const windowEnd = Math.round(totalCycleTargetDays * 0.88);

    return {
      status,
      currentCycleDay,
      totalCycleTargetDays,
      readinessScorePct: Math.min(100, score),
      recommendedCssWindowDays: [windowStart, windowEnd],
      sorTrend,
      economicInflectionReached,
      explanation
    };
  }
}
