ASSURE-TWIN

Decision-Assured Well-to-Surface Digital Twin for CSS + SRP Operations

Smart India Hackathon 2026 — Problem Statement SIH26120
Team: VisionX$
Team ID: 140280
Field: Baghewala, Rajasthan
Theme: Smart Automation
Category: Software

Simulate the consequence before changing the well.

ASSURE-TWIN is a cyber-physical digital twin concept and prototype for heavy-oil well operations at Baghewala Field. It couples reservoir thermal behavior, heavy-oil rheology, wellbore and sucker-rod mechanics, SRP behavior, production response, and CSS/SRP optimization into a single decision workflow.

The goal is not to replace engineers with an autonomous AI controller. The system is designed as an advisory-first engineering decision-support platform that forecasts the consequences of operating changes, rehearses candidate decisions, checks them against dynamic thermo-mechanical limits, and either produces an explainable recommendation or explicitly returns NO SAFE RECOMMENDATION.

1. Why ASSURE-TWIN?

Baghewala produces heavy crude from the Jodhpur Sandstone. Heavy-oil viscosity and thermal behavior make mobility and artificial-lift performance strongly dependent on the thermal state of the well.

The operational problem addressed by ASSURE-TWIN is the interaction between:

CSS thermal stimulation and cooling/heat-loss behavior

rising viscosity during thermal decline

SRP speed and stroke selection

rod loading, drag, and floating risk

pump fillage and inflow limitations

production, steam use, energy, and operating cost

A CSS decision and an SRP decision should not be treated as unrelated settings when the thermal state of the fluid affects pumpability and mechanical behavior.

ASSURE-TWIN therefore follows a coupled workflow:

Well / Historical / Synthetic Data
              ↓
       Current Well State
              ↓
       Coupled Physics Twin
              ↓
        Future Forecast
              ↓
   Pumpability + Safe Envelope
              ↓
       Decision Rehearsal
              ↓
     CSS + SRP Optimization
              ↓
       Assurance / OOD
              ↓
   ┌──────────┴──────────┐
   ↓                     ↓
RECOMMEND            ABSTAIN
   ↓                     ↓
Engineer Approval   NO SAFE RECOMMENDATION
              ↓
       Report / Audit Trail
              ↓
      Outcome Reconciliation
              ↓
          Calibration

2. Core Capabilities

Interactive 3D Petroleum Digital Twin

The prototype includes a Three.js WebGL-based 3D environment for visualizing the well and surface equipment. The audited implementation includes a surface pumpjack, transparent/subsurface wellbore representation, downhole components, thermal visualization, and dynamometer-related views.

The 3D environment is intended to be synchronized with the same canonical well state used by the engineering analytics rather than functioning as a decorative animation.

Coupled Multi-Domain Physics

The project contains a coupled physics time-stepper linking relevant subsurface and artificial-lift behavior, including:

reservoir thermal decay/heating

crude viscosity/rheology behavior

inflow / production response

pump fillage

wellbore and rod mechanics

SRP kinematics

production and operating metrics

Published/established engineering formulations referenced by the project include Marx-Langenheim thermal decay and API RP 11L rod mechanics.

Joint CSS + SRP Optimization

The system can evaluate coupled operating choices rather than independently tuning CSS and SRP.

The optimization workflow considers trade-offs such as:

oil production

steam use / SOR

energy use

mechanical risk

float margin

pump fillage

operating constraints

The current implementation uses the project's existing scientific Python optimization stack rather than the older PPT's DEAP claim.

Dynamic Thermo-Mechanical Operating Envelope

The safe operating region is not treated as a fixed SPM limit.

The prototype calculates an operating envelope that changes with the well's modeled thermal/mechanical state. As the reservoir cools and viscosity changes, the acceptable SRP operating window can contract.

The UI presents this as:

Unsafe region

Caution region

Safe region

Preferred operating region

Current setpoint

Projected trajectory

Predictive Pumpability Window

The pumpability subsystem forward-simulates well behavior to estimate when the current operating trajectory approaches an unfavorable condition such as reduced pump fillage or increased rod-floating risk.

The result is presented as a forward-looking time window rather than only a current alarm.

Decision Rehearsal Sandbox

Before changing an operating setpoint, the user can rehearse the proposed decision inside an isolated copy of the current well state.

The intended workflow is:

Current State
     ↓
Proposed CSS / SRP Change
     ↓
30-Day Forward Rehearsal
     ↓
Forecast
     ↓
