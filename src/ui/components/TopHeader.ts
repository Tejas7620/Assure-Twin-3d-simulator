/**
 * src/ui/components/TopHeader.ts
 * Master Top Context Bar matching reference image with pixel-level precision.
 * Contains brand, well selector, field, mode, live simulation clock with play/pause and speed,
 * circular data quality badge, last updated timestamp, notifications, and system health status.
 */

import type { SimulationState } from '../../sim/SimulationClient.ts';
import type { SolutionState } from '../../assure/types.ts';

export interface HeaderCallbacks {
  onWellChange?: (well: string) => void;
  onModeChange?: (mode: string) => void;
  onTogglePlayPause?: () => void;
  onSpeedChange?: (speed: number) => void;
  onOpenNotifications?: () => void;
}

export class TopHeader {
  private _container: HTMLElement;
  private _callbacks: HeaderCallbacks;
  private _isPlaying: boolean = true;
  private _playbackSpeed: number = 1.0;

  constructor(container: HTMLElement, callbacks: HeaderCallbacks = {}) {
    this._container = container;
    this._callbacks = callbacks;
    this.render();
  }

  private render(): void {
    this._container.innerHTML = `
      <header class="ws-header">
        <!-- BRAND -->
        <div class="ws-brand-group">
          <div class="ws-brand-title">ASSURE-TWIN</div>
          <div class="ws-brand-sub">Decision-Assured Well-to-Surface Digital Twin</div>
        </div>

        <!-- SELECTORS & STATUS GROUP -->
        <div class="ws-header-center">
          <!-- WELL SELECTOR -->
          <div class="ws-header-item">
            <span class="ws-item-label">WELL</span>
            <div class="ws-select-box" id="hdr-well-select">
              <span class="ws-select-val">BGW-17A</span>
              <svg class="ws-chevron" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>
            </div>
          </div>

          <!-- FIELD SELECTOR -->
          <div class="ws-header-item">
            <span class="ws-item-label">FIELD</span>
            <div class="ws-static-box">Baghewala</div>
          </div>

          <!-- MODE SELECTOR -->
          <div class="ws-header-item">
            <span class="ws-item-label">MODE</span>
            <div class="ws-select-box" id="hdr-mode-select">
              <span class="ws-select-val">Joint (CSS + SRP)</span>
              <svg class="ws-chevron" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>
            </div>
          </div>

          <!-- SIMULATION TIME & CONTROLS -->
          <div class="ws-header-item">
            <span class="ws-item-label">SIMULATION TIME</span>
            <div class="ws-time-box">
              <span class="ws-time-days" id="hdr-sim-days">Day 18.35</span>
              <span class="ws-time-clock" id="hdr-sim-clock">08:15:42 AM</span>
              <button class="ws-btn-play" id="hdr-btn-play" title="Play/Pause Simulation">
                <svg viewBox="0 0 24 24" id="hdr-play-icon"><polygon points="6 4 20 12 6 20 6 4"/></svg>
              </button>
              <div class="ws-speed-select" id="hdr-speed-select">
                <span>1x</span>
                <svg class="ws-chevron" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>
              </div>
            </div>
          </div>

          <!-- DATA QUALITY GAUGE -->
          <div class="ws-header-item ws-dq-group">
            <span class="ws-item-label">DATA QUALITY</span>
            <div class="ws-dq-box">
              <div class="ws-dq-ring">
                <svg viewBox="0 0 36 36" class="ws-dq-svg">
                  <path class="ws-dq-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
                  <path class="ws-dq-fill" id="hdr-dq-fill" stroke-dasharray="98, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
                </svg>
                <span class="ws-dq-text" id="hdr-dq-pct">98%</span>
              </div>
              <div class="ws-dq-status">
                <span class="ws-dq-num" id="hdr-dq-val">98%</span>
                <span class="ws-dq-lbl good" id="hdr-dq-state">Good</span>
              </div>
            </div>
          </div>

          <!-- LAST UPDATED -->
          <div class="ws-header-item">
            <span class="ws-item-label">LAST UPDATED</span>
            <div class="ws-update-box">
              <span class="ws-update-time" id="hdr-update-time">08:15:42 AM</span>
              <span class="ws-update-date">May 20, 2026</span>
            </div>
          </div>
        </div>

        <!-- RIGHT UTILITY ICONS -->
        <div class="ws-header-right">
          <!-- Notification Bell with Count 2 -->
          <button class="ws-hdr-icon-btn" id="hdr-btn-bell" title="Alerts & Notifications (2 unread)">
            <svg viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            <span class="ws-badge-count">2</span>
          </button>

          <!-- User Profile -->
          <button class="ws-hdr-icon-btn" title="Operator Profile">
            <svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          </button>

          <!-- System Normal status indicator -->
          <div class="ws-system-status" id="hdr-system-status-container">
            <span class="ws-dot-live"></span>
            <span class="ws-status-text" id="hdr-system-health">System Normal</span>
          </div>
        </div>
      </header>
    `;

    this.bindEvents();
  }

