import * as THREE from 'three';
import { ProceduralTextures } from '../textures/ProceduralTextures.ts';

/**
 * Facilities.ts
 * Surface Processing Facilities with Visible Oil in Surface Systems:
 * 1. Steam Generator Facility (left) with tall boiler column, steam vessel, pipe rack, and animated steam plume.
 * 2. Production Facility / Tank Battery (right) with dual crude storage tanks and electrical MCC enclosure.
 * 3. 3-Phase Separator Cutaway: SHOWING SEPARATED CRUDE OIL, PRODUCED WATER & GAS LAYERS!
 * 4. Oil Storage Tank Sight Glass & Cutaway Window: SHOWING STORED CRUDE OIL!
 * 5. Surface Flowline Cutaway Sight Glass: SHOWING SURGING CRUDE OIL PULSES!
 */

export class Facilities {
  public readonly root: THREE.Group;

  // Animated elements
  private _steamParticles: THREE.Points;
  private _particlePositions: Float32Array;
  private _particleVelocities: Float32Array;
  private _steamFlowMarkers: THREE.Mesh[] = [];
  private _flowProgress: number = 0;

  // Visible Oil In Surface Facilities
  private _flowlineSightGlassOil!: THREE.Mesh;
  private _tankOilSightGlassLevel!: THREE.Mesh;
  private _tankOilInteriorLiquid!: THREE.Mesh;
  private _separatorOilLayer!: THREE.Mesh;
  private _separatorWaterLayer!: THREE.Mesh;

  // Materials
  private _steelMat: THREE.MeshStandardMaterial;
  private _tankMat: THREE.MeshStandardMaterial;
  private _pipeMat: THREE.MeshStandardMaterial;
  private _steamPipeMat: THREE.MeshStandardMaterial;
  private _glowRedMat: THREE.MeshBasicMaterial;
  private _concreteMat: THREE.MeshStandardMaterial;
  private _greenHousingMat: THREE.MeshStandardMaterial;
  private _glassMat: THREE.MeshPhysicalMaterial;
  private _oilMat: THREE.MeshPhysicalMaterial;

