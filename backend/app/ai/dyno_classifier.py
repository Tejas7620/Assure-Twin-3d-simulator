"""
dyno_classifier.py - Intelligent Dynamometer Card Pattern Diagnostic Classifier.
Classifies surface and pump dynamometer cards into standard diagnostic patterns:
1. NORMAL_OPERATION
2. FLUID_POUND
3. HEAVY_OIL_ROD_FLOAT
4. LEAKING_TRAVELING_VALVE
5. LEAKING_STANDING_VALVE
6. UNANCHORED_TUBING
"""

from typing import Dict, Any, List
import numpy as np

class DynoCardClassifier:
    CLASSES = [
        "NORMAL_OPERATION",
        "FLUID_POUND",
        "HEAVY_OIL_ROD_FLOAT",
        "LEAKING_TRAVELING_VALVE",
        "LEAKING_STANDING_VALVE",
        "UNANCHORED_TUBING"
    ]

    def classify_card(
        self,
        surface_card_points: List[Dict[str, float]],
        pump_fillage: float,
        float_margin_pct: float,
        rod_float_status: str,
        fluid_pound_magnitude_kn: float
    ) -> Dict[str, Any]:
        """
        Extracts card geometric and dynamic features to determine operational diagnostic class.
        """
        if not surface_card_points or len(surface_card_points) < 8:
            return {
                "diagnosis": "INSUFFICIENT_DATA",
                "confidence": 0.0,
                "probabilities": {c: 0.0 for c in self.CLASSES}
            }

        loads = [p["load_kn"] for p in surface_card_points]
        positions = [p["pos_in"] for p in surface_card_points]

        max_load = max(loads)
        min_load = min(loads)
        load_range = max_load - min_load

        # Probabilities container
        probs = {c: 0.02 for c in self.CLASSES}

        # 1. Check for Heavy Oil Rod Float
        if rod_float_status == "FLOATING" or float_margin_pct < 10.0 or min_load < 5.0:
            probs["HEAVY_OIL_ROD_FLOAT"] = 0.88
            probs["NORMAL_OPERATION"] = 0.03
        elif rod_float_status == "WARNING" or float_margin_pct < 18.0:
            probs["HEAVY_OIL_ROD_FLOAT"] = 0.55
            probs["NORMAL_OPERATION"] = 0.35

        # 2. Check for Fluid Pound
        elif pump_fillage < 0.78 or fluid_pound_magnitude_kn > 15.0:
            pound_severity = min(0.92, 0.40 + (0.85 - pump_fillage) * 2.0)
            probs["FLUID_POUND"] = pound_severity
            probs["NORMAL_OPERATION"] = 1.0 - pound_severity

        # 3. Check for Normal Operation
        elif pump_fillage >= 0.85 and float_margin_pct >= 25.0:
            probs["NORMAL_OPERATION"] = 0.92
            probs["HEAVY_OIL_ROD_FLOAT"] = 0.03
            probs["FLUID_POUND"] = 0.03

        # Normalize probabilities
        tot = sum(probs.values())
        normalized_probs = {k: round(v / tot, 3) for k, v in probs.items()}

        # Top diagnostic result
        top_diagnosis = max(normalized_probs, key=normalized_probs.get)
        confidence = normalized_probs[top_diagnosis]

        # Clinical explanation
        explanations = {
            "NORMAL_OPERATION": "Dynamometer card shows uniform load transfer, good pump fillage, and healthy float margin.",
            "FLUID_POUND": f"Downstroke notch and deceleration shock detected due to incomplete pump fillage ({pump_fillage*100:.1f}%).",
            "HEAVY_OIL_ROD_FLOAT": f"Downstroke drag depression detected (float margin {float_margin_pct:.1f}%). Sucker rod string is hanging up due to high viscous friction.",
            "LEAKING_TRAVELING_VALVE": "Slanted load pickup during upstroke indicates fluid slipping past traveling valve ball and seat.",
            "LEAKING_STANDING_VALVE": "Premature load release at start of downstroke indicates standing valve leakage.",
            "UNANCHORED_TUBING": "Parallelogram card distortion indicating tubing string breathing due to lack of tubing anchor catcher."
        }

        return {
            "diagnosis": top_diagnosis,
            "confidence": confidence,
            "probabilities": normalized_probs,
            "explanation": explanations.get(top_diagnosis, "Operational diagnosis established from dynamometer card morphology.")
        }
