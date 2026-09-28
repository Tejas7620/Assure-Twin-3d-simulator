/**
 * src/assure/tests/AssureTestSuite.ts
 * Automated Verification & Acceptance Suite for ASSURE-TWIN Layer (Phases 68 - 77).
 * Tests all analytical engines, boundary conditions, failure modes, and abstain protocols.
 */

import { SimulationClient } from '../../sim/SimulationClient.ts';
import { DataQualityEngine } from '../DataQualityEngine.ts';
import { VirtualDownholeEngine } from '../VirtualDownholeEngine.ts';
import { StateEstimator } from '../StateEstimator.ts';
import { ThermalReserveEngine } from '../ThermalReserveEngine.ts';
import { ThermalTrajectoryEngine } from '../ThermalTrajectoryEngine.ts';
import { ThermoMechanicalEnvelopeEngine } from '../ThermoMechanicalEnvelopeEngine.ts';
import { PumpabilityEngine } from '../PumpabilityEngine.ts';
import { CSSReadinessEngine } from '../CSSReadinessEngine.ts';
import { FutureTrajectoryEngine } from '../FutureTrajectoryEngine.ts';
import { ConstraintEngine } from '../ConstraintEngine.ts';
import { PhysicsValidationEngine } from '../PhysicsValidationEngine.ts';
import { MLDemoSurrogateProvider } from '../MLPredictionProvider.ts';
import { ModelAgreementEngine } from '../ModelAgreementEngine.ts';
import { OODEngine } from '../OODEngine.ts';
import { RobustnessEngine } from '../RobustnessEngine.ts';
import { DecisionRehearsalEngine } from '../DecisionRehearsalEngine.ts';
import { AssuranceEngine } from '../AssuranceEngine.ts';
import { RecommendationContract } from '../RecommendationContract.ts';
import { WhyEngine } from '../WhyEngine.ts';
import { WhyNotEngine } from '../WhyNotEngine.ts';
import { OutcomeReconciliationEngine } from '../OutcomeReconciliationEngine.ts';
import { RecalibrationEngine } from '../RecalibrationEngine.ts';
import { AuditTrailEngine } from '../AuditTrailEngine.ts';

export interface TestResult {
  suite: string;
  name: string;
  passed: boolean;
  message: string;
}

