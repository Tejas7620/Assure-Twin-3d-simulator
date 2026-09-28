# IMPLEMENTATION BASELINE AUDIT
**Project:** ASSURE-TWIN (Smart India Hackathon 2026 — PS SIH26120)  
**Date:** September 2026  
**Auditor:** Antigravity Autonomous Agent  
**Baseline Status:** VERIFIED & OPERATIONAL

---

## 1. Executive Summary

An exhaustive initial audit of the **ASSURE-TWIN** codebase was conducted prior to code modification. The system currently possesses a comprehensive cyber-physical digital twin foundation, comprising:
- A high-fidelity Three.js 3D petroleum production simulator with surface pumpjack, horizontal deviated wellbore, subsurface thermal front, multiphase oil/steam particles, and procedural textures.
- A 15-domain coupled first-principles physics core in Python (`StatefulTwinEngine` & `SimulationEngine`).
- A 12-checkpoint zero-trust safety gatekeeper with non-negotiable abstain capability (`NO SAFE RECOMMENDATION`).
- A fast surrogate ensemble with Mahalanobis out-of-distribution (OOD) distance detection and analytical fallback.
- A decision rehearsal sandbox supporting deep-copy forward safety trials without live state mutation.
- A complete control-room workstation frontend (TypeScript, native CSS) with 12 view controllers and real-time canvas instruments.

---

## 2. Subsystem Audit Breakdown

### 2.1 Frontend Status
- **Entry Point:** `src/main.ts` -> Initializes `SimulationClient`, `Environment`, `Facilities`, `PumpjackKinematics`, `PumpjackModel`, `FluidPath`, `OilParticleSystem`, `SteamParticleSystem`, `ThermalViscosityGrid`, `AssureTwinManager`, and `WorkstationApp`.
- **Framework/Language:** TypeScript ~6.0, Vite 8.3, Three.js 0.186, native modular CSS (`src/style.css`, `src/ui/workstation.css`).
- **Build Status:** `npm run build` (`tsc && vite build`) executes cleanly with **0 errors** (Output bundle: `dist/assets/index-CEN3Qlr_.js`, `dist/assets/index-BWNf5KLS.css`).
- **Navigation Structure:** `LeftNav.ts` currently provides 12 navigation items (`overview`, `simulator`, `wellstate`, `forecast`, `scenarios`, `optimization`, `recommendation`, `assurance`, `alerts`, `history`, `calibration`, `settings`).
- **3D Viewport:** Interactive WebGL canvas mounted centrally with OrbitControls, directional sun lighting, subsurface cutaway, and particle systems.
- **Drawers & Modals:** `CardDetailInspectors.ts` and `DetailDrawer.ts` provide slide-over detail drawers for pumpability, envelope, dyno card, SRP diagnostics, and alerts.

### 2.2 Backend Status
- **Entry Points:**
  - `backend/app/main.py`: Authoritative FastAPI application with database initialization (`init_db()`), simulation clock startup, `/health`, `/ws/sim` WebSocket endpoint, and `api_v1_router`.
  - `backend/main.py`: Secondary simulation WebSocket loop.
- **Dependencies:** FastAPI 0.115, SQLAlchemy 2.0, NumPy 1.26, SciPy 1.14, scikit-learn 1.5, Pydantic 2.9, Uvicorn, Pytest.
- **Engines:**
  - `SimulationEngine` (`backend/engine.py`): Real-time 10-12 Hz physics loop for visual 3D simulation telemetry.
  - `StatefulTwinEngine` (`backend/app/twin/time_stepper.py`): Comprehensive 43-parameter coupled engine covering all 15 engineering domains with `.clone()` capability.
  - `state_adapter.py`: Normalizes schema keys between Engine A and Engine B.
- **Database:** SQLite file `assure_twin.db` using SQLAlchemy models (`Field`, `Well`, `Reservoir`, `Completion`, `FluidProperty`, `CSSCycle`, `SRPConfiguration`, `ProductionObservation`, `Alert`, `Recommendation`, `OptimizationRun`, `AuditRecord`).

