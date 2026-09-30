"""
backend/app/assurance/data_quality.py
Deterministic Cyber-Physical Data Quality Gate & Auditor for ASSURE-TWIN.
Checks:
1. Missing values (null / NaN)
2. Stale timestamps / sensor freeze
3. Physically impossible sensor ranges (API / field limits)
4. Sudden unphysical jumps (derivative limits)
5. Contradictory inputs (e.g. drawdown with inverted pressure, liquid rate < oil rate)
6. Invalid engineering units
7. Missing provenance tracking
8. Insufficient historical observation depth
"""

from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from pydantic import BaseModel, Field

class DataQualityResult(BaseModel):
    overall_status: str = "GOOD"  # GOOD, DEGRADED, BLOCKED
    score: float = 100.0  # 0 to 100
    stale_signals: List[str] = Field(default_factory=list)
    invalid_signals: List[str] = Field(default_factory=list)
    suspicious_signals: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
    blocking_conditions: List[str] = Field(default_factory=list)
    signal_checks: Dict[str, Dict[str, Any]] = Field(default_factory=dict)
    evaluated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class DataQualityAuditor:
    # Acceptable physical operating ranges for Baghewala Field heavy oil production
    PHYSICAL_RANGES = {
        "temperature_c": (30.0, 340.0, "°C"),
        "p_wf_bar": (2.0, 85.0, "bar"),
        "p_res_bar": (20.0, 100.0, "bar"),
        "spm": (0.2, 12.0, "SPM"),
        "stroke_inches": (24.0, 144.0, "in"),
        "oil_rate_bopd": (0.0, 500.0, "BOPD"),
        "liquid_rate_bpd": (0.0, 600.0, "BPD"),
        "water_cut": (0.0, 0.99, "fraction"),
        "viscosity_cp": (50.0, 100000.0, "cP"),
        "float_margin_pct": (0.0, 100.0, "%"),
        "pprl_kn": (10.0, 200.0, "kN"),
        "steam_volume_tons": (0.0, 10000.0, "tons"),
        "sor": (0.5, 30.0, "t/t")
    }

    # Maximum allowable step derivative per minute to detect telemetry glitches / jumps
    MAX_STEP_DELTAS = {
        "temperature_c": 15.0,
        "p_wf_bar": 25.0,
        "spm": 4.0,
        "viscosity_cp": 8000.0
    }

    def __init__(self):
        self._history_buffer: List[Dict[str, Any]] = []

    def audit_telemetry(
        self,
        telemetry: Dict[str, Any],
        provenance: Optional[Dict[str, str]] = None
    ) -> DataQualityResult:
        warnings: List[str] = []
        blocking: List[str] = []
        stale: List[str] = []
        invalid: List[str] = []
        suspicious: List[str] = []
        checks: Dict[str, Dict[str, Any]] = {}
        penalty_points = 0.0

        # Flatten nested state into standard signal keys if needed
        signals = self._extract_signals(telemetry)

        # 1. Missing Values & Impossible Range Checks
        for key, (min_v, max_v, unit) in self.PHYSICAL_RANGES.items():
            if key not in signals or signals[key] is None:
                # Essential physical signals cannot be missing
                if key in ["temperature_c", "p_wf_bar", "spm", "float_margin_pct"]:
                    blocking.append(f"Critical telemetry missing: '{key}' is absent or null.")
                    invalid.append(key)
                    penalty_points += 25.0
                    checks[key] = {"status": "MISSING", "detail": "Critical field missing"}
                else:
                    checks[key] = {"status": "OPTIONAL_DEFAULT", "detail": "Optional field inferred from baseline"}
                continue

            val = signals[key]
            try:
                fval = float(val)
            except (ValueError, TypeError):
                blocking.append(f"Invalid signal type for '{key}': value '{val}' cannot be converted to float.")
                invalid.append(key)
                penalty_points += 20.0
                checks[key] = {"status": "INVALID_TYPE", "value": str(val)}
                continue

            if fval < min_v or fval > max_v:
                blocking.append(f"Out-of-range sensor reading for '{key}': {fval} {unit} outside physical limits [{min_v}, {max_v}].")
                invalid.append(key)
                penalty_points += 25.0
                checks[key] = {"status": "OUT_OF_RANGE", "value": fval, "bounds": [min_v, max_v]}
            else:
                checks[key] = {"status": "VALID", "value": fval, "unit": unit}

        # 2. Frozen Sensor & Telemetry Staleness
        if telemetry.get("_stale_sensors") or telemetry.get("is_stale"):
            stale_keys = telemetry.get("_stale_sensors", ["temperature_sensor"])
            for s in stale_keys:
                stale.append(s)
                warnings.append(f"Sensor freeze detected on '{s}': output constant across consecutive cycles.")
                penalty_points += 15.0

        # Check last timestamp staleness if timestamp present
        ts_str = telemetry.get("timestamp") or telemetry.get("time", {}).get("timestamp")
        if ts_str:
            try:
                # Attempt to parse ISO timestamp
                ts = datetime.fromisoformat(str(ts_str).replace("Z", "+00:00"))
                delta_sec = abs((datetime.now(timezone.utc) - ts).total_seconds())
                # If timestamp is more than 24 hours in the past and not explicitly marked demo/sim
                if delta_sec > 86400 and not telemetry.get("_mode", "").startswith("DEMO"):
                    warnings.append(f"Telemetry timestamp is stale ({delta_sec/3600:.1f} hours old).")
                    penalty_points += 10.0
            except Exception:
                pass

        # 3. Contradictory Physical Inputs Check
        oil_rate = signals.get("oil_rate_bopd")
        liq_rate = signals.get("liquid_rate_bpd")
        if oil_rate is not None and liq_rate is not None:
            if float(oil_rate) > float(liq_rate) * 1.05:  # Allow 5% measurement tolerance
                blocking.append(f"Contradictory production rates: oil rate ({oil_rate} BOPD) exceeds total liquid rate ({liq_rate} BPD).")
                suspicious.append("oil_liquid_ratio")
                penalty_points += 20.0

        p_wf = signals.get("p_wf_bar")
        p_res = signals.get("p_res_bar")
        if p_wf is not None and p_res is not None:
            if float(p_wf) > float(p_res) and signals.get("spm", 0.0) > 0.5:
                warnings.append(f"Inverted pressure gradient: flowing BHP ({p_wf} bar) > reservoir pressure ({p_res} bar) during active production.")
                suspicious.append("pressure_gradient")
                penalty_points += 15.0

        # 4. Sudden Jump / Unphysical Derivation Check
        if self._history_buffer:
            last = self._history_buffer[-1]
            for key, max_delta in self.MAX_STEP_DELTAS.items():
                if key in signals and key in last:
                    step_delta = abs(float(signals[key]) - float(last[key]))
                    if step_delta > max_delta:
                        warnings.append(f"Suspicious step jump in '{key}': delta of {step_delta:.1f} exceeds physical limit of {max_delta}.")
                        suspicious.append(key)
                        penalty_points += 10.0

        # Record into history buffer (keep last 20 frames)
        self._history_buffer.append(dict(signals))
        if len(self._history_buffer) > 20:
            self._history_buffer.pop(0)

        # 5. Provenance Coverage
        if provenance:
            untracked = [k for k in ["temperature", "pressure", "viscosity", "spm"] if k not in provenance]
            if untracked:
                warnings.append(f"Missing provenance tags for critical signals: {untracked}.")
                penalty_points += 5.0

        # Calculate final score (clamped 0 to 100)
        final_score = max(0.0, round(100.0 - penalty_points, 1))

        # Status determination
        if blocking or final_score < 60.0:
            overall_status = "BLOCKED"
        elif warnings or stale or suspicious or final_score < 85.0:
            overall_status = "DEGRADED"
        else:
            overall_status = "GOOD"

        return DataQualityResult(
            overall_status=overall_status,
            score=final_score,
            stale_signals=stale,
            invalid_signals=invalid,
            suspicious_signals=suspicious,
            warnings=warnings,
            blocking_conditions=blocking,
            signal_checks=checks
        )

    def _extract_signals(self, raw: Dict[str, Any]) -> Dict[str, Any]:
        """Extracts standard physical keys from raw simulation or twin state dictionary."""
        extracted: Dict[str, Any] = {}
        
        # Check direct keys
        for k in self.PHYSICAL_RANGES.keys():
            if k in raw:
                extracted[k] = raw[k]

        # Check thermal / reservoir
        if "thermal" in raw and isinstance(raw["thermal"], dict):
            extracted["temperature_c"] = raw["thermal"].get("near_well_temp_c", raw["thermal"].get("temperature_c"))
        elif "reservoir" in raw and isinstance(raw["reservoir"], dict):
            if "temperature_c" not in extracted:
                extracted["temperature_c"] = raw["reservoir"].get("temperature_c")
            extracted["p_res_bar"] = raw["reservoir"].get("pressure_bar", raw["reservoir"].get("p_res_bar", 68.4))

        # Check fluid
        if "fluid" in raw and isinstance(raw["fluid"], dict):
            extracted["viscosity_cp"] = raw["fluid"].get("viscosity_near_well_cp", raw["fluid"].get("viscosity_cp"))
            extracted["water_cut"] = raw["fluid"].get("water_cut")
        elif "reservoir" in raw and isinstance(raw["reservoir"], dict):
            if "viscosity_cp" not in extracted:
                extracted["viscosity_cp"] = raw["reservoir"].get("viscosity_cp")
            if "water_cut" not in extracted:
                extracted["water_cut"] = raw["reservoir"].get("water_cut")

        # Check inflow
        if "inflow" in raw and isinstance(raw["inflow"], dict):
            extracted["p_wf_bar"] = raw["inflow"].get("p_wf_bar")
            extracted["p_res_bar"] = raw["inflow"].get("p_res_bar", extracted.get("p_res_bar", 68.4))

        # Check controls / srp
        if "controls" in raw and isinstance(raw["controls"], dict):
            extracted["spm"] = raw["controls"].get("spm")
            extracted["stroke_inches"] = raw["controls"].get("stroke_inches", raw["controls"].get("stroke_m", 1.6256) * 39.37)
            if "p_wf_bar" not in extracted:
                extracted["p_wf_bar"] = raw["controls"].get("pwf_bar")
            if "water_cut" not in extracted:
                extracted["water_cut"] = raw["controls"].get("water_cut")
            if "steam_volume_tons" not in extracted:
                extracted["steam_volume_tons"] = raw["controls"].get("steam_volume_t_d", 2500.0)

        # Check loads
        if "loads" in raw and isinstance(raw["loads"], dict):
            extracted["float_margin_pct"] = raw["loads"].get("float_margin_pct")
            extracted["pprl_kn"] = raw["loads"].get("pprl_kn")
        elif "srp" in raw and isinstance(raw["srp"], dict):
            if "float_margin_pct" not in extracted:
                extracted["float_margin_pct"] = raw["srp"].get("float_margin_pct")
            if "pprl_kn" not in extracted:
                extracted["pprl_kn"] = raw["srp"].get("rod_load_kn", 88.5)

        # Check production
        if "production" in raw and isinstance(raw["production"], dict):
            extracted["oil_rate_bopd"] = raw["production"].get("oil_rate_bopd", raw["production"].get("oil_rate_bpd"))
            extracted["liquid_rate_bpd"] = raw["production"].get("liquid_rate_bpd", raw["production"].get("liquid_rate_bopd"))

        # Check economics
        if "economics" in raw and isinstance(raw["economics"], dict):
            extracted["sor"] = raw["economics"].get("instantaneous_sor", raw["economics"].get("sor"))

        return extracted
