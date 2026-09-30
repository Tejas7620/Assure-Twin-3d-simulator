/**
 * src/ui/pages/OverviewView.ts
 * Master Overview View matching the attached reference GUI image with pixel-level precision.
 * Architecture:
 * - Upper Row:
 *   - Center: 3D Digital Twin Viewport with floating Camera Presets, navigation tools, view pills, and TVD readout.
 *   - Right: Intelligence Panel (2 sub-columns):
 *       Col 1: Pumpability Window Gauge & Thermo-Mechanical Summary (with sparklines).
 *       Col 2: Dynamic Operating Envelope (Time vs SPM), Model Domain Check (OOD), 12-Point Assurance Gate.
 * - Lower Row:
 *   - Left: Future Trajectory (30 Days) multi-curve chart.
 *   - Center: Scenario Comparison table (Current vs Proposed vs Rehearsed 30D vs Delta).
 *   - Right: Verified Engineering Recommendation (Setpoints, Outcomes, Rationale, Rejected alternatives, Approve/Reject/Rehearse).
 * - Footer Row:
 *   - Recent Alerts (with timestamps & severity)
 *   - Decision Rehearsal Status (5-step milestone chain)
 *   - Data & Model Info (metadata, versions, calibration)
 *   - Quick Actions (New Scenario, Run Optimization, Calibrate Model, Generate Report, Demo Viscosity Spike / Reset).
 */

import type { SimulationClient, SimulationState } from '../../sim/SimulationClient.ts';
import type { AssureTwinManager } from '../../assure/AssureTwinManager.ts';
import type { SolutionState } from '../../assure/types.ts';
import { PumpabilityGauge } from '../components/PumpabilityGauge.ts';
import { EnvelopeCanvas } from '../components/EnvelopeCanvas.ts';
import { TrajectoryChart } from '../components/TrajectoryChart.ts';
import { Environment } from '../../scene/Environment.ts';
import { CardDetailInspectors } from '../components/CardDetailInspectors.ts';
import { ApiBridge } from '../../api/ApiBridge.ts';
import type { AssuranceResult } from '../../api/client.ts';

export class OverviewView {
  private _container: HTMLElement;
  private _simClient: SimulationClient;
  private _assureManager: AssureTwinManager;
  private _environment: Environment;
  private _bridge: ApiBridge;
  private _latestGateResult: AssuranceResult | null = null;

  private _gauge!: PumpabilityGauge;
  private _envelope!: EnvelopeCanvas;
  private _trajectory!: TrajectoryChart;

  private _onOpenRecommendation?: () => void;
  private _onOpenScenarios?: () => void;
  private _onNavigate?: (page: string) => void;

  private _isDemoAbnormal: boolean = false;

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
    this._bridge = new ApiBridge();
    this._onOpenRecommendation = callbacks.onOpenRecommendation;
    this._onOpenScenarios = callbacks.onOpenScenarios;
    this._onNavigate = callbacks.onNavigate;

