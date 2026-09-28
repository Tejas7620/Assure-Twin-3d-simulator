# FINAL_SIH_PPT_CONTENT.md
## ASSURE-TWIN — Final 6-Slide SIH 2026 PPT Content (Copy-Paste Ready)

**Team:** VisionX$ (Team ID: 140280)  
**Problem Statement:** SIH26120  
**Organization:** Oil India Limited (OIL)  
**Theme:** Smart Automation | **Category:** Software  
**Source of Truth:** Running prototype verified at `http://127.0.0.1:5173/` + `http://127.0.0.1:8000/`  
**Test Verification:** 94 automated tests passing (64 backend + 30 frontend)  
**GitHub:** https://github.com/Tejas7620/Assure-Twin-3d-simulator

---

# ═══════════════════════════════════════════
# SLIDE 1: TITLE + PROBLEM
# ═══════════════════════════════════════════

### TITLE
**ASSURE-TWIN**  
Decision-Assured Well-to-Surface Digital Twin for CSS + SRP Optimization

### SUBTITLE
Smart India Hackathon 2026 · Problem Statement SIH26120  
Digital Twin for Well-to-Surface Optimization of Cyclic Steam Stimulation (CSS) and Sucker Rod Pump (SRP) Operations for Heavy Oil Wells of Baghewala Field

### TAGLINE
*"Simulate the consequence before changing the well."*

### THE PROBLEM (3 bullets)
- **Baghewala crude is 10,000 cP thick at reservoir temperature** — it behaves like solid tar and cannot flow without steam heating (14°–19° API gravity).
- **Steam teams and pump teams work in silos.** CSS thermal scheduling and SRP pump speed are decided separately, with no coupled intelligence linking subsurface heat to surface mechanics.
- **Result: ₹35–50 Lakhs per rod failure.** As the reservoir cools, rising viscosity creates massive downstroke drag. If the pump runs too fast, the 1,000 m steel rod string floats, buckles, and snaps. If steam is injected too early, crores in fuel and water are wasted.

### VISUAL
Split image: Left = heavy crude viscosity problem diagram (hot → cold → rod float chain). Right = ASSURE-TWIN 3D Digital Twin screenshot.

### 1-LINE JUDGE EXPLANATION
*"Baghewala crude is almost solid. Engineers heat it with steam and pump it with steel rods. But as the well cools, the rod snaps if the pump runs too fast. Nobody is calculating how cooling temperature changes the safe pump speed day-by-day."*

### SPEAKER NOTES
"Respected judges, Baghewala Field in Rajasthan holds India's main heavy oil reserves. The crude is as thick as asphalt — over 10,000 centipoise. To extract it, engineers inject high-temperature steam at 280°C to melt the tar, then use a pumpjack to lift it. But as the reservoir cools over 40–50 days, viscosity rebounds. If the pump keeps running at the same speed, the rods float in the sticky fluid, buckle, and snap — costing ₹35 to 50 Lakhs per incident. Today, the steam team and the pump team operate completely independently. ASSURE-TWIN solves this by coupling the thermal state with the mechanical limits into one decision engine."

---

# ═══════════════════════════════════════════
# SLIDE 2: PROPOSED SOLUTION + USER FLOW
# ═══════════════════════════════════════════

### TITLE
**Our Solution: Decision-Assured Coupled Digital Twin**

### PROBLEM IN 1 LINE
CSS thermal cycles and SRP pumping speeds must be evaluated together because the safe pump speed depends on the temperature-dependent viscosity of the crude.

### SOLUTION (4 bullets)
1. **Coupled Well-to-Surface Digital Twin:** Links reservoir thermodynamics (Marx-Langenheim), heavy-oil rheology (Andrade), and sucker-rod mechanics (API RP 11L) into one physics engine that models the full chain: Reservoir → Temperature → Viscosity → Inflow → Rod Drag → Pump Fillage → Production.
2. **Predictive Pumpability Window + Dynamic Operating Envelope:** Computes a moving safe-speed boundary that contracts as the well cools, and counts down the exact days remaining before the rod float safety floor is breached.
3. **30-Day Decision Rehearsal Sandbox:** Deep-clones the live twin state and forward-simulates 4 counterfactual futures (Status Quo / CSS Only / SRP Only / Joint Optimization) without touching the real well.
4. **Joint CSS + SRP Optimization + 12-Point Assurance Gate:** Simultaneously optimizes steam timing and pump speed, then validates every recommendation through 12 thermo-mechanical safety checkpoints. If any limit is breached: **NO SAFE RECOMMENDATION**.

