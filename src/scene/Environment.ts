import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ProceduralTextures } from '../textures/ProceduralTextures.ts';

export interface CameraPreset {
  name: string;
  position: THREE.Vector3;
  target: THREE.Vector3;
}

export class Environment {
  public readonly scene: THREE.Scene;
  public readonly camera: THREE.PerspectiveCamera;
  public readonly renderer: THREE.WebGLRenderer;
  public readonly controls: OrbitControls;

  private _sunLight: THREE.DirectionalLight;
  private _hemiLight: THREE.HemisphereLight;
  private _undergroundLight: THREE.PointLight;
  private _thermalGlowLight: THREE.PointLight;

  // Camera transition animation
  private _isTransitioning: boolean = false;
  private _camStartPos = new THREE.Vector3();
  private _camTargetPos = new THREE.Vector3();
  private _lookStartTarget = new THREE.Vector3();
  private _lookEndTarget = new THREE.Vector3();
  private _transitionProgress = 0;
  private _transitionDuration = 1.0;

  // Exact Presets matching Reference Architecture
  public presets: Record<string, CameraPreset> = {
    exactMatch: {
      name: 'Default Reference View',
      position: new THREE.Vector3(2.5, 7.5, 24.5),
      target: new THREE.Vector3(2.5, 1.5, 0.0)
    },
    resetView: {
      name: 'Default Reference View',
      position: new THREE.Vector3(2.5, 7.5, 24.5),
      target: new THREE.Vector3(2.5, 1.5, 0.0)
    },
    srpUnit: {
      name: 'Surface Pumpjack',
      position: new THREE.Vector3(1.5, 5.8, 11.5),
      target: new THREE.Vector3(1.5, 3.2, 0.0)
    },
    surfacePumpjack: {
      name: 'Surface Pumpjack',
      position: new THREE.Vector3(1.5, 5.8, 11.5),
      target: new THREE.Vector3(1.5, 3.2, 0.0)
    },
    downholeView: {
      name: 'Downhole View',
      position: new THREE.Vector3(6.0, -5.2, 11.0),
      target: new THREE.Vector3(6.0, -6.5, 0.0)
    },
    perforationsView: {
      name: 'Perforations View',
      position: new THREE.Vector3(3.0, -9.2, 8.5),
      target: new THREE.Vector3(4.5, -9.8, -0.4)
    },
    dynoCardView: {
      name: 'Dyno Card View',
      position: new THREE.Vector3(3.2, 4.0, 5.2),
      target: new THREE.Vector3(3.0, 3.0, 0.0)
    },
    steamPlant: {
      name: 'Steam Generator Plant',
      position: new THREE.Vector3(-11.0, 4.5, 12.0),
      target: new THREE.Vector3(-11.5, 2.0, 3.5)
    },
    tankBattery: {
      name: 'Production Tank Battery',
      position: new THREE.Vector3(10.5, 4.5, 12.0),
      target: new THREE.Vector3(10.5, 2.0, 3.5)
    },
    horizontalPump: {
      name: 'Subsurface Horizontal Pump',
      position: new THREE.Vector3(11.2, -9.6, 5.0),
      target: new THREE.Vector3(11.2, -9.8, 0.0)
    },
    thermalFront: {
      name: 'Thermal Front Reservoir',
      position: new THREE.Vector3(3.0, -9.2, 8.5),
      target: new THREE.Vector3(4.5, -9.8, -0.4)
    }
  };

  constructor(container: HTMLElement) {
    // 1. Scene with atmospheric desert sky fog
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb); // Clear sunny desert sky blue
    this.scene.fog = new THREE.FogExp2(0xb0c4de, 0.007);

    // 2. Camera
    this.camera = new THREE.PerspectiveCamera(
      42,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.copy(this.presets.exactMatch.position);

    // 3. High Performance WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;
    container.appendChild(this.renderer.domElement);

    // 4. OrbitControls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.target.copy(this.presets.exactMatch.target);
    this.controls.maxPolarAngle = Math.PI * 0.95;
    this.controls.minDistance = 2.0;
    this.controls.maxDistance = 80;

    // 5. Lighting Setup (Bright Sunny Desert)
    this._sunLight = new THREE.DirectionalLight(0xfffaed, 2.5);
    this._sunLight.position.set(16, 28, 18);
    this._sunLight.castShadow = true;
    this._sunLight.shadow.mapSize.width = 2048;
    this._sunLight.shadow.mapSize.height = 2048;
    this._sunLight.shadow.camera.near = 1;
    this._sunLight.shadow.camera.far = 70;
    this._sunLight.shadow.camera.left = -18;
    this._sunLight.shadow.camera.right = 18;
    this._sunLight.shadow.camera.top = 18;
    this._sunLight.shadow.camera.bottom = -18;
    this._sunLight.shadow.bias = -0.0003;
    this.scene.add(this._sunLight);

    // Sky Ambient bounce
    this._hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x78553d, 1.2);
    this.scene.add(this._hemiLight);

    // Subterranean cutaway illumination
    this._undergroundLight = new THREE.PointLight(0xffffff, 1.8, 30);
    this._undergroundLight.position.set(8.0, -8.0, 6.0);
    this.scene.add(this._undergroundLight);

    // Glowing thermal front light (Orange/Red radiance)
    this._thermalGlowLight = new THREE.PointLight(0xff4500, 3.5, 14);
    this._thermalGlowLight.position.set(3.0, -9.8, 1.5);
    this.scene.add(this._thermalGlowLight);

    // 6. Build Desert Landscape & Distant Hills
    this.buildDesertEnvironment();

