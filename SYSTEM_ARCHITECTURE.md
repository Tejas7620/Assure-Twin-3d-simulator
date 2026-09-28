# SYSTEM_ARCHITECTURE.md — ASSURE-TWIN

**Scope:** end-to-end system: 3D simulator, frontend workstation, client intelligence, Python backend, data, and the target architecture that resolves the three-engine split.
**Status of "target" sections:** proposed; not yet implemented. No code was changed to produce this document.

---

## 1. Current Architecture (as-audited)

```
┌───────────────────────────────────────────────────────────────────────────┐
│ BROWSER (Vite + TypeScript, no framework)                                   │
│                                                                             │
│  ┌────────────────────┐   drives    ┌──────────────────────────────────┐   │
│  │ 3D SIMULATOR        │◄────────────│ main.ts  (boots both)            │   │
│  │ src/scene/*         │  simClient  │  - animate() loop                │   │
│  │ PumpjackKinematics  │   .state    │  - dblclick ClickToExplain       │   │
│  │ (PROTECTED)         │             └──────────────┬───────────────────┘   │
│  └────────────────────┘                            │                        │
│                                                     ▼                        │
│  ┌──────────────────────┐  subscribe()  ┌──────────────────────────────┐   │
│  │ SimulationClient      │──────────────►│ WorkstationApp.ts (12 pages) │   │
│  │ src/sim/*  (PROTECTED) │  state store  │  LeftNav → page views        │   │
│  │  - WS ws://…/ws/sim    │◄──┐           └──────┬───────────────────────┘   │
│  │  - LOCAL physics       │   │ WS               │ most pages                 │
│  │    fallback            │   │                  ▼                            │
│  └──────────┬─────────────┘   │        ┌──────────────────────────────┐     │
│             │ read-only via   │        │ CLIENT INTELLIGENCE (Engine C)│    │
│             └─────────────────┼───────►│ src/assure/*  (33 files)      │     │
│                               │        │  AssureTwinManager + chain    │     │
│                               │        └──────────────────────────────┘     │
│  ┌──────────────────────┐     │                                             │
│  │ assureApiClient       │     │   REST used by ONLY 2 pages:                │
│  │ src/api/client.ts     │─────┼──►  OptimizationView, RecommendationView    │
│  └──────────┬────────────┘     │                                             │
└─────────────┼──────────────────┼─────────────────────────────────────────── ┘
              │ REST /api/v1/*    │ WS /ws/sim
              ▼                   ▼
┌───────────────────────────────────────────────────────────────────────────┐
│ PYTHON BACKEND (FastAPI, backend/app/*)                                     │
│                                                                             │
│  Engine A: SimulationEngine  ──►  /ws/sim, /api/v1/simulation/*,            │
│   (simulation/manager.py)          /analytics/{virtual-downhole,pumpability,│
│                                    envelope}, /assurance/evaluate,          │
│                                    /optimization/solve                      │
│                                                                             │
│  Engine B: StatefulTwinEngine ─►  /analytics/{readiness,sensitivity,        │
│   (twin/time_stepper.py,           rehearsal,thermal-memory},               │
│    twin/engine.py::twin_manager)   /assurance/{audit,why},                  │
│                                    /optimization/{joint,css,srp,vfd,        │
│                                    inflow-governor}, /simulation/parameters │
│                                                                             │
│  AI: surrogate (RF), hazard, dyno, model_agreement, data_generator          │
│  Assurance: gatekeeper (SIM, static) + engine (TWIN, real)                  │
│  Optimization: optimizer (fake) / joint_optimizer (fake) / css (real DE)    │
│  Calibration: present but NO ROUTER (unreachable)                           │
│                                                                             │
│  SQLAlchemy 2.0 → SQLite assure_twin.db  (25 tables, create_all, seeded)    │
└───────────────────────────────────────────────────────────────────────────┘
```

### Key observations
1. **Two Python engines** (A, B) with different state schemas, split across endpoints by accident of history.
2. **The UI mostly ignores the backend** — 10 of 12 pages read `SimulationClient` state and compute via Engine C locally.
3. **The best backend engine (B) is the most orphaned** — no UI page calls its endpoints.
4. **`SimulationClient` has a full local physics fallback**, so the app is fully functional with the backend offline — which is *why* the disconnect went unnoticed.

