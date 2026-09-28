# ASSURE-TWIN: Data Provenance & Audit Trail Architecture

## 1. Zero-Trust Telemetry Taxonomy
In modern digital twin systems, data origin dictates algorithmic confidence. ASSURE-TWIN implements an explicit data provenance tagging taxonomy across all inputs and state estimates:

| Provenance Tag | Definition | Example Parameters |
|:---|:---|:---|
| `MEASURED` | Ingested directly from surface or SCADA instruments. | Polished rod position, surface load cell, wellhead temp, casing pressure. |
| `MODEL-DERIVED` | Calculated via first-principles physics equations. | Fluid level, PIP, bottomhole temperature, rod drag force. |
| `CALIBRATED` | Scaled or adjusted using historical well test reconciliation. | Formation skin factor, Andrade rheology activation energy $b$. |
| `PREDICTED` | Multi-horizon forward projection or ML surrogate inference. | +7-day production rate, thermal cooling curve, pumpability horizon. |
| `CONFIGURED` | Fixed mechanical equipment specifications. | Tubing ID, rod string taper schedule, pump unit rating (Mark II 320). |
| `SYNTHETIC DEMO` | Demo scenarios simulated to test edge-case safety gates. | Simulated sensor loss, artificial model divergence. |

---

## 2. Real-Time Data Quality Engine

Every incoming telemetry sample is evaluated against four automated filters:
1. **Range & Sanity Checks**: Validates physical bounds (e.g. $0 \le SPM \le 20$, $0 \le P_{casing} \le 100\text{ bar}$).
2. **Rate of Change (Spike Filter)**: Flags sudden non-physical spikes exceeding $5\sigma$ over 10 seconds.
3. **Stale Sensor Freeze Detection**: Tracks variance over sliding windows. If variance is $< 10^{-4}$ over $> 120\text{ seconds}$ while unit is running, flags instrument freeze.
4. **Continuity & Packet Loss**: Tracks sample delivery cadence and flags gaps.

---

## 3. Cryptographically Verifiable Audit Trail
To satisfy regulatory scrutiny and production safety audits, ASSURE-TWIN records all decision milestones into an immutable audit chain.

Each log entry contains:
- `traceId`: Unique UUID.
- `step`: Process phase (e.g. `OBSERVATION`, `STATE_ESTIMATE`, `CANDIDATE_GENERATION`, `ASSURANCE_CHECK`, `ENGINEER_APPROVAL`).
- `timestamp`: UTC ISO timestamp.
- `summary`: Human-readable description of inputs and outputs.
- `payload`: Full JSON snapshot of the state vector.
- `prevHash` / `hash`: SHA-256 hash chained to the preceding entry, preventing retroactive tampering.
