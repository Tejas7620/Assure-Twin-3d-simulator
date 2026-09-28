# DATA_FLOW_MATCH.md — Data Flow Verification: Slide Diagrams vs. Runtime Pipeline

This document audits the end-to-end data flow diagrams depicted on Slide 2 and Slide 3 of the presentation against the actual execution pipelines inside the ASSURE-TWIN software.

---

## 1. Slide 2 Workflow Diagram Audit

### Presented Flow (Slide 2)
```
[Field & Well Data]
  ├──> [Rheology & Thermal Engine] ──> [Real-Time SRP Controller] ──┐
  └──> [Dual-Heat Coordinator]    ──> [CSS Cycle Optimizer]     ──┴──> [Field-Level Scheduler] ──> [Outcomes]
```

### Step-by-Step Pipeline Verification

| Pipeline Segment | Description | Code Implementation | Status | Verification Detail |
|---|---|---|---|---|
| **Field & Well Data ➔ Thermal & Rheology Engine** | Ingesting well geometry, fluid properties, and past cycle logs into physics solvers. | `backend/app/seed.py` ➔ `twin/time_stepper.py` ➔ `physics/thermal.py`, `fluids.py` | **WORKING** | Seed data initializes Well BGW-17A with calibrated reservoir temperature ($72.6^\circ\text{C}$), viscosity ($10,000\text{ cP}$), and depth ($950\text{ m}$). |
| **Field & Well Data ➔ Dual-Heat Coordinator** | Coordinating steam with downhole electric heaters. | None | **MISSING** | No electric heater data ingested or modeled. |
| **Thermal & Rheology Engine ➔ Real-Time SRP Controller** | Thermal decay and viscosity rebound constraining SRP pumping speed. | `physics/thermal.py` ➔ `physics/fluids.py` ➔ `analytics/envelope.py` ➔ `optimization/srp_controller.py` | **WORKING** | Downhole viscosity directly scales annular Couette drag; controller limits SPM to prevent rod floating. |
| **Dual-Heat Coordinator ➔ CSS Cycle Optimizer** | Co-optimizing steam injection volume with downhole electrical heating power. | `optimization/css_optimizer.py` | **PARTIAL** | CSS cycle optimization is functional for steam volume and soak time, but has zero downhole heater inputs. |
| **SRP Controller + CSS Optimizer ➔ Field-Level Steam Scheduler** | Aggregating well-level steam demands into a field-wide steam generator schedule. | None | **MISSING** | No fleet-level scheduler exists. Pipeline terminates at the single wellhead. |
| **Scheduler ➔ Outcomes** | Tracking recovery increase, SOR reduction, and rod failure avoidance. | `physics/economics.py`, `src/ui/pages/ScenariosView.ts` | **WORKING (Hero Well)** | Evaluates economic P&L, instantaneous/cumulative SOR, and net cash margins for Well BGW-17A. |

---

## 2. Slide 3 System Data Flow Audit

### Presented Flow (Slide 3)
```
[External Ingress] ──(Raw Telemetry)──> [Protocol Adapters] ──(Normalized Tags)──> [Physics & ML Core]
                                                                                          │
[Storage: TimescaleDB] <──(Read/Write)────────────────────────────────────────────────────┤
                                                                                          │
[Web App Dashboards]  <──(Setpoints & Status)── [Optimization & Control] <────────────────┤
                                                        │
[Field Orchestration] <──(Demand & Budgets)─────────────┘
```

### Detailed Execution Verification

| Data Flow Arrow | Expected Protocol / Data Contract | Actual Implementation in Code | Verification Status | Analysis |
|---|---|---|---|---|
| **Ingress ➔ Protocol Adapters** | MQTT / OPC-UA stream subscription | HTTP REST (`/api/v1/simulation/*`) & WebSockets (`/ws/sim`) | **PARTIAL** | Functional streaming ingress exists, but uses standard WebSockets rather than industrial MQTT/OPC-UA brokers. |
| **Adapters ➔ Physics & ML Core** | Tag normalization into common schema | `backend/app/analytics/state_adapter.py::normalise()` | **WORKING** | Adapter successfully reconciles disparate simulation and twin dictionary keys into a uniform schema. |
| **Physics Core ➔ ML Surrogate** | Physics state feature vector driving fast surrogate prediction | `backend/app/ai/surrogate.py::predict()` | **WORKING** | Features (`perm_md`, `visc_ref_cp`, `steam_volume_t`, `spm`, `stroke_in`) passed to Random Forest ensemble with Mahalanobis OOD distance check. |
| **Physics Core ➔ Storage** | Continuous logging of time-series observations to TimescaleDB | SQLAlchemy ORM ➔ SQLite `assure_twin.db` | **WORKING (SQLite)** | 25 tables record simulation runs, sensor observations, forecast runs, recommendations, and audit events. |
| **Physics & ML ➔ Optimization & Control** | State dict driving real-time force balance and Pareto grid search | `twin/time_stepper.py` ➔ `optimization/optimizer.py::solve_joint_optimization()` | **WORKING** | Simulates 16 operating points analytically across the SPM $\times$ stroke space, ranking by multi-objective utility. |
| **Optimization ➔ Decision Rehearsal** | (Omitted in PPT Diagram) Forward-trialing setpoint candidates | `forecast/rehearsal.py::rehearse_operating_point()` | **WORKING (EXTRA)** | Spawns an in-memory clone of the well twin to test candidate setpoints across 30 days before presentation. |
| **Rehearsal ➔ Assurance Gate** | (Omitted in PPT Diagram) Certifying safety predicates | `assurance/gatekeeper.py::evaluate_safety_gate()` | **WORKING (EXTRA)** | 12 deterministic engineering checks; strictly returns `NO_SAFE_RECOMMENDATION` if boundaries are violated. |
| **Optimization ➔ Field Orchestration** | Passing steam demands to DEAP genetic algorithm | None | **MISSING** | No multi-well field scheduler or DEAP code exists. |
| **Assurance ➔ Web App (Advisory)** | Serializing recommendations for engineer review | `api/v1/recommendations.py` ➔ `src/api/client.ts` ➔ `RecommendationView.ts` | **WORKING** | Delivers typed recommendation object with causal explanations; engineer approves via `POST /approve`. |
| **Web App ➔ 3D Simulation Engine** | (Omitted in PPT Diagram) Mutating 3D kinematics | `src/sim/SimulationClient.ts` ➔ `src/scene/*`, `PumpjackKinematics.ts` | **WORKING (EXTRA)** | Setpoints directly alter the 3D pumpjack motion, wellhead speed, and subsurface fluid particle velocities. |

---

## 3. Summary of Data Flow Realities

1. **The Single-Well Pipeline is 100% Intact:** From raw input parameters to coupled physics time-stepping, surrogate evaluation, Pareto optimization, decision rehearsal, assurance gating, and 3D visual rendering, the runtime data flow is **fully implemented and operational**.
2. **The Missing Flows are Exclusively Multi-Well & Downhole Heating:** The only arrows that fail are those branching into downhole electric heaters and field-wide steam generator scheduling across multiple wells.
