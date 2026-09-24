import pytest
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.mine import Mine
from app.models.workforce import Worker, Shift, AttendanceRecord, ShiftHandover
from app.models.incident import Incident
from app.models.governance_task import GovernanceTask
from app.models.field_operation import FieldInspection
from app.models.audit import AuditEvent

def get_token(client: TestClient, email: str, password: str = "Trinetra@2026") -> str:
    res = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, f"Login failed for {email}: {res.text}"
    return res.json()["access_token"]


def test_01_mobile_workforce_roster_and_shift_context(client: TestClient, db_session: Session):
    """Verify shift context, summary counters, and privacy-safe workforce roster."""
    token = get_token(client, "inspector.dgms@trinetra.gov.in")
    headers = {"Authorization": f"Bearer {token}"}
    mine = db_session.query(Mine).first()
    assert mine is not None

    response = client.get(f"/api/v1/mobile/workforce?mine_id={mine.id}", headers=headers)
    assert response.status_code == 200, response.text
    data = response.json()

    assert "shift_context" in data
    assert "summary" in data
    assert "workers" in data

    shift_ctx = data["shift_context"]
    assert shift_ctx["has_active_shift"] is True
    assert shift_ctx["shift_code"] in ["A", "B", "C", "GENERAL"]
    assert "start_time" in shift_ctx
    assert "end_time" in shift_ctx

    summary = data["summary"]
    assert "total_assigned" in summary
    assert "present_count" in summary
    assert "absent_count" in summary
    assert summary["total_assigned"] >= 0

    if data["workers"]:
        worker = data["workers"][0]
        assert "worker_code" in worker
        assert "full_name" in worker
        assert "designation" in worker
        assert "trade_category" in worker
        assert "attendance_status" in worker
        assert "verification_mode" in worker


def test_02_manual_attendance_recording_and_audit(client: TestClient, db_session: Session):
    """Verify manual attendance recording preserves actor attribution and logs audit event."""
    token = get_token(client, "inspector.dgms@trinetra.gov.in")
    headers = {"Authorization": f"Bearer {token}"}
    mine = db_session.query(Mine).first()
    assert mine is not None

    worker = db_session.query(Worker).filter(Worker.mine_id == mine.id).first()
    if not worker:
        worker = Worker(
            worker_code="WKR-TEST-001",
            full_name="Rajesh Kumar",
            designation="HEMM Operator",
            trade_category="OPERATOR",
            mine_id=mine.id,
            status="ACTIVE"
        )
        db_session.add(worker)
        db_session.commit()
        db_session.refresh(worker)

    payload = {
        "worker_id": worker.id,
        "mine_id": mine.id,
        "shift_code": "A",
        "status": "PRESENT",
        "notes": "Verified at muster point",
        "device_latitude": 23.7957,
        "device_longitude": 86.4304
    }

    response = client.post("/api/v1/mobile/workforce/attendance", json=payload, headers=headers)
    assert response.status_code == 201, response.text
    data = response.json()

    assert data["status"] == "SUCCESS"
    assert data["worker_id"] == worker.id
    assert data["attendance_status"] == "PRESENT"
    assert data["verification_mode"] == "MANUAL"
    assert data["marked_by"] is not None

    # Verify audit event
    audit = db_session.query(AuditEvent).filter(
        AuditEvent.resource_type == "WORKFORCE_ATTENDANCE",
        AuditEvent.action == "ATTENDANCE_RECORDED"
    ).order_by(AuditEvent.id.desc()).first()
    assert audit is not None
    assert audit.mine_id == mine.id


def test_03_attendance_correction_with_mandatory_reason(client: TestClient, db_session: Session):
    """Verify attendance correction requires mandatory reason and preserves audit history."""
    token = get_token(client, "inspector.dgms@trinetra.gov.in")
    headers = {"Authorization": f"Bearer {token}"}
    mine = db_session.query(Mine).first()
    assert mine is not None

    worker = db_session.query(Worker).filter(Worker.mine_id == mine.id).first()
    assert worker is not None

    # First record attendance
    record = client.post("/api/v1/mobile/workforce/attendance", json={
        "worker_id": worker.id,
        "mine_id": mine.id,
        "shift_code": "A",
        "status": "ABSENT",
        "notes": "Initial roll call"
    }, headers=headers).json()

    # Attempt correction without reason -> Should fail
    fail_res = client.post("/api/v1/mobile/workforce/attendance/correct", json={
        "attendance_id": record["id"],
        "mine_id": mine.id,
        "new_status": "PRESENT",
        "correction_reason": ""
    }, headers=headers)
    assert fail_res.status_code == 422, fail_res.text

    # Valid correction with reason
    correct_res = client.post("/api/v1/mobile/workforce/attendance/correct", json={
        "attendance_id": record["id"],
        "mine_id": mine.id,
        "new_status": "PRESENT",
        "correction_reason": "Late arrival due to transport delay, verified by shift in-charge"
    }, headers=headers)
    assert correct_res.status_code == 200, correct_res.text
    c_data = correct_res.json()
    assert c_data["attendance_status"] == "PRESENT"
    assert "transport delay" in c_data["reason"]


def test_04_privacy_and_data_protection(client: TestClient, db_session: Session):
    """Verify worker payloads omit private Aadhaar, bank numbers, or personal phone numbers."""
    token = get_token(client, "inspector.dgms@trinetra.gov.in")
    headers = {"Authorization": f"Bearer {token}"}
    mine = db_session.query(Mine).first()
    assert mine is not None

    response = client.get(f"/api/v1/mobile/workforce?mine_id={mine.id}", headers=headers)
    assert response.status_code == 200
    data = response.json()

    for worker in data["workers"]:
        assert "aadhaar" not in worker
        assert "bank_account" not in worker
        assert "bank_details" not in worker
        assert "personal_phone" not in worker


