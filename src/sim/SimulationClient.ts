/**
 * SimulationClient.ts
 * WebSocket client that connects to the Python backend (ws://127.0.0.1:8000/ws/sim).
 * Authoritatively synchronizes simulationState across the 3D application.
 * Includes local reduced-order physics fallback in case the backend is reconnecting.
 */

export interface SimulationState {
  time: {
    sim_time_days: number;
    time_scale: number;
    css_phase: 'INJECTION' | 'SOAK' | 'PRODUCTION' | 'COOLING';
    demo_mode: string | null;
  };
  controls: {
    spm: number;
    stroke_inches: number;
    stroke_m: number;
    steam_volume_t_d: number;
    water_cut: number;
    water_cut_pct: number;
    pwf_bar: number;
    scenario: string;
  };
  kinematics: {
    crank_angle_rad: number;
    crank_angle_deg: number;
    rod_displacement_m: number;
    stroke_phase: 'UPSTROKE' | 'DOWNSTROKE';
  };
  reservoir: {
    pressure_bar: number;
    temperature_c: number;
    viscosity_cp: number;
    thermal_front_m: number;
    porosity_pct: number;
    permeability_md: number;
    oil_saturation: number;
    inflow_bpd: number;
  };
  pump: {
    pump_capacity_bpd: number;
    pump_efficiency: number;
    pump_efficiency_pct: number;
    pump_fillage: number;
    pump_fillage_pct: number;
    fillage_status: 'NORMAL' | 'LOW' | 'CRITICAL';
  };
  production: {
    liquid_rate_bpd: number;
    oil_rate_bopd: number;
    water_rate_bpd: number;
    cumulative_oil_bbl: number;
    cumulative_liquid_bbl: number;
    flow_speed_factor: number;
  };
  srp: {
    pprl_kn: number;
    mprl_kn: number;
    rod_load_kn: number;
    float_margin_pct: number;
    viscous_drag_kn: number;
    surface_card: Array<{ pos_in: number; load_kn: number }>;
    pump_card: Array<{ pos_in: number; load_kn: number }>;
  };
  economics: {
    power_kw: number;
    daily_kwh: number;
    energy_per_bbl: number;
    sor: number;
    cumulative_steam_tons: number;
  };
  thermal_grid_slice?: number[][];
}

export type StateListener = (state: SimulationState) => void;

export class SimulationClient {
  private _socket: WebSocket | null = null;
  private _listeners: Set<StateListener> = new Set();
  public isConnected: boolean = false;
  private url: string;

  // Authoritative State Store (initialized with valid defaults)
  public state: SimulationState = {
    time: { sim_time_days: 30.0, time_scale: 1.0, css_phase: 'PRODUCTION', demo_mode: null },
    controls: { spm: 3.2, stroke_inches: 64.0, stroke_m: 1.63, steam_volume_t_d: 42.3, water_cut: 0.128, water_cut_pct: 12.8, pwf_bar: 18.2, scenario: 'JOINT' },
    kinematics: { crank_angle_rad: 0.0, crank_angle_deg: 0.0, rod_displacement_m: 0.0, stroke_phase: 'UPSTROKE' },
    reservoir: { pressure_bar: 68.4, temperature_c: 72.6, viscosity_cp: 1840.0, thermal_front_m: 12.6, porosity_pct: 22.4, permeability_md: 1250, oil_saturation: 0.68, inflow_bpd: 38.5 },
    pump: { pump_capacity_bpd: 42.5, pump_efficiency: 0.74, pump_efficiency_pct: 74.0, pump_fillage: 0.76, pump_fillage_pct: 76.0, fillage_status: 'NORMAL' },
    production: { liquid_rate_bpd: 37.1, oil_rate_bopd: 32.4, water_rate_bpd: 4.7, cumulative_oil_bbl: 1420.0, cumulative_liquid_bbl: 1625.0, flow_speed_factor: 0.405 },
    srp: { pprl_kn: 18.7, mprl_kn: 5.4, rod_load_kn: 18.7, float_margin_pct: 28.9, viscous_drag_kn: 1.85, surface_card: [], pump_card: [] },
    economics: { power_kw: 14.2, daily_kwh: 340.8, energy_per_bbl: 10.5, sor: 6.7, cumulative_steam_tons: 1510.0 }
  };

  constructor(url: string = 'ws://127.0.0.1:8000/ws/sim') {
    this.url = url;
    this.connect();
    // Run local animation step loop for kinematics smoothness
    this.startLocalKinematicsLoop();
  }

  public subscribe(listener: StateListener): () => void {
    this._listeners.add(listener);
    listener(this.state);
    return () => this._listeners.delete(listener);
  }

  private connect(): void {
    try {
      this._socket = new WebSocket(this.url);

      this._socket.onopen = () => {
        this.isConnected = true;
        console.log('[SimulationClient] Connected to Python backend WebSocket at', this.url);
      };

      this._socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.state = data;
          this.notify();
        } catch (e) {
          console.error('[SimulationClient] Error parsing backend message:', e);
        }
      };

      this._socket.onclose = () => {
        this.isConnected = false;
        // Auto-reconnect after 2 seconds
        setTimeout(() => this.connect(), 2000);
      };

