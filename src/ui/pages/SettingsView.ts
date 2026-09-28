/**
 * src/ui/pages/SettingsView.ts
 * Workstation Settings & System Configuration Page.
 * Configures engineering unit systems, simulation playback clocks,
 * mechanical safety thresholds, and optimization objective defaults.
 */

export class SettingsView {
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
            <div class="ws-page-title">SYSTEM CONFIGURATION & ENGINEERING SETTINGS</div>
            <div class="ws-page-sub">Centralized unit conversions, safety threshold overrides, and digital twin versioning</div>
          </div>
          <div style="font-family: var(--font-mono); font-size: 10px; color: var(--accent-green); background: rgba(16,185,129,0.1); padding: 4px 8px; border-radius: 4px; border: 1px solid rgba(16,185,129,0.2);">
            VERSION: ASSURE-TWIN 2.4.0 (BUILD 2026.09)
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <!-- Unit System -->
          <div class="ws-card">
            <div class="ws-card-header">
              <span class="ws-card-title">1. ENGINEERING UNIT SYSTEM</span>
            </div>
            <div class="ws-card-body">
              <div class="ws-control-item">
                <span class="ws-control-name">ACTIVE SYSTEM</span>
                <select style="background: rgba(255,255,255,0.05); color: #fff; border: 1px solid var(--border-subtle); padding: 6px; border-radius: 4px; font-family: var(--font-mono); font-size: 11px;">
                  <option selected>OILFIELD STANDARD (BOPD, bar, °C, in, kN)</option>
                  <option>US PETROLEUM (BOPD, psi, °F, in, lbf)</option>
                  <option>SI METRIC (m3/d, kPa, °C, mm, N)</option>
                </select>
              </div>
              <div style="font-size: 8.5px; color: var(--text-dim); margin-top: 6px;">
                Centralized conversion transforms all UI readouts while maintaining internal SI physics coherence.
              </div>
            </div>
          </div>

          <!-- Safety Thresholds -->
          <div class="ws-card">
            <div class="ws-card-header">
              <span class="ws-card-title">2. CONFIGURED MECHANICAL SAFETY THRESHOLDS</span>
            </div>
            <div class="ws-card-body">
              <div class="ws-status-row"><span class="ws-status-key">MAX POLISHED ROD LOAD (PPRL)</span><span class="ws-status-num">65.0 kN (&lt; 80% Rating)</span></div>
              <div class="ws-status-row"><span class="ws-status-key">MIN BUOYANT FLOAT MARGIN</span><span class="ws-status-num">10.0 %</span></div>
              <div class="ws-status-row"><span class="ws-status-key">MIN PUMP FILLAGE FLOOR</span><span class="ws-status-num">30.0 %</span></div>
              <div class="ws-status-row"><span class="ws-status-key">MAX ELECTRICAL ENERGY CEILING</span><span class="ws-status-num">450.0 kWh/d</span></div>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}