export class AssureTestSuite {
  public static runAll(): { total: number; passed: number; failed: number; results: TestResult[] } {
    const results: TestResult[] = [];
    const record = (suite: string, name: string, condition: boolean, message: string) => {
      results.push({ suite, name, passed: condition, message: condition ? `PASS: ${message}` : `FAIL: ${message}` });
    };

    const sim = new SimulationClient();
    const state = sim.state;

    // Test 1: Data Quality (Normal & Stale Sensor Failure)
    const dqEngine = new DataQualityEngine();
    const dqNormal = dqEngine.evaluate(state, 'NORMAL');
    record('DataQuality', 'Normal Telemetry Integrity', dqNormal.score >= 80, `Data quality score: ${dqNormal.score}%`);

    const dqFailure = dqEngine.evaluate(state, 'DEMO_SENSOR_FAILURE');
    record('DataQuality', 'Stale Sensor Detection (Phase 51)', dqFailure.staleSensorsCount > 0 && dqFailure.status === 'UNUSABLE', 'Correctly flagged stale sensor freeze.');

    // Test 2: Virtual Downhole Sensors (Phase 4)
    const vdEngine = new VirtualDownholeEngine();
    const vd = vdEngine.estimate(state);
    record('VirtualDownhole', 'Virtual Perforation Temp Estimation', vd.downholeTemperature.value > 40 && vd.downholeTemperature.confidence === 'HIGH', `T_dh: ${vd.downholeTemperature.value}°C`);
    record('VirtualDownhole', 'Dynamic Fluid Level Estimation', vd.dynamicFluidLevel.value > 100 && vd.dynamicFluidLevel.value < 1200, `Fluid level: ${vd.dynamicFluidLevel.value}m TVD`);
    record('VirtualDownhole', 'Pump Intake Pressure', vd.pumpIntakePressure.value > 1.0, `PIP: ${vd.pumpIntakePressure.value} bar`);
    record('VirtualDownhole', 'In-Situ Viscosity', vd.downholeViscosity.value >= 100, `Viscosity: ${vd.downholeViscosity.value} cP`);

    // Test 3: State Estimator (Phase 5)
    const health = StateEstimator.evaluateHealth(state, dqNormal, vd);
    record('StateEstimator', 'Normal State Health Evaluation', ['HEALTHY', 'TRANSITION'].includes(health), `Status: ${health}`);

    // Test 4: Thermal Reserve & Cooling Trajectory (Phase 6 & 7)
    const tr = ThermalReserveEngine.evaluate(state);
    record('ThermalReserve', 'Thermal Enthalpy Reserve Calculation', tr.reservePct >= 0 && tr.reservePct <= 100, `Reserve: ${tr.reservePct}%`);
    const trajForecast = ThermalTrajectoryEngine.forecast(state);
    record('ThermalTrajectory', 'Multi-Horizon Forecast', trajForecast.length === 5, 'Generated +0, +1, +3, +7, +14 day points.');

    // Test 5: Dynamic Thermo-Mechanical Operating Envelope (Phase 8 & 9)
    const env = ThermoMechanicalEnvelopeEngine.evaluate(state);
    record('OperatingEnvelope', 'Dynamic Envelope Moving Boundary', env.preferredSpmMax > env.preferredSpmMin, `Preferred: ${env.preferredSpmMin} - ${env.preferredSpmMax} SPM`);

    // Test 6: Pumpability Window (Phase 10 & 11)
    const pumpability = PumpabilityEngine.calculate(state);
    record('Pumpability', 'Time to Boundary Calculation', pumpability.timeToBoundaryDays >= 0, `Window: ${pumpability.timeToBoundaryDays} days`);

    // Test 7: CSS Readiness Engine (Phase 12 & 13)
    const cssReadiness = CSSReadinessEngine.evaluate(state);
    record('CSSReadiness', 'CSS Opportunity Window Evaluation', cssReadiness.recommendedCssWindowDays.length === 2, `Status: ${cssReadiness.status}`);

    // Test 8: Future Trajectory Projection (Phase 14)
    const futureTraj = FutureTrajectoryEngine.project(state);
    record('FutureTrajectory', 'Immutable 14-Day Trajectory Generation', futureTraj.points.length === 5 && futureTraj.isImmutable, 'Projections sealed as immutable.');

    // Test 9: Constraints Engine (Phase 22)
    const constraintsReport = ConstraintEngine.evaluate({
      spm: 3.2,
      strokeIn: 64,
      vfdHz: 50,
      fillagePct: 75,
      rodLoadKn: 18.5,
      floatMarginPct: 28,
      steamPressureBar: 120,
      dailyKwh: 340
    });
    record('Constraints', 'Mechanical Limit Checks', constraintsReport.passed, `All limits passed: ${constraintsReport.passCount} PASS`);

    // Test 10: Physics Validation (Phase 23)
    const physReport = PhysicsValidationEngine.validate({
      tempC: 72.6,
      viscCp: 1840,
      inflowBpd: 38.5,
      pumpCapBpd: 42.5,
      oilRateBopd: 32.4,
      waterCut: 0.128,
      fillageRatio: 0.76,
      pprlKn: 18.7,
      mprlKn: 5.4
    });
    record('PhysicsValidation', 'Mass & Thermodynamic Bounds Check', physReport.status === 'PHYSICS_VALID', `Physics score: ${physReport.scorePct}%`);

    // Test 11: ML Surrogate & Model Agreement (Phase 24 & 25)
    const mlProvider = new MLDemoSurrogateProvider();
    const mlPred = mlProvider.predict({
      spm: 3.2,
      strokeInches: 64,
      temperatureC: 72.6,
      viscosityCp: 1840,
      pwfBar: 18.2,
      waterCut: 0.128,
      steamVolumeTD: 0.0
    });
    record('MLSurrogate', 'Surrogate Model Inference', mlPred.predictedOilBopd > 10, `ML predicted: ${mlPred.predictedOilBopd} BOPD`);

    const agreementNormal = ModelAgreementEngine.evaluate(25.0, mlPred.predictedOilBopd, 'NORMAL');
    record('ModelAgreement', 'Physics vs. ML Agreement Check', agreementNormal.recommendationAllowed, `Consensus verified within ${agreementNormal.divergencePct}%`);

    const agreementDisagreement = ModelAgreementEngine.evaluate(31.2, 47.8, 'DEMO_MODEL_DISAGREEMENT');
    record('ModelAgreement', 'Disagreement Abstain Trigger (Phase 52)', !agreementDisagreement.recommendationAllowed && agreementDisagreement.status === 'DISAGREEMENT', 'Blocks recommendation when models diverge.');

    // Test 12: Out-of-Domain Detection (Phase 26)
    const oodNormal = OODEngine.evaluate({ tempC: 72.6, viscCp: 1840, pressureBar: 68.4, spm: 3.2, strokeIn: 64, oilRateBopd: 32.4 }, 'NORMAL');
    record('OOD', 'In-Domain Operational Point Verification', oodNormal.recommendationAllowed, `OOD Status: ${oodNormal.status}`);

    const oodFailure = OODEngine.evaluate({ tempC: 30, viscCp: 28000, pressureBar: 15, spm: 6.5, strokeIn: 130, oilRateBopd: 1.0 }, 'DEMO_OUT_OF_DOMAIN');
    record('OOD', 'Out-of-Domain Block Trigger (Phase 53)', !oodFailure.recommendationAllowed && oodFailure.status === 'HIGH', 'Blocks recommendation when outside training envelope.');

    // Test 13: Robustness Analysis (Phase 18)
    const candidates = DecisionRehearsalEngine.getStandardCandidates(state);
    const jointCand = candidates.find(c => c.id === 'JOINT') || candidates[0];
    const robustness = RobustnessEngine.analyze(jointCand, state);
    record('Robustness', 'Monte-Carlo Input Perturbation', ['HIGH', 'MEDIUM'].includes(robustness.rating), `Robustness Rating: ${robustness.rating}`);

    // Test 14: Decision Rehearsal (Phase 15 & 16)
    const rehearsals = DecisionRehearsalEngine.rehearseAll(state);
    record('Rehearsal', '4 Counterfactual Rehearsal Execution', rehearsals.length === 4, `Rehearsed: ${rehearsals.map(r => r.candidate.id).join(', ')}`);

    // Test 15: Assurance Gate & Abstain Protocol (Phases 27 & 28)
    const jointRehearsal = rehearsals.find(r => r.candidate.id === 'JOINT') || rehearsals[0];
    const assuranceReport = AssuranceEngine.evaluate(jointRehearsal, state, dqNormal, 'NORMAL');
    record('Assurance', '12-Checkpoint Gatekeeper Verification', assuranceReport.checks.length === 12 && assuranceReport.allowRecommendation, `Cleared gates: ${assuranceReport.gateScorePct}%`);

    const assuranceBlocked = AssuranceEngine.evaluate(jointRehearsal, state, dqFailure, 'DEMO_SENSOR_FAILURE');
    record('Assurance', 'No Safe Recommendation Abstain Execution', !assuranceBlocked.allowRecommendation && assuranceBlocked.status === 'NO SAFE RECOMMENDATION', 'Mandatory abstain protocol triggered.');

    // Test 16: Recommendation Contract (Phase 30)
    const recCase = RecommendationContract.buildCase(jointRehearsal, state, dqNormal, 'NORMAL');
    record('RecommendationContract', 'Recommendation Case Assembly', recCase.recommendationId.startsWith('REC-') && recCase.rationale.length > 0, `Assembled Case ID: ${recCase.recommendationId}`);

    // Test 17: Causal Why and Why-Not Engines (Phase 31 & 32)
    const whyChain = WhyEngine.explainCausalChain(jointCand, state);
    record('WhyEngine', 'Causal Physics Explanation Chain', whyChain.length >= 4, `Generated ${whyChain.length}-step physical reasoning chain.`);
    const whyNot = WhyNotEngine.explainAlternatives('JOINT', state);
    record('WhyNotEngine', 'Counterfactual Rejection Justifications', whyNot.length >= 3, `Formulated justifications for ${whyNot.length} rival options.`);

    // Test 18: Audit Trail Logging (Phase 39)
    const auditEvents = AuditTrailEngine.logTrace(state, jointRehearsal, recCase);
    record('AuditTrail', 'Complete Decision Trace Recording', auditEvents.length >= 10, `Recorded ${auditEvents.length} verifiable lineage events.`);

    // Test 19: Outcome Reconciliation (Phase 36)
    const simObserved = JSON.parse(JSON.stringify(state));
    simObserved.production.oil_rate_bopd = 34.2;
    const outcome = OutcomeReconciliationEngine.reconcile(recCase, simObserved);
    record('OutcomeReconciliation', 'Post-Action Drift & Error Analysis', outcome.errors.oilPctError >= 0, `Oil error: ${outcome.errors.oilPctError}%`);

    // Test 20: Recalibration Center (Phase 37)
    const params = RecalibrationEngine.getParameters();
    record('Recalibration', 'Model Parameter Tuning Inventory', params.length >= 4, `Loaded ${params.length} tuning parameters.`);

    const total = results.length;
    const passed = results.filter(r => r.passed).length;
    const failed = total - passed;

    return { total, passed, failed, results };
  }
}
