# DEMO_READINESS.md — Live Demonstration Script, 3D Simulator Audit & System Verification

This document provides a comprehensive operational readiness audit of the live software and defines the exact, step-by-step demonstration walkthrough for the SIH 2026 evaluation jury.

---

## 1. 3D Simulator Feature Verification Matrix

| 3D Simulation Element | Visual Assets | Implementation Level | Status Classification | Operational Verification |
|---|---|---|---|---|
| **Pumpjack Structure** | Samson post, walking beam, horsehead, counterweights, pitman arm, base frame | Procedural Three.js mesh geometry | **FULLY FUNCTIONAL** | Exact 4-bar linkage kinematics (`PumpjackKinematics.ts`); speed dynamically matches SPM slider; zero clipping. |
| **Surface Speed (SPM)** | Variable motor rotational frequency | Dynamic time delta in render loop | **INTERACTIVE & BACKEND-DRIVEN** | Adjusting SPM slider in Control Panel or applying optimization immediately changes physical stroke oscillation speed. |
| **Stroke Length** | Crank pin radius adjustments (64" to 84") | Kinematic throw parameter scaling | **INTERACTIVE & SIMULATION-DRIVEN** | Changing stroke modifies polished rod displacement limits and horsehead oscillation angle. |
| **VFD Motor Frequency** | Motor cabinet, variable angular velocity | Frequency controller with downstroke shaping | **SIMULATION-DRIVEN** | Downstroke frequency deceleration reduces rod compression; smooth sinusoidal motion. |
| **Subsurface Wellbore** | Surface casing, production tubing, fluid annulus | Transparent subsurface mesh toggling | **FULLY FUNCTIONAL** | "Subsurface" camera view reveals wellbore down to $950\text{ m}$ reservoir perforations. |
| **Sucker Rod String** | Continuous steel rod string inside tubing | Discretized rod segments | **ANIMATED & SIMULATION-DRIVEN** | Reciprocates in lockstep with polished rod; visual stress colorization under high loads. |
| **Downhole Pump** | Pump barrel, plunger, travelling valve, standing valve | Subsurface mechanical valve assembly | **ANIMATED & INTERACTIVE** | Valves open and close alternately on upstroke (standing open, travelling closed) and downstroke. |
| **Dynamometer Card** | 2D dynamic stroke vs. load closed loop | Real-time HTML5 Canvas overlay | **SIMULATION-DRIVEN & LIVE** | Surface vs. downhole cards dynamically deform under fluid pound, normal operation, or rod float. |
| **Reservoir Thermal Plume** | Radial particle system expanding around perfs | 3D particle emitter with heat gradient | **ANIMATED & SIMULATION-DRIVEN** | Color shifts from incandescent red/orange ($220^\circ\text{C}$ steam) to cooling yellow/amber ($72^\circ\text{C}$). |
| **Crude Oil Production Flow** | Fluid flow particles ascending tubing string | Particle velocity tied to liquid lift | **ANIMATED & SIMULATION-DRIVEN** | Ascending particle flow speed scales with calculated volumetric production rate ($BOPD$). |
| **Steam Injection Effects** | High-pressure vapor clouds at wellhead & sandface | Particle smoke/steam shaders | **SIMULATION-DRIVEN** | Active during steam injection phase of the CSS cycle. |

---

## 2. 12-Page Workstation UI Audit

| Page Name | File Path | REST Backend Endpoint | Local Offline Fallback? | Provenance Indicator | Readiness Status |
|---|---|---|---|---|---|
| **1. Overview** | `src/ui/pages/OverviewView.ts` | `/api/v1/simulation/state` | YES (`SimulationClient`) | `● BACKEND` / `○ LOCAL` | **DEMO READY** |
| **2. Well State** | `src/ui/pages/WellStateView.ts` | `/api/v1/analytics/virtual-downhole` | YES | `● BACKEND` / `○ LOCAL` | **DEMO READY** |
| **3. Forecast** | `src/ui/pages/ForecastView.ts` | `/api/v1/forecast?horizon_days=30` | YES | `● BACKEND` / `○ LOCAL` | **DEMO READY** |
| **4. Optimization** | `src/ui/pages/OptimizationView.ts` | `/api/v1/optimization/solve` | YES | `● BACKEND` / `○ LOCAL` | **DEMO READY** |
| **5. Scenarios** | `src/ui/pages/ScenariosView.ts` | `/api/v1/scenarios/compare` | YES | `● BACKEND` / `○ LOCAL` | **DEMO READY** |
| **6. Recommendations** | `src/ui/pages/RecommendationView.ts` | `/api/v1/recommendations` | YES | `● BACKEND` / `○ LOCAL` | **DEMO READY** |
| **7. Assurance Gate** | `src/ui/pages/AssuranceView.ts` | `/api/v1/assurance/evaluate` | YES | `● BACKEND` / `○ LOCAL` | **DEMO READY** |
| **8. Calibration** | `src/ui/pages/CalibrationView.ts` | `/api/v1/calibration/fit-viscosity` | YES | `● BACKEND` / `○ LOCAL` | **DEMO READY** |
| **9. Alerts** | `src/ui/pages/AlertsView.ts` | `/api/v1/alerts` | YES | `● BACKEND` / `○ LOCAL` | **DEMO READY** |
| **10. History** | `src/ui/pages/HistoryView.ts` | `/api/v1/simulation/state` | YES | `● BACKEND` / `○ LOCAL` | **DEMO READY** |
| **11. Simulator** | `src/ui/pages/SimulatorView.ts` | `/api/v1/simulation/demo` | YES | `● BACKEND` / `○ LOCAL` | **DEMO READY** |
| **12. Settings** | `src/ui/pages/SettingsView.ts` | Local Storage & Config | YES | N/A | **DEMO READY** |

