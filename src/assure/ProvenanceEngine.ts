/**
 * src/assure/ProvenanceEngine.ts
 * Manages transparent data lineage and origin tagging for all operational telemetry.
 * Enforces rule: Never claim synthetic demo values are actual field measurements.
 */

import type { ProvenanceSource, ProvenanceValue } from './types.ts';

export class ProvenanceEngine {
  private static readonly FIELD_DEFAULTS: Record<string, ProvenanceSource> = {
    // Reservoir & Fluid
    temperature_c: 'MODEL-DERIVED',
    viscosity_cp: 'MODEL-DERIVED',
    pressure_bar: 'MODEL-DERIVED',
    thermal_front_m: 'MODEL-DERIVED',
    porosity_pct: 'CALIBRATED',
    permeability_md: 'CALIBRATED',
    oil_saturation: 'CALIBRATED',
    inflow_bpd: 'MODEL-DERIVED',

    // Wellhead & Controls
    spm: 'CONFIGURED',
    stroke_inches: 'CONFIGURED',
    vfd_hz: 'CONFIGURED',
    steam_volume_t_d: 'CONFIGURED',
    steam_temperature_c: 'PUBLIC',
    water_cut: 'SYNTHETIC',
    pwf_bar: 'MODEL-DERIVED',

    // Mechanical & Rod
    pprl_kn: 'MODEL-DERIVED',
    mprl_kn: 'MODEL-DERIVED',
    rod_load_kn: 'MODEL-DERIVED',
    float_margin_pct: 'MODEL-DERIVED',
    viscous_drag_kn: 'MODEL-DERIVED',

    // Production & Economics
    oil_rate_bopd: 'SYNTHETIC',
    liquid_rate_bpd: 'SYNTHETIC',
    power_kw: 'MODEL-DERIVED',
    sor: 'MODEL-DERIVED',
    energy_per_bbl: 'MODEL-DERIVED',

    // Virtual Sensors
    downhole_temp: 'MODEL-DERIVED',
    dynamic_fluid_level: 'MODEL-DERIVED',
    pump_intake_pressure: 'MODEL-DERIVED',
    pumpability_window: 'PREDICTED'
  };

  /**
   * Returns authoritative provenance record for a given parameter name
   */
  public static getProvenance(paramName: string, isFieldDataLoaded: boolean = false): ProvenanceSource {
    if (isFieldDataLoaded) {
      if (['spm', 'stroke_inches', 'oil_rate_bopd', 'water_cut', 'liquid_rate_bpd'].includes(paramName)) {
        return 'MEASURED';
      }
    }
    return this.FIELD_DEFAULTS[paramName] || 'MODEL-DERIVED';
  }

  /**
   * Wraps a numeric or typed value with full provenance metadata
   */
  public static tag<T = number>(
    name: string,
    value: T,
    unit: string,
    confidence: 'HIGH' | 'MEDIUM' | 'LOW' = 'HIGH',
    note?: string
  ): ProvenanceValue<T> {
    return {
      value,
      provenance: this.getProvenance(name),
      unit,
      confidence,
      timestamp: Date.now(),
      sourceNote: note || `Derived via Baghewala Field Analytical Formulation (${name})`
    };
  }

  /**
   * Produces complete provenance map for the entire solution state
   */
  public static getProvenanceMap(): Record<string, ProvenanceSource> {
    return { ...this.FIELD_DEFAULTS };
  }
}