Constraints + Risk
     ↓
Assurance
     ↓
Recommendation / Rejection

A rehearsal must not mutate the live/base well state.

12-Point Assurance Gate

A deterministic engineering gate checks candidate recommendations against the supported safety, consistency, and model-validity conditions.

Depending on the current state, the gate can return:

PASS

WARN

FAIL

NO SAFE RECOMMENDATION

The assurance result is backend-authoritative; the frontend is responsible for explaining the result, not overriding it.

Abstain Protocol — NO SAFE RECOMMENDATION

ASSURE-TWIN is explicitly designed not to force a recommendation when the system cannot justify one.

Possible reasons include supported conditions such as:

operating-envelope violation

insufficient float margin

inadequate pump fillage

excessive mechanical load

model-domain/OOD condition

excessive uncertainty

invalid or stale data

other assurance-gate failures

This behavior is a core product principle, not only an error message.

Explainable Recommendations

A recommendation should communicate:

current state

proposed setpoints

expected outcomes/ranges

why the candidate is recommended

why alternatives were rejected

assurance result

model-domain status

uncertainty where available

data provenance

model/version metadata

engineer approval status

Model-Domain / OOD Protection

Where model-domain monitoring is available, ASSURE-TWIN checks whether a state is within the validated learned domain.

When ML support is not applicable or the state is outside the learned domain, the system can fall back to the appropriate analytical/physics pathway rather than silently trusting an out-of-domain surrogate.

Calibration and Outcome Reconciliation

The project includes calibration-oriented tooling for parameter fitting and reconciliation against historical outcomes where suitable data is available.

Calibration should be versioned and should not silently change the model used for an existing recommendation.

Provenance-Aware Data

Important values should be identifiable as appropriate, for example:

MEASURED

PUBLIC

CALIBRATED

MODEL-DERIVED

PREDICTED

SYNTHETIC

SIMULATED

DEMO

The prototype must never present simulated or synthetic values as verified field measurements.

3. Application Modules

The target UI organizes the system around an engineer's decision workflow:

Overview — current well state, 3D twin, pumpability, operating envelope, assurance, recommendation

3D Simulator — interactive surface/subsurface twin

Well State — current engineering variables and provenance

Forecast — forward trajectories

Pumpability — time-to-boundary and limiting mechanism

Scenarios — current, CSS-only, SRP-only, joint, and custom cases where supported

Optimization — CSS/SRP/joint candidate generation and trade-offs

Recommendation — explainable engineering recommendation or abstention

Assurance — detailed 12-point gate

Alerts — operational and model/data warnings

History & Audit — scenario/rehearsal/recommendation/calibration events

Calibration — supported parameter fitting and reconciliation workflows

Reports — engineering decision report generation

Settings — supported application configuration

4. Reference Decision Flow

Normal Case

SELECT WELL
   ↓
VIEW CURRENT STATE
   ↓
VIEW 3D TWIN
   ↓
CHECK FORECAST
   ↓
CHECK PUMPABILITY
   ↓
CHECK DYNAMIC ENVELOPE
   ↓
CREATE PROPOSED SETPOINT
   ↓
REHEARSE 30 DAYS
   ↓
COMPARE SCENARIOS
   ↓
RUN JOINT CSS + SRP OPTIMIZATION
   ↓
RUN ASSURANCE
   ↓
GENERATE EXPLAINABLE RECOMMENDATION
   ↓
ENGINEER REVIEW / APPROVAL
   ↓
GENERATE ENGINEERING REPORT

Unsafe Case

ABNORMAL / UNCERTAIN STATE
          ↓
   Recalculate Physics
          ↓
     Forecast State
          ↓
   Operating Envelope
          ↓
       Assurance
          ↓
NO SAFE RECOMMENDATION
          ↓
 Explain failed checks
          ↓
 Suggest required condition/data

5. Technology Stack

The current implementation is intended to remain aligned with the actual repository rather than older presentation claims.

Frontend

TypeScript

Three.js / WebGL

HTML/CSS and the current project UI architecture

Backend

Python

FastAPI

NumPy

SciPy

scikit-learn

SQLAlchemy

Database

SQLite for the current prototype

PostgreSQL-ready architecture where practical

Engineering / Analytics

coupled physics models

forecasting

scenario rehearsal

constrained optimization

assurance logic

OOD/model-domain checks

calibration tooling

6. Data and Validation Philosophy

Current Data Reality

