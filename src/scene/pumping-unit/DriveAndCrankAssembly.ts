import * as THREE from 'three';
import { PumpingUnitMaterials } from './PumpingUnitMaterials.ts';
import type { PumpjackParams } from '../../kinematics/PumpjackKinematics.ts';

/**
 * DriveAndCrankAssembly.ts
 * Industrial Double-Reduction Gear Reducer, 40 HP TEFC Induction Motor,
 * V-Belt Drive with OSHA Safety Screen, Heavy Master Cranks, and
 * Authentic API Segmented Counterweight Blocks (Zero Toy Stickers!).
 */

export class DriveAndCrankAssembly {
  public readonly group: THREE.Group;
  public readonly crankShaftGroup: THREE.Group;
  public readonly leftCrank: THREE.Group;
  public readonly rightCrank: THREE.Group;

  private mats: PumpingUnitMaterials;
  private params: PumpjackParams;

  constructor(mats: PumpingUnitMaterials, params: PumpjackParams) {
    this.mats = mats;
    this.params = params;
    this.group = new THREE.Group();
    this.group.name = 'DriveAndCrankAssembly';

    // Stationary machinery group (Gearbox, Motor, Guards, Safety Railings)
    this.buildGearboxAndMotor();

    // Rotating crankshaft & counterweights group
    this.crankShaftGroup = new THREE.Group();
    this.crankShaftGroup.name = 'RotatingCrankshaftGroup';
    this.crankShaftGroup.position.set(params.crankCenterX, params.crankCenterY, 0);

    const { leftCrank, rightCrank } = this.buildCrankArms();
    this.leftCrank = leftCrank;
    this.rightCrank = rightCrank;
    this.crankShaftGroup.add(leftCrank);
    this.crankShaftGroup.add(rightCrank);

    this.group.add(this.crankShaftGroup);
  }