### "WHAT MAKES US DIFFERENT" BOX
```
┌────────────────────────────────────────────────────────────────────┐
│ EXISTING APPROACH              │ ASSURE-TWIN APPROACH              │
│ ─────────────────────────────  │ ───────────────────────────────── │
│ CSS and SRP tuned separately   │ Coupled physics: Reservoir →      │
│ Static alarm limits            │  Thermal → Viscosity → Rod Drag   │
│ Reactive: alarm after failure  │ Predictive Pumpability Countdown  │
│ No forward rehearsal           │ 30-Day Sandbox Decision Rehearsal │
│ AI always outputs a number     │ 12-Gate Assurance: RECOMMEND      │
│                                │  or NO SAFE RECOMMENDATION        │
└────────────────────────────────────────────────────────────────────┘
```

### USER FLOW DIAGRAM (Place on this slide)
```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ SELECT   │    │ VIEW 3D  │    │ CHECK    │    │ FORECAST │
│ WELL     │───►│ DIGITAL  │───►│ WELL     │───►│ COOLING  │
│ BGW-17A  │    │ TWIN     │    │ STATE    │    │ CURVES   │
└──────────┘    └──────────┘    └──────────┘    └────┬─────┘
                                                     │
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌────▼─────┐
│ ENGINEER │    │ ASSURANCE│    │ OPTIMIZE │    │ PUMPAB-  │
│ APPROVE  │◄───│ 12-GATE  │◄───│ CSS+SRP  │◄───│ ILITY &  │
│ OR REJECT│    │ CHECK    │    │ JOINTLY  │    │ ENVELOPE │
└────┬─────┘    └──────────┘    └──────────┘    └──────────┘
     │
     ▼
┌──────────┐    ┌──────────┐
│ CERTIFIED│    │ CALIBRATE│
│ REPORT   │───►│ & AUDIT  │
│ SHA-256  │    │ TRAIL    │
└──────────┘    └──────────┘
```

### VISUAL
User Flow Diagram (above) + Screenshot of Overview dashboard with Pumpability Window and Operating Envelope visible.

### 1-LINE JUDGE EXPLANATION
*"Instead of guessing, we simulate the 30-day consequence of every candidate operating change in software before risking steel downhole — and if it's unsafe, we explicitly refuse to recommend."*

### SPEAKER NOTES
"Our solution couples the thermal and mechanical sides into one decision engine. When an engineer opens ASSURE-TWIN, they see a live 3D twin of the well, check the current subsurface state through virtual sensors, and monitor the Pumpability Window — a countdown gauge showing how many days remain before rising viscosity breaches the safe rod-float limit. Before changing any pump speed, our system clones the well state into a software sandbox and rehearses 4 alternative futures across 30 days. It then jointly optimizes steam timing and pump speed, validates the result through 12 safety checkpoints, and either certifies a recommendation or explicitly abstains with NO SAFE RECOMMENDATION. The key innovation: knowing when NOT to pump is more valuable than any prediction."

---

# ═══════════════════════════════════════════
# SLIDE 3: TECHNICAL APPROACH + ARCHITECTURE
# ═══════════════════════════════════════════

### TITLE
**Technical Architecture & Approach**

### ACTUAL TECH STACK (Verified in Code)
```
Frontend:   TypeScript + Three.js (WebGL) + Vanilla CSS
Backend:    Python 3.13 + FastAPI + Uvicorn
Physics:    NumPy + SciPy (Differential Evolution)
ML:         scikit-learn (Random Forest Surrogate)
Database:   SQLAlchemy ORM + SQLite (25 tables)
Testing:    Pytest (64 tests) + TSX Runner (30 tests) = 94 total
```

