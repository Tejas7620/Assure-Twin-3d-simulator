import * as THREE from 'three';
import type { KinematicState } from '../kinematics/PumpjackKinematics.ts';
import { PumpjackKinematics } from '../kinematics/PumpjackKinematics.ts';
import { ProceduralTextures } from '../textures/ProceduralTextures.ts';
import { PumpingUnitMaterials } from './pumping-unit/PumpingUnitMaterials.ts';
import { BaseAndSamsonPost } from './pumping-unit/BaseAndSamsonPost.ts';
import { DriveAndCrankAssembly } from './pumping-unit/DriveAndCrankAssembly.ts';
import { WalkingBeamAndHorsehead } from './pumping-unit/WalkingBeamAndHorsehead.ts';
import { WellheadAssembly } from './pumping-unit/WellheadAssembly.ts';

/**
 * PumpjackModel.ts
 * Upgraded Professional Industrial Class I Beam Pumping Unit (API Spec 11E / C-320D-256-100)
 * & API Spec 6A Wellhead with Subsurface Deviated Sucker Rod Pump (API 11AX):
 * - Authentic Wide-Flange I-Beam Structural Steel Skid on Reinforced Concrete Foundation
 * - Heavy 4-Legged A-Frame Samson Post with Horizontal Girts, Diagonal K-Lacing, and Saddle Table
 * - Cast-Iron Center Saddle Bearing Pillow Block with Cap Bolts & Grease Line
 * - Double-Reduction Split-Case Gear Reducer with Cooling Ribs, Inspection Hatch, and Sight Glass
 * - 40 HP High-Slip TEFC Industrial Electric Motor with Axial Cooling Fins & Slide Tensioning Base
 * - Enclosed V-Belt Drive Guard with Wire Mesh Screen & OSHA Perimeter Sweep Safety Railings
 * - Forged Master Cranks with T-Slot Lead-Screws, Multi-Stroke Holes, and Segmented Counterweights
 * - Heavy Structural Wide-Flange Walking Beam with Stiffener Gussets and Pivot Doubler Plates
 * - Precision Curved Industrial Horsehead with Dual Wire-Rope Tracks & Swaged Bridle Cables
 * - Forged Carrier Bar with Dual-Bolt Polished Rod Clamp & Mirror-Finish Chrome Polished Rod
 * - API 6A Flanged Christmas Tree with Handwheels, Master Valves, Swab Valve, Pressure Gauge, and Stuffing Box
 * - Subsurface Deviated Wellbore Cutaway with Transparent Pump Barrel, Dynamic Standing/Traveling Valves, and Visible Crude Oil!
 */

export class PumpjackModel {
  public readonly root: THREE.Group;
  private kinematics: PumpjackKinematics;
  private mats: PumpingUnitMaterials;

  // Major Assemblies
  private _baseAndPost: BaseAndSamsonPost;
  private _driveAndCrank: DriveAndCrankAssembly;
  private _beamAndHorsehead: WalkingBeamAndHorsehead;
  private _wellhead: WellheadAssembly;

  // Subsurface Pump & Fluid Components
  private _horizontalPlunger!: THREE.Mesh;
  private _standingValveBall!: THREE.Mesh;
  private _travelingValveBall!: THREE.Mesh;
  private _pumpOilMesh!: THREE.Mesh;
  private _plungerOilMesh!: THREE.Mesh;
  private _intakeOilStream!: THREE.Points;
  private _intakeOilPositions!: Float32Array;

  // Wellbore & Geology
  private _casingMesh!: THREE.Mesh;
  private _strataMesh!: THREE.Mesh;
  private _thermalFrontMesh!: THREE.Mesh;

