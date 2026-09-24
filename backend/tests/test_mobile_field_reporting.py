import pytest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.mine import Mine
from app.models.production import ProductionReport
from app.models.environmental import EnvironmentalRule, EnvironmentalObservation
from app.models.violation import Violation, CorrectiveAction
from app.models.approval import ApprovalRequest
from app.models.audit import AuditEvent
from app.models.field_operation import FieldSyncLog

def get_token(client: TestClient, email: str, password: str = "Trinetra@2026") -> str:
    res = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, f"Login failed for {email}: {res.text}"
    return res.json()["access_token"]


def test_01_mobile_reporting_summary_and_rules(client: TestClient, db_session: Session):
    token = get_token(client, "inspector.dgms@trinetra.gov.in")
    headers = {"Authorization": f"Bearer {token}"}
    mine = db_session.query(Mine).first()
    assert mine is not None

    resp = client.get(f"/api/v1/mobile/reporting/summary?mine_id={mine.id}", headers=headers)
    assert resp.status_code == 200, resp.text
    data = resp.json()

    assert data["mine_id"] == mine.id
    assert "shift_context" in data
    assert "production_summary" in data
    assert "environment_summary" in data
    assert "configured_rules" in data["environment_summary"]
    assert "compliance_summary" in data


def test_02_production_report_creation_normal(client: TestClient, db_session: Session):
    token = get_token(client, "manager.mine1@trinetra.gov.in")
    headers = {"Authorization": f"Bearer {token}"}
    mine = db_session.query(Mine).first()

    payload = {
        "mine_id": mine.id,
        "shift": "A",
        "material_type": "COAL_RAW",
        "planned_quantity": 500.0,
        "actual_quantity": 480.0,
        "unit": "TONNES",
        "coal_grade": "G-11 Steam Coal",
        "production_source": "MANUAL",
        "notes": "Normal extraction on Seam 4 bench."
    }
    resp = client.post("/api/v1/mobile/reporting/production", json=payload, headers=headers)
    assert resp.status_code == 201, resp.text
    data = resp.json()

    assert data["status"] == "SUCCESS"
    assert data["report_code"].startswith("PRD-")
    assert data["planned_quantity"] == 500.0
    assert data["actual_quantity"] == 480.0
    assert data["variance_percentage"] == -4.0
    assert data["deviation_flag"] == "NORMAL"
    assert data["report_status"] == "SUBMITTED"

    # Verify audit event
    audit = db_session.query(AuditEvent).filter(
        AuditEvent.resource_type == "ProductionReport",
        AuditEvent.resource_id == str(data["id"])
    ).first()
    assert audit is not None
    assert audit.action == "PRODUCTION_REPORT_SUBMITTED"


def test_03_production_shortfall_routes_to_approval(client: TestClient, db_session: Session):
    token = get_token(client, "manager.mine1@trinetra.gov.in")
    headers = {"Authorization": f"Bearer {token}"}
    mine = db_session.query(Mine).first()

    payload = {
        "mine_id": mine.id,
        "shift": "B",
        "material_type": "COAL_RAW",
        "planned_quantity": 1000.0,
        "actual_quantity": 650.0, # -35% shortfall
        "unit": "TONNES",
        "notes": "Dragline electrical tripping caused haulage delay."
    }
    resp = client.post("/api/v1/mobile/reporting/production", json=payload, headers=headers)
    assert resp.status_code == 201, resp.text
    data = resp.json()

    assert data["deviation_flag"] == "CRITICAL_SHORTFALL"
    assert data["report_status"] == "SUBMITTED_FOR_REVIEW"

    # Verify ApprovalRequest created
    approval = db_session.query(ApprovalRequest).filter(
        ApprovalRequest.resource_type == "PRODUCTION_REPORT",
        ApprovalRequest.resource_id == str(data["id"])
    ).first()
    assert approval is not None
    assert approval.status == "PENDING"
    assert approval.required_role == "MINE_MANAGER"


