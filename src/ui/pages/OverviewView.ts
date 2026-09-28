/**
 * src/ui/pages/OverviewView.ts
 * Master Overview View matching the attached reference image.
 * Split into:
 * - Left Controls: SRP & CSS real sliders connected to SimulationClient.
 * - Center 3D Viewport: Houses the Three.js 3D simulator with floating toolbar, compass, zoom, and view modes.
 * - Right Cards: Pumpability Window gauge, Thermo-mechanical envelope, Rod & Pump status, Dyno card, Alerts.
 * - Bottom Row: Future Trajectory chart (1D/3D/7D/14D), Scenario Comparison table, and Recommendation summary.
 */

import type { SimulationClient, SimulationState } from '../../sim/SimulationClient.ts';
import type { AssureTwinManager } from '../../assure/AssureTwinManager.ts';
import type { SolutionState } from '../../assure/types.ts';
import { PumpabilityGauge } from '../components/PumpabilityGauge.ts';
import { EnvelopeCanvas } from '../components/EnvelopeCanvas.ts';
import { TrajectoryChart } from '../components/TrajectoryChart.ts';
import { DynoCardCanvas } from '../components/DynoCardCanvas.ts';
import { Environment } from '../../scene/Environment.ts';
import { CardDetailInspectors } from '../components/CardDetailInspectors.ts';

export class OverviewView {
  private _container: HTMLElement;
  private _simClient: SimulationClient;
  private _assureManager: AssureTwinManager;
  private _environment: Environment;

  private _gauge!: PumpabilityGauge;
  private _envelope!: EnvelopeCanvas;
  private _trajectory!: TrajectoryChart;
  private _dyno!: DynoCardCanvas;

  private _onOpenRecommendation?: () => void;
  private _onOpenScenarios?: () => void;
  private _onNavigate?: (page: string) => void;

  public get assureManager(): AssureTwinManager {
    return this._assureManager;
  }

  constructor(
    container: HTMLElement,
    simClient: SimulationClient,
    assureManager: AssureTwinManager,
    environment: Environment,
    callbacks: {
      onOpenRecommendation?: () => void;
      onOpenScenarios?: () => void;
      onNavigate?: (page: string) => void;
    } = {}
  ) {
    this._container = container;
    this._simClient = simClient;
    this._assureManager = assureManager;
    this._environment = environment;
    this._onOpenRecommendation = callbacks.onOpenRecommendation;
    this._onOpenScenarios = callbacks.onOpenScenarios;
    this._onNavigate = callbacks.onNavigate;

    this.render();
    this.initComponents();
    this.bindEvents();
  }

