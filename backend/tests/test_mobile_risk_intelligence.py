"""
MOBILE-15: Field Intelligence & Predictive Risk Actions Test Suite
Validates mobile predictive risk retrieval, factor explanations, field verifications,
downstream task & incident generation, offline batch synchronization, multi-tenant mine isolation,
and SHA-256 audit ledger tracking.
"""

import pytest
import uuid
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.models.mine import Mine
from app.models.user import User
from app.models.risk_prediction import RiskPrediction
from app.models.governance_task import GovernanceTask
from app.models.incident import Incident
from app.models.audit import AuditEvent

client = TestClient(app)

def get_token(client: TestClient, email: str = "safety.mine1@trinetra.gov.in", password: str = "Trinetra@2026") -> str:
    res = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, f"Login failed for {email}: {res.text}"
    return res.json()["access_token"]


def test_01_mobile_risk_summary_retrieval(db_session: Session):
    """
    Test 1: Retrieves predictive risk summary for mobile field operations.
    Validates authoritative model probability, 30-min horizon, model version, and freshness.
    """
    token = get_token(client, "safety.mine1@trinetra.gov.in")
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get(f"/api/v1/mobile/intelligence/summary?mine_id=1", headers=headers)
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["mine_id"] == 1
    assert "current_risk_score" in data
    assert "predicted_risk_score" in data
    assert "probability" in data
    assert data["horizon_minutes"] == 30
    assert "risk-escalation-v1.0" in data["model_version"]
    assert data["dataset_provenance"] == "SIMULATED_DEMO"
    assert data["freshness_status"] in ["LIVE", "LAST_KNOWN_PREDICTION", "STALE", "UNAVAILABLE"]
    assert "top_signals" in data
    assert isinstance(data["top_signals"], list)


def test_02_mobile_risk_list_and_detail_with_signals(db_session: Session):
    """
    Test 2: Retrieves filtered predictive risks list and single risk detail.
    Validates directional signals, feature snapshot parsing, and data quality notes.
    """
    token = get_token(client, "safety.mine1@trinetra.gov.in")
    headers = {"Authorization": f"Bearer {token}"}

    # Ensure at least one test risk prediction exists
    pred = RiskPrediction(
        mine_id=1,
        prediction_timestamp=datetime.now(timezone.utc),
        horizon_minutes=30,
        predicted_risk_score=88.4,
        predicted_severity="HIGH",
        probability=0.884,
        predicted_class=1,
        current_risk_score=52.0,
        model_name="TRINETRA-HistGradientBoosting",
        model_version="risk-escalation-v1.0",
        dataset_type="SIMULATED_DEMO",
        feature_snapshot_json='{"methane_ppm": 1.45, "ventilation_velocity": 1.8}',
        explanation_json='[{"feature": "methane_ppm", "label": "Methane Concentration", "direction": "INCREASING_RISK", "symbol": "↑", "current_value": 1.45, "unit": "%", "normal_reference": 0.5, "threshold_reference": 1.25, "contribution_points": 24.5, "explanation": "Methane level 1.45% is 16.0% above statutory threshold."}]',
        data_quality_score=1.0,
        data_quality_notes="Full telemetry available",
        field_verified=False
    )
    db_session.add(pred)
    db_session.commit()
    db_session.refresh(pred)

    # 1. Test List Endpoint
    res_list = client.get(f"/api/v1/mobile/intelligence/risks?mine_id=1", headers=headers)
    assert res_list.status_code == 200, res_list.text
    risks = res_list.json()
    assert len(risks) >= 1
    target = next((r for r in risks if r["id"] == pred.id), None)
    assert target is not None
    assert target["predicted_severity"] == "HIGH"
    assert target["probability"] == 0.884
    assert len(target["top_signals"]) == 1
    assert target["top_signals"][0]["symbol"] == "↑"

    # 2. Test Detail Endpoint
    res_detail = client.get(f"/api/v1/mobile/intelligence/risks/{pred.id}", headers=headers)
    assert res_detail.status_code == 200, res_detail.text
    detail = res_detail.json()
    assert detail["id"] == pred.id
    assert detail["model_version"] == "risk-escalation-v1.0"
    assert detail["field_verified"] is False


