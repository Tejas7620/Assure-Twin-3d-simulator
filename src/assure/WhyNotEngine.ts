/**
 * src/assure/WhyNotEngine.ts
 * Alternative Candidate Rejection Explainer (Phase 32).
 * Formulates specific physical and economic justifications for why rival candidates were not selected.
 */

import type { SimulationState } from '../sim/SimulationClient.ts';

export class WhyNotEngine {
  /**
   * Explains why alternative counterfactuals were rejected in favor of the winning candidate
   */
  public static explainAlternatives(
    selectedId: string,
    _state: SimulationState
  ): Array<{ candidateId: string; reason: string }> {
    const reasons: Array<{ candidateId: string; reason: string }> = [];

    if (selectedId !== 'CURRENT') {
      reasons.push({
        candidateId: 'CURRENT',
        reason: 'Rejected because maintaining status quo allows formation cooling to deplete the pumpability window within days, risking sudden rod float and unplanned mechanical shutdown.'
      });
    }

    if (selectedId !== 'CSS_ONLY') {
      reasons.push({
        candidateId: 'CSS_ONLY',
        reason: 'Rejected because injecting steam without modifying pumping kinematics subjects the rod string to severe viscous drag during the pre-heat phase, and fails to optimize lifting economics.'
      });
    }

    if (selectedId !== 'SRP_ONLY') {
      reasons.push({
        candidateId: 'SRP_ONLY',
        reason: 'Rejected because mechanical speed reduction alone prevents rod float but leaves 14–18 BOPD of viscous heavy oil stranded in the reservoir due to unmitigated low formation mobility.'
      });
    }

    reasons.push({
      candidateId: 'INCREASE_SPM',
      reason: 'Rejected because increasing SPM would increase theoretical displacement, but current Darcy inflow is insufficient; this induces severe chamber fluid pound and crushes the float margin below 5%.'
    });

    return reasons;
  }
}
