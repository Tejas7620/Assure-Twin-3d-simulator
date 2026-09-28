# PPT_MISSING_FROM_PROJECT.md — Features Claimed in PPT but Missing from Actual Project

This document catalogs every technical feature promised in the presentation slides that does not currently exist in the software repository.

---

## 1. Downhole Electric Heating Simulation & Dual-Heat Coordination

- **Slide Number:** 2, 3, 4, 5, 6
- **Feature Name:** Dual Heat-Source Control & Downhole Electric Heater Modeling
- **PPT Claim:**
  - *"coordinates steam with OIL's own downhole heaters across the whole well field"* (Slide 2)
  - *"Dual heat-source control — coordinates CSS with OIL's own downhole electric heaters, closing viscosity gaps between steam cycles without always needing a full re-steam"* (Slide 2)
  - *"Dual-heat coordinator coordinates CSS & heaters"* (Slide 2 Diagram)
  - *"CSS + Heater Joint Optimizer", "Steam/Heater Budgets"* (Slide 3 Diagram)
  - *"downhole heaters cover gaps between cycles"* (Slide 5)
  - *"OIL EOI OIL/RF/EOI/014/2024 (CSS and downhole heating)"* (Slide 6)
- **Actual State in Code:**
  - **COMPLETELY ABSENT.** Grep across the entire repository returns 0 occurrences of downhole heater physics, electric cable heating equations, or heater control parameters.
  - The thermal model (`backend/app/physics/thermal.py`) only implements steam injection heating and conductive cooling.
- **Why It Is Missing:**
  - The core project development prioritized deep wellbore-to-surface mechanical coupling (rod kinematics, rod float, Couette drag, dyno cards, Vogel IPR, and CSS cycle forward simulation). Downhole electric heating was conceptualized as a future hybrid thermal extension.
- **Implementation Required:**
  - Thermodynamic model of resistive cable dissipation ($Q = I^2 R t$) inside the wellbore.
  - Coupled tubing heat transfer solver calculating near-wellbore fluid temperature under continuous electrical heating.
  - Joint optimizer objective incorporating grid electricity tariffs vs. steam generation fuel costs.
- **Subsystem Requirements:**
  - **Backend Required:** YES (New physics module `physics/electric_heater.py` + state stepper integration).
  - **AI Required:** NO (Analytical thermodynamic equations).
  - **Frontend Required:** YES (Heater power toggle slider, kW readout, duty cycle controls).
  - **3D Required:** YES (Subterranean electrical cable visual along production tubing).
- **Demo Priority:** **LOW FOR CODE / CRITICAL FOR PPT.**
  - **Recommendation:** Do NOT rush to code a half-baked electric heater model right before the demo. Instead, **remove or reframe the claim in the PPT as a "Phase 2 Hybrid Thermal Extension"**, focusing the demo on what is already robustly built: CSS steam + SRP rod mechanics.

---

## 2. Field-Level Multi-Well Steam Allocation & Scheduling (DEAP)

- **Slide Number:** 2, 3, 5
- **Feature Name:** Field-Level Fleet Steam Scheduler & Orchestrator
- **PPT Claim:**
  - *"Field-level scheduling — allocates the field's limited steam capacity across wells, not just one well at a time"* (Slide 2)
  - *"Field Orchestration — Allocates shared steam/heater capacity and times each well's next cycle economically across the whole field — DEAP"* (Slide 3)
  - *"Field Orchestration: Capacity Manager, Economic Cycle-Timing, Allocation Optimizer"* (Slide 3 Diagram)
  - *"Better use of shared steam capacity: OIL's mobile steam generators are a limited resource, and the twin allocates them across wells"* (Slide 5)
- **Actual State in Code:**
  - **COMPLETELY ABSENT.**
  - The project is architected as an intensive, high-fidelity **Hero Well Digital Twin** focused exclusively on Well `BGW-17A`.
  - There are no database tables for multi-well fleet scheduling, no cluster coordinator, and the `deap` library is not installed in `requirements.txt`.
