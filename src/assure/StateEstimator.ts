/**
 * src/assure/StateEstimator.ts
 * Hidden Operational State & Health Evaluator (Phase 5).
 * Synthesizes multi-domain inputs into authoritative WellHealthState.
 */

import type { WellHealthState, DataQualityReport, VirtualDownholeState } from './types.ts';
import type { SimulationState } from '../sim/SimulationClient.ts';

export class StateEstimator {
  /**
   * Categorizes holistic operational health of the heavy oil well system
   */
  public static evaluateHealth(
    state: SimulationState,
    dataQuality: DataQualityReport,
    virtualState: VirtualDownholeState
  ): WellHealthState {
    // 1. If data quality is degraded or unusable, state is UNKNOWN
    if (dataQuality.status === 'UNUSABLE') {
      return 'UNKNOWN';
    }

    const floatMargin = virtualState.floatMargin.value;
    const fillage = virtualState.effectiveFillage.value;
    const temp = state.reservoir.temperature_c;
    const spm = state.controls.spm;

    // 2. Critical Conditions:
    // - Rod float danger: floatMargin < 10%
    // - Severe fluid pound / gas lock: fillage < 25%
    // - Excessive gearbox stress / rod load > 25 kN
    if (floatMargin < 10.0 || fillage < 25.0 || state.srp.pprl_kn > 25.0) {
      return 'CRITICAL';
    }

    // 3. Warning Conditions:
    // - Float margin shrinking: 10% <= margin < 20%
    // - Inflow starvation: fillage < 50%
    // - High SPM while reservoir is cold: temp < 60°C and SPM > 3.0
    if (floatMargin < 20.0 || fillage < 50.0 || (temp < 60.0 && spm > 3.0)) {
      return 'WARNING';
    }

    // 4. Transition State:
    // - Cooling phase active or recent steam cycle transition
    if (state.time.css_phase === 'COOLING' || (temp > 60.0 && temp < 80.0)) {
      return 'TRANSITION';
    }

    // 5. Healthy State:
    // - Ample float margin (> 20%), normal fillage (> 65%), safe rod loads
    return 'HEALTHY';
  }
}
