/**
 * PumpjackKinematics.ts
 * Rigorous 4-bar linkage kinematics for Class I beam pumping unit (API Spec 11E).
 * 
 * Linkage Geometry:
 * - O1 (0, H_post): Saddle / Center bearing atop Samson Post
 * - O2 (-Dx, H_crank): Center of slow-speed crankshaft on Gear Reducer
 * - P_c: Crank pin location (moves along circle with radius R_c)
 * - P_eq: Equalizer bearing at rear tip of walking beam (distance L_rear from O1)
 * - Pitman arm: Coupler connecting P_c to P_eq (length L_pitman)
 * - Walking beam: Rigid body pivoted at O1 with rear arm L_rear and front arm L_front
 * - Horsehead: Curved arc attached to front arm with radius L_front centered at O1
 * - Polished rod & Sucker rod: Moves purely vertically along well centerline X = L_front
 */

export interface KinematicState {
  spm: number;
  crankAngle: number;       // Radians [0, 2pi)
  crankAngleDeg: number;    // Degrees [0, 360)
  beamAngle: number;        // Radians (tilt angle of walking beam)
  beamAngleDeg: number;     // Degrees
  pitmanAngle: number;      // Radians (angle of pitman connecting rod)
  crankPinPos: { x: number; y: number };
  equalizerPos: { x: number; y: number };
  horseheadTipPos: { x: number; y: number };
  rodDisplacement: number;  // Current polished rod vertical displacement (m)
  rodNormalizedPos: number; // 0.0 (bottom dead center) to 1.0 (top dead center)
  rodVelocity: number;      // Instantaneous rod velocity (m/s)
  strokePhase: 'UPSTROKE' | 'DOWNSTROKE';
  cycleTime: number;        // Total seconds for one full stroke cycle (60 / SPM)
  cycleProgress: number;    // 0 to 100%
  strokeLength: number;     // Total measured travel (m)
  totalStrokes: number;     // Count of completed strokes
  pumpFillagePct?: number;  // Pump fillage percentage (0-100)
  oilRateBopd?: number;     // Instantaneous oil rate
}

export interface PumpjackParams {
  samsonPostHeight: number;  // H_post (default ~5.2m)
  crankCenterX: number;      // Dx (offset to left, default ~-3.6m)
  crankCenterY: number;      // H_crank (default ~1.35m)
  rearBeamLength: number;    // L_rear (default ~3.2m)
  frontBeamLength: number;   // L_front (default ~4.0m)
  pitmanLength: number;      // L_pitman (default ~4.15m)
  wellheadX: number;         // X coordinate of well centerline (= frontBeamLength = 4.0m)
  wellheadY: number;         // Top of stuffing box (default ~1.2m)
}

export class PumpjackKinematics {
  // Mechanical Configuration
  public readonly params: PumpjackParams = {
    samsonPostHeight: 5.2,
    crankCenterX: -3.6,
    crankCenterY: 1.35,
    rearBeamLength: 3.2,
    frontBeamLength: 4.0,
    pitmanLength: 4.15,
    wellheadX: 4.0,
    wellheadY: 1.2
  };

  // Operating parameters
  public spm: number = 3.0; // Strokes Per Minute (Default 3.0)
  public crankRadius: number = 0.75; // R_c (Controls stroke length)
  public isRunning: boolean = true;
  public timeScale: number = 1.0;

  // State variables
  private _crankAngle: number = 0; // Current crank angle in radians
  private _previousRodPos: number = 0;
  private _rodVelocity: number = 0;
  private _totalStrokes: number = 0;

  // Calibrated Stroke Bounds
  private _minRodPos: number = 0;
  private _maxRodPos: number = 1;
  private _measuredStroke: number = 1.8;

  constructor(initialSPM: number = 3.0, initialStrokeLength: number = 1.8) {
    this.spm = initialSPM;
    this.setStrokeLength(initialStrokeLength);
    this.recalibrateStrokeBounds();
  }

