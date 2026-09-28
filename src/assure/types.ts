/**
 * src/assure/types.ts
 * Master type definitions for ASSURE-TWIN intelligence layer (PS 26120).
 * Strictly additive, decoupled from existing 3D simulator internals.
 */

export type ProvenanceSource =
  | 'MEASURED'
  | 'PUBLIC'
  | 'CALIBRATED'
  | 'ASSUMED'
  | 'SYNTHETIC'
  | 'PREDICTED'
  | 'MODEL-DERIVED'
  | 'DEMO'
  | 'CONFIGURED';

export interface ProvenanceValue<T = number> {
  value: T;
  provenance: ProvenanceSource;
  unit: string;
  confidence?: 'HIGH' | 'MEDIUM' | 'LOW';
  timestamp?: number;
  sourceNote?: string;
}

export type WellHealthState =
  | 'HEALTHY'
  | 'TRANSITION'
  | 'WARNING'
  | 'CRITICAL'
  | 'UNKNOWN';

export interface DataQualityIssue {
  id: string;
  field: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  description: string;
  detectedAt: number;
}

export interface DataQualityReport {
  score: number; // 0 - 100%
  status: 'EXCELLENT' | 'ACCEPTABLE' | 'DEGRADED' | 'UNUSABLE';
  outliersCount: number;
  staleSensorsCount: number;
  unitInconsistenciesCount: number;
  issues: DataQualityIssue[];
  timestamp: number;
}

export interface VirtualSensorEstimate {
  name: string;
  symbol: string;
  value: number;
  unit: string;
  estimatedRange: [number, number];
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  sourceInputs: string[];
  provenance: ProvenanceSource;
  timestamp: number;
  description: string;
}

export interface VirtualDownholeState {
  downholeTemperature: VirtualSensorEstimate;
  downholePressure: VirtualSensorEstimate;
  pumpIntakePressure: VirtualSensorEstimate;
  dynamicFluidLevel: VirtualSensorEstimate;
  downholeViscosity: VirtualSensorEstimate;
  effectiveInflow: VirtualSensorEstimate;
  effectiveFillage: VirtualSensorEstimate;
  rodDrag: VirtualSensorEstimate;
  floatMargin: VirtualSensorEstimate;
  pumpabilityScore: VirtualSensorEstimate;
}

export interface ThermoMechanicalEnvelope {
  currentTempC: number;
  currentViscCp: number;
  currentSpm: number;
  currentStrokeIn: number;
  preferredSpmMin: number;
  preferredSpmMax: number;
  warningSpmMin: number;
  warningSpmMax: number;
  criticalSpmUpper: number; // Rod float threshold
  criticalSpmLower: number; // Stagnation / inflow starvation threshold
  status: 'SAFE' | 'WARNING' | 'CRITICAL';
  shrinkageFactorPct: number; // How much envelope has contracted due to cooling
  operatingPointNormalized: { x: number; y: number }; // [0-1] coordinates
}

export interface PumpabilityState {
  timeToBoundaryDays: number;
  state: 'SAFE' | 'WARNING' | 'CRITICAL';
  criticalLimitingFactor: string; // e.g., "Rod float margin < 10% from viscous drag surge"
  decayRateDaysPerDay: number;
  forecastBoundaryDay: number;
  provenance: ProvenanceSource;
}

export interface ThermalReserveState {
  reservePct: number; // 0 - 100%
  currentTempC: number;
  referenceTempC: number; // Baseline formation temp (38 C for Baghewala)
  coolingRateCPerDay: number;
  thermalFrontMeters: number;
  timeSinceLastCssDays: number;
  cssCycleCount: number;
  status: 'OPTIMAL' | 'MODERATE' | 'DEPLETED';
  provenance: ProvenanceSource;
}

export interface CSSReadinessState {
  status: 'NOT READY' | 'PREPARE' | 'WINDOW OPEN' | 'URGENT' | 'UNCERTAIN';
  currentCycleDay: number;
  totalCycleTargetDays: number;
  readinessScorePct: number; // 0 - 100%
  recommendedCssWindowDays: [number, number]; // e.g. [45, 52]
  sorTrend: 'STABLE' | 'RISING' | 'EXCESSIVE';
  economicInflectionReached: boolean;
  explanation: string;
}