---

## 3. The Grand Demo Story Script (8-Minute Winning Walkthrough)

To maximize evaluator comprehension, follow this exact linear sequence during the live presentation:

### Phase 1: The Problem & The 3D Digital Twin (Minutes 0:00 – 1:30)
- **Action:** Open `http://localhost:5173/` in full-screen browser.
- **Narrative:**
  > *"Judges, heavy oil extraction at Oil India's Baghewala field is a delicate battle between thermodynamics and mechanics. At native reservoir temperatures (42°C), the crude is extra-heavy bitumen with over 10,000 cP viscosity. Oil India injects high-pressure steam in Cyclic Steam Stimulation (CSS) to heat the sand and lower viscosity. But as the reservoir cools, viscosity climbs back. If the sucker rod pump runs too fast in cold, thick oil, the buoyant rods float on the downstroke, impacting the pump and snapping the rod string."*
- **Visual Interaction:**
  - Rotate the 3D scene around the pumpjack. Click the **"Subsurface"** camera view.
  - Show the transparent wellbore, the reciprocating plunger, the rising oil particles, and the thermal plume at the bottom perforations.
  - Point out the synchronized **Dynamometer Card** overlay moving in real time with the horsehead stroke.

### Phase 2: Virtual Downhole State & Operating Envelope (Minutes 1:30 – 3:00)
- **Action:** Click **"WELL STATE"** on the navigation bar.
- **Narrative:**
  > *"Physical downhole pressure and temperature sensors fail rapidly under high-temperature steam injection. ASSURE-TWIN solves this with 10 Virtual Downhole Sensors, inferring bottomhole flowing pressure, pump fillage, and fluid temperature from surface electrical power and load cells."*
- **Visual Interaction:**
  - Point to the **Dynamic Thermo-Mechanical Operating Envelope**: show how the safe SPM window shrinks as the well cools.
  - Point to the **Pumpability Window**: *"Notice the countdown: 18.4 Days Remaining before critical viscosity rebound requires cycle turnaround."*

### Phase 3: Forecast & Decision Rehearsal Sandbox (Minutes 3:00 – 4:30)
- **Action:** Click **"SCENARIOS"** or **"FORECAST"**.
- **Narrative:**
  > *"Conventional SCADA is purely reactive. Before touching a single wellhead valve, our platform allows the production engineer to rehearse decisions in an isolated twin clone."*
- **Visual Interaction:**
  - Click **"Rehearse Strategy"**: show the forward-simulation stepping 30 days into the future.
  - Show the **Scenario Comparison Matrix**: compare Baseline vs. Joint Optimized, proving the +5.8 BOPD uplift and SOR reduction from 3.2 down to 2.62.

### Phase 4: Coupled Multi-Objective Joint Optimization (Minutes 4:30 – 5:45)
- **Action:** Click **"OPTIMIZATION"**.
- **Narrative:**
  > *"Here is the core engine: simultaneous optimization of surface rod kinematics and subsurface cyclic steam mobilization. We can balance economic weights—crude revenue, steam enthalpy penalty, electrical power, and mechanical risk."*
- **Visual Interaction:**
  - Adjust the **Crude Production Revenue** slider to 1.50 and **Steam Enthalpy Penalty** to 1.20.
  - Click **"⚡ EXECUTE COUPLED JOINT SOLVER"**.
  - Show the Pareto candidate table populate with 4 analytically verified candidates.
  - Click **"✓ APPLY SETPOINT TO 3D DIGITAL TWIN"** on Candidate 1 (SPM 2.8, Stroke 74").
  - Switch back to the 3D view: show the pumpjack physically decelerate to 2.8 SPM!

### Phase 5: The Abstain Protocol & 12-Point Assurance Gate (Minutes 5:45 – 7:00)
- **Action:** Click **"ASSURANCE GATE"** and **"RECOMMENDATIONS"**.
- **Narrative:**
  > *"The single greatest barrier to AI adoption in public sector oilfields is operator distrust. ASSURE-TWIN is engineered for total trust. Every recommendation includes plain-language causal reasons why, and counterfactual rejections why not."*
  > *"Most importantly: notice our 12-point deterministic engineering gatekeeper. If an operator requests an aggressive 4.5 SPM that would cause rod floating or gearbox overload, the system DOES NOT GUESS. It outputs 'NO SAFE RECOMMENDATION' and strictly abstains from advising dangerous actions."*
- **Visual Interaction:**
  - Show the 12 green checkmarks on the active safe case. Show the digital approval button requiring engineer signoff.

### Phase 6: Model Calibration & Outcome Reconciliation (Minutes 7:00 – 8:00)
- **Action:** Click **"CALIBRATION"**.
- **Narrative:**
  > *"When new laboratory rheometer samples or well test logs arrive, the engineer enters them here to recalibrate the viscosity curve and reconcile historical prediction bias, closing the cyber-physical loop."*
- **Conclusion:**
  > *"ASSURE-TWIN is not a theoretical slide deck—it is a live, running cyber-physical digital twin ready to maximize domestic heavy oil recovery for Oil India Limited."*
