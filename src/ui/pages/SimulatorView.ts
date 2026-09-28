/**
 * src/ui/pages/SimulatorView.ts
 * Dedicated Fullscreen 3D Physical Simulator Page.
 * Expands the 3D viewport with floating engineering telemetry,
 * camera view presets, visual modes (Cutaway, Thermal, Flow), and quick setpoint controls.
 */

import type { SimulationClient, SimulationState } from '../../sim/SimulationClient.ts';
import type { AssureTwinManager } from '../../assure/AssureTwinManager.ts';
import { Environment } from '../../scene/Environment.ts';

export class SimulatorView {
  private _container: HTMLElement;
  private _simClient: SimulationClient;
  private _assureManager: AssureTwinManager;
  private _environment: Environment;

  public get assureManager(): AssureTwinManager {
    return this._assureManager;
  }

  constructor(
    container: HTMLElement,
    simClient: SimulationClient,
    assureManager: AssureTwinManager,
    environment: Environment
  ) {
    this._container = container;
    this._simClient = simClient;
    this._assureManager = assureManager;
    this._environment = environment;

    this.render();
    this.bindEvents();
  }

  private render(): void {
    this._container.innerHTML = `
      <div style="position: relative; width: 100%; height: 100%; background: #000;">
        <div id="simview-mount" style="width: 100%; height: 100%;"></div>

        <!-- Floating Camera Presets Bar -->
        <div style="position: absolute; top: 12px; left: 16px; background: rgba(13, 19, 33, 0.85); backdrop-filter: blur(12px); border: 1px solid var(--border-subtle); border-radius: 6px; padding: 4px 8px; display: flex; gap: 6px; z-index: 10;">
          <button class="ws-mode-pill active" id="sim-btn-overview">Overview</button>
          <button class="ws-mode-pill" id="sim-btn-srp">Pumpjack Unit</button>
          <button class="ws-mode-pill" id="sim-btn-steam">Steam Plant</button>
          <button class="ws-mode-pill" id="sim-btn-tanks">Tanks & Sep</button>
          <button class="ws-mode-pill" id="sim-btn-downhole">Downhole Pump</button>
          <button class="ws-mode-pill" id="sim-btn-thermal">Thermal Front</button>
        </div>

        <!-- Floating Controls Card -->
        <div style="position: absolute; top: 54px; left: 16px; width: 240px; background: rgba(15, 23, 42, 0.9); backdrop-filter: blur(12px); border: 1px solid var(--border-card); border-radius: 6px; padding: 12px; z-index: 10; display: flex; flex-direction: column; gap: 8px;">
          <div style="font-size: 10px; font-weight: 700; color: #ffffff; font-family: var(--font-mono); border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 4px;">SRP CONTROLS</div>
          
          <div class="ws-control-item">
            <div class="ws-control-head">
              <span class="ws-control-name">PUMP SPEED</span>
              <span class="ws-control-val" id="sim-spm-val">3.2 SPM</span>
            </div>
            <input type="range" class="ws-range-slider" id="sim-spm-slider" min="0.5" max="10.0" step="0.1" value="3.2">
          </div>

          <div class="ws-control-item">
            <div class="ws-control-head">
              <span class="ws-control-name">STROKE LENGTH</span>
              <span class="ws-control-val" id="sim-stroke-val">64 IN</span>
            </div>
            <input type="range" class="ws-range-slider" id="sim-stroke-slider" min="30" max="120" step="1" value="64">
          </div>

          <div class="ws-control-item">
            <div class="ws-control-head">
              <span class="ws-control-name">STEAM INJECTION</span>
              <span class="ws-control-val" id="sim-steam-val">42.3 T/D</span>
            </div>
            <input type="range" class="ws-range-slider" id="sim-steam-slider" min="0" max="100" step="1" value="42">
          </div>
        </div>

        <!-- Live Telemetry Card -->
        <div style="position: absolute; bottom: 16px; right: 16px; width: 260px; background: rgba(15, 23, 42, 0.9); backdrop-filter: blur(12px); border: 1px solid var(--border-card); border-radius: 6px; padding: 12px; z-index: 10;">
          <div style="font-size: 10px; font-weight: 700; color: #ffffff; font-family: var(--font-mono); border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 4px; margin-bottom: 6px;">PHYSICAL STATE</div>
          <div class="ws-status-row"><span class="ws-status-key">PEAK LOAD</span><span class="ws-status-num" id="sim-tele-pprl">68.0 kN</span></div>
          <div class="ws-status-row"><span class="ws-status-key">ROD DRAG</span><span class="ws-status-num" id="sim-tele-drag">1.85 kN</span></div>
          <div class="ws-status-row"><span class="ws-status-key">INFLOW</span><span class="ws-status-num" id="sim-tele-inflow">38.5 BPD</span></div>
          <div class="ws-status-row"><span class="ws-status-key">VISCOSITY</span><span class="ws-status-num" id="sim-tele-visc">1,392 cP</span></div>
        </div>
      </div>
    `;
  }

