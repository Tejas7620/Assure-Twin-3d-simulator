import * as THREE from 'three';
import { PumpingUnitMaterials } from './PumpingUnitMaterials.ts';
import type { PumpjackParams } from '../../kinematics/PumpjackKinematics.ts';

/**
 * BaseAndSamsonPost.ts
 * Heavy-duty API Spec 11E Foundation, Wide-Flange Structural Steel Skid,
 * 4-Legged Samson Post A-Frame, Center Saddle Bearing & OSHA Climbing Safety Cage.
 */

export class BaseAndSamsonPost {
  public readonly group: THREE.Group;
  private mats: PumpingUnitMaterials;
  private params: PumpjackParams;

  constructor(mats: PumpingUnitMaterials, params: PumpjackParams) {
    this.mats = mats;
    this.params = params;
    this.group = new THREE.Group();
    this.group.name = 'BaseAndSamsonPost';

    this.buildFoundation();
    this.buildSamsonPost();
  }

  /**
   * 1. Reinforced Concrete Foundation Pad & Wide-Flange Structural Steel Skid Frame
   */
  private buildFoundation(): void {
    const fGroup = new THREE.Group();
    fGroup.name = 'SkidFoundation';

    // A. Crushed Stone / Gravel Work Area (Compact ground contact with terrain)
    const gravelPad = new THREE.Mesh(new THREE.BoxGeometry(14.5, 0.14, 7.2), this.mats.gravel);
    gravelPad.position.set(0.1, -0.32, 0);
    gravelPad.receiveShadow = true;
    fGroup.add(gravelPad);

    // B. Reinforced Concrete Pumping Unit Base (Chamfered edge)
    const padLength = 11.2;
    const padWidth = 4.4;
    const padHeight = 0.48;
    const concretePad = new THREE.Mesh(new THREE.BoxGeometry(padLength, padHeight, padWidth), this.mats.concrete);
    concretePad.position.set(0.1, -0.08, 0);
    concretePad.receiveShadow = true;
    fGroup.add(concretePad);

    // C. Structural Steel Skid Rails (Two heavy longitudinal W-beams with realistic top/bottom flanges & web)
    const skidLength = 10.4;
    const beamHeight = 0.32;
    const flangeWidth = 0.22;
    const flangeThick = 0.035;
    const webThick = 0.025;

    const zTracks = [-1.25, 1.25];

    zTracks.forEach(z => {
      const railGroup = new THREE.Group();
      railGroup.position.set(0.1, 0.28, z);

      // Top flange
      const topFlange = new THREE.Mesh(new THREE.BoxGeometry(skidLength, flangeThick, flangeWidth), this.mats.structuralSteel);
      topFlange.position.set(0, beamHeight * 0.5 - flangeThick * 0.5, 0);
      topFlange.castShadow = true;
      railGroup.add(topFlange);

      // Bottom flange
      const btmFlange = new THREE.Mesh(new THREE.BoxGeometry(skidLength, flangeThick, flangeWidth), this.mats.structuralSteel);
      btmFlange.position.set(0, -beamHeight * 0.5 + flangeThick * 0.5, 0);
      btmFlange.castShadow = true;
      railGroup.add(btmFlange);

      // Center web
      const web = new THREE.Mesh(new THREE.BoxGeometry(skidLength, beamHeight - flangeThick * 2, webThick), this.mats.structuralSteel);
      web.castShadow = true;
      railGroup.add(web);

      // Structural Skid End Caps (Heavy bevelled bullnoses for dragging/skidding)
      [-skidLength * 0.5, skidLength * 0.5].forEach((xEnd, idx) => {
        const cap = new THREE.Mesh(new THREE.BoxGeometry(0.04, beamHeight, flangeWidth), this.mats.structuralSteelDark);
        cap.position.set(xEnd, 0, 0);
        railGroup.add(cap);

        // Heavy Towing / Rigging Eyes on skid ends
        const eye = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.025, 8, 16), this.mats.machinedChrome);
        eye.position.set(xEnd + (idx === 0 ? -0.06 : 0.06), 0, 0);
        railGroup.add(eye);
      });

      // Anchor Bolt Hold-Down Clamps (Securing skid to concrete pad)
      [-4.2, -2.4, 0.0, 2.4, 4.4].forEach(bx => {
        const clampPlate = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.05, 0.12), this.mats.structuralSteelDark);
        clampPlate.position.set(bx, beamHeight * 0.5 + 0.02, 0);
        railGroup.add(clampPlate);

        const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.42, 8), this.mats.machinedChrome);
        bolt.position.set(bx, 0.1, 0);
        railGroup.add(bolt);

        const nut = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.05, 6), this.mats.castIron);
        nut.position.set(bx, beamHeight * 0.5 + 0.06, 0);
        railGroup.add(nut);
      });

      fGroup.add(railGroup);
    });

    // D. Transverse Cross-Beams & Heavy Diagonal Gusset Plates
    [-4.5, -2.2, 0.0, 2.2, 4.6].forEach(x => {
      const crossBeam = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.26, 2.26), this.mats.structuralSteel);
      crossBeam.position.set(x, 0.28, 0);
      crossBeam.castShadow = true;
      fGroup.add(crossBeam);

      // Welded corner gussets
      [-1.1, 1.1].forEach(z => {
        const gusset = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.03), this.mats.structuralSteelDark);
        gusset.position.set(x, 0.28, z);
        fGroup.add(gusset);
      });
    });

    this.group.add(fGroup);
  }

  /**
   * 2. Authentic 4-Legged Samson Post A-Frame, Center Saddle Bearing & OSHA Climbing Safety Cage
   */
  private buildSamsonPost(): void {
    const postGroup = new THREE.Group();
    postGroup.name = 'SamsonPostAFrame';

    const hPost = this.params.samsonPostHeight; // 5.2m
    const baseSpreadX = 1.35;
    const baseSpreadZ = 1.15;
    const topSpreadX = 0.24;
    const topSpreadZ = 0.24;

    const corners = [
      { bx: -baseSpreadX, bz: -baseSpreadZ, tx: -topSpreadX, tz: -topSpreadZ },
      { bx: baseSpreadX, bz: -baseSpreadZ, tx: topSpreadX, tz: -topSpreadZ },
      { bx: -baseSpreadX, bz: baseSpreadZ, tx: -topSpreadX, tz: topSpreadZ },
      { bx: baseSpreadX, bz: baseSpreadZ, tx: topSpreadX, tz: topSpreadZ }
    ];

    // A. 4 Heavy Structural Steel A-Frame Legs (Flanged angle / box members with authentic footings)
    corners.forEach(c => {
      const start = new THREE.Vector3(c.bx, 0.42, c.bz);
      const end = new THREE.Vector3(c.tx, hPost - 0.22, c.tz);

      // Main leg beam
      const legMesh = this.createStructuralMember(start, end, 0.12, 0.12, this.mats.structuralSteel);
      postGroup.add(legMesh);

      // Heavy welded footplate on skid
      const footPlate = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.05, 0.32), this.mats.structuralSteelDark);
      footPlate.position.set(c.bx, 0.44, c.bz);
      footPlate.castShadow = true;
      postGroup.add(footPlate);

      // Footplate foundation anchor bolts (4 per foot)
      [-0.1, 0.1].forEach(dx => {
        [-0.1, 0.1].forEach(dz => {
          const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.1, 6), this.mats.machinedChrome);
          bolt.position.set(c.bx + dx, 0.48, c.bz + dz);
          postGroup.add(bolt);
        });
      });
    });

    // B. Three Tiers of Horizontal Channel Girts & Diagonal K-Truss Angle Lacing
    const tiers = [1.5, 2.8, 4.1];
    tiers.forEach((y, idx) => {
      const progress = (y - 0.4) / (hPost - 0.4);
      const curX = THREE.MathUtils.lerp(baseSpreadX, topSpreadX, progress);
      const curZ = THREE.MathUtils.lerp(baseSpreadZ, topSpreadZ, progress);

      // Front & Rear Horizontal Girts
      [-curZ, curZ].forEach(z => {
        const girt = new THREE.Mesh(new THREE.BoxGeometry(curX * 2, 0.12, 0.06), this.mats.structuralSteel);
        girt.position.set(0, y, z);
        girt.castShadow = true;
        postGroup.add(girt);

        // Welded end connection plates
        [-curX, curX].forEach(x => {
          const connPlate = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.16, 0.12), this.mats.structuralSteelDark);
          connPlate.position.set(x, y, z);
          postGroup.add(connPlate);
        });
      });

      // Left & Right Horizontal Girts
      [-curX, curX].forEach(x => {
        const girt = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, curZ * 2), this.mats.structuralSteel);
        girt.position.set(x, y, 0);
        girt.castShadow = true;
        postGroup.add(girt);
      });

      // Diagonal Cross-Lacing (X-Bracing) between tiers
      if (idx > 0) {
        const prevY = tiers[idx - 1];
        const prevProg = (prevY - 0.4) / (hPost - 0.4);
        const prevX = THREE.MathUtils.lerp(baseSpreadX, topSpreadX, prevProg);

        // Side X-Braces
        [-curZ, curZ].forEach(z => {
          const d1 = this.createStructuralMember(
            new THREE.Vector3(-prevX, prevY, z),
            new THREE.Vector3(curX, y, z),
            0.05, 0.05, this.mats.structuralSteel
          );
          const d2 = this.createStructuralMember(
            new THREE.Vector3(prevX, prevY, z),
            new THREE.Vector3(-curX, y, z),
            0.05, 0.05, this.mats.structuralSteel
          );
          postGroup.add(d1);
          postGroup.add(d2);
        });
      }
    });

    // C. Center Bearing Saddle Table (Heavy fabricated structural steel top beam assembly)
    const tableBeam = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.22, 1.45), this.mats.structuralSteel);
    tableBeam.position.set(0, hPost - 0.12, 0);
    tableBeam.castShadow = true;
    postGroup.add(tableBeam);

    // Center Saddle Bearing Housing (Heavy split cast-iron pillow block assembly)
    const bearingHousing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.24, 1.15, 20),
      this.mats.castIron
    );
    bearingHousing.rotation.x = Math.PI / 2;
    bearingHousing.position.set(0, hPost, 0);
    bearingHousing.castShadow = true;
    postGroup.add(bearingHousing);

    // Bearing Housing Split Flange & Heavy Cap Bolts
    [-0.45, 0.45].forEach(z => {
      const capFlange = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.06, 0.12), this.mats.castIron);
      capFlange.position.set(0, hPost, z);
      postGroup.add(capFlange);

      [-0.18, 0.18].forEach(x => {
        const capBolt = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.14, 6), this.mats.machinedChrome);
        capBolt.position.set(x, hPost + 0.06, z);
        postGroup.add(capBolt);
      });
    });

    // High-Pressure Grease Lubrication Line running down Samson post leg to ground
    const greaseLine = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.012, hPost - 0.6, 8),
      this.mats.machinedChrome
    );
    greaseLine.position.set(topSpreadX + 0.06, hPost * 0.5, topSpreadZ + 0.06);
    postGroup.add(greaseLine);

    // D. OSHA Service Ladder with Rear Safety Cage & Crow's Nest Work Platform
    const ladderGroup = new THREE.Group();
    ladderGroup.name = 'OSHALadderAndCage';

    const rungs = 17;
    for (let i = 0; i < rungs; i++) {
      const ly = 0.55 + i * 0.27;
      const progress = (ly - 0.4) / (hPost - 0.4);
      const lx = THREE.MathUtils.lerp(-baseSpreadX, -topSpreadX, progress) - 0.14;

      // Ladder Rung (Knurled slip-resistant galvanized bar)
      const rung = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.42, 8), this.mats.galvanizedSteel);
      rung.rotation.x = Math.PI / 2;
      rung.position.set(lx, ly, 0);
      ladderGroup.add(rung);

      // Safety Hoops every 3 rungs above 2.0 meters
      if (i >= 5 && i % 3 === 0) {
        const hoop = new THREE.Mesh(
          new THREE.TorusGeometry(0.35, 0.018, 8, 20, Math.PI * 1.3),
          this.mats.safetyYellow
        );
        hoop.rotation.y = Math.PI / 2;
        hoop.position.set(lx - 0.32, ly, 0);
        ladderGroup.add(hoop);
      }
    }

    // Safety Cage Vertical Ribs connecting the hoops
    [-0.24, 0.0, 0.24].forEach(z => {
      const cageBar = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 3.2, 8), this.mats.safetyYellow);
      cageBar.position.set(-baseSpreadX - 0.42, 3.2, z);
      ladderGroup.add(cageBar);
    });

    postGroup.add(ladderGroup);

    // E. Crow's Nest Platform (Galvanized grating floor, safety kickplate toeboard & handrails)
    const crowGroup = new THREE.Group();
    crowGroup.name = 'CrowsNestPlatform';

    const floorGrating = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.04, 1.5), this.mats.galvanizedSteel);
    floorGrating.position.set(0, hPost - 0.22, 0);
    crowGroup.add(floorGrating);

    // 4" OSHA Kickplates (Toeboards) around platform
    [-0.72, 0.72].forEach(z => {
      const toe = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.1, 0.02), this.mats.safetyYellow);
      toe.position.set(0, hPost - 0.15, z);
      crowGroup.add(toe);
    });

    // Perimeter Handrails & Midrails
    [-0.72, 0.72].forEach(z => {
      const topRail = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.035, 0.035), this.mats.galvanizedSteel);
      topRail.position.set(0, hPost + 0.62, z);
      crowGroup.add(topRail);

      const midRail = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.025, 0.025), this.mats.galvanizedSteel);
      midRail.position.set(0, hPost + 0.25, z);
      crowGroup.add(midRail);

      [-0.55, 0.55].forEach(x => {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.88, 8), this.mats.galvanizedSteel);
        post.position.set(x, hPost + 0.22, z);
        crowGroup.add(post);
      });
    });

    postGroup.add(crowGroup);
    this.group.add(postGroup);
  }

  private createStructuralMember(p1: THREE.Vector3, p2: THREE.Vector3, width: number, depth: number, mat: THREE.Material): THREE.Mesh {
    const dir = new THREE.Vector3().subVectors(p2, p1);
    const len = dir.length();
    const geo = new THREE.BoxGeometry(width, len, depth);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;

    const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
    mesh.position.copy(mid);

    const axis = new THREE.Vector3(0, 1, 0);
    mesh.quaternion.setFromUnitVectors(axis, dir.clone().normalize());
    return mesh;
  }
}