def test_05_shift_handover_summary_and_aggregation(client: TestClient, db_session: Session):
    """Verify shift handover summary aggregates open safety incidents, tasks, and inspections."""
    token = get_token(client, "inspector.dgms@trinetra.gov.in")
    headers = {"Authorization": f"Bearer {token}"}
    mine = db_session.query(Mine).first()
    assert mine is not None

    response = client.get(f"/api/v1/mobile/workforce/handover?mine_id={mine.id}", headers=headers)
    assert response.status_code == 200, response.text
    data = response.json()

    assert "current_shift" in data
    assert "next_shift" in data
    assert "open_items_summary" in data
    assert "categories" in data
    assert "recent_handovers" in data

    categories = {c["category"]: c for c in data["categories"]}
    assert "INCIDENTS" in categories
    assert "TASKS" in categories
    assert "INSPECTIONS" in categories
    assert "ALERTS" in categories

    assert categories["INCIDENTS"]["deep_link"] == "/mobile/incidents"
    assert categories["TASKS"]["deep_link"] == "/mobile/tasks"


def test_06_shift_handover_lifecycle_and_acknowledgment(client: TestClient, db_session: Session):
    """Verify shift handover creation, outgoing log, and incoming officer acknowledgment."""
    token = get_token(client, "inspector.dgms@trinetra.gov.in")
    headers = {"Authorization": f"Bearer {token}"}
    mine = db_session.query(Mine).first()
    assert mine is not None

    create_payload = {
        "mine_id": mine.id,
        "from_shift_code": "A",
        "to_shift_code": "B",
        "summary_notes": "All bench operations normal. Face 4 ventilation fan serviced.",
        "safety_summary": "1 minor water seepage noted near Zone B drainage sump."
    }

    create_res = client.post("/api/v1/mobile/workforce/handover", json=create_payload, headers=headers)
    assert create_res.status_code == 201, create_res.text
    ho_data = create_res.json()
    assert ho_data["status"] == "SUCCESS"
    assert "SHO-" in ho_data["handover_code"]
    handover_id = ho_data["id"]

    # Incoming shift acknowledges handover
    ack_res = client.post(f"/api/v1/mobile/workforce/handover/{handover_id}/acknowledge", json={
        "acknowledgment_notes": "Handover acknowledged. Shift B crew briefed on Zone B water seepage."
    }, headers=headers)
    assert ack_res.status_code == 200, ack_res.text
    ack_data = ack_res.json()
    assert ack_data["status"] == "ACKNOWLEDGED"
    assert ack_data["incoming_officer"] is not None


def test_07_mine_isolation_and_rbac_on_workforce(client: TestClient, db_session: Session):
    """Verify user without Mine access cannot view or modify unauthorized mine workforce/handover."""
    manager_token = get_token(client, "manager.mine1@trinetra.gov.in")
    headers = {"Authorization": f"Bearer {manager_token}"}

    # Attempt workforce access on unauthorized mine 999
    res_wf = client.get("/api/v1/mobile/workforce?mine_id=999", headers=headers)
    assert res_wf.status_code in [403, 404]

    # Attempt attendance mark on unauthorized mine 999
    res_att = client.post("/api/v1/mobile/workforce/attendance", json={
        "worker_id": 1,
        "mine_id": 999,
        "shift_code": "A",
        "status": "PRESENT"
    }, headers=headers)
    assert res_att.status_code in [403, 404]

    # Attempt handover summary on unauthorized mine 999
    res_ho = client.get("/api/v1/mobile/workforce/handover?mine_id=999", headers=headers)
    assert res_ho.status_code in [403, 404]


def test_08_offline_sync_batch_attendance_and_handover(client: TestClient, db_session: Session):
    """Verify batch synchronization of offline queued ATTENDANCE and HANDOVER operations."""
    token = get_token(client, "inspector.dgms@trinetra.gov.in")
    headers = {"Authorization": f"Bearer {token}"}
    mine = db_session.query(Mine).first()
    assert mine is not None

    worker = db_session.query(Worker).filter(Worker.mine_id == mine.id).first()
    assert worker is not None

    batch_payload = {
        "mine_id": mine.id,
        "operations": [
            {
                "operation_id": f"sync-att-offline-{datetime.now().timestamp()}",
                "entity_type": "ATTENDANCE",
                "entity_id": str(worker.id),
                "operation_type": "CREATE",
                "payload": {
                    "worker_id": worker.id,
                    "status": "PRESENT",
                    "shift_code": "A",
                    "notes": "Offline field check-in"
                },
                "client_timestamp": datetime.now(timezone.utc).isoformat()
            },
            {
                "operation_id": f"sync-ho-offline-{datetime.now().timestamp()}",
                "entity_type": "HANDOVER",
                "entity_id": "temp-ho-001",
                "operation_type": "CREATE",
                "payload": {
                    "from_shift_code": "A",
                    "to_shift_code": "B",
                    "summary_notes": "Offline drafted shift handover",
                    "safety_summary": "All electrical sub-stations checked"
                },
                "client_timestamp": datetime.now(timezone.utc).isoformat()
            }
        ]
    }

    sync_res = client.post("/api/v1/mobile/sync", json=batch_payload, headers=headers)
    assert sync_res.status_code == 200, sync_res.text
    sync_data = sync_res.json()
    assert sync_data["accepted_count"] == 2
    assert sync_data["rejected_count"] == 0
