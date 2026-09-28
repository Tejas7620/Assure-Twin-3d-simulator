/**
 * src/assure/ConstraintEngine.ts
 * Configurable Mechanical & Thermodynamic Limits Verifier (Phase 22).
 * Every constraint evaluates to PASS, WARNING, or FAIL.
 * Does not assume universal engineering limits; treated as CONFIGURED LIMITS.
 */

export interface ConstraintThresholds {
  spmMin: number;
  spmMax: number;
  strokeInMin: number;
  strokeInMax: number;
  vfdHzMin: number;
  vfdHzMax: number;
  pumpFillageMinPct: number;
  rodLoadMaxKn: number;
  floatMarginMinPct: number;
  steamPressureMaxBar: number;
  maxDailyKwh: number;
}

export interface ConstraintCheckDetail {
  constraint: string;
  value: number;
  limit: number;
  unit: string;
  status: 'PASS' | 'WARNING' | 'FAIL';
  note: string;
}

export interface ConstraintEvaluationReport {
  passed: boolean;
  passCount: number;
  warningCount: number;
  failCount: number;
  details: ConstraintCheckDetail[];
}

export class ConstraintEngine {
  // Authoritative default limits configured for Mark II 320-256-120 Pumpjack at Baghewala
  public static readonly DEFAULT_THRESHOLDS: ConstraintThresholds = {
    spmMin: 0.8,
    spmMax: 4.8,
    strokeInMin: 32.0,
    strokeInMax: 120.0,
    vfdHzMin: 20.0,
    vfdHzMax: 60.0,
    pumpFillageMinPct: 35.0, // Fail if < 35%, warn if < 50%
    rodLoadMaxKn: 65.0,     // API 11E Structure load rating (Mark II 320 unit rating)
    floatMarginMinPct: 12.0,// Critical float margin
    steamPressureMaxBar: 135.0, // Caprock fracture pressure margin
    maxDailyKwh: 450.0
  };

