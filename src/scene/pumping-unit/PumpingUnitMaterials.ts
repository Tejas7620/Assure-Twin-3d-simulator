import * as THREE from 'three';
import { ProceduralTextures } from '../../textures/ProceduralTextures.ts';

/**
 * PumpingUnitMaterials.ts
 * High-fidelity PBR material palette for authentic API Spec 11E Pumping Units & API 6A Wellheads:
 * - Industrial Charcoal Structural Steel with satin oilfield finish
 * - Heavy Cast Iron for Gearbox, Motor Frame, Bearing Housings, and Counterweights
 * - Mirror-Finish Chrome Machined Steel for Polished Rod, Shafts, and Wrist Pins
 * - Hot-Dip Galvanized Steel for Climbing Ladders, Cages, and Grating
 * - OSHA Safety Yellow for Machinery Guards and Sweep Railings
 * - Forged API 6A Wellhead Steel with Industrial Red Valve Handwheels
 * - Glistening Viscous Crude Oil for Stuffing Box Drip Pan and Wellhead Sight Glass
 */

export class PumpingUnitMaterials {
  public readonly structuralSteel: THREE.MeshStandardMaterial;
  public readonly structuralSteelDark: THREE.MeshStandardMaterial;
  public readonly equipmentEnamel: THREE.MeshStandardMaterial;
  public readonly castIron: THREE.MeshStandardMaterial;
  public readonly machinedChrome: THREE.MeshStandardMaterial;
  public readonly galvanizedSteel: THREE.MeshStandardMaterial;
  public readonly safetyYellow: THREE.MeshStandardMaterial;
  public readonly safetyMesh: THREE.MeshStandardMaterial;
  public readonly wellheadSteel: THREE.MeshStandardMaterial;
  public readonly valveHandwheel: THREE.MeshStandardMaterial;
  public readonly brassFitting: THREE.MeshStandardMaterial;
  public readonly wireRope: THREE.MeshStandardMaterial;
  public readonly crudeOil: THREE.MeshPhysicalMaterial;
  public readonly sightGlass: THREE.MeshPhysicalMaterial;
  public readonly gaugeDial: THREE.MeshStandardMaterial;
  public readonly concrete: THREE.MeshStandardMaterial;
  public readonly gravel: THREE.MeshStandardMaterial;
  public readonly casingSteel: THREE.MeshStandardMaterial;
  public readonly casingCutaway: THREE.MeshPhysicalMaterial;
  public readonly casingPerforations: THREE.MeshStandardMaterial;
  public readonly thermalGlow: THREE.MeshBasicMaterial;

  constructor() {
    // 1. Structural Steel (API Skid, Samson Post Legs, Walking Beam I-beam)
    this.structuralSteel = new THREE.MeshStandardMaterial({
      color: 0x24282f, // Deep industrial charcoal steel
      roughness: 0.38,
      metalness: 0.82,
      map: ProceduralTextures.getDarkIndustrialSteel()
    });

    this.structuralSteelDark = new THREE.MeshStandardMaterial({
      color: 0x181a1e,
      roughness: 0.45,
      metalness: 0.78
    });

    // 2. Oilfield Equipment Enamel (High-durability satin coating)
    this.equipmentEnamel = new THREE.MeshStandardMaterial({
      color: 0x2b323b, // Professional slate-grey oilfield enamel
      roughness: 0.35,
      metalness: 0.75
    });

    // 3. Heavy Cast Iron (Gearbox housing, counterweight segments, motor bells)
    this.castIron = new THREE.MeshStandardMaterial({
      color: 0x1e2024,
      roughness: 0.65,
      metalness: 0.65
    });

    // 4. Mirror-Finish Machined Chrome (Polished rod, journals, wrist pins)
    this.machinedChrome = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.04,
      metalness: 0.98
    });

    // 5. Galvanized Steel (Crow's nest floor, ladder, handrails)
    this.galvanizedSteel = new THREE.MeshStandardMaterial({
      color: 0x828b94,
      roughness: 0.52,
      metalness: 0.68
    });

    // 6. OSHA Safety Yellow (Belt guards, counterweight sweep fences)
    this.safetyYellow = new THREE.MeshStandardMaterial({
      color: 0xeab308,
      roughness: 0.38,
      metalness: 0.22
    });

    // 7. Safety Wire Mesh Screen (Expanded metal screen on belt guard)
    this.safetyMesh = new THREE.MeshStandardMaterial({
      map: ProceduralTextures.getSafetyCageTexture(),
      transparent: true,
      opacity: 0.88,
      side: THREE.DoubleSide
    });

    // 8. API 6A Wellhead Forged Steel
    this.wellheadSteel = new THREE.MeshStandardMaterial({
      color: 0x334155, // Industrial carbon steel
      roughness: 0.35,
      metalness: 0.85
    });

    // 9. Traditional Valve Handwheel Red (API standard safety red)
    this.valveHandwheel = new THREE.MeshStandardMaterial({
      color: 0xb91c1c, // Cast iron industrial red
      roughness: 0.32,
      metalness: 0.45
    });

    // 10. Machined Brass Gland & Instrument Fittings
    this.brassFitting = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      roughness: 0.25,
      metalness: 0.88
    });

    // 11. Braided Steel Wire Rope (Horsehead bridle cables)
    this.wireRope = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.5,
      metalness: 0.92
    });

    // 12. Heavy Crude Oil (Dark viscous liquid with golden surface sheen)
    this.crudeOil = new THREE.MeshPhysicalMaterial({
      color: 0x0f0b08,
      map: ProceduralTextures.getCrudeOilTexture(),
      roughness: 0.12,
      metalness: 0.1,
      clearcoat: 1.0,
      clearcoatRoughness: 0.06,
      transparent: false,
      opacity: 1.0
    });

    // 13. Transparent Sight Glass
    this.sightGlass = new THREE.MeshPhysicalMaterial({
      color: 0xf1f5f9,
      roughness: 0.05,
      transmission: 0.94,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    // 14. Dial Face
    this.gaugeDial = new THREE.MeshStandardMaterial({
      map: ProceduralTextures.getPressureGaugeDial(),
      roughness: 0.2
    });

    // 15. Concrete Foundation Pad
    this.concrete = new THREE.MeshStandardMaterial({
      map: ProceduralTextures.getConcrete(),
      roughness: 0.92,
      metalness: 0.08
    });

    // 16. Crushed Gravel Bed
    this.gravel = new THREE.MeshStandardMaterial({
      map: ProceduralTextures.getGravelTexture(),
      roughness: 0.96,
      metalness: 0.04
    });

    // 17. Casing Steel & Cutaway
    this.casingSteel = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.42,
      metalness: 0.85
    });

    this.casingCutaway = new THREE.MeshPhysicalMaterial({
      color: 0x94a3b8,
      roughness: 0.2,
      metalness: 0.4,
      transmission: 0.7,
      transparent: true,
      opacity: 0.45,
      depthWrite: false
    });

    this.casingPerforations = new THREE.MeshStandardMaterial({
      map: ProceduralTextures.getCasingPerforations(),
      roughness: 0.4,
      metalness: 0.85
    });

    this.thermalGlow = new THREE.MeshBasicMaterial({
      map: ProceduralTextures.getThermalFrontTexture(),
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide
    });
  }
}
