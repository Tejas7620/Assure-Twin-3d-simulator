import './style.css';
import { SimulationClient } from './sim/SimulationClient.ts';
import { Environment } from './scene/Environment.ts';
import { PumpjackModel } from './scene/PumpjackModel.ts';
import { Facilities } from './scene/Facilities.ts';
import { FluidPath } from './scene/FluidPath.ts';
import { OilParticleSystem } from './scene/OilParticleSystem.ts';
import { SteamParticleSystem } from './scene/SteamParticleSystem.ts';
import { ThermalViscosityGrid } from './scene/ThermalViscosityGrid.ts';
import * as THREE from 'three';
import { WorkstationApp } from './ui/WorkstationApp.ts';
import { PumpjackKinematics } from './kinematics/PumpjackKinematics.ts';
import { AssureTwinManager } from './assure/AssureTwinManager.ts';
import { ClickToExplain } from './assure/ui/ClickToExplain.ts';

class App {
  public simClient: SimulationClient;
  public environment: Environment;
  public model: PumpjackModel;
  public facilities: Facilities;
  public fluidPath: FluidPath;
  public oilParticles: OilParticleSystem;
  public steamParticles: SteamParticleSystem;
  public thermalGrid: ThermalViscosityGrid;
  public kinematics: PumpjackKinematics;
  public assureManager: AssureTwinManager;
  public workstation: WorkstationApp;
  public clickToExplain: ClickToExplain;

  private _lastTime: number = 0;

  constructor() {
    const appContainer = document.querySelector<HTMLDivElement>('#app');
    if (!appContainer) {
      throw new Error('Container #app not found in document');
    }

    // 1. Initialize Authoritative Simulation Client (WebSocket to Python backend)
    this.simClient = new SimulationClient();

    // 2. Initialize 3D Environment (Scene, Camera, Renderer, Sun, Lighting, OrbitControls)
    this.environment = new Environment(appContainer);

    // 3. Assemble Surface Facilities (Wellhead, Steam Generator, 3-Phase Separator, Tanks)
    this.facilities = new Facilities();
    this.environment.scene.add(this.facilities.root);

    // 4. Kinematics Helper
    this.kinematics = new PumpjackKinematics(3.2, 1.63);

    // 5. Assemble SRP Pumpjack & Deviated Horizontal Downhole Pump
    this.model = new PumpjackModel(this.kinematics);
    this.environment.scene.add(this.model.root);

    // 6. Complete 3D Fluid Path Geometry
    this.fluidPath = new FluidPath();
    this.environment.scene.add(this.fluidPath.root);

    // 7. Multi-Stage Physics-Driven Oil Particle Flow System
    this.oilParticles = new OilParticleSystem();
    this.environment.scene.add(this.oilParticles.root);

    // 8. Animated Steam Particle System
    this.steamParticles = new SteamParticleSystem();
    this.environment.scene.add(this.steamParticles.root);

    // 9. 3D Thermal & Viscosity Reservoir Grid
    this.thermalGrid = new ThermalViscosityGrid();
    this.environment.scene.add(this.thermalGrid.root);

    // 10. ASSURE-TWIN Decision-Assured Intelligence Layer & Master Workstation
    this.assureManager = new AssureTwinManager(this.simClient);
    this.workstation = new WorkstationApp(
      this.simClient,
      this.assureManager,
      this.environment
    );
    this.clickToExplain = new ClickToExplain();
    this.initClickToExplainListener();

    // 11. Start Render Loop
    this._lastTime = performance.now();
    this.animate();

    // Expose for browser testing & verification
    (window as any).appInstance = this;
    (window as any).assureManager = this.assureManager;
    (window as any).workstation = this.workstation;
  }

