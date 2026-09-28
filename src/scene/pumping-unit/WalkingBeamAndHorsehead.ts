import * as THREE from 'three';
import { PumpingUnitMaterials } from './PumpingUnitMaterials.ts';
import type { PumpjackParams } from '../../kinematics/PumpjackKinematics.ts';

/**
 * WalkingBeamAndHorsehead.ts
 * Heavy Structural Wide-Flange Walking Beam (API W24),
 * Precision Machined Horsehead with Dual Wire-Rope Bridle Tracks,
 * Forged Alloy Carrier Bar, Chrome Polished Rod, Pitman Arms, and Equalizer Bar.
 */

export class WalkingBeamAndHorsehead {
  public readonly walkingBeamGroup: THREE.Group;
  public readonly equalizerBar: THREE.Group;
  public readonly pitmanLeft: THREE.Group;
  public readonly pitmanRight: THREE.Group;
  public readonly bridleLines: THREE.LineSegments;
  public readonly carrierBar: THREE.Mesh;
  public readonly polishedRod: THREE.Mesh;
  public readonly polishedRodOilFilm: THREE.Mesh;

  private mats: PumpingUnitMaterials;
  private params: PumpjackParams;

  constructor(mats: PumpingUnitMaterials, params: PumpjackParams) {
    this.mats = mats;
    this.params = params;

    // 1. Walking Beam and Horsehead Assembly
    this.walkingBeamGroup = this.buildWalkingBeam();

    // 2. Equalizer Bar & Twin Pitman Arms
    this.equalizerBar = this.buildEqualizerBar();
    const { pitmanLeft, pitmanRight } = this.buildPitmanArms();
    this.pitmanLeft = pitmanLeft;
    this.pitmanRight = pitmanRight;

    // 3. Bridle, Carrier Bar & Polished Rod Assembly
    const rodAssembly = this.buildPolishedRodAssembly();
    this.bridleLines = rodAssembly.bridle;
    this.carrierBar = rodAssembly.carrierBar;
    this.polishedRod = rodAssembly.polishedRod;
    this.polishedRodOilFilm = rodAssembly.oilFilm;
  }

