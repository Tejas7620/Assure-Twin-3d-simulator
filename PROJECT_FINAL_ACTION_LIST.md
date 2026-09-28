# PROJECT_FINAL_ACTION_LIST.md — Forward-Looking Codebase Implementation Plan

This document details the engineering tasks required if the team chooses to implement the missing capabilities promised in the presentation rather than aligning the presentation text with the current software.

---

## 1. MUST IMPLEMENT (Only if PPT is NOT modified)

*Note: Per Phase 49 instructions, no code was modified during this audit. These tasks define the engineering scope if the user desires full literal compliance with the current unrevised PPT.*

| Task ID | Component | Required Engineering Implementation | Complexity | Estimated Effort | Strategic Recommendation |
|---|---|---|---|---|---|
| **PRJ-M01** | **Downhole Electric Heating Engine** | Create `backend/app/physics/electric_heater.py`. Model downhole resistive heating cable dissipation ($Q = I^2 R t$), continuous vs. cyclic duty cycles, tubing heat conduction, and power tariff OPEX. Integrate into the 15-domain time stepper. | High | 12–16 Hours | **DO NOT IMPLEMENT BEFORE SIH DEMO.** Reframe in PPT instead. The core twin is already complete and robust. |
| **PRJ-M02** | **Multi-Well Fleet Steam Scheduler** | Create `backend/app/services/fleet_scheduler.py`. Install `deap`. Define multi-well scheduling chromosome, steam generator routing constraints, and genetic algorithm fitness function. Add multi-well API endpoint. | High | 14–18 Hours | **DO NOT IMPLEMENT BEFORE SIH DEMO.** A high-fidelity single-well twin is vastly more defensible than rushed toy fleet code. |
| **PRJ-M03** | **MQTT / OPC-UA Ingestion Gateway** | Install `paho-mqtt` or `asyncua`. Create background ingestion service subscribing to tag topics, parsing JSON payloads into `state_adapter.py`. | Medium | 6–8 Hours | **DO NOT IMPLEMENT BEFORE SIH DEMO.** REST and WebSockets already provide live streaming. |

---

## 2. SHOULD IMPLEMENT (Valuable Enhancements for Live Demo)

These enhancements require minimal code changes, leverage existing modules, and directly strengthen the live evaluator presentation:

| Task ID | Component | Implementation Scope | Complexity | Estimated Effort | Impact on Demo |
|---|---|---|---|---|---|
| **PRJ-S01** | **Abstain Demo Trigger Button** | Add a simple preset button on the UI Simulator view: *"Inject Abnormal Viscosity Spike (Force Abstain)"*. Triggers the 12-point gatekeeper to immediately output `NO_SAFE_RECOMMENDATION`. | Low | 1 Hour | **VERY HIGH.** Allows the presenter to dramatically demonstrate the Abstain Protocol live to judges with one click. |
| **PRJ-S02** | **Camera Preset Buttons in 3D Scene** | Add 3 quick-view buttons on the 3D canvas: *"Surface Pumpjack"*, *"Downhole Perforations"*, *"Dyno Card Zoom"*. | Low | 1 Hour | **HIGH.** Makes 3D navigation seamless during a fast-paced 8-minute presentation. |
| **PRJ-S03** | **Export Recommendation PDF / Audit Report** | Add a *"Download Certified Engineering Report"* button on the Recommendation page that exports an audit summary of the 12 assurance checks and causal reasons. | Medium | 2 Hours | **HIGH.** PSU evaluators love formal compliance documents and signed audit logs. |

---

## 3. OPTIONAL (Post-Hackathon Production Hardening)

| Task ID | Component | Implementation Scope | Target Timeline |
|---|---|---|---|
| **PRJ-O01** | **TimescaleDB Containerization** | Provision a TimescaleDB service in `docker-compose.yml` and switch the database URL from SQLite to PostgreSQL. | Post-Hackathon Deployment |
| **PRJ-O02** | **Full 1D Gibbs Wave Equation Solver** | Upgrade the sucker rod kinematic force balance to a full finite-difference wave equation solver for ultra-deep wellbores ($> 2,000\text{ m}$). | Academic Publication Phase |
| **PRJ-O03** | **Enterprise PSU Single Sign-On (SSO)** | Integrate OAuth2 / OpenID Connect with corporate Active Directory / LDAP for Oil India intranet authentication. | Commercial Pilot Phase |
