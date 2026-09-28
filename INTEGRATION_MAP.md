# INTEGRATION_MAP.md — ASSURE-TWIN Frontend ⇄ Backend Wiring

**Purpose:** exact map of what calls what today, and the target wiring. Ground truth for the integration work. No code changed to produce this.

---

## 1. Frontend surfaces

- **3D scene** (`src/scene/*`, `main.ts` animate loop) — driven by `SimulationClient.state`. **PROTECTED.**
- **Workstation** (`src/ui/WorkstationApp.ts`) — 12 pages via LeftNav. Does **not** itself call REST.
- **Client intelligence** (`src/assure/*`, `AssureTwinManager`) — consumes `SimulationClient` read-only via `SimulationStateAdapter`.
- **REST client** (`src/api/client.ts::assureApiClient`) — base `http://127.0.0.1:8000`, graceful offline fallback (returns null/defaults on error). Singleton.

---

## 2. CURRENT wiring (as-audited)

### WebSocket
| Channel | Client | Server | Engine |
|---|---|---|---|
| `ws://127.0.0.1:8000/ws/sim` | `SimulationClient` (auto-reconnect 2s, local fallback) | `main.py::ws_sim_endpoint` (~25 Hz) | **A** |

### REST — actually invoked by the UI (only 2 pages)
| Page | Method call | Endpoint | Engine | Issue |
|---|---|---|---|---|
| `OptimizationView.ts` | `solveOptimization(weights)` | `POST /api/v1/optimization/solve` | A | returns **fake** scored candidates (C3) |
| `OptimizationView.ts` | `setControls(...)` | `POST /api/v1/simulation/controls` | A | ok |
| `RecommendationView.ts` | `approveRecommendation(id)` | `POST /api/v1/recommendations/{id}/approve` | — | id **hardcoded** `'REC-2026-BGW-004'` (M2); rec is **fake** (C1) |

### REST — defined but NOT invoked by any page (orphaned)
All Engine **B** endpoints: `/analytics/{readiness,sensitivity,rehearsal,thermal-memory}`, `/assurance/{audit,why}`, `/optimization/{joint,css,srp,vfd,inflow-governor}`, `/simulation/parameters*`. Plus Engine A `/analytics/{virtual-downhole,pumpability,envelope}`, `/assurance/evaluate`, `/forecast/*`, `/scenarios/*`, `/wells/*`, `/alerts/*`.

**Consequence:** the richest, most-real backend (Engine B) has **zero** UI consumers. The 12 pages compute locally via Engine C.

---

## 3. Per-page data source (12 pages)

| # | Page (approx.) | Today's source | Target source |
|---|---|---|---|
| 1 | Overview / HUD | SimulationClient + Engine C | + backend `/simulation/state` (B) when online |
| 2 | Thermal / CSS | Engine C (ThermalReserve/Trajectory) | backend `/analytics/thermal-memory`, `/forecast` (B) |
| 3 | Virtual downhole | Engine C (VirtualDownhole) | backend `/analytics/virtual-downhole` (fix H3/H4 first) |
| 4 | Pumpability | Engine C (Pumpability) | backend `/analytics/pumpability` |
| 5 | Operating envelope | Engine C (Envelope) | backend `/analytics/envelope` |
| 6 | Forecast / trajectory | Engine C (FutureTrajectory) | backend `/forecast` (B, real) |
| 7 | Decision rehearsal | Engine C (DecisionRehearsal) | backend `/analytics/rehearsal` (B, real clone) |
| 8 | **Optimization** | REST `/optimization/solve` (A, fake) | REST `/optimization/solve` **re-backed by real simulate-and-score** |
| 9 | **Recommendation** | REST approve (fake id/rec) | REST derived recommendation + real id + gate/ABSTAIN |
| 10 | Assurance / gate | Engine C (AssuranceEngine) | backend `/assurance/audit` (B, real, can abstain) |
| 11 | Why / explainability | Engine C (Why/WhyNot) | backend `/assurance/why` (B) |
| 12 | Outcome / recalibrate | Engine C (Outcome/Recalibration) — **fabricates outcome (C6)** | backend outcome + **calibration router (H2)** |

---

## 4. TARGET wiring strategy

**Do not rip out Engine C.** It is the offline brain and is wired into the protected render path. Instead:

1. **Backend-prefer bridge in `AssureTwinManager`.** Add an optional path where, per analysis tick, the manager attempts the matching `assureApiClient` call; on success it uses the backend result (labeled with backend provenance), on failure/offline it falls back to the existing local Engine C computation. This preserves offline-first while making the backend authoritative when present.
2. **Fix the 2 already-wired REST pages first** (Optimization, Recommendation) — highest visibility, and they already have the plumbing.
3. **Repoint Engine A analytics endpoints to Engine B** (or fix their SIM-key reads) so `/analytics/virtual-downhole|pumpability|envelope` return live values (H3/H4), then wire pages 3–5.
4. **Wire pages 6,7,10,11** to their real Engine B endpoints.
5. **Wire page 12** once the calibration router (H2) and a non-fabricated outcome path (C6) exist.

**Contract stability:** `src/api/client.ts` already declares typed methods for all endpoints — keep those signatures; only the server-side bodies and the client *call sites* change. Pydantic response models in `schemas/domain.py` are the contract; align Engine B outputs to them where needed.

---

## 5. Integration risks / watch-list

- **Schema drift A↔B.** When repointing an endpoint from A to B, response *keys* may change; the typed client methods and Pydantic models must be reconciled or the UI silently gets `null` (client fallback hides it).
- **Provenance leakage.** Any backend value shown in the UI must carry a provenance label; don't display `PREDICTED`/`SIMULATED` as if `OBSERVED`.
- **Offline regression.** After each wiring change, verify the app still runs with the backend **stopped** (SimulationClient fallback + Engine C).
- **Don't touch protected files.** `SimulationClient.ts` is READ-ONLY; the bridge lives in `AssureTwinManager`/adapter, not in the client.
- **[REQUIRES EXECUTION]** Confirm CORS (`allow_origins=["*"]`) and base URL `127.0.0.1:8000` match the Vite dev origin at runtime.
