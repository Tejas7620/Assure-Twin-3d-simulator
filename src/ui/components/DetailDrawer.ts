/**
 * src/ui/components/DetailDrawer.ts
 * Unified Engineering Inspector Drawer & Modal System.
 * Powers deep drill-down inspections for:
 * - Pumpability Window details
 * - Thermo-Mechanical Operating Envelope interactive inspector
 * - SRP Rod & Pump Diagnostics
 * - Full Dynamometer Analysis
 * - Alert Details & Anomaly investigation
 * - Top KPI deep dives (Oil Rate, Liquid, Water Cut, Steam, SOR, Pwf, Temp, Viscosity)
 */

export interface DrawerAction {
  label: string;
  primary?: boolean;
  danger?: boolean;
  onClick: () => void;
}

export interface DrawerContent {
  title: string;
  subtitle?: string;
  badge?: { text: string; type: 'safe' | 'warning' | 'critical' | 'info' };
  bodyHtml: string;
  actions?: DrawerAction[];
  onMount?: (contentEl: HTMLElement) => void;
}

export class DetailDrawer {
  private static _instance: DetailDrawer | null = null;
  private _container: HTMLElement;
  private _backdrop: HTMLElement;
  private _panel: HTMLElement;
  private _currentContent: DrawerContent | null = null;

  public get currentContent(): DrawerContent | null {
    return this._currentContent;
  }

  constructor() {
    this._container = document.createElement('div');
    this._container.id = 'ws-detail-drawer-root';
    this._container.className = 'ws-drawer-root hidden';

    this._container.innerHTML = `
      <div class="ws-drawer-backdrop" id="drawer-backdrop"></div>
      <aside class="ws-drawer-panel" id="drawer-panel" role="dialog" aria-modal="true">
        <header class="ws-drawer-header">
          <div class="ws-drawer-title-group">
            <div style="display: flex; align-items: center; gap: 8px;">
              <h2 class="ws-drawer-title" id="drawer-title">INSPECTOR</h2>
              <span class="ws-pill-badge" id="drawer-badge" style="display: none;"></span>
            </div>
            <div class="ws-drawer-subtitle" id="drawer-subtitle"></div>
          </div>
          <button class="ws-drawer-close" id="drawer-btn-close" title="Close Inspector (Esc)">
            <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </header>
        <div class="ws-drawer-body" id="drawer-body"></div>
        <footer class="ws-drawer-footer" id="drawer-footer"></footer>
      </aside>
    `;

    document.body.appendChild(this._container);

    this._backdrop = this._container.querySelector('#drawer-backdrop') as HTMLElement;
    this._panel = this._container.querySelector('#drawer-panel') as HTMLElement;

    this.bindEvents();
  }

  public static getInstance(): DetailDrawer {
    if (!DetailDrawer._instance) {
      DetailDrawer._instance = new DetailDrawer();
    }
    return DetailDrawer._instance;
  }

  private bindEvents(): void {
    this._backdrop.addEventListener('click', () => this.close());
    const closeBtn = this._container.querySelector('#drawer-btn-close');
    closeBtn?.addEventListener('click', () => this.close());

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !this._container.classList.contains('hidden')) {
        this.close();
      }
    });
  }

  public open(content: DrawerContent): void {
    this._currentContent = content;

    const titleEl = this._container.querySelector('#drawer-title');
    const subEl = this._container.querySelector('#drawer-subtitle');
    const badgeEl = this._container.querySelector('#drawer-badge') as HTMLElement;
    const bodyEl = this._container.querySelector('#drawer-body') as HTMLElement;
    const footerEl = this._container.querySelector('#drawer-footer') as HTMLElement;

    if (titleEl) titleEl.textContent = content.title;
    if (subEl) subEl.textContent = content.subtitle || '';

    if (badgeEl) {
      if (content.badge) {
        badgeEl.textContent = content.badge.text;
        badgeEl.className = `ws-pill-badge ${content.badge.type}`;
        badgeEl.style.display = 'inline-block';
      } else {
        badgeEl.style.display = 'none';
      }
    }

    if (bodyEl) {
      bodyEl.innerHTML = content.bodyHtml;
      content.onMount?.(bodyEl);
    }

    if (footerEl) {
      footerEl.innerHTML = '';
      if (content.actions && content.actions.length > 0) {
        footerEl.style.display = 'flex';
        content.actions.forEach((act) => {
          const btn = document.createElement('button');
          btn.className = `ws-btn-drawer-action ${act.primary ? 'primary' : ''} ${act.danger ? 'danger' : ''}`;
          btn.textContent = act.label;
          btn.addEventListener('click', () => {
            act.onClick();
          });
          footerEl.appendChild(btn);
        });
      } else {
        footerEl.style.display = 'none';
      }
    }

    this._container.classList.remove('hidden');
    requestAnimationFrame(() => {
      this._panel.classList.add('open');
    });
  }

  public close(): void {
    this._panel.classList.remove('open');
    setTimeout(() => {
      this._container.classList.add('hidden');
      this._currentContent = null;
    }, 200);
  }
}