  constructor(kinematics: PumpjackKinematics) {
    this.kinematics = kinematics;
    this.root = new THREE.Group();
    this.root.name = 'PumpjackModel';

    // 1. Initialize PBR Materials
    this.mats = new PumpingUnitMaterials();

    // 2. Build Base Frame & Samson Post
    this._baseAndPost = new BaseAndSamsonPost(this.mats, this.kinematics.params);
    this.root.add(this._baseAndPost.group);

    // 3. Build Gearbox, Motor, Guards & Cranks
    this._driveAndCrank = new DriveAndCrankAssembly(this.mats, this.kinematics.params);
    this.root.add(this._driveAndCrank.group);

    // 4. Build Walking Beam, Horsehead, Pitmans & Polished Rod Assembly
    this._beamAndHorsehead = new WalkingBeamAndHorsehead(this.mats, this.kinematics.params);
    this.root.add(this._beamAndHorsehead.walkingBeamGroup);
    this.root.add(this._beamAndHorsehead.equalizerBar);
    this.root.add(this._beamAndHorsehead.pitmanLeft);
    this.root.add(this._beamAndHorsehead.pitmanRight);
    this.root.add(this._beamAndHorsehead.bridleLines);

    // 5. Build Authentic API 6A Wellhead / Christmas Tree
    this._wellhead = new WellheadAssembly(this.mats, this.kinematics.params);
    this.root.add(this._wellhead.group);

    // 6. Subsurface Deviated Wellbore & API 11AX Downhole Pump
    const underground = this.buildUndergroundHorizontalSystem();
    this._horizontalPlunger = underground.plunger;
    this._casingMesh = underground.casingMesh;
    this._strataMesh = underground.strataMesh;
    this._thermalFrontMesh = underground.thermalMesh;
    this.root.add(underground.group);
  }

  /**
   * DEVIATED / HORIZONTAL SUBTERRANEAN WELLBORE & DOWNHOLE PUMP
   * Preserves full underground cutaway with visible oil and valve dynamics
   */
  private buildUndergroundHorizontalSystem(): {
    group: THREE.Group;
    plunger: THREE.Mesh;
    curvedRod: THREE.Line;
    casingMesh: THREE.Mesh;
    strataMesh: THREE.Mesh;
    thermalMesh: THREE.Mesh;
  } {
    const ugGroup = new THREE.Group();
    ugGroup.name = 'UndergroundHorizontalSystem';

    const wx = this.kinematics.params.wellheadX; // 4.0m
    const kickoffDepth = -6.0;   // Curve starts at Y = -6.0m
    const horizontalDepth = -9.8; // Lateral at Y = -9.8m
    const curveRadius = 3.8;

    // A. Stratified Canyon Rock Wall Cutaway Box
    const strataWidth = 24.0;
    const strataDepth = 16.0;
    const strataThickness = 6.0;

    const strataGeo = new THREE.BoxGeometry(strataWidth, strataDepth, strataThickness);
    const strataMat = new THREE.MeshStandardMaterial({
      map: ProceduralTextures.getStratifiedRock(),
      roughness: 0.85,
      metalness: 0.15
    });
    const strataMesh = new THREE.Mesh(strataGeo, strataMat);
    strataMesh.position.set(wx + 2.5, -strataDepth * 0.5, -strataThickness * 0.5);
    strataMesh.receiveShadow = true;
    ugGroup.add(strataMesh);

    // B. Glowing Thermal Front Heat Plume
    const thermalGeo = new THREE.PlaneGeometry(14.0, 7.5);
    const thermalMesh = new THREE.Mesh(thermalGeo, this.mats.thermalGlow);
    thermalMesh.position.set(wx + 0.5, -10.0, -0.4);
    ugGroup.add(thermalMesh);

    // C. Deviated Wellbore Path Spline
    const wellboreCurvePoints = [
      new THREE.Vector3(wx, 0.0, 0.0),
      new THREE.Vector3(wx, kickoffDepth * 0.5, 0.0),
      new THREE.Vector3(wx, kickoffDepth, 0.0),
      new THREE.Vector3(wx + curveRadius * (1 - Math.cos(Math.PI * 0.25)), kickoffDepth - curveRadius * Math.sin(Math.PI * 0.25), 0.0),
      new THREE.Vector3(wx + curveRadius, horizontalDepth, 0.0),
      new THREE.Vector3(wx + curveRadius + 3.0, horizontalDepth, 0.0),
      new THREE.Vector3(wx + curveRadius + 6.0, horizontalDepth, 0.0),
      new THREE.Vector3(wx + curveRadius + 10.0, horizontalDepth, 0.0)
    ];

    const wellboreSpline = new THREE.CatmullRomCurve3(wellboreCurvePoints);

    // Outer Cutaway Casing Pipe (Transparent)
    const casingGeo = new THREE.TubeGeometry(wellboreSpline, 64, 0.32, 24, false);
    const casingMesh = new THREE.Mesh(casingGeo, this.mats.casingCutaway);
    casingMesh.name = 'HorizontalCasing';
    ugGroup.add(casingMesh);

    // Jet-Perforated Casing Section in Reservoir (X = 12.0 to 16.5m)
    const perfPoints = [
      new THREE.Vector3(12.0, horizontalDepth, 0.0),
      new THREE.Vector3(16.5, horizontalDepth, 0.0)
    ];
    const perfGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(perfPoints), 20, 0.325, 24, false);
    const perfMesh = new THREE.Mesh(perfGeo, this.mats.casingPerforations);
    perfMesh.name = 'PerforatedCasingInterval';
    ugGroup.add(perfMesh);

