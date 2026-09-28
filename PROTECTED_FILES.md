# PROTECTED FILES — IMMUTABLE 3D SIMULATOR FOUNDATION

> **IMPORTANT NOTICE: PROTECTED / IMMUTABLE MODE**
> The files listed below implement the existing, functional, photorealistic 3D petroleum production simulator and its kinematics, render loop, textures, and primary control panel.
> In accordance with the ASSURE-TWIN specification for Problem Statement ID 26120, **NONE OF THESE FILES ARE TO BE REBUILT, REPLACED, REDESIGNED, OR MUTATED**.
> They serve as the read-only foundation for the additive ASSURE-TWIN intelligence layer.

---

## 1. 3D Scene & Geometry Components (`src/scene/`)

| File | Status | Description |
|------|--------|-------------|
| `src/scene/Environment.ts` | **IMMUTABLE** | Three.js scene setup, WebGLRenderer, OrbitControls, HDRI lighting, sky dome, sun light, and smooth camera target interpolations. |
| `src/scene/PumpjackModel.ts` | **IMMUTABLE** | Complete API 11E Mark II pumpjack 3D geometry (walking beam, horsehead, Sampson posts, pitman arms, crank counterweights, wireline bridle) and subsurface API 11AX downhole pump with cutaway barrel, standing valve, traveling valve, and casing perforations. |
| `src/scene/Facilities.ts` | **IMMUTABLE** | Surface production facilities: API 6A casing/tubing wellhead, steam injection header & manifold, OTSG steam generator, 3-phase horizontal test separator with liquid sight glasses, and oil stock tanks. |
| `src/scene/FluidPath.ts` | **IMMUTABLE** | 3D visual tubing string and surface flowline with animated inner glow indicating crude oil transit. |
| `src/scene/OilParticleSystem.ts` | **IMMUTABLE** | Multi-stage dynamic GPU-based oil droplet particle simulation from downhole pump through wellhead to surface separator. |
| `src/scene/SteamParticleSystem.ts` | **IMMUTABLE** | High-pressure steam particle emitter system for Cyclic Steam Stimulation (CSS) injection phases. |
| `src/scene/ThermalViscosityGrid.ts` | **IMMUTABLE** | 3D volumetric heated reservoir grid showing radial thermal front propagation, temperature gradient, and heavy oil mobility. |

---

## 2. Kinematics & Procedural Texturing

| File | Status | Description |
|------|--------|-------------|
| `src/kinematics/PumpjackKinematics.ts` | **IMMUTABLE** | Analytical 4-bar linkage kinematics (crank angle to walking beam tilt, horsehead arc, polished rod displacement, instantaneous velocity, and acceleration). |
| `src/textures/ProceduralTextures.ts` | **IMMUTABLE** | Procedural canvas-generated textures for industrial steel, weathered rust, safety hazard stripes, cast iron, galvanized metal, and ground soil. |

---

## 3. Core Simulation & Baseline HUD UI

| File | Status | Description |
|------|--------|-------------|
| `src/sim/SimulationClient.ts` | **READ-ONLY / FOUNDATION** | Simulation state store and WebSocket client to Python engine with local reduced-order physics fallback. The ASSURE-TWIN intelligence layer consumes state via `subscribe()` in a strictly read-only manner. |
| `src/ui/DynoCard.ts` | **IMMUTABLE** | Real-time polished rod dynamometer card canvas renderer (load vs. position). |
| `src/ui/ControlPanel.ts` | **READ-ONLY BASELINE** | Baseline engineering HUD displaying current operational gauges, sliders, and camera view presets. Remotely triggers setpoints without modifying 3D visualization internals. |

---

## 4. Backend Engine (`backend/`)

