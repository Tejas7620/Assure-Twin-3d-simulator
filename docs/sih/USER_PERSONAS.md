# USER_PERSONAS.md
## User Personas & Operational Roles

ASSURE-TWIN serves multiple operational roles across an upstream heavy-oil asset team. This document outlines the five key user personas, their operational pain points, and how ASSURE-TWIN empowers their daily decision-making.

---

### Persona 1: Production Engineer (Primary User)
- **Role:** Responsible for day-to-day well production, surface pumpjack health, and artificial lift efficiency.
- **Primary Goal:** Maximize daily oil production rate (BOPD) while preventing mechanical rod parting, pump unseating, and gear reducer burnout.
- **Pain Point:** Cannot see what is happening 1,000 meters downhole; fears rod float during cold production tails; often forced to guess safe SPM setpoints.
- **What They See:**
  - 8-card live KPI strip (Oil Rate, Water Cut, Liquid Rate, SOR, Pressure, Viscosity).
  - Dynamic Thermo-Mechanical Operating Envelope (current setpoint vs. Safe/Unsafe regions).
  - 12-point gatekeeper checklist and Certified Decision Certificates.
- **What They Do in the App:**
  - Reviews daily well health; runs 30-day decision rehearsals before changing VFD speeds; approves or rejects certified recommendations; downloads signed reports.
- **Value Provided:** Eliminates premature rod failures; provides auditable proof that operating changes are within API stress limits.

---

### Persona 2: Reservoir / Thermal Engineer
- **Role:** Responsible for reservoir drainage, thermal front management, and cyclic steam injection scheduling.
- **Primary Goal:** Maximize thermal energy efficiency, minimize Steam-to-Oil Ratio (SOR), and optimize steam cycle timing.
- **Pain Point:** Lack of downhole temperature gauges due to steam failure; difficult to know whether steam enthalpy has fully dissipated.
- **What They See:**
  - Marx-Langenheim thermal front trajectory and near-wellbore temperature ($T_\text{dh}$) decay curves.
  - Subterranean 3D reservoir heat cutaway with dynamic thermal plume visualization.
  - Predictive Pumpability Window counting down days to thermal depletion.
- **What They Do in the App:**
  - Evaluates CSS opportunity windows; inspects multi-horizon forecasts (7D, 14D, 30D, 60D); models candidate steam volumes and soak times.
- **Value Provided:** Prevents premature or delayed steaming; reduces costly boiler fuel consumption by $14\text{--}18\%$.

---

### Persona 3: Field Operator (Control Room / Wellsite)
- **Role:** Stationed at the field gathering station or well pad; executes physical adjustments on the pumping unit and steam manifold.
- **Primary Goal:** Keep equipment running safely without unexpected shutdowns or hazardous environmental leaks.
- **Pain Point:** Overwhelmed by raw alarms without clear root-cause instructions; manual wellhead pressure gauge recording.
- **What They See:**
  - 3D Digital Twin showing real-time pumping unit articulation and wellhead valves.
  - State-driven Alert Center highlighting critical thermo-mechanical boundary warnings.
  - High-visibility `NO SAFE RECOMMENDATION` red banner when conditions are hazardous.
- **What They Do in the App:**
  - Monitors visual status; toggles camera presets (`Surface`, `Downhole`, `Perforations`) to inspect equipment; verifies that physical well parameters match the digital twin.
- **Value Provided:** Instant visual comprehension of downhole state without needing to decipher complex engineering spreadsheets.

---

### Persona 4: Asset Manager / Petroleum Asset Team Lead
- **Role:** Oversees field-level economics, CAPEX/OPEX budgets, safety compliance, and production quotas.
- **Primary Goal:** Maximize field Net Present Value (NPV), extend well life, and avoid costly workover rig mobilizations.
- **Pain Point:** Workover rigs cost ₹35–50 Lakhs per intervention; lack of institutional transparency on why equipment failed.
- **What They See:**
  - Economic P&L charts showing revenue vs. steam fuel cost and electrical power cost.
  - Cryptographic Decision Audit Trail recording every change, rationale, and sign-off.
  - Model Calibration Center tracking long-term reservoir drift and parameter confidence.
- **What They Do in the App:**
  - Reviews monthly asset performance; verifies compliance with regulatory safety limits; signs off on major CSS cycle capital commitments.
- **Value Provided:** Direct operational expenditure (OPEX) reduction and transparent auditability for corporate governance.

---

### Persona 5: Future Automation / SCADA Specialist
- **Role:** Responsible for industrial IoT infrastructure, PLC/RTU telemetry, and control network security.
- **Primary Goal:** Ensure reliable data ingestion, protect operational networks, and maintain sensor integrity.
- **Pain Point:** High frequency of noisy, frozen, or corrupted telemetry in harsh desert environments.
- **What They See:**
  - Data Quality Ring and universal Data Provenance Badges (`MEASURED`, `CALIBRATED`, `MODEL-DERIVED`).
  - Stale sensor detection logs and Out-of-Domain (OOD) model confidence meters.
- **What They Do in the App:**
  - Monitors communication latency; verifies WebSocket and REST data health; reviews model recalibration logs.
- **Value Provided:** Prevents bad telemetry from corrupting engineering models; provides a robust foundation for future edge automation.
