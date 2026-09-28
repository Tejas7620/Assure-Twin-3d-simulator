import * as THREE from 'three';

/**
 * ProceduralTextures.ts
 * Generates high-fidelity procedural canvas textures for:
 * - Stratified canyon rock with detailed sedimentary layers
 * - Thermal front & viscosity gradient field
 * - Painted equipment & brushed tank steel
 * - Desert earth & sky
 */

export class ProceduralTextures {
  private static _cache: Map<string, THREE.CanvasTexture> = new Map();

  /**
   * Concrete Foundation Pad Texture
   */
  public static getConcrete(): THREE.CanvasTexture {
    const key = 'concrete';
    if (this._cache.has(key)) return this._cache.get(key)!;

    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#64748b';
    ctx.fillRect(0, 0, size, size);

    const imgData = ctx.getImageData(0, 0, size, size);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const speckle = (Math.random() - 0.5) * 35;
      data[i] = Math.min(255, Math.max(0, data[i] + speckle));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + speckle));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + speckle));
    }
    ctx.putImageData(imgData, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    this._cache.set(key, texture);
    return texture;
  }

  /**
   * Stratified Canyon Rock Face (Vertical cutaway rock wall)
   * High-contrast sedimentary bands: Sandstone, Mudstone, Shale, Dolomite
   */
  public static getStratifiedRock(): THREE.CanvasTexture {
    const key = 'stratified_rock';
    if (this._cache.has(key)) return this._cache.get(key)!;

    const width = 1024;
    const height = 1024;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    // Base deep bedrock
    ctx.fillStyle = '#1c1917';
    ctx.fillRect(0, 0, width, height);

    // Multi-tiered sedimentary rock layers with geological undulating striations
    const layers = [
      { yStart: 0, yEnd: 0.15, color1: '#855938', color2: '#694125', bands: 8 },    // Surface weathered sandstone
      { yStart: 0.15, yEnd: 0.32, color1: '#4a3b32', color2: '#332720', bands: 12 },  // Hard dense siltstone
      { yStart: 0.32, yEnd: 0.52, color1: '#2e2621', color2: '#1e1814', bands: 16 },  // Dark carbonaceous shale
      { yStart: 0.52, yEnd: 0.72, color1: '#543d2b', color2: '#3d2b1e', bands: 14 },  // Porous oil-bearing sandstone
      { yStart: 0.72, yEnd: 1.00, color1: '#26201b', color2: '#14110e', bands: 20 }   // Deep basal limestone
    ];

    layers.forEach(layer => {
      const y0 = layer.yStart * height;
      const y1 = layer.yEnd * height;
      const h = y1 - y0;

      const grad = ctx.createLinearGradient(0, y0, 0, y1);
      grad.addColorStop(0, layer.color1);
      grad.addColorStop(0.5, layer.color2);
      grad.addColorStop(1, layer.color1);
      ctx.fillStyle = grad;
      ctx.fillRect(0, y0, width, h);

      // Fine horizontal bedding plane fractures
      for (let b = 0; b < layer.bands; b++) {
        const by = y0 + (b / layer.bands) * h + (Math.random() - 0.5) * 6;
        ctx.strokeStyle = Math.random() > 0.5 ? 'rgba(10, 8, 6, 0.65)' : 'rgba(120, 90, 60, 0.35)';
        ctx.lineWidth = 1 + Math.random() * 3.5;
        ctx.beginPath();
        ctx.moveTo(0, by);
        for (let x = 0; x <= width; x += 25) {
          const dy = Math.sin(x * 0.03 + b * 2) * 2.5 + (Math.random() - 0.5) * 1.5;
          ctx.lineTo(x, by + dy);
        }
        ctx.stroke();
      }
    });

    // Rock crags, vertical joint fissures and shadow cracks
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
    for (let i = 0; i < 60; i++) {
      const rx = Math.random() * width;
      const ry = Math.random() * height;
      const len = 30 + Math.random() * 120;
      ctx.lineWidth = 1 + Math.random() * 2;
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx + (Math.random() - 0.5) * 15, ry + len);
      ctx.stroke();
    }

    // Heavy grain and mineral speckling
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 28;
      data[i] = Math.min(255, Math.max(0, data[i] + noise));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise * 0.8));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise * 0.6));
    }
    ctx.putImageData(imgData, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    this._cache.set(key, texture);
    return texture;
  }

  /**
   * Thermal Front & Viscosity Gradient Field
   * Matches the reference image:
   * Left: Glowing red/orange steam heat plume
   * Center-right: Smooth transition into lime green, teal, and deep blue cold oil formation
   * Filament streamlines representing heated bitumen flow paths
   */
  public static getThermalFrontTexture(): THREE.CanvasTexture {
    const key = 'thermal_front';
    if (this._cache.has(key)) return this._cache.get(key)!;

    const width = 1024;
    const height = 512;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    // Horizontal viscosity/temperature gradient
    // 0.0 -> 0.35: Red/Orange Thermal Plume (180°C - 100°C)
    // 0.35 -> 0.55: Yellow/Lime Green Transition (100°C - 50°C)
    // 0.55 -> 0.85: Cyan / Teal Medium Viscosity (50°C - 30°C)
    // 0.85 -> 1.0: Deep Blue Unheated Reservoir (Cold heavy oil)
    const grad = ctx.createLinearGradient(0, 0, width, 0);
    grad.addColorStop(0.0, '#ff1a00');
    grad.addColorStop(0.18, '#ff5500');
    grad.addColorStop(0.35, '#ffaa00');
    grad.addColorStop(0.48, '#a3e635');
    grad.addColorStop(0.62, '#10b981');
    grad.addColorStop(0.78, '#06b6d4');
    grad.addColorStop(0.92, '#1d4ed8');
    grad.addColorStop(1.0, '#0f172a');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Glowing steam chamber core arc (left to center)
    const radial = ctx.createRadialGradient(width * 0.15, height * 0.55, 20, width * 0.25, height * 0.55, 320);
    radial.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
    radial.addColorStop(0.3, 'rgba(255, 140, 0, 0.8)');
    radial.addColorStop(0.7, 'rgba(255, 50, 0, 0.4)');
    radial.addColorStop(1, 'rgba(255, 0, 0, 0)');
    ctx.fillStyle = radial;
    ctx.fillRect(0, 0, width, height);

    // Luminous filament streamlines / thermal sweep veins (like in the image)
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#ffeedd';
    for (let i = 0; i < 35; i++) {
      ctx.strokeStyle = i < 15 ? 'rgba(255, 255, 255, 0.75)' : 'rgba(255, 200, 100, 0.5)';
      ctx.lineWidth = 1 + Math.random() * 2.5;
      ctx.beginPath();
      const startX = Math.random() * (width * 0.2);
      const startY = height * 0.35 + Math.random() * (height * 0.4);
      ctx.moveTo(startX, startY);

      let curX = startX;
      let curY = startY;
      while (curX < width * 0.65) {
        curX += 20 + Math.random() * 30;
        curY += (Math.random() - 0.48) * 18;
        ctx.lineTo(curX, curY);
      }
      ctx.stroke();
    }
    ctx.shadowBlur = 0;

    const texture = new THREE.CanvasTexture(canvas);
    this._cache.set(key, texture);
    return texture;
  }

  /**
   * Desert Soil Terrain Texture with pebbles and dry earth
   */
  public static getDesertTerrain(): THREE.CanvasTexture {
    const key = 'desert_terrain';
    if (this._cache.has(key)) return this._cache.get(key)!;

    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Warm arid earth tone
    ctx.fillStyle = '#8c6f4e';
    ctx.fillRect(0, 0, size, size);

    // Subtle patches
    for (let i = 0; i < 30; i++) {
      const px = Math.random() * size;
      const py = Math.random() * size;
      const pr = 30 + Math.random() * 80;
      ctx.fillStyle = Math.random() > 0.5 ? 'rgba(120, 95, 65, 0.35)' : 'rgba(165, 135, 95, 0.3)';
      ctx.beginPath();
      ctx.arc(px, py, pr, 0, Math.PI * 2);
      ctx.fill();
    }

    // Speckling / pebbles
    const imgData = ctx.getImageData(0, 0, size, size);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const n = (Math.random() - 0.5) * 35;
      data[i] = Math.min(255, Math.max(0, data[i] + n));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + n * 0.9));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + n * 0.7));
    }
    ctx.putImageData(imgData, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(8, 8);
    this._cache.set(key, texture);
    return texture;
  }

  /**
   * Brushed Stainless Steel for Facility Storage Tanks
   */
  public static getBrushedTankSteel(): THREE.CanvasTexture {
    const key = 'brushed_tank_steel';
    if (this._cache.has(key)) return this._cache.get(key)!;

    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(0, 0, size, size);

    // Horizontal cylindrical sheet metal seam bands
    for (let y = 0; y < size; y += 64) {
      ctx.fillStyle = 'rgba(40, 50, 60, 0.4)';
      ctx.fillRect(0, y, size, 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.fillRect(0, y + 2, size, 1);
    }

    // Vertical brush marks
    for (let x = 0; x < size; x += 4) {
      ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)';
      ctx.fillRect(x, 0, 2, size);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    this._cache.set(key, texture);
    return texture;
  }

  /**
   * Industrial Black Cast Iron & Dark Structural Steel
   */
  public static getDarkIndustrialSteel(): THREE.CanvasTexture {
    const key = 'dark_industrial_steel';
    if (this._cache.has(key)) return this._cache.get(key)!;

    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#1c1f24';
    ctx.fillRect(0, 0, size, size);

    const imgData = ctx.getImageData(0, 0, size, size);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const n = (Math.random() - 0.5) * 18;
      data[i] = Math.min(255, Math.max(0, data[i] + n));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + n));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + n));
    }
    ctx.putImageData(imgData, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    this._cache.set(key, texture);
    return texture;
  }

  /**
   * Viscous Crude Oil Liquid Texture (Deep dark amber/black with golden oil film swirls & micro-bubbles)
   */
  public static getCrudeOilTexture(): THREE.CanvasTexture {
    const key = 'crude_oil_texture';
    if (this._cache.has(key)) return this._cache.get(key)!;

    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Rich deep petroleum black-brown base
    const grad = ctx.createLinearGradient(0, 0, size, size);
    grad.addColorStop(0.0, '#120d08');
    grad.addColorStop(0.3, '#1c140d');
    grad.addColorStop(0.6, '#0d0a07');
    grad.addColorStop(1.0, '#17100b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    // Viscous fluid streaks and oil slicks (golden amber highlights)
    ctx.shadowBlur = 8;
    ctx.shadowColor = 'rgba(217, 119, 6, 0.4)';
    for (let i = 0; i < 28; i++) {
      const y = Math.random() * size;
      const h = 8 + Math.random() * 24;
      const swirlGrad = ctx.createLinearGradient(0, y, size, y + h);
      swirlGrad.addColorStop(0, 'rgba(180, 83, 9, 0.0)');
      swirlGrad.addColorStop(0.4, 'rgba(217, 119, 6, 0.25)');
      swirlGrad.addColorStop(0.7, 'rgba(245, 158, 11, 0.15)');
      swirlGrad.addColorStop(1, 'rgba(146, 64, 14, 0.0)');
      ctx.fillStyle = swirlGrad;
      ctx.beginPath();
      ctx.ellipse(size * 0.5 + (Math.random() - 0.5) * 160, y, size * 0.45, h, (Math.random() - 0.5) * 0.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    // Dissolved micro-bubbles in the oil
    for (let i = 0; i < 70; i++) {
      const bx = Math.random() * size;
      const by = Math.random() * size;
      const br = 1.2 + Math.random() * 2.8;
      ctx.fillStyle = 'rgba(251, 191, 36, 0.55)';
      ctx.beginPath();
      ctx.arc(bx, by, br, 0, Math.PI * 2);
      ctx.fill();
      // Highlight dot
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.beginPath();
      ctx.arc(bx - br * 0.3, by - br * 0.3, br * 0.35, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    this._cache.set(key, texture);
    return texture;
  }

  /**
   * API 6A Pressure Gauge Dial Texture (0-3000 PSI with colored safety arc and needle)
   */
  public static getPressureGaugeDial(): THREE.CanvasTexture {
    const key = 'pressure_gauge_dial';
    if (this._cache.has(key)) return this._cache.get(key)!;

    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    const cx = size * 0.5;
    const cy = size * 0.5;
    const r = size * 0.46;

    // Bezel
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    // White dial face
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.92, 0, Math.PI * 2);
    ctx.fill();

    // Colored operating zone arcs (Green: 0-1800 PSI, Yellow: 1800-2400, Red: 2400-3000)
    const startAngle = Math.PI * 0.75;
    const endAngle = Math.PI * 2.25;
    const totalArc = endAngle - startAngle;

    // Green normal zone
    ctx.lineWidth = 10;
    ctx.strokeStyle = '#10b981';
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.78, startAngle, startAngle + totalArc * 0.6);
    ctx.stroke();

    // Yellow warning zone
    ctx.strokeStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.78, startAngle + totalArc * 0.6, startAngle + totalArc * 0.82);
    ctx.stroke();

    // Red critical pressure zone
    ctx.strokeStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.78, startAngle + totalArc * 0.82, endAngle);
    ctx.stroke();

    // Tick marks and numbers
    ctx.strokeStyle = '#0f172a';
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 18px Inter, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const maxPSI = 3000;
    for (let i = 0; i <= 30; i++) {
      const angle = startAngle + (i / 30) * totalArc;
      const isMajor = i % 5 === 0;
      const innerR = isMajor ? r * 0.65 : r * 0.72;
      const outerR = r * 0.76;

      ctx.lineWidth = isMajor ? 3.5 : 1.5;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * innerR, cy + Math.sin(angle) * innerR);
      ctx.lineTo(cx + Math.cos(angle) * outerR, cy + Math.sin(angle) * outerR);
      ctx.stroke();

      if (isMajor) {
        const val = Math.round((i / 30) * maxPSI);
        const textR = r * 0.52;
        ctx.fillText(val.toString(), cx + Math.cos(angle) * textR, cy + Math.sin(angle) * textR);
      }
    }

    // Title text
    ctx.font = 'bold 15px Inter, Arial, sans-serif';
    ctx.fillStyle = '#334155';
    ctx.fillText('API 6A WELLHEAD', cx, cy - 40);
    ctx.font = '12px Inter, Arial, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText('PSI x 100', cx, cy + 50);

    // Indicator Needle pointing to ~1450 PSI
    const needleAngle = startAngle + (1450 / 3000) * totalArc;
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx - Math.cos(needleAngle) * 15, cy - Math.sin(needleAngle) * 15);
    ctx.lineTo(cx + Math.cos(needleAngle) * (r * 0.72), cy + Math.sin(needleAngle) * (r * 0.72));
    ctx.stroke();

    // Center pivot cap
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(cx, cy, 10, 0, Math.PI * 2);
    ctx.fill();

    const texture = new THREE.CanvasTexture(canvas);
    this._cache.set(key, texture);
    return texture;
  }

  /**
   * Heavy Industrial Safety Guard Mesh (Yellow expanded wire mesh for rotating machinery)
   */
  public static getSafetyCageTexture(): THREE.CanvasTexture {
    const key = 'safety_cage_texture';
    if (this._cache.has(key)) return this._cache.get(key)!;

    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Transparent background
    ctx.clearRect(0, 0, size, size);

    // OSHA Yellow diamond wire mesh grating
    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 3;

    const step = 24;
    for (let x = -size; x <= size * 2; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + size, size);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(x, size);
      ctx.lineTo(x + size, 0);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 4);
    this._cache.set(key, texture);
    return texture;
  }

  /**
   * Crushed Stone & Gravel Work Pad for Heavy Oil Equipment Foundation
   */
  public static getGravelTexture(): THREE.CanvasTexture {
    const key = 'gravel_texture';
    if (this._cache.has(key)) return this._cache.get(key)!;

    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Grey-beige aggregate base
    ctx.fillStyle = '#78716c';
    ctx.fillRect(0, 0, size, size);

    // Hundreds of crushed stone fragments
    for (let i = 0; i < 450; i++) {
      const gx = Math.random() * size;
      const gy = Math.random() * size;
      const gr = 3 + Math.random() * 7;
      const colors = ['#a8a29e', '#57534e', '#d6d3d1', '#44403c', '#78716c', '#292524'];
      ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
      ctx.beginPath();
      const points = 5 + Math.floor(Math.random() * 3);
      for (let p = 0; p < points; p++) {
        const ang = (p / points) * Math.PI * 2;
        const rad = gr * (0.7 + Math.random() * 0.6);
        const px = gx + Math.cos(ang) * rad;
        const py = gy + Math.sin(ang) * rad;
        if (p === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
    }

    // Occasional dark oil stain spots from maintenance
    for (let i = 0; i < 15; i++) {
      const ox = Math.random() * size;
      const oy = Math.random() * size;
      const or = 8 + Math.random() * 25;
      const oilGrad = ctx.createRadialGradient(ox, oy, 2, ox, oy, or);
      oilGrad.addColorStop(0, 'rgba(28, 25, 23, 0.65)');
      oilGrad.addColorStop(0.7, 'rgba(41, 37, 36, 0.3)');
      oilGrad.addColorStop(1, 'rgba(68, 64, 60, 0.0)');
      ctx.fillStyle = oilGrad;
      ctx.beginPath();
      ctx.arc(ox, oy, or, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(6, 6);
    this._cache.set(key, texture);
    return texture;
  }

  /**
   * Casing Perforations Texture (Drilled bullet holes in wellbore pipe with crude oil seepage)
   */
  public static getCasingPerforations(): THREE.CanvasTexture {
    const key = 'casing_perforations';
    if (this._cache.has(key)) return this._cache.get(key)!;

    const width = 1024;
    const height = 256;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    // Steel casing body
    ctx.fillStyle = '#475569';
    ctx.fillRect(0, 0, width, height);

    // Jet-perforated hole patterns (4 shots per foot in helical phasing)
    const rows = 5;
    const cols = 28;
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        const hx = (c / cols) * width + ((r % 2) * (width / cols) * 0.5);
        const hy = ((r + 0.5) / rows) * height;
        const radius = 6.5;

        // Dark crude oil halo / seepage around perforation
        const haloGrad = ctx.createRadialGradient(hx, hy, radius, hx, hy, radius * 3.5);
        haloGrad.addColorStop(0, 'rgba(18, 13, 8, 0.95)');
        haloGrad.addColorStop(0.5, 'rgba(180, 83, 9, 0.5)');
        haloGrad.addColorStop(1, 'rgba(71, 85, 105, 0.0)');
        ctx.fillStyle = haloGrad;
        ctx.beginPath();
        ctx.arc(hx, hy, radius * 3.5, 0, Math.PI * 2);
        ctx.fill();

        // Dark circular perforation hole
        ctx.fillStyle = '#09090b';
        ctx.beginPath();
        ctx.arc(hx, hy, radius, 0, Math.PI * 2);
        ctx.fill();

        // Burred metal rim highlight
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(hx, hy, radius, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    this._cache.set(key, texture);
    return texture;
  }

  /**
   * 3-Phase Separator Cutaway Fluid Layers (Gas cap -> Crude Oil layer -> Produced Water layer)
   */
  public static getSeparatorFluidTexture(): THREE.CanvasTexture {
    const key = 'separator_fluid_texture';
    if (this._cache.has(key)) return this._cache.get(key)!;

    const width = 512;
    const height = 512;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    // Vertical stratification:
    // Top 30%: Natural Gas / Vapor space (subtle luminous misty cyan-white)
    // Middle 45%: Heavy Crude Oil Emulsion (Rich viscous amber-black)
    // Bottom 25%: Produced Brine Water (Grey-blue cloudy liquid)
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0.0, 'rgba(224, 242, 254, 0.25)'); // Gas dome
    grad.addColorStop(0.28, 'rgba(186, 230, 253, 0.35)');
    grad.addColorStop(0.30, 'rgba(217, 119, 6, 0.95)');   // Oil foam meniscus
    grad.addColorStop(0.35, 'rgba(28, 20, 13, 0.98)');   // Dense crude oil
    grad.addColorStop(0.72, 'rgba(67, 56, 202, 0.7)');    // Emulsion interface
    grad.addColorStop(0.75, 'rgba(14, 116, 144, 0.95)');  // Produced water layer
    grad.addColorStop(1.0, 'rgba(8, 47, 73, 0.98)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Froth / bubbles along oil interface
    for (let i = 0; i < 60; i++) {
      const bx = Math.random() * width;
      const by = height * 0.30 + (Math.random() - 0.5) * 12;
      ctx.fillStyle = 'rgba(251, 191, 36, 0.7)';
      ctx.beginPath();
      ctx.arc(bx, by, 1.5 + Math.random() * 3, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    this._cache.set(key, texture);
    return texture;
  }
}
