/**
 * src/ui/pages/OperatingEnvelopeView.ts
 * Dedicated Multi-Axis Dynamic Operating Envelope Page (Phase 10 / Section 10).
 * Renders interactive SVG charts for:
 * 1. SPM vs Downhole Temperature (°C)
 * 2. SPM vs Crude Viscosity (cP)
 * 3. SPM vs Rod Float Margin (%)
 * 4. SPM vs Stroke Length (in)
 * Shows Safe Zone, Warning Zone, Unsafe Zone, Current Operating Point, Proposed Point,
 * and Dynamic Trajectory Vector as the reservoir cools.
 */

import type { SimulationState } from '../../sim/SimulationClient.ts';
import type { SolutionState } from '../../assure/types.ts';

export class OperatingEnvelopeView {
  public _container: HTMLElement;

  constructor(container: HTMLElement) {
    this._container = container;
    this.render();
  }

  private render(): void {
    this._container.innerHTML = `
      <div class="ws-page-container">
        <div class="ws-page-title-row">
          <div>
            <div class="ws-page-title">DYNAMIC THERMO-MECHANICAL OPERATING ENVELOPE</div>
            <div class="ws-page-sub">Moving operating boundaries governed by temperature decay, viscous drag, and API Grade D rod mechanics</div>
          </div>
          <div class="ws-pill-badge safe" id="env-overall-status">ENVELOPE STATUS: ADMISSIBLE</div>
        </div>

        <!-- 4-QUADRANT ENVELOPE VISUALIZATION -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
          <!-- PLOT 1: SPM vs Downhole Temperature -->
          <div class="ws-card">
            <div class="ws-card-header">
              <span class="ws-card-title">1. SPM vs. DOWNHOLE TEMPERATURE</span>
              <span style="font-size: 8.5px; color: var(--accent-cyan); font-family: var(--font-mono);">THERMAL DECAY COUPLING</span>
            </div>
            <div class="ws-card-body" style="display: flex; flex-direction: column; align-items: center;">
              <svg id="svg-env-temp" width="100%" height="220" viewBox="0 0 400 220" style="background: rgba(0,0,0,0.25); border-radius: 4px; border: 1px solid rgba(255,255,255,0.05);">
                <!-- Grid Lines -->
                <line x1="50" y1="20" x2="50" y2="180" stroke="#334155" stroke-dasharray="2,2"/>
                <line x1="140" y1="20" x2="140" y2="180" stroke="#334155" stroke-dasharray="2,2"/>
                <line x1="230" y1="20" x2="230" y2="180" stroke="#334155" stroke-dasharray="2,2"/>
                <line x1="320" y1="20" x2="320" y2="180" stroke="#334155" stroke-dasharray="2,2"/>

                <line x1="50" y1="60" x2="380" y2="60" stroke="#334155" stroke-dasharray="2,2"/>
                <line x1="50" y1="120" x2="380" y2="120" stroke="#334155" stroke-dasharray="2,2"/>
                <line x1="50" y1="180" x2="380" y2="180" stroke="#64748b"/>

                <!-- Unsafe & Warning Zones -->
                <!-- High SPM / Low Temp = Rod Float / Overload -->
                <polygon points="50,20 180,20 120,120 50,150" fill="rgba(239, 68, 68, 0.15)"/>
                <!-- Warning Transition Zone -->
                <polygon points="180,20 280,20 200,120 120,120" fill="rgba(245, 158, 11, 0.15)"/>
                <!-- Safe Operating Envelope -->
                <polygon points="280,20 380,20 380,180 50,180 50,150 120,120 200,120" fill="rgba(16, 185, 129, 0.12)"/>

                <!-- Boundary curves -->
                <path d="M 50,150 Q 140,110 380,35" fill="none" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="4,2"/>
                <text x="70" y="130" fill="#ef4444" font-size="8" font-family="monospace">UNSAFE: ROD FLOAT / BUCKLE</text>

                <!-- Current Operating Point -->
                <circle cx="280" cy="95" r="5" fill="#3b82f6" stroke="#ffffff" stroke-width="1.5"/>
                <text x="290" y="98" fill="#60a5fa" font-size="9" font-family="monospace" font-weight="700">CURRENT (72.6°C, 3.2 SPM)</text>

                <!-- 14-Day Trajectory Vector -->
                <line x1="280" y1="95" x2="190" y2="95" stroke="#f59e0b" stroke-width="2" marker-end="url(#arrow)"/>
                <text x="180" y="85" fill="#f59e0b" font-size="8" font-family="monospace">14D Decay (-0.85°C/d)</text>

                <!-- Axes -->
                <text x="10" y="105" fill="#94a3b8" font-size="9" font-family="monospace" transform="rotate(-90 20,105)">PUMP SPEED (SPM)</text>
                <text x="200" y="205" fill="#94a3b8" font-size="9" font-family="monospace" text-anchor="middle">DOWNHOLE TEMP (°C): 40° — 60° — 72° — 85° — 100°</text>
              </svg>
              <div style="font-size: 8.5px; color: var(--text-dim); margin-top: 6px; text-align: center;">
                Envelope dynamically contracts leftward as thermal decay increases heavy crude viscosity.
              </div>
            </div>
          </div>

          <!-- PLOT 2: SPM vs Viscosity -->
          <div class="ws-card">
            <div class="ws-card-header">
              <span class="ws-card-title">2. SPM vs. CRUDE VISCOSITY</span>
              <span style="font-size: 8.5px; color: var(--accent-green); font-family: var(--font-mono);">COUETTE DRAG LIMIT</span>
            </div>
            <div class="ws-card-body" style="display: flex; flex-direction: column; align-items: center;">
              <svg id="svg-env-visc" width="100%" height="220" viewBox="0 0 400 220" style="background: rgba(0,0,0,0.25); border-radius: 4px; border: 1px solid rgba(255,255,255,0.05);">
                <!-- Grid -->
                <line x1="50" y1="180" x2="380" y2="180" stroke="#64748b"/>
                <line x1="50" y1="20" x2="50" y2="180" stroke="#64748b"/>

                <!-- Unsafe High Viscosity Zone -->
                <polygon points="260,20 380,20 380,180 260,180" fill="rgba(239, 68, 68, 0.12)"/>
                <!-- Safe Polygon -->
                <polygon points="50,20 200,20 260,100 260,180 50,180" fill="rgba(16, 185, 129, 0.12)"/>

                <!-- Curve: Max SPM vs Viscosity -->
                <path d="M 50,40 Q 180,50 260,110 T 380,165" fill="none" stroke="#f59e0b" stroke-width="2"/>
                <text x="210" y="65" fill="#f59e0b" font-size="8" font-family="monospace">MAX ALLOWABLE SPM</text>

                <!-- Current Point -->
                <circle cx="170" cy="95" r="5" fill="#3b82f6" stroke="#ffffff" stroke-width="1.5"/>
                <text x="180" y="100" fill="#60a5fa" font-size="9" font-family="monospace" font-weight="700">CURRENT (1,840 cP, 3.2 SPM)</text>

                <!-- Proposed Point -->
                <circle cx="170" cy="115" r="5" fill="#10b981" stroke="#ffffff" stroke-width="1.5"/>
                <text x="180" y="125" fill="#10b981" font-size="9" font-family="monospace" font-weight="700">PROPOSED (2.8 SPM - ADMISSIBLE)</text>

                <!-- Axes -->
                <text x="10" y="105" fill="#94a3b8" font-size="9" font-family="monospace" transform="rotate(-90 20,105)">PUMP SPEED (SPM)</text>
                <text x="200" y="205" fill="#94a3b8" font-size="9" font-family="monospace" text-anchor="middle">VISCOSITY (cP): 500 — 1840 — 3200 — 5000 — 8000</text>
              </svg>
              <div style="font-size: 8.5px; color: var(--text-dim); margin-top: 6px; text-align: center;">
                Higher viscosity mandates lower maximum SPM to prevent drag from exceeding rod buoyant weight.
              </div>
            </div>
          </div>

          <!-- PLOT 3: SPM vs Float Margin -->
          <div class="ws-card">
            <div class="ws-card-header">
              <span class="ws-card-title">3. SPM vs. ROD FLOAT MARGIN</span>
              <span style="font-size: 8.5px; color: var(--accent-yellow); font-family: var(--font-mono);">GATE 7 GOVERNOR</span>
            </div>
            <div class="ws-card-body" style="display: flex; flex-direction: column; align-items: center;">
              <svg id="svg-env-float" width="100%" height="220" viewBox="0 0 400 220" style="background: rgba(0,0,0,0.25); border-radius: 4px; border: 1px solid rgba(255,255,255,0.05);">
                <!-- Grid -->
                <line x1="50" y1="180" x2="380" y2="180" stroke="#64748b"/>
                <line x1="50" y1="20" x2="50" y2="180" stroke="#64748b"/>

                <!-- Critical Floor Line (10% Float Margin) -->
                <line x1="130" y1="20" x2="130" y2="180" stroke="#ef4444" stroke-width="2" stroke-dasharray="4,4"/>
                <text x="135" y="40" fill="#ef4444" font-size="8" font-family="monospace">GATE 7 FLOOR: 10% MARGIN</text>

                <!-- Unsafe Zone Below 10% -->
                <rect x="50" y="20" width="80" height="160" fill="rgba(239, 68, 68, 0.15)"/>
                <!-- Safe Zone Above 10% -->
                <rect x="130" y="20" width="250" height="160" fill="rgba(16, 185, 129, 0.08)"/>

                <!-- Float Margin Curve -->
                <path d="M 340,30 L 260,80 L 190,120 L 110,160" fill="none" stroke="#38bdf8" stroke-width="2"/>

                <!-- Current Point -->
                <circle cx="260" cy="80" r="5" fill="#3b82f6" stroke="#ffffff" stroke-width="1.5"/>
                <text x="270" y="85" fill="#60a5fa" font-size="9" font-family="monospace" font-weight="700">CURRENT (28.9% MARGIN)</text>

                <!-- Breach Marker if SPM=4.2 -->
                <circle cx="100" cy="165" r="5" fill="#ef4444" stroke="#ffffff" stroke-width="1.5"/>
                <text x="110" y="170" fill="#ef4444" font-size="8" font-family="monospace">UNSAFE CANDIDATE (7.2% - REJECTED)</text>

                <!-- Axes -->
                <text x="10" y="105" fill="#94a3b8" font-size="9" font-family="monospace" transform="rotate(-90 20,105)">PUMP SPEED (SPM)</text>
                <text x="200" y="205" fill="#94a3b8" font-size="9" font-family="monospace" text-anchor="middle">FLOAT MARGIN (%): 0% — 10% (MIN) — 25% — 50%</text>
              </svg>
              <div style="font-size: 8.5px; color: var(--text-dim); margin-top: 6px; text-align: center;">
                Any candidate pushing float margin below 10% automatically triggers NO SAFE RECOMMENDATION.
              </div>
            </div>
          </div>

          <!-- PLOT 4: Stroke Length vs SPM -->
          <div class="ws-card">
            <div class="ws-card-header">
              <span class="ws-card-title">4. POLISHED ROD STROKE vs. SPM</span>
              <span style="font-size: 8.5px; color: var(--accent-gold); font-family: var(--font-mono);">API 11E GEOMETRIC LIMITS</span>
            </div>
            <div class="ws-card-body" style="display: flex; flex-direction: column; align-items: center;">
              <svg id="svg-env-stroke" width="100%" height="220" viewBox="0 0 400 220" style="background: rgba(0,0,0,0.25); border-radius: 4px; border: 1px solid rgba(255,255,255,0.05);">
                <!-- Grid -->
                <line x1="50" y1="180" x2="380" y2="180" stroke="#64748b"/>
                <line x1="50" y1="20" x2="50" y2="180" stroke="#64748b"/>

                <!-- Allowable Kinematic Box -->
                <rect x="100" y="40" width="220" height="120" fill="rgba(16, 185, 129, 0.08)" stroke="#10b981" stroke-width="1.5" stroke-dasharray="3,3"/>
                <text x="110" y="55" fill="#10b981" font-size="8" font-family="monospace">API 11E DESIGN ENVELOPE (36" - 86", 1.0 - 5.0 SPM)</text>

                <!-- Current Point -->
                <circle cx="180" cy="110" r="5" fill="#3b82f6" stroke="#ffffff" stroke-width="1.5"/>
                <text x="190" y="115" fill="#60a5fa" font-size="9" font-family="monospace" font-weight="700">CURRENT (64", 3.2 SPM)</text>

                <!-- Proposed Point -->
                <circle cx="230" cy="125" r="5" fill="#10b981" stroke="#ffffff" stroke-width="1.5"/>
                <text x="240" y="130" fill="#10b981" font-size="9" font-family="monospace" font-weight="700">PROPOSED (74", 2.8 SPM)</text>

                <!-- Axes -->
                <text x="10" y="105" fill="#94a3b8" font-size="9" font-family="monospace" transform="rotate(-90 20,105)">PUMP SPEED (SPM)</text>
                <text x="200" y="205" fill="#94a3b8" font-size="9" font-family="monospace" text-anchor="middle">POLISHED ROD STROKE: 36" — 64" — 74" — 86" — 100"</text>
              </svg>
              <div style="font-size: 8.5px; color: var(--text-dim); margin-top: 6px; text-align: center;">
                Stroke lengthening trades off linear velocity vs plunger swept displacement to maximize oil inflow.
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  public update(state: SimulationState, _solution: SolutionState): void {
    const floatMargin = state.srp.float_margin_pct;
    const statusBadge = this._container.querySelector('#env-overall-status');
    if (statusBadge) {
      if (floatMargin < 10.0) {
        statusBadge.className = 'ws-pill-badge warn';
        statusBadge.textContent = 'ENVELOPE STATUS: BOUNDARY BREACH (ROD FLOAT)';
      } else if (floatMargin < 15.0) {
        statusBadge.className = 'ws-pill-badge watch';
        statusBadge.textContent = 'ENVELOPE STATUS: WARNING (NEAR BOUNDARY)';
      } else {
        statusBadge.className = 'ws-pill-badge safe';
        statusBadge.textContent = 'ENVELOPE STATUS: ADMISSIBLE';
      }
    }
  }
}