### 2.3 3D Simulator Architecture
- **Protected Visuals:**
  - `PumpjackModel.ts`: High-detail kinematic walking beam, horsehead, polished rod, pitman arm, counterweights, Sampson post, gear reducer, and prime mover motor.
  - `Facilities.ts`: Once-through steam generator (OTSG), water treatment plant, 3-phase horizontal test separator, storage tank battery, flare knock-out drum.
  - `FluidPath.ts`: Deviated 3D wellbore casing, slotted liner, production tubing, wellhead tree, flowlines.
  - `OilParticleSystem.ts` & `SteamParticleSystem.ts`: Particle flows driven by oil rate and steam injection volume.
  - `ThermalViscosityGrid.ts`: Subsurface 3D reservoir volumetric slice with thermal front radius and temperature gradient coloring.
- **Camera System:** `Environment.ts` contains `moveToPreset()` with cubic bezier easing. Existing presets: `exactMatch`, `srpUnit`, `steamPlant`, `tankBattery`, `horizontalPump`, `thermalFront`.

### 2.4 API Endpoints Inventory
- `GET /health` — System and simulation clock health.
- `GET /api/v1/wells` & `GET /api/v1/wells/{well_id}` — Well metadata & trajectories.
- `GET /api/v1/wells/{well_id}/state` — Real-time operational state.
- `GET /api/v1/analytics/virtual-downhole` — Estimated downhole sensors (PIP, T_dh, dynamic fluid level, in-situ viscosity).
- `GET /api/v1/analytics/pumpability` — Pumpability window calculation.
- `GET /api/v1/analytics/envelope` — Thermo-mechanical operating envelope.
- `GET /api/v1/analytics/twin-state` — Authoritative twin-engine normalized and raw state.
- `GET /api/v1/analytics/readiness` — CSS cycle turnaround readiness.
- `GET /api/v1/analytics/thermal-memory` — Cumulative thermal memory metrics.
- `GET /api/v1/analytics/sensitivity` — Economic/production sensitivities.
- `POST /api/v1/analytics/rehearsal` & `POST /api/v1/scenarios/rehearse` — Decision rehearsal on cloned twin.
- `GET /api/v1/scenarios/compare` — 4-scenario comparative simulation.
- `POST /api/v1/optimization/solve`, `/joint`, `/css`, `/srp`, `/vfd`, `/inflow-governor` — Multi-objective optimization.
- `POST /api/v1/recommendations/generate` — Certified recommendation generation or `NO_SAFE_RECOMMENDATION`.
- `POST /api/v1/recommendations/{case_id}/approve` & `/reject` — Engineer approval workflows.
- `GET /api/v1/assurance/evaluate` & `POST /evaluate-candidate` — 12-checkpoint zero-trust gatekeeper.
- `POST /api/v1/assurance/why` — Causal physical chain explanation.
- `POST /api/v1/calibration/fit-viscosity`, `/fit-permeability`, `/reconcile`, `/screen-sensor` — Parameter calibration & drift reconciliation.
- `GET /api/v1/alerts/active` & `/history` — Operational warning alerts.
- `WS /ws/sim` — High-frequency state streaming.

### 2.5 Test Suite Results
- **Backend (Pytest):** 60 tests collected across 8 test suites (`test_ai.py`, `test_api.py`, `test_assurance.py`, `test_calibration.py`, `test_forecast.py`, `test_optimization.py`, `test_phase2.py`, `test_physics.py`).
  - **Result:** **60 passed, 0 failed** in 14.64 seconds.
- **Frontend (TSX test runner):** 30 automated integration tests executed (`src/assure/tests/AssureTestSuite.ts`).
  - **Result:** **30 passed, 0 failed** in 5.1 seconds.

---

## 3. Working vs Partially Integrated vs Broken Features