  constructor() {
    this.root = new THREE.Group();
    this.root.name = 'SurfaceFacilities';

    // Materials
    this._steelMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.4,
      metalness: 0.8
    });

    this._tankMat = new THREE.MeshStandardMaterial({
      map: ProceduralTextures.getBrushedTankSteel(),
      roughness: 0.35,
      metalness: 0.85
    });

    this._pipeMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.45,
      metalness: 0.75
    });

    this._steamPipeMat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      roughness: 0.5,
      metalness: 0.6
    });

    this._glowRedMat = new THREE.MeshBasicMaterial({
      color: 0xf43f5e
    });

    this._concreteMat = new THREE.MeshStandardMaterial({
      map: ProceduralTextures.getConcrete(),
      roughness: 0.9,
      metalness: 0.1
    });

    this._greenHousingMat = new THREE.MeshStandardMaterial({
      color: 0x2e6f40,
      roughness: 0.5,
      metalness: 0.4
    });

    this._glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xe0f2fe,
      roughness: 0.05,
      transmission: 0.9,
      transparent: true,
      opacity: 0.55,
      depthWrite: false
    });

    this._oilMat = new THREE.MeshPhysicalMaterial({
      color: 0x0f0b08,
      map: ProceduralTextures.getCrudeOilTexture(),
      roughness: 0.15,
      metalness: 0.1,
      clearcoat: 1.0,
      clearcoatRoughness: 0.08,
      transparent: true,
      opacity: 0.96
    });

    // 1. Build Left: Steam Generator Plant
    this.buildSteamGeneratorPlant();

    // 2. Build Right: Production Storage Tank Battery (with visible oil!)
    this.buildProductionTankBattery();

    // 3. Build Steam Injection Pipeline & Flow Pulse Indicators
    this.buildSteamInjectionLine();

    // 4. Build Production Oil Flowline to Tanks (with visible pulsing oil!)
    this.buildOilProductionPipeline();

    // 5. Initialize Rising Steam Particles
    const { particles, positions, velocities } = this.initSteamParticles();
    this._steamParticles = particles;
    this._particlePositions = positions;
    this._particleVelocities = velocities;
    this.root.add(particles);
  }

  /**
   * Left: Industrial Steam Generator Plant
   */
  private buildSteamGeneratorPlant(): void {
    const steamPlant = new THREE.Group();
    steamPlant.name = 'SteamGeneratorPlant';
    steamPlant.position.set(-11.5, 0, 3.5);

    // Concrete Pad
    const pad = new THREE.Mesh(new THREE.BoxGeometry(6.5, 0.3, 5.5), this._concreteMat);
    pad.position.set(0, 0.15, 0);
    pad.receiveShadow = true;
    steamPlant.add(pad);

    // Tall Vertical Distillation / Steam Boiler Column
    const towerHeight = 7.5;
    const towerRadius = 0.45;
    const tower = new THREE.Mesh(
      new THREE.CylinderGeometry(towerRadius, towerRadius, towerHeight, 24),
      this._tankMat
    );
    tower.position.set(-1.8, towerHeight * 0.5 + 0.3, -1.0);
    tower.castShadow = true;
    steamPlant.add(tower);

    // Rings on the tower
    for (let y = 1.0; y < towerHeight; y += 1.2) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(towerRadius + 0.03, 0.025, 8, 24),
        this._glowRedMat
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.set(-1.8, y + 0.3, -1.0);
      steamPlant.add(ring);
    }

    // Top exhaust cap
    const topCap = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.35, 0.4, 20), this._steelMat);
    topCap.position.set(-1.8, towerHeight + 0.5, -1.0);
    steamPlant.add(topCap);

    // Steam Accumulator Tank (emitting steam)
    const vesselRadius = 0.65;
    const vesselHeight = 2.2;
    const vessel = new THREE.Mesh(
      new THREE.CylinderGeometry(vesselRadius, vesselRadius, vesselHeight, 24),
      this._tankMat
    );
    vessel.position.set(-2.2, vesselHeight * 0.5 + 0.3, 1.6);
    vessel.castShadow = true;
    steamPlant.add(vessel);

    // Dome cap on vessel
    const dome = new THREE.Mesh(new THREE.SphereGeometry(vesselRadius, 20, 16, 0, Math.PI * 2, 0, Math.PI / 2), this._tankMat);
    dome.position.set(-2.2, vesselHeight + 0.3, 1.6);
    steamPlant.add(dome);

    // Structural Steel Framework / Pipe Rack
    const frame = new THREE.Group();
    const fWidth = 3.6;
    const fDepth = 2.8;
    const fHeight = 3.2;

    // Corner posts
    [
      { x: -fWidth * 0.5, z: -fDepth * 0.5 },
      { x: fWidth * 0.5, z: -fDepth * 0.5 },
      { x: -fWidth * 0.5, z: fDepth * 0.5 },
      { x: fWidth * 0.5, z: fDepth * 0.5 }
    ].forEach(pt => {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, fHeight, 0.08), this._steelMat);
      post.position.set(pt.x + 0.8, fHeight * 0.5 + 0.3, pt.z + 0.2);
      post.castShadow = true;
      frame.add(post);
    });

    // Cross beams
    [1.6, 3.1].forEach(y => {
      const b1 = new THREE.Mesh(new THREE.BoxGeometry(fWidth, 0.08, 0.08), this._steelMat);
      b1.position.set(0.8, y + 0.3, -fDepth * 0.5 + 0.2);
      frame.add(b1);
      const b2 = new THREE.Mesh(new THREE.BoxGeometry(fWidth, 0.08, 0.08), this._steelMat);
      b2.position.set(0.8, y + 0.3, fDepth * 0.5 + 0.2);
      frame.add(b2);
    });

    steamPlant.add(frame);

    // Complex interconnected pipes and manifold loops
    const pipePoints = [
      new THREE.Vector3(-1.8, 4.0, -1.0),
      new THREE.Vector3(0.0, 4.0, -1.0),
      new THREE.Vector3(0.0, 1.8, -1.0),
      new THREE.Vector3(1.2, 1.8, 0.2),
      new THREE.Vector3(1.2, 0.6, 1.8)
    ];
    const curve = new THREE.CatmullRomCurve3(pipePoints);
    const manifoldGeo = new THREE.TubeGeometry(curve, 32, 0.07, 12, false);
    const manifoldMesh = new THREE.Mesh(manifoldGeo, this._pipeMat);
    steamPlant.add(manifoldMesh);

    this.root.add(steamPlant);
  }

  /**
   * Right: Production Storage Tank Battery, 3-Phase Separator with Visible Oil & Water Layers
   */
  private buildProductionTankBattery(): void {
    const tankBattery = new THREE.Group();
    tankBattery.name = 'ProductionTankBattery';
    tankBattery.position.set(10.5, 0, 3.5);

    // Concrete Pad
    const pad = new THREE.Mesh(new THREE.BoxGeometry(7.5, 0.3, 5.5), this._concreteMat);
    pad.position.set(0, 0.15, 0);
    pad.receiveShadow = true;
    tankBattery.add(pad);

    // Dual Large Cylindrical Storage Tanks
    const tankRadius = 1.45;
    const tankHeight = 3.6;

    [-1.8, 1.8].forEach(xOffset => {
      const isOilTank = xOffset < 0; // Left tank is Crude Oil, Right is Produced Water
      const tankGroup = new THREE.Group();
      tankGroup.position.set(xOffset, 0.3, 0);

      // Tank Body
      const body = new THREE.Mesh(
        new THREE.CylinderGeometry(tankRadius, tankRadius, tankHeight, 32),
        this._tankMat
      );
      body.position.y = tankHeight * 0.5;
      body.castShadow = true;
      body.receiveShadow = true;
      tankGroup.add(body);

      // Conical Domed Roof
      const roof = new THREE.Mesh(
        new THREE.ConeGeometry(tankRadius * 1.05, 0.55, 32),
        this._tankMat
      );
      roof.position.y = tankHeight + 0.275;
      roof.castShadow = true;
      tankGroup.add(roof);

      // Top Vent Valve / Thief Hatch
      const vent = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.35, 12), this._steelMat);
      vent.position.set(0, tankHeight + 0.65, 0);
      tankGroup.add(vent);

      // Vertical Access Ladder
      const ladder = new THREE.Group();
      const lWidth = 0.4;
      const ladderRungs = 12;
      for (let r = 0; r < ladderRungs; r++) {
        const ry = 0.3 + (r / ladderRungs) * (tankHeight - 0.2);
        const rung = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, lWidth, 8), this._steelMat);
        rung.rotation.z = Math.PI / 2;
        rung.position.set(0, ry, tankRadius + 0.08);
        ladder.add(rung);
      }
      tankGroup.add(ladder);

      // FOR CRUDE OIL STORAGE TANK: SHOWING VISIBLE OIL IN THE TANK!
      if (isOilTank) {
        // 1. External Tubular Liquid Level Sight Glass on Tank Side
        const sightGlassFrame = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, tankHeight * 0.8, 12), this._glassMat);
        sightGlassFrame.position.set(-tankRadius - 0.12, tankHeight * 0.5, 0);
        tankGroup.add(sightGlassFrame);

        // Dark Viscous Crude Oil Level inside the Sight Glass
        this._tankOilSightGlassLevel = new THREE.Mesh(
          new THREE.CylinderGeometry(0.045, 0.045, tankHeight * 0.65, 12),
          this._oilMat
        );
        this._tankOilSightGlassLevel.position.set(-tankRadius - 0.12, tankHeight * 0.42, 0);
        tankGroup.add(this._tankOilSightGlassLevel);

        // 2. Cutaway Inspection Port / Acrylic Manway Window into the Tank Shell
        const manwayRim = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.04, 8, 24), this._steelMat);
        manwayRim.position.set(0, 1.8, tankRadius + 0.02);
        tankGroup.add(manwayRim);

        const manwayGlass = new THREE.Mesh(new THREE.CircleGeometry(0.40, 24), this._glassMat);
        manwayGlass.position.set(0, 1.8, tankRadius + 0.03);
        tankGroup.add(manwayGlass);

        // Viscous Crude Oil Liquid Pool inside the Tank (viewable through manway)
        this._tankOilInteriorLiquid = new THREE.Mesh(
          new THREE.CylinderGeometry(tankRadius * 0.95, tankRadius * 0.95, 1.6, 24),
          this._oilMat
        );
        this._tankOilInteriorLiquid.position.set(0, 0.8, 0);
        tankGroup.add(this._tankOilInteriorLiquid);
      }

      tankBattery.add(tankGroup);
    });

    // 3-PHASE HORIZONTAL PRODUCTION SEPARATOR (SHOWING OIL, WATER & GAS STRATIFICATION)
    const sepGroup = new THREE.Group();
    sepGroup.name = 'ThreePhaseSeparator';
    sepGroup.position.set(0, 0.85, 2.2);

    const sepLength = 2.4;
    const sepRadius = 0.42;

    // Horizontal Steel Vessel Body
    const sepBody = new THREE.Mesh(
      new THREE.CylinderGeometry(sepRadius, sepRadius, sepLength, 24),
      this._steelMat
    );
    sepBody.rotation.z = Math.PI / 2;
    sepBody.castShadow = true;
    sepGroup.add(sepBody);

    // Front Cutaway Panoramic Observation Window (Cut into vessel front facing +Z)
    const windowFrame = new THREE.Mesh(
      new THREE.BoxGeometry(sepLength * 0.72, 0.46, 0.06),
      this._steelMat
    );
    windowFrame.position.set(0, 0.02, sepRadius + 0.01);
    sepGroup.add(windowFrame);

    const windowGlass = new THREE.Mesh(
      new THREE.PlaneGeometry(sepLength * 0.68, 0.40),
      this._glassMat
    );
    windowGlass.position.set(0, 0.02, sepRadius + 0.045);
    sepGroup.add(windowGlass);

    // VISIBLE STRATIFIED FLUID LAYERS INSIDE THE SEPARATOR:
    // 1. Produced Water Layer at bottom of vessel (blue-grey brine)
    const waterLayerGeo = new THREE.BoxGeometry(sepLength * 0.66, 0.16, 0.08);
    this._separatorWaterLayer = new THREE.Mesh(
      waterLayerGeo,
      new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.3, transparent: true, opacity: 0.88 })
    );
    this._separatorWaterLayer.position.set(0, -0.10, sepRadius + 0.03);
    sepGroup.add(this._separatorWaterLayer);

    // 2. Thick Viscous Crude Oil Layer floating in middle (rich dark amber-black crude)
    const oilLayerGeo = new THREE.BoxGeometry(sepLength * 0.66, 0.20, 0.08);
    this._separatorOilLayer = new THREE.Mesh(oilLayerGeo, this._oilMat);
    this._separatorOilLayer.position.set(0, 0.08, sepRadius + 0.03);
    sepGroup.add(this._separatorOilLayer);

    // Internal soft illuminated glow to make fluid layers shine through window
    const sepLight = new THREE.PointLight(0xfbbf24, 0.8, 2.0);
    sepLight.position.set(0, 0.12, sepRadius);
    sepGroup.add(sepLight);

    // End caps
    [-1.2, 1.2].forEach(x => {
      const cap = new THREE.Mesh(
        new THREE.SphereGeometry(sepRadius, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2),
        this._steelMat
      );
      cap.rotation.z = x > 0 ? -Math.PI / 2 : Math.PI / 2;
      cap.position.set(x, 0, 0);
      sepGroup.add(cap);
    });

    // Saddle supports
    [-0.7, 0.7].forEach(x => {
      const saddle = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.5, 0.9), this._steelMat);
      saddle.position.set(x, -0.3, 0);
      sepGroup.add(saddle);
    });

    // Internal Vertical Weir Baffle Plate separating clean oil bucket
    const weir = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.45, 0.1), this._steelMat);
    weir.position.set(0.55, 0.0, sepRadius + 0.02);
    sepGroup.add(weir);

    // External Magnetic Level Gauge Column on Separator End
    const sepGauge = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.65, 8), this._glassMat);
    sepGauge.position.set(-1.25, 0.05, 0.35);
    sepGroup.add(sepGauge);

    const oilFloat = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.18, 8), this._oilMat);
    oilFloat.position.set(-1.25, 0.1, 0.35);
    sepGroup.add(oilFloat);

    // Gas Dome & Pressure Relief Valve on top of separator
    const gasDome = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.35, 12), this._steelMat);
    gasDome.position.set(0, 0.55, 0);
    sepGroup.add(gasDome);

    // Oil line from separator to Oil Tank (-1.8)
    const oilPipePoints = [
      new THREE.Vector3(-1.0, 0.2, 0.0),
      new THREE.Vector3(-1.8, 0.2, 0.0),
      new THREE.Vector3(-1.8, 1.8, -1.2)
    ];
    const oilPipe = new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(oilPipePoints), 20, 0.04, 8, false),
      this._pipeMat
    );
    sepGroup.add(oilPipe);

    // Water line from separator to Water Tank (+1.8)
    const waterPipePoints = [
      new THREE.Vector3(1.0, -0.2, 0.0),
      new THREE.Vector3(1.8, -0.2, 0.0),
      new THREE.Vector3(1.8, 1.8, -1.2)
    ];
    const waterPipe = new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(waterPipePoints), 20, 0.04, 8, false),
      new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.4 })
    );
    sepGroup.add(waterPipe);

    tankBattery.add(sepGroup);

    // Green Electrical MCC Enclosure Cabinet
    const mcc = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.1, 0.85), this._greenHousingMat);
    mcc.position.set(-1.8, 0.85, 2.2);
    mcc.castShadow = true;
    tankBattery.add(mcc);

    // Louver vents on MCC
    const ventMesh = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.4, 0.02), this._steelMat);
    ventMesh.position.set(-1.8, 0.85, 2.63);
    tankBattery.add(ventMesh);

    this.root.add(tankBattery);
  }

  /**
   * Steam Injection Pipeline:
   * Connects Steam Generator (-10.5, 0, 3.5) across the ground to Wellhead (4.0, 0, 0)
   */
  private buildSteamInjectionLine(): void {
    const pipeGroup = new THREE.Group();
    pipeGroup.name = 'SteamInjectionLine';

    const points = [
      new THREE.Vector3(-10.2, 0.45, 5.0),
      new THREE.Vector3(-7.5, 0.45, 4.0),
      new THREE.Vector3(-4.5, 0.45, 2.8),
      new THREE.Vector3(-1.5, 0.45, 1.8),
      new THREE.Vector3(1.5, 0.45, 0.8),
      new THREE.Vector3(3.8, 0.75, 0.0)
    ];

    const curve = new THREE.CatmullRomCurve3(points);
    const pipeGeo = new THREE.TubeGeometry(curve, 64, 0.09, 16, false);
    const pipeMesh = new THREE.Mesh(pipeGeo, this._steamPipeMat);
    pipeMesh.castShadow = true;
    pipeGroup.add(pipeMesh);

    // Glowing Red/Orange Directional Flow Markers along the pipe
    const markerCount = 7;
    const coneGeo = new THREE.ConeGeometry(0.12, 0.28, 12);
    coneGeo.rotateX(Math.PI / 2);

    for (let i = 0; i < markerCount; i++) {
      const marker = new THREE.Mesh(coneGeo, this._glowRedMat);
      pipeGroup.add(marker);
      this._steamFlowMarkers.push(marker);
    }

    this.root.add(pipeGroup);
  }

  /**
   * Oil Production Pipeline:
   * Connects Wellhead (4.0, 0, 0) across the ground to Separator (10.5, 0, 3.5)
   * WITH TRANSPARENT SIGHT GLASS SECTION SHOWING SURGING CRUDE OIL!
   */
  private buildOilProductionPipeline(): void {
    const pipeGroup = new THREE.Group();
    pipeGroup.name = 'OilProductionLine';

    const points = [
      new THREE.Vector3(4.2, 0.88, 0.35),
      new THREE.Vector3(6.5, 0.45, 0.5),
      new THREE.Vector3(8.5, 0.45, 1.5),
      new THREE.Vector3(9.5, 0.45, 3.0),
      new THREE.Vector3(10.5, 1.2, 3.5)
    ];

    const curve = new THREE.CatmullRomCurve3(points);
    const pipeGeo = new THREE.TubeGeometry(curve, 48, 0.08, 16, false);
    const pipeMesh = new THREE.Mesh(pipeGeo, this._pipeMat);
    pipeMesh.castShadow = true;
    pipeGroup.add(pipeMesh);

    // Support stanchions
    [6.0, 8.0, 9.5].forEach(x => {
      const stanchion = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.5, 8), this._steelMat);
      stanchion.position.set(x, 0.25, (x - 4.2) * 0.4);
      pipeGroup.add(stanchion);
    });

    // Transparent Cutaway Sight Glass Tube along Flowline (X = 6.2 to 7.4m)
    const glassPoints = [
      new THREE.Vector3(6.2, 0.45, 0.48),
      new THREE.Vector3(7.4, 0.45, 0.95)
    ];
    const glassTubeGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(glassPoints), 16, 0.095, 16, false);
    const glassTube = new THREE.Mesh(glassTubeGeo, this._glassMat);
    pipeGroup.add(glassTube);

    // Pulsing, Surging Crude Oil Core inside the Flowline Sight Glass!
    const oilCoreGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(glassPoints), 16, 0.075, 16, false);
    this._flowlineSightGlassOil = new THREE.Mesh(oilCoreGeo, this._oilMat);
    pipeGroup.add(this._flowlineSightGlassOil);

    this.root.add(pipeGroup);
  }

  /**
   * Animated Steam Particles billowing from steam accumulator
   */
  private initSteamParticles(): {
    particles: THREE.Points;
    positions: Float32Array;
    velocities: Float32Array;
  } {
    const particleCount = 120;
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);

    const emitterPos = new THREE.Vector3(-13.7, 2.8, 5.1);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = emitterPos.x + (Math.random() - 0.5) * 0.4;
      positions[i * 3 + 1] = emitterPos.y + Math.random() * 2.5;
      positions[i * 3 + 2] = emitterPos.z + (Math.random() - 0.5) * 0.4;

      velocities[i * 3] = (Math.random() - 0.3) * 0.15;
      velocities[i * 3 + 1] = 0.4 + Math.random() * 0.6;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.15;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.35,
      transparent: true,
      opacity: 0.45,
      depthWrite: false
    });

    const particles = new THREE.Points(geo, mat);
    return { particles, positions, velocities };
  }

  /**
   * Main per-frame animation update for steam, flow markers & surface oil animations
   */
  public update(deltaTime: number, flowSpeedFactor: number = 0.5): void {
    // 1. Billowing steam plume
    const posAttr = this._steamParticles.geometry.attributes.position as THREE.BufferAttribute;
    const pos = this._particlePositions;
    const vel = this._particleVelocities;
    const emitterY = 2.8;
    const maxY = emitterY + 3.5;

    for (let i = 0; i < pos.length / 3; i++) {
      pos[i * 3] += vel[i * 3] * deltaTime;
      pos[i * 3 + 1] += vel[i * 3 + 1] * deltaTime;
      pos[i * 3 + 2] += vel[i * 3 + 2] * deltaTime;

      if (pos[i * 3 + 1] > maxY) {
        pos[i * 3] = -13.7 + (Math.random() - 0.5) * 0.3;
        pos[i * 3 + 1] = emitterY;
        pos[i * 3 + 2] = 5.1 + (Math.random() - 0.5) * 0.3;
      }
    }
    posAttr.needsUpdate = true;

    // 2. Steam flow directional pulse along injection pipe
    this._flowProgress = (this._flowProgress + deltaTime * 0.25) % 1.0;
    const pipePoints = [
      new THREE.Vector3(-10.2, 0.45, 5.0),
      new THREE.Vector3(-7.5, 0.45, 4.0),
      new THREE.Vector3(-4.5, 0.45, 2.8),
      new THREE.Vector3(-1.5, 0.45, 1.8),
      new THREE.Vector3(1.5, 0.45, 0.8),
      new THREE.Vector3(3.8, 0.75, 0.0)
    ];
    const curve = new THREE.CatmullRomCurve3(pipePoints);

    this._steamFlowMarkers.forEach((marker, idx) => {
      const t = (this._flowProgress + idx / this._steamFlowMarkers.length) % 1.0;
      const pt = curve.getPointAt(t);
      const tangent = curve.getTangentAt(t);
      marker.position.copy(pt);
      marker.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);
    });

    // 3. Flowline Sight Glass Oil Surging Pulse
    if (this._flowlineSightGlassOil) {
      const pulse = Math.sin(performance.now() * 0.006 * Math.max(0.5, flowSpeedFactor * 4)) * 0.15 + 0.85;
      this._flowlineSightGlassOil.scale.set(pulse, 1.0, pulse);
    }

    // 4. Subtle Liquid Rippling in Storage Tank & Separator
    if (this._tankOilInteriorLiquid) {
      const ripple = Math.sin(performance.now() * 0.002) * 0.02 + 1.0;
      this._tankOilInteriorLiquid.scale.set(ripple, 1.0, ripple);
    }
    if (this._separatorOilLayer) {
      const sepWave = Math.sin(performance.now() * 0.003) * 0.03 + 1.0;
      this._separatorOilLayer.scale.set(1.0, sepWave, 1.0);
    }
  }
}
