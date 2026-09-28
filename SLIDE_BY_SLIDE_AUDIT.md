# SLIDE_BY_SLIDE_AUDIT.md — Detailed Slide-by-Slide Audit: Presentation vs. Reality

---

## Slide 1: Title Slide

- **Slide Number:** 1
- **Title:** SMART INDIA HACKATHON 2026 / SIH26120
- **PPT Purpose:** Establish the official competition entry, problem statement ID, team identity, and domain context (Oil India Limited, Baghewala Field).
- **What the PPT Claims:**
  - Problem Statement ID: SIH26120
  - Problem Title: Digital Twin for Well-to-Surface Optimization of Cyclic Steam Stimulation (CSS) and Sucker Rod Pump (SRP) Operations for Heavy Oil Wells of Baghewala Field.
  - Team ID: 140280 | Team Name: VisionX$ | Theme: Smart Automation | PS Category: Software
- **What the Project Actually Does:**
  - Implements the exact Baghewala field context (Well `BGW-17A`, Jodhpur Sandstone, $10,000+\text{ cP}$ heavy crude, CSS thermal stimulation, SRP surface pumping).
- **What Matches:** 100% match on problem statement, field, operating PSU (Oil India Limited), and technical domain.
- **What is Missing:** None.
- **What is Extra in Project:** The software has a formal internal product name: **ASSURE-TWIN** (coupled with CyberPump 3D).
- **What is Misleading:** None.
- **What is Outdated:** None.
- **What is Unsupported:** None.
- **What Should Change:**
  - Introduce the product name **"ASSURE-TWIN: Digital Twin for Well-to-Surface Optimization..."** to give the project a memorable, professional identity.
- **Priority:** LOW (Minor branding enhancement).

---

## Slide 2: Proposed Solution

- **Slide Number:** 2
- **Title:** PROPOSED SOLUTION
- **PPT Purpose:** Contrast conventional siloed operations with the proposed digital twin, explaining the core uniqueness and high-level workflow.
- **What the PPT Claims:**
  1. Fuses reservoir thermal decay, crude rheology, and rod-string mechanics into one live model.
  2. Jointly decides CSS design and real-time SRP control.
  3. Predicts viscosity rebound before rod floating happens.
  4. Dual heat-source control coordinating CSS with OIL's downhole electric heaters.
  5. Field-level scheduling allocating limited steam capacity across wells.
  6. Plain-language causal explanations verified against live sensor data.
- **What the Project Actually Does:**
  - The 15-domain coupled twin time stepper (`backend/app/twin/time_stepper.py`) genuinely fuses thermal decay, rheology, inflow, pump fillage, and rod kinematics.
  - Joint optimizer (`backend/app/optimization/optimizer.py`) evaluates coupled CSS and SRP setpoints.
  - Float model (`backend/app/physics/float_model.py`) computes buoyant downstroke margin and pumpability window.
  - Downhole electric heaters: **DOES NOT EXIST** in the codebase.
  - Field-level multi-well scheduling: **DOES NOT EXIST** in the codebase (single hero well BGW-17A).
- **What Matches:**
  - Coupled physics, joint optimization, viscosity rebound prediction, rod float prevention, plain-language causal reasoning.
- **What is Missing:**
  - Downhole electric heater modeling and control.
  - Field-level multi-well steam capacity scheduler.
- **What is Extra in Project:**
  - **3D Digital Twin Simulator** (Three.js WebGL scene with animated pumpjack, subterranean wellbore, and dynamic dyno card) — completely unmentioned on this slide!
  - **Dynamic Thermo-Mechanical Operating Envelope** (`analytics/envelope.py`).
  - **Pumpability Window** with thermal memory decay.
  - **Decision Rehearsal Sandbox** (`forecast/rehearsal.py`).
  - **Strict Abstain Protocol ("NO SAFE RECOMMENDATION")**.
- **What is Misleading:**
  - Claiming "Dual heat-source control coordinates CSS with OIL's own downhole electric heaters" when no heater physics exists.
  - Claiming "Field-Level steam scheduler allocates capacity across wells" when only a single well is implemented.
