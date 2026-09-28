import * as THREE from 'three';
import type { KinematicState } from '../kinematics/PumpjackKinematics.ts';
import { PumpjackKinematics } from '../kinematics/PumpjackKinematics.ts';
import { ProceduralTextures } from '../textures/ProceduralTextures.ts';

/**
 * PumpjackModel.ts
 * Ultra-realistic industrial Class I SRP Beam Pumping Unit (API Spec 11E)
 * & API Spec 11AX Subsurface Horizontal Deviated Sucker Rod Pump:
 * - Industrial Black & Flame Red/Orange Structural Steel
 * - Full Safety Guarding: V-Belt Guard Enclosure & OSHA Counterweight Railings
 * - Samson Post Climbing Ladder with Safety Cage & Crow's Nest Work Platform
 * - API 6A Flanged Wellhead with Pressure Gauge, Master Valves & Oil Catch Drip Pan
 * - Glistening Wet Polished Rod with Dual-Bolt Rod Clamp
 * - Transparent Cutaway Subsurface Pump Barrel SHOWING THE OIL IN THE PUMP
 * - Animated Dynamic Standing Valve (Intake) & Traveling Valve (Plunger)
 * - Dynamic Reciprocating Crude Oil Liquid Columns in Barrel & Plunger
 * - Jet-Perforated Wellbore Casing with Reservoir Crude Oil Influx Streams
 * - Stratified Rock Cutaway Canyon & Thermal Sweep Plume
 */

export class PumpjackModel {
  public readonly root: THREE.Group;
  private kinematics: PumpjackKinematics;

  // Mechanical Assemblies
  private _crankShaftGroup: THREE.Group;
  private _crankArmLeft: THREE.Group;
  private _crankArmRight: THREE.Group;
  private _pitmanLeft: THREE.Group;
  private _pitmanRight: THREE.Group;
  private _equalizerBar: THREE.Group;
  private _walkingBeamGroup: THREE.Group;
  private _bridleLines: THREE.LineSegments;
  private _carrierBar: THREE.Mesh;
  private _polishedRod: THREE.Mesh;
  private _polishedRodOilFilm!: THREE.Mesh;

  // Wellhead & Surface Fluid Indicators
  private _wellheadSightGlassOil!: THREE.Mesh;
  private _dripPanOil!: THREE.Mesh;

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

  // Materials
  private _blackSteelMat: THREE.MeshStandardMaterial;
  private _redAccentMat: THREE.MeshStandardMaterial;
  private _darkCastIronMat: THREE.MeshStandardMaterial;
  private _chromeMat: THREE.MeshStandardMaterial;
  private _concreteMat: THREE.MeshStandardMaterial;
  private _gravelMat: THREE.MeshStandardMaterial;
  private _casingCutawayMat: THREE.MeshPhysicalMaterial;
  private _casingSteelMat: THREE.MeshStandardMaterial;
  private _perforationMat: THREE.MeshStandardMaterial;
  private _thermalGlowMat: THREE.MeshBasicMaterial;
  private _oilMat: THREE.MeshPhysicalMaterial;
  private _yellowSafetyMat: THREE.MeshStandardMaterial;
  private _safetyMeshMat: THREE.MeshStandardMaterial;
  private _gaugeDialMat: THREE.MeshStandardMaterial;
  private _glassMat: THREE.MeshPhysicalMaterial;
  private _goldBrassMat: THREE.MeshStandardMaterial;

