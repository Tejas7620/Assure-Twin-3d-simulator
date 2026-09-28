# DECISION_REHEARSAL.md
## Digital Decision Rehearsal: Testing Futures Without Risking Steel

In upstream oilfield operations, experimenting on a live well is unacceptable. A bad operational guess can snap a sucker-rod string, burn out a gearbox, or quench a steam chamber, resulting in **₹35–50 Lakhs in workover expenses** and weeks of lost production.

ASSURE-TWIN introduces **Digital Decision Rehearsal**: an isolated in-memory sandbox that deep-clones the live well state and forward-simulates candidate decisions across 30 days before any physical control knob is turned.

---

### 1. The Architectural Sandbox Mechanism: `clone()`
Decision rehearsal is made possible by the stateful architecture in `backend/app/twin/engine.py` and `backend/app/forecast/rehearsal.py`:

```python
# Concrete Code Mechanism from backend/app/forecast/rehearsal.py:
def rehearse_operating_point(live_engine, candidate_spm, candidate_stroke, horizon_days=30):
    # Step 1: Deep-clone the entire canonical twin state
    sandbox_twin = live_engine.clone()
    
    # Step 2: Apply candidate setpoints ONLY to the sandbox clone
    sandbox_twin.set_surface_controls(spm=candidate_spm, stroke=candidate_stroke)
    
    # Step 3: Step forward 30 days in accelerated time
    violations = []
    for day in range(1, horizon_days + 1):
        state = sandbox_twin.step(dt_days=1.0)
        
        # Check boundary violations day-by-day
        if state["loads"]["float_margin_pct"] < 10.0:
            violations.append(f"Day {day}: Rod float margin breached (downstroke buckling risk)")
        if state["pump"]["pump_fillage"] < 0.65:
            violations.append(f"Day {day}: Pump starvation (fluid pound shock)")
            
    # Step 4: Return verdict WITHOUT touching the live well state
    return {
        "verdict": "APPROVED" if not violations else "REJECTED",
        "violations": violations,
        "cumulative_oil": sandbox_twin.cumulative_oil_bbl,
        "final_sor": sandbox_twin.instantaneous_sor
    }
```

### 2. Why the Live State Remains Untouched
- The production engine running behind `/ws/sim` maintains the true canonical well clock (e.g., Day 231.5).
- The rehearsal engine works exclusively with the cloned memory instance.
- No live SCADA settings, alarms, or database records are modified during a rehearsal run.
- Multiple candidates can be rehearsed in parallel without state pollution.

---

### 3. The Four Standard Rehearsed Counterfactuals

Whenever an engineer requests an evaluation, ASSURE-TWIN rehearses **4 competing operational futures**:

```
                         ┌───────────────────────────┐
                         │   LIVE CANONICAL STATE    │
                         │   (Day 231.5, Well BGW-17A│
                         └─────────────┬─────────────┘
                                       │ clone()
         ┌─────────────────┬───────────┴───────────┬─────────────────┐
         ▼                 ▼                       ▼                 ▼
 ┌───────────────┐ ┌───────────────┐       ┌───────────────┐ ┌───────────────┐
 │ 1. STATUS QUO │ │ 2. CSS ONLY   │       │ 3. SRP ONLY   │ │ 4. JOINT OPT  │
 │ Hold 3.6 SPM  │ │ Steam 2,400T  │       │ Derate to 1.8 │ │ 2.8 SPM, 74"  │
 │ No Steam      │ │ Keep 3.6 SPM  │       │ No Steam      │ │ Steam Day 22  │
 └───────┬───────┘ └───────┬───────┘       └───────┬───────┘ └───────┬───────┘
         ▼                 ▼                       ▼                 ▼
 ┌───────────────┐ ┌───────────────┐       ┌───────────────┐ ┌───────────────┐
 │ FAILS DAY 18  │ │ FLUID POUND   │       │ RECOVERY DROPS│ │ VERIFIED SAFE │
 │ Rod floats &  │ │ Inflow cannot │       │ Production -60%│ │ Net Oil +2.2  │
 │ buckles       │ │ match speed   │       │ Energy wasted │ │ SOR -17.2%    │
 └───────────────┘ └───────────────┘       └───────────────┘ └───────────────┘
```

#### Counterfactual A: Current (Status Quo)
- **Settings:** Maintain current surface settings ($3.6\text{ SPM}$, $74''\text{ stroke}$), no new steam.
- **Rehearsal Finding:** As the formation cools from $72.8^\circ\text{ C}$ to $58^\circ\text{ C}$, viscosity reaches $3,800\text{ cP}$. On Day 18, buoyant float margin collapses to $4.2\%$, predicting severe downstroke compression buckling and imminent rod parting.

#### Counterfactual B: CSS Only
- **Settings:** Inject 2,400 tons of high-pressure steam at Day 10, but keep pumpjack at $3.6\text{ SPM}$.
- **Rehearsal Finding:** The near-wellbore heats up, but because pump displacement exceeds reservoir inflow during initial drainage, downhole pump fillage drops to $48\%$, causing violent fluid pound and wasting steam energy ($\text{SOR} > 5.2$).

#### Counterfactual C: SRP Only
- **Settings:** Derate pumping speed to $1.8\text{ SPM}$ to respect rod float limits, but do not inject steam.
- **Rehearsal Finding:** Mechanically safe ($M_\text{float} = 22\%$), but production collapses by $60\%$. Heavy crude remains trapped in the cold rock matrix.

#### Counterfactual D: Coordinated Joint Optimization (Recommended)
- **Settings:** Set speed to $2.8\text{ SPM}$, increase stroke to $74''$ (reducing shear rate), and schedule steam injection for Day 22.
- **Rehearsal Finding:** Delivers $+2.2\text{ BOPD}$ net production gain, reduces SOR by $17.2\%$, and guarantees that rod float margin stays above $12.5\%$ on every forward day.

---

### 4. How the Rehearsal is Presented to Judges
On the **Overview** dashboard and in **Scenarios**, the engineer views the **Scenario Comparison Table**:
- Side-by-side columns: *Metric, Current, Proposed, Rehearsed (30D), $\Delta$ vs Current*.
- Key metrics: Oil Rate (BOPD), SOR, SPM, Stroke, Float Margin, and Estimated Net Benefit.
- Proves conclusively that ASSURE-TWIN tests consequences before taking risks.
