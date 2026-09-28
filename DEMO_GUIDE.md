# ASSURE-TWIN: Interactive Demo & Evaluation Guide

This guide enables judges, engineers, and evaluators to explore the full decision journey in the live browser application (`http://localhost:5173/`).

---

## 1. Quick Launch & Interface Layout
1. Open `http://localhost:5173/` in Google Chrome or any modern browser.
2. The application opens with a split view:
   - **Left / Background**: The 3D Oil Well Simulator (API 11E Mark II unit, walking beam, horsehead, wellhead, flowline, separator tanks, realistic desert terrain).
   - **Right**: The **ASSURE-TWIN Decision Center** glassmorphic drawer.
   - **Top Right Bar**: Status pill (`ASSURE-TWIN | VERIFIED | 0d PUMPABLE`).

---

## 2. Testing the Decision Journey (Tabs 01 to 06)

### Step 1: Subsurface Visibility (Tab 01 - Virtual Downhole)
- Click **"01. Virtual Downhole"**.
- Review the 10 virtual sensor cards:
  - Perforation Temperature ($T_{dh}$), Flowing Pressure ($P_{wf}$), Pump Intake Pressure ($PIP$).
  - Dynamic Liquid Level, Crude Viscosity ($\mu_{dh}$), Subsurface Inflow.
  - Pump Fillage, Rod Drag Force, Buoyant Rod Float Margin, Productivity Index.
- Notice each card displays: Value, Units, Nominal Range, Confidence Score (e.g. 96%), and Provenance Tag (`MODEL-DERIVED` / `CALIBRATED`).

### Step 2: Dynamic Moving Envelope (Tab 02 - Operating Envelope)
- Click **"02. Operating Envelope"**.
- View the 2D interactive canvas:
  - **Green Region**: Safe/preferred operating window.
  - **Upper Red Curve**: Critical Rod Float boundary.
  - **Pulsing Dot**: The current operating point ($SPM = 3.2$, $T_{dh} = 72.6^\circ\text{ C}$).
  - Notice the **Pumpability Window**: $0\text{ Days}$ remaining due to impending rod drag exceedance.
  - Notice the **Next CSS Window**: Recommended mobilization Day 43-53.

### Step 3: Counterfactual Digital Rehearsal (Tab 03 - Digital Rehearsal)
- Click **"03. Digital Rehearsal"**.
- Compare the 4 simulated candidates:
  - **Current**: 0 gain, High Risk of Rod Float.
  - **CSS Only**: +14 BOPD, Medium Risk of Fluid Pound.
  - **SRP Only**: 0 gain, Low Risk, but heavy production sacrifice.
  - **Joint (Recommended)**: **+19 BOPD**, High Robustness, float margin preserved.
- Inspect the **Multi-Horizon Trajectory Table** (+1d, +3d, +7d, +14d).

### Step 4: Decision Assurance & Approval (Tab 04 - Assurance Gate)
- Click **"04. Assurance Gate"**.
- Check the **12-Checkpoint Multi-Tier Assurance Gate**:
  - Telemetry Quality, State Boundary, Calibration Check, Physics Validation, ML Consensus, OOD Detection, Pump Fillage, Rod Load Limit, Rod Float Margin, Energy Ceiling, Robustness Rating, Pumpability Horizon.
- Read the **Causal Physical Reasoning (WHY?)**: 5-step mechanistic explanation.
- Read the **Counterfactual Rejections (WHY NOT?)**: Transparent justifications for why alternative options were ruled out.
- Click **"✓ APPROVE & ISSUE SETPOINT"**:
  - Notice the status badge switches to `SETPOINT TRANSMITTED & ACTIVE`.
  - Notice the approval timestamp and engineer credentials recorded.

### Step 5: Provenance & Audit Trail (Tab 05 - Audit Trail)
- Click **"05. Audit Trail"**.
- Inspect the 11 cryptographic trace events with step types (`[OBSERVATION]`, `[STATE_ESTIMATE]`, `[ROBUSTNESS]`, `[CONSTRAINTS]`, etc.).

### Step 6: Outcome Reconciliation & Recalibration (Tab 06 - Calibration Center)
- Click **"06. Calibration Center"**.
- Click **"⚡ SIMULATE OUTCOME (RECONCILE)"**:
  - View simulated vs. observed field drift.
  - View recommended parameter calibrations ($\lambda$, $b$, $S$, $C_{drag}$) with divergence percentages and `✓ Calibrate` action buttons.

---

## 3. Testing Safety Edge Cases (Abstain Protocol)
Use the top scenario chips to verify system safety behavior:

1. **Click "Demo: Sensor Failure"**:
   - Navigate to Tab 04.
   - The green recommendation banner disappears, replaced by the prominent red banner:
     `⛔ NO SAFE RECOMMENDATION (ASSURANCE GATE ACTIVE)`
   - The button `🔍 REQUEST MORE DATA (PHASE 29)` appears.
   - Failed gates are clearly highlighted.
2. **Click "Normal Operation"**:
   - Re-engages normal telemetry and clears gates back to verified status.

---

## 4. Testing 3D Context & Click-To-Explain
1. Click the `×` button at the top right of the Decision Center drawer.
2. The drawer smoothly slides away, presenting the full 3D oil well view.
3. Click on 3D components (e.g. sucker rod string, pumpjack walking beam, wellhead).
4. The **INSPECTOR** popup card appears with detailed physical parameters (e.g. rod string grade, peak load, min load, viscous drag, and float margin).
5. Click **"⚡ DECISION CENTER"** at top right to reopen the drawer anytime.
