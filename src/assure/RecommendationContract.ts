/**
 * src/assure/RecommendationContract.ts
 * Formal Recommendation Case Generator (Phase 30).
 * Constructs an immutable, audit-ready operational contract containing complete lineage,
 * physical rationale, risk boundaries, preconditions, and abort conditions.
 */

import type {
  RecommendationCase,
  CandidateRehearsalResult,
  DataQualityReport,
  DemoScenarioMode
} from './types.ts';
import type { SimulationState } from '../sim/SimulationClient.ts';
import { WhyEngine } from './WhyEngine.ts';
import { WhyNotEngine } from './WhyNotEngine.ts';
import { ProvenanceEngine } from './ProvenanceEngine.ts';
import { AssuranceEngine } from './AssuranceEngine.ts';

export class RecommendationContract {
  /**
   * Assembles a formal RecommendationCase from rehearsal and assurance evaluations
   */
  public static buildCase(
    rehearsal: CandidateRehearsalResult,
    state: SimulationState,
    dataQuality: DataQualityReport,
    demoMode: DemoScenarioMode = 'NORMAL'
  ): RecommendationCase {
    const assuranceReport = AssuranceEngine.evaluate(rehearsal, state, dataQuality, demoMode);
    const candidate = rehearsal.candidate;
    const now = Date.now();

    const gainBopd = Math.round((rehearsal.predictedOutcomes.oilRateBopd - state.production.oil_rate_bopd) * 10) / 10;
    const currentPumpabilityDays = Math.max(0.1, Math.round(((state.reservoir.temperature_c - 52.0) / 1.8) * 10) / 10);

    const rationale = WhyEngine.explainCausalChain(candidate, state);
    const whyNotAlternatives = WhyNotEngine.explainAlternatives(candidate.id, state);

    const preconditions = [
      'Wellhead casing and tubing pressure transmitters verified within +/- 0.5 bar calibration.',
      'Surface flowline electrical heat tracing circuit confirmed operational.',
      'Separator liquid level control operational; 3-phase dump valves responsive.',
      'VFD drive communications established and motor winding thermistors < 85°C.'
    ];

    const abortConditions = [
      'Minimum Polished Rod Load (MPRL) drops below 0.8 kN (float margin < 8%).',
      'Peak Polished Rod Load (PPRL) exceeds 24.5 kN (structural beam limit).',
      'Wellhead flowline temperature drops below 45°C during fluid transit.',
      'Severe acoustic fluid pound detected on polished rod load cell for > 5 consecutive strokes.'
    ];

    const recId = `REC-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-BGW17A-${Math.floor(Math.random() * 9000 + 1000)}`;

    return {
      recommendationId: recId,
      timestamp: now,
      wellId: 'BGW-17A (Synthetic Demo Well)',
      currentState: {
        temperatureC: state.reservoir.temperature_c,
        viscosityCp: state.reservoir.viscosity_cp,
        spm: state.controls.spm,
        strokeIn: state.controls.stroke_inches,
        oilRateBopd: state.production.oil_rate_bopd,
        floatMarginPct: state.srp.float_margin_pct,
        pumpabilityDays: currentPumpabilityDays
      },
      proposedControls: { ...candidate.controls },
      expectedOutcomes: {
        oilRateBopd: rehearsal.predictedOutcomes.oilRateBopd,
        gainBopd,
        sor: rehearsal.predictedOutcomes.sor,
        pumpabilityDays: rehearsal.predictedOutcomes.pumpabilityDays,
        floatMarginPct: rehearsal.predictedOutcomes.floatMarginPct,
        energySavedKwhPerDay: Math.max(0, Math.round((state.economics.daily_kwh - rehearsal.predictedOutcomes.dailyKwh) * 10) / 10),
        netIncrementalValueUsdPerDay: rehearsal.predictedOutcomes.netOperatingValueUsdPerDay
      },
      uncertainty: {
        confidence: rehearsal.robustness.rating === 'HIGH' ? 'HIGH' : (rehearsal.robustness.rating === 'MEDIUM' ? 'MEDIUM' : 'LOW'),
        range95Pct: rehearsal.robustness.confidenceInterval95
      },
      robustness: rehearsal.robustness.rating,
      constraintsStatus: rehearsal.constraintsSummary.passed
        ? (rehearsal.constraintsSummary.warningCount > 0 ? 'WARNINGS_PRESENT' : 'ALL_PASS')
        : 'FAILED',
      physicsResult: {
        status: rehearsal.physicsScorePct >= 80 ? 'PHYSICS_VALID' : (rehearsal.physicsScorePct >= 60 ? 'PHYSICS_WARNING' : 'PHYSICS_FAILED'),
        detail: `Physics consistency score: ${rehearsal.physicsScorePct}%`
      },
      mlResult: {
        predictedBopd: rehearsal.mlSurrogateBopd,
        modelName: 'Baghewala-CSS-SRP-Surrogate-GBDT',
        version: 'v1.4.2-synthetic-calibrated'
      },
      agreement: {
        status: rehearsal.mlAgreementStatus,
        divergencePct: rehearsal.mlAgreementPct
      },
      ood: {
        status: rehearsal.oodStatus,
        distanceMetric: rehearsal.oodStatus === 'HIGH' ? 4.65 : 1.12
      },
      rationale,
      whyNotAlternatives,
      preconditions,
      abortConditions,
      provenance: ProvenanceEngine.getProvenanceMap(),
      assuranceStatus: assuranceReport.status,
      approvalStatus: assuranceReport.status === 'VERIFIED FOR ENGINEER REVIEW' ? 'PENDING_REVIEW' : 'DRAFT'
    };
  }
}
