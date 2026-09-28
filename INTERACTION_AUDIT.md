# ASSURE-TWIN Interaction & Clickability Audit

## 1. Audit Methodology
Every interactive element across the ASSURE-TWIN workstation—including navigation items, KPI cards, control sliders, 3D viewport controls, right sidebar engineering cards, scenario buttons, and approval gates—has been audited for clickability, state mutation, and feedback integrity.

---

## 2. Master Interaction Matrix

| Element | Location | Current State | Expected Action | Implementation / Handler | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Well Selector** | Top Header | Dropdown styled | Select active well | Binds to well switcher; sets `BGW-17A` active | VERIFIED |
| **Field Selector** | Top Header | Badge display | Display active field | Displays `Baghewala` asset metadata modal | VERIFIED |
| **Sim Play/Pause** | Top Header | Toggle button | Pause/resume physical clock | Toggles `SimulationClient.togglePause()` | VERIFIED |
| **Sim Speed Dropdown** | Top Header | Cycle pill | Adjust simulation timestep | Cycles $0.5\times, 1.0\times, 2.0\times, 5.0\times$; mutates `simClient.setPlaybackSpeed()` | VERIFIED |
| **Data Quality Ring** | Top Header | SVG circular gauge | Inspect sensor health | Opens Data Trust Drawer with missing/stale telemetry diagnostics | VERIFIED |
| **Notifications Bell** | Top Header | Icon button | Open system notifications | Navigates or opens Alert Drawer | VERIFIED |
| **Left Nav Items (12)**| Left Nav | 12 buttons | Switch workstation view | Smoothly mounts corresponding page view in `.ws-content-area` | VERIFIED |
| **SPM Slider** | Left Controls | Range input ($0.5-10$) | Modulate stroke rate | Mutates `simClient.setControl('spm', val)`; speeds up 3D pumpjack & updates physics | VERIFIED |
| **Stroke Slider** | Left Controls | Range input ($30-120$) | Modulate rod stroke | Mutates `simClient.setControl('stroke_length_in', val)`; updates swept volume | VERIFIED |
| **VFD Slider** | Left Controls | Range input ($10-120$) | Modulate drive frequency | Mutates `simClient.setControl('vfd_speed_hz', val)`; updates motor dynamics | VERIFIED |
| **CSS Steam Rate** | Left Controls | Live readout | Display steam allocation | Opens CSS Allocation & Thermal Injection dialog | VERIFIED |
| **3D Toolbar Buttons** | 3D Viewport | 8 icon buttons | Camera & visual presets | Controls camera orbit, follow mode, fluid particle toggles, thermal grid | VERIFIED |
| **View Mode Pills** | 3D Viewport | Surface/Wellbore/Reservoir | Perspective focal shift | Smooth camera tween to Surface, Horizontal Wellbore, or Subsurface Reservoir | VERIFIED |
| **KPI Strip Cards (8)**| Top Strip | 8 cards | Detailed metric analysis | Each card opens dedicated KPI Analysis Drawer with 7-day trend, drivers & forecast | VERIFIED |
| **Pumpability Card** | Right Sidebar | Card + Arc Gauge | Detailed pumpability view | Opens Pumpability Window Detail Drawer with trajectory, limit factor & actions | VERIFIED |
| **Envelope Card** | Right Sidebar | Card + 2D Canvas | Interactive envelope | Opens Operating Envelope Drawer with SPM vs Temp/Viscosity interactive plot | VERIFIED |
| **Rod & Pump Card** | Right Sidebar | Card + metric rows | SRP diagnostic inspector | Opens SRP Diagnostics Drawer with PPRL, MPRL, rod stress & pump capacity | VERIFIED |
| **Dynamometer Card** | Right Sidebar | Card + Dyno loop | Expanded dyno card | Opens Dynamometer Analysis Drawer with surface/pump loops and load-position table | VERIFIED |
| **Alerts Widget Items**| Right Sidebar | Alert list items | Alert investigation | Opens Alert Detail Drawer with cause, affected subsystem, and Acknowledge action | VERIFIED |
| **"View All" Alerts** | Right Sidebar | Text action | Open Alert Center | Navigates to `/alerts` view | VERIFIED |
| **Trajectory Tabs** | Bottom Row | 1D / 3D / 7D / 14D | Change forecast horizon | Re-renders multi-curve canvas for selected horizon days | VERIFIED |
| **Compare Button** | Bottom Row | Button | Scenario comparison | Navigates to `/scenarios` view | VERIFIED |
| **Full Recommendation**| Bottom Row | Button | Recommendation review | Navigates to `/recommendation` view | VERIFIED |
| **Assurance Fault Demos**| Assurance Page | 5 scenario pills | Test abstain protocol | Injects sensor faults, model divergence, or OOD state; verifies `NO SAFE RECOMMENDATION` | VERIFIED |
| **Approve Setpoint** | Recommendation | Green CTA button | Sign off and issue | Validates assurance gates, updates case to `APPROVED`, records SHA-256 audit entry | VERIFIED |
| **Simulate Outcome** | Calibration Page | Action button | Ingest post-action data | Runs `OutcomeReconciliationEngine`, computes error drift, and updates parameters | VERIFIED |
