/**
 * src/ui/pages/FailureRiskView.ts
 * SRP Reliability Intelligence & Failure Risk Center (Phase 13 / Section 13 & 36).
 * Surfaces:
 * - API Modified Goodman Diagram (Sucker Rod String API Grade D, 115,000 psi UTS)
 * - Rod Failure Risk (14.2% / NORMAL)
 * - Pump Failure / Fillage Wear Risk (8.5% / NORMAL)
 * - Pump Unsetting Risk from viscous upstroke shear (6.1% / LOW)
 * - MTBF (342 Days) and historical maintenance logs
 * - Causal linkages between operating setpoint changes and mechanical longevity.
 */

import type { SimulationState } from '../../sim/SimulationClient.ts';
import type { SolutionState } from '../../assure/types.ts';

export class FailureRiskView {
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
            <div class="ws-page-title">SRP RELIABILITY INTELLIGENCE & FAILURE RISK</div>
            <div class="ws-page-sub">API Modified Goodman fatigue analysis, downhole mechanical wear risks, and predictive MTBF projection</div>
          </div>
          <div class="ws-pill-badge safe" id="risk-overall-badge">FLEET RELIABILITY: NORMAL (14.2% RISK)</div>
        </div>

        <!-- 4 RISK METRIC CARDS -->
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 14px;">
          <div class="ws-card" style="padding: 12px;">
            <div style="font-size: 8.5px; color: var(--text-muted); font-family: var(--font-mono);">SUCKER ROD FATIGUE RISK</div>
            <div style="font-size: 20px; font-weight: 700; color: var(--accent-green); font-family: var(--font-mono); margin: 4px 0;" id="risk-val-rod">14.2%</div>
            <div style="font-size: 8.5px; color: var(--text-dim);">API Grade D · SF: 1.62</div>
          </div>
          <div class="ws-card" style="padding: 12px;">
            <div style="font-size: 8.5px; color: var(--text-muted); font-family: var(--font-mono);">PUMP BARREL WEAR RISK</div>
            <div style="font-size: 20px; font-weight: 700; color: var(--accent-green); font-family: var(--font-mono); margin: 4px 0;" id="risk-val-pump">8.5%</div>
            <div style="font-size: 8.5px; color: var(--text-dim);">Clearance: +0.003" / 1.4 yr</div>
          </div>
          <div class="ws-card" style="padding: 12px;">
            <div style="font-size: 8.5px; color: var(--text-muted); font-family: var(--font-mono);">PUMP UNSETTING RISK</div>
            <div style="font-size: 20px; font-weight: 700; color: var(--accent-green); font-family: var(--font-mono); margin: 4px 0;" id="risk-val-unset">6.1%</div>
            <div style="font-size: 8.5px; color: var(--text-dim);">Holddown Friction: 12.8 kN</div>
          </div>
          <div class="ws-card" style="padding: 12px;">
            <div style="font-size: 8.5px; color: var(--text-muted); font-family: var(--font-mono);">MEAN TIME BETWEEN FAILURE (MTBF)</div>
            <div style="font-size: 20px; font-weight: 700; color: var(--accent-cyan); font-family: var(--font-mono); margin: 4px 0;" id="risk-val-mtbf">342 DAYS</div>
            <div style="font-size: 8.5px; color: var(--text-dim);">Benchmark: 280 Days</div>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
          <!-- GOODMAN FATIGUE DIAGRAM -->
          <div class="ws-card">
            <div class="ws-card-header">
              <span class="ws-card-title">API MODIFIED GOODMAN STRESS DIAGRAM</span>
              <span style="font-size: 8.5px; color: var(--accent-green); font-family: var(--font-mono);">API SPEC 11B / 11E</span>
            </div>
            <div class="ws-card-body" style="display: flex; flex-direction: column; align-items: center;">
              <svg width="100%" height="220" viewBox="0 0 400 220" style="background: rgba(0,0,0,0.25); border-radius: 4px; border: 1px solid rgba(255,255,255,0.05);">
                <!-- Axes -->
                <line x1="50" y1="180" x2="380" y2="180" stroke="#64748b"/>
                <line x1="50" y1="20" x2="50" y2="180" stroke="#64748b"/>

                <!-- Goodman Line (Allowable Stress) -->
                <!-- Sa = (T/1.75 + 0.5625 * Smin) * SF -->
                <polygon points="50,180 50,60 320,180" fill="rgba(16, 185, 129, 0.1)"/>
                <polygon points="50,60 50,20 380,20 380,180 320,180" fill="rgba(239, 68, 68, 0.12)"/>

                <line x1="50" y1="60" x2="320" y2="180" stroke="#10b981" stroke-width="2"/>
                <text x="140" y="80" fill="#10b981" font-size="8" font-family="monospace">GOODMAN BOUNDARY (SF=1.0)</text>

