import pytest
import uuid
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.mine import Mine
from app.models.incident import Incident
from app.models.governance_task import GovernanceTask
from app.models.violation import CorrectiveAction, Violation
from app.models.field_operation import FieldEvidence, FieldSyncLog
from app.models.audit import AuditEvent

def get_token(client: TestClient, email: str = "inspector.dgms@trinetra.gov.in", password: str = "Trinetra@2026") -> str:
    res = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, f"Login failed for {email}: {res.text}"
    return res.json()["access_token"]

def get_manager_token(client: TestClient, email: str = "manager.mine1@trinetra.gov.in", password: str = "Trinetra@2026") -> str:
    res = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, f"Login failed for {email}: {res.text}"
    return res.json()["access_token"]

def get_safety_token(client: TestClient, email: str = "safety.mine1@trinetra.gov.in", password: str = "Trinetra@2026") -> str:
    res = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, f"Login failed for {email}: {res.text}"
    return res.json()["access_token"]

def test_01_mobile_incident_retrieval_and_filtering(client: TestClient, db_session: Session):
    """Verify inspector can retrieve incident list and detail filtered by mine context."""
    token = get_token(client, "inspector.dgms@trinetra.gov.in")
    headers = {"Authorization": f"Bearer {token}"}
    
    # Retrieve mines
    mine = db_session.query(Mine).first()
    assert mine is not None

    res = client.get(f"/api/v1/incidents?mine_id={mine.id}", headers=headers)
    assert res.status_code == 200
    incidents = res.json()
    assert isinstance(incidents, list)

def test_02_mine_isolation_forbidden_access(client: TestClient, db_session: Session):
    """Verify scoped user cannot create or manipulate incidents in unauthorized mine."""
    mgr_token = get_manager_token(client, "manager.mine1@trinetra.gov.in")
    headers = {"Authorization": f"Bearer {mgr_token}"}

    # Find mine that manager is not assigned to
    unauthorized_mine = db_session.query(Mine).filter(Mine.code == "REAL-JOG-01").first()
    if unauthorized_mine:
        res = client.post(
            "/api/v1/incidents",
            json={
                "mine_id": unauthorized_mine.id,
                "title": "Cross-Mine Intrusion Test",
                "description": "Unauthorized incident creation attempt",
                "category": "HAZARD_OBSERVATION",
                "severity": "LOW",
                "sla_hours": 12,
            },
            headers=headers
        )
        assert res.status_code == 403

def test_03_incident_full_lifecycle_state_machine(client: TestClient, db_session: Session):
    """Verify complete lifecycle: OPEN -> TRIAGED -> IN_PROGRESS -> RESOLVED -> VERIFIED -> CLOSED."""
    token = get_safety_token(client, "safety.mine1@trinetra.gov.in")
    headers = {"Authorization": f"Bearer {token}"}
    mine = db_session.query(Mine).first()

    # 1. Create Incident
    create_res = client.post(
        "/api/v1/incidents",
        json={
            "mine_id": mine.id,
            "title": "Unstable Highwall Face Crack",
            "description": "Tension crack observed along bench 3 north wall.",
            "category": "SLOPE_INSTABILITY",
            "severity": "HIGH",
            "sla_hours": 8,
            "x": 220.5,
            "y": 510.2,
            "z": -45.0,
        },
        headers=headers
    )
    assert create_res.status_code == 201
    inc = create_res.json()
    inc_id = inc["id"]
    assert inc["status"] == "OPEN"

    # 2. Transition OPEN -> TRIAGED
    tri_res = client.patch(
        f"/api/v1/incidents/{inc_id}/status",
        json={"status": "TRIAGED", "comment": "Geotechnical safety team triaged risk severity."},
        headers=headers
    )
    assert tri_res.status_code == 200
    assert tri_res.json()["status"] == "TRIAGED"

    # 3. Transition TRIAGED -> IN_PROGRESS
    prog_res = client.patch(
        f"/api/v1/incidents/{inc_id}/status",
        json={"status": "IN_PROGRESS", "comment": "Geotechnical team dispatched with extensometer."},
        headers=headers
    )
    assert prog_res.status_code == 200
    assert prog_res.json()["status"] == "IN_PROGRESS"

    # 4. Transition IN_PROGRESS -> RESOLVED
    res_res = client.patch(
        f"/api/v1/incidents/{inc_id}/status",
        json={"status": "RESOLVED", "resolution_notes": "Berm reinforced and tension crack backfilled with gravel drainage."},
        headers=headers
    )
    assert res_res.status_code == 200
    assert res_res.json()["status"] == "RESOLVED"

    # 5. Transition RESOLVED -> VERIFIED
    ver_res = client.patch(
        f"/api/v1/incidents/{inc_id}/status",
        json={"status": "VERIFIED", "comment": "Safety officer inspection confirmed zero displacement over 4 hours."},
        headers=headers
    )
    assert ver_res.status_code == 200
    assert ver_res.json()["status"] == "VERIFIED"

    # 6. Transition VERIFIED -> CLOSED
    close_res = client.patch(
        f"/api/v1/incidents/{inc_id}/status",
        json={"status": "CLOSED", "comment": "Statutory DGMS incident report archived."},
        headers=headers
    )
    assert close_res.status_code == 200
    assert close_res.json()["status"] == "CLOSED"