  private bindEvents(): void {
    const spmSlider = this._container.querySelector('#sim-spm-slider') as HTMLInputElement;
    spmSlider?.addEventListener('input', () => {
      const val = parseFloat(spmSlider.value);
      this._simClient.setControl('spm', val);
    });

    const strokeSlider = this._container.querySelector('#sim-stroke-slider') as HTMLInputElement;
    strokeSlider?.addEventListener('input', () => {
      const val = parseInt(strokeSlider.value, 10);
      this._simClient.setControl('stroke_inches', val);
    });

    const steamSlider = this._container.querySelector('#sim-steam-slider') as HTMLInputElement;
    steamSlider?.addEventListener('input', () => {
      const val = parseFloat(steamSlider.value);
      this._simClient.setControl('steam_volume', val);
    });

    this._container.querySelector('#sim-btn-overview')?.addEventListener('click', () => this._environment.moveToPreset('exactMatch'));
    this._container.querySelector('#sim-btn-srp')?.addEventListener('click', () => this._environment.moveToPreset('srpUnit'));
    this._container.querySelector('#sim-btn-steam')?.addEventListener('click', () => this._environment.moveToPreset('steamPlant'));
    this._container.querySelector('#sim-btn-tanks')?.addEventListener('click', () => this._environment.moveToPreset('tankBattery'));
    this._container.querySelector('#sim-btn-downhole')?.addEventListener('click', () => this._environment.moveToPreset('horizontalPump'));
    this._container.querySelector('#sim-btn-thermal')?.addEventListener('click', () => this._environment.moveToPreset('thermalFront'));
  }

  public mount3D(): void {
    const mount = this._container.querySelector('#simview-mount') as HTMLElement;
    if (mount && this._environment) {
      mount.appendChild(this._environment.renderer.domElement);
      const rect = mount.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        this._environment.camera.aspect = rect.width / rect.height;
        this._environment.camera.updateProjectionMatrix();
        this._environment.renderer.setSize(rect.width, rect.height, false);
      }
    }
  }

  public update(simState: SimulationState): void {
    const spmVal = this._container.querySelector('#sim-spm-val');
    if (spmVal) spmVal.textContent = `${simState.controls.spm.toFixed(1)} SPM`;

    const strokeVal = this._container.querySelector('#sim-stroke-val');
    if (strokeVal) strokeVal.textContent = `${Math.round(simState.controls.stroke_inches)} IN`;

    const steamVal = this._container.querySelector('#sim-steam-val');
    if (steamVal) steamVal.textContent = `${simState.controls.steam_volume_t_d.toFixed(1)} T/D`;

    const telePprl = this._container.querySelector('#sim-tele-pprl');
    if (telePprl) telePprl.textContent = `${simState.srp.pprl_kn.toFixed(1)} kN`;

    const teleDrag = this._container.querySelector('#sim-tele-drag');
    if (teleDrag) teleDrag.textContent = `${simState.srp.viscous_drag_kn.toFixed(2)} kN`;

    const teleInflow = this._container.querySelector('#sim-tele-inflow');
    if (teleInflow) teleInflow.textContent = `${simState.reservoir.inflow_bpd.toFixed(1)} BPD`;

    const teleVisc = this._container.querySelector('#sim-tele-visc');
    if (teleVisc) teleVisc.textContent = `${Math.round(simState.reservoir.viscosity_cp).toLocaleString()} cP`;
  }
}