### COMPLETE SYSTEM ARCHITECTURE DIAGRAM (Place on this slide)
```
┌─────────────────────────────────────────────────────────────────────────┐
│                     ASSURE-TWIN SYSTEM ARCHITECTURE                     │
│                                                                         │
│  ┌─────────────┐                                    ┌─────────────┐    │
│  │ TELEMETRY   │    ┌─────────────┐   ┌──────────┐  │ 3D DIGITAL  │    │
│  │ & DATA      │───►│ WELL STATE  │──►│ COUPLED  │  │ TWIN        │    │
│  │ QUALITY     │    │ ESTIMATION  │   │ PHYSICS  │  │ Three.js    │    │
│  │ AUDIT       │    │ Virtual     │   │ ENGINE   │  │ API 11E     │    │
│  │             │    │ Sensors     │   │          │  │ Kinematics  │    │
│  └─────────────┘    └─────────────┘   └────┬─────┘  └─────────────┘    │
│                                            │                            │
│  ┌─────────────┐    ┌─────────────┐   ┌────▼─────┐  ┌─────────────┐    │
│  │ ENGINEER    │    │ ASSURANCE   │   │ FORECAST │  │ PUMPABILITY │    │
│  │ APPROVAL    │◄───│ 12-GATE     │◄──│ & ML     │──│ & DYNAMIC   │    │
│  │ & REPORT    │    │ GATEKEEPER  │   │ SURROGATE│  │ ENVELOPE    │    │
│  │ SHA-256     │    │ or ABSTAIN  │   └──────────┘  └─────────────┘    │
│  └──────┬──────┘    └─────────────┘                                    │
│         │           ┌─────────────┐   ┌──────────┐                     │
│         └──────────►│ AUDIT TRAIL │   │ DECISION │                     │
│                     │ & CALIBRATE │◄──│ REHEARSAL│                     │
│                     └─────────────┘   │ & JOINT  │                     │
│                                       │ CSS+SRP  │                     │
│                                       │ OPTIMIZER│                     │
│                                       └──────────┘                     │
└─────────────────────────────────────────────────────────────────────────┘
```

### WELL-TO-SURFACE COUPLING CHAIN (Show as horizontal flow)
```
RESERVOIR ──► TEMPERATURE ──► VISCOSITY ──► INFLOW ──► ROD DRAG ──► PUMP ──► PRODUCTION
(Marx-        (Thermal        (Andrade      (Vogel/     (Couette     (Fillage  (Economics
Langenheim)    Decay)          Rheology)     Darcy IPR)  Shear)       & SOR)    & NPV)
```

### KEY PHYSICS FORMULAS (Pick 2 most impactful)
- **Andrade Viscosity:** mu(T) = mu_ref * exp(b * (1/T - 1/T_ref)) — captures exponential viscosity change with temperature.
- **Rod Float Margin:** M_float = (W_buoyant - F_drag) / W_buoyant — must stay >= 10% to prevent rod buckling.

### VISUAL
System Architecture Diagram (above) + 3D Digital Twin screenshot showing the API Spec 11E beam unit.

### 1-LINE JUDGE EXPLANATION
*"Our architecture couples 7 physics domains end-to-end: reservoir heat loss → crude viscosity → wellbore flow → rod mechanics → pump performance → safe operating speed → economic optimization."*

### SPEAKER NOTES
"Our technical architecture has four layers. At the bottom, the physics engine couples Marx-Langenheim thermal decay with Andrade heavy-oil viscosity and API RP 11L rod mechanics. It feeds into multi-horizon forecasting and a moving Dynamic Operating Envelope. Candidate setpoints pass through a Decision Rehearsal sandbox and a SciPy Differential Evolution optimizer that jointly tunes steam timing and pump speed. Finally, every recommendation must clear our 12-Point Zero-Trust Gatekeeper before reaching the engineer. The 3D Digital Twin is not a decorative animation — it solves exact closed-form 4-bar linkage kinematics on every frame, synchronized with the backend physics. All code is TypeScript, Python, Three.js, and scikit-learn — no React, no PyTorch, no TimescaleDB. 94 automated tests verify our physics chain end-to-end."

---

# ═══════════════════════════════════════════
# SLIDE 4: FEASIBILITY & VIABILITY
# ═══════════════════════════════════════════

### TITLE
**Feasibility, Viability & Deployment Roadmap**

### CHALLENGE-RISK-MITIGATION TABLE

