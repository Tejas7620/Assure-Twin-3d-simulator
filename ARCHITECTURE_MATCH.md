# ARCHITECTURE_MATCH.md — System Architecture Comparison: PPT vs. Actual Codebase

This document provides a block-by-block technical comparison between the system architecture presented on Slide 3 of the SIH presentation and the actual software architecture implemented in the repository.

---

## 1. Architectural Layer Comparison

```
PRESENTED ARCHITECTURE (Slide 3)                 ACTUAL REPOSITORY ARCHITECTURE
┌──────────────────────────────────────┐        ┌──────────────────────────────────────┐
│  Ingress: Engineers, SCADA, Sim     │        │  Ingress: Workstation & Sim Client   │
│  (REST / MQTT / OPC-UA)             │        │  (FastAPI REST + WebSocket /ws/sim)  │
└──────────────────┬───────────────────┘        └──────────────────┬───────────────────┘
                   │                                               │
┌──────────────────▼───────────────────┐        ┌──────────────────▼───────────────────┐
│  Data & Integration:                 │        │  Integration Layer:                  │
│  Stream Processor, Protocol Adapters │        │  state_adapter.py & SimulationClient │
│  (Normalized Tags)                   │        │  (Normalized State Schema)           │
└──────────────────┬───────────────────┘        └──────────────────┬───────────────────┘
                   │                                               │
┌──────────────────▼───────────────────┐        ┌──────────────────▼───────────────────┐
│  Physics & ML Core:                  │        │  authoritative Physics Twin:         │
│  - Reservoir/Thermal (Marx-Lang)     │        │  - 15-Domain Time-Stepper (Coupled)  │
│  - Rheology Engine (Thixotropic)     │        │  - Marx-Langenheim / Boberg-Lantz    │
│  - Wellbore & Rod Mechanics          │        │  - API RP 11L Rod Dynamics & Float   │
│  - Inflow / Production Model         │        │  - Vogel / Darcy Composite IPR       │
│  - ML Surrogate & Classifier         │        │  - scikit-learn RF Surrogate & OOD   │
│    (SciPy / PyTorch)                 │        │  - DynoCardClassifier (Geometric)    │
└──────────────────┬───────────────────┘        └──────────────────┬───────────────────┘
                   │                                               │
┌──────────────────▼───────────────────┐        ┌──────────────────▼───────────────────┐
│  Optimization & Control:             │        │  Optimization & Assurance Layer:     │
│  - Real-Time SRP Controller          │        │  - Real-Time SRP Controller & VFD    │
│  - CSS + Heater Joint Optimizer      │        │  - SciPy Pareto Grid Joint Optimizer │
│  - Workover vs Setpoint Decision     │        │  - Decision Rehearsal (Clone Sim)    │
│  - Field Orchestration (DEAP)        │        │  - 12-Checkpoint Assurance Gate      │
└──────────────────┬───────────────────┘        └──────────────────┬───────────────────┘
                   │                                               │
┌──────────────────▼───────────────────┐        ┌──────────────────▼───────────────────┐
│  Storage & Web App:                  │        │  Storage & Web App:                  │
│  - Time-Series Store (TimescaleDB)   │        │  - SQLite 25-Table Schema (SQLAlchemy)│
│  - React / Tailwind CSS              │        │  - Native TypeScript Workstation     │
│  - Hero Well, Field Overview         │        │  - 3D Digital Twin (Three.js WebGL)  │
└──────────────────────────────────────┘        └──────────────────────────────────────┘
```

---

## 2. Component-by-Component Match Table

