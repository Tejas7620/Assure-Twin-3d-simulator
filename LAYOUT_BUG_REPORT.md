# Layout Bug Report & Right Sidebar Clipping Analysis

## 1. Observed Problem
In the Overview page workstation view:
- The right sidebar containing `PUMPABILITY WINDOW`, `THERMO-MECHANICAL ENVELOPE`, `ROD & PUMP STATUS`, `DYNAMOMETER CARD`, and `ALERTS` suffered vertical clipping and partial truncation.
- Lower cards and content within cards (e.g. Dynamometer axes, Alerts list items, Rod load numbers) were cut off or inaccessible without window-level scrolling.
- At common viewport heights ($720\text{px}-768\text{px}$), the cards did not fit and could not be scrolled independently from the central 3D scene.

---

## 2. Root Cause Analysis

### Component Hierarchy
```text
#workstation-root (100vw, 100vh, flex-column, overflow: hidden)
├── .ws-header (height: 52px, flex-shrink: 0)
├── .ws-kpi-strip (padding: 8px 12px, flex-shrink: 0)
└── .ws-body (flex: 1, height: calc(100vh - 118px), display: flex, overflow: hidden)
    ├── .ws-left-nav (width: 165px, flex-shrink: 0)
    └── .ws-content-area (flex: 1, overflow-y: auto)
        └── .ws-overview-grid (display: grid, grid-template-rows: minmax(420px, 1fr) auto)
            ├── .ws-overview-top-row (display: grid, grid-template-columns: 260px 1fr 295px)
            │   ├── .ws-controls-col
            │   ├── .ws-viewport-col (houses 3D mount)
            │   └── .ws-right-col (houses the 5 engineering cards)
            └── .ws-overview-bottom-row (Trajectory, Scenarios, Recommendation)
```

### Primary CSS & Layout Root Causes
1. **Unconstrained Grid Track Height without `min-height: 0`**:
   - In CSS Grid specifications, grid items default to `min-height: auto`. When `.ws-overview-top-row` is placed inside `.ws-overview-grid`, `.ws-right-col` defaults to sizing to its full content height ($\approx 680\text{px}$).
   - Because `.ws-overview-top-row` lacked an explicit constrained height and `min-height: 0`, `.ws-right-col` was not forced to calculate an overflow height, preventing its internal `overflow-y: auto` from engaging properly until it exceeded the overall grid boundary.
2. **Double Scroll & Page Overflow**:
   - `.ws-content-area` had `overflow-y: auto`. When `.ws-overview-grid` exceeded the body height, the entire page would attempt to scroll, moving the central 3D viewport out of view while leaving the cards half-visible.
3. **Fixed Canvas Dimensions Inside Cards**:
   - Canvases in `PumpabilityGauge`, `EnvelopeCanvas`, and `DynoCardCanvas` had fixed pixel attributes (`width="260" height="110"`) and inline CSS (`height: 80px`, `height: 130px`) that prevented flex compression on compact vertical screens.

---

## 3. Architecture of the Fix

### A. Independent Right Sidebar Scroll Container
1. Give `.ws-right-col`:
   ```css
   height: 100%;
   min-height: 0;
   overflow-y: auto;
   overflow-x: hidden;
   padding-right: 4px;
   ```
2. Give `.ws-overview-top-row`:
   ```css
   display: grid;
   grid-template-columns: 260px minmax(0, 1fr) 300px;
   gap: 10px;
   min-height: 0;
   height: 100%;
   ```
3. Give `.ws-overview-grid`:
   ```css
   display: grid;
   grid-template-rows: minmax(0, 1fr) auto;
   gap: 10px;
   padding: 10px;
   height: 100%;
   min-height: 0;
   overflow: hidden;
   ```
4. This guarantees:
   - Header is locked in place.
   - KPI strip is locked in place.
   - Left controls column is locked in place.
   - Central 3D simulator is locked in place with zero page jitter or scroll drift.
   - Right sidebar scrolls smoothly from top to bottom through all 5 cards (`Pumpability`, `Envelope`, `Rod & Pump Status`, `Dyno Card`, `Alerts`).

### B. Natural Card Sizing & Responsiveness
- Remove arbitrary rigid heights on card shells.
- Let cards take their natural content height with crisp internal padding.
- Provide custom styling for the right sidebar scrollbar (`scrollbar-width: thin; scrollbar-color: rgba(56, 189, 248, 0.4) transparent`).