| Challenge | Risk | Mitigation |
| :--- | :--- | :--- |
| **No public well-level field data** | Model accuracy before calibration | Physics-informed synthetic data with calibrated Baghewala PVT profiles; conservative safety margins; all outputs labeled SIMULATED |
| **Downhole sensors fail at 280°C** | No direct bottomhole measurement | Virtual soft sensors estimate T_dh, PIP, viscosity, fluid level from surface telemetry via physics inversion |
| **Model uncertainty & drift** | Predictions diverge from reality over time | Dual Physics-AI consensus check (delta <= 10%); periodic recalibration center; outcome reconciliation |
| **Noisy / frozen sensor data** | Bad data corrupts recommendations | Automated Data Quality Auditor with stale-sensor detection; provenance badges (MEASURED / MODEL-DERIVED / DEMO) |
| **Engineer distrust of AI** | Resistance to adoption | Advisory-first: engineer approves every action (Human-in-the-Loop); explainable Why & Why Not rationale; SHA-256 audit trail |
| **SCADA integration** | Field connectivity complexity | Current prototype uses REST + WebSocket; MQTT/OPC-UA adapter architecture designed for field pilot (FUTURE) |

### DEPLOYMENT ROADMAP

```
┌────────────────────┐    ┌─────────────────────┐    ┌──────────────────────┐
│ PHASE 1: PROTOTYPE │    │ PHASE 2: FIELD PILOT │    │ PHASE 3: ASSET-WIDE  │
│ (Current — Working)│───►│ (Months 1-6)         │───►│ (Months 7-12)        │
│                    │    │                      │    │                      │
│ • Single-well twin │    │ • 5 Baghewala wells  │    │ • Full Bikaner-Nagaur│
│   (BGW-17A)        │    │   in shadow mode     │    │   basin deployment   │
│ • Synthetic data   │    │ • SCADA integration  │    │ • Multi-well steam   │
│ • 94 passing tests │    │ • Field calibration  │    │   allocation         │
│ • Advisory mode    │    │ • Operator training  │    │ • Closed-loop ready  │
└────────────────────┘    └─────────────────────┘    └──────────────────────┘
    ▲ WE ARE HERE
```

### IMPLEMENTED vs. FUTURE (Transparency Box)

| Feature | Status |
| :--- | :---: |
| 3D Digital Twin (API 11E) | WORKING |
| Coupled 15-Domain Physics Engine | WORKING |
| Dynamic Operating Envelope | WORKING |
| Predictive Pumpability Window | WORKING |
| 30-Day Decision Rehearsal | WORKING |
| Joint CSS+SRP Optimization (SciPy DE) | WORKING |
| 12-Point Assurance + Abstain | WORKING |
| Certified SHA-256 Report | WORKING |
| ML Surrogate + OOD Detection | WORKING |
| 94 Automated Tests (Pytest + TSX) | VERIFIED |
| Industrial MQTT/OPC-UA SCADA Link | FUTURE |
| Multi-Well Steam Allocation | FUTURE |
| Downhole Electric Heater Model | FUTURE |
| PostgreSQL / TimescaleDB | FUTURE |

### 1-LINE JUDGE EXPLANATION
*"We're transparent: everything marked WORKING has been verified with 94 automated tests. Everything marked FUTURE is clearly separated as roadmap."*

### SPEAKER NOTES
"Our feasibility rests on three pillars. First, physics: Marx-Langenheim and API RP 11L are established, published petroleum engineering methods — not experimental science. Second, open-source: Python, SciPy, Three.js, and scikit-learn mean zero licensing cost. Third, transparency: every operational output is tagged with honest provenance — MEASURED, MODEL-DERIVED, or SIMULATED. We never claim field-validated results we don't have. Our prototype currently operates as a single-well advisory twin for BGW-17A with synthetic data. Phase 2 targets shadow-mode deployment on 5 Baghewala wells with SCADA integration and field calibration. Phase 3 scales to basin-wide multi-well operation."

---

# ═══════════════════════════════════════════
# SLIDE 5: IMPACT & BENEFITS
# ═══════════════════════════════════════════

### TITLE
**Engineering Value & Projected Impact**

### WHO BENEFITS

| Beneficiary | What They Get | How |
| :--- | :--- | :--- |
| **Production Engineers** | Predict rod float 2-3 weeks ahead instead of reacting after failure | Pumpability Window countdown + Dynamic Operating Envelope |
| **Reservoir Engineers** | Optimal steam cycle timing; less wasted thermal energy | Joint CSS+SRP optimization; SOR minimization |
| **Field Operators** | Fewer emergency rig callouts; safer daily operations | Automated alerts + NO SAFE RECOMMENDATION abstain |
| **Oil India / ONGC** | Lower workover OPEX; higher cumulative oil recovery per well | Certified decision contracts with audit compliance |

