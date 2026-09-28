import * as THREE from 'three';
import { PumpingUnitMaterials } from './PumpingUnitMaterials.ts';
import type { PumpjackParams } from '../../kinematics/PumpjackKinematics.ts';

/**
 * WellheadAssembly.ts
 * Authentic API 6A Flanged Christmas Tree / Wellhead Assembly:
 * - Casing Head Spool & Tubing Spool with High-Tensile Stud Bolts
 * - Lower & Upper Master Gate Valves with 4-Spoke Industrial Handwheels
 * - Flow Cross / Production Tee with Flanged Wing Valve connecting to Flowline
 * - Top Swab Valve & Heavy Flanged Stuffing Box with Brass Gland Nut
 * - Pressure Gauge with Stainless Isolation Needle Valve
 * - Pooled Crude Oil Drip Catch Pan & Sight Glass Pulse Indicator
 * (Replaces any toy-like or spherical handles with professional oilfield equipment).
 */

export class WellheadAssembly {
  public readonly group: THREE.Group;
  public readonly sightGlassOil: THREE.Mesh;
  public readonly dripPanOil: THREE.Mesh;

  private mats: PumpingUnitMaterials;

  constructor(mats: PumpingUnitMaterials, params: PumpjackParams) {
    this.mats = mats;
    this.group = new THREE.Group();
    this.group.name = 'API6AWellheadChristmasTree';
    this.group.position.set(params.wellheadX, 0, 0);
    this.group.userData = { component: 'WELLHEAD' };

    // Build the authentic Christmas tree
    const result = this.buildFlangedChristmasTree();
    this.sightGlassOil = result.sightGlassOil;
    this.dripPanOil = result.dripPanOil;
  }

