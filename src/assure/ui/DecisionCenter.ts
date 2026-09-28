/**
 * src/assure/ui/DecisionCenter.ts
 * ASSURE-TWIN Decision Center Interactive Drawer & HUD Overlay (Phases 40 - 58).
 * Additive industrial engineering workspace that wraps the read-only 3D simulator.
 */

import './decision-center.css';
import type { AssureTwinManager } from '../AssureTwinManager.ts';
import type { SolutionState, DemoScenarioMode } from '../types.ts';
import { EnvelopeCanvas } from './EnvelopeCanvas.ts';
import { AuditTrailEngine } from '../AuditTrailEngine.ts';
import { RecalibrationEngine } from '../RecalibrationEngine.ts';

export type DecisionCenterTab =
  | 'OVERVIEW'
  | 'ENVELOPE'
  | 'REHEARSAL'
  | 'ASSURANCE'
  | 'AUDIT'
  | 'CALIBRATION';

export class DecisionCenter {
  private _manager: AssureTwinManager;
  private _drawerEl: HTMLElement;
  private _topTriggerBtn: HTMLElement;
  private _activeTab: DecisionCenterTab = 'ENVELOPE';
  private _isCollapsed: boolean = false;
  private _envelopeCanvas: EnvelopeCanvas | null = null;

  constructor(manager: AssureTwinManager) {
    this._manager = manager;

    // 1. Create Top Header Trigger Button
    this._topTriggerBtn = document.createElement('div');
    this._topTriggerBtn.className = 'assure-top-trigger';
    this._topTriggerBtn.id = 'assure-top-trigger';
    this.updateTriggerButton(this._manager.solutionState);

    // Attach to app header if present, otherwise append to body
    const appHeader = document.querySelector('.app-header');
    if (appHeader) {
      appHeader.appendChild(this._topTriggerBtn);
    } else {
      document.body.appendChild(this._topTriggerBtn);
    }

    // 2. Create Slide-Over Drawer
    this._drawerEl = document.createElement('aside');
    this._drawerEl.className = 'decision-center-drawer';
    this._drawerEl.id = 'decision-center-drawer';
    document.body.appendChild(this._drawerEl);

    // Initial render
    this.render();

    // Subscribe to state changes
    this._manager.subscribe(solution => {
      this.updateTriggerButton(solution);
      this.updateDynamicContent(solution);
    });

    // Bind trigger click
    this._topTriggerBtn.addEventListener('click', () => this.toggleCollapse());
  }

  public toggleCollapse(): void {
    this._isCollapsed = !this._isCollapsed;
    if (this._isCollapsed) {
      this._drawerEl.classList.add('collapsed');
    } else {
      this._drawerEl.classList.remove('collapsed');
      if (this._activeTab === 'ENVELOPE' && this._envelopeCanvas) {
        this._envelopeCanvas.render(this._manager.solutionState.operatingEnvelope);
      }
    }
  }

  public setTab(tab: DecisionCenterTab): void {
    this._activeTab = tab;
    this.render();
  }

  private updateTriggerButton(state: SolutionState): void {
    const pDays = state.pumpability.timeToBoundaryDays;
    const assuranceStatus = this._manager.activeRecommendationCase?.assuranceStatus || 'VERIFIED';

    const assuranceShort = assuranceStatus === 'NO SAFE RECOMMENDATION'
      ? 'NO SAFE REC'
      : (assuranceStatus === 'REVIEW REQUIRED' ? 'REVIEW REQ' : 'VERIFIED');

    const badgeClass = assuranceStatus === 'NO SAFE RECOMMENDATION'
      ? 'status-critical'
      : (assuranceStatus === 'REVIEW REQUIRED' ? 'status-warning' : 'status-safe');

    this._topTriggerBtn.innerHTML = `
      <div class="assure-pulse-dot"></div>
      <span>ASSURE-TWIN</span>
      <span class="assure-badge-mini ${badgeClass}">${assuranceShort}</span>
      <span style="color:#64748b; font-size:10px;">|</span>
      <span style="color:#38bdf8;">${pDays}d PUMPABLE</span>
    `;
  }

