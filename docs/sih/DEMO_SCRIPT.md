# DEMO_SCRIPT.md
## 8-Minute SIH Live Demonstration Master Script

**Target Time:** 8 Minutes  
**Demonstration URL:** `http://127.0.0.1:5173/`  
**Backend API:** `http://127.0.0.1:8000/`  

---

### Minute 1: The ₹50 Lakh Problem Statement
- **What to Click:** Keep the browser open on the **Overview** dashboard. Point to the top header: `Asset: Baghewala Field · Well BGW-17A`.
- **What to Say:**  
  *"Respected judges, Baghewala Field in Rajasthan contains India's largest heavy oil reserves. But this crude is as thick as solid asphalt—$10,000\text{ cP}$. To pump it, engineers inject steam at $280^\circ\text{ C}$ to melt the tar, then use a sucker rod pumpjack to lift it. But here is the multi-crore problem: as the reservoir naturally cools down, viscosity rebounds. If the pump operates too fast, the viscous friction causes the steel rods to float on the downstroke, buckle, and snap. Each failure costs ₹50 Lakhs in workover repairs. Today, steam teams and pump teams operate in separate silos. We built ASSURE-TWIN to solve this by coupling reservoir thermodynamics with surface mechanics."*
- **What the Judge Sees:** Industrial dark-mode control room, live simulation clock (Day 230+), 8-card KPI strip with real-time sparklines, and active 3D pumping unit.
- **Why it Matters:** Establishes the real-world operational pain point and the ₹50 Lakh financial consequence immediately.

---

### Minute 2: The 3D Digital Twin & Subterranean Cutaway
- **What to Click:** Inside the 3D viewport, click the camera preset buttons:
  1. `[ DOWNHOLE VIEW ]`
  2. `[ PERFORATIONS VIEW ]`
  3. `[ SURFACE PUMPJACK ]`
- **What to Say:**  
  *"This is not a decorative video; it is a true cyber-physical twin. Watch the 3D pumping unit—an authentic API Spec 11E beam unit with wide-flange I-beam, counterweights, and an API 6A flanged Christmas tree. Every single frame, our TypeScript engine solves the exact closed-form 4-bar linkage kinematics. Now look downhole: here is the horizontal wellbore cutaway in the Jodhpur Sandstone. Notice the transparent pump barrel, dynamic standing and traveling valves, and the expanding thermal plume. The 3D model is mathematically synchronized with the backend physics."*
- **What the Judge Sees:** Smooth camera transitions revealing surface kinematics, deviated wellbore casing, downhole pump valve motion, and reservoir thermal front.
- **Why it Matters:** Proves technical depth in WebGL/Three.js 3D rendering and eliminates the suspicion that the 3D model is just a static animation.

---

### Minute 3: In-Situ Virtual Sensors & Provenance
- **What to Click:** In the LeftNav, click **Well State** (or look at the **Thermo-Mechanical Summary** card on Overview).
- **What to Say:**  
  *"At $280^\circ\text{ C}$, downhole electronic gauges melt and fail. Notice our virtual soft sensors: we estimate near-wellbore temperature ($72.8^\circ\text{ C}$), downhole viscosity ($1,392\text{ cP}$), and Pump Intake Pressure ($18.2\text{ bar}$). And notice our truth-in-engineering badges: every single parameter is transparently labeled as MEASURED, CALIBRATED, or MODEL-DERIVED. We never fabricate fake field telemetry."*
- **What the Judge Sees:** Virtual sensor gauges with animated sparklines and explicit Data Provenance badges.
- **Why it Matters:** Demonstrates domain realism—judges who understand petroleum engineering know that downhole gauges rarely survive thermal steam wells.

---

### Minute 4: Dynamic Operating Envelope & Pumpability Window
- **What to Click:** Look at the right panel on the Overview screen: **Pumpability Window Gauge** and **Dynamic Operating Envelope**.
- **What to Say:**  
  *"Static rulebooks say: 'Run the pump at 4 SPM.' But in heavy oil, safe speed is a moving target. Look at our Dynamic Operating Envelope: as temperature drops over time, the safe operating region contracts downwards. Right now, our Pumpability Window Gauge shows exactly how many days remain before falling temperature collapses the 10% rod float floor. This gives operators advance notice weeks before an emergency shutdown occurs."*
