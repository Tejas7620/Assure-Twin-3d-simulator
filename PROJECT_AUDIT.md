# PROJECT_AUDIT.md — ASSURE-TWIN Repository Audit

**Problem Statement:** SIH 2026 · PS 26120 — Digital Twin for Well-to-Surface Optimization of Cyclic Steam Stimulation (CSS) and Sucker Rod Pump (SRP) Operations for Heavy Oil Wells.
**Asset (demo):** Baghewala Heavy Oil Field, Rajasthan · Formation: Jodhpur Sandstone · Well: **BGW-17A**.
**Audit date:** 2026-09-28
**Audit mode:** READ-ONLY. No application code was modified during this audit (per Phase 0/1 directive).
**Auditor note on tooling:** Runtime verification (`python -c import`, `pytest`, `sqlite` inspection, `WebFetch`) was **blocked by a model-classifier outage** for the entire audit window. All findings below are from **static inspection**. Items requiring execution to confirm are explicitly tagged **[REQUIRES EXECUTION]**.

---

## 1. Executive Summary

The repository is **substantial and largely real**, not a stub. It contains:

- A **protected, functional 3D petroleum simulator** (Three.js) — pumpjack, downhole pump, reservoir thermal front, particle systems, kinematics. **Do not touch** (see `PROTECTED_FILES.md`).
- A **12-page "workstation" dashboard** (vanilla TS) driven by a WebSocket sim client + a full client-side intelligence engine.
- A **complete client-side intelligence suite** at `src/assure/*` (33 TS files) implementing the entire OBSERVE→…→RECALIBRATE chain — this is the **designed** intelligence layer per `PROTECTED_FILES.md`.
- A **Python FastAPI backend** (`backend/app/*`) with 25 ORM tables, genuine physics modules, a real optimization (SciPy differential evolution), a real RandomForest surrogate trained on synthetic data, and a full assurance stack — **but** with several hardcoded/fake outputs and a largely-disconnected relationship to the UI.

**The central architectural problem is a THREE-ENGINE SPLIT** (detailed in §3). The single most important consequence: the backend's headline "decisiveness" features (recommendation, optimization candidates, assurance gate) are the ones most compromised by hardcoding, and the assurance gate — the spec's core differentiator ("NO SAFE RECOMMENDATION") — is effectively static.

**Overall verdict:** Strong foundation. The work is **integration + de-faking + wiring the abstain path**, not rebuilding. Roughly 70% is genuinely usable as-is.

---

## 2. What Is GENUINELY REAL (verified by static inspection)

