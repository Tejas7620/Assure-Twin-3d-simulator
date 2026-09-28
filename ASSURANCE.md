# ASSURE-TWIN: Multi-Tier Decision Assurance Gatekeeper

## 1. Safety Architecture: The Principle of Assurance
In mission-critical oilfield automation, recommending an erroneous setpoint is far more dangerous than recommending nothing at all. 

ASSURE-TWIN implements an uncompromising **12-Checkpoint Multi-Tier Gatekeeper**. A setpoint candidate is *never* presented to an engineer as "Recommended" unless all 12 checkpoints simultaneously evaluate to `PASS`.

---

## 2. The 12 Mandatory Checkpoints

| # | Checkpoint Name | Evaluation Criteria | Failure Action |
|:---:|:---|:---|:---|
| **01** | **Telemetry Quality** | Valid sensor ratio $\ge 70\%$, no frozen/stale signals | Trigger Abstain: Data Corrupted |
| **02** | **State Boundary** | $P_{wf} > P_{bubble}$, $T_{dh} \ge 40^\circ\text{ C}$ | Trigger Abstain: Unphysical State |
| **03** | **Calibration Match** | History match error $\le 20\%$ | Trigger Abstain: Model Out of Date |
| **04** | **Physics Validation** | Swept volume mass conservation $\ge 90\%$ | Disqualify Candidate |
| **05** | **ML Consensus** | Physics model vs. ML surrogate divergence $\le 20\%$ | Trigger Abstain: Model Disagreement |
| **06** | **OOD Detection** | Statistical Mahalanobis distance inside training domain | Trigger Abstain: Out-of-Domain |
| **07** | **Pump Fillage** | Downhole fillage $\eta_{fill} \ge 30\%$ (prevents fluid pound) | Disqualify Candidate |
| **08** | **Rod Load Rating** | $PPRL \le 65.0\text{ kN}$ ($< 80\%$ structural rating) | Disqualify Candidate |
| **09** | **Rod Float Margin** | Downward float margin $M_{float} \ge 10\%$ | Disqualify Candidate |
| **10** | **Energy Ceiling** | Daily electric consumption $\le 450\text{ kWh/day}$ | Disqualify Candidate |
| **11** | **Robustness Rating** | Pass rate $\ge 80\%$ under Monte Carlo parameter noise | Disqualify Candidate |
| **12** | **Pumpability Horizon** | Forward safe window $\ge 7.0\text{ days}$ | Disqualify Candidate |

---

## 3. Mandatory Abstain Protocol: "No Safe Recommendation"
If any data quality, consensus, or domain checkpoint fails, or if all candidates violate physical safety limits:

1. **Recommendation Suppression**:
   The system refuses to output an automated setpoint.
2. **Alert Banner**:
   A prominent banner is displayed:
   `⛔ NO SAFE RECOMMENDATION (ASSURANCE GATE ACTIVE)`
3. **Explicit Diagnostic Explanations**:
   The exact failed gates (e.g. `Gate 01: Telemetry Quality Failed - Sensor freeze on WH_Temp`) are enumerated.
4. **Actionable Fallback Protocol**:
   The system renders the `🔍 REQUEST MORE DATA (PHASE 29)` action, instructing the field technician to inspect surface instruments or initiate well testing.
