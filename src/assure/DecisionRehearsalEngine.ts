/**
 * src/assure/DecisionRehearsalEngine.ts
 * Digital Decision Rehearsal & Counterfactual Simulator (Phases 15, 16, 17).
 * "Simulate the consequence before changing the well."
 * Evaluates the 4 Foundational Counterfactuals (Current, CSS Only, SRP Only, Joint) + Custom Candidates
 * through the complete predictive, robustness, constraint, and dual-model pipeline.
 */

import type { CandidateAction, CandidateRehearsalResult, DemoScenarioMode } from './types.ts';
import type { SimulationState } from '../sim/SimulationClient.ts';
import { FutureTrajectoryEngine } from './FutureTrajectoryEngine.ts';
import { RobustnessEngine } from './RobustnessEngine.ts';
import { ConstraintEngine } from './ConstraintEngine.ts';
import { PhysicsValidationEngine } from './PhysicsValidationEngine.ts';
import { MLDemoSurrogateProvider } from './MLPredictionProvider.ts';
import { ModelAgreementEngine } from './ModelAgreementEngine.ts';
import { OODEngine } from './OODEngine.ts';
import { JointOptimizationEngine } from './JointOptimizationEngine.ts';

export class DecisionRehearsalEngine {
  private static readonly _mlProvider = new MLDemoSurrogateProvider();

  /**
   * Generates the 4 canonical counterfactual candidates + optional custom candidate
   */
  public static getStandardCandidates(
    state: SimulationState,
    customAction?: CandidateAction
  ): CandidateAction[] {
    const current: CandidateAction = {
      id: 'CURRENT',
      name: 'Current Practice (Baseline Status Quo)',
      description: 'Maintain existing pumping setpoints (SPM 3.2, Stroke 64") without intervention as formation cools naturally.',
      controls: {
        spm: state.controls.spm,
        strokeInches: state.controls.stroke_inches,
        vfdHz: 50.0,
        steamVolumeTons: 0.0,
        steamPressureBar: 0.0,
        soakTimeDays: 0.0,
        productionCutoffBopd: 10.0
      }
    };

    const cssOnly: CandidateAction = {
      id: 'CSS_ONLY',
      name: 'Cyclic Steam Stimulation Only (Thermal Recharge)',
      description: 'Inject 2,500 metric tons of dry saturated steam at 120 bar without modifying surface beam unit kinematics.',
      controls: {
        spm: state.controls.spm,
        strokeInches: state.controls.stroke_inches,
        vfdHz: 50.0,
        steamVolumeTons: 2500.0,
        steamPressureBar: 120.0,
        soakTimeDays: 4.0,
        productionCutoffBopd: 12.0
      }
    };

    const srpOnly: CandidateAction = {
      id: 'SRP_ONLY',
      name: 'SRP Kinematics Step-Down Only (Mechanical Preservation)',
      description: 'Reduce pumping speed to 2.2 SPM and extend stroke length to 84" to preserve rod float margin without steam capital expenditure.',
      controls: {
        spm: 2.2,
        strokeInches: 84.0,
        vfdHz: 38.0,
        steamVolumeTons: 0.0,
        steamPressureBar: 0.0,
        soakTimeDays: 0.0,
        productionCutoffBopd: 8.0
      }
    };

    const joint = JointOptimizationEngine.solveOptimalCandidate(state);

    const candidates = [current, cssOnly, srpOnly, joint];
    if (customAction) {
      candidates.push(customAction);
    }
    return candidates;
  }

