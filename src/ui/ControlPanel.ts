import * as THREE from 'three';
import { SimulationClient, type SimulationState } from '../sim/SimulationClient.ts';
import { Environment } from '../scene/Environment.ts';
import { PumpjackModel } from '../scene/PumpjackModel.ts';
import { ThermalViscosityGrid, type VisualMode } from '../scene/ThermalViscosityGrid.ts';
import { FluidPath } from '../scene/FluidPath.ts';
import { DynoCard } from './DynoCard.ts';

export class ControlPanel {
  private _container: HTMLElement;
  private simClient: SimulationClient;
  private model: PumpjackModel;
  private environment: Environment;
  private thermalGrid: ThermalViscosityGrid;
  private fluidPath: FluidPath;
  private dynoCard!: DynoCard;

  // Raycaster for 3D clickable inspection
  private _raycaster: THREE.Raycaster = new THREE.Raycaster();
  private _mouse: THREE.Vector2 = new THREE.Vector2();

  // Inspector Card
  private _elInspectorCard!: HTMLElement;

  // Active visual mode
  private _showFluidPath: boolean = true;
  private _isDownholeFollow: boolean = false;

  constructor(
    simClient: SimulationClient,
    model: PumpjackModel,
    environment: Environment,
    thermalGrid: ThermalViscosityGrid,
    fluidPath: FluidPath
  ) {
    this.simClient = simClient;
    this.model = model;
    this.environment = environment;
    this.thermalGrid = thermalGrid;
    this.fluidPath = fluidPath;

    this._container = document.createElement('div');
    this._container.id = 'ui-root';
    document.body.appendChild(this._container);

    this.render();
    this.initDynoCard();
    this.bindEvents();

    // Subscribe to authoritative simulation state
    this.simClient.subscribe(state => this.update(state));
  }

