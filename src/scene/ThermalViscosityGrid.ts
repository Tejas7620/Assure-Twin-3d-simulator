import * as THREE from 'three';
import { ProceduralTextures } from '../textures/ProceduralTextures.ts';

export type VisualMode = 'realistic' | 'thermal' | 'viscosity' | 'pressure' | 'flow' | 'rod_dynamics' | 'cutaway' | 'exploded';

export class ThermalViscosityGrid {
  public readonly root: THREE.Group;
  private _reservoirBlock: THREE.Mesh;
  private _thermalPlumePlane: THREE.Mesh;
  private _pressurePlane: THREE.Mesh;
  private _thermalMaterial: THREE.MeshStandardMaterial;
  private _rockMaterial: THREE.MeshStandardMaterial;

  constructor() {
    this.root = new THREE.Group();
    this.root.name = 'ThermalViscosityGrid';

    // 1. Base Stratified Rock Material
    this._rockMaterial = new THREE.MeshStandardMaterial({
      map: ProceduralTextures.getStratifiedRock(),
      roughness: 0.85,
      metalness: 0.15
    });

    // 2. Dynamic Thermal Heat Plume Material
    this._thermalMaterial = new THREE.MeshStandardMaterial({
      map: ProceduralTextures.getThermalFrontTexture(),
      roughness: 0.4,
      metalness: 0.2,
      emissive: new THREE.Color(0xff4500),
      emissiveIntensity: 0.65,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide
    });

    // 3. Reservoir Stratified Block
    const blockGeo = new THREE.BoxGeometry(24.0, 16.0, 6.0);
    this._reservoirBlock = new THREE.Mesh(blockGeo, this._rockMaterial);
    this._reservoirBlock.position.set(6.5, -8.0, -3.0);
    this._reservoirBlock.receiveShadow = true;
    this.root.add(this._reservoirBlock);

    // 4. Thermal Plume Cutaway Slice
    const plumeGeo = new THREE.PlaneGeometry(16.0, 8.5);
    this._thermalPlumePlane = new THREE.Mesh(plumeGeo, this._thermalMaterial);
    this._thermalPlumePlane.position.set(5.5, -9.8, -0.4);
    this.root.add(this._thermalPlumePlane);

    // 5. Pressure Contour Plane
    const pressGeo = new THREE.PlaneGeometry(16.0, 8.5);
    const pressMat = new THREE.MeshBasicMaterial({
      color: 0x3b82f6,
      transparent: true,
      opacity: 0.4,
      wireframe: true,
      side: THREE.DoubleSide
    });
    this._pressurePlane = new THREE.Mesh(pressGeo, pressMat);
    this._pressurePlane.position.set(5.5, -9.8, -0.3);
    this._pressurePlane.visible = false;
    this.root.add(this._pressurePlane);
  }

  public update(tempC: number, thermalFrontM: number, viscosityCP: number): void {
    // Dynamic emissive intensity scaling with temperature
    const normTemp = Math.min(1.0, Math.max(0.0, (tempC - 20.0) / 160.0));
    this._thermalMaterial.emissiveIntensity = 0.25 + normTemp * 0.85;

    // Scale thermal plume plane with thermal front radius
    const scaleX = Math.min(2.0, Math.max(0.5, thermalFrontM / 10.0));
    this._thermalPlumePlane.scale.set(scaleX, 1.0, 1.0);

    // Viscosity influence on plume opacity
    const viscFactor = Math.min(1.0, 2000.0 / Math.max(100.0, viscosityCP));
    this._thermalMaterial.opacity = 0.55 + viscFactor * 0.35;
  }

  public setVisualMode(mode: VisualMode): void {
    if (mode === 'thermal') {
      this._reservoirBlock.material = this._rockMaterial;
      (this._reservoirBlock.material as THREE.MeshStandardMaterial).transparent = true;
      (this._reservoirBlock.material as THREE.MeshStandardMaterial).opacity = 0.4;
      this._thermalPlumePlane.visible = true;
      this._pressurePlane.visible = false;
      this._thermalMaterial.emissive = new THREE.Color(0xff2200);
    } else if (mode === 'viscosity') {
      this._reservoirBlock.material = this._rockMaterial;
      (this._reservoirBlock.material as THREE.MeshStandardMaterial).transparent = true;
      (this._reservoirBlock.material as THREE.MeshStandardMaterial).opacity = 0.4;
      this._thermalPlumePlane.visible = true;
      this._pressurePlane.visible = false;
      this._thermalMaterial.emissive = new THREE.Color(0x10b981); // Emerald/viscosity tint
    } else if (mode === 'pressure') {
      this._reservoirBlock.material = this._rockMaterial;
      (this._reservoirBlock.material as THREE.MeshStandardMaterial).transparent = true;
      (this._reservoirBlock.material as THREE.MeshStandardMaterial).opacity = 0.3;
      this._thermalPlumePlane.visible = false;
      this._pressurePlane.visible = true;
    } else if (mode === 'cutaway') {
      this._reservoirBlock.material = this._rockMaterial;
      (this._reservoirBlock.material as THREE.MeshStandardMaterial).transparent = true;
      (this._reservoirBlock.material as THREE.MeshStandardMaterial).opacity = 0.65;
      this._thermalPlumePlane.visible = true;
      this._pressurePlane.visible = false;
    } else {
      // Realistic: full opacity
      this._reservoirBlock.material = this._rockMaterial;
      (this._reservoirBlock.material as THREE.MeshStandardMaterial).transparent = false;
      (this._reservoirBlock.material as THREE.MeshStandardMaterial).opacity = 1.0;
      this._thermalPlumePlane.visible = true;
      this._pressurePlane.visible = false;
      this._thermalMaterial.emissive = new THREE.Color(0xff4500);
    }
  }
}
