"""
backend/app/api/v1/provenance.py
Data Provenance & Traceability Registry.
Exposes provenance classification badges for all primary sensor signals, calculated states, and predictions.
"""

from fastapi import APIRouter
from typing import Dict, Any, List

router = APIRouter(prefix="/provenance", tags=["Provenance"])

PROVENANCE_DICTIONARY = {
    "signals": {
        "well_depth_tvd": {
            "source_type": "MEASURED",
            "badge": "MEASURED",
            "confidence": 1.0,
            "origin": "Well Completion Report & Gyro Survey (BGW-17A)",
            "description": "True vertical depth to midpoint of perforations (1420.0 m TVD)."
        },
        "casinghead_pressure": {
            "source_type": "MEASURED",
            "badge": "MEASURED",
            "confidence": 0.98,
            "origin": "Surface RTU Transducer (Rosemount 3051S)",
            "description": "Live wellhead casing pressure telemetry."
        },
        "surface_spm": {
            "source_type": "MEASURED",
            "badge": "MEASURED",
            "confidence": 0.99,
            "origin": "VFD Inverter Tachometer & Crank Proximity Sensor",
            "description": "Pumping speed recorded at crank shaft."
        },
        "stroke_length": {
            "source_type": "MEASURED",
            "badge": "MEASURED",
            "confidence": 1.0,
            "origin": "Pumping Unit Geometry (C-320-256-100 Crank Hole #3)",
            "description": "Polished rod stroke length physically pinned on crank."
        },
        "formation_permeability": {
            "source_type": "CALIBRATED",
            "badge": "CALIBRATED",
            "confidence": 0.92,
            "origin": "Cycle 3 History Match & Pressure Transient Analysis (1250 mD)",
            "description": "Effective permeability calibrated against cumulative production."
        },
        "crude_viscosity_ref": {
            "source_type": "CALIBRATED",
            "badge": "CALIBRATED",
            "confidence": 0.95,
            "origin": "Lab Rheometer PVT Assay & Andrade Regression Fit (1840 cP @ 72.6°C)",
            "description": "Heavy crude temperature-viscosity relationship."
        },
        "downhole_temperature": {
            "source_type": "MODEL-DERIVED",
            "badge": "MODEL-DERIVED",
            "confidence": 0.92,
            "origin": "Marx-Langenheim / Overburden Conduction Virtual Estimator",
            "description": "Estimated near-wellbore temperature (no downhole fiber optic sensor)."
        },
        "flowing_bottomhole_pressure": {
            "source_type": "MODEL-DERIVED",
            "badge": "MODEL-DERIVED",
            "confidence": 0.90,
            "origin": "Subsurface Hydrostatic & Frictional Wellbore Hydraulics",
            "description": "Estimated flowing bottomhole pressure (Pwf)."
        },
        "rod_downstroke_drag": {
            "source_type": "MODEL-DERIVED",
            "badge": "MODEL-DERIVED",
            "confidence": 0.88,
            "origin": "Couette Concentric Annular Navier-Stokes Shear Model",
            "description": "Calculated viscous retarding force on downstroke."
        },
        "float_margin": {
            "source_type": "MODEL-DERIVED",
            "badge": "MODEL-DERIVED",
            "confidence": 0.91,
            "origin": "Buoyant Weight vs Dynamic Inertia & Viscous Drag Equilibrium",
            "description": "Calculated percentage headroom against rod string float."
        },
        "projected_oil_rate_30d": {
            "source_type": "PREDICTED",
            "badge": "PREDICTED",
            "confidence": 0.89,
            "origin": "Coupled 30-Day Forward Timestepper & Holdout-Tested Random Forest",
            "description": "Estimated future production rate."
        },
        "water_cut": {
            "source_type": "ASSUMED",
            "badge": "ASSUMED",
            "confidence": 0.85,
            "origin": "Last Weekly Wellhead Test Separator Measurement (12.8%)",
            "description": "Assumed static between separator test intervals."
        },
        "steam_injection_volume": {
            "source_type": "DEMO",
            "badge": "DEMO",
            "confidence": 1.0,
            "origin": "Deterministic Demo Operational Setpoint (2400 tons)",
            "description": "Synthetic candidate for decision rehearsal demonstration."
        }
    },
    "categories": [
        {"code": "MEASURED", "color": "cyan", "description": "Direct telemetry from physical sensors or well surveys."},
        {"code": "PUBLIC", "color": "blue", "description": "Public geological / geographical reservoir data."},
        {"code": "CALIBRATED", "color": "yellow", "description": "Calibrated against historical pressure transient or lab PVT."},
        {"code": "ASSUMED", "color": "orange", "description": "Static operating assumptions or periodic lab test hold values."},
        {"code": "SYNTHETIC", "color": "white", "description": "Numerically synthesized test benchmark or card data."},
        {"code": "PREDICTED", "color": "purple", "description": "Forward simulation forecast or ML surrogate inference."},
        {"code": "MODEL-DERIVED", "color": "green", "description": "Virtual downhole sensors derived from surface coupled physics."},
        {"code": "DEMO", "color": "gold", "description": "Deterministic demonstration parameter set."}
    ]
}

@router.get("")
def get_provenance_registry() -> Dict[str, Any]:
    return PROVENANCE_DICTIONARY
