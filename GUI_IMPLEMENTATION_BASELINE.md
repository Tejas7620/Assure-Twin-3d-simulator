# GUI IMPLEMENTATION BASELINE AUDIT
**Project:** ASSURE-TWIN (Smart India Hackathon 2026 — PS SIH26120)  
**Date:** September 2026  
**Auditor:** Antigravity Autonomous Agent  
**Baseline Status:** VERIFIED & READY FOR GUI POLISH + INTEGRATION

---

## 1. Executive Summary

This GUI Implementation Baseline Audit evaluates the current user interface, component topology, 3D viewport integration, and decision-assurance workflows against the industrial control-room standard required by the SIH26120 Master GUI Prompt.

The current system has strong foundations:
- A Three.js 3D petroleum digital twin with pumpjack kinematics, facilities, wellbore, multiphase oil/steam particles, and thermal reservoir grid.
- A 12-checkpoint zero-trust safety gatekeeper and physics-AI agreement engine.
- A functional Workstation shell with top header, 8-card KPI strip, 12 navigation pages, and drawer inspectors.

However, several layout, alignment, and workflow gaps exist between the current codebase and the target control-room reference architecture.

---

## 2. Current Screens & View Components

| View ID | Title / Purpose | Component File | Current Status & Gaps |
| :--- | :--- | :--- | :--- |
| `overview` | Command Center Overview | `src/ui/pages/OverviewView.ts` | 3D viewport + right cards + lower row. Missing dedicated Model/OOD card, Rehearsal Status strip, Bottom Quick Actions row, and Camera Preset buttons. |
| `simulator` | Full 3D Physical Simulator | `src/ui/pages/SimulatorView.ts` | Fullscreen 3D viewport with floating controls and preset bar. |
| `wellstate` | Subsurface State & Virtual Sensors | `src/ui/pages/WellStateView.ts` | Virtual downhole sensor gauges (PIP, T_dh, fluid level, viscosity). Needs provenance badges. |
| `forecast` | Multi-Horizon Forward Projections | `src/ui/pages/ForecastView.ts` | 7D/14D/30D/60D projections of temperature, viscosity, rate, and float margin. |
| `scenarios` | Decision Rehearsal Workspace | `src/ui/pages/ScenariosView.ts` | 4 counterfactuals + custom inputs. Needs dedicated 30-day rehearsal run with Current vs Proposed vs Rehearsed comparative table. |
| `optimization` | Joint Multi-Objective Optimization | `src/ui/pages/OptimizationView.ts` | CSS + SRP pareto optimization, weights sliders, candidate solutions table. |
| `recommendation` | Certified Recommendation Contract | `src/ui/pages/RecommendationView.ts` | Formal 10-section contract, explainability (Why/Why Not), approval buttons, and report trigger. |
| `assurance` | 12-Checkpoint Safety Gatekeeper | `src/ui/pages/AssuranceView.ts` | 12 zero-trust checkpoints, abstain display, demo fault buttons. |
| `alerts` | State-Driven Alert Center | `src/ui/pages/AlertsView.ts` | Active & acknowledged alerts list with severity tagging. |
| `history` | Cryptographic Decision Audit Trail | `src/ui/pages/HistoryView.ts` | SHA-256 event log, rehearsal/approval records. |
| `calibration` | Model Recalibration Center | `src/ui/pages/CalibrationView.ts` | Parameter fitting (viscosity, permeability), outcome reconciliation, and CSV import. |
| `settings` | System Settings & Units | `src/ui/pages/SettingsView.ts` | Configuration and telemetry settings. |

---

## 3. UI & Layout Issues to Resolve

1. **Overview Page Topology Harmonization:**
   The prompt calls for an integrated industrial layout:
   - **Header:** ASSURE-TWIN, Well Selector, Field, Mode, Sim Time, Play/Pause, Sim Speed, Data Quality ring, Last Updated, Alert Bell, System Status.
   - **KPI Row:** 8 high-density cards (Oil Production, Water Cut, Liquid Rate, SOR, Steam Rate, Bottomhole Pressure, Downhole Temp, Viscosity).
   - **Central 3D Viewport:** Large visual anchor with quick camera preset buttons: `[ SURFACE PUMPJACK ]`, `[ DOWNHOLE VIEW ]`, `[ PERFORATIONS VIEW ]`, `[ DYNO CARD VIEW ]`, `[ RESET VIEW ]`.
   - **Right Intelligence Panel:**
     1. PUMPABILITY WINDOW (with countdown, dominant driver, risk status, [INSPECT ↗])
     2. DYNAMIC OPERATING ENVELOPE (with Safe, Preferred, Unsafe regions, current setpoint, trajectory, [INSPECT ↗])
     3. MODEL DOMAIN / OOD CHECK (Within/Outside domain, Physics/ML agreement Δ%, status)
     4. 12-POINT ASSURANCE GATE (12 rows with PASS/WARN/FAIL status, [INSPECT ↗])
   - **Lower Row:**
     - FUTURE TRAJECTORY (Selectable 7D, 15D, 30D, 60D horizons)
     - SCENARIO COMPARISON (CURRENT vs PROPOSED vs REHEARSED)
     - RECOMMENDATION SUMMARY (Recommended action, expected benefit, view full)
   - **Bottom Row:**
     - RECENT ALERTS
     - DECISION REHEARSAL STATUS STRIP (Scenario → Simulation → Forecast → Assurance → Recommendation Ready)
     - DATA & MODEL INFO (Physics v3.2, ML v1.7, Mode, Provenance)
     - QUICK ACTIONS (`[ NEW SCENARIO ]`, `[ RUN OPTIMIZATION ]`, `[ CALIBRATE MODEL ]`, `[ GENERATE REPORT ]`)

2. **Abstain Demo Trigger:**
   Explicit demo buttons:
   - `[ INJECT ABNORMAL VISCOSITY SPIKE ]` -> triggers real gatekeeper constraint violation, collapses pumpability, displays `NO SAFE RECOMMENDATION` with causal explanation, labeled `DEMO SCENARIO`.
   - `[ RESET DEMO STATE ]` -> restores baseline.

3. **Data Provenance Badging:**
   Universal `<ProvenanceBadge />` component across all displayed engineering variables (`MEASURED`, `PUBLIC`, `CALIBRATED`, `MODEL-DERIVED`, `PREDICTED`, `SIMULATED`, `DEMO`).

4. **Certified Engineering Report:**
   Downloadable and printable modal/document capturing well state, setpoints, forecast, envelope, pumpability, 12-point assurance, OOD status, physics/ML agreement, explainability, provenance, and simulation disclaimers.

5. **Elimination of Dead / Unwired Buttons:**
   Every button across all 12 views must be bound to active backend/client state, a drawer/modal, or a clean notification.

---

## 4. Test Suite Baseline
- **Backend (Pytest):** 60 passed out of 60 tests in 14.64s.
- **Frontend (TSX runner):** 30 passed out of 30 tests in 5.1s.
- **Production Bundle:** `npm run build` (`tsc && vite build`) executes cleanly with 0 errors.

---
*Baseline recorded. Proceeding with Phase 1-64 execution.*
