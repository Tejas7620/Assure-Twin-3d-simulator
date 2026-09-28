# ASSURE-TWIN Backend Engineering Specification
## Production FastAPI + SQLAlchemy Subsurface Physics & Governance Service
**SIH 2026 — Problem Statement 26120**

---

### 1. Directory Structure

```
backend/
├── Dockerfile                  # Container definition for Python 3.13 slim
├── requirements.txt            # Production dependencies
├── app/
│   ├── __init__.py
│   ├── config.py               # Central settings & API RP 11L thresholds
│   ├── database.py             # SQLAlchemy 2.0 engine & session maker
│   ├── main.py                 # FastAPI application & /ws/sim endpoint
│   ├── seed.py                 # Calibrated Baghewala field database seeder
│   ├── models/
│   │   ├── __init__.py
│   │   └── entities.py         # 25 relational models (Fields, Wells, Observations, Audits)
│   ├── schemas/
│   │   ├── __init__.py
│   │   └── domain.py           # Pydantic v2 schemas and data contracts
│   ├── simulation/
│   │   ├── __init__.py
│   │   ├── engine.py           # Authoritative SimulationEngine singleton
│   │   ├── manager.py          # Process-wide singleton manager
│   │   ├── thermal.py          # 3D radial conduction & Marx-Langenheim dissipation
│   │   ├── viscosity.py        # Walther-Andrade heavy oil temperature-viscosity
│   │   ├── reservoir.py        # Material balance & pressure depletion
│   │   ├── inflow.py           # Vogel heavy crude inflow performance
│   │   ├── pump.py             # Downhole pump volumetric displacement & fillage
│   │   ├── srp.py              # Rod wave dynamics & live dynamometer cards
│   │   ├── production.py       # Surface gross and net oil/water flow
│   │   └── economics.py        # Instantaneous/cumulative SOR and motor power
│   ├── analytics/
│   │   ├── __init__.py
│   │   ├── virtual_sensors.py  # Virtual downhole synthesizer (Pwf, PIP, Fluid Level)
│   │   ├── pumpability.py      # Pumpability window & rod float boundary calculator
│   │   └── envelope.py         # Thermo-mechanical operating envelope
│   ├── forecast/
│   │   ├── __init__.py
│   │   └── service.py          # 7 to 180 day multi-horizon forward trajectory
│   ├── optimization/
│   │   ├── __init__.py
│   │   └── optimizer.py        # Multi-objective Pareto frontier solver
│   ├── assurance/
│   │   ├── __init__.py
│   │   └── gatekeeper.py       # 12-checkpoint zero-trust assurance evaluator
│   └── api/
│       ├── __init__.py
│       └── v1/
│           ├── __init__.py
│           ├── router.py       # Master v1 router aggregating all endpoints
│           ├── wells.py        # Field hierarchy & well metadata
│           ├── simulation.py   # State inspection & parameter mutation
│           ├── analytics.py    # Subsurface sensor synthesis & envelope
│           ├── forecast.py     # Trajectory projections
│           ├── scenarios.py    # 4 comparison scenarios & custom rehearsal
│           ├── optimization.py # Pareto solver trigger
│           ├── recommendations.py # Recommendation lifecycle & engineer sign-off
│           ├── assurance.py    # 12-checkpoint evaluation
│           ├── alerts.py       # Active alarm management
│           └── websocket.py    # High-frequency telemetry stream
└── tests/
    └── test_api.py             # 12 comprehensive pytest suites
```

---

### 2. Physics & Dynamic Subsystems

#### Thermal Model (`backend/app/simulation/thermal.py`)
- Employs Marx-Langenheim heat deposition during steam injection ($Q = \dot{m}_{steam} \cdot h_{fg}$).
- Solves 3D radial thermal diffusion around the horizontal wellbore:
  $$\frac{\partial T}{\partial t} = \alpha_{th} \nabla^2 T$$
- Accurately captures conductive dissipation to caprock and base rock during post-steam cooling cycles.

#### Viscosity Rheology (`backend/app/simulation/viscosity.py`)
- Implements Andrade exponential relationship calibrated for Baghewala 9.2°–11° API crude:
  $$\mu_o(T) = \mu_{ref} \cdot \exp\left[ B \cdot \left(\frac{1}{T + 273.15} - \frac{1}{T_{ref} + 273.15}\right)\right]$$
  where $\mu_{ref} \approx 10,000 \text{ cP}$ at $20^\circ\text{C}$ and drops below $65 \text{ cP}$ at $180^\circ\text{C}$.

#### Sucker Rod Dynamics & Live Dyno Card (`backend/app/simulation/srp.py`)
- Calculates Peak Polished Rod Load (PPRL), Minimum Polished Rod Load (MPRL), and Couette annular viscous drag.
- Generates 100-point closed-loop surface and downhole pump dynamometer cards at 20 Hz, showing effects of fluid pound, rod float, or gas interference.

---

### 3. Zero-Trust 12-Checkpoint Assurance Gate (`gatekeeper.py`)
1. **Sensor Data Quality & Plausibility** (RTU 3-sigma variance, zero-drift check)
2. **Calibration Recency & Metrology** (Load cell calibration valid < 30 days)
3. **Mass Balance Conservation** (Fluid withdrawal vs surface gross within 5%)
4. **Energy Balance Conservation** (Marx-Langenheim enthalpy vs heat dissipation)
5. **Thermo-Mechanical Stress Limits** (PPRL <= API Grade D yield allowable 115 kN)
6. **Rod Float & Compression Safety** (Downstroke rod float margin >= 15%)
7. **Pump Clearance & Thermal Expansion** (Plunger clearance >= 0.0025" at operating temp)
8. **Gearbox Torque Rating** (Peak torque <= 85% of API rating 320,000 in-lbs)
9. **Minimum Safe Economic Inflow** (Net revenue exceeds lifting and steam allocation)
10. **Environmental & Wellhead Envelope** (Casing pressure <= 35 bar, flowline temp <= 80°C)
11. **Physics-ML Agreement Gate** (Physics model and ML surrogate agree within 8.5%)
12. **Out-of-Distribution (OOD) Guard** (Operating state inside 98% Mahalanobis convex hull)

---

### 4. Running the Backend Locally

```bash
# Initialize and seed database
python -m backend.app.seed

# Start Uvicorn server
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload

# Run full pytest test suite
python -m pytest backend/tests/test_api.py -v
```
