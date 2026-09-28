/**
 * src/ui/pages/AssuranceView.ts
 * 12-Checkpoint Multi-Tier Assurance Gate & Mandatory Abstain Protocol Page.
 *
 * Phase 3 integration:
 * - Polls /api/v1/assurance/evaluate every 4s to get REAL physics-gate verdicts.
 * - Falls back to client-side AssuranceEngine report when backend is unreachable.
 * - Gate badge and checks grid updated from whichever source has richer data.
 */

import type { AssureTwinManager } from '../../assure/AssureTwinManager.ts';
import type { SolutionState, DemoScenarioMode } from '../../assure/types.ts';
import { ApiBridge } from '../../api/ApiBridge.ts';
import type { AssuranceResult } from '../../api/client.ts';

// Severity colour map
const STATUS_COLOR: Record<string, string> = {
  PASS:    'var(--accent-green)',
  WARNING: 'var(--accent-amber)',
  FAIL:    'var(--accent-red)'
};

export class AssuranceView {
  private _container: HTMLElement;
  private _assureManager: AssureTwinManager;
  private _bridge: ApiBridge;
  private _backendGate: AssuranceResult | null = null;

  constructor(container: HTMLElement, assureManager: AssureTwinManager) {
    this._container = container;
    this._assureManager = assureManager;
    this._bridge = new ApiBridge();
    this.render();
    this.bindEvents();
    this._startPolling();
  }

  private _startPolling(): void {
    this._bridge.watchAssuranceGate((data) => {
      this._backendGate = data;
      // Immediately re-render gate grid with backend data
      this._renderGateGrid();
    }, 4000);
  }

  private render(): void {
    this._container.innerHTML = `
      <div class="ws-page-container">
        <div class="ws-page-title-row">
          <div>
            <div class="ws-page-title">12-CHECKPOINT MULTI-TIER DECISION ASSURANCE GATE</div>
            <div class="ws-page-sub">Zero-trust gatekeeper suppressing unsafe automated recommendations unless all 12 physics &amp; statistical checks evaluate to PASS</div>
          </div>
          <div style="display: flex; gap: 8px; align-items: center;">
            <span id="asr-backend-source" style="font-size: 8px; font-family: var(--font-mono); color: var(--text-muted); padding: 3px 8px; border-radius: 3px; border: 1px solid rgba(255,255,255,0.08);">
              LOADING BACKEND...
            </span>
            <div id="asr-overall-badge" class="ws-pill-badge safe">ALL GATES CLEARED</div>
          </div>
        </div>

        <!-- DEMO SCENARIO FAULT INJECTION CONTROLS -->
        <div class="ws-card">
          <div class="ws-card-header">
            <span class="ws-card-title">SAFETY VERIFICATION &amp; FAULT INJECTION SANDBOX</span>
            <span style="font-size: 8.5px; color: var(--text-dim); font-family: var(--font-mono);">PHASES 51–53 VERIFICATION</span>
          </div>
          <div class="ws-card-body" style="flex-direction: row; gap: 8px; flex-wrap: wrap;">
            <button class="ws-mode-pill active" data-scenario="NORMAL" id="asr-demo-norm">Normal Operation</button>
            <button class="ws-mode-pill" data-scenario="DEMO_LATE_CSS" id="asr-demo-css">Demo: Late CSS Cooling</button>
            <button class="ws-mode-pill" data-scenario="DEMO_SENSOR_FAILURE" id="asr-demo-sensor">Demo: Sensor Failure</button>
            <button class="ws-mode-pill" data-scenario="DEMO_MODEL_DISAGREEMENT" id="asr-demo-disagree">Demo: Model Disagreement</button>
            <button class="ws-mode-pill" data-scenario="DEMO_OOD" id="asr-demo-ood">Demo: Out-of-Domain</button>
          </div>
        </div>

        <!-- GATE SCORE BAR -->
        <div class="ws-card" id="asr-score-card" style="padding: 10px 14px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="font-size: 9px; font-family: var(--font-mono); font-weight: 700; color: var(--text-muted);">OVERALL GATE SCORE</span>
            <span id="asr-score-pct" style="font-size: 18px; font-weight: 700; color: var(--accent-green); font-family: var(--font-mono);">—%</span>
          </div>
          <div style="background: rgba(255,255,255,0.06); border-radius: 4px; height: 8px; overflow: hidden;">
            <div id="asr-score-bar" style="height: 100%; width: 0%; background: var(--accent-green); border-radius: 4px; transition: width 0.6s ease;"></div>
          </div>
          <div style="display: flex; gap: 16px; margin-top: 8px; font-size: 9px; font-family: var(--font-mono);">
            <span>✓ PASS: <b id="asr-pass-count" style="color: var(--accent-green);">—</b></span>
            <span>⚠ WARN: <b id="asr-warn-count" style="color: var(--accent-amber);">—</b></span>
            <span>✗ FAIL: <b id="asr-fail-count" style="color: var(--accent-red);">—</b></span>
            <span style="margin-left: auto; color: var(--text-muted);">ABSTAIN: <b id="asr-abstain-label">—</b></span>
          </div>
        </div>

        <!-- ABSTAIN PROTOCOL BANNER (Visible when gates fail) -->
        <div id="asr-abstain-banner" style="display: none; padding: 12px; background: rgba(239, 68, 68, 0.12); border: 1px solid rgba(239, 68, 68, 0.35); border-radius: 6px;">
          <div style="font-size: 12px; font-weight: 700; color: var(--accent-red); font-family: var(--font-mono);">
            ⛔ NO SAFE RECOMMENDATION (ASSURANCE GATE ACTIVE)
          </div>
          <div id="asr-blocking-reasons" style="font-size: 9.5px; color: #f1f5f9; margin-top: 4px; line-height: 1.4;">
            The decision twin has withheld setpoint recommendation due to violated assurance boundaries.
          </div>
          <div style="margin-top: 8px;">
            <button class="ws-btn-full-rec" id="asr-btn-more-data" style="background: var(--accent-amber); color: #000; font-weight: 700;">
              🔍 REQUEST MORE DATA (PHASE 29)
            </button>
          </div>
        </div>

        <!-- 12-GATES GRID -->
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;" id="asr-gates-grid">
          <!-- Populated dynamically -->
        </div>
      </div>
    `;
  }

