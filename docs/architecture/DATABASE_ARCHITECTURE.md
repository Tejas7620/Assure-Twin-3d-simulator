# DATABASE_ARCHITECTURE.md
## Database Schema & Persistence Architecture

ASSURE-TWIN utilizes a robust relational database schema implemented with **SQLAlchemy 2.0 ORM** and backed by **SQLite 3** (`assure_twin.db`). The schema encompasses 25 relational tables capturing the complete physical, operational, and audit lifecycle of heavy-oil well assets.

---

### 1. Entity-Relationship Overview

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│     WELLS       │ 1   * │   CSS_CYCLES    │ 1   * │ SIMULATION_STATE│
│                 │───────│                 │───────│                 │
│ • well_id (PK)  │       │ • cycle_id (PK) │       │ • state_id (PK) │
│ • field_name    │       │ • well_id (FK)  │       │ • sim_time_days │
│ • formation     │       │ • steam_mass_ton│       │ • t_near_well_c │
│ • tvd_depth_m   │       │ • soak_days     │       │ • viscosity_cp  │
└────────┬────────┘       └─────────────────┘       └─────────────────┘
         │
         │ 1
         │
         ▼ *
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│ RECOMMENDATIONS │ 1   * │  AUDIT_EVENTS   │ 1   * │  CALIBRATIONS   │
│                 │───────│                 │───────│                 │
│ • case_id (PK)  │       │ • event_id (PK) │       │ • profile_id(PK)│
│ • proposed_spm  │       │ • sha256_hash   │       │ • param_name    │
│ • expected_bopd │       │ • action_taken  │       │ • fitted_val    │
│ • verdict       │       │ • engineer_role │       │ • model_version │
└─────────────────┘       └─────────────────┘       └─────────────────┘
```

---

### 2. Major Core Entities (`backend/app/models/entities.py`)

#### A. Well Asset & Subsurface Configuration
- `wells`: Master well registry (well name `BGW-17A`, operator, formation, depth $1,050\text{ m}$, casing diameter, rod string design).
- `reservoirs`: Formation properties (Jodhpur Sandstone permeability $180\text{ mD}$, native temp $42^\circ\text{ C}$, crude API gravity $16.5^\circ$).
- `rod_strings`: API rod taper configuration (e.g., Grade D 86 taper string, rod lengths, diameters, and tensile limits).

#### B. Thermal Cycles & Simulation Telemetry
- `css_cycles`: Historical and active Cyclic Steam Stimulation cycles (cycle index, steam mass injected in tons, soak duration, steam temperature, and total oil lifted).
- `simulation_states`: Canonical time-stepped state vectors ($T_\text{dh}$, fluid level, $PIP$, viscosity, water cut, instantaneous SOR, and float margin).
- `surface_telemetry`: Ingested surface sensor rows (SPM, stroke, motor power, flowline temperature, casing and tubing pressures).
- `dyno_cards`: Dynamometer load vs. stroke position arrays for both surface polished rod and downhole pump plunger.

#### C. Decision Rehearsal, Optimization & Assurance
- `scenario_evaluations`: Rehearsed counterfactual candidate paths (Status Quo, CSS Only, SRP Only, Joint Opt) with 30-day predicted recovery and violations.
- `optimization_runs`: SciPy Differential Evolution logs (objective scores, iterations, Pareto frontier candidates, and constraints).
- `assurance_evaluations`: 12-checkpoint audit records with individual pass/warn/fail booleans, OOD scores, and model consensus deltas.

#### D. Governance, Cryptographic Audit & Calibration
- `recommendation_cases`: Formal recommendation contracts containing proposed setpoints, causal *Why* physics explanations, and rejected alternatives.
- `audit_events`: Immutable security log containing timestamped operator actions, approval signatures, and **SHA-256 Merkle hashes**.
- `calibration_profiles`: History of tuned physical parameters (overburden heat loss $\lambda$, Andrade exponent $b$, skin factor $S$), residual errors, and active model versions (`Physics v3.2`).

---

### 3. Database Initialization & Seeding
- **Lifecycle Hook:** Initialized automatically at server startup via `backend/app/database.py::init_db()` called from `backend/app/main.py::lifespan`.
- **Seeding Engine:** `backend/app/seed.py` idempotently seeds Baghewala Field defaults, 4 completed historical CSS cycles, 30 days of baseline cooling curve telemetry, and initial model coefficients.
