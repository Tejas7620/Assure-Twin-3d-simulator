# ASSURE-TWIN: Virtual Downhole Sensor Synthesis

## 1. Subsurface Parameter Architecture
In heavy oil fields like Baghewala, permanent downhole optical or electronic sensors rarely survive thermal cycling ($> 280^\circ\text{ C}$). ASSURE-TWIN synthesizes a complete **Virtual Downhole State** using surface dynamometer cards, wellhead temperatures, casing pressures, and first-principles thermodynamic estimators.

---

## 2. Parameter Catalog & Physics Formulations

### 1. Downhole Perforation Temperature ($T_{dh}$)
- **Formulation**: Ramey-Marx-Langenheim transient heat transfer equation:
  $$T_{dh}(t) = T_{res} + (T_{steam} - T_{res}) \cdot \exp\left(-\lambda \cdot (t - t_{soak})\right) - \Delta T_{loss}$$
- **Units**: $^\circ\text{ C}$
- **Provenance**: `MODEL-DERIVED`
- **Typical Range**: $42^\circ\text{ C} - 280^\circ\text{ C}$

### 2. Flowing Bottomhole Pressure ($P_{wf}$)
- **Formulation**: Hydrostatic balance coupled to dynamic liquid level:
  $$P_{wf} = P_{casing} + \rho_{fluid} \cdot g \cdot (D_{perf} - L_{fluid}) - \Delta P_{friction}$$
- **Units**: $\text{bar}$
- **Provenance**: `MODEL-DERIVED`

### 3. Pump Intake Pressure ($PIP$)
- **Formulation**: Casing pressure plus liquid head above the pump intake depth ($D_{pump} = 950\text{ m}$):
  $$PIP = P_{casing} + \rho_{fluid} \cdot g \cdot (D_{pump} - L_{fluid}) \cdot 10^{-5}$$
- **Units**: $\text{bar}$
- **Provenance**: `MODEL-DERIVED`

### 4. Dynamic Liquid Level ($L_{fluid}$)
- **Formulation**: Derived from polished rod minimum load (MPRL) and buoyancy during upstroke:
  $$L_{fluid} = D_{pump} - \frac{MPRL - W_{rod,buoyant}}{A_{plunger} \cdot \rho_{fluid} \cdot g}$$
- **Units**: $\text{m TVD}$
- **Provenance**: `MODEL-DERIVED`

### 5. In-Situ Crude Viscosity ($\mu_{dh}$)
- **Formulation**: Andrade-Arrhenius thermal rheology calibrated for Baghewala crude:
  $$\mu_{dh}(T) = \mu_{ref} \cdot \exp\left(b \cdot \left(\frac{1}{T_{dh} + 273.15} - \frac{1}{T_{ref} + 273.15}\right)\right)$$
- **Units**: $\text{cP}$
- **Provenance**: `CALIBRATED`

### 6. Subsurface Inflow Rate ($q_{inflow}$)
- **Formulation**: Thermal Vogel inflow performance relationship (IPR):
  $$q_{inflow} = J_{thermal}(T) \cdot (P_R - P_{wf}) \cdot \left[1 - 0.2 \left(\frac{P_{wf}}{P_R}\right) - 0.8 \left(\frac{P_{wf}}{P_R}\right)^2\right]$$
- **Units**: $\text{BOPD}$
- **Provenance**: `MODEL-DERIVED`

### 7. Pump Fillage Fraction ($\eta_{fill}$)
- **Formulation**: Ratio of downhole inflow to theoretical pump displacement:
  $$\eta_{fill} = \min\left(1.0, \frac{q_{inflow}}{V_{disp} \cdot SPM}\right)$$
- **Units**: $\%$
- **Provenance**: `MEASURED` (from dyno card inflection) / `MODEL-DERIVED`

### 8. Annular Rod Drag Force ($F_{drag}$)
- **Formulation**: Couette flow shear stress in the annular clearance between sucker rods and tubing:
  $$F_{drag} = \frac{\pi \cdot d_{rod} \cdot L_{string} \cdot \mu_{dh} \cdot v_{downstroke}}{\delta_{annulus}}$$
- **Units**: $\text{kN}$
- **Provenance**: `MODEL-DERIVED`

### 9. Buoyant Rod Float Margin ($M_{float}$)
- **Formulation**: Net downward force margin during downstroke:
  $$M_{float} = \frac{W_{string,submerged} - F_{drag}}{W_{string,submerged}} \times 100\%$$
- **Units**: $\%$
- **Critical Threshold**: Float hazard triggered when $M_{float} < 10\%$.

### 10. Subsurface Productivity Index ($PI_{sub}$)
- **Formulation**: Normalized pressure-drawdown productivity factor:
  $$PI_{sub} = \frac{q_{liquid}}{P_R - P_{wf}}$$
- **Units**: $\text{BOPD/bar}$
- **Provenance**: `CALIBRATED`
