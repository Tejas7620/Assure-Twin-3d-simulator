/**
 * src/assure/SimulationStateAdapter.ts
 * Read-Only Simulation State Adapter & Normalizer (Phase 1).
 * Strictly consumes immutable snapshots from SimulationClient without mutating simulator state.
 * Normalizes all telemetry into a strongly-typed SolutionState.
 */

import type { SolutionState, DemoScenarioMode } from './types.ts';
import type { SimulationState } from '../sim/SimulationClient.ts';
import { ProvenanceEngine } from './ProvenanceEngine.ts';
import { DataQualityEngine } from './DataQualityEngine.ts';
import { VirtualDownholeEngine } from './VirtualDownholeEngine.ts';
import { StateEstimator } from './StateEstimator.ts';
import { ThermalReserveEngine } from './ThermalReserveEngine.ts';
import { ThermoMechanicalEnvelopeEngine } from './ThermoMechanicalEnvelopeEngine.ts';
import { PumpabilityEngine } from './PumpabilityEngine.ts';
import { CSSReadinessEngine } from './CSSReadinessEngine.ts';

export class SimulationStateAdapter {
  private static _dataQualityEngine = new DataQualityEngine();
  private static _virtualDownholeEngine = new VirtualDownholeEngine();

  /**
   * Adapts and normalizes a read-only snapshot of SimulationState into a complete SolutionState
   */
  public static adapt(
    simState: SimulationState,
    demoMode: DemoScenarioMode = 'NORMAL'
  ): SolutionState {
    const now = Date.now();

    // 1. Data Quality Evaluation
    const dataQuality = this._dataQualityEngine.evaluate(simState, demoMode);

    // 2. Virtual Downhole Sensor Synthesis
    const virtualDownhole = this._virtualDownholeEngine.estimate(simState);

    // 3. Operational State Classification
    const wellHealth = StateEstimator.evaluateHealth(simState, dataQuality, virtualDownhole);

    // 4. Thermal Reserve & Memory
    const thermalReserve = ThermalReserveEngine.evaluate(simState);

    // 5. Dynamic Thermo-Mechanical Operating Envelope
    const operatingEnvelope = ThermoMechanicalEnvelopeEngine.evaluate(simState);

    // 6. Pumpability Window
    const pumpability = PumpabilityEngine.calculate(simState);

    // 7. CSS Readiness & Opportunity Window
    const cssReadiness = CSSReadinessEngine.evaluate(simState);

    // 8. Provenance Lineage Map
    const provenance = ProvenanceEngine.getProvenanceMap();

    // 9. Economics Calculations
    const oilPrice = 72.0; // $/bbl
    const steamCost = 18.0; // $/ton
    const liftingCost = 14.5; // $/bbl
    const dailyOilVal = simState.production.oil_rate_bopd * oilPrice;
    const dailyOpex = (simState.production.oil_rate_bopd * liftingCost) + (simState.economics.daily_kwh * 0.12);
    const netCashflow = Math.round((dailyOilVal - dailyOpex) * 10) / 10;

    return {
      timestamp: now,
      wellId: 'BGW-17A (Synthetic Demo Well)',
      fieldId: 'Baghewala Field (Bikaner-Nagaur Basin)',
      reservoirId: 'Jodhpur Sandstone Formations',
      wellHealth,
      provenance,
      dataQuality,
      controls: {
        spm: simState.controls.spm,
        strokeInches: simState.controls.stroke_inches,
        strokeM: simState.controls.stroke_m,
        vfdHz: Math.round((simState.controls.spm / 3.2) * 50.0 * 10) / 10,
        steamVolumeTD: simState.controls.steam_volume_t_d,
        waterCut: simState.controls.water_cut,
        pwfBar: simState.controls.pwf_bar,
        scenario: simState.controls.scenario
      },
      reservoir: {
        pressureBar: simState.reservoir.pressure_bar,
        temperatureC: simState.reservoir.temperature_c,
        viscosityCp: simState.reservoir.viscosity_cp,
        thermalFrontM: simState.reservoir.thermal_front_m,
        inflowBpd: simState.reservoir.inflow_bpd,
        porosityPct: simState.reservoir.porosity_pct,
        permeabilityMd: simState.reservoir.permeability_md
      },
      pump: {
        capacityBpd: simState.pump.pump_capacity_bpd,
        fillage: simState.pump.pump_fillage,
        fillagePct: simState.pump.pump_fillage_pct,
        efficiency: simState.pump.pump_efficiency,
        efficiencyPct: simState.pump.pump_efficiency_pct,
        status: simState.pump.fillage_status
      },
      rod: {
        pprlKn: simState.srp.pprl_kn,
        mprlKn: simState.srp.mprl_kn,
        rodLoadKn: simState.srp.rod_load_kn,
        floatMarginPct: simState.srp.float_margin_pct,
        viscousDragKn: simState.srp.viscous_drag_kn
      },
      production: {
        liquidRateBpd: simState.production.liquid_rate_bpd,
        oilRateBopd: simState.production.oil_rate_bopd,
        waterRateBpd: simState.production.water_rate_bpd,
        cumOilBbl: simState.production.cumulative_oil_bbl,
        cumLiquidBbl: simState.production.cumulative_liquid_bbl
      },
      economics: {
        powerKw: simState.economics.power_kw,
        dailyKwh: simState.economics.daily_kwh,
        energyPerBbl: simState.economics.energy_per_bbl,
        sor: simState.economics.sor,
        liftingCostPerBbl: liftingCost,
        steamCostPerTon: steamCost,
        oilPricePerBbl: oilPrice,
        netCashflowPerDay: netCashflow
      },
      virtualDownhole,
      thermalReserve,
      operatingEnvelope,
      pumpability,
      cssReadiness
    };
  }
}