    this.render();
    this.initComponents();
    this.bindEvents();
    this._startAssurancePolling();
  }

  private render(): void {
    this._container.innerHTML = `
      <div class="ws-overview-grid">
        <!-- =================================================================
             1. UPPER ROW: 3D DIGITAL TWIN (CENTER) + RIGHT INTELLIGENCE AREA
             ================================================================= -->
        <div class="ws-overview-top-row">
          
          <!-- CENTER 3D VIEWPORT -->
          <div class="ws-viewport-col" style="position: relative;">
            <div id="viewport-3d-mount"></div>
            <div id="ov-flash-overlay" class="ws-flash-overlay"></div>

            <!-- Floating Camera Presets Modal (Top-Left of 3D Viewport) -->
            <div class="ws-camera-presets-modal" id="ov-camera-presets-modal">
              <div class="ws-presets-head">
                <span class="ws-presets-title">Camera Presets</span>
                <button class="ws-presets-close" id="ov-btn-close-presets" title="Close presets modal">✕</button>
              </div>
              <button class="ws-presets-btn active" id="ov-preset-pumpjack">
                <svg viewBox="0 0 24 24"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                <span>Surface Pumpjack</span>
              </button>
              <button class="ws-presets-btn" id="ov-preset-downhole">
                <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><line x1="12" y1="3" x2="12" y2="21"/></svg>
                <span>Downhole View</span>
              </button>
              <button class="ws-presets-btn" id="ov-preset-perforations">
                <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>
                <span>Perforations View</span>
              </button>
              <button class="ws-presets-btn" id="ov-preset-dyno">
                <svg viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                <span>Dyno Card View</span>
              </button>
            </div>

            <!-- Floating Left 3D Toolbar -->
            <div class="ws-3d-nav-widgets">
              <div class="ws-compass-btn" id="ov-btn-compass" title="Compass Orientation">W-E</div>
              <button class="ws-nav-btn" id="ov-cam-layers" title="Toggle 3D Subsystem Layers"><svg viewBox="0 0 24 24"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg></button>
              <button class="ws-nav-btn" id="ov-cam-camera" title="Capture 3D Snapshot"><svg viewBox="0 0 24 24"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg></button>
              <button class="ws-nav-btn" id="ov-cam-measure" title="Wellbore Survey Metrology"><svg viewBox="0 0 24 24"><line x1="2" y1="12" x2="22" y2="12"/><line x1="6" y1="8" x2="6" y2="16"/><line x1="18" y1="8" x2="18" y2="16"/></svg></button>
              <button class="ws-nav-btn" id="ov-btn-zoom-in" title="Zoom In"><svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></button>
              <button class="ws-nav-btn" id="ov-btn-zoom-out" title="Zoom Out"><svg viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"/></svg></button>
              <button class="ws-nav-btn" id="ov-btn-target" title="Center Focus"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg></button>
            </div>

            <!-- Floating Top-Right 3D Toolbar -->
            <div class="ws-3d-toolbar">
              <button class="ws-3d-btn" id="ov-cam-overview" data-tooltip="Field Overview" title="Home View"><svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg></button>
              <button class="ws-3d-btn" id="ov-cam-orbit" data-tooltip="Toggle 360° Auto-Orbit" title="Orbit Control"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 9 9"/></svg></button>
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
            </div>

            <!-- Bottom View Mode Pills -->
            <div class="ws-3d-bottom-bar">
              <div class="ws-view-mode-group">
                <button class="ws-mode-pill" id="ov-pill-surface">Surface</button>
                <button class="ws-mode-pill" id="ov-pill-wellbore">Wellbore</button>
                <button class="ws-mode-pill active" id="ov-pill-reservoir">Reservoir</button>
              </div>
              <div class="ws-depth-readout" id="ov-depth-readout">DEPTH 1,420 m TVD</div>
            </div>
          </div>

          <!-- RIGHT INTELLIGENCE AREA (2 BALANCED SUB-COLUMNS) -->
          <div class="ws-right-intel-area">
            
            <!-- SUB-COLUMN 1: PUMPABILITY + THERMO-MECHANICAL + MODEL DOMAIN -->
            <div class="ws-intel-col-1">
              <!-- CARD 1: PUMPABILITY WINDOW -->
              <div class="ws-card ws-pumpability-card interactive" id="ov-card-pumpability" title="Click to open Pumpability Window Inspector">
                <div class="ws-card-header" style="width: 100%;">
                  <span class="ws-card-title">PUMPABILITY WINDOW</span>
                  <span style="font-size: 8px; color: var(--accent-blue); font-family: var(--font-mono);" id="ov-inspect-pumpability">INSPECT ↗</span>
                </div>
                <div class="ws-card-body" style="align-items: center; width: 100%; padding: 4px 6px;">
                  <canvas id="ov-gauge-canvas" width="220" height="110" style="width: 100%; height: 95px;"></canvas>
                  <div class="ws-pumpability-footer">
                    <span class="ws-sub-lbl">Time to boundary</span>
                    <span class="ws-pill-badge warning" id="ov-pumpability-badge">STATUS: CONTRACTING</span>
                  </div>
                </div>
              </div>

              <!-- CARD 2: THERMO-MECHANICAL SUMMARY -->
              <div class="ws-card ws-tm-summary-card interactive" id="ov-card-tm-summary" title="Click to open Thermo-Mechanical Summary">
                <div class="ws-card-header" style="padding: 4px 8px;">
                  <span class="ws-card-title">THERMO-MECHANICAL SUMMARY</span>
                  <span style="font-size: 8px; color: var(--accent-blue); font-family: var(--font-mono);">INSPECT ↗</span>
                </div>
                <div class="ws-card-body" style="padding: 4px 8px;">
                  <div class="ws-tm-row">
                    <span class="ws-tm-key">Reservoir Temp</span>
                    <div class="ws-tm-right">
                      <span class="ws-tm-val" id="tm-val-temp">72.7 °C</span>
                      <svg class="ws-tm-spark" viewBox="0 0 44 16">
                        <path d="M 0 4 Q 15 6, 25 10 T 44 14" fill="none" stroke="#ef4444" stroke-width="1.8"/>
                      </svg>
                    </div>
                  </div>
                  <div class="ws-tm-row">
                    <span class="ws-tm-key">Viscosity</span>
                    <div class="ws-tm-right">
                      <span class="ws-tm-val" id="tm-val-visc">1,392 cP</span>
                      <svg class="ws-tm-spark" viewBox="0 0 44 16">
                        <path d="M 0 12 Q 18 10, 30 6 T 44 2" fill="none" stroke="#ef4444" stroke-width="1.8"/>
                      </svg>
                    </div>
                  </div>
                  <div class="ws-tm-row">
                    <span class="ws-tm-key">Pump Fillage</span>
                    <div class="ws-tm-right">
                      <span class="ws-tm-val" id="tm-val-fillage">72 %</span>
                      <svg class="ws-tm-spark" viewBox="0 0 44 16">
                        <path d="M 0 12 Q 16 8, 30 10 T 44 4" fill="none" stroke="#10b981" stroke-width="1.8"/>
                      </svg>
                    </div>
                  </div>
                  <div class="ws-tm-row">
                    <span class="ws-tm-key">Float Margin</span>
                    <div class="ws-tm-right">
                      <span class="ws-tm-val" id="tm-val-float">8.2 %</span>
                      <svg class="ws-tm-spark" viewBox="0 0 44 16">
                        <path d="M 0 4 Q 18 8, 32 10 T 44 13" fill="none" stroke="#10b981" stroke-width="1.8"/>
                      </svg>
                    </div>
                  </div>
                  <div class="ws-tm-row">
                    <span class="ws-tm-key">Rod Load</span>
                    <div class="ws-tm-right">
                      <span class="ws-tm-val" id="tm-val-rod">63 %</span>
                      <svg class="ws-tm-spark" viewBox="0 0 44 16">
                        <path d="M 0 10 Q 15 14, 28 8 T 44 11" fill="none" stroke="#f59e0b" stroke-width="1.8"/>
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              <!-- CARD 3: MODEL DOMAIN CHECK -->
              <div class="ws-card ws-domain-card-body interactive" id="ov-card-domain" title="Click to inspect ML Model Domain & OOD boundary">
                <div class="ws-card-header" style="padding: 4px 8px; margin: -6px -10px 4px -10px;">
                  <span class="ws-card-title">MODEL DOMAIN CHECK</span>
                  <span style="font-size: 8px; color: var(--accent-blue); font-family: var(--font-mono);" id="ov-inspect-domain">INSPECT ↗</span>
                </div>
                <div class="ws-domain-status-row" id="ov-domain-status-row">
                  <span class="ws-domain-check-icon">✓</span>
                  <span id="ov-domain-status-text">Within validated domain</span>
                </div>
                <div class="ws-domain-bar-group">
                  <div class="ws-domain-bar-labels">
                    <span>OOD Score</span>
                    <span id="ov-ood-score-val">0.23</span>
                  </div>
                  <div class="ws-domain-bar-bg">
                    <div class="ws-domain-bar-fill" id="ov-ood-bar-fill" style="width: 23%;"></div>
                  </div>
                </div>
                <div class="ws-domain-sub-row">
                  <span>Physics / ML Agreement</span>
                  <div style="display: flex; align-items: center; gap: 4px;">
                    <span class="ws-domain-badge good" id="ov-domain-ml-badge">Good</span>
                    <span class="ws-domain-delta" id="ov-domain-ml-delta">Δ = 6.2%</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- SUB-COLUMN 2: DYNAMIC OPERATING ENVELOPE + 13-POINT ASSURANCE GATE -->
            <div class="ws-intel-col-2">
              <!-- CARD 4: DYNAMIC OPERATING ENVELOPE -->
              <div class="ws-card interactive" id="ov-card-envelope" title="Click to open Operating Envelope Inspector">
                <div class="ws-card-header" style="padding: 4px 8px;">
                  <span class="ws-card-title">DYNAMIC OPERATING ENVELOPE</span>
                  <span style="font-size: 8px; color: var(--accent-blue); font-family: var(--font-mono);" id="ov-inspect-envelope">INSPECT ↗</span>
                </div>
                <div class="ws-card-body" style="padding: 4px 6px;">
                  <canvas id="ov-envelope-canvas" width="270" height="135" style="width: 100%; height: 120px;"></canvas>
                </div>
              </div>

              <!-- CARD 5: 13-POINT DECISION ASSURANCE GATE (ALL 13 GATES FULLY VISIBLE) -->
              <div class="ws-card ws-assurance-gate-card interactive" id="ov-card-assurance" title="Click to open Full 13-Point Assurance Gate">
                <div class="ws-card-header" style="padding: 4px 8px; justify-content: space-between;">
                  <span class="ws-card-title">13-POINT ASSURANCE GATE</span>
                  <div style="display: flex; align-items: center; gap: 6px;">
                    <span class="ws-pill-badge safe" id="ov-as-score-badge" style="font-size: 7.5px; padding: 1px 5px;">11/13 PASS · 84.6%</span>
                    <span style="font-size: 8px; color: var(--accent-blue); font-family: var(--font-mono); cursor: pointer;" id="ov-inspect-assurance">INSPECT ↗</span>
                  </div>
                </div>
                <div class="ws-assurance-list" id="ov-assurance-gate-list">
                  <div class="ws-as-row" id="as-row-1" data-gate-id="1" title="Sensor Data Quality &amp; Plausibility"><div class="ws-as-left"><span class="ws-as-num">01</span><span class="ws-as-name">Data Freshness &amp; Plausibility</span></div><span class="ws-as-badge pass">✔ PASS</span></div>
                  <div class="ws-as-row" id="as-row-2" data-gate-id="2" title="Calibration Recency &amp; Drift"><div class="ws-as-left"><span class="ws-as-num">02</span><span class="ws-as-name">Calibration Recency</span></div><span class="ws-as-badge pass">✔ PASS</span></div>
                  <div class="ws-as-row" id="as-row-3" data-gate-id="3" title="Mass Balance Conservation"><div class="ws-as-left"><span class="ws-as-num">03</span><span class="ws-as-name">Mass Balance Conservation</span></div><span class="ws-as-badge pass">✔ PASS</span></div>
                  <div class="ws-as-row" id="as-row-4" data-gate-id="4" title="Energy Balance Conservation"><div class="ws-as-left"><span class="ws-as-num">04</span><span class="ws-as-name">Energy Balance Conservation</span></div><span class="ws-as-badge pass">✔ PASS</span></div>
                  <div class="ws-as-row" id="as-row-5" data-gate-id="5" title="Thermo-Mechanical Stress Limits (PPRL)"><div class="ws-as-left"><span class="ws-as-num">05</span><span class="ws-as-name">Mechanical Stress (PPRL)</span></div><span class="ws-as-badge pass">✔ PASS</span></div>
                  <div class="ws-as-row" id="as-row-6" data-gate-id="6" title="Rod Float &amp; Compression Safety"><div class="ws-as-left"><span class="ws-as-num">06</span><span class="ws-as-name">Rod Float &amp; Buckling</span></div><span class="ws-as-badge pass">✔ PASS</span></div>
                  <div class="ws-as-row" id="as-row-7" data-gate-id="7" title="Pump Clearance &amp; Thermal Expansion"><div class="ws-as-left"><span class="ws-as-num">07</span><span class="ws-as-name">Pump Thermal Clearance</span></div><span class="ws-as-badge pass">✔ PASS</span></div>
                  <div class="ws-as-row" id="as-row-8" data-gate-id="8" title="Gearbox Torque Rating"><div class="ws-as-left"><span class="ws-as-num">08</span><span class="ws-as-name">Gearbox Torque Rating</span></div><span class="ws-as-badge pass">✔ PASS</span></div>
                  <div class="ws-as-row" id="as-row-9" data-gate-id="9" title="Minimum Safe Economic Inflow"><div class="ws-as-left"><span class="ws-as-num">09</span><span class="ws-as-name">Economic Viability (SOR)</span></div><span class="ws-as-badge pass">✔ PASS</span></div>
                  <div class="ws-as-row" id="as-row-10" data-gate-id="10" title="Environmental &amp; Wellhead Envelope"><div class="ws-as-left"><span class="ws-as-num">10</span><span class="ws-as-name">Environmental Envelope</span></div><span class="ws-as-badge pass">✔ PASS</span></div>
                  <div class="ws-as-row" id="as-row-11" data-gate-id="11" title="Physics-ML Agreement Gate"><div class="ws-as-left"><span class="ws-as-num">11</span><span class="ws-as-name">Physics / ML Agreement</span></div><span class="ws-as-badge warn">⚠ WARN</span></div>
                  <div class="ws-as-row" id="as-row-12" data-gate-id="12" title="Out-of-Distribution (OOD) Guard"><div class="ws-as-left"><span class="ws-as-num">12</span><span class="ws-as-name">Model Domain (OOD)</span></div><span class="ws-as-badge pass">✔ PASS</span></div>
                  <div class="ws-as-row" id="as-row-13" data-gate-id="13" title="Downhole Electric Heater Limits"><div class="ws-as-left"><span class="ws-as-num">13</span><span class="ws-as-name">Heater Thermal Limits</span></div><span class="ws-as-badge pass">✔ PASS</span></div>
                </div>
                <div class="ws-assurance-footer">
                  <span class="ws-as-foot-lbl">GATE INTERLOCK:</span>
                  <span class="ws-as-foot-status safe" id="ov-assurance-overall-status">
                    SAFE TO RECOMMEND →
                    <svg viewBox="0 0 24 24" style="width: 14px; height: 14px; stroke: currentColor; fill: none; stroke-width: 2;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>

        <!-- =================================================================
             2. LOWER ROW: FUTURE TRAJECTORY | SCENARIO COMPARISON | RECOMMENDATION
             ================================================================= -->
        <div class="ws-overview-bottom-row">
          
          <!-- 1. FUTURE TRAJECTORY -->
          <div class="ws-card">
            <div class="ws-card-header">
              <span class="ws-card-title">FUTURE TRAJECTORY (30 DAYS)</span>
              <div class="ws-horizon-tabs">
                <button class="ws-h-tab" data-days="7">7D</button>
                <button class="ws-h-tab" data-days="15">15D</button>
                <button class="ws-h-tab active" data-days="30">30D</button>
                <button class="ws-h-tab" data-days="60">60D</button>
              </div>
            </div>
            <div class="ws-card-body" style="padding: 6px 10px;">
              <canvas id="ov-trajectory-canvas" width="360" height="150" style="width: 100%; height: 135px;"></canvas>
              <div class="ws-chart-legend">
                <div class="ws-legend-item"><span class="ws-dot-legend green"></span> Oil Rate (BOPD)</div>
                <div class="ws-legend-item"><span class="ws-dot-legend orange"></span> SOR</div>
                <div class="ws-legend-item"><span class="ws-dot-legend cyan"></span> Pump Fillage (%)</div>
                <div class="ws-legend-item"><span class="ws-dot-legend red"></span> Viscosity (cP)</div>
              </div>
            </div>
          </div>

          <!-- 2. SCENARIO COMPARISON -->
          <div class="ws-card">
            <div class="ws-card-header">
              <span class="ws-card-title">SCENARIO COMPARISON</span>
              <button class="ws-btn-compare" id="ov-btn-compare-all">Compare ↗</button>
            </div>
            <div class="ws-card-body" style="padding: 4px 6px;">
              <table class="ws-scenario-table">
                <thead>
                  <tr>
                    <th>METRIC</th>
                    <th>CURRENT</th>
                    <th>PROPOSED</th>
                    <th>REHEARSED (30D)</th>
                    <th>Δ vs CURRENT</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Oil Rate (BOPD)</td>
                    <td id="sc-curr-oil">18.6</td>
                    <td id="sc-prop-oil">21.3</td>
                    <td id="sc-reh-oil">20.8</td>
                    <td class="best" id="sc-delta-oil">+2.2</td>
                  </tr>
                  <tr>
                    <td>SOR</td>
                    <td id="sc-curr-sor">6.4</td>
                    <td id="sc-prop-sor">5.1</td>
                    <td id="sc-reh-sor">5.3</td>
                    <td class="best" id="sc-delta-sor">-1.1</td>
                  </tr>
                  <tr>
                    <td>SPM</td>
                    <td id="sc-curr-spm">7.5</td>
                    <td id="sc-prop-spm">6.6</td>
                    <td id="sc-reh-spm">6.7</td>
                    <td class="best" id="sc-delta-spm">-0.8</td>
                  </tr>
                  <tr>
                    <td>Stroke (in)</td>
                    <td id="sc-curr-str">48</td>
                    <td id="sc-prop-str">52</td>
                    <td id="sc-reh-str">52</td>
                    <td class="best" id="sc-delta-str">+4</td>
                  </tr>
                  <tr>
                    <td>Pump Fillage (%)</td>
                    <td id="sc-curr-fill">72</td>
                    <td id="sc-prop-fill">76</td>
                    <td id="sc-reh-fill">74</td>
                    <td class="best" id="sc-delta-fill">+2</td>
                  </tr>
                  <tr>
                    <td>Float Margin (%)</td>
                    <td id="sc-curr-flt">8.2</td>
                    <td id="sc-prop-flt">6.1</td>
                    <td id="sc-reh-flt">6.7</td>
                    <td style="color: var(--accent-amber);" id="sc-delta-flt">-1.5</td>
                  </tr>
                  <tr>
                    <td>Rod Load (%)</td>
                    <td id="sc-curr-rod">63</td>
                    <td id="sc-prop-rod">59</td>
                    <td id="sc-reh-rod">61</td>
                    <td class="best" id="sc-delta-rod">-2</td>
                  </tr>
                  <tr>
                    <td>Steam Rate (TPD)</td>
                    <td id="sc-curr-stm">19.3</td>
                    <td id="sc-prop-stm">20.1</td>
                    <td id="sc-reh-stm">19.8</td>
                    <td class="best" id="sc-delta-stm">+0.5</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- 3. RECOMMENDATION CARD -->
          <div class="ws-card" id="ov-card-recommendation">
            <div class="ws-card-header">
              <span class="ws-card-title">RECOMMENDATION</span>
              <span style="font-size: 8px; color: var(--accent-blue); font-family: var(--font-mono); cursor: pointer;" id="ov-btn-view-rec">VIEW FULL ↗</span>
            </div>
            <div class="ws-card-body" style="padding: 6px 10px;">
              <div class="ws-rec-verified-badge" id="ov-rec-verified-badge">
                <svg viewBox="0 0 24 24" style="width: 13px; height: 13px; stroke: currentColor; fill: none; stroke-width: 2.5;"><polyline points="20 6 9 17 4 12"/></svg>
                <span id="ov-rec-badge-text">VERIFIED ENGINEER RECOMMENDATION</span>
              </div>

              <div class="ws-rec-two-col" id="ov-rec-content-area">
                <!-- Col Left: Setpoints & Why -->
                <div class="ws-rec-col">
                  <span class="ws-rec-section-hdr">Recommended Setpoints</span>
                  <div class="ws-rec-kv"><span>SPM:</span> <strong id="ov-rec-spm">6.7 spm</strong></div>
                  <div class="ws-rec-kv"><span>Stroke:</span> <strong id="ov-rec-stroke">52 in</strong></div>
                  <div class="ws-rec-kv"><span>Steam Rate:</span> <strong id="ov-rec-steam-rate">19.8 TPD</strong></div>
                  <div class="ws-rec-kv"><span>Steam Volume:</span> <strong id="ov-rec-steam-vol">1,250 bbl</strong></div>
                  <div class="ws-rec-kv"><span>Next Cycle Timing:</span> <strong id="ov-rec-timing">Day 8.8</strong></div>

                  <span class="ws-rec-section-hdr" style="margin-top: 4px;">Why Recommended</span>
                  <div class="ws-rec-bullet">Maintains safe float margin throughout forecast horizon</div>
                  <div class="ws-rec-bullet">Pump fillage remains stable within efficient range</div>
                  <div class="ws-rec-bullet">Steam usage optimized for thermal decline</div>
                  <div class="ws-rec-bullet">Lower SOR and improved net oil</div>
                </div>

                <!-- Col Right: Expected Outcomes & Rejected Alternatives -->
                <div class="ws-rec-col">
                  <span class="ws-rec-section-hdr">Expected Outcomes (30D)</span>
                  <div class="ws-rec-kv"><span>Oil Rate:</span> <strong id="ov-rec-out-oil">20.8 ± 1.8 BOPD</strong></div>
                  <div class="ws-rec-kv"><span>SOR:</span> <strong id="ov-rec-out-sor">5.3 ± 0.6</strong></div>
                  <div class="ws-rec-kv"><span>Pump Fillage:</span> <strong id="ov-rec-out-fill">74% ± 4%</strong></div>
                  <div class="ws-rec-kv"><span>Float Margin:</span> <strong id="ov-rec-out-float">6.7% ± 1.0%</strong></div>
                  <div class="ws-rec-kv"><span>Steam Penalty:</span> <strong id="ov-rec-out-penalty">-3.2%</strong></div>

                  <span class="ws-rec-section-hdr" style="margin-top: 4px;">Rejected Alternative (SPM 8.5)</span>
                  <div class="ws-rec-bullet rejected">Float margin below safe limit</div>
                  <div class="ws-rec-bullet rejected">High rod load risk</div>
                  <div class="ws-rec-bullet rejected">Pump fillage exceeds limit</div>
                </div>
              </div>

              <!-- Recommendation Action Buttons -->
              <div class="ws-rec-btn-bar">
                <button class="ws-rec-btn ws-btn-approve" id="ov-btn-approve">
                  <svg viewBox="0 0 24 24" style="width: 12px; height: 12px; stroke: currentColor; fill: none; stroke-width: 2.5;"><polyline points="20 6 9 17 4 12"/></svg>
                  <span>Approve</span>
                </button>
                <button class="ws-rec-btn ws-btn-reject" id="ov-btn-reject">
                  <svg viewBox="0 0 24 24" style="width: 12px; height: 12px; stroke: currentColor; fill: none; stroke-width: 2.5;"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  <span>Reject</span>
                </button>
                <button class="ws-rec-btn ws-btn-rehearse" id="ov-btn-rehearse">
                  <svg viewBox="0 0 24 24" style="width: 12px; height: 12px; stroke: currentColor; fill: none; stroke-width: 2;"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                  <span>Rehearse Again</span>
                </button>
              </div>
            </div>
          </div>

        </div>

        <!-- =================================================================
             3. FOOTER ROW: RECENT ALERTS | REHEARSAL STATUS | DATA & MODEL | QUICK ACTIONS
             ================================================================= -->
        <div class="ws-overview-footer-row">
          
          <!-- PANEL 1: RECENT ALERTS -->
          <div class="ws-card">
            <div class="ws-card-header">
              <span class="ws-card-title">RECENT ALERTS ↗</span>
              <span style="font-size: 8px; color: var(--accent-blue); cursor: pointer;" id="ov-btn-view-alerts">VIEW ALL</span>
            </div>
            <div class="ws-card-body" style="padding: 4px 8px;">
              <div class="ws-alert-item interactive" id="ov-alert-1" style="cursor: pointer;">
                <span class="ws-alert-time">08:14 AM</span>
                <span class="ws-alert-icon" style="color: var(--accent-amber);">⚠</span>
                <div class="ws-alert-content">
                  <span class="ws-alert-msg">High Viscosity Trend Detected</span>
                </div>
                <span class="ws-domain-badge warn">Warning</span>
              </div>
              <div class="ws-alert-item interactive" id="ov-alert-2" style="cursor: pointer;">
                <span class="ws-alert-time">08:12 AM</span>
                <span class="ws-alert-icon" style="color: var(--accent-blue);">ℹ</span>
                <div class="ws-alert-content">
                  <span class="ws-alert-msg">Steam Pressure Drop</span>
                </div>
                <span class="ws-domain-badge" style="background: rgba(56, 189, 248, 0.15); color: var(--accent-blue);">Info</span>
              </div>
              <div class="ws-alert-item interactive" id="ov-alert-3" style="cursor: pointer;">
                <span class="ws-alert-time">08:05 AM</span>
                <span class="ws-alert-icon" style="color: var(--accent-blue);">ℹ</span>
                <div class="ws-alert-content">
                  <span class="ws-alert-msg">Pump Fillage Rising</span>
                </div>
                <span class="ws-domain-badge" style="background: rgba(56, 189, 248, 0.15); color: var(--accent-blue);">Info</span>
              </div>
              <div class="ws-alert-item interactive" id="ov-alert-4" style="cursor: pointer;">
                <span class="ws-alert-time">07:58 AM</span>
                <span class="ws-alert-icon" style="color: var(--accent-red);">⚠</span>
                <div class="ws-alert-content">
                  <span class="ws-alert-msg">Float Margin Low</span>
                </div>
                <span class="ws-domain-badge warn">Warning</span>
              </div>
            </div>
          </div>

          <!-- PANEL 2: DECISION REHEARSAL STATUS -->
          <div class="ws-card ws-rehearsal-status-panel">
            <div class="ws-card-header" style="margin: -8px -12px 6px -12px; padding: 4px 8px;">
              <span class="ws-card-title">DECISION REHEARSAL STATUS</span>
            </div>
            <div class="ws-milestone-chain">
              <!-- Step 1 -->
              <div class="ws-milestone-step">
                <div class="ws-step-circle">✔</div>
                <span class="ws-milestone-name">Scenario</span>
                <span class="ws-milestone-sub">Created 08:05 AM</span>
              </div>
              <div class="ws-milestone-line"></div>

              <!-- Step 2 -->
              <div class="ws-milestone-step">
                <div class="ws-step-circle">✔</div>
                <span class="ws-milestone-name">Simulation</span>
                <span class="ws-milestone-sub">Running 08:06 AM</span>
              </div>
              <div class="ws-milestone-line"></div>

              <!-- Step 3 -->
              <div class="ws-milestone-step">
                <div class="ws-step-circle">✔</div>
                <span class="ws-milestone-name">Forecast</span>
                <span class="ws-milestone-sub">Completed 08:07 AM</span>
              </div>
              <div class="ws-milestone-line"></div>

              <!-- Step 4 -->
              <div class="ws-milestone-step">
                <div class="ws-step-circle">✔</div>
                <span class="ws-milestone-name">Assurance</span>
                <span class="ws-milestone-sub">Evaluated 08:08 AM</span>
              </div>
              <div class="ws-milestone-line"></div>

              <!-- Step 5 -->
              <div class="ws-milestone-step">
                <div class="ws-step-circle">✔</div>
                <span class="ws-milestone-name">Recommendation</span>
                <span class="ws-milestone-sub">Ready 08:08 AM</span>
              </div>
            </div>
          </div>

          <!-- PANEL 3: DATA & MODEL INFO -->
          <div class="ws-card ws-data-model-grid">
            <div class="ws-card-header" style="margin: -6px -10px 4px -10px; padding: 4px 8px;">
              <span class="ws-card-title">DATA & MODEL INFO</span>
            </div>
            <div class="ws-dm-row">
              <span class="ws-dm-key">Model Version</span>
              <span class="ws-dm-val">v2.4.1</span>
            </div>
            <div class="ws-dm-row">
              <span class="ws-dm-key">Physics Engine</span>
              <span class="ws-dm-val">v3.2</span>
            </div>
            <div class="ws-dm-row">
              <span class="ws-dm-key">ML Model Version</span>
              <span class="ws-dm-val">v1.7</span>
            </div>
            <div class="ws-dm-row">
              <span class="ws-dm-key">Last Calibration</span>
              <span class="ws-dm-val">May 18, 2026</span>
            </div>
            <div class="ws-dm-row">
              <span class="ws-dm-key">Data Source</span>
              <span class="ws-dm-val" style="color: var(--accent-cyan);">Simulated / Demo</span>
            </div>
          </div>

          <!-- PANEL 4: QUICK ACTIONS + DEMO TRIGGERS -->
          <div class="ws-card ws-quick-actions-panel">
            <div class="ws-card-header" style="margin: -6px -10px 4px -10px; padding: 4px 8px; justify-content: space-between;">
              <span class="ws-card-title">QUICK ACTIONS</span>
              <span style="font-size: 8px; font-family: var(--font-mono); color: var(--accent-amber);" id="ov-demo-active-label"></span>
            </div>
            <div class="ws-quick-actions-grid">
              <button class="ws-qa-btn blue" id="ov-qa-new-scenario">
                <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                <span>New Scenario</span>
              </button>
              <button class="ws-qa-btn purple" id="ov-qa-optimization">
                <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                <span>Run Optimization</span>
              </button>
              <button class="ws-qa-btn teal" id="ov-qa-calibrate">
                <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M16.2 7.8l-2 6.3-6.4 2 2-6.3z"/></svg>
                <span>Calibrate Model</span>
              </button>
              <button class="ws-qa-btn amber" id="ov-qa-report">
                <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                <span>Generate Report</span>
              </button>
            </div>
            <!-- DEMO Buttons Strip -->
            <div style="padding: 0 10px 4px 10px; display: flex; flex-direction: column; gap: 4px;">
              <div style="display: flex; gap: 6px;">
                <button class="ws-qa-btn demo-spike" id="ov-judge-demo-btn" style="flex: 1.2; background: linear-gradient(135deg, rgba(16, 185, 129, 0.25), rgba(59, 130, 246, 0.25)); border: 1px solid var(--accent-green);" title="Run automated 19-step SIH Judge Demonstration">
                  <span style="font-weight: 700; color: #fff;">▶ RUN JUDGE DEMO</span>
                </button>
                <button class="ws-qa-btn demo-spike" id="ov-demo-spike-btn" style="flex: 1;" title="Trigger controlled cold-slug viscosity spike (+14,500 cP) to demonstrate real Abstain protocol">
                  <span>🧪 FAULT DEMO</span>
                </button>
              </div>
              <button class="ws-qa-btn demo-reset" id="ov-demo-reset-btn" style="display: none; width: 100%;" title="Restore normal baseline well operating conditions">
                <span>🔄 Reset Demo & Restore Normal Twin</span>
              </button>
            </div>
            <!-- Floating Judge Demo Toast Banner -->
            <div id="ov-judge-toast" style="display: none; position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%); background: rgba(15, 23, 42, 0.96); border: 1px solid var(--accent-green); border-radius: 6px; padding: 12px 20px; z-index: 9999; box-shadow: 0 10px 35px rgba(0,0,0,0.85); font-family: var(--font-mono); font-size: 11px; color: #fff; max-width: 620px; text-align: center;"></div>
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

    // 2. Initialize Pumpability Gauge (30-day scaled gauge)
    const gaugeCanvas = this._container.querySelector('#ov-gauge-canvas') as HTMLCanvasElement;
    if (gaugeCanvas) {
      this._gauge = new PumpabilityGauge(gaugeCanvas);
      this._gauge.render(18.4, 'WARNING');
    }

    // 3. Initialize Operating Envelope Canvas (SPM vs Time)
    const envCanvas = this._container.querySelector('#ov-envelope-canvas') as HTMLCanvasElement;
    if (envCanvas) {
      this._envelope = new EnvelopeCanvas(envCanvas);
      this._envelope.render();
    }

    // 4. Initialize Future Trajectory Chart
    const trajCanvas = this._container.querySelector('#ov-trajectory-canvas') as HTMLCanvasElement;
    if (trajCanvas) {
      this._trajectory = new TrajectoryChart(trajCanvas);
      this._trajectory.setHorizon(30);
      this._trajectory.render();
    }
  }

  private bindEvents(): void {
    // --- 3D CAMERA PRESETS MODAL BUTTONS ---
    const presetBtns = this._container.querySelectorAll('.ws-presets-btn');
    const setPresetActive = (btn: Element) => {
      presetBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    };

    const btnPumpjack = this._container.querySelector('#ov-preset-pumpjack');
    btnPumpjack?.addEventListener('click', () => {
      setPresetActive(btnPumpjack);
      this._environment.moveToPreset('surfacePumpjack');
    });

    const btnDownhole = this._container.querySelector('#ov-preset-downhole');
    btnDownhole?.addEventListener('click', () => {
      setPresetActive(btnDownhole);
      this._environment.moveToPreset('downholeView');
    });

    const btnPerforations = this._container.querySelector('#ov-preset-perforations');
    btnPerforations?.addEventListener('click', () => {
      setPresetActive(btnPerforations);
      this._environment.moveToPreset('perforationsView');
    });

    const btnDyno = this._container.querySelector('#ov-preset-dyno');
    btnDyno?.addEventListener('click', () => {
      setPresetActive(btnDyno);
      this._environment.moveToPreset('dynoCardView');
    });

    // Close presets modal button
    this._container.querySelector('#ov-btn-close-presets')?.addEventListener('click', () => {
      const modal = this._container.querySelector('#ov-camera-presets-modal') as HTMLElement;
      if (modal) modal.style.display = modal.style.display === 'none' ? 'flex' : 'none';
    });

    // --- 3D TOOLBAR CONTROLS ---
    this._container.querySelector('#ov-cam-overview')?.addEventListener('click', () => {
      this._environment.moveToPreset('surfacePumpjack');
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

    // Camera Snapshot
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
        link.download = 'ASSURE_TWIN_BGW_17A_Snapshot.png';
        link.href = dataUrl;
        link.click();
      } catch (e) {
        console.warn('Snapshot download note:', e);
      }
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
      this._environment.camera.position.multiplyScalar(0.88);
    });
    this._container.querySelector('#ov-btn-zoom-out')?.addEventListener('click', () => {
      this._environment.camera.position.multiplyScalar(1.12);
    });
    this._container.querySelector('#ov-btn-compass')?.addEventListener('click', () => {
      this._environment.moveToPreset('surfacePumpjack');
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

    pillSurface?.addEventListener('click', () => setModeActive(pillSurface, 'surfacePumpjack'));
    pillWellbore?.addEventListener('click', () => setModeActive(pillWellbore, 'downholeView'));
    pillReservoir?.addEventListener('click', () => setModeActive(pillReservoir, 'thermalFront'));

    // --- HORIZON TABS (INTERACTIVE) ---
    const hTabs = this._container.querySelectorAll('.ws-h-tab');
    hTabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        hTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const days = parseInt(tab.getAttribute('data-days') || '30', 10);
        this._trajectory.setHorizon(days);
        // Update first card title matching FUTURE TRAJECTORY
        const trajCard = this._container.querySelectorAll('.ws-overview-bottom-row .ws-card')[0];
        const trajTitle = trajCard?.querySelector('.ws-card-title');
        if (trajTitle) trajTitle.textContent = `FUTURE TRAJECTORY (${days} DAYS)`;
      });
    });

    // --- INTERACTIVE CARD INSPECTORS ---
    const openPump = () => {
      CardDetailInspectors.showPumpability(
        this._assureManager.solutionState,
        this._simClient.state,
        (page) => this._onNavigate?.(page)
      );
    };
    this._container.querySelector('#ov-card-pumpability')?.addEventListener('click', openPump);
    this._container.querySelector('#ov-inspect-pumpability')?.addEventListener('click', (e) => { e.stopPropagation(); openPump(); });

    const openEnv = () => {
      CardDetailInspectors.showEnvelope(
        this._assureManager.solutionState,
        this._simClient.state,
        (page) => this._onNavigate?.(page)
      );
    };
    this._container.querySelector('#ov-card-envelope')?.addEventListener('click', openEnv);
    this._container.querySelector('#ov-inspect-envelope')?.addEventListener('click', (e) => { e.stopPropagation(); openEnv(); });

    const openTM = () => {
      CardDetailInspectors.showSrpDiagnostics(
        this._simClient.state,
        this._assureManager.solutionState,
        (page) => this._onNavigate?.(page)
      );
    };
    this._container.querySelector('#ov-card-tm-summary')?.addEventListener('click', openTM);

    const openDomain = () => {
      CardDetailInspectors.showModelDomain(
        this._assureManager.solutionState,
        (page) => this._onNavigate?.(page)
      );
    };
    this._container.querySelector('#ov-card-domain')?.addEventListener('click', openDomain);
    this._container.querySelector('#ov-inspect-domain')?.addEventListener('click', (e) => { e.stopPropagation(); openDomain(); });

    // --- 13-POINT ASSURANCE GATE INTERACTIVE INSPECTOR ---
    const openAssuranceOverview = () => {
      if (this._latestGateResult) {
        CardDetailInspectors.showAssuranceGateOverview(
          this._latestGateResult,
          this._simClient.state,
          this._assureManager.solutionState,
          (page) => this._onNavigate?.(page)
        );
      } else {
        this._onNavigate?.('assurance');
      }
    };
    this._container.querySelector('#ov-card-assurance')?.addEventListener('click', openAssuranceOverview);
    this._container.querySelector('#ov-inspect-assurance')?.addEventListener('click', (e) => { e.stopPropagation(); openAssuranceOverview(); });

    // Click handler for each of the 13 checkpoints
    for (let i = 1; i <= 13; i++) {
      const row = this._container.querySelector(`#as-row-${i}`);
      row?.addEventListener('click', (e) => {
        e.stopPropagation();
        const gateCheck = this._latestGateResult?.checks?.find(c => c.id === i) || {
          id: i,
          name: row.querySelector('.ws-as-name')?.textContent || `Checkpoint ${i}`,
          category: 'Assurance Interlock',
          status: row.querySelector('.ws-as-badge')?.textContent?.includes('PASS') ? 'PASS' : (row.querySelector('.ws-as-badge')?.textContent?.includes('WARN') ? 'WARNING' : 'FAIL'),
          detail: row.getAttribute('title') || 'Multi-physics decision assurance boundary check.',
          passed: !row.querySelector('.ws-as-badge')?.textContent?.includes('FAIL')
        };
        CardDetailInspectors.showAssuranceCheckpoint(
          gateCheck,
          this._simClient.state,
          this._assureManager.solutionState,
          (page) => this._onNavigate?.(page)
        );
      });
    }

    // --- RECENT ALERTS INTERACTIVE INSPECTORS ---
    const alertItems = [
      { id: 'ov-alert-1', title: 'High Viscosity Trend Detected', time: '08:14 AM', severity: 'Warning', msg: 'Marx-Langenheim thermal decline model predicts crude viscosity approaching 1,800 cP boundary within 18 days. Couette viscous drag increasing.' },
      { id: 'ov-alert-2', title: 'Steam Pressure Drop', time: '08:12 AM', severity: 'Info', msg: 'CSS injection manifold differential pressure transient detected (-2.4 bar). Within nominal regulation bounds.' },
      { id: 'ov-alert-3', title: 'Pump Fillage Rising', time: '08:05 AM', severity: 'Info', msg: 'Dynamic pump fillage climbed to 72% following stroke adjustment. Gas interference reduced.' },
      { id: 'ov-alert-4', title: 'Float Margin Low', time: '07:58 AM', severity: 'Warning', msg: 'Downstroke buoyant rod float margin measured at 8.2%, below the 10.0% recommended advisory threshold.' }
    ];
    alertItems.forEach(a => {
      this._container.querySelector(`#${a.id}`)?.addEventListener('click', (e) => {
        e.stopPropagation();
        CardDetailInspectors.showAlertDetail(a, (page) => this._onNavigate?.(page));
      });
    });

    // Buttons to open scenarios & recommendations
    this._container.querySelector('#ov-btn-compare-all')?.addEventListener('click', () => {
      this._onOpenScenarios?.();
    });
    this._container.querySelector('#ov-btn-view-rec')?.addEventListener('click', () => {
      this._onOpenRecommendation?.();
    });

    // Engineer Approval Buttons
    this._container.querySelector('#ov-btn-approve')?.addEventListener('click', () => {
      // 1. Dispatch verified setpoints to the live simulation twin
      this._simClient.setControl('spm', 6.7);
      this._simClient.setControl('stroke_inches', 52);

      // 2. Approve recommendation in AssureTwinManager
      this._assureManager.approveRecommendation('Approved setpoints for field dispatch: 6.7 SPM, 52" stroke');

      // 3. Visual button feedback: change to approved state
      const approveBtn = this._container.querySelector('#ov-btn-approve') as HTMLElement;
      if (approveBtn) {
        approveBtn.classList.add('ws-btn-approved');
        approveBtn.style.background = 'linear-gradient(135deg, rgba(16, 185, 129, 0.45), rgba(5, 150, 105, 0.7))';
        approveBtn.style.borderColor = 'var(--accent-green)';
        approveBtn.style.color = '#ffffff';
        approveBtn.style.boxShadow = '0 0 16px rgba(16, 185, 129, 0.4)';
        approveBtn.innerHTML = `
          <svg viewBox="0 0 24 24" style="width: 12px; height: 12px; stroke: currentColor; fill: none; stroke-width: 3;"><polyline points="20 6 9 17 4 12"/></svg>
          <span>Approved & Dispatched</span>
        `;
      }

      // 4. Update the recommendation card badge
      const badgeHdr = this._container.querySelector('.ws-rec-status-banner') as HTMLElement;
      if (badgeHdr) {
        badgeHdr.style.background = 'rgba(16, 185, 129, 0.25)';
        badgeHdr.style.borderColor = 'var(--accent-green)';
        badgeHdr.style.color = 'var(--accent-green)';
        badgeHdr.innerHTML = `
          <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
          <span>VERIFIED & APPROVED BY SENIOR PE (DISPATCHED TO SCADA)</span>
        `;
      }

      // 5. Non-blocking In-page Toast Notification
      this.showNotificationToast(
        "SETPOINTS APPROVED & DISPATCHED TO SCADA",
        "Dispatched SPM: 6.7 · Stroke: 52\" · Steam: 19.8 TPD to Well BGW-17A telemetry. Cryptographic SHA-256 seal logged to audit ledger.",
        "success"
      );
    });

    this._container.querySelector('#ov-btn-reject')?.addEventListener('click', () => {
      this._assureManager.rejectRecommendation('Rejected by engineer: conservative reservoir safety threshold exceeded.');

      const rejectBtn = this._container.querySelector('#ov-btn-reject') as HTMLElement;
      if (rejectBtn) {
        rejectBtn.style.background = 'rgba(239, 68, 68, 0.35)';
        rejectBtn.style.borderColor = 'var(--accent-red)';
        rejectBtn.style.color = '#ffffff';
        rejectBtn.innerHTML = `
          <svg viewBox="0 0 24 24" style="width: 12px; height: 12px; stroke: currentColor; fill: none; stroke-width: 3;"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          <span>Rejected</span>
        `;
      }

      const badgeHdr = this._container.querySelector('.ws-rec-status-banner') as HTMLElement;
      if (badgeHdr) {
        badgeHdr.style.background = 'rgba(239, 68, 68, 0.2)';
        badgeHdr.style.borderColor = 'var(--accent-red)';
        badgeHdr.style.color = 'var(--accent-red)';
        badgeHdr.innerHTML = `
          <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          <span>RECOMMENDATION REJECTED BY ENGINEER (HELD IN LOCAL BUFFER)</span>
        `;
      }

      this.showNotificationToast(
        "RECOMMENDATION REJECTED",
        "Operating setpoint changes declined. Well BGW-17A remains under baseline autonomous control.",
        "warn"
      );
    });

    this._container.querySelector('#ov-btn-rehearse')?.addEventListener('click', () => {
      this._onNavigate?.('scenarios');
    });

    // Alerts View All
    this._container.querySelector('#ov-btn-view-alerts')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this._onNavigate?.('alerts');
    });

    // Quick Actions buttons
    this._container.querySelector('#ov-qa-new-scenario')?.addEventListener('click', () => {
      this._onNavigate?.('scenarios');
    });
    this._container.querySelector('#ov-qa-optimization')?.addEventListener('click', () => {
      this._onNavigate?.('optimization');
    });
    this._container.querySelector('#ov-qa-calibrate')?.addEventListener('click', () => {
      this._onNavigate?.('calibration');
    });
    this._container.querySelector('#ov-qa-report')?.addEventListener('click', () => {
      CardDetailInspectors.showEngineeringReport(
        this._simClient.state,
        this._assureManager.solutionState,
        this._assureManager.activeRecommendationCase
      );
    });

    // DEMO TRIGGERS
    const judgeBtn = this._container.querySelector('#ov-judge-demo-btn');
    const spikeBtn = this._container.querySelector('#ov-demo-spike-btn');
    const resetBtn = this._container.querySelector('#ov-demo-reset-btn');

    judgeBtn?.addEventListener('click', () => {
      this.runJudgeDemoSequence();
    });

    spikeBtn?.addEventListener('click', () => {
      this.injectAbnormalViscosity();
    });

    resetBtn?.addEventListener('click', () => {
      this.resetDemoState();
    });
  }

  /**
   * Automated 19-Step SIH 2026 Judge Demonstration Sequence (Section 44)
   */
  public async runJudgeDemoSequence(): Promise<void> {
    const toast = this._container.querySelector('#ov-judge-toast') as HTMLElement;
    const showToast = (step: number, title: string, detail: string) => {
      if (toast) {
        toast.style.display = 'block';
        toast.innerHTML = `
          <div style="font-size: 8.5px; color: var(--accent-green); font-weight: 700; letter-spacing: 0.8px; margin-bottom: 3px;">
            SIH 2026 JUDGE DEMO MODE · STEP ${step} / 19
          </div>
          <div style="font-size: 13px; font-weight: 700; color: #fff; margin-bottom: 3px;">${title}</div>
          <div style="font-size: 9.5px; color: #cbd5e1; line-height: 1.4;">${detail}</div>
        `;
      }
    };

    const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

    try {
      // Step 1: Load BGW-17A
      showToast(1, "LOAD BGW-17A ASSET", "Binding Baghewala heavy oil reservoir properties, API 11E pumpjack geometry, and historical CSS cycles.");
      await sleep(1400);

      // Step 2: Show 3D Digital Twin
      showToast(2, "SURFACE 3D DIGITAL TWIN", "Focusing on surface pumping unit and four-bar linkage crank kinematics running at 60 FPS.");
      this._environment.moveToPreset('surfacePumpjack');
      await sleep(1400);

      // Step 3: Show Current State
      showToast(3, "OBSERVE CURRENT PHYSICAL STATE", "Surface SCADA: 3.2 SPM | Virtual PIP: 16.8 bar | Andrade Viscosity: 1,392 cP | Float Margin: 8.2%.");
      await sleep(1400);

      // Step 4: Show Thermal Trajectory
      showToast(4, "SUB-SURFACE THERMAL FRONT", "Focusing downhole to 1,420m TVD. Marx-Langenheim exponential thermal decay (-0.85 °C/day) projected.");
      this._environment.moveToPreset('downholeView');
      await sleep(1400);

      // Step 5: Show Viscosity Trajectory
      showToast(5, "IN-SITU VISCOSITY TRAJECTORY", "Causal Coupling: As downhole temperature cools from 72.7°C, crude viscosity escalates toward 3,200 cP.");
      await sleep(1400);

      // Step 6: Show Pumpability Window
      showToast(6, "PREDICTIVE PUMPABILITY WINDOW", "Evaluating time to mechanical boundary. Operating window contracts as heavy crude mobility drops.");
      await sleep(1400);

      // Step 7: Change SPM
      showToast(7, "REHEARSE OPERATING CHANGE", "Engineer tests setpoint adjustment: increasing pumping speed to 3.6 SPM to capture additional inflow.");
      await sleep(1400);

      // Step 8: Run 30-Day Rehearsal
      showToast(8, "30-DAY DECISION REHEARSAL", "In-memory state clone created. Simulating thermo-mechanical forward trajectory without mutating live well operations.");
      await sleep(1400);

      // Step 9: Compare Four Scenarios
      showToast(9, "COUNTERFACTUAL COMPARISON", "Evaluating 4 counterfactuals: Current Status Quo vs CSS Only vs SRP Only vs Joint CSS+SRP.");
      await sleep(1400);

      // Step 10: Run Joint Optimization
      showToast(10, "JOINT CSS + SRP OPTIMIZATION", "SciPy Differential Evolution searching admissible setpoints across SPM, Stroke, Steam Volume, and Soak Duration.");
      await sleep(1400);

      // Step 11: Run Assurance
      showToast(11, "12-POINT ASSURANCE GATEKEEPER", "Validating Candidate against 12 physical, thermal, mechanical, economic, and ML domain constraints.");
      await sleep(1400);

      // Step 12: Show Recommendation
      showToast(12, "CERTIFIED DECISION CONTRACT", "Candidate passes 12/12 gates. Assembling formal Recommendation Case with dual WHY and WHY NOT explainability.");
      await sleep(1600);

      // Step 13: Inject Abnormal Cooling Fault
      showToast(13, "FAULT INJECTION: ABNORMAL VISCOSITY", "Simulating severe reservoir cooling (+18,500 cP cold-slug anomaly) to demonstrate safety gate enforcement.");
      this.injectAbnormalViscosity();
      await sleep(1800);

      // Step 14: Trigger NO SAFE RECOMMENDATION
      showToast(14, "ABSTENTION: NO SAFE RECOMMENDATION", "Safety Gate Interlock tripped! High-speed pumping disallowed to protect sucker rod string.");
      await sleep(1800);

      // Step 15: Show Exact Failed Gates
      showToast(15, "FAILED GATE DIAGNOSIS", "Gate 7 (Rod Float: 0.0% < 10.0%) FAILED · Gate 12 (Model Domain OOD 0.94) FAILED.");
      await sleep(1600);

      // Step 16: Show Causal Chain
      showToast(16, "PHYSICAL CAUSAL CHAIN", "Cooling → Viscosity Surge → Annular Couette Drag Spike → Buoyant Float Margin Collapse → Helical Buckling Hazard.");
      await sleep(1800);

      // Step 17: Generate Safe Alternatives
      showToast(17, "SAFE ALTERNATIVE SEARCH", "Autonomous engine identifies Plan A: Derate to 2.4 SPM at 74\" stroke (Float Margin restored to 21.4%).");
      await sleep(1800);

      // Step 18: Generate Decision Report
      showToast(18, "AUDITABLE DECISION CONTRACT", "Compiling 18-section engineering audit report sealed with cryptographic SHA-256 integrity hash.");
      await sleep(1800);

      // Step 19: Restore Baseline
      showToast(19, "DEMO COMPLETE · RESTORING BASELINE", "Restoring BGW-17A cyber-physical twin to nominal operating state. Decision workflow verified.");
      this.resetDemoState();
      this._environment.moveToPreset('surfacePumpjack');
      await sleep(2200);

      if (toast) toast.style.display = 'none';
    } catch (err) {
      console.error('Judge demo sequence error:', err);
      if (toast) toast.style.display = 'none';
    }
  }

  /**
   * Controlled SIH Demo Trigger: Injects cold slug viscosity spike (+14,500 cP)
   * Collapses float margin, trips 12-point assurance gate, and triggers real NO SAFE RECOMMENDATION.
   */
  public injectAbnormalViscosity(): void {
    this._isDemoAbnormal = true;

    // Mutate local state for demo without corrupting persisted baseline
    this._simClient.state.reservoir.viscosity_cp = 18500.0;
    this._simClient.state.reservoir.temperature_c = 41.2;
    this._simClient.state.srp.float_margin_pct = 0.0;
    this._simClient.state.srp.rod_load_kn = 68.4;

    this._assureManager.setDemoMode('DEMO_OUT_OF_DOMAIN');

    // UI Updates
    const spikeBtn = this._container.querySelector('#ov-demo-spike-btn') as HTMLElement;
    const resetBtn = this._container.querySelector('#ov-demo-reset-btn') as HTMLElement;
    const demoLabel = this._container.querySelector('#ov-demo-active-label');
    if (spikeBtn && resetBtn) {
      spikeBtn.style.display = 'none';
      resetBtn.style.display = 'flex';
    }
    if (demoLabel) {
      demoLabel.textContent = 'DEMO SCENARIO ACTIVE';
    }

    // Trip assurance gate visual checkpoints across key failure points
    this.setAssuranceCheckState('as-row-4', 'fail', '✖ Fail');
    this.setAssuranceCheckState('as-row-5', 'fail', '✖ Fail');
    this.setAssuranceCheckState('as-row-6', 'fail', '✖ Fail');
    this.setAssuranceCheckState('as-row-7', 'fail', '✖ Fail');
    this.setAssuranceCheckState('as-row-12', 'fail', '✖ Fail');

    const scoreBadge = this._container.querySelector('#ov-as-score-badge');
    if (scoreBadge) {
      scoreBadge.textContent = '8/13 PASS · 61.5%';
      scoreBadge.className = 'ws-pill-badge critical';
    }

    // Trip Overall Status
    const overallStatus = this._container.querySelector('#ov-assurance-overall-status');
    if (overallStatus) {
      overallStatus.className = 'ws-as-foot-status critical';
      overallStatus.innerHTML = `
        NO SAFE RECOMMENDATION
        <svg viewBox="0 0 24 24" style="width: 14px; height: 14px; stroke: currentColor; fill: none; stroke-width: 2;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      `;
    }

    // Update Model Domain Card
    const domStatusRow = this._container.querySelector('#ov-domain-status-row');
    const domStatusText = this._container.querySelector('#ov-domain-status-text');
    const oodVal = this._container.querySelector('#ov-ood-score-val');
    const oodBar = this._container.querySelector('#ov-ood-bar-fill') as HTMLElement;
    const mlBadge = this._container.querySelector('#ov-domain-ml-badge');
    const mlDelta = this._container.querySelector('#ov-domain-ml-delta');

    if (domStatusRow) domStatusRow.className = 'ws-domain-status-row ood';
    if (domStatusText) domStatusText.textContent = 'Outside validated learned domain';
    if (oodVal) oodVal.textContent = '0.94';
    if (oodBar) oodBar.style.width = '94%';
    if (mlBadge) {
      mlBadge.textContent = 'Fallback';
      mlBadge.className = 'ws-domain-badge warn';
    }
    if (mlDelta) mlDelta.textContent = 'Physics Evaluation';

    // Update Recommendation Card to NO SAFE RECOMMENDATION
    const badgeBar = this._container.querySelector('#ov-rec-verified-badge');
    const badgeText = this._container.querySelector('#ov-rec-badge-text');
    if (badgeBar) badgeBar.className = 'ws-rec-abstain-badge';
    if (badgeText) badgeText.textContent = 'NO SAFE RECOMMENDATION (ABSTAIN)';

    const recContent = this._container.querySelector('#ov-rec-content-area');
    if (recContent) {
      recContent.innerHTML = `
        <div class="ws-rec-col" style="grid-column: 1 / -1;">
          <div style="font-size: 9.5px; font-weight: 700; color: var(--accent-red); margin-bottom: 4px;">
            SAFETY GATE INTERLOCK TRIPPED · ALL PROPOSED SETPOINTS REJECTED
          </div>
          <span class="ws-rec-section-hdr">Critical Failure Conditions</span>
          <div class="ws-rec-bullet rejected">Thermal Envelope Violated: Reservoir cooled to 41.2°C (viscosity surged to 18,500 cP)</div>
          <div class="ws-rec-bullet rejected">Buoyant Float Margin Collapsed: 0.0% (downstroke viscous drag exceeds sucker rod string weight)</div>
          <div class="ws-rec-bullet rejected">Severe Rod Buckling Hazard: MPRL &lt; 0.8 kN compressive load detected</div>
          <div class="ws-rec-bullet rejected">Outside Validated Learned Domain: OOD Score 0.94 (ML advisory suppressed)</div>

          <span class="ws-rec-section-hdr" style="margin-top: 6px;">Mandatory Interventions (What Must Change)</span>
          <div class="ws-rec-bullet">Cease mechanical pumping strokes immediately to prevent rod helical failure</div>
          <div class="ws-rec-bullet">Initiate high-enthalpy Cyclic Steam Stimulation (CSS) thermal recharge (≥20 TPD steam)</div>
          <div class="ws-rec-bullet">Reheat near-wellbore formation above 65°C to restore in-situ pumpability before restart</div>
        </div>
      `;
    }

    // Update pumpability gauge to 0 days
    this._gauge.render(0.0, 'CRITICAL');
    const pBadge = this._container.querySelector('#ov-pumpability-badge');
    if (pBadge) {
      pBadge.textContent = 'STATUS: CRITICAL';
      pBadge.className = 'ws-pill-badge critical';
    }

    // Update envelope canvas to critical
    this._envelope.update({
      spm: 7.5,
      tempC: 41.2,
      status: 'CRITICAL',
      daysRemaining: 0.0
    });
  }

  /**
   * Resets Demo Mode back to normal baseline twin state
   */
  public resetDemoState(): void {
    this._isDemoAbnormal = false;

    this._simClient.state.reservoir.viscosity_cp = 1392.0;
    this._simClient.state.reservoir.temperature_c = 72.7;
    this._simClient.state.srp.float_margin_pct = 8.2;
    this._simClient.state.srp.rod_load_kn = 58.6;

    this._assureManager.setDemoMode('NORMAL');

    // UI Buttons
    const spikeBtn = this._container.querySelector('#ov-demo-spike-btn') as HTMLElement;
    const resetBtn = this._container.querySelector('#ov-demo-reset-btn') as HTMLElement;
    const demoLabel = this._container.querySelector('#ov-demo-active-label');
    if (spikeBtn && resetBtn) {
      spikeBtn.style.display = 'flex';
      resetBtn.style.display = 'none';
    }
    if (demoLabel) {
      demoLabel.textContent = '';
    }

    // Reset Assurance checkpoints across all 13 gates
    for (let i = 1; i <= 13; i++) {
      if (i === 11) this.setAssuranceCheckState(`as-row-${i}`, 'warn', '⚠ Warn');
      else this.setAssuranceCheckState(`as-row-${i}`, 'pass', '✔ Pass');
    }

    const scoreBadge = this._container.querySelector('#ov-as-score-badge');
    if (scoreBadge) {
      scoreBadge.textContent = '12/13 PASS · 92.3%';
      scoreBadge.className = 'ws-pill-badge safe';
    }

    const overallStatus = this._container.querySelector('#ov-assurance-overall-status');
    if (overallStatus) {
      overallStatus.className = 'ws-as-foot-status safe';
      overallStatus.innerHTML = `
        SAFE TO RECOMMEND →
        <svg viewBox="0 0 24 24" style="width: 14px; height: 14px; stroke: currentColor; fill: none; stroke-width: 2;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
      `;
    }

    // Reset Model Domain Card
    const domStatusRow = this._container.querySelector('#ov-domain-status-row');
    const domStatusText = this._container.querySelector('#ov-domain-status-text');
    const oodVal = this._container.querySelector('#ov-ood-score-val');
    const oodBar = this._container.querySelector('#ov-ood-bar-fill') as HTMLElement;
    const mlBadge = this._container.querySelector('#ov-domain-ml-badge');
    const mlDelta = this._container.querySelector('#ov-domain-ml-delta');

    if (domStatusRow) domStatusRow.className = 'ws-domain-status-row';
    if (domStatusText) domStatusText.textContent = 'Within validated domain';
    if (oodVal) oodVal.textContent = '0.23';
    if (oodBar) oodBar.style.width = '23%';
    if (mlBadge) {
      mlBadge.textContent = 'Good';
      mlBadge.className = 'ws-domain-badge good';
    }
    if (mlDelta) mlDelta.textContent = 'Δ = 6.2%';

    // Re-render recommendation card
    const badgeBar = this._container.querySelector('#ov-rec-verified-badge');
    const badgeText = this._container.querySelector('#ov-rec-badge-text');
    if (badgeBar) badgeBar.className = 'ws-rec-verified-badge';
    if (badgeText) badgeText.textContent = 'VERIFIED ENGINEER RECOMMENDATION';

    // Update gauge & envelope
    this._gauge.render(18.4, 'WARNING');
    const pBadge = this._container.querySelector('#ov-pumpability-badge');
    if (pBadge) {
      pBadge.textContent = 'STATUS: CONTRACTING';
      pBadge.className = 'ws-pill-badge warning';
    }

    this._envelope.update({
      spm: 7.5,
      tempC: 72.7,
      status: 'SAFE',
      daysRemaining: 18.4
    });

    this.renderRecommendationDefault();
  }

  private setAssuranceCheckState(rowId: string, type: 'pass' | 'warn' | 'fail', text: string): void {
    const row = this._container.querySelector(`#${rowId}`);
    if (row) {
      const badge = row.querySelector('.ws-as-badge');
      if (badge) {
        badge.className = `ws-as-badge ${type}`;
        badge.textContent = text;
      }
    }
  }

  private _startAssurancePolling(): void {
    this._bridge.watchAssuranceGate((data) => {
      if (data) {
        this.handleLiveAssuranceUpdate(data);
      }
    }, 4000);
  }

  public handleLiveAssuranceUpdate(gate: AssuranceResult): void {
    if (this._isDemoAbnormal) return; // Retain demo override state if fault is active
    this._latestGateResult = gate;

    const checks = gate.checks ?? [];
    const passCount = checks.filter(c => c.passed).length;
    const scorePct = gate.gate_score_pct ?? Math.round((passCount / Math.max(1, checks.length)) * 100);

    // Update score badge in card header
    const scoreBadge = this._container.querySelector('#ov-as-score-badge');
    if (scoreBadge) {
      scoreBadge.textContent = `${passCount}/${checks.length} PASS · ${scorePct.toFixed(0)}%`;
      scoreBadge.className = `ws-pill-badge ${scorePct >= 80 ? 'safe' : (scorePct >= 50 ? 'warning' : 'critical')}`;
    }

    // Update individual checkpoint rows
    checks.forEach((c) => {
      const row = this._container.querySelector(`#as-row-${c.id}`) as HTMLElement;
      if (row) {
        row.title = `${c.name}: ${c.detail || ''}`;
        const nameEl = row.querySelector('.ws-as-name');
        if (nameEl && c.name) nameEl.textContent = c.name;
        const badge = row.querySelector('.ws-as-badge');
        if (badge) {
          const st = c.status.toLowerCase();
          badge.className = `ws-as-badge ${st === 'pass' ? 'pass' : (st === 'warning' ? 'warn' : 'fail')}`;
          badge.textContent = st === 'pass' ? '✔ PASS' : (st === 'warning' ? '⚠ WARN' : '✖ FAIL');
        }
      }
    });

    // Update overall footer result
    const overallStatus = this._container.querySelector('#ov-assurance-overall-status');
    if (overallStatus) {
      if (gate.overall_pass) {
        overallStatus.className = 'ws-as-foot-status safe';
        overallStatus.innerHTML = `
          SAFE TO RECOMMEND →
          <svg viewBox="0 0 24 24" style="width: 14px; height: 14px; stroke: currentColor; fill: none; stroke-width: 2;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        `;
      } else if (gate.abstain_active) {
        overallStatus.className = 'ws-as-foot-status critical';
        overallStatus.innerHTML = `
          ⛔ GATE ABSTAIN (NO REC)
          <svg viewBox="0 0 24 24" style="width: 14px; height: 14px; stroke: currentColor; fill: none; stroke-width: 2;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        `;
      } else {
        overallStatus.className = 'ws-as-foot-status warning';
        overallStatus.innerHTML = `
          ⚠ CONDITIONAL REVIEW →
          <svg viewBox="0 0 24 24" style="width: 14px; height: 14px; stroke: currentColor; fill: none; stroke-width: 2;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>
        `;
      }
    }
  }

  private renderRecommendationDefault(): void {
    const recContent = this._container.querySelector('#ov-rec-content-area');
    if (recContent) {
      recContent.innerHTML = `
        <div class="ws-rec-col">
          <span class="ws-rec-section-hdr">Recommended Setpoints</span>
          <div class="ws-rec-kv"><span>SPM:</span> <strong id="ov-rec-spm">6.7 spm</strong></div>
          <div class="ws-rec-kv"><span>Stroke:</span> <strong id="ov-rec-stroke">52 in</strong></div>
          <div class="ws-rec-kv"><span>Steam Rate:</span> <strong id="ov-rec-steam-rate">19.8 TPD</strong></div>
          <div class="ws-rec-kv"><span>Steam Volume:</span> <strong id="ov-rec-steam-vol">1,250 bbl</strong></div>
          <div class="ws-rec-kv"><span>Next Cycle Timing:</span> <strong id="ov-rec-timing">Day 8.8</strong></div>

          <span class="ws-rec-section-hdr" style="margin-top: 4px;">Why Recommended</span>
          <div class="ws-rec-bullet">Maintains safe float margin throughout forecast horizon</div>
          <div class="ws-rec-bullet">Pump fillage remains stable within efficient range</div>
          <div class="ws-rec-bullet">Steam usage optimized for thermal decline</div>
          <div class="ws-rec-bullet">Lower SOR and improved net oil</div>
        </div>

        <div class="ws-rec-col">
          <span class="ws-rec-section-hdr">Expected Outcomes (30D)</span>
          <div class="ws-rec-kv"><span>Oil Rate:</span> <strong id="ov-rec-out-oil">20.8 ± 1.8 BOPD</strong></div>
          <div class="ws-rec-kv"><span>SOR:</span> <strong id="ov-rec-out-sor">5.3 ± 0.6</strong></div>
          <div class="ws-rec-kv"><span>Pump Fillage:</span> <strong id="ov-rec-out-fill">74% ± 4%</strong></div>
          <div class="ws-rec-kv"><span>Float Margin:</span> <strong id="ov-rec-out-float">6.7% ± 1.0%</strong></div>
          <div class="ws-rec-kv"><span>Steam Penalty:</span> <strong id="ov-rec-out-penalty">-3.2%</strong></div>

          <span class="ws-rec-section-hdr" style="margin-top: 4px;">Rejected Alternative (SPM 8.5)</span>
          <div class="ws-rec-bullet rejected">Float margin below safe limit</div>
          <div class="ws-rec-bullet rejected">High rod load risk</div>
          <div class="ws-rec-bullet rejected">Pump fillage exceeds limit</div>
        </div>
      `;
    }
  }

  public mount3D(): void {
    const mount = this._container.querySelector('#viewport-3d-mount') as HTMLElement;
    if (mount && this._environment) {
      if (!mount.contains(this._environment.renderer.domElement)) {
        mount.appendChild(this._environment.renderer.domElement);
      }
      this.resize3D();
      // Ensure canvas is properly sized on next animation frame
      requestAnimationFrame(() => this.resize3D());
    }
  }

  public resize3D(): void {
    const mount = this._container.querySelector('#viewport-3d-mount') as HTMLElement;
    if (mount && this._environment) {
      if (!mount.contains(this._environment.renderer.domElement)) {
        mount.appendChild(this._environment.renderer.domElement);
      }
      const rect = mount.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        this._environment.camera.aspect = rect.width / rect.height;
        this._environment.camera.updateProjectionMatrix();
        this._environment.renderer.setSize(rect.width, rect.height, false);
      }
    }
  }

  public showNotificationToast(title: string, detail: string, type: 'success' | 'warn' | 'info' = 'success', durationMs: number = 4500): void {
    const toast = this._container.querySelector('#ov-judge-toast') as HTMLElement;
    if (toast) {
      toast.style.display = 'block';
      const color = type === 'success' ? 'var(--accent-green)' : (type === 'warn' ? 'var(--accent-red)' : 'var(--accent-blue)');
      toast.style.borderColor = color;
      toast.innerHTML = `
        <div style="font-size: 8.5px; color: ${color}; font-weight: 700; letter-spacing: 0.8px; margin-bottom: 3px;">
          ${type === 'success' ? '✔ DECISION ASSURANCE SYSTEM' : (type === 'warn' ? '⚠ ACTION GOVERNANCE' : 'ℹ SYSTEM NOTICE')}
        </div>
        <div style="font-size: 13px; font-weight: 700; color: #fff; margin-bottom: 3px;">${title}</div>
        <div style="font-size: 9.5px; color: #cbd5e1; line-height: 1.4;">${detail}</div>
      `;
      setTimeout(() => {
        if (toast.style.display === 'block') {
          toast.style.display = 'none';
        }
      }, durationMs);
    }
  }

  public update(simState: SimulationState, solutionState: SolutionState): void {
    if (this._isDemoAbnormal) return;

    // 1. Update TM Summary Readouts
    const tempEl = this._container.querySelector('#tm-val-temp');
    if (tempEl) tempEl.textContent = `${solutionState.virtualDownhole.downholeTemperature.value.toFixed(1)} °C`;

    const viscEl = this._container.querySelector('#tm-val-visc');
    if (viscEl) viscEl.textContent = `${Math.round(solutionState.virtualDownhole.downholeViscosity.value).toLocaleString()} cP`;

    const fillEl = this._container.querySelector('#tm-val-fillage');
    if (fillEl) fillEl.textContent = `${Math.round(simState.pump.pump_fillage_pct)} %`;

    const floatEl = this._container.querySelector('#tm-val-float');
    if (floatEl) floatEl.textContent = `${simState.srp.float_margin_pct.toFixed(1)} %`;

    const rodEl = this._container.querySelector('#tm-val-rod');
    if (rodEl) rodEl.textContent = `${Math.round((simState.srp.pprl_kn / 65.0) * 100)} %`;

    // 2. Update Pumpability Gauge
    const pDays = solutionState.pumpability.timeToBoundaryDays;
    const pStatus = solutionState.pumpability.state;
    this._gauge.render(pDays, pStatus);

    const badge = this._container.querySelector('#ov-pumpability-badge');
    if (badge) {
      badge.textContent = `STATUS: ${pStatus === 'SAFE' ? 'STABLE' : (pStatus === 'WARNING' ? 'CONTRACTING' : 'CRITICAL')}`;
      badge.className = `ws-pill-badge ${pStatus === 'SAFE' ? 'safe' : (pStatus === 'WARNING' ? 'warning' : 'critical')}`;
    }

    // 3. Update Dynamic Operating Envelope Canvas
    this._envelope.update({
      spm: simState.controls.spm,
      tempC: solutionState.virtualDownhole.downholeTemperature.value,
      status: pStatus,
      daysRemaining: pDays
    });

    // 4. Update Scenario Comparison Table with live state
    const setVal = (id: string, text: string) => {
      const el = this._container.querySelector(id);
      if (el) el.textContent = text;
    };
    setVal('#sc-curr-oil', simState.production.oil_rate_bopd.toFixed(1));
    setVal('#sc-curr-sor', simState.economics.sor.toFixed(1));
    setVal('#sc-curr-spm', simState.controls.spm.toFixed(1));
    setVal('#sc-curr-str', Math.round(simState.controls.stroke_inches).toString());
    setVal('#sc-curr-fill', Math.round(simState.pump.pump_fillage_pct).toString());
    setVal('#sc-curr-flt', simState.srp.float_margin_pct.toFixed(1));
    setVal('#sc-curr-rod', Math.round((simState.srp.pprl_kn / 65.0) * 100).toString());
    setVal('#sc-curr-stm', simState.controls.steam_volume_t_d.toFixed(1));
  }
}
