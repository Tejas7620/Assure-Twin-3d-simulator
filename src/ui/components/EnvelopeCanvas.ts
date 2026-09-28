/**
 * src/ui/components/EnvelopeCanvas.ts
 * High-DPI 2D canvas chart rendering the Dynamic Thermo-Mechanical Operating Envelope.
 * Axes: SPM (0 to 10) vs Time (Days, 0 to 30) matching reference GUI image.
 * Displays dynamically contracting regions:
 * - Unsafe (red)
 * - Caution (amber)
 * - Safe (green)
 * - Preferred (cyan-green)
 * Plots Current SPM (white dot) and Projected Trajectory (cyan dashed curve).
 */

export interface EnvelopeOperatingPoint {
  tempC: number;
  spm: number;
  status: 'SAFE' | 'WARNING' | 'CRITICAL' | 'UNKNOWN';
  daysRemaining?: number;
}

export class EnvelopeCanvas {
  private _canvas: HTMLCanvasElement;
  private _ctx: CanvasRenderingContext2D;
  private _point: EnvelopeOperatingPoint = { tempC: 72.7, spm: 7.5, status: 'SAFE', daysRemaining: 18.4 };

  constructor(canvas: HTMLCanvasElement) {
    this._canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2d context for EnvelopeCanvas');
    this._ctx = ctx;
  }

  public update(point: Partial<EnvelopeOperatingPoint>): void {
    this._point = { ...this._point, ...point };
    this.render();
  }

