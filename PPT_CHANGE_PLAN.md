# PPT_CHANGE_PLAN.md — Comprehensive Slide-by-Slide Action Plan

This document provides a slide-by-slide modification plan to transform the presentation into an accurate, defensible, and high-scoring hackathon submission.

---

## Slide 1: Title Slide

- **KEEP:**
  - Official SIH 2026 header, Problem Statement ID (`SIH26120`), Team ID (`140280`), Team Name (`VisionX$`), and Oil India Limited logo.
  - Problem title targeting Baghewala field heavy oil wells.
- **CHANGE:**
  - Add official product name: **ASSURE-TWIN**.
- **ADD:**
  - Subtitle: *"A Cyber-Physical 3D Digital Twin for Coupled CSS Thermal Stimulation and Sucker Rod Pump Optimization"*.
- **REMOVE:**
  - Nothing.
- **REPLACE:**
  - Nothing.
- **SHORTEN:**
  - Nothing.
- **EXPAND:**
  - Clarify the cyber-physical nature of the project.

---

## Slide 2: Proposed Solution

- **KEEP:**
  - Top headline framing of fusing reservoir thermal decay and rod-string mechanics.
  - Problems box: Siloed tuning, viscosity rebound, rod floating, and higher SOR.
  - Plain-language explainability and trust claims.
- **CHANGE:**
  - Rewrite Top Banner to highlight the **3D interactive digital twin** and **Decision Rehearsal**.
  - Change "Real-Time SRP Controller sets safe SPM & stroke" to emphasize **Dynamic Operating Envelope & Float Margin Prevention**.
- **ADD:**
  - **Dynamic Operating Envelope & Pumpability Window:** Explain that the safe pump speed window moves dynamically as the reservoir cools.
  - **The Abstain Protocol ("NO SAFE RECOMMENDATION"):** The system refuses to advise unsafe setpoints.
  - **Decision Rehearsal Sandbox:** Forward-testing decisions in an in-memory clone before field application.
  - Visual callout of the **3D CyberPump Simulator**.
- **REMOVE:**
  - *"coordinates steam with OIL's own downhole heaters across the whole well field"*
  - *"Dual heat-source control — coordinates CSS with OIL's downhole electric heaters"*
  - *"Field-level scheduling — allocates steam capacity across wells"*
- **REPLACE:**
  - Replace the "Dual-heat coordinator" and "Field-level scheduler" blocks in the workflow diagram with **"Decision Rehearsal Sandbox"** and **"12-Point Assurance Gatekeeper"**.
- **SHORTEN:**
  - Condense problem descriptions into punchy bullet points.
- **EXPAND:**
  - Expand on why coupling thermodynamic reservoir cooling with mechanical rod kinematics is a major breakthrough.

---

## Slide 3: Technical Approach

- **KEEP:**
  - Ingress, Physics Core, Inflow Model, Optimization & Control, Storage layers.
  - Python, FastAPI, NumPy, SciPy, Docker, Git badges.
- **CHANGE:**
  - Change "SciPy / PyTorch" to **"SciPy / scikit-learn"**.
  - Change "TimescaleDB / React" to **"SQLAlchemy ORM / Three.js + TypeScript"**.
  - Change "Field Orchestration — DEAP" to **"Assurance Gatekeeper & Decision Rehearsal"**.
- **ADD:**
  - **3D Digital Twin Engine (Three.js WebGL)**: Prominent visual block representing the real-time 3D simulation.
  - **Virtual Downhole State Estimator**: Estimating bottomhole flowing pressure ($P_{wf}$) and pump fillage without physical downhole gauges.
  - **Decision Rehearsal Sandbox**: Deep-clone forward trial engine.
- **REMOVE:**
  - `React` and `Tailwind` badges.
  - `PyTorch` badge.
  - `DEAP` badge.
  - "CSS + Heater Joint Optimizer" block.
  - "Field Orchestration" and "Capacity Manager" multi-well blocks.
- **REPLACE:**
  - Replace React/Tailwind logos with **Three.js** and **TypeScript** logos.
  - Replace PyTorch logo with **scikit-learn** logo.
  - Replace DEAP with **SciPy Differential Evolution**.