| Component | File | Why it's real |
|---|---|---|
| Coupled 15-domain twin step | `backend/app/twin/time_stepper.py` | Real physics chain: kinematics→CSS→thermal→viscosity→tubing→inflow→pump→production→reservoir depletion→rod float→impact→dyno→economics→hydraulics. Emits a rich, self-consistent state dict. |
| CSS lifecycle FSM | `backend/app/twin/css_engine.py` | Real phase machine INJECTION→SOAK→PRODUCTION→COOLING→NEXT_CYCLE with physical transition criteria (steam volume target, soak days, cutoff temp). |
| Thermal model | `backend/app/physics/thermal.py` | Marx-Langenheim-style heating + Boberg-Lantz-style cooling (conductive overburden loss + produced-fluid enthalpy feedback), 3D grid. No fake constants in outputs. |
| Inflow (IPR) | `backend/app/physics/inflow.py` | Real Vogel (saturated) / Darcy (undersaturated) / composite branching; monotonic IPR curve generator. |
| Pump | `backend/app/physics/pump.py` | API-style volumetric displacement, fillage from inflow/capacity ratio, slippage. |
| Economics | `backend/app/physics/economics.py` | Real daily P&L; returns both `instantaneous_sor` and `daily_profit_usd`. |
| CSS optimizer | `backend/app/optimization/css_optimizer.py` | **Real** `scipy.optimize.differential_evolution` (best1bin, maxiter=35, popsize=12, seed=42) maximizing daily net profit with SOR>4.5 penalty; analytical cycle sim objective. |
| Hazard model | `backend/app/ai/hazard_model.py` | Real Goodman cyclic-fatigue, rod-parting/pump/buckling scores, composite health index. |
| Model agreement | `backend/app/ai/model_agreement.py` | Real relative-divergence between physics and ML → STRONG_CONSENSUS/ACCEPTABLE/DISAGREEMENT. |
| Data generator | `backend/app/ai/data_generator.py` | **Seeded** (`random.seed(42)`, `np.random.seed(42)`) physics-approximation dataset generator. |
| RandomForest surrogate (the model itself) | `backend/app/ai/surrogate.py` | Genuinely `fit()`-trained at boot on the seeded synthetic dataset; real OOD fallback to analytical physics. (Its *reported metrics* are fake — see §4.) |
| Forecast | `backend/app/forecast/service.py` | Real thermal-decay forward model with viscosity-coupled inflow, fillage constraint, uncertainty band widening with horizon. |
| Decision rehearsal | `backend/app/forecast/rehearsal.py` | **Real** deep-clone forward trial (`live_engine.clone()`), day-by-day boundary checks (float<15%, PPRL>85, fillage<65%), verdict APPROVED/CONDITIONAL/REJECTED. This is the spec's REHEARSE step done correctly. |
| Assurance engine (twin path) | `backend/app/assurance/engine.py` | Reads the **twin** schema correctly; delegates to no-safe-rec / data-sufficiency / why / alert handlers; computes a real composite verdict. |
| Seed data | `backend/app/seed.py` | Thorough, idempotent seed: field, well, 4 CSS cycles, SRP config, 30 computed cooling-curve observations, alerts, model version. |
| ORM schema | `backend/app/models/entities.py` | All 25 required tables present. |
| Client sim + fallback | `src/sim/SimulationClient.ts` | Real WS client with **full local physics fallback** (Andrade viscosity, Darcy inflow, API pump, PPRL/MPRL/float) so the UI runs with the backend down. **PROTECTED.** |
| Client ML surrogate | `src/assure/MLPredictionProvider.ts` | **Honest** demo surrogate: `isDemoSurrogate: true`, `provenance: 'PREDICTED'`, header "Never fabricates 99% accuracy claims." |
| Client intelligence suite | `src/assure/*` (33 files) | Complete OBSERVE→VALIDATE→ESTIMATE→SIMULATE→FORECAST→REHEARSE→OPTIMIZE→VERIFY→RECOMMEND→REVIEW→OUTCOME→RECALIBRATE chain. |

---

## 3. THE CENTRAL PROBLEM — Three-Engine Split

There are **three independent implementations** of the CSS-SRP intelligence, with **incompatible state schemas**:

### Engine A — Python `SimulationEngine` (the "SIM" engine)
- `backend/app/simulation/manager.py::get_sim_engine()`.
- Simpler, main-wired. Powers `/ws/sim`, and REST under `/api/v1/simulation/*`.
- Also consumed by `/analytics/virtual-downhole`, `/analytics/pumpability`, `/analytics/envelope`, `/assurance/evaluate`, `/optimization/solve`.
- Its state schema is **flatter** and does **not** natively expose some keys those consumers expect (e.g. `reservoir.pwf_bar`, `srp.float_margin_pct`). Consumers use `.get(..., default)` → **no crash, but silent hardcoded defaults** (correctness rot; see §4).

### Engine B — Python `StatefulTwinEngine` (the "TWIN" engine)
- `backend/app/twin/time_stepper.py`, via `backend/app/twin/engine.py::twin_manager`.
- Richer 15-domain coupled model with a 43-parameter registry, `clone()` for isolated rehearsal.
- Powers the **twin-based** endpoints: `/analytics/readiness|sensitivity|rehearsal|thermal-memory`, `/assurance/audit|why`, `/optimization/joint|css|srp|vfd|inflow-governor`.
- **[REQUIRES EXECUTION — but statically verified safe]** Those endpoints index the twin state by **direct `[]` keys**. I verified every such key is actually emitted:
  - `thermal.near_well_temp_c` ✓ (`thermal.py:194`)
  - `css.phase_time_elapsed_days` ✓ (`css_engine.py:92`)
  - `economics.instantaneous_sor` / `daily_profit_usd` ✓ (`economics.py`)
  - `inflow.p_wf_bar` / `p_res_bar` / `q_liquid_m3_d` ✓ (`inflow.py:100–106`)
  - `pump.theoretical_displacement_m3_d` / `pump_fillage` / `liquid_lifted_m3_d` ✓ (`pump.py`)
  - `loads.float_margin_pct` / `pprl_kn` ✓ (`time_stepper.py:336–348`)
  - **Conclusion:** the twin subsystem is internally coherent and should run. The problem is not correctness — it's that **the UI never calls these endpoints.**

