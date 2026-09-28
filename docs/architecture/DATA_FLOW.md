# DATA_FLOW.md
## Detailed End-to-End Data Flow & Pipeline Traceability

This document traces the exact data lifecycle from raw telemetry ingestion to persistent database storage, verified against the actual codebase.

---

### End-to-End Data Pipeline Map

```
1. INGESTION & DATA QUALITY
   ├── Endpoint / Function: `backend/app/api/v1/simulation.py` & `src/sim/SimulationClient.ts`
   ├── Telemetry Read: SPM, stroke, polished rod loads (PPRL, MPRL), flowline T, wellhead P.
   └── Validation: `src/assure/DataQualityAuditor.ts` checks for flatlined signals, out-of-range bounds, and assigns provenance badges.

2. SUBSURFACE STATE ESTIMATION (VIRTUAL SENSORS)
   ├── Endpoint / Function: `backend/app/api/v1/analytics.py::get_virtual_downhole()`
   ├── Logic: `src/assure/VirtualDownholeEstimator.ts` & `backend/app/twin/time_stepper.py`
   └── Outputs: Near-wellbore temperature ($T_\text{dh}$), dynamic fluid level, pump intake pressure ($PIP$), and Andrade viscosity ($\mu_\text{dh}$).

3. FIRST-PRINCIPLES PHYSICAL TIME-STEPPING
   ├── Master Stepper: `backend/app/twin/time_stepper.py::StatefulTwinEngine.step(dt)`
   ├── Thermal: `backend/app/physics/thermal.py::thermal_step()` calculates Marx-Langenheim heat loss.
   ├── Rheology: `viscosity_andrade(temp_c)` computes temperature-dependent viscosity.
   ├── Inflow: `backend/app/physics/inflow.py::vogel_inflow()` computes reservoir liquid rate.
   ├── Pump: `backend/app/physics/pump.py::calculate_pump_performance()` solves volumetric displacement & fillage.
   └── Loads: API RP 11L Couette shear drag and downstroke float margin $M_\text{float}$.

4. MACHINE LEARNING ACCELERATION & SURROGATE INFERENCE
   ├── Module: `backend/app/ai/surrogate.py::ProductionSurrogateModel`
   ├── Inference: `surrogate.predict(temp, viscosity, spm, stroke)` provides $<1\text{ ms}$ oil rate estimates.
   ├── OOD Check: `src/assure/OutOfDomainDetector.ts` computes distance to training manifold.
   └── Consensus: `backend/app/ai/model_agreement.py` computes $|\text{Physics} - \text{ML}| / \text{Physics}$.

5. MULTI-HORIZON TRAJECTORY FORECASTING
   ├── Endpoint / Module: `backend/app/forecast/service.py::generate_forecast()`
   └── Output: Forward arrays (+0, +1, +3, +7, +14, +30, +60 days) for temperature, viscosity, fluid level, and float margin with widening uncertainty confidence bands.

6. ISOLATED DECISION REHEARSAL
   ├── Function: `backend/app/forecast/rehearsal.py::rehearse_operating_point()`
   ├── Mechanism: Deep-clones live engine via `live_engine.clone()`.
   └── Execution: Steps cloned instance 30 forward days with candidate setpoints without modifying the live production state.

7. MULTI-OBJECTIVE JOINT OPTIMIZATION
   ├── Module: `backend/app/optimization/css_optimizer.py`
   ├── Algorithm: `scipy.optimize.differential_evolution(maxiter=35, popsize=12)`.
   └── Objective: Maximizes Net Present Value (NPV) subject to $M_\text{float} \ge 10\%$ and $\text{SOR} \le 4.5$.

8. ZERO-TRUST DECISION ASSURANCE & ABSTAIN
   ├── Module: `backend/app/assurance/gatekeeper.py::evaluate_12_gates()`
   ├── Checkpoints: Evaluates candidate solution against 12 safety bounds.
   └── Output: Verdict (`VERIFIED_FOR_ENGINEER_REVIEW` or `NO_SAFE_RECOMMENDATION`).

9. EXPLAINABILITY & RECOMMENDATION CONTRACT
   ├── Module: `backend/app/assurance/why_engine.py` & `backend/app/api/v1/recommendations.py`
   ├── Outputs: Formal decision case with *Why* causal explanation and *Why Not* counterfactual justifications.
   └── Lineage: Computes SHA-256 seal for audit trail.

10. PERSISTENCE & DATABASE STORAGE
    ├── Database: SQLite (`assure_twin.db`) via SQLAlchemy 2.0 ORM (`backend/app/models/entities.py`).
    └── Entities Stored: 25 tables including `wells`, `css_cycles`, `simulation_states`, `scenario_evaluations`, `recommendations`, and `audit_events`.
```
