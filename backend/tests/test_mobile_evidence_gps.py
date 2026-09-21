import pytest
import uuid
import hashlib
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.mine import Mine
from app.models.spatial import MineLevel, MineZone
from app.models.user import User
from app.models.field_operation import FieldInspection, FieldEvidence, FieldSyncLog
from app.models.environmental import EnvironmentalObservation
from app.models.audit import AuditEvent

def get_token(client: TestClient, email: str = "inspector.dgms@trinetra.gov.in", password: str = "Trinetra@2026") -> str:
    res = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, f"Login failed for {email}: {res.text}"
    return res.json()["access_token"]

def get_manager_token(client: TestClient, email: str = "manager.mine1@trinetra.gov.in", password: str = "Trinetra@2026") -> str:
    res = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, f"Login failed for {email}: {res.text}"
    return res.json()["access_token"]

def test_01_authorized_evidence_recording(client: TestClient, db_session: Session):
    """Verify authorized inspector can record photo evidence with SHA-256 hash and GPS coordinates."""
    token = get_token(client, "inspector.dgms@trinetra.gov.in")
    mine = db_session.query(Mine).filter(Mine.code == "MINE-BDS-04").first()
    
    test_bytes = b"TRINETRA_FIELD_EVIDENCE_TEST_PHOTO_BYTES_2026"
    test_hash = hashlib.sha256(test_bytes).hexdigest()
    
    ev_payload = {
        "evidence_code": f"EVID-2026-{uuid.uuid4().hex[:8].upper()}",
        "mine_id": mine.id,
        "evidence_type": "PHOTO",
        "title": "East Longwall Return Airway Ventilation Duct Photo",
        "description": "Visual integrity inspection of flexible duct joint.",
        "file_hash_sha256": test_hash,
        "file_size_bytes": len(test_bytes),
        "mime_type": "image/jpeg",
        "location_source": "ACTUAL_GPS",
        "latitude": 23.795812,
        "longitude": 86.430541,
        "gps_accuracy_meters": 4.5,
        "client_capture_timestamp": datetime.now(timezone.utc).isoformat()
    }
    
    res = client.post("/api/v1/mobile/evidence", json=ev_payload, headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 201
    data = res.json()
    assert data["status"] == "SUCCESS"
    assert data["evidence_code"] == ev_payload["evidence_code"]
    evidence_id = data["id"]
    
    # Verify retrieval
    get_res = client.get(f"/api/v1/mobile/evidence/{evidence_id}", headers={"Authorization": f"Bearer {token}"})
    assert get_res.status_code == 200
    ev_detail = get_res.json()
    assert ev_detail["file_hash_sha256"] == test_hash
    assert ev_detail["location_source"] == "ACTUAL_GPS"
    assert ev_detail["verification_status"] == "PENDING"
    assert ev_detail["latitude"] == 23.795812

def test_02_unauthorized_evidence_recording_rejected(client: TestClient):
    """Verify unauthenticated requests cannot record evidence."""
    res = client.post("/api/v1/mobile/evidence", json={"title": "Unauthorized"})
    assert res.status_code in [401, 403]

def test_03_cross_mine_evidence_rejection(client: TestClient, db_session: Session):
    """Verify user cannot record evidence for an unauthorized/non-existent mine."""
    token = get_token(client, "inspector.dgms@trinetra.gov.in")
    
    ev_payload = {
        "evidence_code": f"EVID-2026-{uuid.uuid4().hex[:8].upper()}",
        "mine_id": 99999,
        "evidence_type": "PHOTO",
        "title": "Cross Mine Attack",
        "file_hash_sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        "client_capture_timestamp": datetime.now(timezone.utc).isoformat()
    }
    res = client.post("/api/v1/mobile/evidence", json=ev_payload, headers={"Authorization": f"Bearer {token}"})
    assert res.status_code in [403, 404]

def test_04_invalid_sha256_format_rejected(client: TestClient, db_session: Session):
    """Verify non-hexadecimal or invalid length SHA-256 strings are rejected."""
    token = get_token(client, "inspector.dgms@trinetra.gov.in")
    mine = db_session.query(Mine).filter(Mine.code == "MINE-BDS-04").first()
    
    # Invalid length (10 chars instead of 64)
    ev_payload = {
        "evidence_code": f"EVID-2026-{uuid.uuid4().hex[:8].upper()}",
        "mine_id": mine.id,
        "evidence_type": "PHOTO",
        "title": "Bad Hash Photo",
        "file_hash_sha256": "INVALIDHASH123",
        "client_capture_timestamp": datetime.now(timezone.utc).isoformat()
    }
    res = client.post("/api/v1/mobile/evidence", json=ev_payload, headers={"Authorization": f"Bearer {token}"})
    assert res.status_code in [400, 422]

def test_05_oversized_evidence_rejected(client: TestClient, db_session: Session):
    """Verify files larger than 15MB are rejected by server policy."""
    token = get_token(client, "inspector.dgms@trinetra.gov.in")
    mine = db_session.query(Mine).filter(Mine.code == "MINE-BDS-04").first()
    
    ev_payload = {
        "evidence_code": f"EVID-2026-{uuid.uuid4().hex[:8].upper()}",
        "mine_id": mine.id,
        "evidence_type": "DOCUMENT",
        "title": "Giant File",
        "file_hash_sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        "file_size_bytes": 25 * 1024 * 1024, # 25MB > 15MB limit
        "client_capture_timestamp": datetime.now(timezone.utc).isoformat()
    }
    res = client.post("/api/v1/mobile/evidence", json=ev_payload, headers={"Authorization": f"Bearer {token}"})
    assert res.status_code in [400, 422]

def test_06_evidence_linked_to_observation_and_inspection(client: TestClient, db_session: Session):
    """Verify evidence can be linked to both an inspection and an environmental observation."""
    token = get_token(client, "inspector.dgms@trinetra.gov.in")
    mine = db_session.query(Mine).filter(Mine.code == "MINE-BDS-04").first()
    
    # Create observation
    obs = EnvironmentalObservation(
        mine_id=mine.id,
        parameter_name="Methane Return Airway Drift",
        observed_value=0.82,
        threshold_limit=0.75,
        unit="%",
        severity="HIGH",
        status="OPEN",
        detected_at=datetime.now(timezone.utc)
    )
    db_session.add(obs)
    db_session.commit()
    db_session.refresh(obs)
    
    # Get an existing inspection
    insp = db_session.query(FieldInspection).filter(FieldInspection.mine_id == mine.id).first()
    
    ev_code = f"EVID-2026-{uuid.uuid4().hex[:8].upper()}"
    ev_payload = {
        "evidence_code": ev_code,
        "mine_id": mine.id,
        "inspection_id": insp.id,
        "observation_id": obs.id,
        "evidence_type": "PHOTO",
        "title": "Methane Spot Reading Photo",
        "file_hash_sha256": hashlib.sha256(b"METHANE_SPOT_PHOTO").hexdigest(),
        "file_size_bytes": 1024,
        "client_capture_timestamp": datetime.now(timezone.utc).isoformat()
    }
    
    res = client.post("/api/v1/mobile/evidence", json=ev_payload, headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 201
    ev_id = res.json()["id"]
    
    # Check detail
    detail = client.get(f"/api/v1/mobile/evidence/{ev_id}", headers={"Authorization": f"Bearer {token}"}).json()
    assert detail["inspection_id"] == insp.id
    assert detail["observation_id"] == obs.id

def test_07_evidence_supervisory_verification(client: TestClient, db_session: Session):
    """Verify a Mine Manager / Safety Officer can verify field evidence and log an audit event."""
    insp_token = get_token(client, "inspector.dgms@trinetra.gov.in")
    mgr_token = get_manager_token(client, "manager.mine1@trinetra.gov.in")
    mine = db_session.query(Mine).filter(Mine.code == "MINE-BDS-04").first()
    
    # Inspector creates evidence
    ev_code = f"EVID-2026-{uuid.uuid4().hex[:8].upper()}"
    ev_payload = {
        "evidence_code": ev_code,
        "mine_id": mine.id,
        "evidence_type": "PHOTO",
        "title": "Roof Bolt Torque Check Photo",
        "file_hash_sha256": hashlib.sha256(b"TORQUE_CHECK").hexdigest(),
        "client_capture_timestamp": datetime.now(timezone.utc).isoformat()
    }
    rec_res = client.post("/api/v1/mobile/evidence", json=ev_payload, headers={"Authorization": f"Bearer {insp_token}"})
    assert rec_res.status_code == 201
    ev_id = rec_res.json()["id"]
    
    # Manager verifies evidence
    verify_res = client.post(
        f"/api/v1/mobile/evidence/{ev_id}/verify?notes=Torque+gauge+reading+verified+compliant",
        headers={"Authorization": f"Bearer {mgr_token}"}
    )
    assert verify_res.status_code == 200
    assert verify_res.json()["verification_status"] == "VERIFIED"
    
    # Verify Audit Event exists
    audit_evt = db_session.query(AuditEvent).filter(
        AuditEvent.resource_type == "FieldEvidence",
        AuditEvent.resource_id == ev_code,
        AuditEvent.action == "FIELD_EVIDENCE_VERIFIED"
    ).first()
    assert audit_evt is not None
    assert "VerificationStatus:VERIFIED" in audit_evt.after_state

def test_08_evidence_supervisory_rejection(client: TestClient, db_session: Session):
    """Verify supervisor can reject blurry / invalid evidence with logged reason."""
    insp_token = get_token(client, "inspector.dgms@trinetra.gov.in")
    mgr_token = get_manager_token(client, "manager.mine1@trinetra.gov.in")
    mine = db_session.query(Mine).filter(Mine.code == "MINE-BDS-04").first()
    
    ev_code = f"EVID-2026-{uuid.uuid4().hex[:8].upper()}"
    ev_payload = {
        "evidence_code": ev_code,
        "mine_id": mine.id,
        "evidence_type": "PHOTO",
        "title": "Blurry Photo Test",
        "file_hash_sha256": hashlib.sha256(b"BLURRY_PHOTO").hexdigest(),
        "client_capture_timestamp": datetime.now(timezone.utc).isoformat()
    }
    rec_res = client.post("/api/v1/mobile/evidence", json=ev_payload, headers={"Authorization": f"Bearer {insp_token}"})
    ev_id = rec_res.json()["id"]
    
    # Manager rejects evidence
    rej_res = client.post(
        f"/api/v1/mobile/evidence/{ev_id}/reject?reason=Image+is+underexposed+and+unreadable",
        headers={"Authorization": f"Bearer {mgr_token}"}
    )
    assert rej_res.status_code == 200
    assert rej_res.json()["verification_status"] == "REJECTED"

def test_09_separation_of_duties_inspector_cannot_self_verify(client: TestClient, db_session: Session):
    """Verify an inspector without supervisory role cannot verify their own evidence."""
    insp_token = get_token(client, "inspector.dgms@trinetra.gov.in")
    mine = db_session.query(Mine).filter(Mine.code == "MINE-BDS-04").first()
    
    ev_code = f"EVID-2026-{uuid.uuid4().hex[:8].upper()}"
    ev_payload = {
        "evidence_code": ev_code,
        "mine_id": mine.id,
        "evidence_type": "PHOTO",
        "title": "Self Verification Attempt",
        "file_hash_sha256": hashlib.sha256(b"SELF_VERIFY").hexdigest(),
        "client_capture_timestamp": datetime.now(timezone.utc).isoformat()
    }
    rec_res = client.post("/api/v1/mobile/evidence", json=ev_payload, headers={"Authorization": f"Bearer {insp_token}"})
    ev_id = rec_res.json()["id"]
    
    # Inspector attempts to verify own evidence
    bad_verify = client.post(f"/api/v1/mobile/evidence/{ev_id}/verify", headers={"Authorization": f"Bearer {insp_token}"})
    assert bad_verify.status_code in [400, 403, 422]

def test_10_offline_evidence_batch_sync_and_idempotency(client: TestClient, db_session: Session):
    """Verify offline evidence item syncs and prevents duplicate insertion upon retry."""
    token = get_token(client, "inspector.dgms@trinetra.gov.in")
    mine = db_session.query(Mine).filter(Mine.code == "MINE-BDS-04").first()
    
    op_uuid = str(uuid.uuid4())
    ev_code = f"EVID-2026-{op_uuid[:8].upper()}"
    
    batch_payload = {
        "mine_id": mine.id,
        "device_id": "FIELD-TABLET-MOBILE-03",
        "app_version": "3.0.0-mobile",
        "operations": [
            {
                "operation_id": op_uuid,
                "entity_type": "EVIDENCE",
                "entity_id": ev_code,
                "operation_type": "CREATE",
                "client_timestamp": datetime.now(timezone.utc).isoformat(),
                "payload": {
                    "evidence_code": ev_code,
                    "evidence_type": "PHOTO",
                    "title": "Offline Field Dust Monitor Photo",
                    "description": "Captured while underground without WiFi.",
                    "file_hash_sha256": hashlib.sha256(b"OFFLINE_DUST_EVIDENCE").hexdigest(),
                    "file_size_bytes": 2048,
                    "latitude": 23.7959,
                    "longitude": 86.4306,
                    "gps_accuracy_meters": 5.0
                }
            }
        ]
    }
    
    # First sync -> ACCEPTED
    res1 = client.post("/api/v1/mobile/sync", json=batch_payload, headers={"Authorization": f"Bearer {token}"})
    assert res1.status_code == 200
    assert res1.json()["accepted_count"] == 1
    assert res1.json()["results"][0]["status"] == "ACCEPTED"
    
    # Second sync with same operation_id -> ALREADY_PROCESSED (Idempotency)
    res2 = client.post("/api/v1/mobile/sync", json=batch_payload, headers={"Authorization": f"Bearer {token}"})
    assert res2.status_code == 200
    assert res2.json()["results"][0]["status"] == "ALREADY_PROCESSED"
