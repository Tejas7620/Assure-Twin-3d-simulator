# ASSURE-TWIN: Final Demo Checklist & Acceptance Verification
**Smart India Hackathon 2026 — PS SIH26120**

---

### Acceptance Criteria Checklist

- [x] **GUI Visual Match:** Dark navy/charcoal engineering palette (`--bg-main: #060b13`, `--border: #14213d`), high-density layout, exact reference topology.
- [x] **3D Digital Twin Preserved:** API Mark II pumpjack, walking beam, horsehead, wellbore cutaway, reservoir grid, fluid particles, and dyno synthesis fully functioning.
- [x] **3D Central Anchor:** Dominates the upper-center visual viewport of the Overview screen with aspect ratio preserved.
- [x] **Camera Presets:** Floating modal over 3D twin supporting `Surface Pumpjack`, `Downhole View`, `Perforations View`, and `Dyno Card View`.
- [x] **Top Header:** Well `BGW-17A`, Field `Baghewala`, Mode `Joint (CSS + SRP)`, Time `Day 18.35`, Data Quality `98% Good` ring, Alert Bell, and System Status dot.
- [x] **8-Card KPI Strip:** High-density cards with live sparklines for Oil Production, Water Cut, Liquid Rate, SOR, Steam Rate, Bottomhole Pressure, Avg Temp, and Viscosity.
- [x] **Left Navigation:** 14 active routes (Overview, 3D Simulator, Well State, Forecast, Pumpability, Scenarios, Optimization, Recommendation, Assurance, Alerts, History & Audit, Calibration, Reports, Settings) + Well Status + Data Provenance Legend.
- [x] **Dynamic Operating Envelope:** SPM (0–10) vs Time (Days 0–30) with Unsafe, Caution, Safe, and Preferred color bands, active SPM dot, and projected trajectory.
- [x] **Pumpability Window:** 18.4 Days countdown gauge with contracting warning and dominant driver explanation.
- [x] **Decision Rehearsal Sandbox:** Forward 30-day projection running on isolated cloned state without mutating live well telemetry.
- [x] **Joint CSS-SRP Co-Optimization:** Co-optimizes steam volume, soak time, SPM, and stroke length across 4 candidate operating points.
- [x] **12-Point Assurance Gate:** 12 genuine engineering checkpoints (thermal envelope, float margin, fillage, rod load, OOD, agreement, etc.) with zero hardwired pass flags.
- [x] **Abstain Protocol:** `NO SAFE RECOMMENDATION` state triggered when constraints are violated, complete with blocking reasons and required engineer actions.
- [x] **Controlled Demo Trigger:** `[ 🧪 DEMO: Abnormal Viscosity ]` injects +14,500 cP cold slug anomaly, collapses float margin, trips gatekeeper, and triggers Abstain state; `[ 🔄 Reset Demo ]` cleanly restores baseline.
- [x] **Certified Engineering Report:** Dedicated `Reports` view with comprehensive metrics, SHA-256 cryptographic seal, and print/PDF export.
- [x] **Truth in Engineering:** Zero fake field telemetry claims; all values flagged with honest provenance (`MEASURED`, `CALIBRATED`, `MODEL-DERIVED`, `PREDICTED`, `SYNTHETIC / DEMO`).
- [x] **Zero Dead Buttons:** Every button, tab, preset, and inspect drawer trigger is connected to verified reactive application logic.
- [x] **Backend & Frontend Tests:** 64/64 pytest tests pass; 30/30 frontend unit tests pass; `npm run build` succeeds cleanly.