  private render(): void {
    this._container.innerHTML = `
      <!-- TOP NAVIGATION & TOOLBAR -->
      <header class="app-header">
        <div class="header-brand">
          <div class="status-pulse-live"></div>
          <span class="brand-title">ASSURE-TWIN // 3D SIMULATOR</span>
          <span class="badge-tag">SYNTHETIC DEMO · API 11E / 11AX</span>
        </div>

        <!-- Center Toolbar -->
        <nav class="center-toolbar">
          <button class="tool-btn active" id="btn-cam-overview" title="Full Field Overview">
            <svg class="icon-svg" viewBox="0 0 24 24"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
            <span>Overview</span>
          </button>
          <button class="tool-btn" id="btn-cam-srp" title="Pumpjack Unit Close-up">
            <svg class="icon-svg" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
            <span>Pumpjack</span>
          </button>
          <button class="tool-btn" id="btn-cam-downhole" title="Downhole Pump & Oil Flow">
            <svg class="icon-svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="8 12 12 16 16 12"/><line x1="12" y1="8" x2="12" y2="16"/></svg>
            <span>Downhole Pump</span>
          </button>
          <button class="tool-btn" id="btn-cam-tanks" title="Oil Separator & Storage Tanks">
            <svg class="icon-svg" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
            <span>Tanks & Sep</span>
          </button>
          <button class="tool-btn" id="btn-toggle-fluid" title="Toggle 3D Fluid Flow Trajectory">
            <svg class="icon-svg" viewBox="0 0 24 24"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>
            <span>Fluid Flow</span>
          </button>
          <button class="tool-btn" id="btn-cam-reset" title="Reset View">
            <svg class="icon-svg" viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><polyline points="3 3 3 8 8 8"/></svg>
            <span>Reset</span>
          </button>
        </nav>

        <!-- Right Controls: Visual Mode & Compass -->
        <div class="header-right">
          <div class="visual-mode-box">
            <label class="ctrl-sublabel">VISUAL MODE</label>
            <select id="select-visual-mode" class="glass-select">
              <option value="realistic" selected>Realistic</option>
              <option value="thermal">Thermal Mode</option>
              <option value="viscosity">Viscosity Field</option>
              <option value="pressure">Pressure Drawdown</option>
              <option value="cutaway">3D Cutaway</option>
              <option value="exploded">Exploded Well</option>
            </select>
          </div>
          <div class="compass-widget" title="Camera Heading">
            <div class="compass-circle">
              <span class="c-n">N</span><span class="c-e">E</span><span class="c-s">S</span><span class="c-w">W</span>
              <div class="c-needle" id="compass-needle"></div>
            </div>
          </div>
        </div>
      </header>

      <!-- LEFT PANEL: CONTROLS & SCENARIOS (20%) -->
      <aside class="left-control-dock">
        <!-- 1. Automated Engineering Demos -->
        <div class="panel-card demo-card">
          <div class="card-caption">PHYSICS EXPERIMENTS</div>
          <div class="btn-grid-2">
            <button class="demo-action-btn primary" id="btn-demo-physics" title="Run full thermal cooling -> CSS heating cycle">RUN PHYSICS DEMO</button>
            <button class="demo-action-btn" id="btn-demo-spm" title="Compare SPM 2.0 vs 4.0 cycles">SPM EXPERIMENT</button>
          </div>
        </div>

        <!-- 2. Scenario Presets -->
        <div class="panel-card">
          <div class="card-caption">OPERATIONAL SCENARIOS</div>
          <div class="scenario-buttons">
            <button class="scen-btn" data-scen="CURRENT PRACTICE">CURRENT</button>
            <button class="scen-btn" data-scen="CSS ONLY">CSS ONLY</button>
            <button class="scen-btn" data-scen="SRP ONLY">SRP ONLY</button>
            <button class="scen-btn active" data-scen="JOINT">JOINT (OPTIMAL)</button>
          </div>
        </div>

        <!-- 3. SRP Controls (SPM & Stroke) -->
        <div class="panel-card">
          <div class="card-caption-row">
            <span>PUMP SPEED (SPM)</span>
            <span class="accent-val" id="disp-spm">3.2</span>
          </div>
          <div class="preset-pill-row">
            <button class="pill-btn" data-spm="2.0">2.0 (Slow)</button>
            <button class="pill-btn active" data-spm="3.2">3.2 (Norm)</button>
            <button class="pill-btn" data-spm="4.0">4.0 (Fast)</button>
          </div>
          <div class="slider-box">
            <input type="range" id="slider-spm" min="1.0" max="8.0" step="0.1" value="3.2" />
          </div>

          <div class="card-caption-row" style="margin-top: 10px;">
            <span>STROKE LENGTH</span>
            <span class="accent-val" id="disp-stroke">64 in</span>
          </div>
          <div class="preset-pill-row">
            <button class="pill-btn" data-stroke="48">48"</button>
            <button class="pill-btn active" data-stroke="64">64"</button>
            <button class="pill-btn" data-stroke="84">84"</button>
            <button class="pill-btn" data-stroke="96">96"</button>
          </div>
          <div class="slider-box">
            <input type="range" id="slider-stroke" min="36" max="100" step="2" value="64" />
          </div>
        </div>

        <!-- 4. Thermal & Reservoir Controls -->
        <div class="panel-card">
          <div class="card-caption-row">
            <span>STEAM INJECTION RATE</span>
            <span class="accent-val" id="disp-steam">42.3 t/d</span>
          </div>
          <div class="slider-box">
            <input type="range" id="slider-steam" min="0" max="100" step="1" value="42" />
          </div>

          <div class="card-caption-row" style="margin-top: 8px;">
            <span>WATER CUT</span>
            <span class="accent-val" id="disp-wc">12.8 %</span>
          </div>
          <div class="slider-box">
            <input type="range" id="slider-wc" min="0" max="0.9" step="0.01" value="0.128" />
          </div>

          <div class="card-caption-row" style="margin-top: 8px;">
            <span>BOTTOMHOLE PWF</span>
            <span class="accent-val" id="disp-pwf">18.2 bar</span>
          </div>
          <div class="slider-box">
            <input type="range" id="slider-pwf" min="5" max="60" step="0.5" value="18.2" />
          </div>
        </div>
      </aside>

      <!-- RIGHT PANEL: LIVE ENGINEERING DATA & DYNAMOMETER (20%) -->
      <aside class="right-telemetry-dock">
        <!-- Live Causal Propagation Chain -->
        <div class="panel-card causal-chain-card">
          <div class="card-caption">PHYSICS CAUSAL CHAIN</div>
          <div class="causal-flow">
            <span class="c-node" id="c-steam">STEAM</span> ➔
            <span class="c-node" id="c-temp">TEMP</span> ➔
            <span class="c-node" id="c-visc">VISC</span> ➔
            <span class="c-node" id="c-inflow">INFLOW</span> ➔
            <span class="c-node" id="c-pump">PUMP</span> ➔
            <span class="c-node" id="c-load">LOAD</span> ➔
            <span class="c-node" id="c-prod">PROD</span>
          </div>
        </div>

        <!-- Primary Production KPIs -->
        <div class="panel-card">
          <div class="kpi-banner">
            <span class="kpi-label">OIL PRODUCTION RATE</span>
            <span class="kpi-large" id="kpi-oil-rate">32.4 <span class="unit">BOPD</span></span>
          </div>
          <div class="kpi-subgrid">
            <div class="kpi-item">
              <span class="sub-label">LIQUID RATE</span>
              <span class="sub-val" id="kpi-liq-rate">37.1 BPD</span>
            </div>
            <div class="kpi-item">
              <span class="sub-label">WATER CUT</span>
              <span class="sub-val" id="kpi-wc">12.8%</span>
            </div>
            <div class="kpi-item">
              <span class="sub-label">INFLOW (IPR)</span>
              <span class="sub-val" id="kpi-inflow">38.5 BPD</span>
            </div>
            <div class="kpi-item">
              <span class="sub-label">PUMP CAPACITY</span>
              <span class="sub-val" id="kpi-pump-cap">42.5 BPD</span>
            </div>
          </div>
        </div>

        <!-- Pump Fillage & SRP Dynamics -->
        <div class="panel-card">
          <div class="card-caption-row">
            <span>PUMP FILLAGE</span>
            <span class="status-badge" id="kpi-fillage-status">NORMAL</span>
          </div>
          <div class="progress-track">
            <div class="progress-bar-fill" id="fillage-bar" style="width: 76%;"></div>
          </div>
          <div class="kpi-subgrid" style="margin-top: 8px;">
            <div class="kpi-item">
              <span class="sub-label">PEAK LOAD</span>
              <span class="sub-val" id="kpi-pprl">18.7 kN</span>
            </div>
            <div class="kpi-item">
              <span class="sub-label">FLOAT MARGIN</span>
              <span class="sub-val" id="kpi-float">28.9%</span>
            </div>
            <div class="kpi-item">
              <span class="sub-label">TEMPERATURE</span>
              <span class="sub-val" id="kpi-temp">72.6 °C</span>
            </div>
            <div class="kpi-item">
              <span class="sub-label">VISCOSITY</span>
              <span class="sub-val" id="kpi-visc">1,840 cP</span>
            </div>
          </div>
        </div>

        <!-- Live SRP Dynamometer Card -->
        <div class="panel-card">
          <div class="card-caption">LIVE DYNAMOMETER CARD</div>
          <div id="dyno-container" class="dyno-wrapper"></div>
          <div class="dyno-legend-row">
            <span class="dyno-key"><span class="dot amber"></span> Surface Card</span>
            <span class="dyno-key"><span class="dot cyan"></span> Pump Card</span>
          </div>
        </div>

        <!-- Economics & Energy -->
        <div class="panel-card">
          <div class="kpi-subgrid">
            <div class="kpi-item">
              <span class="sub-label">POWER</span>
              <span class="sub-val" id="kpi-power">14.2 kW</span>
            </div>
            <div class="kpi-item">
              <span class="sub-label">ENERGY / BBL</span>
              <span class="sub-val" id="kpi-energy">10.5 kWh/bbl</span>
            </div>
            <div class="kpi-item">
              <span class="sub-label">CUM. OIL</span>
              <span class="sub-val" id="kpi-cum-oil">1,420 bbl</span>
            </div>
            <div class="kpi-item">
              <span class="sub-label">SOR</span>
              <span class="sub-val" id="kpi-sor">6.7</span>
            </div>
          </div>
        </div>
      </aside>

      <!-- BOTTOM TIMELINE DOCK (Timeline, CSS Phases & Time Controls) -->
      <footer class="bottom-timeline-dock">
        <div class="timeline-header">
          <div class="phase-display">
            <span class="phase-label">CSS PHASE:</span>
            <span class="phase-badge-lg" id="disp-css-phase">PRODUCTION</span>
          </div>
          <div class="sim-day-display">
            <span class="day-val" id="disp-sim-day">DAY 30.0</span>
          </div>
          <div class="speed-controls">
            <span class="speed-label">SPEED:</span>
            <button class="speed-btn" data-spd="0.5">0.5x</button>
            <button class="speed-btn active" data-spd="1.0">1x</button>
            <button class="speed-btn" data-spd="2.0">2x</button>
            <button class="speed-btn" data-spd="5.0">5x</button>
            <button class="speed-btn" data-spd="20.0">20x</button>
          </div>
        </div>

        <!-- Interactive 60-Day CSS Cycle Track -->
        <div class="timeline-track-container">
          <div class="cycle-segments">
            <div class="seg injection">INJECTION (Days 0-10)</div>
            <div class="seg soak">SOAK (Days 10-15)</div>
            <div class="seg production">PRODUCTION (Days 15-45)</div>
            <div class="seg cooling">COOLING (Days 45-60)</div>
          </div>
          <div class="timeline-bar">
            <div class="timeline-progress-fill" id="timeline-fill" style="width: 50%;"></div>
            <div class="timeline-scrubber" id="timeline-scrubber" style="left: 50%;"></div>
          </div>
        </div>
      </footer>

      <!-- 3D CLICKABLE INSPECTOR MODAL -->
      <div class="inspector-card" id="inspector-card" style="display: none;">
        <div class="insp-header">
          <span class="insp-title" id="insp-title">COMPONENT INSPECTOR</span>
          <button class="insp-close" id="insp-close">×</button>
        </div>
        <div class="insp-body" id="insp-body">
          <!-- Populated dynamically upon clicking 3D objects -->
        </div>
      </div>
    `;

    // Cache elements
    this._elInspectorCard = this._container.querySelector('#inspector-card')!;
  }

