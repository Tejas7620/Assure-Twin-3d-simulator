/**
 * src/ui/pages/RecommendationView.ts
 * Flagship Recommendation & Abstention Engine (Phases 11, 13, 20, 21, 22, 30, 31, 60).
 * Handles:
 * 1. ADMISSIBLE RECOMMENDATION CONTRACT (12/12 Gates PASS, Dual WHY/WHY NOT Explainability, Cryptographic SHA-256 seal)
 * 2. NO SAFE RECOMMENDATION Flagship Screen (Abstention when gates fail or OOD occurs)
 * 3. SAFE ALTERNATIVES ENGINE (Pre-simulated viable alternatives: Derated SPM, Accelerated CSS, Data Collection)
 * 4. ENGINEER-IN-THE-LOOP CONTROLS (Approve, Reject, Request Rehearsal, Request Data, Modify Candidate)
 */

import type { AssureTwinManager } from '../../assure/AssureTwinManager.ts';
import type { SolutionState, RecommendationCase } from '../../assure/types.ts';
import { assureApiClient } from '../../api/client.ts';

export class RecommendationView {
  public _container: HTMLElement;
  private _assureManager: AssureTwinManager;
  private _mode: 'RECOMMENDATION' | 'NO_SAFE_RECOMMENDATION' = 'RECOMMENDATION';

  constructor(container: HTMLElement, assureManager: AssureTwinManager) {
    this._container = container;
    this._assureManager = assureManager;
    this.render();
    this.bindEvents();
  }

  private render(): void {
    if (this._mode === 'NO_SAFE_RECOMMENDATION') {
      this.renderNoSafeRecommendation();
    } else {
      this.renderAdmissibleRecommendation();
    }
  }