def test_04_environmental_observation_within_limit(client: TestClient, db_session: Session):
    token = get_token(client, "inspector.dgms@trinetra.gov.in")
    headers = {"Authorization": f"Bearer {token}"}
    mine = db_session.query(Mine).first()

    payload = {
        "mine_id": mine.id,
        "parameter_name": "PM10",
        "observed_value": 1.5,
        "unit": "mg/m3",
        "measurement_source": "MANUAL",
        "location_context": "North Stockpile Perimeter"
    }
    resp = client.post("/api/v1/mobile/reporting/environment", json=payload, headers=headers)
    assert resp.status_code == 201, resp.text
    data = resp.json()

    assert data["parameter_name"] == "PM10"
    assert data["observed_value"] == 1.5
    assert data["threshold_limit"] > 0
    assert data["observation_status"] == "OPEN"

    # Verify audit
    audit = db_session.query(AuditEvent).filter(
        AuditEvent.resource_type == "EnvironmentalObservation",
        AuditEvent.resource_id == str(data["id"])
    ).first()
    assert audit is not None
    assert audit.action == "ENVIRONMENT_OBSERVATION_CREATED"


def test_05_environmental_observation_threshold_breach(client: TestClient, db_session: Session):
    token = get_token(client, "inspector.dgms@trinetra.gov.in")
    headers = {"Authorization": f"Bearer {token}"}
    mine = db_session.query(Mine).first()

    payload = {
        "mine_id": mine.id,
        "parameter_name": "PM10",
        "observed_value": 25.0, # exceeds threshold
        "unit": "mg/m3",
        "measurement_source": "MANUAL",
        "location_context": "Haul Road Incline Pit Entry",
        "action_taken": "Dispatched water mist cannons."
    }
    resp = client.post("/api/v1/mobile/reporting/environment", json=payload, headers=headers)
    assert resp.status_code == 201, resp.text
    data = resp.json()

    assert data["severity"] in ["HIGH", "CRITICAL"]
    assert data["observation_status"] == "UNDER_REVIEW"

    # Verify ApprovalRequest created for review
    approval = db_session.query(ApprovalRequest).filter(
        ApprovalRequest.resource_type == "ENVIRONMENTAL_OBSERVATION",
        ApprovalRequest.resource_id == str(data["id"])
    ).first()
    assert approval is not None
    assert approval.status == "PENDING"
    assert approval.required_role == "MINE_SAFETY_OFFICER"


def test_06_compliance_observation_creation_and_corrective_action(client: TestClient, db_session: Session):
    token = get_token(client, "inspector.dgms@trinetra.gov.in")
    headers = {"Authorization": f"Bearer {token}"}
    mine = db_session.query(Mine).first()

    payload = {
        "mine_id": mine.id,
        "title": "Insufficient Water Spray at Loading Point",
        "description": "Dust suppression water nozzles clogged at primary hopper feeder.",
        "regulatory_clause": "CMR 2017 - Regulation 131 (Dust Control)",
        "statute": "DGMS_CMR_2017",
        "severity": "HIGH",
        "corrective_action_text": "Clean and test dust nozzles before next shift.",
        "location_context": "Primary Hopper #2"
    }
    resp = client.post("/api/v1/mobile/reporting/compliance", json=payload, headers=headers)
    assert resp.status_code == 201, resp.text
    data = resp.json()

    assert data["violation_code"].startswith("VIO-")
    assert data["regulatory_clause"] == "CMR 2017 - Regulation 131 (Dust Control)"
    assert data["status"] == "CORRECTIVE_ACTION_REQUIRED"

    # Verify linked CorrectiveAction
    ca = db_session.query(CorrectiveAction).filter(CorrectiveAction.violation_id == data["id"]).first()
    assert ca is not None
    assert ca.action_text == "Clean and test dust nozzles before next shift."
    assert ca.status == "PENDING"

    # Verify Audit
    audit = db_session.query(AuditEvent).filter(
        AuditEvent.resource_type == "Violation",
        AuditEvent.resource_id == str(data["id"])
    ).first()
    assert audit is not None
    assert audit.action == "COMPLIANCE_OBSERVATION_CREATED"


