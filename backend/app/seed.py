"""
backend/app/seed.py
Database Seeder for ASSURE-TWIN.
Populates Baghewala Field, BGW-17A Well, CSS History, SRP Configurations, Recommendations, and Baseline Observations.
"""

from datetime import datetime, timedelta, timezone

from backend.app.database import SessionLocal, init_db
from backend.app.models.entities import (
    Field, Well, CSSCycle, SRPConfiguration, ProductionObservation,
    Alert, ModelVersion, AuditEvent
)

def seed_database():
    print("[SEED] Initializing database tables...")
    init_db()
    db = SessionLocal()

    try:
        # Check if already seeded
        existing_field = db.query(Field).filter(Field.name == "Baghewala Heavy Oil Field").first()
        if existing_field:
            print("[SEED] Database already seeded. Skipping initial seed.")
            return

        print("[SEED] Seeding Field and Well entities...")
        field_id = "field-baghewala-01"
        baghewala = Field(
            id=field_id,
            name="Baghewala Heavy Oil Field",
            description="Bikaner-Nagaur Basin, Western Rajasthan. Ultra-heavy crude (~9.2 deg API) in Jodhpur Sandstone.",
            location="Rajasthan, India"
        )
        db.add(baghewala)

        well_id = "BGW-17A"
        bgw_17a = Well(
            id=well_id,
            field_id=field_id,
            well_name="BGW-17A (Heavy Oil Producer)",
            well_api_id="IND-RJ-BGW-17A",
            status="ACTIVE",
            depth=1450.0,
            tvd=1420.0,
            md=1840.0,
            completion_type="Slotted Liner with Thermal Packers in Heavy Oil Sand",
            pump_type="API Conventional C-320-256-100 Sucker Rod Pump"
        )
        db.add(bgw_17a)
        db.commit()

        print("[SEED] Seeding CSS Cycles history...")
        now = datetime.now(timezone.utc)
        cycle_1 = CSSCycle(
            id="css-cycle-01",
            well_id=well_id,
            cycle_number=1,
            injection_volume=2200.0,
            injection_rate=140.0,
            injection_pressure=110.0,
            injection_temperature=310.0,
            injection_duration=16.0,
            soak_duration=6.0,
            production_cutoff=60.0,
            start_time=now - timedelta(days=360),
            cycle_end=now - timedelta(days=270)
        )
        cycle_2 = CSSCycle(
            id="css-cycle-02",
            well_id=well_id,
            cycle_number=2,
            injection_volume=2450.0,
            injection_rate=160.0,
            injection_pressure=115.0,
            injection_temperature=320.0,
            injection_duration=18.0,
            soak_duration=5.0,
            production_cutoff=60.0,
            start_time=now - timedelta(days=265),
            cycle_end=now - timedelta(days=180)
        )
        cycle_3 = CSSCycle(
            id="css-cycle-03",
            well_id=well_id,
            cycle_number=3,
            injection_volume=2500.0,
            injection_rate=175.0,
            injection_pressure=120.0,
            injection_temperature=324.0,
            injection_duration=20.0,
            soak_duration=5.0,
            production_cutoff=60.0,
            start_time=now - timedelta(days=175),
            cycle_end=now - timedelta(days=75)
        )
        cycle_4 = CSSCycle(
            id="css-cycle-04",
            well_id=well_id,
            cycle_number=4,
            injection_volume=2400.0,
            injection_rate=180.0,
            injection_pressure=118.0,
            injection_temperature=322.0,
            injection_duration=19.0,
            soak_duration=5.0,
            production_cutoff=60.0,
            start_time=now - timedelta(days=40),
            cycle_end=None
        )
        db.add_all([cycle_1, cycle_2, cycle_3, cycle_4])

        print("[SEED] Seeding SRP Configuration...")
        srp_config = SRPConfiguration(
            id="srp-cfg-01",
            well_id=well_id,
            pump_type="API Conventional C-320-256-100",
            pump_diameter=1.75,
            stroke_length=64.0,
            spm_min=0.5,
            spm_max=8.0,
            vfd_min=10.0,
            vfd_max=90.0,
            rod_length=1420.0,
            rod_density=7850.0,
            rod_area=0.000388,
            pump_depth=1420.0,
            efficiency_factor=0.88
        )
        db.add(srp_config)

        print("[SEED] Seeding baseline Production Observations...")
        obs_records = []
        for d in range(30, 0, -1):
            t = 120.0 - (30 - d) * 1.6 # Cooling curve
            oil_rate = 38.0 - (30 - d) * 0.18
            obs = ProductionObservation(
                id=f"obs-{d}",
                well_id=well_id,
                timestamp=now - timedelta(days=d),
                oil_rate=round(oil_rate, 1),
                liquid_rate=round(oil_rate * 1.15, 1),
                water_cut=0.128,
                gas_rate=4.2,
                steam_rate=0.0,
                sor=round(2.84 + (30 - d) * 0.03, 2),
                energy=round(22.4 + (30 - d) * 0.15, 1),
                pressure=18.2,
                temperature=round(t, 1),
                source="CALIBRATED_TELEMETRY"
            )
            obs_records.append(obs)
        db.add_all(obs_records)

        print("[SEED] Seeding Alerts...")
        alt1 = Alert(
            id="ALT-2026-081",
            well_id=well_id,
            severity="WARNING",
            type="THERMAL_RESERVE_BOUNDARY",
            title="Thermal Reserve Boundary Approaching",
            description="Downhole temperature at 72.6°C. Forecasted to cross critical 58°C threshold in 24.3 days.",
            value=72.6,
            threshold=58.0,
            status="ACTIVE"
        )
        alt2 = Alert(
            id="ALT-2026-082",
            well_id=well_id,
            severity="INFO",
            type="OPTIMIZATION_OPPORTUNITY",
            title="Optimal Stroke Adjustment Available",
            description="Joint optimizer suggests 74\" stroke with 2.8 SPM to increase net daily margin by ₹ 42,600.",
            value=2.8,
            threshold=3.2,
            status="ACTIVE"
        )
        db.add_all([alt1, alt2])

        print("[SEED] Seeding ML Model Registry and Audit Events...")
        model_ver = ModelVersion(
            id="ml-mod-01",
            name="Baghewala Heavy Oil Viscosity & Inflow Surrogate",
            version="v2.4.1-calibrated",
            model_type="HYBRID_PHYSICS_ML",
            description="Neural surrogate trained on Baghewala CSS cycles with Marx-Langenheim physics prior.",
            artifact_reference="models/baghewala_v2_4_1.onnx",
            active=True
        )
        db.add(model_ver)

        audit = AuditEvent(
            id="audit-001",
            actor="SYSTEM_ADMIN",
            action="INITIAL_SEED_CALIBRATION",
            entity_type="SYSTEM",
            entity_id="ALL",
            details={"notes": "Database seeded with calibrated historical production and physical parameters of Well BGW-17A."}
        )
        db.add(audit)

        db.commit()
        print("[SEED] Successfully completed database seeding!")
    except Exception as e:
        db.rollback()
        print(f"[SEED ERROR] Error seeding database: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