    // Heavy Metal Wellbore Collar at Ground Entrance
    const wellHeadCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.6, 20), this.mats.casingSteel);
    wellHeadCollar.position.set(wx, -0.3, 0.0);
    ugGroup.add(wellHeadCollar);

    // D. HIGH-FIDELITY HORIZONTAL SUBSURFACE PUMP (API Spec 11AX) SHOWING THE OIL IN THE PUMP
    const pumpGroup = new THREE.Group();
    pumpGroup.name = 'SubsurfaceHorizontalPump';
    pumpGroup.userData = { component: 'DOWNHOLE PUMP' };

    const barrelLength = 4.4;
    const barrelStartX = wx + curveRadius + 0.8; // ~8.6m
    const barrelEndX = barrelStartX + barrelLength; // ~13.0m

    // 1. Transparent Cutaway Glass Pump Barrel
    const barrelGeo = new THREE.CylinderGeometry(0.18, 0.18, barrelLength, 24, 1, true);
    barrelGeo.rotateZ(Math.PI / 2);
    const barrelMesh = new THREE.Mesh(barrelGeo, this.mats.sightGlass);
    barrelMesh.position.set(barrelStartX + barrelLength * 0.5, horizontalDepth, 0.0);
    pumpGroup.add(barrelMesh);

    // Steel Collars at each end of the barrel
    [-barrelLength * 0.5, barrelLength * 0.5].forEach(xOff => {
      const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.20, 0.16, 20), this.mats.casingSteel);
      collar.rotation.z = Math.PI / 2;
      collar.position.set(barrelStartX + barrelLength * 0.5 + xOff, horizontalDepth, 0.0);
      pumpGroup.add(collar);
    });

    // 2. Centralizer Collars with Bow-Spring Ribs
    for (let x = barrelStartX + 0.6; x <= barrelStartX + barrelLength - 0.6; x += 1.0) {
      const centralizer = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.03, 8, 20), this.mats.machinedChrome);
      centralizer.rotation.y = Math.PI / 2;
      centralizer.position.set(x, horizontalDepth, 0.0);
      pumpGroup.add(centralizer);

      for (let a = 0; a < Math.PI * 2; a += Math.PI / 2) {
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 0.03), this.mats.machinedChrome);
        blade.position.set(x, horizontalDepth + Math.cos(a) * 0.28, Math.sin(a) * 0.28);
        pumpGroup.add(blade);
      }
    }

    // 3. Suction Strainer Nipple at Pump Intake (X = 13.0 to 14.2m)
    const strainerGeo = new THREE.CylinderGeometry(0.15, 0.15, 1.2, 16);
    strainerGeo.rotateZ(Math.PI / 2);
    const strainerMesh = new THREE.Mesh(strainerGeo, this.mats.casingPerforations);
    strainerMesh.position.set(barrelEndX + 0.6, horizontalDepth, 0.0);
    pumpGroup.add(strainerMesh);

    // 4. STANDING VALVE ASSEMBLY (Intake Ball & Seat at X = 13.0)
    const svGroup = new THREE.Group();
    svGroup.position.set(barrelEndX, horizontalDepth, 0.0);

    const svSeat = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.08, 16), this.mats.brassFitting);
    svSeat.rotation.z = Math.PI / 2;
    svGroup.add(svSeat);

    const svCage = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.22, 12, 1, true), this.mats.castIron);
    svCage.rotation.z = Math.PI / 2;
    svCage.position.set(-0.11, 0, 0);
    svGroup.add(svCage);

    this._standingValveBall = new THREE.Mesh(new THREE.SphereGeometry(0.065, 16, 16), this.mats.machinedChrome);
    this._standingValveBall.position.set(-0.065, 0, 0);
    svGroup.add(this._standingValveBall);
    pumpGroup.add(svGroup);

    // 5. RECIPROCATING CHROME PLUNGER (with Wiper Grooves & Traveling Valve)
    const plungerLength = 2.0;
    const plungerGeo = new THREE.CylinderGeometry(0.14, 0.14, plungerLength, 24);
    plungerGeo.rotateZ(Math.PI / 2);
    const plunger = new THREE.Mesh(plungerGeo, this.mats.machinedChrome);
    plunger.name = 'HorizontalPumpPlunger';
    plunger.position.set(barrelStartX + barrelLength * 0.5, horizontalDepth, 0.0);

    // Wiper grooves along plunger
    for (let gx = -plungerLength * 0.4; gx <= plungerLength * 0.4; gx += 0.25) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.141, 0.008, 6, 20), this.mats.castIron);
      ring.rotation.y = Math.PI / 2;
      ring.position.set(gx, 0, 0);
      plunger.add(ring);
    }

    // Traveling Valve inside Plunger Head
    const tvSeat = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.06, 16), this.mats.brassFitting);
    tvSeat.rotation.z = Math.PI / 2;
    tvSeat.position.set(plungerLength * 0.45, 0, 0);
    plunger.add(tvSeat);

    this._travelingValveBall = new THREE.Mesh(new THREE.SphereGeometry(0.055, 16, 16), this.mats.machinedChrome);
    this._travelingValveBall.position.set(plungerLength * 0.45 - 0.055, 0, 0);
    plunger.add(this._travelingValveBall);

    // Internal Liquid Oil Column inside Plunger Bore
    this._plungerOilMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.09, plungerLength * 0.85, 16),
      this.mats.crudeOil
    );
    this._plungerOilMesh.rotation.z = Math.PI / 2;
    this._plungerOilMesh.position.set(-0.05, 0, 0);
    plunger.add(this._plungerOilMesh);

    pumpGroup.add(plunger);

    // 6. VISIBLE CRUDE OIL LIQUID COLUMN IN THE PUMP BARREL (Between Plunger & Standing Valve)
    const pumpOilGeo = new THREE.CylinderGeometry(0.155, 0.155, 1.0, 20);
    pumpOilGeo.rotateZ(Math.PI / 2);
    this._pumpOilMesh = new THREE.Mesh(pumpOilGeo, this.mats.crudeOil);
    this._pumpOilMesh.position.set(11.8, horizontalDepth, 0.0);
    pumpGroup.add(this._pumpOilMesh);

    // 7. INFLUX OIL DROPLETS STREAMING FROM PERFORATIONS INTO PUMP INTAKE
    const streamCount = 80;
    this._intakeOilPositions = new Float32Array(streamCount * 3);
    for (let i = 0; i < streamCount; i++) {
      this._intakeOilPositions[i * 3] = 13.0 + Math.random() * 3.0; // Perforation zone
      this._intakeOilPositions[i * 3 + 1] = horizontalDepth + (Math.random() - 0.5) * 0.4;
      this._intakeOilPositions[i * 3 + 2] = (Math.random() - 0.5) * 0.4;
    }
    const streamGeo = new THREE.BufferGeometry();
    streamGeo.setAttribute('position', new THREE.BufferAttribute(this._intakeOilPositions, 3));
    const streamMat = new THREE.PointsMaterial({
      color: 0xd97706,
      size: 0.12,
      transparent: true,
      opacity: 0.85
    });
    this._intakeOilStream = new THREE.Points(streamGeo, streamMat);
    pumpGroup.add(this._intakeOilStream);

    ugGroup.add(pumpGroup);

    // E. Continuous Curved Sucker Rod String with Polyurethane Centralizer Sleeves
    const rodPoints = wellboreSpline.getPoints(80).slice(0, 55);
    const rodGeo = new THREE.BufferGeometry().setFromPoints(rodPoints);
    const curvedRod = new THREE.Line(rodGeo, new THREE.LineBasicMaterial({ color: 0xe2e8f0, linewidth: 3 }));
    curvedRod.userData = { component: 'ROD' };
    ugGroup.add(curvedRod);

    // Rod guide sleeves along curve
    [8, 16, 24, 32, 40, 48].forEach(idx => {
      const pt = rodPoints[idx];
      if (pt) {
        const guide = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.22, 12), this.mats.valveHandwheel);
        guide.position.copy(pt);
        ugGroup.add(guide);
      }
    });

    return {
      group: ugGroup,
      plunger,
      curvedRod,
      casingMesh,
      strataMesh,
      thermalMesh
    };
  }

  /**
   * Synchronize the complete 3D mechanical hierarchy to the exact kinematic solution & SHOW OIL IN PUMP
   */
  public update(state: KinematicState): void {
    const { crankCenterX, crankCenterY, wellheadX, frontBeamLength } = this.kinematics.params;

    // 1. Crank Rotation (Continuous 360 degree rotation)
    this._driveAndCrank.crankShaftGroup.rotation.z = state.crankAngle;

    const pinRadius = this.kinematics.crankRadius;
    const pinLeft = this._driveAndCrank.leftCrank.getObjectByName('CrankPin');
    const pinRight = this._driveAndCrank.rightCrank.getObjectByName('CrankPin');
    const bearingLeft = this._driveAndCrank.leftCrank.getObjectByName('WristPinBearing');
    const bearingRight = this._driveAndCrank.rightCrank.getObjectByName('WristPinBearing');

    if (pinLeft) pinLeft.position.x = pinRadius;
    if (pinRight) pinRight.position.x = pinRadius;
    if (bearingLeft) bearingLeft.position.x = pinRadius;
    if (bearingRight) bearingRight.position.x = pinRadius;

    // 2. Walking Beam Tilt Angle
    this._beamAndHorsehead.walkingBeamGroup.rotation.z = state.beamAngle;

    // 3. Equalizer Bar Position
    this._beamAndHorsehead.equalizerBar.position.set(state.equalizerPos.x, state.equalizerPos.y, 0);

    // 4. Pitman Arms (Connecting Crank Pins to Equalizer Ends)
    const eqLeft = new THREE.Vector3(state.equalizerPos.x, state.equalizerPos.y, -0.85);
    const eqRight = new THREE.Vector3(state.equalizerPos.x, state.equalizerPos.y, 0.85);

    const pinPosLeft = new THREE.Vector3(
      crankCenterX + pinRadius * Math.cos(state.crankAngle),
      crankCenterY + pinRadius * Math.sin(state.crankAngle),
      -0.85
    );
    const pinPosRight = new THREE.Vector3(
      crankCenterX + pinRadius * Math.cos(state.crankAngle),
      crankCenterY + pinRadius * Math.sin(state.crankAngle),
      0.85
    );

    this._beamAndHorsehead.pitmanLeft.position.copy(pinPosLeft);
    const diffLeft = new THREE.Vector3().subVectors(eqLeft, pinPosLeft);
    this._beamAndHorsehead.pitmanLeft.rotation.z = Math.atan2(diffLeft.y, diffLeft.x);
    this._beamAndHorsehead.pitmanLeft.scale.x = diffLeft.length() / this.kinematics.params.pitmanLength;

    this._beamAndHorsehead.pitmanRight.position.copy(pinPosRight);
    const diffRight = new THREE.Vector3().subVectors(eqRight, pinPosRight);
    this._beamAndHorsehead.pitmanRight.rotation.z = Math.atan2(diffRight.y, diffRight.x);
    this._beamAndHorsehead.pitmanRight.scale.x = diffRight.length() / this.kinematics.params.pitmanLength;

    // 5. Polished Rod & Carrier Bar Vertical Translation
    const currentCarrierY = 3.6 + state.rodDisplacement;
    this._beamAndHorsehead.carrierBar.position.y = currentCarrierY;
    this._beamAndHorsehead.polishedRod.position.y = currentCarrierY - 2.1;
    if (this._beamAndHorsehead.polishedRodOilFilm) {
      this._beamAndHorsehead.polishedRodOilFilm.position.y = currentCarrierY - 3.0;
    }

    // 6. Bridle Wire Cables (Tangency from horsehead arc to carrier bar)
    const arcTangentY = this.kinematics.params.samsonPostHeight + frontBeamLength * Math.sin(state.beamAngle);
    const posAttr = this._beamAndHorsehead.bridleLines.geometry.attributes.position as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;

    arr[0] = wellheadX; arr[1] = Math.max(currentCarrierY + 0.05, arcTangentY); arr[2] = -0.20;
    arr[3] = wellheadX; arr[4] = currentCarrierY; arr[5] = -0.20;
    arr[6] = wellheadX; arr[7] = Math.max(currentCarrierY + 0.05, arcTangentY); arr[8] = 0.20;
    arr[9] = wellheadX; arr[10] = currentCarrierY; arr[11] = 0.20;
    posAttr.needsUpdate = true;

    // 7. Wellhead Sight Glass Oil Surging Pulse (Synchronized with upstroke rod velocity)
    const upstrokeSurge = Math.max(0.2, (state.rodVelocity || 0) * 2.0);
    this._wellhead.sightGlassOil.scale.set(1.0, 0.8 + upstrokeSurge * 0.4, 1.0);

    // 8. Horizontal Downhole Pump Reciprocation & Valve Kinematics
    const basePlungerX = 10.7;
    const plungerX = basePlungerX + (state.rodDisplacement - state.strokeLength * 0.5);
    this._horizontalPlunger.position.x = plungerX;

    // A. Dynamic Standing Valve (Intake at X = 13.0m)
    // On UPSTROKE: Suction pulls Standing Valve Ball off seat allowing formation crude in
    // On DOWNSTROKE: Pressure slams Standing Valve Ball tight against seat
    if (state.strokePhase === 'UPSTROKE') {
      this._standingValveBall.position.x = -0.13; // Lifted off seat into cage
      this._intakeOilStream.visible = true;

      // Animate oil droplets streaming into intake
      const pos = this._intakeOilPositions;
      for (let i = 0; i < pos.length / 3; i++) {
        pos[i * 3] -= 0.04;
        if (pos[i * 3] < 12.8) {
          pos[i * 3] = 14.5 + Math.random() * 1.5;
        }
      }
      (this._intakeOilStream.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    } else {
      this._standingValveBall.position.x = -0.065; // Firmly seated
      this._intakeOilStream.visible = false;
    }

    // B. Dynamic Traveling Valve (on Plunger)
    // On DOWNSTROKE: Plunger pushes into fluid, ball lifts inside cage to pass oil into plunger
    // On UPSTROKE: Ball is seated tight against seat, lifting trapped column upward
    const plungerLength = 2.0;
    if (state.strokePhase === 'DOWNSTROKE') {
      this._travelingValveBall.position.x = plungerLength * 0.45 - 0.12; // Lifted
    } else {
      this._travelingValveBall.position.x = plungerLength * 0.45 - 0.055; // Seated
    }

    // C. Dynamic Crude Oil Liquid Column inside Pump Barrel
    const plungerHeadX = plungerX + plungerLength * 0.5;
    const standingValveX = 12.95;
    const fluidGap = Math.max(0.1, standingValveX - plungerHeadX);
    const fluidCenterX = plungerHeadX + fluidGap * 0.5;

    this._pumpOilMesh.position.x = fluidCenterX;
    this._pumpOilMesh.scale.set(Math.max(0.1, fluidGap), 1.0, 1.0);
  }

  /**
   * Set Cutaway Display Mode
   */
  public setCutawayMode(mode: 'realistic' | 'cutaway' | 'thermal'): void {
    const strataMat = this._strataMesh.material as THREE.MeshStandardMaterial;
    if (mode === 'thermal') {
      strataMat.transparent = true;
      strataMat.opacity = 0.35;
      this._thermalFrontMesh.visible = true;
    } else if (mode === 'cutaway') {
      strataMat.transparent = true;
      strataMat.opacity = 0.75;
      this._thermalFrontMesh.visible = true;
    } else {
      strataMat.transparent = false;
      strataMat.opacity = 1.0;
      this._thermalFrontMesh.visible = true;
    }
  }

  /**
   * Exploded Well View: Separates casing and pump horizontally in Z
   */
  public setExploded(exploded: boolean): void {
    if (this._casingMesh) {
      this._casingMesh.position.z = exploded ? 1.6 : 0.0;
    }
    if (this._horizontalPlunger) {
      this._horizontalPlunger.position.z = exploded ? -1.6 : 0.0;
    }
  }
}
