# IMPLEMENTATION_PLAN.md — ASSURE-TWIN Execution Roadmap

**Method (per master prompt):** incremental — **build → test → inspect → fix**, one change at a time, backend-first. No step starts until the previous step's tests are green and its output inspected. Protected files are never modified. Every fix must produce **physics-derived** output (no hardcoding a universal answer — §108) and must **not** fabricate randomness for engineering quantities (§107) or assert unmeasured accuracy (§109).

**Gate on execution:** the runtime-verification steps below are currently **blocked by the classifier outage** that prevented Bash/WebFetch during the audit. Phase R (Runnability) must be completed the moment tooling recovers, and **before** shipping any fix that claims to pass tests.

---

## Phase R — Runnability Baseline (DO FIRST when Bash recovers) [REQUIRES EXECUTION]
- R1. `python -c "import backend.app.main"` → catches import cycles & `main.py:26` attribute (M4).
- R2. `pytest backend/tests --collect-only` then `pytest backend/tests -q` → record baseline pass/fail per file.
- R3. `uvicorn backend.app.main:app --port 8000`; smoke `/health`, `/api/v1/simulation/state`, `/api/v1/analytics/readiness`, `/api/v1/assurance/audit`, `/api/v1/optimization/joint`, `/api/v1/optimization/css`.
- R4. Inspect `assure_twin.db` — table count (25) and seed row counts.
- R5. `WebFetch` reference-repo license → finalize `REFERENCE_INTEGRATION.md`.
- **Exit criteria:** import OK; baseline test status recorded; server boots; DB seeded. Do not proceed to de-faking claims of "tests pass" until R2 is real.

---

## Phase 1 — Backend De-Faking (primary task; each item independently testable)

### 1.1 — Recommendations (C1, §108) ★ highest priority
- **File:** `backend/app/api/v1/recommendations.py`.
- **Do:** delete `DEFAULT_RECOMMENDATION` constant. Build recommendations from: real optimizer output (Phase 1.3) → rehearsal verdict (`forecast/rehearsal.py`) → assurance gate (Phase 1.2). Persist to `Recommendation`/`RecommendationEvent`. `/approve` applies the *selected* recommendation's controls.
- **Must:** support returning **NO SAFE RECOMMENDATION** / **REQUEST MORE DATA** when the gate/rehearsal fails — not a fallback constant.
- **Test:** extend `test_api`; assert output varies with input state (feed two different states → different controls); assert an unsafe state yields ABSTAIN.

### 1.2 — Assurance gate + ABSTAIN (C2) ★ core differentiator
- **File:** `backend/app/assurance/gatekeeper.py`.
- **Do:** read **Engine B** state keys (verified present: `loads.float_margin_pct`, `loads.pprl_kn`, `thermal.near_well_temp_c`, `inflow.p_wf_bar`, `pump.pump_fillage`, `economics.instantaneous_sor`). Implement all 12 checks as real predicates (not `passed:True`). Compose with `no_safe_rec.py` + `request_more_data.py`. Return VERIFIED / CONDITIONAL / **NO SAFE RECOMMENDATION** / **REQUEST MORE DATA**.
- **Repoint** `/assurance/evaluate` to Engine B (or delete it in favor of `/audit`) so the primary path can abstain.
- **Test:** `test_assurance` — construct a state that violates float/PPRL and assert ABSTAIN; a healthy state → VERIFIED; missing dyno → REQUEST MORE DATA.

### 1.3 — Optimization (C3/C4, §108)
- **Files:** `optimization/optimizer.py`, `optimization/joint_optimizer.py`.
- **Do:** replace hardcoded candidates/matrix with **simulate-and-score**: generate candidate control sets, evaluate each via Engine B `clone()`+`step()` (or the analytical cycle sim already in `css_optimizer.py`), score by weighted objective, rank. Reuse `css_optimizer.py`'s real DE where a continuous search fits.
- **Test:** `test_optimization` — assert the winning candidate changes when weights change; assert no candidate string literals; assert SOR penalty actually rejects high-SOR candidates.

### 1.4 — Surrogate metrics & confidence (C5, §109)
- **File:** `ai/surrogate.py`.
- **Do:** seeded train/holdout split; compute R²/MAE on holdout; store **measured** numbers. Replace constant `confidence_score` with a value derived from OOD distance + `model_agreement`.
- **Test:** `test_ai` — assert `metrics` equal recomputed holdout values (not literals); assert confidence varies with OOD input.

### 1.5 — Fictional ONNX (H1, §139)
- **File:** `seed.py`.
- **Do:** stop registering a non-existent `.onnx` "neural surrogate." Either (a) register the **RandomForest** honestly (`model_type="RandomForestEnsemble"`, `training_data="synthetic-seeded"`, no artifact path unless one is actually persisted), or (b) persist the trained RF (e.g. joblib) and point to that real file.
- **Test:** assert `ModelVersion.artifact_reference` points to a file that exists, or is null with an honest description.

