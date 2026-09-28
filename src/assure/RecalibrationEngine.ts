/**
 * src/assure/RecalibrationEngine.ts
 * Parameter Calibration & History Match Tuning Center (Phase 37 & 85).
 * Generates proposed adjustments for thermal conductivity, skin factors, and Andrade coefficients.
 * Strictly adheres to rule: NEVER automatically mutates baseline production parameters without engineer review.
 */

export interface CalibrationParameter {
  key: string;
  name: string;
  category: 'THERMAL' | 'RESERVOIR' | 'RHEOLOGY' | 'MECHANICAL';
  unit: string;
  nominalValue: number;
  currentValue: number;
  suggestedValue: number;
  bounds: [number, number];
  divergencePct: number;
  lastCalibratedDate: string;
  engineerApproved: boolean;
}

export class RecalibrationEngine {
  private static _parameters: CalibrationParameter[] = [
    {
      key: 'thermal_lambda',
      name: 'Overburden Heat Loss Constant (lambda)',
      category: 'THERMAL',
      unit: 'day^-1',
      nominalValue: 0.022,
      currentValue: 0.022,
      suggestedValue: 0.025,
      bounds: [0.010, 0.045],
      divergencePct: 13.6,
      lastCalibratedDate: '2026-08-15',
      engineerApproved: false
    },
    {
      key: 'andrade_b',
      name: 'Andrade Rheology Activation Energy (b)',
      category: 'RHEOLOGY',
      unit: 'K',
      nominalValue: 3800.0,
      currentValue: 3800.0,
      suggestedValue: 3920.0,
      bounds: [3200.0, 4500.0],
      divergencePct: 3.1,
      lastCalibratedDate: '2026-07-22',
      engineerApproved: false
    },
    {
      key: 'skin_factor',
      name: 'Near-Wellbore Mechanical Skin (S)',
      category: 'RESERVOIR',
      unit: 'dimensionless',
      nominalValue: 2.5,
      currentValue: 2.5,
      suggestedValue: 3.2,
      bounds: [-2.0, 10.0],
      divergencePct: 28.0,
      lastCalibratedDate: '2026-06-10',
      engineerApproved: false
    },
    {
      key: 'couette_drag_coeff',
      name: 'Annular Couette Rod Drag Multiplier',
      category: 'MECHANICAL',
      unit: 'factor',
      nominalValue: 0.18,
      currentValue: 0.18,
      suggestedValue: 0.195,
      bounds: [0.10, 0.35],
      divergencePct: 8.3,
      lastCalibratedDate: '2026-08-01',
      engineerApproved: false
    }
  ];

  public static getParameters(): CalibrationParameter[] {
    return [...this._parameters];
  }

  public static updateSuggestedValue(key: string, value: number): void {
    const p = this._parameters.find(x => x.key === key);
    if (p) {
      p.suggestedValue = value;
      p.divergencePct = Math.round((Math.abs(value - p.currentValue) / p.currentValue) * 1000) / 10;
    }
  }

  public static approveParameter(key: string): boolean {
    const p = this._parameters.find(x => x.key === key);
    if (p) {
      p.currentValue = p.suggestedValue;
      p.divergencePct = 0.0;
      p.lastCalibratedDate = new Date().toISOString().slice(0, 10);
      p.engineerApproved = true;
      return true;
    }
    return false;
  }
}