| File | Status | Description |
|------|--------|-------------|
| `backend/engine.py` | **READ-ONLY BASELINE** | Coupled thermal-reservoir-SRP simulation engine. |
| `backend/thermal.py` | **READ-ONLY BASELINE** | Marx-Langenheim thermal reservoir heating & cooling decay calculations. |
| `backend/viscosity.py` | **READ-ONLY BASELINE** | Andrade / ASTM heavy oil temperature-viscosity relationship. |
| `backend/inflow.py` | **READ-ONLY BASELINE** | Vogel / Darcy radial inflow equations for Baghewala reservoir. |
| `backend/pump.py` | **READ-ONLY BASELINE** | API 11AX pump volumetric displacement and pump fillage calculations. |
| `backend/srp.py` | **READ-ONLY BASELINE** | Sucker rod load calculations, peak polished rod load (PPRL), minimum rod load (MPRL), and viscous rod drag. |
| `backend/production.py` | **READ-ONLY BASELINE** | Instantaneous and cumulative oil/water production rates. |
| `backend/economics.py` | **READ-ONLY BASELINE** | Power consumption, steam-oil ratio (SOR), and lifting cost estimation. |
| `backend/main.py` | **READ-ONLY BASELINE** | FastAPI and WebSocket server publishing state at 12.5 Hz. |

---

## Operational Directive

- **No existing geometry, material, animation, or camera code will be deleted or refactored.**
- All ASSURE-TWIN intelligence components (Virtual Downhole Sensors, Thermo-Mechanical Operating Envelope, Pumpability Window, Thermal Reserve, Future Trajectory, Decision Rehearsal, Robustness Engine, Assurance Gate, Recommendation Contract, Recalibration, Audit Trail) are housed under the dedicated additive directory:
  `src/assure/`
- Integration is performed non-destructively through the read-only `SimulationStateAdapter` and an unobtrusive overlay Decision Center UI.

---

## Audit Clarifications (added 2026-09-28 — Phase 0/1 audit)

These clarifications resolve ambiguities found during the read-only audit. They **add** boundaries; they do not relax any existing protection above.

### A. `src/assure/*` is MODIFIABLE (the intended integration surface)
The 33-file client intelligence suite under `src/assure/*` (e.g. `AssureTwinManager.ts`, `StateEstimator.ts`, `AssuranceEngine.ts`, `RecommendationContract.ts`, `MLPredictionProvider.ts`, `ui/DecisionCenter.ts`) is the **additive ASSURE-TWIN layer** referenced in the Operational Directive above. It is **NOT protected** and is the primary frontend work area. It consumes protected state read-only via `SimulationStateAdapter` — that read-only contract must be preserved, but the intelligence code itself may be edited.

### B. Active backend `backend/app/*` is MODIFIABLE (primary work area)
The READ-ONLY BASELINE backend list in §4 refers to the **legacy top-level** files `backend/engine.py`, `backend/thermal.py`, `backend/viscosity.py`, `backend/inflow.py`, `backend/pump.py`, `backend/srp.py`, `backend/production.py`, `backend/economics.py`, `backend/main.py`. These are **distinct** from the active FastAPI package under `backend/app/*` (twin, physics, ai, optimization, assurance, analytics, forecast, api, models, schemas, seed, config), which **is** the primary backend implementation area and may be modified per `IMPLEMENTATION_PLAN.md`.

### C. Protected files confirmed untouched by the audit
`src/scene/*`, `src/kinematics/PumpjackKinematics.ts`, `src/textures/*`, `src/sim/SimulationClient.ts`, `src/ui/DynoCard.ts`, `src/ui/ControlPanel.ts`, and the legacy `backend/*.py` baseline were inspected read-only and **not modified**.

### D. Rule for future fixes
If any planned fix appears to require editing a protected file, **stop** and find a non-destructive seam (adapter/bridge/subclass). The backend-prefer integration bridge (see `INTEGRATION_MAP.md` §4) lives in `AssureTwinManager` — **never** inside `SimulationClient.ts`.

> See `PROJECT_AUDIT.md` §9 for the full protected-asset confirmation.
