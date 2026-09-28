# DECISION_ASSURANCE.md
## Decision Assurance: "Simulate the Consequence Before Changing the Well"

In upstream oil and gas operations, applying changes to a high-risk well is traditionally a process of educated trial and error. An engineer adjusts a Variable Frequency Drive (VFD) setpoint, observes surface gauges over several days, and hopes the downhole equipment tolerates the new dynamics.

**ASSURE-TWIN replaces reactive trial and error with Decision Assurance.**

---

### 1. The Core Philosophy
> **"Simulate the consequence before changing the well."**

Every candidate decision must prove its safety, physical viability, and economic benefit in a high-fidelity simulation sandbox before steel is moved downhole.

---

### 2. The Decision Assurance Pipeline

```
                 [ 1. CURRENT WELL STATE ]
              (Canonical 43-parameter vector)
                            │
                            ▼
                [ 2. CANDIDATE SETPOINT ]
           (e.g., SPM = 6.6, Stroke = 52 inches)
                            │
                            ▼
              [ 3. DEEP-CLONE SANDBOX TWIN ]
           (Isolated from live telemetry & alarms)
                            │
                            ▼
             [ 4. 30-DAY FORWARD SIMULATION ]
        (Multi-domain time-stepping across 30 days)
                            │
                            ▼
           [ 5. THERMO-MECHANICAL ENVELOPE ]
          (Dynamic boundaries for every forward day)
                            │
                            ▼
         [ 6. 12-GATE SAFETY CHECKPOINT AUDIT ]
             ┌──────────────┴──────────────┐
             ▼                             ▼
       [ ALL PASS ]                   [ ANY FAIL ]
             │                             │
             ▼                             ▼
   [ CERTIFIED DECISION ]        [ NO SAFE RECOMMENDATION ]
(Expected gain, why/why-not)   (Causal explanation of breach)
             │                             │
             └──────────────┬──────────────┘
                            │
                            ▼
             [ 7. HUMAN ENGINEER REVIEW ]
       (Accept, adjust, or command steam shut-in)
```

---

### 3. The 12 Checkpoints of Decision Assurance

1. **Thermal Envelope Margin:** Verifies near-wellbore temperature stays safely above the crude pour-point and paraffin crystallization temperature ($T_\text{dh} \ge 60^\circ\text{ C}$).
2. **Downstroke Buoyant Float Margin:** Confirms Couette shear drag does not exceed downward rod weight ($M_\text{float} \ge 10\%$).
3. **Pump Fillage & Starvation:** Ensures downhole pump barrel fillage remains between $65\%\text{ and }95\%$, preventing severe fluid pound.
4. **Peak Polished Rod Load (PPRL):** Confirms tensile load on the top rod taper does not exceed API allowable fatigue stress limits.
5. **Impact Stress & Slack-Off:** Detects sudden deceleration or bridle slack-off during downstroke turnaround.
6. **Steam Enthalpy Constraint:** Ensures cumulative steam consumption does not breach field boiler fuel allotments ($\text{SOR} \le 4.5$).
7. **Telemetry Freshness & Integrity:** Validates that incoming sensor signals are active, non-frozen, and free of impossible outliers.
8. **Model Domain (OOD) Check:** Computes Mahalanobis distance to ensure input operating conditions lie within the validated training envelope.
9. **Physics-AI Consensus:** Confirms that the analytical physics engine and the machine learning surrogate agree within $\Delta \le 10\%$.
10. **Uncertainty Horizon Bounds:** Verifies that the $95\%$ confidence interval band around forecasted production does not exceed $\pm 20\%$.
11. **Historical Consistency:** Cross-references candidate outcomes against baseline performance from preceding CSS cycles.
12. **Physical Sanity Bounds:** Validates thermodynamic and mass conservation laws (e.g., produced fluids $\le$ reservoir pore volume).

---

### 4. The Human-in-the-Loop Safeguard
ASSURE-TWIN is deliberately designed as an **advisory system**, not an autonomous closed-loop controller.
- The system generates recommendations, estimates confidence, and highlights trade-offs.
- The licensed production engineer retains final operational authority.
- Every approved decision requires an explicit cryptographic sign-off, ensuring traceable accountability and engineering compliance.
