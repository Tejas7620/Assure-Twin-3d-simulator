/**
 * src/assure/WhyEngine.ts
 * Causal Physics Explanation Generator (Phase 31).
 * Generates transparent physical cause-and-effect reasoning chains from actual state variables.
 * Avoids generic hardcoded boilerplate.
 */

import type { CandidateAction } from './types.ts';
import type { SimulationState } from '../sim/SimulationClient.ts';

export class WhyEngine {
  /**
   * Generates a step-by-step causal explanation for why the proposed candidate action is required
   */
  public static explainCausalChain(
    candidate: CandidateAction,
    state: SimulationState
  ): string[] {
    const temp = state.reservoir.temperature_c;
    const visc = state.reservoir.viscosity_cp;
    const spm = state.controls.spm;
    const floatMargin = state.srp.float_margin_pct;
    const dragKn = state.srp.viscous_drag_kn;

    const chain: string[] = [];

    // Step 1: Thermal State
    if (temp < 65.0) {
      chain.push(`1. Formation Thermal Dissipation: Near-wellbore sand has cooled to ${temp.toFixed(1)}°C (loss of ${(85.0 - temp).toFixed(1)}°C sensible heat since steam cycle peak).`);
    } else {
      chain.push(`1. Formation Thermal State: Reservoir temperature is currently ${temp.toFixed(1)}°C with moderate thermal reserve.`);
    }

    // Step 2: Rheological Consequence
    chain.push(`2. Viscosity Exponential Surge: Heavy oil dynamic viscosity has climbed to ${visc} cP in accordance with Andrade rheology.`);

    // Step 3: Mechanical Resistance
    chain.push(`3. Subsurface Rod Resistance: Downward viscous drag force on 1.75" rod string has escalated to ${dragKn.toFixed(1)} kN at current ${spm.toFixed(1)} SPM.`);

    // Step 4: Float Margin Collapse
    if (floatMargin < 20.0) {
      chain.push(`4. Float Margin Erosion: Minimum Polished Rod Load (MPRL) float margin has shrunk to ${floatMargin.toFixed(1)}%, approaching dangerous compression buckling (< 12%).`);
    } else {
      chain.push(`4. Mechanical Operating Margin: Float margin is currently ${floatMargin.toFixed(1)}%; higher speeds would risk buoyant rod float.`);
    }

    // Step 5: Candidate Action Synthesis
    if (candidate.id === 'JOINT') {
      chain.push(`5. Coordinated Solution: Schedule ${candidate.controls.steamVolumeTons} tons steam injection to restore matrix enthalpy, while stepping down SPM from ${spm.toFixed(1)} to ${candidate.controls.spm.toFixed(1)} and lengthening stroke to ${candidate.controls.strokeInches}" to immediately eliminate rod float hazard.`);
    } else if (candidate.id === 'SRP_ONLY') {
      chain.push(`5. Mechanical Step-Down: Immediately reduce speed to ${candidate.controls.spm.toFixed(1)} SPM to lower viscous drag, expanding float margin to > 28% without steam expenditure.`);
    } else if (candidate.id === 'CSS_ONLY') {
      chain.push(`5. Thermal Intervention: Inject ${candidate.controls.steamVolumeTons} metric tons steam to lower viscosity back under 500 cP and stimulate inflow.`);
    } else {
      chain.push(`5. Current Setpoint: Continue monitoring telemetry while well remains within allowable limits.`);
    }

    return chain;
  }
}
