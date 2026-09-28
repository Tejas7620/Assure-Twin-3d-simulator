# CALIBRATION.md
## Outcome Reconciliation & Model Recalibration Center

A digital twin that cannot reconcile its predictions against actual observed outcomes is merely a static simulator. Upstream petroleum reservoirs deplete, relative permeabilities shift, and steam chambers grow. 

ASSURE-TWIN implements a closed-loop **Outcome Reconciliation & Model Recalibration Center** (`backend/app/api/v1/calibration.py` and `src/ui/pages/CalibrationView.ts`) that tracks prediction drift, fits physical parameters, and versions model instances.

---

### 1. The Closed-Loop Feedback Cycle

```
[ Recommendation Approved & Deployed ]
                  │
                  ▼
[ Actual Field Telemetry Ingested (7-Day Rolling Window) ]
                  │
                  ▼
[ Outcome Reconciliation Engine ] ◄── [ Prior Forecasted Trajectory ]
                  │
                  ├── Absolute Prediction Drift (%)
                  ├── Directional Sign Consistency
                  └── Root-Mean-Square Error (RMSE)
                  │
                  ▼
[ Recalibration Advisor ] ──► [ Parameter Sensitivity Gradient ]
                  │
                  ▼
[ Tuning Inventory: λ, b, S, C_drag ] ──► [ Engineer Review & Approval ]
                  │
                  ▼
[ Model Registry Updated: Physics v3.2 ──► Physics v3.3 ]
```

---

### 2. Drift Tracking Metrics
The **Outcome Reconciliation Engine** compares simulated vs. observed trajectories across four primary key indicators:
1. **Oil Production Rate Drift:** $\Delta q = \frac{|q_\text{actual} - q_\text{simulated}|}{q_\text{actual}} \times 100\%$
2. **Bottomhole Temperature Drift:** $\Delta T = |T_\text{actual} - T_\text{simulated}|$ ($^\circ\text{ C}$)
3. **Peak Polished Rod Load (PPRL):** $\Delta \text{PPRL} = |\text{PPRL}_\text{actual} - \text{PPRL}_\text{simulated}|$ ($\text{kN}$)
4. **Steam-to-Oil Ratio (SOR):** Cumulative steam usage vs. actual oil lifted.

If prediction drift exceeds $25\%$ over a 7-day rolling window, the twin flags model divergence, raises an alert in the Alert Center, and prompts the engineer to recalibrate.

---

### 3. Tunable Physics Parameter Inventory

| Parameter | Symbol | Governing Physical Domain | Default | Tuning Bounds | Physical Impact |
| :--- | :---: | :--- | :---: | :---: | :--- |
| **Overburden Heat Loss** | $\lambda$ | Marx-Langenheim Thermal Model | $0.022\text{ day}^{-1}$ | $[0.010, 0.040]$ | Accelerates or slows reservoir cooling rate. |
| **Andrade Activation Energy** | $b$ | Andrade Heavy-Oil Rheology | $4,200\text{ K}$ | $[2,800, 5,500]$ | Governs temperature sensitivity of crude viscosity. |
| **Formation Damage Skin** | $S$ | Subsurface Vogel Inflow (IPR) | $+2.5$ | $[-2.0, +10.0]$ | Adjusts near-wellbore permeability choking. |
| **Annular Couette Drag Mult** | $C_\text{drag}$ | Sucker-Rod Annular Friction | $0.18$ | $[0.10, 0.35]$ | Calibrates downstroke rod drag resistance. |

---

### 4. Recalibration Execution & Model Versioning
- **Optimization Endpoint:** `POST /api/v1/calibration/fit` uses least-squares optimization (`scipy.optimize.curve_fit`) to find parameter values that minimize residual sum of squares against historical production logs.
- **Model Version Registry:**
  - Initial baseline: `Physics v3.2 · ML v1.7 · Model v2.4.1`
  - Post-calibration: Automatically increments to `Physics v3.3`, records the parameter diff, and stamps the change into the cryptographic audit trail.
- **Human Authorization:** Recalibrations are never applied silently; they require explicit human engineer approval in the **Calibration** view.