  private bindEvents(): void {
    const playBtn = this._container.querySelector('#hdr-btn-play');
    if (playBtn) {
      playBtn.addEventListener('click', () => {
        this._isPlaying = !this._isPlaying;
        const icon = this._container.querySelector('#hdr-play-icon');
        if (icon) {
          icon.innerHTML = this._isPlaying
            ? '<polygon points="6 4 20 12 6 20 6 4"/>'
            : '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>';
        }
        this._callbacks.onTogglePlayPause?.();
      });
    }

    const bellBtn = this._container.querySelector('#hdr-btn-bell');
    if (bellBtn) {
      bellBtn.addEventListener('click', () => {
        this._callbacks.onOpenNotifications?.();
      });
    }

    const speedSelect = this._container.querySelector('#hdr-speed-select');
    if (speedSelect) {
      speedSelect.addEventListener('click', () => {
        const speeds = [0.5, 1.0, 2.0, 5.0];
        const nextIdx = (speeds.indexOf(this._playbackSpeed) + 1) % speeds.length;
        this._playbackSpeed = speeds[nextIdx];
        const lbl = speedSelect.querySelector('span');
        if (lbl) lbl.textContent = `${this._playbackSpeed}x`;
        this._callbacks.onSpeedChange?.(this._playbackSpeed);
      });
    }
  }

  public update(simState: SimulationState, solutionState: SolutionState): void {
    const daysEl = this._container.querySelector('#hdr-sim-days');
    if (daysEl) {
      daysEl.textContent = `Day ${simState.time.sim_time_days.toFixed(2)}`;
    }

    const dqPct = solutionState.dataQuality.score;
    const dqFill = this._container.querySelector('#hdr-dq-fill') as SVGPathElement | null;
    const dqText = this._container.querySelector('#hdr-dq-pct');
    const dqVal = this._container.querySelector('#hdr-dq-val');
    const dqState = this._container.querySelector('#hdr-dq-state');

    if (dqFill && dqText && dqVal && dqState) {
      dqFill.setAttribute('stroke-dasharray', `${dqPct}, 100`);
      dqText.textContent = `${dqPct}%`;
      dqVal.textContent = `${dqPct}%`;
      dqState.textContent = dqPct >= 90 ? 'Good' : (dqPct >= 70 ? 'Fair' : 'Degraded');
      dqState.className = `ws-dq-lbl ${dqPct >= 70 ? 'good' : 'warning'}`;
    }

    const healthEl = this._container.querySelector('#hdr-system-health');
    const statusContainer = this._container.querySelector('#hdr-system-status-container');
    if (healthEl && statusContainer) {
      if (solutionState.wellHealth === 'CRITICAL') {
        healthEl.textContent = 'System Critical';
        statusContainer.className = 'ws-system-status critical';
      } else if (solutionState.wellHealth === 'WARNING') {
        healthEl.textContent = 'System Warning';
        statusContainer.className = 'ws-system-status warning';
      } else {
        healthEl.textContent = 'System Normal';
        statusContainer.className = 'ws-system-status normal';
      }
    }
  }
}
