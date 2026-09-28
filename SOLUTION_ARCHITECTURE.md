# ASSURE-TWIN — SOLUTION ARCHITECTURE DOCUMENT
## Decision-Assured Well-to-Surface Digital Twin for Heavy Oil CSS & SRP Optimization
**Problem Statement ID:** PS 26120  
**Target Field:** Baghewala Heavy Oil Reservoir (Bikaner-Nagaur Basin)  
**Primary Positioning:** *"From optimal setpoint to safe operating window."*  
**Secondary Positioning:** *"Simulate the consequence before changing the well."*  
**Third Positioning:** *"Every recommendation is tested before it reaches the engineer."*

---

## 1. Executive Summary & Operating Philosophy

The existing 3D simulator serves as the immutable, high-fidelity visual and physical foundation representing:
- **"WHAT IS HAPPENING IN THE WELL?"** (Pump kinematics, rod displacement, fluid transit, steam plume, reservoir heating).

The **ASSURE-TWIN** intelligence layer wraps this foundation to answer the decisive engineering questions:
1. *"WHAT WILL HAPPEN NEXT?"* (Multi-horizon future trajectory projection: +1d, +3d, +7d, +14d).
2. *"WHY IS IT HAPPENING?"* (Causal physics chain: thermal decay → viscosity exponential surge → rod drag escalation → float margin collapse).
3. *"WHAT SHOULD THE ENGINEER CHANGE?"* (Coupled joint CSS + SRP setpoints).
4. *"WHEN SHOULD THEY CHANGE IT?"* (Dynamic pumpability window & CSS readiness window).
5. *"HOW ROBUST IS THE DECISION?"* (Monte-Carlo style input perturbation under parametric uncertainty).
6. *"IS THE WELL CURRENTLY IN A SAFE / PREFERRED OPERATING REGION?"* (Moving thermo-mechanical operating envelope).
7. *"CAN THE RECOMMENDATION BE TRUSTED?"* (12-checkpoint Assurance Gate with Physics vs. ML agreement & Out-of-Domain checks).
8. *"WHAT IF THE MODEL IS WRONG?"* (Abstain protocol: mandatory `NO SAFE RECOMMENDATION` + `REQUEST MORE DATA`).
9. *"WHEN SHOULD THE NEXT CSS CYCLE BE PREPARED?"* (Thermal memory decay & economic inflection timing).

---

## 2. High-Level Architecture Diagram

```
                        EXISTING 3D SIMULATOR
                       (Three.js + Physics / WS)
                                  │
                                  │  [Read-Only Subscription]
                                  ▼
                   ┌──────────────────────────────┐
                   │   SimulationStateAdapter     │
                   └──────────────┬───────────────┘
                                  │ Normalized SolutionState
          ┌───────────────────────┼───────────────────────┐
          ▼                       ▼                       ▼
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│ Virtual Downhole │    │ Dynamic Thermo-  │    │ Future Trajectory│
│ State Estimation │    │ Mechanical       │    │ Engine           │
│ (Pwf, Visc, Q, L)│    │ Operating Envelop│    │ (+1d, 3d, 7d,14d)│
└─────────┬────────┘    └─────────┬────────┘    └─────────┬────────┘
          │                       │                       │
          └───────────────────────┼───────────────────────┘
                                  ▼
                     ┌──────────────────────────┐
                     │    Pumpability Window    │
                     │  (Days to Safe Boundary) │
                     └────────────┬─────────────┘
                                  ▼
                     ┌──────────────────────────┐
                     │    Decision Rehearsal    │
                     │  (Current / CSS / SRP /  │
                     │   Joint / Custom)        │
                     └────────────┬─────────────┘
                                  ▼
                     ┌──────────────────────────┐
                     │  Joint CSS + SRP Solver  │
                     │ (Coupled Multi-Objective)│
                     └────────────┬─────────────┘
                                  ▼
                     ┌──────────────────────────┐
                     │   Robustness & Physics   │
                     │   Validation + ML Agree  │
                     └────────────┬─────────────┘
                                  ▼
                     ┌──────────────────────────┐
                     │      ASSURANCE GATE      │
                     └──────┬────────────┬──────┘
                            │            │
            [Checks Pass]   │            │ [Fail / High Uncertainty]
                            ▼            ▼
                   ┌──────────────┐  ┌────────────────────────┐
                   │RECOMMENDATION│  │ NO SAFE RECOMMENDATION │
                   │   CONTRACT   │  │   + REQUEST MORE DATA  │
                   └──────┬───────┘  └────────────────────────┘
                          ▼
                   ┌──────────────┐
                   │ENGINEER AUDIT│
                   │ & APPROVAL   │
                   └──────┬───────┘
                          ▼
                   ┌──────────────┐
                   │  OUTCOME &   │
                   │RECALIBRATION │
                   └──────┬───────┘
                          ↺
```

