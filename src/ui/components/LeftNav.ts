/**
 * src/ui/components/LeftNav.ts
 * Vertical Left Navigation Sidebar with 6 Industrial Control Room Tiers (Section 37):
 * - OVERVIEW
 * - OBSERVE: Well State, 3D Twin, Production, CSS History, SRP Health, Dynacard
 * - PREDICT: Forecast, Pumpability, Operating Envelope, Failure Risk
 * - REHEARSE: Scenarios, Counterfactual Lab
 * - DECIDE: Optimization, Assurance, Recommendation
 * - TRUST: Model Domain, Provenance, History & Audit, Calibration, Reports, Evidence, Alerts
 * - SETTINGS
 */

export type PageId =
  | 'overview'
  | 'simulator'
  | 'wellstate'
  | 'production'
  | 'csshistory'
  | 'srphealth'
  | 'dynacard'
  | 'forecast'
  | 'pumpability'
  | 'envelope'
  | 'failurerisk'
  | 'scenarios'
  | 'counterfactual'
  | 'optimization'
  | 'assurance'
  | 'recommendation'
  | 'modeldomain'
  | 'provenance'
  | 'history'
  | 'calibration'
  | 'reports'
  | 'evidence'
  | 'alerts'
  | 'settings';

export interface LeftNavCallbacks {
  onSelectPage: (pageId: PageId) => void;
}

export class LeftNav {
  private _container: HTMLElement;
  private _callbacks: LeftNavCallbacks;
  private _activePage: PageId = 'overview';

  constructor(container: HTMLElement, callbacks: LeftNavCallbacks) {
    this._container = container;
    this._callbacks = callbacks;
    this.render();
  }

  public get activePage(): PageId {
    return this._activePage;
  }

  public setActivePage(page: PageId): void {
    this._activePage = page;
    const items = this._container.querySelectorAll('.ws-nav-item');
    items.forEach((item) => {
      const p = item.getAttribute('data-page');
      if (p === page) item.classList.add('active');
      else item.classList.remove('active');
    });
  }

