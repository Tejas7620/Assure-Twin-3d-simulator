# BACKEND_ARCHITECTURE.md — ASSURE-TWIN Python Backend

**Package:** `backend/app/*` (the active backend; **not** the legacy read-only `backend/*.py`).
**Stack:** Python 3.11+, FastAPI, Pydantic v2 + pydantic-settings, SQLAlchemy 2.0, SQLite, NumPy, SciPy, scikit-learn, WebSockets.
**Status:** describes the code as-audited. "Target" items are proposals, not yet implemented.

---

## 1. Module Map

```
backend/app/
├── main.py                 FastAPI app, CORS, /health, /ws/sim, global exc handler, lifespan(init_db+seed warmup)
├── config.py               Settings (pydantic-settings). ⚠ M1 hardcoded SECRET_KEY default
├── database.py             engine, SessionLocal, init_db (create_all + seed)
├── seed.py                 Idempotent foundational seed. ⚠ H1 registers fictional .onnx
│
├── api/v1/
│   ├── router.py           Aggregates 10 routers. ⚠ H2 no calibration router
│   ├── wells.py            Well/field/reservoir read endpoints
│   ├── simulation.py       Engine A: /state /step /reset /control(s) /demo + /parameters (Engine B registry)
│   ├── analytics.py        virtual-downhole,pumpability,envelope (Engine A) | readiness,sensitivity,rehearsal,thermal-memory (Engine B)
│   ├── forecast.py         Forecast endpoints (Engine A state → forecast/service)
│   ├── scenarios.py        Scenario compare
│   ├── optimization.py     /solve (fake optimizer) | /joint(fake) | /css(REAL DE) | /srp /vfd /inflow-governor (Engine B)
│   ├── recommendations.py  ⚠ C1 hardcoded DEFAULT_RECOMMENDATION + /approve
│   ├── assurance.py        /evaluate (Engine A + static gate) | /audit /why (Engine B + real engine)
│   ├── alerts.py           Alert list/ack
│   └── websocket.py        Extra WS router
│
├── simulation/            ENGINE A
│   └── manager.py          get_sim_engine() singleton (SimulationEngine)
│   └── viscosity.py        used by forecast/service
│
├── twin/                  ENGINE B  ★ richest, most orphaned
│   ├── time_stepper.py     StatefulTwinEngine: 15-domain coupled step, clone()
│   ├── engine.py           twin_manager (active well accessor)
│   ├── parameters.py       43-parameter registry
│   └── css_engine.py       CSS phase FSM (emits phase_time_elapsed_days etc.)
│
├── physics/               Shared physics (used by Engine B)
│   ├── thermal.py          Marx-Langenheim heat + Boberg-Lantz cool, 3D grid, get_state()
│   ├── reservoir.py        Depletion / effective pressure
│   ├── inflow.py           Vogel/Darcy/composite IPR (+ curve)
│   ├── pump.py             API displacement, fillage, slippage
│   ├── production.py       Oil/water rates, cumulative
│   ├── economics.py        Daily P&L, SOR (instantaneous_sor, daily_profit_usd)
│   ├── fluids.py           Andrade viscosity, density
│   ├── tubing.py           Depth-dependent T & viscosity profile
│   ├── rod_string.py       Tapered rod string, buoyant weight
│   ├── srp.py              SRP kinematics model
│   ├── drag.py             Viscous rod drag (integrated over depth)
│   ├── float_model.py      Rod float margin, buckling, compression depth
│   ├── impact.py           Fluid pound / impact loading
│   ├── dynamometer.py      Surface/downhole card synthesis, PPRL/MPRL
│   └── wellbore.py         Hydraulics
│
├── ai/
│   ├── data_generator.py   Seeded synthetic CSS dataset (200 samples)
│   ├── surrogate.py        RandomForest ensemble (REAL fit) ⚠ C5 fake metrics + const confidence
│   ├── hazard_model.py     Goodman fatigue, health index (REAL)
│   ├── dyno_classifier.py  Rule-based dyno diagnosis (honest heuristic, not ML)
│   └── model_agreement.py  Physics-vs-ML divergence (REAL)
│
├── optimization/
│   ├── optimizer.py        ⚠ C3 solve_joint_optimization scores HARDCODED candidates
│   ├── joint_optimizer.py  ⚠ C4 hardcoded 4-scenario matrix
│   ├── css_optimizer.py    ✅ REAL scipy differential_evolution
│   ├── srp_controller.py   SRP setpoint physics controller (Engine B)
│   ├── vfd_shaping.py      VFD stroke shaping (Engine B)
│   └── inflow_limited.py   Inflow-limited governor (Engine B)
│
├── forecast/
│   ├── service.py          ✅ REAL multi-horizon forward model
│   ├── rehearsal.py        ✅ REAL clone-based decision rehearsal
│   ├── readiness.py        CSS readiness (Engine B state)
│   ├── sensitivity.py      Sensitivity analysis (Engine B state)
│   └── thermal_memory.py   Thermal memory summary
│
├── assurance/
│   ├── gatekeeper.py       ⚠ C2 12-checkpoint gate, 9 hardwired pass, SIM-key mismatch
│   ├── engine.py           ✅ REAL AssuranceEngine (twin schema) — composes below
│   ├── no_safe_rec.py      NO SAFE RECOMMENDATION handler (real logic)
│   ├── request_more_data.py Telemetry sufficiency
│   ├── why_engine.py       Why/why-not rationale
│   └── alert_engine.py     Multi-tier alerts
│
├── analytics/
│   ├── virtual_sensors.py  ⚠ H3/H4 SIM-key defaults + hardcoded HIGH confidence
│   ├── pumpability.py      Time-to-boundary window (⚠ SIM-key default)
│   └── envelope.py         Operating envelope
│
├── calibration/           ⚠ H2 present but NO ROUTER → unreachable
│
├── models/entities.py     25 ORM tables
└── schemas/domain.py      Pydantic v2 response contracts
```

