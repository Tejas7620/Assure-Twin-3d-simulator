/**
 * src/ui/components/EnvelopeCanvas.ts
 * High-DPI 2D canvas chart rendering the Dynamic Thermo-Mechanical Operating Envelope.
 * Axes: Temperature (°C, 40 to 120) vs SPM (spm, 0 to 6).
 * Plots Preferred (green), Acceptable (orange), and Unfavorable (red) regions
 * and a pulsing white point for the current operating setpoint.
 */

export interface EnvelopeOperatingPoint {
  tempC: number;
  spm: number;
  status: 'SAFE' | 'WARNING' | 'CRITICAL' | 'UNKNOWN';
}

export class EnvelopeCanvas {
  private _canvas: HTMLCanvasElement;
  private _ctx: CanvasRenderingContext2D;
  private _point: EnvelopeOperatingPoint = { tempC: 72.6, spm: 3.2, status: 'SAFE' };

  constructor(canvas: HTMLCanvasElement) {
    this._canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2d context for EnvelopeCanvas');
    this._ctx = ctx;
  }

  public update(point: EnvelopeOperatingPoint): void {
    this._point = point;
    this.render();
  }

  public render(): void {
    const canvas = this._canvas;
    const ctx = this._ctx;
    const dpr = window.devicePixelRatio || 1;

    const rect = canvas.getBoundingClientRect();
    const w = rect.width || 240;
    const h = rect.height || 140;

    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    // Padding for axes labels
    const padL = 28;
    const padR = 12;
    const padT = 12;
    const padB = 24;
    const chartW = w - padL - padR;
    const chartH = h - padT - padB;

    // Coordinate transforms
    // Temp: 40 to 120 °C
    const minTemp = 40;
    const maxTemp = 120;
    // SPM: 0 to 6 spm
    const minSpm = 0;
    const maxSpm = 6;

    const tempToX = (t: number) => padL + ((t - minTemp) / (maxTemp - minTemp)) * chartW;
    const spmToY = (s: number) => padT + (1.0 - (s - minSpm) / (maxSpm - minSpm)) * chartH;

    // Background grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;

    // Horizontal grid lines (SPM = 2, 4, 6)
    for (let s = 2; s <= maxSpm; s += 2) {
      const y = spmToY(s);
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(padL + chartW, y);
      ctx.stroke();

      ctx.fillStyle = '#64748b';
      ctx.font = '500 9px "JetBrains Mono", monospace';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(s.toString(), padL - 5, y);
    }

    // Vertical grid lines (Temp = 60, 80, 100, 120)
    for (let t = 60; t <= maxTemp; t += 20) {
      const x = tempToX(t);
      ctx.beginPath();
      ctx.moveTo(x, padT);
      ctx.lineTo(x, padT + chartH);
      ctx.stroke();

      ctx.fillStyle = '#64748b';
      ctx.font = '500 9px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(t.toString(), x, padT + chartH + 5);
    }

    // Unfavorable region (Red background top-right)
    ctx.fillStyle = 'rgba(239, 68, 68, 0.18)';
    ctx.beginPath();
    ctx.rect(padL, padT, chartW, chartH);
    ctx.fill();

    // Acceptable region (Yellow/Orange middle boundary)
    // As temperature increases, higher SPM becomes acceptable
    ctx.fillStyle = 'rgba(245, 158, 11, 0.25)';
    ctx.beginPath();
    ctx.moveTo(tempToX(40), spmToY(0));
    ctx.lineTo(tempToX(40), spmToY(2.2));
    ctx.lineTo(tempToX(70), spmToY(3.8));
    ctx.lineTo(tempToX(100), spmToY(5.2));
    ctx.lineTo(tempToX(120), spmToY(5.8));
    ctx.lineTo(tempToX(120), spmToY(0));
    ctx.closePath();
    ctx.fill();

    // Preferred region (Green safe bottom-left to mid-right)
    ctx.fillStyle = 'rgba(16, 185, 129, 0.3)';
    ctx.beginPath();
    ctx.moveTo(tempToX(40), spmToY(0));
    ctx.lineTo(tempToX(40), spmToY(1.4));
    ctx.lineTo(tempToX(70), spmToY(2.8));
    ctx.lineTo(tempToX(100), spmToY(4.2));
    ctx.lineTo(tempToX(120), spmToY(4.8));
    ctx.lineTo(tempToX(120), spmToY(0));
    ctx.closePath();
    ctx.fill();

    // Region boundary lines
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(tempToX(40), spmToY(1.4));
    ctx.lineTo(tempToX(70), spmToY(2.8));
    ctx.lineTo(tempToX(100), spmToY(4.2));
    ctx.lineTo(tempToX(120), spmToY(4.8));
    ctx.stroke();

    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(tempToX(40), spmToY(2.2));
    ctx.lineTo(tempToX(70), spmToY(3.8));
    ctx.lineTo(tempToX(100), spmToY(5.2));
    ctx.lineTo(tempToX(120), spmToY(5.8));
    ctx.stroke();

    // Axes borders
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padL, padT);
    ctx.lineTo(padL, padT + chartH);
    ctx.lineTo(padL + chartW, padT + chartH);
    ctx.stroke();

    // Axis labels
    ctx.save();
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '500 9px "Outfit", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SPM (spm)', -(padT + chartH / 2), padL - 18);
    ctx.restore();

    ctx.fillStyle = '#94a3b8';
    ctx.font = '500 9px "Outfit", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('TEMPERATURE (°C)', padL + chartW / 2, h - 3);

    // Current Operating Point
    const ptX = Math.max(padL, Math.min(padL + chartW, tempToX(this._point.tempC)));
    const ptY = Math.max(padT, Math.min(padT + chartH, spmToY(this._point.spm)));

    // Outer glow
    ctx.beginPath();
    ctx.arc(ptX, ptY, 8, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.fill();

    // White circle with dark center (matching reference image)
    ctx.beginPath();
    ctx.arc(ptX, ptY, 4.5, 0, Math.PI * 2);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.fillStyle = '#0f172a';
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }
}
