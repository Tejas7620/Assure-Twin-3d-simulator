# ASSURE-TWIN Architecture Audit

## 1. System Overview
**Project**: ASSURE-TWIN (Problem Statement SIH 2026 — PS 26120)  
**Domain**: Digital Twin for Well-to-Surface Optimization of Cyclic Steam Stimulation (CSS) and Sucker Rod Pump (SRP) Operations for Heavy Oil Wells of Baghewala Field.  
**Authoritative Asset**: Heavy Oil Well BGW-17A, Jodhpur Sandstone Formation, Bikaner-Nagaur Basin, Rajasthan.

---

## 2. Current Frontend Architecture
- **Framework**: Vanilla TypeScript + Vite + HTML5 Canvas + Three.js.
- **Master UI Orchestrator**: [`WorkstationApp.ts`](file:///c:/Users/tejas/OneDrive/Desktop/3d-model-oil/src/ui/WorkstationApp.ts) manages:
  - Header: [`TopHeader.ts`](file:///c:/Users/tejas/OneDrive/Desktop/3d-model-oil/src/ui/components/TopHeader.ts)
  - KPI Strip: [`KpiStrip.ts`](file:///c:/Users/tejas/OneDrive/Desktop/3d-model-oil/src/ui/components/KpiStrip.ts)
  - Left Navigation: [`LeftNav.ts`](file:///c:/Users/tejas/OneDrive/Desktop/3d-model-oil/src/ui/components/LeftNav.ts)
  - 12 Full Pages in [`src/ui/pages/`](file:///c:/Users/tejas/OneDrive/Desktop/3d-model-oil/src/ui/pages/):
    1. `OverviewView.ts`
    2. `SimulatorView.ts`
    3. `WellStateView.ts`
    4. `ForecastView.ts`
    5. `ScenariosView.ts`
    6. `OptimizationView.ts`
    7. `RecommendationView.ts`
    8. `AssuranceView.ts`
    9. `AlertsView.ts`
    10. `HistoryView.ts`
    11. `CalibrationView.ts`
    12. `SettingsView.ts`

---

## 3. Existing 3D Simulator Architecture (Protected Core)
- **3D Engine**: Three.js WebGL Renderer.
- **Kinematics Engine**: [`src/kinematics/PumpjackKinematics.ts`](file:///c:/Users/tejas/OneDrive/Desktop/3d-model-oil/src/kinematics/PumpjackKinematics.ts) (API RP 11E/11L 4-bar linkage solving crank, pitman arm, walking beam, horsehead, polished rod trajectory).
- **Surface & Subsurface 3D Models**:
  - [`PumpjackModel.ts`](file:///c:/Users/tejas/OneDrive/Desktop/3d-model-oil/src/scene/PumpjackModel.ts): Walking beam, horsehead, sampson posts, counterweights, polished rod, stuffing box, and downhole plunger pump.
  - [`Facilities.ts`](file:///c:/Users/tejas/OneDrive/Desktop/3d-model-oil/src/scene/Facilities.ts): Wellhead Christmas tree, steam generator, 3-phase test separator, stock tanks.
  - [`FluidPath.ts`](file:///c:/Users/tejas/OneDrive/Desktop/3d-model-oil/src/scene/FluidPath.ts): Surface flowlines, steam injection lines, casing/tubing strings.
  - [`OilParticleSystem.ts`](file:///c:/Users/tejas/OneDrive/Desktop/3d-model-oil/src/scene/OilParticleSystem.ts): Multi-stage viscous oil flow particle dynamics.
  - [`SteamParticleSystem.ts`](file:///c:/Users/tejas/OneDrive/Desktop/3d-model-oil/src/scene/SteamParticleSystem.ts): Thermal steam injection plume.
  - [`ThermalViscosityGrid.ts`](file:///c:/Users/tejas/OneDrive/Desktop/3d-model-oil/src/scene/ThermalViscosityGrid.ts): 3D reservoir thermal front and Andrade viscosity field.
  - [`Environment.ts`](file:///c:/Users/tejas/OneDrive/Desktop/3d-model-oil/src/scene/Environment.ts): Scene, camera, lighting, OrbitControls, terrain strata.

---

## 4. Current State Management & Analytical Engines
- **Authoritative Simulation State**: [`SimulationClient.ts`](file:///c:/Users/tejas/OneDrive/Desktop/3d-model-oil/src/sim/SimulationClient.ts) maintains physical state (time, controls, reservoir, thermal, viscosity, inflow, srp, pump, production, economics).
- **Assure Intelligence Coordinator**: [`src/assure/AssureTwinManager.ts`](file:///c:/Users/tejas/OneDrive/Desktop/3d-model-oil/src/assure/AssureTwinManager.ts) coordinates:
  - `SimulationStateAdapter.ts`
  - `DataQualityEngine.ts`
  - `VirtualDownholeStateEstimator.ts`
  - `ThermalReserveEngine.ts`
  - `OperatingEnvelopeEngine.ts`
  - `PumpabilityEngine.ts`
  - `CSSReadinessEngine.ts`
  - `FutureTrajectoryEngine.ts`
  - `DecisionRehearsalEngine.ts`
  - `JointOptimizationEngine.ts`
  - `RobustnessEngine.ts`
  - `AssuranceEngine.ts` (12-Checkpoint Gatekeeper)
  - `RecommendationContract.ts`
  - `WhyEngine.ts` & `WhyNotEngine.ts`
  - `AuditTrailEngine.ts`
  - `OutcomeReconciliationEngine.ts`
  - `RecalibrationEngine.ts`

---

## 5. UI Layout Issues Identified
1. **Right Column Clipping**:
   - Cards in the right column (`PUMPABILITY WINDOW`, `THERMO-MECHANICAL ENVELOPE`, `ROD & PUMP STATUS`, `DYNAMOMETER CARD`, `ALERTS`) are placed in `.ws-right-col` inside `.ws-overview-top-row`.
   - `.ws-overview-grid` had a fixed grid row allocation and `.ws-overview-top-row` lacked a constrained scroll height (`min-height: 0`), preventing `.ws-right-col` from scrolling independently when total card height exceeds viewport height.
   - Canvas elements had fixed CSS sizes rather than responsive aspect-ratio wrappers.
2. **Missing Interactive Drill-Downs (Drawers/Modals)**:
   - Clicking on Pumpability, Envelope, Rod & Pump Status, Dyno Card, Alerts, and Top KPI cards currently lacked specialized drawer/modal views to inspect granular technical metrics, historical curves, and operational recommendations.
   - Need unified slide-over drawer / modal system that maintains 3D simulator continuity.

---

## 6. Backend Gaps & Architecture Requirements
- Existing `backend/` has standalone simulation modules (`engine.py`, `reservoir.py`, `thermal.py`, `viscosity.py`, `inflow.py`, `srp.py`, `pump.py`, `production.py`, `economics.py`) and a basic FastAPI app.
- **Required New Layered Backend**:
  - Full relational database models in SQLAlchemy 2.0 (22+ entities: Fields, Wells, Reservoirs, Completions, FluidProperties, CSSCycles, SRPConfigurations, SRPOperatingStates, ProductionObservations, SensorObservations, SimulationRuns, Scenarios, ScenarioResults, ForecastRuns, ForecastPoints, OptimizationRuns, OptimizationCandidates, Recommendations, RecommendationEvents, Alerts, CalibrationRuns, ModelVersions, ProvenanceRecords, AuditEvents).
  - Pydantic v2 schemas for all data models and API contracts.
  - Complete REST API v1 routing under `/api/v1/`.
  - Full WebSocket endpoint at `/api/v1/ws/wells/{well_id}` streaming 10 Hz physical telemetry.
  - Seed database script (`python -m app.seed`).
  - Unit test suite using `pytest`.
