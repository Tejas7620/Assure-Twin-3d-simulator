# ASSURE-TWIN: Outcome Reconciliation & Model Recalibration

## 1. The Closed-Loop Feedback Cycle
A digital twin that cannot reconcile its predictions against actual outcomes is merely a static simulator. ASSURE-TWIN closes the loop:

```
[ Recommendation Approved & Deployed ]
                  │
                  ▼
[ Actual Field Telemetry Ingested (Day 1 - 7) ]
                  │
                  ▼
[ Outcome Reconciliation Engine ] ◄── [ Simulated Trajectory ]
                  │
                  ├── Absolute Prediction Drift (%)
                  ├── Directional Sign Consistency
                  └── Root-Mean-Square Error (RMSE)
                  │
                  ▼
[ Recalibration Advisor ] ──► [ Parameter Sensitivity Gradient ]
                  │
                  ▼
[ Tuning Inventory: λ, b, S, C_drag ] ──► [ Engineer Acceptance ]
```

---

## 2. Drift Tracking Metrics

The **Outcome Reconciliation Engine** compares simulated vs. observed trajectories across four primary key indicators:
1. **Oil Production Rate**: $\Delta q = \frac{|q_{actual} - q_{simulated}|}{q_{actual}} \times 100\%$
2. **Bottomhole Temperature**: $\Delta T = |T_{actual} - T_{simulated}|$ ($^\circ\text{ C}$)
3. **Peak Rod Load (PPRL)**: $\Delta PPRL = |PPRL_{actual} - PPRL_{simulated}|$ ($\text{kN}$)
4. **SOR**: Steam-to-Oil Ratio divergence

If any metric drifts by $> 25\%$ over a 7-day rolling window, the twin flags model divergence and alerts the engineer to recalibrate.

---

## 3. Tunable Physics Parameter Inventory

| Parameter | Symbol | Governing Engine | Default | Tuning Bounds | Impact |
|:---|:---:|:---|:---:|:---:|:---|
| **Overburden Heat Loss** | $\lambda$ | Marx-Langenheim | $0.022\text{ day}^{-1}$ | $[0.010, 0.040]$ | Accelerates or slows reservoir cooling |
| **Andrade Activation Energy** | $b$ | Andrade Rheology | $3,800\text{ K}$ | $[2,800, 5,500]$ | Governs temperature sensitivity of viscosity |
| **Mechanical Formation Skin** | $S$ | Subsurface Vogel Inflow | $+2.5$ | $[-2.0, +10.0]$ | Adjusts near-wellbore inflow choke |
| **Annular Couette Drag Mult** | $C_{drag}$ | Rod String Dynamics | $0.18$ | $[0.10, 0.35]$ | Calibrates downstroke rod drag resistance |

Recalibrations require human engineer authorization (`✓ Calibrate` button in Tab 06).
