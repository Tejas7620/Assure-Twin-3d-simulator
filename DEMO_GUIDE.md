# ASSURE-TWIN: Judge & Evaluator Demonstration Script
**Smart India Hackathon 2026 — Problem Statement: SIH26120**  
**Digital Twin for Well-to-Surface Optimization of CSS and SRP Operations for Heavy Oil Wells of Baghewala Field**

---

## 1. Quick Launch
1. Ensure both the FastAPI backend and Vite frontend are running:
   - Backend: `python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000`
   - Frontend: `npm run dev`
2. Open `http://localhost:5173/` in Google Chrome or any modern browser (recommended display: 1080p or 1440p).

---

## 2. Step-by-Step Judge Demonstration Flow

### Scene 1: Command Center Overview & 3D Physical Twin
1. **Top Header Inspection:**
   - Note the well selector: **BGW-17A**, field: **Baghewala Heavy Oil Field**, mode: **Joint (CSS + SRP)**.
   - Simulation time indicator: **Day 18.35**, and data quality indicator: **98% Good**.
2. **8-Card KPI Row:**
   - Observe live physics indicators with trend sparklines:
     - Oil Production: **18.6 BOPD**
     - Water Cut: **12.8%**
     - Liquid Rate: **23.1 BPD**
     - SOR: **6.4**
     - Steam Rate: **19.3 TPD**
     - Bottomhole Pressure: **18.2 bar**
     - Average Downhole Temp: **72.7 °C**
     - Viscosity: **1,392 cP**
3. **Interactive 3D Digital Twin:**
   - In the center viewport, observe the real-time API 11E Mark II pumpjack reciprocating with authentic kinematics.
   - Look at the underground geological strata cutaway, casing, slotted liner, and thermal reservoir plume.
   - Use the floating **Camera Presets** modal:
     - Click **`[ Downhole View ]`** to orbit directly to the subsurface pump barrel and intake perforations.
     - Click **`[ Dyno Card View ]`** to inspect the real-time dynamometer card.
     - Click **`[ Surface Pumpjack ]`** to return to the surface facilities.

---

### Scene 2: Subsurface Intelligence & Dynamic Operating Envelope
1. **Pumpability Window:**
   - Note the **18.4 DAYS** time-to-unfavorable boundary countdown gauge.
   - Read the dominant driver: *"Cooling → viscosity rebound → reduced pumpability"*.
2. **Dynamic Operating Envelope:**
   - View the SPM vs Time canvas. Unlike static SCADA cards, this envelope dynamically contracts as reservoir heat dissipates.
   - Inspect the 4 colored operational bands:
     - **Unsafe Zone** (Red): Severe downstroke rod float and fluid pound risk.
     - **Caution Zone** (Amber): Sub-optimal fillage / rod stress.
     - **Safe Zone** (Green): Thermally and mechanically sustainable.
     - **Preferred Zone** (Cyan): Maximized net oil recovery.
   - Note the white marker representing **Current SPM (7.5)** and the projected trajectory line.
3. **Model Domain (OOD) Check:**
   - View the AI governance card: **Within validated domain**, OOD Score: **0.23**, Physics/ML Agreement: **Good (Δ 6.2%)**.
4. **12-Point Zero-Trust Assurance Gate:**
   - Inspect all 12 real engineering checks: Thermal Envelope, Float Margin, Pump Fillage, Rod Load, Impact/Stress, Steam Constraints, Data Freshness, Model Domain, Physics/ML Agreement, Uncertainty, Historical Consistency, and Integrity/Sanity.

---

### Scene 3: Forward Decision Rehearsal & Optimization
1. **Middle Row Analytics:**
   - **Future Trajectory (30 Days):** Multi-horizon forecast tracking Oil Rate, SOR, Pump Fillage, and Viscosity rebound.
   - **Scenario Comparison:** Side-by-side comparative metrics for Current, Proposed, and Rehearsed setpoints.
   - **Recommendation Card:** Displays verified setpoints (SPM 6.7, Stroke 52 in, Steam Rate 19.8 TPD) with explainable WHY and counterfactual WHY-NOT justifications.
2. **Left Navigation Deep-Dives:**
   - Click **`Pumpability`** to view the full degradation trajectory and sensitivity curves.
   - Click **`Optimization`** to view Pareto trade-offs and candidate grids.
   - Click **`Reports`** to view the certified engineering report with SHA-256 seal.
   - Return to **`Overview`**.

---

### Scene 4: The Ultimate Judge Test — Safety Abstain Protocol
1. Scroll to the footer **Quick Actions** panel.
2. Click the amber trigger button: **`[ 🧪 DEMO: Abnormal Viscosity ]`**.
3. **Observe the Immediate Multi-Tier System Response:**
   - An abnormal cold-slug viscosity surge (+14,500 cP) is injected into the well fluid.
   - The Dynamic Operating Envelope collapses downward as viscous drag rises.
   - The Pumpability countdown drops to **0.0 DAYS (CRITICAL)**.
   - The 12-Point Assurance Gate trips on **Float Margin** (rod cannot fall through cold oil without buckling).
   - The recommendation card instantly transitions to a prominent red alert state: **NO SAFE RECOMMENDATION (ABSTAIN)**.
   - Transparently explains to the operator: *"All evaluated operating points violate the 15% rod float safety margin. Intervention required: Schedule steam cycle or hot oil treatment."*
4. Click **`[ 🔄 Reset Demo ]`** to instantly restore baseline telemetry and clear the fault.

---

### Scene 5: Cryptographic Certified Engineering Report
1. Click **`Reports`** in the left sidebar (or click **`[ Generate Report ]`** in Quick Actions).
2. Inspect the **Official Engineering Sign-Off Report**:
   - Field asset metadata, current operating state, proposed setpoints, and forecast outcomes.
   - Formal zero-trust assurance audit checklist with PASS/WARN/FAIL statuses.
   - Unique Cryptographic SHA-256 Audit Seal (e.g. `SHA256:d8a2...`).
   - Honest provenance disclaimers explicitly identifying model-derived projections.
3. Click **`[ Export PDF / Print ]`** to demonstrate field compliance export.
