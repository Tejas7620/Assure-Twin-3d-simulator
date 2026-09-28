/**
 * src/ui/pages/ForecastView.ts
 * Multi-Horizon Forward Projection & Thermal Trajectory Page.
 * Visualizes 1D, 3D, 7D, 14D, 30D horizons for cooling decay, viscosity surge,
 * pumpability degradation, and boundary crossing forecasts.
 */

import type { SimulationState } from '../../sim/SimulationClient.ts';
import type { SolutionState, TrajectoryPoint } from '../../assure/types.ts';
import { TrajectoryChart } from '../components/TrajectoryChart.ts';
import { FutureTrajectoryEngine } from '../../assure/FutureTrajectoryEngine.ts';

export class ForecastView {
  private _container: HTMLElement;
  private _chart!: TrajectoryChart;
  private _activeHorizon: number = 7;

  constructor(container: HTMLElement) {
    this._container = container;
    this.render();
    this.initChart();
  }

  private render(): void {
    this._container.innerHTML = `
      <div class="ws-page-container">
        <div class="ws-page-title-row">
          <div>
            <div class="ws-page-title">FORWARD TRAJECTORY & MULTI-HORIZON FORECAST</div>
            <div class="ws-page-sub">First-principles thermo-mechanical projection (+1d to +30d) into immutable state vectors</div>
          </div>
          <div class="ws-horizon-tabs">
            <button class="ws-h-tab" data-h="1">1 DAY</button>
            <button class="ws-h-tab" data-h="3">3 DAYS</button>
            <button class="ws-h-tab active" data-h="7">7 DAYS</button>
            <button class="ws-h-tab" data-h="14">14 DAYS</button>
            <button class="ws-h-tab" data-h="30">30 DAYS</button>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 12px; height: 320px;">
          <!-- Trajectory Chart -->
          <div class="ws-card">
            <div class="ws-card-header">
              <span class="ws-card-title">PROJECTED WELLBORE RECOVERY & MECHANICAL RESPONSE</span>
            </div>
            <div class="ws-card-body">
              <canvas id="fc-chart-canvas" width="600" height="230" style="width: 100%; height: 210px;"></canvas>
              <div class="ws-chart-legend">
                <div class="ws-legend-item"><span class="ws-dot-legend red"></span> Temperature (°C)</div>
                <div class="ws-legend-item"><span class="ws-dot-legend orange"></span> In-Situ Viscosity (cP)</div>
                <div class="ws-legend-item"><span class="ws-dot-legend green"></span> Oil Rate (BOPD)</div>
                <div class="ws-legend-item"><span class="ws-dot-legend cyan"></span> Rod Float Margin (%)</div>
              </div>
            </div>
          </div>

          <!-- Horizon Metrics Card -->
          <div class="ws-card">
            <div class="ws-card-header">
              <span class="ws-card-title">HORIZON MILESTONES (+7D)</span>
            </div>
            <div class="ws-card-body">
              <div class="ws-status-row"><span class="ws-status-key">PROJECTED TEMP</span><span class="ws-status-num" id="fc-temp">64.5 °C</span></div>
              <div class="ws-status-row"><span class="ws-status-key">SURGE VISCOSITY</span><span class="ws-status-num" id="fc-visc">2,850 cP</span></div>
              <div class="ws-status-row"><span class="ws-status-key">FORECAST OIL RATE</span><span class="ws-status-num" id="fc-oil">22.4 BOPD</span></div>
              <div class="ws-status-row"><span class="ws-status-key">DOWNSTROKE DRAG</span><span class="ws-status-num" id="fc-drag">3.40 kN</span></div>
              <div class="ws-status-row"><span class="ws-status-key">REMAINING FLOAT MARGIN</span><span class="ws-status-num" id="fc-float" style="color: var(--accent-amber);">14.2 %</span></div>
              <div class="ws-status-row"><span class="ws-status-key">PUMPABILITY CROSSING</span><span class="ws-status-num" id="fc-cross" style="color: var(--accent-red);">Day 30.0</span></div>
            </div>
          </div>
        </div>

        <!-- 14-Day Trajectory Milestone Table -->
        <div class="ws-card" style="flex: 1;">
          <div class="ws-card-header">
            <span class="ws-card-title">DISCRETIZED 14-DAY FORWARD STATE VECTOR TABLE</span>
          </div>
          <div class="ws-card-body" style="padding: 8px;">
            <table class="ws-scenario-table" id="fc-milestones-table">
              <thead>
                <tr>
                  <th>HORIZON</th>
                  <th>TEMP (°C)</th>
                  <th>VISCOSITY (cP)</th>
                  <th>INFLOW (BPD)</th>
                  <th>OIL RATE (BOPD)</th>
                  <th>PEAK LOAD (kN)</th>
                  <th>FLOAT MARGIN (%)</th>
                  <th>STATUS</th>
                </tr>
              </thead>
              <tbody id="fc-milestones-body">
                <!-- Populated dynamically -->
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  private initChart(): void {
    const canvas = this._container.querySelector('#fc-chart-canvas') as HTMLCanvasElement;
    if (canvas) {
      this._chart = new TrajectoryChart(canvas);
      this._chart.setHorizon(this._activeHorizon);
    }

    const tabs = this._container.querySelectorAll('.ws-h-tab');
    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const h = parseInt(tab.getAttribute('data-h') || '7', 10);
        this._activeHorizon = h;
        this._chart.setHorizon(h);
      });
    });
  }

  public update(simState: SimulationState, _solutionState: SolutionState): void {
    const trajectory = FutureTrajectoryEngine.project(simState);
    const tbody = this._container.querySelector('#fc-milestones-body');
    if (tbody && trajectory?.points) {
      tbody.innerHTML = trajectory.points.map((p: TrajectoryPoint) => `
        <tr>
          <td>+${p.dayOffset} DAYS</td>
          <td>${p.temperatureC.toFixed(1)}</td>
          <td>${Math.round(p.viscosityCp).toLocaleString()}</td>
          <td>${p.inflowBpd.toFixed(1)}</td>
          <td>${p.oilRateBopd.toFixed(1)}</td>
          <td>${p.rodLoadKn.toFixed(1)}</td>
          <td style="color: ${p.floatMarginPct < 15 ? 'var(--accent-red)' : 'var(--accent-green)'}">${p.floatMarginPct.toFixed(1)}%</td>
          <td><span class="ws-pill-badge ${p.floatMarginPct < 10 ? 'critical' : (p.floatMarginPct < 20 ? 'warning' : 'safe')}">${p.floatMarginPct < 10 ? 'CRITICAL' : 'SAFE'}</span></td>
        </tr>
      `).join('');
    }
  }
}
