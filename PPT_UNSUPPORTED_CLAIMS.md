# PPT_UNSUPPORTED_CLAIMS.md — Audit of Overstated or Unsupported Claims

This document scrutinizes presentation claims that risk evaluator skepticism if presented without qualification, distinguishing between mathematically supported capabilities and aspirational assertions.

---

## 1. Downhole Electric Heating & Dual-Heat Coordination

- **Exact Claim:** *"coordinates steam with OIL's own downhole heaters across the whole well field... Dual heat-source control — coordinates CSS with OIL's own downhole electric heaters, closing viscosity gaps between steam cycles without always needing a full re-steam"*
- **Source Slide:** Slide 2 (Top Banner & Uniqueness), Slide 3 (Diagram), Slide 4 (Equipment bullet), Slide 5 (Positive impact).
- **Project Evidence:** Zero lines of code in the repository model downhole electric heaters or hybrid thermal optimization.
- **Is It Supported?** **NO (COMPLETELY UNSUPPORTED).**
- **Must It Be Rewritten?** **YES (MANDATORY).**
- **Recommended Safe Wording:**
  - *"Thermal Optimization & Decision Rehearsal: Optimizes steam stimulation cycle timing and forward-rehearses sucker rod kinematics to maintain production without premature re-steaming."*
  - *(If retaining downhole heaters as a concept, explicitly label as: "Phase 2 Hybrid Thermal Extension (incorporating OIL's downhole electric heating pilots)").*

---

## 2. Field-Wide Multi-Well Steam Fleet Allocation (DEAP)

- **Exact Claim:** *"Field-level scheduling — allocates the field's limited steam capacity across wells, not just one well at a time... Allocates shared steam/heater capacity and times each well's next cycle economically across the whole field — DEAP"*
- **Source Slide:** Slide 2 (Uniqueness & Diagram), Slide 3 (Architecture Overview & Diagram), Slide 5 (Positive impact).
- **Project Evidence:** Single-well hero twin (BGW-17A). No fleet allocation database tables, no multi-well optimization solver, no DEAP library installed.
- **Is It Supported?** **NO (UNSUPPORTED IN CURRENT CODE).**
- **Must It Be Rewritten?** **YES.**
- **Recommended Safe Wording:**
  - *"High-Fidelity Well-to-Surface Twin (Scalable Architecture): Delivers deep multi-domain optimization for individual hero wells, with modular interfaces designed for field-wide multi-well scaling."*

---

## 3. Industrial SCADA Streaming via MQTT & OPC-UA

- **Exact Claim:** *"Protocol adapters normalize incoming tags into a common schema via a stream processor — MQTT/OPC-UA... Works with existing systems: MQTT/OPC-UA adapters read from SCADA/historian tags, with no rip-and-replace"*
- **Source Slide:** Slide 3 (Architecture Overview & Diagram), Slide 4 (Operational Viability & Challenges Table).
- **Project Evidence:** `KNOWN_LIMITATIONS.md` explicitly lists OPC-UA/MQTT SCADA Gateway as an unprovisioned field dependency. Ingestion runs via HTTP REST and WebSockets.
- **Is It Supported?** **PARTIALLY (Standard interfaces specified, but live broker absent).**
- **Must It Be Rewritten?** **YES (Qualify as Interface Architecture).**
- **Recommended Safe Wording:**
  - *"Industrial Ingestion Architecture: Telemetry ingested via REST and WebSockets for real-time edge visualization, architected with standard tag mapping schemas compatible with field OPC-UA and MQTT SCADA gateways."*

---

## 4. PyTorch Deep Neural Network Models

- **Exact Claim:** *"ML surrogate/classifier — SciPy / PyTorch... Python, SciPy, PyTorch, FastAPI..."*
- **Source Slide:** Slide 3 (Architecture Overview, Diagram, Tech Badges), Slide 4 (Technical Feasibility).
- **Project Evidence:** Surrogate is scikit-learn `RandomForestRegressor`; dyno classifier is geometric rule-based. `torch` is not in `requirements.txt`.
- **Is It Supported?** **NO (Tech stack mismatch).**
- **Must It Be Rewritten?** **YES.**
- **Recommended Safe Wording:**
  - Replace "PyTorch" badge with **"scikit-learn"** and **"SciPy"**.
  - *"Physics-constrained Random Forest ensemble surrogate trained on calibrated synthetic reservoir runs with measured holdout metrics and Mahalanobis OOD detection."*

---

## 5. React & Tailwind Web Application

- **Exact Claim:** *"Storage & Web App — Logs every action and serves the engineer dashboard... TimescaleDB / React... React and Tailwind logos"*
- **Source Slide:** Slide 3 (Architecture Overview & Badges), Slide 4 (Technical Feasibility).
- **Project Evidence:** Zero React or Tailwind packages in `package.json`. Implemented in native TypeScript + Three.js + Vanilla CSS.
- **Is It Supported?** **NO (Tech stack contradiction).**
- **Must It Be Rewritten?** **YES.**
- **Recommended Safe Wording:**
  - Replace "React" and "Tailwind" badges with **"Three.js"** and **"TypeScript"**.
  - *"High-Performance Web Workstation: Native TypeScript and Three.js WebGL engine delivering 60 FPS 3D kinematic visualization and real-time telemetry processing without framework overhead."*

---

## 6. TimescaleDB / PostgreSQL Time-Series Store

- **Exact Claim:** *"Time-Series Store (TimescaleDB)... PostgreSQL logo"*
- **Source Slide:** Slide 3 (Architecture Diagram & Badges), Slide 4 (Open-source stack).
- **Project Evidence:** Codebase uses SQLite (`assure_twin.db`) with 25 tables via SQLAlchemy ORM.
- **Is It Supported?** **PARTIALLY (Schema is relational/ORM, but engine is SQLite).**
- **Must It Be Rewritten?** **YES (Clarify deployment mode).**
- **Recommended Safe Wording:**
  - *"Relational Time-Series Store: SQLAlchemy ORM schema with local SQLite for lightweight edge workstation deployment, production-ready for PostgreSQL / TimescaleDB field clustering."*

---

## 7. Field-Validated Accuracy Claims & Production Numbers

- **Exact Claim:** *"recovery up, SOR & failures down... Lower steam and fuel cost per barrel, Fewer rod and pump replacements, More oil from the same steam generators"*
- **Source Slide:** Slide 2, Slide 5.
- **Project Evidence:** `KNOWN_LIMITATIONS.md` explicitly notes: *"In strict adherence to the master specification, no actual field results from the Baghewala oilfield are claimed that have not been physically gathered. All demonstrations use calibrated mathematical physics models, synthetic well profiles (BGW-17A), and simulated SCADA telemetry."*
- **Is It Supported?** **SUPPORTED AS SIMULATED OUTCOMES / UNSUPPORTED AS MEASURED FIELD HISTORY.**
- **Must It Be Rewritten?** **YES (Carefully frame as Model-Projected Benefits).**
- **Recommended Safe Wording:**
  - Ensure all statements of recovery and cost reduction are prefaced as: *"Model-Simulated Trajectories on Calibrated Baghewala Well Profiles indicate..."*
  - Never present simulated +5.8 BOPD or -18% SOR as historical field measurements from Oil India Limited.