### PROJECTED ENGINEERING VALUE (Model-Simulated — Labeled Honestly)

```
┌──────────────────────────────────────────────────────────────────────┐
│ IMPACT METRIC               │ MODEL-SIMULATED PROJECTION            │
│ ──────────────────────────  │ ───────────────────────────────────── │
│ Steam-to-Oil Ratio (SOR)    │ ~14-18% reduction via optimized       │
│                              │ steam cycle timing (SIMULATED)        │
│ Rod / Pump Failures          │ Predictive warning 2-3 weeks before  │
│                              │ float boundary (SIMULATED)            │
│ Energy per Barrel            │ Lower fuel consumption from fewer    │
│                              │ premature re-steams (SIMULATED)       │
│ Emergency Workovers          │ Fewer reactive rig mobilizations     │
│                              │ via proactive speed derating          │
│ Engineering Productivity     │ Decision time: hours → minutes via   │
│                              │ automated rehearsal + assurance       │
└──────────────────────────────────────────────────────────────────────┘
  All values are model-derived from calibrated Baghewala physics
  profiles. Not field-validated production history.
```

### SUSTAINABILITY & SDG ALIGNMENT
- **SDG 7 (Clean Energy):** Lower steam fuel and energy consumption per barrel produced.
- **SDG 9 (Industry Innovation):** Digital twin technology applied to an Indian PSU heavy oil field.
- **SDG 12 (Responsible Production):** Optimized steam/water use; fewer emergency chemical interventions.
- **SDG 13 (Climate Action):** Reduced CO2 emissions from fewer wasted steam cycles and rig mobilizations.

### 1-LINE JUDGE EXPLANATION
*"Every impact number shown is model-simulated, not field-measured. We are honest about this because truth-in-engineering is part of our core architecture."*

### SPEAKER NOTES
"ASSURE-TWIN delivers value across four beneficiary groups. Production engineers gain predictive visibility into rod float risk 2 to 3 weeks ahead, eliminating reactive workover surprises. Reservoir engineers get optimal steam cycle timing that reduces Steam-to-Oil Ratio by an estimated 14 to 18 percent. Field operators see fewer emergency rig callouts because the system proactively derates pump speed before failure occurs. And Oil India gains certified decision contracts with cryptographic audit trails for regulatory compliance. I want to be very clear: every number shown is model-simulated from calibrated Baghewala physics profiles. We do not claim field-validated production data. Truth-in-engineering is embedded in our architecture through universal Data Provenance badges."

---

# ═══════════════════════════════════════════
# SLIDE 6: RESEARCH + WORKING PROTOTYPE
# ═══════════════════════════════════════════

### TITLE
**Published Research + Working Prototype Evidence**

### TOP 5 REFERENCES (with 1-line takeaway)

| # | Reference | Takeaway for Our Project |
| :---: | :--- | :--- |
| 1 | Marx & Langenheim (1959), Reservoir Heating by Hot Fluid Injection, Trans. AIME 216. | Foundational thermal model used in our reservoir heating/cooling engine. |
| 2 | API RP 11L, Recommended Practice for Design of Sucker Rod Pumping Systems. | Industry-standard rod load, drag, and stress calculations governing our mechanical safety gates. |
| 3 | Andrade (1930), Viscosity of Liquids, Nature 125. | Temperature-viscosity exponential relation used in our heavy-oil rheology model. |
| 4 | Oil India Limited, Rajasthan CSS Project — Baghewala Field Operations. | Domain context: CSS, SRP, insulated tubing, and downhole heating at the target field. |
| 5 | Patel et al. (2005), Cyclic Steam Scheduling with Genetic Algorithms, JPT 57(6). | Prior work on computational steam cycle optimization; validates our SciPy DE approach. |

### 3 PROTOTYPE SCREENSHOTS (Actual Running Software)

**Screenshot 1: 3D Digital Twin Command Center**
- Shows: API Spec 11E C-320D pumping unit with API 6A Christmas tree, 8-card KPI strip, Pumpability Window (0.0 days), Dynamic Operating Envelope, Scenario Comparison, and Recommendation.
- Caption: "Real-time 3D industrial control room with coupled physics telemetry — not a static dashboard."

