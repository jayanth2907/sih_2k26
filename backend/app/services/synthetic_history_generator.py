"""
TRINETRA Phase 12C-2A.2: Deterministic Synthetic Historical Operational Data Generator
====================================================================================
Generates rich, multi-phase operational history for SIMULATED/DEMO coal mines over a
90-day window (with primary high-resolution 30-day operational narrative).

Data Trust Guarantee:
- ONLY operates on simulated/demo mines (is_simulated = 'YES').
- Leaves Phase 11A Real Mine Foundation (6 official coal blocks) 100% untouched.
- Uses a deterministic seed so repeated seeding produces identical time-series series.
- Narrative Phases:
    Phase A: Baseline Safe Operations (Days -30 to -21)
    Phase B: Early Warning & Precursor Anomalies (Days -20 to -16)
    Phase C: Critical Escalation & Event Spike (Days -15 to -12)
    Phase D: Response & Field Operation (Days -11 to -8)
    Phase E: Recovery & Resolution (Days -7 to -4)
    Phase F: Normalization & Verification (Days -3 to 0)
"""

import math
import json
import random
from datetime import datetime, timezone, timedelta, date
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from app.models import (
    Mine, MineLevel, MineZone,
    SensorType, Sensor, SensorReading,
    Camera, Equipment,
    Incident, IncidentEvent,
    Violation, CorrectiveAction, Escalation,
    RiskScore, RiskFactor, AnomalyEvent,
    Alert, AuditEvent,
    Shift, Worker, AttendanceRecord,
    Contractor, Contract, ContractRequirement,
    ProductionReport, EnvironmentalRule, EnvironmentalObservation,
    Grievance, RegulatoryReport, ReportVersion,
    GovernanceTask, ApprovalRequest, ApprovalAction,
    FieldInspection, FieldEvidence, FieldSyncLog,
    RiskPrediction,
    User
)