- **What is Outdated:** None.
- **What is Unsupported:** The electric heater and field-wide multi-well claims.
- **What Should Change:**
  1. Remove "downhole electric heaters" from the uniqueness list. Replace with **"Dynamic Thermo-Mechanical Operating Envelope & Pumpability Window"**.
  2. Change "Field-level scheduling" to **"Deep Hero-Well Digital Twin with Decision Rehearsal & Field-Scalable Architecture"**.
  3. Add a visual callout to the **Interactive 3D Digital Twin**.
  4. Highlight the **"Abstain Protocol (NO SAFE RECOMMENDATION when data is unsafe/insufficient)"** as a premier trust feature.
- **Priority:** **HIGH (Major technical alignment required).**

---

## Slide 3: Technical Approach

- **Slide Number:** 3
- **Title:** TECHNICAL APPROACH
- **PPT Purpose:** Present the system architecture, component data flows, and technology stack.
- **What the PPT Claims:**
  - Architecture layers: Ingress (REST), Data & Integration (MQTT/OPC-UA), Physics & ML Core (SciPy/PyTorch), Optimization & Control (FastAPI), Field Orchestration (DEAP), Storage & Web App (TimescaleDB / React / Tailwind).
  - Component blocks: Reservoir/Thermal, Thixotropic Rheology, Wellbore/Rod, Inflow, ML Surrogate/Classifier, Real-Time SRP Controller, CSS+Heater Joint Optimizer, Workover vs Setpoint, Capacity Manager, Economic Cycle-Timing, Allocation Optimizer, Hero Well Dashboard, Field Overview, Workflow & Approval.
  - Tech badges: Python, FastAPI, NumPy, PyTorch, PostgreSQL, React, Tailwind, Docker, Kubernetes, Prometheus, Grafana, Git, JWT, MQTT, GitHub Actions.
- **What the Project Actually Does:**
  - Ingress: FastAPI REST (`/api/v1/*`) and WebSockets (`/ws/sim`).
  - Data & Integration: Stream adapter (`state_adapter.py`), WebSocket client (`SimulationClient.ts`). No live MQTT/OPC-UA broker.
  - Physics Core: Comprehensive SciPy/NumPy physics (thermal, rheology, rod mechanics, IPR, economics).
  - ML Core: scikit-learn `RandomForestRegressor` CSS surrogate with 80/20 train-holdout split and Mahalanobis OOD detection; rule-based geometric DynoCardClassifier. **No PyTorch**.
  - Optimization: SciPy Differential Evolution (`css_optimizer.py`) and 4x4 operating point analytical Pareto grid (`optimizer.py`). **No DEAP**.
  - Storage: SQLAlchemy ORM with 25 tables in SQLite (`assure_twin.db`). **No TimescaleDB / PostgreSQL instance**.
  - Frontend: **Vanilla TypeScript + Three.js + Vanilla CSS** (`workstation.css`). **Zero React, Zero Tailwind**.
  - 3D Digital Twin: Full interactive 60 FPS WebGL 3D simulator (`src/scene/*`). **Omitted from diagram!**
- **What Matches:**
  - Python, FastAPI, NumPy, SciPy, Docker, Git.
  - Core physics modules (thermal, rheology, rod mechanics, inflow).
  - Real-time SRP controller, workover vs setpoint decision, recommendation approval workflow.
- **What is Missing:**
  - `DEAP` genetic algorithm field orchestrator.
  - Downhole electric heater joint optimizer.
  - Live MQTT/OPC-UA industrial stream processor.
  - Field Overview multi-well fleet screen.
- **What is Extra in Project:**
  - **Three.js WebGL 3D Petroleum Simulator** (the most impressive visual component of the product).
  - **Virtual Downhole State Estimator** (10 virtual sensors with confidence ratings).
  - **Physics vs. ML Agreement Engine** (`model_agreement.py`).
  - **Outcome Reconciliation & Calibration Subsystem** (`calibration/*`).
  - **Decision Rehearsal Twin Clone Sandbox** (`rehearsal.py`).
- **What is Misleading:**
  - Claiming React, Tailwind, PyTorch, TimescaleDB, DEAP, and MQTT when they are not in the codebase dependencies.
  - Concealing the Three.js 3D simulation engine.
