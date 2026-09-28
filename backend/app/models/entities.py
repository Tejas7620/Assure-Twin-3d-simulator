"""
app/models/entities.py
Complete SQLAlchemy 2.0 Relational Data Models for ASSURE-TWIN.
Supports Field, Well, Subsurface Reservoirs, CSS Cycles, SRP Configurations,
High-Frequency Sensor Observations, Forecast Horizons, Scenarios, Optimization Runs,
Certified Recommendation Contracts, Alerts, Model Versions, and Cryptographic Audits.
"""

from sqlalchemy import (
    Column, String, Float, Integer, Boolean, DateTime, ForeignKey, Text, JSON
)
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from ..database import Base

def gen_uuid() -> str:
    return str(uuid.uuid4())

class Field(Base):
    __tablename__ = "fields"

    id = Column(String, primary_key=True, default=gen_uuid)
    name = Column(String, unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    location = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    wells = relationship("Well", back_populates="field", cascade="all, delete-orphan")


class Well(Base):
    __tablename__ = "wells"

    id = Column(String, primary_key=True, default=gen_uuid)
    field_id = Column(String, ForeignKey("fields.id"), nullable=False)
    well_name = Column(String, nullable=False, index=True)
    well_api_id = Column(String, unique=True, nullable=False)
    status = Column(String, default="ACTIVE") # ACTIVE, SHUT_IN, COOLING, CSS_INJECTION
    reservoir_id = Column(String, nullable=True)
    depth = Column(Float, default=1450.0)
    tvd = Column(Float, default=1420.0)
    md = Column(Float, default=1840.0)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    completion_type = Column(String, default="Slotted Liner in Horizontal Drainhole")
    pump_type = Column(String, default="API Insert Plunger Pump (1.75 in)")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    field = relationship("Field", back_populates="wells")
    css_cycles = relationship("CSSCycle", back_populates="well", cascade="all, delete-orphan")
    srp_configurations = relationship("SRPConfiguration", back_populates="well", cascade="all, delete-orphan")
    production_observations = relationship("ProductionObservation", back_populates="well", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="well", cascade="all, delete-orphan")
    recommendations = relationship("Recommendation", back_populates="well", cascade="all, delete-orphan")


class Reservoir(Base):
    __tablename__ = "reservoirs"

    id = Column(String, primary_key=True, default=gen_uuid)
    name = Column(String, nullable=False)
    formation = Column(String, nullable=False) # e.g. Jodhpur Sandstone
    top_depth = Column(Float, default=1380.0)
    bottom_depth = Column(Float, default=1440.0)
    temperature = Column(Float, default=38.0) # Baseline formation temp
    pressure = Column(Float, default=68.4) # Initial reservoir pressure in bar
    porosity = Column(Float, default=0.224) # 22.4%
    permeability = Column(Float, default=1250.0) # 1,250 mD
    oil_saturation = Column(Float, default=0.68) # 68%
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Completion(Base):
    __tablename__ = "completions"

    id = Column(String, primary_key=True, default=gen_uuid)
    well_id = Column(String, ForeignKey("wells.id"), nullable=False)
    casing_od = Column(Float, default=7.0) # inches
    tubing_od = Column(Float, default=2.875) # inches
    perforation_top = Column(Float, default=1410.0)
    perforation_bottom = Column(Float, default=1840.0)
    created_at = Column(DateTime, default=datetime.utcnow)


class FluidProperty(Base):
    __tablename__ = "fluid_properties"

    id = Column(String, primary_key=True, default=gen_uuid)
    well_id = Column(String, ForeignKey("wells.id"), nullable=False)
    api_gravity = Column(Float, default=11.2) # API for Baghewala heavy crude
    viscosity = Column(Float, default=1840.0) # cP at reference temperature
    reference_temperature = Column(Float, default=72.6) # °C
    water_cut = Column(Float, default=0.128) # 12.8%
    density = Column(Float, default=992.0) # kg/m3
    asphaltene_content = Column(Float, default=14.5) # wt%
    valid_from = Column(DateTime, default=datetime.utcnow)
    valid_to = Column(DateTime, nullable=True)


class CSSCycle(Base):
    __tablename__ = "css_cycles"

    id = Column(String, primary_key=True, default=gen_uuid)
    well_id = Column(String, ForeignKey("wells.id"), nullable=False)
    cycle_number = Column(Integer, default=3)
    injection_volume = Column(Float, default=2500.0) # metric tons
    injection_rate = Column(Float, default=180.0) # t/d
    injection_pressure = Column(Float, default=120.0) # bar
    injection_temperature = Column(Float, default=324.0) # °C
    injection_duration = Column(Float, default=14.0) # days
    soak_duration = Column(Float, default=7.0) # days
    production_cutoff = Column(Float, default=60.0) # days
    start_time = Column(DateTime, default=datetime.utcnow)
    injection_end = Column(DateTime, nullable=True)
    soak_end = Column(DateTime, nullable=True)
    production_start = Column(DateTime, nullable=True)
    cycle_end = Column(DateTime, nullable=True)

    well = relationship("Well", back_populates="css_cycles")


class SRPConfiguration(Base):
    __tablename__ = "srp_configurations"

    id = Column(String, primary_key=True, default=gen_uuid)
    well_id = Column(String, ForeignKey("wells.id"), nullable=False)
    pump_type = Column(String, default="API Insert Pump")
    pump_diameter = Column(Float, default=1.75) # inches
    stroke_length = Column(Float, default=64.0) # inches
    spm_min = Column(Float, default=0.5)
    spm_max = Column(Float, default=10.0)
    vfd_min = Column(Float, default=10.0) # Hz
    vfd_max = Column(Float, default=120.0) # Hz
    rod_length = Column(Float, default=1420.0) # m
    rod_density = Column(Float, default=7850.0) # kg/m3 (Steel Grade D)
    rod_area = Column(Float, default=0.000388) # m2 (7/8" rod)
    pump_depth = Column(Float, default=1420.0) # m TVD
    efficiency_factor = Column(Float, default=0.88)

    well = relationship("Well", back_populates="srp_configurations")


class SRPOperatingState(Base):
    __tablename__ = "srp_operating_states"

    id = Column(String, primary_key=True, default=gen_uuid)
    well_id = Column(String, ForeignKey("wells.id"), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    spm = Column(Float, default=3.2)
    stroke_length = Column(Float, default=64.0)
    vfd = Column(Float, default=62.0)
    pump_fillage = Column(Float, default=56.6) # %
    pump_efficiency = Column(Float, default=72.1) # %
    rod_load = Column(Float, default=18.7) # kN
    rod_drag = Column(Float, default=1.85) # kN
    float_margin = Column(Float, default=28.9) # %
    motor_power = Column(Float, default=14.2) # kW


class ProductionObservation(Base):
    __tablename__ = "production_observations"

    id = Column(String, primary_key=True, default=gen_uuid)
    well_id = Column(String, ForeignKey("wells.id"), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    oil_rate = Column(Float, default=32.6) # BOPD
    liquid_rate = Column(Float, default=37.4) # BPD
    water_cut = Column(Float, default=0.128) # 12.8%
    gas_rate = Column(Float, default=4.2) # Mscfd
    steam_rate = Column(Float, default=42.3) # t/d
    sor = Column(Float, default=6.2) # t/t
    energy = Column(Float, default=340.8) # kWh/d
    pressure = Column(Float, default=18.2) # bar Pwf
    temperature = Column(Float, default=72.6) # °C
    source = Column(String, default="MODEL_DERIVED")

    well = relationship("Well", back_populates="production_observations")


class SensorObservation(Base):
    __tablename__ = "sensor_observations"

    id = Column(String, primary_key=True, default=gen_uuid)
    well_id = Column(String, ForeignKey("wells.id"), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    sensor_type = Column(String, nullable=False) # e.g. WHP, WHT, FLUID_LEVEL, MOTOR_CURRENT
    value = Column(Float, nullable=False)
    unit = Column(String, nullable=False)
    quality = Column(Float, default=1.0) # 0.0 to 1.0
    source = Column(String, default="SCADA_TELEMETRY")
    is_stale = Column(Boolean, default=False)
    is_outlier = Column(Boolean, default=False)
    metadata_json = Column(JSON, nullable=True)


class SimulationRun(Base):
    __tablename__ = "simulation_runs"

    id = Column(String, primary_key=True, default=gen_uuid)
    well_id = Column(String, ForeignKey("wells.id"), nullable=False)
    scenario_id = Column(String, nullable=True)
    start_time = Column(DateTime, default=datetime.utcnow)
    end_time = Column(DateTime, nullable=True)
    simulation_time = Column(Float, default=41.2) # days
    simulation_speed = Column(Float, default=1.0)
    status = Column(String, default="RUNNING") # RUNNING, PAUSED, COMPLETED
    parameters_json = Column(JSON, nullable=True)
    results_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Scenario(Base):
    __tablename__ = "scenarios"

    id = Column(String, primary_key=True, default=gen_uuid)
    well_id = Column(String, ForeignKey("wells.id"), nullable=False)
    name = Column(String, nullable=False)
    type = Column(String, nullable=False) # CURRENT, CSS_ONLY, SRP_ONLY, JOINT, CUSTOM
    description = Column(Text, nullable=True)
    base_run_id = Column(String, nullable=True)
    control_parameters = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    results = relationship("ScenarioResult", back_populates="scenario", cascade="all, delete-orphan")


class ScenarioResult(Base):
    __tablename__ = "scenario_results"

    id = Column(String, primary_key=True, default=gen_uuid)
    scenario_id = Column(String, ForeignKey("scenarios.id"), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    oil_rate = Column(Float, nullable=False)
    sor = Column(Float, nullable=False)
    energy = Column(Float, nullable=False)
    temperature = Column(Float, nullable=False)
    viscosity = Column(Float, nullable=False)
    pump_fillage = Column(Float, nullable=False)
    rod_load = Column(Float, nullable=False)
    float_margin = Column(Float, nullable=False)
    pressure = Column(Float, default=18.2)
    thermal_front = Column(Float, default=14.5)
    production_cost = Column(Float, default=24.5)
    net_value = Column(Float, default=1240.0)

    scenario = relationship("Scenario", back_populates="results")


class ForecastRun(Base):
    __tablename__ = "forecast_runs"

    id = Column(String, primary_key=True, default=gen_uuid)
    well_id = Column(String, ForeignKey("wells.id"), nullable=False)
    horizon_days = Column(Integer, default=14)
    model_version = Column(String, default="MarxLangenheim-v2.1")
    status = Column(String, default="COMPLETED")
    created_at = Column(DateTime, default=datetime.utcnow)

    points = relationship("ForecastPoint", back_populates="forecast_run", cascade="all, delete-orphan")


class ForecastPoint(Base):
    __tablename__ = "forecast_points"

    id = Column(String, primary_key=True, default=gen_uuid)
    forecast_run_id = Column(String, ForeignKey("forecast_runs.id"), nullable=False)
    forecast_day = Column(Integer, nullable=False) # +0, +1, +3, +7, +14, +30
    temperature = Column(Float, nullable=False)
    viscosity = Column(Float, nullable=False)
    oil_rate = Column(Float, nullable=False)
    sor = Column(Float, nullable=False)
    energy = Column(Float, nullable=False)
    pump_fillage = Column(Float, nullable=False)
    rod_load = Column(Float, nullable=False)
    float_margin = Column(Float, nullable=False)
    confidence_lower = Column(Float, nullable=False)
    confidence_upper = Column(Float, nullable=False)

    forecast_run = relationship("ForecastRun", back_populates="points")


class OptimizationRun(Base):
    __tablename__ = "optimization_runs"

    id = Column(String, primary_key=True, default=gen_uuid)
    well_id = Column(String, ForeignKey("wells.id"), nullable=False)
    objective_weights = Column(JSON, nullable=False) # {oil: 1.0, steam: 0.45, risk: 0.85}
    constraints = Column(JSON, nullable=False)
    status = Column(String, default="COMPLETED")
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    candidates = relationship("OptimizationCandidate", back_populates="optimization_run", cascade="all, delete-orphan")


class OptimizationCandidate(Base):
    __tablename__ = "optimization_candidates"

    id = Column(String, primary_key=True, default=gen_uuid)
    optimization_run_id = Column(String, ForeignKey("optimization_runs.id"), nullable=False)
    steam_rate = Column(Float, default=42.3)
    steam_volume = Column(Float, default=2400.0)
    injection_pressure = Column(Float, default=118.0)
    soak_time = Column(Float, default=6.0)
    production_cutoff = Column(Float, default=58.0)
    spm = Column(Float, default=2.8)
    stroke = Column(Float, default=74.0)
    vfd = Column(Float, default=55.0)
    oil_rate = Column(Float, default=33.4)
    sor = Column(Float, default=5.9)
    energy = Column(Float, default=14.8)
    rod_load = Column(Float, default=17.2)
    float_margin = Column(Float, default=27.4)
    pump_fillage = Column(Float, default=78.2)
    robustness = Column(String, default="HIGH")
    constraint_status = Column(String, default="PASS")
    overall_score = Column(Float, default=0.92)

    optimization_run = relationship("OptimizationRun", back_populates="candidates")


class Recommendation(Base):
    __tablename__ = "recommendations"

    id = Column(String, primary_key=True, default=gen_uuid)
    well_id = Column(String, ForeignKey("wells.id"), nullable=False)
    optimization_run_id = Column(String, nullable=True)
    scenario_id = Column(String, nullable=True)
    status = Column(String, default="VERIFIED") # CREATED, VERIFIED, APPROVED, REJECTED, APPLIED
    title = Column(String, nullable=False)
    rationale = Column(Text, nullable=False)
    proposed_controls = Column(JSON, nullable=False)
    expected_outcome = Column(JSON, nullable=False)
    uncertainty = Column(JSON, nullable=True)
    robustness = Column(String, default="HIGH")
    preconditions = Column(JSON, nullable=True)
    abort_conditions = Column(JSON, nullable=True)
    physics_result = Column(JSON, nullable=True)
    ml_result = Column(JSON, nullable=True)
    model_agreement = Column(String, default="AGREEMENT")
    ood_status = Column(String, default="LOW")
    provenance_summary = Column(String, default="PHYSICS_CALIBRATED")
    created_at = Column(DateTime, default=datetime.utcnow)
    approved_at = Column(DateTime, nullable=True)
    rejected_at = Column(DateTime, nullable=True)

    well = relationship("Well", back_populates="recommendations")
    events = relationship("RecommendationEvent", back_populates="recommendation", cascade="all, delete-orphan")


class RecommendationEvent(Base):
    __tablename__ = "recommendation_events"

    id = Column(String, primary_key=True, default=gen_uuid)
    recommendation_id = Column(String, ForeignKey("recommendations.id"), nullable=False)
    event_type = Column(String, nullable=False) # CREATED, SIMULATED, VERIFIED, APPROVED, REJECTED, DATA_REQUESTED, APPLIED, RECONCILED
    actor = Column(String, default="Senior Production Engineer (ONGC / Baghewala Asset)")
    timestamp = Column(DateTime, default=datetime.utcnow)
    comment = Column(Text, nullable=True)
    metadata_json = Column(JSON, nullable=True)

    recommendation = relationship("Recommendation", back_populates="events")


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(String, primary_key=True, default=gen_uuid)
    well_id = Column(String, ForeignKey("wells.id"), nullable=False)
    severity = Column(String, default="WARNING") # INFO, WARNING, CRITICAL, BLOCKED
    type = Column(String, nullable=False) # PUMPABILITY_DECLINING, FLOAT_MARGIN_LOW, VISCOSITY_RISING
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    value = Column(Float, nullable=True)
    threshold = Column(Float, nullable=True)
    status = Column(String, default="ACTIVE") # ACTIVE, ACKNOWLEDGED, RESOLVED
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    acknowledged_at = Column(DateTime, nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    metadata_json = Column(JSON, nullable=True)

    well = relationship("Well", back_populates="alerts")


class CalibrationRun(Base):
    __tablename__ = "calibration_runs"

    id = Column(String, primary_key=True, default=gen_uuid)
    well_id = Column(String, ForeignKey("wells.id"), nullable=False)
    dataset_reference = Column(String, default="BGW-17A-Cycle3-Production-History")
    model_type = Column(String, default="THERMAL_VISCOSITY_COUPLED")
    status = Column(String, default="APPROVED")
    error_before = Column(Float, default=0.284)
    error_after = Column(Float, default=0.048)
    created_at = Column(DateTime, default=datetime.utcnow)
    approved_at = Column(DateTime, nullable=True)

    parameters = relationship("CalibrationParameter", back_populates="calibration_run", cascade="all, delete-orphan")


class CalibrationParameter(Base):
    __tablename__ = "calibration_parameters"

    id = Column(String, primary_key=True, default=gen_uuid)
    calibration_run_id = Column(String, ForeignKey("calibration_runs.id"), nullable=False)
    parameter_name = Column(String, nullable=False) # e.g. thermalDecayRate, andradeB
    old_value = Column(Float, nullable=False)
    new_value = Column(Float, nullable=False)
    confidence = Column(Float, default=0.95)
    source = Column(String, default="HISTORY_MATCHING")

    calibration_run = relationship("CalibrationRun", back_populates="parameters")


class ModelVersion(Base):
    __tablename__ = "model_versions"

    id = Column(String, primary_key=True, default=gen_uuid)
    name = Column(String, nullable=False)
    version = Column(String, nullable=False)
    model_type = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    artifact_reference = Column(String, nullable=True)
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class ProvenanceRecord(Base):
    __tablename__ = "provenance_records"

    id = Column(String, primary_key=True, default=gen_uuid)
    entity_type = Column(String, nullable=False)
    entity_id = Column(String, nullable=False)
    field_name = Column(String, nullable=False)
    source_type = Column(String, nullable=False) # MEASURED, PUBLIC, CALIBRATED, ASSUMED, SYNTHETIC, PREDICTED, MODEL_DERIVED, DEMO
    source_reference = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class AuditEvent(Base):
    __tablename__ = "audit_events"

    id = Column(String, primary_key=True, default=gen_uuid)
    actor = Column(String, nullable=False)
    action = Column(String, nullable=False)
    entity_type = Column(String, nullable=False)
    entity_id = Column(String, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    details = Column(JSON, nullable=True)