---

## 3. Core Engine Pipeline & Module Breakdown

All ASSURE-TWIN modules reside in `src/assure/` and execute strictly in client-side TypeScript without requiring destructive changes:

### Phase 1: `SimulationStateAdapter`
- Ingests raw `SimulationState` from `SimulationClient.ts`.
- Deep-clones snapshot to prevent inadvertent mutation.
- Produces normalized, strongly-typed `SolutionState` containing:
  - Timestamp & Well Identifier (`BGW-17A`)
  - Mechanical controls (`spm`, `stroke_m`, `vfd_hz`)
  - Reservoir state (`temperature_c`, `pressure_bar`, `viscosity_cp`, `thermal_front_m`, `inflow_bpd`)
  - Subsurface pump state (`pump_capacity_bpd`, `pump_fillage`, `pump_efficiency`)
  - Rod string mechanics (`pprl_kn`, `mprl_kn`, `viscous_drag_kn`, `float_margin_pct`)
  - Surface production (`oil_rate_bopd`, `water_cut`, `sor`, `energy_per_bbl`)
  - System Assurance & Provenance metadata.

### Phase 2: `DataProvenanceEngine`
- Tags every key parameter with rigorous provenance:
  - `MEASURED`: Physical field telemetry (when present).
  - `MODEL-DERIVED`: Analytical physics calculation (viscosity, rod drag, PPRL).
  - `CALIBRATED`: Adjusted through field history matching (permeability, skin factor).
  - `SYNTHETIC DEMO`: Simulated operational conditions (e.g. Well BGW-17A).
  - `PREDICTED`: Projected future states.
  - `CONFIGURED`: Operational engineering constraints.

### Phase 3: `DataQualityEngine`
- Audits live inputs continuously:
  - Checks timestamp monotonicity, missing keys, sensor continuity.
  - Detects physical outliers (e.g. negative bottomhole pressure, water cut > 100%, temperature > 350°C).
  - Flags stale sensors (unchanged reading over expected dynamic periods).
  - Outputs `dataQualityScore` (0–100%) and structured diagnostic issues.

### Phase 4: `VirtualDownholeEngine`
- Synthesizes downhole conditions using surface wellhead pressures, polished rod loads, SPM, and thermodynamic relations:
  - Downhole Temperature ($T_{dh}$ in °C, confidence interval).
  - Dynamic Fluid Level ($L_{fluid}$ in meters from surface).
  - Pump Intake Pressure ($P_{in}$ in bar).
  - In-situ Viscosity at pump intake ($\mu_{dh}$ in cP).
  - Effective Reservoir Inflow ($q_{inflow}$ in bpd).
  - Polished rod float margin and viscous downward drag force.

### Phase 5: `StateEstimator`
- Evaluates overall well health state:
  - `HEALTHY`: Stable thermal reserve, safe rod loading, normal fillage.
  - `TRANSITION`: Cooling cycle active, viscosity beginning exponential climb.
  - `WARNING`: Shrinking float margin (< 20%), declining fillage, approaching critical SPM.
  - `CRITICAL`: Rod float hazard (< 5% margin), severe fluid pound, or thermal depletion.
  - `UNKNOWN`: Insufficient data quality or sensor dropouts.

