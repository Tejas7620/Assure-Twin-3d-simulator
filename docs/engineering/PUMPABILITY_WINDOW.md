# PUMPABILITY_WINDOW.md
## Predictive Pumpability Window

In heavy oil well management, waiting for an alarm to sound before reacting is too late. The **Predictive Pumpability Window** is ASSURE-TWIN's proactive early-warning mechanism that computes the exact operational countdown (in days) remaining before reservoir thermal depletion forces an emergency well shutdown.

---

### 1. What Does "Pumpability" Mean?
Pumpability is the physical capacity of the downhole sucker rod system to continue lifting fluid without undergoing mechanical failure. A well is defined as **Pumpable** if and only if:
1. Downstroke buoyant rod float margin $M_\text{float} \ge 10\%$.
2. Reservoir inflow sustains downhole pump fillage $\eta_\text{fill} \ge 65\%$.
3. Near-wellbore temperature $T_\text{dh} \ge 60^\circ\text{ C}$ (above the bitumen solidification floor).

---

### 2. How the Window is Mathematically Predicted
The pumpability window $\tau_\text{window}$ is not an arbitrary timer; it is the **forward time-to-boundary** computed by forward simulation:

$$\tau_\text{window} = \min \left\{ t > 0 \;\middle|\; M_\text{float}(t) = 10\% \quad \text{OR} \quad T_\text{dh}(t) = 60^\circ\text{C} \right\}$$

- The forward forecasting engine (`backend/app/forecast/service.py`) advances the coupled thermal-viscosity differential equation forward in daily steps:
  $$T_\text{dh}(t) = T_R + (T_\text{current} - T_R) \cdot \exp\left(-\frac{t}{\tau_\text{decay}}\right)$$
  $$\mu_\text{dh}(t) = \text{Andrade}\left(T_\text{dh}(t)\right)$$
  $$F_\text{drag}(t) = \text{Couette}\left(\mu_\text{dh}(t), SPM\right)$$
  $$M_\text{float}(t) = \frac{W_\text{buoyant} - F_\text{drag}(t)}{W_\text{buoyant}} \times 100\%$$
- The system finds the exact day $t^*$ where $M_\text{float}(t^*) = 10\%$.
- The resulting value $\tau_\text{window} = t^*$ is rendered on the radial gauge.

---

### 3. What Causes the Window to Contract?
1. **Accelerated Cooling:** Higher water production or cold water breakthrough dissipates near-wellbore heat faster, shortening the window.
2. **Speed Increases:** Raising the surface pumping speed ($SPM$) increases downward rod velocity ($v_\text{rod}$), which immediately inflates Couette shear drag and causes the float floor to be breached sooner.
3. **Viscosity Anomalies:** Paraffin buildup or emulsion formation thickens the fluid, contracting the window rapidly.

---

### 4. UI Representation & Risk States
On the **Overview** dashboard (top of the right intelligence panel), the window is visualized as a radial arc gauge:
- **0 to 5 Days:** `CRITICAL` (Flashing Red) $\rightarrow$ Mandatory intervention required; system initiates Abstain protocol if speed is not derated.
- **5 to 15 Days:** `WATCH` (Amber) $\rightarrow$ Prepare steam generation equipment; rehearse CSS scheduling.
- **15+ Days:** `OPTIMAL` (Green) $\rightarrow$ Normal production within safe thermal margins.

### 5. What the Judge Should Understand
> *"Judges, this radial gauge is not showing a sensor value. It is showing a predictive time-to-failure countdown. It tells the production superintendent: 'At your current pump speed, you have exactly 8 days before cold crude snaps your rod string. You must either slow the pump down or order steam injection today.'"*
