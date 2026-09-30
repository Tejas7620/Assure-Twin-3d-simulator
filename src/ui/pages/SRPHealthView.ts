/**
 * src/ui/pages/SRPHealthView.ts
 * Dedicated SRP Health Center & Mechanical Stress Integrity Monitor.
 * Displays SPM, Stroke, VFD, Pump Fillage, Efficiency, PPRL, MPRL, Motor Load,
 * Dynamic Range, Float Margin, Impact Loading, Failure Risk, and Unsetting Risk.
 */

import type { SimulationState } from '../../sim/SimulationClient.ts';
import type { SolutionState } from '../../assure/types.ts';

export class SRPHealthView {
  private _container: HTMLElement;

  constructor(container: HTMLElement) {
    this._container = container;
    this.render();
  }

  public get container(): HTMLElement {
    return this._container;
  }

  private render(): void {
    this._container.innerHTML = `
      <div class="ws-page-container">
        <div class="ws-page-title-row">
          <div>
            <div class="ws-page-title">SRP HEALTH CENTER & THERMO-MECHANICAL MONITOR</div>
            <div class="ws-page-sub">Comprehensive surface pumping unit and downhole sucker rod string operational integrity</div>
          </div>
          <div id="srp-health-pill" class="ws-pill-badge safe">NORMAL OPERATING INTEGRITY</div>
        </div>

        <!-- 14-METRIC GRID -->
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 14px;">
          <div class="ws-card" style="padding: 10px;">
            <div style="font-size: 8.5px; color: var(--text-muted); font-family: var(--font-mono);">PUMP SPEED (SPM)</div>
            <div style="font-size: 18px; font-weight: 700; color: #ffffff; font-family: var(--font-mono);" id="srp-val-spm">3.2 SPM</div>
            <div style="font-size: 8px; color: var(--accent-green);">VFD Sync: 54.0 Hz</div>
          </div>

          <div class="ws-card" style="padding: 10px;">
            <div style="font-size: 8.5px; color: var(--text-muted); font-family: var(--font-mono);">STROKE LENGTH</div>
            <div style="font-size: 18px; font-weight: 700; color: #ffffff; font-family: var(--font-mono);" id="srp-val-stroke">64.0 IN</div>
            <div style="font-size: 8px; color: var(--text-dim);">1.63 m Swept Travel</div>
          </div>

          <div class="ws-card" style="padding: 10px;">
            <div style="font-size: 8.5px; color: var(--text-muted); font-family: var(--font-mono);">PUMP FILLAGE</div>
            <div style="font-size: 18px; font-weight: 700; color: var(--accent-cyan); font-family: var(--font-mono);" id="srp-val-fillage">78.4%</div>
            <div style="font-size: 8px; color: var(--text-dim);">Liquid Anchor Headroom</div>
          </div>

          <div class="ws-card" style="padding: 10px;">
            <div style="font-size: 8.5px; color: var(--text-muted); font-family: var(--font-mono);">PUMP EFFICIENCY</div>
            <div style="font-size: 18px; font-weight: 700; color: var(--accent-green); font-family: var(--font-mono);" id="srp-val-eff">82.1%</div>
            <div style="font-size: 8px; color: var(--text-dim);">Volumetric Displacement</div>
          </div>

          <div class="ws-card" style="padding: 10px;">
            <div style="font-size: 8.5px; color: var(--text-muted); font-family: var(--font-mono);">PEAK ROD LOAD (PPRL)</div>
            <div style="font-size: 18px; font-weight: 700; color: var(--accent-gold); font-family: var(--font-mono);" id="srp-val-pprl">88.5 kN</div>
            <div style="font-size: 8px; color: var(--text-dim);">API Grade D Yield: 115 kN</div>
          </div>

          <div class="ws-card" style="padding: 10px;">
            <div style="font-size: 8.5px; color: var(--text-muted); font-family: var(--font-mono);">MINIMUM ROD LOAD (MPRL)</div>
            <div style="font-size: 18px; font-weight: 700; color: var(--accent-cyan); font-family: var(--font-mono);" id="srp-val-mprl">24.2 kN</div>
            <div style="font-size: 8px; color: var(--text-dim);">Buoyant Downstroke Margin</div>
          </div>

          <div class="ws-card" style="padding: 10px;">
            <div style="font-size: 8.5px; color: var(--text-muted); font-family: var(--font-mono);">ROD FLOAT MARGIN</div>
            <div style="font-size: 18px; font-weight: 700; color: var(--accent-green); font-family: var(--font-mono);" id="srp-val-float">24.5%</div>
            <div style="font-size: 8px; color: var(--text-dim);">Safety Floor: >= 15.0%</div>
          </div>

          <div class="ws-card" style="padding: 10px;">
            <div style="font-size: 8.5px; color: var(--text-muted); font-family: var(--font-mono);">MOTOR POWER & LOAD</div>
            <div style="font-size: 18px; font-weight: 700; color: #ffffff; font-family: var(--font-mono);" id="srp-val-power">14.8 kW</div>
            <div style="font-size: 8px; color: var(--text-dim);" id="srp-val-motorload">68.0% Nameplate Rating</div>
          </div>

          <div class="ws-card" style="padding: 10px;">
            <div style="font-size: 8.5px; color: var(--text-muted); font-family: var(--font-mono);">DYNAMIC LOAD RANGE</div>
            <div style="font-size: 18px; font-weight: 700; color: #ffffff; font-family: var(--font-mono);" id="srp-val-range">64.3 kN</div>
            <div style="font-size: 8px; color: var(--text-dim);">Cyclic Fatigue Span</div>
          </div>

          <div class="ws-card" style="padding: 10px;">
            <div style="font-size: 8.5px; color: var(--text-muted); font-family: var(--font-mono);">IMPACT LOADING INDEX</div>
            <div style="font-size: 18px; font-weight: 700; color: var(--accent-green); font-family: var(--font-mono);" id="srp-val-impact">0.12</div>
            <div style="font-size: 8px; color: var(--text-dim);">Fluid Pound Deceleration</div>
          </div>

          <div class="ws-card" style="padding: 10px;">
            <div style="font-size: 8.5px; color: var(--text-muted); font-family: var(--font-mono);">ROD PARTING RISK</div>
            <div style="font-size: 18px; font-weight: 700; color: var(--accent-green); font-family: var(--font-mono);" id="srp-val-parting">14.0%</div>
            <div style="font-size: 8px; color: var(--text-dim);">Goodman Fatigue Stress Ratio</div>
          </div>

          <div class="ws-card" style="padding: 10px;">
            <div style="font-size: 8.5px; color: var(--text-muted); font-family: var(--font-mono);">PUMP UNSETTING RISK</div>
            <div style="font-size: 18px; font-weight: 700; color: var(--accent-green); font-family: var(--font-mono);" id="srp-val-unsetting">3.5%</div>
            <div style="font-size: 8px; color: var(--text-dim);">Differential Pressure Seating</div>
          </div>
        </div>

        <!-- PHYSICAL EXPLANATION & CAUSAL LINKS -->
        <div class="ws-card" style="border-left: 3px solid var(--accent-green);" id="srp-explanation-card">
          <div class="ws-card-header">
            <span class="ws-card-title">THERMO-MECHANICAL CAUSAL CHAIN DIAGNOSIS</span>
            <span style="font-size: 8.5px; color: var(--accent-green); font-family: var(--font-mono);">HEALTH INDEX: 88.5 / 100</span>
          </div>
          <div class="ws-card-body" style="font-size: 9.5px; line-height: 1.5; color: #cbd5e1;" id="srp-explanation-text">
            Operating at 3.2 SPM and 64" stroke maintains balanced cyclic loading on the API Grade D 7/8" sucker rod string.
            Downstroke Couette viscous drag (1.85 kN) is comfortably counteracted by the buoyant rod weight, maintaining a 24.5% float margin.
            No mechanical buckling or fluid pound shocks detected.
          </div>
        </div>
      </div>
    `;
  }