### Phase 6 & 7: `ThermalTrajectoryEngine` & `ThermalReserveEngine`
- Marx-Langenheim based reservoir thermal decay modeling.
- Calculates:
  - Exponential thermal dissipation rate ($dT/dt$).
  - Current Thermal Reserve (% capacity above baseline reservoir $38^\circ\text{C}$).
  - Thermal front shrinkage and cooling velocity.

### Phase 8 & 9: `ThermoMechanicalEnvelopeEngine` (Core Innovation)
- **Concept:** *"The safe operating window moves with the well."*
- Heavy oil viscosity changes by orders of magnitude with temperature:
  $$\mu(T) = \mu_0 \exp\left[ b \left(\frac{1}{T} - \frac{1}{T_0}\right) \right]$$
- As the well cools:
  - Downward rod drag increases: $F_{drag} \propto \mu^{0.65} \cdot \text{SPM}$.
  - Minimum Polished Rod Load ($MPRL$) drops toward zero (rod float).
  - Fluid inflow drops: $q_{inflow} \propto 1 / \mu$.
  - Therefore, the upper permissible SPM boundary shrinks downward, while the lower boundary increases to prevent fluid stagnation.
- Computes dynamic polygon zones in (SPM vs. Temperature) and (SPM vs. Viscosity) space:
  - **Safe / Preferred Region**
  - **Warning Region**
  - **Critical / Rod-Float Hazard Region**

### Phase 10 & 11: `PumpabilityEngine` & Dynamic Countdown
- Integrates future cooling trajectories with the Thermo-Mechanical Envelope.
- Computes exact **Time to Boundary Crossing** in days:
  $$t_{pumpability} = \min \{ t \mid \text{OperatingPoint}(t) \notin \text{SafeRegion} \}$$
- Displays high-visibility live countdown and status badge.

### Phase 12 & 13: `CSSReadinessEngine` & Next CSS Window
- Evaluates multi-variate readiness score:
  - Thermal reserve depletion level.
  - Current SOR vs. economic cutoff.
  - Pumpability window days remaining.
  - Subsurface rod load stress index.
- Outputs state: `NOT READY`, `PREPARE`, `WINDOW OPEN`, `URGENT`, `UNCERTAIN`.
- Computes optimal steam cycle preparation day (e.g. Day 48 in a 60-day cycle).

### Phase 14: `FutureTrajectoryEngine`
- Simulates multi-horizon forward projections (+1d, +3d, +7d, +14d) into immutable state vectors.
- Evaluates trajectories for temperature, viscosity, oil rate, cumulative production, rod loads, and energy.

### Phase 15, 16 & 17: `DecisionRehearsalEngine` (Core Feature)
- Rehearses 4 foundational counterfactuals from the identical initial state:
  1. **Current Practice**: Keep current SPM & stroke; let well cool naturally.
  2. **CSS Only**: Inject 2,500 tons steam at 120 bar; maintain standard SRP settings.
  3. **SRP Only**: Dynamically step down SPM to 2.4 to maintain float margin without steam.
  4. **Joint Optimization**: Optimized steam pulse + coordinated SPM ramping schedule.
  5. **Custom Candidate**: User-tuned steam volume, injection pressure, soak duration, SPM, stroke, and VFD.

### Phase 18 & 19: `RobustnessEngine` & Sensitivity Analysis
- Evaluates each candidate under input perturbations:
  - Temperature uncertainty ($\pm 4.0^\circ\text{C}$)
  - Viscosity uncertainty ($\pm 15\%$)
  - Inflow uncertainty ($\pm 20\%$)
  - Pressure uncertainty ($\pm 10\%$)
- Calculates: Expected Value, 95% Confidence Bounds (Best/Worst case), Variance, and Constraint Violations.
- Assigns Robustness Rating: `HIGH`, `MEDIUM`, `LOW`.

### Phase 20 & 21: `JointOptimizationEngine` & Multi-Objective Scoring
- Evaluates the tightly coupled chain:
  $$\text{Steam} \to \text{Temp} \to \text{Viscosity} \to \text{Inflow} \to \text{Pumpability} \to \text{SRP} \to \text{Rod Load} \to \text{Production}$$
