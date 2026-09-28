import * as THREE from 'three';

/**
 * FluidPath.ts
 * Visualizes the complete physical 3D path traversed by the produced fluid:
 * RESERVOIR -> PERFORATIONS -> PUMP INTAKE -> DOWNHOLE PUMP -> TUBING -> WELLHEAD -> SURFACE FLOWLINE -> SEPARATOR -> OIL STORAGE & WATER TANK.
 */

export class FluidPath {
  public readonly root: THREE.Group;
  private _pathLines!: THREE.Line;
  private _flowChevrons: THREE.Mesh[] = [];
  private _glowMaterial: THREE.MeshBasicMaterial;
  private _animOffset: number = 0;

  constructor() {
    this.root = new THREE.Group();
    this.root.name = 'FluidPathHierarchy';

    this._glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x06b6d4, // Cyan/Aqua luminous flow path
      transparent: true,
      opacity: 0.85
    });

    this.buildFluidPathGeometry();
  }

  private buildFluidPathGeometry(): void {
    // 1. Full 3D Trajectory Points:
    // Reservoir Drainage (-9.8m) -> Perforations -> Pump -> Curve -> Tubing (uphole to 1.05m) -> Wellhead -> Flowline -> Separator -> Oil Tank
    const points = [
      // Reservoir formation drainage area
      new THREE.Vector3(15.5, -9.8, 0.0),
      new THREE.Vector3(13.5, -9.8, 0.0),
      new THREE.Vector3(11.5, -9.8, 0.0), // Pump Intake & Barrel
      new THREE.Vector3(9.5, -9.8, 0.0),  // Traveling Valve discharge
      new THREE.Vector3(7.8, -9.8, 0.0),  // Entering 90 deg curve
      // Curved wellbore uphole
      new THREE.Vector3(5.5, -8.5, 0.0),
      new THREE.Vector3(4.0, -6.0, 0.0),
      new THREE.Vector3(4.0, -3.0, 0.0),
      new THREE.Vector3(4.0, 0.0, 0.0),   // Surface well entrance
      new THREE.Vector3(4.0, 1.05, 0.0),  // Wellhead production tee
      // Surface Flowline across ground
      new THREE.Vector3(6.5, 0.45, 0.5),
      new THREE.Vector3(8.5, 0.45, 1.5),
      new THREE.Vector3(9.5, 0.45, 3.0),  // Arriving at 3-Phase Separator
      new THREE.Vector3(9.5, 1.2, 3.5),   // Separator Inlet
      // From Separator to Oil Storage Tank
      new THREE.Vector3(10.5, 1.5, 3.5),  // Separator Oil Outlet
      new THREE.Vector3(12.3, 3.2, 3.5),  // Tank 1 Inlet Dome
      new THREE.Vector3(12.3, 1.5, 3.5)   // Oil in storage
    ];

    const spline = new THREE.CatmullRomCurve3(points);
    const tubeGeo = new THREE.TubeGeometry(spline, 120, 0.06, 12, false);
    const tubeMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      transparent: true,
      opacity: 0.45,
      roughness: 0.3,
      metalness: 0.8
    });
    const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);
    tubeMesh.name = 'FluidTrajectoryTube';
    this.root.add(tubeMesh);

    // Glowing Centerline
    const lineGeo = new THREE.BufferGeometry().setFromPoints(spline.getPoints(150));
    this._pathLines = new THREE.Line(
      lineGeo,
      new THREE.LineBasicMaterial({ color: 0x38bdf8, linewidth: 2 })
    );
    this.root.add(this._pathLines);

    // Flow Directional Chevrons along the path
    const chevronGeo = new THREE.ConeGeometry(0.12, 0.28, 12);
    chevronGeo.rotateX(Math.PI / 2);

    for (let i = 0; i < 16; i++) {
      const chevron = new THREE.Mesh(chevronGeo, this._glowMaterial);
      this.root.add(chevron);
      this._flowChevrons.push(chevron);
    }
  }

  public update(deltaTime: number, flowSpeedFactor: number): void {
    if (flowSpeedFactor <= 0.001) {
      this._glowMaterial.opacity = 0.2;
      return;
    }

    this._glowMaterial.opacity = 0.85;
    this._animOffset = (this._animOffset + deltaTime * 0.15 * flowSpeedFactor) % 1.0;

    const points = [
      new THREE.Vector3(15.5, -9.8, 0.0),
      new THREE.Vector3(13.5, -9.8, 0.0),
      new THREE.Vector3(11.5, -9.8, 0.0),
      new THREE.Vector3(9.5, -9.8, 0.0),
      new THREE.Vector3(7.8, -9.8, 0.0),
      new THREE.Vector3(5.5, -8.5, 0.0),
      new THREE.Vector3(4.0, -6.0, 0.0),
      new THREE.Vector3(4.0, -3.0, 0.0),
      new THREE.Vector3(4.0, 0.0, 0.0),
      new THREE.Vector3(4.0, 1.05, 0.0),
      new THREE.Vector3(6.5, 0.45, 0.5),
      new THREE.Vector3(8.5, 0.45, 1.5),
      new THREE.Vector3(9.5, 0.45, 3.0),
      new THREE.Vector3(9.5, 1.2, 3.5),
      new THREE.Vector3(10.5, 1.5, 3.5),
      new THREE.Vector3(12.3, 3.2, 3.5)
    ];
    const spline = new THREE.CatmullRomCurve3(points);

    this._flowChevrons.forEach((chev, idx) => {
      const t = (this._animOffset + idx / this._flowChevrons.length) % 1.0;
      const pt = spline.getPointAt(t);
      const tangent = spline.getTangentAt(t);
      chev.position.copy(pt);
      chev.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);
    });
  }

  public setVisible(visible: boolean): void {
    this.root.visible = visible;
  }
}
