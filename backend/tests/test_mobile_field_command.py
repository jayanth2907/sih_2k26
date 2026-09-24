import json
import pytest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient

from app.db.session import SessionLocal
from app.models.user import User
from app.models.mine import Mine
from app.models.spatial import MineLevel, MineZone
from app.models.risk_prediction import RiskPrediction
from app.models.incident import Incident
from app.models.governance_task import GovernanceTask
from app.models.approval import ApprovalRequest
from app.models.audit import AuditEvent
from app.services.audit_service import AuditService


def get_token(client: TestClient, email: str = "inspector.dgms@trinetra.gov.in") -> str:
    resp = client.post("/api/v1/auth/login", json={"email": email, "password": "Trinetra@2026"})
    assert resp.status_code == 200, f"Login failed: {resp.text}"
    return resp.json()["access_token"]


def test_01_field_command_summary_aggregation(client: TestClient):
    """MOBILE-16: Verify Field Command summary aggregates Attention, My Work, and Counts."""
    token = get_token(client, "inspector.dgms@trinetra.gov.in")
    headers = {"Authorization": f"Bearer {token}"}

    resp = client.get("/api/v1/mobile/command/summary?mine_id=1", headers=headers)
    assert resp.status_code == 200, resp.text
    data = resp.json()

    assert data["mine_id"] == 1
    assert data["mine_name"] is not None
    assert data["shift_name"] is not None
    assert data["user_role"] in ["FIELD_INSPECTOR", "MINE_SAFETY_OFFICER", "MINE_MANAGER", "OPERATOR"]
    assert data["data_freshness"] == "LIVE"
    assert data["is_simulated"] is True

    # Validate Attention Items
    assert "attention_items" in data
    assert isinstance(data["attention_items"], list)
    if data["attention_items"]:
        first_item = data["attention_items"][0]
        assert "source_type" in first_item
        assert "severity" in first_item
        assert "deep_link" in first_item
        assert "source_label" in first_item

    # Validate Counts
    assert "counts" in data
    counts = data["counts"]
    assert "critical_risks" in counts
    assert "open_incidents" in counts
    assert "overdue_tasks" in counts
    assert "pending_reviews" in counts


def test_02_field_command_role_aware_filtering(client: TestClient):
    """MOBILE-16: Verify role-aware adaptation between Manager and Field Inspector."""
    # Manager token
    mgr_token = get_token(client, "manager.mine1@trinetra.gov.in")
    mgr_resp = client.get("/api/v1/mobile/command/summary?mine_id=1", headers={"Authorization": f"Bearer {mgr_token}"})
    assert mgr_resp.status_code == 200
    mgr_data = mgr_resp.json()
    assert mgr_data["user_role"] == "MINE_MANAGER"

    # Field Inspector token
    insp_token = get_token(client, "inspector.dgms@trinetra.gov.in")
    insp_resp = client.get("/api/v1/mobile/command/summary?mine_id=1", headers={"Authorization": f"Bearer {insp_token}"})
    assert insp_resp.status_code == 200
    insp_data = insp_resp.json()
    assert insp_data["user_role"] == "FIELD_INSPECTOR"


def test_03_unified_resource_timeline(client: TestClient):
    """MOBILE-16: Verify unified cryptographic lifecycle audit events for a resource."""
    token = get_token(client, "inspector.dgms@trinetra.gov.in")
    headers = {"Authorization": f"Bearer {token}"}

    # Verify a risk to produce an audit event
    risks_resp = client.get("/api/v1/mobile/intelligence/risks?mine_id=1", headers=headers)
    assert risks_resp.status_code == 200
    risks = risks_resp.json()
    assert len(risks) > 0
    target_risk_id = risks[0]["id"]

    verify_payload = {
        "outcome": "ISSUE_FOUND",
        "notes": "Ventilation velocity confirmed drop to 1.8 m/s. Audible air leak at stopping 4.",
        "evidence_file_name": "stopping_4_leak.jpg",
        "evidence_file_hash": "a" * 64,
        "evidence_url": "https://storage.trinetra.gov.in/m1/stopping_4_leak.jpg",
        "latitude": 23.7954,
        "longitude": 86.4308,
        "create_governance_task": True,
        "task_title": "Seal ventilation stopping 4 air leak",
        "task_priority": "HIGH",
        "create_incident": False
    }
    v_resp = client.post(f"/api/v1/mobile/intelligence/risks/{target_risk_id}/verify", json=verify_payload, headers=headers)
    assert v_resp.status_code == 200

    # Fetch unified timeline for this RiskPrediction
    tl_resp = client.get(f"/api/v1/mobile/command/timeline/RiskPrediction/{target_risk_id}?mine_id=1", headers=headers)
    assert tl_resp.status_code == 200
    timeline = tl_resp.json()
    assert len(timeline) >= 1

    first_event = timeline[0]
    assert "timestamp" in first_event
    assert "action" in first_event
    assert "actor_name" in first_event
    assert "category" in first_event
    assert "metadata" in first_event
    assert "hash" in first_event["metadata"]