- **SHORTEN:**
  - Reduce generic infrastructure terms.
- **EXPAND:**
  - Detail the 15-domain coupled physics time stepper.

---

## Slide 4: Feasibility & Viability

- **KEEP:**
  - Proven physics citations (Marx-Langenheim, API RP 11L rod balance).
  - Fast deterministic loop running in milliseconds at the edge.
  - Advisory-first human-in-the-loop workflow.
  - Offline simulator fallback mode.
  - Challenges and mitigations table (synthetic data, sensor drift, edge execution).
- **CHANGE:**
  - Update "Open-source stack" text from *"Python, SciPy, PyTorch, FastAPI, React and TimescaleDB"* to *"Python, FastAPI, SciPy, scikit-learn, Three.js, and TypeScript"*.
- **ADD:**
  - Explicit mention of the **12-Point Deterministic Assurance Gatekeeper**.
  - **Mahalanobis Out-of-Domain (OOD) Detection** under AI distrust mitigation.
  - Mention of the **60-test automated verification suite (`pytest`)**.
- **REMOVE:**
  - Reference to "downhole electric heaters" under equipment OIL runs at Baghewala.
- **REPLACE:**
  - In the Challenges table, under "Crude gel behaviour", replace "Herschel-Bulkley" with **"Calibrated Andrade-Couette Viscous Drag Formulation"**.
- **SHORTEN:**
  - Keep bullets concise.
- **EXPAND:**
  - Emphasize the **Abstain Protocol** as the ultimate operational safeguard for public sector energy infrastructure.

---

## Slide 5: Impact & Benefits

- **KEEP:**
  - Positive impacts: Lower steam and energy use per barrel (SOR reduction), fewer rod failures, workover diagnostic separation.
  - Who Benefits? matrix (Production engineers, Field crews, Oil India Limited, National Energy Security).
  - Triple bottom line benefits (Economic, Environmental, Social).
  - SDG Alignment (SDG 7, 9, 12, 13).
  - Business Model Canvas link.
- **CHANGE:**
  - Change "Better use of shared steam capacity across wells" to **"Optimized Steam Allocation & Cycle Timing on Flagship Producer Wells"**.
- **ADD:**
  - Reference the **Scenario Comparison Matrix** implemented in the software (demonstrating +5.8 BOPD uplift and 18% SOR reduction on Well BGW-17A).
  - Mention quantitative **$\pm 30\%$ sensitivity analysis** against oil price and electricity tariffs.
- **REMOVE:**
  - Reference to "downhole heaters covering gaps between cycles".
  - Claims of mobile steam generator fleet routing across multiple wells.
- **REPLACE:**
  - Shift multi-well fleet claims to deep, high-impact single-well lifecycle optimization.
- **SHORTEN:**
  - Bullet text to maintain clean visual whitespace.
- **EXPAND:**
  - Highlight the national impact: *"Every extra barrel from Baghewala directly reduces India's 88.2% crude import bill."*

---

## Slide 6: Research & References

- **KEEP:**
  - All academic citations (Marx & Langenheim, Soares et al., Dimitriou et al., Patel et al., Mohankumar).
  - Oil India Rajasthan project page citation and PPAC import dependence statistic.
- **CHANGE:**
  - Transform Slide 6 from an academic citation sheet into the **Demonstration & Verification Anchor** of the presentation!
- **ADD (CRITICAL):**
  - **Screenshot 1:** Interactive 3D Digital Twin showing pumpjack surface kinematics and transparent downhole wellbore.
  - **Screenshot 2:** Coupled Multi-Objective Joint Optimization Pareto solver page with live candidate table.
  - **Screenshot 3:** 12-Checkpoint Assurance Gatekeeper and Explainable Recommendation card.
  - **GitHub Repository URL & QR Code:** Link directly to the active codebase.
  - **YouTube Demo Video Link & QR Code:** Link to the video demonstration walkthrough.
- **REMOVE:**
  - The empty placeholder frames and blank lines!
- **REPLACE:**
  - Replace the blank template boxes with crisp, high-resolution annotated software captures.
- **SHORTEN:**
  - Condense citations into a clean, professional two-column reference box on the left.
- **EXPAND:**
  - Provide a clear call to action inviting evaluators to test the live application.
