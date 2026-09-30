/**
 * src/api/client.ts
 * Unified REST and WebSocket API Client for ASSURE-TWIN.
 * SIH 2026 — Problem Statement 26120: Digital Twin for CSS & SRP Operations in Heavy Oil Fields.
 * 
 * Provides typed methods for all backend endpoints with graceful local fallback if offline.
 */

export interface VirtualSensor {
  name: string;
  value: number;
  unit: string;
  lower_bound: number;
  upper_bound: number;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  source: string;
  inputs: string[];
}

export interface PumpabilityData {
  well_id: string;
  time_to_boundary_days: number;
  state: 'SAFE' | 'WARNING' | 'CRITICAL';
  critical_limiting_factor: string;
  decay_rate_days_per_day: number;
  status_badge: string;
  provenance: string;
}

export interface EnvelopeData {
  well_id: string;
  current_temp_c: number;
  current_spm: number;
  preferred_spm_min: number;
  preferred_spm_max: number;
  warning_spm_min: number;
  warning_spm_max: number;
  critical_spm_upper: number;
  status: string;
  shrinkage_factor_pct: number;
}

export interface ForecastPoint {
  day: number;
  temperature: number;
  viscosity: number;
  oil_rate: number;
  sor: number;
  energy: number;
  pump_fillage: number;
  rod_load: number;
  float_margin: number;
  confidence_lower: number;
  confidence_upper: number;
}

export interface ForecastData {
  well_id: string;
  horizon_days: number;
  points: ForecastPoint[];
  generated_at: string;
}

export interface ScenarioData {
  scenario_id: string;
  name: string;
  type: string;
  oil_rate: number;
  sor: number;
  steam_rate: number;
  energy_kw: number;
  float_margin_pct: number;
  pumpability_days: number;
  robustness: string;
  assurance_pass: boolean;
}

export interface OptimizationCandidate {
  candidate_id: string;
  title: string;
  spm: number;
  stroke_in: number;
  steam_volume_tons: number;
  projected_gain_bopd: number;
  sor: number;
  float_margin_pct: number;
  pumpability_days: number;
  robustness: string;
  overall_score: number;
}

export interface OptimizationResult {
  well_id: string;
  best_candidate: OptimizationCandidate;
  candidates: OptimizationCandidate[];
  solver_rationale: string;
}

export interface AssuranceCheck {
  id: number;
  name: string;
  category: string;
  passed: boolean;
  status: 'PASS' | 'WARNING' | 'FAIL';
  detail: string;
}

export interface AssuranceResult {
  well_id: string;
  status: string;
  overall_pass: boolean;
  gate_score_pct: number;
  checks: AssuranceCheck[];
  abstain_active: boolean;
  blocking_reasons: string[];
  required_data: string[];
}

export interface RecommendationCase {
  case_id: string;
  well_id: string;
  status: string;
  title: string;
  proposed_controls: Record<string, any>;
  expected_outcomes: Record<string, any>;
  causal_reasons_why: string[];
  counterfactual_rejections_why_not: string[];
  preconditions: string[];
  assurance_status: string;
  created_at: string;
  approved_by?: string | null;
  approval_timestamp?: string | null;
}