  public render(): void {
    const canvas = this._canvas;
    const ctx = this._ctx;
    const dpr = window.devicePixelRatio || 1;

    const rect = canvas.getBoundingClientRect();
    const w = rect.width || 280;
    const h = rect.height || 140;

    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    // Padding for axes labels and bottom legend
    const padL = 26;
    const padR = 48; // room for region labels (Unsafe, Caution, Safe, Preferred)
    const padT = 10;
    const padB = 34; // room for X axis and legend
    const chartW = w - padL - padR;
    const chartH = h - padT - padB;

    // Coordinate transforms
    // SPM: 0 to 10 spm
    const minSpm = 0;
    const maxSpm = 10;
    // Time: 0 to 30 Days
    const minDay = 0;
    const maxDay = 30;

    const dayToX = (d: number) => padL + ((d - minDay) / (maxDay - minDay)) * chartW;
    const spmToY = (s: number) => padT + (1.0 - (s - minSpm) / (maxSpm - minSpm)) * chartH;

    // Dynamic contraction factor based on thermal state / status
    const isCritical = this._point.status === 'CRITICAL';
    const isWarning = this._point.status === 'WARNING';
    // When cooling or abnormal viscosity, boundaries shift down
    const safeSpmOffset = isCritical ? -3.5 : (isWarning ? -1.8 : 0);

    // Background grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;

    // Horizontal grid lines (SPM = 0, 2, 4, 6, 8, 10)
    for (let s = 0; s <= maxSpm; s += 2) {
      const y = spmToY(s);
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(padL + chartW, y);
      ctx.stroke();

      ctx.fillStyle = '#64748b';
      ctx.font = '500 8.5px "JetBrains Mono", monospace';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(s.toString(), padL - 4, y);
    }

    // Vertical grid lines (Time = 0, 7, 14, 21, 28, 30)
    const daysTicks = [0, 7, 14, 21, 28, 30];
    for (const d of daysTicks) {
      const x = dayToX(d);
      ctx.beginPath();
      ctx.moveTo(x, padT);
      ctx.lineTo(x, padT + chartH);
      ctx.stroke();

      ctx.fillStyle = '#64748b';
      ctx.font = '500 8px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(d.toString(), x, padT + chartH + 3);
    }

    // --- REGION SHADING ---
    // Boundary functions over time (Day 0 to Day 30)
    // 1. Unsafe top band: above caution ceiling (8.2 declining to 6.5)
    // 2. Caution band: 6.8 declining to 4.8
    // 3. Safe band: 5.2 declining to 3.2
    // 4. Preferred band: below 5.2 down to 1.5

    const getUnsafeBoundary = (d: number) => Math.max(1.0, (8.4 - (d / 30) * 1.6) + safeSpmOffset);
    const getCautionBoundary = (d: number) => Math.max(0.8, (7.0 - (d / 30) * 2.0) + safeSpmOffset);
    const getSafeBoundary = (d: number) => Math.max(0.5, (5.2 - (d / 30) * 2.2) + safeSpmOffset);

    // Unsafe Region (Top red)
    ctx.fillStyle = 'rgba(239, 68, 68, 0.22)';
    ctx.beginPath();
    ctx.moveTo(dayToX(0), spmToY(10));
    for (let d = 0; d <= 30; d += 2) {
      ctx.lineTo(dayToX(d), spmToY(getUnsafeBoundary(d)));
    }
    ctx.lineTo(dayToX(30), spmToY(10));
    ctx.closePath();
    ctx.fill();

    // Caution Region (Amber)
    ctx.fillStyle = 'rgba(245, 158, 11, 0.22)';
    ctx.beginPath();
    ctx.moveTo(dayToX(0), spmToY(getUnsafeBoundary(0)));
    for (let d = 0; d <= 30; d += 2) {
      ctx.lineTo(dayToX(d), spmToY(getUnsafeBoundary(d)));
    }
    for (let d = 30; d >= 0; d -= 2) {
      ctx.lineTo(dayToX(d), spmToY(getCautionBoundary(d)));
    }
    ctx.closePath();
    ctx.fill();

    // Safe Region (Green)
    ctx.fillStyle = 'rgba(16, 185, 129, 0.22)';
    ctx.beginPath();
    ctx.moveTo(dayToX(0), spmToY(getCautionBoundary(0)));
    for (let d = 0; d <= 30; d += 2) {
      ctx.lineTo(dayToX(d), spmToY(getCautionBoundary(d)));
    }
    for (let d = 30; d >= 0; d -= 2) {
      ctx.lineTo(dayToX(d), spmToY(getSafeBoundary(d)));
    }
    ctx.closePath();
    ctx.fill();

    // Preferred Region (Cyan-green bottom)
    ctx.fillStyle = 'rgba(6, 182, 212, 0.16)';
    ctx.beginPath();
    ctx.moveTo(dayToX(0), spmToY(getSafeBoundary(0)));
    for (let d = 0; d <= 30; d += 2) {
      ctx.lineTo(dayToX(d), spmToY(getSafeBoundary(d)));
    }
    ctx.lineTo(dayToX(30), spmToY(0));
    ctx.lineTo(dayToX(0), spmToY(0));
    ctx.closePath();
    ctx.fill();

    // Boundary contour lines
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let d = 0; d <= 30; d += 2) {
      const x = dayToX(d);
      const y = spmToY(getUnsafeBoundary(d));
      if (d === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let d = 0; d <= 30; d += 2) {
      const x = dayToX(d);
      const y = spmToY(getCautionBoundary(d));
      if (d === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let d = 0; d <= 30; d += 2) {
      const x = dayToX(d);
      const y = spmToY(getSafeBoundary(d));
      if (d === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Region labels on the right edge
    ctx.font = '600 8px "Outfit", sans-serif';
    ctx.textAlign = 'left';

    ctx.fillStyle = '#ef4444';
    ctx.fillText('Unsafe', padL + chartW + 5, spmToY(Math.min(9.5, getUnsafeBoundary(30) + 1.2)));

    ctx.fillStyle = '#f59e0b';
    ctx.fillText('Caution', padL + chartW + 5, spmToY((getUnsafeBoundary(30) + getCautionBoundary(30)) / 2));

    ctx.fillStyle = '#10b981';
    ctx.fillText('Safe', padL + chartW + 5, spmToY((getCautionBoundary(30) + getSafeBoundary(30)) / 2));

    ctx.fillStyle = '#06b6d4';
    ctx.fillText('Preferred', padL + chartW + 5, spmToY(Math.max(0.6, getSafeBoundary(30) / 2)));

    // Projected Trajectory curve (cyan dashed line descending)
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.6;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    const startSpm = this._point.spm;
    for (let d = 0; d <= 30; d += 1) {
      const projSpm = Math.max(0.5, startSpm - (d / 30) * 4.2 + (isCritical ? -3.0 : 0));
      const x = dayToX(d);
      const y = spmToY(projSpm);
      if (d === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.setLineDash([]); // reset line dash

    // Current Operating Point (White dot at Day 0)
    const curX = dayToX(0);
    const curY = spmToY(startSpm);

    ctx.beginPath();
    ctx.arc(curX, curY, 6, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(curX, curY, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    // Chart axes border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padL, padT);
    ctx.lineTo(padL, padT + chartH);
    ctx.lineTo(padL + chartW, padT + chartH);
    ctx.stroke();

    // X Axis Label: "Time (Days)"
    ctx.fillStyle = '#94a3b8';
    ctx.font = '500 8.5px "Outfit", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Time (Days)', padL + chartW / 2, padT + chartH + 14);

    // Y Axis Label: "SPM"
    ctx.save();
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('SPM', -(padT + chartH / 2), padL - 16);
    ctx.restore();

    // Bottom Legend: "● Current SPM" and "---- Project. Trajectory"
    const legY = h - 5;
    ctx.textAlign = 'left';
    ctx.font = '500 8px "Outfit", sans-serif';

    // Dot
    ctx.beginPath();
    ctx.arc(padL + 10, legY - 3, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('Current SPM', padL + 18, legY);

    // Dashed line
    const dashStartX = padL + 80;
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 2]);
    ctx.beginPath();
    ctx.moveTo(dashStartX, legY - 3);
    ctx.lineTo(dashStartX + 16, legY - 3);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('Project. Trajectory', dashStartX + 22, legY);

    ctx.restore();
  }
}