  private render(): void {
    this._container.innerHTML = `
      <div class="ws-overview-grid">
        <!-- UPPER ROW: CONTROLS (LEFT), 3D SIMULATOR (CENTER), KPIS & ENVELOPE (RIGHT) -->
        <div class="ws-overview-top-row">
          
          <!-- LEFT CONTROLS COLUMN -->
          <div class="ws-controls-col">
            <!-- SRP CONTROLS -->
            <div class="ws-card">
              <div class="ws-card-header">
                <span class="ws-card-title">SRP CONTROLS</span>
              </div>
              <div class="ws-card-body">
                <!-- SPM -->
                <div class="ws-control-item">
                  <div class="ws-control-head">
                    <span class="ws-control-name">SPM</span>
                    <span class="ws-control-val" id="ov-spm-val">3.2 spm</span>
                  </div>
                  <div class="ws-slider-row">
                    <span class="ws-slider-bound">0.5</span>
                    <input type="range" class="ws-range-slider" id="ov-spm-slider" min="0.5" max="10.0" step="0.1" value="3.2">
                    <span class="ws-slider-bound">10</span>
                  </div>
                </div>

                <!-- STROKE LENGTH -->
                <div class="ws-control-item">
                  <div class="ws-control-head">
                    <span class="ws-control-name">STROKE LENGTH</span>
                    <span class="ws-control-val" id="ov-stroke-val">64 in</span>
                  </div>
                  <div class="ws-slider-row">
                    <span class="ws-slider-bound">30</span>
                    <input type="range" class="ws-range-slider" id="ov-stroke-slider" min="30" max="120" step="1" value="64">
                    <span class="ws-slider-bound">120</span>
                  </div>
                </div>

                <!-- VFD SPEED -->
                <div class="ws-control-item">
                  <div class="ws-control-head">
                    <span class="ws-control-name">VFD SPEED</span>
                    <span class="ws-control-val" id="ov-vfd-val">62 Hz</span>
                  </div>
                  <div class="ws-slider-row">
                    <span class="ws-slider-bound">10</span>
                    <input type="range" class="ws-range-slider" id="ov-vfd-slider" min="10" max="120" step="1" value="62">
                    <span class="ws-slider-bound">120</span>
                  </div>
                </div>

                <!-- PUMP DIAMETER -->
                <div class="ws-key-val-row">
                  <span class="ws-kv-label">PUMP DIAMETER</span>
                  <span class="ws-kv-val">1.75 in</span>
                </div>

                <!-- PUMP TYPE -->
                <div class="ws-key-val-row">
                  <span class="ws-kv-label">PUMP TYPE</span>
                  <span class="ws-kv-val">Conventional ▾</span>
                </div>

                <!-- STATUS -->
                <div class="ws-key-val-row">
                  <span class="ws-kv-label">STATUS</span>
                  <span class="ws-kv-val running">Running <span class="ws-dot-green"></span></span>
                </div>
              </div>
            </div>

            <!-- CSS CONTROLS -->
            <div class="ws-card">
              <div class="ws-card-header">
                <span class="ws-card-title">CSS CONTROLS</span>
              </div>
              <div class="ws-card-body">
                <div class="ws-key-val-row">
                  <span class="ws-kv-label">STEAM RATE</span>
                  <span class="ws-kv-val" id="ov-css-rate">42.3 t/d</span>
                </div>
                <div class="ws-key-val-row">
                  <span class="ws-kv-label">INJECTION PRESSURE</span>
                  <span class="ws-kv-val">18.5 bar</span>
                </div>
                <div class="ws-key-val-row">
                  <span class="ws-kv-label">SOAK TIME</span>
                  <span class="ws-kv-val">7.0 days</span>
                </div>
                <div class="ws-key-val-row">
                  <span class="ws-kv-label">PROD. CUT-OFF</span>
                  <span class="ws-kv-val">60.0 days</span>
                </div>
                <div class="ws-key-val-row">
                  <span class="ws-kv-label">CSS CYCLE DAY</span>
                  <span class="ws-kv-val" id="ov-css-cycle">41 / 60</span>
                </div>
              </div>
            </div>
          </div>

          <!-- CENTER 3D VIEWPORT -->
          <div class="ws-viewport-col" style="position: relative;">
            <div id="viewport-3d-mount"></div>
            <div id="ov-flash-overlay" class="ws-flash-overlay"></div>

            <!-- Floating 3D Toolbar -->
            <div class="ws-3d-toolbar">
              <button class="ws-3d-btn" id="ov-cam-overview" data-tooltip="Field Overview" title="Field Overview"><svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg></button>
              <button class="ws-3d-btn" id="ov-cam-orbit" data-tooltip="Toggle 360° Auto-Orbit" title="Orbit Control"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 9 9"/></svg></button>
              <button class="ws-3d-btn" id="ov-cam-layers" data-tooltip="Toggle 3D Subsystem Layers" title="Layers"><svg viewBox="0 0 24 24"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg></button>
              <button class="ws-3d-btn" id="ov-cam-camera" data-tooltip="Capture 3D Snapshot" title="Camera Reset & Snapshot"><svg viewBox="0 0 24 24"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg></button>
              <button class="ws-3d-btn" id="ov-cam-measure" data-tooltip="Wellbore Survey Metrology" title="Measure Distance"><svg viewBox="0 0 24 24"><line x1="2" y1="12" x2="22" y2="12"/><line x1="6" y1="8" x2="6" y2="16"/><line x1="18" y1="8" x2="18" y2="16"/></svg></button>
              <button class="ws-3d-btn" id="ov-cam-cutaway" data-tooltip="Subsurface Cutaway Focus" title="Subsurface Cutaway"><svg viewBox="0 0 24 24"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/></svg></button>
              <button class="ws-3d-btn" id="ov-cam-fullscreen" data-tooltip="Toggle Fullscreen" title="Expand Viewport"><svg viewBox="0 0 24 24"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg></button>
              <span class="ws-3d-badge-toggle" id="ov-cam-wireframe" data-tooltip="Toggle 3D Shading Mode" style="cursor: pointer;">3D</span>
            </div>

            <!-- Floating Layers HUD -->
            <div id="ov-layers-hud" class="ws-layers-hud" style="display: none;">
              <div class="ws-hud-title">3D SUBSYSTEM LAYERS</div>
              <label class="ws-hud-row"><input type="checkbox" id="layer-pumpjack" checked> Surface Pumpjack Unit</label>
              <label class="ws-hud-row"><input type="checkbox" id="layer-wellbore" checked> Deviated Wellbore & Tubing</label>
              <label class="ws-hud-row"><input type="checkbox" id="layer-steam" checked> Steam Injection Cloud</label>
              <label class="ws-hud-row"><input type="checkbox" id="layer-oil" checked> Multiphase Oil Flow</label>
              <label class="ws-hud-row"><input type="checkbox" id="layer-geology" checked> Jodhpur Formation Geology</label>
            </div>

            <!-- Floating Measurement HUD -->
            <div id="ov-measure-hud" class="ws-measure-hud" style="display: none;">
              <div class="ws-hud-title">WELLBORE SURVEY METROLOGY</div>
              <div class="ws-hud-stat"><span class="lbl">TOTAL DEPTH (MD):</span><span class="val">1,840.0 m</span></div>
              <div class="ws-hud-stat"><span class="lbl">TRUE VERTICAL (TVD):</span><span class="val">1,420.0 m</span></div>
              <div class="ws-hud-stat"><span class="lbl">LATERAL STEP-OUT:</span><span class="val">420.0 m</span></div>
              <div class="ws-hud-stat"><span class="lbl">PUMP INTAKE DEPTH:</span><span class="val">1,420.0 m</span></div>
              <div class="ws-hud-stat"><span class="lbl">DYNAMIC FLUID LEVEL:</span><span class="val" id="hud-val-fluid">973.0 m</span></div>
              <div class="ws-hud-stat"><span class="lbl">NET SUBMERGENCE:</span><span class="val" id="hud-val-subm">447.0 m</span></div>
            </div>

            <!-- Floating Compass & Zoom -->
            <div class="ws-3d-nav-widgets">
              <div class="ws-compass-btn" id="ov-btn-compass" title="Compass Orientation">W-E</div>
              <button class="ws-nav-btn" id="ov-btn-zoom-in" title="Zoom In"><svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></button>
              <button class="ws-nav-btn" id="ov-btn-zoom-out" title="Zoom Out"><svg viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"/></svg></button>
              <button class="ws-nav-btn" id="ov-btn-target" title="Center Focus"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg></button>
            </div>

            <!-- Bottom View Mode Pills -->
            <div class="ws-3d-bottom-bar">
              <div class="ws-view-mode-group">
                <button class="ws-mode-pill" id="ov-pill-surface">Surface</button>
                <button class="ws-mode-pill" id="ov-pill-wellbore">Wellbore</button>
                <button class="ws-mode-pill active" id="ov-pill-reservoir">Reservoir</button>
              </div>
              <div class="ws-depth-readout">DEPTH 1,420 m TVD</div>
            </div>
          </div>

          <!-- RIGHT KPIS & CARDS COLUMN -->
          <div class="ws-right-col">
            <!-- PUMPABILITY WINDOW -->
            <div class="ws-card ws-pumpability-card interactive" id="ov-card-pumpability" title="Click to open Pumpability Window Inspector">
              <div class="ws-card-header" style="width: 100%;">
                <span class="ws-card-title">PUMPABILITY WINDOW</span>
                <span style="font-size: 8px; color: var(--accent-blue); font-family: var(--font-mono);">INSPECT ↗</span>
              </div>
              <div class="ws-card-body" style="align-items: center; width: 100%;">
                <canvas id="ov-gauge-canvas" width="240" height="120" style="width: 100%; height: 110px;"></canvas>
                <div class="ws-pumpability-footer">
                  <span class="ws-sub-lbl">Time to reach unfavorable boundary</span>
                  <span class="ws-pill-badge safe" id="ov-pumpability-badge">STATE: SAFE</span>
                </div>
              </div>
            </div>

            <!-- THERMO-MECHANICAL ENVELOPE -->
            <div class="ws-card interactive" id="ov-card-envelope" title="Click to open Thermo-Mechanical Envelope Inspector">
              <div class="ws-card-header">
                <span class="ws-card-title">THERMO-MECHANICAL ENVELOPE</span>
                <span style="font-size: 8px; color: var(--accent-blue); font-family: var(--font-mono);">INSPECT ↗</span>
              </div>
              <div class="ws-card-body" style="padding: 6px;">
                <canvas id="ov-envelope-canvas" width="260" height="125" style="width: 100%; height: 115px;"></canvas>
              </div>
            </div>

            <!-- ROD & PUMP STATUS -->
            <div class="ws-card interactive" id="ov-card-srp-status" title="Click to open SRP Diagnostics Drawer">
              <div class="ws-card-header">
                <span class="ws-card-title">ROD & PUMP STATUS</span>
                <span style="font-size: 8px; color: var(--accent-blue); font-family: var(--font-mono);">INSPECT ↗</span>
              </div>
              <div class="ws-card-body" style="padding: 6px 10px;">
                <div class="ws-status-row">
                  <span class="ws-status-key">ROD LOAD</span>
                  <div class="ws-status-val-group">
                    <span class="ws-status-num" id="ov-rod-load">18.7 kN</span>
                    <span class="ws-status-tag warning">WARNING</span>
                  </div>
                </div>
                <div class="ws-status-row">
                  <span class="ws-status-key">FLOAT MARGIN</span>
                  <div class="ws-status-val-group">
                    <span class="ws-status-num" id="ov-float-margin">6.3 %</span>
                    <span class="ws-status-tag warning">WARNING</span>
                  </div>
                </div>
                <div class="ws-status-row">
                  <span class="ws-status-key">PUMP FILLAGE</span>
                  <div class="ws-status-val-group">
                    <span class="ws-status-num" id="ov-pump-fillage">56.6 %</span>
                    <span class="ws-status-tag good">GOOD</span>
                  </div>
                </div>
                <div class="ws-status-row">
                  <span class="ws-status-key">PUMP EFFICIENCY</span>
                  <div class="ws-status-val-group">
                    <span class="ws-status-num" id="ov-pump-eff">72.1 %</span>
                    <span class="ws-status-tag good">GOOD</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- DYNAMOMETER CARD -->
            <div class="ws-card interactive" id="ov-card-dyno" title="Click to open Dynamometer Card Deep Analysis">
              <div class="ws-card-header">
                <span class="ws-card-title">DYNAMOMETER CARD</span>
                <span style="font-size: 8px; color: var(--accent-blue); font-family: var(--font-mono);">INSPECT ↗</span>
              </div>
              <div class="ws-card-body" style="padding: 6px;">
                <canvas id="ov-dyno-canvas" width="260" height="90" style="width: 100%; height: 80px;"></canvas>
              </div>
            </div>

            <!-- ALERTS WIDGET -->
            <div class="ws-card" id="ov-card-alerts">
              <div class="ws-card-header">
                <span class="ws-card-title">ALERTS</span>
                <span style="font-size: 8px; color: var(--accent-blue); cursor: pointer;" id="ov-btn-view-alerts">View All ↗</span>
              </div>
              <div class="ws-card-body" style="padding: 6px 10px;">
                <div class="ws-alert-item interactive" style="cursor: pointer;" id="ov-alert-item-1">
                  <span class="ws-alert-icon">⚠️</span>
                  <div class="ws-alert-content">
                    <span class="ws-alert-msg">Pumpability window is decreasing</span>
                    <span class="ws-alert-sub">Current window: 6.4 days</span>
                  </div>
                  <span class="ws-alert-time">10:31 AM</span>
                </div>
                <div class="ws-alert-item">
                  <span class="ws-alert-icon">⚠️</span>
                  <div class="ws-alert-content">
                    <span class="ws-alert-msg">Float margin below preferred limit</span>
                    <span class="ws-alert-sub">Current: 6.3 %</span>
                  </div>
                  <span class="ws-alert-time">10:28 AM</span>
                </div>
                <div class="ws-alert-item">
                  <span class="ws-alert-icon">ℹ️</span>
                  <div class="ws-alert-content">
                    <span class="ws-alert-msg">Next CSS window approaching</span>
                    <span class="ws-alert-sub">Estimated in 7-9 days</span>
                  </div>
                  <span class="ws-alert-time">10:20 AM</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- LOWER ROW: FUTURE TRAJECTORY, SCENARIO COMPARISON, RECOMMENDATION -->
        <div class="ws-overview-bottom-row">
          
          <!-- 1. FUTURE TRAJECTORY -->
          <div class="ws-card">
            <div class="ws-card-header">
              <span class="ws-card-title">FUTURE TRAJECTORY (7 DAYS)</span>
              <div class="ws-horizon-tabs">
                <button class="ws-h-tab" data-days="1">1D</button>
                <button class="ws-h-tab" data-days="3">3D</button>
                <button class="ws-h-tab active" data-days="7">7D</button>
                <button class="ws-h-tab" data-days="14">14D</button>
              </div>
            </div>
            <div class="ws-card-body" style="padding: 6px 10px;">
              <canvas id="ov-trajectory-canvas" width="360" height="150" style="width: 100%; height: 135px;"></canvas>
              <div class="ws-chart-legend">
                <div class="ws-legend-item"><span class="ws-dot-legend red"></span> Temperature (°C)</div>
                <div class="ws-legend-item"><span class="ws-dot-legend orange"></span> Viscosity (cP)</div>
                <div class="ws-legend-item"><span class="ws-dot-legend green"></span> Oil Rate (BOPD)</div>
                <div class="ws-legend-item"><span class="ws-dot-legend cyan"></span> Float Margin (%)</div>
              </div>
            </div>
          </div>

          <!-- 2. SCENARIO COMPARISON -->
          <div class="ws-card">
            <div class="ws-card-header">
              <span class="ws-card-title">SCENARIO COMPARISON</span>
              <button class="ws-btn-compare" id="ov-btn-compare-all">Compare</button>
            </div>
            <div class="ws-card-body" style="padding: 6px 8px;">
              <table class="ws-scenario-table">
                <thead>
                  <tr>
                    <th>SCENARIO</th>
                    <th>CURR.</th>
                    <th>CSS ONLY</th>
                    <th>SRP ONLY</th>
                    <th>JOINT (BEST)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Oil Rate (BOPD)</td>
                    <td>28.6</td>
                    <td>31.8</td>
                    <td>30.2</td>
                    <td class="best">33.4</td>
                  </tr>
                  <tr>
                    <td>SOR</td>
                    <td>8.1</td>
                    <td>6.4</td>
                    <td>7.2</td>
                    <td class="best">5.9</td>
                  </tr>
                  <tr>
                    <td>Steam (t/d)</td>
                    <td>42.3</td>
                    <td>56.0</td>
                    <td>42.3</td>
                    <td class="best">48.0</td>
                  </tr>
                  <tr>
                    <td>Energy (kW)</td>
                    <td>14.2</td>
                    <td>16.1</td>
                    <td>13.5</td>
                    <td class="best">14.8</td>
                  </tr>
                  <tr>
                    <td>Float Margin (%)</td>
                    <td>4.5</td>
                    <td>8.9</td>
                    <td>6.1</td>
                    <td class="best">9.2</td>
                  </tr>
                  <tr>
                    <td>Pumpability (days)</td>
                    <td>4.8</td>
                    <td>9.6</td>
                    <td>6.3</td>
                    <td class="best">12.8</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- 3. RECOMMENDATION -->
          <div class="ws-card">
            <div class="ws-card-header">
              <span class="ws-card-title">RECOMMENDATION</span>
            </div>
            <div class="ws-card-body">
              <div class="ws-rec-badge-bar">
                <span>★</span> VERIFIED FOR ENGINEER REVIEW
              </div>
              <div style="font-size: 8.5px; font-weight: 700; color: var(--text-muted); margin-top: 4px;">RECOMMENDED ACTION</div>
              <div class="ws-rec-list">
                <div class="ws-rec-item">• Reduce SPM to 2.8 spm</div>
                <div class="ws-rec-item">• Increase Stroke to 72 in</div>
                <div class="ws-rec-item">• Prepare next CSS cycle in 7–9 days</div>
              </div>

              <div style="font-size: 8.5px; font-weight: 700; color: var(--text-muted); margin-top: 4px;">EXPECTED BENEFIT</div>
              <div class="ws-rec-list">
                <div class="ws-rec-gain">• Oil Rate ↗ 16 %</div>
                <div class="ws-rec-gain">• SOR ↘ 27 %</div>
                <div class="ws-rec-gain">• Pumpability Window ↗ 8 days</div>
              </div>

              <button class="ws-btn-full-rec" id="ov-btn-view-rec">View Full Recommendation</button>
            </div>
          </div>

        </div>
      </div>
    `;
  }

