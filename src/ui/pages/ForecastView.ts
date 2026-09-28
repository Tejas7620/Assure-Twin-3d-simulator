/**
 * src/ui/pages/ForecastView.ts
 * Multi-Horizon Forward Projection & Thermal Trajectory Page.
 *
 * Phase 3 integration:
 * - Polls /api/v1/forecast?horizon_days=N every 10s via ApiBridge.
 * - Falls back to client-side FutureTrajectoryEngine when backend is unreachable.
 * - Both the trajectory table AND the chart update from whichever source provides data.
 * - Shows source badge: BACKEND (green) vs LOCAL (amber).
 */

import type { SimulationState } from '../../sim/SimulationClient.ts';
import type { SolutionState, TrajectoryPoint } from '../../assure/types.ts';
import { TrajectoryChart } from '../components/TrajectoryChart.ts';
import { FutureTrajectoryEngine } from '../../assure/FutureTrajectoryEngine.ts';
import { ApiBridge } from '../../api/ApiBridge.ts';
import { assureApiClient, type ForecastData, type ForecastPoint } from '../../api/client.ts';

export class ForecastView {
  private _container: HTMLElement;
  private _chart!: TrajectoryChart;
  private _activeHorizon: number = 7;
  private _bridge: ApiBridge;
  private _backendForecast: ForecastData | null = null;

  constructor(container: HTMLElement) {
    this._container = container;
    this._bridge = new ApiBridge();
    this.render();
    this.initChart();
    this._startPolling();
  }

  private _startPolling(): void {
    this._bridge.watchForecast(30, (data) => {
      this._backendForecast = data;
      this._updateFromBackend();
    }, 10000);
  }