- **Why It Is Missing:**
  - Building a single true cyber-physical twin with 3D kinematics, dyno cards, virtual sensors, and assurance gates for one well requires enormous technical depth. Multi-well scheduling was an aspirational roadmap item.
- **Implementation Required:**
  - Multi-well database schema with 10–20 well entities and mobile steam generator constraints.
  - Genetic algorithm optimizer using DEAP to solve the job-shop scheduling problem.
  - Multi-well field overview map in the frontend.
- **Subsystem Requirements:**
  - **Backend Required:** YES (New service `services/fleet_scheduler.py` + DEAP installation).
  - **AI Required:** NO (Heuristic/evolutionary combinatorial search).
  - **Frontend Required:** YES (New "Field Fleet Overview" page with multi-well gantt chart).
  - **3D Required:** NO.
- **Demo Priority:** **DO NOT IMPLEMENT BEFORE DEMO.**
  - **Recommendation:** Reframe the presentation around the **"Deep Hero Well Digital Twin"**. Evaluators will respect a deep, fully functional single-well twin far more than a shallow, simulated multi-well spreadsheet. Present fleet scheduling as an architectural extension.

---

## 3. Industrial SCADA Protocol Adapters (MQTT / OPC-UA)

- **Slide Number:** 3, 4
- **Feature Name:** Live MQTT / OPC-UA Stream Ingestion
- **PPT Claim:**
  - *"Protocol adapters normalize incoming tags into a common schema via a stream processor — MQTT/OPC-UA"* (Slide 3)
  - *"Works with existing systems: MQTT/OPC-UA adapters read from SCADA/historian tags, with no rip-and-replace"* (Slide 4)
  - *"Legacy SCADA integration: MQTT/OPC-UA protocol adapters, starting in read-only mode"* (Slide 4 Table)
- **Actual State in Code:**
  - **NOT IMPLEMENTED AS A LIVE PROTOCOL CLIENT.**
  - Ingestion occurs via **FastAPI REST endpoints** (`/api/v1/simulation/*`) and **WebSockets** (`/ws/sim`).
  - `KNOWN_LIMITATIONS.md` explicitly lists *"OPC-UA / MQTT SCADA Gateway"* as a remaining field-data dependency for production deployment.
- **Why It Is Missing:**
  - In a hackathon or offline workstation environment, running live external MQTT brokers (Mosquitto) or OPC-UA test servers introduces unnecessary network dependencies and failure points.
- **Implementation Required:**
  - Integration of `paho-mqtt` or `asyncua` background tasks subscribing to simulated PLC tag topics.
- **Subsystem Requirements:**
  - **Backend Required:** YES (`services/scada_gateway.py`).
  - **AI Required:** NO.
  - **Frontend Required:** NO.
  - **3D Required:** NO.
- **Demo Priority:** **DO NOT IMPLEMENT BEFORE DEMO.**
  - **Recommendation:** Relabel in the PPT as **"SCADA Gateway Interface Specification (OPC-UA / MQTT Ready)"**. The REST and WebSocket feeds already demonstrate live data ingestion.

---

## 4. Deep Learning Framework (PyTorch) for Surrogate & Classifier

- **Slide Number:** 3, 4
- **Feature Name:** PyTorch Deep Neural Network Models
- **PPT Claim:**
  - *"Physics & ML Core: builds a live per-well twin... ML surrogate/classifier — SciPy / PyTorch"* (Slide 3)
  - *"Open-source stack: Python, SciPy, PyTorch, FastAPI, React..."* (Slide 4)
- **Actual State in Code:**
  - **ABSENT.** PyTorch is not imported or used.
  - The CSS surrogate model (`backend/app/ai/surrogate.py`) is implemented using **scikit-learn `RandomForestRegressor`**.
  - The dynamometer card classifier (`backend/app/ai/dyno_classifier.py`) is implemented using **geometric feature extraction rules**.