- Multi-objective composite utility with user-adjustable weights:
  - Production (30%)
  - Steam-Oil Ratio / SOR (25%)
  - Electrical Energy Efficiency (15%)
  - Mechanical Reliability / Rod Safety (20%)
  - Net Operating Lifting Cost (10%)

### Phase 22 & 23: `ConstraintEngine` & `PhysicsValidationEngine`
- Enforces strict mechanical & thermodynamic limits:
  - SPM: $1.0 \le \text{SPM} \le 5.0$
  - Rod Float Margin: $\ge 15\%$
  - Peak Polished Rod Load: $\le 25\text{ kN}$
  - Pump Fillage: $\ge 40\%$
  - Steam Injection Pressure: $\le 140\text{ bar}$
- Validates mass conservation, Vogel IPR consistency, and Stokes rod drag dynamics.

### Phase 24, 25 & 26: `MLPredictionProvider`, `ModelAgreementEngine` & `OODEngine`
- Interface for ML surrogates (e.g. Random Forest / LightGBM production estimators).
- Compares Physics prediction vs. ML surrogate prediction:
  - If discrepancy $> 20\% \implies$ Disagreement Flag $\implies$ Blocks automated recommendation.
- Evaluates Mahalanobis distance from validated operational training envelope:
  - If OOD is `HIGH` $\implies$ Blocks automated recommendation.

### Phase 27, 28 & 29: `AssuranceEngine`, `NoSafeRecommendation` & `RequestMoreData`
- The mandatory gatekeeper: checks Data Quality, Calibration, Physics, ML Agreement, OOD, Mechanical Constraints, and Robustness.
- If any check fails, system refuses to output a speculative setpoint:
  - Emits `NO SAFE RECOMMENDATION`.
  - Explains the exact root cause.
  - Launches `REQUEST MORE DATA` diagnostic detailing which specific measurements (e.g. bottomhole pressure, fluid PVT, updated dyno card) would resolve the uncertainty.

### Phase 30, 31, 32 & 33: `RecommendationContract`, `WhyEngine` & `WhyNotEngine`
- Generates a formalized, immutable `RecommendationCase` containing:
  - Unique ID, Timestamp, Well ID, Proposed Controls, Expected Gains, Robustness, Preconditions, Abort Conditions.
  - **Causal Why Tree**: Explains physical mechanism step-by-step.
  - **Why Not Alternatives**: Quantifies why rival actions (e.g. higher SPM, delayed steam) were rejected.

### Phase 34 to 39: Workflow, Reconciliation, Calibration & Audit
- **Shadow Mode**: Displays proposed system recommendation side-by-side with actual field setpoint.
- **Outcome Reconciliation Engine**: Tracks simulated/observed deviation and computes model drift index.
- **Recalibration Engine**: Suggests parameter adjustments (e.g. thermal decay coefficient $\lambda$, inflow productivity index $J$).
- **Audit Trail**: Full chronological lineage from raw telemetry to engineer approval.

---

## 4. UI/UX Architecture: Dedicated Decision Center Drawer

In strict adherence to the **IMMUTABLE 3D SIMULATOR** directive:
- The 3D Three.js canvas, API 11E pumpjack, API 6A wellhead, separator, tanks, and fluid animations remain completely untouched and active in the viewport.
- An unobtrusive, ultra-sleek, industrial glassmorphism **DECISION CENTER** slide-over drawer / floating workspace is integrated additively.
- Engineers can seamlessly toggle between:
  1. **Overview & Virtual Downhole State**
  2. **Thermo-Mechanical Operating Envelope (SPM vs. Temp Canvas)**
  3. **Pumpability Window & CSS Readiness Countdown**
  4. **Decision Rehearsal & Counterfactual Comparison (Current, CSS, SRP, Joint, Custom)**
  5. **Assurance Gate, No-Safe-Recommendation & Request More Data**
  6. **Recommendation Contract, Causal Why/Why-Not & Audit Trail**
  7. **Outcome Reconciliation & Model Calibration**
  8. **Demo Scenarios (Late CSS Cycle, Stale Sensor Failure, Model Disagreement, OOD Outlier)**

---

## 5. Directory Structure for ASSURE-TWIN Layer

