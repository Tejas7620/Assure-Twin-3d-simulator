# ASSURE-TWIN: Forward Pumpability Horizon & Boundary Forecasting

## 1. Executive Definition
**Pumpability Horizon** is the deterministic number of operational days remaining before wellbore cooling, fluid level decline, or viscosity increase drives the operating point across an unfavorable mechanical boundary.

Unlike static alarms that sound *after* the rod string has buckled or the pump has pumped off, ASSURE-TWIN projects the forward thermo-mechanical trajectory to provide days of advance warning.

---

## 2. Calculation Methodology

1. **State Projection**:
   Forward time discretization $t_k = t_0 + k \cdot \Delta t$ ($k \in [1, 14]$ days).
   $$T_{dh}(t_k) = T_{res} + (T_{dh}(t_0) - T_{res}) \cdot \exp\left(-\lambda \cdot k\right)$$
   $$\mu_{dh}(t_k) = \mu(T_{dh}(t_k))$$

2. **Boundary Testing**:
   At each step $k$, evaluate:
   - Floating Margin: $M_{float}(t_k) < 10\%$
   - Minimum Fillage: $\eta_{fill}(t_k) < 30\%$
   - Maximum Load: $PPRL(t_k) > 65.0\text{ kN}$

3. **Time to Crossing**:
   The pumpability horizon $t_{horizon}$ is defined as:
   $$t_{horizon} = \min \left\{ t_k \mid \text{Violation}(t_k) = \text{TRUE} \right\}$$

---

## 3. Decision Integration

- **Horizon $> 14\text{ Days}$**: Pumpability is **HEALTHY**. Normal production scheduling proceeds.
- **$3\text{ Days} \le \text{Horizon} \le 14\text{ Days}$**: Pumpability is in **TRANSITION / WARNING**. The system alerts the engineer and initiates digital rehearsal for joint CSS+SRP optimization.
- **$\text{Horizon} < 3\text{ Days}$**: Pumpability is **CRITICAL**. Urgent intervention recommended: immediately reduce SPM or mobilize cyclic steam injection.
