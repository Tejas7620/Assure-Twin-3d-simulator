/**
 * src/ui/components/DynoCardCanvas.ts
 * Real-time dynamometer card renderer matching the reference image.
 * Renders polished rod surface load vs position loop and downhole pump card,
 * with Peak Load, MPRL, and Min Load engineering readouts.
 */

export class DynoCardCanvas {
  private _canvas: HTMLCanvasElement;
  private _ctx: CanvasRenderingContext2D;
  private _peakLoad: number = 68.0;
  private _mprl: number = 32.2;
  private _minLoad: number = -18.3;

  constructor(canvas: HTMLCanvasElement) {
    this._canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2d context for DynoCardCanvas');
    this._ctx = ctx;
  }

  public updateMetrics(peak: number, mprl: number, min: number): void {
    this._peakLoad = peak;
    this._mprl = mprl;
    this._minLoad = min;
    this.render();
  }

  public render(): void {
    const canvas = this._canvas;
    const ctx = this._ctx;
    const dpr = window.devicePixelRatio || 1;

    const rect = canvas.getBoundingClientRect();
    const w = rect.width || 240;
    const h = rect.height || 100;

    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const padL = 24;
    const padR = 8;
    const padT = 8;
    const padB = 18;
    const chartW = w - padL - padR;
    const chartH = h - padT - padB;

    // Grid: Y from -40 to +40
    // X from 0 to 64 in
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#64748b';
    ctx.font = '500 8px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    const yVals = [40, 20, 0, -20, -40];
    for (const yv of yVals) {
      const y = padT + ((40 - yv) / 80) * chartH;
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(padL + chartW, y);
      ctx.stroke();
      if (yv === 40 || yv === 20 || yv === 0 || yv === -20 || yv === -40) {
        ctx.fillText(yv.toString(), padL - 4, y);
      }
    }

    // X Axis ticks: 0, 16, 32, 48, 64
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const xVals = [0, 16, 32, 48, 64];
    for (const xv of xVals) {
      const x = padL + (xv / 64) * chartW;
      ctx.beginPath();
      ctx.moveTo(x, padT);
      ctx.lineTo(x, padT + chartH);
      ctx.stroke();
      ctx.fillText(xv.toString(), x, padT + chartH + 3);
    }

    // X Label
    ctx.fillStyle = '#94a3b8';
    ctx.font = '500 7.5px "Outfit", sans-serif';
    ctx.fillText('Position (in)', padL + chartW / 2, h - 2);

    // Surface Dyno Card Loop (Yellow/Green curve)
    // Closed polygon matching standard API heavy oil SRP card scaled by dynamic load metrics
    ctx.beginPath();
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 1.8;

    const loadScale = Math.max(0.5, Math.min(1.5, this._peakLoad / 68.0));
    const minScale = Math.max(0.5, Math.min(1.5, this._minLoad / -18.3));

    const surfacePts: [number, number][] = [
      [2, -5 * minScale], [10, 15 * loadScale], [20, 24 * loadScale], [35, 26 * loadScale], 
      [50, 25 * loadScale], [60, 20 * loadScale], [62, 5],
      [60, -12 * minScale], [50, -18 * minScale], [35, -20 * minScale], [20, -19 * minScale], 
      [10, -18 * minScale], [4, -14 * minScale], [2, -5 * minScale]
    ];

    for (let i = 0; i < surfacePts.length; i++) {
      const [pos, ld] = surfacePts[i];
      const px = padL + (pos / 64) * chartW;
      const py = padT + ((40 - ld) / 80) * chartH;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Downhole Pump Card (Inner orange loop) scaled with MPRL
    ctx.beginPath();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.2;

    const mprlScale = Math.max(0.5, Math.min(1.5, this._mprl / 32.2));
    const pumpPts: [number, number][] = [
      [8, 12 * mprlScale], [22, 18 * mprlScale], [38, 19 * mprlScale], [54, 18 * mprlScale], [58, 2],
      [54, -10 * minScale], [38, -12 * minScale], [22, -11 * minScale], [10, -8 * minScale], [8, 12 * mprlScale]
    ];

    for (let i = 0; i < pumpPts.length; i++) {
      const [pos, ld] = pumpPts[i];
      const px = padL + (pos / 64) * chartW;
      const py = padT + ((40 - ld) / 80) * chartH;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    ctx.restore();
  }
}