- **What the Judge Sees:** 2D interactive envelope chart with green (Preferred), amber (Safe), and red (Unsafe) zones with current setpoint plotted; radial countdown gauge.
- **Why it Matters:** Proves the dynamic nature of thermo-mechanical limits and transitions from reactive alarms to proactive predictive guidance.

---

### Minute 5: 30-Day Decision Rehearsal Sandbox
- **What to Click:** In the LeftNav, click **Scenarios** (or look at the **Scenario Comparison** table on Overview).
- **What to Say:**  
  *"Before an engineer changes a speed dial in the field, our core philosophy is: 'Simulate the consequence before changing the well.' We deep-clone the canonical twin state into an isolated memory sandbox and rehearse 4 counterfactual futures across 30 days. Notice the table: Status Quo results in rod parting by Day 18. CSS Only wastes fuel and causes severe fluid pound. SRP Only avoids rod failure but cuts production by 60%. Only the Joint Optimization strategy balances steam mobilization with speed derating."*
- **What the Judge Sees:** 4-way comparative table showing Current vs. CSS Only vs. SRP Only vs. Rehearsed Joint with delta metrics ($+2.2\text{ BOPD}$, $-17.2\%\text{ SOR}$).
- **Why it Matters:** The core product concept in action—demonstrating how decision rehearsal prevents field trial and error.

---

### Minute 6: Joint Optimization & 12-Gate Decision Assurance
- **What to Click:** In the LeftNav, click **Assurance Gate**.
- **What to Say:**  
  *"Notice our Zero-Trust 12-Point Safety Gatekeeper. Most hackathon AI projects blindly output a number. We submit candidate setpoints to 12 rigorous mechanical and thermodynamic checks: rod float margin, peak rod stress, gearbox torque, data freshness, and Out-of-Domain checks. Notice gate #9: Physics vs. ML Consensus. Our analytical physics engine and gradient-boosted ML surrogate must agree within $\le 10\%$. If they diverge, the system refuses to trust the result."*
- **What the Judge Sees:** 12-row interactive checklist with live green `PASS` badges, consensus delta meter, and OOD confidence gauge.
- **Why it Matters:** Highlights the dual-model consensus moat and zero-trust engineering governance.

---

### Minute 7: The "Winning Moment" — Live Abstain Injection
- **What to Click:** In the top header or quick action bar, click:  
  `[ 🧪 DEMO: Abnormal Viscosity ]`
- **What to Say:**  
  *"Now, watch what happens when an abnormal thermodynamic anomaly occurs. I am injecting a simulated severe viscosity spike. Watch the screen! Viscosity spikes to 4,200 cP. The Pumpability Window collapses to 0 days. The Safety Gatekeeper turns RED. And look at the recommendation banner: it strictly outputs **`NO SAFE RECOMMENDATION`**! It tells the engineer: 'Downstroke rod float margin has collapsed to 3.2%. Do not operate pump. Schedule thermal steam cycle.' This is our greatest innovation: knowing when NOT to pump to save a ₹50 Lakh well asset."*
- **What the Judge Sees:** Red flashing hazard alert, pumpability gauge falling to zero, Gatekeeper failing with `FAIL` badge, and recommendation displaying `NO SAFE RECOMMENDATION` with causal explainability.
- **Why it Matters:** **This is the highest-scoring moment of the presentation.** It proves the system is not hardcoded to always say "yes" and physically protects the well.

---

### Minute 8: Certified Engineering Report & Clean Reset
- **What to Click:** Click `[ 🔄 Reset Demo State ]`, then click `[ GENERATE REPORT ]` in the bottom quick actions bar.
- **What to Say:**  
  *"We reset the demo state back to baseline. Now I click Generate Report. The system instantly compiles a formal Engineering Decision Certificate. It includes recommended setpoints, projected outcomes, causal *Why* reasons, rejected *Why Not* alternatives, and an immutable SHA-256 cryptographic seal for regulatory audit compliance. ASSURE-TWIN empowers engineers with physics accuracy, AI speed, and zero-trust safety. Thank you, and we welcome your questions!"*
- **What the Judge Sees:** System returns to normal; Certified Report modal pops up with SHA-256 hash, engineering sign-off signature block, and Print/Download JSON buttons.
- **Why it Matters:** Leaves the judges with an impression of enterprise readiness, professional UX, and complete technical closure.
