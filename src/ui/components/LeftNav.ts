/**
 * src/ui/components/LeftNav.ts
 * Vertical Left Navigation Sidebar matching the reference image.
 * Features 11 pages/views, active indicators, and bottom Well Status card.
 */

export type PageId =
  | 'overview'
  | 'simulator'
  | 'wellstate'
  | 'forecast'
  | 'scenarios'
  | 'optimization'
  | 'recommendation'
  | 'assurance'
  | 'alerts'
  | 'history'
  | 'calibration'
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
          <button class="ws-nav-item active" data-page="overview" title="Command Center Overview">
            <svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            <span>Overview</span>
          </button>

          <button class="ws-nav-item" data-page="simulator" title="Full 3D Physical Simulator">
            <svg viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
            <span>3D Simulator</span>
          </button>

          <button class="ws-nav-item" data-page="wellstate" title="Subsurface State & Virtual Sensors">
            <svg viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
            <span>Well State</span>
          </button>

          <button class="ws-nav-item" data-page="forecast" title="Multi-Horizon Forward Projections">
            <svg viewBox="0 0 24 24"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
            <span>Forecast</span>
          </button>

          <button class="ws-nav-item" data-page="scenarios" title="4 Counterfactuals & Custom Rehearsal">
            <svg viewBox="0 0 24 24"><line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/></svg>
            <span>Scenarios</span>
          </button>

          <button class="ws-nav-item" data-page="optimization" title="Joint Multi-Objective Optimization">
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            <span>Optimization</span>
          </button>

          <button class="ws-nav-item" data-page="recommendation" title="Certified Recommendation Contract">
            <svg viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            <span>Recommendation</span>
          </button>

          <button class="ws-nav-item" data-page="assurance" title="12-Checkpoint Multi-Tier Assurance Gate">
            <svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>
            <span>Assurance</span>
          </button>

          <button class="ws-nav-item" data-page="alerts" title="State-Driven Alert Center">
            <svg viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            <span>Alerts</span>
          </button>

          <button class="ws-nav-item" data-page="history" title="Cryptographic Decision Audit Trail">
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <span>History & Audit</span>
          </button>

          <button class="ws-nav-item" data-page="calibration" title="Model Recalibration Center">
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M16.2 7.8l-2 6.3-6.4 2 2-6.3z"/></svg>
            <span>Calibration</span>
          </button>

          <button class="ws-nav-item" data-page="settings" title="System Settings & Units">
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            <span>Settings</span>
          </button>
        </div>

        <!-- BOTTOM WELL STATUS WIDGET -->
        <div class="ws-nav-footer">
          <div class="ws-status-card" id="nav-well-status-card">
            <div class="ws-status-head">
              <span class="ws-status-lbl">WELL STATUS</span>
            </div>
            <div class="ws-status-main">
              <div class="ws-status-badge-text" id="nav-well-status-text">NORMAL</div>
              <div class="ws-status-sub">Operating within safe window</div>
            </div>
            <div class="ws-status-shield">
              <svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>
            </div>
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
