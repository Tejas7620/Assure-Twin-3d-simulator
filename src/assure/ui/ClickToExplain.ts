/**
 * src/assure/ui/ClickToExplain.ts
 * 3D Click-to-Explain Contextual Inspector (Phase 43).
 * Intercepts raycaster intersections on 3D components (Pumpjack, Reservoir, Sucker Rod, Steam Plant)
 * without modifying underlying Three.js meshes, materials, or animations.
 */

import type { SolutionState } from '../types.ts';

export interface ClickToExplainCardData {
  title: string;
  category: 'SURFACE_SRP' | 'SUBSURFACE_ROD' | 'RESERVOIR_THERMAL' | 'STEAM_FACILITY';
  metrics: Array<{ label: string; value: string; status?: 'SAFE' | 'WARNING' | 'CRITICAL' }>;
  explanation: string;
  recommendationNote: string;
}

export class ClickToExplain {
  private _cardEl: HTMLElement;
  private _isOpen: boolean = false;

  constructor() {
    this._cardEl = document.createElement('div');
    this._cardEl.className = 'assure-click-explain-card';
    this._cardEl.style.display = 'none';
    document.body.appendChild(this._cardEl);
  }

  public showExplanation(data: ClickToExplainCardData, screenPos?: { x: number; y: number }): void {
    this._isOpen = true;

    const posX = screenPos ? Math.min(window.innerWidth - 360, Math.max(20, screenPos.x)) : window.innerWidth / 2 - 160;
    const posY = screenPos ? Math.min(window.innerHeight - 280, Math.max(70, screenPos.y)) : 100;

    this._cardEl.style.left = `${posX}px`;
    this._cardEl.style.top = `${posY}px`;
    this._cardEl.style.display = 'block';

    const categoryBadges: Record<string, string> = {
      SURFACE_SRP: 'API 11E PUMPJACK UNIT',
      SUBSURFACE_ROD: 'API 11B SUCKER ROD STRING',
      RESERVOIR_THERMAL: 'HEATED MATRIX RESERVOIR',
      STEAM_FACILITY: 'CSS STEAM INJECTION PLANT'
    };

    this._cardEl.innerHTML = `
      <div class="explain-header">
        <div>
          <span class="explain-badge">${categoryBadges[data.category] || 'SUBSYSTEM'}</span>
          <h4 class="explain-title">${data.title}</h4>
        </div>
        <button class="explain-close-btn" id="explain-close-btn">&times;</button>
      </div>
      <div class="explain-metrics-grid">
        ${data.metrics.map(m => `
          <div class="explain-metric-item ${m.status ? `status-${m.status.toLowerCase()}` : ''}">
            <span class="explain-metric-label">${m.label}</span>
            <span class="explain-metric-val">${m.value}</span>
          </div>
        `).join('')}
      </div>
      <div class="explain-body">
        <p>${data.explanation}</p>
      </div>
      <div class="explain-rec-footer">
        <span class="rec-label">DECISION TWIN INSIGHT:</span>
        <span class="rec-text">${data.recommendationNote}</span>
      </div>
    `;

    const closeBtn = this._cardEl.querySelector('#explain-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.hide());
    }
  }

  public hide(): void {
    this._isOpen = false;
    this._cardEl.style.display = 'none';
  }

  public get isOpen(): boolean {
    return this._isOpen;
  }