  /**
   * 1. Heavy Fabricated Wide-Flange Walking Beam & Curved Industrial Horsehead
   */
  private buildWalkingBeam(): THREE.Group {
    const beamPivot = new THREE.Group();
    beamPivot.name = 'WalkingBeamPivot';
    beamPivot.position.set(0, this.params.samsonPostHeight, 0);

    const { rearBeamLength, frontBeamLength } = this.params;
    const totalLength = rearBeamLength + frontBeamLength;

    const beamGroup = new THREE.Group();
    beamGroup.name = 'WalkingBeamRigidBody';
    beamGroup.userData = { component: 'PUMPJACK' };

    // A. Structural Wide-Flange I-Beam Profile (API W24 Spec)
    const beamHeight = 0.62;
    const flangeWidth = 0.44;
    const flangeThick = 0.045;
    const webThick = 0.035;

    // Top Flange Plate
    const topFlange = new THREE.Mesh(
      new THREE.BoxGeometry(totalLength, flangeThick, flangeWidth),
      this.mats.structuralSteel
    );
    topFlange.position.set((frontBeamLength - rearBeamLength) * 0.5, beamHeight * 0.5 - flangeThick * 0.5, 0);
    topFlange.castShadow = true;
    beamGroup.add(topFlange);

    // Bottom Flange Plate
    const btmFlange = new THREE.Mesh(
      new THREE.BoxGeometry(totalLength, flangeThick, flangeWidth),
      this.mats.structuralSteel
    );
    btmFlange.position.set((frontBeamLength - rearBeamLength) * 0.5, -beamHeight * 0.5 + flangeThick * 0.5, 0);
    btmFlange.castShadow = true;
    beamGroup.add(btmFlange);

    // Central Web Plate
    const web = new THREE.Mesh(
      new THREE.BoxGeometry(totalLength, beamHeight - flangeThick * 2, webThick),
      this.mats.structuralSteel
    );
    web.position.set((frontBeamLength - rearBeamLength) * 0.5, 0, 0);
    web.castShadow = true;
    beamGroup.add(web);

    // Center Saddle Bearing Reinforcement Doubler Plates (Over Pivot Point X = 0)
    const doubler = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, beamHeight + 0.08, flangeWidth + 0.04),
      this.mats.structuralSteelDark
    );
    doubler.position.set(0, 0, 0);
    beamGroup.add(doubler);

    // Vertical Web Stiffener Plates (10 welded structural gussets along beam)
    [-2.6, -1.8, -1.0, -0.6, 0.6, 1.2, 2.0, 2.8, 3.4].forEach(gx => {
      const gusset = new THREE.Mesh(
        new THREE.BoxGeometry(0.025, beamHeight - flangeThick * 2, flangeWidth * 0.88),
        this.mats.structuralSteelDark
      );
      gusset.position.set(gx, 0, 0);
      beamGroup.add(gusset);
    });

    // Rear Equalizer Tail Bearing Housing Bracket (Clevis on rear tip)
    const tailBracket = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.45, 0.32),
      this.mats.castIron
    );
    tailBracket.position.set(-rearBeamLength, 0, 0);
    beamGroup.add(tailBracket);

    // Bronze Tail Bearing Pin
    const tailPin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 0.38, 16),
      this.mats.machinedChrome
    );
    tailPin.rotation.x = Math.PI / 2;
    tailPin.position.set(-rearBeamLength, 0, 0);
    beamGroup.add(tailPin);

    // B. Industrial Curved Horsehead Assembly (Curvature Radius R = frontBeamLength = 4.0m)
    const arcRadius = frontBeamLength;
    const arcAngleSpread = 0.58; // Approx 33 degrees
    const arcSegments = 36;

    const arcShape = new THREE.Shape();
    arcShape.moveTo(
      arcRadius * Math.cos(-arcAngleSpread * 0.5),
      arcRadius * Math.sin(-arcAngleSpread * 0.5)
    );

    // Smooth circular front curvature for wire rope tangency
    for (let i = 1; i <= arcSegments; i++) {
      const a = -arcAngleSpread * 0.5 + (i / arcSegments) * arcAngleSpread;
      arcShape.lineTo(arcRadius * Math.cos(a), arcRadius * Math.sin(a));
    }

    // Rear tapered body connecting to walking beam
    arcShape.lineTo(frontBeamLength - 1.25, 0.18);
    arcShape.lineTo(frontBeamLength - 1.25, -0.18);
    arcShape.closePath();

    const hhGeo = new THREE.ExtrudeGeometry(arcShape, {
      depth: 0.42,
      bevelEnabled: true,
      bevelSegments: 2,
      bevelSize: 0.02,
      bevelThickness: 0.02
    });

    const horseheadMesh = new THREE.Mesh(hhGeo, this.mats.structuralSteel);
    horseheadMesh.position.set(0, 0, -0.21);
    horseheadMesh.castShadow = true;
    beamGroup.add(horseheadMesh);

    // Machined Dual Wire-Rope Bridle Cable Tracks (Twin curved wire grooves on face)
    [-0.14, 0.14].forEach(zGuide => {
      const trackPoints: THREE.Vector3[] = [];
      for (let i = 0; i <= arcSegments; i++) {
        const a = -arcAngleSpread * 0.5 + (i / arcSegments) * arcAngleSpread;
        trackPoints.push(new THREE.Vector3(arcRadius * Math.cos(a) + 0.015, arcRadius * Math.sin(a), zGuide));
      }
      const trackCurve = new THREE.CatmullRomCurve3(trackPoints);
      const trackTube = new THREE.Mesh(
        new THREE.TubeGeometry(trackCurve, 32, 0.018, 8, false),
        this.mats.machinedChrome
      );
      beamGroup.add(trackTube);
    });

    // Top Cable Clamp Retainer Block atop Horsehead
    const topClamp = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.08, 0.46),
      this.mats.castIron
    );
    topClamp.position.set(frontBeamLength - 0.05, 0.32, 0);
    beamGroup.add(topClamp);

    // Horsehead Safety Flip-Over Hinge Pin & Locking Plates
    const hingePin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.045, 0.52, 16),
      this.mats.machinedChrome
    );
    hingePin.rotation.x = Math.PI / 2;
    hingePin.position.set(frontBeamLength - 0.95, 0.22, 0);
    beamGroup.add(hingePin);

    beamPivot.add(beamGroup);
    return beamPivot;
  }

  /**
   * 2. Equalizer Bar (Cross-Tree) & Heavy Twin Pitman Arms
   */
  private buildEqualizerBar(): THREE.Group {
    const eqGroup = new THREE.Group();
    eqGroup.name = 'EqualizerBarCrossTree';

    // Heavy forged equalizer cross-beam
    const bar = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.26, 1.82),
      this.mats.structuralSteel
    );
    bar.castShadow = true;
    eqGroup.add(bar);

    // Center Clevis Bearing Bracket (Connecting to walking beam tail pin)
    const centerBracket = new THREE.Mesh(
      new THREE.BoxGeometry(0.38, 0.32, 0.36),
      this.mats.castIron
    );
    centerBracket.position.set(0, 0, 0);
    eqGroup.add(centerBracket);

    // Outer Spherical Bearing Caps for Pitman Arm upper clevises
    [-0.85, 0.85].forEach(z => {
      const pinCap = new THREE.Mesh(
        new THREE.CylinderGeometry(0.09, 0.09, 0.12, 16),
        this.mats.castIron
      );
      pinCap.rotation.x = Math.PI / 2;
      pinCap.position.set(0, 0, z > 0 ? z + 0.05 : z - 0.05);
      eqGroup.add(pinCap);

      // Grease fittings on equalizer ends
      const greaseNipple = new THREE.Mesh(
        new THREE.CylinderGeometry(0.012, 0.012, 0.04, 8),
        this.mats.brassFitting
      );
      greaseNipple.position.set(0, 0.15, z);
      eqGroup.add(greaseNipple);
    });

    return eqGroup;
  }

  private buildPitmanArms(): { pitmanLeft: THREE.Group; pitmanRight: THREE.Group } {
    const createPitman = (isRight: boolean) => {
      const pGroup = new THREE.Group();
      pGroup.name = isRight ? 'RightPitmanArm' : 'LeftPitmanArm';

      const pLen = this.params.pitmanLength; // 4.15m

      // Heavy Structural Pitman Arm Member (H-beam / heavy tubular profile)
      const arm = new THREE.Mesh(
        new THREE.BoxGeometry(pLen, 0.22, 0.12),
        this.mats.structuralSteel
      );
      arm.position.set(pLen * 0.5, 0, 0);
      arm.castShadow = true;
      pGroup.add(arm);

      // Lower Wrist Pin Bearing Housing (Clevis around crank pin)
      const lowerEye = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.18, 0.18, 20),
        this.mats.castIron
      );
      lowerEye.rotation.x = Math.PI / 2;
      lowerEye.position.set(0, 0, 0);
      pGroup.add(lowerEye);

      // Upper Equalizer Bearing Housing (Clevis around equalizer bar end)
      const upperEye = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.18, 0.18, 20),
        this.mats.castIron
      );
      upperEye.rotation.x = Math.PI / 2;
      upperEye.position.set(pLen, 0, 0);
      pGroup.add(upperEye);

      // Welded Web Reinforcement Doubler Bands on Pitman body
      [0.3, 0.7].forEach(prog => {
        const band = new THREE.Mesh(
          new THREE.BoxGeometry(0.35, 0.23, 0.13),
          this.mats.structuralSteelDark
        );
        band.position.set(pLen * prog, 0, 0);
        pGroup.add(band);
      });

      return pGroup;
    };

    return {
      pitmanLeft: createPitman(false),
      pitmanRight: createPitman(true)
    };
  }

  /**
   * 3. Wire Rope Bridle Cables, Heavy Forged Carrier Bar & Mirror Chrome Polished Rod
   */
  private buildPolishedRodAssembly(): {
    bridle: THREE.LineSegments;
    carrierBar: THREE.Mesh;
    polishedRod: THREE.Mesh;
    oilFilm: THREE.Mesh;
  } {
    const wx = this.params.wellheadX; // 4.0m

    // A. Dual Braided Steel Wire Rope Bridle Cables (Connecting horsehead arc to carrier bar)
    const bridleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array([
      wx, 5.2, -0.20,
      wx, 3.6, -0.20,
      wx, 5.2, 0.20,
      wx, 3.6, 0.20
    ]);
    bridleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const bridleLines = new THREE.LineSegments(
      bridleGeo,
      new THREE.LineBasicMaterial({ color: 0x64748b, linewidth: 3 })
    );

    // B. Heavy Forged Alloy Steel Carrier Bar (API Spec 11B)
    const carrierBar = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.16, 0.62),
      this.mats.castIron
    );
    carrierBar.position.set(wx, 3.6, 0);
    carrierBar.castShadow = true;
    carrierBar.userData = { component: 'ROD' };

    // Heavy Dual-Bolt Polished Rod Clamp atop Carrier Bar
    const rodClamp = new THREE.Mesh(
      new THREE.BoxGeometry(0.20, 0.18, 0.22),
      this.mats.castIron
    );
    rodClamp.position.set(0, 0.15, 0);
    carrierBar.add(rodClamp);

    // Two Grade 8 Clamp Stud Bolts with Hex Nuts
    [-0.06, 0.06].forEach(bz => {
      const cBolt = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.26, 6), this.mats.machinedChrome);
      cBolt.position.set(0, 0.15, bz);
      carrierBar.add(cBolt);
    });

    // Wire Rope Cable Thimbles & Swaged Ferrules on Carrier Bar ends
    [-0.20, 0.20].forEach(bz => {
      const thimble = new THREE.Mesh(
        new THREE.TorusGeometry(0.045, 0.016, 8, 16),
        this.mats.machinedChrome
      );
      thimble.position.set(0, 0.05, bz);
      carrierBar.add(thimble);
    });

    // C. Mirror-Finish Stainless Steel Polished Rod (1.5" Diameter, Pristine Reflection)
    const rodGeo = new THREE.CylinderGeometry(0.024, 0.024, 4.4, 24);
    const polishedRod = new THREE.Mesh(rodGeo, this.mats.machinedChrome);
    polishedRod.position.set(wx, 1.5, 0);
    polishedRod.castShadow = true;
    polishedRod.userData = { component: 'ROD' };

    // D. Wet Crude Oil Sheen Sleeve (Simulates thin wet oil film moving down polished rod)
    const oilFilmGeo = new THREE.CylinderGeometry(0.025, 0.025, 2.2, 20);
    const oilFilm = new THREE.Mesh(oilFilmGeo, this.mats.crudeOil);
    oilFilm.position.set(wx, 0.6, 0);

    return {
      bridle: bridleLines,
      carrierBar,
      polishedRod,
      oilFilm
    };
  }
}
