/**
 * src/api/ApiBridge.ts
 * Phase 3 — Async polling bridge between backend REST API and UI pages.
 *
 * Provides a lightweight polling manager for each major backend endpoint.
 * All callbacks receive either real backend data or null (on failure), so
 * UI pages can do: `data ?? localFallback` without any conditional branches.
 *
 * Design principles:
 * - Never throws. On any failure, calls the callback with null.
 * - Debounces: if a poll is still in-flight, the next schedule is skipped.
 * - Teardown: `stop()` cancels all timers cleanly.
 */

import {
  assureApiClient,
  type AssuranceResult,
  type ForecastData,
  type PumpabilityData,
  type EnvelopeData
} from './client.ts';

export type PollCallback<T> = (data: T | null) => void;

interface PollHandle {
  intervalId: ReturnType<typeof setInterval>;
  inFlight: boolean;
}

export class ApiBridge {
  private _handles: PollHandle[] = [];
  private _stopped = false;

  /**
   * Start polling an async function at the given interval.
   * The fetcher is called immediately, then on every interval thereafter.
   */
  private poll<T>(
    fetcher: () => Promise<T | null>,
    callback: PollCallback<T>,
    intervalMs: number
  ): void {
    let inFlight = false;

    const run = async () => {
      if (inFlight || this._stopped) return;
      inFlight = true;
      try {
        const data = await fetcher();
        if (!this._stopped) callback(data);
      } catch {
        if (!this._stopped) callback(null);
      } finally {
        inFlight = false;
      }
    };

    // Fire immediately
    run();

    const handle: PollHandle = {
      intervalId: setInterval(run, intervalMs),
      inFlight: false
    };
    this._handles.push(handle);
  }

  /** Poll the assurance gate — updates every 4 seconds. */
  watchAssuranceGate(cb: PollCallback<AssuranceResult>, intervalMs = 4000): this {
    this.poll(() => assureApiClient.getAssuranceGate(), cb, intervalMs);
    return this;
  }

  /** Poll the forecast endpoint — updates every 10 seconds. */
  watchForecast(horizonDays: number, cb: PollCallback<ForecastData>, intervalMs = 10000): this {
    this.poll(() => assureApiClient.getForecast(horizonDays), cb, intervalMs);
    return this;
  }

  /** Poll virtual downhole sensors — updates every 5 seconds. */
  watchVirtualSensors(
    cb: PollCallback<Record<string, any>>,
    intervalMs = 5000
  ): this {
    this.poll(() => assureApiClient.getVirtualDownhole(), cb, intervalMs);
    return this;
  }

  /** Poll pumpability window — updates every 6 seconds. */
  watchPumpability(cb: PollCallback<PumpabilityData>, intervalMs = 6000): this {
    this.poll(() => assureApiClient.getPumpability(), cb, intervalMs);
    return this;
  }

  /** Poll operating envelope — updates every 6 seconds. */
  watchEnvelope(cb: PollCallback<EnvelopeData>, intervalMs = 6000): this {
    this.poll(() => assureApiClient.getEnvelope(), cb, intervalMs);
    return this;
  }

  /** Poll live alerts — updates every 8 seconds. */
  watchAlerts(cb: PollCallback<any[]>, intervalMs = 8000): this {
    this.poll(() => assureApiClient.getAlerts(), cb, intervalMs);
    return this;
  }

  /** One-shot fetch (not polled). */
  async fetchOnce<T>(fetcher: () => Promise<T | null>): Promise<T | null> {
    try { return await fetcher(); }
    catch { return null; }
  }

  /** Stop all polling timers. */
  stop(): void {
    this._stopped = true;
    this._handles.forEach(h => clearInterval(h.intervalId));
    this._handles = [];
  }
}