- **Why It Is Missing:**
  - A Random Forest ensemble with 30 estimators trains in $< 200\text{ ms}$ on small synthetic datasets ($N=200$), provides deterministic reproducibility, and avoids heavy PyTorch CUDA/C++ runtime overhead on edge machines.
- **Implementation Required:**
  - Replacing the scikit-learn models with PyTorch Multi-Layer Perceptrons (MLP) or 1D CNNs.
- **Subsystem Requirements:**
  - **Backend Required:** YES (`pip install torch`).
  - **AI Required:** YES.
  - **Frontend Required:** NO.
  - **3D Required:** NO.
- **Demo Priority:** **DO NOT REWRITE MODELS.**
  - **Recommendation:** Random Forest is an industry-standard, explainable, and reliable model for tabular surrogate modeling! Simply update the PPT badge from "PyTorch" to **"scikit-learn"**.

---

## 5. Persistent Time-Series Database (TimescaleDB / PostgreSQL)

- **Slide Number:** 3, 4
- **Feature Name:** TimescaleDB Time-Series Data Store
- **PPT Claim:**
  - *"Storage & Web App — Logs every action and serves the engineer dashboard... TimescaleDB / React"* (Slide 3)
  - *"Time-Series Store (TimescaleDB)"* (Slide 3 Diagram)
  - *"TimescaleDB mean no licence cost"* (Slide 4)
- **Actual State in Code:**
  - **ABSENT AS A RUNNING INSTANCE.**
  - The database is a local SQLite file (`assure_twin.db`) managed via **SQLAlchemy ORM** with 25 relational tables.
- **Why It Is Missing:**
  - A self-contained SQLite database makes the entire digital twin portable, zero-configuration, and capable of running immediately on any laptop without spinning up a PostgreSQL/TimescaleDB container.
- **Implementation Required:**
  - Docker Compose setup running TimescaleDB and changing the database URI to `postgresql://...`.
- **Subsystem Requirements:**
  - **Backend Required:** YES (Database connection string swap).
  - **AI Required:** NO.
  - **Frontend Required:** NO.
  - **3D Required:** NO.
- **Demo Priority:** **LOW.**
  - **Recommendation:** The SQLAlchemy ORM abstractions in `backend/app/database.py` make the code database-agnostic. In the PPT, state: *"SQLAlchemy ORM (Portable SQLite for Edge Workstation Demo; Production-Ready for TimescaleDB / PostgreSQL)"*.

---

## 6. Frontend Framework (React + Tailwind CSS)

- **Slide Number:** 3, 4
- **Feature Name:** React Component Architecture & Tailwind CSS
- **PPT Claim:**
  - *"Storage & Web App — ... TimescaleDB / React"* (Slide 3)
  - *"React and Tailwind logos in tech stack"* (Slide 3)
  - *"Python, SciPy, PyTorch, FastAPI, React and TimescaleDB..."* (Slide 4)
- **Actual State in Code:**
  - **ABSENT.** Zero React or Tailwind libraries are installed in `package.json`.
  - The application is engineered in **Vanilla TypeScript** with modular class-based views (`src/ui/pages/*`) and a high-performance **custom Vanilla CSS design system** (`workstation.css`).
- **Why It Is Missing:**
  - Integrating high-performance WebGL 3D animation (Three.js) at 60 FPS is significantly smoother and more responsive in native TypeScript without React Virtual DOM diffing overhead and lifecycle reconciliation lag.
- **Implementation Required:**
  - Complete rewrite of the 12 UI views into React JSX functional components.
- **Subsystem Requirements:**
  - **Frontend Required:** Full rewrite.
- **Demo Priority:** **DO NOT REWRITE.**
  - **Recommendation:** Native TypeScript + Three.js is faster, leaner, and technically superior for a real-time digital twin workstation. Update the PPT badges to **Three.js, TypeScript, and Vite**.
