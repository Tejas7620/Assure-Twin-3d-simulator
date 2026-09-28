/**
 * src/ui/pages/WellStateView.ts
 * Subsurface & Mechanical Well State Page.
 * Displays 6 domain quadrants (Reservoir, Thermal, Wellbore, SRP, Production, Energy)
 * alongside the 10 Virtual Downhole Sensor cards with uncertainty ranges, confidence, and provenance tags.
 */

import type { SimulationState } from '../../sim/SimulationClient.ts';
import type { SolutionState } from '../../assure/types.ts';

export class WellStateView {
  private _container: HTMLElement;

  constructor(container: HTMLElement) {
    this._container = container;
    this.render();
  }

  private render(): void {
    this._container.innerHTML = `
      <div class="ws-page-container">
        <div class="ws-page-title-row">
          <div>
            <div class="ws-page-title">WELL STATE & VIRTUAL DOWNHOLE SYNTHESIZER</div>
            <div class="ws-page-sub">Subsurface state estimation, unmeasured parameter synthesis, and operational domain telemetry</div>
          </div>
          <div style="font-family: var(--font-mono); font-size: 11px; color: var(--accent-blue); background: rgba(56, 189, 248, 0.1); padding: 4px 10px; border-radius: 4px; border: 1px solid rgba(56, 189, 248, 0.2);">
            WELL: BGW-17A · DEPTH: 1,420 m TVD
          </div>
        </div>

        <!-- 10 VIRTUAL DOWNHOLE SENSORS GRID -->
        <div style="font-size: 11px; font-weight: 700; color: #ffffff; font-family: var(--font-mono); margin-top: 4px;">VIRTUAL DOWNHOLE SENSORS (10 UNMEASURED SUBSURFACE PARAMETERS)</div>
        <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px;" id="ws-v-sensors-grid">
          <!-- Dynamically populated -->
        </div>

        <!-- 6 ENGINEERING DOMAINS -->
        <div style="font-size: 11px; font-weight: 700; color: #ffffff; font-family: var(--font-mono); margin-top: 10px;">OPERATIONAL TELEMETRY & PHYSICAL DOMAINS</div>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
          <!-- 1. RESERVOIR -->
          <div class="ws-card">
            <div class="ws-card-header"><span class="ws-card-title">1. RESERVOIR DOMAIN</span></div>
            <div class="ws-card-body">
              <div class="ws-status-row"><span class="ws-status-key">RESERVOIR PRESSURE</span><span class="ws-status-num" id="ws-res-pres">68.4 bar</span></div>
              <div class="ws-status-row"><span class="ws-status-key">PERMEABILITY</span><span class="ws-status-num">1,250 mD</span></div>
              <div class="ws-status-row"><span class="ws-status-key">POROSITY</span><span class="ws-status-num">22.4 %</span></div>
              <div class="ws-status-row"><span class="ws-status-key">OIL SATURATION</span><span class="ws-status-num">68.0 %</span></div>
            </div>
          </div>

          <!-- 2. THERMAL -->
          <div class="ws-card">
            <div class="ws-card-header"><span class="ws-card-title">2. THERMAL DOMAIN</span></div>
            <div class="ws-card-body">
              <div class="ws-status-row"><span class="ws-status-key">THERMAL FRONT RADIUS</span><span class="ws-status-num" id="ws-thm-front">12.6 m</span></div>
              <div class="ws-status-row"><span class="ws-status-key">STEAM CHAMBER ENTHALPY</span><span class="ws-status-num">2,840 GJ</span></div>
              <div class="ws-status-row"><span class="ws-status-key">COOLING DECAY RATE</span><span class="ws-status-num">-0.85 °C/d</span></div>
              <div class="ws-status-row"><span class="ws-status-key">THERMAL RESERVE</span><span class="ws-status-num" id="ws-thm-res">23.5 %</span></div>
            </div>
          </div>

          <!-- 3. WELLBORE & TUBING -->
          <div class="ws-card">
            <div class="ws-card-header"><span class="ws-card-title">3. WELLBORE & TUBING</span></div>
            <div class="ws-card-body">
              <div class="ws-status-row"><span class="ws-status-key">WELLHEAD CASING P</span><span class="ws-status-num">12.4 bar</span></div>
              <div class="ws-status-row"><span class="ws-status-key">WELLHEAD TEMP</span><span class="ws-status-num">48.2 °C</span></div>
              <div class="ws-status-row"><span class="ws-status-key">PERFORATION TVD</span><span class="ws-status-num">1,420 m</span></div>
              <div class="ws-status-row"><span class="ws-status-key">TUBING DIAMETER</span><span class="ws-status-num">2.875 in</span></div>
            </div>
          </div>

          <!-- 4. SRP MECHANICAL -->
          <div class="ws-card">
            <div class="ws-card-header"><span class="ws-card-title">4. SRP MECHANICAL</span></div>
            <div class="ws-card-body">
              <div class="ws-status-row"><span class="ws-status-key">PUMPJACK SPEC</span><span class="ws-status-num">Mark II 320</span></div>
              <div class="ws-status-row"><span class="ws-status-key">ROD STRING GRADE</span><span class="ws-status-num">7/8" Grade D</span></div>
              <div class="ws-status-row"><span class="ws-status-key">PEAK POLISHED ROD LOAD</span><span class="ws-status-num" id="ws-srp-pprl">68.0 kN</span></div>
              <div class="ws-status-row"><span class="ws-status-key">MINIMUM ROD LOAD</span><span class="ws-status-num" id="ws-srp-mprl">32.2 kN</span></div>
            </div>
          </div>

          <!-- 5. PRODUCTION -->
          <div class="ws-card">
            <div class="ws-card-header"><span class="ws-card-title">5. PRODUCTION DOMAIN</span></div>
            <div class="ws-card-body">
              <div class="ws-status-row"><span class="ws-status-key">OIL RATE</span><span class="ws-status-num" id="ws-prod-oil">32.6 BOPD</span></div>
              <div class="ws-status-row"><span class="ws-status-key">WATER RATE</span><span class="ws-status-num" id="ws-prod-water">4.7 BPD</span></div>
              <div class="ws-status-row"><span class="ws-status-key">WATER CUT</span><span class="ws-status-num" id="ws-prod-wc">12.8 %</span></div>
              <div class="ws-status-row"><span class="ws-status-key">CUMULATIVE OIL</span><span class="ws-status-num" id="ws-prod-cum">1,420 bbl</span></div>
            </div>
          </div>

          <!-- 6. ENERGY & ECONOMICS -->
          <div class="ws-card">
            <div class="ws-card-header"><span class="ws-card-title">6. ENERGY & ECONOMICS</span></div>
            <div class="ws-card-body">
              <div class="ws-status-row"><span class="ws-status-key">MOTOR POWER</span><span class="ws-status-num" id="ws-econ-pwr">14.2 kW</span></div>
              <div class="ws-status-row"><span class="ws-status-key">DAILY CONSUMPTION</span><span class="ws-status-num" id="ws-econ-kwh">340.8 kWh/d</span></div>
              <div class="ws-status-row"><span class="ws-status-key">STEAM-OIL RATIO</span><span class="ws-status-num" id="ws-econ-sor">6.2 t/t</span></div>
              <div class="ws-status-row"><span class="ws-status-key">LIFTING COST</span><span class="ws-status-num">$ 18.4 / bbl</span></div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  public update(simState: SimulationState, solutionState: SolutionState): void {
    // Populate virtual sensor cards
    const vGrid = this._container.querySelector('#ws-v-sensors-grid');
    if (vGrid) {
      const vd = solutionState.virtualDownhole;
      const sensors = [
        { label: 'DOWNHOLE TEMP', val: `${vd.downholeTemperature.value.toFixed(1)} °C`, range: `${vd.downholeTemperature.estimatedRange[0]}–${vd.downholeTemperature.estimatedRange[1]}`, conf: 'HIGH', prov: vd.downholeTemperature.provenance },
        { label: 'BOTTOMHOLE PWF', val: `${vd.downholePressure.value.toFixed(1)} bar`, range: `${vd.downholePressure.estimatedRange[0]}–${vd.downholePressure.estimatedRange[1]}`, conf: 'HIGH', prov: vd.downholePressure.provenance },
        { label: 'PUMP INTAKE P', val: `${vd.pumpIntakePressure.value.toFixed(1)} bar`, range: `${vd.pumpIntakePressure.estimatedRange[0]}–${vd.pumpIntakePressure.estimatedRange[1]}`, conf: 'HIGH', prov: vd.pumpIntakePressure.provenance },
        { label: 'DYNAMIC FLUID LVL', val: `${Math.round(vd.dynamicFluidLevel.value)} m`, range: `${vd.dynamicFluidLevel.estimatedRange[0]}–${vd.dynamicFluidLevel.estimatedRange[1]}`, conf: 'HIGH', prov: vd.dynamicFluidLevel.provenance },
        { label: 'CRUDE VISCOSITY', val: `${Math.round(vd.downholeViscosity.value).toLocaleString()} cP`, range: `${vd.downholeViscosity.estimatedRange[0]}–${vd.downholeViscosity.estimatedRange[1]}`, conf: 'HIGH', prov: vd.downholeViscosity.provenance },
        { label: 'SUBSURFACE INFLOW', val: `${vd.effectiveInflow.value.toFixed(1)} BPD`, range: `${vd.effectiveInflow.estimatedRange[0]}–${vd.effectiveInflow.estimatedRange[1]}`, conf: 'HIGH', prov: vd.effectiveInflow.provenance },
        { label: 'PUMP FILLAGE', val: `${vd.effectiveFillage.value.toFixed(1)} %`, range: `${vd.effectiveFillage.estimatedRange[0]}–${vd.effectiveFillage.estimatedRange[1]}`, conf: 'HIGH', prov: vd.effectiveFillage.provenance },
        { label: 'ANNULAR ROD DRAG', val: `${vd.rodDrag.value.toFixed(2)} kN`, range: `${vd.rodDrag.estimatedRange[0]}–${vd.rodDrag.estimatedRange[1]}`, conf: 'HIGH', prov: vd.rodDrag.provenance },
        { label: 'FLOAT MARGIN', val: `${vd.floatMargin.value.toFixed(1)} %`, range: `${vd.floatMargin.estimatedRange[0]}–${vd.floatMargin.estimatedRange[1]}`, conf: 'HIGH', prov: vd.floatMargin.provenance },
        { label: 'PUMPABILITY SCORE', val: `${vd.pumpabilityScore.value.toFixed(1)}`, range: `${vd.pumpabilityScore.estimatedRange[0]}–${vd.pumpabilityScore.estimatedRange[1]}`, conf: 'HIGH', prov: vd.pumpabilityScore.provenance }
      ];

      vGrid.innerHTML = sensors.map(s => `
        <div class="ws-card" style="padding: 8px;">
          <div style="font-size: 8px; font-weight: 700; color: var(--text-muted); font-family: var(--font-mono);">${s.label}</div>
          <div style="font-size: 14px; font-weight: 700; color: #ffffff; font-family: var(--font-mono); margin: 3px 0;">${s.val}</div>
          <div style="font-size: 8px; color: var(--text-dim);">Range: ${s.range}</div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px;">
            <span style="font-size: 7.5px; font-weight: 700; color: var(--accent-green);">${s.conf} CONF</span>
            <span style="font-size: 7.5px; color: var(--accent-blue); font-family: var(--font-mono);">${s.prov}</span>
          </div>
        </div>
      `).join('');
    }

    // Update physical values
    const setVal = (id: string, text: string) => {
      const el = this._container.querySelector(id);
      if (el) el.textContent = text;
    };

    setVal('#ws-res-pres', `${simState.reservoir.pressure_bar.toFixed(1)} bar`);
    setVal('#ws-thm-front', `${simState.reservoir.thermal_front_m.toFixed(1)} m`);
    setVal('#ws-thm-res', `${solutionState.thermalReserve.reservePct.toFixed(1)} %`);
    setVal('#ws-srp-pprl', `${simState.srp.pprl_kn.toFixed(1)} kN`);
    setVal('#ws-srp-mprl', `${simState.srp.mprl_kn.toFixed(1)} kN`);
    setVal('#ws-prod-oil', `${simState.production.oil_rate_bopd.toFixed(1)} BOPD`);
    setVal('#ws-prod-water', `${simState.production.water_rate_bpd.toFixed(1)} BPD`);
    setVal('#ws-prod-wc', `${(simState.controls.water_cut * 100).toFixed(1)} %`);
    setVal('#ws-prod-cum', `${Math.round(simState.production.cumulative_oil_bbl)} bbl`);
    setVal('#ws-econ-pwr', `${simState.economics.power_kw.toFixed(1)} kW`);
    setVal('#ws-econ-kwh', `${simState.economics.daily_kwh.toFixed(1)} kWh/d`);
    setVal('#ws-econ-sor', `${simState.economics.sor.toFixed(1)} t/t`);
  }
}