  constructor(kinematics: PumpjackKinematics) {
    this.kinematics = kinematics;
    this.root = new THREE.Group();
    this.root.name = 'PumpjackModel';

    // 1. High-Fidelity PBR Materials
    this._blackSteelMat = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      roughness: 0.35,
      metalness: 0.85,
      map: ProceduralTextures.getDarkIndustrialSteel()
    });

    this._redAccentMat = new THREE.MeshStandardMaterial({
      color: 0xe11d48, // Vibrant Flame Red-Orange accent
      roughness: 0.3,
      metalness: 0.6
    });

    this._darkCastIronMat = new THREE.MeshStandardMaterial({
      color: 0x27272a,
      roughness: 0.5,
      metalness: 0.75
    });

    this._chromeMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.05,
      metalness: 0.98
    });

    this._concreteMat = new THREE.MeshStandardMaterial({
      map: ProceduralTextures.getConcrete(),
      roughness: 0.9,
      metalness: 0.1
    });

    this._gravelMat = new THREE.MeshStandardMaterial({
      map: ProceduralTextures.getGravelTexture(),
      roughness: 0.95,
      metalness: 0.05
    });

    this._casingCutawayMat = new THREE.MeshPhysicalMaterial({
      color: 0x94a3b8,
      roughness: 0.2,
      metalness: 0.4,
      transmission: 0.7,
      transparent: true,
      opacity: 0.45,
      depthWrite: false
    });

    this._glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xf1f5f9,
      roughness: 0.05,
      transmission: 0.92,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    this._casingSteelMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.4,
      metalness: 0.85
    });

    this._perforationMat = new THREE.MeshStandardMaterial({
      map: ProceduralTextures.getCasingPerforations(),
      roughness: 0.4,
      metalness: 0.85
    });

    this._thermalGlowMat = new THREE.MeshBasicMaterial({
      map: ProceduralTextures.getThermalFrontTexture(),
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide
    });

    // Viscous Crude Oil Material with dark amber reflections & wet sheen
    this._oilMat = new THREE.MeshPhysicalMaterial({
      color: 0x120d08,
      map: ProceduralTextures.getCrudeOilTexture(),
      roughness: 0.15,
      metalness: 0.1,
      clearcoat: 1.0,
      clearcoatRoughness: 0.08,
      transparent: false,
      opacity: 1.0
    });

    this._yellowSafetyMat = new THREE.MeshStandardMaterial({
      color: 0xeab308,
      roughness: 0.4,
      metalness: 0.3
    });

    this._safetyMeshMat = new THREE.MeshStandardMaterial({
      map: ProceduralTextures.getSafetyCageTexture(),
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide
    });

    this._gaugeDialMat = new THREE.MeshStandardMaterial({
      map: ProceduralTextures.getPressureGaugeDial(),
      roughness: 0.2
    });

    this._goldBrassMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      roughness: 0.3,
      metalness: 0.85
    });

    // 2. Build Assemblies
    this.buildFoundation();
    this.buildSamsonPost();
    this.buildGearboxAndMotor();

    // Cranks
    this._crankShaftGroup = new THREE.Group();
    this._crankShaftGroup.position.set(
      this.kinematics.params.crankCenterX,
      this.kinematics.params.crankCenterY,
      0
    );
    this.root.add(this._crankShaftGroup);

    const { leftCrank, rightCrank } = this.buildCrankArms();
    this._crankArmLeft = leftCrank;
    this._crankArmRight = rightCrank;
    this._crankShaftGroup.add(leftCrank);
    this._crankShaftGroup.add(rightCrank);

    // Walking Beam & Red-Accented Horsehead
    const { walkingBeam } = this.buildWalkingBeam();
    this._walkingBeamGroup = walkingBeam;
    this.root.add(walkingBeam);

    // Equalizer & Pitman Arms
    this._equalizerBar = this.buildEqualizerBar();
    this.root.add(this._equalizerBar);

    const { pitmanLeft, pitmanRight } = this.buildPitmanArms();
    this._pitmanLeft = pitmanLeft;
    this._pitmanRight = pitmanRight;
    this.root.add(pitmanLeft);
    this.root.add(pitmanRight);

    // Wellhead with Master Valves, Pressure Gauge & Pooled Drip Pan
    this.buildWellhead();

    // Bridle, Carrier Bar, Polished Rod & Wet Oil Sheen Sleeve
    const { bridle, carrierBar, polishedRod, oilFilm } = this.buildPolishedRodAssembly();
    this._bridleLines = bridle;
    this._carrierBar = carrierBar;
    this._polishedRod = polishedRod;
    this._polishedRodOilFilm = oilFilm;
    this.root.add(bridle);

    polishedRod.userData = { component: 'ROD' };
    carrierBar.userData = { component: 'ROD' };
    this._walkingBeamGroup.userData = { component: 'PUMPJACK' };

    // Subsurface Deviated Wellbore & Downhole Pump SHOWING OIL IN PUMP
    const underground = this.buildUndergroundHorizontalSystem();
    this._horizontalPlunger = underground.plunger;
    this._casingMesh = underground.casingMesh;
    this._strataMesh = underground.strataMesh;
    this._thermalFrontMesh = underground.thermalMesh;
    this.root.add(underground.group);
  }

  /**
   * 1. Reinforced Concrete Pad, Steel Skid & Crushed Gravel Work Area
   */
  private buildFoundation(): void {
    const baseGroup = new THREE.Group();
    baseGroup.name = 'BaseFoundation';

    // Crushed Gravel Work Pad under & around equipment
    const gravelGeo = new THREE.BoxGeometry(13.5, 0.12, 6.8);
    const gravelMesh = new THREE.Mesh(gravelGeo, this._gravelMat);
    gravelMesh.position.set(0.2, -0.32, 0);
    gravelMesh.receiveShadow = true;
    baseGroup.add(gravelMesh);

    // Reinforced Concrete Pad
    const padGeo = new THREE.BoxGeometry(10.5, 0.45, 4.2);
    const padMesh = new THREE.Mesh(padGeo, this._concreteMat);
    padMesh.position.set(0.2, -0.1, 0);
    padMesh.receiveShadow = true;
    baseGroup.add(padMesh);

    // Dark Structural Steel Skid Rails (Wide-flange H-beams)
    const skidLength = 9.8;
    const skidGeo = new THREE.BoxGeometry(skidLength, 0.28, 0.2);
    [-1.2, 1.2].forEach(z => {
      const rail = new THREE.Mesh(skidGeo, this._blackSteelMat);
      rail.position.set(0.1, 0.26, z);
      rail.castShadow = true;
      baseGroup.add(rail);

      // Heavy anchor tie-down bolts holding skid to concrete pad
      [-4.0, -1.8, 0.8, 3.2, 4.4].forEach(x => {
        const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.36, 8), this._chromeMat);
        bolt.position.set(x, 0.32, z);
        baseGroup.add(bolt);

        const nut = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.05, 6), this._darkCastIronMat);
        nut.position.set(x, 0.42, z);
        baseGroup.add(nut);
      });
    });

    // Transverse Skid Cross-Beams
    [-4.0, -1.8, 0.5, 2.8, 4.6].forEach(x => {
      const crossBeam = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.24, 2.2), this._blackSteelMat);
      crossBeam.position.set(x, 0.24, 0);
      crossBeam.castShadow = true;
      baseGroup.add(crossBeam);
    });

    this.root.add(baseGroup);
  }

  /**
   * 2. Sleek Industrial Black A-Frame Samson Post with Service Ladder & Platform
   */
  private buildSamsonPost(): void {
    const postGroup = new THREE.Group();
    postGroup.name = 'SamsonPost';

    const hPost = this.kinematics.params.samsonPostHeight;
    const baseSpreadX = 1.3;
    const baseSpreadZ = 1.1;
    const topSpreadX = 0.22;
    const topSpreadZ = 0.22;

    const corners = [
      { bx: -baseSpreadX, bz: -baseSpreadZ, tx: -topSpreadX, tz: -topSpreadZ },
      { bx: baseSpreadX, bz: -baseSpreadZ, tx: topSpreadX, tz: -topSpreadZ },
      { bx: -baseSpreadX, bz: baseSpreadZ, tx: -topSpreadX, tz: topSpreadZ },
      { bx: baseSpreadX, bz: baseSpreadZ, tx: topSpreadX, tz: topSpreadZ }
    ];

    corners.forEach(c => {
      const start = new THREE.Vector3(c.bx, 0.4, c.bz);
      const end = new THREE.Vector3(c.tx, hPost - 0.2, c.tz);
      const legMesh = this.createPillarBetween(start, end, 0.09, this._blackSteelMat);
      postGroup.add(legMesh);
    });

    // Horizontal & Diagonal Bracing Trusses
    [1.5, 2.9, 4.2].forEach(y => {
      const progress = (y - 0.4) / (hPost - 0.4);
      const curX = THREE.MathUtils.lerp(baseSpreadX, topSpreadX, progress);
      const curZ = THREE.MathUtils.lerp(baseSpreadZ, topSpreadZ, progress);

      [-curZ, curZ].forEach(z => {
        const brace = new THREE.Mesh(new THREE.BoxGeometry(curX * 2, 0.1, 0.08), this._blackSteelMat);
        brace.position.set(0, y, z);
        brace.castShadow = true;
        postGroup.add(brace);
      });

      [-curX, curX].forEach(x => {
        const brace = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, curZ * 2), this._blackSteelMat);
        brace.position.set(x, y, 0);
        brace.castShadow = true;
        postGroup.add(brace);
      });
    });

    // Samson Post Climbing Ladder with Safety Cage on Rear Leg
    const ladderGroup = new THREE.Group();
    ladderGroup.name = 'AccessLadder';
    const rungs = 16;
    for (let i = 0; i < rungs; i++) {
      const ly = 0.6 + i * 0.28;
      const progress = (ly - 0.4) / (hPost - 0.4);
      const lx = THREE.MathUtils.lerp(-baseSpreadX, -topSpreadX, progress) - 0.12;
      const rung = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.38, 8), this._blackSteelMat);
      rung.rotation.x = Math.PI / 2;
      rung.position.set(lx, ly, 0);
      ladderGroup.add(rung);

      // Safety Hoops every 3 rungs above 2m
      if (i >= 5 && i % 3 === 0) {
        const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.015, 8, 16, Math.PI * 1.2), this._yellowSafetyMat);
        hoop.rotation.y = Math.PI / 2;
        hoop.position.set(lx - 0.28, ly, 0);
        ladderGroup.add(hoop);
      }
    }
    postGroup.add(ladderGroup);

    // Center Bearing Maintenance Platform with Handrails (Crow's Nest)
    const platGroup = new THREE.Group();
    const platFloor = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.04, 1.4), this._blackSteelMat);
    platFloor.position.set(0, hPost - 0.25, 0);
    platGroup.add(platFloor);

    // Platform Safety Handrails
    [-0.65, 0.65].forEach(z => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.03, 0.03), this._yellowSafetyMat);
      rail.position.set(0, hPost + 0.55, z);
      platGroup.add(rail);

      const midRail = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.02, 0.02), this._yellowSafetyMat);
      midRail.position.set(0, hPost + 0.15, z);
      platGroup.add(midRail);

      [-0.5, 0.5].forEach(x => {
        const stanchion = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.8, 8), this._yellowSafetyMat);
        stanchion.position.set(x, hPost + 0.15, z);
        platGroup.add(stanchion);
      });
    });
    postGroup.add(platGroup);

    // Saddle Bearing Housing with Grease Fittings
    const bearingHousing = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 1.0, 16), this._darkCastIronMat);
    bearingHousing.rotation.x = Math.PI / 2;
    bearingHousing.position.set(0, hPost, 0);
    bearingHousing.castShadow = true;
    postGroup.add(bearingHousing);

    // Grease Line Pipe running down to ground level
    const greaseLine = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, hPost - 0.8, 8), this._chromeMat);
    greaseLine.position.set(0.18, hPost * 0.5, 0.45);
    postGroup.add(greaseLine);

    this.root.add(postGroup);
  }

  /**
   * 3. Gear Reducer, Electric Motor, V-Belt Safety Guard & OSHA Counterweight Railings
   */
  private buildGearboxAndMotor(): void {
    const driveGroup = new THREE.Group();
    const cx = this.kinematics.params.crankCenterX;
    const cy = this.kinematics.params.crankCenterY;

    // Heavy Black Gearbox
    const gearBox = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.4, 1.1), this._blackSteelMat);
    gearBox.position.set(cx, cy - 0.4, 0);
    gearBox.castShadow = true;
    driveGroup.add(gearBox);

    // Gearbox Inspection Cover & Oil Level Sight Glass
    const sightGlass = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.12, 12), this._glassMat);
    sightGlass.rotation.z = Math.PI / 2;
    sightGlass.position.set(cx + 0.81, cy - 0.5, 0.35);
    driveGroup.add(sightGlass);

    // Slow-speed Crankshaft
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 2.0, 24), this._chromeMat);
    shaft.rotation.x = Math.PI / 2;
    shaft.position.set(cx, cy, 0);
    driveGroup.add(shaft);

    // High-Efficiency Electric Motor with Cooling Fins
    const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.95, 20), this._darkCastIronMat);
    motor.rotation.z = Math.PI / 2;
    motor.position.set(cx + 1.85, 0.58, 0);
    driveGroup.add(motor);

    // Motor Terminal Conduit Box
    const termBox = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.22, 0.18), this._darkCastIronMat);
    termBox.position.set(cx + 1.85, 0.98, 0.28);
    driveGroup.add(termBox);

    // Flexible electrical conduit pipe to ground
    const conduit = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.6, 8), this._casingSteelMat);
    conduit.position.set(cx + 1.85, 0.3, 0.35);
    driveGroup.add(conduit);

    // Industrial V-Belt & Pulley Safety Guard Enclosure (between motor and gearbox)
    const guardGroup = new THREE.Group();
    guardGroup.name = 'VBeltSafetyGuard';
    const guardBody = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.75, 0.28), this._yellowSafetyMat);
    guardBody.position.set(cx + 1.0, 0.58, -0.65);
    guardGroup.add(guardBody);

    // Mesh safety screen on guard face
    const meshFace = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.65), this._safetyMeshMat);
    meshFace.position.set(cx + 1.0, 0.58, -0.80);
    guardGroup.add(meshFace);
    driveGroup.add(guardGroup);

    // OSHA Yellow Safety Perimeter Guard Railing around Rotating Cranks (Left & Right)
    [-1.55, 1.55].forEach(z => {
      const fence = new THREE.Group();
      fence.name = 'CounterweightSafetyFence';

      // Horizontal rails
      const topRail = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.04, 0.04), this._yellowSafetyMat);
      topRail.position.set(cx, 1.25, z);
      fence.add(topRail);

      const midRail = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.03, 0.03), this._yellowSafetyMat);
      midRail.position.set(cx, 0.65, z);
      fence.add(midRail);

      const toeBoard = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.12, 0.02), this._yellowSafetyMat);
      toeBoard.position.set(cx, 0.32, z);
      fence.add(toeBoard);

      // Vertical Stanchions
      [-1.7, -0.85, 0.0, 0.85, 1.7].forEach(xOff => {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.0, 8), this._yellowSafetyMat);
        post.position.set(cx + xOff, 0.75, z);
        fence.add(post);
      });

      driveGroup.add(fence);
    });

    this.root.add(driveGroup);
  }

  /**
   * 4. Cranks & Dual Counterweights with Red/Orange Accent Sectors
   */
  private buildCrankArms(): { leftCrank: THREE.Group; rightCrank: THREE.Group } {
    const crankZOffset = 0.85;

    const createCrank = (isRight: boolean) => {
      const crank = new THREE.Group();
      crank.position.set(0, 0, isRight ? crankZOffset : -crankZOffset);

      // Crank Arm Body (Black)
      const armLength = 1.35;
      const armMesh = new THREE.Mesh(new THREE.BoxGeometry(armLength, 0.26, 0.12), this._blackSteelMat);
      armMesh.position.set(armLength * 0.5 - 0.2, 0, 0);
      armMesh.castShadow = true;
      crank.add(armMesh);

      // Center Hub with Red Ring
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.16, 24), this._blackSteelMat);
      hub.rotation.x = Math.PI / 2;
      crank.add(hub);

      const hubRing = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.02, 8, 24), this._redAccentMat);
      hubRing.position.set(0, 0, isRight ? 0.09 : -0.09);
      crank.add(hubRing);

      // Counterweight: Black Master Weight with Flame Red Segment
      const cwShape = new THREE.Shape();
      cwShape.absarc(0, 0, 0.75, Math.PI * 0.75, Math.PI * 1.85, false);
      cwShape.lineTo(0, 0);
      const cwGeo = new THREE.ExtrudeGeometry(cwShape, { depth: 0.26, bevelEnabled: true, bevelSegments: 2, bevelSize: 0.02, bevelThickness: 0.02 });
      const counterweight = new THREE.Mesh(cwGeo, this._blackSteelMat);
      counterweight.position.set(-0.25, -0.1, isRight ? 0.05 : -0.31);
      counterweight.castShadow = true;
      crank.add(counterweight);

      // Red Accent Sector on Counterweight face
      const accentShape = new THREE.Shape();
      accentShape.absarc(0, 0, 0.65, Math.PI * 0.95, Math.PI * 1.65, false);
      accentShape.lineTo(0, 0);
      const accentGeo = new THREE.ExtrudeGeometry(accentShape, { depth: 0.04, bevelEnabled: false });
      const accentMesh = new THREE.Mesh(accentGeo, this._redAccentMat);
      accentMesh.position.set(-0.25, -0.1, isRight ? 0.32 : -0.35);
      crank.add(accentMesh);

      // Heavy counterweight clamp bolts
      [-0.45, -0.2].forEach(bx => {
        const cBolt = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.32, 8), this._chromeMat);
        cBolt.rotation.x = Math.PI / 2;
        cBolt.position.set(bx, -0.4, isRight ? 0.18 : -0.18);
        crank.add(cBolt);
      });

      // Wrist Pin
      const pinMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.26, 16), this._chromeMat);
      pinMesh.name = 'CrankPin';
      pinMesh.rotation.x = Math.PI / 2;
      pinMesh.position.set(this.kinematics.crankRadius, 0, isRight ? 0.12 : -0.12);
      crank.add(pinMesh);

      return crank;
    };

    return {
      leftCrank: createCrank(false),
      rightCrank: createCrank(true)
    };
  }

  /**
   * 5. Walking Beam with Red-Accented Horsehead & Stiffener Gussets
   */
  private buildWalkingBeam(): { walkingBeam: THREE.Group } {
    const beamPivot = new THREE.Group();
    beamPivot.position.set(0, this.kinematics.params.samsonPostHeight, 0);

    const { rearBeamLength, frontBeamLength } = this.kinematics.params;
    const totalLength = rearBeamLength + frontBeamLength;

    const beamGroup = new THREE.Group();

    // Black Wide-Flange I-Beam
    const beamHeight = 0.55;
    const flangeWidth = 0.42;

    [-beamHeight * 0.5, beamHeight * 0.5].forEach(y => {
      const flange = new THREE.Mesh(new THREE.BoxGeometry(totalLength, 0.05, flangeWidth), this._blackSteelMat);
      flange.position.set((frontBeamLength - rearBeamLength) * 0.5, y, 0);
      flange.castShadow = true;
      beamGroup.add(flange);
    });

    const web = new THREE.Mesh(new THREE.BoxGeometry(totalLength, beamHeight - 0.1, 0.05), this._blackSteelMat);
    web.position.set((frontBeamLength - rearBeamLength) * 0.5, 0, 0);
    beamGroup.add(web);

    // Stiffener gusset plates along web
    [-2.0, -1.0, 1.0, 2.0, 3.0].forEach(gx => {
      const gusset = new THREE.Mesh(new THREE.BoxGeometry(0.02, beamHeight - 0.1, flangeWidth * 0.8), this._blackSteelMat);
      gusset.position.set(gx, 0, 0);
      beamGroup.add(gusset);
    });

    // Horsehead with Red Curved Arc Face & Flank Trims
    const arcRadius = frontBeamLength;
    const arcAngleSpread = 0.55;
    const arcSegments = 32;

    const arcShape = new THREE.Shape();
    arcShape.moveTo(arcRadius * Math.cos(-arcAngleSpread * 0.5), arcRadius * Math.sin(-arcAngleSpread * 0.5));
    for (let i = 1; i <= arcSegments; i++) {
      const a = -arcAngleSpread * 0.5 + (i / arcSegments) * arcAngleSpread;
      arcShape.lineTo(arcRadius * Math.cos(a), arcRadius * Math.sin(a));
    }
    arcShape.lineTo(frontBeamLength - 1.1, 0.1);
    arcShape.lineTo(frontBeamLength - 1.1, -0.1);
    arcShape.closePath();

    const hhGeo = new THREE.ExtrudeGeometry(arcShape, { depth: 0.36, bevelEnabled: true, bevelSegments: 2, bevelSize: 0.015, bevelThickness: 0.015 });
    const horseheadMesh = new THREE.Mesh(hhGeo, this._blackSteelMat);
    horseheadMesh.position.set(0, 0, -0.18);
    horseheadMesh.castShadow = true;
    beamGroup.add(horseheadMesh);

    // Top Cable Guide Track on Horsehead
    const trackGeo = new THREE.BoxGeometry(0.15, 0.06, 0.44);
    const track = new THREE.Mesh(trackGeo, this._blackSteelMat);
    track.position.set(frontBeamLength - 0.05, 0.25, 0);
    beamGroup.add(track);

    // Red Accent Plates on horsehead flanks
    [-0.19, 0.19].forEach(z => {
      const redTrim = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.1, 0.02), this._redAccentMat);
      redTrim.position.set(frontBeamLength - 0.5, 0, z);
      beamGroup.add(redTrim);
    });

    beamPivot.add(beamGroup);
    return { walkingBeam: beamPivot };
  }

  /**
   * 6. Equalizer Bar & Pitman Arms
   */
  private buildEqualizerBar(): THREE.Group {
    const eqGroup = new THREE.Group();
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.22, 1.7), this._blackSteelMat);
    bar.castShadow = true;
    eqGroup.add(bar);

    // Bearing clevis pins with hex caps
    [-0.85, 0.85].forEach(z => {
      const pinCap = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.06, 12), this._chromeMat);
      pinCap.rotation.x = Math.PI / 2;
      pinCap.position.set(0, 0, z > 0 ? z + 0.04 : z - 0.04);
      eqGroup.add(pinCap);
    });

    return eqGroup;
  }

  private buildPitmanArms(): { pitmanLeft: THREE.Group; pitmanRight: THREE.Group } {
    const createPitman = () => {
      const pGroup = new THREE.Group();
      const pLen = this.kinematics.params.pitmanLength;
      const arm = new THREE.Mesh(new THREE.BoxGeometry(pLen, 0.18, 0.1), this._blackSteelMat);
      arm.position.set(pLen * 0.5, 0, 0);
      arm.castShadow = true;
      pGroup.add(arm);

      // Red Accent band on pitman center
      const band = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.19, 0.11), this._redAccentMat);
      band.position.set(pLen * 0.5, 0, 0);
      pGroup.add(band);

      return pGroup;
    };

    return { pitmanLeft: createPitman(), pitmanRight: createPitman() };
  }

  /**
   * 7. API 6A Flanged Wellhead (Christmas Tree) with Pressure Gauge, Master Valves & Oil Drip Pan
   */
  private buildWellhead(): void {
    const wellheadGroup = new THREE.Group();
    wellheadGroup.position.set(this.kinematics.params.wellheadX, 0, 0);

    // Ground Casing Head Flange (with 12 stud bolts)
    const baseFlange = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.46, 0.3, 20), this._darkCastIronMat);
    baseFlange.position.set(0, 0.15, 0);
    wellheadGroup.add(baseFlange);

    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.06, 6), this._chromeMat);
      bolt.position.set(Math.cos(a) * 0.38, 0.31, Math.sin(a) * 0.38);
      wellheadGroup.add(bolt);
    }

    // Lower Master Gate Valve
    const lowerValve = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.32, 0.34), this._blackSteelMat);
    lowerValve.position.set(0, 0.5, 0);
    wellheadGroup.add(lowerValve);

    // Valve Handwheel (Bright Safety Red)
    const wheelGeo = new THREE.TorusGeometry(0.18, 0.025, 8, 20);
    const handwheel1 = new THREE.Mesh(wheelGeo, this._redAccentMat);
    handwheel1.position.set(0, 0.5, 0.32);
    wellheadGroup.add(handwheel1);

    const stem1 = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.16, 8), this._chromeMat);
    stem1.rotation.x = Math.PI / 2;
    stem1.position.set(0, 0.5, 0.24);
    wellheadGroup.add(stem1);

    // Production Tee Assembly
    const teeMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.45, 16), this._darkCastIronMat);
    teeMesh.position.set(0, 0.88, 0);
    wellheadGroup.add(teeMesh);

    // Transparent Sight Glass on Wellhead Tee SHOWING CRUDE OIL SURGING INSIDE
    const sightGlassTube = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.28, 16), this._glassMat);
    sightGlassTube.position.set(0, 0.88, 0);
    wellheadGroup.add(sightGlassTube);

    // Pulsing Crude Oil Core inside Wellhead Sight Glass
    this._wellheadSightGlassOil = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 0.26, 16),
      this._oilMat
    );
    this._wellheadSightGlassOil.position.set(0, 0.88, 0);
    wellheadGroup.add(this._wellheadSightGlassOil);

    // Wing Valve leading to surface flowline (+Z)
    const wingPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.45, 12), this._casingSteelMat);
    wingPipe.rotation.x = Math.PI / 2;
    wingPipe.position.set(0, 0.88, 0.35);
    wellheadGroup.add(wingPipe);

    const wingWheel = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.02, 8, 16), this._redAccentMat);
    wingWheel.rotation.y = Math.PI / 2;
    wingWheel.position.set(0.18, 0.88, 0.35);
    wellheadGroup.add(wingWheel);

    // API 6A Precision Pressure Gauge on wellhead tee
    const gaugeStem = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.18, 8), this._goldBrassMat);
    gaugeStem.rotation.z = -Math.PI / 2;
    gaugeStem.position.set(-0.25, 0.88, 0);
    wellheadGroup.add(gaugeStem);

    const gaugeBody = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.05, 24), this._blackSteelMat);
    gaugeBody.rotation.z = Math.PI / 2;
    gaugeBody.position.set(-0.36, 0.88, 0);
    wellheadGroup.add(gaugeBody);

    const gaugeFace = new THREE.Mesh(new THREE.CircleGeometry(0.13, 24), this._gaugeDialMat);
    gaugeFace.rotation.y = -Math.PI / 2;
    gaugeFace.position.set(-0.386, 0.88, 0);
    wellheadGroup.add(gaugeFace);

    // Stuffing Box atop Wellhead Tee
    const stuffingBox = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.20, 0.32, 20), this._darkCastIronMat);
    stuffingBox.position.set(0, 1.25, 0);
    wellheadGroup.add(stuffingBox);

    const brassGland = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.1, 16), this._goldBrassMat);
    brassGland.position.set(0, 1.42, 0);
    wellheadGroup.add(brassGland);

    // Authentic Oilfield Stuffing Box Drip Catch Pan (with dark pooled crude oil!)
    const dripPan = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.34, 0.12, 20), this._darkCastIronMat);
    dripPan.position.set(0, 1.15, 0);
    wellheadGroup.add(dripPan);

    this._dripPanOil = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.05, 20), this._oilMat);
    this._dripPanOil.position.set(0, 1.18, 0);
    wellheadGroup.add(this._dripPanOil);

    this.root.add(wellheadGroup);
  }

  /**
   * 8. Bridle Cables, Heavy Forged Carrier Bar, Dual-Bolt Rod Clamp & Wet Oil Sheen Polished Rod
   */
  private buildPolishedRodAssembly(): {
    bridle: THREE.LineSegments;
    carrierBar: THREE.Mesh;
    polishedRod: THREE.Mesh;
    oilFilm: THREE.Mesh;
  } {
    const wx = this.kinematics.params.wellheadX;

    // Heavy Forged Steel Carrier Bar
    const carrierBar = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.72), this._blackSteelMat);
    carrierBar.position.set(wx, 3.5, 0);

    // API Split-Block Heavy Polished Rod Clamp with Clamping Bolts
    const rodClamp = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.16, 0.18), this._darkCastIronMat);
    rodClamp.position.set(0, 0.14, 0);
    carrierBar.add(rodClamp);

    [-0.05, 0.05].forEach(cy => {
      const cBolt = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.24, 8), this._chromeMat);
      cBolt.rotation.x = Math.PI / 2;
      cBolt.position.set(0, cy, 0);
      rodClamp.add(cBolt);
    });

    // Mirror-Polished Chrome Rod
    const polishedRod = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 4.2, 24), this._chromeMat);
    polishedRod.position.set(wx, 1.4, 0);

    // Glistening Wet Crude Oil Sheen Sleeve coating the lower stroke of the polished rod
    const oilFilm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.040, 0.040, 1.8, 20),
      this._oilMat
    );
    oilFilm.position.set(0, -0.6, 0);
    polishedRod.add(oilFilm);

    // Bridle Wire Ropes
    const linePositions = new Float32Array(12);
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
    const bridle = new THREE.LineSegments(lineGeo, new THREE.LineBasicMaterial({ color: 0x94a3b8, linewidth: 2 }));

    return { bridle, carrierBar, polishedRod, oilFilm };
  }

  /**
   * 9. DEVIATED / HORIZONTAL SUBTERRANEAN WELLBORE & DOWNHOLE PUMP
   * - Cutaway Casing with JET PERFORATIONS in reservoir
   * - Transparent Pump Barrel SHOWING OIL IN THE PUMP
   * - Standing Valve (intake) with chrome ball lifting on upstroke
   * - Chrome Plunger with wiper grooves & Traveling Valve lifting on downstroke
   * - Rich crude oil column expanding/contracting inside pump
   * - Influx streams of oil droplets entering from perforations into pump intake!
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

    const wx = this.kinematics.params.wellheadX; // 4.0
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
    const thermalMesh = new THREE.Mesh(thermalGeo, this._thermalGlowMat);
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
    const casingMesh = new THREE.Mesh(casingGeo, this._casingCutawayMat);
    casingMesh.name = 'HorizontalCasing';
    ugGroup.add(casingMesh);

    // Jet-Perforated Casing Section in Reservoir (X = 12.0 to 16.5m)
    const perfPoints = [
      new THREE.Vector3(12.0, horizontalDepth, 0.0),
      new THREE.Vector3(16.5, horizontalDepth, 0.0)
    ];
    const perfGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(perfPoints), 20, 0.325, 24, false);
    const perfMesh = new THREE.Mesh(perfGeo, this._perforationMat);
    perfMesh.name = 'PerforatedCasingInterval';
    ugGroup.add(perfMesh);

    // Heavy Metal Wellbore Collar at Ground Entrance
    const wellHeadCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.6, 20), this._casingSteelMat);
    wellHeadCollar.position.set(wx, -0.3, 0.0);
    ugGroup.add(wellHeadCollar);

    // D. HIGH-FIDELITY HORIZONTAL SUBSURFACE PUMP (API Spec 11AX) SHOWING THE OIL IN THE PUMP
    const pumpGroup = new THREE.Group();
    pumpGroup.name = 'SubsurfaceHorizontalPump';

    const barrelLength = 4.4;
    const barrelStartX = wx + curveRadius + 0.8; // ~8.6m
    const barrelEndX = barrelStartX + barrelLength; // ~13.0m

    // 1. Transparent Cutaway Glass Pump Barrel
    const barrelGeo = new THREE.CylinderGeometry(0.18, 0.18, barrelLength, 24, 1, true);
    barrelGeo.rotateZ(Math.PI / 2);
    const barrelMesh = new THREE.Mesh(barrelGeo, this._glassMat);
    barrelMesh.position.set(barrelStartX + barrelLength * 0.5, horizontalDepth, 0.0);
    pumpGroup.add(barrelMesh);

    // Steel Collars at each end of the barrel
    [-barrelLength * 0.5, barrelLength * 0.5].forEach(xOff => {
      const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.20, 0.16, 20), this._casingSteelMat);
      collar.rotation.z = Math.PI / 2;
      collar.position.set(barrelStartX + barrelLength * 0.5 + xOff, horizontalDepth, 0.0);
      pumpGroup.add(collar);
    });

    // 2. Centralizer Collars with Bow-Spring Ribs
    for (let x = barrelStartX + 0.6; x <= barrelStartX + barrelLength - 0.6; x += 1.0) {
      const centralizer = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.03, 8, 20), this._chromeMat);
      centralizer.rotation.y = Math.PI / 2;
      centralizer.position.set(x, horizontalDepth, 0.0);
      pumpGroup.add(centralizer);

      for (let a = 0; a < Math.PI * 2; a += Math.PI / 2) {
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 0.03), this._chromeMat);
        blade.position.set(x, horizontalDepth + Math.cos(a) * 0.28, Math.sin(a) * 0.28);
        pumpGroup.add(blade);
      }
    }

    // 3. Suction Strainer Nipple at Pump Intake (X = 13.0 to 14.2m)
    const strainerGeo = new THREE.CylinderGeometry(0.15, 0.15, 1.2, 16);
    strainerGeo.rotateZ(Math.PI / 2);
    const strainerMesh = new THREE.Mesh(strainerGeo, this._perforationMat);
    strainerMesh.position.set(barrelEndX + 0.6, horizontalDepth, 0.0);
    pumpGroup.add(strainerMesh);

    // 4. STANDING VALVE ASSEMBLY (Intake Ball & Seat at X = 13.0)
    const svGroup = new THREE.Group();
    svGroup.position.set(barrelEndX, horizontalDepth, 0.0);

    // Standing valve tungsten carbide seat
    const svSeat = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.08, 16), this._goldBrassMat);
    svSeat.rotation.z = Math.PI / 2;
    svGroup.add(svSeat);

    // Standing valve open cage
    const svCage = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.22, 12, 1, true), this._darkCastIronMat);
    svCage.rotation.z = Math.PI / 2;
    svCage.position.set(-0.11, 0, 0);
    svGroup.add(svCage);

    // Standing Valve Ball (Lifts on UPSTROKE, seats on DOWNSTROKE)
    this._standingValveBall = new THREE.Mesh(new THREE.SphereGeometry(0.065, 16, 16), this._chromeMat);
    this._standingValveBall.position.set(-0.065, 0, 0);
    svGroup.add(this._standingValveBall);
    pumpGroup.add(svGroup);

    // 5. RECIPROCATING CHROME PLUNGER (with Wiper Grooves & Traveling Valve)
    const plungerLength = 2.0;
    const plungerGeo = new THREE.CylinderGeometry(0.14, 0.14, plungerLength, 24);
    plungerGeo.rotateZ(Math.PI / 2);
    const plunger = new THREE.Mesh(plungerGeo, this._chromeMat);
    plunger.name = 'HorizontalPumpPlunger';
    plunger.position.set(barrelStartX + barrelLength * 0.5, horizontalDepth, 0.0);

    // Wiper grooves along plunger
    for (let gx = -plungerLength * 0.4; gx <= plungerLength * 0.4; gx += 0.25) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.141, 0.008, 6, 20), this._darkCastIronMat);
      ring.rotation.y = Math.PI / 2;
      ring.position.set(gx, 0, 0);
      plunger.add(ring);
    }

    // Traveling Valve inside Plunger Head
    const tvSeat = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.06, 16), this._goldBrassMat);
    tvSeat.rotation.z = Math.PI / 2;
    tvSeat.position.set(plungerLength * 0.45, 0, 0);
    plunger.add(tvSeat);

    // Traveling Valve Ball (Lifts on DOWNSTROKE to let oil into plunger, seats on UPSTROKE)
    this._travelingValveBall = new THREE.Mesh(new THREE.SphereGeometry(0.055, 16, 16), this._chromeMat);
    this._travelingValveBall.position.set(plungerLength * 0.45 - 0.055, 0, 0);
    plunger.add(this._travelingValveBall);

    // Internal Liquid Oil Column inside Plunger Bore
    this._plungerOilMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.09, plungerLength * 0.85, 16),
      this._oilMat
    );
    this._plungerOilMesh.rotation.z = Math.PI / 2;
    this._plungerOilMesh.position.set(-0.05, 0, 0);
    plunger.add(this._plungerOilMesh);

    pumpGroup.add(plunger);

    // 6. VISIBLE CRUDE OIL LIQUID COLUMN IN THE PUMP BARREL (Between Plunger & Standing Valve)
    // This dynamically expands and compresses with stroke!
    const pumpOilGeo = new THREE.CylinderGeometry(0.155, 0.155, 1.0, 20);
    pumpOilGeo.rotateZ(Math.PI / 2);
    this._pumpOilMesh = new THREE.Mesh(pumpOilGeo, this._oilMat);
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

    // Rod guide sleeves along curve to prevent tubing wear
    [8, 16, 24, 32, 40, 48].forEach(idx => {
      const pt = rodPoints[idx];
      if (pt) {
        const guide = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.22, 12), this._redAccentMat);
        guide.position.copy(pt);
        ugGroup.add(guide);
      }
    });

    // Inspector UserData tags
    pumpGroup.userData = { component: 'DOWNHOLE PUMP' };
    plunger.userData = { component: 'DOWNHOLE PUMP' };
    strataMesh.userData = { component: 'RESERVOIR CELL' };
    casingMesh.userData = { component: 'WELLHEAD' };

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
   * Helper to construct a structural tubular pillar between two 3D points
   */
  private createPillarBetween(p1: THREE.Vector3, p2: THREE.Vector3, radius: number, mat: THREE.Material): THREE.Mesh {
    const dir = new THREE.Vector3().subVectors(p2, p1);
    const len = dir.length();
    const geo = new THREE.CylinderGeometry(radius, radius, len, 12);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;

    const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
    mesh.position.copy(mid);

    const axis = new THREE.Vector3(0, 1, 0);
    mesh.quaternion.setFromUnitVectors(axis, dir.clone().normalize());

    return mesh;
  }

  /**
   * Synchronize the complete 3D mechanical hierarchy to the exact kinematic solution & SHOW OIL IN PUMP
   */
  public update(state: KinematicState): void {
    const { crankCenterX, crankCenterY, wellheadX, frontBeamLength } = this.kinematics.params;

    // 1. Crank Rotation
    this._crankShaftGroup.rotation.z = state.crankAngle;

    const pinRadius = this.kinematics.crankRadius;
    const pinLeft = this._crankArmLeft.getObjectByName('CrankPin');
    const pinRight = this._crankArmRight.getObjectByName('CrankPin');
    if (pinLeft) pinLeft.position.x = pinRadius;
    if (pinRight) pinRight.position.x = pinRadius;

    // 2. Walking Beam Tilt Angle
    this._walkingBeamGroup.rotation.z = state.beamAngle;

    // 3. Equalizer Bar Position
    this._equalizerBar.position.set(state.equalizerPos.x, state.equalizerPos.y, 0);

    // 4. Pitman Arms
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

    this._pitmanLeft.position.copy(pinPosLeft);
    const diffLeft = new THREE.Vector3().subVectors(eqLeft, pinPosLeft);
    this._pitmanLeft.rotation.z = Math.atan2(diffLeft.y, diffLeft.x);
    this._pitmanLeft.scale.x = diffLeft.length() / this.kinematics.params.pitmanLength;

    this._pitmanRight.position.copy(pinPosRight);
    const diffRight = new THREE.Vector3().subVectors(eqRight, pinPosRight);
    this._pitmanRight.rotation.z = Math.atan2(diffRight.y, diffRight.x);
    this._pitmanRight.scale.x = diffRight.length() / this.kinematics.params.pitmanLength;

    // 5. Polished Rod & Carrier Bar Vertical Translation
    const currentCarrierY = 3.6 + state.rodDisplacement;
    this._carrierBar.position.y = currentCarrierY;
    this._polishedRod.position.y = currentCarrierY - 2.1;
    if (this._polishedRodOilFilm) {
      this._polishedRodOilFilm.position.y = -0.6 + state.rodDisplacement * 0.15;
    }

    // 6. Bridle Wire Cables
    const arcTangentY = this.kinematics.params.samsonPostHeight + frontBeamLength * Math.sin(state.beamAngle);
    const posAttr = this._bridleLines.geometry.attributes.position as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;

    arr[0] = wellheadX; arr[1] = Math.max(currentCarrierY + 0.05, arcTangentY); arr[2] = -0.22;
    arr[3] = wellheadX; arr[4] = currentCarrierY; arr[5] = -0.22;
    arr[6] = wellheadX; arr[7] = Math.max(currentCarrierY + 0.05, arcTangentY); arr[8] = 0.22;
    arr[9] = wellheadX; arr[10] = currentCarrierY; arr[11] = 0.22;
    posAttr.needsUpdate = true;

    // 7. Wellhead Sight Glass Oil Surging Pulse (synchronized with upstroke rod velocity)
    const upstrokeSurge = Math.max(0.2, (state.rodVelocity || 0) * 2.0);
    this._wellheadSightGlassOil.scale.set(1.0, 0.8 + upstrokeSurge * 0.4, 1.0);

    // 8. Horizontal Downhole Pump Reciprocation & Valve Kinematics
    const basePlungerX = 10.7;
    const plungerX = basePlungerX + (state.rodDisplacement - state.strokeLength * 0.5);
    this._horizontalPlunger.position.x = plungerX;

    // A. Dynamic Standing Valve (Intake at X = 13.0m)
    // On UPSTROKE: Suction pulls Standing Valve Ball off seat (-X direction) allowing formation crude in!
    // On DOWNSTROKE: Pressure slams Standing Valve Ball tight against seat (0.0m)
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
    // On DOWNSTROKE: Plunger pushes into fluid, ball lifts inside cage to pass oil into plunger!
    // On UPSTROKE: Ball is seated tight against seat, lifting trapped column upward!
    const plungerLength = 2.0;
    if (state.strokePhase === 'DOWNSTROKE') {
      this._travelingValveBall.position.x = plungerLength * 0.45 - 0.12; // Lifted
    } else {
      this._travelingValveBall.position.x = plungerLength * 0.45 - 0.055; // Seated
    }

    // C. Dynamic Crude Oil Liquid Column inside Pump Barrel
    // Spans the fluid gap between Plunger head and the Standing Valve at X = 13.0m
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
