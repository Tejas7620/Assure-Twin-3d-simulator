/**
 * src/ui/pages/WellStateView.ts
 * Subsurface & Mechanical Well State Page.
 * Displays 6 domain quadrants (Reservoir, Thermal, Wellbore, SRP, Production, Energy)
 * alongside the 10 Virtual Downhole Sensor cards with uncertainty ranges, confidence, and provenance tags.
 *
 * Phase 3 integration:
 * - Polls /api/v1/analytics/virtual-downhole every 5s via ApiBridge.
 * - Displays live backend derived confidence (HIGH/MEDIUM/LOW - H4 fix) and bounds.
 * - Graceful fallback to client-side virtualDownhole if offline.
 * - Source badge shows ● BACKEND vs ○ LOCAL.
 */

import type { SimulationState } from '../../sim/SimulationClient.ts';
import type { SolutionState } from '../../assure/types.ts';
import { ApiBridge } from '../../api/ApiBridge.ts';

export class WellStateView {
  private _container: HTMLElement;
  private _bridge: ApiBridge;
  private _backendSensors: Record<string, any> | null = null;

  constructor(container: HTMLElement) {
    this._container = container;
    this._bridge = new ApiBridge();
    this.render();
    this._startPolling();
  }

  private _startPolling(): void {
    this._bridge.watchVirtualSensors((sensors) => {
      this._backendSensors = sensors;
      this._updateVirtualSensors();
    }, 5000);
  }

