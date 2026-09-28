/**
 * src/assure/OutcomeReconciliationEngine.ts
 * Post-Execution Outcome Reconciliation & Model Drift Tracker (Phase 36).
 * Compares predicted values against observed/simulated actual telemetry.
 * Computes absolute and percentage error vectors and detects model calibration drift.
 */

import type { OutcomeRecord, RecommendationCase } from './types.ts';
import type { SimulationState } from '../sim/SimulationClient.ts';

export class OutcomeReconciliationEngine {
  /**
   * Reconciles a past recommendation case against observed well conditions
   */
  public static reconcile(
    recCase: RecommendationCase,
    observedState: SimulationState
  ): OutcomeRecord {
    const predOil = recCase.expectedOutcomes.oilRateBopd;
    const obsOil = observedState.production.oil_rate_bopd;

    const oilAbsError = Math.round(Math.abs(obsOil - predOil) * 10) / 10;
    const oilPctError = Math.round((oilAbsError / Math.max(1.0, predOil)) * 1000) / 10;

    const tempAbsError = Math.round(Math.abs(observedState.reservoir.temperature_c - recCase.currentState.temperatureC) * 10) / 10;
    const viscAbsError = Math.round(Math.abs(observedState.reservoir.viscosity_cp - recCase.currentState.viscosityCp));

    // Drift metric (0 to 1 scale): composite deviation of temperature and production
    const modelDriftIndicator = Math.round(Math.min(1.0, (oilPctError / 50.0) * 0.7 + (tempAbsError / 10.0) * 0.3) * 100) / 100;
    const recalibrationSuggested = (modelDriftIndicator >= 0.25) || (oilPctError >= 15.0);

    const adjustments: OutcomeRecord['suggestedParamAdjustments'] = [];
    if (recalibrationSuggested) {
      if (obsOil < predOil) {
        adjustments.push({
          parameter: 'Darcy Inflow Productivity Index (J_vogel)',
          currentValue: 0.00708,
          suggestedValue: 0.00645,
          reason: `Observed production (${obsOil} BOPD) was lower than predicted (${predOil} BOPD); indicates near-wellbore skin factor increase.`
        });
      }
      adjustments.push({
        parameter: 'Thermal Decay Constant (lambda)',
        currentValue: 0.022,
        suggestedValue: 0.025,
        reason: 'Reservoir matrix cooling gradient is slightly steeper than baseline Marx-Langenheim coefficient.'
      });
    }

    return {
      recommendationId: recCase.recommendationId,
      wellId: recCase.wellId,
      evaluationTimestamp: Date.now(),
      predicted: {
        oilRateBopd: predOil,
        sor: recCase.expectedOutcomes.sor,
        floatMarginPct: recCase.expectedOutcomes.floatMarginPct,
        temperatureC: recCase.currentState.temperatureC,
        viscosityCp: recCase.currentState.viscosityCp
      },
      observed: {
        oilRateBopd: obsOil,
        sor: observedState.economics.sor,
        floatMarginPct: observedState.srp.float_margin_pct,
        temperatureC: observedState.reservoir.temperature_c,
        viscosityCp: observedState.reservoir.viscosity_cp
      },
      errors: {
        oilAbsError,
        oilPctError,
        tempAbsError,
        viscAbsError,
        modelDriftIndicator
      },
      recalibrationSuggested,
      suggestedParamAdjustments: adjustments
    };
  }
}