def test_04_invalid_incident_state_machine_transition_rejection(client: TestClient, db_session: Session):
    """Verify illegal transitions (e.g. OPEN -> RESOLVED directly) are rejected with 422."""
    token = get_safety_token(client, "safety.mine1@trinetra.gov.in")
    headers = {"Authorization": f"Bearer {token}"}
    mine = db_session.query(Mine).first()

    create_res = client.post(
        "/api/v1/incidents",
        json={
            "mine_id": mine.id,
            "title": "Gas Detector Calibration Alert",
            "description": "CH4 sensor drifted by 0.2%",
            "category": "GAS_ANOMALY",
            "severity": "MEDIUM",
            "sla_hours": 12,
        },
        headers=headers
    )
    assert create_res.status_code == 201
    inc_id = create_res.json()["id"]

    # Attempt illegal jump: OPEN -> RESOLVED (must be TRIAGED/ASSIGNED/CLOSED)
    bad_res = client.patch(
        f"/api/v1/incidents/{inc_id}/status",
        json={"status": "RESOLVED", "comment": "Direct jump from OPEN to RESOLVED"},
        headers=headers
    )
    assert bad_res.status_code == 422

def test_05_field_evidence_attachment_with_sha256_to_incident(client: TestClient, db_session: Session):
    """Verify field evidence with SHA-256 hash and GPS metadata is attached to an incident."""
    token = get_token(client, "inspector.dgms@trinetra.gov.in")
    headers = {"Authorization": f"Bearer {token}"}
    mine = db_session.query(Mine).first()
    inspector = db_session.query(Mine).first() # user

    # Create an incident
    create_res = client.post(
        "/api/v1/incidents",
        json={
            "mine_id": mine.id,
            "title": "Conveyor Belt Idler Overheating",
            "description": "Thermal camera captured 92C on bearing 4.",
            "category": "FIRE_RISK",
            "severity": "HIGH",
            "sla_hours": 4,
        },
        headers=headers
    )
    assert create_res.status_code == 201
    inc_id = create_res.json()["id"]

    ev_code = f"EVID-2026-{uuid.uuid4().hex[:8].upper()}"
    fake_sha256 = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"

    ev_payload = {
        "evidence_code": ev_code,
        "mine_id": mine.id,
        "incident_id": inc_id,
        "evidence_type": "PHOTO",
        "title": "Thermal camera scan of conveyor idler",
        "description": "Captured with handheld FLIR mobile device.",
        "file_hash_sha256": fake_sha256,
        "file_size_bytes": 102400,
        "mime_type": "image/jpeg",
        "location_source": "ACTUAL_GPS",
        "latitude": 23.7554,
        "longitude": 86.4182,
        "gps_accuracy_meters": 4.2,
        "client_capture_timestamp": datetime.now(timezone.utc).isoformat()
    }

    rec_res = client.post("/api/v1/mobile/evidence", json=ev_payload, headers=headers)
    assert rec_res.status_code == 201
    ev_data = rec_res.json()
    assert ev_data["status"] == "SUCCESS"
    ev_id = ev_data["id"]

    # Verify db association
    ev = db_session.query(FieldEvidence).filter(FieldEvidence.id == ev_id).first()
    assert ev is not None
    assert ev.incident_id == inc_id
    assert ev.file_hash_sha256 == fake_sha256
    assert ev.latitude == pytest.approx(23.7554, 0.001)