The SIH prototype should distinguish clearly between public, synthetic, simulated, calibrated, and measured data.

The supplied presentation identifies the lack of public well-level field data as a project constraint and proposes physics-informed synthetic data with calibration hooks. The prototype should preserve that honesty.

Synthetic / Simulation Mode

A deterministic simulator/demo mode may be used to demonstrate the decision workflow when live telemetry is unavailable.

Synthetic values must be labeled as synthetic/simulated/demo.

Physics + ML

The architecture is physics-led. ML components can support surrogate prediction/classification where implemented, but they should not override engineering safety constraints.

Reproducibility

Demo scenarios should use deterministic inputs/fixed random seeds where randomness is required so the same demonstration can be repeated consistently.

7. Safety and Human-in-the-Loop

ASSURE-TWIN is advisory-first.

The workflow is:

SYSTEM RECOMMENDS
      ↓
ASSURANCE CHECK
      ↓
ENGINEER REVIEW
      ↓
APPROVE / REJECT

The prototype does not claim autonomous control of physical field equipment.

The frontend must never be allowed to bypass backend engineering constraints merely for demonstration purposes.

8. Demo Scenario

A recommended SIH demonstration is:

Part A — Normal Operation

Open Overview.

Show the 3D Digital Twin.

Show production, SOR, temperature, viscosity, pump fillage and float margin.

Show the Dynamic Thermo-Mechanical Operating Envelope.

Show the Pumpability Window.

Modify a proposed SPM/stroke setting.

Run a 30-day Decision Rehearsal.

Compare current, proposed, and rehearsed outcomes.

Run Joint CSS + SRP Optimization.

Run the Assurance Gate.

Show the explainable recommendation.

Generate the engineering report.

Part B — Safe Abstention

Activate the controlled demo scenario:
Inject Abnormal Viscosity Spike.

Recalculate the same engineering pipeline.

Show viscosity deterioration.

Show pumpability degradation.

Show the operating envelope tightening/violating the relevant constraints.

Run assurance.

Demonstrate:

NO SAFE RECOMMENDATION

Explain which checks failed and why.

Reset the demo state.

This scenario should use the real assurance pathway and must not be a decorative hard-coded alert.

9. Engineering Report

The report workflow is intended to provide an auditable summary of a decision.

A report may contain:

well and scenario

timestamp

current state

proposed setpoints

forecast horizon

predicted outcomes

pumpability

operating envelope

assurance checks

OOD status

physics/ML agreement where applicable

uncertainty

recommendation reasons

rejected alternatives

provenance

model versions

approval status

audit information

Simulation/model-derived numbers must be labeled appropriately.

10. Important Scope Boundaries

The current SIH prototype focuses on a deep, high-impact single-well / flagship-well digital twin and decision workflow.

The following should not be represented as implemented current functionality unless they are actually added and verified:

downhole electric heater physics/control

full multi-well field steam fleet scheduling

DEAP-based field orchestration

native production MQTT/OPC-UA gateway

TimescaleDB deployment

React/Tailwind implementation if not present in the repository

PyTorch implementation if not present in the repository

autonomous physical control of field equipment

These can be treated as future deployment/roadmap items.

11. What Makes ASSURE-TWIN Different

The defining feature is not simply "AI optimization."

The system connects the full engineering decision chain:

CURRENT STATE
     ↓
FUTURE CONSEQUENCE
     ↓
OPERATING ENVELOPE
     ↓
PUMPABILITY
     ↓
DECISION REHEARSAL
     ↓
OPTIMIZATION
     ↓
ASSURANCE
     ↓
RECOMMEND OR ABSTAIN

The central design principle is:

From optimal setpoint to safe operating window.

And the central operational principle is:

Simulate the consequence before changing the well.

12. Current vs Future Scope

Capability

Current Prototype

Future / Deployment Extension

3D Digital Twin

Yes

Further visualization/field integration

Coupled CSS-SRP physics

Yes

Higher-fidelity models as needed

Joint CSS-SRP optimization

Yes

Broader optimization scope

Dynamic operating envelope

Yes

Field-calibrated expansion

Predictive pumpability

Yes

Improved calibration with field data

Decision rehearsal

Yes

More scenario automation

12-point assurance

Yes

Additional site-specific rules

Abstain protocol

Yes

Further operational policies

OOD/model-domain guard

Yes

Larger validated domains

Calibration/reconciliation

Yes

Continuous field calibration

Engineering report

Target integration

Production reporting integration

Live SCADA