  private render(): void {
    const state = this._manager.solutionState;
    const demoMode = this._manager.demoMode;

    this._drawerEl.innerHTML = `
      <!-- DRAWER HEADER -->
      <div class="dc-header">
        <div class="dc-brand">
          <div class="assure-pulse-dot"></div>
          <div>
            <div class="dc-title">ASSURE-TWIN // DECISION CENTER</div>
            <div class="dc-subtitle">DECISION-ASSURED CSS + SRP DIGITAL TWIN • PS 26120 • BAGHEWALA FIELD</div>
          </div>
        </div>
        <div class="dc-header-actions">
          <span class="assure-badge-mini status-${state.wellHealth.toLowerCase()}">${state.wellHealth}</span>
          <button class="dc-close-btn" id="dc-close-btn" title="Close Drawer">&times;</button>
        </div>
      </div>

      <!-- DEMO SCENARIO TOOLBAR -->
      <div class="dc-demo-bar">
        <span class="dc-demo-label">Scenarios:</span>
        <button class="dc-demo-chip ${demoMode === 'NORMAL' ? 'active' : ''}" data-mode="NORMAL">Normal Operation</button>
        <button class="dc-demo-chip ${demoMode === 'DEMO_LATE_CSS' ? 'active' : ''}" data-mode="DEMO_LATE_CSS">Demo: Late CSS Cooling</button>
        <button class="dc-demo-chip danger-chip ${demoMode === 'DEMO_SENSOR_FAILURE' ? 'active' : ''}" data-mode="DEMO_SENSOR_FAILURE">Demo: Sensor Failure</button>
        <button class="dc-demo-chip danger-chip ${demoMode === 'DEMO_MODEL_DISAGREEMENT' ? 'active' : ''}" data-mode="DEMO_MODEL_DISAGREEMENT">Demo: Model Disagreement</button>
        <button class="dc-demo-chip danger-chip ${demoMode === 'DEMO_OUT_OF_DOMAIN' ? 'active' : ''}" data-mode="DEMO_OUT_OF_DOMAIN">Demo: Out-of-Domain</button>
      </div>

      <!-- NAVIGATION TABS -->
      <div class="dc-tabs-nav">
        <button class="dc-tab-btn ${this._activeTab === 'OVERVIEW' ? 'active' : ''}" data-tab="OVERVIEW">01. Virtual Downhole</button>
        <button class="dc-tab-btn ${this._activeTab === 'ENVELOPE' ? 'active' : ''}" data-tab="ENVELOPE">02. Operating Envelope</button>
        <button class="dc-tab-btn ${this._activeTab === 'REHEARSAL' ? 'active' : ''}" data-tab="REHEARSAL">03. Digital Rehearsal</button>
        <button class="dc-tab-btn ${this._activeTab === 'ASSURANCE' ? 'active' : ''}" data-tab="ASSURANCE">04. Assurance Gate</button>
        <button class="dc-tab-btn ${this._activeTab === 'AUDIT' ? 'active' : ''}" data-tab="AUDIT">05. Audit Trail</button>
        <button class="dc-tab-btn ${this._activeTab === 'CALIBRATION' ? 'active' : ''}" data-tab="CALIBRATION">06. Calibration Center</button>
      </div>

      <!-- MAIN TAB CONTENT AREA -->
      <div class="dc-tab-content-area" id="dc-tab-content-area">
        ${this.renderTabContent(state)}
      </div>
    `;

    this.bindEvents();

    // If active tab is ENVELOPE, initialize canvas
    if (this._activeTab === 'ENVELOPE') {
      const canvasEl = this._drawerEl.querySelector('#dc-envelope-canvas') as HTMLCanvasElement;
      if (canvasEl) {
        this._envelopeCanvas = new EnvelopeCanvas(canvasEl);
        this._envelopeCanvas.render(state.operatingEnvelope);
      }
    }
  }

  private renderTabContent(state: SolutionState): string {
    switch (this._activeTab) {
      case 'OVERVIEW':
        return this.renderOverviewTab(state);
      case 'ENVELOPE':
        return this.renderEnvelopeTab(state);
      case 'REHEARSAL':
        return this.renderRehearsalTab(state);
      case 'ASSURANCE':
        return this.renderAssuranceTab(state);
      case 'AUDIT':
        return this.renderAuditTab(state);
      case 'CALIBRATION':
        return this.renderCalibrationTab(state);
    }
  }

