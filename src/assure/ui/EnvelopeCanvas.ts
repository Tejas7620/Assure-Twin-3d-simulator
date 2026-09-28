/**
 * src/assure/ui/EnvelopeCanvas.ts
 * Dynamic 2D Canvas Renderer for Thermo-Mechanical Operating Envelope (Phase 9).
 * Renders the moving safe/warning/critical regions (SPM vs. Temperature)
 * and animates the live operating point with real-time status indication.
 */

import type { ThermoMechanicalEnvelope } from '../types.ts';
import { ThermoMechanicalEnvelopeEngine } from '../ThermoMechanicalEnvelopeEngine.ts';

export class EnvelopeCanvas {
  private _canvas: HTMLCanvasElement;
  private _ctx: CanvasRenderingContext2D;
  private _width: number = 520;
  private _height: number = 320;

  constructor(canvas: HTMLCanvasElement) {
    this._canvas = canvas;
    this._canvas.width = this._width;
    this._canvas.height = this._height;
    const ctx = this._canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2D context for EnvelopeCanvas');
    this._ctx = ctx;
  }

  public render(envelope: ThermoMechanicalEnvelope): void {
    const ctx = this._ctx;
    const w = this._width;
    const h = this._height;

    // Background
    ctx.fillStyle = '#0a0d14';
    ctx.fillRect(0, 0, w, h);

    // Padding for axes
    const padL = 55;
    const padR = 25;
    const padT = 30;
    const padB = 45;
    const plotW = w - padL - padR;
    const plotH = h - padT - padB;

    // Coordinate mapping
    const minTemp = 35.0;
    const maxTemp = 100.0;
    const minSpm = 0.5;
    const maxSpm = 5.5;

    const mapX = (t: number) => padL + ((t - minTemp) / (maxTemp - minTemp)) * plotW;
    const mapY = (s: number) => padT + plotH - ((s - minSpm) / (maxSpm - minSpm)) * plotH;

    // 1. Grid lines
    ctx.strokeStyle = '#1b2234';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);

    // Temp vertical grid
    ctx.fillStyle = '#6b7a99';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    for (let t = 40; t <= 100; t += 10) {
      const x = mapX(t);
      ctx.beginPath();
      ctx.moveTo(x, padT);
      ctx.lineTo(x, padT + plotH);
      ctx.stroke();
      ctx.fillText(`${t}°C`, x, padT + plotH + 16);
    }

    // SPM horizontal grid
    ctx.textAlign = 'right';
    for (let s = 1.0; s <= 5.0; s += 1.0) {
      const y = mapY(s);
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(padL + plotW, y);
      ctx.stroke();
      ctx.fillText(`${s.toFixed(1)}`, padL - 8, y + 3);
    }
    ctx.setLineDash([]);

    // 2. Fetch Envelope boundary curves
    const { temps, upperCritical, upperPreferred, lowerPreferred, lowerCritical } = ThermoMechanicalEnvelopeEngine.getEnvelopeCurves();

    // 3. Fill Safe / Preferred Region (Green/Cyan tint)
    ctx.beginPath();
    for (let i = 0; i < temps.length; i++) {
      const x = mapX(temps[i]);
      const y = mapY(upperPreferred[i]);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    for (let i = temps.length - 1; i >= 0; i--) {
      const x = mapX(temps[i]);
      const y = mapY(lowerPreferred[i]);
      ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = 'rgba(0, 220, 130, 0.16)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(0, 220, 130, 0.85)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 4. Fill Warning Region Upper (Rod float risk area)
    ctx.beginPath();
    for (let i = 0; i < temps.length; i++) {
      const x = mapX(temps[i]);
      const y = mapY(upperCritical[i]);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    for (let i = temps.length - 1; i >= 0; i--) {
      const x = mapX(temps[i]);
      const y = mapY(upperPreferred[i]);
      ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = 'rgba(255, 170, 0, 0.12)';
    ctx.fill();

    // 5. Fill Warning Region Lower (Fluid stagnation / Starvation)
    ctx.beginPath();
    for (let i = 0; i < temps.length; i++) {
      const x = mapX(temps[i]);
      const y = mapY(lowerPreferred[i]);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    for (let i = temps.length - 1; i >= 0; i--) {
      const x = mapX(temps[i]);
      const y = mapY(lowerCritical[i]);
      ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = 'rgba(255, 170, 0, 0.12)';
    ctx.fill();

    // 6. Draw Boundary Lines
    ctx.strokeStyle = 'rgba(255, 60, 60, 0.8)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 2]);

    // Upper Critical line
    ctx.beginPath();
    for (let i = 0; i < temps.length; i++) {
      const x = mapX(temps[i]);
      const y = mapY(upperCritical[i]);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Lower Critical line
    ctx.beginPath();
    for (let i = 0; i < temps.length; i++) {
      const x = mapX(temps[i]);
      const y = mapY(lowerCritical[i]);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // 7. Axis Labels
    ctx.fillStyle = '#9cb0d4';
    ctx.font = '11px "Inter", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Formation Temperature (°C)', padL + plotW / 2, h - 10);

    ctx.save();
    ctx.translate(14, padT + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Pumping Speed (SPM)', 0, 0);
    ctx.restore();

    // 8. Annotations on Plot
    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.fillStyle = 'rgba(255, 75, 75, 0.9)';
    ctx.textAlign = 'left';
    ctx.fillText('CRITICAL: ROD FLOAT BOUNDARY', padL + 12, padT + 18);

    ctx.fillStyle = 'rgba(0, 220, 130, 0.9)';
    ctx.fillText('PREFERRED OPERATING WINDOW', padL + 12, mapY(3.0) + 12);

    ctx.fillStyle = 'rgba(255, 170, 0, 0.9)';
    ctx.fillText('WARNING: FLUID STAGNATION', padL + 12, padT + plotH - 8);

    // 9. Current Operating Point
    const curX = mapX(envelope.currentTempC);
    const curY = mapY(envelope.currentSpm);

    // Glow pulse
    const pointColor = envelope.status === 'SAFE' ? '#00e599' : (envelope.status === 'WARNING' ? '#ffaa00' : '#ff3344');

    ctx.beginPath();
    ctx.arc(curX, curY, 9, 0, 2 * Math.PI);
    ctx.fillStyle = pointColor === '#00e599' ? 'rgba(0, 229, 153, 0.25)' : 'rgba(255, 51, 68, 0.25)';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(curX, curY, 5, 0, 2 * Math.PI);
    ctx.fillStyle = pointColor;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Callout badge for Current Operating Point
    ctx.fillStyle = '#0f1422';
    ctx.strokeStyle = pointColor;
    ctx.lineWidth = 1;
    const calloutW = 105;
    const calloutH = 22;
    const calloutX = Math.min(curX + 12, padL + plotW - calloutW);
    const calloutY = Math.max(padT + 4, curY - 26);

    ctx.fillRect(calloutX, calloutY, calloutW, calloutH);
    ctx.strokeRect(calloutX, calloutY, calloutW, calloutH);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`NOW: ${envelope.currentSpm.toFixed(1)} SPM | ${envelope.currentTempC.toFixed(1)}°C`, calloutX + 5, calloutY + 14);
  }
}