Prototype/integration architecture only

Native industrial gateway

MQTT / OPC-UA

Not a verified current production gateway

Future deployment

Multi-well fleet scheduler

Not current core implementation

Future field orchestration

Downhole electric heating

Not current core implementation

Future hybrid thermal roadmap

TimescaleDB

Not current SIH database

Production deployment option

13. Project Status

This repository should be described accurately as a working engineering prototype / SIH demonstration system, not as a field-validated production deployment.

Before any SIH submission or live demo, verify:

frontend build succeeds

backend starts cleanly

database initializes correctly

existing 3D simulator loads

all navigation entries work

decision rehearsal does not mutate live state

optimization produces reproducible results

assurance results are backend-driven

OOD behavior is correct

the abstain demo produces NO SAFE RECOMMENDATION

recommendation values match the underlying simulation

generated reports match the recommendation

there are no dead buttons or clipped panels.

14. Suggested Repository Structure

The exact repository structure may evolve, but the logical organization is:

ASSURE-TWIN/
│
├── backend/
│   └── app/
│       ├── api/
│       ├── physics/
│       ├── optimization/
│       ├── forecast/
│       ├── analytics/
│       ├── assurance/
│       ├── calibration/
│       ├── models/
│       └── services/
│
├── frontend/
│   ├── 3d / scene components
│   ├── dashboard components
│   ├── charts
│   ├── recommendation UI
│   └── styles
│
├── tests/
│
├── docs/
│
└── README.md

Use the repository's real structure as the authoritative source; this section describes the intended architectural separation rather than requiring an exact folder layout.

15. Development Principles

Physics-first

Use first-principles engineering logic wherever the project relies on physical constraints. ML should support the system, not silently override physical safety checks.

One canonical well state

The 3D simulator, analytics, forecast, optimization, assurance, and recommendation layers should consume a consistent well-state representation.

No hidden mutations

Scenario rehearsal and demo scenarios must be isolated from the persistent/live state.

No fake certainty

Do not display fabricated confidence, accuracy, field uplift, or validation metrics.

Explain every recommendation

Every recommendation should have an understandable engineering rationale and, where possible, rejected alternatives.

Abstain safely

When evidence is insufficient or constraints are violated, the correct output may be:

NO SAFE RECOMMENDATION

16. Presentation Alignment

The SIH presentation should describe the same implementation that the judges can run.

The strongest features to demonstrate in the PPT are:

Interactive 3D Digital Twin

Coupled thermal + rheology + SRP physics

Joint CSS-SRP optimization

Dynamic Thermo-Mechanical Operating Envelope

Predictive Pumpability Window

Decision Rehearsal Sandbox

12-Point Assurance Gate

NO SAFE RECOMMENDATION

Explainable Recommendation

OOD / model-domain protection

Calibration / reconciliation

Human-in-the-loop approval

Features that are not implemented should be presented only as clearly labeled future roadmap items.

17. Responsible Claims

Unless supported by verified field evidence, do not describe modeled outputs as actual Baghewala production results.

Use language such as:

simulation result

model-derived

synthetic demonstration

scenario result

predicted range

Avoid unsupported statements such as:

"field validated"

"guaranteed production increase"

"99% accurate"

"autonomous field control"

"real-time SCADA integration" when only an adapter specification exists.

18. Acknowledgement of References

The supplied SIH presentation references:

Oil India Baghewala project information

Oil India procurement / EOI material concerning CSS and heating

PPAC crude import-dependence information as cited by the team

Marx & Langenheim (1959), Reservoir Heating by Hot Fluid Injection

Soares, Thompson & Machado (2013), applied rheology work

Dimitriou, McKinley & Venkatesan (2011), heavy-oil/rheology-related work

Patel et al. (2005), cyclic-steam scheduling / genetic optimization work

Mohankumar (2019), steam allocation work

The presentation and this README should preserve the distinction between referenced research, implemented prototype functionality, and future roadmap concepts.

19. License / Usage

Add the project's actual repository license here before public distribution.

Do not assume a license if one has not been declared in the repository.

20. Final Product Definition

ASSURE-TWIN is an engineering decision-support digital twin for heavy-oil CSS/SRP operations.

Its defining workflow is:

See the well → understand the state → predict the future → rehearse the decision → optimize CSS + SRP → assure the decision → recommend or abstain.

ASSURE-TWIN — Decision-Assured Well-to-Surface Digital Twin
SIH 2026 | SIH26120 | VisionX$