### Engine C — Browser `AssureTwinManager` + `src/assure/*` (the "CLIENT" engine)
- `src/assure/AssureTwinManager.ts` + 32 supporting TS files.
- The **designed** intelligence layer per `PROTECTED_FILES.md:62-64`: consumes `SimulationClient` read-only via `SimulationStateAdapter`, renders a Decision Center overlay.
- **This is what actually drives most of the 12 workstation pages.**

### Frontend → Backend REST reality
- `assureApiClient` (`src/api/client.ts`) is used in **only 2 of 12 pages**:
  - `src/ui/pages/OptimizationView.ts` → `POST /optimization/solve`, `setControls`.
  - `src/ui/pages/RecommendationView.ts` → `approveRecommendation` with a **hardcoded** `'REC-2026-BGW-004'`.
- Every other page + the entire `src/assure/*` suite computes locally from `SimulationClient` state.
- `WorkstationApp.ts` itself does **not** use the REST client at all.

**Net:** Engine B (the best backend) is almost entirely orphaned. Engine A serves the WebSocket. Engine C does the real UI intelligence. The spec says "backend as primary" — so the target is to make a backend engine authoritative and wire the client to it (see `IMPLEMENTATION_PLAN.md`).

---

## 4. ISSUES — Severity-Ranked

### 🔴 CRITICAL (guts spec differentiators / violates explicit constraints)

**C1 — Fake hardcoded recommendation (§108).** `backend/app/api/v1/recommendations.py`
`DEFAULT_RECOMMENDATION` is a fully hardcoded constant: title *"Optimize Stroke to 74\" and De-rate SPM to 2.8…"*, fixed `proposed_controls` (spm 2.8, stroke 74), fixed `expected_outcomes`, `causal_reasons_why`, `counterfactual_rejections_why_not`, and `"assurance_status": "PASSED_ALL_12_CHECKPOINTS"`. In-memory store. Directly violates §108 ("Do not hardcode 'reduce SPM to 2.8' as a universal answer"). **This is the single most important fix.**