  private initComponents(): void {
    // 1. Mount 3D Canvas
    const mount = this._container.querySelector('#viewport-3d-mount') as HTMLElement;
    if (mount && this._environment) {
      mount.appendChild(this._environment.renderer.domElement);
      this.resize3D();
    }

    // 2. Initialize Pumpability Gauge
    const gaugeCanvas = this._container.querySelector('#ov-gauge-canvas') as HTMLCanvasElement;
    if (gaugeCanvas) {
      this._gauge = new PumpabilityGauge(gaugeCanvas);
      this._gauge.render(6.4, 'SAFE');
    }

    // 3. Initialize Envelope Canvas
    const envCanvas = this._container.querySelector('#ov-envelope-canvas') as HTMLCanvasElement;
    if (envCanvas) {
      this._envelope = new EnvelopeCanvas(envCanvas);
      this._envelope.render();
    }

    // 4. Initialize Future Trajectory Chart
    const trajCanvas = this._container.querySelector('#ov-trajectory-canvas') as HTMLCanvasElement;
    if (trajCanvas) {
      this._trajectory = new TrajectoryChart(trajCanvas);
      this._trajectory.render();
    }

    // 5. Initialize Dyno Card Canvas
    const dynoCanvas = this._container.querySelector('#ov-dyno-canvas') as HTMLCanvasElement;
    if (dynoCanvas) {
      this._dyno = new DynoCardCanvas(dynoCanvas);
      this._dyno.render();
    }
  }

