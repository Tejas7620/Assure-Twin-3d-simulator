# PPT_CONTENT_EXTRACTION.md — Complete Technical Extraction of SIH Presentation

**Presentation Context:**
- **Hackathon:** SMART INDIA HACKATHON 2026
- **Problem Statement ID:** SIH26120
- **Problem Statement Title:** Digital Twin for Well-to-Surface Optimization of Cyclic Steam Stimulation (CSS) and Sucker Rod Pump (SRP) Operations for Heavy Oil Wells of Baghewala Field.
- **Theme:** Smart Automation | **Category:** Software
- **Team ID:** 140280 | **Team Name:** VisionX$
- **Target Organization / PSU:** Oil India Limited (OIL), Rajasthan Field

---

## Slide 1: Title Slide

### Header & Metadata
- **Logos:** VisionX$ (Top Left), Smart India Hackathon 2026 (Top Right), Oil India Limited (Bottom Center), SIH Lightbulb Brain (Right Graphic).
- **Title:** SMART INDIA HACKATHON 2026
- **Problem Statement ID:** SIH26120
- **Problem Statement Title:** Digital Twin for Well-to-Surface Optimization of Cyclic Steam Stimulation (CSS) and Sucker Rod Pump (SRP) Operations for Heavy Oil Wells of Baghewala Field.
- **Theme:** Smart Automation
- **PS Category:** Software
- **Team ID:** 140280
- **Team Name:** VisionX$

### Technical & Numerical Claims
- Explicit targeting of Baghewala heavy oil field (Oil India Limited).
- No numerical operational claims on this slide.

---

## Slide 2: Proposed Solution

### Headline
- **Top Banner Claim:** "An AI-enabled Well-to-Surface Digital Twin that fuses reservoir thermal decay, crude rheology, and rod-string mechanics into one live model — jointly deciding CSS design and real-time SRP control, instead of tuning them apart. It predicts viscosity rebound before rod floating happens, sets safe pump speeds on the fly, and coordinates steam with OIL's own downhole heaters across the whole well field."

### Section: Problems
1. **Siloed, experience-based tuning:**
   - CSS design (steam volume, soak time) and SRP settings (SPM, stroke) decided separately, from past experience.
   - No predictive analytics → higher Steam-Oil Ratio (SOR), wasted energy, reactive fixes.
2. **Viscosity rebound breaks the pump:**
   - As the heated zone cools, viscosity climbs back — causing rod floating and impact loading.
   - Result: frequent rod failures, pump unsettings, higher maintenance cost.

### Section: Our Solution & Uniqueness
1. **Joint optimization:** One engine sets the next steam cycle and the safe pump speed together, not as two separate decisions.
2. **Realistic crude physics:** Models the heavy crude as a fluid that can gel and needs a "breakout" force to restart flow, not just a thickness-vs-temperature chart (thixotropy & yield stress).
3. **Dual heat-source control:** Coordinates CSS with OIL's own downhole electric heaters, closing viscosity gaps between steam cycles without always needing a full re-steam.
4. **Field-level scheduling:** Allocates the field's limited steam capacity across wells, not just one well at a time.
5. **Built for trust:** Every recommendation comes with a plain-language reason and is checked against live sensor data before being applied.

### Diagram: End-to-End Workflow
- `Field & Well Data` (CSS, SRP, fluid, completion logs)
  - ➔ `Rheology & thermal engine` (tracks gel & breakout force)
  - ➔ `Dual-heat coordinator` (coordinates CSS & heaters)
- Middle layer:
  - `Real-Time SRP Controller` (Sets safe SPM & stroke)
  - `CSS cycle optimizer` (designs next steam cycle)
- Field layer:
  - ➔ `Field-Level steam scheduler` (allocates capacity across wells)
- Outcome:
  - ➔ `Outcomes` (recovery up, SOR & failures down)

### Categorized Claims from Slide 2
- **Physics Claims:** Reservoir thermal decay, crude rheology (gel / yield stress / breakout force), rod-string mechanics, viscosity rebound, rod-float prediction, dual heating (steam + electric downhole heaters).
- **Optimization Claims:** Joint CSS + SRP optimization, field-level steam capacity allocation across multiple wells.
- **Control Claims:** Real-time SRP controller setting safe SPM & stroke dynamically on the fly.
- **Assurance Claims:** Trustworthy plain-language explanations, live sensor data verification.

