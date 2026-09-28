/**
 * src/assure/ModelAgreementEngine.ts
 * Dual-Model Cross-Validation & Agreement Verifier (Phase 25).
 * Compares First-Principles Physics prediction against ML Surrogate output.
 * If divergence exceeds configurable tolerance (default 20%),
 * flags DISAGREEMENT and blocks automated recommendation.
 */

import type { DemoScenarioMode } from './types.ts';

export interface ModelAgreementReport {
  physicsBopd: number;
  mlBopd: number;
  divergencePct: number;
  status: 'AGREEMENT' | 'DISAGREEMENT';
  recommendationAllowed: boolean;
  message: string;
}

export class ModelAgreementEngine {
  // Threshold above which discrepancy is considered unphysical model divergence
  public static readonly DIVERGENCE_THRESHOLD_PCT: number = 20.0;

  /**
   * Compares physics prediction with ML surrogate prediction
   */
  public static evaluate(
    physicsBopd: number,
    mlBopd: number,
    demoMode: DemoScenarioMode = 'NORMAL'
  ): ModelAgreementReport {
    // Check for synthetic failure demo: DEMO_MODEL_DISAGREEMENT
    if (demoMode === 'DEMO_MODEL_DISAGREEMENT') {
      const forcedPhysics = 31.2;
      const forcedMl = 47.8;
      const forcedDiv = Math.round((Math.abs(forcedMl - forcedPhysics) / forcedPhysics) * 1000) / 10;
      return {
        physicsBopd: forcedPhysics,
        mlBopd: forcedMl,
        divergencePct: forcedDiv,
        status: 'DISAGREEMENT',
        recommendationAllowed: false,
        message: `CRITICAL MODEL DIVERGENCE: Physics predicts ${forcedPhysics} BOPD while ML surrogate predicts ${forcedMl} BOPD (${forcedDiv}% divergence). Potential ML training hallucination or uncalibrated physics regime. RECOMMENDATION BLOCKED.`
      };
    }

    const absDiff = Math.abs(physicsBopd - mlBopd);
    const denom = Math.max(1.0, (physicsBopd + mlBopd) / 2.0);
    const divergencePct = Math.round((absDiff / denom) * 1000) / 10;

    const isAgreement = divergencePct <= this.DIVERGENCE_THRESHOLD_PCT;

    return {
      physicsBopd,
      mlBopd,
      divergencePct,
      status: isAgreement ? 'AGREEMENT' : 'DISAGREEMENT',
      recommendationAllowed: isAgreement,
      message: isAgreement
        ? `Dual-model consensus confirmed: Physics (${physicsBopd} BOPD) and ML (${mlBopd} BOPD) align within ${divergencePct}% variance.`
        : `Divergence exceeds allowable ${this.DIVERGENCE_THRESHOLD_PCT}% tolerance (${divergencePct}%). Machine learning surrogate contradicts fluid physics. Automated recommendation suppressed.`
    };
  }
}
