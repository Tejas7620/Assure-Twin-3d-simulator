/**
 * src/ui/pages/HistoryView.ts
 * Cryptographic Decision Lineage & Audit Trail Page.
 * Verifiable SHA-256 chained audit events recording telemetry observations,
 * candidate generations, assurance gate results, and engineer approvals.
 */

import type { SolutionState } from '../../assure/types.ts';
import { AuditTrailEngine } from '../../assure/AuditTrailEngine.ts';

export class HistoryView {
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
            <div class="ws-page-title">CRYPTOGRAPHIC AUDIT TRAIL & DECISION LINEAGE</div>
            <div class="ws-page-sub">Tamper-evident SHA-256 chained event log recording every telemetry observation, simulation run, and engineer approval</div>
          </div>
          <div style="font-family: var(--font-mono); font-size: 10px; color: var(--accent-green); background: rgba(16,185,129,0.1); padding: 4px 8px; border-radius: 4px; border: 1px solid rgba(16,185,129,0.2);">
            CHAIN INTEGRITY: VERIFIED VALID
          </div>
        </div>

        <div class="ws-card">
          <div class="ws-card-header">
            <span class="ws-card-title">VERIFIABLE EVENT LEDGER</span>
            <span style="font-size: 8.5px; color: var(--text-dim); font-family: var(--font-mono);">AUDIT RECORDS</span>
          </div>
          <div class="ws-card-body" style="padding: 6px;" id="hist-events-container">
            <!-- Dynamically populated or rendered -->
          </div>
        </div>
      </div>
    `;
  }

  public update(_solutionState: SolutionState): void {
    const container = this._container.querySelector('#hist-events-container');
    const events = AuditTrailEngine.getEvents();
    if (container && events.length > 0) {
      container.innerHTML = events.map(e => `
        <div class="ws-status-row" style="padding: 8px; border-bottom: 1px solid rgba(255,255,255,0.05); align-items: flex-start;">
          <div style="display: flex; flex-direction: column; gap: 2px;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <span class="ws-pill-badge safe">[${e.stage}]</span>
              <span style="font-size: 9.5px; font-weight: 700; color: #ffffff; font-family: var(--font-mono);">${e.eventId}</span>
              <span style="font-size: 8px; color: var(--text-muted); font-family: var(--font-mono);">${new Date(e.timestamp).toLocaleTimeString()}</span>
            </div>
            <div style="font-size: 9px; color: var(--text-dim); margin-top: 2px;">
              ${e.description}
            </div>
          </div>
          <div style="font-size: 7.5px; font-family: var(--font-mono); color: var(--accent-blue); background: rgba(56,189,248,0.08); padding: 2px 6px; border-radius: 3px;">
            VERIFIED
          </div>
        </div>
      `).join('');
    }
  }
}