def test_07_multi_tenant_mine_isolation(client: TestClient, db_session: Session):
    token = get_token(client, "manager.mine1@trinetra.gov.in")
    headers = {"Authorization": f"Bearer {token}"}
    
    # Manager for Mine 1 tries to submit production for unassigned Mine 2
    payload = {
        "mine_id": 2,
        "shift": "A",
        "material_type": "COAL_RAW",
        "planned_quantity": 400.0,
        "actual_quantity": 400.0
    }
    resp = client.post("/api/v1/mobile/reporting/production", json=payload, headers=headers)
    assert resp.status_code == 403


def test_08_offline_sync_batch_for_production_env_compliance(client: TestClient, db_session: Session):
    token = get_token(client, "inspector.dgms@trinetra.gov.in")
    headers = {"Authorization": f"Bearer {token}"}
    mine = db_session.query(Mine).first()
    now_str = datetime.now(timezone.utc).isoformat()

    batch_payload = {
        "batch_id": "BATCH-MOBILE12-TEST-001",
        "mine_id": mine.id,
        "client_timestamp": now_str,
        "operations": [
            {
                "operation_id": "OP-PROD-SYNC-01",
                "entity_type": "PRODUCTION",
                "operation_type": "CREATE",
                "client_timestamp": now_str,
                "payload": {
                    "shift": "C",
                    "material_type": "COAL_RAW",
                    "planned_quantity": 300.0,
                    "actual_quantity": 290.0,
                    "unit": "TONNES",
                    "notes": "Offline synced night shift production report."
                }
            },
            {
                "operation_id": "OP-ENV-SYNC-01",
                "entity_type": "ENVIRONMENT",
                "operation_type": "CREATE",
                "client_timestamp": now_str,
                "payload": {
                    "parameter_name": "NOISE_DB",
                    "observed_value": 78.5,
                    "unit": "dB",
                    "threshold_limit": 85.0,
                    "location_context": "Compressor Room Substation"
                }
            },
            {
                "operation_id": "OP-COMP-SYNC-01",
                "entity_type": "COMPLIANCE",
                "operation_type": "CREATE",
                "client_timestamp": now_str,
                "payload": {
                    "title": "Haul Road Berm Height Defect",
                    "description": "Berm height below 50% wheel diameter on incline slope.",
                    "regulatory_clause": "CMR 2017 - Regulation 104 (Haul Roads)",
                    "severity": "HIGH",
                    "corrective_action_text": "Grade and reinforce earthen berm."
                }
            }
        ]
    }
    resp = client.post("/api/v1/mobile/sync", json=batch_payload, headers=headers)
    assert resp.status_code == 200, resp.text
    data = resp.json()

    assert data["accepted_count"] == 3
    assert len(data["results"]) == 3
    for res in data["results"]:
        assert res["status"] == "ACCEPTED"
        assert res["server_id"] is not None

    # Verify FieldSyncLog records created
    sync_logs = db_session.query(FieldSyncLog).filter(
        FieldSyncLog.operation_id.in_(["OP-PROD-SYNC-01", "OP-ENV-SYNC-01", "OP-COMP-SYNC-01"])
    ).all()
    assert len(sync_logs) == 3


def test_09_production_negative_quantity_rejection(client: TestClient, db_session: Session):
    token = get_token(client, "manager.mine1@trinetra.gov.in")
    headers = {"Authorization": f"Bearer {token}"}
    mine = db_session.query(Mine).first()

    payload = {
        "mine_id": mine.id,
        "shift": "A",
        "material_type": "COAL_RAW",
        "planned_quantity": -100.0,
        "actual_quantity": 200.0
    }
    resp = client.post("/api/v1/mobile/reporting/production", json=payload, headers=headers)
    assert resp.status_code == 422