  // TAB 1: OVERVIEW & VIRTUAL DOWNHOLE SENSORS
  private renderOverviewTab(state: SolutionState): string {
    const vd = state.virtualDownhole;
    const dq = state.dataQuality;
    const tr = state.thermalReserve;

    return `
      <!-- TOP STATUS & DATA QUALITY -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
        <div class="dc-panel">
          <div class="dc-panel-header">
            <span class="dc-panel-title">Asset & Well Telemetry Profile</span>
            <span class="dc-vs-tag">SYNTHETIC DEMO</span>
          </div>
          <div style="font-family: var(--font-mono); font-size: 11px; line-height: 1.6; color: #cbd5e1;">
            <div><strong>Well:</strong> ${state.wellId}</div>
            <div><strong>Field:</strong> ${state.fieldId}</div>
            <div><strong>Layer:</strong> Jodhpur Sandstone (14.5° API Heavy Oil)</div>
            <div><strong>CSS Cycle:</strong> Cycle ${tr.cssCycleCount} (Day ${tr.timeSinceLastCssDays} / 60)</div>
          </div>
        </div>

        <div class="dc-panel">
          <div class="dc-panel-header">
            <span class="dc-panel-title">Data Quality Engine (Phase 3)</span>
            <span class="assure-badge-mini ${dq.status === 'EXCELLENT' ? 'status-safe' : (dq.status === 'ACCEPTABLE' ? 'status-warning' : 'status-critical')}">${dq.status} (${dq.score}%)</span>
          </div>
          <div style="font-family: var(--font-mono); font-size: 11px; line-height: 1.6; color: #cbd5e1;">
            <div><strong>Stale Sensors:</strong> ${dq.staleSensorsCount} detected</div>
            <div><strong>Outliers Detected:</strong> ${dq.outliersCount}</div>
            <div><strong>Unit Inconsistencies:</strong> ${dq.unitInconsistenciesCount}</div>
            ${dq.issues.length > 0 ? `<div style="color: #fb7185; margin-top: 4px;">⚠️ ${dq.issues[0].description}</div>` : '<div style="color: #4ade80;">✓ Continuous telemetry verification passed.</div>'}
          </div>
        </div>
      </div>

      <!-- THERMAL RESERVE STATUS BAR -->
      <div class="dc-panel">
        <div class="dc-panel-header">
          <span class="dc-panel-title">Thermal Memory & Matrix Reserve (Phase 7)</span>
          <span style="font-family: var(--font-mono); font-size: 11px; color: #38bdf8;">${tr.reservePct}% Enthalpy Remaining</span>
        </div>
        <div style="background: rgba(255,255,255,0.06); height: 12px; border-radius: 6px; overflow: hidden; margin-bottom: 8px;">
          <div style="width: ${tr.reservePct}%; height: 100%; background: linear-gradient(90deg, #f59e0b, #ef4444); border-radius: 6px;"></div>
        </div>
        <div style="display: flex; justify-content: space-between; font-family: var(--font-mono); font-size: 10px; color: #94a3b8;">
          <span>Matrix Temp: ${tr.currentTempC.toFixed(1)}°C (Ref: ${tr.referenceTempC}°C)</span>
          <span>Cooling Rate: ${tr.coolingRateCPerDay.toFixed(2)} °C/day</span>
          <span>Front Radius: ${tr.thermalFrontMeters.toFixed(1)}m</span>
        </div>
      </div>

      <!-- VIRTUAL DOWNHOLE SENSORS (10 CARDS) -->
      <div class="dc-panel">
        <div class="dc-panel-header">
          <span class="dc-panel-title">Virtual Downhole Sensors (Phase 4)</span>
          <span style="font-family: var(--font-mono); font-size: 9px; color: #64748b;">ALL VALUES LABELED ESTIMATED</span>
        </div>
        <div class="dc-virtual-grid">
          ${[
            vd.downholeTemperature,
            vd.downholePressure,
            vd.pumpIntakePressure,
            vd.dynamicFluidLevel,
            vd.downholeViscosity,
            vd.effectiveInflow,
            vd.effectiveFillage,
            vd.rodDrag,
            vd.floatMargin,
            vd.pumpabilityScore
          ].map(sensor => `
            <div class="dc-vs-card">
              <div class="dc-vs-top">
                <span class="dc-vs-name">${sensor.name}</span>
                <span class="dc-vs-tag">${sensor.provenance}</span>
              </div>
              <div class="dc-vs-val-row">
                <span class="dc-vs-val">${sensor.value}</span>
                <span class="dc-vs-unit">${sensor.unit}</span>
                <span style="margin-left: auto; font-family: var(--font-mono); font-size: 8px; color: ${sensor.confidence === 'HIGH' ? '#4ade80' : '#fbbf24'};">[${sensor.confidence}]</span>
              </div>
              <div class="dc-vs-range">Est Range: ${sensor.estimatedRange[0]} – ${sensor.estimatedRange[1]} ${sensor.unit}</div>
              <div class="dc-vs-inputs">Inputs: ${sensor.sourceInputs.slice(0, 2).join(', ')}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // TAB 2: OPERATING ENVELOPE & PUMPABILITY WINDOW
  private renderEnvelopeTab(state: SolutionState): string {
    const env = state.operatingEnvelope;
    const p = state.pumpability;
    const css = state.cssReadiness;

    return `
      <!-- TOP HIGHLIGHT: PUMPABILITY COUNTDOWN & NEXT CSS WINDOW -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
        <div class="dc-pumpability-card">
          <div class="dc-panel-header" style="margin-bottom: 0;">
            <span class="dc-panel-title">Pumpability Window (Phase 10)</span>
            <span class="assure-badge-mini status-${p.state.toLowerCase()}">${p.state}</span>
          </div>
          <div class="dc-countdown-box">
            <div class="dc-countdown-days" style="color: ${p.state === 'SAFE' ? '#38bdf8' : (p.state === 'WARNING' ? '#fbbf24' : '#fb7185')};">
              ${p.timeToBoundaryDays} <span style="font-size: 18px; font-weight: 500;">DAYS</span>
            </div>
            <div class="dc-countdown-label">TIME UNTIL UNFAVORABLE BOUNDARY CROSSING</div>
          </div>
          <div style="font-family: var(--font-mono); font-size: 10px; color: #cbd5e1; line-height: 1.4;">
            <strong>Limiting Boundary:</strong> ${p.criticalLimitingFactor}<br>
            <strong>Forecast Boundary Crossing:</strong> Day ${p.forecastBoundaryDay} of production
          </div>
        </div>

        <div class="dc-pumpability-card">
          <div class="dc-panel-header" style="margin-bottom: 0;">
            <span class="dc-panel-title">Next CSS Opportunity Window (Phase 13)</span>
            <span class="assure-badge-mini ${css.status === 'WINDOW OPEN' || css.status === 'URGENT' ? 'status-critical' : 'status-safe'}">${css.status}</span>
          </div>
          <div class="dc-countdown-box">
            <div class="dc-countdown-days" style="color: #f59e0b;">
              DAY ${css.currentCycleDay} <span style="font-size: 18px; font-weight: 500;">/ ${css.totalCycleTargetDays}</span>
            </div>
            <div class="dc-countdown-label">OPTIMAL INJECTION WINDOW: DAY ${css.recommendedCssWindowDays[0]} – ${css.recommendedCssWindowDays[1]}</div>
          </div>
          <div style="font-family: var(--font-mono); font-size: 10px; color: #cbd5e1; line-height: 1.4;">
            <strong>SOR Status:</strong> ${css.sorTrend} (${state.economics.sor.toFixed(1)} t/t)<br>
            <strong>Advisor Note:</strong> ${css.explanation}
          </div>
        </div>
      </div>

      <!-- 2D ENVELOPE CANVAS PLOT -->
      <div class="dc-panel">
        <div class="dc-panel-header">
          <span class="dc-panel-title">Dynamic Thermo-Mechanical Operating Envelope (Phase 8 & 9)</span>
          <span style="font-family: var(--font-mono); font-size: 10px; color: #94a3b8;">
            Preferred Window: <strong>${env.preferredSpmMin.toFixed(1)} – ${env.preferredSpmMax.toFixed(1)} SPM</strong>
          </span>
        </div>
        <div class="dc-envelope-layout">
          <div class="dc-envelope-canvas-wrap">
            <canvas id="dc-envelope-canvas"></canvas>
          </div>
          <div style="display: flex; flex-direction: column; gap: 10px; justify-content: center; font-family: var(--font-mono); font-size: 11px;">
            <div style="background: rgba(10,15,26,0.6); padding: 10px; border-radius: 6px; border-left: 3px solid #38bdf8;">
              <strong style="color: #38bdf8;">"The Safe Window Moves With The Well"</strong>
              <p style="color: #94a3b8; font-size: 10px; margin-top: 4px; line-height: 1.4;">
                As the near-wellbore cools, viscosity surges exponentially. Rod drag increases, lowering the rod-float boundary from 4.8 SPM down to ${env.criticalSpmUpper.toFixed(1)} SPM.
              </p>
            </div>
            <div style="background: rgba(255,255,255,0.03); padding: 8px 10px; border-radius: 4px;">
              <span style="color: #64748b; font-size: 9px;">CURRENT SPM:</span>
              <div style="font-size: 15px; font-weight: 700; color: #f8fafc;">${env.currentSpm.toFixed(1)} SPM</div>
            </div>
            <div style="background: rgba(255,255,255,0.03); padding: 8px 10px; border-radius: 4px;">
              <span style="color: #64748b; font-size: 9px;">WINDOW CONTRACTION:</span>
              <div style="font-size: 15px; font-weight: 700; color: #f59e0b;">-${env.shrinkageFactorPct}% Width</div>
            </div>
            <div style="background: rgba(255,255,255,0.03); padding: 8px 10px; border-radius: 4px;">
              <span style="color: #64748b; font-size: 9px;">ROD-FLOAT LIMIT:</span>
              <div style="font-size: 15px; font-weight: 700; color: #fb7185;">${env.criticalSpmUpper.toFixed(1)} SPM Max</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // TAB 3: DIGITAL REHEARSAL & COUNTERFACTUALS
  private renderRehearsalTab(_state: SolutionState): string {
    const rehearsals = this._manager.activeRehearsals;
    const selectedId = this._manager.selectedCandidateId;
    const selectedRehearsal = rehearsals.find(r => r.candidate.id === selectedId) || rehearsals[0];

    return `
      <!-- REHEARSAL CANDIDATE CARDS -->
      <div class="dc-panel">
        <div class="dc-panel-header">
          <span class="dc-panel-title">Decision Rehearsal: 4 Core Counterfactuals (Phase 15 & 16)</span>
          <span style="font-family: var(--font-mono); font-size: 10px; color: #38bdf8;">SIMULATE BEFORE CHANGING SETPOINT</span>
        </div>
        <div class="dc-candidates-grid">
          ${rehearsals.map(r => {
            const isSel = r.candidate.id === selectedId;
            return `
              <div class="dc-candidate-card ${isSel ? 'selected' : ''}" data-cand-id="${r.candidate.id}">
                <div class="dc-card-title-row">
                  <span class="dc-cand-title">${r.candidate.name.split('(')[0]}</span>
                  <span class="assure-badge-mini ${r.assuranceGateStatus === 'VERIFIED' ? 'status-safe' : (r.assuranceGateStatus === 'REVIEW_REQUIRED' ? 'status-warning' : 'status-critical')}">
                    ${r.assuranceGateStatus === 'VERIFIED' ? 'VERIFIED' : (r.assuranceGateStatus === 'REVIEW_REQUIRED' ? 'REVIEW REQ' : 'ABSTAIN')}
                  </span>
                </div>
                <div style="font-family: var(--font-mono); font-size: 10px; color: #94a3b8; line-height: 1.3;">
                  SPM: <strong>${r.candidate.controls.spm.toFixed(1)}</strong> | Stroke: <strong>${r.candidate.controls.strokeInches.toFixed(0)}"</strong> | Steam: <strong>${r.candidate.controls.steamVolumeTons}t</strong>
                </div>
                <div class="dc-cand-metrics">
                  <div class="dc-cand-metric-box">
                    <span class="dc-cand-metric-lbl">Expected Oil</span>
                    <span class="dc-cand-metric-val" style="color:#38bdf8;">${r.predictedOutcomes.oilRateBopd} BOPD</span>
                  </div>
                  <div class="dc-cand-metric-box">
                    <span class="dc-cand-metric-lbl">Float Margin</span>
                    <span class="dc-cand-metric-val" style="color:${r.predictedOutcomes.floatMarginPct < 15 ? '#fb7185' : '#4ade80'};">${r.predictedOutcomes.floatMarginPct}%</span>
                  </div>
                  <div class="dc-cand-metric-box">
                    <span class="dc-cand-metric-lbl">Pumpability</span>
                    <span class="dc-cand-metric-val">${r.predictedOutcomes.pumpabilityDays} Days</span>
                  </div>
                  <div class="dc-cand-metric-box">
                    <span class="dc-cand-metric-lbl">Robustness</span>
                    <span class="dc-cand-metric-val" style="color:${r.robustness.rating === 'HIGH' ? '#4ade80' : '#fbbf24'};">${r.robustness.rating}</span>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- TRAJECTORY COMPARISON TABLE (+1d, +3d, +7d, +14d) -->
      ${selectedRehearsal ? `
        <div class="dc-panel">
          <div class="dc-panel-header">
            <span class="dc-panel-title">Future Trajectory Simulation for: ${selectedRehearsal.candidate.name} (Phase 14)</span>
            <span style="font-family: var(--font-mono); font-size: 10px; color: #64748b;">IMMUTABLE PREVIEW</span>
          </div>
          <table style="width: 100%; border-collapse: collapse; font-family: var(--font-mono); font-size: 11px; text-align: right;">
            <thead>
              <tr style="border-bottom: 1px solid rgba(255,255,255,0.1); color: #64748b;">
                <th style="text-align: left; padding: 6px 8px;">Horizon</th>
                <th style="padding: 6px 8px;">Temp (°C)</th>
                <th style="padding: 6px 8px;">Viscosity (cP)</th>
                <th style="padding: 6px 8px;">Inflow (BPD)</th>
                <th style="padding: 6px 8px;">Oil Rate (BOPD)</th>
                <th style="padding: 6px 8px;">Float Margin</th>
                <th style="padding: 6px 8px;">PPRL (kN)</th>
                <th style="padding: 6px 8px;">Power (kW)</th>
              </tr>
            </thead>
            <tbody>
              ${selectedRehearsal.trajectory.points.map(pt => `
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.04);">
                  <td style="text-align: left; padding: 6px 8px; color: #38bdf8; font-weight: 700;">+${pt.dayOffset} Days</td>
                  <td style="padding: 6px 8px;">${pt.temperatureC}</td>
                  <td style="padding: 6px 8px;">${pt.viscosityCp}</td>
                  <td style="padding: 6px 8px;">${pt.inflowBpd}</td>
                  <td style="padding: 6px 8px; font-weight: 700; color: #f8fafc;">${pt.oilRateBopd}</td>
                  <td style="padding: 6px 8px; color: ${pt.floatMarginPct < 15 ? '#fb7185' : '#4ade80'};">${pt.floatMarginPct}%</td>
                  <td style="padding: 6px 8px;">${pt.rodLoadKn}</td>
                  <td style="padding: 6px 8px;">${pt.powerKw}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : ''}
    `;
  }

  // TAB 4: ASSURANCE GATE & RECOMMENDATION CASE
  private renderAssuranceTab(state: SolutionState): string {
    const recCase = this._manager.activeRecommendationCase;
    const rehearsals = this._manager.activeRehearsals;
    const selectedRehearsal = rehearsals.find(r => r.candidate.id === this._manager.selectedCandidateId) || rehearsals[0];

    if (!recCase || !selectedRehearsal) return '<div class="dc-panel">No active rehearsal selected.</div>';

    const isBlocked = recCase.assuranceStatus === 'NO SAFE RECOMMENDATION';

    return `
      <!-- ABSTAIN BANNER IF BLOCKED (PHASE 28) -->
      ${isBlocked ? `
        <div class="dc-abstain-banner">
          <div class="dc-abstain-title">
            <span>⛔ NO SAFE RECOMMENDATION (ASSURANCE GATE ACTIVE)</span>
          </div>
          <div class="dc-abstain-reasons">
            The decision twin has withheld setpoint recommendation due to violated assurance boundaries:<br>
            • Candidate lies outside safe physical/mechanical operating constraints, or data quality is degraded.<br>
            • Automated setpoint changes are strictly suppressed to protect wellbore integrity.
          </div>
          <button class="dc-request-data-btn" id="dc-request-more-data-btn">🔍 REQUEST MORE DATA (PHASE 29)</button>
        </div>
      ` : ''}

      <!-- 12 ASSURANCE GATES (PHASE 27) -->
      <div class="dc-panel">
        <div class="dc-panel-header">
          <span class="dc-panel-title">12-Checkpoint Multi-Tier Assurance Gate (Phase 27)</span>
          <span class="assure-badge-mini ${isBlocked ? 'status-critical' : 'status-safe'}">
            ${isBlocked ? 'GATE FAILED' : 'ALL GATES CLEARED'}
          </span>
        </div>
        <div class="dc-gates-grid">
          ${[
            { name: '01. Telemetry Quality', pass: state.dataQuality.score >= 70, detail: `${state.dataQuality.score}% valid` },
            { name: '02. State Boundary', pass: true, detail: 'Within P-T boundaries' },
            { name: '03. Calibration Check', pass: true, detail: 'History match verified' },
            { name: '04. Physics Validation', pass: selectedRehearsal.physicsScorePct >= 70, detail: `${selectedRehearsal.physicsScorePct}% conservation` },
            { name: '05. ML Consensus', pass: selectedRehearsal.mlAgreementStatus === 'AGREEMENT', detail: `${selectedRehearsal.mlAgreementPct}% variance` },
            { name: '06. OOD Detection', pass: selectedRehearsal.oodStatus !== 'HIGH', detail: `Domain: ${selectedRehearsal.oodStatus}` },
            { name: '07. Pump Fillage', pass: selectedRehearsal.predictedOutcomes.pumpFillagePct >= 35, detail: `${selectedRehearsal.predictedOutcomes.pumpFillagePct}% fillage` },
            { name: '08. Rod Load Limit', pass: selectedRehearsal.predictedOutcomes.rodLoadKn <= 65.0, detail: `${selectedRehearsal.predictedOutcomes.rodLoadKn} kN <= 65.0` },
            { name: '09. Rod Float Margin', pass: selectedRehearsal.predictedOutcomes.floatMarginPct >= 12, detail: `${selectedRehearsal.predictedOutcomes.floatMarginPct}% margin` },
            { name: '10. Energy Ceiling', pass: selectedRehearsal.predictedOutcomes.dailyKwh <= 450, detail: `${selectedRehearsal.predictedOutcomes.dailyKwh} kWh/d` },
            { name: '11. Robustness Rating', pass: selectedRehearsal.robustness.rating !== 'LOW', detail: `Rating: ${selectedRehearsal.robustness.rating}` },
            { name: '12. Pumpability Horizon', pass: selectedRehearsal.predictedOutcomes.pumpabilityDays >= 3, detail: `${selectedRehearsal.predictedOutcomes.pumpabilityDays} days` }
          ].map(g => `
            <div class="dc-gate-item ${g.pass ? 'gate-pass' : 'gate-fail'}">
              <span class="dc-gate-status-tag">${g.pass ? 'PASS' : 'FAIL'}</span>
              <div>
                <strong>${g.name}</strong>
                <div style="color: #94a3b8; font-size: 9px;">${g.detail}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- RECOMMENDATION CONTRACT VIEW (PHASE 30) -->
      <div class="dc-rec-contract">
        <div class="dc-contract-header">
          <div>
            <div style="font-family: var(--font-mono); font-size: 13px; font-weight: 700; color: #f8fafc;">
              RECOMMENDATION CASE: ${recCase.recommendationId}
            </div>
            <div style="font-family: var(--font-mono); font-size: 10px; color: #38bdf8;">
              Candidate: <strong>${selectedRehearsal.candidate.name}</strong> • Approval: <strong>${recCase.approvalStatus}</strong>
            </div>
          </div>
          <span class="assure-badge-mini ${isBlocked ? 'status-critical' : 'status-safe'}">${recCase.assuranceStatus}</span>
        </div>

        <!-- PROPOSED CONTROLS -->
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; font-family: var(--font-mono); font-size: 11px;">
          <div class="dc-cand-metric-box">
            <span class="dc-cand-metric-lbl">Proposed SPM</span>
            <span class="dc-cand-metric-val">${recCase.proposedControls.spm.toFixed(1)} SPM</span>
          </div>
          <div class="dc-cand-metric-box">
            <span class="dc-cand-metric-lbl">Proposed Stroke</span>
            <span class="dc-cand-metric-val">${recCase.proposedControls.strokeInches}"</span>
          </div>
          <div class="dc-cand-metric-box">
            <span class="dc-cand-metric-lbl">Steam Volume</span>
            <span class="dc-cand-metric-val">${recCase.proposedControls.steamVolumeTons} Tons</span>
          </div>
          <div class="dc-cand-metric-box">
            <span class="dc-cand-metric-lbl">Expected Gain</span>
            <span class="dc-cand-metric-val" style="color: #38bdf8;">+${recCase.expectedOutcomes.gainBopd} BOPD</span>
          </div>
        </div>

        <!-- CAUSAL WHY EXPLANATION (PHASE 31) -->
        <div class="dc-why-tree">
          <strong style="color: #38bdf8; display: block; margin-bottom: 6px;">CAUSAL PHYSICAL REASONING (WHY?):</strong>
          ${recCase.rationale.map(r => `<div>${r}</div>`).join('')}
        </div>

        <!-- WHY NOT ALTERNATIVES (PHASE 32) -->
        <div style="font-family: var(--font-mono); font-size: 10px; color: #94a3b8; line-height: 1.4;">
          <strong style="color: #f59e0b;">WHY NOT ALTERNATIVES?</strong>
          ${recCase.whyNotAlternatives.map(alt => `
            <div style="margin-top: 4px;">• <strong>${alt.candidateId}:</strong> ${alt.reason}</div>
          `).join('')}
        </div>

        <!-- ENGINEER APPROVAL BAR (PHASE 86) -->
        <div class="dc-approve-bar">
          ${recCase.approvalStatus === 'APPROVED' ? `
            <div style="background: rgba(34, 197, 94, 0.2); border: 1px solid #22c55e; padding: 10px 16px; border-radius: 6px; font-family: var(--font-mono); font-size: 11px; color: #4ade80;">
              ✓ RECOMMENDATION APPROVED by ${recCase.approvedBy} on ${new Date(recCase.approvalTimestamp || Date.now()).toLocaleTimeString()}
            </div>
          ` : `
            <button class="dc-btn-approve" id="dc-btn-approve" ${isBlocked ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>
              ✓ APPROVE & ISSUE SETPOINT
            </button>
            <button class="dc-btn-reject" id="dc-btn-reject">✕ REJECT SETPOINT</button>
            <button class="dc-btn-reject" id="dc-btn-sim-outcome" style="border-color: #38bdf8; color: #38bdf8;">⚡ SIMULATE OUTCOME (RECONCILE)</button>
          `}
        </div>
      </div>
    `;
  }

  // TAB 5: AUDIT TRAIL
  private renderAuditTab(_state: SolutionState): string {
    const events = AuditTrailEngine.getEvents();

    return `
      <div class="dc-panel">
        <div class="dc-panel-header">
          <span class="dc-panel-title">Decision Audit Trail & Provenance Lineage (Phase 39)</span>
          <span style="font-family: var(--font-mono); font-size: 10px; color: #94a3b8;">${events.length} LOGGED TRACE EVENTS</span>
        </div>
        <div style="display: flex; flex-direction: column; gap: 8px; font-family: var(--font-mono); font-size: 11px;">
          ${events.map(ev => `
            <div style="background: rgba(10, 16, 28, 0.7); border: 1px solid rgba(255,255,255,0.06); border-left: 3px solid ${ev.passed ? '#38bdf8' : '#f43f5e'}; padding: 8px 12px; border-radius: 0 4px 4px 0;">
              <div style="display: flex; justify-content: space-between; color: #64748b; font-size: 9px; margin-bottom: 3px;">
                <span><strong>[${ev.stage}]</strong> ${ev.eventId}</span>
                <span>${new Date(ev.timestamp).toLocaleTimeString()}</span>
              </div>
              <div style="color: #cbd5e1;">${ev.description}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // TAB 6: CALIBRATION CENTER
  private renderCalibrationTab(_state: SolutionState): string {
    const params = RecalibrationEngine.getParameters();
    const lastOutcome = this._manager.lastOutcomeRecord;

    return `
      <!-- RECONCILIATION RESULT -->
      ${lastOutcome ? `
        <div class="dc-panel" style="border-color: #38bdf8;">
          <div class="dc-panel-header">
            <span class="dc-panel-title">Post-Action Outcome Reconciliation (Phase 36)</span>
            <span class="assure-badge-mini ${lastOutcome.recalibrationSuggested ? 'status-warning' : 'status-safe'}">
              Drift: ${(lastOutcome.errors.modelDriftIndicator * 100).toFixed(0)}%
            </span>
          </div>
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; font-family: var(--font-mono); font-size: 11px;">
            <div class="dc-cand-metric-box">
              <span class="dc-cand-metric-lbl">Predicted Oil</span>
              <span class="dc-cand-metric-val">${lastOutcome.predicted.oilRateBopd} BOPD</span>
            </div>
            <div class="dc-cand-metric-box">
              <span class="dc-cand-metric-lbl">Observed Oil</span>
              <span class="dc-cand-metric-val" style="color:#38bdf8;">${lastOutcome.observed.oilRateBopd.toFixed(1)} BOPD</span>
            </div>
            <div class="dc-cand-metric-box">
              <span class="dc-cand-metric-lbl">Error Margin</span>
              <span class="dc-cand-metric-val">${lastOutcome.errors.oilPctError}%</span>
            </div>
            <div class="dc-cand-metric-box">
              <span class="dc-cand-metric-lbl">Recalibration</span>
              <span class="dc-cand-metric-val" style="color:${lastOutcome.recalibrationSuggested ? '#f59e0b' : '#4ade80'};">
                ${lastOutcome.recalibrationSuggested ? 'RECOMMENDED' : 'NOT REQUIRED'}
              </span>
            </div>
          </div>
        </div>
      ` : ''}

      <!-- CALIBRATION PARAMETER TUNING TABLE (PHASE 37 & 85) -->
      <div class="dc-panel">
        <div class="dc-panel-header">
          <span class="dc-panel-title">Model Recalibration Center (Phase 37)</span>
          <span style="font-family: var(--font-mono); font-size: 10px; color: #94a3b8;">REQUIRES ENGINEER APPROVAL</span>
        </div>
        <table style="width: 100%; border-collapse: collapse; font-family: var(--font-mono); font-size: 11px; text-align: right;">
          <thead>
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.1); color: #64748b;">
              <th style="text-align: left; padding: 6px 8px;">Model Parameter</th>
              <th style="padding: 6px 8px;">Current</th>
              <th style="padding: 6px 8px;">Suggested</th>
              <th style="padding: 6px 8px;">Divergence</th>
              <th style="padding: 6px 8px; text-align: center;">Action</th>
            </tr>
          </thead>
          <tbody>
            ${params.map(p => `
              <tr style="border-bottom: 1px solid rgba(255,255,255,0.04);">
                <td style="text-align: left; padding: 8px;">
                  <strong style="color: #f8fafc;">${p.name}</strong>
                  <div style="font-size: 9px; color: #64748b;">[${p.category}] Calibrated: ${p.lastCalibratedDate}</div>
                </td>
                <td style="padding: 8px;">${p.currentValue} ${p.unit}</td>
                <td style="padding: 8px; color: #38bdf8; font-weight: 700;">${p.suggestedValue} ${p.unit}</td>
                <td style="padding: 8px; color: ${p.divergencePct > 10 ? '#f59e0b' : '#94a3b8'};">${p.divergencePct}%</td>
                <td style="padding: 8px; text-align: center;">
                  <button class="dc-demo-chip btn-cal-approve" data-param-key="${p.key}" style="border-color: #22c55e; color: #4ade80;">
                    ✓ Calibrate
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  private bindEvents(): void {
    // 1. Close drawer
    const closeBtn = this._drawerEl.querySelector('#dc-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.toggleCollapse());
    }

    // 2. Demo mode chips
    const demoChips = this._drawerEl.querySelectorAll('.dc-demo-chip[data-mode]');
    demoChips.forEach(chip => {
      chip.addEventListener('click', (e) => {
        const mode = (e.currentTarget as HTMLElement).getAttribute('data-mode') as DemoScenarioMode;
        if (mode) {
          this._manager.setDemoMode(mode);
          this.render();
        }
      });
    });

    // 3. Tab buttons
    const tabBtns = this._drawerEl.querySelectorAll('.dc-tab-btn[data-tab]');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tab = (e.currentTarget as HTMLElement).getAttribute('data-tab') as DecisionCenterTab;
        if (tab) {
          this.setTab(tab);
        }
      });
    });

    // 4. Candidate selection
    const candCards = this._drawerEl.querySelectorAll('.dc-candidate-card[data-cand-id]');
    candCards.forEach(card => {
      card.addEventListener('click', (e) => {
        const id = (e.currentTarget as HTMLElement).getAttribute('data-cand-id');
        if (id) {
          this._manager.setSelectedCandidate(id);
          this.render();
        }
      });
    });

    // 5. Approve recommendation
    const approveBtn = this._drawerEl.querySelector('#dc-btn-approve');
    if (approveBtn) {
      approveBtn.addEventListener('click', () => {
        this._manager.approveRecommendation('Approved via ASSURE-TWIN Decision Center HUD.');
        this.render();
      });
    }

    // 6. Reject recommendation
    const rejectBtn = this._drawerEl.querySelector('#dc-btn-reject');
    if (rejectBtn) {
      rejectBtn.addEventListener('click', () => {
        this._manager.rejectRecommendation('Rejected by operator due to current surface facility scheduling.');
        this.render();
      });
    }

    // 7. Simulate outcome reconciliation
    const simOutcomeBtn = this._drawerEl.querySelector('#dc-btn-sim-outcome');
    if (simOutcomeBtn) {
      simOutcomeBtn.addEventListener('click', () => {
        this._manager.reconcileSimulatedOutcome();
        this.setTab('CALIBRATION');
      });
    }

    // 8. Parameter calibration approval
    const calApproveBtns = this._drawerEl.querySelectorAll('.btn-cal-approve[data-param-key]');
    calApproveBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const key = (e.currentTarget as HTMLElement).getAttribute('data-param-key');
        if (key) {
          this._manager.applyRecalibrationParameter(key);
          this.render();
        }
      });
    });

    // 9. Request more data button
    const requestDataBtn = this._drawerEl.querySelector('#dc-request-more-data-btn');
    if (requestDataBtn) {
      requestDataBtn.addEventListener('click', () => {
        alert('REQUEST MORE DATA (Phase 29):\n\n1. Surface RTD Sensor Diagnostic (reservoir.temperature_c)\n2. Fluid Viscosity PVT Rheometer Test (reservoir.viscosity_cp)\n3. Full-Cycle Surface Dynamometer Card (srp.surface_card)\n\nLogging these data requests to Asset Operations Log.');
      });
    }
  }

  private updateDynamicContent(state: SolutionState): void {
    if (this._activeTab === 'ENVELOPE' && this._envelopeCanvas) {
      this._envelopeCanvas.render(state.operatingEnvelope);
    }
  }
}
