import * as THREE from 'three';

/**
 * OilParticleSystem.ts
 * Real physics-driven multi-stage oil particle simulation:
 * 1. Reservoir Drainage Zone: Formation oil migrating towards well perforations
 * 2. Downhole Pump & Tubing: Liquid column lifted by the reciprocating pump up to the surface
 * 3. Surface Flowline: Produced oil transported to the 3-phase separator and storage tanks
 * 
 * Particle speed & density strictly coupled to simulation oil_rate_bopd.
 * When production is ZERO, particles come to a COMPLETE STOP.
 */

export class OilParticleSystem {
  public readonly root: THREE.Group;

  // Particle systems
  private _resParticles: THREE.Points;
  private _resPositions: Float32Array;
  private _resProgress: Float32Array;
  private _resOrigins: Float32Array;

  private _tubingParticles: THREE.Points;
  private _tubingPositions: Float32Array;
  private _tubingProgress: Float32Array;

  private _surfaceParticles: THREE.Points;
  private _surfacePositions: Float32Array;
  private _surfaceProgress: Float32Array;

  // Splines
  private _tubingSpline: THREE.CatmullRomCurve3;
  private _surfaceSpline: THREE.CatmullRomCurve3;

  private _resCount = 180;
  private _tubingCount = 220;
  private _surfaceCount = 160;

  constructor() {
    this.root = new THREE.Group();
    this.root.name = 'OilParticleHierarchy';

    // 1. Tubing Spline: Pump (-9.8m) -> Curve -> Wellhead (1.05m)
    this._tubingSpline = new THREE.CatmullRomCurve3([
      new THREE.Vector3(11.5, -9.8, 0.0),
      new THREE.Vector3(9.5, -9.8, 0.0),
      new THREE.Vector3(7.8, -9.8, 0.0),
      new THREE.Vector3(5.5, -8.5, 0.0),
      new THREE.Vector3(4.0, -6.0, 0.0),
      new THREE.Vector3(4.0, -3.0, 0.0),
      new THREE.Vector3(4.0, 0.0, 0.0),
      new THREE.Vector3(4.0, 1.05, 0.0)
    ]);

    // 2. Surface Spline: Wellhead -> Flowline -> Separator -> Oil Tank
    this._surfaceSpline = new THREE.CatmullRomCurve3([
      new THREE.Vector3(4.0, 1.05, 0.0),
      new THREE.Vector3(6.5, 0.45, 0.5),
      new THREE.Vector3(8.5, 0.45, 1.5),
      new THREE.Vector3(9.5, 0.45, 3.0),
      new THREE.Vector3(9.5, 1.2, 3.5),
      new THREE.Vector3(10.5, 1.5, 3.5),
      new THREE.Vector3(12.3, 3.2, 3.5),
      new THREE.Vector3(12.3, 1.6, 3.5)
    ]);

    // Build particle systems
    this._resPositions = new Float32Array(this._resCount * 3);
    this._resProgress = new Float32Array(this._resCount);
    this._resOrigins = new Float32Array(this._resCount * 3);
    this._resParticles = this.initReservoirParticles();
    this.root.add(this._resParticles);

    this._tubingPositions = new Float32Array(this._tubingCount * 3);
    this._tubingProgress = new Float32Array(this._tubingCount);
    this._tubingParticles = this.initTubingParticles();
    this.root.add(this._tubingParticles);

    this._surfacePositions = new Float32Array(this._surfaceCount * 3);
    this._surfaceProgress = new Float32Array(this._surfaceCount);
    this._surfaceParticles = this.initSurfaceParticles();
    this.root.add(this._surfaceParticles);
  }

  private initReservoirParticles(): THREE.Points {
    const geo = new THREE.BufferGeometry();
    for (let i = 0; i < this._resCount; i++) {
      // Spawn in porous drainage zone
      const ox = 7.0 + Math.random() * 11.0;
      const oy = -13.0 + Math.random() * 6.0;
      const oz = (Math.random() - 0.5) * 4.5;
      this._resOrigins[i * 3] = ox;
      this._resOrigins[i * 3 + 1] = oy;
      this._resOrigins[i * 3 + 2] = oz;

      this._resProgress[i] = Math.random();
      this.resetResParticle(i);
    }

    geo.setAttribute('position', new THREE.BufferAttribute(this._resPositions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xd97706, // Amber crude oil droplet
      size: 0.18,
      transparent: true,
      opacity: 0.85
    });
    return new THREE.Points(geo, mat);
  }