export interface TrajectoryPoint {
  dayOffset: number; // 0, 1, 3, 7, 14
  temperatureC: number;
  viscosityCp: number;
  inflowBpd: number;
  oilRateBopd: number;
  waterRateBpd: number;
  cumOilBbl: number;
  sor: number;
  pumpFillagePct: number;
  rodLoadKn: number;
  floatMarginPct: number;
  powerKw: number;
  pumpabilityDays: number;
}

export interface FutureTrajectory {
  scenarioId: string;
  scenarioName: string;
  points: TrajectoryPoint[]; // Day 0, 1, 3, 7, 14
  isImmutable: boolean;
  generatedAt: number;
}

export interface CandidateAction {
  id: 'CURRENT' | 'CSS_ONLY' | 'SRP_ONLY' | 'JOINT' | 'CUSTOM';
  name: string;
  description: string;
  controls: {
    spm: number;
    strokeInches: number;
    vfdHz: number;
    steamVolumeTons: number;
    steamPressureBar: number;
    soakTimeDays: number;
    productionCutoffBopd: number;
  };
}

export interface CandidateRehearsalResult {
  candidate: CandidateAction;
  predictedOutcomes: {
    oilRateBopd: number;
    cumOil14dBbl: number;
    sor: number;
    powerKw: number;
    dailyKwh: number;
    energyPerBbl: number;
    pumpFillagePct: number;
    rodLoadKn: number;
    floatMarginPct: number;
    pumpabilityDays: number;
    netOperatingValueUsdPerDay: number;
  };
  trajectory: FutureTrajectory;
  robustness: {
    rating: 'HIGH' | 'MEDIUM' | 'LOW';
    expectedBopd: number;
    bestCaseBopd: number;
    worstCaseBopd: number;
    variance: number;
    constraintViolationsCount: number;
    confidenceInterval95: [number, number];
  };
  constraintsSummary: {
    passed: boolean;
    passCount: number;
    warningCount: number;
    failCount: number;
    details: Array<{ constraint: string; value: number; limit: number; status: 'PASS' | 'WARNING' | 'FAIL' }>;
  };
  sensitivity: {
    temperature: 'LOW' | 'MEDIUM' | 'HIGH';
    viscosity: 'LOW' | 'MEDIUM' | 'HIGH';
    pressure: 'LOW' | 'MEDIUM' | 'HIGH';
    inflow: 'LOW' | 'MEDIUM' | 'HIGH';
    spm: 'LOW' | 'MEDIUM' | 'HIGH';
  };
  physicsScorePct: number;
  mlSurrogateBopd: number;
  mlAgreementPct: number;
  mlAgreementStatus: 'AGREEMENT' | 'DISAGREEMENT';
  oodStatus: 'LOW' | 'MEDIUM' | 'HIGH';
  assuranceGateStatus: 'VERIFIED' | 'REVIEW_REQUIRED' | 'NO_SAFE_RECOMMENDATION';
}

export interface SolutionState {
  timestamp: number;
  wellId: string;
  fieldId: string;
  reservoirId: string;
  wellHealth: WellHealthState;
  provenance: Record<string, ProvenanceSource>;
  dataQuality: DataQualityReport;
  controls: {
    spm: number;
    strokeInches: number;
    strokeM: number;
    vfdHz: number;
    steamVolumeTD: number;
    waterCut: number;
    pwfBar: number;
    scenario: string;
  };
  reservoir: {
    pressureBar: number;
    temperatureC: number;
    viscosityCp: number;
    thermalFrontM: number;
    inflowBpd: number;
    porosityPct: number;
    permeabilityMd: number;
  };
  pump: {
    capacityBpd: number;
    fillage: number;
    fillagePct: number;
    efficiency: number;
    efficiencyPct: number;
    status: 'NORMAL' | 'LOW' | 'CRITICAL';
  };
  rod: {
    pprlKn: number;
    mprlKn: number;
    rodLoadKn: number;
    floatMarginPct: number;
    viscousDragKn: number;
  };
  production: {
    liquidRateBpd: number;
    oilRateBopd: number;
    waterRateBpd: number;
    cumOilBbl: number;
    cumLiquidBbl: number;
  };
  economics: {
    powerKw: number;
    dailyKwh: number;
    energyPerBbl: number;
    sor: number;
    liftingCostPerBbl: number;
    steamCostPerTon: number;
    oilPricePerBbl: number;
    netCashflowPerDay: number;
  };
  virtualDownhole: VirtualDownholeState;
  thermalReserve: ThermalReserveState;
  operatingEnvelope: ThermoMechanicalEnvelope;
  pumpability: PumpabilityState;
  cssReadiness: CSSReadinessState;
}

