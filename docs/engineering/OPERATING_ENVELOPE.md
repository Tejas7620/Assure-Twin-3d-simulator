# OPERATING_ENVELOPE.md
## Dynamic Thermo-Mechanical Operating Envelope

In standard petroleum SCADA systems, operational alarms are static: for instance, a warning is configured if pumping speed exceeds $6.0\text{ SPM}$. In heavy oil operations, **static operational limits are dangerously obsolete.**

ASSURE-TWIN introduces the **Dynamic Thermo-Mechanical Operating Envelope**: a moving, two-dimensional operating space that continuously recomputes permissible pumping speeds based on real-time reservoir temperature and fluid rheology.

---

### 1. Why Static Limits Cause Well Parting
In a normal light-oil well, crude viscosity is low ($5\text{--}10\text{ cP}$) and relatively insensitive to temperature. A pumpjack can run at $5\text{ SPM}$ year-round.

In Baghewala heavy crude:
- At Day 5 after steam injection ($160^\circ\text{ C}$), crude viscosity is $350\text{ cP}$. The rod string easily cuts through the liquid. Pumping at $6.5\text{ SPM}$ is safe and productive.
- By Day 40 ($70^\circ\text{ C}$), crude viscosity has surged to $2,800\text{ cP}$. The same $6.5\text{ SPM}$ creates massive viscous drag on the downstroke, causing the rods to float, buckle, and snap.
- **A speed that was perfectly safe on Day 5 is catastrophic on Day 40.**

---

### 2. Physical Formulation of the Dynamic Boundary
The upper boundary of the safe operating envelope ($SPM_\text{max}$) is governed by the condition where downward buoyant rod weight exceeds upward Couette shear drag by at least the $10\%$ safety floor:

$$W_\text{buoyant} - F_\text{drag}(SPM_\text{max}, \mu_\text{dh}) \ge 0.10 \cdot W_\text{buoyant}$$

Substituting Annular Couette drag:
$$F_\text{drag} = \frac{\pi \cdot d_r \cdot L \cdot \mu_\text{dh}(T) \cdot v_\text{rod}(SPM)}{\delta}$$

Since rod velocity is directly proportional to stroke length ($S$) and speed ($SPM$):
$$v_\text{rod} \propto S \cdot SPM$$

We solve explicitly for the maximum permissible speed:
$$SPM_\text{max}(T) = \frac{0.90 \cdot W_\text{buoyant} \cdot \delta}{\pi \cdot d_r \cdot L \cdot \mu_\text{dh}(T) \cdot k_\text{kinematic}}$$

As near-wellbore temperature ($T$) drops, viscosity $\mu_\text{dh}(T)$ rises exponentially, causing $SPM_\text{max}$ to **contract downwards day-by-day**.

---

### 3. The Three Operating Zones
The 2D envelope divides the operating space into three color-coded regimes:
1. **Preferred Zone (Green):** $M_\text{float} \ge 25\%$, fillage $75\%\text{--}95\%$, gearbox torque $\le 70\%$. Optimal balance of production and equipment longevity.
2. **Safe Zone (Amber):** $10\% \le M_\text{float} < 25\%$, fillage $65\%\text{--}75\%$. Mechanically safe, but indicates approaching thermal limits; requires close monitoring.
3. **Unsafe Zone (Red):** $M_\text{float} < 10\%$ OR Gearbox torque $> 85\%$. Severe risk of compressive rod buckling, fluid pound shock, or fatigue failure.

---

### 4. How the UI Visualizes the Envelope
On the **Overview** dashboard (and in the dedicated **Operating Envelope** view), the envelope is rendered as an interactive 2D canvas:
- **X-Axis:** Simulation Time (Days) / Near-Wellbore Temperature ($^\circ\text{C}$).
- **Y-Axis:** Pumping Speed ($SPM$).
- **Features:**
  - Shaded bands representing Preferred (green), Caution (amber), and Unsafe (red) regimes.
  - A bright white node indicating the **Current Operating Setpoint**.
  - A dashed projected trajectory line showing where the current setpoint will travel over the next 30 days as cooling continues.
- **Judge Explanation:** *"Judges, look at this white dot. Today it sits safely in the green zone. But look at the trajectory line: as the well cools over the next 18 days, the green zone collapses downward, and without intervention, this white dot will cross into the red hazard zone. ASSURE-TWIN gives the operator advance visibility of this collision."*
