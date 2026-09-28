import * as THREE from 'three';

/**
 * SteamParticleSystem.ts
 * Animated steam particle flow:
 * STEAM GENERATOR -> PIPE -> WELLHEAD -> DOWNHOLE -> RESERVOIR.
 * Particle speed & count directly coupled to steam_volume_t_d.
 * When steam_volume == 0, injection stops completely.
 */

export class SteamParticleSystem {
  public readonly root: THREE.Group;
  private _particles: THREE.Points;
  private _positions: Float32Array;
  private _progress: Float32Array;
  private _spline: THREE.CatmullRomCurve3;
  private _count = 140;

  constructor() {
    this.root = new THREE.Group();
    this.root.name = 'SteamParticleHierarchy';

    // Steam trajectory: Generator (-11.5, 2.5, 3.5) -> Steam Line -> Wellhead (4.0, 1.2, 0) -> Downhole (-6.0, 0) -> Reservoir
    this._spline = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-11.5, 2.2, 3.5),
      new THREE.Vector3(-7.5, 0.45, 4.0),
      new THREE.Vector3(-4.5, 0.45, 2.8),
      new THREE.Vector3(-1.5, 0.45, 1.8),
      new THREE.Vector3(1.5, 0.45, 0.8),
      new THREE.Vector3(3.8, 0.85, 0.0), // Entering wellhead
      new THREE.Vector3(4.0, 0.0, 0.0),  // Going down well
      new THREE.Vector3(4.0, -3.0, 0.0),
      new THREE.Vector3(4.0, -6.0, 0.0),
      new THREE.Vector3(5.5, -8.5, 0.0), // Entering reservoir perforations
      new THREE.Vector3(7.5, -9.8, 0.0),
      new THREE.Vector3(10.0, -9.8, 0.0)
    ]);

    this._positions = new Float32Array(this._count * 3);
    this._progress = new Float32Array(this._count);

    const geo = new THREE.BufferGeometry();
    for (let i = 0; i < this._count; i++) {
      this._progress[i] = Math.random();
      const pt = this._spline.getPointAt(this._progress[i]);
      this._positions[i * 3] = pt.x;
      this._positions[i * 3 + 1] = pt.y;
      this._positions[i * 3 + 2] = pt.z;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(this._positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.28,
      transparent: true,
      opacity: 0.75,
      depthWrite: false
    });

    this._particles = new THREE.Points(geo, mat);
    this.root.add(this._particles);
  }

  public update(deltaTime: number, steamRateTD: number, isInjecting: boolean): void {
    if (!isInjecting || steamRateTD <= 0.5) {
      this.root.visible = false;
      return;
    }

    this.root.visible = true;
    const speed = 0.25 * (steamRateTD / 40.0);

    for (let i = 0; i < this._count; i++) {
      this._progress[i] = (this._progress[i] + deltaTime * speed) % 1.0;
      const pt = this._spline.getPointAt(this._progress[i]);
      // Add slight turbulent dispersion
      const spread = 0.08 * (1.0 + this._progress[i]);
      this._positions[i * 3] = pt.x + (Math.random() - 0.5) * spread;
      this._positions[i * 3 + 1] = pt.y + (Math.random() - 0.5) * spread;
      this._positions[i * 3 + 2] = pt.z + (Math.random() - 0.5) * spread;
    }

    (this._particles.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  }
}
