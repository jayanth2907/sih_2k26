import pytest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.mine import Mine
from app.models.contractor import Contractor, Contract, ContractRequirement
from app.models.governance_task import GovernanceTask
from app.models.approval import ApprovalRequest


def get_token(client: TestClient, email: str, password: str = "Trinetra@2026") -> str:
    res = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, f"Login failed for {email}: {res.text}"
    return res.json()["access_token"]


def test_01_contractors_summary_retrieval(client: TestClient, db_session: Session):
    """Test retrieving contractor summary, contracts and requirement metrics for Mine 1."""
    token = get_token(client, "manager.mine1@trinetra.gov.in")
    headers = {"Authorization": f"Bearer {token}"}
    mine = db_session.query(Mine).first()
    assert mine is not None

    res = client.get(f"/api/v1/mobile/contractors/summary?mine_id={mine.id}", headers=headers)
    assert res.status_code == 200, res.text
    data = res.json()

    assert data["mine_id"] == mine.id
    assert data["total_contractors"] >= 2
    assert data["active_contracts"] >= 1
    assert len(data["contractors"]) >= 2
    assert "overdue_requirements" in data
    assert "pending_verifications" in data


def test_02_contractor_list_and_search(client: TestClient, db_session: Session):
    """Test listing contractors with search filtering."""
    token = get_token(client, "manager.mine1@trinetra.gov.in")
    headers = {"Authorization": f"Bearer {token}"}
    mine = db_session.query(Mine).first()

    res = client.get(f"/api/v1/mobile/contractors?mine_id={mine.id}&search=Komatsu", headers=headers)
    assert res.status_code == 200
    items = res.json()
    assert len(items) >= 1
    assert "Komatsu" in items[0]["company_name"]


def test_03_contract_detail_and_sla_breakdown(client: TestClient, db_session: Session):
    """Test retrieving full contract detail and computed SLA status for attached requirements."""
    mine = db_session.query(Mine).first()
    contract = db_session.query(Contract).filter(Contract.mine_id == mine.id).first()
    assert contract is not None

    token = get_token(client, "manager.mine1@trinetra.gov.in")
    headers = {"Authorization": f"Bearer {token}"}
    res = client.get(f"/api/v1/mobile/contractors/contracts/{contract.id}", headers=headers)
    assert res.status_code == 200, res.text
    data = res.json()

    assert data["id"] == contract.id
    assert data["contract_code"] == contract.contract_code
    assert len(data["requirements"]) >= 1
    for req in data["requirements"]:
        assert "sla_status" in req
        assert req["sla_status"] in ["ON_TRACK", "DUE_SOON", "OVERDUE", "EXPIRED", "COMPLIANT"]


def test_04_verify_contract_requirement_compliant(client: TestClient, db_session: Session):
    """Test field verification marking a requirement as COMPLIANT with evidence and notes."""
    mine = db_session.query(Mine).first()
    req = db_session.query(ContractRequirement).join(Contract).filter(Contract.mine_id == mine.id).first()
    assert req is not None

    payload = {
        "requirement_id": req.id,
        "contract_id": req.contract_id,
        "verification_status": "COMPLIANT",
        "verification_notes": "Field inspection verified original insurance endorsement certificates on site.",
        "expiry_date": (datetime.now(timezone.utc).date() + timedelta(days=90)).isoformat(),
        "evidence_file_name": "contract_endorsement_verified.pdf",
        "evidence_url": "/artifacts/demo/contract_endorsement.pdf",
        "evidence_file_hash": "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f01234",
        "device_latitude": 23.7957,
        "device_longitude": 86.4304,
        "location_source": "ACTUAL_GPS"
    }

    token = get_token(client, "safety.mine1@trinetra.gov.in")
    headers = {"Authorization": f"Bearer {token}"}
    res = client.post("/api/v1/mobile/contractors/requirements/verify", json=payload, headers=headers)
    assert res.status_code == 200, res.text
    data = res.json()

    assert data["status"] == "SUCCESS"
    assert data["verification_status"] == "DOCUMENTED"
    assert data["requirement_id"] == req.id

    # Verify DB state
    db_session.expire_all()
    updated_req = db_session.query(ContractRequirement).filter(ContractRequirement.id == req.id).first()
    assert updated_req.status == "DOCUMENTED"