class SyntheticHistoryGenerator:
    """
    Deterministic historical operational data generator for TRINETRA demonstration mines.
    """

    @classmethod
    def generate_all(cls, db: Session, base_time: Optional[datetime] = None, seed: int = 42) -> Dict[str, int]:
        now = base_time or datetime.now(timezone.utc)
        
        # Only seed demo operational mines (Mine 1: BDS-04, Mine 2: SOB-02, Mine 3: RS-07)
        demo_mines = db.query(Mine).filter(
            Mine.is_simulated == "YES",
            Mine.id.in_([1, 2, 3])
        ).all()

        if not demo_mines:
            print("[SyntheticHistoryGenerator] No demo mines found for historical seeding.")
            return {}

        counts = {
            "sensor_readings": 0,
            "anomaly_events": 0,
            "alerts": 0,
            "incidents": 0,
            "risk_predictions": 0,
            "production_reports": 0,
            "attendance_records": 0,
            "environmental_observations": 0,
            "violations": 0,
            "corrective_actions": 0,
            "field_inspections": 0,
            "governance_tasks": 0,
        }

        for m in demo_mines:
            mine_seed = seed + (m.id * 100)
            rng = random.Random(mine_seed)
            print(f"[SyntheticHistoryGenerator] Generating historical operational dataset for Mine {m.id} ({m.name}) with seed {mine_seed}...")

            # 1. Sensors & Telemetry
            sr_cnt = cls._generate_sensor_telemetry(db, m, now, rng)
            counts["sensor_readings"] += sr_cnt

            # 2. Anomalies & Alerts
            anom_cnt, alt_cnt = cls._generate_anomalies_and_alerts(db, m, now, rng)
            counts["anomaly_events"] += anom_cnt
            counts["alerts"] += alt_cnt

            # 3. Incidents
            inc_cnt = cls._generate_incidents(db, m, now, rng)
            counts["incidents"] += inc_cnt

            # 4. Predictive Risk Time Series
            risk_cnt = cls._generate_predictive_risk(db, m, now, rng)
            counts["risk_predictions"] += risk_cnt

            # 5. Production History (Actual vs Target)
            prod_cnt = cls._generate_production_history(db, m, now, rng)
            counts["production_reports"] += prod_cnt

            # 6. Workforce Attendance History
            att_cnt = cls._generate_workforce_history(db, m, now, rng)
            counts["attendance_records"] += att_cnt

            # 7. Environmental Quality Observations
            env_cnt = cls._generate_environmental_history(db, m, now, rng)
            counts["environmental_observations"] += env_cnt

            # 8. Compliance, Violations & Corrective Actions
            vio_cnt, ca_cnt = cls._generate_compliance_history(db, m, now, rng)
            counts["violations"] += vio_cnt
            counts["corrective_actions"] += ca_cnt

            # 9. Field Operations, Inspections & Sync Logs
            insp_cnt = cls._generate_field_operations(db, m, now, rng)
            counts["field_inspections"] += insp_cnt

            # 10. Governance Tasks
            task_cnt = cls._generate_governance_tasks(db, m, now, rng)
            counts["governance_tasks"] += task_cnt

        db.commit()
        print(f"[SyntheticHistoryGenerator] Successfully seeded historical operational dataset: {counts}")
        return counts

    # =========================================================================
    # 1. SENSOR TELEMETRY HISTORY (30-90 Days)
    # =========================================================================
    @classmethod
    def _generate_sensor_telemetry(cls, db: Session, mine: Mine, now: datetime, rng: random.Random) -> int:
        sensors = db.query(Sensor).filter(Sensor.mine_id == mine.id).all()
        if not sensors:
            return 0

        readings: List[SensorReading] = []

        for s in sensors:
            # Determine metric type
            code = s.sensor_code
            is_ch4 = "CH4" in code
            is_vel = "VEL" in code
            is_co = "CO" in code
            is_dust = "DUST" in code
            is_temp = "TEMP" in code
            is_vib = "VIB" in code
            is_hum = "HUM" in code
            is_pres = "PRES" in code

            base_val = (s.normal_min + s.normal_max) / 2.0
            val_range = (s.normal_max - s.normal_min) / 2.0

            # Generate 90 days of history
            # Days -90 to -31: 4 readings per day (every 6 hours)
            # Days -30 to 0: 8 readings per day (every 3 hours)
            # Incident window (Days -16 to -13): hourly readings
            
            for day_offset in range(90, -1, -1):
                sample_dt_day = now - timedelta(days=day_offset)
                
                if day_offset > 30:
                    hours_to_sample = [0, 6, 12, 18]
                elif 13 <= day_offset <= 16 and mine.id == 1:
                    hours_to_sample = list(range(0, 24, 2)) # Every 2 hours during escalation
                else:
                    hours_to_sample = [0, 3, 6, 9, 12, 15, 18, 21]

                for hr in hours_to_sample:
                    ts = sample_dt_day.replace(hour=hr, minute=rng.randint(2, 58), second=rng.randint(0, 59))
                    if ts > now:
                        continue

                    noise = rng.uniform(-val_range * 0.15, val_range * 0.15)
                    diurnal = math.sin((hr / 24.0) * 2 * math.pi) * (val_range * 0.1)

                    # Narrative Modifier for Mine 1 (BDS-04 Underground Narrative)
                    if mine.id == 1:
                        if is_ch4 and "101" in code:
                            if day_offset > 20:
                                val = 0.25 + noise
                            elif 16 <= day_offset <= 20: # Early warning
                                progress = (20 - day_offset) / 4.0
                                val = 0.35 + (0.45 * progress) + noise
                            elif 14 <= day_offset <= 15: # Critical Spike
                                val = 1.34 + rng.uniform(-0.04, 0.08)
                            elif 9 <= day_offset <= 13: # Response / Degassing
                                progress = (13 - day_offset) / 4.0
                                val = 1.15 - (0.65 * progress) + noise
                            elif 4 <= day_offset <= 8: # Recovery
                                val = 0.35 + noise
                            else: # Normalization
                                val = 0.28 + noise
                        elif is_vel and "102" in code:
                            if day_offset > 20:
                                val = 3.0 + noise
                            elif 16 <= day_offset <= 20:
                                progress = (20 - day_offset) / 4.0
                                val = 3.0 - (1.2 * progress) + noise
                            elif 14 <= day_offset <= 15: # Velocity Stall (< 0.50 m/s)
                                val = 0.42 + rng.uniform(-0.03, 0.04)
                            elif 9 <= day_offset <= 13:
                                progress = (13 - day_offset) / 4.0
                                val = 0.55 + (1.8 * progress) + noise
                            elif 4 <= day_offset <= 8:
                                val = 2.8 + noise
                            else:
                                val = 3.1 + noise
                        elif is_co and "101" in code:
                            if 14 <= day_offset <= 16:
                                val = 28.5 + rng.uniform(-2.0, 3.5)
                            elif 10 <= day_offset <= 13:
                                val = 16.0 + noise
                            else:
                                val = 7.5 + noise
                        elif is_dust and "102" in code:
                            if 14 <= day_offset <= 16:
                                val = 3.9 + rng.uniform(-0.2, 0.3)
                            else:
                                val = 1.4 + noise
                        else:
                            val = base_val + noise + diurnal

                    # Narrative Modifier for Mine 2 (SOB-02 Opencast Narrative)
                    elif mine.id == 2:
                        if is_vib and "201" in code and 10 <= day_offset <= 12:
                            val = 6.8 + rng.uniform(-0.3, 0.5) # Strata vibration spike
                        elif is_dust and 10 <= day_offset <= 12:
                            val = 3.6 + rng.uniform(-0.2, 0.4) # Haul road dust surge
                        elif is_temp and "201" in code and 10 <= day_offset <= 12:
                            val = 88.0 + rng.uniform(-2.0, 4.0) # Shovel engine temp
                        else:
                            val = base_val + noise + diurnal

                    # Narrative Modifier for Mine 3 (RS-07 Incline Narrative)
                    elif mine.id == 3:
                        if is_ch4 and 20 <= day_offset <= 22:
                            val = 0.82 + rng.uniform(-0.03, 0.05) # Incline gas heading warning
                        else:
                            val = base_val + noise + diurnal
                    else:
                        val = base_val + noise + diurnal

                    # Ensure non-negative for physical quantities
                    val = max(0.01, round(val, 2))
                    readings.append(
                        SensorReading(
                            sensor_id=s.id,
                            timestamp=ts,
                            value=val,
                            unit=s.unit,
                            quality="GOOD",
                            source="SIMULATED",
                            ingestion_timestamp=ts + timedelta(seconds=rng.randint(1, 4))
                        )
                    )

            # Update latest reading on sensor
            if readings:
                s.last_value = readings[-1].value
                s.last_reading_at = readings[-1].timestamp

        db.add_all(readings)
        return len(readings)

    # =========================================================================
    # 2. ANOMALIES & ALERTS HISTORY
    # =========================================================================
    @classmethod
    def _generate_anomalies_and_alerts(cls, db: Session, mine: Mine, now: datetime, rng: random.Random) -> tuple[int, int]:
        sensors = {s.sensor_code: s for s in db.query(Sensor).filter(Sensor.mine_id == mine.id).all()}
        zones = {z.code: z for z in db.query(MineZone).filter(MineZone.mine_id == mine.id).all()}
        levels = {l.code: l for l in db.query(MineLevel).filter(MineLevel.mine_id == mine.id).all()}

        anomalies: List[AnomalyEvent] = []
        alerts: List[Alert] = []

        if mine.id == 1:
            # Event 1: Precursor Methane Warning (Day -18)
            s_ch4 = sensors.get("SN-BDS04-CH4-101")
            z_east = zones.get("ZN-EAST-LW-102")
            l_s2 = levels.get("LVL-SEAM-02")
            if s_ch4 and z_east and l_s2:
                t1 = now - timedelta(days=18, hours=4)
                a1 = AnomalyEvent(
                    mine_id=mine.id,
                    sensor_id=s_ch4.id,
                    level_id=l_s2.id,
                    zone_id=z_east.id,
                    anomaly_type="THRESHOLD_EXCEEDED",
                    severity="WARNING",
                    observed_value=0.78,
                    expected_range="0.05 - 0.45 %",
                    threshold_limit=0.75,
                    unit="%",
                    description=f"{s_ch4.name} crossed statutory warning threshold: 0.78% >= 0.75%.",
                    x=s_ch4.x, y=s_ch4.y, z=s_ch4.z,
                    source="SIMULATED",
                    status="ACKNOWLEDGED",
                    detected_at=t1,
                    resolved_at=t1 + timedelta(hours=6)
                )
                anomalies.append(a1)
                alerts.append(
                    Alert(
                        mine_id=mine.id,
                        sensor_id=s_ch4.id,
                        anomaly_id=None,
                        title=f"Warning: {s_ch4.name} Surge",
                        message=a1.description,
                        severity="WARNING",
                        risk_score=42.0,
                        status="RESOLVED",
                        source="SIMULATED",
                        location_context="East Longwall Face 102",
                        deduplication_key=f"MINE_{mine.id}_SENSOR_{s_ch4.id}_D18_WARN",
                        created_at=t1,
                        resolved_at=t1 + timedelta(hours=6)
                    )
                )

                # Event 2: Critical Methane Spike (Day -15)
                t2 = now - timedelta(days=15, hours=9, minutes=30)
                a2 = AnomalyEvent(
                    mine_id=mine.id,
                    sensor_id=s_ch4.id,
                    level_id=l_s2.id,
                    zone_id=z_east.id,
                    anomaly_type="THRESHOLD_EXCEEDED",
                    severity="CRITICAL",
                    observed_value=1.38,
                    expected_range="0.05 - 0.45 %",
                    threshold_limit=1.25,
                    unit="%",
                    description=f"CRITICAL GAS SURGE: {s_ch4.name} breached statutory critical limit (1.38% >= 1.25%). Immediate evacuation triggered under CMR 2017 Reg 169.",
                    x=s_ch4.x, y=s_ch4.y, z=s_ch4.z,
                    source="SIMULATED",
                    status="RESOLVED",
                    detected_at=t2,
                    resolved_at=now - timedelta(days=6)
                )
                anomalies.append(a2)
                alerts.append(
                    Alert(
                        mine_id=mine.id,
                        sensor_id=s_ch4.id,
                        anomaly_id=None,
                        title=f"CRITICAL: {s_ch4.name} Threshold Breach (1.38%)",
                        message=a2.description,
                        severity="CRITICAL",
                        risk_score=86.5,
                        status="RESOLVED",
                        source="SIMULATED",
                        location_context="East Longwall Face 102 (Seam 2)",
                        deduplication_key=f"MINE_{mine.id}_SENSOR_{s_ch4.id}_D15_CRIT",
                        created_at=t2,
                        resolved_at=now - timedelta(days=6)
                    )
                )

                # Event 3: Ventilation Velocity Drop (Day -15)
                s_vel = sensors.get("SN-BDS04-VEL-102")
                if s_vel:
                    a3 = AnomalyEvent(
                        mine_id=mine.id,
                        sensor_id=s_vel.id,
                        level_id=l_s2.id,
                        zone_id=z_east.id,
                        anomaly_type="THRESHOLD_DROP",
                        severity="CRITICAL",
                        observed_value=0.42,
                        expected_range="1.8 - 4.0 m/s",
                        threshold_limit=0.50,
                        unit="m/s",
                        description=f"VENTILATION STALL: {s_vel.name} dropped below critical statutory airflow limit (0.42 m/s < 0.50 m/s).",
                        x=s_vel.x, y=s_vel.y, z=s_vel.z,
                        source="SIMULATED",
                        status="RESOLVED",
                        detected_at=t2 + timedelta(minutes=5),
                        resolved_at=now - timedelta(days=6)
                    )
                    anomalies.append(a3)
                    alerts.append(
                        Alert(
                            mine_id=mine.id,
                            sensor_id=s_vel.id,
                            anomaly_id=None,
                            title=f"CRITICAL: Return Airway Ventilation Velocity Stall (0.42 m/s)",
                            message=a3.description,
                            severity="CRITICAL",
                            risk_score=82.0,
                            status="RESOLVED",
                            source="SIMULATED",
                            location_context="East Return Airway (Seam 2)",
                            deduplication_key=f"MINE_{mine.id}_SENSOR_{s_vel.id}_D15_CRIT",
                            created_at=t2 + timedelta(minutes=5),
                            resolved_at=now - timedelta(days=6)
                        )
                    )

        elif mine.id == 2:
            # Opencast Highwall Vibration Alert (Day -11)
            s_vib = sensors.get("SN-SOB02-VIB-201")
            z_b3 = zones.get("ZN-PIT-BENCH-3A")
            l_p1 = levels.get("LVL-PIT-01")
            if s_vib and z_b3 and l_p1:
                t = now - timedelta(days=11, hours=3)
                a = AnomalyEvent(
                    mine_id=mine.id,
                    sensor_id=s_vib.id,
                    level_id=l_p1.id,
                    zone_id=z_b3.id,
                    anomaly_type="THRESHOLD_EXCEEDED",
                    severity="HIGH",
                    observed_value=6.8,
                    expected_range="0.1 - 3.0 mm/s",
                    threshold_limit=6.0,
                    unit="mm/s",
                    description=f"{s_vib.name} highwall slope seismic vibration exceeded warning threshold (6.8 mm/s >= 6.0 mm/s) post heavy bench blast.",
                    x=s_vib.x, y=s_vib.y, z=s_vib.z,
                    source="SIMULATED",
                    status="RESOLVED",
                    detected_at=t,
                    resolved_at=t + timedelta(hours=14)
                )
                anomalies.append(a)
                alerts.append(
                    Alert(
                        mine_id=mine.id,
                        sensor_id=s_vib.id,
                        anomaly_id=None,
                        title="Highwall Bench Strata Seismic Vibration Warning",
                        message=a.description,
                        severity="HIGH",
                        risk_score=58.0,
                        status="RESOLVED",
                        source="SIMULATED",
                        location_context="Bench 3A Highwall",
                        deduplication_key=f"MINE_{mine.id}_SENSOR_{s_vib.id}_D11",
                        created_at=t,
                        resolved_at=t + timedelta(hours=14)
                    )
                )

        elif mine.id == 3:
            # Incline Gas Heading Warning (Day -21)
            s_ch4_3 = sensors.get("SN-RS07-CH4-301")
            z_hd = zones.get("ZN-HEADING-NORTH")
            l_r1 = levels.get("LVL-RS-07")
            if s_ch4_3 and z_hd and l_r1:
                t = now - timedelta(days=21, hours=6)
                a = AnomalyEvent(
                    mine_id=mine.id,
                    sensor_id=s_ch4_3.id,
                    level_id=l_r1.id,
                    zone_id=z_hd.id,
                    anomaly_type="THRESHOLD_EXCEEDED",
                    severity="WARNING",
                    observed_value=0.82,
                    expected_range="0.02 - 0.35 %",
                    threshold_limit=0.70,
                    unit="%",
                    description=f"{s_ch4_3.name} continuous miner face gas buildup: 0.82% >= 0.70%.",
                    x=s_ch4_3.x, y=s_ch4_3.y, z=s_ch4_3.z,
                    source="SIMULATED",
                    status="RESOLVED",
                    detected_at=t,
                    resolved_at=t + timedelta(hours=4)
                )
                anomalies.append(a)
                alerts.append(
                    Alert(
                        mine_id=mine.id,
                        sensor_id=s_ch4_3.id,
                        anomaly_id=None,
                        title="North Heading Incline Gas Warning",
                        message=a.description,
                        severity="WARNING",
                        risk_score=44.0,
                        status="RESOLVED",
                        source="SIMULATED",
                        location_context="North Development Heading",
                        deduplication_key=f"MINE_{mine.id}_SENSOR_{s_ch4_3.id}_D21",
                        created_at=t,
                        resolved_at=t + timedelta(hours=4)
                    )
                )

        db.add_all(anomalies)
        db.add_all(alerts)
        db.flush()
        return len(anomalies), len(alerts)

    # =========================================================================
    # 3. INCIDENT & INCIDENT EVENT HISTORY
    # =========================================================================
    @classmethod
    def _generate_incidents(cls, db: Session, mine: Mine, now: datetime, rng: random.Random) -> int:
        u_safety = db.query(User).filter(User.email.like("%safety%")).first()
        u_mgr = db.query(User).filter(User.email.like("%manager%")).first()
        reporter_id = u_safety.id if u_safety else None
        assignee_id = u_mgr.id if u_mgr else None

        incidents: List[Incident] = []

        if mine.id == 1:
            # Incident 1: Minor conveyor slip (Day -25, resolved Day -24)
            inc1_created = now - timedelta(days=25, hours=6)
            inc1_resolved = now - timedelta(days=24, hours=18)
            inc1 = Incident(
                incident_code="INC-BDS04-2026-001",
                mine_id=mine.id,
                title="Conveyor Belt Alignment Sensor Drift at Main Haulage Drift A",
                description="Trunk conveyor belt alignment switch intermittent trigger during high tonnage haulage. Minor belt edge friction inspected.",
                category="EQUIPMENT_BREAKDOWN",
                severity="LOW",
                status="CLOSED",
                reporter_id=reporter_id,
                assignee_id=assignee_id,
                x=10.0, y=150.0, z=-220.0,
                sla_hours=48,
                resolution_notes="Belt tension re-centered, alignment rollers lubricated, sensor zero point recalibrated.",
                resolved_at=inc1_resolved,
                closed_at=inc1_resolved,
                created_at=inc1_created
            )
            incidents.append(inc1)

            # Incident 2: Critical Gas Surge & Airway Stall (Day -15, resolved Day -5)
            inc2_created = now - timedelta(days=15, hours=9, minutes=35)
            inc2_resolved = now - timedelta(days=5, hours=14)
            inc2 = Incident(
                incident_code="INC-BDS04-2026-002",
                mine_id=mine.id,
                title="Critical Methane Accumulation & Airway Stall at East Longwall Face 102",
                description="Seam 2 East Longwall face experienced simultaneous CH4 concentration spike (1.38% > 1.25%) and auxiliary airway velocity drop (0.42 m/s < 0.50 m/s). Statutory shearer power trip and emergency personnel withdrawal executed under CMR 2017 Reg 169.",
                category="GAS_ANOMALY",
                severity="CRITICAL",
                status="RESOLVED",
                reporter_id=reporter_id,
                assignee_id=assignee_id,
                x=145.0, y=470.0, z=-318.0,
                sla_hours=24,
                is_escalated="YES",
                escalation_level=2,
                resolution_notes="Auxiliary ventilation booster fan duct extended by 40m, drainage borehole purge completed, velocity restored to 2.8 m/s, methane stabilized at 0.32%. Clearance issued after 24h statutory continuous monitoring.",
                resolved_at=inc2_resolved,
                verified_at=now - timedelta(days=2),
                created_at=inc2_created
            )
            incidents.append(inc2)

        elif mine.id == 2:
            inc_created = now - timedelta(days=11, hours=4)
            inc_resolved = now - timedelta(days=10, hours=16)
            inc = Incident(
                incident_code="INC-SOB02-2026-001",
                mine_id=mine.id,
                title="East Haul Road Respirable Dust Surge during Heavy Dragline Shovel Haulage",
                description="Dry atmospheric conditions combined with peak haul truck dispatch caused PM10 particulate dispersion above 3.5 mg/m3 at Bench 3A.",
                category="VENTILATION_FAILURE",
                severity="MEDIUM",
                status="RESOLVED",
                reporter_id=reporter_id,
                assignee_id=assignee_id,
                x=120.0, y=80.0, z=250.0,
                sla_hours=24,
                resolution_notes="Dedicated water bowser suppression trucks deployed on 30-minute rotation, dust dropped to 1.4 mg/m3.",
                resolved_at=inc_resolved,
                created_at=inc_created
            )
            incidents.append(inc)

        elif mine.id == 3:
            inc_created = now - timedelta(days=21, hours=7)
            inc_resolved = now - timedelta(days=21, hours=15)
            inc = Incident(
                incident_code="INC-RS07-2026-001",
                mine_id=mine.id,
                title="Continuous Miner Heading Localized Gas Pocket Ingress",
                description="Temporary methane elevation to 0.82% at North Development Heading during continuous miner rib cut.",
                category="GAS_ANOMALY",
                severity="MEDIUM",
                status="CLOSED",
                reporter_id=reporter_id,
                assignee_id=assignee_id,
                x=95.0, y=320.0, z=-178.0,
                sla_hours=12,
                resolution_notes="Auxiliary duct brattice advanced to 3m from face, gas cleared within 45 minutes.",
                resolved_at=inc_resolved,
                closed_at=inc_resolved,
                created_at=inc_created
            )
            incidents.append(inc)

        db.add_all(incidents)
        db.flush()

        # Add Incident Events
        for inc in incidents:
            e1 = IncidentEvent(
                incident_id=inc.id,
                actor_id=reporter_id,
                from_status=None,
                to_status="OPEN",
                comment=f"Incident {inc.incident_code} logged into TRINETRA incident register.",
                created_at=inc.created_at
            )
            db.add(e1)
            if inc.resolved_at:
                e2 = IncidentEvent(
                    incident_id=inc.id,
                    actor_id=assignee_id,
                    from_status="OPEN",
                    to_status="RESOLVED",
                    comment=inc.resolution_notes or "Remedial corrective actions completed successfully.",
                    created_at=inc.resolved_at
                )
                db.add(e2)

        return len(incidents)

    # =========================================================================
    # 4. PREDICTIVE RISK TIME SERIES (30-90 Days)
    # =========================================================================
    @classmethod
    def _generate_predictive_risk(cls, db: Session, mine: Mine, now: datetime, rng: random.Random) -> int:
        preds: List[RiskPrediction] = []

        # Generate 1 risk prediction per 6 hours across 90 days (360 points)
        for day_offset in range(90, -1, -1):
            sample_day = now - timedelta(days=day_offset)
            for hr in [0, 6, 12, 18]:
                ts = sample_day.replace(hour=hr, minute=0, second=0)
                if ts > now:
                    continue

                noise = rng.uniform(-1.5, 1.5)

                if mine.id == 1:
                    if day_offset > 20: # Phase A: Normal
                        curr_risk = 20.0 + noise
                        pred_risk = 22.0 + noise
                        sev = "LOW"
                        prob = 0.12 + rng.uniform(-0.02, 0.02)
                    elif 16 <= day_offset <= 20: # Phase B: Early Warning
                        prog = (20 - day_offset) / 4.0
                        curr_risk = 22.0 + (22.0 * prog) + noise
                        pred_risk = 25.0 + (28.0 * prog) + noise
                        sev = "MEDIUM"
                        prob = 0.45 + (0.18 * prog)
                    elif 14 <= day_offset <= 15: # Phase C: Critical Breach
                        curr_risk = 78.5 + rng.uniform(-1.0, 2.0)
                        pred_risk = 86.0 + rng.uniform(-1.0, 2.5)
                        sev = "CRITICAL"
                        prob = 0.88 + rng.uniform(-0.02, 0.04)
                    elif 9 <= day_offset <= 13: # Phase D: Response
                        prog = (13 - day_offset) / 4.0
                        curr_risk = 72.0 - (24.0 * prog) + noise
                        pred_risk = 78.0 - (30.0 * prog) + noise
                        sev = "HIGH" if curr_risk > 60 else "MEDIUM"
                        prob = 0.75 - (0.35 * prog)
                    elif 4 <= day_offset <= 8: # Phase E: Recovery
                        prog = (8 - day_offset) / 4.0
                        curr_risk = 45.0 - (20.0 * prog) + noise
                        pred_risk = 42.0 - (18.0 * prog) + noise
                        sev = "LOW"
                        prob = 0.22 - (0.10 * prog)
                    else: # Phase F: Normalization
                        curr_risk = 21.5 + noise
                        pred_risk = 22.0 + noise
                        sev = "LOW"
                        prob = 0.10 + rng.uniform(-0.01, 0.02)
                elif mine.id == 2:
                    if 10 <= day_offset <= 12:
                        curr_risk = 56.0 + noise
                        pred_risk = 62.0 + noise
                        sev = "HIGH"
                        prob = 0.65
                    else:
                        curr_risk = 18.0 + noise
                        pred_risk = 19.5 + noise
                        sev = "LOW"
                        prob = 0.08
                else: # Mine 3
                    if 20 <= day_offset <= 22:
                        curr_risk = 42.0 + noise
                        pred_risk = 46.0 + noise
                        sev = "MEDIUM"
                        prob = 0.48
                    else:
                        curr_risk = 16.0 + noise
                        pred_risk = 17.5 + noise
                        sev = "LOW"
                        prob = 0.07

                curr_risk = max(5.0, min(98.0, round(curr_risk, 1)))
                pred_risk = max(5.0, min(98.0, round(pred_risk, 1)))
                prob = max(0.01, min(0.99, round(prob, 2)))

                features_list = [
                    {"feature": "Elevated methane concentration (CH4)", "impact": "High" if curr_risk > 50 else "Low"},
                    {"feature": "Reduced ventilation airway velocity", "impact": "High" if curr_risk > 60 else "Normal"},
                    {"feature": "Critical sensor anomalies in last 24h", "impact": "High" if curr_risk > 70 else "Zero"},
                    {"feature": "Active statutory DGMS violation notice", "impact": "Medium" if 6 <= day_offset <= 15 else "None"},
                    {"feature": "Strata seismic vibration stability", "impact": "Normal"}
                ]

                p = RiskPrediction(
                    mine_id=mine.id,
                    prediction_timestamp=ts,
                    horizon_minutes=30,
                    predicted_risk_score=pred_risk,
                    predicted_severity=sev,
                    probability=prob,
                    predicted_class=1 if pred_risk >= 50.0 else 0,
                    current_risk_score=curr_risk,
                    model_name="TRINETRA-RiskGradientBoosting",
                    model_version="risk-escalation-v1.0",
                    dataset_type="SIMULATED_DEMO",
                    feature_snapshot_json=json.dumps({"methane_ch4": 0.42, "velocity": 2.8, "co_ppm": 8.0}),
                    explanation_json=json.dumps(features_list),
                    data_quality_score=1.0,
                    data_quality_notes="Full 100% online telemetry available",
                    is_alert_generated=pred_risk >= 75.0,
                    created_at=ts
                )
                preds.append(p)

        db.add_all(preds)
        return len(preds)

    # =========================================================================
    # 5. PRODUCTION HISTORY (30-90 Days: Actual vs Target)
    # =========================================================================
    @classmethod
    def _generate_production_history(cls, db: Session, mine: Mine, now: datetime, rng: random.Random) -> int:
        u_mgr = db.query(User).filter(User.email.like("%manager%")).first()
        reporter_id = u_mgr.id if u_mgr else None

        reports: List[ProductionReport] = []
        target_qty = 4500.0 if mine.mine_type == "UNDERGROUND" else 12000.0

        for day_offset in range(90, -1, -1):
            report_date = (now - timedelta(days=day_offset)).date()
            noise = rng.uniform(-180.0, 180.0)

            if mine.id == 1:
                if 14 <= day_offset <= 15: # Incident Day: Temporary Safety Pause
                    actual_qty = 2780.0 + rng.uniform(-50.0, 50.0)
                    flag = "CRITICAL_SHORTFALL"
                    notes = "East Longwall Seam 2 sheared output halted due to CMR 2017 Reg 169 gas surge safety evacuation."
                elif 10 <= day_offset <= 13: # Remediation & Recovery Phase
                    actual_qty = 3850.0 + rng.uniform(-100.0, 100.0)
                    flag = "DEVIATION_REVIEW_REQUIRED"
                    notes = "Production operating on reduced cut cycle during booster fan reconfiguration."
                else: # Normal days
                    actual_qty = target_qty + noise
                    flag = "NORMAL"
                    notes = "Normal longwall shearing and trunk conveyor haulage."
            elif mine.id == 2 and 10 <= day_offset <= 12:
                actual_qty = target_qty * 0.78 + noise
                flag = "DEVIATION_REVIEW_REQUIRED"
                notes = "Dragline dispatch paced during highwall slope bench inspection."
            else:
                actual_qty = target_qty + noise
                flag = "NORMAL"
                notes = "Regular mining shift dispatch."

            actual_qty = max(500.0, round(actual_qty, 1))
            var_qty = round(actual_qty - target_qty, 1)
            var_pct = round((var_qty / target_qty) * 100.0, 2)

            rep = ProductionReport(
                report_code=f"PROD-{mine.id}-{report_date.strftime('%Y%m%d')}-A",
                mine_id=mine.id,
                report_date=report_date,
                shift="A",
                material_type="COAL_RAW",
                planned_quantity=target_qty,
                actual_quantity=actual_qty,
                unit="TONNES",
                variance_quantity=var_qty,
                variance_percentage=var_pct,
                status="APPROVED",
                deviation_flag=flag,
                reporting_officer_id=reporter_id,
                notes=notes,
                created_at=now - timedelta(days=day_offset, hours=2)
            )
            reports.append(rep)

        db.add_all(reports)
        return len(reports)

    # =========================================================================
    # 6. WORKFORCE ATTENDANCE HISTORY (30-90 Days)
    # =========================================================================
    @classmethod
    def _generate_workforce_history(cls, db: Session, mine: Mine, now: datetime, rng: random.Random) -> int:
        workers = db.query(Worker).filter(Worker.mine_id == mine.id).all()
        shifts = db.query(Shift).filter(Shift.mine_id == mine.id).all()
        u_safety = db.query(User).filter(User.email.like("%safety%")).first()
        marked_by_id = u_safety.id if u_safety else None

        if not workers or not shifts:
            return 0

        sh_a = shifts[0]
        attendance_list: List[AttendanceRecord] = []

        for day_offset in range(90, -1, -1):
            att_date = (now - timedelta(days=day_offset)).date()
            is_weekend = att_date.weekday() >= 5

            for w in workers:
                # 94% average attendance rate
                roll = rng.random()
                if roll < 0.90:
                    status = "PRESENT"
                elif roll < 0.96:
                    status = "LATE"
                else:
                    status = "ABSENT" if not is_weekend else "PRESENT"

                check_in = now - timedelta(days=day_offset, hours=10) if status != "ABSENT" else None
                check_out = now - timedelta(days=day_offset, hours=2) if status == "PRESENT" else None

                rec = AttendanceRecord(
                    worker_id=w.id,
                    mine_id=mine.id,
                    shift_id=sh_a.id,
                    attendance_date=att_date,
                    check_in_time=check_in,
                    check_out_time=check_out,
                    status=status,
                    verification_mode="SIMULATED",
                    marked_by_id=marked_by_id,
                    created_at=now - timedelta(days=day_offset, hours=1)
                )
                attendance_list.append(rec)

        db.add_all(attendance_list)
        return len(attendance_list)

    # =========================================================================
    # 7. ENVIRONMENTAL QUALITY OBSERVATIONS (30-90 Days)
    # =========================================================================
    @classmethod
    def _generate_environmental_history(cls, db: Session, mine: Mine, now: datetime, rng: random.Random) -> int:
        rules = db.query(EnvironmentalRule).all()
        rule_map = {r.parameter_name: r for r in rules}

        params = [
            ("PM10", 1.5, 3.0, "µg/m³"),
            ("PM2.5", 0.8, 1.5, "µg/m³"),
            ("NOISE_DB", 74.0, 85.0, "dB(A)"),
            ("WATER_PH", 7.2, 8.5, "pH")
        ]

        obs_list: List[EnvironmentalObservation] = []

        for day_offset in range(90, -1, -1):
            obs_dt = now - timedelta(days=day_offset, hours=4)

            for p_name, base, limit, unit in params:
                noise = rng.uniform(-base * 0.15, base * 0.15)
                r = rule_map.get(p_name)

                # Narrative spike on PM10 around Day -15 for Mine 1
                if mine.id == 1 and p_name == "PM10" and 14 <= day_offset <= 16:
                    val = 3.85 + rng.uniform(-0.1, 0.2)
                    sev = "HIGH"
                    status = "RESOLVED" if day_offset < 15 else "MITIGATION_IN_PROGRESS"
                    action = "Water mist suppression sprays activated at Seam 2 transfer point."
                elif mine.id == 2 and p_name == "PM10" and 10 <= day_offset <= 12:
                    val = 3.45 + rng.uniform(-0.1, 0.2)
                    sev = "MEDIUM"
                    status = "RESOLVED"
                    action = "Haul road water bowser wetting cycles doubled."
                else:
                    val = base + noise
                    sev = "LOW"
                    status = "NORMAL"
                    action = "Baseline environmental compliance maintained."

                val = max(0.1, round(val, 2))
                obs = EnvironmentalObservation(
                    mine_id=mine.id,
                    rule_id=r.id if r else None,
                    parameter_name=p_name,
                    observed_value=val,
                    threshold_limit=limit,
                    unit=unit,
                    severity=sev,
                    status=status,
                    location_context=f"Mine {mine.code} Monitoring Station",
                    x=15.0, y=180.0, z=-218.0 if mine.mine_type == "UNDERGROUND" else 235.0,
                    action_taken=action,
                    detected_at=obs_dt,
                    resolved_at=obs_dt + timedelta(days=2) if status == "RESOLVED" else None
                )
                obs_list.append(obs)

        db.add_all(obs_list)
        return len(obs_list)

    # =========================================================================
    # 8. COMPLIANCE, VIOLATIONS & CORRECTIVE ACTIONS
    # =========================================================================
    @classmethod
    def _generate_compliance_history(cls, db: Session, mine: Mine, now: datetime, rng: random.Random) -> tuple[int, int]:
        u_insp = db.query(User).filter(User.email.like("%inspector%")).first()
        u_mgr = db.query(User).filter(User.email.like("%manager%")).first()
        inspector_id = u_insp.id if u_insp else None
        manager_id = u_mgr.id if u_mgr else None

        zones = {z.code: z for z in db.query(MineZone).filter(MineZone.mine_id == mine.id).all()}

        violations: List[Violation] = []
        actions: List[CorrectiveAction] = []

        if mine.id == 1:
            z_east = zones.get("ZN-EAST-LW-102")
            t_vio = now - timedelta(days=11, hours=8)
            v1 = Violation(
                violation_code="VIO-BDS04-2026-001",
                mine_id=mine.id,
                zone_id=z_east.id if z_east else None,
                inspector_id=inspector_id,
                title="DGMS Regulation 169 Airflow Velocity & Methane Drainage Breach",
                description="Statutory inspection following telemetry escalation revealed auxiliary booster duct separation resulting in localized velocity drop (<0.5 m/s) at East Longwall Face 102.",
                regulatory_clause="Coal Mines Regulations (CMR) 2017 - Regulation 169 (Ventilation Standards)",
                statute="DGMS_CMR_2017",
                severity="HIGH",
                status="VERIFIED",
                remedial_deadline=t_vio + timedelta(days=7),
                financial_penalty_amount=0.0,
                created_at=t_vio,
                updated_at=now - timedelta(days=2)
            )
            violations.append(v1)
            db.add(v1)
            db.flush()

            ca1 = CorrectiveAction(
                violation_id=v1.id,
                assignee_id=manager_id,
                action_text="Extend auxiliary duct by 40 meters, calibrate booster fan blade pitch angle, and purge methane drainage borehole manifold.",
                target_completion_date=t_vio + timedelta(days=6),
                status="VERIFIED",
                completion_notes="Booster duct connected and tested. Air velocity verified at 2.85 m/s across East Longwall Face 102.",
                completed_at=now - timedelta(days=5),
                created_at=t_vio + timedelta(hours=2)
            )
            actions.append(ca1)
            db.add(ca1)

        elif mine.id == 2:
            t_vio = now - timedelta(days=24)
            v2 = Violation(
                violation_code="VIO-SOB02-2026-001",
                mine_id=mine.id,
                inspector_id=inspector_id,
                title="Haul Road Dust Suppression Spray Interval Notice",
                description="Water bowser rotation interval exceeded 90 minutes during high temperature dry spell.",
                regulatory_clause="DGMS Technical Circular 04/2010 - Environmental Dust Controls",
                statute="DGMS_CIRCULAR",
                severity="MEDIUM",
                status="RECTIFIED",
                remedial_deadline=t_vio + timedelta(days=5),
                created_at=t_vio
            )
            violations.append(v2)
            db.add(v2)
            db.flush()

            ca2 = CorrectiveAction(
                violation_id=v2.id,
                assignee_id=manager_id,
                action_text="Implement automated GPS-tracked 30-minute water tanker rotation on East Main Haul Road.",
                target_completion_date=t_vio + timedelta(days=4),
                status="COMPLETED",
                completion_notes="Bowser GPS telematics deployed; daily water log verified.",
                completed_at=t_vio + timedelta(days=3),
                created_at=t_vio + timedelta(hours=3)
            )
            actions.append(ca2)
            db.add(ca2)

        return len(violations), len(actions)

    # =========================================================================
    # 9. FIELD OPERATIONS, INSPECTIONS & SYNC LOGS
    # =========================================================================
    @classmethod
    def _generate_field_operations(cls, db: Session, mine: Mine, now: datetime, rng: random.Random) -> int:
        u_insp = db.query(User).filter(User.email.like("%inspector%")).first()
        inspector_id = u_insp.id if u_insp else None
        if not inspector_id:
            return 0

        inspections: List[FieldInspection] = []

        if mine.id == 1:
            t_insp = now - timedelta(days=11, hours=7)
            fi = FieldInspection(
                inspection_code="INSP-BDS04-2026-09",
                mine_id=mine.id,
                inspector_id=inspector_id,
                inspection_type="VENTILATION_AUDIT",
                scheduled_date=t_insp,
                status="COMPLETED",
                checklist_json=json.dumps({
                    "intake_airway_clear": True,
                    "return_airway_velocity_m_s": 0.45,
                    "fan_water_gauge_kpa": 4.1,
                    "methane_drainage_active": True,
                    "emergency_communication_operational": True
                }),
                summary_notes="Field audit of Seam 2 ventilation circuit following telemetry escalation. Violation VIO-BDS04-2026-001 issued.",
                severity_assessment="HIGH",
                started_at=t_insp,
                completed_at=t_insp + timedelta(hours=3),
                created_at=t_insp - timedelta(days=1)
            )
            inspections.append(fi)
            db.add(fi)
            db.flush()

            # Add Field Evidence & Offline Sync Log
            ev = FieldEvidence(
                evidence_code="EVD-BDS04-001",
                mine_id=mine.id,
                inspection_id=fi.id,
                evidence_type="PHOTO",
                title="East Longwall Return Airway Regulator Vane Position",
                description="Photo showing auxiliary duct coupling separation at Seam 2 crosscut 4.",
                file_url_or_path="/evidence/bds04/202609_vent_duct.jpg",
                file_hash_sha256="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
                file_size_bytes=248102,
                client_capture_timestamp=t_insp + timedelta(hours=1),
                server_received_timestamp=t_insp + timedelta(hours=3, minutes=15),
                captured_by_id=inspector_id,
                created_at=t_insp + timedelta(hours=1)
            )
            db.add(ev)

            sync = FieldSyncLog(
                operation_id=f"SYNC-BDS04-{int(t_insp.timestamp())}",
                mine_id=mine.id,
                user_id=inspector_id,
                entity_type="INSPECTION",
                entity_id=str(fi.id),
                operation_type="CREATE",
                client_timestamp=t_insp + timedelta(hours=3),
                status="ACCEPTED",
                created_at=t_insp + timedelta(hours=3, minutes=15)
            )
            db.add(sync)

        return len(inspections)

    # =========================================================================
    # 10. GOVERNANCE TASKS
    # =========================================================================
    @classmethod
    def _generate_governance_tasks(cls, db: Session, mine: Mine, now: datetime, rng: random.Random) -> int:
        u_mgr = db.query(User).filter(User.email.like("%manager%")).first()
        manager_id = u_mgr.id if u_mgr else None
        if not manager_id:
            return 0

        tasks: List[GovernanceTask] = []
        if mine.id == 1:
            t = now - timedelta(days=10, hours=5)
            gt = GovernanceTask(
                task_code="TASK-BDS04-VENT-01",
                mine_id=mine.id,
                domain="SAFETY",
                title="Execute Booster Fan Recalibration & Drainage Manifold Overhaul",
                description="Perform mechanical coupling check on Seam 2 auxiliary fan and test methane flow transmitter.",
                source_resource_type="VIOLATION",
                source_resource_id="VIO-BDS04-2026-001",
                priority="HIGH",
                status="RESOLVED",
                assignee_id=manager_id,
                due_at=t + timedelta(days=5),
                sla_status="RESOLVED",
                resolved_at=now - timedelta(days=5),
                resolution_notes="Coupling realigned and continuous airflow confirmed.",
                created_at=t
            )
            tasks.append(gt)

        db.add_all(tasks)
        return len(tasks)
