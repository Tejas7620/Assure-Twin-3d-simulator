/**
 * src/ui/components/KpiStrip.ts
 * 8-Card Engineering KPI Strip matching the reference image.
 * Renders Oil Production, Water Cut, Liquid Rate, Steam Rate, SOR,
 * Bottomhole Pressure, Avg Temp BH, and Viscosity BH with icons, values, units, and trends.
 */

import type { SimulationState } from '../../sim/SimulationClient.ts';
import type { SolutionState } from '../../assure/types.ts';
import { CardDetailInspectors } from './CardDetailInspectors.ts';

export class KpiStrip {
  private _container: HTMLElement;
  private _lastSimState: SimulationState | null = null;
  private _lastSolutionState: SolutionState | null = null;

  constructor(container: HTMLElement) {
    this._container = container;
    this.render();
    this.bindEvents();
  }

  private render(): void {
    this._container.innerHTML = `
      <section class="ws-kpi-strip">
        <!-- 1. OIL PRODUCTION -->
        <div class="ws-kpi-card" id="kpi-oil">
          <div class="ws-kpi-head">
            <span class="ws-kpi-label">OIL PRODUCTION</span>
          </div>
          <div class="ws-kpi-body">
            <div class="ws-kpi-icon gold">
              <svg viewBox="0 0 24 24"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>
            </div>
            <div class="ws-kpi-val-group">
              <div class="ws-kpi-val"><span id="val-oil-rate">32.6</span> <span class="ws-kpi-unit">BOPD</span></div>
              <div class="ws-kpi-trend up"><span class="ws-trend-arrow">↗</span> 4.3 vs yesterday</div>
            </div>
          </div>
        </div>

        <!-- 2. WATER CUT -->
        <div class="ws-kpi-card" id="kpi-watercut">
          <div class="ws-kpi-head">
            <span class="ws-kpi-label">WATER CUT</span>
          </div>
          <div class="ws-kpi-body">
            <div class="ws-kpi-icon blue">
              <svg viewBox="0 0 24 24"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/><path d="M12 18a4 4 0 0 0 4-4"/></svg>
            </div>
            <div class="ws-kpi-val-group">
              <div class="ws-kpi-val"><span id="val-water-cut">12.8</span> <span class="ws-kpi-unit">%</span></div>
              <div class="ws-kpi-trend up"><span class="ws-trend-arrow">↗</span> 1.2 %</div>
            </div>
          </div>
        </div>

        <!-- 3. LIQUID RATE -->
        <div class="ws-kpi-card" id="kpi-liquid">
          <div class="ws-kpi-head">
            <span class="ws-kpi-label">LIQUID RATE</span>
          </div>
          <div class="ws-kpi-body">
            <div class="ws-kpi-icon purple">
              <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>
            </div>
            <div class="ws-kpi-val-group">
              <div class="ws-kpi-val"><span id="val-liquid-rate">7.1</span> <span class="ws-kpi-unit">BPD</span></div>
              <div class="ws-kpi-trend up"><span class="ws-trend-arrow">↗</span> 0.6</div>
            </div>
          </div>
        </div>

        <!-- 4. STEAM RATE -->
        <div class="ws-kpi-card" id="kpi-steam">
          <div class="ws-kpi-head">
            <span class="ws-kpi-label">STEAM RATE</span>
          </div>
          <div class="ws-kpi-body">
            <div class="ws-kpi-icon red">
              <svg viewBox="0 0 24 24"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>
            </div>
            <div class="ws-kpi-val-group">
              <div class="ws-kpi-val"><span id="val-steam-rate">42.3</span> <span class="ws-kpi-unit">t/d</span></div>
              <div class="ws-kpi-trend up"><span class="ws-trend-arrow">↗</span> 2.1</div>
            </div>
          </div>
        </div>

        <!-- 5. STEAM-OIL RATIO -->
        <div class="ws-kpi-card" id="kpi-sor">
          <div class="ws-kpi-head">
            <span class="ws-kpi-label">STEAM-OIL RATIO</span>
          </div>
          <div class="ws-kpi-body">
            <div class="ws-kpi-icon cyan">
              <svg viewBox="0 0 24 24"><circle cx="8" cy="8" r="3"/><circle cx="16" cy="16" r="3"/><line x1="16" y1="8" x2="8" y2="16"/></svg>
            </div>
            <div class="ws-kpi-val-group">
              <div class="ws-kpi-val"><span id="val-sor">6.2</span></div>
              <div class="ws-kpi-trend down"><span class="ws-trend-arrow">↘</span> -0.4</div>
            </div>
          </div>
        </div>

        <!-- 6. BOTTOMHOLE P -->
        <div class="ws-kpi-card" id="kpi-pwf">
          <div class="ws-kpi-head">
            <span class="ws-kpi-label">BOTTOMHOLE P</span>
          </div>
          <div class="ws-kpi-body">
            <div class="ws-kpi-icon orange">
              <svg viewBox="0 0 24 24"><path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"/><circle cx="12" cy="10" r="3"/></svg>
            </div>
            <div class="ws-kpi-val-group">
              <div class="ws-kpi-val"><span id="val-pwf">18.2</span> <span class="ws-kpi-unit">bar</span></div>
              <div class="ws-kpi-trend up"><span class="ws-trend-arrow">↗</span> 0.8</div>
            </div>
          </div>
        </div>

        <!-- 7. AVG TEMP (BH) -->
        <div class="ws-kpi-card" id="kpi-temp">
          <div class="ws-kpi-head">
            <span class="ws-kpi-label">AVG TEMP (BH)</span>
          </div>
          <div class="ws-kpi-body">
            <div class="ws-kpi-icon magenta">
              <svg viewBox="0 0 24 24"><path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/></svg>
            </div>
            <div class="ws-kpi-val-group">
              <div class="ws-kpi-val"><span id="val-temp-bh">72.6</span> <span class="ws-kpi-unit">°C</span></div>
              <div class="ws-kpi-trend up"><span class="ws-trend-arrow">↗</span> 1.3 °C</div>
            </div>
          </div>
        </div>

        <!-- 8. VISCOSITY (BH) -->
        <div class="ws-kpi-card" id="kpi-visc">
          <div class="ws-kpi-head">
            <span class="ws-kpi-label">VISCOSITY (BH)</span>
          </div>
          <div class="ws-kpi-body">
            <div class="ws-kpi-icon yellow">
              <svg viewBox="0 0 24 24"><path d="M10 2v7.31L4.35 19.46A2 2 0 0 0 6.08 22h11.84a2 2 0 0 0 1.73-2.54L14 9.31V2"/></svg>
            </div>
            <div class="ws-kpi-val-group">
              <div class="ws-kpi-val"><span id="val-visc-bh">1,392</span> <span class="ws-kpi-unit">cP</span></div>
              <div class="ws-kpi-trend up"><span class="ws-trend-arrow">↗</span> 98</div>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  private bindEvents(): void {
    const attach = (id: string, key: string) => {
      const card = this._container.querySelector(id);
      if (card) {
        card.classList.add('interactive');
        card.setAttribute('title', 'Click for deep-dive technical engineering analysis');
        card.addEventListener('click', () => {
          if (this._lastSimState && this._lastSolutionState) {
            CardDetailInspectors.showKpiDeepDive(key, this._lastSimState, this._lastSolutionState);
          }
        });
      }
    };

    attach('#kpi-oil', 'oil');
    attach('#kpi-watercut', 'water_cut');
    attach('#kpi-liquid', 'liquid');
    attach('#kpi-steam', 'steam');
    attach('#kpi-sor', 'sor');
    attach('#kpi-pwf', 'pwf');
    attach('#kpi-temp', 'temp');
    attach('#kpi-visc', 'visc');
  }

  public update(simState: SimulationState, solutionState: SolutionState): void {
    this._lastSimState = simState;
    this._lastSolutionState = solutionState;

    const setVal = (id: string, text: string) => {
      const el = this._container.querySelector(id);
      if (el) el.textContent = text;
    };

    setVal('#val-oil-rate', simState.production.oil_rate_bopd.toFixed(1));
    setVal('#val-water-cut', (simState.controls.water_cut * 100).toFixed(1));
    setVal('#val-liquid-rate', simState.production.liquid_rate_bpd.toFixed(1));
    setVal('#val-steam-rate', simState.controls.steam_volume_t_d.toFixed(1));
    setVal('#val-sor', simState.economics.sor.toFixed(1));
    setVal('#val-pwf', solutionState.virtualDownhole.downholePressure.value.toFixed(1));
    setVal('#val-temp-bh', solutionState.virtualDownhole.downholeTemperature.value.toFixed(1));
    setVal('#val-visc-bh', Math.round(solutionState.virtualDownhole.downholeViscosity.value).toLocaleString());
  }
}
