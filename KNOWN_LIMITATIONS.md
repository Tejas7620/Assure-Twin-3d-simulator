# ASSURE-TWIN: Known Limitations & Field-Data Dependencies

## 1. Zero-Fabrication Disclosure
In strict adherence to the master specification, **no actual field results from the Baghewala oilfield are claimed that have not been physically gathered**. All demonstrations use calibrated mathematical physics models, synthetic well profiles (`BGW-17A`), and simulated SCADA telemetry.

---

## 2. Engineering & Physical Assumptions

1. **Marx-Langenheim Radial Heat Loss**:
   - Assumes radial thermal symmetry around the wellbore with uniform overburden/underburden thermal conductivity ($K_{rock} = 1.73\text{ W/m}\cdot\text{K}$).
   - Does not currently model 3D geological reservoir fractures, steam gravity override fingering, or thief zones.

2. **Single-Phase / Pseudo-Homogeneous Heavy Oil Rheology**:
   - Andrade rheological formulation models pure bitumen/oil viscosity reduction as a function of temperature.
   - Emulsion inversion points (water-in-oil vs oil-in-water emulsions formed during high-temperature steam condensation) are represented using an empirical emulsion viscosity multiplier, not full CFD multiphase rheology.

3. **Incompressible Rod String Approximation**:
   - The sucker rod mechanical model computes peak polished rod load ($PPRL$), minimum load ($MPRL$), and viscous annular Couette drag using quasi-steady-state wave mechanics.
   - Full 1D damped acoustic wave equation (Gibbs equation) is computed via discretized Fourier coefficients rather than ultra-fine finite-element spatial discretization.

4. **Surface Telemetry Resolution**:
   - The current demonstration normalizes telemetry at $1\text{ Hz}$. Field SCADA polling frequencies below $0.1\text{ Hz}$ would require interpolation smoothing.

---

## 3. Remaining Field-Data Dependencies for Production Deployment

To transition ASSURE-TWIN from this fully functional digital twin demonstration to commercial autonomous wellsite execution, the following field data connections must be provisioned:

1. **OPC-UA / MQTT SCADA Gateway**:
   - Real-time connector to surface Variable Frequency Drives (VFD) for automated SPM setpoint transmission.
   - Real-time load cell and polished rod position encoder feed for dynamometer card stream ingestion.

2. **Well-Specific PVT & Core Fluid Samples**:
   - Laboratory rotational rheometer data (viscosity vs. temperature from $30^\circ\text{ C}$ to $280^\circ\text{ C}$) for individual wellbore zones to fine-tune the Andrade parameters ($b$ and $\mu_{ref}$).

3. **Steam Plant Integration**:
   - Surface steam generator telemetry (steam mass rate, enthalpy, boiler pressure, and dry steam quality $X_{steam}$) to replace static injection estimates.

4. **Downhole Memory Gauge Calibrations**:
   - Periodic acoustic fluid level sounder surveys (echometer) and slickline memory gauge runs during workovers to calibrate the Virtual Downhole State Estimator.
