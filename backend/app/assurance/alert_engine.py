"""
alert_engine.py - Authoritative Multi-Tier Intelligent Alerting Engine.
Generates, deduplicates, and manages active alerts across 3 severity levels:
- CRITICAL: Immediate mechanical/thermal danger requiring intervention.
- WARNING: Approaching operational boundary or efficiency degradation.
- INFO: Operational milestones, cycle transitions, and system status updates.
"""

from typing import Dict, Any, List
from datetime import datetime, timezone

class AlertEngine:
    def __init__(self):
        self._active_alerts: Dict[str, Dict[str, Any]] = {}
        self._alert_history: List[Dict[str, Any]] = []

    def evaluate_state(self, state: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Scans complete simulation state and updates active alerts.
        """
        current_alerts = []

        fm = state.get("loads", {}).get("float_margin_pct", 25.0)
        rod_status = state.get("loads", {}).get("rod_float_status", "SAFE")
        fillage = state.get("pump", {}).get("pump_fillage", 0.90)
        pprl = state.get("loads", {}).get("pprl_kn", 50.0)
        temp = state.get("thermal", {}).get("near_well_temp_c", 72.6)
        css_phase = state.get("css", {}).get("current_phase", "PRODUCTION")

        # 1. CRITICAL: Rod Float / Negative Polished Rod Load
        if rod_status == "FLOATING" or fm <= 8.0:
            current_alerts.append({
                "code": "ALERT_ROD_FLOAT_CRITICAL",
                "severity": "CRITICAL",
                "title": "Severe Sucker Rod Float Detected",
                "message": f"Float margin collapsed to {fm:.1f}%. Polished rod is descending slower than carrier bar. Imminent buckling and tubing rupture risk.",
                "action": "Immediately reduce SPM or engage VFD slow downstroke shaping.",
                "timestamp": datetime.now(timezone.utc).isoformat()
            })

        # 2. WARNING: Reduced Float Margin
        elif rod_status == "WARNING" or fm < 18.0:
            current_alerts.append({
                "code": "ALERT_FLOAT_MARGIN_WARNING",
                "severity": "WARNING",
                "title": "Rod Float Margin Restricted",
                "message": f"Float margin is {fm:.1f}% (below 18% target). Viscous drag in upper tubing is retarding rod string descent.",
                "action": "Monitor downstroke velocity and prepare speed throttling.",
                "timestamp": datetime.now(timezone.utc).isoformat()
            })

        # 3. CRITICAL / WARNING: Fluid Pound Shock
        if fillage < 0.65:
            current_alerts.append({
                "code": "ALERT_FLUID_POUND_SEVERE",
                "severity": "CRITICAL",
                "title": "Severe Fluid Pound / Pump-Off Condition",
                "message": f"Pump fillage is {fillage*100:.1f}%. Plunger slamming into liquid level on downstroke.",
                "action": "Throttle pumping speed to match reservoir inflow rate.",
                "timestamp": datetime.now(timezone.utc).isoformat()
            })
        elif fillage < 0.78:
            current_alerts.append({
                "code": "ALERT_LOW_PUMP_FILLAGE",
                "severity": "WARNING",
                "title": "Low Pump Fillage Detected",
                "message": f"Pump fillage is {fillage*100:.1f}%. Mild fluid pound shock waves observed on pump card.",
                "action": "Observe inflow trend or optimize SPM.",
                "timestamp": datetime.now(timezone.utc).isoformat()
            })

        # 4. WARNING: High PPRL Tensile Load
        if pprl > 82.0:
            current_alerts.append({
                "code": "ALERT_PPRL_ELEVATED",
                "severity": "WARNING",
                "title": "Peak Polished Rod Load Near Allowable Limit",
                "message": f"PPRL is {pprl:.1f} kN (exceeds 85% of API Grade D rod yield).",
                "action": "Verify counterbalance adjustment and evaluate stroke length.",
                "timestamp": datetime.now(timezone.utc).isoformat()
            })

        # 5. INFO: CSS Phase Transition Milestone
        if css_phase in ["INJECTION", "SOAK", "COOLING"]:
            current_alerts.append({
                "code": f"ALERT_CSS_PHASE_{css_phase}",
                "severity": "INFO",
                "title": f"CSS Cycle in {css_phase} Phase",
                "message": f"Well operating in {css_phase} mode at {temp:.1f}°C near-wellbore temperature.",
                "action": "Review phase duration against thermodynamic schedule.",
                "timestamp": datetime.now(timezone.utc).isoformat()
            })

        # Update active alert cache
        self._active_alerts = {a["code"]: a for a in current_alerts}
        for a in current_alerts:
            self._alert_history.append(a)

        return current_alerts

    def get_active_alerts(self) -> List[Dict[str, Any]]:
        return list(self._active_alerts.values())

    def get_alert_history(self) -> List[Dict[str, Any]]:
        return self._alert_history[-50:]
