import pytest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.models.user import User
from app.models.mine import Mine
from app.models.grievance import Grievance
from app.models.governance_task import GovernanceTask
from app.models.incident import Incident
from app.models.approval import ApprovalRequest
from app.models.notification import Notification
from app.models.audit import AuditEvent

client = TestClient(app)

def get_token(client: TestClient, email: str = "safety.mine1@trinetra.gov.in", password: str = "Trinetra@2026") -> str:
    res = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, f"Login failed for {email}: {res.text}"
    return res.json()["access_token"]


def test_01_grievance_summary_retrieval(db_session: Session):
    token = get_token(client, "safety.mine1@trinetra.gov.in")
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/v1/mobile/grievances/summary?mine_id=1", headers=headers)
    assert res.status_code == 200, res.text
    data = res.json()
    assert "mine_id" in data
    assert data["mine_id"] == 1
    assert "total_grievances" in data
    assert "open_grievances" in data
    assert "grievances" in data
    assert isinstance(data["grievances"], list)


def test_02_grievance_creation_with_location_and_evidence(db_session: Session):
    token = get_token(client, "safety.mine1@trinetra.gov.in")
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "mine_id": 1,
        "category": "WORKER_WELFARE",
        "title": "Potable Water Chiller Inoperative at Pit Head 3",
        "description": "Workers report water dispenser compressor failed during summer shift. Water temperature exceeding 35C.",
        "priority": "HIGH",
        "anonymous": False,
        "location_context": "Pit Head 3 Rest Shelter",
        "latitude": 23.795712,
        "longitude": 86.430415,
        "location_source": "ACTUAL_GPS",
        "evidence_file_name": "chiller_broken_inspection.jpg",
        "evidence_file_hash": "a1b2c3d4e5f678901234567890abcdef1234567890abcdef1234567890abcdef",
        "source_channel": "MOBILE_FIELD"
    }

    res = client.post("/api/v1/mobile/grievances", json=payload, headers=headers)
    assert res.status_code == 201, res.text
    data = res.json()
    assert data["status"] == "SUCCESS"
    assert "grievance_id" in data
    assert "grievance_code" in data
    grv_id = data["grievance_id"]

    # Verify detail
    detail_res = client.get(f"/api/v1/mobile/grievances/{grv_id}", headers=headers)
    assert detail_res.status_code == 200, detail_res.text
    detail = detail_res.json()
    assert detail["title"] == payload["title"]
    assert detail["category"] == "WORKER_WELFARE"
    assert detail["priority"] == "HIGH"
    assert detail["status"] == "SUBMITTED"
    assert detail["sla_hours"] == 48
    assert detail["latitude"] == 23.795712
    assert detail["evidence_file_hash"] == payload["evidence_file_hash"]


def test_03_grievance_acknowledgement_and_assignment(db_session: Session):
    manager_token = get_token(client, "manager.mine1@trinetra.gov.in")
    m_headers = {"Authorization": f"Bearer {manager_token}"}

    # 1. Create a grievance
    create_payload = {
        "mine_id": 1,
        "category": "HEALTH",
        "title": "Dust Infiltration at Underground Rest Shelter",
        "description": "Air curtain inoperative at Level 3 rest room.",
        "priority": "MEDIUM",
        "anonymous": True
    }
    c_res = client.post("/api/v1/mobile/grievances", json=create_payload, headers=m_headers)
    assert c_res.status_code == 201
    grv_id = c_res.json()["grievance_id"]

    # 2. Acknowledge grievance
    ack_res = client.post(
        f"/api/v1/mobile/grievances/{grv_id}/acknowledge",
        json={"notes": "Grievance received and registered by Mine Nodal Officer."},
        headers=m_headers
    )
    assert ack_res.status_code == 200, ack_res.text
    assert ack_res.json()["grievance_status"] == "ACKNOWLEDGED"

    # 3. Assign grievance to safety officer
    safety_user = db_session.query(User).filter(User.email == "safety.mine1@trinetra.gov.in").first()
    assert safety_user is not None

    assign_res = client.post(
        f"/api/v1/mobile/grievances/{grv_id}/assign",
        json={
            "assigned_to_id": safety_user.id,
            "priority": "HIGH",
            "notes": "Please verify air curtain status during shift A inspection."
        },
        headers=m_headers
    )
    assert assign_res.status_code == 200, assign_res.text
    assert assign_res.json()["grievance_status"] == "ASSIGNED"