def test_03_field_verification_issue_found_with_task_and_evidence(db_session: Session):
    """
    Test 3: Field verification with outcome ISSUE_FOUND and linked GovernanceTask.
    Validates SHA-256 evidence recording, GPS context, and task generation.
    """
    token = get_token(client, "safety.mine1@trinetra.gov.in")
    headers = {"Authorization": f"Bearer {token}"}

    pred = RiskPrediction(
        mine_id=1,
        prediction_timestamp=datetime.now(timezone.utc),
        horizon_minutes=30,
        predicted_risk_score=82.0,
        predicted_severity="HIGH",
        probability=0.82,
        current_risk_score=50.0,
        model_version="risk-escalation-v1.0",
        feature_snapshot_json="{}",
        explanation_json="[]",
        field_verified=False
    )
    db_session.add(pred)
    db_session.commit()
    db_session.refresh(pred)

    evidence_hash = "a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0"
    payload = {
        "outcome": "ISSUE_FOUND",
        "notes": "Auxiliary ventilation fan ducting detached near Face 3. High methane accumulation confirmed.",
        "latitude": 23.7958,
        "longitude": 86.4305,
        "location_context": "Seam 4 - Incline 2 East Face",
        "evidence_url": "https://storage.trinetra.gov.in/evidence/pred_risk_01.jpg",
        "evidence_file_name": "ventilation_ducting_detached.jpg",
        "evidence_file_hash": evidence_hash,
        "create_governance_task": True,
        "task_title": "Reattach Ventilation Ducting at Face 3",
        "task_priority": "CRITICAL"
    }

    res = client.post(f"/api/v1/mobile/intelligence/risks/{pred.id}/verify", json=payload, headers=headers)
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["status"] == "SUCCESS"
    assert data["field_verified"] is True
    assert data["field_outcome"] == "ISSUE_FOUND"
    assert data["related_task_id"] is not None

    # Verify DB state
    db_session.refresh(pred)
    assert pred.field_verified is True
    assert pred.field_outcome == "ISSUE_FOUND"
    assert pred.evidence_file_hash == evidence_hash
    assert pred.related_task_id is not None

    # Verify Task
    task = db_session.query(GovernanceTask).filter(GovernanceTask.id == pred.related_task_id).first()
    assert task is not None
    assert task.title == "Reattach Ventilation Ducting at Face 3"
    assert task.priority == "CRITICAL"


def test_04_field_verification_no_issue_observed(db_session: Session):
    """
    Test 4: Field verification with outcome NO_ISSUE_OBSERVED.
    Demonstrates that predictions are operational signals, not proof of an incident.
    """
    token = get_token(client, "safety.mine1@trinetra.gov.in")
    headers = {"Authorization": f"Bearer {token}"}

    pred = RiskPrediction(
        mine_id=1,
        prediction_timestamp=datetime.now(timezone.utc),
        horizon_minutes=30,
        predicted_risk_score=75.0,
        predicted_severity="HIGH",
        probability=0.75,
        current_risk_score=40.0,
        model_version="risk-escalation-v1.0",
        feature_snapshot_json="{}",
        explanation_json="[]",
        field_verified=False
    )
    db_session.add(pred)
    db_session.commit()
    db_session.refresh(pred)

    payload = {
        "outcome": "NO_ISSUE_OBSERVED",
        "notes": "Face inspected thoroughly. Handheld methanometer read 0.2% CH4. False sensor spike suspected due to blasting dust.",
        "latitude": 23.7960,
        "longitude": 86.4310,
        "location_context": "Main Return Airway",
        "create_governance_task": False,
        "create_incident": False
    }

    res = client.post(f"/api/v1/mobile/intelligence/risks/{pred.id}/verify", json=payload, headers=headers)
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["field_outcome"] == "NO_ISSUE_OBSERVED"
    assert data["related_task_id"] is None
    assert data["related_incident_id"] is None


def test_05_field_verification_creates_incident(db_session: Session):
    """
    Test 5: Field verification creating a linked Incident for serious hazards.
    """
    token = get_token(client, "safety.mine1@trinetra.gov.in")
    headers = {"Authorization": f"Bearer {token}"}

    pred = RiskPrediction(
        mine_id=1,
        prediction_timestamp=datetime.now(timezone.utc),
        horizon_minutes=30,
        predicted_risk_score=92.0,
        predicted_severity="CRITICAL",
        probability=0.92,
        current_risk_score=70.0,
        model_version="risk-escalation-v1.0",
        feature_snapshot_json="{}",
        explanation_json="[]",
        field_verified=False
    )
    db_session.add(pred)
    db_session.commit()
    db_session.refresh(pred)

    payload = {
        "outcome": "ISSUE_FOUND",
        "notes": "Roof spalling and side wall cleavage cracks observed under heavy geological load.",
        "latitude": 23.7950,
        "longitude": 86.4300,
        "location_context": "Junction 7 South Drift",
        "create_governance_task": False,
        "create_incident": True,
        "incident_title": "Roof Spalling Hazard at Junction 7",
        "incident_severity": "CRITICAL"
    }

    res = client.post(f"/api/v1/mobile/intelligence/risks/{pred.id}/verify", json=payload, headers=headers)
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["related_incident_id"] is not None

    # Verify Incident in DB
    db_session.refresh(pred)
    inc = db_session.query(Incident).filter(Incident.id == pred.related_incident_id).first()
    assert inc is not None
    assert inc.severity == "CRITICAL"
    assert inc.category == "ROOF_FALL_RISK"
    assert inc.status == "OPEN"


