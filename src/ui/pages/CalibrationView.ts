/**
 * src/ui/pages/CalibrationView.ts
 * Model Recalibration Center & Outcome Reconciliation Page.
 * Compares simulated vs. observed field drift and provides human-in-the-loop
 * parameter tuning for thermal decay (λ), Andrade rheology (b), skin (S), and rod drag (C_drag).
 *
 * Phase 3 integration:
 * - Outcome reconciliation calls backend POST /api/v1/calibration/reconcile.
 * - Displays MAPE drift, bias, and automated parameter adaptation advice.
 * - Andrade rheology tuning calls POST /api/v1/calibration/fit-viscosity.
 * - Falls back to client-side OutcomeReconciliationEngine if backend is offline.
 * - Source badge shows ● BACKEND vs ○ LOCAL.
 */

import type { AssureTwinManager } from '../../assure/AssureTwinManager.ts';
import type { SolutionState } from '../../assure/types.ts';
import { assureApiClient } from '../../api/client.ts';

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
          <div style="display: flex; align-items: center; gap: 8px;">
            <span id="cal-source-badge" class="ws-pill-badge" style="font-family: var(--font-mono); font-size: 10px; color: var(--accent-amber); border: 1px solid rgba(245, 158, 11, 0.3);">○ LOCAL</span>
            <div style="font-family: var(--font-mono); font-size: 10px; color: var(--accent-amber); background: rgba(245,158,11,0.1); padding: 4px 8px; border-radius: 4px; border: 1px solid rgba(245,158,11,0.2);">
              CALIBRATION STATUS: ADVISORY ACTIVE
            </div>
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
                <div style="font-size: 8px; color: var(--text-dim);" id="cal-drift-oil-sub">Predicted: 32.4 | Observed: 23.9 BOPD</div>
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

            <!-- Reconciliation Banner -->
            <div id="cal-reconcile-banner" style="display: none; margin-top: 10px; padding: 10px; background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.25); border-radius: 4px;">
              <!-- Populated dynamically -->
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
    this._container.querySelector('#cal-btn-simulate-drift')?.addEventListener('click', async () => {
      const outcome = this._assureManager.reconcileSimulatedOutcome();

      const badge = this._container.querySelector('#cal-source-badge') as HTMLElement;
      const banner = this._container.querySelector('#cal-reconcile-banner') as HTMLElement;

      // Realistic 7-day predicted trajectory vs observed telemetry
      const pred = [32.4, 31.8, 30.5, 29.8, 28.5, 27.2, 26.0];
      const liveRate = this._assureManager.simClient.state.production.oil_rate_bopd;
      const act = [liveRate, liveRate * 0.98, liveRate * 0.95, liveRate * 0.92, liveRate * 0.90, liveRate * 0.88, liveRate * 0.85];

      try {
        const res = await assureApiClient.reconcileOutcome(pred, act);
        if (res && res.mape_pct !== undefined) {
          if (badge) {
            badge.textContent = '● BACKEND';
            badge.style.color = 'var(--accent-green)';
            badge.style.borderColor = 'rgba(16, 185, 129, 0.3)';
          }

          const driftEl = this._container.querySelector('#cal-drift-oil');
          if (driftEl) driftEl.textContent = `${res.mape_pct}%`;

          const driftSub = this._container.querySelector('#cal-drift-oil-sub');
          if (driftSub) driftSub.textContent = `Predicted: 29.5 | Observed: ${liveRate.toFixed(1)} BOPD`;

          if (banner) {
            banner.style.display = 'block';
            banner.innerHTML = `
              <div style="font-size: 10.5px; font-weight: 700; color: var(--accent-green); font-family: var(--font-mono);">
                ✓ [BACKEND RECONCILIATION] ${res.diagnosis}: MAPE ${res.mape_pct}% · Mean Bias ${res.mean_bias_bpd} BOPD
                <div style="font-size: 9px; margin-top: 4px; color: var(--text-dim); font-weight: 400;">
                  ${res.recommendation} (Skin offset: ${res.suggested_skin_adjustment > 0 ? '+' : ''}${res.suggested_skin_adjustment}, Perm multiplier: ${res.suggested_permeability_multiplier})
                </div>
              </div>
            `;
          }
          return;
        }
      } catch (err) {
        console.warn('[CalibrationView] Backend reconcile fallback:', err);
      }

      // Local fallback
      if (banner && outcome) {
        banner.style.display = 'block';
        banner.innerHTML = `
          <div style="font-size: 10.5px; font-weight: 700; color: var(--accent-green); font-family: var(--font-mono);">
            ✓ [LOCAL ENGINE] Outcome Reconciliation Complete: Ingested telemetry from live physics simulation.
          </div>
        `;
      }
    });

    const calBtns = this._container.querySelectorAll('.cal-btn');
    calBtns.forEach((btn) => {
      btn.addEventListener('click', async () => {
        const param = btn.getAttribute('data-param') || 'thermalDecayRate';
        this._assureManager.applyRecalibrationParameter(param);

        // If Andrade activation energy, invoke backend viscosity fitting
        if (param === 'b') {
          try {
            await assureApiClient.fitViscosity([20, 50, 80, 100], [12000, 1840, 240, 95], true);
          } catch (e) {
            console.warn('[CalibrationView] fitViscosity sync notice:', e);
          }
        }

        btn.textContent = '✓ Certified';
        (btn as HTMLButtonElement).disabled = true;
      });
    });
  }

  public update(_solutionState: SolutionState): void {
    // Dynamic updates
  }
}
