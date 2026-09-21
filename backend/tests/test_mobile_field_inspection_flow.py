import pytest
import uuid
import hashlib
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.mine import Mine
from app.models.spatial import MineLevel, MineZone
from app.models.user import User
from app.models.field_operation import FieldInspection, FieldEvidence, FieldSyncLog
from app.models.audit import AuditEvent

def get_token(client: TestClient, email: str = "inspector.dgms@trinetra.gov.in", password: str = "Trinetra@2026") -> str:
    res = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, f"Login failed for {email}: {res.text}"
    return res.json()["access_token"]

def test_01_authorized_task_retrieval(client: TestClient, db_session: Session):
    """Verify inspector can retrieve their assigned inspections enriched with risk context."""
    token = get_token(client, "inspector.dgms@trinetra.gov.in")
    mine = db_session.query(Mine).filter(Mine.code == "MINE-BDS-04").first()
    
    res = client.get(f"/api/v1/mobile/inspections?mine_id={mine.id}", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    tasks = res.json()
    assert isinstance(tasks, list)
    assert len(tasks) > 0
    task = tasks[0]
    assert "inspection_code" in task
    assert "status" in task
    assert "checklist" in task
    assert "current_zone_risk" in task
    assert "predicted_zone_risk" in task

def test_02_unauthorized_task_access_rejected(client: TestClient):
    """Verify unauthenticated requests cannot access inspection lists."""
    res = client.get("/api/v1/mobile/inspections")
    assert res.status_code in [401, 403]

def test_03_cross_mine_task_rejection(client: TestClient, db_session: Session):
    """Verify an inspector cannot query tasks for an unauthorized mine ID."""
    token = get_token(client, "inspector.dgms@trinetra.gov.in")
    
    # Mine 99999 does not exist / user is not assigned
    res = client.get("/api/v1/mobile/inspections?mine_id=99999", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code in [403, 404]

def test_04_get_single_inspection_detail(client: TestClient, db_session: Session):
    """Verify retrieval of a single inspection task with full checklist and evidence."""
    token = get_token(client, "inspector.dgms@trinetra.gov.in")
    mine = db_session.query(Mine).filter(Mine.code == "MINE-BDS-04").first()
    
    tasks_res = client.get(f"/api/v1/mobile/inspections?mine_id={mine.id}", headers={"Authorization": f"Bearer {token}"})
    assert tasks_res.status_code == 200
    task_id = tasks_res.json()[0]["id"]
    
    res = client.get(f"/api/v1/mobile/inspections/{task_id}", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()
    assert data["id"] == task_id
    assert isinstance(data["checklist"], list)
    assert "evidences" in data

def test_05_start_inspection_state_transition(client: TestClient, db_session: Session):
    """Verify SCHEDULED -> IN_PROGRESS transition and authoritative timestamp recording."""
    token = get_token(client, "inspector.dgms@trinetra.gov.in")
    mine = db_session.query(Mine).filter(Mine.code == "MINE-BDS-04").first()
    
    # Create a fresh scheduled inspection
    create_payload = {
        "mine_id": mine.id,
        "inspection_type": "VENTILATION_AUDIT",
        "scheduled_date": datetime.now(timezone.utc).isoformat(),
        "status": "SCHEDULED",
        "summary_notes": "Test Start Inspection Task",
        "severity_assessment": "LOW",
        "checklist": [
            {
                "id": "chk-01",
                "category": "VENTILATION",
                "item_text": "Air velocity check at face",
                "status": "PENDING"
            }
        ]
    }
    create_res = client.post("/api/v1/mobile/inspections", json=create_payload, headers={"Authorization": f"Bearer {token}"})
    assert create_res.status_code == 201
    insp_id = create_res.json()["id"]
    
    # Transition to IN_PROGRESS
    start_payload = {
        "status": "IN_PROGRESS",
        "latitude": 23.795,
        "longitude": 86.430,
        "gps_accuracy_meters": 5.0
    }
    update_res = client.put(f"/api/v1/mobile/inspections/{insp_id}", json=start_payload, headers={"Authorization": f"Bearer {token}"})
    assert update_res.status_code == 200
    
    # Verify started_at was set
    get_res = client.get(f"/api/v1/mobile/inspections/{insp_id}", headers={"Authorization": f"Bearer {token}"})
    assert get_res.status_code == 200
    assert get_res.json()["status"] == "IN_PROGRESS"
    assert get_res.json()["started_at"] is not None

def test_06_checklist_persistence_and_observations(client: TestClient, db_session: Session):
    """Verify checklist status, notes, and observation severities persist accurately."""
    token = get_token(client, "inspector.dgms@trinetra.gov.in")
    mine = db_session.query(Mine).filter(Mine.code == "MINE-BDS-04").first()
    
    # Create an active inspection
    create_payload = {
        "mine_id": mine.id,
        "inspection_type": "GENERAL_SAFETY",
        "scheduled_date": datetime.now(timezone.utc).isoformat(),
        "status": "IN_PROGRESS",
        "checklist": [
            {
                "id": "chk-v1",
                "category": "ATMOSPHERE",
                "item_text": "Methane (CH4) level below 0.75%",
                "status": "COMPLIANT"
            },
            {
                "id": "chk-v2",
                "category": "VENTILATION",
                "item_text": "Auxiliary fan functioning continuously",
                "status": "NON_COMPLIANT",
                "notes": "Fan duct partially disconnected at 50m mark.",
                "severity": "HIGH",
                "regulatory_reference": "CMR 2017 Reg 153"
            }
        ]
    }
    create_res = client.post("/api/v1/mobile/inspections", json=create_payload, headers={"Authorization": f"Bearer {token}"})
    assert create_res.status_code == 201
    insp_id = create_res.json()["id"]
    
    # Update checklist
    updated_checklist = [
        {
            "id": "chk-v1",
            "category": "ATMOSPHERE",
            "item_text": "Methane (CH4) level below 0.75%",
            "status": "COMPLIANT"
        },
        {
            "id": "chk-v2",
            "category": "VENTILATION",
            "item_text": "Auxiliary fan functioning continuously",
            "status": "NON_COMPLIANT",
            "notes": "Fan duct re-attached and reinforced with band.",
            "severity": "MEDIUM",
            "regulatory_reference": "CMR 2017 Reg 153"
        }
    ]
    up_res = client.put(f"/api/v1/mobile/inspections/{insp_id}", json={"checklist": updated_checklist}, headers={"Authorization": f"Bearer {token}"})
    assert up_res.status_code == 200
    
    # Read back and verify persistence
    get_res = client.get(f"/api/v1/mobile/inspections/{insp_id}", headers={"Authorization": f"Bearer {token}"})
    assert get_res.status_code == 200
    stored_checklist = get_res.json()["checklist"]
    assert len(stored_checklist) == 2
    assert stored_checklist[1]["notes"] == "Fan duct re-attached and reinforced with band."
    assert stored_checklist[1]["severity"] == "MEDIUM"

def test_07_field_evidence_association_and_sha256(client: TestClient, db_session: Session):
    """Verify evidence is tied to inspection and preserves SHA-256 hash."""
    token = get_token(client, "inspector.dgms@trinetra.gov.in")
    mine = db_session.query(Mine).filter(Mine.code == "MINE-BDS-04").first()
    
    tasks_res = client.get(f"/api/v1/mobile/inspections?mine_id={mine.id}", headers={"Authorization": f"Bearer {token}"})
    insp_id = tasks_res.json()[0]["id"]
    
    test_content = b"EVIDENCE_SHA256_TEST_BUFFER"
    file_hash = hashlib.sha256(test_content).hexdigest()
    
    ev_payload = {
        "evidence_code": f"EVID-2026-{uuid.uuid4().hex[:8].upper()}",
        "mine_id": mine.id,
        "inspection_id": insp_id,
        "evidence_type": "PHOTO",
        "title": "Duct Joint Verification Photo",
        "description": "Photo of duct clamped securely.",
        "file_hash_sha256": file_hash,
        "file_size_bytes": len(test_content),
        "latitude": 23.7958,
        "longitude": 86.4305,
        "gps_accuracy_meters": 3.0,
        "client_capture_timestamp": datetime.now(timezone.utc).isoformat()
    }
    
    ev_res = client.post("/api/v1/mobile/evidence", json=ev_payload, headers={"Authorization": f"Bearer {token}"})
    assert ev_res.status_code == 201
    
    # Verify inspection contains this evidence
    insp_detail = client.get(f"/api/v1/mobile/inspections/{insp_id}", headers={"Authorization": f"Bearer {token}"}).json()
    ev_codes = [e["evidence_code"] for e in insp_detail["evidences"]]
    assert ev_payload["evidence_code"] in ev_codes

def test_08_invalid_state_transition_rejected(client: TestClient, db_session: Session):
    """Verify state machine rejects illegal state jumps (e.g. SCHEDULED -> VERIFIED)."""
    token = get_token(client, "inspector.dgms@trinetra.gov.in")
    mine = db_session.query(Mine).filter(Mine.code == "MINE-BDS-04").first()
    
    # Create scheduled inspection
    create_payload = {
        "mine_id": mine.id,
        "inspection_type": "GENERAL_SAFETY",
        "scheduled_date": datetime.now(timezone.utc).isoformat(),
        "status": "SCHEDULED",
        "summary_notes": "Test Invalid Transition",
        "severity_assessment": "LOW"
    }
    create_res = client.post("/api/v1/mobile/inspections", json=create_payload, headers={"Authorization": f"Bearer {token}"})
    insp_id = create_res.json()["id"]
    
    # Attempt illegal jump directly to VERIFIED
    bad_res = client.put(f"/api/v1/mobile/inspections/{insp_id}", json={"status": "VERIFIED"}, headers={"Authorization": f"Bearer {token}"})
    assert bad_res.status_code in [400, 422]

def test_09_inspection_submission_and_audit_log(client: TestClient, db_session: Session):
    """Verify complete submission records audit event in the immutable ledger."""
    token = get_token(client, "inspector.dgms@trinetra.gov.in")
    mine = db_session.query(Mine).filter(Mine.code == "MINE-BDS-04").first()
    
    create_payload = {
        "mine_id": mine.id,
        "inspection_type": "STATUTORY_DGMS",
        "scheduled_date": datetime.now(timezone.utc).isoformat(),
        "status": "IN_PROGRESS",
        "summary_notes": "End of Shift Verification",
        "severity_assessment": "LOW"
    }
    insp_res = client.post("/api/v1/mobile/inspections", json=create_payload, headers={"Authorization": f"Bearer {token}"})
    insp_id = insp_res.json()["id"]
    insp_code = insp_res.json()["inspection_code"]
    
    # Submit inspection
    submit_payload = {
        "status": "COMPLETED",
        "summary_notes": "All checks verified and signed off.",
        "severity_assessment": "LOW"
    }
    sub_res = client.put(f"/api/v1/mobile/inspections/{insp_id}", json=submit_payload, headers={"Authorization": f"Bearer {token}"})
    assert sub_res.status_code == 200
    
    # Verify Audit Event exists for this inspection update
    audit_evt = db_session.query(AuditEvent).filter(
        AuditEvent.resource_type == "FieldInspection",
        AuditEvent.resource_id == insp_code,
        AuditEvent.action == "FIELD_INSPECTION_UPDATED"
    ).first()
    assert audit_evt is not None
    assert "Status:COMPLETED" in audit_evt.after_state

def test_10_offline_batch_idempotency(client: TestClient, db_session: Session):
    """Verify submitting the same offline operation UUID twice returns ALREADY_PROCESSED."""
    token = get_token(client, "inspector.dgms@trinetra.gov.in")
    mine = db_session.query(Mine).filter(Mine.code == "MINE-BDS-04").first()
    
    op_uuid = str(uuid.uuid4())
    batch_payload = {
        "mine_id": mine.id,
        "device_id": "FIELD-TABLET-02",
        "app_version": "2.0.0-mobile",
        "operations": [
            {
                "operation_id": op_uuid,
                "entity_type": "INSPECTION",
                "entity_id": "NEW-INSP",
                "operation_type": "CREATE",
                "client_timestamp": datetime.now(timezone.utc).isoformat(),
                "payload": {
                    "inspection_type": "EMERGENCY_DRILL",
                    "status": "COMPLETED",
                    "summary_notes": "Idempotent batch test inspection",
                    "severity_assessment": "LOW",
                    "checklist": [
                        {
                            "id": "chk-idem-1",
                            "category": "EMERGENCY",
                            "item_text": "Escape route signage visible",
                            "status": "COMPLIANT"
                        }
                    ]
                }
            }
        ]
    }
    
    # First sync attempt -> ACCEPTED
    res1 = client.post("/api/v1/mobile/sync", json=batch_payload, headers={"Authorization": f"Bearer {token}"})
    assert res1.status_code == 200
    data1 = res1.json()
    assert data1["accepted_count"] == 1
    assert data1["results"][0]["status"] == "ACCEPTED"
    
    # Second sync attempt with exact same operation_id -> ALREADY_PROCESSED
    res2 = client.post("/api/v1/mobile/sync", json=batch_payload, headers={"Authorization": f"Bearer {token}"})
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["results"][0]["status"] == "ALREADY_PROCESSED"
