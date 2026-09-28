"""
app/config.py
Centralized configuration & environment variables for ASSURE-TWIN.
"""

import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List

class Settings(BaseSettings):
    model_config = SettingsConfigDict(case_sensitive=True, env_file=".env", extra="ignore")

    PROJECT_NAME: str = "ASSURE-TWIN"
    PROJECT_SUBTITLE: str = "Decision-Assured Well-to-Surface Digital Twin"
    VERSION: str = "2.4.0"
    API_V1_PREFIX: str = "/api/v1"
    
    # Database configuration (SQLite for local, PostgreSQL ready)
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./assure_twin.db")
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "assure-twin-insecure-dev-key-change-in-prod-7620")
    
    # CORS
    CORS_ORIGINS: List[str] = ["*"]
    
    # Default Baghewala Asset Identifiers
    DEFAULT_FIELD_ID: str = "FLD-BAGHEWALA-01"
    DEFAULT_FIELD_NAME: str = "Baghewala"
    DEFAULT_WELL_ID: str = "BGW-17A"
    DEFAULT_FORMATION: str = "Jodhpur Sandstone"
    
    # Operational Thresholds (API RP 11L & Baghewala Field limits)
    PPRL_MAX_KN: float = 65.0
    FLOAT_MARGIN_MIN_PCT: float = 10.0
    PUMP_FILLAGE_MIN_PCT: float = 30.0
    DAILY_ENERGY_LIMIT_KWH: float = 450.0
    STEAM_PRESSURE_MAX_BAR: float = 125.0
    DATA_QUALITY_ACCEPTABLE_MIN: float = 70.0
    
    # Simulation Timestep
    SIM_BROADCAST_HZ: float = 12.5


settings = Settings()