  /**
   * Set Strokes Per Minute (SPM).
   * Realistic pumpjack range: 1.0 to 10.0 SPM.
   */
  public setSPM(newSPM: number): void {
    this.spm = Math.max(0.5, Math.min(12.0, newSPM));
  }

  /**
   * Set Stroke Length in meters.
   * Adjusts crank pin radius R_c accordingly.
   */
  public setStrokeLength(targetStroke: number): void {
    // For Class I lever: Rod Stroke S ≈ 2 * R_c * (L_front / L_rear)
    // R_c ≈ (S / 2) * (L_rear / L_front)
    const ratio = this.params.rearBeamLength / this.params.frontBeamLength;
    this.crankRadius = (targetStroke * 0.5) * ratio;
    // Bound check crankRadius to avoid geometric lockup:
    this.crankRadius = Math.max(0.35, Math.min(1.15, this.crankRadius));
    this.recalibrateStrokeBounds();
  }

  /**
   * Recalibrate exact min and max rod travel by scanning 360 deg.
   */
  private recalibrateStrokeBounds(): void {
    let minPos = Infinity;
    let maxPos = -Infinity;
    const samples = 120;
    for (let i = 0; i < samples; i++) {
      const angle = (i / samples) * Math.PI * 2;
      const { rodPos } = this.solveGeometry(angle);
      if (rodPos < minPos) minPos = rodPos;
      if (rodPos > maxPos) maxPos = rodPos;
    }
    this._minRodPos = minPos;
    this._maxRodPos = maxPos;
    this._measuredStroke = maxPos - minPos;
  }

  /**
   * Solves closed-form circle-circle intersection for the 4-bar linkage:
   * Circle 1: Center (0, H_post), Radius L_rear
   * Circle 2: Center P_c, Radius L_pitman
   */
  public solveGeometry(crankAngle: number): {
    crankPin: { x: number; y: number };
    equalizer: { x: number; y: number };
    beamAngle: number;
    pitmanAngle: number;
    rodPos: number;
    horseheadTip: { x: number; y: number };
  } {
    const { samsonPostHeight, crankCenterX, crankCenterY, rearBeamLength, frontBeamLength, pitmanLength } = this.params;

    // 1. Crank pin location (counterclockwise rotation)
    // Crank rotates counterclockwise so that during upstroke pitman pulls down on walking beam rear
    const pinX = crankCenterX + this.crankRadius * Math.cos(crankAngle);
    const pinY = crankCenterY + this.crankRadius * Math.sin(crankAngle);

    // 2. Circle-Circle intersection between O1(0, samsonPostHeight) and P_c(pinX, pinY)
    const x1 = 0;
    const y1 = samsonPostHeight;
    const r1 = rearBeamLength;

    const x2 = pinX;
    const y2 = pinY;
    const r2 = pitmanLength;

    const dx = x2 - x1;
    const dy = y2 - y1;
    const d = Math.sqrt(dx * dx + dy * dy);

    // Circle intersection distance along baseline
    const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d);
    const hSq = r1 * r1 - a * a;
    const h = Math.sqrt(Math.max(0, hSq));

    // Midpoint on chord
    const mx = x1 + (a * dx) / d;
    const my = y1 + (a * dy) / d;

    // Two possible intersection points:
    // P_eq1 = (mx + h*dy/d, my - h*dx/d)
    // P_eq2 = (mx - h*dy/d, my + h*dx/d)
    // In our coordinate system, rear of pumpjack is along negative X.
    // Pick the point with negative X that represents the upper linkage.
    const p1x = mx + (h * dy) / d;
    const p1y = my - (h * dx) / d;
    const p2x = mx - (h * dy) / d;
    const p2y = my + (h * dx) / d;

    // Choose intersection that lies on the rear side (x < 0)
    let eqX = p1x;
    let eqY = p1y;
    if (p2x < p1x) {
      eqX = p2x;
      eqY = p2y;
    }

