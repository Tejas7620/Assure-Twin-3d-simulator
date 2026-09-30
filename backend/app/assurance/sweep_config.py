"""
backend/app/assurance/sweep_config.py
Config-driven decision space sweep configuration for ASSURE-TWIN.

Defines the control axes (SPM, stroke, steam volume, and future axes like heater power)
and the epistemic parameter bounds used in the robust-infeasibility test.
New axes are registered here and automatically picked up by the workover classifier
and the optimizer sweep.

Design: config-driven so that Feature 2 (heater) simply registers a new axis.
"""

from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field


# ---------------------------------------------------------------------------
# Mechanical gate IDs (from gatekeeper.py Phase 0 recon)
# ---------------------------------------------------------------------------
MECHANICAL_GATE_IDS = {5, 6, 7, 8}
# Gate 5: Thermo-Mechanical Stress Limits (PPRL)
# Gate 6: Rod Float & Compression Safety
# Gate 7: Pump Clearance & Thermal Expansion
# Gate 8: Gearbox Torque Rating


@dataclass
class ControlAxis:
    """One dimension of the decision space sweep."""
    key: str                    # Control parameter key (e.g. "spm")
    name: str                   # Human-readable name
    state_path: List[str]       # Path into sim_state dict to set the value
    levels: List[float]         # Discrete levels to sweep
    unit: str                   # Physical unit string
    enabled: bool = True        # If False, axis is skipped in sweep


@dataclass
class EpistemicParam:
    """An uncertain parameter with declared optimistic bound for robust-infeasibility test."""
    key: str                    # Parameter key in ParameterRegistry
    name: str                   # Human-readable name
    optimistic_value: float     # Value most favourable for passing mechanical gates
    pessimistic_value: float    # Value least favourable
    default_value: float        # Current/nominal value
    provenance: str             # CALIBRATED, ASSUMPTION, etc.
    has_declared_bounds: bool = True  # If False, uses default perturbation


@dataclass
class SweepConfig:
    """Complete sweep configuration for the workover classifier."""
    control_axes: List[ControlAxis] = field(default_factory=list)
    epistemic_params: List[EpistemicParam] = field(default_factory=list)
    mechanical_gate_ids: set = field(default_factory=lambda: set(MECHANICAL_GATE_IDS))

    def get_enabled_axes(self) -> List[ControlAxis]:
        return [a for a in self.control_axes if a.enabled]

    def register_axis(self, axis: ControlAxis) -> None:
        """Register a new control axis (e.g. heater power for Feature 2)."""
        # Replace if same key exists
        self.control_axes = [a for a in self.control_axes if a.key != axis.key]
        self.control_axes.append(axis)


def build_default_sweep_config() -> SweepConfig:
    """
    Builds the default sweep configuration for BGW-17A.
    Control axes match the existing optimizer grid but are config-driven
    so new axes (e.g. heater power) can be registered later.
    """
    config = SweepConfig()

    # --- Control Axes ---
    config.control_axes = [
        ControlAxis(
            key="spm",
            name="Pumping Speed",
            state_path=["controls", "spm"],
            levels=[0.8, 1.2, 1.8, 2.2, 2.8, 3.2, 3.6, 4.5, 5.5],
            unit="SPM",
            enabled=True
        ),
        ControlAxis(
            key="stroke_inches",
            name="Stroke Length",
            state_path=["controls", "stroke_inches"],
            levels=[48.0, 64.0, 74.0, 84.0, 96.0, 120.0],
            unit="in",
            enabled=True
        ),
        ControlAxis(
            key="steam_volume_tons",
            name="Steam Volume",
            state_path=["controls", "steam_volume_tons"],
            levels=[1500.0, 2000.0, 2500.0, 3000.0, 3500.0, 4500.0],
            unit="tons",
            enabled=True
        ),
        ControlAxis(
            key="heater_power_kw",
            name="Downhole Electric Heater Power",
            state_path=["controls", "heater_power_kw"],
            levels=[0.0, 10.0, 20.0, 30.0, 40.0],
            unit="kW",
            enabled=False  # Optional axis: disabled by default to reproduce baseline; enabled for heater optimization
        ),
    ]

    # --- Epistemic Parameters (uncertain inputs with declared bounds) ---
    # These are used in the robust-infeasibility test: if even the most optimistic
    # value of each parameter can't clear the gates, workover is robustly needed.
    config.epistemic_params = [
        EpistemicParam(
            key="perm_md",
            name="Reservoir Permeability",
            optimistic_value=3500.0,    # Higher perm → better inflow → lower fillage risk
            pessimistic_value=500.0,
            default_value=1850.0,
            provenance="CALIBRATED",
            has_declared_bounds=True
        ),
        EpistemicParam(
            key="mu_ref_cp",
            name="Reference Viscosity",
            optimistic_value=3000.0,    # Lower visc → less drag → better float margin
            pessimistic_value=25000.0,
            default_value=10000.0,
            provenance="CALIBRATED",
            has_declared_bounds=True
        ),
        EpistemicParam(
            key="visc_energy_b",
            name="Viscosity Activation Energy",
            optimistic_value=2500.0,    # Lower b → less sensitivity → lower cold visc
            pessimistic_value=5500.0,
            default_value=3800.0,
            provenance="CALIBRATED",
            has_declared_bounds=True
        ),
        EpistemicParam(
            key="pump_mech_eff",
            name="Pump Mechanical Efficiency",
            optimistic_value=0.96,      # Higher eff → better fillage
            pessimistic_value=0.78,
            default_value=0.92,
            provenance="ASSUMPTION",
            has_declared_bounds=True
        ),
        EpistemicParam(
            key="skin_factor",
            name="Wellbore Skin Factor",
            optimistic_value=-2.0,      # Negative skin → stimulated well → better inflow
            pessimistic_value=10.0,
            default_value=0.5,
            provenance="CALIBRATED",
            has_declared_bounds=True
        ),
    ]

    return config


# Intervention categories mapped from binding mechanical gate IDs
GATE_INTERVENTION_MAP: Dict[int, Dict[str, str]] = {
    5: {
        "gate_name": "Thermo-Mechanical Stress Limits (PPRL)",
        "category": "ROD_STRING_UPGRADE",
        "advisory": (
            "Rod string derating or upgrade to higher-grade material (API Grade D → Grade K). "
            "Alternatively, reduce stroke length to lower peak tensile load."
        ),
    },
    6: {
        "gate_name": "Rod Float & Compression Safety",
        "category": "PUMP_RELANDING_OR_HEAT",
        "advisory": (
            "Rod float collapse caused by excessive viscous drag at current temperature. "
            "Options: pump re-landing to shallower depth, install long-stroke or hydraulic pumping unit, "
            "add downhole heat source (electric heater or steam restimulation) to reduce viscosity."
        ),
    },
    7: {
        "gate_name": "Pump Clearance & Thermal Expansion",
        "category": "PUMP_REPLACEMENT",
        "advisory": (
            "Pump plunger clearance or thermal expansion limits exceeded. "
            "Options: re-land pump with wider clearance or replace with high-temperature-rated barrel."
        ),
    },
    8: {
        "gate_name": "Gearbox Torque Rating",
        "category": "SURFACE_UNIT_UPGRADE",
        "advisory": (
            "Gearbox torque utilisation exceeds API C-320 continuous rating. "
            "Options: upgrade to higher-capacity surface unit (C-640 or C-912), "
            "or reduce stroke × PPRL product."
        ),
    },
}
