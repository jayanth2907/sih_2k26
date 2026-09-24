import pytest
import uuid
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.mine import Mine
from app.models.user import User
from app.models.governance_task import GovernanceTask
from app.models.incident import Incident
from app.models.field_operation import FieldInspection, FieldEvidence, FieldSyncLog
from app.models.audit import AuditEvent


def get_inspector_token(client: TestClient, email: str = "inspector.dgms@trinetra.gov.in", password: str = "Trinetra@2026") -> str:
    res = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, f"Login failed for {email}: {res.text}"
    return res.json()["access_token"]


def get_manager_token(client: TestClient, email: str = "manager.mine1@trinetra.gov.in", password: str = "Trinetra@2026") -> str:
    res = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, f"Login failed for {email}: {res.text}"
    return res.json()["access_token"]


def test_01_idempotent_batch_sync_and_acknowledgment(client: TestClient, db_session: Session):
    """Verify batch synchronization accepts new operations and handles duplicates idempotently."""
    token = get_inspector_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    mine = db_session.query(Mine).first()
    op_id_1 = f"op-insp-{uuid.uuid4().hex[:8]}"
    op_id_2 = f"op-obs-{uuid.uuid4().hex[:8]}"

    batch_payload = {
        "mine_id": mine.id,
        "operations": [
            {
                "operation_id": op_id_1,
                "entity_type": "INSPECTION",
                "entity_id": "temp-insp-001",
                "operation_type": "CREATE",
                "payload": {
                    "inspection_type": "ROUTINE_SAFETY",
                    "severity_assessment": "MEDIUM",
                    "checklist": [{"id": "CHK-01", "title": "Gas Check", "status": "COMPLIANT", "notes": "Gas OK"}],
                    "summary_notes": "Offline test inspection"
                },
                "client_timestamp": datetime.now(timezone.utc).isoformat()
            },
            {
                "operation_id": op_id_2,
                "entity_type": "OBSERVATION",
                "entity_id": "temp-obs-001",
                "operation_type": "CREATE",
                "payload": {
                    "parameter_name": "Methane Concentration",
                    "observed_value": 0.45,
                    "unit": "%",
                    "severity": "LOW"
                },
                "client_timestamp": datetime.now(timezone.utc).isoformat()
            }
        ]
    }

    # 1. First submission -> ACCEPTED
    res1 = client.post("/api/v1/mobile/sync", json=batch_payload, headers=headers)
    assert res1.status_code == 200
    data1 = res1.json()
    assert data1["accepted_count"] == 2
    assert data1["rejected_count"] == 0
    assert len(data1["results"]) == 2
    assert data1["results"][0]["status"] == "ACCEPTED"
    assert data1["results"][0]["server_id"] is not None

    # 2. Second submission (re-try of identical batch) -> ALREADY_PROCESSED
    res2 = client.post("/api/v1/mobile/sync", json=batch_payload, headers=headers)
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["results"][0]["status"] == "ALREADY_PROCESSED"
    assert data2["results"][1]["status"] == "ALREADY_PROCESSED"

    # Verify no duplicate inspections in DB
    sync_logs = db_session.query(FieldSyncLog).filter(
        FieldSyncLog.operation_id.in_([op_id_1, op_id_2])
    ).all()
    assert len(sync_logs) == 2


