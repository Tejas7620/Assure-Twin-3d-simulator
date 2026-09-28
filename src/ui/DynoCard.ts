/**
 * DynoCard.ts
 * Real-time SRP Dynamometer Card (Surface Card & Downhole Pump Card).
 * Plots Polished Rod Load (kN) versus Position (inches).
 * Shows fluid pound notch when pump fillage is low.
 */

export class DynoCard {
  private _canvas: HTMLCanvasElement;
  private _ctx: CanvasRenderingContext2D;

  constructor(container: HTMLElement) {
    this._canvas = document.createElement('canvas');
    this._canvas.width = 280;
    this._canvas.height = 140;
    this._canvas.className = 'dyno-canvas';
    container.appendChild(this._canvas);
    this._ctx = this._canvas.getContext('2d')!;
  }

  public render(
    surfacePoints: Array<{ pos_in: number; load_kn: number }>,
    pumpPoints: Array<{ pos_in: number; load_kn: number }>,
    strokeInches: number,
    pprlKn: number,
    mprlKn: number,
    currentPosIn: number,
    currentLoadKn: number
  ): void {
    const ctx = this._ctx;
    const w = this._canvas.width;
    const h = this._canvas.height;

    // Clear background
    ctx.fillStyle = 'rgba(10, 15, 26, 0.95)';
    ctx.fillRect(0, 0, w, h);

    // Padding
    const padL = 36;
    const padR = 12;
    const padT = 16;
    const padB = 22;
    const plotW = w - padL - padR;
    const plotH = h - padT - padB;

    // Scales
    const maxStroke = Math.max(20.0, strokeInches);
    const maxLoad = Math.max(25.0, pprlKn * 1.25);
    const minLoad = 0.0;

    const toX = (pos: number) => padL + (pos / maxStroke) * plotW;
    const toY = (load: number) => padT + (1.0 - (load - minLoad) / (maxLoad - minLoad)) * plotH;

    // Grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;

    // Horizontal grid
    for (let l = 5.0; l <= maxLoad; l += 5.0) {
      const y = toY(l);
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(w - padR, y);
      ctx.stroke();

      ctx.fillStyle = '#64748b';
      ctx.font = '8px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`${l.toFixed(0)}`, padL - 4, y + 3);
    }

    // Vertical grid
    for (let p = 20.0; p <= maxStroke; p += 20.0) {
      const x = toX(p);
      ctx.beginPath();
      ctx.moveTo(x, padT);
      ctx.lineTo(x, h - padB);
      ctx.stroke();

      ctx.fillStyle = '#64748b';
      ctx.font = '8px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${p.toFixed(0)}"`, x, h - padB + 12);
    }

    // MPRL Minimum Load threshold line
    const mprlY = toY(mprlKn);
    ctx.strokeStyle = 'rgba(244, 63, 94, 0.4)';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 4]);
    ctx.beginPath();
    ctx.moveTo(padL, mprlY);
    ctx.lineTo(w - padR, mprlY);
    ctx.stroke();
    ctx.setLineDash([]);

    // 1. Draw Downhole Pump Card (Cyan/Blue dashed)
    if (pumpPoints && pumpPoints.length > 2) {
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(toX(pumpPoints[0].pos_in), toY(pumpPoints[0].load_kn));
      for (let i = 1; i < pumpPoints.length; i++) {
        ctx.lineTo(toX(pumpPoints[i].pos_in), toY(pumpPoints[i].load_kn));
      }
      ctx.closePath();
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 2. Draw Surface Dynamometer Card (Amber solid)
    if (surfacePoints && surfacePoints.length > 2) {
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(toX(surfacePoints[0].pos_in), toY(surfacePoints[0].load_kn));
      for (let i = 1; i < surfacePoints.length; i++) {
        ctx.lineTo(toX(surfacePoints[i].pos_in), toY(surfacePoints[i].load_kn));
      }
      ctx.closePath();
      ctx.stroke();
    }

    // 3. Current Live Operating Point (Glowing Red Dot)
    const curX = toX(currentPosIn);
    const curY = toY(currentLoadKn);
    ctx.fillStyle = '#f43f5e';
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#f43f5e';
    ctx.beginPath();
    ctx.arc(curX, curY, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Titles
    ctx.fillStyle = '#94a3b8';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('SURFACE CARD (kN vs in)', padL, 10);
  }
}