---

## Slide 3: Technical Approach

### Architecture Overview (Left Box)
- **Ingress:** Engineers, operators, SCADA/historian, and a synthetic simulator feed live or mock telemetry into the platform — `REST`.
- **Data & Integration:** Protocol adapters normalize incoming tags into a common schema via a stream processor — `MQTT/OPC-UA`.
- **Physics & ML Core:** Builds a live per-well twin: thermal decay, rheology, wellbore/rod mechanics, inflow model, and an ML surrogate/classifier — `SciPy / PyTorch`.
- **Optimization & Control:** Turns twin state into safe real-time pump settings, the next CSS+heater cycle design, and workover-vs-setpoint calls — `FastAPI`.
- **Field Orchestration:** Allocates shared steam/heater capacity and times each well's next cycle economically across the whole field — `DEAP`.
- **Storage & Web App:** Logs every action and serves the engineer dashboard, field overview, and approval workflow — `TimescaleDB / React`.

### Architecture Diagram Blocks (Center/Right)
1. **External Systems & Users:**
   - Engineers (Production & Reservoir)
   - Operators & Admins
   - SCADA / Historian (Live Telemetry)
   - Synthetic Simulator (Dev / Test)
2. **Data & Integration:**
   - Protocol Adapters (`MQTT`, `OPC-UA`)
   - Stream Processor (`Normalized Tags`)
3. **Physics & ML Core (Per-Well Twin):**
   - Reservoir & Thermal Model
   - Rheology Engine (Thixotropic)
   - Wellbore & Rod Mechanics
   - Inflow / Production Model
   - ML Surrogate & Classifier
4. **Optimization & Control:**
   - Real-Time SRP Controller
   - CSS + Heater Joint Optimizer
   - Workover vs Setpoint Decision
5. **Field Orchestration:**
   - Capacity Manager
   - Economic Cycle-Timing
   - Allocation Optimizer
6. **Data Storage:**
   - Time-Series Store (`TimescaleDB`)
7. **Web App:**
   - Hero Well Dashboard
   - Field Overview
   - Workflow & Approval

### Technology Badges (Footer)
- Python, FastAPI, NumPy, PyTorch, PostgreSQL, React, Tailwind, Docker, Kubernetes, Prometheus, Grafana, Git, JWT, MQTT, GitHub Actions.

---

## Slide 4: Feasibility & Viability

### Technical Feasibility
1. **Proven physics, not experimental science:** Thermal decay (Marx-Langenheim), yield-stress rheology (Herschel-Bulkley) and rod-string force balance are all established, published methods.
2. **Open-source stack:** Python, SciPy, PyTorch, FastAPI, React and TimescaleDB mean no licence cost and no vendor lock-in.
3. **Matches equipment OIL already runs at Baghewala:** CSS, hydraulic and beam SRPs and downhole electric heaters.
4. **Fast loop is deterministic:** The real-time pump controller solves a force balance, so it runs in milliseconds, with no heavy AI inference in the control path.

### Operational Viability
1. **Advisory-first:** The twin recommends and the engineer approves (Human in the Loop) through the workflow screen before anything is applied.
2. **Works with existing systems:** MQTT/OPC-UA adapters read from SCADA/historian tags, with no rip-and-replace.
3. **Runs without live data:** Falls back to simulator mode, so it can be trialled before integration.
4. **Phased rollout:** Advisory ➔ Supervisory (confirm-to-apply) ➔ Closed-loop, each stage gated on proven accuracy.

### Challenges & Mitigation Table
| Challenge | Mitigation |
|---|---|
| No public well-level field data | Physics-informed synthetic data, labelled by confidence tier, with hooks to calibrate on real logs |
| Crude gel behaviour is hard to model exactly | Calibrate on rheometer tests and dynamometer cards, with conservative safety margins |
| Black-box AI distrust | Physics model re-checks every optimizer suggestion, and each recommendation comes with a plain-language reason |
| Legacy SCADA integration | MQTT/OPC-UA protocol adapters, starting in read-only mode |
| Model drift as wells age | Live model-vs-sensor comparison with periodic recalibration |
| Noisy or missing sensor data | Stream-processor validation and filtering before data reaches the models |
| Remote-site connectivity | Fast control loop runs at the edge and does not depend on the cloud |