  private buildFlangedChristmasTree(): { sightGlassOil: THREE.Mesh; dripPanOil: THREE.Mesh } {
    // 1. Casing Head Housing (API 6A Wellhead Base at Ground Level)
    const casingHead = new THREE.Mesh(
      new THREE.CylinderGeometry(0.44, 0.48, 0.32, 24),
      this.mats.wellheadSteel
    );
    casingHead.position.set(0, 0.16, 0);
    casingHead.castShadow = true;
    this.group.add(casingHead);

    // 12 High-Strength Foundation Stud Bolts with Heavy Hex Nuts
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.08, 6), this.mats.machinedChrome);
      bolt.position.set(Math.cos(a) * 0.40, 0.33, Math.sin(a) * 0.40);
      this.group.add(bolt);
    }

    // 2. Tubing Head Spool (Flanged intermediate section with lockdown screws)
    const tubingHead = new THREE.Mesh(
      new THREE.CylinderGeometry(0.36, 0.38, 0.30, 24),
      this.mats.wellheadSteel
    );
    tubingHead.position.set(0, 0.46, 0);
    tubingHead.castShadow = true;
    this.group.add(tubingHead);

    // Tubing Head Flange Ring with Perimeter Studs
    const tubingFlange = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.42, 0.08, 24),
      this.mats.wellheadSteel
    );
    tubingFlange.position.set(0, 0.58, 0);
    this.group.add(tubingFlange);

    // Casing Annulus Side Gate Valve (Flanged valve on side of tubing spool)
    const annValveBody = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.22), this.mats.wellheadSteel);
    annValveBody.position.set(0, 0.46, -0.32);
    this.group.add(annValveBody);

    const annWheel = this.createHandwheel(0.12);
    annWheel.position.set(0, 0.46, -0.46);
    this.group.add(annWheel);

    // 3. Lower Master Gate Valve (Primary Well Shut-in Barrier)
    const lowerMasterBody = new THREE.Mesh(
      new THREE.BoxGeometry(0.36, 0.32, 0.36),
      this.mats.wellheadSteel
    );
    lowerMasterBody.position.set(0, 0.78, 0);
    lowerMasterBody.castShadow = true;
    this.group.add(lowerMasterBody);

    // Flanges on top and bottom of Lower Master Valve
    [-0.14, 0.14].forEach(dy => {
      const fRing = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.05, 20), this.mats.wellheadSteel);
      fRing.position.set(0, 0.78 + dy, 0);
      this.group.add(fRing);
    });

    // Lower Master Valve Handwheel (Authentic 4-spoke cast handwheel on front stem)
    const lowerStem = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.16, 8), this.mats.machinedChrome);
    lowerStem.rotation.x = Math.PI / 2;
    lowerStem.position.set(0, 0.78, 0.26);
    this.group.add(lowerStem);

    const lowerHandwheel = this.createHandwheel(0.18);
    lowerHandwheel.position.set(0, 0.78, 0.35);
    this.group.add(lowerHandwheel);

    // 4. Upper Master Gate Valve (Operational Daily Barrier)
    const upperMasterBody = new THREE.Mesh(
      new THREE.BoxGeometry(0.34, 0.30, 0.34),
      this.mats.wellheadSteel
    );
    upperMasterBody.position.set(0, 1.12, 0);
    upperMasterBody.castShadow = true;
    this.group.add(upperMasterBody);

    const upperStem = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.16, 8), this.mats.machinedChrome);
    upperStem.rotation.x = Math.PI / 2;
    upperStem.position.set(0, 1.12, 0.25);
    this.group.add(upperStem);

    const upperHandwheel = this.createHandwheel(0.18);
    upperHandwheel.position.set(0, 1.12, 0.34);
    this.group.add(upperHandwheel);

    // 5. Production Flow Cross / Tee (Diverts crude oil into surface flowline)
    const flowTee = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.18, 0.48, 20),
      this.mats.wellheadSteel
    );
    flowTee.position.set(0, 1.50, 0);
    this.group.add(flowTee);

    // Transparent Sight Glass Tube on Production Tee SHOWING FLOWING OIL INSIDE
    const sightGlassTube = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.15, 0.24, 16),
      this.mats.sightGlass
    );
    sightGlassTube.position.set(0, 1.50, 0);
    this.group.add(sightGlassTube);

    // Dynamic Crude Oil Core inside Sight Glass (Pulses dynamically with rod upstroke)
    const sightGlassOil = new THREE.Mesh(
      new THREE.CylinderGeometry(0.13, 0.13, 0.22, 16),
      this.mats.crudeOil
    );
    sightGlassOil.position.set(0, 1.50, 0);
    this.group.add(sightGlassOil);

    // 6. Production Wing Valve (Directing oil into +Z surface flowline manifold)
    const wingPipe = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.07, 0.42, 16),
      this.mats.casingSteel
    );
    wingPipe.rotation.x = Math.PI / 2;
    wingPipe.position.set(0, 1.50, 0.32);
    this.group.add(wingPipe);

    const wingValveBody = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.20, 0.22), this.mats.wellheadSteel);
    wingValveBody.position.set(0, 1.50, 0.36);
    this.group.add(wingValveBody);

    const wingWheel = this.createHandwheel(0.14);
    wingWheel.rotation.y = Math.PI / 2;
    wingWheel.position.set(0.18, 1.50, 0.36);
    this.group.add(wingWheel);

    // 7. Precision API 6A Pressure Gauge (Stainless Steel Bourdon-Tube Indicator on -X side)
    const gaugeStem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.016, 0.016, 0.20, 8),
      this.mats.machinedChrome
    );
    gaugeStem.rotation.z = -Math.PI / 2;
    gaugeStem.position.set(-0.25, 1.50, 0);
    this.group.add(gaugeStem);

    // Needle isolation valve body
    const needleValve = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.08), this.mats.brassFitting);
    needleValve.position.set(-0.18, 1.50, 0);
    this.group.add(needleValve);

    // Gauge Body (Industrial stainless round housing)
    const gaugeBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.15, 0.05, 24),
      this.mats.structuralSteelDark
    );
    gaugeBody.rotation.z = Math.PI / 2;
    gaugeBody.position.set(-0.38, 1.50, 0);
    this.group.add(gaugeBody);

    // Gauge Face Dial (0 - 3000 PSI with colored operating zones)
    const gaugeFace = new THREE.Mesh(new THREE.CircleGeometry(0.14, 24), this.mats.gaugeDial);
    gaugeFace.rotation.y = -Math.PI / 2;
    gaugeFace.position.set(-0.406, 1.50, 0);
    this.group.add(gaugeFace);

    // 8. Top Swab Valve (Wireline access gate valve atop tee)
    const swabValveBody = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.24, 0.28),
      this.mats.wellheadSteel
    );
    swabValveBody.position.set(0, 1.84, 0);
    this.group.add(swabValveBody);

    const swabWheel = this.createHandwheel(0.16);
    swabWheel.position.set(0, 1.84, 0.25);
    this.group.add(swabWheel);

    // 9. Heavy Flanged Stuffing Box & Brass Packing Gland Follower
    // Accommodates reciprocating polished rod with oil-tight seal
    const stuffingBoxBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.22, 0.38, 24),
      this.mats.wellheadSteel
    );
    stuffingBoxBody.position.set(0, 2.18, 0);
    stuffingBoxBody.castShadow = true;
    this.group.add(stuffingBoxBody);

    // Brass Packing Gland Nut / Follower atop stuffing box
    const brassGland = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.14, 0.12, 16),
      this.mats.brassFitting
    );
    brassGland.position.set(0, 2.40, 0);
    this.group.add(brassGland);

    // High-Pressure Grease Lubricator Nipple on stuffing box side
    const lubricator = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015, 0.015, 0.08, 8),
      this.mats.brassFitting
    );
    lubricator.rotation.z = Math.PI / 2;
    lubricator.position.set(0.18, 2.22, 0);
    this.group.add(lubricator);

    // 10. Stuffing Box Oil Drip Catch Pan (Captures seal leakage with dark pooled crude oil)
    const dripPan = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.36, 0.14, 24),
      this.mats.castIron
    );
    dripPan.position.set(0, 2.05, 0);
    this.group.add(dripPan);

    // Glistening pooled crude oil in the catch pan
    const dripPanOil = new THREE.Mesh(
      new THREE.CylinderGeometry(0.39, 0.39, 0.06, 24),
      this.mats.crudeOil
    );
    dripPanOil.position.set(0, 2.08, 0);
    this.group.add(dripPanOil);

    return {
      sightGlassOil,
      dripPanOil
    };
  }

  /**
   * Helper: Creates an authentic 4-spoke cast iron industrial valve handwheel
   */
  private createHandwheel(radius: number): THREE.Group {
    const wheelGroup = new THREE.Group();

    // Outer rim
    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(radius, radius * 0.14, 8, 24),
      this.mats.valveHandwheel
    );
    wheelGroup.add(rim);

    // Central hub
    const hub = new THREE.Mesh(
      new THREE.CylinderGeometry(radius * 0.28, radius * 0.28, radius * 0.18, 12),
      this.mats.wellheadSteel
    );
    hub.rotation.x = Math.PI / 2;
    wheelGroup.add(hub);

    // 4 Cast Spokes
    for (let s = 0; s < 4; s++) {
      const ang = (s / 4) * Math.PI * 2;
      const spoke = new THREE.Mesh(
        new THREE.CylinderGeometry(radius * 0.08, radius * 0.08, radius * 0.9, 8),
        this.mats.valveHandwheel
      );
      spoke.position.set(Math.cos(ang) * (radius * 0.45), Math.sin(ang) * (radius * 0.45), 0);
      spoke.rotation.z = ang - Math.PI / 2;
      wheelGroup.add(spoke);
    }

    return wheelGroup;
  }
}