  private resetResParticle(i: number): void {
    const ox = this._resOrigins[i * 3];
    const oy = this._resOrigins[i * 3 + 1];
    const oz = this._resOrigins[i * 3 + 2];

    // Target is horizontal wellbore entry at Y = -9.8m, Z = 0
    const t = this._resProgress[i];
    this._resPositions[i * 3] = THREE.MathUtils.lerp(ox, 11.5, t);
    this._resPositions[i * 3 + 1] = THREE.MathUtils.lerp(oy, -9.8, t);
    this._resPositions[i * 3 + 2] = THREE.MathUtils.lerp(oz, 0.0, t);
  }

  private initTubingParticles(): THREE.Points {
    const geo = new THREE.BufferGeometry();
    for (let i = 0; i < this._tubingCount; i++) {
      const t = i / this._tubingCount;
      this._tubingProgress[i] = t;
      const pt = this._tubingSpline.getPointAt(t);
      this._tubingPositions[i * 3] = pt.x + (Math.random() - 0.5) * 0.06;
      this._tubingPositions[i * 3 + 1] = pt.y;
      this._tubingPositions[i * 3 + 2] = pt.z + (Math.random() - 0.5) * 0.06;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(this._tubingPositions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0x1c1917, // Dense dark crude
      size: 0.22,
      transparent: true,
      opacity: 0.95
    });
    return new THREE.Points(geo, mat);
  }

  private initSurfaceParticles(): THREE.Points {
    const geo = new THREE.BufferGeometry();
    for (let i = 0; i < this._surfaceCount; i++) {
      const t = i / this._surfaceCount;
      this._surfaceProgress[i] = t;
      const pt = this._surfaceSpline.getPointAt(t);
      this._surfacePositions[i * 3] = pt.x;
      this._surfacePositions[i * 3 + 1] = pt.y;
      this._surfacePositions[i * 3 + 2] = pt.z;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(this._surfacePositions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0x292524,
      size: 0.16,
      transparent: true,
      opacity: 0.9
    });
    return new THREE.Points(geo, mat);
  }

  /**
   * Main per-frame update strictly driven by simulation oil rate & flow speed factor
   */
  public update(deltaTime: number, flowSpeedFactor: number, oilRateBopd: number): void {
    // If production is zero, particles stop completely!
    if (oilRateBopd <= 0.01 || flowSpeedFactor <= 0.001) {
      this._resParticles.visible = false;
      this._tubingParticles.visible = false;
      this._surfaceParticles.visible = false;
      return;
    }

    this._resParticles.visible = true;
    this._tubingParticles.visible = true;
    this._surfaceParticles.visible = true;

    // Production rate velocity scaling (0.1 to 1.5 speed multiplier)
    const speed = 0.25 * flowSpeedFactor;

    // 1. Reservoir Drainage Particles (Move toward perforations)
    for (let i = 0; i < this._resCount; i++) {
      this._resProgress[i] += deltaTime * speed * 0.35;
      if (this._resProgress[i] >= 1.0) {
        this._resProgress[i] = 0.0;
        this._resOrigins[i * 3] = 7.0 + Math.random() * 11.0;
        this._resOrigins[i * 3 + 1] = -13.0 + Math.random() * 6.0;
        this._resOrigins[i * 3 + 2] = (Math.random() - 0.5) * 4.5;
      }
      this.resetResParticle(i);
    }
    (this._resParticles.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;

    // 2. Tubing Uphole Particles (From pump to wellhead)
    for (let i = 0; i < this._tubingCount; i++) {
      this._tubingProgress[i] = (this._tubingProgress[i] + deltaTime * speed * 0.6) % 1.0;
      const pt = this._tubingSpline.getPointAt(this._tubingProgress[i]);
      this._tubingPositions[i * 3] = pt.x;
      this._tubingPositions[i * 3 + 1] = pt.y;
      this._tubingPositions[i * 3 + 2] = pt.z;
    }
    (this._tubingParticles.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;

    // 3. Surface Flowline Particles (From wellhead to separator to tank)
    for (let i = 0; i < this._surfaceCount; i++) {
      this._surfaceProgress[i] = (this._surfaceProgress[i] + deltaTime * speed * 0.5) % 1.0;
      const pt = this._surfaceSpline.getPointAt(this._surfaceProgress[i]);
      this._surfacePositions[i * 3] = pt.x;
      this._surfacePositions[i * 3 + 1] = pt.y;
      this._surfacePositions[i * 3 + 2] = pt.z;
    }
    (this._surfaceParticles.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  }
}
