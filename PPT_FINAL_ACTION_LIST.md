# PPT_FINAL_ACTION_LIST.md — Prioritized Presentation Action List

This document lists every required change to the presentation slides, categorized by urgency into **MUST CHANGE** (critical for submission viability), **SHOULD CHANGE** (important for technical credibility), and **OPTIONAL** (polish).

---

## 1. MUST CHANGE (Critical / Dealbreaker Items)

| Action ID | Slide | Action Required | Why It Must Change | Source / Project Evidence | Expected Result |
|---|---|---|---|---|---|
| **ACT-M01** | **6** | **Populate Prototype Screenshots:** Insert 3 high-resolution captures of the running 3D Digital Twin, Optimization Solver, and Assurance Gate into the empty boxes. | Empty boxes make the project look unfinished or abandoned, risking immediate disqualification. | Software actively runs at `http://localhost:5173/`. | Proves a working, production-grade software prototype exists. |
| **ACT-M02** | **6** | **Insert GitHub Repository Link & Video URL:** Replace the blank lines with the actual repository URL and YouTube demo link (or QR code). | Evaluators must be able to inspect code and view the video demonstration. | Repository is located on the user's workspace. | Seamless evaluator verification and code audit. |
| **ACT-M03** | **2, 3, 4, 5** | **Remove Downhole Electric Heater Claims:** Eliminate claims that the current system coordinates steam with downhole electric heaters. Reframe as "Phase 2 Hybrid Thermal Extension". | Zero electric heater code exists. Claiming it triggers immediate failure upon cross-examination. | Grep confirms 0 matches for downhole electric heaters in code. | Prevents fatal cross-examination collapse. |
| **ACT-M04** | **3** | **Update Frontend Tech Stack Badges:** Replace `React` and `Tailwind` logos with `Three.js` and `TypeScript`. | Codebase contains zero React or Tailwind dependencies; it is engineered in native TypeScript + Three.js. | `package.json` contains only `three`, `typescript`, `vite`. | Demonstrates technical honesty and highlights high-performance 3D graphics. |
| **ACT-M05** | **3** | **Update AI & Optimizer Badges:** Replace `PyTorch` with `scikit-learn` and `DEAP` with `SciPy`. | ML surrogate is scikit-learn Random Forest; optimizer is SciPy Differential Evolution. Neither PyTorch nor DEAP is installed. | `backend/requirements.txt` & `ai/surrogate.py`. | Defensible machine learning and optimization story. |
| **ACT-M06** | **1, 2, 3** | **Feature the 3D Digital Twin:** Add explicit mentions of the interactive Three.js 3D petroleum simulator to Slide 1, Slide 2, and Slide 3. | The 3D twin is the single most impressive visual asset in the software, yet the PPT completely fails to mention it! | `src/scene/*` and `PumpjackKinematics.ts`. | Elevates the project from an abstract backend to a captivating cyber-physical twin. |

---

## 2. SHOULD CHANGE (High-Value Technical Credibility Items)

| Action ID | Slide | Action Required | Why It Should Change | Source / Project Evidence | Expected Result |
|---|---|---|---|---|---|
| **ACT-S01** | **2** | **Add "The Abstain Protocol" ("NO SAFE REC"):** Feature the principle that the system refuses to recommend actions when data is unsafe or insufficient. | The spec's #1 rule and greatest differentiator for PSU operator trust; currently unmentioned in the presentation. | `backend/app/assurance/gatekeeper.py`. | Establishes unmatched industrial trust and safety maturity. |
| **ACT-S02** | **2, 4** | **Add "Dynamic Thermo-Mechanical Operating Envelope":** Explain that the safe pump speed window shrinks as the reservoir cools. | Profound petroleum engineering concept proving domain depth; currently vaguely phrased as "sets safe speeds". | `backend/app/analytics/envelope.py`. | Strong praise from Oil India reservoir & production engineers. |
| **ACT-S03** | **2, 3** | **Add "Decision Rehearsal Sandbox":** Feature the in-memory twin clone forward-simulation capability. | Solves operator fear of black-box AI by proving that consequences are simulated before touching the well. | `backend/app/forecast/rehearsal.py`. | High innovation marks from digital twin evaluators. |
| **ACT-S04** | **2, 3, 5** | **Reframe Multi-Well Fleet Claims:** Shift from "field-level steam scheduling across all wells" to "High-Fidelity Hero Well Twin with Field-Scalable Architecture". | Multi-well scheduling is not implemented. A deep single-well twin is far more credible than a fake multi-well claim. | Single-well focus (BGW-17A). | Completely defensible project scope. |
| **ACT-S05** | **4** | **Highlight the 12-Point Deterministic Assurance Gate:** Detail the 12 physical predicates (rod float, gearbox torque, structural buckling). | Proves that AI recommendations are strictly bound by ASME/API mechanical engineering limits. | `assurance/gatekeeper.py`. | Demonstrates compliance with industrial safety codes. |
| **ACT-S06** | **3, 4** | **Label Database Accurately:** Change "TimescaleDB / PostgreSQL" to "SQLAlchemy ORM (SQLite Edge / TimescaleDB Ready)". | The software uses SQLite for zero-config edge portability, backed by a 25-table relational ORM. | `backend/app/database.py` & `assure_twin.db`. | Technical precision that satisfies database reviewers. |

---

## 3. OPTIONAL (Polish & Formatting Enhancements)

| Action ID | Slide | Action Required | Why It Can Change | Source / Project Evidence | Expected Result |
|---|---|---|---|---|---|
| **ACT-O01** | **1** | **Brand with Product Name:** Introduce the name **ASSURE-TWIN** in the title. | Gives the project a memorable, professional corporate identity. | Master architecture documentation. | Stronger brand recall during jury deliberations. |
| **ACT-O02** | **4** | **Mention 60-Test Automated Test Suite:** Add a small badge or note: *"60/60 Pytest Verification Cases Passed"*. | Proves code rigor, continuous integration, and stability. | `backend/tests/` passes 60/60 tests. | Instills confidence that the code actually compiles and runs. |
| **ACT-O03** | **5** | **Cite Specific Scenario Deltas:** Cite +5.8 BOPD uplift and 18% SOR reduction from the software's scenario simulator. | Replaces generic "recovery up" with concrete model-derived metrics. | `backend/app/api/v1/scenarios.py`. | Higher quantitative credibility. |
| **ACT-O04** | **6** | **Add QR Codes:** Place scannable QR codes for the GitHub repository and YouTube video alongside the URLs. | Evaluators on laptops/tablets can instantly scan and view the project on their personal devices during presentations. | Link to public repo / video. | Exceptional presentation professionalism. |