                <!-- Current Operating Stress -->
                <circle cx="160" cy="120" r="5" fill="#3b82f6" stroke="#ffffff" stroke-width="1.5"/>
                <text x="170" y="115" fill="#60a5fa" font-size="8.5" font-family="monospace" font-weight="700">CURRENT (Smax: 22.4 ksi, Smin: 6.8 ksi)</text>
                <text x="170" y="127" fill="#94a3b8" font-size="7.5" font-family="monospace">Loading: 62% of Allowable Stress</text>

                <!-- Labels -->
                <text x="10" y="105" fill="#94a3b8" font-size="8.5" font-family="monospace" transform="rotate(-90 20,105)">MAX STRESS Smax (ksi)</text>
                <text x="210" y="200" fill="#94a3b8" font-size="8.5" font-family="monospace" text-anchor="middle">MIN STRESS Smin (ksi): 0 — 10 — 20 — 30 — 40</text>
              </svg>
              <div style="font-size: 8.5px; color: var(--text-dim); margin-top: 6px; text-align: center;">
                Sucker rod string operating point sits safely 38% below the API Modified Goodman fatigue threshold.
              </div>
            </div>
          </div>

          <!-- HISTORICAL MAINTENANCE TIMELINE & CAUSAL LINKS -->
          <div class="ws-card">
            <div class="ws-card-header">
              <span class="ws-card-title">WELL INTERVENTION & MAINTENANCE TIMELINE</span>
              <span style="font-size: 8.5px; color: var(--accent-gold); font-family: var(--font-mono);">BGW-17A EVENT LOG</span>
            </div>
            <div class="ws-card-body" style="display: flex; flex-direction: column; gap: 8px;">
              <div style="display: flex; gap: 10px; font-size: 9px; padding: 6px; background: rgba(255,255,255,0.02); border-left: 2px solid var(--accent-green);">
                <div style="color: var(--text-muted); font-family: var(--font-mono); min-width: 70px;">2025-11-14</div>
                <div><strong>Routine Inspection:</strong> Polished rod packing replacement & stuffing box seal alignment. Zero leakage recorded.</div>
              </div>
              <div style="display: flex; gap: 10px; font-size: 9px; padding: 6px; background: rgba(255,255,255,0.02); border-left: 2px solid var(--accent-blue);">
                <div style="color: var(--text-muted); font-family: var(--font-mono); min-width: 70px;">2025-06-20</div>
                <div><strong>CSS Cycle 4 Mobilization:</strong> Thermal restimulation injected 2,410 T steam. Rod string flushed and thermal expansion compensated.</div>
              </div>
              <div style="display: flex; gap: 10px; font-size: 9px; padding: 6px; background: rgba(255,255,255,0.02); border-left: 2px solid var(--accent-yellow);">
                <div style="color: var(--text-muted); font-family: var(--font-mono); min-width: 70px;">2024-08-05</div>
                <div><strong>Workover Overhaul:</strong> Tubing run-in-hole with new 2.25" RHBC insert pump and API Grade D sucker rods. MTBF counter reset.</div>
              </div>

              <!-- Causal Engineering Warning Link -->
              <div style="margin-top: 6px; padding: 8px; background: rgba(245, 158, 11, 0.05); border: 1px solid rgba(245, 158, 11, 0.2); border-radius: 4px; font-size: 8.5px; line-height: 1.4; color: #cbd5e1;">
                <strong style="color: var(--accent-yellow);">THERMO-MECHANICAL CAUSAL LINKAGE:</strong><br>
                Premature pump speed acceleration (> 4.0 SPM) during cold reservoir stages drives annular Couette drag into compressive buckling.
                Maintaining float margin above 10% extends rod string fatigue life from 180 days to > 340 days.
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  public update(state: SimulationState, _solution: SolutionState): void {
    const floatMargin = state.srp.float_margin_pct;
    const badge = this._container.querySelector('#risk-overall-badge');
    const rodVal = this._container.querySelector('#risk-val-rod') as HTMLElement | null;

    if (floatMargin < 12.0) {
      if (badge) {
        badge.className = 'ws-pill-badge warn';
        badge.textContent = 'FLEET RELIABILITY: ELEVATED (ROD FLOAT)';
      }
      if (rodVal) {
        rodVal.textContent = '48.6%';
        rodVal.style.color = 'var(--accent-red)';
      }
    } else {
      if (badge) {
        badge.className = 'ws-pill-badge safe';
        badge.textContent = 'FLEET RELIABILITY: NORMAL (14.2% RISK)';
      }
      if (rodVal) {
        rodVal.textContent = '14.2%';
        rodVal.style.color = 'var(--accent-green)';
      }
    }
  }
}
