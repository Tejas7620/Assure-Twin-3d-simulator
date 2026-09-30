/**
 * src/ui/pages/ProductionView.ts
 * Dedicated Subsurface Inflow & Surface Production Monitoring Page.
 * Displays real-time and 30-day production trends, liquid displacement,
 * water cut dynamics, instantaneous SOR, and energy consumption per barrel.
 */

import type { SimulationState } from '../../sim/SimulationClient.ts';
import type { SolutionState } from '../../assure/types.ts';

export class ProductionView {
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
            <div class="ws-page-title">PRODUCTION TELEMETRY & INFLOW DYNAMICS</div>
            <div class="ws-page-sub">Subsurface reservoir inflow, wellhead test separator metering, and tank battery storage telemetry</div>
          </div>
          <div class="ws-pill-badge safe">STEADY HORIZONTAL PRODUCTION</div>
        </div>

        <!-- KPI ROW -->
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 14px;">
          <div class="ws-card" style="padding: 10px;">
            <div style="font-size: 8.5px; color: var(--text-muted); font-family: var(--font-mono);">NET OIL PRODUCTION</div>
            <div style="font-size: 18px; font-weight: 700; color: var(--accent-gold); font-family: var(--font-mono);" id="prod-val-oil">32.6 BOPD</div>
            <div style="font-size: 8px; color: var(--text-dim);">Vogel IPR Calculated</div>
          </div>

          <div class="ws-card" style="padding: 10px;">
            <div style="font-size: 8.5px; color: var(--text-muted); font-family: var(--font-mono);">GROSS LIQUID RATE</div>
            <div style="font-size: 18px; font-weight: 700; color: #ffffff; font-family: var(--font-mono);" id="prod-val-liquid">37.4 BPD</div>
            <div style="font-size: 8px; color: var(--text-dim);">Plunger Swept Volume</div>
          </div>

          <div class="ws-card" style="padding: 10px;">
            <div style="font-size: 8.5px; color: var(--text-muted); font-family: var(--font-mono);">WATER CUT</div>
            <div style="font-size: 18px; font-weight: 700; color: var(--accent-blue); font-family: var(--font-mono);" id="prod-val-wc">12.8%</div>
            <div style="font-size: 8px; color: var(--text-dim);">3-Phase Separator Telemetry</div>
          </div>

          <div class="ws-card" style="padding: 10px;">
            <div style="font-size: 8.5px; color: var(--text-muted); font-family: var(--font-mono);">INSTANTANEOUS SOR</div>
            <div style="font-size: 18px; font-weight: 700; color: var(--accent-cyan); font-family: var(--font-mono);" id="prod-val-sor">6.2 t/t</div>
            <div style="font-size: 8px; color: var(--text-dim);">Steam Economic Limit: 5.0</div>
          </div>
        </div>

        <!-- DETAILS & TREND -->
        <div style="display: grid; grid-template-columns: 1.5fr 1fr; gap: 14px;">
          <div class="ws-card">
            <div class="ws-card-header">
              <span class="ws-card-title">CUMULATIVE PRODUCTION BREAKDOWN</span>
              <span style="font-size: 8.5px; color: var(--accent-green); font-family: var(--font-mono);">CYCLE 3: 18,450 BBL</span>
            </div>
            <div class="ws-card-body">
              <div style="display: flex; flex-direction: column; gap: 8px; font-size: 9.5px;">
                <div style="display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 6px;">
                  <span style="color: var(--text-muted);">Cumulative Oil Recovered (Cycle 3):</span>
                  <span style="font-weight: 700; font-family: var(--font-mono); color: #ffffff;">18,450 BBL</span>
                </div>
                <div style="display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 6px;">
                  <span style="color: var(--text-muted);">Cumulative Steam Injected (Cycle 3):</span>
                  <span style="font-weight: 700; font-family: var(--font-mono); color: #ffffff;">2,500 Metric Tons</span>
                </div>
                <div style="display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 6px;">
                  <span style="color: var(--text-muted);">Cumulative Steam-to-Oil Ratio:</span>
                  <span style="font-weight: 700; font-family: var(--font-mono); color: var(--accent-cyan);">0.85 t/bbl (6.2 t/t)</span>
                </div>
                <div style="display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 6px;">
                  <span style="color: var(--text-muted);">Lifting Power Consumption:</span>
                  <span style="font-weight: 700; font-family: var(--font-mono); color: #ffffff;">14.8 kWh / bbl</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                  <span style="color: var(--text-muted);">Estimated Daily Net Revenue:</span>
                  <span style="font-weight: 700; font-family: var(--font-mono); color: var(--accent-green);">+$1,565 USD / day</span>
                </div>
              </div>
            </div>
          </div>

          <div class="ws-card">
            <div class="ws-card-header">
              <span class="ws-card-title">SURFACE FACILITY STORAGE</span>
            </div>
            <div class="ws-card-body" style="font-size: 9px; line-height: 1.5; color: #cbd5e1;">
              <div style="margin-bottom: 8px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                  <span>Production Stock Tank Battery (5,000 bbl):</span>
                  <span style="font-family: var(--font-mono); color: var(--accent-gold);">68% Full</span>
                </div>
                <div style="height: 6px; background: rgba(255,255,255,0.05); border-radius: 3px;">
                  <div style="width: 68%; height: 100%; background: var(--accent-gold); border-radius: 3px;"></div>
                </div>
              </div>

              <div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                  <span>Produced Water Separator Tank:</span>
                  <span style="font-family: var(--font-mono); color: var(--accent-blue);">24% Full</span>
                </div>
                <div style="height: 6px; background: rgba(255,255,255,0.05); border-radius: 3px;">
                  <div style="width: 24%; height: 100%; background: var(--accent-blue); border-radius: 3px;"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  public update(state: SimulationState, _solution: SolutionState): void {
    const oilEl = this._container.querySelector('#prod-val-oil');
    const liqEl = this._container.querySelector('#prod-val-liquid');
    const wcEl = this._container.querySelector('#prod-val-wc');
    const sorEl = this._container.querySelector('#prod-val-sor');

    if (oilEl) oilEl.textContent = `${state.production.oil_rate_bopd.toFixed(1)} BOPD`;
    if (liqEl) liqEl.textContent = `${(state.production.oil_rate_bopd / Math.max(0.01, 1 - state.controls.water_cut)).toFixed(1)} BPD`;
    if (wcEl) wcEl.textContent = `${(state.controls.water_cut * 100).toFixed(1)}%`;
    if (sorEl) sorEl.textContent = `${state.economics.sor.toFixed(1)} t/t`;
  }
}
