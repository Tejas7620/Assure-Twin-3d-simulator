# MODEL_ARCHITECTURE.md — ASSURE-TWIN Models (Physics + AI/ML)

**Scope:** every predictive/analytical model in the system — physics-based and learned — with an honest provenance label for each. This document is deliberately conservative about accuracy claims per §109/§139: **no accuracy number is asserted here unless this doc also says where it was measured.**

---

## 1. Provenance Taxonomy (must be honored in UI)

| Label | Meaning | Trust |
|---|---|---|
| `OBSERVED` | Direct sensor/seed telemetry | Highest |
| `ESTIMATED` | Virtual sensor / state estimator from physics | Medium-high |
| `SIMULATED` | Deterministic physics forward model | High (bounded by model fidelity) |
| `PREDICTED` | Learned surrogate (RF/regression) | Medium; must carry confidence + OOD flag |
| `OPTIMIZED` | Output of an optimizer over simulated candidates | As good as the objective/constraints |

---

## 2. Physics Models (SIMULATED) — all real

| Model | File | Method | Notes |
|---|---|---|---|
| Viscosity–temperature | `physics/fluids.py` | Andrade `μ = μ_ref · exp(B·(1/T − 1/T_ref))` | Heavy-oil steep sensitivity; drives everything |
| Thermal front | `physics/thermal.py` | Marx-Langenheim heating; Boberg-Lantz-style cooling (conductive overburden + produced-fluid enthalpy) | 3D grid; `get_state()` exposes near_well_temp_c, front radius, reserve GJ |
| Reservoir | `physics/reservoir.py` | Material-balance depletion, effective pressure | Stateful drawdown |
| Inflow (IPR) | `physics/inflow.py` | Vogel (saturated) / Darcy (undersaturated) / composite; productivity index from heated/cold radial zones | Monotonic IPR curve generator included |
| Pump | `physics/pump.py` | API volumetric displacement, fillage = f(inflow/capacity), slippage via clearance | Emits theoretical_displacement_m3_d, pump_fillage, liquid_lifted_m3_d |
| Production | `physics/production.py` | Inflow∧capacity coupling, water cut split, cumulative | Inflow-limited when capacity>inflow |
| Rod string | `physics/rod_string.py` | Tapered sections, buoyant weight | Feeds float + dyno |
| SRP kinematics | `physics/srp.py` | Crank-slider, peak accel factors (up/down) | High-freq 3D sync |
| Viscous drag | `physics/drag.py` | Depth-integrated over tubing profile | Depth-dependent |
| Rod float | `physics/float_model.py` | Float margin %, float index, buckling, compression depth | Boundary for rehearsal/gate |
| Impact / fluid pound | `physics/impact.py` | Pound magnitude from fillage/float/velocity | Feeds dyno + hazard |
| Dynamometer | `physics/dynamometer.py` | Surface/downhole card synthesis; PPRL/MPRL, PRHP | 48-point card |
| Economics | `physics/economics.py` | Daily revenue − steam − power − water disposal; SOR | instantaneous_sor, daily_profit_usd |
| Wellbore hydraulics | `physics/wellbore.py` | Flow-line pressure/holdup | — |

**Coupling orchestrated by** `twin/time_stepper.py` (Engine B) in a fixed 15-step order, stateful across calls, `clone()`-able.

---

## 3. Learned / Surrogate Models

### 3.1 Backend RandomForest surrogate — `ai/surrogate.py`
- **What it is (real):** a scikit-learn `RandomForest` ensemble (temp/oil/SOR heads) **actually `fit()`-trained at boot** on a **seeded synthetic** dataset (`ai/data_generator.py`, 200 samples, `seed=42`). Real OOD check with **fallback to analytical physics** when inputs are out-of-distribution. This is a legitimate reduced-order surrogate.
- **What is WRONG (C5, §109):**
  - `self.metrics = {"r2_temp":0.965,"r2_oil":0.942,"r2_sor":0.951,…}` are **hardcoded literals**, not computed on a holdout.
  - Prediction returns a **constant** `"confidence_score": 0.92`.
- **Target fix:**
  1. Split the seeded dataset (e.g. 80/20, seeded) and compute R²/MAE on the **holdout**; store those *measured* numbers in `metrics`.
  2. Derive per-prediction confidence from (a) OOD distance and (b) physics-ML agreement (`model_agreement.py`), not a constant.
  3. Label everything `PREDICTED` and **synthetic-trained** — never imply field-calibrated (§139).

