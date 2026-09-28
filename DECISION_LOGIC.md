# ASSURE-TWIN: Core Decision Logic & Physics Causal Architecture

## 1. Problem Statement Overview (PS 26120)
Baghewala heavy oil field presents one of the most challenging operational environments in upstream production:
- **Crude Characteristics**: Extra-heavy bitumen / heavy oil ($14-19^\circ\text{ API}$, dead crude viscosity $> 10,000\text{ cP}$ at native reservoir temperature of $42^\circ\text{ C}$).
- **Artificial Lift**: API 11E Class I / Mark II Sucker Rod Pump (SRP) units pumping from $\approx 1000\text{ m}$ True Vertical Depth (TVD).
- **Thermal Recovery**: Cyclic Steam Stimulation (CSS) (Huff-and-Puff: 10 days injection at $280^\circ\text{ C}$, 5 days soak, 45-60 days production).

Without coupled decision intelligence, operators face two catastrophic failure modes:
1. **Premature Rod Float & Buckling**: Pumping too fast as the near-wellbore cools down leads to buoyant rod float during downstroke, severe rod compression, sinusoidal/helical buckling, and tubing parting.
2. **Thermal Energy Waste**: Cycling steam too early leads to excessive steam-to-oil ratio (SOR), energy loss, and high carbon intensity.

---

## 2. Coupled Physics Causal Loop

ASSURE-TWIN replaces reactive guesswork with an end-to-end, first-principles causal chain:

```
[ Steam Enthalpy Injected (MWh) ]
             │
             ▼
[ Marx-Langenheim Reservoir Heating & Thermal Boundary Layer ]
             │
             ▼
[ In-Situ Temperature Trajectory T_dh(t) ]
             │
             ▼
[ Andrade Rheology Viscosity Decay: μ_dh(t) = μ_ref * exp(b * (1/T_dh - 1/T_ref)) ]
             │
             ├──► [ Vogel / Darcy Heavy Oil Inflow q_inflow(t) ] ──► [ Liquid Level & PIP ]
             │                                                                │
             ▼                                                                ▼
[ Annular Couette Rod Drag F_drag(t) = π * d_rod * L * μ * v_rod / δ ]   [ Pump Fillage η_fill ]
             │                                                                │
             ▼                                                                ▼
[ Downhole Dynamic Rod Tension & Floating Margin M_float ]            [ Peak Load (PPRL) ]
             │                                                                │
             └───────────────────────┬────────────────────────────────────────┘
                                     │
                                     ▼
                [ Dynamic Operating Envelope Safe Region (SPM) ]
                                     │
                                     ▼
                     [ Decision Rehearsal & Optimization ]
                                     │
                                     ▼
                    [ 12-Gate Decision Assurance Engine ]
                                     │
                                     ▼
                     [ Certified Recommendation Contract ]
```

---

## 3. Four Rehearsed Counterfactuals

1. **Current (Status Quo)**:
   - Maintains present surface setpoints ($SPM = 3.2$, $Stroke = 64"$).
   - Simulates forward cooling decay, showing boundary violation on Day 30 as viscosity rises.

2. **CSS Only**:
   - Triggers early cyclic steam injection (2,400 metric tons) without adjusting SRP mechanical speed.
   - Restores thermal energy but risks mechanical fluid pound if inflow cannot match high speed.

3. **SRP Only**:
   - Dynamically derates pumping speed from $3.2\text{ SPM}$ to $1.8\text{ SPM}$ to respect rod float boundary without adding thermal energy.
   - Avoids parting the rod string, but cumulative recovery declines due to unmitigated viscosity.

4. **Coordinated Joint Optimization (Recommended)**:
   - Simultaneously commands calibrated steam mobilization (Day 43-48) while modulating pump speed ($2.8\text{ SPM}$) and stroke length ($74"$).
   - Maximizes Net Present Value ($NPV$), maintains buoyant float margin $> 25\%$, and maximizes cumulative oil production ($+19\text{ BOPD}$).