| Feature Domain | Status | Notes |
| :--- | :--- | :--- |
| **3D Petroleum Twin** | **WORKING** | Kinematics, facilities, particle systems, thermal grid all render smoothly. |
| **15 Physics Domains** | **WORKING** | First-principles analytical models active in both engines. |
| **Dynamic Operating Envelope** | **WORKING (Backend) / PARTIAL (Frontend)** | API exists; frontend canvas renders static/live point, but needs dedicated first-class Envelope view with time-series trajectory and explicit [Min/Max/Preferred SPM] bands. |
| **Pumpability Window** | **WORKING (Backend) / PARTIAL (Frontend)** | API exists; gauge renders, but needs dedicated first-class Pumpability view, trend trajectory, and prominent countdown card. |
| **Decision Rehearsal** | **WORKING (Engine) / PARTIAL (UI)** | Cloned sandbox simulation works; needs a cohesive Decision Rehearsal Workspace with 30-day horizon inputs, trajectories, and constraint violation outputs. |
| **Scenario Comparison** | **WORKING** | 4-scenario simulation exists in `scenarios.py`; needs side-by-side Current vs Proposed vs Rehearsed comparative layout. |
| **Abstain Protocol** | **WORKING (Gatekeeper)** | Gatekeeper properly aborts on constraint violation; needs interactive **[ INJECT ABNORMAL VISCOSITY SPIKE ]** and **[ RESET DEMO STATE ]** demo buttons. |
| **12-Point Assurance Gate** | **WORKING** | Evaluates all 12 checkpoints; UI needs explicit checkpoint cards with Value, Limit, Why, and Provenance. |
| **Physics / ML Agreement** | **WORKING (AI Engine)** | Disagreement detection active in `model_agreement.py`; needs visual Delta and Agreement Status cards with fallback explanation. |
| **OOD Display** | **WORKING** | Mahalanobis detector in `surrogate.py` computes distance; needs explicit UI pill (WITHIN / OUTSIDE VALIDATED DOMAIN). |
| **Recommendation Engine** | **WORKING** | Generates explainable case with causal reasons; needs full 10-section page with [APPROVE], [REJECT], [REHEARSE AGAIN], [GENERATE REPORT]. |
| **Camera Presets** | **PARTIAL** | Presets exist in `Environment.ts`; needs explicit quick-access buttons: `[ SURFACE PUMPJACK ]`, `[ DOWNHOLE PERFORATIONS ]`, `[ DYNO CARD ZOOM ]`, `[ RESET VIEW ]`. |
| **Engineering Report** | **PLACEHOLDER** | Needs a certified downloadable/printable Engineering Decision Report with simulation disclaimers and SHA-256 integrity. |
| **Canonical Well State** | **PARTIAL** | State exists in both engines; needs unified single source of truth across all views with provenance badges. |
| **Data Provenance** | **PARTIAL** | Provenance engine exists in TS; needs visible `<ProvenanceBadge />` components on all displayed metrics (`MEASURED`, `CALIBRATED`, `SIMULATED`, `MODEL-DERIVED`, `DEMO`). |

---

## 4. Known UI & Layout Issues
1. **Right Sidebar Scrolling:** Vertical truncation on compact screens (under 800px height) when viewing Overview right column cards.
2. **Nav Structure Inconsistency:** Phase 23 calls for 12 standardized views:
   1. OVERVIEW, 2. 3D TWIN, 3. WELL STATE, 4. FORECAST, 5. OPERATING ENVELOPE, 6. PUMPABILITY, 7. DECISION REHEARSAL, 8. OPTIMIZATION, 9. ASSURANCE, 10. RECOMMENDATION, 11. CALIBRATION, 12. REPORTS.
   Currently `scenarios` and `settings` are in LeftNav, but `Operating Envelope`, `Pumpability`, `Decision Rehearsal`, and `Reports` need first-class dedicated navigation entries.
3. **Dead / Unwired Controls:** Certain buttons in drawer headers lack explicit toast/notification handlers; VFD slider has local listener but lacks bidirectional sim push.
4. **Interactive Card Visual Cues:** Ensure all interactive cards have hover states, pointer cursors, and visual affordances indicating they open drawers or navigate.

---

## 5. Non-Negotiable Engineering Ground Truth
- No fake field measurements, SCADA hardware, or false ML accuracy claims will be introduced.
- All synthetic and simulated data will be explicitly marked with provenance tags.
- The authoritative safety gatekeeper remains backend-enforced with complete abstain authority.

---
*Baseline audit recorded and frozen prior to Phase 1-54 implementation.*