- **What is Outdated:** Architecture diagram reflects an aspirational microservices stack rather than the working monolithic edge-workstation twin.
- **What is Unsupported:** PyTorch neural networks and DEAP fleet scheduling.
- **What Should Change:**
  1. Update technology stack badges:
     - Replace React & Tailwind with **Three.js & TypeScript**.
     - Replace PyTorch with **scikit-learn & SciPy**.
     - Replace DEAP with **SciPy Differential Evolution**.
     - Label TimescaleDB as **"SQLAlchemy ORM (SQLite Edge / TimescaleDB Cloud)"**.
     - Label MQTT/OPC-UA as **"SCADA Gateway Interface Specification"**.
  2. Add **"3D Interactive Twin (Three.js WebGL)"** to the architecture diagram.
  3. Replace the non-existent "Field Orchestration" block with **"Assurance Gate & Decision Rehearsal Sandbox"**.
- **Priority:** **CRITICAL (Direct contradiction between PPT tech badges and code).**

---

## Slide 4: Feasibility & Viability

- **Slide Number:** 4
- **Title:** FEASIBILITY & VIABILITY
- **PPT Purpose:** Convince evaluators that the solution is technically grounded in established engineering, operationally viable for PSU field deployment, and mitigates key industrial risks.
- **What the PPT Claims:**
  - Technical Feasibility: Marx-Langenheim thermal decay, Herschel-Bulkley rheology, API rod force balance, open-source stack, fast deterministic control loop running in milliseconds at the edge.
  - Operational Viability: Advisory-first human-in-the-loop workflow, MQTT/OPC-UA integration, offline simulator fallback mode, phased rollout.
  - Challenges & Mitigation: Synthetic data labeled by confidence tiers, rheometer/dyno calibration, physics model re-checking black-box AI, stream processor filtering, edge execution.
  - Sustainability: Modular services, audit logs, environmental/economic benefits.
- **What the Project Actually Does:**
  - The technical feasibility points are **100% validated** in code:
    - Marx-Langenheim / Boberg-Lantz in `thermal.py`.
    - API RP 11L force balance in `rod_string.py` and `srp.py`.
    - Fast deterministic SRP controller in `srp_controller.py` evaluates in $< 5\text{ ms}$.
    - Advisory-first human-in-the-loop workflow in `RecommendationView.ts` and `api/v1/recommendations.py`.
    - Offline simulator fallback mode in `SimulationClient.ts` with live provenance badges (`● BACKEND` vs `○ LOCAL`).
    - Physics-informed synthetic data generator with seeded holdout in `data_generator.py` and `surrogate.py`.
    - Calibration router for viscosity fitting and sensor screening in `calibration/*`.
    - Database audit logging in `entities.py`.
- **What Matches:** Over 90% of this slide directly matches the implemented codebase! This is the most technically accurate slide in the presentation.
- **What is Missing:**
  - Downhole electric heaters mention under equipment OIL runs.
  - Live MQTT/OPC-UA connection (currently uses WebSocket/REST).
- **What is Extra in Project:**
  - **Abstain Protocol**: Explicit "NO SAFE RECOMMENDATION" status when gatekeeper safety predicates fail.
  - **OOD Mahalanobis Distance Detection**: ML surrogate automatically rejects queries outside the training distribution.
- **What is Misleading:** Citing React, PyTorch, and TimescaleDB under "Open-source stack".
- **What is Outdated:** None.
- **What is Unsupported:** None on the physics; minor on the specific software package names.
- **What Should Change:**
  1. Update software package names in the "Open-source stack" bullet to match reality (Python, FastAPI, SciPy, scikit-learn, Three.js, TypeScript).
  2. Emphasize the **Abstain Protocol** under "Black-box AI distrust" mitigation: *"The system will output NO SAFE RECOMMENDATION rather than guessing or asserting unsafe setpoints."*
  3. Mention the **12-Point Assurance Gate** as the primary mitigation for operational risk.
- **Priority:** MEDIUM (High truthfulness, just needs minor stack alignment and feature amplification).

---

## Slide 5: Impact & Benefits

- **Slide Number:** 5
- **Title:** IMPACT & BENEFITS
- **PPT Purpose:** Articulate the quantitative and qualitative value proposition, stakeholder impact, ESG/SDG alignment, and business viability.
- **What the PPT Claims:**
  - Lower steam and energy use per barrel (lower SOR).
  - Fewer rod failures and pump unsettings via rod-float prevention.
  - Fewer workovers by separating setpoint tuning from mechanical failures.
  - Shared steam capacity optimization across wells.
  - Stakeholder benefits for Production Engineers, Field Crews, Oil India Limited, and National Energy Security.
  - Triple Bottom Line: Economic, Environmental (lower fuel, water, $CO_2$), Social (less hazardous rig work).
  - SDG Alignment: SDG 7, SDG 9, SDG 12, SDG 13.
  - Link to Detailed Business Model Canvas.