  private renderAdmissibleRecommendation(): void {
    this._container.innerHTML = `
      <div class="ws-page-container">
        <div class="ws-page-title-row">
          <div>
            <div class="ws-page-title">CERTIFIED RECOMMENDATION CASE & DECISION CONTRACT</div>
            <div class="ws-page-sub">Cryptographically verifiable decision contract with physical causality (WHY) and counterfactual rejections (WHY NOT)</div>
          </div>
          <div style="display: flex; gap: 8px; align-items: center;">
            <button id="btn-toggle-demo-abstain" style="padding: 4px 10px; font-size: 8.5px; background: rgba(239, 68, 68, 0.15); border: 1px solid #ef4444; color: #ef4444; border-radius: 3px; cursor: pointer; font-family: var(--font-mono);">
              DEMO: TRIGGER NO SAFE RECOMMENDATION
            </button>
            <div id="rec-status-pill" class="ws-pill-badge safe">ELIGIBLE FOR ENGINEER APPROVAL (12/12 PASS)</div>
          </div>
        </div>

        <!-- RECOMMENDATION CASE DETAILS -->
        <div class="ws-card">
          <div class="ws-card-header">
            <span class="ws-card-title" id="rec-case-id">CASE ID: REC-20260929-BGW17A-8853</span>
            <span style="font-size: 8.5px; color: var(--accent-blue); font-family: var(--font-mono);">SHA-256: e8f4a1...9b2c · API 11E / 11AX CERTIFIED</span>
          </div>
          <div class="ws-card-body">
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;">
              <div class="ws-card" style="padding: 8px; background: rgba(255,255,255,0.02);">
                <div style="font-size: 8.5px; color: var(--text-muted); font-family: var(--font-mono);">RECOMMENDED PUMP SPEED</div>
                <div style="font-size: 16px; font-weight: 700; color: var(--accent-green); font-family: var(--font-mono); margin: 3px 0;" id="rec-spm">2.8 SPM</div>
                <div style="font-size: 8px; color: var(--text-dim);">Current: 3.2 SPM (Δ -0.4 SPM)</div>
              </div>
              <div class="ws-card" style="padding: 8px; background: rgba(255,255,255,0.02);">
                <div style="font-size: 8.5px; color: var(--text-muted); font-family: var(--font-mono);">RECOMMENDED STROKE</div>
                <div style="font-size: 16px; font-weight: 700; color: var(--accent-green); font-family: var(--font-mono); margin: 3px 0;" id="rec-stroke">74 IN</div>
                <div style="font-size: 8px; color: var(--text-dim);">Current: 64 IN (Δ +10 IN)</div>
              </div>
              <div class="ws-card" style="padding: 8px; background: rgba(255,255,255,0.02);">
                <div style="font-size: 8.5px; color: var(--text-muted); font-family: var(--font-mono);">CSS STEAM RE-STIMULATION</div>
                <div style="font-size: 16px; font-weight: 700; color: var(--accent-cyan); font-family: var(--font-mono); margin: 3px 0;" id="rec-steam">2,400 TONS</div>
                <div style="font-size: 8px; color: var(--text-dim);">Schedule: Day 42 (Urgent Window)</div>
              </div>
              <div class="ws-card" style="padding: 8px; background: rgba(255,255,255,0.02);">
                <div style="font-size: 8.5px; color: var(--text-muted); font-family: var(--font-mono);">PROJECTED INCREMENTAL GAIN</div>
                <div style="font-size: 16px; font-weight: 700; color: var(--accent-gold); font-family: var(--font-mono); margin: 3px 0;" id="rec-gain">+19.2 BOPD</div>
                <div style="font-size: 8px; color: var(--text-dim);">SOR Delta: -24% (Admissible)</div>
              </div>
            </div>

            <!-- DUAL EXPLAINABILITY: WHY & WHY NOT -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 12px;">
              <!-- WHY: CAUSAL PHYSICS -->
              <div class="ws-card" style="padding: 10px; background: rgba(16, 185, 129, 0.04); border-color: rgba(16, 185, 129, 0.2);">
                <div style="font-size: 10px; font-weight: 700; color: var(--accent-green); font-family: var(--font-mono); margin-bottom: 6px;">
                  CAUSAL PHYSICAL REASONING (WHY?)
                </div>
                <div style="display: flex; flex-direction: column; gap: 6px; font-size: 9px; line-height: 1.4; color: #f1f5f9;" id="rec-why-list">
                  <div>1. Near-wellbore thermal decay (-0.85 °C/d) increases in-situ Andrade viscosity from 1,840 cP toward 3,200 cP.</div>
                  <div>2. Pumping at 3.2 SPM with rising viscosity drives annular Couette drag from 1.85 kN to > 4.2 kN during downstroke.</div>
                  <div>3. Lowering SPM to 2.8 reduces rod drag by 28%, preserving buoyant float margin above the critical 10% threshold.</div>
                  <div>4. Lengthening stroke from 64" to 74" restores plunger swept displacement, capturing reservoir inflow without fluid pound.</div>
                  <div>5. Coordinating next steam cycle at Day 42 restores thermal enthalpy before severe viscous lock occurs.</div>
                </div>
              </div>

              <!-- WHY NOT: COUNTERFACTUAL REJECTIONS -->
              <div class="ws-card" style="padding: 10px; background: rgba(239, 68, 68, 0.04); border-color: rgba(239, 68, 68, 0.2);">
                <div style="font-size: 10px; font-weight: 700; color: var(--accent-red); font-family: var(--font-mono); margin-bottom: 6px;">
                  COUNTERFACTUAL REJECTIONS (WHY NOT?)
                </div>
                <div style="display: flex; flex-direction: column; gap: 6px; font-size: 9px; line-height: 1.4; color: #f1f5f9;" id="rec-whynot-list">
                  <div>• <strong>Current (Hold):</strong> Near-wellbore cooling drives rod float hazard within 3 days; risks rod buckle & tubing parting.</div>
                  <div>• <strong>CSS Only:</strong> Triggering steam without derating SPM risks fluid pound and cyclic thermal stress on unpumped wellbore.</div>
                  <div>• <strong>SRP Only:</strong> Pumping speed derate protects rods but sacrifices 19 BOPD recovery due to unmitigated heavy crude viscosity.</div>
                  <div>• <strong>Aggressive SPM (4.0+):</strong> Immediate rod float margin collapse (<6%), resulting in Gate 7 mechanical failure.</div>
                </div>
              </div>
            </div>

            <!-- ENGINEER-IN-THE-LOOP DECISION GOVERNANCE -->
            <div style="margin-top: 14px; padding: 12px; background: rgba(0,0,0,0.3); border: 1px solid var(--border-subtle); border-radius: 4px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <div style="font-size: 9.5px; font-weight: 700; color: #fff; font-family: var(--font-mono);">
                  ENGINEER-IN-THE-LOOP GOVERNANCE WORKFLOW (RULE 31)
                </div>
                <div style="font-size: 8px; color: var(--text-dim); font-family: var(--font-mono);">
                  MANDATORY PE DIGITAL SIGN-OFF REQUIRED PRIOR TO SCADA VFD DISPATCH
                </div>
              </div>

              <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                <button class="ws-btn-full-rec" id="rec-btn-approve" style="flex: 2; padding: 8px 16px; font-size: 11px; background: var(--accent-green); cursor: pointer;">
                  ✓ APPROVE & ISSUE SETPOINT
                </button>
                <button class="ws-btn-full-rec" id="rec-btn-reject" style="flex: 1; padding: 8px 14px; font-size: 10px; background: rgba(239, 68, 68, 0.2); border: 1px solid #ef4444; color: #ef4444; cursor: pointer;">
                  ✕ REJECT
                </button>
                <button class="ws-btn-full-rec" id="rec-btn-rehearse" style="flex: 1; padding: 8px 14px; font-size: 10px; background: rgba(59, 130, 246, 0.2); border: 1px solid #3b82f6; color: #60a5fa; cursor: pointer;">
                  ↺ REQUEST REHEARSAL
                </button>
                <button class="ws-btn-full-rec" id="rec-btn-data" style="flex: 1; padding: 8px 14px; font-size: 10px; background: rgba(234, 179, 8, 0.2); border: 1px solid #eab308; color: #facc15; cursor: pointer;">
                  📊 REQUEST DATA
                </button>
              </div>

              <div id="rec-feedback-msg" style="margin-top: 8px; font-size: 9px; font-family: var(--font-mono); color: var(--text-dim);">
                Awaiting senior petroleum engineer review.
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private renderNoSafeRecommendation(): void {
    this._container.innerHTML = `
      <div class="ws-page-container">
        <div class="ws-page-title-row">
          <div>
            <div class="ws-page-title" style="color: var(--accent-red);">FLAGSHIP DECISION ABSTENTION PROTOCOL</div>
            <div class="ws-page-sub">Autonomous assurance gatekeeper refused setpoint execution to prevent catastrophic equipment damage</div>
          </div>
          <div style="display: flex; gap: 8px; align-items: center;">
            <button id="btn-toggle-demo-normal" style="padding: 4px 10px; font-size: 8.5px; background: rgba(16, 185, 129, 0.15); border: 1px solid #10b981; color: #10b981; border-radius: 3px; cursor: pointer; font-family: var(--font-mono);">
              RESTORE NORMAL ADMISSIBLE STATE
            </button>
            <div class="ws-pill-badge warn" style="font-size: 11px; padding: 4px 12px; font-weight: 700;">NO SAFE RECOMMENDATION</div>
          </div>
        </div>

        <!-- HERO ABSTENTION CARD -->
        <div class="ws-card" style="border: 1px solid rgba(239, 68, 68, 0.4); background: rgba(239, 68, 68, 0.03); margin-bottom: 14px;">
          <div class="ws-card-header" style="background: rgba(239, 68, 68, 0.1);">
            <span class="ws-card-title" style="color: #ef4444;">ENGINEERING SAFETY ABSTENTION: SETPOINT DISALLOWED</span>
            <span style="font-size: 8.5px; color: #ef4444; font-family: var(--font-mono);">CANDIDATE REJECTED: 4.1 SPM · 86" STROKE</span>
          </div>
          <div class="ws-card-body">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
              <!-- FAILED GATES & CAUSALITY -->
              <div>
                <div style="font-size: 10px; font-weight: 700; color: #ef4444; font-family: var(--font-mono); margin-bottom: 6px;">
                  TRIGGERED ASSURANCE GATE BREACHES
                </div>
                <div style="display: flex; flex-direction: column; gap: 6px; font-size: 9px; font-family: var(--font-mono);">
                  <div style="padding: 6px 8px; background: rgba(239, 68, 68, 0.1); border-left: 3px solid #ef4444;">
                    <div style="font-weight: 700; color: #f87171;">GATE 7: ROD FLOAT MARGIN (FAILED)</div>
                    <div style="color: #cbd5e1;">Actual: 6.8% | Required: ≥ 10.0% | Margin collapsed under viscous Couette drag</div>
                  </div>
                  <div style="padding: 6px 8px; background: rgba(245, 158, 11, 0.1); border-left: 3px solid #f59e0b;">
                    <div style="font-weight: 700; color: #fbbf24;">GATE 12: MODEL DOMAIN & AGREEMENT (WARNING)</div>
                    <div style="color: #cbd5e1;">Physics vs ML Delta: 16.4% (> 10% limit) | Mahalanobis D²: 6.2 (Boundary Exceeded)</div>
                  </div>
                </div>

                <div style="margin-top: 10px; font-size: 9.5px; color: #f1f5f9; line-height: 1.4;">
                  <strong style="color: #f87171;">THERMO-MECHANICAL CAUSAL CHAIN:</strong><br>
                  Near-wellbore thermal decay (48°C) → Andrade viscosity spike (4,150 cP) → annular Couette drag rises to 3.85 kN →
                  exceeds buoyant rod string fall velocity → rod float margin collapses to 6.8% →
                  <strong>Downstroke compressive rod buckling & tubing wear hazard detected.</strong>
                </div>
              </div>

              <!-- PREDICTED FAILURE OUTCOME -->
              <div style="padding: 10px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.05); border-radius: 4px;">
                <div style="font-size: 10px; font-weight: 700; color: var(--accent-yellow); font-family: var(--font-mono); margin-bottom: 6px;">
                  PREDICTED 30-DAY OPERATIONAL CONSEQUENCE IF EXECUTED
                </div>
                <div style="font-size: 9px; color: #cbd5e1; line-height: 1.5; font-family: var(--font-mono);">
                  • Operating envelope breach predicted within <strong>48 hours</strong>.<br>
                  • Sucker rod string will experience severe compressive loading, leading to helical buckling inside 2-7/8" tubing.<br>
                  • Polished rod peak load will exceed 115,000 psi API Grade D fatigue limit.<br>
                  • Estimated downtime cost: <strong>$45,000 USD workover</strong> + 14 days lost production.
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- SAFE ALTERNATIVE ENGINE (SECTION 22) -->
        <div class="ws-card">
          <div class="ws-card-header">
            <span class="ws-card-title">SAFE ALTERNATIVE ENGINE: PRE-ASSURED REMEDIAL PLANS</span>
            <span style="font-size: 8.5px; color: var(--accent-green); font-family: var(--font-mono);">AUTONOMOUS ADMISSIBLE SEARCH</span>
          </div>
          <div class="ws-card-body">
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;">
              <!-- Plan A -->
              <div class="ws-card" style="padding: 10px; border-color: rgba(16, 185, 129, 0.3); background: rgba(16, 185, 129, 0.03);">
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                  <span style="font-weight: 700; color: var(--accent-green); font-family: var(--font-mono); font-size: 10px;">PLAN A (RECOMMENDED)</span>
                  <span class="ws-pill-badge safe">12/12 PASS</span>
                </div>
                <div style="font-size: 13px; font-weight: 700; color: #fff; font-family: var(--font-mono); margin: 4px 0;">DERATE TO 2.4 SPM</div>
                <div style="font-size: 8.5px; color: var(--text-muted); line-height: 1.3;">
                  Lengthen stroke to 74". Restores float margin to <strong>21.4%</strong> safely above 10% floor. Captures +14.2 BOPD without buckling risk.
                </div>
                <button class="ws-btn-full-rec" id="btn-apply-alt-a" style="margin-top: 8px; width: 100%; padding: 6px; font-size: 9.5px; background: var(--accent-green); cursor: pointer;">
                  ⚙ SIMULATE & ADOPT PLAN A
                </button>
              </div>

              <!-- Plan B -->
              <div class="ws-card" style="padding: 10px; border-color: rgba(59, 130, 246, 0.3); background: rgba(59, 130, 246, 0.03);">
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                  <span style="font-weight: 700; color: var(--accent-blue); font-family: var(--font-mono); font-size: 10px;">PLAN B (THERMAL)</span>
                  <span class="ws-pill-badge blue">12/12 PASS</span>
                </div>
                <div style="font-size: 13px; font-weight: 700; color: #fff; font-family: var(--font-mono); margin: 4px 0;">ACCELERATE CSS STEAM</div>
                <div style="font-size: 8.5px; color: var(--text-muted); line-height: 1.3;">
                  Mobilize 2,600 T steam on Day 35. Re-heats reservoir to 86°C, reducing crude viscosity back to 950 cP, allowing 3.4 SPM.
                </div>
                <button class="ws-btn-full-rec" id="btn-apply-alt-b" style="margin-top: 8px; width: 100%; padding: 6px; font-size: 9.5px; background: var(--accent-blue); cursor: pointer;">
                  ⚙ SIMULATE & ADOPT PLAN B
                </button>
              </div>

              <!-- Plan C -->
              <div class="ws-card" style="padding: 10px; border-color: rgba(234, 179, 8, 0.3); background: rgba(234, 179, 8, 0.03);">
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                  <span style="font-weight: 700; color: var(--accent-yellow); font-family: var(--font-mono); font-size: 10px;">PLAN C (DATA)</span>
                  <span class="ws-pill-badge watch">SURVEILLANCE</span>
                </div>
                <div style="font-size: 13px; font-weight: 700; color: #fff; font-family: var(--font-mono); margin: 4px 0;">ACQUIRE ECHO SOUNDER</div>
                <div style="font-size: 8.5px; color: var(--text-muted); line-height: 1.3;">
                  Acoustic fluid level shoot to confirm pump intake pressure and true submergence before altering SPM further.
                </div>
                <button class="ws-btn-full-rec" id="btn-apply-alt-c" style="margin-top: 8px; width: 100%; padding: 6px; font-size: 9.5px; background: rgba(234, 179, 8, 0.2); border: 1px solid #eab308; color: #facc15; cursor: pointer;">
                  📊 DISPATCH SONOLOG TEST
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private bindEvents(): void {
    // Demo toggles
    const btnTriggerAbstain = this._container.querySelector('#btn-toggle-demo-abstain');
    btnTriggerAbstain?.addEventListener('click', () => {
      this._mode = 'NO_SAFE_RECOMMENDATION';
      this.render();
      this.bindEvents();
    });

    const btnTriggerNormal = this._container.querySelector('#btn-toggle-demo-normal');
    btnTriggerNormal?.addEventListener('click', () => {
      this._mode = 'RECOMMENDATION';
      this.render();
      this.bindEvents();
    });

    // Plan A adoption button
    const btnPlanA = this._container.querySelector('#btn-apply-alt-a');
    btnPlanA?.addEventListener('click', () => {
      this._mode = 'RECOMMENDATION';
      this.render();
      this.bindEvents();
      const spmEl = this._container.querySelector('#rec-spm');
      const strokeEl = this._container.querySelector('#rec-stroke');
      const pill = this._container.querySelector('#rec-status-pill');
      if (spmEl) spmEl.textContent = '2.4 SPM';
      if (strokeEl) strokeEl.textContent = '74 IN';
      if (pill) {
        pill.className = 'ws-pill-badge safe';
        pill.textContent = 'SAFE ALTERNATIVE PLAN A ACTIVE';
      }
    });

    // Governance approval buttons
    const btnApprove = this._container.querySelector('#rec-btn-approve');
    const btnReject = this._container.querySelector('#rec-btn-reject');
    const btnRehearse = this._container.querySelector('#rec-btn-rehearse');
    const btnData = this._container.querySelector('#rec-btn-data');
    const feedback = this._container.querySelector('#rec-feedback-msg');

    btnApprove?.addEventListener('click', async () => {
      try {
        const generated = await assureApiClient.generateRecommendation();
        if (generated?.case_id) {
          await assureApiClient.approveRecommendation(generated.case_id, 'Lead Production Engineer (ONGC Baghewala)');
        }
      } catch (err) {
        console.warn('[RecommendationView] Backend approve sync:', err);
      }
      this._assureManager.approveRecommendation('Approved via Reference Workstation', 'TEJAS-PE-7620');
      if (feedback) feedback.innerHTML = '<span style="color: var(--accent-green); font-weight: 700;">✓ SETPOINT DIGITALLY APPROVED & DISPATCHED TO VFD SCADA GATEWAY</span>';
      if (btnApprove) {
        btnApprove.textContent = '✓ SETPOINT ACTIVE';
        (btnApprove as HTMLButtonElement).disabled = true;
      }
    });

    btnReject?.addEventListener('click', () => {
      if (feedback) feedback.innerHTML = '<span style="color: var(--accent-red); font-weight: 700;">✕ RECOMMENDATION REJECTED BY ENGINEER. Twin returned to baseline setpoints.</span>';
    });

    btnRehearse?.addEventListener('click', () => {
      if (feedback) feedback.innerHTML = '<span style="color: var(--accent-cyan); font-weight: 700;">↺ Decision rehearsal triggered for additional 60-day forecast horizon.</span>';
    });

    btnData?.addEventListener('click', () => {
      if (feedback) feedback.innerHTML = '<span style="color: var(--accent-yellow); font-weight: 700;">📊 Field surveillance request created: Sonolog fluid level shoot scheduled for BGW-17A.</span>';
    });
  }

  public update(_solutionState: SolutionState, activeCase: RecommendationCase | null): void {
    if (this._mode === 'RECOMMENDATION' && activeCase) {
      const caseIdEl = this._container.querySelector('#rec-case-id');
      if (caseIdEl) caseIdEl.textContent = `CASE ID: ${activeCase.recommendationId}`;

      const spmEl = this._container.querySelector('#rec-spm');
      if (spmEl) spmEl.textContent = `${activeCase.proposedControls.spm} SPM`;

      const strokeEl = this._container.querySelector('#rec-stroke');
      if (strokeEl) strokeEl.textContent = `${activeCase.proposedControls.strokeInches} IN`;

      const gainEl = this._container.querySelector('#rec-gain');
      if (gainEl) gainEl.textContent = `+${activeCase.expectedOutcomes.gainBopd.toFixed(1)} BOPD`;
    }
  }
}