```
src/
├── assure/
│   ├── types.ts                        # Master type definitions for SolutionState, Contracts & Metrics
│   ├── SimulationStateAdapter.ts       # Read-only adapter consuming SimulationClient
│   ├── DataProvenanceEngine.ts         # Provenance tagging (MEASURED, MODEL-DERIVED, etc.)
│   ├── DataQualityEngine.ts            # Sensor health, continuity, outlier detection
│   ├── VirtualDownholeEngine.ts        # Virtual downhole sensors (Pwf, Visc, Float, Inflow)
│   ├── StateEstimator.ts               # Hidden operational state evaluator
│   ├── ThermalTrajectoryEngine.ts      # Reservoir cooling / thermal front projections
│   ├── ThermalReserveEngine.ts         # Model-derived thermal memory tracking
│   ├── ThermoMechanicalEnvelopeEngine.ts # Dynamic SPM vs Temp/Visc moving boundary
│   ├── PumpabilityEngine.ts            # Time to boundary crossing calculation
│   ├── CSSReadinessEngine.ts           # CSS cycle timing & readiness evaluator
│   ├── FutureTrajectoryEngine.ts       # Multi-horizon trajectory generator (+1d, 3d, 7d, 14d)
│   ├── DecisionRehearsalEngine.ts      # Counterfactual simulation engine
│   ├── RobustnessEngine.ts             # Monte-Carlo perturbation & sensitivity analyzer
│   ├── JointOptimizationEngine.ts     # Coupled CSS+SRP multi-objective solver
│   ├── ConstraintEngine.ts             # Configurable engineering limit verifier
│   ├── PhysicsValidationEngine.ts      # Thermodynamic & mechanical consistency checker
│   ├── MLPredictionProvider.ts         # ML surrogate interface & demo provider
│   ├── ModelAgreementEngine.ts         # Physics vs. ML divergence tester
│   ├── OODEngine.ts                    # Out-of-Domain boundary evaluator
│   ├── AssuranceEngine.ts              # 12-checkpoint decision gatekeeper
│   ├── RecommendationContract.ts       # Formal RecommendationCase generator
│   ├── WhyEngine.ts                    # Causal physics reasoning engine
│   ├── OutcomeReconciliationEngine.ts  # Predicted vs observed error tracking & drift
│   ├── RecalibrationEngine.ts          # Parameter calibration advisor
│   ├── AuditTrailEngine.ts             # Complete decision event lineage
│   ├── AssureTwinManager.ts            # Central coordinator connecting all engines
│   └── ui/
│       ├── DecisionCenter.ts           # Sleek industrial overlay drawer & interactive HUD
│       ├── EnvelopeCanvas.ts           # Canvas renderer for dynamic operating envelope
│       ├── RehearsalView.ts            # Candidate card comparison & scenario diff
│       └── AuditView.ts                # Step-by-step decision lineage inspector
├── scene/                              # [PROTECTED - IMMUTABLE]
├── kinematics/                         # [PROTECTED - IMMUTABLE]
├── textures/                           # [PROTECTED - IMMUTABLE]
├── sim/                                # [PROTECTED - IMMUTABLE]
├── ui/                                 # [PROTECTED - IMMUTABLE]
└── main.ts                             # Minimal additive bootstrap hook
```

---

## 6. Verification & Quality Assurance Strategy

1. **Zero Regression on 3D Foundation:** Verify pumpjack kinematics, camera controls, fluid transit, and existing control sliders continue running without interruption.
2. **Type Safety & Build:** Ensure clean compilation with `tsc --noEmit` and `npm run build` with 0 warnings/errors.
3. **Interactive Browser Testing:** Utilize `browser_subagent` to test the full operational loop in the running Vite instance:
   - Live state ingestion.
   - Operating envelope and pumpability window calculation.
   - Rehearsal of the 4 counterfactuals.
   - Triggering failure demos (`STALE_SENSOR`, `MODEL_DISAGREEMENT`, `OUT_OF_DOMAIN`) to verify `NO SAFE RECOMMENDATION`.
   - Complete recommendation approval, audit trail recording, and outcome reconciliation.
