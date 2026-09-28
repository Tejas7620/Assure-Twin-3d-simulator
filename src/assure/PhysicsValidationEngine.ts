/**
 * src/assure/PhysicsValidationEngine.ts
 * Thermodynamic & Hydrodynamic Consistency Validator (Phase 23).
 * Validates fundamental conservation laws, Darcy/Vogel inflow bounds,
 * API pump volumetric limits, and viscosity-temperature consistency.
 */

export interface PhysicsValidationReport {
  status: 'PHYSICS_VALID' | 'PHYSICS_WARNING' | 'PHYSICS_FAILED';
  scorePct: number; // 0 - 100%
  checks: Array<{
    name: string;
    passed: boolean;
    severity: 'CRITICAL' | 'WARNING' | 'INFO';
    message: string;
  }>;
}

export class PhysicsValidationEngine {
  /**
   * Validates a candidate simulation state against first-principles physics
   */
  public static validate(params: {
    tempC: number;
    viscCp: number;
    inflowBpd: number;
    pumpCapBpd: number;
    oilRateBopd: number;
    waterCut: number;
    fillageRatio: number;
    pprlKn: number;
    mprlKn: number;
  }): PhysicsValidationReport {
    const checks: PhysicsValidationReport['checks'] = [];

    // 1. Mass Conservation: Produced liquid cannot exceed reservoir inflow
    const liquidRate = params.oilRateBopd / Math.max(0.01, 1.0 - params.waterCut);
    if (liquidRate > params.inflowBpd * 1.15 + 1.0) {
      checks.push({
        name: 'Mass Conservation: Inflow vs. Production',
        passed: false,
        severity: 'CRITICAL',
        message: `Liquid rate (${liquidRate.toFixed(1)} bpd) exceeds reservoir inflow (${params.inflowBpd.toFixed(1)} bpd) by > 15%.`
      });
    } else {
      checks.push({
        name: 'Mass Conservation: Inflow vs. Production',
        passed: true,
        severity: 'INFO',
        message: 'Liquid production is physically bounded by Darcy/Vogel reservoir delivery.'
      });
    }

    // 2. Volumetric Pump Capacity Limit: Liquid rate cannot exceed theoretical pump displacement
    if (liquidRate > params.pumpCapBpd * 1.02) {
      checks.push({
        name: 'API 11AX Pump Displacement Ceiling',
        passed: false,
        severity: 'CRITICAL',
        message: `Liquid rate (${liquidRate.toFixed(1)} bpd) exceeds theoretical cylinder volume (${params.pumpCapBpd.toFixed(1)} bpd).`
      });
    } else {
      checks.push({
        name: 'API 11AX Pump Displacement Ceiling',
        passed: true,
        severity: 'INFO',
        message: 'Production conforms to swept stroke volume.'
      });
    }

    // 3. Andrade Rheological Consistency
    // Expected viscosity at tempC
    const expectedVisc = 10000.0 * Math.exp(3800.0 * (1.0 / (params.tempC + 273.15) - 1.0 / 293.15));
    const viscDiscrepancy = Math.abs(params.viscCp - expectedVisc) / expectedVisc;
    if (viscDiscrepancy > 0.40) {
      checks.push({
        name: 'Viscosity-Temperature Thermodynamic Consistency',
        passed: false,
        severity: 'WARNING',
        message: `Fluid viscosity (${params.viscCp} cP) diverges from Andrade temperature curve by ${(viscDiscrepancy * 100).toFixed(0)}%.`
      });
    } else {
      checks.push({
        name: 'Viscosity-Temperature Thermodynamic Consistency',
        passed: true,
        severity: 'INFO',
        message: 'Viscosity conforms to heavy oil exponential temperature curve.'
      });
    }

    // 4. Rod Dynamics Conservation (PPRL > MPRL)
    if (params.pprlKn <= params.mprlKn) {
      checks.push({
        name: 'Kinematic Rod Load Gradient',
        passed: false,
        severity: 'CRITICAL',
        message: `Peak load (${params.pprlKn} kN) is less than or equal to minimum load (${params.mprlKn} kN). Non-physical dynamometer profile.`
      });
    } else {
      checks.push({
        name: 'Kinematic Rod Load Gradient',
        passed: true,
        severity: 'INFO',
        message: 'Cyclic load hysteresis is thermodynamically positive.'
      });
    }

    // Calculate score
    const criticalFails = checks.filter(c => !c.passed && c.severity === 'CRITICAL').length;
    const warningFails = checks.filter(c => !c.passed && c.severity === 'WARNING').length;

    let scorePct = 100 - (criticalFails * 45) - (warningFails * 15);
    scorePct = Math.max(0, Math.min(100, scorePct));

    let status: PhysicsValidationReport['status'] = 'PHYSICS_VALID';
    if (criticalFails > 0) {
      status = 'PHYSICS_FAILED';
    } else if (warningFails > 0) {
      status = 'PHYSICS_WARNING';
    }

    return { status, scorePct, checks };
  }
}