export interface RecommendationCase {
  recommendationId: string;
  timestamp: number;
  wellId: string;
  currentState: {
    temperatureC: number;
    viscosityCp: number;
    spm: number;
    strokeIn: number;
    oilRateBopd: number;
    floatMarginPct: number;
    pumpabilityDays: number;
  };
  proposedControls: CandidateAction['controls'];
  expectedOutcomes: {
    oilRateBopd: number;
    gainBopd: number;
    sor: number;
    pumpabilityDays: number;
    floatMarginPct: number;
    energySavedKwhPerDay: number;
    netIncrementalValueUsdPerDay: number;
  };
  uncertainty: {
    confidence: 'HIGH' | 'MEDIUM' | 'LOW';
    range95Pct: [number, number];
  };
  robustness: 'HIGH' | 'MEDIUM' | 'LOW';
  constraintsStatus: 'ALL_PASS' | 'WARNINGS_PRESENT' | 'FAILED';
  physicsResult: { status: 'PHYSICS_VALID' | 'PHYSICS_WARNING' | 'PHYSICS_FAILED'; detail: string };
  mlResult: { predictedBopd: number; modelName: string; version: string };
  agreement: { status: 'AGREEMENT' | 'DISAGREEMENT'; divergencePct: number };
  ood: { status: 'LOW' | 'MEDIUM' | 'HIGH'; distanceMetric: number };
  rationale: string[];
  whyNotAlternatives: Array<{ candidateId: string; reason: string }>;
  preconditions: string[];
  abortConditions: string[];
  provenance: Record<string, ProvenanceSource>;
  assuranceStatus: 'VERIFIED FOR ENGINEER REVIEW' | 'REVIEW REQUIRED' | 'NO SAFE RECOMMENDATION';
  approvalStatus: 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'APPLIED' | 'RECONCILED';
  engineerNotes?: string;
  approvedBy?: string;
  approvalTimestamp?: number;
}

export interface DecisionAuditEvent {
  eventId: string;
  timestamp: number;
  stage:
    | 'OBSERVATION'
    | 'STATE_ESTIMATE'
    | 'THERMAL_MODEL'
    | 'VISCOSITY_MODEL'
    | 'SRP_MODEL'
    | 'CANDIDATE_GENERATION'
    | 'SIMULATION'
    | 'ROBUSTNESS'
    | 'CONSTRAINTS'
    | 'ASSURANCE'
    | 'RECOMMENDATION'
    | 'APPROVAL'
    | 'OUTCOME';
  description: string;
  dataSnapshot: any;
  passed: boolean;
}

export interface OutcomeRecord {
  recommendationId: string;
  wellId: string;
  evaluationTimestamp: number;
  predicted: {
    oilRateBopd: number;
    sor: number;
    floatMarginPct: number;
    temperatureC: number;
    viscosityCp: number;
  };
  observed: {
    oilRateBopd: number;
    sor: number;
    floatMarginPct: number;
    temperatureC: number;
    viscosityCp: number;
  };
  errors: {
    oilAbsError: number;
    oilPctError: number;
    tempAbsError: number;
    viscAbsError: number;
    modelDriftIndicator: number; // 0 - 1
  };
  recalibrationSuggested: boolean;
  suggestedParamAdjustments: Array<{ parameter: string; currentValue: number; suggestedValue: number; reason: string }>;
}

export type DemoScenarioMode =
  | 'NORMAL'
  | 'DEMO_LATE_CSS'
  | 'DEMO_SENSOR_FAILURE'
  | 'DEMO_MODEL_DISAGREEMENT'
  | 'DEMO_OUT_OF_DOMAIN';