  private bindEvents(): void {
    // SPM Slider
    const spmSlider = this._container.querySelector('#ov-spm-slider') as HTMLInputElement;
    const spmVal = this._container.querySelector('#ov-spm-val');
    if (spmSlider) {
      spmSlider.addEventListener('input', () => {
        const val = parseFloat(spmSlider.value);
        if (spmVal) spmVal.textContent = `${val.toFixed(1)} spm`;
        this._simClient.setControl('spm', val);
      });
    }

    // Stroke Slider
    const strokeSlider = this._container.querySelector('#ov-stroke-slider') as HTMLInputElement;
    const strokeVal = this._container.querySelector('#ov-stroke-val');
    if (strokeSlider) {
      strokeSlider.addEventListener('input', () => {
        const val = parseInt(strokeSlider.value, 10);
        if (strokeVal) strokeVal.textContent = `${val} in`;
        this._simClient.setControl('stroke_inches', val);
      });
    }

    // VFD Slider
    const vfdSlider = this._container.querySelector('#ov-vfd-slider') as HTMLInputElement;
    const vfdVal = this._container.querySelector('#ov-vfd-val');
    if (vfdSlider) {
      vfdSlider.addEventListener('input', () => {
        const val = parseInt(vfdSlider.value, 10);
        if (vfdVal) vfdVal.textContent = `${val} Hz`;
      });
    }

    // 3D Camera Controls
    this._container.querySelector('#ov-cam-overview')?.addEventListener('click', () => {
      this._environment.moveToPreset('exactMatch');
    });

    // Orbit 360 toggle
    const orbitBtn = this._container.querySelector('#ov-cam-orbit');
    orbitBtn?.addEventListener('click', () => {
      this._environment.controls.autoRotate = !this._environment.controls.autoRotate;
      orbitBtn.classList.toggle('active', this._environment.controls.autoRotate);
    });

    // Layers Popover toggle
    const layersBtn = this._container.querySelector('#ov-cam-layers');
    const layersHud = this._container.querySelector('#ov-layers-hud') as HTMLElement;
    layersBtn?.addEventListener('click', () => {
      if (layersHud) {
        const isShown = layersHud.style.display !== 'none';
        layersHud.style.display = isShown ? 'none' : 'block';
        layersBtn.classList.toggle('active', !isShown);
      }
    });

    const bindLayerToggle = (id: string, keyword: string) => {
      this._container.querySelector(id)?.addEventListener('change', (e) => {
        const checked = (e.target as HTMLInputElement).checked;
        this._environment.scene.traverse((obj) => {
          if (obj.name && obj.name.toLowerCase().includes(keyword.toLowerCase())) {
            obj.visible = checked;
          }
        });
      });
    };
    bindLayerToggle('#layer-pumpjack', 'pumpjack');
    bindLayerToggle('#layer-wellbore', 'wellbore');
    bindLayerToggle('#layer-steam', 'steam');
    bindLayerToggle('#layer-oil', 'oil');
    bindLayerToggle('#layer-geology', 'reservoir');

    // Camera Snapshot & Reset
    const camBtn = this._container.querySelector('#ov-cam-camera');
    camBtn?.addEventListener('click', () => {
      const flash = this._container.querySelector('#ov-flash-overlay') as HTMLElement;
      if (flash) {
        flash.classList.add('flash');
        setTimeout(() => flash.classList.remove('flash'), 140);
      }
      try {
        this._environment.renderer.render(this._environment.scene, this._environment.camera);
        const dataUrl = this._environment.renderer.domElement.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = 'BGW-17A_3D_DigitalTwin_Snapshot.png';
        link.href = dataUrl;
        link.click();
      } catch (e) {
        console.warn('Screenshot download notice:', e);
      }
      this._environment.resetCamera();
    });

    // Measurement Caliper HUD
    const measureBtn = this._container.querySelector('#ov-cam-measure');
    const measureHud = this._container.querySelector('#ov-measure-hud') as HTMLElement;
    measureBtn?.addEventListener('click', () => {
      if (measureHud) {
        const isShown = measureHud.style.display !== 'none';
        measureHud.style.display = isShown ? 'none' : 'block';
        measureBtn.classList.toggle('active', !isShown);
      }
    });

    // Subsurface Cutaway Focus Toggle
    let cutawayStep = 0;
    this._container.querySelector('#ov-cam-cutaway')?.addEventListener('click', () => {
      cutawayStep = (cutawayStep + 1) % 3;
      if (cutawayStep === 1) {
        this._environment.moveToPreset('horizontalPump');
      } else if (cutawayStep === 2) {
        this._environment.moveToPreset('thermalFront');
      } else {
        this._environment.moveToPreset('exactMatch');
      }
    });

    // Fullscreen Viewport Toggle
    const fsBtn = this._container.querySelector('#ov-cam-fullscreen');
    fsBtn?.addEventListener('click', () => {
      const vp = this._container.querySelector('.ws-viewport-col') as HTMLElement;
      if (!document.fullscreenElement) {
        vp?.requestFullscreen?.();
        fsBtn.classList.add('active');
      } else {
        document.exitFullscreen?.();
        fsBtn.classList.remove('active');
      }
    });

    // 3D Wireframe / Stylization Mode
    const wireBtn = this._container.querySelector('#ov-cam-wireframe');
    let wireState = false;
    wireBtn?.addEventListener('click', () => {
      wireState = !wireState;
      wireBtn?.classList.toggle('active', wireState);
      this._environment.scene.traverse((obj) => {
        if ((obj as any).isMesh && (obj as any).material) {
          const mat = (obj as any).material;
          if (Array.isArray(mat)) {
            mat.forEach(m => { m.wireframe = wireState; });
          } else {
            mat.wireframe = wireState;
          }
        }
      });
    });

    // Zoom & Focus Controls
    this._container.querySelector('#ov-btn-zoom-in')?.addEventListener('click', () => {
      this._environment.camera.position.multiplyScalar(0.9);
    });
    this._container.querySelector('#ov-btn-zoom-out')?.addEventListener('click', () => {
      this._environment.camera.position.multiplyScalar(1.1);
    });
    this._container.querySelector('#ov-btn-compass')?.addEventListener('click', () => {
      this._environment.resetCamera();
    });
    this._container.querySelector('#ov-btn-target')?.addEventListener('click', () => {
      this._environment.controls.target.set(0, 2.5, 0);
      this._environment.controls.update();
    });

    // View Mode Pills
    const pillSurface = this._container.querySelector('#ov-pill-surface');
    const pillWellbore = this._container.querySelector('#ov-pill-wellbore');
    const pillReservoir = this._container.querySelector('#ov-pill-reservoir');

    const setModeActive = (activeBtn: Element | null, presetKey: string) => {
      [pillSurface, pillWellbore, pillReservoir].forEach(p => p?.classList.remove('active'));
      activeBtn?.classList.add('active');
      this._environment.moveToPreset(presetKey);
    };

    pillSurface?.addEventListener('click', () => setModeActive(pillSurface, 'srpUnit'));
    pillWellbore?.addEventListener('click', () => setModeActive(pillWellbore, 'horizontalPump'));
    pillReservoir?.addEventListener('click', () => setModeActive(pillReservoir, 'thermalFront'));

    // Horizon tabs
    const hTabs = this._container.querySelectorAll('.ws-h-tab');
    hTabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        hTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const days = parseInt(tab.getAttribute('data-days') || '7', 10);
        this._trajectory.setHorizon(days);
      });
    });

    // Button to open full recommendation
    this._container.querySelector('#ov-btn-view-rec')?.addEventListener('click', () => {
      this._onOpenRecommendation?.();
    });

    // Button to open scenarios
    this._container.querySelector('#ov-btn-compare-all')?.addEventListener('click', () => {
      this._onOpenScenarios?.();
    });

    // Right Sidebar Interactive Card Inspectors
    this._container.querySelector('#ov-card-pumpability')?.addEventListener('click', () => {
      CardDetailInspectors.showPumpability(
        this._assureManager.solutionState,
        this._simClient.state,
        (page) => this._onNavigate?.(page)
      );
    });

    this._container.querySelector('#ov-card-envelope')?.addEventListener('click', () => {
      CardDetailInspectors.showEnvelope(
        this._assureManager.solutionState,
        this._simClient.state,
        (page) => this._onNavigate?.(page)
      );
    });

    this._container.querySelector('#ov-card-srp-status')?.addEventListener('click', () => {
      CardDetailInspectors.showSrpDiagnostics(
        this._simClient.state,
        this._assureManager.solutionState,
        (page) => this._onNavigate?.(page)
      );
    });

    this._container.querySelector('#ov-card-dyno')?.addEventListener('click', () => {
      CardDetailInspectors.showDynoDetails(
        this._simClient.state,
        this._assureManager.solutionState
      );
    });

    this._container.querySelector('#ov-btn-view-alerts')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this._onNavigate?.('alerts');
    });

    this._container.querySelector('#ov-alert-item-1')?.addEventListener('click', () => {
      CardDetailInspectors.showAlertDetails(
        'Pumpability window is decreasing',
        'Current calculated window is 6.4 days. Viscous Couette rod drag is projected to exceed buoyant float margin during downstroke due to near-wellbore cooling (-0.85 °C/d).',
        '10:31 AM',
        (page) => this._onNavigate?.(page)
      );
    });
  }

  public resize3D(): void {
    const mount = this._container.querySelector('#viewport-3d-mount') as HTMLElement;
    if (mount && this._environment) {
      const rect = mount.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        this._environment.camera.aspect = rect.width / rect.height;
        this._environment.camera.updateProjectionMatrix();
        this._environment.renderer.setSize(rect.width, rect.height, false);
      }
    }
  }

  public update(simState: SimulationState, solutionState: SolutionState): void {
    // 1. Update Sliders & Readouts
    const spmVal = this._container.querySelector('#ov-spm-val');
    const spmSlider = this._container.querySelector('#ov-spm-slider') as HTMLInputElement;
    if (spmVal && document.activeElement !== spmSlider) {
      spmVal.textContent = `${simState.controls.spm.toFixed(1)} spm`;
      if (spmSlider) spmSlider.value = simState.controls.spm.toString();
    }

    const strokeVal = this._container.querySelector('#ov-stroke-val');
    const strokeSlider = this._container.querySelector('#ov-stroke-slider') as HTMLInputElement;
    if (strokeVal && document.activeElement !== strokeSlider) {
      strokeVal.textContent = `${Math.round(simState.controls.stroke_inches)} in`;
      if (strokeSlider) strokeSlider.value = Math.round(simState.controls.stroke_inches).toString();
    }

    // 2. Update Rod & Pump Status values
    const rodLoad = this._container.querySelector('#ov-rod-load');
    if (rodLoad) rodLoad.textContent = `${simState.srp.rod_load_kn.toFixed(1)} kN`;

    const floatMargin = this._container.querySelector('#ov-float-margin');
    if (floatMargin) floatMargin.textContent = `${simState.srp.float_margin_pct.toFixed(1)} %`;

    const pumpFillage = this._container.querySelector('#ov-pump-fillage');
    if (pumpFillage) pumpFillage.textContent = `${simState.pump.pump_fillage_pct.toFixed(1)} %`;

    const pumpEff = this._container.querySelector('#ov-pump-eff');
    if (pumpEff) pumpEff.textContent = `${simState.pump.pump_efficiency_pct.toFixed(1)} %`;

    // 3. Update Pumpability Gauge
    const daysRemaining = solutionState.pumpability.timeToBoundaryDays;
    const pStatus = solutionState.pumpability.state;
    this._gauge.render(daysRemaining, pStatus);

    const badge = this._container.querySelector('#ov-pumpability-badge');
    if (badge) {
      badge.textContent = `STATE: ${pStatus}`;
      badge.className = `ws-pill-badge ${pStatus.toLowerCase()}`;
    }

    // 4. Update Operating Envelope
    this._envelope.update({
      tempC: solutionState.virtualDownhole.downholeTemperature.value,
      spm: simState.controls.spm,
      status: pStatus
    });

    // 5. Update Dyno Card metrics
    this._dyno.updateMetrics(
      simState.srp.pprl_kn,
      simState.srp.mprl_kn,
      -18.3
    );
  }
}
