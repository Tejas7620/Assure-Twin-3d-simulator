# PROBLEM_DEFINITION.md
## Technical Problem Definition: The Heavy Oil Dilemma of Baghewala Field

**Asset:** Baghewala Field, Bikaner-Nagaur Basin, Rajasthan (ONGC / OIL)  
**Formation:** Jodhpur Sandstone (Permo-Carboniferous)  
**Problem Statement ID:** SIH26120  

---

### 1. Reservoir & Fluid Characteristics
The Baghewala heavy oil reservoir presents one of the most hostile artificial-lift operational environments in upstream petroleum engineering:
- **API Gravity:** $14^\circ \text{ to } 19^\circ\text{ API}$ (classified as extra-heavy crude/bitumen).
- **Dead Crude Viscosity:** Exceeds **$10,000\text{ cP}$** (centipoise) at initial native reservoir temperature ($42^\circ\text{ C}$). At this viscosity, the oil has the consistency of cold asphalt and cannot flow naturally into a wellbore.
- **Reservoir Depth:** Approximately $1,000 \text{ to } 1,100\text{ m}$ True Vertical Depth (TVD).

### 2. Dual Recovery Mechanisms: CSS + SRP
To extract this immobile crude, operators employ a two-stage thermal and mechanical recovery method:
1. **Cyclic Steam Stimulation (CSS / "Huff-and-Puff"):**
   - High-temperature saturated steam ($>280^\circ\text{ C}$, $80\%\text{ quality}$, $120\text{ bar}$) is injected down the wellbore into the formation for 7–12 days.
   - The well is shut in for 3–5 days to "soak", allowing heat to conductively transfer into the rock matrix.
   - Near-wellbore temperature rises from $42^\circ\text{ C}$ to over $180^\circ\text{ C}$, slashing heavy oil viscosity exponentially from $10,000\text{ cP}$ down to $300\text{--}500\text{ cP}$.
2. **Sucker Rod Pumping (SRP):**
   - The well is opened to production, and a surface beam pumping unit reciprocates a 1,000 m long steel sucker-rod string connected to a positive-displacement downhole pump.

### 3. The Uncoupled Operational Breakdown
In current field operations, CSS thermal scheduling and SRP surface pumping are managed by **two separate engineering departments** with no coupled dynamic intelligence:

#### Problem A: Rod Floating & Compressive Buckling
During the production phase of CSS, the formation conductively loses heat to the cold surrounding overburden formations. The near-wellbore cools from $180^\circ\text{ C}$ down to $65^\circ\text{ C}$ over 40–60 days, causing in-situ viscosity to rebound exponentially ($400\text{ cP} \rightarrow 3,500\text{ cP} \rightarrow 8,000\text{ cP}$).

If the surface beam pump continues pumping at standard speeds ($3.5\text{--}5.0\text{ SPM}$), the downward stroke velocity of the sucker rods through viscous crude creates massive annular Couette shear drag:
$$F_\text{drag} = \frac{\pi \cdot d_\text{rod} \cdot L \cdot \mu \cdot v_\text{rod}}{\delta}$$
When $F_\text{drag} \ge W_\text{buoyant}$ (the submerged buoyant weight of the rods):
- The rod string **floats** on the downstroke.
- The carrier bar and polished rod drop faster than the rod string, leaving the bridle lines slack.
- When the walking beam reverses direction at the bottom of the stroke, the falling rod string violently impacts the rising carrier bar.
- The rod string undergoes severe **helical compressive buckling** against the tubing wall, causing rapid fatigue, rod-parting snaps, and tubing wear.
- **Financial Cost:** Each rod failure costs **₹35–50 Lakhs in workover rig operations**, replaces 1,000 m of damaged tubulars, and halts production for 2 to 3 weeks.

#### Problem B: Thermal Waste & High SOR
Fearing rod failure, operators often rush to re-steam the well prematurely. Injecting thousands of tons of high-pressure steam before the reservoir's thermal enthalpy is depleted wastes massive volumes of treated boiler feedwater and natural gas fuel, driving the **Steam-to-Oil Ratio (SOR)** above $5.0\text{ m}^3/\text{m}^3$, which damages project economics and produces thousands of tons of unnecessary greenhouse gas emissions.

### 4. Why CSS Alone is Not Enough
Tuning CSS thermal parameters only controls heat input; it cannot prevent mechanical rod float during the long production tail when the formation inevitably cools.

### 5. Why SRP Tuning Alone is Not Enough
Slowing down the beam pump (lowering SPM) prevents rod float by reducing drag, but if done without thermal coordination, oil drainage rates collapse, production stagnates, and the well prematurely freezes up.

### 6. Why They Must Be Coupled
**Thermal state dictates mechanical limits.** The permissible speed and stroke of an SRP unit are fundamentally bounded by the time-varying viscosity of the crude, which is governed by reservoir thermal decline. Only a coupled, forward-simulating digital twin can optimize steam cycling and mechanical pumping simultaneously.