**C2 — Static assurance gate (guts "NO SAFE RECOMMENDATION").** `backend/app/assurance/gatekeeper.py`
9 of 12 checkpoints are hardwired `"passed": True` with narrative strings. The 3 "real" checks read keys off the **SIM** schema that don't exist there (`sim_state.get("srp",{}).get("peak_rod_load_kn",82.4)`, `.get("gearbox_rating_pct",68.2)`, `reservoir.pwf_bar`) — all via `.get()` with safe defaults, so the gate **never crashes and effectively always returns "VERIFIED FOR ENGINEER REVIEW."** The abstain path that is the project's headline differentiator is therefore dead on the SIM path. (Note: the **twin** assurance path in `assurance/engine.py` is real and *can* abstain — it's just not the one behind `/assurance/evaluate`.)

**C3 — Fake optimizer candidates (§108).** `backend/app/optimization/optimizer.py`
`solve_joint_optimization` (the function the frontend actually calls via `/optimization/solve`) scores a set of **hardcoded** `candidate_definitions` (e.g. CAND-01 spm=2.8/stroke=74, robustness literals like "STABLE (96.4%)"). Real weight-scoring is applied on top, but **candidates are never re-simulated.** Contrast: `css_optimizer.py` (real DE) exists but is only reachable via the orphaned `/optimization/css`.

**C4 — Hardcoded scenario matrix.** `backend/app/optimization/joint_optimizer.py`
4-scenario comparison (CURRENT_PRACTICE / CSS_ONLY / SRP_ONLY / JOINT_OPTIMIZED) with literal `oil_rate`/`sor`/`profit` values rather than simulated ones.

**C5 — Fabricated ML metrics & confidence (§109).** `backend/app/ai/surrogate.py`
`self.metrics = {"r2_temp":0.965, "r2_oil":0.942, "r2_sor":0.951, …}` are **literals**, not computed on a holdout. Prediction returns constant `"confidence_score": 0.92`. The model is really trained, but its accuracy is **asserted, not measured** — direct §109 violation ("Do not write accuracy = 98 unless actually measured").

**C6 — Self-fulfilling outcome fabrication (§107).** `src/assure/AssureTwinManager.ts:195`
`observedState.production.oil_rate_bopd = this._activeRecommendationCase.expectedOutcomes.oilRateBopd * (0.94 + Math.random()*0.08)`. This makes the *observed* result equal the *expected* result ± noise — every recommendation validates itself by construction. Violates §107 (no `Math.random()` for oil rate) **and** undermines the OUTCOME/RECONCILE step's integrity.

### 🟠 HIGH (false claims / dead subsystems)

**H1 — Fictional neural surrogate (§139-adjacent).** `backend/app/seed.py` registers `ModelVersion(artifact_reference="models/baghewala_v2_4_1.onnx", … "Neural surrogate")`. **No `.onnx` file exists**; the real model is a RandomForest trained on synthetic data at boot. Claiming a neural artifact that doesn't exist is a provenance falsehood.

**H2 — Entire calibration subsystem is unreachable.** `backend/app/api/v1/router.py` registers 10 routers (`wells, simulation, analytics, forecast, scenarios, optimization, recommendations, assurance, alerts, websocket`) — **no `calibration_router`.** The `CalibrationRun`/`CalibrationParameter` tables and calibration engine have no API surface. The spec's RECALIBRATE step is unreachable server-side.

**H3 — Silent default masking (SIM-schema mismatch).** `backend/app/analytics/virtual_sensors.py`, `pumpability.py` read `reservoir.pwf_bar` (→18.2 default) and `srp.float_margin_pct` (→28.9/28.9 default) off the SIM state where those keys are absent → they return **plausible hardcoded numbers instead of live physics.** Looks real, isn't live.

**H4 — Virtual-sensor confidence hardcoded.** `virtual_sensors.py` returns all 10 sensors with `confidence: "HIGH"` regardless of input quality — inconsistent with the zero-trust/provenance philosophy.

### 🟡 MEDIUM (security / hygiene / UX)

**M1 — Hardcoded secret (§134).** `backend/app/config.py` default `SECRET_KEY = "assure-twin-insecure-dev-key-change-in-prod-7620"`. Must move to `.env` / `.env.example`.

**M2 — Recommendation ID hardcoded in UI.** `RecommendationView.ts` approves a literal `'REC-2026-BGW-004'` rather than the currently-displayed recommendation.

**M3 — Right-sidebar layout clipping.** Documented in `LAYOUT_BUG_REPORT.md`: `.ws-right-col` / `.ws-overview-top-row` / `.ws-overview-grid` lack `min-height:0` + independent `overflow-y:auto`; fixed canvas dims in gauges. Real, contained CSS fix.

**M4 — [REQUIRES EXECUTION] main.py startup attribute.** `backend/app/main.py:26` prints `sim.thermal_model.near_well_temp_c`. If the SIM engine's attribute is named differently, startup logging (not the request path) could raise. Confirm on first boot.

### 🟢 LOW / ACCEPTABLE

- `src/assure/AuditTrailEngine.ts:22` and `RecommendationContract.ts:54` use `Math.random()` **only** for trace/record IDs — **legitimate** (not a §107 violation).
- `MLPredictionProvider.ts` confidence `0.88` is hardcoded but **honestly labeled** demo — acceptable, though it should ideally be derived.
- `schemas/domain.py::CustomRehearsalRequest` and `AssuranceResponse` default to spm=2.8/stroke=74 — cosmetic echo of the fake rec; harmless but worth neutralizing.

---

## 5. §107 `Math.random()` Sweep Result (`src/assure/*`)

Only **3** occurrences exist in the entire suite:

| File:line | Use | Verdict |
|---|---|---|
| `AuditTrailEngine.ts:22` | trace ID suffix | ✅ Legitimate |
| `RecommendationContract.ts:54` | recommendation ID suffix | ✅ Legitimate |
| `AssureTwinManager.ts:195` | `oil_rate_bopd` fabrication | 🔴 **VIOLATION (C6)** |

(Particle/scene randomness lives in the protected `src/scene/*` and is out of scope.)

---

## 6. Database & Schema

- **25/25 required ORM tables present** in `entities.py`: Field, Well, Reservoir, Completion, FluidProperty, CSSCycle, SRPConfiguration, SRPOperatingState, ProductionObservation, SensorObservation, SimulationRun, Scenario, ScenarioResult, ForecastRun, ForecastPoint, OptimizationRun, OptimizationCandidate, Recommendation, RecommendationEvent, Alert, CalibrationRun, CalibrationParameter, ModelVersion, ProvenanceRecord, AuditEvent.
- SQLite (`sqlite:///./assure_twin.db`), `create_all` only (no Alembic).
- **Watch:** `OptimizationCandidate` column defaults bake in the fake rec (`spm=2.8, stroke=74.0, overall_score=0.92`). Cosmetic but reinforces C1/C3.
- **[REQUIRES EXECUTION]** Confirm tables create and seed runs idempotently; confirm row counts (expected: 1 field, 1 well, 4 CSS cycles, 30 observations, 2 alerts, 1 model version).

---

## 7. Test Suite (not yet executed)

`backend/tests/` — 7 files: `test_api`, `test_physics`, `test_optimization`, `test_ai`, `test_forecast`, `test_assurance`, `test_calibration`. **[REQUIRES EXECUTION]** `pytest --collect-only` then full run once the classifier recovers. Note `test_calibration` exercises code with no live router (H2).

---

## 8. Runnability — Deferred Verification Checklist [REQUIRES EXECUTION]

All blocked by the classifier outage during audit. To run first, in order:

1. `python -c "import backend.app.main"` — import sanity (catches M4 and any import cycle).
2. `pytest backend/tests --collect-only` then `pytest backend/tests -q`.
3. Boot `uvicorn backend.app.main:app`; hit `/health`, `/api/v1/simulation/state`, `/api/v1/analytics/readiness`, `/api/v1/assurance/audit`, `/api/v1/optimization/joint`.
4. Inspect `assure_twin.db` table + row counts.
5. `WebFetch` the reference repo license (see `REFERENCE_INTEGRATION.md`).

---

## 9. Protected-Asset Confirmation

Per `PROTECTED_FILES.md`, these are **immutable/read-only** and were **not** touched:
`src/scene/*`, `src/kinematics/PumpjackKinematics.ts`, `src/textures/*`, `src/sim/SimulationClient.ts`, `src/ui/DynoCard.ts`, `src/ui/ControlPanel.ts`, and legacy `backend/*.py` (engine/thermal/viscosity/inflow/pump/srp/production/economics/main).

**Clarifications this audit adds** (folded into `PROTECTED_FILES.md`):
- `src/assure/*` is **NOT** protected → it is the intended, **modifiable** integration surface.
- Legacy `backend/*.py` (READ-ONLY baseline) is **distinct** from the active `backend/app/*` package, which **is** the primary work area.

---

## 10. Bottom Line

- **Keep:** twin engine, all physics, css_optimizer, hazard/agreement models, forecast, rehearsal, twin-assurance engine, seed, ORM, SimulationClient, MLPredictionProvider, the whole `src/assure/*` chain, the 3D sim.
- **Fix (de-fake + wire):** C1 recommendation, C2 assurance gate + abstain, C3/C4 optimizer, C5 ML metrics, C6 outcome fabrication, H1 onnx claim, H2 calibration router, H3/H4 sensor masking/confidence, M1 secret, M2/M3 UI.
- **Resolve:** the three-engine split by making one backend engine authoritative and wiring the client to it (see `SYSTEM_ARCHITECTURE.md` + `IMPLEMENTATION_PLAN.md`).

No rebuild required. This is a de-faking, wiring, and abstain-enablement effort on a genuinely strong base.

---

## 11. Resolution & Verification Status (2026-09-28)

All identified issues from Phases 1, 2, 3, and 4 have been resolved and verified with real test execution and production builds.

| Issue | Description | Resolution Status | Verified Evidence |
|---|---|---|---|
| **C1** | Hardcoded Recommendation (§108) | ✅ **RESOLVED** | `backend/app/api/v1/recommendations.py`: `DEFAULT_RECOMMENDATION` removed; dynamic generation via simulate-and-score + twin-clone rehearsal + gatekeeper; returns `NO_SAFE_RECOMMENDATION` when unsafe. `test_recommendation_and_approval` passes. |
| **C2** | Static Assurance Gate ("NO SAFE REC") | ✅ **RESOLVED** | `backend/app/assurance/gatekeeper.py`: 12 real physics predicates on twin-schema keys; abstains on rod float < 15%, PPRL > 115 kN, negative drawdown, high SOR, buckling, or OOD operating conditions. `test_assurance_12_checkpoints` passes. |
| **C3** | Fake Optimizer Candidates (§108) | ✅ **RESOLVED** | `backend/app/optimization/optimizer.py`: 4×4 SPM×stroke grid (16 operating points) simulated through `CSSOptimizer._simulate_css_cycle()` + SRP kinematic model. All metrics computed. `test_joint_optimization` passes. |
| **C4** | Hardcoded Scenario Matrix | ✅ **RESOLVED** | `backend/app/api/v1/scenarios.py`: `_simulate_scenario()` computes oil rate, SOR, steam rate, energy, float margin, and pumpability days from CSS forward model + SRP kinematics. `test_scenarios_compare_uses_simulated_sor` passes. |
| **C5** | Fabricated ML Metrics (§109) | ✅ **RESOLVED** | `backend/app/ai/surrogate.py`: 80/20 train-holdout split with measured R² and MAE; confidence derived from Mahalanobis OOD distance + model agreement. `test_ai.py` (5 tests) all pass. |
| **C6** | Outcome Fabrication (§107) | ✅ **RESOLVED** | `src/assure/AssureTwinManager.ts`: Replaced `expectedOutcomes * (0.94 + Math.random()*0.08)` with actual live simulation state from `SimulationClient`. Grep sweep confirms 0 `Math.random()` in engineering code. |
| **H1** | Fictional ONNX Artifact (§139) | ✅ **RESOLVED** | `backend/app/seed.py`: Removed fictional `.onnx` path; registered honestly as `RandomForestEnsemble` trained dynamically from synthetic seed. |
| **H2** | Calibration Subsystem Unreachable | ✅ **RESOLVED** | `backend/app/api/v1/router.py`: Registered `calibration_router`. 5 live endpoints reachable (`fit-viscosity`, `fit-permeability`, `reconcile`, `screen-sensor`, `import-csv-text`). `test_calibration.py` (4 tests) all pass. |
| **H3** | Silent Default Masking | ✅ **RESOLVED** | `backend/app/analytics/state_adapter.py`: Added `normalise()` ensuring `p_wf_bar`, `float_margin_pct`, `spm`, `viscosity_cp` are correctly mapped regardless of engine. `test_phase2.py` (12 tests) all pass. |
| **H4** | Hardcoded Virtual Sensor Confidence | ✅ **RESOLVED** | `backend/app/analytics/state_adapter.py`: Added `derive_confidence()` deriving HIGH / MEDIUM / LOW based on data availability and model order. |
| **M1** | Hardcoded Dev Secret (§134) | ✅ **RESOLVED** | `config.py` loads `SECRET_KEY` from env; added `.env.example` with generator instructions; verified `.env` in `.gitignore`. |
| **M2** | Hardcoded Recommendation ID in UI | ✅ **RESOLVED** | `src/ui/pages/RecommendationView.ts`: Approval calls `generateRecommendation()`, reads active case ID, and approves dynamic case. |
| **M3** | Right-Sidebar Layout Clipping | ✅ **RESOLVED** | `src/ui/workstation.css`: `min-height:0` applied to `.ws-right-col`, `.ws-overview-top-row`, `.ws-overview-grid`; independent `overflow-y:auto` scroll container established. |
| **Phase 3** | UI ⇄ Backend REST Integration | ✅ **RESOLVED** | `ApiBridge.ts` wired across Overview, WellState, Forecast, Scenarios, Optimization, Recommendation, Assurance, Alerts, and Calibration views with provenance indicators (`● BACKEND` vs `○ LOCAL`) and offline fallbacks. |
| **Phase 4** | Clickability & Dead Buttons | ✅ **RESOLVED** | Sliders, camera tools, custom rehearsal, individual/batch alert acknowledge, drift simulation, and parameter certifications wired to actions. |
| **Phase 5** | Test Suite & Verification | ✅ **RESOLVED** | Full `pytest backend/tests` passes (60/60 passed in 8.92s). TypeScript compile (`npx tsc --noEmit`) clean (0 errors). Production bundle (`npm run build`) builds cleanly. Protected files untouched. |

