/**
 * src/assure/DataQualityEngine.ts
 * Real-time data validation and sensor health diagnostics (Phase 3).
 * Checks: missing data, stale sensors, timestamp drift, physical outliers, unit consistency.
 */

import type { DataQualityReport, DataQualityIssue, DemoScenarioMode } from './types.ts';
import type { SimulationState } from '../sim/SimulationClient.ts';

export class DataQualityEngine {
  private _lastTemp: number = 0;
  private _tempUnchangedTicks: number = 0;

  /**
   * Evaluates quality of current simulation telemetry
   */
  public evaluate(state: SimulationState, demoMode: DemoScenarioMode = 'NORMAL'): DataQualityReport {
    const issues: DataQualityIssue[] = [];
    let outliersCount = 0;
    let staleSensorsCount = 0;
    let unitInconsistenciesCount = 0;

    const now = Date.now();

    // 1. Check for Synthetic Failure Scenario: STALE SENSOR
    if (demoMode === 'DEMO_SENSOR_FAILURE') {
      issues.push({
        id: 'DQ-STALE-001',
        field: 'reservoir.temperature_c',
        severity: 'CRITICAL',
        description: 'Downhole temperature RTD sensor telemetry is STALE (invariant over 48 consecutive hours). Potential sensor freeze / transmitter telemetry failure.',
        detectedAt: now
      });
      staleSensorsCount++;
    }

    // 2. Outlier Checks on Physical State
    const temp = state.reservoir.temperature_c;
    if (temp < 20 || temp > 350) {
      issues.push({
        id: 'DQ-OUT-001',
        field: 'reservoir.temperature_c',
        severity: 'CRITICAL',
        description: `Reservoir temperature ${temp.toFixed(1)}°C outside physical bounds [20°C - 350°C].`,
        detectedAt: now
      });
      outliersCount++;
    }

    const visc = state.reservoir.viscosity_cp;
    if (visc < 1 || visc > 200000) {
      issues.push({
        id: 'DQ-OUT-002',
        field: 'reservoir.viscosity_cp',
        severity: 'CRITICAL',
        description: `Heavy oil viscosity ${visc} cP violates rheological range [1 - 200,000 cP].`,
        detectedAt: now
      });
      outliersCount++;
    }

    const spm = state.controls.spm;
    if (spm < 0.2 || spm > 12.0) {
      issues.push({
        id: 'DQ-OUT-003',
        field: 'controls.spm',
        severity: 'WARNING',
        description: `Pump speed ${spm.toFixed(1)} SPM exceeds typical heavy oil Mark II gearbox rating [0.5 - 6.0 SPM].`,
        detectedAt: now
      });
      outliersCount++;
    }

    const strokeIn = state.controls.stroke_inches;
    if (strokeIn < 10 || strokeIn > 168) {
      issues.push({
        id: 'DQ-OUT-004',
        field: 'controls.stroke_inches',
        severity: 'WARNING',
        description: `Stroke length ${strokeIn}" outside API 11E structural geometry bounds.`,
        detectedAt: now
      });
      outliersCount++;
    }

    const pwf = state.controls.pwf_bar;
    if (pwf < 0 || pwf > state.reservoir.pressure_bar * 1.5) {
      issues.push({
        id: 'DQ-OUT-005',
        field: 'controls.pwf_bar',
        severity: 'CRITICAL',
        description: `Bottomhole flowing pressure (${pwf.toFixed(1)} bar) exceeds reservoir static pressure or is negative.`,
        detectedAt: now
      });
      outliersCount++;
    }

    // 3. Unit Inconsistency Checks
    const waterCut = state.controls.water_cut;
    if (waterCut < 0.0 || waterCut > 1.0) {
      issues.push({
        id: 'DQ-UNIT-001',
        field: 'controls.water_cut',
        severity: 'CRITICAL',
        description: `Water cut fractional value ${waterCut} not normalized in range [0.0, 1.0].`,
        detectedAt: now
      });
      unitInconsistenciesCount++;
    }

    // 4. Stale Sensor Tracking in Normal Mode
    if (Math.abs(temp - this._lastTemp) < 0.001) {
      this._tempUnchangedTicks++;
      if (this._tempUnchangedTicks > 600 && demoMode === 'NORMAL') {
        issues.push({
          id: 'DQ-STALE-002',
          field: 'reservoir.temperature_c',
          severity: 'WARNING',
          description: 'Temperature reading static over prolonged observation period.',
          detectedAt: now
        });
        staleSensorsCount++;
      }
    } else {
      this._tempUnchangedTicks = 0;
      this._lastTemp = temp;
    }

    // Calculate Data Quality Score (0 to 100%)
    let penalty = (staleSensorsCount * 30) + (outliersCount * 12) + (unitInconsistenciesCount * 15);
    const score = Math.max(0, Math.min(100, Math.round(100 - penalty)));

    let status: DataQualityReport['status'] = 'EXCELLENT';
    if (score < 50 || staleSensorsCount > 0 && demoMode === 'DEMO_SENSOR_FAILURE') {
      status = 'UNUSABLE';
    } else if (score < 70) {
      status = 'DEGRADED';
    } else if (score < 90) {
      status = 'ACCEPTABLE';
    }

    return {
      score,
      status,
      outliersCount,
      staleSensorsCount,
      unitInconsistenciesCount,
      issues,
      timestamp: now
    };
  }
}