  private bindEvents(): void {
    const demoBtns = this._container.querySelectorAll('.ws-mode-pill');
    demoBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        demoBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const mode = btn.getAttribute('data-scenario') as DemoScenarioMode;
        if (mode) {
          this._assureManager.setDemoMode(mode);
        }
      });
    });

    this._container.querySelector('#asr-btn-more-data')?.addEventListener('click', () => {
      alert('Diagnostic Protocol Engaged:\n1. Calibrate surface pressure sensor transducer.\n2. Ingest latest acoustic fluid level survey.\n3. Run dynamic rheology sweep on wellhead sample.');
    });
  }

  private _renderGateGrid(): void {
    const gate = this._backendGate;
    if (!gate) return;

    // Update source badge
    const sourceBadge = this._container.querySelector('#asr-backend-source') as HTMLElement;
    if (sourceBadge) {
      sourceBadge.textContent = '● BACKEND';
      sourceBadge.style.color = 'var(--accent-green)';
      sourceBadge.style.borderColor = 'rgba(16, 185, 129, 0.3)';
    }

    const isPass = gate.overall_pass;

    // Overall badge
    const badge = this._container.querySelector('#asr-overall-badge');
    if (badge) {
      badge.textContent = isPass ? 'ALL GATES CLEARED' : (gate.abstain_active ? 'GATE ABSTAIN' : 'GATE FAILED');
      badge.className = `ws-pill-badge ${isPass ? 'safe' : (gate.abstain_active ? 'warning' : 'critical')}`;
    }

    // Score bar
    const pct = this._container.querySelector('#asr-score-pct') as HTMLElement;
    const bar = this._container.querySelector('#asr-score-bar') as HTMLElement;
    if (pct && bar) {
      const score = gate.gate_score_pct ?? 0;
      pct.textContent = `${score.toFixed(1)}%`;
      pct.style.color = score >= 75 ? 'var(--accent-green)' : score >= 50 ? 'var(--accent-amber)' : 'var(--accent-red)';
      bar.style.width = `${score}%`;
      bar.style.background = score >= 75 ? 'var(--accent-green)' : score >= 50 ? 'var(--accent-amber)' : 'var(--accent-red)';
    }

    // Counts
    const checks = gate.checks ?? [];
    const passCount = checks.filter(c => c.status === 'PASS').length;
    const warnCount = checks.filter(c => c.status === 'WARNING').length;
    const failCount = checks.filter(c => c.status === 'FAIL').length;
    const passEl = this._container.querySelector('#asr-pass-count') as HTMLElement;
    const warnEl = this._container.querySelector('#asr-warn-count') as HTMLElement;
    const failEl = this._container.querySelector('#asr-fail-count') as HTMLElement;
    const abstainEl = this._container.querySelector('#asr-abstain-label') as HTMLElement;
    if (passEl) passEl.textContent = String(passCount);
    if (warnEl) warnEl.textContent = String(warnCount);
    if (failEl) failEl.textContent = String(failCount);
    if (abstainEl) abstainEl.textContent = gate.abstain_active ? 'ACTIVE' : 'INACTIVE';

    // Abstain banner
    const abstainBanner = this._container.querySelector('#asr-abstain-banner') as HTMLElement;
    if (abstainBanner) {
      abstainBanner.style.display = isPass ? 'none' : 'block';
      if (!isPass && gate.blocking_reasons?.length) {
        const reasonsEl = this._container.querySelector('#asr-blocking-reasons') as HTMLElement;
        if (reasonsEl) {
          reasonsEl.innerHTML = gate.blocking_reasons.map(r =>
            `<div style="margin-top: 3px;">• ${r}</div>`
          ).join('');
        }
      }
    }

    // Gate cards
    const grid = this._container.querySelector('#asr-gates-grid');
    if (grid && checks.length > 0) {
      grid.innerHTML = checks.map((g, idx) => `
        <div class="ws-card" style="padding: 8px; border-left: 3px solid ${STATUS_COLOR[g.status] ?? 'var(--accent-red)'};">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 8.5px; font-weight: 700; color: var(--text-muted); font-family: var(--font-mono);">
              ${(idx + 1).toString().padStart(2, '0')}. ${(g.name ?? '').toUpperCase()}
            </span>
            <span class="ws-pill-badge ${g.status === 'PASS' ? 'safe' : g.status === 'WARNING' ? 'warning' : 'critical'}">${g.status}</span>
          </div>
          <div style="font-size: 11px; font-weight: 600; color: #ffffff; margin-top: 4px;">
            ${g.detail ?? ''}
          </div>
          <div style="font-size: 8px; color: var(--text-muted); margin-top: 3px; font-family: var(--font-mono);">
            ${g.category ?? ''}
          </div>
        </div>
      `).join('');
    }
  }

  public update(_solutionState: SolutionState): void {
    // If backend data arrived, it's already rendered in _renderGateGrid().
    // Fall back to client-side AssuranceEngine when backend is null.
    if (this._backendGate) return;

    const report = this._assureManager.evaluateCurrentAssurance();
    if (!report) return;
    const isPass = report.allowRecommendation;

    // Update source badge
    const sourceBadge = this._container.querySelector('#asr-backend-source') as HTMLElement;
    if (sourceBadge) {
      sourceBadge.textContent = '○ LOCAL FALLBACK';
      sourceBadge.style.color = 'var(--accent-amber)';
    }

    const badge = this._container.querySelector('#asr-overall-badge');
    if (badge) {
      badge.textContent = isPass ? 'ALL GATES CLEARED' : 'GATE FAILED';
      badge.className = `ws-pill-badge ${isPass ? 'safe' : 'critical'}`;
    }

    const abstainBanner = this._container.querySelector('#asr-abstain-banner') as HTMLElement;
    if (abstainBanner) {
      abstainBanner.style.display = isPass ? 'none' : 'block';
    }

    const grid = this._container.querySelector('#asr-gates-grid');
    if (grid) {
      grid.innerHTML = report.checks.map((g, idx) => `
        <div class="ws-card" style="padding: 8px; border-left: 3px solid ${g.passed ? 'var(--accent-green)' : 'var(--accent-red)'};">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 8.5px; font-weight: 700; color: var(--text-muted); font-family: var(--font-mono);">
              ${(idx + 1).toString().padStart(2, '0')}. ${g.name.toUpperCase()}
            </span>
            <span class="ws-pill-badge ${g.passed ? 'safe' : 'critical'}">${g.passed ? 'PASS' : 'FAIL'}</span>
          </div>
          <div style="font-size: 11px; font-weight: 600; color: #ffffff; margin-top: 4px;">
            ${g.detail}
          </div>
        </div>
      `).join('');
    }
  }

  public destroy(): void {
    this._bridge.stop();
  }
}
