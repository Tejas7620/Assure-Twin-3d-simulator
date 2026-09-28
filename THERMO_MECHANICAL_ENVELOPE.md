# ASSURE-TWIN: Dynamic Thermo-Mechanical Operating Envelope

## 1. Concept: "The Safe Window Moves With The Well"
Conventional sucker rod pumping operates with static surface alarm thresholds (e.g. constant SPM limits or fixed peak load cutoffs). In Cyclic Steam Stimulation (CSS), this is fatally flawed:
- When the well is hot ($T_{dh} \approx 140^\circ\text{ C}$), crude viscosity is low ($\approx 80\text{ cP}$), and the unit can pump safely at $4.5\text{ SPM}$.
- As the well cools toward native conditions ($T_{dh} \approx 65^\circ\text{ C}$), viscosity surges exponentially ($> 3,000\text{ cP}$). The maximum permissible pumping speed drops to $< 1.8\text{ SPM}$ before rod float occurs.

ASSURE-TWIN computes a **dynamic, moving 2D operating envelope** in real time.

---

## 2. Mathematical Boundary Formulations

### 1. Upper Ceiling: Rod Float Hazard Boundary ($SPM_{max,float}$)
During downstroke, the rod string falls by gravity against fluid resistance:
$$W_{submerged} - F_{drag}(SPM, \mu) \ge M_{min} \cdot W_{submerged}$$
Solving for maximum pump speed:
$$SPM_{max,float}(T_{dh}) = \frac{(1 - M_{min}) \cdot W_{submerged} \cdot \delta_{annulus}}{\pi \cdot d_{rod} \cdot L \cdot \mu_{dh}(T_{dh}) \cdot C_{kinematics}}$$

As $T_{dh} \downarrow$, $\mu_{dh} \uparrow$, and $SPM_{max,float}$ contracts downwards.

### 2. Lower Floor: Pump Fillage & Inflow Match ($SPM_{min}$)
To prevent fluid pound and maintain economic lift:
$$SPM_{min} = \frac{q_{inflow}(T_{dh}, P_{wf})}{V_{disp} \cdot \eta_{fill,target}}$$

### 3. Structural Ceiling: Peak Polished Rod Load ($PPRL \le PPRL_{rating}$)
$$PPRL = W_{rod,buoyant} + F_{fluid} + F_{drag} + F_{accel} \le 65.0\text{ kN}$$

---

## 3. Envelope Status Classifications

| Zone | Condition | System Action |
|:---|:---|:---|
| **Safe / Preferred** | Inside green boundary ($M_{float} > 25\%$, $\eta_{fill} > 60\%$) | Steady-state operation; setpoint fine-tuning allowed. |
| **Warning** | Margin between $10\%$ and $25\%$ | Early advisory issued; prompt engineer to prepare CSS mobilization. |
| **Critical** | Violation of rod-float floor ($M_{float} < 10\%$) or $PPRL > 65\text{ kN}$ | Immediate intervention required; speed derate or steam cycle trigger. |
