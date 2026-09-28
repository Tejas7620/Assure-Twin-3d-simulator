# PPT_PARTIAL_IMPLEMENTATION.md — Features with Partial Implementation

This document analyzes technical claims where the underlying software implements a functional foundation or proxy, but does not fully satisfy the specific technical depth or algorithm claimed in the presentation slides.

---

## 1. Non-Newtonian Yield-Stress Rheology & Gel Breakout Force

- **Slide Number:** 2, 3, 4
- **PPT Claim:**
  - *"models the heavy crude as a fluid that can gel and needs a 'breakout' force to restart flow, not just a thickness-vs-temperature chart"* (Slide 2)
  - *"Rheology engine (Thixotropic)"* (Slide 3 Diagram)
  - *"yield-stress rheology (Herschel-Bulkley) established, published methods"* (Slide 4)
- **Current Project Implementation:**
  - `backend/app/physics/fluids.py`, `viscosity.py`, `drag.py`.
  - Implements **Andrade exponential temperature-viscosity modeling** ($\mu(T) = \mu_{ref} \exp(b(1/T - 1/T_{ref}))$).
  - Couette annular viscous drag calculation models peak static friction resisting downstroke rod motion during cold start.
  - Emulsion factor models viscosity increase during water-in-oil emulsification.
- **Why It Is Classified as PARTIAL:**
  - The project calculates dynamic temperature-dependent viscosity and downstroke rod drag, but does **not** solve a full Herschel-Bulkley constitutive equation ($\tau = \tau_y + K \dot{\gamma}^n$) or a time-dependent thixotropic structure breakdown/buildup kinetic equation ($\frac{d\lambda}{dt}$). It uses an effective apparent viscosity proxy.
- **Evaluation Risk:**
  - If a petroleum rheology expert on the judging panel asks to see the Herschel-Bulkley flow index $n$ or yield stress $\tau_y$ parameter tensor, they will discover the code uses an Andrade exponential formulation.
- **Recommended PPT Adjustment:**
  - Rephrase to: *"Temperature-dependent heavy crude rheology (Andrade formulation) coupled with annular Couette drag modeling to estimate startup breakout forces and downstroke rod retarding resistance."*

---

## 2. Dynamometer Card Diagnostic Pattern Classifier

- **Slide Number:** 3, 4
- **PPT Claim:**
  - *"ML Surrogate & Classifier — SciPy / PyTorch"* (Slide 3)
  - *"Dyno card failure classification"* (Slide 3 Diagram)
- **Current Project Implementation:**
  - `backend/app/ai/dyno_classifier.py`.
  - Implements a dedicated class `DynoCardClassifier` recognizing 6 diagnostic classes:
    1. `NORMAL_OPERATION`
    2. `FLUID_POUND`
    3. `HEAVY_OIL_ROD_FLOAT`
    4. `LEAKING_TRAVELING_VALVE`
    5. `LEAKING_STANDING_VALVE`
    6. `UNANCHORED_TUBING`
  - Classification is executed via **geometric and physical dynamic rule heuristics** (load range, min/max load bounds, float margin thresholds, stroke-displacement ratio).
- **Why It Is Classified as PARTIAL:**
  - The classifier functions reliably and achieves the exact diagnostic goal, but it is **not a deep learning neural network or PyTorch classifier**. It is a rule-based geometric expert system.
- **Evaluation Risk:**
  - Evaluators expecting a CNN or LSTM processing dynamometer 2D curves will find rule thresholds.
- **Recommended PPT Adjustment:**
  - Rephrase to: *"Intelligent Dynamometer Diagnostic Classifier: Combines geometric feature extraction with mechanical boundary rules to instantly categorize dyno cards into 6 operational and failure regimes."*

---

## 3. Autonomous Phased Rollout (Advisory ➔ Supervisory ➔ Closed-Loop)

- **Slide Number:** 4
- **PPT Claim:**
  - *"Phased rollout: Advisory → Supervisory (confirm-to-apply) → Closed-loop, each stage gated on proven accuracy"* (Slide 4)
- **Current Project Implementation:**
  - `src/ui/pages/RecommendationView.ts` & `backend/app/api/v1/recommendations.py`.
  - **Advisory mode is 100% implemented**: Recommendations are generated, displayed with causal justifications, and require engineer signoff.
  - **Supervisory / Closed-loop mode is simulated within the twin**: When setpoints are approved, they are applied directly to the simulated twin, mutating SPM and stroke length.
- **Why It Is Classified as PARTIAL:**
  - There is no automated accuracy gating module that automatically flips an operating flag from Advisory to Autonomous Closed-Loop after $N$ successful days. That transition is an operational concept rather than programmatic code.
- **Evaluation Risk:**
  - Minor. Evaluators recognize that autonomous closed-loop control of PSU oil wells requires strict field safety approvals.
- **Recommended PPT Adjustment:**
  - Clearly state that the current release is in **"Phase 1: Advisory & Supervisory Mode (Human-in-the-Loop)"**, with autonomous closed-loop defined as the future target architecture.

---

## 4. Multi-Domain Reservoir Heating & Depletion Grid

- **Slide Number:** 2, 3
- **PPT Claim:**
  - *"fuses reservoir thermal decay, crude rheology... Reservoir & Thermal Model, Inflow / Production Model"* (Slide 3)
- **Current Project Implementation:**
  - `backend/app/physics/thermal.py` & `backend/app/physics/inflow.py`.
  - Thermal model computes radial temperature profiles $T(r, t)$ around the wellbore using Marx-Langenheim heating and Boberg-Lantz cooling with 3D grid point discretization.
  - Inflow model computes Vogel/Darcy boundary inflow under changing dynamic bottom-hole pressure $P_{wf}$.
- **Why It Is Classified as PARTIAL:**
  - This is a high-fidelity **single-well near-wellbore cylinder model** ($r \le 120\text{ m}$), not a full field-scale 3D reservoir simulator like CMG STARS or ECLIPSE with multiphase relative permeability grids.
- **Evaluation Risk:**
  - Ensure judges understand this is a fast, reduced-order physics digital twin designed for real-time edge execution, not an overnight finite-difference reservoir simulation.
- **Recommended PPT Adjustment:**
  - Describe as: *"Coupled reduced-order analytical reservoir model (Marx-Langenheim heating + Vogel IPR) engineered for millisecond edge computation."*