  private render(): void {
    this._container.innerHTML = `
      <div class="ws-page-container">
        <div class="ws-page-title-row">
          <div>
            <div class="ws-page-title">FORWARD TRAJECTORY &amp; MULTI-HORIZON FORECAST</div>
            <div class="ws-page-sub">First-principles thermo-mechanical projection (+1d to +30d) into immutable state vectors</div>
          </div>
          <div style="display: flex; gap: 8px; align-items: center;">
            <span id="fc-source-badge" style="font-size: 8px; font-family: var(--font-mono); color: var(--text-muted); padding: 3px 8px; border-radius: 3px; border: 1px solid rgba(255,255,255,0.08);">
              LOADING...
            </span>
            <div class="ws-horizon-tabs">
              <button class="ws-h-tab" data-h="1">1 DAY</button>
              <button class="ws-h-tab" data-h="3">3 DAYS</button>
              <button class="ws-h-tab active" data-h="7">7 DAYS</button>
              <button class="ws-h-tab" data-h="14">14 DAYS</button>
              <button class="ws-h-tab" data-h="30">30 DAYS</button>
            </div>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 12px; height: 320px;">
          <!-- Trajectory Chart -->
          <div class="ws-card">
            <div class="ws-card-header">
              <span class="ws-card-title">PROJECTED WELLBORE RECOVERY &amp; MECHANICAL RESPONSE</span>
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
              <span class="ws-card-title" id="fc-horizon-title">HORIZON MILESTONES (+7D)</span>
            </div>
            <div class="ws-card-body">
              <div class="ws-status-row"><span class="ws-status-key">PROJECTED TEMP</span><span class="ws-status-num" id="fc-temp">—</span></div>
              <div class="ws-status-row"><span class="ws-status-key">SURGE VISCOSITY</span><span class="ws-status-num" id="fc-visc">—</span></div>
              <div class="ws-status-row"><span class="ws-status-key">FORECAST OIL RATE</span><span class="ws-status-num" id="fc-oil">—</span></div>
              <div class="ws-status-row"><span class="ws-status-key">STEAM/OIL RATIO</span><span class="ws-status-num" id="fc-sor">—</span></div>
              <div class="ws-status-row"><span class="ws-status-key">REMAINING FLOAT MARGIN</span><span class="ws-status-num" id="fc-float" style="color: var(--accent-amber);">—</span></div>
              <div class="ws-status-row"><span class="ws-status-key">PUMPABILITY CROSSING</span><span class="ws-status-num" id="fc-cross" style="color: var(--accent-red);">—</span></div>
            </div>
          </div>
        </div>

        <!-- 14-Day Trajectory Milestone Table -->
        <div class="ws-card" style="flex: 1;">
          <div class="ws-card-header">
            <span class="ws-card-title">DISCRETIZED FORWARD STATE VECTOR TABLE</span>
            <span id="fc-row-count" style="font-size: 8px; color: var(--text-muted); font-family: var(--font-mono);"></span>
          </div>
          <div class="ws-card-body" style="padding: 8px;">
            <table class="ws-scenario-table" id="fc-milestones-table">
              <thead>
                <tr>
                  <th>HORIZON</th>
                  <th>TEMP (°C)</th>
                  <th>VISCOSITY (cP)</th>
                  <th>OIL RATE (BOPD)</th>
                  <th>SOR</th>
                  <th>PEAK LOAD (kN)</th>
                  <th>FLOAT MARGIN (%)</th>
                  <th>STATUS</th>
                </tr>
              </thead>
              <tbody id="fc-milestones-body">
                <tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 16px;">Loading forecast data...</td></tr>
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
        this._chart?.setHorizon(h);
        // Re-fetch at new horizon
        this._bridge.fetchOnce(() => assureApiClient.getForecast(h)).then(data => {
          if (data) {
            this._backendForecast = data;
            this._updateFromBackend();
          }
        });
      });
    });
  }

  private _updateFromBackend(): void {
    const fc = this._backendForecast;
    if (!fc?.points?.length) return;

    const sourceBadge = this._container.querySelector('#fc-source-badge') as HTMLElement;
    if (sourceBadge) {
      sourceBadge.textContent = '● BACKEND';
      sourceBadge.style.color = 'var(--accent-green)';
      sourceBadge.style.borderColor = 'rgba(16,185,129,0.3)';
    }

    const horizonTitle = this._container.querySelector('#fc-horizon-title') as HTMLElement;
    if (horizonTitle) horizonTitle.textContent = `HORIZON MILESTONES (+${fc.horizon_days}D)`;

    // Find the point closest to the active horizon
    const targetPoint = fc.points.reduce((closest, p) =>
      Math.abs(p.day - this._activeHorizon) < Math.abs(closest.day - this._activeHorizon)
        ? p : closest
    , fc.points[0]);

    const setEl = (id: string, text: string, color?: string) => {
      const el = this._container.querySelector(id) as HTMLElement;
      if (el) { el.textContent = text; if (color) el.style.color = color; }
    };

    setEl('#fc-temp',  `${targetPoint.temperature.toFixed(1)} °C`);
    setEl('#fc-visc',  `${Math.round(targetPoint.viscosity).toLocaleString()} cP`);
    setEl('#fc-oil',   `${targetPoint.oil_rate.toFixed(1)} BOPD`);
    setEl('#fc-sor',   targetPoint.sor.toFixed(2));
    const floatMargin = targetPoint.float_margin;
    setEl('#fc-float', `${floatMargin.toFixed(1)} %`,
      floatMargin < 10 ? 'var(--accent-red)' : floatMargin < 20 ? 'var(--accent-amber)' : 'var(--accent-green)');

    // Pumpability crossing: first day where float_margin < 10 or oil_rate < 5
    const crossDay = fc.points.find(p => p.float_margin < 10 || p.oil_rate < 5);
    setEl('#fc-cross', crossDay ? `Day ${crossDay.day}` : `> Day ${fc.horizon_days}`,
      crossDay ? 'var(--accent-red)' : 'var(--accent-green)');

    // Update table
    const tbody = this._container.querySelector('#fc-milestones-body');
    const rowCount = this._container.querySelector('#fc-row-count') as HTMLElement;
    if (tbody) {
      tbody.innerHTML = fc.points.map((p: ForecastPoint) => `
        <tr>
          <td>+${p.day}d</td>
          <td>${p.temperature.toFixed(1)}</td>
          <td>${Math.round(p.viscosity).toLocaleString()}</td>
          <td>${p.oil_rate.toFixed(1)}</td>
          <td style="color: ${p.sor > 4 ? 'var(--accent-amber)' : 'var(--text-dim)'};">${p.sor.toFixed(2)}</td>
          <td>${p.rod_load.toFixed(1)}</td>
          <td style="color: ${p.float_margin < 10 ? 'var(--accent-red)' : p.float_margin < 20 ? 'var(--accent-amber)' : 'var(--accent-green)'}">
            ${p.float_margin.toFixed(1)}%
          </td>
          <td><span class="ws-pill-badge ${p.float_margin < 10 ? 'critical' : p.float_margin < 20 ? 'warning' : 'safe'}">
            ${p.float_margin < 10 ? 'CRITICAL' : p.float_margin < 20 ? 'WARNING' : 'SAFE'}
          </span></td>
        </tr>
      `).join('');
      if (rowCount) rowCount.textContent = `${fc.points.length} POINTS`;
    }

    // Update chart using backend forecast points
    if (this._chart) {
      this._chart.updateFromForecast(fc.points);
    }
  }

  public update(simState: SimulationState, _solutionState: SolutionState): void {
    // If backend data is available, skip local computation
    if (this._backendForecast) return;

    // Local fallback
    const sourceBadge = this._container.querySelector('#fc-source-badge') as HTMLElement;
    if (sourceBadge) {
      sourceBadge.textContent = '○ LOCAL';
      sourceBadge.style.color = 'var(--accent-amber)';
    }

    const trajectory = FutureTrajectoryEngine.project(simState);
    const tbody = this._container.querySelector('#fc-milestones-body');
    if (tbody && trajectory?.points) {
      tbody.innerHTML = trajectory.points.map((p: TrajectoryPoint) => `
        <tr>
          <td>+${p.dayOffset} DAYS</td>
          <td>${p.temperatureC.toFixed(1)}</td>
          <td>${Math.round(p.viscosityCp).toLocaleString()}</td>
          <td>${p.oilRateBopd.toFixed(1)}</td>
          <td>—</td>
          <td>${p.rodLoadKn.toFixed(1)}</td>
          <td style="color: ${p.floatMarginPct < 15 ? 'var(--accent-red)' : 'var(--accent-green)'}">${p.floatMarginPct.toFixed(1)}%</td>
          <td><span class="ws-pill-badge ${p.floatMarginPct < 10 ? 'critical' : (p.floatMarginPct < 20 ? 'warning' : 'safe')}">${p.floatMarginPct < 10 ? 'CRITICAL' : 'SAFE'}</span></td>
        </tr>
      `).join('');
    }

    if (this._chart && trajectory?.points) {
      this._chart.updateFromTrajectory(trajectory.points);
    }
  }

  public destroy(): void {
    this._bridge.stop();
  }
}