  /**
   * 1. Industrial Split-Case Double Reduction Gear Reducer & TEFC Motor
   */
  private buildGearboxAndMotor(): void {
    const driveGroup = new THREE.Group();
    driveGroup.name = 'StaticDriveGroup';

    const cx = this.params.crankCenterX; // -3.6m
    const cy = this.params.crankCenterY; // 1.35m

    // A. Industrial Cast-Iron Gearbox Housing (API 320/456 Double-Reduction Helical Reducer)
    const gbWidth = 1.75;
    const gbHeight = 1.55;
    const gbDepth = 1.18;

    const gearBoxBody = new THREE.Mesh(
      new THREE.BoxGeometry(gbWidth, gbHeight, gbDepth),
      this.mats.castIron
    );
    gearBoxBody.position.set(cx, cy - 0.45, 0);
    gearBoxBody.castShadow = true;
    gearBoxBody.userData = { component: 'GEARBOX' };
    driveGroup.add(gearBoxBody);

    // Horizontal Split-Line Flange (Lower & Upper Casing Separation)
    const splitFlange = new THREE.Mesh(
      new THREE.BoxGeometry(gbWidth + 0.12, 0.08, gbDepth + 0.12),
      this.mats.castIron
    );
    splitFlange.position.set(cx, cy - 0.45, 0);
    driveGroup.add(splitFlange);

    // Perimeter Split-Line Hex Bolts (16 high-tensile casing bolts)
    for (let i = -3; i <= 3; i++) {
      [-gbDepth * 0.5 - 0.03, gbDepth * 0.5 + 0.03].forEach(z => {
        const b = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.12, 6), this.mats.machinedChrome);
        b.position.set(cx + (i / 3) * (gbWidth * 0.42), cy - 0.45, z);
        driveGroup.add(b);
      });
    }

    // Cast Structural Cooling / Stiffening Ribs on Gearbox Side Walls
    [-0.55, -0.2, 0.2, 0.55].forEach(xOff => {
      const rib = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, gbHeight * 0.85, 0.06),
        this.mats.castIron
      );
      rib.position.set(cx + xOff, cy - 0.45, gbDepth * 0.5 + 0.02);
      driveGroup.add(rib);

      const ribBack = rib.clone();
      ribBack.position.set(cx + xOff, cy - 0.45, -gbDepth * 0.5 - 0.02);
      driveGroup.add(ribBack);
    });

    // Slow-Speed Crankshaft Output Hubs & Oil Seal Retainer Plates
    [-gbDepth * 0.5 - 0.08, gbDepth * 0.5 + 0.08].forEach(z => {
      const carrier = new THREE.Mesh(
        new THREE.CylinderGeometry(0.32, 0.32, 0.14, 24),
        this.mats.castIron
      );
      carrier.rotation.x = Math.PI / 2;
      carrier.position.set(cx, cy, z);
      driveGroup.add(carrier);

      // Bearing Retainer Ring with 8 Hex Studs
      for (let s = 0; s < 8; s++) {
        const ang = (s / 8) * Math.PI * 2;
        const stud = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.16, 6), this.mats.machinedChrome);
        stud.rotation.x = Math.PI / 2;
        stud.position.set(cx + Math.cos(ang) * 0.24, cy + Math.sin(ang) * 0.24, z);
        driveGroup.add(stud);
      }
    });

    // Top Inspection Cover Hatch with Gasket
    const hatch = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.06, 0.55), this.mats.structuralSteelDark);
    hatch.position.set(cx - 0.15, cy + gbHeight * 0.5 - 0.42, 0);
    driveGroup.add(hatch);

    // Breather Cap / Air Vent atop Gearbox
    const breather = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.035, 0.14, 16), this.mats.machinedChrome);
    breather.position.set(cx + 0.35, cy + gbHeight * 0.5 - 0.38, 0);
    driveGroup.add(breather);

    // Brass Oil Level Gauge / Sight Glass on lower side wall
    const sightGlass = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.045, 0.14, 16),
      this.mats.brassFitting
    );
    sightGlass.rotation.z = Math.PI / 2;
    sightGlass.position.set(cx + gbWidth * 0.5 + 0.05, cy - 0.82, 0.28);
    driveGroup.add(sightGlass);

    // B. High-Slip TEFC Industrial Electric Motor (40 HP API NEMA D Specification)
    const motorGroup = new THREE.Group();
    motorGroup.name = 'ElectricMotor';
    const mx = cx + 2.05;
    const my = 0.65;
    const mz = 0.0;

    // Motor Stator Housing (Heavy cylindrical frame with axial cooling fins)
    const motorBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.38, 0.38, 0.95, 24),
      this.mats.castIron
    );
    motorBody.rotation.z = Math.PI / 2;
    motorBody.position.set(mx, my, mz);
    motorBody.castShadow = true;
    motorBody.userData = { component: 'MOTOR' };
    motorGroup.add(motorBody);

    // 16 Longitudinal Cooling Fins running along the motor exterior
    for (let f = 0; f < 16; f++) {
      const fAng = (f / 16) * Math.PI * 2;
      const fin = new THREE.Mesh(
        new THREE.BoxGeometry(0.9, 0.06, 0.015),
        this.mats.castIron
      );
      fin.position.set(mx, my + Math.cos(fAng) * 0.41, mz + Math.sin(fAng) * 0.41);
      fin.rotation.x = fAng;
      motorGroup.add(fin);
    }

    // Cast-Iron End Bells (Front and Rear Bearing Brackets)
    [-0.5, 0.5].forEach((dx, idx) => {
      const bell = new THREE.Mesh(
        new THREE.CylinderGeometry(0.40, 0.40, 0.08, 24),
        this.mats.castIron
      );
      bell.rotation.z = Math.PI / 2;
      bell.position.set(mx + dx, my, mz);
      motorGroup.add(bell);

      // Rear Fan Cowling / Cooling Shroud on rear end
      if (idx === 1) {
        const fanShroud = new THREE.Mesh(
          new THREE.CylinderGeometry(0.39, 0.39, 0.22, 24),
          this.mats.structuralSteelDark
        );
        fanShroud.rotation.z = Math.PI / 2;
        fanShroud.position.set(mx + dx + 0.12, my, mz);
        motorGroup.add(fanShroud);

        // Fan Wire Grille on outer face
        const grille = new THREE.Mesh(new THREE.CircleGeometry(0.36, 16), this.mats.safetyMesh);
        grille.rotation.y = Math.PI / 2;
        grille.position.set(mx + dx + 0.231, my, mz);
        motorGroup.add(grille);
      }
    });

    // Motor Terminal Box (Heavy Cast Junction Box)
    const termBox = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.25, 0.22),
      this.mats.castIron
    );
    termBox.position.set(mx, my + 0.46, mz + 0.26);
    termBox.castShadow = true;
    motorGroup.add(termBox);

    // Flexible Grounded Electrical Conduit Pipe to Foundation
    const conduit = new THREE.Mesh(
      new THREE.CylinderGeometry(0.022, 0.022, 0.65, 8),
      this.mats.casingSteel
    );
    conduit.position.set(mx, my + 0.15, mz + 0.38);
    motorGroup.add(conduit);

    // Motor Slide Base (Adjustable tensioning rails with dual jack screws)
    const slideRails = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.08, 0.75),
      this.mats.structuralSteelDark
    );
    slideRails.position.set(mx, 0.32, mz);
    motorGroup.add(slideRails);

    // Belt Tensioning Adjustment Screws
    [-0.25, 0.25].forEach(z => {
      const screw = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.35, 8), this.mats.machinedChrome);
      screw.rotation.z = Math.PI / 2;
      screw.position.set(mx + 0.62, 0.32, z);
      motorGroup.add(screw);
    });

    driveGroup.add(motorGroup);

    // C. Industrial V-Belt & Pulley Safety Guard (Between Motor and Gearbox)
    const guardGroup = new THREE.Group();
    guardGroup.name = 'VBeltEnclosedGuard';

    // Yellow fabricated steel frame
    const guardFrame = new THREE.Mesh(
      new THREE.BoxGeometry(1.25, 0.92, 0.32),
      this.mats.safetyYellow
    );
    guardFrame.position.set(cx + 1.15, 0.68, -0.68);
    guardGroup.add(guardFrame);

    // Expanded Metal Wire Mesh Screen Face (Allows visual inspection of belts)
    const screenFace = new THREE.Mesh(
      new THREE.PlaneGeometry(1.15, 0.82),
      this.mats.safetyMesh
    );
    screenFace.position.set(cx + 1.15, 0.68, -0.841);
    guardGroup.add(screenFace);

    // Warning Caution Sign on Guard
    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.16, 0.02),
      this.mats.structuralSteelDark
    );
    sign.position.set(cx + 1.15, 0.92, -0.845);
    guardGroup.add(sign);

    driveGroup.add(guardGroup);

    // D. OSHA Yellow Counterweight Sweep Perimeter Safety Railings (Left & Right)
    [-1.68, 1.68].forEach(z => {
      const fence = new THREE.Group();
      fence.name = 'CounterweightSafetyRailing';

      // Top Handrail
      const topRail = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.04, 0.04), this.mats.safetyYellow);
      topRail.position.set(cx, 1.32, z);
      fence.add(topRail);

      // Midrail
      const midRail = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.03, 0.03), this.mats.safetyYellow);
      midRail.position.set(cx, 0.72, z);
      fence.add(midRail);

      // 4" Kickplate / Toeboard along foundation
      const kickBoard = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.14, 0.025), this.mats.safetyYellow);
      kickBoard.position.set(cx, 0.35, z);
      fence.add(kickBoard);

      // Stanchion Posts (5 heavy vertical tubes anchored to skid)
      [-1.8, -0.9, 0.0, 0.9, 1.8].forEach(xOff => {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 1.1, 8), this.mats.safetyYellow);
        post.position.set(cx + xOff, 0.8, z);
        fence.add(post);
      });

      driveGroup.add(fence);
    });

    this.group.add(driveGroup);
  }

  /**
   * 2. Forged Master Crank Arms & Authentic Heavy API Segmented Counterweight Blocks
   */
  private buildCrankArms(): { leftCrank: THREE.Group; rightCrank: THREE.Group } {
    const crankZOffset = 0.92;

    const createCrank = (isRight: boolean) => {
      const crank = new THREE.Group();
      crank.name = isRight ? 'RightCrank' : 'LeftCrank';
      crank.position.set(0, 0, isRight ? crankZOffset : -crankZOffset);
      crank.userData = { component: 'CRANK' };

      // A. Forged Alloy Steel Master Crank Arm Body
      const armLength = 1.45;
      const armWidth = 0.32;
      const armThickness = 0.14;

      const armMesh = new THREE.Mesh(
        new THREE.BoxGeometry(armLength, armWidth, armThickness),
        this.mats.structuralSteel
      );
      armMesh.position.set(armLength * 0.5 - 0.22, 0, 0);
      armMesh.castShadow = true;
      crank.add(armMesh);

      // B. Keyed Crankshaft Center Hub
      const hub = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28, 0.28, 0.22, 24),
        this.mats.castIron
      );
      hub.rotation.x = Math.PI / 2;
      crank.add(hub);

      // Crank Shaft Hub Clamping Bolts
      [-0.14, 0.14].forEach(hx => {
        const hBolt = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.26, 6), this.mats.machinedChrome);
        hBolt.rotation.x = Math.PI / 2;
        hBolt.position.set(hx, 0.18, 0);
        crank.add(hBolt);
      });

      // C. Continuous Machined T-Slot Lead-Screw Adjustment Track along Crank Arm
      const tSlot = new THREE.Mesh(
        new THREE.BoxGeometry(armLength * 0.72, 0.08, armThickness + 0.02),
        this.mats.machinedChrome
      );
      tSlot.position.set(armLength * 0.5 - 0.1, 0, 0);
      crank.add(tSlot);

      // Lead-Screw Adjustment Pinion / Worm Drive at outer end
      const screwNut = new THREE.Mesh(
        new THREE.CylinderGeometry(0.045, 0.045, 0.08, 6),
        this.mats.brassFitting
      );
      screwNut.rotation.z = Math.PI / 2;
      screwNut.position.set(armLength - 0.22, 0, 0);
      crank.add(screwNut);

      // D. Multiple API Standard Stroke Adjustment Pin Holes (54", 64", 74", 86")
      const strokeHoles = [0.45, 0.65, 0.85, 1.05];
      strokeHoles.forEach(rx => {
        const holeRing = new THREE.Mesh(
          new THREE.CylinderGeometry(0.08, 0.08, armThickness + 0.04, 16),
          this.mats.machinedChrome
        );
        holeRing.rotation.x = Math.PI / 2;
        holeRing.position.set(rx, 0, 0);
        crank.add(holeRing);
      });

      // E. Authentic Heavy Cast-Steel Curved Segment Counterweight Blocks (API Spec 11E)
      // Real curved geometry with outer arc radius and clamping bolts — NO CARTOON RED EYE!
      const cwShape = new THREE.Shape();
      const innerR = 0.38;
      const outerR = 0.98;
      const startAng = Math.PI * 0.65;
      const endAng = Math.PI * 1.95;

      // Outer curved perimeter
      cwShape.absarc(0, 0, outerR, startAng, endAng, false);
      // Flat inner clamping face
      cwShape.lineTo(innerR * Math.cos(endAng), innerR * Math.sin(endAng));
      cwShape.absarc(0, 0, innerR, endAng, startAng, true);
      cwShape.closePath();

      const extrudeSettings: THREE.ExtrudeGeometryOptions = {
        depth: 0.34,
        bevelEnabled: true,
        bevelSegments: 3,
        bevelSize: 0.025,
        bevelThickness: 0.025
      };

      const cwGeo = new THREE.ExtrudeGeometry(cwShape, extrudeSettings);
      const counterweight = new THREE.Mesh(cwGeo, this.mats.castIron);
      counterweight.position.set(-0.24, -0.08, isRight ? 0.07 : -0.41);
      counterweight.castShadow = true;
      crank.add(counterweight);

      // Secondary Auxiliary Counterweight Segment (Bolted stack for heavy oil torque balancing)
      const auxGeo = new THREE.ExtrudeGeometry(cwShape, {
        depth: 0.12,
        bevelEnabled: true,
        bevelSegments: 2,
        bevelSize: 0.015,
        bevelThickness: 0.015
      });
      const auxWeight = new THREE.Mesh(auxGeo, this.mats.structuralSteelDark);
      auxWeight.position.set(-0.24, -0.08, isRight ? 0.44 : -0.56);
      auxWeight.castShadow = true;
      crank.add(auxWeight);

      // Heavy Counterweight Clamp Tie-Down Bolts (4 high-tensile bolts through counterweight)
      const boltLocations = [
        { x: -0.65, y: -0.3 },
        { x: -0.42, y: -0.65 },
        { x: -0.15, y: -0.85 },
        { x: 0.18, y: -0.55 }
      ];

      boltLocations.forEach(loc => {
        const cBolt = new THREE.Mesh(
          new THREE.CylinderGeometry(0.026, 0.026, 0.65, 8),
          this.mats.machinedChrome
        );
        cBolt.rotation.x = Math.PI / 2;
        cBolt.position.set(loc.x, loc.y, isRight ? 0.28 : -0.28);
        crank.add(cBolt);

        // Heavy Hex Nuts on both sides
        const nut1 = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.06, 6), this.mats.castIron);
        nut1.rotation.x = Math.PI / 2;
        nut1.position.set(loc.x, loc.y, isRight ? 0.58 : -0.58);
        crank.add(nut1);
      });

      // F. Heavy Wrist Pin Assembly (Active Drive Pin connecting to Pitman Arm)
      const pinMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.085, 0.085, 0.32, 20),
        this.mats.machinedChrome
      );
      pinMesh.name = 'CrankPin';
      pinMesh.rotation.x = Math.PI / 2;
      pinMesh.position.set(0.75, 0, isRight ? 0.16 : -0.16);
      crank.add(pinMesh);

      // Spherical Roller Bearing Housing over Wrist Pin
      const bearingCollar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.13, 0.13, 0.18, 20),
        this.mats.castIron
      );
      bearingCollar.rotation.x = Math.PI / 2;
      bearingCollar.position.set(0.75, 0, isRight ? 0.16 : -0.16);
      bearingCollar.name = 'WristPinBearing';
      crank.add(bearingCollar);

      return crank;
    };

    return {
      leftCrank: createCrank(false),
      rightCrank: createCrank(true)
    };
  }
}