  private render(): void {
    this._container.innerHTML = `
      <div class="ws-page-container">
        <div class="ws-page-title-row">
          <div>
            <div class="ws-page-title">WELL STATE & VIRTUAL DOWNHOLE SYNTHESIZER</div>
            <div class="ws-page-sub">Subsurface state estimation, unmeasured parameter synthesis, and operational domain telemetry</div>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span id="ws-source-badge" class="ws-pill-badge" style="font-family: var(--font-mono); font-size: 10px; color: var(--accent-amber); border: 1px solid rgba(245, 158, 11, 0.3);">○ LOCAL</span>
            <div style="font-family: var(--font-mono); font-size: 11px; color: var(--accent-blue); background: rgba(56, 189, 248, 0.1); padding: 4px 10px; border-radius: 4px; border: 1px solid rgba(56, 189, 248, 0.2);">
              WELL: BGW-17A · DEPTH: 1,420 m TVD
            </div>
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

  private _getConfidenceColor(conf: string): string {
    if (conf === 'HIGH') return 'var(--accent-green)';
    if (conf === 'MEDIUM') return 'var(--accent-amber)';
    return 'var(--accent-red)';
  }

  private _updateVirtualSensors(): void {
    if (!this._backendSensors) return;

    const sourceBadge = this._container.querySelector('#ws-source-badge') as HTMLElement;
    if (sourceBadge) {
      sourceBadge.textContent = '● BACKEND';
      sourceBadge.style.color = 'var(--accent-green)';
      sourceBadge.style.borderColor = 'rgba(16, 185, 129, 0.3)';
    }

    const vGrid = this._container.querySelector('#ws-v-sensors-grid');
    if (!vGrid) return;

    const s = this._backendSensors;
    const cards = [
      { label: 'DOWNHOLE TEMP', val: `${s.downholeTemperature?.value?.toFixed(1) ?? '—'} °C`, range: `${s.downholeTemperature?.lower_bound ?? '—'}–${s.downholeTemperature?.upper_bound ?? '—'}`, conf: s.downholeTemperature?.confidence ?? 'MED', prov: s.downholeTemperature?.source ?? 'THERMAL' },
      { label: 'BOTTOMHOLE PWF', val: `${s.downholePressure?.value?.toFixed(1) ?? '—'} bar`, range: `${s.downholePressure?.lower_bound ?? '—'}–${s.downholePressure?.upper_bound ?? '—'}`, conf: s.downholePressure?.confidence ?? 'MED', prov: s.downholePressure?.source ?? 'GRADIENT' },
      { label: 'PUMP INTAKE P', val: `${s.pumpIntakePressure?.value?.toFixed(1) ?? '—'} bar`, range: `${s.pumpIntakePressure?.lower_bound ?? '—'}–${s.pumpIntakePressure?.upper_bound ?? '—'}`, conf: s.pumpIntakePressure?.confidence ?? 'MED', prov: s.pumpIntakePressure?.source ?? 'HYDRAULIC' },
      { label: 'DYNAMIC FLUID LVL', val: `${Math.round(s.dynamicFluidLevel?.value ?? 0)} m`, range: `${s.dynamicFluidLevel?.lower_bound ?? '—'}–${s.dynamicFluidLevel?.upper_bound ?? '—'}`, conf: s.dynamicFluidLevel?.confidence ?? 'MED', prov: s.dynamicFluidLevel?.source ?? 'ACOUSTIC' },
      { label: 'CRUDE VISCOSITY', val: `${Math.round(s.downholeViscosity?.value ?? 0).toLocaleString()} cP`, range: `${s.downholeViscosity?.lower_bound ?? '—'}–${s.downholeViscosity?.upper_bound ?? '—'}`, conf: s.downholeViscosity?.confidence ?? 'MED', prov: s.downholeViscosity?.source ?? 'ANDRADE' },
      { label: 'SUBSURFACE INFLOW', val: `${s.effectiveInflow?.value?.toFixed(1) ?? '—'} BPD`, range: `${s.effectiveInflow?.lower_bound ?? '—'}–${s.effectiveInflow?.upper_bound ?? '—'}`, conf: s.effectiveInflow?.confidence ?? 'MED', prov: s.effectiveInflow?.source ?? 'DARCY' },
      { label: 'PUMP FILLAGE', val: `${s.effectiveFillage?.value?.toFixed(1) ?? '—'} %`, range: `${s.effectiveFillage?.lower_bound ?? '—'}–${s.effectiveFillage?.upper_bound ?? '—'}`, conf: s.effectiveFillage?.confidence ?? 'MED', prov: s.effectiveFillage?.source ?? 'DISPLACEMENT' },
      { label: 'ANNULAR ROD DRAG', val: `${s.rodDrag?.value?.toFixed(2) ?? '—'} kN`, range: `${s.rodDrag?.lower_bound ?? '—'}–${s.rodDrag?.upper_bound ?? '—'}`, conf: s.rodDrag?.confidence ?? 'MED', prov: s.rodDrag?.source ?? 'COUETTE' },
      { label: 'FLOAT MARGIN', val: `${s.floatMargin?.value?.toFixed(1) ?? '—'} %`, range: `${s.floatMargin?.lower_bound ?? '—'}–${s.floatMargin?.upper_bound ?? '—'}`, conf: s.floatMargin?.confidence ?? 'MED', prov: s.floatMargin?.source ?? 'KINEMATICS' },
      { label: 'PUMPABILITY SCORE', val: `${s.pumpabilityScore?.value?.toFixed(1) ?? '—'}`, range: `${s.pumpabilityScore?.lower_bound ?? '—'}–${s.pumpabilityScore?.upper_bound ?? '—'}`, conf: s.pumpabilityScore?.confidence ?? 'MED', prov: s.pumpabilityScore?.source ?? 'VIABILITY' }
    ];

    vGrid.innerHTML = cards.map(c => `
      <div class="ws-card" style="padding: 8px;">
        <div style="font-size: 8px; font-weight: 700; color: var(--text-muted); font-family: var(--font-mono);">${c.label}</div>
        <div style="font-size: 14px; font-weight: 700; color: #ffffff; font-family: var(--font-mono); margin: 3px 0;">${c.val}</div>
        <div style="font-size: 8px; color: var(--text-dim);">Range: ${c.range}</div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px;">
          <span style="font-size: 7.5px; font-weight: 700; color: ${this._getConfidenceColor(c.conf)};">${c.conf} CONF</span>
          <span style="font-size: 7.5px; color: var(--accent-blue); font-family: var(--font-mono);">${c.prov}</span>
        </div>
      </div>
    `).join('');
  }

  public update(simState: SimulationState, solutionState: SolutionState): void {
    // If backend data is not yet available, populate from local solutionState
    if (!this._backendSensors) {
      const vGrid = this._container.querySelector('#ws-v-sensors-grid');
      if (vGrid) {
        const vd = solutionState.virtualDownhole;
        const sensors = [
          { label: 'DOWNHOLE TEMP', val: `${vd.downholeTemperature.value.toFixed(1)} °C`, range: `${vd.downholeTemperature.estimatedRange[0]}–${vd.downholeTemperature.estimatedRange[1]}`, conf: 'MEDIUM', prov: vd.downholeTemperature.provenance },
          { label: 'BOTTOMHOLE PWF', val: `${vd.downholePressure.value.toFixed(1)} bar`, range: `${vd.downholePressure.estimatedRange[0]}–${vd.downholePressure.estimatedRange[1]}`, conf: 'MEDIUM', prov: vd.downholePressure.provenance },
          { label: 'PUMP INTAKE P', val: `${vd.pumpIntakePressure.value.toFixed(1)} bar`, range: `${vd.pumpIntakePressure.estimatedRange[0]}–${vd.pumpIntakePressure.estimatedRange[1]}`, conf: 'MEDIUM', prov: vd.pumpIntakePressure.provenance },
          { label: 'DYNAMIC FLUID LVL', val: `${Math.round(vd.dynamicFluidLevel.value)} m`, range: `${vd.dynamicFluidLevel.estimatedRange[0]}–${vd.dynamicFluidLevel.estimatedRange[1]}`, conf: 'MEDIUM', prov: vd.dynamicFluidLevel.provenance },
          { label: 'CRUDE VISCOSITY', val: `${Math.round(vd.downholeViscosity.value).toLocaleString()} cP`, range: `${vd.downholeViscosity.estimatedRange[0]}–${vd.downholeViscosity.estimatedRange[1]}`, conf: 'MEDIUM', prov: vd.downholeViscosity.provenance },
          { label: 'SUBSURFACE INFLOW', val: `${vd.effectiveInflow.value.toFixed(1)} BPD`, range: `${vd.effectiveInflow.estimatedRange[0]}–${vd.effectiveInflow.estimatedRange[1]}`, conf: 'MEDIUM', prov: vd.effectiveInflow.provenance },
          { label: 'PUMP FILLAGE', val: `${vd.effectiveFillage.value.toFixed(1)} %`, range: `${vd.effectiveFillage.estimatedRange[0]}–${vd.effectiveFillage.estimatedRange[1]}`, conf: 'MEDIUM', prov: vd.effectiveFillage.provenance },
          { label: 'ANNULAR ROD DRAG', val: `${vd.rodDrag.value.toFixed(2)} kN`, range: `${vd.rodDrag.estimatedRange[0]}–${vd.rodDrag.estimatedRange[1]}`, conf: 'MEDIUM', prov: vd.rodDrag.provenance },
          { label: 'FLOAT MARGIN', val: `${vd.floatMargin.value.toFixed(1)} %`, range: `${vd.floatMargin.estimatedRange[0]}–${vd.floatMargin.estimatedRange[1]}`, conf: 'MEDIUM', prov: vd.floatMargin.provenance },
          { label: 'PUMPABILITY SCORE', val: `${vd.pumpabilityScore.value.toFixed(1)}`, range: `${vd.pumpabilityScore.estimatedRange[0]}–${vd.pumpabilityScore.estimatedRange[1]}`, conf: 'MEDIUM', prov: vd.pumpabilityScore.provenance }
        ];

        vGrid.innerHTML = sensors.map(s => `
          <div class="ws-card" style="padding: 8px;">
            <div style="font-size: 8px; font-weight: 700; color: var(--text-muted); font-family: var(--font-mono);">${s.label}</div>
            <div style="font-size: 14px; font-weight: 700; color: #ffffff; font-family: var(--font-mono); margin: 3px 0;">${s.val}</div>
            <div style="font-size: 8px; color: var(--text-dim);">Range: ${s.range}</div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px;">
              <span style="font-size: 7.5px; font-weight: 700; color: ${this._getConfidenceColor(s.conf)};">${s.conf} CONF</span>
              <span style="font-size: 7.5px; color: var(--accent-blue); font-family: var(--font-mono);">${s.prov}</span>
            </div>
          </div>
        `).join('');
      }
    }

    // Update physical telemetry domain values from live state
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

  public destroy(): void {
    this._bridge.stop();
  }
}