  private initDynoCard(): void {
    const dynoBox = this._container.querySelector('#dyno-container') as HTMLElement;
    if (dynoBox) {
      this.dynoCard = new DynoCard(dynoBox);
    }
  }

  private bindEvents(): void {
    // 1. Navigation Toolbar
    this._container.querySelector('#btn-cam-overview')?.addEventListener('click', () => {
      this._isDownholeFollow = false;
      this.environment.moveToPreset('exactMatch');
    });

    this._container.querySelector('#btn-cam-srp')?.addEventListener('click', () => {
      this._isDownholeFollow = false;
      this.environment.moveToPreset('srpUnit');
    });

    this._container.querySelector('#btn-cam-downhole')?.addEventListener('click', () => {
      this._isDownholeFollow = true;
      this.environment.moveToPreset('horizontalPump');
    });

    this._container.querySelector('#btn-cam-tanks')?.addEventListener('click', () => {
      this._isDownholeFollow = false;
      this.environment.moveToPreset('tankBattery');
    });

    this._container.querySelector('#btn-toggle-fluid')?.addEventListener('click', () => {
      this._showFluidPath = !this._showFluidPath;
      this.fluidPath.setVisible(this._showFluidPath);
      this._container.querySelector('#btn-toggle-fluid')?.classList.toggle('active', this._showFluidPath);
    });

    this._container.querySelector('#btn-cam-reset')?.addEventListener('click', () => {
      this._isDownholeFollow = false;
      this.environment.resetCamera();
    });

    // 2. Visual Mode Selector
    const modeSelect = this._container.querySelector('#select-visual-mode') as HTMLSelectElement;
    modeSelect?.addEventListener('change', (e) => {
      const mode = (e.target as HTMLSelectElement).value as VisualMode;
      this.thermalGrid.setVisualMode(mode);
      if (mode === 'exploded') {
        this.model.setExploded(true);
      } else {
        this.model.setExploded(false);
      }
      if (mode === 'cutaway') {
        this.model.setCutawayMode('cutaway');
      } else if (mode === 'thermal' || mode === 'viscosity') {
        this.model.setCutawayMode('thermal');
      } else {
        this.model.setCutawayMode('realistic');
      }
    });

    // 3. SPM Presets & Slider
    const spmButtons = this._container.querySelectorAll('button[data-spm]');
    spmButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const val = parseFloat(btn.getAttribute('data-spm') || '3.2');
        this.simClient.setControl('spm', val);
      });
    });

    const spmSlider = this._container.querySelector('#slider-spm') as HTMLInputElement;
    spmSlider?.addEventListener('input', (e) => {
      this.simClient.setControl('spm', parseFloat((e.target as HTMLInputElement).value));
    });

    // 4. Stroke Presets & Slider
    const strokeButtons = this._container.querySelectorAll('button[data-stroke]');
    strokeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const val = parseFloat(btn.getAttribute('data-stroke') || '64');
        this.simClient.setControl('stroke_inches', val);
      });
    });

    const strokeSlider = this._container.querySelector('#slider-stroke') as HTMLInputElement;
    strokeSlider?.addEventListener('input', (e) => {
      this.simClient.setControl('stroke_inches', parseFloat((e.target as HTMLInputElement).value));
    });

    // 5. Thermal & Reservoir Sliders
    this._container.querySelector('#slider-steam')?.addEventListener('input', (e) => {
      this.simClient.setControl('steam_volume', parseFloat((e.target as HTMLInputElement).value));
    });

    this._container.querySelector('#slider-wc')?.addEventListener('input', (e) => {
      this.simClient.setControl('water_cut', parseFloat((e.target as HTMLInputElement).value));
    });

    this._container.querySelector('#slider-pwf')?.addEventListener('input', (e) => {
      this.simClient.setControl('pwf_bar', parseFloat((e.target as HTMLInputElement).value));
    });

    // 6. Scenarios
    const scenButtons = this._container.querySelectorAll('button[data-scen]');
    scenButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const sc = btn.getAttribute('data-scen') || 'JOINT';
        this.simClient.setControl('scenario', sc);
        scenButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    // 7. Automated Demos
    this._container.querySelector('#btn-demo-physics')?.addEventListener('click', () => {
      this.simClient.triggerDemo('physics_demo');
    });

    this._container.querySelector('#btn-demo-spm')?.addEventListener('click', () => {
      this.simClient.triggerDemo('spm_experiment');
    });

    // 8. Timeline Speed Buttons
    const speedButtons = this._container.querySelectorAll('button[data-spd]');
    speedButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const spd = parseFloat(btn.getAttribute('data-spd') || '1.0');
        this.simClient.setControl('time_scale', spd);
        speedButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    // 9. Inspector Close
    this._container.querySelector('#insp-close')?.addEventListener('click', () => {
      this._elInspectorCard.style.display = 'none';
    });

    // 10. Clickable 3D Object Raycaster
    window.addEventListener('click', this.onCanvasClick);
  }

  private onCanvasClick = (e: MouseEvent): void => {
    // Ignore clicks on UI cards
    if ((e.target as HTMLElement).closest('.left-control-dock, .right-telemetry-dock, .app-header, .bottom-timeline-dock, .inspector-card')) {
      return;
    }

    this._mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    this._mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

    this._raycaster.setFromCamera(this._mouse, this.environment.camera);
    const intersects = this._raycaster.intersectObjects(this.environment.scene.children, true);

    for (const hit of intersects) {
      let obj: THREE.Object3D | null = hit.object;
      while (obj) {
        if (obj.userData && obj.userData.component) {
          this.openInspector(obj.userData.component);
          return;
        }
        obj = obj.parent;
      }
    }
  };

  private openInspector(componentType: string): void {
    const s = this.simClient.state;
    const body = this._container.querySelector('#insp-body')!;
    const title = this._container.querySelector('#insp-title')!;
    title.textContent = `INSPECTOR: ${componentType}`;

    if (componentType === 'PUMPJACK') {
      body.innerHTML = `
        <div class="insp-row"><span class="lbl">Unit Type:</span><span class="v">API C-320D-256-100</span></div>
        <div class="insp-row"><span class="lbl">SPM:</span><span class="v">${s.controls.spm.toFixed(1)}</span></div>
        <div class="insp-row"><span class="lbl">Stroke:</span><span class="v">${s.controls.stroke_inches.toFixed(0)}" (${s.controls.stroke_m.toFixed(2)} m)</span></div>
        <div class="insp-row"><span class="lbl">Crank Angle:</span><span class="v">${s.kinematics.crank_angle_deg.toFixed(1)}°</span></div>
        <div class="insp-row"><span class="lbl">Cycle Phase:</span><span class="v">${s.kinematics.stroke_phase}</span></div>
        <div class="insp-row"><span class="lbl">Motor Power:</span><span class="v">${s.economics.power_kw.toFixed(1)} kW</span></div>
      `;
    } else if (componentType === 'WELLHEAD') {
      body.innerHTML = `
        <div class="insp-row"><span class="lbl">Flowing Pwf:</span><span class="v">${s.controls.pwf_bar.toFixed(1)} bar</span></div>
        <div class="insp-row"><span class="lbl">Wellhead Temp:</span><span class="v">${(s.reservoir.temperature_c * 0.85).toFixed(1)} °C</span></div>
        <div class="insp-row"><span class="lbl">Liquid Rate:</span><span class="v">${s.production.liquid_rate_bpd.toFixed(1)} BPD</span></div>
        <div class="insp-row"><span class="lbl">CSS Status:</span><span class="v">${s.time.css_phase}</span></div>
        <div class="insp-row"><span class="lbl">Stuffing Box:</span><span class="v">Sealed / Normal</span></div>
      `;
    } else if (componentType === 'DOWNHOLE PUMP') {
      body.innerHTML = `
        <div class="insp-row"><span class="lbl">Depth:</span><span class="v">1,200 m (Deviated Lateral)</span></div>
        <div class="insp-row"><span class="lbl">Pump Capacity:</span><span class="v">${s.pump.pump_capacity_bpd.toFixed(1)} BPD</span></div>
        <div class="insp-row"><span class="lbl">Pump Fillage:</span><span class="v">${s.pump.pump_fillage_pct}% (${s.pump.fillage_status})</span></div>
        <div class="insp-row"><span class="lbl">Efficiency:</span><span class="v">${s.pump.pump_efficiency_pct}%</span></div>
        <div class="insp-row"><span class="lbl">Intake Pressure:</span><span class="v">66.2 bar</span></div>
      `;
    } else if (componentType === 'ROD') {
      body.innerHTML = `
        <div class="insp-row"><span class="lbl">String Type:</span><span class="v">7/8" Grade D Tapered</span></div>
        <div class="insp-row"><span class="lbl">Peak Load (PPRL):</span><span class="v">${s.srp.pprl_kn.toFixed(1)} kN</span></div>
        <div class="insp-row"><span class="lbl">Min Load (MPRL):</span><span class="v">${s.srp.mprl_kn.toFixed(1)} kN</span></div>
        <div class="insp-row"><span class="lbl">Viscous Drag:</span><span class="v">${s.srp.viscous_drag_kn.toFixed(2)} kN</span></div>
        <div class="insp-row"><span class="lbl">Float Margin:</span><span class="v">${s.srp.float_margin_pct.toFixed(1)}%</span></div>
      `;
    } else if (componentType === 'RESERVOIR CELL') {
      body.innerHTML = `
        <div class="insp-row"><span class="lbl">Reservoir Temp:</span><span class="v">${s.reservoir.temperature_c.toFixed(1)} °C</span></div>
        <div class="insp-row"><span class="lbl">Oil Viscosity:</span><span class="v">${s.reservoir.viscosity_cp.toFixed(0)} cP</span></div>
        <div class="insp-row"><span class="lbl">Reservoir Pressure:</span><span class="v">${s.reservoir.pressure_bar.toFixed(1)} bar</span></div>
        <div class="insp-row"><span class="lbl">Permeability:</span><span class="v">1,250 mD</span></div>
        <div class="insp-row"><span class="lbl">Oil Saturation:</span><span class="v">68%</span></div>
        <div class="insp-row"><span class="lbl">Thermal Front:</span><span class="v">${s.reservoir.thermal_front_m.toFixed(2)} m</span></div>
      `;
    }

    this._elInspectorCard.style.display = 'block';
  }

  public update(state: SimulationState): void {
    // 1. Controls Readouts
    const spmEl = this._container.querySelector('#disp-spm');
    if (spmEl) spmEl.textContent = state.controls.spm.toFixed(1);

    const strokeEl = this._container.querySelector('#disp-stroke');
    if (strokeEl) strokeEl.textContent = `${state.controls.stroke_inches.toFixed(0)} in`;

    const steamEl = this._container.querySelector('#disp-steam');
    if (steamEl) steamEl.textContent = `${state.controls.steam_volume_t_d.toFixed(1)} t/d`;

    const wcEl = this._container.querySelector('#disp-wc');
    if (wcEl) wcEl.textContent = `${state.controls.water_cut_pct.toFixed(1)} %`;

    const pwfEl = this._container.querySelector('#disp-pwf');
    if (pwfEl) pwfEl.textContent = `${state.controls.pwf_bar.toFixed(1)} bar`;

    // 2. KPIs
    const oilRateEl = this._container.querySelector('#kpi-oil-rate');
    if (oilRateEl) oilRateEl.innerHTML = `${state.production.oil_rate_bopd.toFixed(1)} <span class="unit">BOPD</span>`;

    const liqRateEl = this._container.querySelector('#kpi-liq-rate');
    if (liqRateEl) liqRateEl.textContent = `${state.production.liquid_rate_bpd.toFixed(1)} BPD`;

    const kpiWcEl = this._container.querySelector('#kpi-wc');
    if (kpiWcEl) kpiWcEl.textContent = `${state.controls.water_cut_pct.toFixed(1)}%`;

    const inflowEl = this._container.querySelector('#kpi-inflow');
    if (inflowEl) inflowEl.textContent = `${state.reservoir.inflow_bpd.toFixed(1)} BPD`;

    const pumpCapEl = this._container.querySelector('#kpi-pump-cap');
    if (pumpCapEl) pumpCapEl.textContent = `${state.pump.pump_capacity_bpd.toFixed(1)} BPD`;

    // 3. Fillage & SRP Dynamics
    const fillageStatusEl = this._container.querySelector('#kpi-fillage-status');
    if (fillageStatusEl) {
      fillageStatusEl.textContent = state.pump.fillage_status;
      fillageStatusEl.className = `status-badge ${state.pump.fillage_status.toLowerCase()}`;
    }

    const fillageBar = this._container.querySelector('#fillage-bar') as HTMLElement;
    if (fillageBar) fillageBar.style.width = `${state.pump.pump_fillage_pct}%`;

    const pprlEl = this._container.querySelector('#kpi-pprl');
    if (pprlEl) pprlEl.textContent = `${state.srp.pprl_kn.toFixed(1)} kN`;

    const floatEl = this._container.querySelector('#kpi-float');
    if (floatEl) floatEl.textContent = `${state.srp.float_margin_pct.toFixed(1)}%`;

    const tempEl = this._container.querySelector('#kpi-temp');
    if (tempEl) tempEl.textContent = `${state.reservoir.temperature_c.toFixed(1)} °C`;

    const viscEl = this._container.querySelector('#kpi-visc');
    if (viscEl) viscEl.textContent = `${state.reservoir.viscosity_cp.toLocaleString()} cP`;

    // 4. Economics
    const powerEl = this._container.querySelector('#kpi-power');
    if (powerEl) powerEl.textContent = `${state.economics.power_kw.toFixed(1)} kW`;

    const energyEl = this._container.querySelector('#kpi-energy');
    if (energyEl) energyEl.textContent = `${state.economics.energy_per_bbl.toFixed(1)} kWh/bbl`;

    const cumOilEl = this._container.querySelector('#kpi-cum-oil');
    if (cumOilEl) cumOilEl.textContent = `${state.production.cumulative_oil_bbl.toLocaleString()} bbl`;

    const sorEl = this._container.querySelector('#kpi-sor');
    if (sorEl) sorEl.textContent = state.economics.sor.toFixed(1);

    // 5. Timeline
    const simDayEl = this._container.querySelector('#disp-sim-day');
    if (simDayEl) simDayEl.textContent = `DAY ${state.time.sim_time_days.toFixed(1)}`;

    const phaseEl = this._container.querySelector('#disp-css-phase');
    if (phaseEl) phaseEl.textContent = state.time.css_phase;

    const timelinePct = Math.min(100, Math.max(0, (state.time.sim_time_days / 60.0) * 100));
    const fillEl = this._container.querySelector('#timeline-fill') as HTMLElement;
    const scrubberEl = this._container.querySelector('#timeline-scrubber') as HTMLElement;
    if (fillEl) fillEl.style.width = `${timelinePct}%`;
    if (scrubberEl) scrubberEl.style.left = `${timelinePct}%`;

    // 6. Live Causal Nodes Highlighting
    const isInjecting = state.time.css_phase === 'INJECTION' && state.controls.steam_volume_t_d > 0;
    this._container.querySelector('#c-steam')?.classList.toggle('active', isInjecting);
    this._container.querySelector('#c-temp')?.classList.toggle('active', state.reservoir.temperature_c > 35);
    this._container.querySelector('#c-visc')?.classList.toggle('active', state.reservoir.viscosity_cp < 5000);
    this._container.querySelector('#c-inflow')?.classList.toggle('active', state.reservoir.inflow_bpd > 10);
    this._container.querySelector('#c-pump')?.classList.toggle('active', state.pump.pump_fillage > 0.4);
    this._container.querySelector('#c-load')?.classList.toggle('active', true);
    this._container.querySelector('#c-prod')?.classList.toggle('active', state.production.oil_rate_bopd > 2);

    // 7. Update Live Dynamometer Card
    if (this.dynoCard) {
      const curPosIn = (state.controls.stroke_inches / 2.0) * (1.0 - Math.cos(state.kinematics.crank_angle_rad));
      this.dynoCard.render(
        state.srp.surface_card,
        state.srp.pump_card,
        state.controls.stroke_inches,
        state.srp.pprl_kn,
        state.srp.mprl_kn,
        curPosIn,
        state.srp.rod_load_kn
      );
    }

    // 8. Compass Needle
    const camAngle = this.environment.controls.getAzimuthalAngle();
    const needle = this._container.querySelector('#compass-needle') as HTMLElement;
    if (needle) {
      needle.style.transform = `rotate(${-camAngle}rad)`;
    }

    // 9. Downhole Follow Camera
    if (this._isDownholeFollow) {
      const plungerX = 10.7 + (state.kinematics.rod_displacement_m - state.controls.stroke_m * 0.5);
      this.environment.controls.target.set(plungerX, -9.8, 0.0);
    }
  }
}
