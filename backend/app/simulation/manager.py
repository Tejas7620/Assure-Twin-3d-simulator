"""
backend/app/simulation/manager.py
Singleton instance holder for active simulation engine.
"""

from backend.app.simulation.engine import SimulationEngine

# Authoritative simulation engine instance
active_sim_engine = SimulationEngine()

def get_sim_engine() -> SimulationEngine:
    return active_sim_engine