### Sustainability Plan
- **Technical:** Modular services, so any model can be upgraded or retrained without a rebuild.
- **Operational:** Engineer training on the dashboard, plus audit logs for accountability.
- **Environmental:** Less steam per barrel means lower fuel burn and emissions, and lower energy per barrel.
- **Economic:** Fewer rod failures and workovers, and steam capacity used where it pays back most.
- **Scalable:** The same twin can be reconfigured for other thermal or heavy-oil fields.

---

## Slide 5: Impact & Benefits

### Potential Impact: Positive vs Negatives
- **Positive:**
  - Lower steam and energy use per barrel: Steam is matched to how each well responds, and downhole heaters cover gaps between cycles.
  - Fewer rod failures and pump unsettings: Rod-floating risk is flagged before it happens, so pumps run at safe speeds.
  - Fewer workovers: The twin separates "tune the setpoint" from "this well needs a workover," so rig jobs go where they are needed.
  - Better use of shared steam capacity: OIL's mobile steam generators are a limited resource, and the twin allocates them across wells.
- **Negatives and mitigation:**
  - Integration and adoption cost: Open-source stack, no licence fees, rollout starts as a pilot on a few wells.
  - Engineer distrust of AI: Engineer approves every action (human-in-the-loop), plain-language reasons.
  - Accuracy before field calibration: Starts in advisory mode with conservative safety margins.
  - Data security for a PSU: On-premise deployment, role-based access, and audit logs.

### Value Creation Matrix (Who Benefits? ➔ Impact)
- **Production engineers (Reservoir & production teams):** Predict, don't react — Decisions backed by a reason.
- **Field & operations crews (Rig and well-site staff):** Fewer emergency jobs — Fewer failures, safer work.
- **Oil India Limited (Asset and management):** More oil, lower cost — Less steam, fuel per barrel.
- **Wider country (India's energy security):** More domestic output — Every extra barrel counts.

### Triple Bottom Line Benefits
- **Economic:** Lower steam and fuel cost per barrel; Fewer rod and pump replacements; More oil from the same steam generators.
- **Environmental:** Less steam, so less fuel and water used; Fewer workover rig moves and truck trips; Lower CO₂ per barrel.
- **Social:** Less hazardous emergency rig work; Engineers shift from firefighting to decision-making; Stronger national energy security.

### SDG Alignment
- **SDG 7 (Affordable and Clean Energy):** Lower energy per barrel.
- **SDG 9 (Industry, Innovation and Infrastructure):** Digital-twin innovation in a PSU field.
- **SDG 12 (Responsible Consumption and Production):** Less steam, fuel, and water for same output.
- **SDG 13 (Climate Action):** Lower emissions per barrel.
- **External link:** "Link to Detailed Business Model Canvas".

---

## Slide 6: Research & References

### Data Sources Cited
1. Oil India: Rajasthan project page (Baghewala CSS, SRP, insulated tubing) — `https://www.oil-india.com/hi/node/4588`
2. OIL EOI OIL/RF/EOI/014/2024 (CSS and downhole heating) — `https://eoibahrain.gov.in/pdf/OIL-RF-EOI-014-2024.pdf`
3. OIL procurement document: non-thermal wells and electric downhole heating — `https://www.oil-india.com/files/procurements_on_nomination_documents/NominationjanMar202thirdrajasthanproc.pdf`
4. PPAC: crude import dependence, FY25 (88.2%) — `https://indiaseatradenews.com/?p=115564`

### Technical & Academic Citations
1. Marx & Langenheim (1959), *Reservoir Heating by Hot Fluid Injection*, Trans. AIME 216.
2. Soares, Thompson & Machado (2013), *Yield-stress and thixotropy*, Applied Rheology 23(6).
3. Dimitriou, McKinley & Venkatesan (2011), *Crude rheology & gelation*, Energy & Fuels 25.
4. Karanikas, Pastor & Penny (2020), *Downhole electric heating*, CT&F 10(2).
5. Patel et al. (2005), *Cyclic-steam scheduling with genetic algorithms*, JPT 57(6).
6. Mohankumar (2019), *MSc thesis, University of Alberta: steam allocation*.

### Visual / Prototype Artifacts on Slide 6
- **Prototype Screenshots:** [EMPTY PLACEHOLDER FRAMES]
- **Prototype demo (YouTube):** [EMPTY PLACEHOLDER FRAMES]
- **Link to GitHub Repository :** [EMPTY BLANK TEXT]