    window.addEventListener('resize', this.onResize);
  }

  /**
   * Arid desert surface terrain & distant rolling hills without gaps
   */
  private buildDesertEnvironment(): void {
    const groundMat = new THREE.MeshStandardMaterial({
      map: ProceduralTextures.getDesertTerrain(),
      roughness: 0.9,
      metalness: 0.05
    });

    const rockMat = new THREE.MeshStandardMaterial({
      map: ProceduralTextures.getStratifiedRock(),
      roughness: 0.85,
      metalness: 0.15
    });

    // 1. Mathematically Exact Watertight Ground Plates (Zero gaps / zero sky bleed)
    // Trench cutaway aperture is strictly X in [0.5, 17.5], Z in [-0.5, 5.0]

    // Rear ground plate (behind wellhead & pumpjack)
    const rearPlate = new THREE.Mesh(new THREE.PlaneGeometry(100, 30), groundMat);
    rearPlate.rotation.x = -Math.PI / 2;
    rearPlate.position.set(0, 0, -15.5);
    rearPlate.receiveShadow = true;
    this.scene.add(rearPlate);

    // Left ground plate (Steam plant and left terrain)
    const leftPlate = new THREE.Mesh(new THREE.PlaneGeometry(50.5, 30.5), groundMat);
    leftPlate.rotation.x = -Math.PI / 2;
    leftPlate.position.set(-24.75, 0, 14.75);
    leftPlate.receiveShadow = true;
    this.scene.add(leftPlate);

    // Right ground plate (Tank battery and right terrain)
    const rightPlate = new THREE.Mesh(new THREE.PlaneGeometry(32.5, 30.5), groundMat);
    rightPlate.rotation.x = -Math.PI / 2;
    rightPlate.position.set(33.75, 0, 14.75);
    rightPlate.receiveShadow = true;
    this.scene.add(rightPlate);

    // Center Foreground plate (in front of the cutaway viewing slot)
    const frontPlate = new THREE.Mesh(new THREE.PlaneGeometry(17.0, 25.0), groundMat);
    frontPlate.rotation.x = -Math.PI / 2;
    frontPlate.position.set(9.0, 0, 17.5);
    frontPlate.receiveShadow = true;
    this.scene.add(frontPlate);

    // Subterranean Trench Floor (canyon bottom at Y = -16m)
    const subFloor = new THREE.Mesh(new THREE.PlaneGeometry(60, 30), rockMat);
    subFloor.rotation.x = -Math.PI / 2;
    subFloor.position.set(9.0, -16.0, 2.0);
    subFloor.receiveShadow = true;
    this.scene.add(subFloor);

    // Subterranean Trench Left & Right Rock Retaining Canyon Walls
    const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(5.5, 16), rockMat);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.position.set(0.5, -8.0, 2.25);
    this.scene.add(leftWall);

    const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(5.5, 16), rockMat);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.position.set(17.5, -8.0, 2.25);
    this.scene.add(rightWall);

    // Distant Rolling Desert Hills
    const hillMat = new THREE.MeshStandardMaterial({
      color: 0x9b7a54,
      roughness: 0.95
    });

    for (let i = 0; i < 9; i++) {
      const hillRadius = 15 + Math.random() * 20;
      const hillHeight = 8 + Math.random() * 12;
      const hillGeo = new THREE.ConeGeometry(hillRadius, hillHeight, 16);
      const hill = new THREE.Mesh(hillGeo, hillMat);
      const hx = -60 + i * 16 + (Math.random() - 0.5) * 8;
      const hz = -45 - Math.random() * 20;
      hill.position.set(hx, hillHeight * 0.5 - 2, hz);
      this.scene.add(hill);
    }

    // Sparse Desert Scrub / Green Shrubs
    const shrubMat = new THREE.MeshStandardMaterial({
      color: 0x4d6639,
      roughness: 0.8
    });
    for (let i = 0; i < 40; i++) {
      const shrub = new THREE.Mesh(new THREE.DodecahedronGeometry(0.25 + Math.random() * 0.35), shrubMat);
      const sx = (Math.random() - 0.5) * 45;
      const sz = Math.random() > 0.5 ? 4 + Math.random() * 14 : -6 - Math.random() * 20;
      shrub.position.set(sx, 0.25, sz);
      shrub.castShadow = true;
      this.scene.add(shrub);
    }
  }

  /**
   * Camera interpolation
   */
  public moveToPreset(presetKey: string): void {
    const preset = this.presets[presetKey];
    if (!preset) return;

    this._camStartPos.copy(this.camera.position);
    this._camTargetPos.copy(preset.position);

    this._lookStartTarget.copy(this.controls.target);
    this._lookEndTarget.copy(preset.target);

    this._transitionProgress = 0;
    this._isTransitioning = true;
  }

  public resetCamera(): void {
    this.moveToPreset('exactMatch');
  }

  public update(deltaTime: number): void {
    if (this._isTransitioning) {
      this._transitionProgress += deltaTime / this._transitionDuration;
      const t = Math.min(1, this._transitionProgress);
      const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

      this.camera.position.lerpVectors(this._camStartPos, this._camTargetPos, ease);
      this.controls.target.lerpVectors(this._lookStartTarget, this._lookEndTarget, ease);

      if (t >= 1) {
        this._isTransitioning = false;
      }
    }

    this.controls.update();
  }

  private onResize = (): void => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };

  public destroy(): void {
    window.removeEventListener('resize', this.onResize);
    this.renderer.dispose();
  }
}