    // 3. Beam Angle (phi)
    // Equalizer is at (-L_rear * cos(phi), H_post - L_rear * sin(phi))
    // When rear goes down, front goes up!
    // So phi is the tilt of the front beam:
    // dy_rear = eqY - H_post
    // dx_rear = eqX
    // cos(phi) = -eqX / L_rear, sin(phi) = (H_post - eqY) / L_rear
    const beamAngle = Math.atan2(samsonPostHeight - eqY, -eqX);

    // 4. Pitman Angle
    const pitmanAngle = Math.atan2(eqY - pinY, eqX - pinX);

    // 5. Horsehead Tip & Polished Rod Position
    // The horsehead arc center is O1 (0, H_post) and radius is frontBeamLength.
    // As beam rotates by beamAngle, the arc winds / unwinds the wire bridle.
    // Rod displacement from center: S(phi) = frontBeamLength * beamAngle.
    // Absolute vertical position of the carrier bar:
    const carrierBarBaseline = samsonPostHeight;
    const rodPos = carrierBarBaseline + frontBeamLength * Math.sin(beamAngle);

    // Horsehead front tip
    const horseheadTipX = frontBeamLength * Math.cos(beamAngle);
    const horseheadTipY = samsonPostHeight + frontBeamLength * Math.sin(beamAngle);

    return {
      crankPin: { x: pinX, y: pinY },
      equalizer: { x: eqX, y: eqY },
      beamAngle,
      pitmanAngle,
      rodPos,
      horseheadTip: { x: horseheadTipX, y: horseheadTipY }
    };
  }

  /**
   * Main simulation step.
   * @param deltaTime in seconds
   */
  public update(deltaTime: number): KinematicState {
    if (this.isRunning && deltaTime > 0) {
      // Angular velocity omega = 2 * PI * (SPM / 60)
      const omega = (this.spm * 2 * Math.PI) / 60;
      this._crankAngle += omega * deltaTime * this.timeScale;

      // Wrap crank angle to [0, 2*PI)
      if (this._crankAngle >= Math.PI * 2) {
        this._crankAngle %= (Math.PI * 2);
        this._totalStrokes++;
      } else if (this._crankAngle < 0) {
        this._crankAngle = (this._crankAngle % (Math.PI * 2)) + Math.PI * 2;
      }
    }

    // Solve exact 4-bar linkage geometry
    const geom = this.solveGeometry(this._crankAngle);

    // Compute velocity
    const currentRodPos = geom.rodPos;
    if (deltaTime > 0) {
      this._rodVelocity = (currentRodPos - this._previousRodPos) / deltaTime;
    }
    this._previousRodPos = currentRodPos;

    // Stroke phase & normalized travel [0.0, 1.0]
    const travelRange = Math.max(0.001, this._maxRodPos - this._minRodPos);
    const rodNormalizedPos = Math.max(0, Math.min(1, (currentRodPos - this._minRodPos) / travelRange));

    const isUpstroke = this._rodVelocity >= 0;

    const cycleTime = 60 / Math.max(0.1, this.spm);
    const cycleProgress = (this._crankAngle / (Math.PI * 2)) * 100;

    return {
      spm: this.spm,
      crankAngle: this._crankAngle,
      crankAngleDeg: (this._crankAngle * 180) / Math.PI,
      beamAngle: geom.beamAngle,
      beamAngleDeg: (geom.beamAngle * 180) / Math.PI,
      pitmanAngle: geom.pitmanAngle,
      crankPinPos: geom.crankPin,
      equalizerPos: geom.equalizer,
      horseheadTipPos: geom.horseheadTip,
      rodDisplacement: currentRodPos - this._minRodPos,
      rodNormalizedPos,
      rodVelocity: this._rodVelocity,
      strokePhase: isUpstroke ? 'UPSTROKE' : 'DOWNSTROKE',
      cycleTime,
      cycleProgress,
      strokeLength: this._measuredStroke,
      totalStrokes: this._totalStrokes
    };
  }

  /**
   * Reset rotation to Top Dead Center (or zero).
   */
  public reset(): void {
    this._crankAngle = 0;
    this._previousRodPos = 0;
    this._rodVelocity = 0;
  }
}