### 1.6 — Calibration router (H2)
- **Files:** add `backend/app/api/v1/calibration.py`; register in `router.py`.
- **Do:** expose the existing calibration engine (RECALIBRATE step): accept observed-vs-simulated deltas, adjust parameters, write `CalibrationRun`/`CalibrationParameter`.
- **Test:** `test_calibration` should now exercise a live route.

### 1.7 — Analytics key mismatch + sensor confidence (H3/H4)
- **Files:** `analytics/virtual_sensors.py`, `analytics/pumpability.py`.
- **Do:** either migrate these to Engine B state (preferred) or fix the SIM-schema reads so they use **live** values, not `.get(default)`. Derive per-sensor confidence from input health, not constant "HIGH".
- **Test:** assert sensor values move with state; assert confidence degrades when an input is stale/missing.

### 1.8 — Secret hygiene (M1, §134)
- **Files:** `config.py`, add `.env.example`, ensure `.gitignore` covers `.env`.
- **Do:** remove hardcoded `SECRET_KEY` default; load from env; document in `.env.example` with a placeholder.
- **Test:** import with no env → safe behavior (generated/ephemeral or explicit error), never the committed literal.

**Phase 1 exit:** all `backend/tests/*` green (really run — Phase R), and a manual check that identical inputs → identical outputs and *different* inputs → *different* outputs for rec/opt/gate.

---

## Phase 2 — Resolve the Three-Engine Split
- 2.1 Confirm **Engine B authoritative** (per SYSTEM_ARCHITECTURE §2). Keep Engine A for `/ws/sim` only.
- 2.2 Reconcile any endpoints still on Engine A that feed the UI (analytics trio) onto B or fix their schema.
- 2.3 Ensure Pydantic response models in `schemas/domain.py` match Engine B outputs for every UI-facing endpoint.
- **Test:** contract tests per endpoint; snapshot response keys.

---

## Phase 3 — Frontend Integration (non-destructive; Engine C stays)
- 3.1 Add **backend-prefer bridge** in `AssureTwinManager` (try REST, fall back to local). Do **not** modify `SimulationClient.ts` (protected).
- 3.2 Fix the 2 already-wired pages: Optimization (now real `/solve`) and Recommendation (real id from displayed rec — M2; wire ABSTAIN state in UI).
- 3.3 Fix **C6** in `AssureTwinManager.ts:195`: stop fabricating `oil_rate_bopd` from `expectedOutcomes * (0.94+random)`. Use real simulated/observed outcome from backend or the local physics fallback — never `Math.random()` for a production quantity.
- 3.4 Progressively wire pages 3–7, 10–12 to their Engine B endpoints (see INTEGRATION_MAP §3).
- **Test after each page:** app still runs with backend **stopped** (offline regression); values carry provenance labels.

---

## Phase 4 — Frontend Repair (only what's broken — §5)
- 4.1 Apply the CSS fix from `LAYOUT_BUG_REPORT.md` (M3): `min-height:0` on `.ws-right-col`/`.ws-overview-top-row`/`.ws-overview-grid`; `grid-template-rows: minmax(0,1fr) auto`; independent `overflow-y:auto` scroll container; responsive canvas dims in gauges.
- 4.2 Audit clickability/dead buttons across the 12 pages; wire or disable-with-reason.
- **Constraint:** repair only; do not redesign the ~70% that works, and never touch protected 3D/kinematics/textures.

---

## Phase 5 — Verification & Honesty Pass
- 5.1 Full `pytest` green; server smoke green; offline mode green.
- 5.2 Grep sweep: no `Math.random()` for oil/temp/pressure/viscosity/rod-load/float/alerts/recommendations/confidence (§107); only seeded sensor-noise permitted.
- 5.3 Grep sweep: no asserted accuracy without in-repo measurement (§109); no neural/.onnx/field-validated/real-telemetry claims (§139).
- 5.4 Confirm `.env`/`.env.example`; no secrets in git (§134).
- 5.5 Update `PROJECT_AUDIT.md` findings to "resolved" with evidence (test names / measured numbers).

---

## Sequencing rules
- **One change → its test → inspect → fix → next.** Never batch de-faking edits blindly.
- **Backend before frontend.** Frontend wiring assumes a real backend response.
- **Never break offline mode.** Re-verify after each frontend change.
- **Protected files are immutable.** If a fix seems to require editing one, stop and find a non-destructive seam (adapter/bridge).
- **No confirmation-seeking on normal engineering calls** (per master prompt) — proceed; only stop for genuine ambiguity that blocks correctness.