def test_05_verify_contract_requirement_issue_found_routes_to_approval(client: TestClient, db_session: Session):
    """Test field verification logging an ISSUE_FOUND, creating a GovernanceTask and ApprovalRequest."""
    mine = db_session.query(Mine).first()
    req = db_session.query(ContractRequirement).join(Contract).filter(Contract.mine_id == mine.id).first()
    assert req is not None

    payload = {
        "requirement_id": req.id,
        "contract_id": req.contract_id,
        "verification_status": "ISSUE_FOUND",
        "verification_notes": "VTC training certificates missing for 4 workers on Incline Bench.",
        "create_corrective_action": True,
        "corrective_action_title": "Obtain and upload VTC certificates",
        "corrective_action_description": "Contractor safety supervisor to submit missing refresher training slips.",
        "remedial_deadline": (datetime.now(timezone.utc).date() + timedelta(days=3)).isoformat()
    }

    token = get_token(client, "safety.mine1@trinetra.gov.in")
    headers = {"Authorization": f"Bearer {token}"}
    res = client.post("/api/v1/mobile/contractors/requirements/verify", json=payload, headers=headers)
    assert res.status_code == 200, res.text

    db_session.expire_all()
    updated_req = db_session.query(ContractRequirement).filter(ContractRequirement.id == req.id).first()
    assert updated_req.status == "ISSUE_FOUND"

    # Verify task created
    task = db_session.query(GovernanceTask).filter(
        (GovernanceTask.mine_id == mine.id) &
        (GovernanceTask.domain == "CONTRACTOR")
    ).order_by(GovernanceTask.id.desc()).first()
    assert task is not None
    assert "Obtain and upload VTC" in task.title

    # Verify ApprovalRequest created
    approval = db_session.query(ApprovalRequest).filter(
        (ApprovalRequest.resource_type == "CONTRACTOR_REQUIREMENT") &
        (ApprovalRequest.resource_id == str(req.id))
    ).first()
    assert approval is not None
    assert approval.status == "PENDING"


def test_06_multi_tenant_mine_isolation(client: TestClient, db_session: Session):
    """Ensure Manager of Mine 1 cannot access contracts in Mine 2."""
    c2 = db_session.query(Contract).filter(Contract.mine_id == 2).first()
    if not c2:
        pytest.skip("Mine 2 contract not seeded")

    token = get_token(client, "manager.mine1@trinetra.gov.in")
    headers = {"Authorization": f"Bearer {token}"}
    res = client.get(f"/api/v1/mobile/contractors/contracts/{c2.id}", headers=headers)
    assert res.status_code in [403, 404]


def test_07_offline_sync_batch_contractor_verification(client: TestClient, db_session: Session):
    """Test offline batch sync queue execution for contract requirement verification."""
    mine = db_session.query(Mine).first()
    req = db_session.query(ContractRequirement).join(Contract).filter(Contract.mine_id == mine.id).first()
    assert req is not None

    op_id = f"op-test-cnt-{int(datetime.now().timestamp())}"
    batch = {
        "mine_id": mine.id,
        "device_id": "TEST-MOBILE-DEVICE-01",
        "client_timestamp": datetime.now(timezone.utc).isoformat(),
        "operations": [
            {
                "operation_id": op_id,
                "entity_type": "CONTRACT_REQUIREMENT",
                "entity_id": str(req.id),
                "operation_type": "UPDATE",
                "client_timestamp": datetime.now(timezone.utc).isoformat(),
                "payload": {
                    "requirement_id": req.id,
                    "verification_status": "DOCUMENTED",
                    "verification_notes": "Offline field audit verified compliance with contractor safety manager."
                }
            }
        ]
    }

    token = get_token(client, "safety.mine1@trinetra.gov.in")
    headers = {"Authorization": f"Bearer {token}"}
    res = client.post("/api/v1/mobile/sync", json=batch, headers=headers)
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["accepted_count"] == 1
    assert data["results"][0]["status"] == "ACCEPTED"

    # Test idempotency on resend
    res_repeat = client.post("/api/v1/mobile/sync", json=batch, headers=headers)
    assert res_repeat.status_code == 200
    repeat_data = res_repeat.json()
    assert repeat_data["results"][0]["status"] == "ALREADY_PROCESSED"