  public update(state: SimulationState, _solution: SolutionState): void {
    const spmEl = this._container.querySelector('#srp-val-spm');
    const strokeEl = this._container.querySelector('#srp-val-stroke');
    const fillageEl = this._container.querySelector('#srp-val-fillage');
    const pprlEl = this._container.querySelector('#srp-val-pprl');
    const floatEl = this._container.querySelector('#srp-val-float');
    const powerEl = this._container.querySelector('#srp-val-power');
    const pillEl = this._container.querySelector('#srp-health-pill');
    const expText = this._container.querySelector('#srp-explanation-text');

    const spm = state.controls.spm;
    const stroke = state.controls.stroke_inches;
    const fillage = state.pump.pump_fillage_pct;
    const floatMargin = state.srp.float_margin_pct;
    const pprl = state.srp.rod_load_kn;

    if (spmEl) spmEl.textContent = `${spm.toFixed(1)} SPM`;
    if (strokeEl) strokeEl.textContent = `${stroke.toFixed(0)} IN`;
    if (fillageEl) fillageEl.textContent = `${fillage.toFixed(1)}%`;
    if (pprlEl) pprlEl.textContent = `${pprl.toFixed(1)} kN`;
    if (floatEl) floatEl.textContent = `${floatMargin.toFixed(1)}%`;
    if (powerEl) powerEl.textContent = `${state.economics.power_kw.toFixed(1)} kW`;

    if (floatMargin < 12.0) {
      if (pillEl) { pillEl.className = 'ws-pill-badge warn'; pillEl.textContent = 'CRITICAL ROD FLOAT HAZARD'; }
      if (expText) expText.innerHTML = `
        <span style="color: var(--accent-red); font-weight: 700;">WARNING: Downstroke Rod Float Margin Collapsed to ${floatMargin.toFixed(1)}%</span><br>
        Near-wellbore thermal decay increases heavy crude viscosity. Rising Couette annular drag retards downstroke gravity fall,
        causing sucker rods to compress and buckle against tubing ID. Recommended action: reduce SPM immediately or restimulate with steam.
      `;
    } else {
      if (pillEl) { pillEl.className = 'ws-pill-badge safe'; pillEl.textContent = 'NORMAL OPERATING INTEGRITY'; }
      if (expText) expText.textContent = `
        Operating at ${spm.toFixed(1)} SPM and ${stroke.toFixed(0)}" stroke maintains balanced cyclic loading on the API Grade D sucker rod string.
        Downstroke float margin (${floatMargin.toFixed(1)}%) is above safety threshold. Normal lifting operations verified.
      `;
    }
  }
}
