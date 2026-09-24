import sys
import os
import random
import json
from datetime import datetime, timezone, timedelta

# Ensure backend root is on sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.db.base import Base
from app.db.session import engine, SessionLocal
from app.core.security import hash_password
from app.models import (
    Role, Permission, UserRole, User, UserMineAssignment,
    Mine, MineLevel, MineZone,
    SensorType, Sensor, SensorReading,
    Camera, Equipment,
    Incident, IncidentEvent,
    Violation, CorrectiveAction,
    RiskScore, RiskFactor, AnomalyEvent,
    Alert, AuditEvent,
    Shift, Worker, AttendanceRecord,
    Contractor, Contract, ContractRequirement,
    ProductionReport, EnvironmentalRule, EnvironmentalObservation,
    Grievance, RegulatoryReport, ReportVersion,
    GovernanceTask, ApprovalRequest, ApprovalAction,
    FieldInspection, FieldEvidence, FieldSyncLog
)
from app.services.audit_service import AuditService

def seed():
    print("Initializing Database schema...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        if db.query(Role).first():
            print("Resetting database schema for clean Phase 2 seed...")
            Base.metadata.drop_all(bind=engine)
            Base.metadata.create_all(bind=engine)

        print("Seeding Roles and Permissions...")
        roles = {
            "SYSTEM_ADMIN": Role(name="SYSTEM_ADMIN", description="Platform Administrator with cross-mine governance"),
            "MINE_MANAGER": Role(name="MINE_MANAGER", description="Operational Mine Manager scoped to assigned mine"),
            "MINE_SAFETY_OFFICER": Role(name="MINE_SAFETY_OFFICER", description="Safety Compliance Officer for mine safety protocols"),
            "FIELD_INSPECTOR": Role(name="FIELD_INSPECTOR", description="Field Inspector logging observations and violations"),
            "CONTRACTOR_MANAGER": Role(name="CONTRACTOR_MANAGER", description="Contractor workforce compliance officer"),
            "REGULATOR": Role(name="REGULATOR", description="DGMS / Statutory Regulatory auditor with oversight")
        }
        for r in roles.values():
            db.add(r)
        db.commit()

        print("Seeding Sensor Types...")
        st = {
            "CH4": SensorType(code="METHANE", name="Methane Gas (CH4)", unit="%", default_normal_min=0.0, default_normal_max=0.5, default_warning_threshold=0.75, default_critical_threshold=1.25, description="Underground seam methane concentration"),
            "CO": SensorType(code="CARBON_MONOXIDE", name="Carbon Monoxide (CO)", unit="ppm", default_normal_min=0.0, default_normal_max=15.0, default_warning_threshold=25.0, default_critical_threshold=50.0, description="Early spontaneous combustion indicator"),
            "TEMP": SensorType(code="TEMPERATURE", name="Ambient Temperature", unit="°C", default_normal_min=18.0, default_normal_max=32.0, default_warning_threshold=36.0, default_critical_threshold=42.0, description="Working face temperature"),
            "VEL": SensorType(code="AIR_VELOCITY", name="Airway Ventilation Velocity", unit="m/s", default_normal_min=1.5, default_normal_max=6.0, default_warning_threshold=1.0, default_critical_threshold=0.5, description="Main return airway airflow rate"),
            "DUST": SensorType(code="DUST_PM", name="Respirable Coal Dust PM10", unit="mg/m3", default_normal_min=0.0, default_normal_max=2.0, default_warning_threshold=3.0, default_critical_threshold=5.0, description="Particulate matter exposure"),
            "VIB": SensorType(code="VIBRATION", name="Strata Seismic Vibration", unit="mm/s", default_normal_min=0.0, default_normal_max=3.0, default_warning_threshold=6.0, default_critical_threshold=10.0, description="Roof strata stability vibration"),
            "HUM": SensorType(code="HUMIDITY", name="Relative Humidity", unit="%RH", default_normal_min=40.0, default_normal_max=80.0, default_warning_threshold=88.0, default_critical_threshold=95.0, description="Gallery relative humidity"),
            "PRES": SensorType(code="PRESSURE", name="Barometric Pressure", unit="kPa", default_normal_min=98.0, default_normal_max=103.0, default_warning_threshold=95.0, default_critical_threshold=92.0, description="Atmospheric barometric pressure")
        }
        for s in st.values():
            db.add(s)
        db.commit()

        print("Seeding 3 Realistic Demo Coal Mines...")
        m1 = Mine(code="MINE-BDS-04", name="Bharat Deep Shaft 4", description="Deep underground mechanized longwall coal mine in Jharia coalfields.", mine_type="UNDERGROUND", state="Jharkhand", district="Dhanbad", latitude=23.7957, longitude=86.4304, elevation=-320.0, status="OPERATIONAL")
        m2 = Mine(code="MINE-SOB-02", name="Singrauli OpenCast Basin", description="Large-scale mechanized opencast coal deposit with dragline benches.", mine_type="OPENCAST", state="Madhya Pradesh", district="Singrauli", latitude=24.1997, longitude=82.6645, elevation=280.0, status="OPERATIONAL")
        m3 = Mine(code="MINE-RS-07", name="Raniganj Seam 7 Incline", description="Intermediate depth underground incline mine with continuous miner galleries.", mine_type="UNDERGROUND", state="West Bengal", district="Paschim Bardhaman", latitude=23.6186, longitude=87.1264, elevation=-180.0, status="OPERATIONAL")
        db.add_all([m1, m2, m3])
        db.commit()

        print("Seeding Levels and Zones...")
        # Mine 1 Levels & Zones
        m1_l0 = MineLevel(mine_id=m1.id, code="LVL-SURF", name="Surface Yard & Fan Complex", depth_meters=0.0, elevation=210.0, sequence_order=0)
        m1_l1 = MineLevel(mine_id=m1.id, code="LVL-SEAM-01", name="Seam 1 Haulage (220m Depth)", depth_meters=220.0, elevation=-10.0, sequence_order=1)
        m1_l2 = MineLevel(mine_id=m1.id, code="LVL-SEAM-02", name="Seam 2 Longwall Workings (320m Depth)", depth_meters=320.0, elevation=-110.0, sequence_order=2)
        db.add_all([m1_l0, m1_l1, m1_l2])
        db.commit()

        m1_z_east = MineZone(mine_id=m1.id, level_id=m1_l2.id, code="ZN-EAST-LW-102", name="East Longwall Face 102", zone_type="PRODUCTION", risk_category="HIGH", origin_x=120.0, origin_y=450.0, origin_z=-320.0, width=200.0, length=400.0, height=4.5)
        m1_z_west = MineZone(mine_id=m1.id, level_id=m1_l2.id, code="ZN-WEST-DEV-201", name="West Heading Development", zone_type="PRODUCTION", risk_category="MEDIUM", origin_x=-150.0, origin_y=350.0, origin_z=-320.0, width=150.0, length=300.0, height=4.0)
        m1_z_haul = MineZone(mine_id=m1.id, level_id=m1_l1.id, code="ZN-MAIN-HAUL-A", name="Main Haulage Drift A", zone_type="HAULAGE", risk_category="MEDIUM", origin_x=0.0, origin_y=100.0, origin_z=-220.0, width=50.0, length=800.0, height=5.0)
        m1_z_vent = MineZone(mine_id=m1.id, level_id=m1_l0.id, code="ZN-VENT-FAN-SURF", name="Main Exhauster Fan House", zone_type="VENTILATION", risk_category="LOW", origin_x=-50.0, origin_y=-30.0, origin_z=210.0, width=40.0, length=40.0, height=8.0)
        db.add_all([m1_z_east, m1_z_west, m1_z_haul, m1_z_vent])

        # Mine 2 Levels & Zones
        m2_l1 = MineLevel(mine_id=m2.id, code="LVL-PIT-01", name="Pit Bench Level 3", depth_meters=45.0, elevation=235.0, sequence_order=1)
        m2_l2 = MineLevel(mine_id=m2.id, code="LVL-PIT-02", name="Deep Bench Level 6", depth_meters=90.0, elevation=190.0, sequence_order=2)
        db.add_all([m2_l1, m2_l2])
        db.commit()

        m2_z_b3 = MineZone(mine_id=m2.id, level_id=m2_l1.id, code="ZN-PIT-BENCH-3A", name="Bench 3A Shovel Zone", zone_type="PRODUCTION", risk_category="MEDIUM", origin_x=300.0, origin_y=200.0, origin_z=235.0, width=300.0, length=500.0, height=15.0)
        m2_z_haul = MineZone(mine_id=m2.id, level_id=m2_l1.id, code="ZN-HAUL-ROAD-EAST", name="East Main Haul Road", zone_type="HAULAGE", risk_category="LOW", origin_x=100.0, origin_y=50.0, origin_z=250.0, width=80.0, length=1200.0, height=10.0)
        db.add_all([m2_z_b3, m2_z_haul])

        # Mine 3 Levels & Zones
        m3_l1 = MineLevel(mine_id=m3.id, code="LVL-RS-07", name="Seam 7 Incline Workings", depth_meters=180.0, elevation=-30.0, sequence_order=1)
        db.add(m3_l1)
        db.commit()
        m3_z_hd = MineZone(mine_id=m3.id, level_id=m3_l1.id, code="ZN-HEADING-NORTH", name="North Development Heading", zone_type="PRODUCTION", risk_category="MEDIUM", origin_x=80.0, origin_y=300.0, origin_z=-180.0, width=60.0, length=250.0, height=3.8)
        db.add(m3_z_hd)
        db.commit()

        print("Seeding Users...")
        pwd = hash_password("Trinetra@2026")
        u_admin = User(email="admin@trinetra.gov.in", full_name="Dr. Arvind Sharma", hashed_password=pwd, designation="Chief Compliance Officer", department="Directorate of Mine Governance", is_superuser=True)
        u_mgr1 = User(email="manager.mine1@trinetra.gov.in", full_name="Rajesh Verma", hashed_password=pwd, designation="General Mine Manager", department="Operations BDS-04")
        u_safety1 = User(email="safety.mine1@trinetra.gov.in", full_name="Sanjay K. Roy", hashed_password=pwd, designation="Senior Safety Officer", department="Safety Engineering BDS-04")
        u_mgr2 = User(email="manager.mine2@trinetra.gov.in", full_name="Pooja Deshmukh", hashed_password=pwd, designation="Project Officer", department="Operations SOB-02")
        u_insp = User(email="inspector.dgms@trinetra.gov.in", full_name="Vikramaditya Rathore", hashed_password=pwd, designation="Deputy Director DGMS", department="Field Inspection")
        u_reg = User(email="regulator@dgms.gov.in", full_name="Ananya Sengupta", hashed_password=pwd, designation="Statutory Commissioner", department="Ministry of Coal")
        db.add_all([u_admin, u_mgr1, u_safety1, u_mgr2, u_insp, u_reg])
        db.commit()

        db.add(UserRole(user_id=u_admin.id, role_id=roles["SYSTEM_ADMIN"].id))
        db.add(UserRole(user_id=u_mgr1.id, role_id=roles["MINE_MANAGER"].id))
        db.add(UserRole(user_id=u_safety1.id, role_id=roles["MINE_SAFETY_OFFICER"].id))
        db.add(UserRole(user_id=u_mgr2.id, role_id=roles["MINE_MANAGER"].id))
        db.add(UserRole(user_id=u_insp.id, role_id=roles["FIELD_INSPECTOR"].id))
        db.add(UserRole(user_id=u_reg.id, role_id=roles["REGULATOR"].id))

        db.add(UserMineAssignment(user_id=u_mgr1.id, mine_id=m1.id, is_primary=True))
        db.add(UserMineAssignment(user_id=u_safety1.id, mine_id=m1.id, is_primary=True))
        db.add(UserMineAssignment(user_id=u_mgr2.id, mine_id=m2.id, is_primary=True))
        db.add(UserMineAssignment(user_id=u_insp.id, mine_id=m1.id, is_primary=True))
        db.add(UserMineAssignment(user_id=u_insp.id, mine_id=m2.id, is_primary=False))
        db.commit()

        print("Seeding Sensors (18 Sensors for Mine 1, 12 for Mine 2, 8 for Mine 3)...")
        now = datetime.now(timezone.utc)
        sensors_list = []

        # Mine 1 Sensors (BDS-04)
        m1_sensor_configs = [
            ("SN-BDS04-CH4-101", "CH4", "East Longwall Return Methane Monitor", 0.05, 0.45, 0.75, 1.25, 145.0, 470.0, -318.0, m1_l2.id, m1_z_east.id, 0.35),
            ("SN-BDS04-CH4-102", "CH4", "East Face Cutting Drum CH4 Probe", 0.05, 0.45, 0.75, 1.25, 138.0, 462.0, -319.0, m1_l2.id, m1_z_east.id, 0.42),
            ("SN-BDS04-CO-101", "CO", "Seam 2 Goaf Carbon Monoxide Sensor", 1.0, 12.0, 25.0, 50.0, 160.0, 485.0, -319.0, m1_l2.id, m1_z_east.id, 9.2),
            ("SN-BDS04-CO-102", "CO", "East Tailgate Early Spontaneous CO Probe", 1.0, 12.0, 25.0, 50.0, 150.0, 475.0, -318.0, m1_l2.id, m1_z_east.id, 8.5),
            ("SN-BDS04-VEL-101", "VEL", "Main Intake Air Velocity Anemometer", 2.0, 4.5, 1.2, 0.6, 20.0, 200.0, -218.0, m1_l1.id, m1_z_haul.id, 3.2),
            ("SN-BDS04-VEL-102", "VEL", "East Return Airway Velocity Meter", 1.8, 4.0, 1.0, 0.5, 140.0, 480.0, -318.0, m1_l2.id, m1_z_east.id, 2.8),
            ("SN-BDS04-TEMP-101", "TEMP", "East Longwall Face Ambient Temp", 22.0, 30.0, 34.0, 39.0, 135.0, 460.0, -319.0, m1_l2.id, m1_z_east.id, 27.5),
            ("SN-BDS04-TEMP-102", "TEMP", "Main Surface Fan Bearing Temp", 35.0, 55.0, 68.0, 85.0, -48.0, -28.0, 211.0, m1_l0.id, m1_z_vent.id, 48.0),
            ("SN-BDS04-DUST-101", "DUST", "Haulage Transfer Point Dust Monitor", 0.2, 1.8, 2.8, 4.5, 15.0, 180.0, -218.0, m1_l1.id, m1_z_haul.id, 1.4),
            ("SN-BDS04-DUST-102", "DUST", "East Tailgate Coal Dust Sensor", 0.5, 2.0, 3.0, 5.0, 155.0, 480.0, -318.0, m1_l2.id, m1_z_east.id, 1.8),
            ("SN-BDS04-VIB-101", "VIB", "Seam 2 Longwall Roof Strata Geophone", 0.1, 2.5, 5.5, 9.0, 130.0, 455.0, -317.0, m1_l2.id, m1_z_east.id, 1.1),
            ("SN-BDS04-VIB-102", "VIB", "West Development Strata Vibration Sensor", 0.1, 2.5, 5.5, 9.0, -140.0, 360.0, -318.0, m1_l2.id, m1_z_west.id, 0.8),
            ("SN-BDS04-HUM-101", "HUM", "East Gallery Relative Humidity Sensor", 45.0, 75.0, 85.0, 92.0, 142.0, 465.0, -318.0, m1_l2.id, m1_z_east.id, 68.0),
            ("SN-BDS04-PRES-101", "PRES", "Shaft Bottom Barometric Sensor", 99.0, 102.5, 96.0, 93.0, 10.0, 120.0, -220.0, m1_l1.id, m1_z_haul.id, 101.3),
            ("SN-BDS04-CH4-201", "CH4", "West Heading Continuous Miner Gas Probe", 0.05, 0.45, 0.75, 1.25, -145.0, 370.0, -319.0, m1_l2.id, m1_z_west.id, 0.28),
            ("SN-BDS04-CO-201", "CO", "West Heading Carbon Monoxide Node", 1.0, 12.0, 25.0, 50.0, -148.0, 375.0, -319.0, m1_l2.id, m1_z_west.id, 6.4),
            ("SN-BDS04-VEL-201", "VEL", "West Heading Auxiliary Air Anemometer", 1.5, 3.5, 0.8, 0.4, -135.0, 345.0, -318.0, m1_l2.id, m1_z_west.id, 2.1),
            ("SN-BDS04-PRES-001", "PRES", "Surface Fan Differential Pressure Gauge", 2.0, 4.2, 5.5, 7.0, -52.0, -32.0, 210.0, m1_l0.id, m1_z_vent.id, 3.1)
        ]

        for code, type_key, name, n_min, n_max, w_th, c_th, x, y, z, lvl_id, zn_id, last_v in m1_sensor_configs:
            s = Sensor(
                sensor_code=code, mine_id=m1.id, level_id=lvl_id, zone_id=zn_id, sensor_type_id=st[type_key].id,
                name=name, unit=st[type_key].unit, normal_min=n_min, normal_max=n_max, warning_threshold=w_th,
                critical_threshold=c_th, x=x, y=y, z=z, status="ACTIVE", last_value=last_v, last_reading_at=now
            )
            db.add(s)
            sensors_list.append(s)

        # Mine 2 Sensors (SOB-02)
        m2_sensor_configs = [
            ("SN-SOB02-DUST-201", "DUST", "Pit Bench 3A Respirable Dust Monitor", 0.4, 1.8, 2.8, 4.5, 320.0, 240.0, 235.0, m2_l1.id, m2_z_b3.id, 1.65),
            ("SN-SOB02-DUST-202", "DUST", "East Haul Road Dust Dispersion Sensor", 0.5, 2.2, 3.5, 5.5, 120.0, 80.0, 250.0, m2_l1.id, m2_z_haul.id, 2.1),
            ("SN-SOB02-TEMP-201", "TEMP", "Bench 3A Shovel Engine Bay Thermistor", 40.0, 75.0, 90.0, 105.0, 315.0, 235.0, 236.0, m2_l1.id, m2_z_b3.id, 62.0),
            ("SN-SOB02-VIB-201", "VIB", "Highwall Bench Stability Seismograph", 0.1, 3.0, 6.0, 10.0, 290.0, 190.0, 238.0, m2_l1.id, m2_z_b3.id, 1.4),
            ("SN-SOB02-PRES-201", "PRES", "Opencast Weather Station Barometer", 97.0, 102.0, 94.0, 91.0, 150.0, 100.0, 260.0, m2_l1.id, m2_z_haul.id, 100.8),
            ("SN-SOB02-HUM-201", "HUM", "Bench Ambient Humidity Probe", 30.0, 70.0, 85.0, 95.0, 310.0, 220.0, 235.0, m2_l1.id, m2_z_b3.id, 55.0)
        ]
        for code, type_key, name, n_min, n_max, w_th, c_th, x, y, z, lvl_id, zn_id, last_v in m2_sensor_configs:
            s = Sensor(
                sensor_code=code, mine_id=m2.id, level_id=lvl_id, zone_id=zn_id, sensor_type_id=st[type_key].id,
                name=name, unit=st[type_key].unit, normal_min=n_min, normal_max=n_max, warning_threshold=w_th,
                critical_threshold=c_th, x=x, y=y, z=z, status="ACTIVE", last_value=last_v, last_reading_at=now
            )
            db.add(s)
            sensors_list.append(s)

        # Mine 3 Sensors (RS-07) — 12 sensors across headings and surface
        m3_sensor_configs = [
            # North Heading
            ("SN-RS07-CH4-301", "CH4", "North Heading Telemetric Gas Sensor", 0.02, 0.35, 0.70, 1.20, 95.0, 320.0, -178.0, m3_l1.id, m3_z_hd.id, 0.28),
            ("SN-RS07-CO-301", "CO", "Incline Workings Carbon Monoxide Sensor", 1.0, 10.0, 20.0, 45.0, 90.0, 310.0, -178.0, m3_l1.id, m3_z_hd.id, 4.8),
            ("SN-RS07-VEL-301", "VEL", "North Incline Airflow Anemometer", 1.5, 3.8, 1.0, 0.5, 85.0, 290.0, -179.0, m3_l1.id, m3_z_hd.id, 2.4),
            ("SN-RS07-DUST-301", "DUST", "Heading Face Dust Transmissometer", 0.3, 1.5, 2.5, 4.0, 100.0, 330.0, -177.0, m3_l1.id, m3_z_hd.id, 1.2),
            # South Heading
            ("SN-RS07-CH4-302", "CH4", "South Heading Return Gas Monitor", 0.02, 0.35, 0.70, 1.20, -80.0, 280.0, -176.0, m3_l1.id, m3_z_hd.id, 0.19),
            ("SN-RS07-CO-302", "CO", "South Seam 7 CO Early Warning Probe", 1.0, 10.0, 20.0, 45.0, -75.0, 265.0, -175.0, m3_l1.id, m3_z_hd.id, 3.1),
            ("SN-RS07-TEMP-301", "TEMP", "Seam 7 Incline Ambient Temp Probe", 22.0, 32.0, 36.0, 42.0, 88.0, 305.0, -178.0, m3_l1.id, m3_z_hd.id, 28.4),
            ("SN-RS07-VIB-301", "VIB", "Roof Strata Geophone — Incline Seam 7", 0.1, 2.0, 5.0, 9.0, 92.0, 318.0, -177.0, m3_l1.id, m3_z_hd.id, 0.9),
            ("SN-RS07-HUM-301", "HUM", "Gallery Relative Humidity Probe", 45.0, 78.0, 88.0, 95.0, -70.0, 270.0, -176.0, m3_l1.id, m3_z_hd.id, 71.0),
            # Main Incline / Surface
            ("SN-RS07-PRES-301", "PRES", "Shaft Bottom Barometric Sensor", 99.0, 102.5, 96.0, 93.0, 20.0, 50.0, -90.0, m3_l1.id, m3_z_hd.id, 101.1),
            ("SN-RS07-VEL-302", "VEL", "Main Incline Return Airway Anemometer", 1.8, 4.2, 1.0, 0.5, -30.0, 120.0, -100.0, m3_l1.id, m3_z_hd.id, 3.1),
            ("SN-RS07-DUST-302", "DUST", "Incline Haulage Road Dust Monitor", 0.2, 1.2, 2.0, 3.5, 10.0, 80.0, -60.0, m3_l1.id, m3_z_hd.id, 0.85),
        ]
        for code, type_key, name, n_min, n_max, w_th, c_th, x, y, z, lvl_id, zn_id, last_v in m3_sensor_configs:
            s = Sensor(
                sensor_code=code, mine_id=m3.id, level_id=lvl_id, zone_id=zn_id, sensor_type_id=st[type_key].id,
                name=name, unit=st[type_key].unit, normal_min=n_min, normal_max=n_max, warning_threshold=w_th,
                critical_threshold=c_th, x=x, y=y, z=z, status="ACTIVE", last_value=last_v, last_reading_at=now
            )
            db.add(s)
            sensors_list.append(s)

        db.commit()

        print("Seeding Cameras and Machinery...")
        # Mine 1 Cameras
        c1 = Camera(camera_code="CAM-BDS04-SHAFT-01", mine_id=m1.id, level_id=m1_l0.id, zone_id=m1_z_vent.id, name="Shaft Top Winding Engine Camera", camera_type="FLAME_PROOF_EX", stream_url="rtsp://demo.mine.lan/bds04/cam01", status="ACTIVE", x=-45.0, y=-25.0, z=212.0, yaw=135.0, pitch=-15.0, fov=85.0, is_simulated="SIMULATED")
        c2 = Camera(camera_code="CAM-BDS04-LW-02", mine_id=m1.id, level_id=m1_l2.id, zone_id=m1_z_east.id, name="East Longwall Tailgate Camera", camera_type="FIXED_OPTICAL", stream_url="rtsp://demo.mine.lan/bds04/cam02", status="ACTIVE", x=130.0, y=460.0, z=-317.0, yaw=45.0, pitch=-10.0, fov=90.0, is_simulated="SIMULATED")
        c3 = Camera(camera_code="CAM-BDS04-LW-03", mine_id=m1.id, level_id=m1_l2.id, zone_id=m1_z_east.id, name="East Face Shearer Pan Camera", camera_type="FLAME_PROOF_EX", stream_url="rtsp://demo.mine.lan/bds04/cam03", status="ACTIVE", x=142.0, y=468.0, z=-318.0, yaw=90.0, pitch=-5.0, fov=110.0, is_simulated="SIMULATED")
        db.add_all([c1, c2, c3])

        # Mine 2 Cameras (Opencast — surface mounted)
        c4 = Camera(camera_code="CAM-SOB02-BENCH-01", mine_id=m2.id, level_id=m2_l1.id, zone_id=m2_z_b3.id, name="Bench 3A Shovel Monitoring Camera", camera_type="PTZ_OUTDOOR", stream_url="rtsp://demo.mine.lan/sob02/cam01", status="ACTIVE", x=305.0, y=225.0, z=237.0, yaw=180.0, pitch=-20.0, fov=120.0, is_simulated="SIMULATED")
        c5 = Camera(camera_code="CAM-SOB02-HAUL-02", mine_id=m2.id, level_id=m2_l1.id, zone_id=m2_z_haul.id, name="East Haul Road Truck Monitor", camera_type="FIXED_OPTICAL", stream_url="rtsp://demo.mine.lan/sob02/cam02", status="ACTIVE", x=110.0, y=60.0, z=252.0, yaw=90.0, pitch=-10.0, fov=100.0, is_simulated="SIMULATED")
        c6 = Camera(camera_code="CAM-SOB02-HIGHWALL-03", mine_id=m2.id, level_id=m2_l2.id, zone_id=m2_z_b3.id, name="Highwall Slope Stability Camera", camera_type="FIXED_OPTICAL", stream_url="rtsp://demo.mine.lan/sob02/cam03", status="ACTIVE", x=280.0, y=185.0, z=200.0, yaw=270.0, pitch=10.0, fov=95.0, is_simulated="SIMULATED")
        db.add_all([c4, c5, c6])

        # Mine 3 Cameras (Underground incline)
        c7 = Camera(camera_code="CAM-RS07-INCL-01", mine_id=m3.id, level_id=m3_l1.id, zone_id=m3_z_hd.id, name="Incline Top Surface Safety Camera", camera_type="FIXED_OPTICAL", stream_url="rtsp://demo.mine.lan/rs07/cam01", status="ACTIVE", x=15.0, y=45.0, z=-50.0, yaw=0.0, pitch=-15.0, fov=90.0, is_simulated="SIMULATED")
        c8 = Camera(camera_code="CAM-RS07-HD-NORTH-02", mine_id=m3.id, level_id=m3_l1.id, zone_id=m3_z_hd.id, name="North Heading Continuous Miner Camera", camera_type="FLAME_PROOF_EX", stream_url="rtsp://demo.mine.lan/rs07/cam02", status="ACTIVE", x=88.0, y=315.0, z=-178.0, yaw=45.0, pitch=-5.0, fov=85.0, is_simulated="SIMULATED")
        c9 = Camera(camera_code="CAM-RS07-HD-SOUTH-03", mine_id=m3.id, level_id=m3_l1.id, zone_id=m3_z_hd.id, name="South Heading Junction Monitor", camera_type="FLAME_PROOF_EX", stream_url="rtsp://demo.mine.lan/rs07/cam03", status="ACTIVE", x=-72.0, y=260.0, z=-175.0, yaw=270.0, pitch=-8.0, fov=95.0, is_simulated="SIMULATED")
        db.add_all([c7, c8, c9])

        # Mine 1 Equipment
        eq1 = Equipment(equipment_code="EQP-BDS04-SHR-01", mine_id=m1.id, level_id=m1_l2.id, zone_id=m1_z_east.id, name="Joy Heavy Longwall Double-Drum Shearer", category="SHEARER", status="OPERATIONAL", manufacturer="Komatsu Mining", x=140.0, y=465.0, z=-320.0, last_serviced_at=now - timedelta(days=12), next_service_due=now + timedelta(days=18))
        eq2 = Equipment(equipment_code="EQP-BDS04-FAN-01", mine_id=m1.id, level_id=m1_l0.id, zone_id=m1_z_vent.id, name="Main Surface Centrifugal Exhauster Fan", category="VENTILATION_FAN", status="OPERATIONAL", manufacturer="Voltas", x=-50.0, y=-30.0, z=210.0, last_serviced_at=now - timedelta(days=5), next_service_due=now + timedelta(days=25))
        eq3 = Equipment(equipment_code="EQP-BDS04-CONV-01", mine_id=m1.id, level_id=m1_l1.id, zone_id=m1_z_haul.id, name="Armoured Face Main Trunk Conveyor", category="CONVEYOR", status="OPERATIONAL", manufacturer="Elecon", x=10.0, y=150.0, z=-220.0, last_serviced_at=now - timedelta(days=8), next_service_due=now + timedelta(days=22))
        db.add_all([eq1, eq2, eq3])

        # Mine 2 Equipment (Heavy opencast)
        eq4 = Equipment(equipment_code="EQP-SOB02-DRAG-01", mine_id=m2.id, level_id=m2_l2.id, zone_id=m2_z_b3.id, name="BE1570W Walking Dragline — Bench 6", category="DRAGLINE", status="OPERATIONAL", manufacturer="Bharat Earth Movers", x=295.0, y=195.0, z=192.0, last_serviced_at=now - timedelta(days=30), next_service_due=now + timedelta(days=60))
        eq5 = Equipment(equipment_code="EQP-SOB02-SHOVEL-01", mine_id=m2.id, level_id=m2_l1.id, zone_id=m2_z_b3.id, name="PC2000 Electric Rope Shovel — Bench 3", category="SHOVEL", status="OPERATIONAL", manufacturer="Komatsu", x=318.0, y=238.0, z=236.0, last_serviced_at=now - timedelta(days=6), next_service_due=now + timedelta(days=44))
        eq6 = Equipment(equipment_code="EQP-SOB02-TRUCK-01", mine_id=m2.id, level_id=m2_l1.id, zone_id=m2_z_haul.id, name="Caterpillar 793F Haul Truck Unit-01", category="HAUL_TRUCK", status="OPERATIONAL", manufacturer="Caterpillar", x=125.0, y=72.0, z=250.0, last_serviced_at=now - timedelta(days=3), next_service_due=now + timedelta(days=27))
        eq7 = Equipment(equipment_code="EQP-SOB02-TRUCK-02", mine_id=m2.id, level_id=m2_l1.id, zone_id=m2_z_haul.id, name="Caterpillar 793F Haul Truck Unit-02", category="HAUL_TRUCK", status="MAINTENANCE", manufacturer="Caterpillar", x=105.0, y=58.0, z=251.0, last_serviced_at=now - timedelta(days=1), next_service_due=now + timedelta(days=14))
        db.add_all([eq4, eq5, eq6, eq7])

        # Mine 3 Equipment (Underground incline mine)
        eq8 = Equipment(equipment_code="EQP-RS07-CM-01", mine_id=m3.id, level_id=m3_l1.id, zone_id=m3_z_hd.id, name="AM-50 Continuous Miner — North Heading", category="CONTINUOUS_MINER", status="OPERATIONAL", manufacturer="Joy Global", x=96.0, y=325.0, z=-179.0, last_serviced_at=now - timedelta(days=9), next_service_due=now + timedelta(days=21))
        eq9 = Equipment(equipment_code="EQP-RS07-CM-02", mine_id=m3.id, level_id=m3_l1.id, zone_id=m3_z_hd.id, name="AM-50 Continuous Miner — South Heading", category="CONTINUOUS_MINER", status="STANDBY", manufacturer="Joy Global", x=-78.0, y=272.0, z=-176.0, last_serviced_at=now - timedelta(days=15), next_service_due=now + timedelta(days=15))
        eq10 = Equipment(equipment_code="EQP-RS07-CONV-01", mine_id=m3.id, level_id=m3_l1.id, zone_id=m3_z_hd.id, name="Incline Belt Conveyor — Stage Loader", category="CONVEYOR", status="OPERATIONAL", manufacturer="Fenner", x=25.0, y=90.0, z=-85.0, last_serviced_at=now - timedelta(days=4), next_service_due=now + timedelta(days=26))
        eq11 = Equipment(equipment_code="EQP-RS07-PUMP-01", mine_id=m3.id, level_id=m3_l1.id, zone_id=m3_z_hd.id, name="Sump Dewatering Pump — Incline Bottom", category="WATER_PUMP", status="OPERATIONAL", manufacturer="Kirloskar", x=18.0, y=160.0, z=-140.0, last_serviced_at=now - timedelta(days=7), next_service_due=now + timedelta(days=23))
        eq12 = Equipment(equipment_code="EQP-RS07-FAN-01", mine_id=m3.id, level_id=m3_l1.id, zone_id=m3_z_hd.id, name="Auxiliary Ventilation Fan — North Heading", category="VENTILATION_FAN", status="OPERATIONAL", manufacturer="Howden", x=82.0, y=270.0, z=-178.0, last_serviced_at=now - timedelta(days=2), next_service_due=now + timedelta(days=28))
        db.add_all([eq8, eq9, eq10, eq11, eq12])
        db.commit()

        print("Seeding Initial Sensor Readings, Anomaly Events, and Alerts...")
        # Create initial readings
        for s in sensors_list:
            r = SensorReading(sensor_id=s.id, timestamp=now - timedelta(minutes=random.randint(1, 10)), value=s.last_value, unit=s.unit, quality="GOOD", source="SIMULATED", ingestion_timestamp=now)
            db.add(r)
        db.commit()

        # Seed 1 initial active anomaly and alert for Mine 1
        s_methane = next(s for s in sensors_list if s.sensor_code == "SN-BDS04-CH4-101")
        anom1 = AnomalyEvent(
            mine_id=m1.id,
            sensor_id=s_methane.id,
            level_id=m1_l2.id,
            zone_id=m1_z_east.id,
            anomaly_type="THRESHOLD_EXCEEDED",
            severity="WARNING",
            observed_value=0.82,
            expected_range="0.05 - 0.45 %",
            threshold_limit=0.75,
            unit="%",
            description="East Longwall Return Methane Monitor exceeded warning threshold: 0.82% >= 0.75%.",
            x=s_methane.x,
            y=s_methane.y,
            z=s_methane.z,
            source="SIMULATED",
            status="ACTIVE",
            detected_at=now - timedelta(minutes=15)
        )
        db.add(anom1)
        db.flush()

        alert1 = Alert(
            mine_id=m1.id,
            sensor_id=s_methane.id,
            anomaly_id=anom1.id,
            title=f"Telemetry Alert: {s_methane.name} ({s_methane.sensor_code})",
            message=anom1.description,
            severity="WARNING",
            risk_score=38.5,
            status="UNREAD",
            source="SIMULATED",
            location_context="East Longwall Face 102 (145.0, 470.0, -318.0)",
            deduplication_key=f"MINE_{m1.id}_SENSOR_{s_methane.id}_THRESHOLD_EXCEEDED",
            created_at=now - timedelta(minutes=15)
        )
        db.add(alert1)

        # Baseline Risk Scores
        r1 = RiskScore(mine_id=m1.id, score=38.5, severity="MEDIUM", rule_score=18.0, ml_score=8.5, silence_risk_score=12.0, explanation="Moderate risk driven by 1 active gas anomaly and statutory dust barrier compliance notices.", model_version="TRINETRA-RISK-v1.0", rule_version="DGMS-RULESET-2026.1", generated_at=now)
        db.add(r1)
        db.flush()
        db.add(RiskFactor(risk_score_id=r1.id, factor_name="Active Methane Warning Surge", weight=0.35, contribution_points=8.5, details="SN-BDS04-CH4-101 reading above warning threshold."))
        db.commit()

        print("Seeding Phase 4 Governance Data (Production, Workforce, Contractors, Environmental, Grievances, Approvals, Reports)...")
        # 1. Shifts for Mine 1, 2, 3
        sh_a1 = Shift(mine_id=m1.id, shift_code="A", name="Morning Production Shift A", start_time="06:00", end_time="14:00", is_night_shift=False)
        sh_b1 = Shift(mine_id=m1.id, shift_code="B", name="Afternoon Production Shift B", start_time="14:00", end_time="22:00", is_night_shift=False)
        sh_c1 = Shift(mine_id=m1.id, shift_code="C", name="Night Maintenance Shift C", start_time="22:00", end_time="06:00", is_night_shift=True)
        
        sh_a2 = Shift(mine_id=m2.id, shift_code="A", name="Opencast Morning Shift A", start_time="06:00", end_time="14:00", is_night_shift=False)
        sh_b2 = Shift(mine_id=m2.id, shift_code="B", name="Opencast Afternoon Shift B", start_time="14:00", end_time="22:00", is_night_shift=False)
        
        sh_a3 = Shift(mine_id=m3.id, shift_code="A", name="Incline Morning Shift A", start_time="06:00", end_time="14:00", is_night_shift=False)
        sh_b3 = Shift(mine_id=m3.id, shift_code="B", name="Incline Afternoon Shift B", start_time="14:00", end_time="22:00", is_night_shift=False)
        
        db.add_all([sh_a1, sh_b1, sh_c1, sh_a2, sh_b2, sh_a3, sh_b3])
        db.commit()

        # 2. Contractors
        c_komatsu = Contractor(contractor_code="CNT-KOMATSU-01", company_name="Komatsu Heavy Mining Engineering Ltd", registration_number="REG-IND-88219", contact_person="Rameshwar Jha", email="jha@komatsu.mining.in", phone="+91 98301 22910", safety_rating=4.8, status="ACTIVE")
        c_elecon = Contractor(contractor_code="CNT-ELECON-02", company_name="Elecon Trunk Conveyor Maintenance", registration_number="REG-IND-77102", contact_person="Dinesh Choudhury", email="dinesh@elecon.in", phone="+91 94311 55210", safety_rating=4.4, status="ACTIVE")
        c_haulage = Contractor(contractor_code="CNT-EAST-03", company_name="Eastern Surface Coal Haulers LLP", registration_number="REG-IND-55420", contact_person="Gurmeet Singh", email="gurmeet@easthaul.com", phone="+91 98711 00921", safety_rating=3.8, status="ACTIVE")
        db.add_all([c_komatsu, c_elecon, c_haulage])
        db.commit()

        # 3. Contracts & Requirements
        today_date = now.date()
        ct1 = Contract(contract_code="CON-BDS04-SHR-2026", contractor_id=c_komatsu.id, mine_id=m1.id, work_scope="Longwall Shearer OEM Maintenance & Strata Tooling", start_date=today_date - timedelta(days=90), end_date=today_date + timedelta(days=275), total_value=12500000.0, status="ACTIVE", compliance_status="COMPLIANT", responsible_officer_id=u_mgr1.id)
        ct2 = Contract(contract_code="CON-BDS04-CNV-2026", contractor_id=c_elecon.id, mine_id=m1.id, work_scope="Trunk Conveyor Belt Splice & Roller Overhaul", start_date=today_date - timedelta(days=340), end_date=today_date + timedelta(days=25), total_value=4800000.0, status="EXPIRING", compliance_status="REVIEW_REQUIRED", responsible_officer_id=u_safety1.id)
        ct3 = Contract(contract_code="CON-SOB02-HAUL-2026", contractor_id=c_haulage.id, mine_id=m2.id, work_scope="Opencast Heavy Surface Haulage Fleet", start_date=today_date - timedelta(days=60), end_date=today_date + timedelta(days=300), total_value=9500000.0, status="ACTIVE", compliance_status="COMPLIANT", responsible_officer_id=u_admin.id)
        db.add_all([ct1, ct2, ct3])
        db.commit()

        # Contract Requirements for SLA & Field Operations
        req1 = ContractRequirement(
            contract_id=ct1.id,
            title="Form-O Initial & Periodic Medical Examination Certificates (PME)",
            document_type="MEDICAL_FITNESS",
            mandatory=True,
            status="DOCUMENTED",
            expiry_date=today_date + timedelta(days=180),
            verification_notes="PME records verified under Mines Rules 1955 Form O for 25 deployed contract mechanics.",
            verified_at=now - timedelta(days=15),
            verified_by_id=u_safety1.id
        )
        req2 = ContractRequirement(
            contract_id=ct1.id,
            title="Statutory Workmen Compensation & Group Personal Accident Insurance",
            document_type="INSURANCE_POLICY",
            mandatory=True,
            status="DOCUMENTED",
            expiry_date=today_date + timedelta(days=60),
            verification_notes="Policy active under Policy #OR-GIC-99210. Valid for underground strata maintenance work.",
            verified_at=now - timedelta(days=30),
            verified_by_id=u_mgr1.id
        )
        req3 = ContractRequirement(
            contract_id=ct2.id,
            title="VTC Statutory Refresher Safety Induction Training Records",
            document_type="SAFETY_TRAINING_RECORD",
            mandatory=True,
            status="PENDING",
            expiry_date=today_date + timedelta(days=3),
            verification_notes="Refresher certificates due for 8 conveyor splicing technicians. Verification pending field audit.",
            verified_at=None,
            verified_by_id=None
        )
        req4 = ContractRequirement(
            contract_id=ct2.id,
            title="Monthly ESI / EPF Challan & Statutory Return Filings",
            document_type="ESI_EPF_CERTIFICATE",
            mandatory=True,
            status="EXPIRED",
            expiry_date=today_date - timedelta(days=12),
            verification_notes="Previous month electronic challan return (ECR) receipt not submitted. Rectification task required.",
            verified_at=now - timedelta(days=45),
            verified_by_id=u_safety1.id
        )
        req5 = ContractRequirement(
            contract_id=ct3.id,
            title="Heavy Mining Machinery (HEMM) Operator Valid DGMS Licenses",
            document_type="SAFETY_TRAINING_RECORD",
            mandatory=True,
            status="DOCUMENTED",
            expiry_date=today_date + timedelta(days=210),
            verification_notes="12 dumper drivers and 2 shovel operators verified with valid DGMS heavy machinery endorsement.",
            verified_at=now - timedelta(days=5),
            verified_by_id=u_admin.id
        )
        db.add_all([req1, req2, req3, req4, req5])
        db.commit()

        # 4. Workers & Attendance (Seeded across Mine 1, Mine 2, Mine 3)
        workers_m1 = [
            Worker(worker_code="WRK-BDS-001", full_name="Budhan Manjhi", designation="Senior Overman", trade_category="OVERMAN", mine_id=m1.id, is_contractual=False, blood_group="O+"),
            Worker(worker_code="WRK-BDS-002", full_name="Sunil Soren", designation="Longwall Shearer Operator", trade_category="OPERATOR", mine_id=m1.id, is_contractual=True, contractor_id=c_komatsu.id, blood_group="B+"),
            Worker(worker_code="WRK-BDS-003", full_name="Manohar Karmakar", designation="Underground Chief Electrician", trade_category="ELECTRICIAN", mine_id=m1.id, is_contractual=False, blood_group="A+"),
            Worker(worker_code="WRK-BDS-004", full_name="Raju Murmu", designation="Face Driller", trade_category="DRILLER", mine_id=m1.id, is_contractual=True, contractor_id=c_komatsu.id, blood_group="AB+"),
            Worker(worker_code="WRK-BDS-005", full_name="Arjun Nayak", designation="Conveyor Fitter", trade_category="FITTER", mine_id=m1.id, is_contractual=True, contractor_id=c_elecon.id, blood_group="O+")
        ]
        workers_m2 = [
            Worker(worker_code="WRK-SOB-001", full_name="Devendra Tripathi", designation="Heavy Dragline Master Operator", trade_category="OPERATOR", mine_id=m2.id, is_contractual=False, blood_group="B+"),
            Worker(worker_code="WRK-SOB-002", full_name="Rameshwar Bind", designation="Shovel Bench Operator", trade_category="OPERATOR", mine_id=m2.id, is_contractual=True, contractor_id=c_haulage.id, blood_group="O+"),
            Worker(worker_code="WRK-SOB-003", full_name="Dharmendra Yadav", designation="Haul Truck Driver Grade I", trade_category="OPERATOR", mine_id=m2.id, is_contractual=True, contractor_id=c_haulage.id, blood_group="A+"),
            Worker(worker_code="WRK-SOB-004", full_name="Kallu Kol", designation="Bench Blaster & Driller", trade_category="DRILLER", mine_id=m2.id, is_contractual=False, blood_group="AB+"),
            Worker(worker_code="WRK-SOB-005", full_name="Vijay Sharma", designation="Surface Electrical Overman", trade_category="OVERMAN", mine_id=m2.id, is_contractual=False, blood_group="O+")
        ]
        workers_m3 = [
            Worker(worker_code="WRK-RS-001", full_name="Tapan Bauri", designation="Continuous Miner Incline Driver", trade_category="OPERATOR", mine_id=m3.id, is_contractual=False, blood_group="A+"),
            Worker(worker_code="WRK-RS-002", full_name="Subodh Hembram", designation="Incline Roof Bolter", trade_category="DRILLER", mine_id=m3.id, is_contractual=True, contractor_id=c_komatsu.id, blood_group="B+"),
            Worker(worker_code="WRK-RS-003", full_name="Gouranga Mondal", designation="Mine Safety Overman", trade_category="OVERMAN", mine_id=m3.id, is_contractual=False, blood_group="O+")
        ]
        
        all_workers = workers_m1 + workers_m2 + workers_m3
        db.add_all(all_workers)
        db.commit()

        # 5. Environmental Rules
        env_r1 = EnvironmentalRule(rule_code="ENV-RULE-PM10", parameter_name="PM10", threshold_limit=3.0, unit="µg/m³", severity="HIGH", statute_reference="CMR 2017 Reg 143", description="Maximum 8-hour continuous respirable coal dust exposure at transfer points.")
        env_r2 = EnvironmentalRule(rule_code="ENV-RULE-PM25", parameter_name="PM2.5", threshold_limit=1.5, unit="µg/m³", severity="MEDIUM", statute_reference="CPCB Ambient Air Quality", description="Fine particulate matter exposure limit.")
        env_r3 = EnvironmentalRule(rule_code="ENV-RULE-NOISE", parameter_name="NOISE_DB", threshold_limit=85.0, unit="dB(A)", severity="MEDIUM", statute_reference="DGMS Tech Circular 04/2010", description="Permissible worker noise exposure level.")
        env_r4 = EnvironmentalRule(rule_code="ENV-RULE-WATER", parameter_name="WATER_PH", threshold_limit=8.5, unit="pH", severity="LOW", statute_reference="CPCB Effluent Standards", description="Mine drainage water pH permissible range.")
        db.add_all([env_r1, env_r2, env_r3, env_r4])
        db.commit()

        # 7. Grievance
        grv1 = Grievance(
            grievance_code=f"PGRM-2026-BDS04-0001",
            mine_id=m1.id,
            category="SAFETY",
            title="Dust suppression mist spray nozzle clogged at Haulage Drift",
            description="Water pressure low at transfer point spray head causing increased airborne dust during peak hauling.",
            priority="HIGH",
            status="ASSIGNED",
            anonymous=False,
            submitted_by_id=u_safety1.id,
            assigned_to_id=u_mgr1.id,
            sla_hours=48,
            due_at=now + timedelta(hours=36),
            latitude=23.7960,
            longitude=86.4310,
            location_context="Haulage Drift Level 2",
            evidence_file_name="spray_nozzle_clogged.jpg",
            evidence_file_hash="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
            source_channel="MOBILE_FIELD"
        )
        grv2 = Grievance(
            grievance_code=f"PGRM-2026-BDS04-0002",
            mine_id=m1.id,
            category="WORKER_WELFARE",
            title="Drinking Water Chiller Filter Replacement Required",
            description="Pit head rest shelter drinking water filtration unit overdue for replacement cartridge.",
            priority="MEDIUM",
            status="SUBMITTED",
            anonymous=True,
            sla_hours=72,
            due_at=now + timedelta(hours=60),
            latitude=23.7955,
            longitude=86.4300,
            location_context="Pit Head 3 Rest Shelter",
            source_channel="MOBILE_FIELD"
        )
        grv3 = Grievance(
            grievance_code=f"PGRM-2026-BDS04-0003",
            mine_id=m1.id,
            category="WATER",
            title="Drainage Sump Overflow near Incline Conveyor",
            description="Incline drift sump pump trip causing minor water accumulation on operator walkway.",
            priority="CRITICAL",
            status="UNDER_INVESTIGATION",
            anonymous=False,
            submitted_by_id=u_safety1.id,
            assigned_to_id=u_safety1.id,
            investigated_by_id=u_safety1.id,
            investigated_at=now - timedelta(hours=4),
            investigation_notes="Field inspection verified primary pump electrical trip. Auxiliary submersible pump engaged.",
            action_required=True,
            sla_hours=24,
            due_at=now + timedelta(hours=12),
            latitude=23.7970,
            longitude=86.4320,
            location_context="Incline Conveyor Sub-station",
            source_channel="MOBILE_FIELD"
        )
        grv4 = Grievance(
            grievance_code=f"PGRM-2026-BDS04-0004",
            mine_id=m1.id,
            category="CONTRACTOR",
            title="Contractor Tipline PPE Shortage for Night Shift",
            description="Third-party tipper drivers reported lack of high-visibility reflective vests for Shift C.",
            priority="HIGH",
            status="RESOLVED",
            anonymous=False,
            submitted_by_id=u_safety1.id,
            assigned_to_id=u_mgr1.id,
            resolution_notes="Vendor manager issued 25 sets of EN471 compliant reflective vests before shift start.",
            resolved_at=now - timedelta(days=1),
            sla_hours=48,
            due_at=now - timedelta(hours=10),
            latitude=23.7945,
            longitude=86.4290,
            location_context="ROM Coal Stockpile Weighbridge",
            source_channel="CPGRAMS"
        )
        db.add_all([grv1, grv2, grv3, grv4])

        # 8. Regulatory Report
        rep1 = RegulatoryReport(
            report_code="REP-MINE-BDS-04-STAT-202609",
            mine_id=m1.id,
            report_type="COMPLIANCE_SUMMARY",
            title="DGMS Statutory Monthly Mine Compliance & Safety Summary",
            reporting_period_start=today_date - timedelta(days=30),
            reporting_period_end=today_date,
            generated_by_id=u_admin.id,
            status="APPROVED",
            current_version=1,
            summary_data={
                "title": "DGMS Statutory Monthly Mine Compliance & Safety Summary",
                "report_code": "REP-MINE-BDS-04-STAT-202609",
                "mine_name": m1.name,
                "mine_code": m1.code,
                "mine_type": m1.mine_type,
                "period_start": (today_date - timedelta(days=30)).isoformat(),
                "period_end": today_date.isoformat(),
                "risk_score": 38.5,
                "risk_severity": "MEDIUM",
                "total_sensors": 18,
                "active_incidents": 1,
                "violations_count": 0,
                "actual_production": 4120.0,
                "planned_production": 4500.0,
                "variance_pct": -8.44,
                "attendance_count": 42,
                "attendance_pct": 94.2,
                "status": "APPROVED",
                "version": 1
            }
        )
        db.add(rep1)

        # 9. Seed Field Inspections & Tasks (MOBILE-02)
        print("Seeding Field Inspections & Tasks for Mobile Field Operations...")
        chk_default = [
            {"id": "CHK-01", "title": "Methane & Toxic Gas Detection (CH4 < 0.5%, CO < 25ppm)", "category": "ATMOSPHERE", "status": "PENDING", "notes": None, "severity": "LOW", "evidence_codes": []},
            {"id": "CHK-02", "title": "Ventilation Airflow & Auxiliary Fan Operation (Velocity >= 1.5 m/s)", "category": "VENTILATION", "status": "PENDING", "notes": None, "severity": "LOW", "evidence_codes": []},
            {"id": "CHK-03", "title": "Roof & Side Strata Support Integrity (Rock Bolts & W-Straps)", "category": "STRATA", "status": "PENDING", "notes": None, "severity": "LOW", "evidence_codes": []},
            {"id": "CHK-04", "title": "Emergency Escapeway Signage & Refuge Chambers", "category": "SAFETY", "status": "PENDING", "notes": None, "severity": "LOW", "evidence_codes": []},
            {"id": "CHK-05", "title": "PPE Compliance & Flameproof Cap Lamps (DGMS Approved)", "category": "PPE", "status": "PENDING", "notes": None, "severity": "LOW", "evidence_codes": []},
            {"id": "CHK-06", "title": "Haulage Track & Conveyor Belt Emergency Pull-Wires", "category": "MACHINERY", "status": "PENDING", "notes": None, "severity": "LOW", "evidence_codes": []}
        ]

        chk_in_progress = [
            {"id": "CHK-01", "title": "Methane & Toxic Gas Detection (CH4 < 0.5%, CO < 25ppm)", "category": "ATMOSPHERE", "status": "COMPLIANT", "notes": "Handheld gas detector probe reads 0.32% CH4, 8ppm CO at face.", "severity": "LOW", "evidence_codes": []},
            {"id": "CHK-02", "title": "Ventilation Airflow & Auxiliary Fan Operation (Velocity >= 1.5 m/s)", "category": "VENTILATION", "status": "COMPLIANT", "notes": "Vane anemometer measured 1.85 m/s airflow.", "severity": "LOW", "evidence_codes": []},
            {"id": "CHK-03", "title": "Roof & Side Strata Support Integrity (Rock Bolts & W-Straps)", "category": "STRATA", "status": "PENDING", "notes": None, "severity": "LOW", "evidence_codes": []},
            {"id": "CHK-04", "title": "Emergency Escapeway Signage & Refuge Chambers", "category": "SAFETY", "status": "PENDING", "notes": None, "severity": "LOW", "evidence_codes": []},
            {"id": "CHK-05", "title": "PPE Compliance & Flameproof Cap Lamps (DGMS Approved)", "category": "PPE", "status": "PENDING", "notes": None, "severity": "LOW", "evidence_codes": []},
            {"id": "CHK-06", "title": "Haulage Track & Conveyor Belt Emergency Pull-Wires", "category": "MACHINERY", "status": "PENDING", "notes": None, "severity": "LOW", "evidence_codes": []}
        ]

        fi1 = FieldInspection(
            inspection_code="INS-2026-BDS04-001",
            mine_id=m1.id,
            level_id=m1_l2.id,
            zone_id=m1_z_east.id,
            inspector_id=u_insp.id,
            inspection_type="VENTILATION_AUDIT",
            scheduled_date=now + timedelta(hours=2),
            status="SCHEDULED",
            checklist_json=json.dumps(chk_default),
            summary_notes="Predictive risk hotspot detected on Seam 2 return airway. Statutory verification required.",
            severity_assessment="HIGH",
            latitude=23.7957,
            longitude=86.4304,
            gps_accuracy_meters=8.0
        )

        fi2 = FieldInspection(
            inspection_code="INS-2026-BDS04-002",
            mine_id=m1.id,
            level_id=m1_l1.id,
            zone_id=m1_z_haul.id,
            inspector_id=u_insp.id,
            inspection_type="STRATA_CONTROL",
            scheduled_date=now - timedelta(hours=1),
            status="IN_PROGRESS",
            checklist_json=json.dumps(chk_in_progress),
            summary_notes="Routine shift strata control inspection on Main Haulage Drift A.",
            severity_assessment="MEDIUM",
            started_at=now - timedelta(minutes=45),
            latitude=23.7960,
            longitude=86.4310,
            gps_accuracy_meters=6.5
        )

        fi3 = FieldInspection(
            inspection_code="INS-2026-SOB02-001",
            mine_id=m2.id,
            level_id=m2_l1.id,
            zone_id=m2_z_b3.id,
            inspector_id=u_insp.id,
            inspection_type="ROUTINE_SAFETY",
            scheduled_date=now + timedelta(hours=5),
            status="SCHEDULED",
            checklist_json=json.dumps(chk_default),
            summary_notes="Shovel Bench 3A highwall berm height and haul road dust suppression audit.",
            severity_assessment="MEDIUM",
            latitude=24.1997,
            longitude=82.6645,
            gps_accuracy_meters=5.0
        )

        db.add_all([fi1, fi2, fi3])
        db.commit()

        # Seed MOBILE-15 Predictive Risk Records for Field Intelligence
        print("Seeding MOBILE-15 Predictive Risk Signals...")
        from app.models.risk_prediction import RiskPrediction
        pred1 = RiskPrediction(
            mine_id=m1.id,
            zone_id=m1_z_east.id,
            prediction_timestamp=now - timedelta(minutes=15),
            horizon_minutes=30,
            predicted_risk_score=88.4,
            predicted_severity="HIGH",
            probability=0.884,
            predicted_class=1,
            current_risk_score=52.0,
            model_name="TRINETRA-HistGradientBoosting",
            model_version="risk-escalation-v1.0",
            dataset_type="SIMULATED_DEMO",
            feature_snapshot_json=json.dumps({"methane_ppm": 1.42, "ventilation_velocity": 1.85, "co_ppm": 18.0}),
            explanation_json=json.dumps([
                {
                    "feature": "methane_ppm",
                    "label": "Methane Concentration",
                    "direction": "INCREASING_RISK",
                    "symbol": "↑",
                    "current_value": 1.42,
                    "unit": "%",
                    "normal_reference": 0.5,
                    "threshold_reference": 1.25,
                    "contribution_points": 24.5,
                    "explanation": "Methane level 1.42% is 13.6% above statutory threshold."
                },
                {
                    "feature": "ventilation_velocity",
                    "label": "Ventilation Air Velocity",
                    "direction": "INCREASING_RISK",
                    "symbol": "↓",
                    "current_value": 1.85,
                    "unit": "m/s",
                    "normal_reference": 2.5,
                    "threshold_reference": 2.0,
                    "contribution_points": 18.2,
                    "explanation": "Air velocity decreased 18% over past 45 minutes."
                }
            ]),
            data_quality_score=1.0,
            data_quality_notes="Full telemetry available (100% online sensors)",
            field_verified=False,
            is_alert_generated=True,
            created_at=now - timedelta(minutes=15)
        )

        pred2 = RiskPrediction(
            mine_id=m1.id,
            zone_id=m1_z_west.id,
            prediction_timestamp=now - timedelta(hours=2),
            horizon_minutes=30,
            predicted_risk_score=91.0,
            predicted_severity="CRITICAL",
            probability=0.91,
            predicted_class=1,
            current_risk_score=68.0,
            model_name="TRINETRA-HistGradientBoosting",
            model_version="risk-escalation-v1.0",
            dataset_type="SIMULATED_DEMO",
            feature_snapshot_json=json.dumps({"roof_stress_kpa": 420.0, "seismic_events": 4}),
            explanation_json=json.dumps([
                {
                    "feature": "roof_stress_kpa",
                    "label": "Roof Convergence Pressure",
                    "direction": "INCREASING_RISK",
                    "symbol": "↑",
                    "current_value": 420.0,
                    "unit": "kPa",
                    "normal_reference": 250.0,
                    "threshold_reference": 380.0,
                    "contribution_points": 32.0,
                    "explanation": "Convergence stress exceeded 380 kPa limit."
                }
            ]),
            data_quality_score=1.0,
            data_quality_notes="Full telemetry available",
            field_verified=True,
            field_outcome="ISSUE_FOUND",
            field_notes="Roof convergence tell-tale confirmed 4mm displacement. Chock support reinforced.",
            verified_by_id=u_insp.id,
            verified_at=now - timedelta(hours=1, minutes=30),
            latitude=23.7954,
            longitude=86.4308,
            location_context="Drift 2 South Junction",
            is_alert_generated=True,
            created_at=now - timedelta(hours=2)
        )

        db.add_all([pred1, pred2])
        db.commit()

        # Seed Phase 11A Real Mine Data Foundation (6 Official Coal Blocks)
        print("Seeding Phase 11A Real Mine Data Foundation (6 Official Coal Blocks)...")
        from app.services.real_mine_ingestion_service import RealMineIngestionService
        ingestion_svc = RealMineIngestionService(db)
        real_reports = ingestion_svc.ingest_all()
        print(f"Phase 11A Real Mines Ingested: {len(real_reports)} blocks processed.")

        # Seed Phase 12C-2A.2 Deterministic Historical Operational Dataset (Demo Mines only)
        print("Seeding Phase 12C-2A.2 Deterministic Synthetic Operational History (90 Days / 6 Phases)...")
        from app.services.synthetic_history_generator import SyntheticHistoryGenerator
        hist_stats = SyntheticHistoryGenerator.generate_all(db=db, base_time=now, seed=42)
        print(f"Phase 12C-2A.2 Operational History Ingested: {hist_stats}")

        # Seed Genesis Audit Log
        AuditService.log_event(
            db=db,
            actor_id=u_admin.id,
            action="SYSTEM_PHASE12C_HISTORICAL_OPERATIONAL_SEED",
            resource_type="SYSTEM",
            resource_id="0",
            metadata={"environment": "development", "version": "1.0.0-phase12c", "real_blocks_count": len(real_reports), "historical_records": hist_stats}
        )

        print("\nPhase 12C-2A.2 Seed data generated successfully!")
        print(f"Total Sensors: {len(sensors_list)} | Total Workers: {len(all_workers)} | Real Coal Blocks: {len(real_reports)}")

    except Exception as e:
        db.rollback()
        print(f"Seed error: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed()