def test_04_cross_domain_related_records_resolution(client: TestClient):
    """MOBILE-16: Verify bidirectional resolution of cross-domain relational graph."""
    token = get_token(client, "inspector.dgms@trinetra.gov.in")
    headers = {"Authorization": f"Bearer {token}"}

    risks_resp = client.get("/api/v1/mobile/intelligence/risks?mine_id=1", headers=headers)
    assert risks_resp.status_code == 200
    risks = risks_resp.json()
    target_risk_id = risks[0]["id"]

    rel_resp = client.get(f"/api/v1/mobile/command/related/RiskPrediction/{target_risk_id}?mine_id=1", headers=headers)
    assert rel_resp.status_code == 200
    rel_data = rel_resp.json()

    assert rel_data["resource_type"] == "RiskPrediction"
    assert rel_data["resource_id"] == str(target_risk_id)
    assert rel_data["mine_id"] == 1
    assert "governance_tasks" in rel_data
    assert "incidents" in rel_data
    assert "evidence" in rel_data


def test_05_multi_tenant_mine_isolation_command(client: TestClient):
    """MOBILE-16: Verify cross-mine isolation prevents unauthorized access."""
    # manager 1 only has mine 1
    mgr1_token = get_token(client, "manager.mine1@trinetra.gov.in")
    headers = {"Authorization": f"Bearer {mgr1_token}"}

    # Attempt to access Mine 2 Field Command
    resp = client.get("/api/v1/mobile/command/summary?mine_id=2", headers=headers)
    assert resp.status_code == 403, f"Expected 403 Forbidden for cross-mine access, got {resp.status_code}"


def test_06_end_to_end_governance_chain(client: TestClient):
    """MOBILE-16: Full primary lifecycle trace: Risk -> Verify -> Task -> Audit."""
    token = get_token(client, "inspector.dgms@trinetra.gov.in")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Inspect summary
    summary_resp = client.get("/api/v1/mobile/command/summary?mine_id=1", headers=headers)
    assert summary_resp.status_code == 200
    summary = summary_resp.json()
    assert summary["mine_id"] == 1

    # 2. Risk detail
    risks = client.get("/api/v1/mobile/intelligence/risks?mine_id=1", headers=headers).json()
    r = risks[0]

    # 3. Verify in field
    v_res = client.post(
        f"/api/v1/mobile/intelligence/risks/{r['id']}/verify",
        json={
            "outcome": "ISSUE_FOUND",
            "notes": "Roof sag 3.2cm confirmed with extensometer at junction 5.",
            "evidence_file_name": "roof_sag_j5.jpg",
            "evidence_file_hash": "b" * 64,
            "evidence_url": "https://storage.trinetra.gov.in/m1/roof_sag_j5.jpg",
            "latitude": 23.7954,
            "longitude": 86.4308,
            "create_governance_task": True,
            "task_title": "Install secondary cable bolts at junction 5",
            "task_priority": "CRITICAL",
            "create_incident": False
        },
        headers=headers
    )
    assert v_res.status_code == 200
    v_data = v_res.json()
    assert v_data["related_task_id"] is not None

    # 4. Check related records has the newly created task
    rel = client.get(f"/api/v1/mobile/command/related/RiskPrediction/{r['id']}?mine_id=1", headers=headers).json()
    assert len(rel["governance_tasks"]) > 0
    assert rel["governance_tasks"][0]["id"] == v_data["related_task_id"]


def test_07_negative_control_prediction_without_incident(client: TestClient):
    """MOBILE-16: Negative control: Predicted high risk verified with NO_ISSUE_OBSERVED does not create incident."""
    token = get_token(client, "inspector.dgms@trinetra.gov.in")
    headers = {"Authorization": f"Bearer {token}"}

    db = SessionLocal()
    try:
        zone = db.query(MineZone).filter(MineZone.mine_id == 1).first()
        pred = RiskPrediction(
            mine_id=1,
            zone_id=zone.id if zone else None,
            prediction_timestamp=datetime.now(timezone.utc),
            horizon_minutes=30,
            predicted_risk_score=87.5,
            predicted_severity="HIGH",
            probability=0.875,
            predicted_class=1,
            current_risk_score=48.0,
            model_name="TRINETRA-HistGradientBoosting",
            model_version="risk-escalation-v1.0",
            dataset_type="SIMULATED_DEMO",
            feature_snapshot_json="{}",
            explanation_json="[]",
            field_verified=False
        )
        db.add(pred)
        db.commit()
        db.refresh(pred)
        test_pred_id = pred.id
    finally:
        db.close()

    # Verify with NO_ISSUE_OBSERVED
    v_resp = client.post(
        f"/api/v1/mobile/intelligence/risks/{test_pred_id}/verify",
        json={
            "outcome": "NO_ISSUE_OBSERVED",
            "notes": "Methane sensor calibrated and normal at 0.35%. Auxiliary ventilation fan operating at full velocity.",
            "evidence_file_name": "fan_calib_ok.jpg",
            "evidence_file_hash": "c" * 64,
            "evidence_url": "https://storage.trinetra.gov.in/m1/fan_calib_ok.jpg",
            "latitude": 23.7954,
            "longitude": 86.4308,
            "create_governance_task": False,
            "create_incident": False
        },
        headers=headers
    )
    assert v_resp.status_code == 200
    v_data = v_resp.json()
    assert v_data["field_outcome"] == "NO_ISSUE_OBSERVED"
    assert v_data["related_incident_id"] is None
    assert v_data["related_task_id"] is None