  private initClickToExplainListener(): void {
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    window.addEventListener('dblclick', (event) => {
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
      raycaster.setFromCamera(mouse, this.environment.camera);
      const intersects = raycaster.intersectObjects(this.environment.scene.children, true);

      for (const hit of intersects) {
        let obj: THREE.Object3D | null = hit.object;
        while (obj) {
          const comp = obj.userData?.component;
          if (comp) {
            let cat: 'PUMPJACK' | 'RESERVOIR' | 'ROD' | 'STEAM' = 'PUMPJACK';
            if (comp === 'RESERVOIR CELL') cat = 'RESERVOIR';
            else if (comp === 'ROD' || comp === 'DOWNHOLE PUMP') cat = 'ROD';
            else if (comp === 'STEAM_GEN' || comp === 'WELLHEAD') cat = 'STEAM';
            else if (comp === 'PUMPJACK') cat = 'PUMPJACK';

            const explanation = ClickToExplain.buildComponentExplanation(cat, this.assureManager.solutionState);
            this.clickToExplain.showExplanation(explanation, { x: event.clientX, y: event.clientY });
            return;
          }
          obj = obj.parent;
        }
      }
    });
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);

    const now = performance.now();
    const rawDelta = (now - this._lastTime) / 1000;
    this._lastTime = now;
    const delta = Math.min(rawDelta, 0.1);

    const state = this.simClient.state;

    // 1. Sync Kinematics & 3D Pumpjack Assemblies
    // Synchronize stroke length and SPM
    this.kinematics.setSPM(state.controls.spm);
    this.kinematics.setStrokeLength(state.controls.stroke_m);

    // Exact closed-form 4-bar linkage solution
    const geom = this.kinematics.solveGeometry(state.kinematics.crank_angle_rad);

    // Build KinematicState compatible with PumpjackModel
    const kState = {
      spm: state.controls.spm,
      crankAngle: state.kinematics.crank_angle_rad,
      crankAngleDeg: state.kinematics.crank_angle_deg,
      beamAngle: geom.beamAngle,
      beamAngleDeg: (geom.beamAngle * 180) / Math.PI,
      pitmanAngle: geom.pitmanAngle,
      crankPinPos: geom.crankPin,
      equalizerPos: geom.equalizer,
      horseheadTipPos: geom.horseheadTip,
      rodDisplacement: state.kinematics.rod_displacement_m,
      rodNormalizedPos: state.controls.stroke_m > 0 ? (state.kinematics.rod_displacement_m / state.controls.stroke_m) : 0,
      rodVelocity: Math.cos(state.kinematics.crank_angle_rad) * state.controls.spm * 0.15,
      strokePhase: state.kinematics.stroke_phase,
      cycleTime: 60.0 / Math.max(0.1, state.controls.spm),
      cycleProgress: (state.kinematics.crank_angle_deg / 360.0) * 100,
      strokeLength: state.controls.stroke_m,
      totalStrokes: Math.floor(state.time.sim_time_days * state.controls.spm * 20),
      pumpFillagePct: state.pump.pump_fillage_pct,
      oilRateBopd: state.production.oil_rate_bopd
    };

    this.model.update(kState);

    // 2. Animate 3D Physical Fluid Path
    this.fluidPath.update(delta, state.production.flow_speed_factor);

    // 3. Update Physics-Driven Oil Particles (Reservoir -> Pump -> Tubing -> Separator -> Tank)
    this.oilParticles.update(
      delta,
      state.production.flow_speed_factor,
      state.production.oil_rate_bopd
    );

    // 4. Update Steam Particles (Steam Plant -> Wellhead -> Downhole -> Reservoir)
    const isInjecting = (state.time.css_phase === 'INJECTION') && (state.controls.steam_volume_t_d > 0);
    this.steamParticles.update(delta, state.controls.steam_volume_t_d, isInjecting);

    // 5. Update Surface Facilities (Steam plume, separator, flowline sight glass & tanks)
    this.facilities.update(delta, state.production.flow_speed_factor);

    // 6. Update 3D Thermal & Viscosity Reservoir Grid
    this.thermalGrid.update(
      state.reservoir.temperature_c,
      state.reservoir.thermal_front_m,
      state.reservoir.viscosity_cp
    );

    // 7. Update Camera Controls & Transitions
    this.environment.update(delta);

    // 8. Render Scene
    this.environment.renderer.render(this.environment.scene, this.environment.camera);
  };
}

// Bootstrap application on DOM ready
window.addEventListener('DOMContentLoaded', () => {
  new App();
});