def test_06_corrective_action_assignment_and_sla_tracking(client: TestClient, db_session: Session):
    """Verify corrective actions / governance remediation tasks can be created for an incident with SLA tracking."""
    token = get_safety_token(client, "safety.mine1@trinetra.gov.in")
    headers = {"Authorization": f"Bearer {token}"}
    mine = db_session.query(Mine).first()

    # Create an incident
    create_res = client.post(
        "/api/v1/incidents",
        json={
            "mine_id": mine.id,
            "title": "Ventilation Door Damaged by Shuttle Car",
            "description": "Air leakage observed between intake and return splits.",
            "category": "VENTILATION_FAILURE",
            "severity": "CRITICAL",
            "sla_hours": 2,
        },
        headers=headers
    )
    assert create_res.status_code == 201
    inc_id = create_res.json()["id"]

    # Create corrective governance task linked to incident
    task = GovernanceTask(
        task_code=f"GT-INC-{inc_id}-{uuid.uuid4().hex[:6].upper()}",
        mine_id=mine.id,
        domain="SAFETY",
        title="Replace ventilation door seal and lock mechanism",
        description="Fit fire-resistant brattice and repair mechanical hinges.",
        source_resource_type="INCIDENT",
        source_resource_id=str(inc_id),
        priority="CRITICAL",
        status="OPEN",
        due_at=datetime.now(timezone.utc) + timedelta(hours=2),
    )
    db_session.add(task)
    db_session.commit()

    # Verify task stored
    stored_task = db_session.query(GovernanceTask).filter(
        GovernanceTask.source_resource_type == "INCIDENT",
        GovernanceTask.source_resource_id == str(inc_id)
    ).first()
    assert stored_task is not None
    assert stored_task.status == "OPEN"
    assert stored_task.due_at is not None

def test_07_offline_sync_batch_with_idempotency(client: TestClient, db_session: Session):
    """Verify offline sync batch handles incident evidence records idempotently."""
    token = get_token(client, "inspector.dgms@trinetra.gov.in")
    headers = {"Authorization": f"Bearer {token}"}
    mine = db_session.query(Mine).first()

    op_uuid = str(uuid.uuid4())
    ev_code = f"EVID-2026-{op_uuid[:8].upper()}"

    batch_payload = {
        "mine_id": mine.id,
        "device_id": "FIELD-TABLET-M05-RESP",
        "app_version": "5.0.0-mobile",
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
                    "title": "Offline Incident Highwall Evidence",
                    "description": "Captured in dead-zone area without connectivity.",
                    "file_hash_sha256": "a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e",
                    "file_size_bytes": 45000,
                    "latitude": 23.75,
                    "longitude": 86.42,
                    "gps_accuracy_meters": 5.0
                }
            }
        ]
    }

    # 1. First sync submission -> ACCEPTED
    res1 = client.post("/api/v1/mobile/sync", json=batch_payload, headers=headers)
    assert res1.status_code == 200
    assert res1.json()["accepted_count"] == 1
    assert res1.json()["results"][0]["status"] == "ACCEPTED"

    # 2. Second sync submission with same operation_id -> ALREADY_PROCESSED (Idempotency)
    res2 = client.post("/api/v1/mobile/sync", json=batch_payload, headers=headers)
    assert res2.status_code == 200
    assert res2.json()["results"][0]["status"] == "ALREADY_PROCESSED"

