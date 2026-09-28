# PHYSICS_ENGINE.md
## First-Principles Physics Engine & Engineering Formulations

ASSURE-TWIN avoids empirical guesswork by anchoring all predictions and operational boundaries in established petroleum and mechanical engineering standards: **Marx-Langenheim reservoir thermodynamics, Andrade rheology, Vogel/Darcy inflow, API RP 11L sucker-rod dynamics, and API Spec 11E beam kinematics.**

---

### 1. Reservoir Thermodynamics: Marx-Langenheim Model
- **Code Location:** `backend/app/physics/thermal.py`
- **Inputs:** Steam injection rate ($Q_\text{steam}$ in TPD), steam temperature ($T_s = 280^\circ\text{ C}$), steam quality ($80\%$), formation thickness ($h_t = 12\text{ m}$), rock volumetric heat capacity ($M_R$).
- **Formulation:**
  The heated reservoir area $A(t)$ and thermal front radius $r_\text{th}(t)$ are modeled by the Marx-Langenheim formulation:
  $$A(t) = \frac{Q_0 \cdot M_R \cdot h_t}{4 k_h (T_s - T_R)} \cdot \left[e^{t_D} \cdot \text{erfc}(\sqrt{t_D}) + 2\sqrt{\frac{t_D}{\pi}} - 1\right]$$
  where dimensionless time is $t_D = \frac{4 k_h t}{M_R^2 h_t^2}$.
  During production, conductive cooling to the overburden is modeled with Boberg-Lantz decay:
  $$T_\text{dh}(t) = T_R + (T_\text{peak} - T_R) \cdot \exp\left(-\frac{t}{\tau_\text{decay}}\right)$$
- **Outputs:** Near-wellbore temperature ($T_\text{dh}$ in $^\circ\text{C}$), thermal front radius ($r_\text{th}$ in meters), and remaining thermal enthalpy reserve (%).
- **Why it Matters:** Governs the rate of temperature decline, which dictates when heavy crude begins to freeze up.

---

### 2. Heavy-Oil Rheology: Andrade Temperature-Viscosity Relation
- **Code Location:** `backend/app/physics/thermal.py:viscosity_andrade`
- **Inputs:** Near-wellbore temperature ($T_\text{dh}$), reference viscosity ($\mu_\text{ref} = 10,000\text{ cP}$ at $T_\text{ref} = 42^\circ\text{ C}$), activation energy exponent ($b = 4,200\text{ K}$).
- **Formulation:**
  $$\mu_\text{dh}(T) = \mu_\text{ref} \cdot \exp\left(b \cdot \left(\frac{1}{T_\text{dh} + 273.15} - \frac{1}{T_\text{ref} + 273.15}\right)\right)$$
- **Outputs:** Dynamic in-situ viscosity ($\mu_\text{dh}$ in $\text{cP}$).
- **Why it Matters:** Captures the exponential drop in crude viscosity under steam (from $10,000\text{ cP}$ down to $400\text{ cP}$) and its steep rise during cooling.

---

### 3. Subsurface Inflow Performance: Vogel & Darcy Composite IPR
- **Code Location:** `backend/app/physics/inflow.py`
- **Inputs:** Average reservoir pressure ($P_\text{res}$), flowing bottomhole pressure ($P_\text{wf}$), bubble point pressure ($P_b$), formation permeability ($k$), dynamic viscosity ($\mu_\text{dh}$).
- **Formulation:**
  For saturated heavy-oil flow ($P_\text{wf} < P_b$), Vogel's empirical IPR is coupled with viscosity mobility ($k/\mu_\text{dh}$):
  $$q_o = q_{o,\text{max}} \cdot \left[1 - 0.2 \cdot \left(\frac{P_\text{wf}}{P_\text{res}}\right) - 0.8 \cdot \left(\frac{P_\text{wf}}{P_\text{res}}\right)^2\right] \cdot \left(\frac{\mu_\text{ref}}{\mu_\text{dh}}\right)$$
- **Outputs:** Reservoir liquid inflow rate ($q_\text{inflow}$ in $\text{m}^3/\text{day}$ and $\text{BOPD}$), dynamic fluid level, and Pump Intake Pressure ($PIP$).
- **Why it Matters:** Predicts how much fluid actually drains into the wellbore at any given temperature, preventing pump starvation.

---