**Screenshot 2: Assurance Gate + NO SAFE RECOMMENDATION Abstain**
- Shows: Active fault injection, red NO SAFE RECOMMENDATION banner, failed checkpoints showing exact physical cause.
- Caption: "The system catches an anomaly, identifies the exact physical cause, and refuses to issue an unsafe recommendation."

**Screenshot 3: Certified Engineering Decision Certificate**
- Shows: SHA-256 cryptographic seal, recommended setpoints (SPM, Stroke), projected oil rate (+2.2 BOPD), 12-point pass/warn grid, Why and Why Not explanations, and engineer sign-off.
- Caption: "Regulatory-grade decision certificate with explainable causal reasoning and cryptographic audit seal."

### LINKS
- **GitHub Repository:** https://github.com/Tejas7620/Assure-Twin-3d-simulator
- **Live Demo:** http://127.0.0.1:5173/ (Frontend) + http://127.0.0.1:8000/docs (API Docs)
- **Test Results:** 94 / 94 automated tests passing (64 backend Pytest + 30 frontend TSX)

### 1-LINE JUDGE EXPLANATION
*"Everything on this slide is running live on the laptop right now. We can demonstrate any feature interactively."*

### SPEAKER NOTES
"To conclude: ASSURE-TWIN is grounded in established petroleum engineering science — Marx-Langenheim thermal models, API RP 11L rod mechanics, and Andrade rheology. These are not novel experimental methods; they are industry-standard formulations coded into a working prototype. Here are three screenshots from our live running application. First, the 3D Digital Twin command center with synchronized kinematics and real-time KPI telemetry. Second, the Assurance Gate under fault injection, showing the system actively catching a thermal anomaly and triggering NO SAFE RECOMMENDATION. Third, the Certified Engineering Decision Certificate with SHA-256 cryptographic audit seal. All code is on GitHub. All 94 automated tests pass. We welcome your questions. Thank you."

---

# ═══════════════════════════════════════════
# APPENDIX A: CLAIMS THAT MUST NOT BE MADE
# ═══════════════════════════════════════════

The following items are NOT implemented in the current prototype and must NOT be presented as current capabilities:

| DO NOT CLAIM | Why | Safe Alternative |
| :--- | :--- | :--- |
| Downhole electric heater integration | Zero lines of code model downhole heaters | "Future Phase 2 hybrid thermal extension" |
| Field-wide multi-well steam fleet scheduling | Single-well prototype only (BGW-17A) | "Modular architecture designed for multi-well scaling" |
| DEAP genetic algorithm optimizer | Not installed; using SciPy DE | "SciPy Differential Evolution optimizer" |
| PyTorch deep learning models | Not installed; using scikit-learn RF | "scikit-learn Random Forest surrogate" |
| React / Tailwind frontend | Not used; pure TypeScript + Three.js | "Native TypeScript + Three.js WebGL" |
| TimescaleDB / PostgreSQL | Using SQLite via SQLAlchemy | "SQLAlchemy ORM on SQLite (scalable to PostgreSQL)" |
| Live OPC-UA / MQTT SCADA connection | REST + WebSocket only | "REST/WebSocket ingestion; MQTT/OPC-UA designed for field pilot" |
| Field-validated production improvements | All numbers are model-simulated | "Model-simulated projections on calibrated profiles" |
| Real ONGC / OIL telemetry data | Synthetic calibrated profiles | "Synthetic profiles calibrated to published Baghewala PVT data" |
| 99% AI accuracy claims | Surrogate is demo-labeled | "ML surrogate with honest OOD detection and physics fallback" |

---

# ═══════════════════════════════════════════
# APPENDIX B: USER FLOW DIAGRAM (Full Version)
# ═══════════════════════════════════════════

For PPT Slide 2: Simplified 10-step circular flow