def test_08_supervisor_verification_and_rejection(client: TestClient, db_session: Session):
    """Verify incident rejection returns status back to IN_PROGRESS with audit reason."""
    token = get_safety_token(client, "safety.mine1@trinetra.gov.in")
    headers = {"Authorization": f"Bearer {token}"}
    mine = db_session.query(Mine).first()

    # Create and progress incident to RESOLVED
    create_res = client.post(
        "/api/v1/incidents",
        json={
            "mine_id": mine.id,
            "title": "Haul Road Drainage Blockage",
            "description": "Culvert clogged causing water accumulation.",
            "category": "HAUL_ROAD_HAZARD",
            "severity": "MEDIUM",
            "sla_hours": 12,
        },
        headers=headers
    )
    inc_id = create_res.json()["id"]

    client.patch(f"/api/v1/incidents/{inc_id}/status", json={"status": "TRIAGED"}, headers=headers)
    client.patch(f"/api/v1/incidents/{inc_id}/status", json={"status": "IN_PROGRESS"}, headers=headers)
    client.patch(f"/api/v1/incidents/{inc_id}/status", json={"status": "RESOLVED", "resolution_notes": "Drain cleared"}, headers=headers)

    # Rejection: Supervisor finds resolution insufficient -> goes back to IN_PROGRESS
    rejection_res = client.patch(
        f"/api/v1/incidents/{inc_id}/status",
        json={
            "status": "IN_PROGRESS",
            "comment": "REJECTED: Standing water still present at chainage 4+200. Re-excavate ditch."
        },
        headers=headers
    )
    assert rejection_res.status_code == 200
    assert rejection_res.json()["status"] == "IN_PROGRESS"

def test_09_audit_trail_recorded_on_incident_lifecycle(client: TestClient, db_session: Session):
    """Verify that every incident status change writes an immutable audit record."""
    token = get_safety_token(client, "safety.mine1@trinetra.gov.in")
    headers = {"Authorization": f"Bearer {token}"}
    mine = db_session.query(Mine).first()

    create_res = client.post(
        "/api/v1/incidents",
        json={
            "mine_id": mine.id,
            "title": "Audited Dust Suppression Spray Test",
            "description": "Water sprays testing at transfer point.",
            "category": "DUST_HAZARD",
            "severity": "LOW",
            "sla_hours": 24,
        },
        headers=headers
    )
    inc_id = create_res.json()["id"]

    client.patch(
        f"/api/v1/incidents/{inc_id}/status",
        json={"status": "TRIAGED", "comment": "Technician reviewing water pressure nozzles."},
        headers=headers
    )

    # Check audit events
    audit_records = db_session.query(AuditEvent).filter(
        AuditEvent.resource_type == "INCIDENT",
        AuditEvent.resource_id == str(inc_id)
    ).all()
    # At least status transition audit events should be recorded
    assert len(audit_records) >= 1
    assert audit_records[0].current_event_hash is not None