export class AssureApiClient {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    if (baseUrl) {
      this.baseUrl = baseUrl;
    } else {
      const envUrl = (import.meta as any).env?.VITE_API_URL;
      if (envUrl) {
        this.baseUrl = envUrl;
      } else if (typeof window !== 'undefined' && window.location.port !== '5173') {
        this.baseUrl = window.location.origin;
      } else {
        this.baseUrl = 'http://127.0.0.1:8000';
      }
    }
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  private async fetchJson<T>(path: string, options?: RequestInit): Promise<T | null> {
    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(options?.headers || {})
        }
      });
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return await res.json();
    } catch (err) {
      console.warn(`[AssureApiClient] Request to ${path} failed, falling back to local simulation data:`, err);
      return null;
    }
  }

  // Health
  async checkHealth(): Promise<{ status: string; sim_time_days?: number } | null> {
    return this.fetchJson<{ status: string; sim_time_days?: number }>('/health');
  }

  // Wells
  async getWells(): Promise<any[]> {
    const data = await this.fetchJson<any[]>('/api/v1/wells');
    return data || [{ id: 'BGW-17A', well_name: 'BGW-17A (Heavy Oil Producer)', status: 'ACTIVE' }];
  }

  // Simulation Controls
  async setControl(param: string, value: any): Promise<any> {
    return this.fetchJson('/api/v1/simulation/control', {
      method: 'POST',
      body: JSON.stringify({ param, value })
    });
  }

  async setControls(controls: Record<string, any>): Promise<any> {
    return this.fetchJson('/api/v1/simulation/controls', {
      method: 'POST',
      body: JSON.stringify(controls)
    });
  }

  async triggerDemo(mode: 'PHYSICS_DEMO' | 'SPM_EXPERIMENT'): Promise<any> {
    return this.fetchJson('/api/v1/simulation/demo', {
      method: 'POST',
      body: JSON.stringify({ mode })
    });
  }

  // Analytics
  async getVirtualDownhole(): Promise<Record<string, VirtualSensor> | null> {
    const res = await this.fetchJson<{ well_id: string; sensors: Record<string, VirtualSensor> }>('/api/v1/analytics/virtual-downhole');
    return res ? res.sensors : null;
  }

  async getPumpability(): Promise<PumpabilityData | null> {
    return this.fetchJson<PumpabilityData>('/api/v1/analytics/pumpability');
  }

  async getEnvelope(): Promise<EnvelopeData | null> {
    return this.fetchJson<EnvelopeData>('/api/v1/analytics/envelope');
  }

  // Forecast
  async getForecast(horizonDays: number = 30): Promise<ForecastData | null> {
    return this.fetchJson<ForecastData>(`/api/v1/forecast?horizon_days=${horizonDays}`);
  }

  // Scenarios
  async getScenarios(): Promise<ScenarioData[]> {
    const res = await this.fetchJson<{ scenarios: ScenarioData[] }>('/api/v1/scenarios/compare');
    return res ? res.scenarios : [];
  }

  async rehearseScenario(params: {
    spm: number;
    stroke_length_in: number;
    vfd_speed_hz: number;
    steam_volume_tons: number;
    soak_duration_days: number;
  }): Promise<any> {
    return this.fetchJson('/api/v1/scenarios/rehearse', {
      method: 'POST',
      body: JSON.stringify(params)
    });
  }

  async runRehearsal(spm: number, strokeInches: number, horizonDays: number = 30): Promise<any> {
    return this.fetchJson('/api/v1/wells/BGW-17A/rehearsal', {
      method: 'POST',
      body: JSON.stringify({ spm, stroke_inches: strokeInches, horizon_days: horizonDays })
    });
  }

  // Optimization
  async solveOptimization(weights?: {
    crude_revenue?: number;
    steam_penalty?: number;
    power_penalty?: number;
    mechanical_risk?: number;
  }): Promise<OptimizationResult | null> {
    return this.fetchJson<OptimizationResult>('/api/v1/optimization/solve', {
      method: 'POST',
      body: JSON.stringify({
        well_id: 'BGW-17A',
        weights: weights || {
          crude_revenue: 1.0,
          steam_penalty: 0.45,
          power_penalty: 0.15,
          mechanical_risk: 0.85
        }
      })
    });
  }

  // Recommendations
  async getRecommendations(): Promise<RecommendationCase[]> {
    const res = await this.fetchJson<RecommendationCase[]>('/api/v1/recommendations');
    return res || [];
  }

  /** M2 + C1 fix: Generate a fresh recommendation from current twin state (§108). */
  async generateRecommendation(weights?: {
    crude_revenue?: number;
    steam_penalty?: number;
    power_penalty?: number;
    mechanical_risk?: number;
  }): Promise<RecommendationCase | null> {
    return this.fetchJson<RecommendationCase>('/api/v1/recommendations/generate', {
      method: 'POST',
      body: weights ? JSON.stringify(weights) : undefined
    });
  }

  async approveRecommendation(caseId: string, actor: string = 'Senior Petroleum Engineer'): Promise<RecommendationCase | null> {
    return this.fetchJson<RecommendationCase>(`/api/v1/recommendations/${caseId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ actor, notes: 'Signed off from Assure-Twin workstation' })
    });
  }

  async rejectRecommendation(caseId: string, actor: string = 'Senior Petroleum Engineer', notes?: string): Promise<RecommendationCase | null> {
    return this.fetchJson<RecommendationCase>(`/api/v1/recommendations/${caseId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ actor, notes: notes || 'Rejected by engineer' })
    });
  }


  // Assurance
  async getAssuranceGate(): Promise<AssuranceResult | null> {
    return this.fetchJson<AssuranceResult>('/api/v1/assurance/evaluate');
  }

  // Alerts
  async getAlerts(): Promise<any[]> {
    const res = await this.fetchJson<any[]>('/api/v1/alerts');
    return res || [];
  }

  async acknowledgeAlert(alertId: string): Promise<any> {
    return this.fetchJson(`/api/v1/alerts/${alertId}/acknowledge`, {
      method: 'POST'
    });
  }

  // Calibration
  async reconcileOutcome(predictedOilBpd: number[], actualOilBpd: number[]): Promise<any> {
    return this.fetchJson('/api/v1/calibration/reconcile', {
      method: 'POST',
      body: JSON.stringify({
        predicted_oil_bpd: predictedOilBpd,
        actual_oil_bpd: actualOilBpd
      })
    });
  }

  async fitViscosity(temperaturesC: number[], viscositiesCp: number[], applyToWell = false): Promise<any> {
    return this.fetchJson('/api/v1/calibration/fit-viscosity', {
      method: 'POST',
      body: JSON.stringify({
        temperatures_c: temperaturesC,
        viscosities_cp: viscositiesCp,
        apply_to_active_well: applyToWell
      })
    });
  }

  // Field-Level Steam Scheduling (Feature 4)
  async getFieldSchedule(): Promise<any> {
    return this.fetchJson<any>('/api/v1/field/schedule');
  }

  async optimizeFieldSchedule(payload?: {
    boiler_capacity_t_d?: number;
    planning_horizon_days?: number;
    wells?: any[];
  }): Promise<any> {
    return this.fetchJson<any>('/api/v1/field/schedule/optimize', {
      method: 'POST',
      body: JSON.stringify(payload || {})
    });
  }
}

// Singleton API Client instance
export const assureApiClient = new AssureApiClient();