### 3.2 Client demo surrogate — `src/assure/MLPredictionProvider.ts`
- **Honest by construction:** `isDemoSurrogate: true`, `provenance: 'PREDICTED'`, deterministic regression (`Q = base·mechFactor·viscImpedance·steamBonus·(1−wc)`), header comment "Never fabricates 99% accuracy claims."
- Confidence `0.88` hardcoded but **labeled demo**. Low priority; ideally derive from input plausibility. **Not** a §109 violation because it does not claim measured accuracy.

### 3.3 Hazard model — `ai/hazard_model.py` (SIMULATED, not learned)
- Goodman cyclic-fatigue (alternating vs mean stress), rod-parting / pump / buckling sub-scores, composite health index. Fully physics/engineering-rule based. Real.

### 3.4 Dyno classifier — `ai/dyno_classifier.py` (RULE-BASED)
- Despite the name, it's an **honest heuristic** (6 diagnostic classes with explanations), **not** ML. Keep the honest labeling; do not market it as ML.

### 3.5 Model agreement — `ai/model_agreement.py` (real meta-model)
- Relative divergence between physics and surrogate → STRONG_CONSENSUS / ACCEPTABLE / DISAGREEMENT. Feeds VERIFY + confidence derivation.

---

## 4. Optimizers

| Optimizer | File | Real? | Method |
|---|---|---|---|
| CSS optimizer | `optimization/css_optimizer.py` | ✅ REAL | `scipy.optimize.differential_evolution` (best1bin, maxiter=35, popsize=12, seed=42); objective = daily net profit, penalty for SOR>4.5; analytical cycle sim |
| Joint "solve" | `optimization/optimizer.py` | ❌ FAKE (C3) | scores **hardcoded** candidate list; never re-simulates |
| Joint co-opt | `optimization/joint_optimizer.py` | ❌ FAKE (C4) | hardcoded 4-scenario matrix |
| SRP controller | `optimization/srp_controller.py` | ✅ physics | setpoint evaluation from float/fillage/PPRL/viscosity |
| VFD shaping | `optimization/vfd_shaping.py` | ✅ physics | stroke velocity profile shaping |
| Inflow governor | `optimization/inflow_limited.py` | ✅ physics | detects inflow-limited operation, recommends de-rate |

**Target:** `/solve` and `/joint` must **simulate** each candidate via Engine B `clone()` + step, then score — reusing the real `css_optimizer` pattern. The de-rate answer must **emerge** from the objective, never be hardcoded (§108).

---

## 5. Assurance "models" (decision gating)

| Component | File | Real? |
|---|---|---|
| 12-checkpoint gate | `assurance/gatekeeper.py` | ❌ 9/12 static (C2); reads SIM keys that don't exist |
| No-safe-rec handler | `assurance/no_safe_rec.py` | ✅ real thresholds (float margin, PPRL vs rating, temp, injection vs fracture, fillage) |
| Data sufficiency | `assurance/request_more_data.py` | ✅ real (dyno points, sensor health, water-cut test) |
| Why / why-not | `assurance/why_engine.py` + client `WhyEngine`/`WhyNotEngine` | ✅ |
| Alert engine | `assurance/alert_engine.py` | ✅ multi-tier |
| Composer | `assurance/engine.py` | ✅ real; verdict APPROVED/CONDITIONAL/HALTED; **can abstain** |

**Target:** make the gate real against Engine B state so ABSTAIN ("NO SAFE RECOMMENDATION") is reachable on the primary path — the project's headline differentiator.

---

## 6. What we may and may NOT claim (§109 / §139)

- ✅ May say: "reduced-order RandomForest surrogate trained on seeded **synthetic** physics data; metrics measured on a held-out synthetic split (R²=… once computed)."
- ✅ May say: "deterministic physics simulation" for all `physics/*`.
- ❌ May **not** say: neural network / .onnx (none exists — H1), field-validated, real Oil India telemetry, or any accuracy number not computed in-repo.
- ❌ May **not** present the dyno classifier as ML.
- Every UI value must carry its provenance label; `PREDICTED` values must also carry confidence + OOD status.
