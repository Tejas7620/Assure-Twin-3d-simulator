/**
 * src/ui/pages/CalibrationView.ts
 * Model Recalibration Center & Outcome Reconciliation Page.
 * Compares simulated vs. observed field drift and provides human-in-the-loop
 * parameter tuning for thermal decay (λ), Andrade rheology (b), skin (S), and rod drag (C_drag).
 */

import type { AssureTwinManager } from '../../assure/AssureTwinManager.ts';
import type { SolutionState } from '../../assure/types.ts';

export class CalibrationView {
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
            <div class="ws-page-title">MODEL RECALIBRATION & POST-ACTION DRIFT RECONCILIATION</div>
            <div class="ws-page-sub">Adaptive parameter estimation comparing predicted trajectories against actual field production outcomes</div>
          </div>
          <div style="font-family: var(--font-mono); font-size: 10px; color: var(--accent-amber); background: rgba(245,158,11,0.1); padding: 4px 8px; border-radius: 4px; border: 1px solid rgba(245,158,11,0.2);">
            CALIBRATION STATUS: ADVISORY ACTIVE
          </div>
        </div>

        <!-- OUTCOME DRIFT REVIEW -->
        <div class="ws-card">
          <div class="ws-card-header">
            <span class="ws-card-title">OUTCOME RECONCILIATION & ERROR DRIFT METRICS (LAST 7-DAY ROLLING WINDOW)</span>
            <button class="ws-btn-compare" id="cal-btn-simulate-drift">⚡ SIMULATE OUTCOME (RECONCILE)</button>
          </div>
          <div class="ws-card-body">
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;">
              <div class="ws-card" style="padding: 8px;">
                <div style="font-size: 8px; font-weight: 700; color: var(--text-muted); font-family: var(--font-mono);">CRUDE PRODUCTION DRIFT</div>
                <div style="font-size: 16px; font-weight: 700; color: var(--accent-amber); font-family: var(--font-mono); margin: 3px 0;" id="cal-drift-oil">35.7 %</div>
                <div style="font-size: 8px; color: var(--text-dim);">Predicted: 32.4 | Observed: 23.9 BOPD</div>
              </div>
              <div class="ws-card" style="padding: 8px;">
                <div style="font-size: 8px; font-weight: 700; color: var(--text-muted); font-family: var(--font-mono);">TEMPERATURE ERROR</div>
                <div style="font-size: 16px; font-weight: 700; color: var(--accent-green); font-family: var(--font-mono); margin: 3px 0;">2.1 °C</div>
                <div style="font-size: 8px; color: var(--text-dim);">Predicted: 72.6 | Observed: 70.5 °C</div>
              </div>
              <div class="ws-card" style="padding: 8px;">
                <div style="font-size: 8px; font-weight: 700; color: var(--text-muted); font-family: var(--font-mono);">PEAK LOAD DISCREPANCY</div>
                <div style="font-size: 16px; font-weight: 700; color: var(--accent-green); font-family: var(--font-mono); margin: 3px 0;">1.4 kN</div>
                <div style="font-size: 8px; color: var(--text-dim);">Predicted: 18.7 | Observed: 17.3 kN</div>
              </div>
              <div class="ws-card" style="padding: 8px;">
                <div style="font-size: 8px; font-weight: 700; color: var(--text-muted); font-family: var(--font-mono);">SOR RESIDUAL DRIFT</div>
                <div style="font-size: 16px; font-weight: 700; color: var(--accent-cyan); font-family: var(--font-mono); margin: 3px 0;">0.8 t/t</div>
                <div style="font-size: 8px; color: var(--text-dim);">Predicted: 6.7 | Observed: 7.5 t/t</div>
              </div>
            </div>
          </div>
        </div>

        <!-- PARAMETER TUNING INVENTORY -->
        <div class="ws-card">
          <div class="ws-card-header">
            <span class="ws-card-title">PHYSICS MODEL PARAMETER TUNING ADVISOR</span>
            <span style="font-size: 8.5px; color: var(--text-dim); font-family: var(--font-mono);">REQUIRES ENGINEER AUTHORIZATION</span>
          </div>
          <div class="ws-card-body" style="padding: 6px;">
            <table class="ws-scenario-table">
              <thead>
                <tr>
                  <th>MODEL PARAMETER</th>
                  <th>CURRENT CALIBRATION</th>
                  <th>SUGGESTED TUNING</th>
                  <th>DIVERGENCE</th>
                  <th>ACTION</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <div style="font-weight: 700;">Overburden Heat Loss Constant (λ)</div>
                    <div style="font-size: 7.5px; color: var(--text-muted);">[THERMAL] Calibrated: 2026-08-15</div>
                  </td>
                  <td>0.022 day^-1</td>
                  <td style="color: var(--accent-blue); font-weight: 700;">0.025 day^-1</td>
                  <td style="color: var(--accent-amber);">13.6%</td>
                  <td><button class="ws-btn-compare cal-btn" data-param="lambda">✓ Calibrate</button></td>
                </tr>
                <tr>
                  <td>
                    <div style="font-weight: 700;">Andrade Rheology Activation Energy (b)</div>
                    <div style="font-size: 7.5px; color: var(--text-muted);">[RHEOLOGY] Calibrated: 2026-07-22</div>
                  </td>
                  <td>3,800 K</td>
                  <td style="color: var(--accent-blue); font-weight: 700;">3,920 K</td>
                  <td style="color: var(--accent-green);">3.1%</td>
                  <td><button class="ws-btn-compare cal-btn" data-param="b">✓ Calibrate</button></td>
                </tr>
                <tr>
                  <td>
                    <div style="font-weight: 700;">Near-Wellbore Mechanical Skin (S)</div>
                    <div style="font-size: 7.5px; color: var(--text-muted);">[RESERVOIR] Calibrated: 2026-06-10</div>
                  </td>
                  <td>2.5 dimensionless</td>
                  <td style="color: var(--accent-blue); font-weight: 700;">3.2 dimensionless</td>
                  <td style="color: var(--accent-red);">28.0%</td>
                  <td><button class="ws-btn-compare cal-btn" data-param="skin">✓ Calibrate</button></td>
                </tr>
                <tr>
                  <td>
                    <div style="font-weight: 700;">Annular Couette Rod Drag Multiplier</div>
                    <div style="font-size: 7.5px; color: var(--text-muted);">[MECHANICAL] Calibrated: 2026-08-01</div>
                  </td>
                  <td>0.18 factor</td>
                  <td style="color: var(--accent-blue); font-weight: 700;">0.195 factor</td>
                  <td style="color: var(--accent-amber);">8.3%</td>
                  <td><button class="ws-btn-compare cal-btn" data-param="drag">✓ Calibrate</button></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  private bindEvents(): void {
    this._container.querySelector('#cal-btn-simulate-drift')?.addEventListener('click', () => {
      this._assureManager.reconcileSimulatedOutcome();
      alert('Outcome reconciliation complete: Ingested +7-day production telemetry. Model drift calculated.');
    });

    const calBtns = this._container.querySelectorAll('.cal-btn');
    calBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const param = btn.getAttribute('data-param') || 'thermalDecayRate';
        this._assureManager.applyRecalibrationParameter(param);
        btn.textContent = '✓ Certified';
        (btn as HTMLButtonElement).disabled = true;
      });
    });
  }

  public update(_solutionState: SolutionState): void {
    // Dynamic updates
  }
}