def test_10_bug01_incident_lifecycle_transitions_regression(client: TestClient, db_session: Session):
    """
    BUG-01 Regression Test:
    Verify strict sequential lifecycle transitions:
    OPEN -> TRIAGED -> ASSIGNED -> IN_PROGRESS -> RESOLVED -> VERIFIED -> CLOSED
    And ensure illegal transition attempts (e.g. OPEN -> IN_PROGRESS, ASSIGNED -> RESOLVED) are strictly rejected with 422.
    """
    token = get_safety_token(client, "safety.mine1@trinetra.gov.in")
    headers = {"Authorization": f"Bearer {token}"}
    mine = db_session.query(Mine).first()

    # 1. Create Incident -> OPEN
    create_res = client.post(
        "/api/v1/incidents",
        json={
            "mine_id": mine.id,
            "title": "Conveyor Belt Alignment Fault",
            "description": "Optical sensor detected belt drift exceeding 50mm.",
            "category": "EQUIPMENT_BREAKDOWN",
            "severity": "HIGH",
            "sla_hours": 6,
        },
        headers=headers
    )
    assert create_res.status_code == 201
    inc_data = create_res.json()
    inc_id = inc_data["id"]
    assert inc_data["status"] == "OPEN"

    # 2. BUG-01 Condition: Direct OPEN -> IN_PROGRESS MUST BE REJECTED with 422
    illegal_res = client.patch(
        f"/api/v1/incidents/{inc_id}/status",
        json={
            "status": "IN_PROGRESS",
            "comment": "Illegal jump attempting OPEN -> IN_PROGRESS"
        },
        headers=headers
    )
    assert illegal_res.status_code == 422
    assert "Illegal state transition from 'OPEN' to 'IN_PROGRESS'" in illegal_res.json()["detail"]

    # 3. Step 1: OPEN -> TRIAGED (Triage Incident)
    triage_res = client.patch(
        f"/api/v1/incidents/{inc_id}/status",
        json={
            "status": "TRIAGED",
            "comment": "Incident triaged and categorized for field investigation."
        },
        headers=headers
    )
    assert triage_res.status_code == 200
    assert triage_res.json()["status"] == "TRIAGED"

    # 4. Step 2: TRIAGED -> ASSIGNED (Assign Investigator)
    assign_res = client.patch(
        f"/api/v1/incidents/{inc_id}/status",
        json={
            "status": "ASSIGNED",
            "comment": "Incident assigned to field response team for on-site investigation.",
            "assignee_id": 1
        },
        headers=headers
    )
    assert assign_res.status_code == 200
    assert assign_res.json()["status"] == "ASSIGNED"
    assert assign_res.json()["assignee_id"] == 1

    # 5. Invalid transition: ASSIGNED -> RESOLVED (Must be IN_PROGRESS or CLOSED)
    bad_assigned_res = client.patch(
        f"/api/v1/incidents/{inc_id}/status",
        json={
            "status": "RESOLVED",
            "comment": "Illegal skip of IN_PROGRESS"
        },
        headers=headers
    )
    assert bad_assigned_res.status_code == 422

    # 6. Step 3: ASSIGNED -> IN_PROGRESS (Start Response)
    start_res = client.patch(
        f"/api/v1/incidents/{inc_id}/status",
        json={
            "status": "IN_PROGRESS",
            "comment": "Field team initiated rapid response and site investigation."
        },
        headers=headers
    )
    assert start_res.status_code == 200
    assert start_res.json()["status"] == "IN_PROGRESS"

    # 7. Step 4: IN_PROGRESS -> RESOLVED (Resolve Incident)
    resolve_res = client.patch(
        f"/api/v1/incidents/{inc_id}/status",
        json={
            "status": "RESOLVED",
            "comment": "Field mitigation complete and corrective measures applied.",
            "resolution_notes": "Belt realigned, tensioners adjusted, test run satisfactory."
        },
        headers=headers
    )
    assert resolve_res.status_code == 200
    assert resolve_res.json()["status"] == "RESOLVED"
    assert resolve_res.json()["resolution_notes"] is not None

    # 8. Step 5: RESOLVED -> VERIFIED (Supervisor Verification)
    verify_res = client.patch(
        f"/api/v1/incidents/{inc_id}/status",
        json={
            "status": "VERIFIED",
            "comment": "Supervisor verified field resolution and compliance evidence."
        },
        headers=headers
    )
    assert verify_res.status_code == 200
    assert verify_res.json()["status"] == "VERIFIED"

    # 9. Step 6: VERIFIED -> CLOSED (Close Incident)
    close_res = client.patch(
        f"/api/v1/incidents/{inc_id}/status",
        json={
            "status": "CLOSED",
            "comment": "Incident closed into permanent audit ledger."
        },
        headers=headers
    )
    assert close_res.status_code == 200
    assert close_res.json()["status"] == "CLOSED"

    # 10. Terminal state: CLOSED cannot transition further
    terminal_res = client.patch(
        f"/api/v1/incidents/{inc_id}/status",
        json={
            "status": "OPEN",
            "comment": "Illegal transition from terminal CLOSED state"
        },
        headers=headers
    )
    assert terminal_res.status_code == 422