---

## 2. The Two-Engine Reality (backend-internal)

| | Engine A — `SimulationEngine` | Engine B — `StatefulTwinEngine` |
|---|---|---|
| Location | `simulation/manager.py` | `twin/time_stepper.py` |
| Accessor | `get_sim_engine()` | `twin_manager.get_active_well()` |
| Domains | fewer, flatter state | 15 coupled domains |
| Params | fixed attributes (`sim.spm`, `sim.pwf_bar`…) | 43-parameter registry, `set_parameter` |
| Cloning | no | `clone()` deep-copy → rehearsal |
| Powers | `/ws/sim`, `/simulation/*`, `/analytics/{virtual-downhole,pumpability,envelope}`, `/assurance/evaluate`, `/optimization/solve` | `/analytics/{readiness,sensitivity,rehearsal,thermal-memory}`, `/assurance/{audit,why}`, `/optimization/{joint,css,srp,vfd,inflow-governor}`, `/simulation/parameters*` |
| Schema keys | missing `reservoir.pwf_bar`, `srp.float_margin_pct` (consumers default) | full: `thermal.near_well_temp_c`, `css.phase_time_elapsed_days`, `inflow.{p_wf_bar,p_res_bar,q_liquid_m3_d}`, `pump.{theoretical_displacement_m3_d,pump_fillage,liquid_lifted_m3_d}`, `loads.{float_margin_pct,pprl_kn}`, `economics.{instantaneous_sor,daily_profit_usd}` — all verified present |

**Target:** Engine B authoritative for intelligence; Engine A retained only for `/ws/sim` streaming to the protected 3D scene.

---

## 3. Endpoint Inventory (as registered in `router.py`, prefix `/api/v1`)

- `wells`: field/well/reservoir reads.
- `simulation`: `/state`, `/step`, `/reset`, `/control`, `/controls`, `/demo`, `/parameters` (GET/PUT/batch/reset).
- `analytics`: `/virtual-downhole`, `/pumpability`, `/envelope`, `/readiness`, `/thermal-memory`, `/sensitivity`, `/rehearsal`.
- `forecast`: forecast generation.
- `scenarios`: scenario comparison.
- `optimization`: `/solve`, `/joint`, `/css`, `/srp`, `/vfd`, `/inflow-governor`.
- `recommendations`: list/get/approve.
- `assurance`: `/evaluate`, `/evaluate-candidate`, `/audit`, `/why`.
- `alerts`: list/ack.
- `websocket`: extra WS.
- **Absent:** `calibration` (H2).
- **App-level (main.py):** `/health`, `/ws/sim`.

---

## 4. Persistence

- SQLite `sqlite:///./assure_twin.db`; SQLAlchemy 2.0; `create_all` on startup (no Alembic).
- `seed.py` idempotent (skips if field exists): 1 field, 1 well (BGW-17A), 4 CSS cycles, SRP config, 30 cooling-curve observations, 2 alerts, 1 model version.
- ⚠ `OptimizationCandidate` defaults bake spm=2.8/stroke=74/score=0.92 (echoes C1/C3).

---

## 5. Backend Fix Order (summary; full detail in IMPLEMENTATION_PLAN.md)

1. **C1** recommendations: derive from real optimizer + gate, remove the constant.
2. **C2** gatekeeper: read Engine B keys, implement real 12 checks, enable ABSTAIN.
3. **C3/C4** optimization: route `/solve` and `/joint` through real simulate-and-score (reuse `css_optimizer` + Engine B `clone()`), drop hardcoded matrices.
4. **C5** surrogate: compute metrics on a held-out split; derive confidence from OOD distance/agreement.
5. **H1** seed: stop claiming `.onnx`; register the real RF artifact honestly (or persist a real one).
6. **H2** add `calibration_router`.
7. **H3/H4** analytics: read correct keys or migrate to Engine B; derive sensor confidence.
8. **M1** move SECRET_KEY to `.env` + `.env.example`.

Each step: implement → run its `backend/tests/*` file → inspect output → fix. No step begins before the prior one is green.
