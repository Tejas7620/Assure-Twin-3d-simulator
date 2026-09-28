/**
 * src/ui/components/PumpabilityGauge.ts
 * Semi-circular speedometer / arc gauge matching the reference image.
 * Shows Green -> Yellow -> Red gradient, center number in DAYS,
 * subtitle "Time to reach unfavorable boundary", and status badge.
 */

export class PumpabilityGauge {
  private _canvas: HTMLCanvasElement;
  private _ctx: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement) {
    this._canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2d context for PumpabilityGauge');
    this._ctx = ctx;
  }

  public render(days: number, status: 'SAFE' | 'WARNING' | 'CRITICAL' | 'UNKNOWN'): void {
    const canvas = this._canvas;
    const ctx = this._ctx;
    const dpr = window.devicePixelRatio || 1;

    const rect = canvas.getBoundingClientRect();
    const w = rect.width || 240;
    const h = rect.height || 130;

    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h - 18;
    const radius = Math.min(cx - 24, cy - 10);
    const lineWidth = 12;

    // Background track (dark arc)
    ctx.beginPath();
    ctx.arc(cx, cy, radius, Math.PI, 0, false);
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineCap = 'round';
    ctx.stroke();

    // Multi-color arc: Green (left: 14 to 7 days) -> Yellow (center: 7 to 3 days) -> Red (right: 3 to 0 days)
    // In our gauge, high days = safe (green), low days = critical (red)
    // Arc goes from Math.PI (left, 180 deg) to 0 (right, 0 deg)
    const gradient = ctx.createLinearGradient(cx - radius, cy, cx + radius, cy);
    gradient.addColorStop(0.0, '#10b981'); // Green
    gradient.addColorStop(0.5, '#f59e0b'); // Yellow/Orange
    gradient.addColorStop(1.0, '#ef4444'); // Red

    ctx.beginPath();
    ctx.arc(cx, cy, radius, Math.PI, 0, false);
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = gradient;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Needle or indicator position based on days (0 to 14 days)
    const clampedDays = Math.max(0, Math.min(14, days));
    // 14 days = left (Math.PI), 0 days = right (0)
    const progress = 1.0 - (clampedDays / 14.0); // 0 (14d) to 1 (0d)
    const needleAngle = Math.PI - progress * Math.PI;

    // Small tick marks
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    for (let i = 0; i <= 7; i++) {
      const angle = Math.PI - (i / 7) * Math.PI;
      const innerR = radius - 10;
      const outerR = radius - 6;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * innerR, cy - Math.sin(angle) * innerR);
      ctx.lineTo(cx + Math.cos(angle) * outerR, cy - Math.sin(angle) * outerR);
      ctx.stroke();
    }

    // Needle indicator line
    const needleLen = radius - 16;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(needleAngle) * needleLen, cy - Math.sin(needleAngle) * needleLen);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    // Center pivot circle with status accent
    const statusColor = status === 'SAFE' ? '#10b981' : (status === 'WARNING' ? '#f59e0b' : '#ef4444');
    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.fillStyle = statusColor;
    ctx.fill();

    // Value text in center: e.g. "6.4"
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 28px "JetBrains Mono", monospace';
    ctx.fillText(days.toFixed(1), cx, cy - 20);

    // "DAYS" label
    ctx.font = '600 10px "JetBrains Mono", monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('DAYS', cx, cy - 6);

    ctx.restore();
  }
}