  private render(): void {
    this._container.innerHTML = `
      <nav class="ws-left-nav">
        <div class="ws-nav-list">
          <!-- OVERVIEW -->
          <button class="ws-nav-item active" data-page="overview" title="Command Center Overview">
            <svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            <span>Overview</span>
          </button>

          <!-- 1. OBSERVE -->
          <div class="ws-nav-group-header">OBSERVE</div>
          <button class="ws-nav-item" data-page="wellstate" title="Subsurface State & Virtual Sensors">
            <svg viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
            <span>Well State</span>
          </button>
          <button class="ws-nav-item" data-page="simulator" title="Full 3D WebGL Physical Twin">
            <svg viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
            <span>3D Digital Twin</span>
          </button>
          <button class="ws-nav-item" data-page="production" title="Real-time Production Allocation">
            <svg viewBox="0 0 24 24"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            <span>Production</span>
          </button>
          <button class="ws-nav-item" data-page="csshistory" title="CSS Cyclic Steam History">
            <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
            <span>CSS History</span>
          </button>
          <button class="ws-nav-item" data-page="srphealth" title="SRP Mechanical Health Center">
            <svg viewBox="0 0 24 24"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
            <span>SRP Health</span>
          </button>
          <button class="ws-nav-item" data-page="dynacard" title="Dynamometer Card Diagnostics">
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M8 12s1.5-4 4-4 4 4 4 4-1.5 4-4 4-4-4-4-4z"/></svg>
            <span>Dynacard</span>
          </button>

          <!-- 2. PREDICT -->
          <div class="ws-nav-group-header">PREDICT</div>
          <button class="ws-nav-item" data-page="forecast" title="Multi-Horizon Forward Projections">
            <svg viewBox="0 0 24 24"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
            <span>Forecast</span>
          </button>
          <button class="ws-nav-item" data-page="pumpability" title="Predictive Pumpability Window">
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 15"/></svg>
            <span>Pumpability</span>
          </button>
          <button class="ws-nav-item" data-page="envelope" title="Dynamic Operating Envelope">
            <svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
            <span>Operating Envelope</span>
          </button>
          <button class="ws-nav-item" data-page="failurerisk" title="Goodman Fatigue & Failure Risk">
            <svg viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            <span>Failure Risk</span>
          </button>

          <!-- 3. REHEARSE -->
          <div class="ws-nav-group-header">REHEARSE</div>
          <button class="ws-nav-item" data-page="scenarios" title="30-Day Decision Rehearsal (4 Scenarios)">
            <svg viewBox="0 0 24 24"><line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/></svg>
            <span>Scenarios</span>
          </button>
          <button class="ws-nav-item" data-page="counterfactual" title="Interactive What-If Sandbox">
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <span>Counterfactual Lab</span>
          </button>

          <!-- 4. DECIDE -->
          <div class="ws-nav-group-header">DECIDE</div>
          <button class="ws-nav-item" data-page="optimization" title="Joint Multi-Objective Optimization">
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            <span>Optimization</span>
          </button>
          <button class="ws-nav-item" data-page="assurance" title="12-Checkpoint Multi-Tier Assurance Gate">
            <svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>
            <span>Assurance (12-Gate)</span>
          </button>
          <button class="ws-nav-item" data-page="recommendation" title="Decision Contract & Abstention Protocol">
            <svg viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            <span>Recommendation</span>
          </button>

          <!-- 5. TRUST -->
          <div class="ws-nav-group-header">TRUST & AUDIT</div>
          <button class="ws-nav-item" data-page="modeldomain" title="OOD Guard & Physics-ML Agreement">
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
            <span>Model Domain</span>
          </button>
          <button class="ws-nav-item" data-page="provenance" title="Data Provenance & 8-Badge Lineage">
            <svg viewBox="0 0 24 24"><path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"/><line x1="16" y1="8" x2="2" y2="22"/><line x1="17.5" y1="15" x2="9" y2="15"/></svg>
            <span>Data Provenance</span>
          </button>
          <button class="ws-nav-item" data-page="history" title="Cryptographic Decision Audit Trail">
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <span>History & Audit</span>
          </button>
          <button class="ws-nav-item" data-page="calibration" title="Model Recalibration Center">
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M16.2 7.8l-2 6.3-6.4 2 2-6.3z"/></svg>
            <span>Calibration</span>
          </button>
          <button class="ws-nav-item" data-page="reports" title="Certified Engineering Decision Reports">
            <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            <span>Reports</span>
          </button>
          <button class="ws-nav-item" data-page="evidence" title="Working vs Future Truthful Matrix">
            <svg viewBox="0 0 24 24"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
            <span>Evidence Mode</span>
          </button>
          <button class="ws-nav-item" data-page="alerts" title="Real-Time Alarm System">
            <svg viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            <span>Alerts</span>
          </button>

          <!-- 6. SETTINGS -->
          <div class="ws-nav-group-header">SYSTEM</div>
          <button class="ws-nav-item" data-page="settings" title="System Settings & Units">
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            <span>Settings</span>
          </button>
        </div>

        <!-- BOTTOM WIDGETS: WELL STATUS & DATA PROVENANCE -->
        <div class="ws-nav-footer">
          <div class="ws-status-card" id="nav-well-status-card">
            <div class="ws-status-head">
              <span class="ws-status-lbl">WELL STATUS</span>
              <span class="ws-status-info-icon" title="Current overall cyber-physical system health">?</span>
            </div>
            <div class="ws-status-main">
              <div class="ws-status-badge-text" id="nav-well-status-text">NORMAL</div>
              <div class="ws-status-sub" id="nav-well-status-sub">Operating within safe window</div>
            </div>
          </div>

          <div class="ws-provenance-legend">
            <div class="ws-prov-header">DATA PROVENANCE</div>
            <div class="ws-prov-row"><span class="ws-prov-dot cyan"></span> Measured</div>
            <div class="ws-prov-row"><span class="ws-prov-dot yellow"></span> Calibrated</div>
            <div class="ws-prov-row"><span class="ws-prov-dot orange"></span> Model-Derived</div>
            <div class="ws-prov-row"><span class="ws-prov-dot blue"></span> Predicted</div>
            <div class="ws-prov-row"><span class="ws-prov-dot white"></span> Synthetic / Demo</div>
          </div>
        </div>
      </nav>
    `;

    this.bindEvents();
  }

  private bindEvents(): void {
    const items = this._container.querySelectorAll('.ws-nav-item');
    items.forEach((item) => {
      item.addEventListener('click', () => {
        const page = item.getAttribute('data-page') as PageId;
        if (page) {
          this.setActivePage(page);
          this._callbacks.onSelectPage(page);
        }
      });
    });
  }

  public updateStatus(status: 'NORMAL' | 'WARNING' | 'CRITICAL'): void {
    const textEl = this._container.querySelector('#nav-well-status-text');
    const cardEl = this._container.querySelector('#nav-well-status-card');
    if (textEl && cardEl) {
      textEl.textContent = status;
      cardEl.className = `ws-status-card ${status.toLowerCase()}`;
    }
  }
}
