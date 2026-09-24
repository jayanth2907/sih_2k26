import pytest
import uuid
import json
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.mine import Mine
from app.models.user import User
from app.models.approval import ApprovalRequest, ApprovalAction
from app.models.field_operation import FieldInspection, FieldEvidence
from app.models.audit import AuditEvent
from app.models.notification import Notification

def get_token(client: TestClient, email: str, password: str = "Trinetra@2026") -> str:
    res = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, f"Login failed for {email}: {res.text}"
    return res.json()["access_token"]

def test_01_mobile_review_queue_and_counters(client: TestClient, db_session: Session):
    """Verify review queue returns accurate counters and enriched items for authorized mines."""
    manager_token = get_token(client, "manager.mine1@trinetra.gov.in")
    headers = {"Authorization": f"Bearer {manager_token}"}

    mine = db_session.query(Mine).first()
    assert mine is not None

    inspector = db_session.query(User).filter(User.email == "inspector.dgms@trinetra.gov.in").first()
    assert inspector is not None

    # Create a test approval request
    req_code = f"APR-TEST-{uuid.uuid4().hex[:6].upper()}"
    app_req = ApprovalRequest(
        request_code=req_code,
        resource_type="FIELD_INSPECTION",
        resource_id="101",
        mine_id=mine.id,
        title="Ventilation Safety Sign-Off",
        description="Statutory inspection of ventilation fans and airflow sensors completed.",
        requester_id=inspector.id,
        required_role="MINE_MANAGER",
        status="PENDING",
        created_at=datetime.now(timezone.utc)
    )
    db_session.add(app_req)
    db_session.commit()
    db_session.refresh(app_req)

    # Initial action
    db_session.add(ApprovalAction(
        approval_request_id=app_req.id,
        actor_id=inspector.id,
        action="SUBMIT",
        role_used="FIELD_INSPECTOR",
        comments="Submitted for review."
    ))
    db_session.commit()

    # Query mobile reviews
    res = client.get(f"/api/v1/mobile/reviews?mine_id={mine.id}", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "counts" in data
    assert "reviews" in data
    assert data["counts"]["pending"] >= 1
    assert any(r["request_code"] == req_code for r in data["reviews"])

def test_02_single_review_detail_resolution(client: TestClient, db_session: Session):
    """Verify detailed review endpoint returns checklist, evidence gallery, and audit timeline."""
    manager_token = get_token(client, "manager.mine1@trinetra.gov.in")
    headers = {"Authorization": f"Bearer {manager_token}"}

    mine = db_session.query(Mine).first()
    inspector = db_session.query(User).filter(User.email == "inspector.dgms@trinetra.gov.in").first()

    # Create inspection with evidence
    insp_code = f"INS-REV-{uuid.uuid4().hex[:6].upper()}"
    checklist_data = [
        {"item_id": "DGMS-01", "description": "Airflow velocity > 0.5 m/s", "status": "COMPLIANT", "notes": "Measured 0.8 m/s"},
        {"item_id": "DGMS-02", "description": "Methane detector calibrated", "status": "COMPLIANT", "notes": "Calibration tag valid"}
    ]
    insp = FieldInspection(
        inspection_code=insp_code,
        mine_id=mine.id,
        inspector_id=inspector.id,
        inspection_type="VENTILATION_AUDIT",
        scheduled_date=datetime.now(timezone.utc),
        status="SUBMITTED",
        checklist_json=json.dumps(checklist_data),
        summary_notes="Ventilation system fully operational",
        severity_assessment="LOW",
        latitude=23.7957,
        longitude=86.4304
    )
    db_session.add(insp)
    db_session.commit()
    db_session.refresh(insp)

    # Attach evidence
    ev = FieldEvidence(
        evidence_code=f"EV-REV-{uuid.uuid4().hex[:6].upper()}",
        mine_id=mine.id,
        inspection_id=insp.id,
        evidence_type="PHOTO",
        title="Anemometer Calibration Reading",
        description="Digital display photo showing 0.82 m/s",
        file_hash_sha256="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        file_size_bytes=1048576,
        mime_type="image/jpeg",
        location_source="ACTUAL_GPS",
        latitude=23.7957,
        longitude=86.4304,
        client_capture_timestamp=datetime.now(timezone.utc),
        captured_by_id=inspector.id
    )
    db_session.add(ev)
    db_session.commit()

    # Create ApprovalRequest for this inspection
    req_code = f"APR-INS-{uuid.uuid4().hex[:6].upper()}"
    app_req = ApprovalRequest(
        request_code=req_code,
        resource_type="FIELD_INSPECTION",
        resource_id=str(insp.id),
        mine_id=mine.id,
        title=f"Inspection Approval: {insp_code}",
        description="Statutory inspection sign-off requested.",
        requester_id=inspector.id,
        required_role="MINE_MANAGER",
        status="PENDING",
        created_at=datetime.now(timezone.utc)
    )
    db_session.add(app_req)
    db_session.commit()
    db_session.refresh(app_req)

    # Fetch detail
    res = client.get(f"/api/v1/mobile/reviews/{app_req.id}", headers=headers)
    assert res.status_code == 200
    detail = res.json()
    assert detail["request_code"] == req_code
    assert detail["resource_id"] == str(insp.id)
    assert len(detail["checklist"]) == 2
    assert len(detail["evidences"]) >= 1
    assert detail["evidences"][0]["file_hash_sha256"] == "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    assert detail["can_approve"] is True
    assert detail["sod_warning"] is None

def test_03_separation_of_duties_enforcement(client: TestClient, db_session: Session):
    """Verify submitter cannot approve their own submission (SoD rule)."""
    inspector_token = get_token(client, "inspector.dgms@trinetra.gov.in")
    headers = {"Authorization": f"Bearer {inspector_token}"}

    mine = db_session.query(Mine).first()
    inspector = db_session.query(User).filter(User.email == "inspector.dgms@trinetra.gov.in").first()

    app_req = ApprovalRequest(
        request_code=f"APR-SOD-{uuid.uuid4().hex[:6].upper()}",
        resource_type="FIELD_INSPECTION",
        resource_id="102",
        mine_id=mine.id,
        title="Self-Approval Test Request",
        description="Attempting self approval.",
        requester_id=inspector.id,
        required_role="FIELD_INSPECTOR",
        status="PENDING",
        created_at=datetime.now(timezone.utc)
    )
    db_session.add(app_req)
    db_session.commit()
    db_session.refresh(app_req)

    # Inspector attempts to approve own request -> 422 error
    decision_payload = {
        "action": "APPROVE",
        "comments": "Self approval attempt"
    }
    res = client.post(f"/api/v1/mobile/reviews/{app_req.id}/decision", json=decision_payload, headers=headers)
    assert res.status_code == 422
    assert "Separation of Duties" in res.json()["detail"]

def test_04_approve_and_digital_signoff_recording(client: TestClient, db_session: Session):
    """Verify supervisory approval sets status to APPROVED, records sign-off audit event, and sends notification."""
    manager_token = get_token(client, "manager.mine1@trinetra.gov.in")
    headers = {"Authorization": f"Bearer {manager_token}"}

    mine = db_session.query(Mine).first()
    inspector = db_session.query(User).filter(User.email == "inspector.dgms@trinetra.gov.in").first()

    app_req = ApprovalRequest(
        request_code=f"APR-APP-{uuid.uuid4().hex[:6].upper()}",
        resource_type="FIELD_INSPECTION",
        resource_id="103",
        mine_id=mine.id,
        title="Roof Bolting Audit Sign-Off",
        description="Roof bolting torque tests verified by strata engineer.",
        requester_id=inspector.id,
        required_role="MINE_MANAGER",
        status="PENDING",
        created_at=datetime.now(timezone.utc)
    )
    db_session.add(app_req)
    db_session.commit()
    db_session.refresh(app_req)

    # Process supervisory approval
    decision_payload = {
        "action": "APPROVE",
        "comments": "Inspected all torque test reports. Approved for compliance record."
    }
    res = client.post(f"/api/v1/mobile/reviews/{app_req.id}/decision", json=decision_payload, headers=headers)
    assert res.status_code == 200
    res_data = res.json()
    assert res_data["review_status"] == "APPROVED"
    assert res_data["sign_off_message"] == "Digital sign-off recorded"

    # Verify audit events exist
    signoff_audit = db_session.query(AuditEvent).filter(
        AuditEvent.resource_type == "APPROVAL_REQUEST",
        AuditEvent.resource_id == str(app_req.id),
        AuditEvent.action == "DIGITAL_SIGNOFF_RECORDED"
    ).first()
    assert signoff_audit is not None

    # Verify notification dispatched to requester
    notif = db_session.query(Notification).filter(
        Notification.user_id == inspector.id,
        Notification.title.contains("Digital Sign-Off Approved")
    ).first()
    assert notif is not None

def test_05_mandatory_reason_for_rejection_and_return(client: TestClient, db_session: Session):
    """Verify REJECT and REQUEST_CHANGES strictly require non-empty comments/reasons."""
    manager_token = get_token(client, "manager.mine1@trinetra.gov.in")
    headers = {"Authorization": f"Bearer {manager_token}"}

    mine = db_session.query(Mine).first()
    inspector = db_session.query(User).filter(User.email == "inspector.dgms@trinetra.gov.in").first()

    app_req = ApprovalRequest(
        request_code=f"APR-REJ-{uuid.uuid4().hex[:6].upper()}",
        resource_type="FIELD_INSPECTION",
        resource_id="104",
        mine_id=mine.id,
        title="Haul Road Dust Audit",
        description="Dust suppression system audit.",
        requester_id=inspector.id,
        required_role="MINE_MANAGER",
        status="PENDING",
        created_at=datetime.now(timezone.utc)
    )
    db_session.add(app_req)
    db_session.commit()
    db_session.refresh(app_req)

    # Attempt rejection without reason -> 422
    res_no_reason = client.post(
        f"/api/v1/mobile/reviews/{app_req.id}/decision",
        json={"action": "REJECT", "comments": ""},
        headers=headers
    )
    assert res_no_reason.status_code == 422
    assert "mandatory reason" in res_no_reason.json()["detail"].lower()

    # Reject with valid reason -> 200
    res_valid_reject = client.post(
        f"/api/v1/mobile/reviews/{app_req.id}/decision",
        json={"action": "REJECT", "comments": "Water mist sprayer flow rate is below statutory minimum."},
        headers=headers
    )
    assert res_valid_reject.status_code == 200
    assert res_valid_reject.json()["review_status"] == "REJECTED"

def test_06_return_for_correction_and_resubmission_lifecycle(client: TestClient, db_session: Session):
    """Verify RETURN FOR CORRECTION (REQUEST_CHANGES) and subsequent RESUBMIT workflow."""
    manager_token = get_token(client, "manager.mine1@trinetra.gov.in")
    inspector_token = get_token(client, "inspector.dgms@trinetra.gov.in")

    mine = db_session.query(Mine).first()
    inspector = db_session.query(User).filter(User.email == "inspector.dgms@trinetra.gov.in").first()

    app_req = ApprovalRequest(
        request_code=f"APR-RET-{uuid.uuid4().hex[:6].upper()}",
        resource_type="FIELD_INSPECTION",
        resource_id="105",
        mine_id=mine.id,
        title="Emergency Lighting Review",
        description="Secondary escapeway emergency lighting audit.",
        requester_id=inspector.id,
        required_role="MINE_MANAGER",
        status="PENDING",
        created_at=datetime.now(timezone.utc)
    )
    db_session.add(app_req)
    db_session.commit()
    db_session.refresh(app_req)

    # 1. Manager returns for correction
    ret_res = client.post(
        f"/api/v1/mobile/reviews/{app_req.id}/decision",
        json={"action": "REQUEST_CHANGES", "comments": "Photo of Battery Backup unit #3 is missing timestamp watermark."},
        headers={"Authorization": f"Bearer {manager_token}"}
    )
    assert ret_res.status_code == 200
    assert ret_res.json()["review_status"] == "CHANGES_REQUESTED"

    # 2. Inspector resubmits with additional information
    resubmit_res = client.post(
        f"/api/v1/mobile/reviews/{app_req.id}/resubmit",
        json={"comments": "Uploaded re-verified photo of Battery Backup unit #3 with GPS timestamp.", "updated_description": "Updated escapeway lighting audit with battery test log."},
        headers={"Authorization": f"Bearer {inspector_token}"}
    )
    assert resubmit_res.status_code == 200
    assert resubmit_res.json()["review_status"] == "PENDING"

    # Verify history preserved in detail timeline
    detail_res = client.get(f"/api/v1/mobile/reviews/{app_req.id}", headers={"Authorization": f"Bearer {manager_token}"})
    assert detail_res.status_code == 200
    timeline = detail_res.json()["timeline"]
    actions = [t["action"] for t in timeline]
    assert "REQUEST_CHANGES" in actions
    assert "RESUBMIT" in actions

def test_07_mine_isolation_for_reviews(client: TestClient, db_session: Session):
    """Verify manager authorized for Mine 1 cannot access or review requests for Mine 2."""
    manager_token = get_token(client, "manager.mine1@trinetra.gov.in")
    headers = {"Authorization": f"Bearer {manager_token}"}

    mine2 = db_session.query(Mine).filter(Mine.id == 2).first()
    if not mine2:
        mine2 = Mine(name="Mine 2 Test", code="SOB-02", state="Jharkhand", district="Dhanbad", status="ACTIVE")
        db_session.add(mine2)
        db_session.commit()

    inspector = db_session.query(User).filter(User.email == "inspector.dgms@trinetra.gov.in").first()

    app_req_mine2 = ApprovalRequest(
        request_code=f"APR-M2-{uuid.uuid4().hex[:6].upper()}",
        resource_type="FIELD_INSPECTION",
        resource_id="106",
        mine_id=2,
        title="Mine 2 Isolated Approval Request",
        description="Testing mine isolation.",
        requester_id=inspector.id,
        required_role="MINE_MANAGER",
        status="PENDING",
        created_at=datetime.now(timezone.utc)
    )
    db_session.add(app_req_mine2)
    db_session.commit()
    db_session.refresh(app_req_mine2)

    # Manager 1 attempts to view Mine 2 review detail -> 403 Forbidden
    res = client.get(f"/api/v1/mobile/reviews/{app_req_mine2.id}", headers=headers)
    assert res.status_code == 403

    # Manager 1 attempts to approve Mine 2 review -> 403 Forbidden
    dec_res = client.post(
        f"/api/v1/mobile/reviews/{app_req_mine2.id}/decision",
        json={"action": "APPROVE", "comments": "Unauthorized cross mine attempt"},
        headers=headers
    )
    assert dec_res.status_code == 403
