# ASSURE-TWIN System Architecture
## Well-to-Surface Digital Twin for CSS & SRP Operations (Baghewala Field)
**SIH 2026 — Problem Statement 26120**

---

### 1. Executive Architecture Overview

ASSURE-TWIN is a high-fidelity digital twin platform engineered for heavy oil wells operating under Cyclic Steam Stimulation (CSS) and Sucker Rod Pumping (SRP) in Western Rajasthan's Baghewala Field.

```mermaid
flowchart TB
    subgraph UI ["Control-Room Workstation UI"]
        TopBar["Context Header & Live KPI Strip"]
        Canvas3D["Protected Three.js 3D Simulator Viewport"]
        SideNav["Tactical Left Navigation"]
        RightCol["Scrollable Engineering Diagnostic Rail"]
        Drawer["Slide-Over Deep-Dive Detail Drawer"]
    end

    subgraph Comm ["Communication Layer"]
        WSServer["WebSocket Telemetry Stream (/ws/sim, 20-25 Hz)"]
        REST["FastAPI v1 REST Endpoints (/api/v1/*)"]
        ClientAdapter["TypeScript AssureApiClient & SimulationClient"]
    end

    subgraph BackendEngine ["FastAPI + Python Physics Backend"]
        Engine["Authoritative SimulationEngine (Time, Kinematics, Flow)"]
        subgraph PhysicsModels ["Coupled Physics Subsystems"]
            M_Thermal["Marx-Langenheim 3D Thermal Conduction"]
            M_Visc["Walther-Andrade Heavy Oil Rheology"]
            M_Res["Reservoir Material Balance & Depletion"]
            M_Inflow["Vogel-Darcy Multiphase Inflow"]
            M_Pump["Downhole Pump Volumetric Efficiency"]
            M_SRP["Gibbs-API RP 11L Rod Wave Dynamics"]
            M_Econ["Instantaneous & Cumulative SOR / Power"]
        end
        subgraph AnalyticServices ["Intelligence & Governance"]
            VirtSens["Virtual Downhole Synthesizer (P_wf, PIP, Fluid Level)"]
            PumpWin["Pumpability & Thermal Reserve Calculator"]
            Envelope["Thermo-Mechanical Operating Envelope"]
            Forecaster["Multi-Horizon Trajectory Predictor (7-180d)"]
            Optimizer["Multi-Objective Pareto Frontier Solver"]
            Assurance["12-Checkpoint Zero-Trust Assurance Gate"]
        end
    end

    subgraph DB ["Persistence & Lineage"]
        SQLAlchemy["SQLAlchemy 2.0 ORM Engine"]
        SQLiteDB[("Relational Store (SQLite / PostgreSQL)")]
    end

    Canvas3D <--> ClientAdapter
    TopBar <--> ClientAdapter
    RightCol <--> ClientAdapter
    Drawer <--> ClientAdapter
    ClientAdapter <--> WSServer
    ClientAdapter <--> REST
    WSServer <--> Engine
    REST <--> AnalyticServices
    REST <--> Engine
    Engine --> PhysicsModels
    AnalyticServices --> PhysicsModels
    AnalyticServices --> SQLAlchemy
    Engine --> SQLAlchemy
    SQLAlchemy --> SQLiteDB
```

---

### 2. Frontend Subsystems & Layout Invariant

1. **3D Simulator Preservation (Protected Immutability)**:
   - High-fidelity Three.js scene (`src/scene/*`, `src/kinematics/*`) is completely preserved and rendered inside `.ws-canvas-container`.
   - Kinematics loop receives live crank angles and displacement directly from the authoritative simulation engine.
   - Particle systems for steam injection, reservoir heat front diffusion, and multiphase oil flow remain visually synchronized.

2. **Root-Cause UI Layout Fix**:
   - Resolved CSS grid track stretching by applying `min-height: 0` and `overflow-y: auto` to `.ws-right-col`.
   - Prevented card compression with `flex-shrink: 0`.
   - Ensured zero clipping across all viewport heights (720p, 1080p, 1440p, 4K).

3. **Slide-Over Detail Drawer & Zero Dead UI**:
   - Built [`DetailDrawer.ts`](file:///c:/Users/tejas/OneDrive/Desktop/3d-model-oil/src/ui/components/DetailDrawer.ts) with backdrop blur, smooth slide transition, and keyboard `Escape` handling.
   - Built [`CardDetailInspectors.ts`](file:///c:/Users/tejas/OneDrive/Desktop/3d-model-oil/src/ui/components/CardDetailInspectors.ts) with deep-dive technical drawers for all cards and top KPIs.

---

### 3. Backend Architecture & Zero-Trust Governance

1. **Modular Subsystems**:
   - `backend/app/simulation/`: decoupled, unit-testable physics models.
   - `backend/app/analytics/`: virtual downhole state synthesizer, pumpability decay calculator, and thermo-mechanical envelope.
   - `backend/app/forecast/`: multi-horizon forward simulator projecting thermal cooling and production over 7 to 180 days.
   - `backend/app/optimization/`: multi-objective Pareto solver optimizing SPM, stroke, and steam injection.
   - `backend/app/assurance/`: 12-checkpoint zero-trust assurance evaluator with mandatory abstain protocols.

2. **Verification & Quality**:
   - 30/30 Frontend TypeScript unit tests passing.
   - 12/12 Backend Python pytest test suites passing.