      this._socket.onerror = () => {
        this.isConnected = false;
      };
    } catch {
      this.isConnected = false;
      setTimeout(() => this.connect(), 2000);
    }
  }

  public setControl(param: string, value: any): void {
    // Optimistic local update
    if (param === 'spm') this.state.controls.spm = Number(value);
    if (param === 'stroke_inches') {
      this.state.controls.stroke_inches = Number(value);
      this.state.controls.stroke_m = Number(value) * 0.0254;
    }
    if (param === 'steam_volume') this.state.controls.steam_volume_t_d = Number(value);
    if (param === 'water_cut') this.state.controls.water_cut = Number(value);
    if (param === 'pwf_bar') this.state.controls.pwf_bar = Number(value);
    if (param === 'time_scale') this.state.time.time_scale = Number(value);
    if (param === 'scenario') this.state.controls.scenario = String(value);

    // Update local physics immediately
    this.evaluateLocalPhysics();
    this.notify();

    // Send command to backend
    if (this._socket && this._socket.readyState === WebSocket.OPEN) {
      this._socket.send(JSON.stringify({ type: 'SET_CONTROL', param, value }));
    }
  }

  public triggerDemo(demoName: 'physics_demo' | 'spm_experiment'): void {
    if (demoName === 'physics_demo') {
      this.state.time.css_phase = 'COOLING';
      this.state.controls.steam_volume_t_d = 0.0;
    } else if (demoName === 'spm_experiment') {
      this.state.controls.spm = 2.0;
    }
    this.evaluateLocalPhysics();
    this.notify();

    if (this._socket && this._socket.readyState === WebSocket.OPEN) {
      this._socket.send(JSON.stringify({ type: 'TRIGGER_DEMO', demo: demoName }));
    }
  }

  /**
   * Local physics loop ensuring continuous fluid motion and kinematics
   * even if disconnected from the backend
   */
  private startLocalKinematicsLoop(): void {
    let lastTime = performance.now();
    const tick = () => {
      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      // Update crank angle & rod position at 60 FPS
      const spm = this.state.controls.spm;
      const omega = (spm * 2.0 * Math.PI) / 60.0;
      this.state.kinematics.crank_angle_rad = (this.state.kinematics.crank_angle_rad + omega * dt) % (2.0 * Math.PI);
      this.state.kinematics.crank_angle_deg = (this.state.kinematics.crank_angle_rad * 180.0) / Math.PI;

      const strokeM = this.state.controls.stroke_m;
      this.state.kinematics.rod_displacement_m = (strokeM / 2.0) * (1.0 - Math.cos(this.state.kinematics.crank_angle_rad));
      this.state.kinematics.stroke_phase = this.state.kinematics.crank_angle_rad <= Math.PI ? 'UPSTROKE' : 'DOWNSTROKE';

      // If disconnected from backend, advance local physics smoothly
      if (!this.isConnected) {
        this.evaluateLocalPhysics();
      }

      this.notify();
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  private evaluateLocalPhysics(): void {
    // Thermal & Viscosity
    const tempC = this.state.reservoir.temperature_c;
    const visc = Math.max(20.0, 10000.0 * Math.exp(3800.0 * (1.0 / (tempC + 273.15) - 1.0 / 293.15)));
    this.state.reservoir.viscosity_cp = Math.round(visc);

    // Inflow
    const drawdown = Math.max(0.0, this.state.reservoir.pressure_bar - this.state.controls.pwf_bar);
    const inflow = Math.max(0.0, (1250.0 * 12.0 * 0.00708 * drawdown * 14.5) / (visc * 1.05 * 5.5));
    this.state.reservoir.inflow_bpd = Math.round(inflow * 10) / 10;

    // Pump Capacity & Fillage
    const cap = 0.1166 * (2.25 ** 2) * this.state.controls.stroke_inches * this.state.controls.spm;
    this.state.pump.pump_capacity_bpd = Math.round(cap * 10) / 10;
    const fillage = Math.min(1.0, Math.max(0.05, inflow / Math.max(1.0, cap)));
    this.state.pump.pump_fillage = Math.round(fillage * 100) / 100;
    this.state.pump.pump_fillage_pct = Math.round(fillage * 100);
    this.state.pump.fillage_status = fillage >= 0.7 ? 'NORMAL' : (fillage >= 0.4 ? 'LOW' : 'CRITICAL');

    // Production
    const isPumping = this.state.time.css_phase !== 'INJECTION';
    const liquid = isPumping ? Math.min(inflow, cap * this.state.pump.pump_efficiency * fillage) : 0.0;
    this.state.production.liquid_rate_bpd = Math.round(liquid * 10) / 10;
    const oil = liquid * (1.0 - this.state.controls.water_cut);
    this.state.production.oil_rate_bopd = Math.round(oil * 10) / 10;
    this.state.production.water_rate_bpd = Math.round((liquid - oil) * 10) / 10;
    this.state.production.flow_speed_factor = oil > 0.05 ? Math.min(1.0, oil / 75.0) : 0.0;

    // Rod Load
    const drag = 0.18 * ((visc / 500.0) ** 0.65) * 8500.0 * (this.state.controls.spm / 3.0);
    const pprl = (8500.0 * 0.86 + 4800.0 + drag) * 0.00444822;
    this.state.srp.pprl_kn = Math.round(pprl * 10) / 10;
    this.state.srp.rod_load_kn = this.state.srp.pprl_kn;
    this.state.srp.viscous_drag_kn = Math.round(drag * 0.00444822 * 10) / 10;
    const mprl = Math.max(0.0, (8500.0 * 0.86 - drag) * 0.00444822);
    this.state.srp.mprl_kn = Math.round(mprl * 10) / 10;
    this.state.srp.float_margin_pct = Math.round(Math.max(0.0, (mprl / (8500.0 * 0.86 * 0.00444822)) * 100.0) * 10) / 10;
  }

  private notify(): void {
    this._listeners.forEach(fn => fn(this.state));
  }
}
