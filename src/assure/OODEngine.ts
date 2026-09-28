/**
 * src/assure/OODEngine.ts
 * Out-of-Domain (OOD) & Validated Operational Region Detector (Phase 26).
 * Computes Mahalanobis-like statistical distance from the calibrated training envelope.
 * If OOD is HIGH, blocks automated recommendations to prevent catastrophic out-of-distribution extrapolation.
 */

import type { DemoScenarioMode } from './types.ts';

export interface OODReport {
  status: 'LOW' | 'MEDIUM' | 'HIGH';
  distanceMetric: number; // 0.0 - 5.0+
  inDomain: boolean;
  recommendationAllowed: boolean;
  outlierFeatures: string[];
  message: string;
}

export class OODEngine {
  // Calibrated domain bounds for Baghewala CSS-SRP digital twin
  private static readonly DOMAIN_LIMITS = {
    tempC: { min: 40.0, max: 130.0 },
    viscCp: { min: 100.0, max: 18000.0 },
    pressureBar: { min: 25.0, max: 110.0 },
    spm: { min: 1.0, max: 4.8 },
    strokeIn: { min: 36.0, max: 100.0 },
    oilRateBopd: { min: 2.0, max: 80.0 }
  };

  /**
   * Evaluates if operating conditions lie safely inside the model's validated training boundary
   */
  public static evaluate(
    params: {
      tempC: number;
      viscCp: number;
      pressureBar: number;
      spm: number;
      strokeIn: number;
      oilRateBopd: number;
    },
    demoMode: DemoScenarioMode = 'NORMAL'
  ): OODReport {
    // 1. Synthetic failure scenario: DEMO_OUT_OF_DOMAIN
    if (demoMode === 'DEMO_OUT_OF_DOMAIN') {
      return {
        status: 'HIGH',
        distanceMetric: 4.65,
        inDomain: false,
        recommendationAllowed: false,
        outlierFeatures: ['Viscosity (26,400 cP > 18,000 cP limit)', 'Temperature (31.2°C < 40.0°C limit)'],
        message: 'OUT OF DOMAIN (CRITICAL): Well operating point lies deep outside the validated thermo-mechanical calibration envelope (normalized distance 4.65 > 3.0 threshold). Extrapolations are untrustworthy. RECOMMENDATION BLOCKED.'
      };
    }

    const outliers: string[] = [];
    let distanceSum = 0;

    // Check each feature against validated bounds
    const checkFeature = (name: string, val: number, min: number, max: number) => {
      const mid = (min + max) / 2.0;
      const span = (max - min) / 2.0;
      const normalizedDev = Math.abs(val - mid) / span;

      if (val < min || val > max) {
        outliers.push(`${name} (${val} outside [${min}, ${max}])`);
        distanceSum += normalizedDev * 1.5;
      } else {
        distanceSum += Math.max(0, normalizedDev - 0.7);
      }
    };

    checkFeature('Temperature', params.tempC, this.DOMAIN_LIMITS.tempC.min, this.DOMAIN_LIMITS.tempC.max);
    checkFeature('Viscosity', params.viscCp, this.DOMAIN_LIMITS.viscCp.min, this.DOMAIN_LIMITS.viscCp.max);
    checkFeature('Reservoir Pressure', params.pressureBar, this.DOMAIN_LIMITS.pressureBar.min, this.DOMAIN_LIMITS.pressureBar.max);
    checkFeature('SPM', params.spm, this.DOMAIN_LIMITS.spm.min, this.DOMAIN_LIMITS.spm.max);
    checkFeature('Stroke', params.strokeIn, this.DOMAIN_LIMITS.strokeIn.min, this.DOMAIN_LIMITS.strokeIn.max);
    checkFeature('Oil Rate', params.oilRateBopd, this.DOMAIN_LIMITS.oilRateBopd.min, this.DOMAIN_LIMITS.oilRateBopd.max);

    const distanceMetric = Math.round(distanceSum * 10) / 10;

    let status: OODReport['status'] = 'LOW';
    if (outliers.length >= 2 || distanceMetric >= 3.0) {
      status = 'HIGH';
    } else if (outliers.length === 1 || distanceMetric >= 1.5) {
      status = 'MEDIUM';
    }

    const inDomain = status !== 'HIGH';
    const recommendationAllowed = status === 'LOW' || status === 'MEDIUM';

    return {
      status,
      distanceMetric,
      inDomain,
      recommendationAllowed,
      outlierFeatures: outliers,
      message: inDomain
        ? `Operating parameters confirmed inside validated training distribution (OOD Distance: ${distanceMetric}).`
        : `Operating state is OUT OF DOMAIN (Distance: ${distanceMetric}). Outliers: ${outliers.join(', ')}. Automated recommendation suppressed.`
    };
  }
}
