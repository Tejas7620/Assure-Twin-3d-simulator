/**
 * src/ui/pages/AlertsView.ts
 * Real-Time Alert & Anomaly Center.
 * Filter by severity (INFO, WARNING, CRITICAL, BLOCKED), view root-cause diagnostics,
 * and execute acknowledge / dismiss actions.
 */

import type { SolutionState } from '../../assure/types.ts';

export class AlertsView {
  private _container: HTMLElement;

  constructor(container: HTMLElement) {
    this._container = container;
    this.render();
  }

  private render(): void {
    this._container.innerHTML = `
      <div class="ws-page-container">
        <div class="ws-page-title-row">
          <div>
            <div class="ws-page-title">REAL-TIME ALERT & ANOMALY CENTER</div>
            <div class="ws-page-sub">State-driven early warning detection across mechanical boundaries, thermal decay, and telemetry integrity</div>
          </div>
          <div style="display: flex; gap: 6px;">
            <button class="ws-btn-compare" id="al-btn-ack-all">Acknowledge All</button>
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 8px;">
          <!-- Alert 1 -->
          <div class="ws-card" style="border-left: 3px solid var(--accent-amber); padding: 10px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 14px;">⚠️</span>
                <span style="font-size: 11px; font-weight: 700; color: #ffffff;">Pumpability Window Entering Critical Horizon</span>
                <span class="ws-pill-badge warning">WARNING</span>
              </div>
              <span style="font-size: 9px; font-family: var(--font-mono); color: var(--text-muted);">10:31:14 AM</span>
            </div>
            <div style="font-size: 9.5px; color: var(--text-dim); margin-top: 4px;">
              Forecast boundary crossing in 6.4 days. Viscous rod drag is projected to exceed buoyant float margin during downstroke due to near-wellbore cooling (-0.85 °C/d).
            </div>
            <div style="display: flex; gap: 8px; margin-top: 8px;">
              <button class="ws-btn-compare">Acknowledge</button>
              <button class="ws-btn-compare">View Operating Envelope</button>
            </div>
          </div>

          <!-- Alert 2 -->
          <div class="ws-card" style="border-left: 3px solid var(--accent-amber); padding: 10px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 14px;">⚠️</span>
                <span style="font-size: 11px; font-weight: 700; color: #ffffff;">Buoyant Float Margin Below Preferred Operational Floor (6.3%)</span>
                <span class="ws-pill-badge warning">WARNING</span>
              </div>
              <span style="font-size: 9px; font-family: var(--font-mono); color: var(--text-muted);">10:28:02 AM</span>
            </div>
            <div style="font-size: 9.5px; color: var(--text-dim); margin-top: 4px;">
              Downhole float margin is currently 6.3%, below the 25% preferred safety band. Rod compression risk elevated. Recommend derating SPM from 3.2 to 2.8.
            </div>
            <div style="display: flex; gap: 8px; margin-top: 8px;">
              <button class="ws-btn-compare">Acknowledge</button>
              <button class="ws-btn-compare">Inspect Rod String</button>
            </div>
          </div>

          <!-- Alert 3 -->
          <div class="ws-card" style="border-left: 3px solid var(--accent-blue); padding: 10px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 14px;">ℹ️</span>
                <span style="font-size: 11px; font-weight: 700; color: #ffffff;">Next Cyclic Steam Stimulation (CSS) Mobilization Approaching</span>
                <span class="ws-pill-badge safe">INFO</span>
              </div>
              <span style="font-size: 9px; font-family: var(--font-mono); color: var(--text-muted);">10:20:45 AM</span>
            </div>
            <div style="font-size: 9.5px; color: var(--text-dim); margin-top: 4px;">
              Optimal cyclic steam window calculated for Day 43–48. Surface boiler steam allocation (2,400 metric tons) scheduled.
            </div>
            <div style="display: flex; gap: 8px; margin-top: 8px;">
              <button class="ws-btn-compare">Acknowledge</button>
              <button class="ws-btn-compare">View CSS Schedule</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  public update(_solutionState: SolutionState): void {
    // Dynamic updates
  }
}
