"""
backend/app/simulation/__init__.py
Authoritative reduced-order physics simulation engine for Baghewala Field Heavy Oil Wells.
"""

from .engine import SimulationEngine
from .reservoir import ReservoirModel
from .thermal import ThermalModel
from .viscosity import ViscosityModel
from .inflow import InflowModel
from .pump import DownholePumpModel
from .production import ProductionModel
from .srp import SRPDynamicsModel
from .economics import EconomicsModel

__all__ = [
    "SimulationEngine",
    "ReservoirModel",
    "ThermalModel",
    "ViscosityModel",
    "InflowModel",
    "DownholePumpModel",
    "ProductionModel",
    "SRPDynamicsModel",
    "EconomicsModel",
]