def test_02_task_and_incident_status_offline_sync(client: TestClient, db_session: Session):
    """Verify offline TASK updates and INCIDENT reporting sync cleanly."""
    token = get_inspector_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    mine = db_session.query(Mine).first()
    inspector_user = db_session.query(User).filter(User.email == "inspector.dgms@trinetra.gov.in").first()

    # Seed a task
    task = GovernanceTask(
        task_code=f"TSK-SYNC-TEST-{uuid.uuid4().hex[:6]}",
        mine_id=mine.id,
        assignee_id=inspector_user.id,
        title="Offline Sync Test Task",
        description="Offline testing description",
        domain="SAFETY",
        priority="HIGH",
        status="OPEN",
        due_at=datetime.now(timezone.utc)
    )
    db_session.add(task)
    db_session.commit()
    db_session.refresh(task)

    op_id_task = f"op-task-{uuid.uuid4().hex[:8]}"
    op_id_inc = f"op-inc-{uuid.uuid4().hex[:8]}"

    batch_payload = {
        "mine_id": mine.id,
        "operations": [
            {
                "operation_id": op_id_task,
                "entity_type": "TASK",
                "entity_id": str(task.id),
                "operation_type": "UPDATE",
                "payload": {
                    "task_id": task.id,
                    "status": "IN_PROGRESS",
                    "comment": "Started task during offline shift"
                },
                "client_timestamp": datetime.now(timezone.utc).isoformat()
            },
            {
                "operation_id": op_id_inc,
                "entity_type": "INCIDENT",
                "entity_id": "temp-inc-101",
                "operation_type": "CREATE",
                "payload": {
                    "title": "Offline Logged Conveyor Belt Spark",
                    "description": "Friction spark detected near tail pulley",
                    "category": "FIRE_HAZARD",
                    "severity": "HIGH",
                    "latitude": 23.795,
                    "longitude": 86.430
                },
                "client_timestamp": datetime.now(timezone.utc).isoformat()
            }
        ]
    }

    res = client.post("/api/v1/mobile/sync", json=batch_payload, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["accepted_count"] == 2

    # Verify task status in database
    db_session.refresh(task)
    assert task.status == "IN_PROGRESS"


def test_03_dependency_aware_evidence_association(client: TestClient, db_session: Session):
    """Verify offline evidence referencing an offline inspection in same batch is associated properly."""
    token = get_inspector_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    mine = db_session.query(Mine).first()
    op_id_insp = f"op-parent-insp-{uuid.uuid4().hex[:8]}"
    op_id_evid = f"op-child-evid-{uuid.uuid4().hex[:8]}"
    temp_insp_id = f"temp-insp-local-{uuid.uuid4().hex[:6]}"

    batch_payload = {
        "mine_id": mine.id,
        "operations": [
            {
                "operation_id": op_id_insp,
                "entity_type": "INSPECTION",
                "entity_id": temp_insp_id,
                "operation_type": "CREATE",
                "payload": {
                    "inspection_type": "ROUTINE_SAFETY",
                    "severity_assessment": "HIGH",
                    "checklist": [{"id": "CHK-02", "title": "Ventilation Check", "status": "NON_COMPLIANT", "notes": "Fan offline"}],
                    "summary_notes": "Ventilation audit"
                },
                "client_timestamp": datetime.now(timezone.utc).isoformat()
            },
            {
                "operation_id": op_id_evid,
                "entity_type": "EVIDENCE",
                "entity_id": "temp-evid-local-01",
                "operation_type": "CREATE",
                "payload": {
                    "inspection_id": temp_insp_id, # References client temp ID of inspection above
                    "evidence_type": "PHOTO",
                    "title": "Damaged Auxiliary Fan",
                    "file_hash_sha256": "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
                    "file_size_bytes": 45000
                },
                "client_timestamp": datetime.now(timezone.utc).isoformat()
            }
        ]
    }

    res = client.post("/api/v1/mobile/sync", json=batch_payload, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["accepted_count"] == 2

    # Check that the evidence was associated with the new inspection's server ID
    created_insp_server_id = data["results"][0]["server_id"]
    created_evid_server_id = data["results"][1]["server_id"]

    evid_record = db_session.query(FieldEvidence).filter(FieldEvidence.id == created_evid_server_id).first()
    assert evid_record is not None
    assert evid_record.inspection_id == created_insp_server_id


def test_04_conflict_and_validation_error_handling(client: TestClient, db_session: Session):
    """Verify invalid task status transition surfaces as CONFLICT / error and logs failure."""
    token = get_inspector_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    mine = db_session.query(Mine).first()
    inspector_user = db_session.query(User).filter(User.email == "inspector.dgms@trinetra.gov.in").first()

    # Seed an OPEN task
    task = GovernanceTask(
        task_code=f"TSK-CONFLICT-TEST-{uuid.uuid4().hex[:6]}",
        mine_id=mine.id,
        assignee_id=inspector_user.id,
        title="Invalid Transition Test Task",
        description="Testing conflict handling",
        domain="SAFETY",
        priority="MEDIUM",
        status="OPEN",
        due_at=datetime.now(timezone.utc)
    )
    db_session.add(task)
    db_session.commit()
    db_session.refresh(task)

    op_id_invalid = f"op-invalid-{uuid.uuid4().hex[:8]}"

    # Try invalid jump from OPEN to CLOSED directly
    batch_payload = {
        "mine_id": mine.id,
        "operations": [
            {
                "operation_id": op_id_invalid,
                "entity_type": "TASK",
                "entity_id": str(task.id),
                "operation_type": "UPDATE",
                "payload": {
                    "task_id": task.id,
                    "status": "CLOSED" # Invalid from OPEN
                },
                "client_timestamp": datetime.now(timezone.utc).isoformat()
            }
        ]
    }

    res = client.post("/api/v1/mobile/sync", json=batch_payload, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["conflict_count"] + data["rejected_count"] == 1
    assert data["results"][0]["status"] in ["CONFLICT", "REJECTED"]
    assert "Invalid task transition" in data["results"][0]["error"]


def test_05_cross_mine_sync_isolation(client: TestClient, db_session: Session):
    """Verify manager scoped to Mine 1 cannot sync operations to unauthorized mine."""
    mgr_token = get_manager_token(client)
    headers = {"Authorization": f"Bearer {mgr_token}"}

    unauthorized_mine = db_session.query(Mine).filter(Mine.code == "REAL-JOG-01").first()
    if unauthorized_mine:
        batch_payload = {
            "mine_id": unauthorized_mine.id,
            "operations": [
                {
                    "operation_id": f"op-unauth-{uuid.uuid4().hex[:8]}",
                    "entity_type": "OBSERVATION",
                    "operation_type": "CREATE",
                    "payload": {"parameter_name": "Test"},
                    "client_timestamp": datetime.now(timezone.utc).isoformat()
                }
            ]
        }
        res = client.post("/api/v1/mobile/sync", json=batch_payload, headers=headers)
        assert res.status_code in [403, 404]


def test_06_sync_status_and_logs_api(client: TestClient, db_session: Session):
    """Verify /sync/status and /sync/logs endpoints return structured metrics."""
    token = get_inspector_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    mine = db_session.query(Mine).first()

    # 1. Check status endpoint
    res_status = client.get(f"/api/v1/mobile/sync/status?mine_id={mine.id}", headers=headers)
    assert res_status.status_code == 200
    status_data = res_status.json()
    assert "metrics" in status_data
    assert "accepted" in status_data["metrics"]
    assert "total_logged" in status_data["metrics"]

    # 2. Check logs endpoint
    res_logs = client.get(f"/api/v1/mobile/sync/logs?mine_id={mine.id}&limit=10", headers=headers)
    assert res_logs.status_code == 200
    logs_data = res_logs.json()
    assert "total" in logs_data
    assert "logs" in logs_data
    assert isinstance(logs_data["logs"], list)