```
              ┌─────────────────────────────────────────────────┐
              │            ASSURE-TWIN USER JOURNEY              │
              └─────────────────────────────────────────────────┘

         1. SELECT WELL (BGW-17A, Baghewala Field)
                          │
                          ▼
         2. VIEW 3D DIGITAL TWIN
            (API Spec 11E pumping unit, subterranean cutaway)
                          │
                          ▼
         3. CHECK CURRENT WELL STATE
            (Virtual sensors: Temp 72.8°C, Viscosity 1,392 cP,
             Fluid Level 973m, PIP 18.2 bar)
                          │
                          ▼
         4. VIEW FORECAST (7D / 14D / 30D / 60D)
            (Forward cooling & viscosity trajectory)
                          │
                          ▼
         5. CHECK PUMPABILITY & OPERATING ENVELOPE
            (Countdown days to rod float boundary)
                          │
                          ▼
         6. REHEARSE 4 SCENARIOS (30-Day Sandbox)
            (Status Quo / CSS Only / SRP Only / Joint)
                          │
                          ▼
         7. JOINT CSS + SRP OPTIMIZATION
            (SciPy Differential Evolution: steam timing + SPM + stroke)
                          │
                          ▼
         8. 12-GATE ASSURANCE CHECK
            ┌──────────────┴──────────────┐
            ▼                             ▼
    ALL 12 PASS                     ANY GATE FAILS
    ┌────────────────┐              ┌──────────────────────┐
    │ CERTIFIED      │              │ NO SAFE              │
    │ RECOMMENDATION │              │ RECOMMENDATION       │
    │ (Why & Why Not)│              │ (Root-cause diagnosis)│
    └───────┬────────┘              └──────────────────────┘
            │
            ▼
         9. ENGINEER APPROVES / REJECTS
                          │
                          ▼
        10. SHA-256 CERTIFIED REPORT + AUDIT TRAIL
            → Outcome Reconciliation → Recalibration
```

---

# ═══════════════════════════════════════════
# APPENDIX C: SYSTEM ARCHITECTURE DIAGRAM (Full Version)
# ═══════════════════════════════════════════

For PPT Slide 3: Layered architecture with actual code locations

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          PRESENTATION TIER                                       │
│                                                                                 │
│  Three.js WebGL 3D Viewport │ 14 Control Room Views │ Canvas Sparkline KPIs     │
│  API Spec 11E Kinematics    │ Camera Presets         │ Certified PDF/JSON Reports│
│  (src/scene/*, src/kinematics/PumpjackKinematics.ts, src/ui/pages/*)            │
└──────────────────────────────────────┬──────────────────────────────────────────┘
                                       │ WebSocket + REST API
┌──────────────────────────────────────▼──────────────────────────────────────────┐
│                       DECISION ASSURANCE TIER                                   │
│                                                                                 │
│  12-Point Gatekeeper           │ Dual Consensus        │ Explainability         │
│  (assurance/gatekeeper.py)     │ (ai/model_agreement)  │ (assurance/why_engine) │
│  Abstain Protocol              │ Physics vs ML <= 10%  │ Why + Why Not + SHA-256│
│  (assurance/no_safe_rec.py)    │ OOD Guardrail         │ Causal Physics Chains  │
└──────────────────────────────────────┬──────────────────────────────────────────┘
                                       │
┌──────────────────────────────────────▼──────────────────────────────────────────┐
│                    COUPLED PHYSICS & OPTIMIZATION TIER                           │
│                                                                                 │
│  Marx-Langenheim Thermal       │ Andrade Rheology      │ API RP 11L Rod Dynamics│
│  (physics/thermal.py)          │ (physics/thermal.py)  │ (twin/time_stepper.py) │
│  Vogel/Darcy Inflow            │ Pump Fillage & Valve  │ Float Margin & Drag    │
│  (physics/inflow.py)           │ (physics/pump.py)     │ (physics/float_model)  │
│  ──────────────────────────────┼───────────────────────┼───────────────────────│
│  SciPy Differential Evolution  │ 30-Day Rehearsal      │ ML Surrogate (RF)      │
│  (optimization/css_optimizer)  │ (forecast/rehearsal)  │ (ai/surrogate.py)      │
└──────────────────────────────────────┬──────────────────────────────────────────┘
                                       │
┌──────────────────────────────────────▼──────────────────────────────────────────┐
│                       DATA & PERSISTENCE TIER                                   │
│                                                                                 │
│  SQLAlchemy ORM (25 Tables)    │ Baghewala Well Seed   │ Cryptographic Audit    │
│  (models/entities.py)          │ (seed.py)             │ SHA-256 Decision Log   │
│  SQLite: assure_twin.db       │ CSS Cycles / History   │ Data Provenance Badges │
└─────────────────────────────────────────────────────────────────────────────────┘
```