| Subsystem | PPT Architecture (Slide 3) | Actual Codebase Implementation | Architectural Alignment | Discrepancy & Analysis |
|---|---|---|---|---|
| **3D Visualization** | **NOT MENTIONED** | Three.js WebGL interactive 3D simulator (`src/scene/*`, `kinematics/*`) | **CRITICAL OMISSION IN PPT** | The software's flagship visual asset is completely missing from the PPT architecture diagram! |
| **Frontend Framework** | React + Tailwind CSS | Vanilla TypeScript + Custom CSS (`workstation.css`) | **CONTRADICTORY** | PPT claims React/Tailwind. Code is lean native TypeScript for maximum WebGL rendering performance. |
| **API & Ingress** | REST + MQTT + OPC-UA | FastAPI REST (`/api/v1/*`) + WebSockets (`/ws/sim`) | **PARTIAL** | REST and WebSockets are live. MQTT/OPC-UA is specified as a roadmap gateway interface. |
| **State Stream Adapter** | Stream Processor (Normalized Tags) | `backend/app/analytics/state_adapter.py` | **MATCH** | Normalizes state across simulation and twin engines, ensuring uniform dictionary keys. |
| **Coupled Physics Twin** | 4 physics blocks (Thermal, Rheology, Rod, Inflow) | 15-domain coupled time stepper (`backend/app/twin/time_stepper.py`) | **MATCH (SURPASSES PPT)** | Project implementation is significantly deeper than the PPT diagram suggests! |
| **Crude Rheology** | Thixotropic Engine (Herschel-Bulkley) | Andrade exponential viscosity model + Couette annular drag | **PARTIAL** | Effective apparent viscosity and startup drag are modeled; full thixotropic structural kinetics are simplified. |
| **Machine Learning** | PyTorch / SciPy Surrogate & Classifier | scikit-learn `RandomForestRegressor` + Geometric Dyno Classifier | **CONTRADICTORY (Framework)** | Code uses scikit-learn for random forest surrogate rather than PyTorch deep learning. |
| **Optimization Engine** | FastAPI + SciPy + DEAP | SciPy Differential Evolution (`css_optimizer.py`) + Analytical Pareto Grid (`optimizer.py`) | **PARTIAL (No DEAP)** | Single-well joint optimization is functional using SciPy. Multi-well DEAP scheduling is absent. |
| **Decision Rehearsal** | **NOT MENTIONED** | In-memory deep clone forward trial engine (`forecast/rehearsal.py`) | **EXTRA IN PROJECT** | High-value capability present in software but missing from architecture diagram. |
| **Assurance Gatekeeper** | **NOT MENTIONED** | 12-checkpoint deterministic safety engine with Abstain Protocol (`gatekeeper.py`) | **EXTRA IN PROJECT** | Core trust feature present in software but missing from architecture diagram. |
| **Database** | TimescaleDB / PostgreSQL | SQLite (`assure_twin.db`) via SQLAlchemy ORM (25 tables) | **CONTRADICTORY (Engine)** | Relational schema is fully modeled, but uses an embedded SQLite file for zero-config portability. |
| **Field Orchestration** | Capacity Manager, Cycle-Timing, Allocation Optimizer | None (Single hero well BGW-17A focus) | **MISSING IN PROJECT** | Multi-well fleet scheduling was not implemented in code. |

---

## 3. Recommended Architectural Fixes for Presentation

1. **Add Three.js WebGL 3D Twin Block:** Insert a prominent top-level visual block: `3D Cyber-Physical Twin (Three.js WebGL Engine)` linked to the telemetry stream.
2. **Correct Technology Stack Badges:**
   - Swap `React` ➔ `Three.js`
   - Swap `Tailwind` ➔ `TypeScript`
   - Swap `PyTorch` ➔ `scikit-learn`
   - Swap `DEAP` ➔ `SciPy (Differential Evolution)`
   - Label `TimescaleDB` ➔ `SQLAlchemy ORM (SQLite / TimescaleDB Ready)`
3. **Add the Assurance & Rehearsal Layer:**
   - Show `Decision Rehearsal Sandbox` and `12-Point Assurance Gate` between Optimization and Web Display.
4. **Remove "DEAP Field Orchestration":**
   - Focus the architectural flow on the deep **Hero Well Digital Twin (Well BGW-17A)**.