- **What the Project Actually Does:**
  - Economics module (`backend/app/physics/economics.py`) explicitly tracks daily profit, fuel OPEX, power OPEX, water disposal OPEX, and instantaneous/cumulative SOR.
  - Scenarios page (`src/ui/pages/ScenariosView.ts`) simulates and compares 4 operating strategies: Baseline, CSS-Only, SRP-Only, and Joint Optimized.
  - Alerts page (`src/ui/pages/AlertsView.ts`) isolates mechanical pump failures (valves, tubing) from operational rod-float warnings.
  - No field-level multi-well steam generator sharing.
- **What Matches:**
  - Value propositions around SOR reduction, energy efficiency, rod-float prevention, and diagnostic separation of workover vs. setpoint.
- **What is Missing:**
  - Fleet-wide steam capacity sharing across multiple wells.
  - Downhole electric heaters covering gaps between cycles.
- **What is Extra in Project:**
  - **Scenario Comparison Matrix** with explicit economic delta ($/day profit, SOR, and oil rate).
  - **Sensitivity Analysis** evaluating impact of crude oil price and electricity tariffs.
- **What is Misleading:** Stating that the digital twin currently allocates mobile steam generators across the field.
- **What is Outdated:** None.
- **What is Unsupported:** Citing mobile steam fleet allocation.
- **What Should Change:**
  1. Reframe the steam savings around the **Hero Well's CSS cycle optimization**: optimizing soak time, injection volume, and production cutoff temperature to minimize SOR on BGW-17A.
  2. Point to the **Scenario Comparison Table** implemented in the software as concrete proof of economic and environmental savings.
  3. Ensure the Business Model Canvas link is active and valid.
- **Priority:** MEDIUM.

---

## Slide 6: Research & References

- **Slide Number:** 6
- **Title:** RESEARCH & REFERENCES
- **PPT Purpose:** Provide academic and industrial credibility via literature citations and display evidence of a working prototype (screenshots, video, GitHub link).
- **What the PPT Claims:**
  - Citations to Oil India project documents (Baghewala CSS, SRP, insulated tubing), PPAC crude import statistics, and classic academic papers (Marx & Langenheim 1959, Soares et al. 2013, Dimitriou et al. 2011, Karanikas et al. 2020, Patel et al. 2005, Mohankumar 2019).
  - **Prototype Screenshots:** [3 EMPTY PLACEHOLDER FRAMES]
  - **Prototype demo (YouTube):** [2 EMPTY PLACEHOLDER FRAMES]
  - **Link to GitHub Repository :** [EMPTY BLANK TEXT]
- **What the Project Actually Does:**
  - A fully functioning, production-ready 3D digital twin workstation is actively running!
  - 12 comprehensive workstation views, real Three.js 3D kinematics, live FastAPI backend, 60 passing test cases.
- **What Matches:**
  - Academic literature grounding (Marx & Langenheim thermal model, API rod mechanics, Andrade viscosity).
- **What is Missing:**
  - **THE ENTIRE RIGHT HALF OF THE SLIDE IS EMPTY!**
  - No prototype screenshots.
  - No YouTube video link.
  - No GitHub repository URL.
- **What is Extra in Project:**
  - An entire running, interactive application that is ready to be screenshotted and recorded!
- **What is Misleading:**
  - Blank frames give evaluators the false impression that the software was never built or is an empty concept.
- **What is Outdated:** The template placeholders.
- **What is Unsupported:** N/A.
- **What Should Change:**
  1. **IMMEDIATELY POPULATE THE SCREENSHOT FRAMES:**
     - Screenshot 1: Interactive 3D Digital Twin with kinematic pumpjack and downhole wellbore view.
     - Screenshot 2: Coupled Multi-Objective Joint Optimization Pareto solver page.
     - Screenshot 3: Explainable Recommendation and 12-Checkpoint Assurance Gate screen.
  2. **INSERT GITHUB REPOSITORY LINK:** Add the active repository link.
  3. **INSERT DEMO VIDEO LINK:** Add the YouTube or video demonstration URL.
- **Priority:** **CRITICAL / SHOWSTOPPER (Must fix before final submission).**
