# ASSURE-TWIN: Digital Decision Rehearsal & Optimization

## 1. Principles of Decision Rehearsal
Field engineers cannot afford to experiment on active heavy oil wells. Subsurface damage, parted rod strings, or prematurely collapsed steam chambers result in millions of rupees in workover costs.

ASSURE-TWIN introduces **Digital Decision Rehearsal**: running high-fidelity forward simulations (+1d, +3d, +7d, +14d) across competing operational actions before touching a physical surface setpoint.

---

## 2. Rehearsal Candidates

```
                           ┌────────────────────────┐
                           │ Candidate Formulation  │
                           └───────────┬────────────┘
                                       │
        ┌──────────────────┬───────────┴──────────┬──────────────────┐
        ▼                  ▼                      ▼                  ▼
┌───────────────┐  ┌───────────────┐      ┌───────────────┐  ┌───────────────┐
│ 1. Current    │  │ 2. CSS Only   │      │ 3. SRP Only   │  │ 4. Joint Opt  │
│ Setpoint Hold │  │ Steam Cycle   │      │ Speed Derate  │  │ Dual Control  │
└───────┬───────┘  └───────┬───────┘      └───────┬───────┘  └───────┬───────┘
        │                  │                      │                  │
        └──────────────────┼──────────────────────┴──────────────────┘
                           ▼
              ┌──────────────────────────┐
              │ Multi-Horizon Simulation │
              │ (+1d, +3d, +7d, +14d)    │
              └────────────┬─────────────┘
                           ▼
              ┌──────────────────────────┐
              │ Monte Carlo Robustness   │
              │ (20 Perturbation Trials) │
              └────────────┬─────────────┘
                           ▼
              ┌──────────────────────────┐
              │ Objective Scoring (NPV)  │
              └──────────────────────────┘
```

---

## 3. Objective Function Formulation

The solver maximizes an economically-weighted multi-objective function subject to hard physical constraints:

$$J = w_{oil} \cdot \Delta Q_{oil} - w_{steam} \cdot C_{steam} - w_{elec} \cdot C_{power} - w_{risk} \cdot (1 - M_{float}) - w_{cyc} \cdot |\Delta SPM|$$

Where:
- $w_{oil} = 1.0$ (crude net revenue)
- $w_{steam} = 0.45$ (steam enthalpy cost per ton)
- $w_{elec} = 0.15$ (grid power consumption per kWh)
- $w_{risk} = 0.85$ (penalty for narrow buoyant float margin)
- $w_{cyc} = 0.20$ (penalty for excessive setpoint cycling)

---

## 4. Robustness & Sensitivity Verification
Every candidate must survive a 20-trial Monte Carlo perturbation sweep:
- Reservoir pressure perturbed by $\pm 10\%$
- Native viscosity perturbed by $\pm 15\%$
- Thermal cooling rate perturbed by $\pm 20\%$

If $> 20\%$ of perturbation trials result in boundary violation, the candidate's robustness score is downgraded from `HIGH` to `LOW`, and it is disqualified by Gate 11.
