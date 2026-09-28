# USER_FLOW.md
## End-to-End User Flow & Operator Journey

This document details the complete 15-step operational journey of a production engineer using ASSURE-TWIN to monitor, diagnose, rehearse, optimize, and certify operating decisions on well **BGW-17A** in the Baghewala heavy oil field.

---

### Phase I: Ingestion, Health Inspection & Spatial Orientation

#### Step 1: Login & Well Selection
- **What the User Does:** Opens the ASSURE-TWIN control room interface in a web browser (`http://127.0.0.1:5173/`). Selects well **BGW-17A (Baghewala Field)** from the top header dropdown.
- **What the System Does:** Connects to the backend simulation engine; retrieves canonical 43-parameter state vector; initiates simulation clock (Day 230+); populates the 8-card KPI strip.
- **What the User Learns:** Confirms well location, current simulation day, operational mode (`Joint CSS + SRP`), and global data quality health ($100\%$ Good).

#### Step 2: 3D Petroleum Twin Inspection
- **What the User Does:** Interacts with the central 3D viewport. Toggles camera presets: `[ Surface Pumpjack ]`, `[ Downhole View ]`, and `[ Perforations View ]`.
- **What the System Does:** Smoothly repositions the 60 FPS Three.js camera. Solves closed-form 4-bar linkage kinematics (`PumpjackKinematics.ts`) to articulate walking beam, horsehead, and polished rod. Animates oil droplets and thermal plume in the cutaway wellbore.
- **What the User Learns:** Confirms mechanical equipment alignment, flanged wellhead valve positions, transparent pump barrel fillage, and reservoir thermal heating radius.

#### Step 3: Subsurface State & Virtual Sensor Audit
- **What the User Does:** Navigates to **Well State & Sensors** in the LeftNav (or clicks `[ Inspect ↗ ]` on the Thermo-Mechanical Summary card).
- **What the System Does:** Displays virtual soft-sensor readings alongside data provenance tags:
  - *Near-Wellbore Temperature:* $72.8^\circ\text{ C}$ (`MODEL-DERIVED`)
  - *In-Situ Viscosity:* $1,392\text{ cP}$ (`CALIBRATED`)
  - *Dynamic Fluid Level:* $973\text{ m}$ TVD (`MODEL-DERIVED`)
  - *Pump Intake Pressure (PIP):* $18.2\text{ bar}$ (`MODEL-DERIVED`)
- **What the User Learns:** Discovers that while surface wellhead pressure appears normal, downhole crude viscosity is steadily climbing due to thermal dissipation.

---

### Phase II: Predictive Boundary Analysis & Sandbox Rehearsal

#### Step 4: Pumpability Window & Operating Envelope Check
- **What the User Does:** Inspects the **Pumpability Window Gauge** and **Dynamic Operating Envelope** on the Overview screen.
- **What the System Does:** Evaluates the intersection between forward cooling curves and the 10% rod float floor. Plots the current operating setpoint ($3.6\text{ SPM}$, $74''\text{ stroke}$) inside the 2D envelope (Safe vs. Unsafe zones).
- **What the User Learns:** The pumpability window indicates that falling temperature will cause rod float within 8 days unless operating speed is modulated or a new steam cycle is scheduled.

#### Step 5: Multi-Horizon Forward Forecast
- **What the User Does:** Toggles forecast horizons (`7D`, `15D`, `30D`, `60D`) on the Future Trajectory card.
- **What the System Does:** Computes forward differential equations for thermal decay, Andrade viscosity, and Vogel inflow, rendering forward curves with 95% confidence uncertainty bands.
- **What the User Learns:** Observes that without intervention, crude viscosity will exceed $3,500\text{ cP}$ by Day 25, collapsing pump fillage from $74\%$ down to $16\%$.

#### Step 6: Decision Rehearsal Sandbox (`clone()`)
- **What the User Does:** Navigates to **Scenarios & Rehearsal** in the LeftNav. Clicks `[ Rehearse 30-Day Scenarios ]`.
- **What the System Does:** Invokes `StatefulTwinEngine.clone()` to spawn 4 isolated sandbox instances, testing 4 counterfactual pathways across 30 days without modifying the live well:
  1. *Current (Status Quo):* $3.6\text{ SPM}$, $74''\text{ stroke}$, no steam.
  2. *CSS Only:* Inject 2,400 tons steam at Day 10, keep $3.6\text{ SPM}$.
  3. *SRP Only:* Derate speed to $1.8\text{ SPM}$, no steam.
  4. *Joint Optimization:* Modulate speed to $2.8\text{ SPM}$, $74''\text{ stroke}$, schedule steam injection for Day 22.
- **What the User Learns:** Sees the comparative table: Status Quo causes rod failure on Day 18; CSS Only causes severe fluid pound; SRP Only cuts production by 60%; Joint delivers $+2.2\text{ BOPD}$ with $100\%$ mechanical safety.

---

### Phase III: Optimization, Assurance & Engineering Certification

#### Step 7: Joint CSS + SRP Optimization
- **What the User Does:** Navigates to **Joint Optimization**. Adjusts weighting sliders (Oil Production vs. Steam Economy vs. Rod Stress). Clicks `[ Run Optimization ]`.
- **What the System Does:** Executes SciPy Differential Evolution (`css_optimizer.py`), evaluating Pareto trade-offs across 1,000+ candidate setpoints using the fast ML surrogate.
- **What the User Learns:** Identifies candidate Solution #1: $2.8\text{ SPM}$, $74''\text{ stroke}$, delivering an expected $+17.2\%$ improvement in Steam-to-Oil Ratio (SOR).

#### Step 8: Zero-Trust 12-Gate Safety Audit
- **What the User Does:** Navigates to **Assurance Gate**. Reviews the 12-point gatekeeper checklist.
- **What the System Does:** Evaluates candidate Solution #1 against all physical bounds:
  - Thermal Envelope: `PASS` ($T_\text{dh} = 72.8^\circ\text{ C} \ge 60^\circ\text{ C}$)
  - Rod Float Margin: `PASS` ($M_\text{float} = 12.5\% \ge 10\%$)
  - Gearbox Torque: `PASS` ($68.2\% \le 85\%$)
  - Model Domain (OOD): `PASS` (OOD score $0.23 \le 0.60$)
  - Consensus: `PASS` (Physics vs. ML delta $\Delta = 4.5\% \le 10\%$)
- **What the User Learns:** Confirms that the candidate setpoint satisfies every thermo-mechanical limit and has consensus between physics and AI.

#### Step 9: Certified Engineering Report Generation
- **What the User Does:** Navigates to **Reports** or clicks `[ Generate Report ]` in the bottom action bar.
- **What the System Does:** Opens the Certified Engineering Decision Certificate modal, complete with:
  - Recommended setpoints ($2.8\text{ SPM}$, $74''$) and expected gains ($+2.2\text{ BOPD}$, $-17.2\%\text{ SOR}$).
  - Causal *Why* explanations and *Why Not* counterfactual rejection justifications.
  - Immutable cryptographic SHA-256 seal (`SHA256:7B8F9A2C-1A0E98...`).
- **What the User Learns:** Possesses a regulatory-grade engineering document ready for senior management review.

#### Step 10: Engineer Sign-Off & Execution
- **What the User Does:** Reviews the document, signs off as Senior Production Engineer, and clicks `[ Approve & Dispatch ]`.
- **What the System Does:** Dispatches setpoints to the simulated VFD controller; commits an immutable event to the cryptographic audit trail; updates live well status.
- **What the User Learns:** The operating change is executed with complete transparency, safety assurance, and auditable accountability.