  /**
   * Generates formatted explanation payload for specified component based on live solution state
   */
  public static buildComponentExplanation(
    component: 'PUMPJACK' | 'RESERVOIR' | 'ROD' | 'STEAM',
    solutionState: SolutionState
  ): ClickToExplainCardData {
    switch (component) {
      case 'PUMPJACK':
        return {
          title: 'Mark II 320-256-120 Pumping Unit',
          category: 'SURFACE_SRP',
          metrics: [
            { label: 'Current SPM', value: `${solutionState.controls.spm.toFixed(1)} SPM`, status: solutionState.operatingEnvelope.status },
            { label: 'Stroke Length', value: `${solutionState.controls.strokeInches.toFixed(0)}" (1.63m)` },
            { label: 'Preferred SPM Window', value: `${solutionState.operatingEnvelope.preferredSpmMin.toFixed(1)} - ${solutionState.operatingEnvelope.preferredSpmMax.toFixed(1)}` },
            { label: 'Pumpability Days', value: `${solutionState.pumpability.timeToBoundaryDays} Days`, status: solutionState.pumpability.state }
          ],
          explanation: `Surface beam unit running at ${solutionState.controls.spm.toFixed(1)} SPM with ${solutionState.controls.strokeInches}" stroke. Dynamic envelope currently allows up to ${solutionState.operatingEnvelope.preferredSpmMax.toFixed(1)} SPM before downward rod-drag induces floating.`,
          recommendationNote: solutionState.operatingEnvelope.status === 'SAFE'
            ? 'Operating in optimal kinematics sweet spot.'
            : 'Step down SPM to preserve float margin as formation cools.'
        };

      case 'RESERVOIR':
        return {
          title: 'Baghewala Jodhpur Sandstone Matrix',
          category: 'RESERVOIR_THERMAL',
          metrics: [
            { label: 'In-Situ Temperature', value: `${solutionState.reservoir.temperatureC.toFixed(1)} °C`, status: solutionState.reservoir.temperatureC < 55 ? 'WARNING' : 'SAFE' },
            { label: 'Crude Viscosity', value: `${solutionState.reservoir.viscosityCp} cP` },
            { label: 'Thermal Reserve', value: `${solutionState.thermalReserve.reservePct}%`, status: solutionState.thermalReserve.status === 'DEPLETED' ? 'CRITICAL' : 'SAFE' },
            { label: 'Cooling Rate', value: `${solutionState.thermalReserve.coolingRateCPerDay.toFixed(2)} °C/day` }
          ],
          explanation: `Heavy oil reservoir (14.5° API) currently cooled to ${solutionState.reservoir.temperatureC.toFixed(1)}°C with thermal front radius of ${solutionState.reservoir.thermalFrontM.toFixed(1)}m. Remaining sensible enthalpy is ${solutionState.thermalReserve.reservePct}%.`,
          recommendationNote: solutionState.cssReadiness.status === 'WINDOW OPEN' || solutionState.cssReadiness.status === 'URGENT'
            ? 'Optimal thermal inflection reached. Prepare steam cycle injection.'
            : 'Matrix temperature sufficient to sustain fluid mobility.'
        };

      case 'ROD':
        return {
          title: 'Subsurface Sucker Rod String (API 11B)',
          category: 'SUBSURFACE_ROD',
          metrics: [
            { label: 'Peak Load (PPRL)', value: `${solutionState.rod.pprlKn.toFixed(1)} kN`, status: solutionState.rod.pprlKn > 24 ? 'CRITICAL' : 'SAFE' },
            { label: 'Viscous Drag', value: `${solutionState.rod.viscousDragKn.toFixed(1)} kN` },
            { label: 'Float Safety Margin', value: `${solutionState.rod.floatMarginPct.toFixed(1)} %`, status: solutionState.rod.floatMarginPct < 15 ? 'CRITICAL' : 'SAFE' },
            { label: 'Chamber Fillage', value: `${solutionState.pump.fillagePct.toFixed(0)} %` }
          ],
          explanation: `Reciprocating rod string experiences ${solutionState.rod.viscousDragKn.toFixed(1)} kN of downward viscous Couette drag. Remaining float safety margin is ${solutionState.rod.floatMarginPct.toFixed(1)}%.`,
          recommendationNote: solutionState.rod.floatMarginPct < 15.0
            ? 'CRITICAL WARNING: Float margin is thin (< 15%). Immediate SPM step-down advised to prevent rod compression buckling.'
            : 'Rod fall velocity is healthy and traveling valve unseats cleanly.'
        };

      case 'STEAM':
        return {
          title: 'OTSG High-Pressure Steam Plant & Manifold',
          category: 'STEAM_FACILITY',
          metrics: [
            { label: 'Cumulative Steam', value: `${solutionState.controls.steamVolumeTD.toFixed(1)} t/d` },
            { label: 'Steam-Oil Ratio (SOR)', value: `${solutionState.economics.sor.toFixed(1)} t/t` },
            { label: 'CSS Readiness', value: solutionState.cssReadiness.status, status: solutionState.cssReadiness.status === 'URGENT' ? 'CRITICAL' : 'SAFE' },
            { label: 'Next Cycle Day', value: `Day ${solutionState.cssReadiness.currentCycleDay} / ${solutionState.cssReadiness.totalCycleTargetDays}` }
          ],
          explanation: `Once-Through Steam Generator (OTSG) rated for 140 bar saturated steam at 320°C. Current economic SOR is ${solutionState.economics.sor.toFixed(1)} tons steam per ton oil produced.`,
          recommendationNote: solutionState.cssReadiness.explanation
        };
    }
  }
}