### 4. Positive-Displacement Downhole Pump Mechanics
- **Code Location:** `backend/app/physics/pump.py`
- **Inputs:** Pump plunger diameter ($D_p = 2.25''$), stroke length ($S$), pumping speed ($SPM$), reservoir inflow ($q_\text{inflow}$).
- **Formulation:**
  $$\text{Theoretical Displacement: } V_\text{theor} = 0.1166 \cdot D_p^2 \cdot S \cdot SPM \quad (\text{BPD})$$
  $$\text{Pump Fillage: } \eta_\text{fill} = \min\left(1.0, \frac{q_\text{inflow}}{V_\text{theor}}\right)$$
- **Outputs:** Pump volumetric fillage ($\eta_\text{fill}$ %), actual surface liquid lifted ($\text{BPD}$), standing and traveling valve states.
- **Why it Matters:** Low fillage ($\eta_\text{fill} < 65\%$) causes destructive "fluid pound" where the plunger slams into liquid on the downstroke, causing severe rod shock.

---

### 5. Sucker-Rod Dynamics & Annular Couette Shear Drag
- **Code Location:** `backend/app/twin/time_stepper.py`
- **Inputs:** Sucker rod string length ($L = 1,000\text{ m}$), rod diameter ($d_r$), tubing inner diameter ($D_t$), crude viscosity ($\mu_\text{dh}$), downward rod velocity ($v_\text{rod}$).
- **Formulation:**
  As the rod string descends through viscous crude in the narrow annular clearance $\delta = (D_t - d_r)/2$, it experiences viscous Couette shear resistance:
  $$F_\text{drag} = \frac{\pi \cdot d_r \cdot L \cdot \mu_\text{dh} \cdot v_\text{rod}}{\delta}$$
  The downward buoyant weight of the steel rod string is:
  $$W_\text{buoyant} = W_\text{air} \cdot \left(1 - \frac{\rho_\text{fluid}}{\rho_\text{steel}}\right)$$
  The **Downstroke Buoyant Float Margin** is strictly defined as:
  $$M_\text{float} = \frac{W_\text{buoyant} - F_\text{drag}}{W_\text{buoyant}} \times 100\%$$
- **Outputs:** Downstroke drag force ($F_\text{drag}$ in $\text{kN}$), net rod tension, and float margin ($M_\text{float}$ %).
- **Why it Matters:** If $M_\text{float} \le 0\%$, the rod string floats, compressive buckling occurs, and the string parts. ASSURE-TWIN enforces a strict safety floor of $M_\text{float} \ge 10\%$.

---

### 6. Surface API Spec 11E 4-Bar Linkage Kinematics
- **Code Location:** `src/kinematics/PumpjackKinematics.ts`
- **Inputs:** Pumping speed ($SPM$), crank radius ($R_\text{crank}$), pitman length ($L_\text{pitman}$), walking beam front/rear dimensions ($A, C$).
- **Formulation:**
  Solves the trigonometric circle-circle intersection for the equalizer pin position $(x_E, y_E)$:
  $$(x_E - x_\text{pivot})^2 + (y_E - y_\text{pivot})^2 = C^2$$
  $$(x_E - x_\text{crankPin})^2 + (y_E - y_\text{crankPin})^2 = L_\text{pitman}^2$$
  Yielding exact beam pitch angle $\theta_\text{beam}(t)$ and polished rod vertical position $y_\text{rod}(t) = A \cdot \sin(\theta_\text{beam})$.
- **Outputs:** Closed-form joint positions for walking beam, pitman, horsehead, and polished rod on every frame.
- **Why it Matters:** Eliminates graphical jitter; guarantees that 3D visuals match mechanical engineering truth across all speeds.

---

### 7. Field Economics & Steam-to-Oil Ratio (SOR)
- **Code Location:** `backend/app/physics/economics.py`
- **Inputs:** Daily oil produced ($q_o$ in bbl), cumulative steam injected ($V_\text{steam}$ in tons), oil price ($\$75/\text{bbl}$), steam fuel cost ($\$22/\text{ton}$), electricity tariff ($\$0.12/\text{kWh}$).
- **Formulation:**
  $$\text{Instantaneous SOR} = \frac{\text{Daily Steam Mass (tons)}}{\text{Daily Oil Produced (tons)}}$$
  $$\text{Daily Net Profit} = (q_o \cdot P_\text{oil}) - (\text{Steam Used} \cdot C_\text{steam}) - (\text{Power Consumed} \cdot C_\text{elec})$$
- **Outputs:** Daily Net Profit ($\$/\text{day}$) and Steam-to-Oil Ratio ($\text{m}^3/\text{m}^3$).
- **Why it Matters:** Direct economic optimization ensuring thermal steam is injected only when financially profitable.