  /**
   * Evaluates candidate parameters against configured operational limits
   */
  public static evaluate(
    params: {
      spm: number;
      strokeIn: number;
      vfdHz: number;
      fillagePct: number;
      rodLoadKn: number;
      floatMarginPct: number;
      steamPressureBar: number;
      dailyKwh: number;
    },
    thresholds: ConstraintThresholds = this.DEFAULT_THRESHOLDS
  ): ConstraintEvaluationReport {
    const details: ConstraintCheckDetail[] = [];

    // 1. SPM Limit
    if (params.spm < thresholds.spmMin || params.spm > thresholds.spmMax) {
      details.push({
        constraint: 'Pumping Speed (SPM)',
        value: params.spm,
        limit: thresholds.spmMax,
        unit: 'SPM',
        status: 'FAIL',
        note: `SPM ${params.spm.toFixed(1)} violates allowable envelope [${thresholds.spmMin} - ${thresholds.spmMax}].`
      });
    } else if (params.spm > thresholds.spmMax * 0.9 || params.spm < thresholds.spmMin * 1.15) {
      details.push({
        constraint: 'Pumping Speed (SPM)',
        value: params.spm,
        limit: thresholds.spmMax,
        unit: 'SPM',
        status: 'WARNING',
        note: `SPM ${params.spm.toFixed(1)} approaching gearbox limit.`
      });
    } else {
      details.push({
        constraint: 'Pumping Speed (SPM)',
        value: params.spm,
        limit: thresholds.spmMax,
        unit: 'SPM',
        status: 'PASS',
        note: 'Operating within optimum kinematics range.'
      });
    }

    // 2. Rod Load Limit (PPRL)
    if (params.rodLoadKn > thresholds.rodLoadMaxKn) {
      details.push({
        constraint: 'Peak Polished Rod Load (PPRL)',
        value: params.rodLoadKn,
        limit: thresholds.rodLoadMaxKn,
        unit: 'kN',
        status: 'FAIL',
        note: `PPRL ${params.rodLoadKn.toFixed(1)} kN exceeds API beam structural rating (${thresholds.rodLoadMaxKn} kN).`
      });
    } else if (params.rodLoadKn > thresholds.rodLoadMaxKn * 0.88) {
      details.push({
        constraint: 'Peak Polished Rod Load (PPRL)',
        value: params.rodLoadKn,
        limit: thresholds.rodLoadMaxKn,
        unit: 'kN',
        status: 'WARNING',
        note: 'High cyclic stress on polished rod hanger.'
      });
    } else {
      details.push({
        constraint: 'Peak Polished Rod Load (PPRL)',
        value: params.rodLoadKn,
        limit: thresholds.rodLoadMaxKn,
        unit: 'kN',
        status: 'PASS',
        note: 'Safe mechanical stress margin.'
      });
    }

    // 3. Rod Float Safety Margin
    if (params.floatMarginPct < thresholds.floatMarginMinPct) {
      details.push({
        constraint: 'Rod-Float Safety Margin',
        value: params.floatMarginPct,
        limit: thresholds.floatMarginMinPct,
        unit: '%',
        status: 'FAIL',
        note: `Float margin ${params.floatMarginPct.toFixed(1)}% < ${thresholds.floatMarginMinPct}%. Risk of severe rod compression buckling!`
      });
    } else if (params.floatMarginPct < thresholds.floatMarginMinPct * 1.5) {
      details.push({
        constraint: 'Rod-Float Safety Margin',
        value: params.floatMarginPct,
        limit: thresholds.floatMarginMinPct,
        unit: '%',
        status: 'WARNING',
        note: 'Downward drag is eroding buoyant rod tension.'
      });
    } else {
      details.push({
        constraint: 'Rod-Float Safety Margin',
        value: params.floatMarginPct,
        limit: thresholds.floatMarginMinPct,
        unit: '%',
        status: 'PASS',
        note: 'Adequate rod fall velocity.'
      });
    }

    // 4. Subsurface Pump Fillage
    if (params.fillagePct < thresholds.pumpFillageMinPct) {
      details.push({
        constraint: 'Chamber Liquid Fillage',
        value: params.fillagePct,
        limit: thresholds.pumpFillageMinPct,
        unit: '%',
        status: 'FAIL',
        note: `Chamber fillage ${params.fillagePct}% causes severe fluid pound and rod damage.`
      });
    } else if (params.fillagePct < 55.0) {
      details.push({
        constraint: 'Chamber Liquid Fillage',
        value: params.fillagePct,
        limit: thresholds.pumpFillageMinPct,
        unit: '%',
        status: 'WARNING',
        note: 'Moderate pump chamber under-fill.'
      });
    } else {
      details.push({
        constraint: 'Chamber Liquid Fillage',
        value: params.fillagePct,
        limit: thresholds.pumpFillageMinPct,
        unit: '%',
        status: 'PASS',
        note: 'Solid fluid chamber coupling.'
      });
    }

    // 5. Steam Injection Pressure
    if (params.steamPressureBar > thresholds.steamPressureMaxBar) {
      details.push({
        constraint: 'Steam Injection Pressure',
        value: params.steamPressureBar,
        limit: thresholds.steamPressureMaxBar,
        unit: 'bar',
        status: 'FAIL',
        note: `Injection pressure ${params.steamPressureBar} bar exceeds caprock fracture threshold.`
      });
    } else {
      details.push({
        constraint: 'Steam Injection Pressure',
        value: params.steamPressureBar,
        limit: thresholds.steamPressureMaxBar,
        unit: 'bar',
        status: 'PASS',
        note: 'Below formation parting pressure.'
      });
    }

    // Calculate Summary
    const passCount = details.filter(d => d.status === 'PASS').length;
    const warningCount = details.filter(d => d.status === 'WARNING').length;
    const failCount = details.filter(d => d.status === 'FAIL').length;
    const passed = failCount === 0;

    return { passed, passCount, warningCount, failCount, details };
  }
}