  /**
   * Rehearses a candidate action through the complete physical, trajectory, and verification pipeline
   */
  public static rehearse(
    candidate: CandidateAction,
    state: SimulationState,
    demoMode: DemoScenarioMode = 'NORMAL'
  ): CandidateRehearsalResult {
    // 1. Generate forward multi-horizon trajectory (Day 0, 1, 3, 7, 14)
    const trajectory = FutureTrajectoryEngine.project(state, candidate);
    const day7 = trajectory.points.find(p => p.dayOffset === 7) || trajectory.points[3];
    const day14 = trajectory.points.find(p => p.dayOffset === 14) || trajectory.points[4];

    // 2. Compute key outcomes
    const oilRateBopd = day7.oilRateBopd;
    const cumOil14dBbl = day14.cumOilBbl - trajectory.points[0].cumOilBbl;
    const sor = day7.sor;
    const powerKw = day7.powerKw;
    const dailyKwh = Math.round(powerKw * 24.0 * 10) / 10;
    const energyPerBbl = Math.round((dailyKwh / Math.max(1.0, oilRateBopd)) * 10) / 10;
    const pumpFillagePct = day7.pumpFillagePct;
    const rodLoadKn = day7.rodLoadKn;
    const floatMarginPct = day7.floatMarginPct;
    const pumpabilityDays = day7.pumpabilityDays;

    // Commercial calculation (Demo assumptions: Oil $72/bbl, Steam $18/ton, Electricity $0.12/kWh)
    const dailyRev = oilRateBopd * 72.0;
    const dailyElecCost = dailyKwh * 0.12;
    const dailySteamCost = (candidate.controls.steamVolumeTons / 14.0) * 18.0;
    const netOperatingValueUsdPerDay = Math.round((dailyRev - dailyElecCost - dailySteamCost) * 10) / 10;

    // 3. Robustness analysis (Monte-Carlo perturbation)
    const robustness = RobustnessEngine.analyze(candidate, state);

    // 4. Operational constraints evaluation
    const constraintsReport = ConstraintEngine.evaluate({
      spm: candidate.controls.spm,
      strokeIn: candidate.controls.strokeInches,
      vfdHz: candidate.controls.vfdHz,
      fillagePct: pumpFillagePct,
      rodLoadKn,
      floatMarginPct,
      steamPressureBar: candidate.controls.steamPressureBar,
      dailyKwh
    });

    // 5. First-Principles Physics Validation
    const pumpCap = 0.1166 * (2.25 ** 2) * candidate.controls.strokeInches * candidate.controls.spm;
    const mprlKn = Math.max(0.1, rodLoadKn * (floatMarginPct / 100.0));
    const physicsReport = PhysicsValidationEngine.validate({
      tempC: day7.temperatureC,
      viscCp: day7.viscosityCp,
      inflowBpd: day7.inflowBpd,
      pumpCapBpd: pumpCap,
      oilRateBopd,
      waterCut: state.controls.water_cut,
      fillageRatio: pumpFillagePct / 100.0,
      pprlKn: rodLoadKn,
      mprlKn
    });

    // 6. ML Surrogate Prediction
    const mlPred = this._mlProvider.predict({
      spm: candidate.controls.spm,
      strokeInches: candidate.controls.strokeInches,
      temperatureC: day7.temperatureC,
      viscosityCp: day7.viscosityCp,
      pwfBar: state.controls.pwf_bar,
      waterCut: state.controls.water_cut,
      steamVolumeTD: candidate.controls.steamVolumeTons / 14.0
    });

    // 7. Dual-Model Agreement Verification
    const agreementReport = ModelAgreementEngine.evaluate(oilRateBopd, mlPred.predictedOilBopd, demoMode);

    // 8. Out-of-Domain Verification
    const oodReport = OODEngine.evaluate({
      tempC: day7.temperatureC,
      viscCp: day7.viscosityCp,
      pressureBar: state.reservoir.pressure_bar,
      spm: candidate.controls.spm,
      strokeIn: candidate.controls.strokeInches,
      oilRateBopd
    }, demoMode);

    // 9. Assurance Gate Status for this candidate
    let assuranceGateStatus: CandidateRehearsalResult['assuranceGateStatus'] = 'VERIFIED';
    if (!constraintsReport.passed || !agreementReport.recommendationAllowed || !oodReport.recommendationAllowed || physicsReport.status === 'PHYSICS_FAILED') {
      assuranceGateStatus = 'NO_SAFE_RECOMMENDATION';
    } else if (constraintsReport.warningCount > 0 || robustness.rating === 'LOW' || physicsReport.status === 'PHYSICS_WARNING') {
      assuranceGateStatus = 'REVIEW_REQUIRED';
    }

    return {
      candidate,
      predictedOutcomes: {
        oilRateBopd,
        cumOil14dBbl: Math.round(cumOil14dBbl * 10) / 10,
        sor,
        powerKw: Math.round(powerKw * 10) / 10,
        dailyKwh,
        energyPerBbl,
        pumpFillagePct,
        rodLoadKn,
        floatMarginPct,
        pumpabilityDays,
        netOperatingValueUsdPerDay
      },
      trajectory,
      robustness,
      constraintsSummary: constraintsReport,
      sensitivity: robustness.sensitivity,
      physicsScorePct: physicsReport.scorePct,
      mlSurrogateBopd: mlPred.predictedOilBopd,
      mlAgreementPct: agreementReport.divergencePct,
      mlAgreementStatus: agreementReport.status,
      oodStatus: oodReport.status,
      assuranceGateStatus
    };
  }

  /**
   * Rehearses all candidates from the same initial state in parallel
   */
  public static rehearseAll(
    state: SimulationState,
    customAction?: CandidateAction,
    demoMode: DemoScenarioMode = 'NORMAL'
  ): CandidateRehearsalResult[] {
    const candidates = this.getStandardCandidates(state, customAction);
    return candidates.map(c => this.rehearse(c, state, demoMode));
  }
}