def test_06_multi_tenant_mine_isolation(db_session: Session):
    """
    Test 6: Enforces strict multi-tenant mine isolation.
    A user authorized for Mine 1 cannot view or verify predictions in Mine 2.
    """
    token_mine1 = get_token(client, "safety.mine1@trinetra.gov.in")
    headers_mine1 = {"Authorization": f"Bearer {token_mine1}"}

    # Prediction in Mine 2
    pred_b = RiskPrediction(
        mine_id=2,
        prediction_timestamp=datetime.now(timezone.utc),
        horizon_minutes=30,
        predicted_risk_score=85.0,
        predicted_severity="HIGH",
        probability=0.85,
        current_risk_score=50.0,
        model_version="risk-escalation-v1.0",
        feature_snapshot_json="{}",
        explanation_json="[]",
        field_verified=False
    )
    db_session.add(pred_b)
    db_session.commit()
    db_session.refresh(pred_b)

    # Manager/Officer of Mine 1 attempts to query Mine 2 risks
    res = client.get(f"/api/v1/mobile/intelligence/risks?mine_id=2", headers=headers_mine1)
    assert res.status_code in [403, 404]

    # Officer of Mine 1 attempts to verify Mine 2 risk
    res_verif = client.post(
        f"/api/v1/mobile/intelligence/risks/{pred_b.id}/verify",
        json={"outcome": "NO_ISSUE_OBSERVED", "notes": "Unauthorized attempt"},
        headers=headers_mine1
    )
    assert res_verif.status_code in [403, 404]


def test_07_offline_sync_batch_risk_verification(db_session: Session):
    """
    Test 7: Offline synchronization of predictive risk verification with idempotency.
    """
    token = get_token(client, "safety.mine1@trinetra.gov.in")
    headers = {"Authorization": f"Bearer {token}"}

    pred = RiskPrediction(
        mine_id=1,
        prediction_timestamp=datetime.now(timezone.utc),
        horizon_minutes=30,
        predicted_risk_score=80.0,
        predicted_severity="HIGH",
        probability=0.80,
        current_risk_score=45.0,
        model_version="risk-escalation-v1.0",
        feature_snapshot_json="{}",
        explanation_json="[]",
        field_verified=False
    )
    db_session.add(pred)
    db_session.commit()
    db_session.refresh(pred)

    op_id = f"sync-op-pred-{uuid.uuid4().hex[:8]}"
    batch_payload = {
        "client_batch_id": f"batch-{uuid.uuid4().hex[:8]}",
        "mine_id": 1,
        "device_id": "FIELD-TABLET-09",
        "operations": [
            {
                "operation_id": op_id,
                "entity_type": "PREDICTIVE_RISK",
                "operation_type": "VERIFY",
                "entity_id": str(pred.id),
                "client_timestamp": datetime.now(timezone.utc).isoformat(),
                "payload": {
                    "prediction_id": pred.id,
                    "outcome": "ISSUE_FOUND",
                    "notes": "Offline verification: Water ingress at pump sump detected.",
                    "latitude": 23.7955,
                    "longitude": 86.4302,
                    "create_governance_task": True,
                    "task_title": "Clear Sump Pump Intake"
                }
            }
        ]
    }

    # 1. First sync submission -> ACCEPTED
    res1 = client.post("/api/v1/mobile/sync", json=batch_payload, headers=headers)
    assert res1.status_code == 200, res1.text
    res1_data = res1.json()
    assert res1_data["accepted_count"] == 1
    assert res1_data["results"][0]["status"] == "ACCEPTED"

    # Verify DB update
    db_session.refresh(pred)
    assert pred.field_verified is True
    assert pred.field_outcome == "ISSUE_FOUND"
    assert pred.related_task_id is not None

    # 2. Duplicate sync submission -> ALREADY_PROCESSED
    res2 = client.post("/api/v1/mobile/sync", json=batch_payload, headers=headers)
    assert res2.status_code == 200, res2.text
    res2_data = res2.json()
    assert res2_data["results"][0]["status"] == "ALREADY_PROCESSED"
