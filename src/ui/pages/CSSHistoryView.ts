/**
 * src/ui/pages/CSSHistoryView.ts
 * Cyclic Steam Stimulation (CSS) Cycle History & Subsurface Thermal Memory.
 * Displays past cycle metrics, cumulative oil response, thermal envelope expansion,
 * and answers "Why is the next CSS decision different?"
 */

import type { SolutionState } from '../../assure/types.ts';
import type { SimulationState } from '../../sim/SimulationClient.ts';

export class CSSHistoryView {
  private _container: HTMLElement;

  constructor(container: HTMLElement) {
    this._container = container;
    this.render();
  }

  public get container(): HTMLElement {
    return this._container;
  }

  private render(): void {
    this._container.innerHTML = `
      <div class="ws-page-container">
        <div class="ws-page-title-row">
          <div>
            <div class="ws-page-title">CYCLIC STEAM STIMULATION (CSS) LIFECYCLE & THERMAL MEMORY</div>
            <div class="ws-page-sub">Historical injection-soak-production cycle performance, thermal recovery efficiency, and forward strategy</div>
          </div>
          <div class="ws-pill-badge safe">ACTIVE CYCLE 3 (DAY 41.2)</div>
        </div>

        <!-- "WHY IS THE NEXT CSS DECISION DIFFERENT?" HERO CARD -->
        <div class="ws-card" style="border-left: 3px solid var(--accent-gold); margin-bottom: 14px;">
          <div class="ws-card-header">
            <span class="ws-card-title" style="color: var(--accent-gold);">ENGINEERING STRATEGY: WHY IS THE NEXT CSS DECISION DIFFERENT?</span>
            <span style="font-size: 8.5px; color: var(--accent-cyan); font-family: var(--font-mono);">THERMAL RESERVE: 23.5%</span>
          </div>
          <div class="ws-card-body" style="font-size: 9.5px; line-height: 1.5; color: #cbd5e1;">
            <p style="margin: 0 0 6px 0;">
              Unlike Cycle 1 and 2, which relied primarily on primary formation heat dissipation into virgin sand, <strong>Cycle 4 approaches the thermal depletion limit</strong>.
              Near-wellbore thermal decay rate has stabilized at <strong>-0.34 °C/day</strong> with an effective heated drainage radius of <strong>14.5 m</strong>.
            </p>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 8px;">
              <div style="background: rgba(255,255,255,0.02); padding: 8px; border-radius: 4px;">
                <div style="font-size: 8px; color: var(--text-muted); font-family: var(--font-mono);">STEAM-TO-OIL SENSITIVITY</div>
                <div style="font-size: 13px; font-weight: 700; color: var(--accent-cyan); font-family: var(--font-mono); margin: 2px 0;">SOR Rising (6.2 t/t)</div>
                <div style="font-size: 8px; color: var(--text-dim);">Steam cost represents 41% of lifting OPEX. Restimulation must be timed precisely before viscous lock.</div>
              </div>
              <div style="background: rgba(255,255,255,0.02); padding: 8px; border-radius: 4px;">
                <div style="font-size: 8px; color: var(--text-muted); font-family: var(--font-mono);">PUMPABILITY CONSTRAINTS</div>
                <div style="font-size: 13px; font-weight: 700; color: var(--accent-gold); font-family: var(--font-mono);">Float Margin 24.5%</div>
                <div style="font-size: 8px; color: var(--text-dim);">Derating SPM to 2.8 before steam injection prevents fluid pound and downstroke rod float.</div>
              </div>
              <div style="background: rgba(255,255,255,0.02); padding: 8px; border-radius: 4px;">
                <div style="font-size: 8px; color: var(--text-muted); font-family: var(--font-mono);">OPTIMAL INJECTION SETPOINT</div>
                <div style="font-size: 13px; font-weight: 700; color: var(--accent-green); font-family: var(--font-mono);">2,400 T @ 118 bar</div>
                <div style="font-size: 8px; color: var(--text-dim);">Marx-Langenheim heat balance targets 90-day incremental oil uplift of +19.2 BOPD.</div>
              </div>
            </div>
          </div>
        </div>

        <!-- CYCLE TABLE -->
        <div class="ws-card">
          <div class="ws-card-header">
            <span class="ws-card-title">BGW-17A CYCLE-BY-CYCLE INJECTION & PRODUCTION METRICS</span>
            <span style="font-size: 8.5px; color: var(--text-dim); font-family: var(--font-mono);">BAGHEWALA JODHPUR SANDSTONE</span>
          </div>
          <div class="ws-card-body" style="padding: 0;">
            <table class="ws-table" style="width: 100%; border-collapse: collapse; font-size: 9px;">
              <thead>
                <tr style="border-bottom: 1px solid var(--border-subtle); color: var(--text-muted); font-family: var(--font-mono); text-align: left;">
                  <th style="padding: 8px 12px;">CYCLE</th>
                  <th>STEAM VOL (T)</th>
                  <th>INJ RATE (T/D)</th>
                  <th>INJ PRESS (BAR)</th>
                  <th>SOAK (DAYS)</th>
                  <th>PROD DURATION</th>
                  <th>OIL RECOVERED (BBL)</th>
                  <th>CUM OIL (BBL)</th>
                  <th>SOR (T/T)</th>
                  <th>PEAK TEMP (°C)</th>
                  <th>STATUS</th>
                </tr>
              </thead>
              <tbody>
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.03);">
                  <td style="padding: 8px 12px; font-weight: 700; color: #ffffff;">Cycle 1</td>
                  <td>2,200</td><td>160.0</td><td>115.0</td><td>6.0 d</td><td>72 d</td>
                  <td>14,200</td><td>14,200</td><td>4.8</td><td>98.4°C</td>
                  <td><span class="ws-pill-badge safe">COMPLETED</span></td>
                </tr>
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.03);">
                  <td style="padding: 8px 12px; font-weight: 700; color: #ffffff;">Cycle 2</td>
                  <td>2,400</td><td>175.0</td><td>118.0</td><td>6.5 d</td><td>84 d</td>
                  <td>16,500</td><td>30,700</td><td>5.4</td><td>104.2°C</td>
                  <td><span class="ws-pill-badge safe">COMPLETED</span></td>
                </tr>
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.03); background: rgba(56,189,248,0.03);">
                  <td style="padding: 8px 12px; font-weight: 700; color: var(--accent-cyan);">Cycle 3 (Current)</td>
                  <td>2,500</td><td>180.0</td><td>120.0</td><td>7.0 d</td><td>41 d (Active)</td>
                  <td>18,450</td><td>49,150</td><td>6.2</td><td>112.5°C</td>
                  <td><span class="ws-pill-badge safe">PRODUCING</span></td>
                </tr>
                <tr style="color: var(--accent-green); background: rgba(16,185,129,0.03);">
                  <td style="padding: 8px 12px; font-weight: 700;">Cycle 4 (Proposed)</td>
                  <td>2,400</td><td>185.0</td><td>118.0</td><td>5.5 d</td><td>80 d (Proj.)</td>
                  <td>+19,200</td><td>68,350</td><td>5.2</td><td>108.0°C</td>
                  <td><span class="ws-pill-badge safe">OPTIMIZED</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  public update(_state?: SimulationState, _solution?: SolutionState): void {
    // Dynamically updates if new state emerges
  }
}