def test_04_field_investigation_and_task_generation(db_session: Session):
    safety_token = get_token(client, "safety.mine1@trinetra.gov.in")
    s_headers = {"Authorization": f"Bearer {safety_token}"}

    # Create grievance
    c_res = client.post(
        "/api/v1/mobile/grievances",
        json={
            "mine_id": 1,
            "category": "SAFETY",
            "title": "Loose Hanging Mesh near Conveyor 4",
            "description": "Worker noticed bent roof mesh sagging over walkway.",
            "priority": "CRITICAL"
        },
        headers=s_headers
    )
    assert c_res.status_code == 201
    grv_id = c_res.json()["grievance_id"]

    # Perform field investigation with task generation
    inv_payload = {
        "investigation_notes": "Field inspection confirmed 3m mesh detachment near transfer chute 4. Poses immediate snag hazard.",
        "action_required": True,
        "evidence_file_name": "roof_mesh_detached.jpg",
        "evidence_file_hash": "c0ffee1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
        "latitude": 23.795800,
        "longitude": 86.430500,
        "location_source": "ACTUAL_GPS",
        "create_task": True,
        "task_title": "Re-anchor sagging roof mesh at Conveyor 4 Walkway",
        "task_description": "Install additional rock bolts and re-tension steel mesh per DGMS standard.",
        "task_sla_days": 1,
        "create_incident": True,
        "incident_title": "Hazardous Sagging Roof Mesh near Conveyor 4",
        "incident_severity": "HIGH"
    }

    inv_res = client.post(f"/api/v1/mobile/grievances/{grv_id}/investigate", json=inv_payload, headers=s_headers)
    assert inv_res.status_code == 200, inv_res.text
    inv_data = inv_res.json()
    assert inv_data["grievance_status"] == "ACTION_REQUIRED"
    assert inv_data["related_task_id"] is not None
    assert inv_data["related_incident_id"] is not None


def test_05_grievance_resolution_and_approval_routing(db_session: Session):
    safety_token = get_token(client, "safety.mine1@trinetra.gov.in")
    s_headers = {"Authorization": f"Bearer {safety_token}"}

    # Create grievance
    c_res = client.post(
        "/api/v1/mobile/grievances",
        json={
            "mine_id": 1,
            "category": "WATER",
            "title": "Water Drainage Clogged in Incline Section 2",
            "description": "Standing water accumulation impeding transport.",
            "priority": "MEDIUM"
        },
        headers=s_headers
    )
    assert c_res.status_code == 201
    grv_id = c_res.json()["grievance_id"]

    # Resolve grievance and route to supervisor sign-off
    res_payload = {
        "resolution_notes": "Sump pump filter cleared and secondary drainage channel excavated. Water cleared completely.",
        "submit_for_review": True
    }
    res_res = client.post(f"/api/v1/mobile/grievances/{grv_id}/resolve", json=res_payload, headers=s_headers)
    assert res_res.status_code == 200, res_res.text
    assert res_res.json()["grievance_status"] == "RESOLVED"

    # Verify ApprovalRequest created
    app_req = db_session.query(ApprovalRequest).filter(
        ApprovalRequest.resource_type == "GRIEVANCE",
        ApprovalRequest.resource_id == str(grv_id)
    ).first()
    assert app_req is not None
    assert app_req.status == "PENDING"
    assert app_req.required_role == "MINE_MANAGER"


def test_06_multi_tenant_mine_isolation(db_session: Session):
    # Safety officer of Mine 1
    token1 = get_token(client, "safety.mine1@trinetra.gov.in")
    headers1 = {"Authorization": f"Bearer {token1}"}

    # Attempt to fetch Mine 2 grievances
    res = client.get("/api/v1/mobile/grievances/summary?mine_id=2", headers=headers1)
    assert res.status_code == 403, f"Expected 403 for unauthorized mine, got {res.status_code}"


def test_07_offline_sync_batch_grievance_workflow(db_session: Session):
    token = get_token(client, "safety.mine1@trinetra.gov.in")
    headers = {"Authorization": f"Bearer {token}"}

    batch_payload = {
        "mine_id": 1,
        "device_id": "TAB-FIELD-GRV-001",
        "client_timestamp": datetime.now(timezone.utc).isoformat(),
        "operations": [
            {
                "operation_id": f"op_grv_create_{int(datetime.now().timestamp())}",
                "operation_type": "CREATE",
                "entity_type": "GRIEVANCE",
                "entity_id": None,
                "client_timestamp": datetime.now(timezone.utc).isoformat(),
                "payload": {
                    "category": "WORKER_WELFARE",
                    "title": "Offline Logged Rest Room Light Failure",
                    "description": "LED lighting fixture burnt out in Muster Rest Station 2.",
                    "priority": "LOW",
                    "anonymous": False,
                    "location_context": "Muster Rest Station 2",
                    "latitude": 23.7959,
                    "longitude": 86.4302,
                    "source_channel": "MOBILE_FIELD"
                }
            }
        ]
    }

    res = client.post("/api/v1/mobile/sync", json=batch_payload, headers=headers)
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["accepted_count"] == 1
    assert data["rejected_count"] == 0

    # Test idempotency on immediate retry
    res_retry = client.post("/api/v1/mobile/sync", json=batch_payload, headers=headers)
    assert res_retry.status_code == 200
    retry_data = res_retry.json()
    assert retry_data["results"][0]["status"] == "ALREADY_PROCESSED"
