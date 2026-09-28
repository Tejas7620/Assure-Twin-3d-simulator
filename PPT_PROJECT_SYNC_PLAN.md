# PPT_PROJECT_SYNC_PLAN.md — Code, Presentation, Demo & Video Synchronization Plan

The primary objective of this plan is to ensure that the **Source Code**, the **Slide Deck**, the **Live Presentation**, and the **Demonstration Video** communicate a unified, harmonious, and 100% truthful technical narrative.

---

## The Synchronization Matrix

| Feature | Project Implementation | PPT Slide | Recommended PPT Wording | Demo Evidence to Show in Video/Live |
|---|---|---|---|---|
| **1. 3D Petroleum Digital Twin** | Three.js WebGL engine with transparent wellbore, animated 4-bar pumpjack kinematics, downhole valves, and thermal plume (`src/scene/*`). | **Slide 1, 2, 3, 6** | *"Full-Featured 3D Cyber-Physical Digital Twin: Interactive Three.js WebGL simulator with surface pumpjack kinematics, subterranean wellbore mechanics, and live thermal front visualization."* | Full-screen interactive 3D view; rotate camera around horsehead; switch to Subsurface camera showing downhole pump plunger reciprocating. |
| **2. Coupled Physics Engine** | 15-domain coupled time stepper (`backend/app/twin/time_stepper.py`) coupling thermodynamics, rheology, inflow, pump fillage, and rod kinematics. | **Slide 2, 3, 4** | *"Coupled Multi-Domain Time-Stepper: First-principles physics coupling reservoir thermal decay (Marx-Langenheim) directly with sucker rod force balance (API RP 11L) in one live model."* | Show terminal running coupled twin step; show telemetry cards on Overview page updating simultaneously across thermal, mechanical, and production metrics. |
| **3. Joint CSS-SRP Optimization** | Multi-objective Pareto optimizer (`backend/app/optimization/optimizer.py`) evaluating 16 operating points analytically across SPM $\times$ Stroke space. | **Slide 2, 3, 5** | *"Coupled Multi-Objective Joint Optimization: Simultaneously tunes subsurface cyclic steam parameters and surface pump speeds, balancing crude revenue, steam penalties, and rod-float risk."* | Navigate to Optimization page; adjust Crude Revenue and Steam Penalty sliders; click "Execute Joint Solver"; show candidates populate; click "Apply Setpoint to 3D Twin". |
| **4. Dynamic Operating Envelope** | Safe pump speed window ($SPM_{max}$) calculated dynamically as reservoir temperature decays (`backend/app/analytics/envelope.py`). | **Slide 2, 4** | *"Dynamic Thermo-Mechanical Operating Envelope: The safe pump speed window continuously shrinks as the reservoir cools, preventing rod floating before thermal gelation begins."* | Navigate to Well State page; highlight the Dynamic Operating Envelope gauge; explain how $SPM_{crit}$ drops from 4.2 down to 2.8 as temperature drops from 85°C to 45°C. |
| **5. Predictive Pumpability Window** | Thermal decay forward model calculating days remaining until pump fillage drops or rod float occurs (`backend/app/analytics/pumpability.py`). | **Slide 2, 5** | *"Predictive Pumpability Window: Evaluates thermal decay trajectories to compute exact days remaining before critical viscosity rebound requires cycle turnaround."* | Show the Pumpability Window card on the Well State page with the countdown timer (e.g., *"18.4 Days Remaining"*). |
| **6. Decision Rehearsal Sandbox** | In-memory deep clone (`live_engine.clone()`) stepping forward 30 days to test candidate setpoints before dispatch (`backend/app/forecast/rehearsal.py`). | **Slide 2, 3** | *"Decision Rehearsal Sandbox: Deep-clones the active well twin in-memory to forward-simulate operational setpoints across 30 days, certifying mechanical integrity before application."* | Navigate to Scenarios page; click "Rehearse Strategy"; show the 30-day forward trajectory checking daily boundary limits and returning an APPROVED verdict. |
| **7. The Abstain Protocol ("NO SAFE REC")** | 12-checkpoint deterministic engineering gatekeeper that strictly refuses to advise unsafe setpoints (`backend/app/assurance/gatekeeper.py`). | **Slide 2, 4** | *"The Abstain Protocol (Built-in Safety Gate): Rather than asserting dangerous setpoints, ASSURE-TWIN outputs 'NO SAFE RECOMMENDATION' whenever mechanical or thermal envelopes are violated."* | Navigate to Assurance Gate page; show the 12 green checkmarks; explain the strict abstain rule that prevents AI hallucinations. |
| **8. Explainable Recommendations** | Structured recommendation object containing pre-conditions, causal reasons why, and counterfactual rejections why not (`backend/app/api/v1/recommendations.py`). | **Slide 2, 4, 5** | *"Explainable AI with Causal Reasoning: Every recommendation provides plain-language engineering justifications and counterfactual rejections, requiring engineer sign-off."* | Navigate to Recommendations page; display the active recommendation card showing the causal rationale and counterfactual rejection bullets; click "Approve". |
| **9. Model Calibration Subsystem** | Interactive viscosity curve fitting and historical outcome reconciliation (`backend/app/calibration/*`). | **Slide 4** | *"Built-in Calibration Subsystem: Interactive parameter fitting for lab rheometer viscosity curves and automated outcome reconciliation against historical well test logs."* | Navigate to Calibration page; show Eyring/Andrade curve fitting and historical error reconciliation tables. |
| **10. Technology Stack Honesty** | Native TypeScript + Three.js + custom Vanilla CSS + FastAPI + scikit-learn + SciPy + SQLite ORM (`package.json`, `requirements.txt`). | **Slide 3, 4** | *"Lightweight, High-Performance Open-Source Stack: Engineered in Python, FastAPI, SciPy, scikit-learn, Three.js WebGL, and native TypeScript for zero-latency 60 FPS edge execution."* | Show clean terminal boots for FastAPI backend (`uvicorn`) and Vite frontend (`vite`), running seamlessly on local laptop hardware. |

---

## Synchronization Execution Checklist

1. **Slide Deck Update:** Edit Slides 1, 2, 3, 4, 5, 6 in PowerPoint / Google Slides according to `PPT_CHANGE_PLAN.md`.
2. **Screenshots Generation:** Take 3 crisp, full-resolution captures from `http://localhost:5173/` and paste into Slide 6:
   - 3D Subsurface Twin with Dyno Card
   - Optimization Solver Pareto Table
   - Assurance Gate 12-Checkpoint Matrix
3. **Video Recording:** Record an 8-minute demonstration following `DEMO_READINESS.md`. Upload to YouTube as Unlisted / Public.
4. **QR Code Insertion:** Generate QR codes linking to the GitHub repository and YouTube video; place on Slide 6.
5. **Team Alignment:** Rehearse the presentation using the exact terminology defined in this synchronization matrix.
