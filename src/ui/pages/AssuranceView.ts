/**
 * src/ui/pages/AssuranceView.ts
 * 12-Checkpoint Multi-Tier Assurance Gate & Mandatory Abstain Protocol Page.
 * Verifies all 12 safety gates, provides interactive demo scenario triggers,
 * and displays the "NO SAFE RECOMMENDATION" abstain protocol upon sensor/model degradation.
 */

import type { AssureTwinManager } from '../../assure/AssureTwinManager.ts';
import type { SolutionState, DemoScenarioMode } from '../../assure/types.ts';

export class AssuranceView {
  private _container: HTMLElement;
  private _assureManager: AssureTwinManager;

  constructor(container: HTMLElement, assureManager: AssureTwinManager) {
    this._container = container;
    this._assureManager = assureManager;
    this.render();
    this.bindEvents();
  }

  private render(): void {
    this._container.innerHTML = `
      <div class="ws-page-container">
        <div class="ws-page-title-row">
          <div>
            <div class="ws-page-title">12-CHECKPOINT MULTI-TIER DECISION ASSURANCE GATE</div>
            <div class="ws-page-sub">Zero-trust gatekeeper suppressing unsafe automated recommendations unless all 12 physics & statistical checks evaluate to PASS</div>
          </div>
          <div id="asr-overall-badge" class="ws-pill-badge safe">ALL GATES CLEARED</div>
        </div>

        <!-- DEMO SCENARIO FAULT INJECTION CONTROLS -->
        <div class="ws-card">
          <div class="ws-card-header">
            <span class="ws-card-title">SAFETY VERIFICATION & FAULT INJECTION SANDBOX</span>
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

        <!-- ABSTAIN PROTOCOL BANNER (Visible when gates fail) -->
        <div id="asr-abstain-banner" style="display: none; padding: 12px; background: rgba(239, 68, 68, 0.12); border: 1px solid rgba(239, 68, 68, 0.35); border-radius: 6px;">
          <div style="font-size: 12px; font-weight: 700; color: var(--accent-red); font-family: var(--font-mono);">
            ⛔ NO SAFE RECOMMENDATION (ASSURANCE GATE ACTIVE)
          </div>
          <div style="font-size: 9.5px; color: #f1f5f9; margin-top: 4px; line-height: 1.4;">
            The decision twin has withheld setpoint recommendation due to violated assurance boundaries. Automated setpoint changes are strictly suppressed to protect wellbore integrity.
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

  public update(_solutionState: SolutionState): void {
    const report = this._assureManager.evaluateCurrentAssurance();
    if (!report) return;
    const isPass = report.allowRecommendation;

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
}