---

## 2. Target Architecture (proposed — resolves the split)

**Principle:** one authoritative backend engine; the client intelligence consumes backend truth when online and degrades gracefully offline. Do **not** delete Engine C — it's the offline brain and the render driver — but make it *defer* to backend outputs when present.

**Decision: promote Engine B (StatefulTwinEngine) to authoritative.** Rationale: it's the richest (15 domains, 43-parameter registry), it already backs the *real* assurance/rehearsal/joint paths, and its state schema is a superset. Engine A stays only as the `/ws/sim` high-frequency streamer for the 3D scene (it's simpler and already wired to the protected client).

```
   3D SCENE (protected) ◄── /ws/sim ── Engine A  (streaming only; unchanged)

   WorkstationApp pages ─┬─ online ──► REST /api/v1/* backed by Engine B
                         └─ offline ─► Engine C local compute (fallback)

   Engine B  ── single source for: state estimate, forecast, rehearsal,
               optimization (real), assurance (real, can ABSTAIN),
               recommendation (derived), calibration (new router)
```

### Migration path (high level — see IMPLEMENTATION_PLAN.md for steps)
- **P1** De-fake the Engine-B-backed endpoints so their outputs are physics-derived (they mostly already are).
- **P2** Repoint the 2 REST-using pages + add a thin `assureApiClient` bridge in `AssureTwinManager` so Engine C *prefers* backend outputs when a fetch succeeds, else uses local.
- **P3** Replace `/optimization/solve` internals to call the real optimizer; replace the recommendation constant with a derived contract; wire the abstain path through the gate.
- **P4** Add calibration router; move secret to `.env`; fix onnx claim; fix sensor masking.

---

## 3. Data Flow — the OBSERVE→…→RECALIBRATE chain (target mapping)

| Spec step | Authoritative owner (target) | Current real implementation exists? |
|---|---|---|
| OBSERVE | Engine B state + SensorObservation | ✅ twin `step()` |
| VALIDATE | PhysicsValidation + DataQuality | ✅ client `PhysicsValidationEngine`, `DataQualityEngine`; ⚠ backend virtual_sensors masks defaults (H3) |
| ESTIMATE STATE | StateEstimator / virtual sensors | ✅ client `StateEstimator`; ⚠ backend confidence hardcoded (H4) |
| SIMULATE | Engine B `step()` | ✅ |
| FORECAST | `forecast/service.py` | ✅ real |
| REHEARSE | `forecast/rehearsal.py` (clone) | ✅ real |
| OPTIMIZE | `css_optimizer.py` (DE) — promote over fake optimizer | ✅ real exists; ❌ not the one wired to `/solve` (C3) |
| VERIFY | model_agreement + gatekeeper(12) | ⚠ agreement real; gate static (C2) |
| RECOMMEND | RecommendationContract (client) / recommendations API (backend) | ❌ backend hardcoded (C1) |
| ENGINEER REVIEW | RecommendationEvent + /approve | ✅ mechanism exists; ID hardcoded (M2) |
| OUTCOME | OutcomeReconciliation | ❌ client fabricates outcome (C6) |
| RECALIBRATE | calibration engine | ❌ no router (H2) |
| **ABSTAIN** ("NO SAFE RECOMMENDATION") | gatekeeper + no_safe_rec | ⚠ real in twin path, dead in SIM path (C2) |

---

## 4. Non-Functional Notes
- **Offline-first is a feature, keep it.** The local fallback is a genuine differentiator for a field tool with intermittent connectivity — don't regress it while wiring the backend.
- **Determinism.** All synthetic data and the DE optimizer are seeded (42). Preserve seeding for reproducible demos.
- **Provenance labeling** (`OBSERVED` / `ESTIMATED` / `PREDICTED` / `SIMULATED`) is partially implemented client-side (`ProvenanceEngine`) and must be honored on any backend-derived value surfaced in the UI.
