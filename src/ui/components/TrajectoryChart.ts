/**
 * src/ui/components/TrajectoryChart.ts
 * Multi-horizon future trajectory chart matching the reference image.
 * Renders smooth curves for Temperature, Viscosity, Oil Rate, and Float Margin
 * with day ticks on X-axis and 0-100 normalized/scaled values on Y-axis.
 */

export interface TrajectoryDataPoint {
  day: number;
  tempNormalized: number;
  viscNormalized: number;
  oilNormalized: number;
  floatNormalized: number;
}

export class TrajectoryChart {
  private _canvas: HTMLCanvasElement;
  private _ctx: CanvasRenderingContext2D;
  private _horizonDays: number = 7;
  private _points: TrajectoryDataPoint[] = [];

  constructor(canvas: HTMLCanvasElement) {
    this._canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2d context for TrajectoryChart');
    this._ctx = ctx;
    this.generateDefaultPoints(7);
  }

  public get horizonDays(): number {
    return this._horizonDays;
  }

  public setHorizon(days: number): void {
    this._horizonDays = days;
    this.generateDefaultPoints(days);
    this.render();
  }

  public updateData(points: TrajectoryDataPoint[]): void {
    this._points = points;
    this.render();
  }

  public updateFromForecast(points: { day: number; temperature: number; viscosity: number; oil_rate: number; float_margin: number }[]): void {
    this._points = points.map(p => ({
      day: p.day,
      tempNormalized: Math.max(5, Math.min(95, (p.temperature / 100) * 100)),
      viscNormalized: Math.max(5, Math.min(95, (Math.log10(Math.max(10, p.viscosity)) / 4.5) * 100)),
      oilNormalized: Math.max(5, Math.min(95, (p.oil_rate / 60) * 100)),
      floatNormalized: Math.max(5, Math.min(95, (p.float_margin / 40) * 100))
    }));
    this.render();
  }

  public updateFromTrajectory(points: { dayOffset: number; temperatureC: number; viscosityCp: number; oilRateBopd: number; floatMarginPct: number }[]): void {
    this._points = points.map(p => ({
      day: p.dayOffset,
      tempNormalized: Math.max(5, Math.min(95, (p.temperatureC / 100) * 100)),
      viscNormalized: Math.max(5, Math.min(95, (Math.log10(Math.max(10, p.viscosityCp)) / 4.5) * 100)),
      oilNormalized: Math.max(5, Math.min(95, (p.oilRateBopd / 60) * 100)),
      floatNormalized: Math.max(5, Math.min(95, (p.floatMarginPct / 40) * 100))
    }));
    this.render();
  }

  private generateDefaultPoints(days: number): void {
    this._points = [];
    for (let d = 0; d <= days; d++) {
      const frac = d / Math.max(1, days);
      // Temperature decays slightly: 85 -> 68
      const temp = 86 - frac * 18 - Math.sin(frac * Math.PI) * 2;
      // Viscosity surges as well cools: 45 -> 72
      const visc = 45 + frac * 28 + Math.sin(frac * 2) * 2;
      // Oil rate declines as viscosity rises: 65 -> 35
      const oil = 66 - frac * 30;
      // Float margin contracts: 30 -> 14
      const floatM = 30 - frac * 16;

      this._points.push({
        day: d,
        tempNormalized: Math.max(5, Math.min(95, temp)),
        viscNormalized: Math.max(5, Math.min(95, visc)),
        oilNormalized: Math.max(5, Math.min(95, oil)),
        floatNormalized: Math.max(5, Math.min(95, floatM))
      });
    }
  }

  public render(): void {
    const canvas = this._canvas;
    const ctx = this._ctx;
    const dpr = window.devicePixelRatio || 1;

    const rect = canvas.getBoundingClientRect();
    const w = rect.width || 340;
    const h = rect.height || 160;

    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const padL = 26;
    const padR = 12;
    const padT = 10;
    const padB = 22;
    const chartW = w - padL - padR;
    const chartH = h - padT - padB;

    // Y Grid: 0, 25, 50, 75, 100
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#64748b';
    ctx.font = '500 8.5px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    for (let v = 0; v <= 100; v += 25) {
      const y = padT + (1.0 - v / 100) * chartH;
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(padL + chartW, y);
      ctx.stroke();
      ctx.fillText(v.toString(), padL - 5, y);
    }

    // X axis ticks
    const n = Math.max(1, this._points.length - 1);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    for (let i = 0; i <= n; i++) {
      const x = padL + (i / n) * chartW;
      ctx.beginPath();
      ctx.moveTo(x, padT);
      ctx.lineTo(x, padT + chartH);
      ctx.stroke();

      const dayVal = this._points[i]?.day ?? i;
      ctx.fillText(dayVal.toString(), x, padT + chartH + 5);
    }

    // X Axis Label
    ctx.fillStyle = '#94a3b8';
    ctx.font = '500 8px "Outfit", sans-serif';
    ctx.fillText('Days', padL + chartW / 2, h - 3);

    // Draw lines
    const drawSeries = (key: keyof TrajectoryDataPoint, color: string) => {
      if (this._points.length < 2) return;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();

      for (let i = 0; i < this._points.length; i++) {
        const x = padL + (i / n) * chartW;
        const val = this._points[i][key];
        const y = padT + (1.0 - val / 100) * chartH;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Points
      ctx.fillStyle = color;
      for (let i = 0; i < this._points.length; i++) {
        const x = padL + (i / n) * chartW;
        const val = this._points[i][key];
        const y = padT + (1.0 - val / 100) * chartH;
        ctx.beginPath();
        ctx.arc(x, y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    // Red: Temp
    drawSeries('tempNormalized', '#ef4444');
    // Orange: Viscosity
    drawSeries('viscNormalized', '#f59e0b');
    // Green: Oil
    drawSeries('oilNormalized', '#10b981');
    // Cyan: Float Margin
    drawSeries('floatNormalized', '#06b6d4');

    ctx.restore();
  }
}
