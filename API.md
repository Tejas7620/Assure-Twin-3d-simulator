# ASSURE-TWIN API Reference Manual
## RESTful & WebSocket Telemetry Specification
**SIH 2026 — Problem Statement 26120**

---

### Base URLs
- **REST Endpoints**: `http://127.0.0.1:8000/api/v1`
- **Interactive Swagger Docs**: `http://127.0.0.1:8000/docs`
- **High-Frequency WebSocket**: `ws://127.0.0.1:8000/ws/sim`

---

### Core Endpoints

#### 1. System Health
- **`GET /health`**
  - **Response**:
    ```json
    {
      "status": "HEALTHY",
      "service": "ASSURE-TWIN Backend",
      "problem_statement": "SIH 2026 - PS 26120",
      "asset": "Baghewala Heavy Oil Field (Well BGW-17A)",
      "sim_time_days": 35.4,
      "css_phase": "PRODUCTION",
      "active_scenario": "JOINT",
      "timestamp": "2026-09-27T17:20:00Z"
    }
    ```

#### 2. Simulation State & Parameter Controls
- **`GET /api/v1/simulation/state`**: Current full authoritative physics state.
- **`POST /api/v1/simulation/control`**: Update a single parameter.
  - **Body**: `{"param": "spm", "value": 2.8}`
- **`POST /api/v1/simulation/controls`**: Batch update multiple parameters.
  - **Body**:
    ```json
    {
      "spm": 2.8,
      "stroke_length_in": 74.0,
      "steam_volume_t_d": 42.3,
      "water_cut": 0.128,
      "flowing_pwf_bar": 18.2
    }
    ```
- **`POST /api/v1/simulation/reset`**: Reset physics simulation back to calibrated Day 30 baseline.

#### 3. Advanced Analytics & Virtual Sensors
- **`GET /api/v1/analytics/virtual-downhole`**: Synthesized unmeasured subsurface parameters.
  - Returns `downholeTemperature`, `downholePressure`, `pumpIntakePressure`, `dynamicFluidLevel`, `downholeViscosity`, `effectiveInflow`, `rodDrag`, `floatMargin`, and `pumpabilityScore` with confidence ratings and bounds.
- **`GET /api/v1/analytics/pumpability`**: Time-to-boundary and limiting failure mechanisms.
- **`GET /api/v1/analytics/envelope`**: Thermo-mechanical operating envelope boundaries and current status (`OPTIMAL_PREFERRED_ZONE`, `MARGINAL_WARNING_ZONE`, `OUT_OF_ENVELOPE_CRITICAL`).

#### 4. Multi-Horizon Forecast
- **`GET /api/v1/forecast?horizon_days=30`**: Forward trajectory (7, 30, 90, 180 days) covering thermal decay, viscosity, oil rate, SOR, and load bounds.

#### 5. Decision Rehearsal & Scenario Comparison
- **`GET /api/v1/scenarios/compare`**: Comparison matrix of 4 operational strategies:
  1. Current Practice (Uncoordinated)
  2. Accelerated Inflow Optimization (Recommended)
  3. Viscosity-Bound Conservative (Defensive)
  4. Aggressive Drawdown (High Risk)
- **`POST /api/v1/scenarios/rehearse`**: Interactive sandbox rehearsal with custom parameters.

#### 6. Multi-Objective Joint Optimization
- **`POST /api/v1/optimization/solve`**:
  - **Body**:
    ```json
    {
      "well_id": "BGW-17A",
      "weights": {
        "crude_revenue": 1.0,
        "steam_penalty": 0.45,
        "power_penalty": 0.15,
        "mechanical_risk": 0.85
      }
    }
    ```
  - **Response**: Top candidate on Pareto frontier with engineering rationale and alternatives.

#### 7. Recommendations & Engineer Governance
- **`GET /api/v1/recommendations`**: List active recommendations with why/why-not rationale and preconditions.
- **`POST /api/v1/recommendations/{case_id}/approve`**: Senior engineer cryptographic sign-off.
- **`POST /api/v1/recommendations/{case_id}/reject`**: Rejection with audit notes.

#### 8. Assurance Gatekeeper
- **`GET /api/v1/assurance/evaluate`**: Full 12-checkpoint zero-trust verification report.
- **`POST /api/v1/assurance/evaluate-candidate`**: Evaluate prospective parameters before applying.

#### 9. WebSocket Streaming
- **`ws://127.0.0.1:8000/ws/sim`**: Bi-directional real-time telemetry stream at 25 Hz.