def test_10_bug02_production_report_with_evidence_and_sha256_metadata(client: TestClient, db_session: Session):
    """
    BUG-02 Regression Test:
    Verify production report submission with genuine attached evidence,
    SHA-256 fingerprint, and contextual GPS coordinates.
    """
    token = get_token(client, "manager.mine1@trinetra.gov.in")
    headers = {"Authorization": f"Bearer {token}"}
    mine = db_session.query(Mine).first()

    sha256_hash = "a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e"
    payload = {
        "mine_id": mine.id,
        "shift": "A",
        "material_type": "ROM Coal",
        "coal_grade": "G-7 (High GCV)",
        "planned_quantity": 1200.0,
        "actual_quantity": 1180.0,
        "unit": "TONNES",
        "production_source": "MANUAL",
        "notes": "Weighbridge slip attached as photographic evidence.",
        "evidence_file_name": "weighbridge_slip_shift_a.jpg",
        "evidence_url": "blob:http://localhost:5173/evidence-uuid-001",
        "evidence_file_hash": sha256_hash,
        "device_latitude": 23.7957,
        "device_longitude": 86.4304,
        "location_source": "ACTUAL_GPS"
    }
    resp = client.post("/api/v1/mobile/reporting/production", json=payload, headers=headers)
    assert resp.status_code == 201, resp.text
    data = resp.json()

    assert data["status"] == "SUCCESS"
    assert data["report_code"].startswith("PRD-")
    assert data["planned_quantity"] == 1200.0
    assert data["actual_quantity"] == 1180.0
    assert data["report_status"] == "SUBMITTED"

    # Verify immutable audit ledger entry
    audit = db_session.query(AuditEvent).filter(
        AuditEvent.resource_type == "ProductionReport",
        AuditEvent.resource_id == str(data["id"])
    ).first()
    assert audit is not None
    assert audit.action == "PRODUCTION_REPORT_SUBMITTED"


def test_11_production_report_without_evidence_permitted(client: TestClient, db_session: Session):
    """
    Verify production report submission without evidence remains functional
    when evidence is optional under standard operating procedures.
    """
    token = get_token(client, "manager.mine1@trinetra.gov.in")
    headers = {"Authorization": f"Bearer {token}"}
    mine = db_session.query(Mine).first()

    payload = {
        "mine_id": mine.id,
        "shift": "B",
        "material_type": "ROM Coal",
        "coal_grade": "G-9 (Medium GCV)",
        "planned_quantity": 800.0,
        "actual_quantity": 810.0,
        "unit": "TONNES",
        "production_source": "SENSOR_DERIVED",
        "notes": "Direct telemetry belt scale reading without manual photo slip."
    }
    resp = client.post("/api/v1/mobile/reporting/production", json=payload, headers=headers)
    assert resp.status_code == 201, resp.text
    data = resp.json()
    assert data["status"] == "SUCCESS"
    assert data["actual_quantity"] == 810.0


def test_12_evidence_offline_sync_batch_processing(client: TestClient, db_session: Session):
    """
    Verify offline sync queue processing with production report containing evidence metadata.
    """
    token = get_token(client, "manager.mine1@trinetra.gov.in")
    headers = {"Authorization": f"Bearer {token}"}
    mine = db_session.query(Mine).first()
    now_str = datetime.now(timezone.utc).isoformat()

    batch_payload = {
        "batch_id": "BATCH-BUG02-EVIDENCE-001",
        "mine_id": mine.id,
        "client_timestamp": now_str,
        "operations": [
            {
                "operation_id": "OP-PROD-EVID-01",
                "entity_type": "PRODUCTION",
                "operation_type": "CREATE",
                "client_timestamp": now_str,
                "payload": {
                    "shift": "A",
                    "material_type": "ROM Coal",
                    "planned_quantity": 600.0,
                    "actual_quantity": 595.0,
                    "unit": "TONNES",
                    "notes": "Offline synced report with attached evidence hash.",
                    "evidence_file_name": "pit_face_evidence.jpg",
                    "evidence_file_hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
                }
            }
        ]
    }
    resp = client.post("/api/v1/mobile/sync", json=batch_payload, headers=headers)
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["accepted_count"] == 1
    assert data["results"][0]["status"] == "ACCEPTED"

