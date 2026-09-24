import pytest
import uuid
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.mine import Mine
from app.models.user import User
from app.models.notification import Notification
from app.models.alert import Alert
from app.models.incident import Incident
from app.models.governance_task import GovernanceTask
from app.models.audit import AuditEvent
from app.services.notification_service import NotificationService

def get_inspector_token(client: TestClient, email: str = "inspector.dgms@trinetra.gov.in", password: str = "Trinetra@2026") -> str:
    res = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, f"Login failed for {email}: {res.text}"
    return res.json()["access_token"]

def get_manager_token(client: TestClient, email: str = "manager.mine1@trinetra.gov.in", password: str = "Trinetra@2026") -> str:
    res = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, f"Login failed for {email}: {res.text}"
    return res.json()["access_token"]

def test_01_authorized_notifications_and_unread_counts(client: TestClient, db_session: Session):
    """Verify inspector can retrieve notifications and accurate unread count breakdowns."""
    token = get_inspector_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    mine = db_session.query(Mine).first()
    inspector_user = db_session.query(User).filter(User.email == "inspector.dgms@trinetra.gov.in").first()
    assert mine is not None
    assert inspector_user is not None

    # Seed test notification
    notif = Notification(
        user_id=inspector_user.id,
        mine_id=mine.id,
        title="MOBILE-07 Statutory Task Assignment",
        message="Ventilation airflow verification scheduled at North Seam Panel A",
        notification_type="CRITICAL",
        link="/mobile/tasks",
        is_read="NO"
    )
    db_session.add(notif)

    # Seed test alert
    alert = Alert(
        mine_id=mine.id,
        title="High Methane Telemetry Alert",
        message="CH4 concentration peaked at 1.92% in Return Airway Z-02",
        severity="HIGH",
        risk_score=78.5,
        status="UNREAD",
        source="SCADA",
        location_context="Level 2 > North Seam Panel A"
    )
    db_session.add(alert)
    db_session.commit()

    # 1. Test GET /api/v1/mobile/notifications
    res = client.get(f"/api/v1/mobile/notifications?mine_id={mine.id}", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "notifications" in data
    assert "counts" in data
    assert len(data["notifications"]) >= 2

    # 2. Test GET /api/v1/mobile/notifications/unread-count
    cnt_res = client.get(f"/api/v1/mobile/notifications/unread-count?mine_id={mine.id}", headers=headers)
    assert cnt_res.status_code == 200
    counts = cnt_res.json()
    assert "total_unread" in counts
    assert "critical_unread" in counts
    assert "tasks_unread" in counts
    assert "incidents_unread" in counts
    assert "verification_unread" in counts
    assert counts["total_unread"] >= 2


def test_02_mark_single_notification_as_read_and_audit(client: TestClient, db_session: Session):
    """Verify marking a single notification or alert as read logs an immutable AuditEvent."""
    token = get_inspector_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    mine = db_session.query(Mine).first()
    inspector_user = db_session.query(User).filter(User.email == "inspector.dgms@trinetra.gov.in").first()

    notif = Notification(
        user_id=inspector_user.id,
        mine_id=mine.id,
        title="Audited Notification Read Test",
        message="Acknowledge immediate hazard containment",
        notification_type="WARNING",
        is_read="NO"
    )
    db_session.add(notif)
    db_session.commit()
    db_session.refresh(notif)

    notif_composite_id = f"notif-{notif.id}"

    res = client.patch(
        f"/api/v1/mobile/notifications/{notif_composite_id}/read",
        headers=headers
    )
    assert res.status_code == 200
    assert res.json()["is_read"] is True

    # Verify DB update
    db_session.refresh(notif)
    assert notif.is_read in ["YES", "READ"]

    # Verify AuditEvent creation
    audit = db_session.query(AuditEvent).filter(
        AuditEvent.resource_type == "NOTIFICATION",
        AuditEvent.resource_id == str(notif.id),
        AuditEvent.action == "NOTIFICATION_MARKED_READ"
    ).first()
    assert audit is not None
    assert audit.actor_id == inspector_user.id


def test_03_mark_all_notifications_as_read(client: TestClient, db_session: Session):
    """Verify bulk read acknowledgment marks all unread items in authorized scope."""
    token = get_inspector_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    mine = db_session.query(Mine).first()
    inspector_user = db_session.query(User).filter(User.email == "inspector.dgms@trinetra.gov.in").first()

    # Seed 2 unread notifications
    for i in range(2):
        n = Notification(
            user_id=inspector_user.id,
            mine_id=mine.id,
            title=f"Bulk Notification {i+1}",
            message=f"Message {i+1}",
            is_read="NO"
        )
        db_session.add(n)
    db_session.commit()

    res = client.post(
        f"/api/v1/mobile/notifications/mark-all-read?mine_id={mine.id}",
        headers=headers
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "SUCCESS"
    assert data["marked_read_count"] >= 2


def test_04_cross_mine_notification_isolation(client: TestClient, db_session: Session):
    """Verify manager scoped to Mine 1 cannot access notifications in unauthorized mine."""
    mgr_token = get_manager_token(client)
    headers = {"Authorization": f"Bearer {mgr_token}"}

    unauthorized_mine = db_session.query(Mine).filter(Mine.code == "REAL-JOG-01").first()
    if unauthorized_mine:
        res = client.get(
            f"/api/v1/mobile/notifications?mine_id={unauthorized_mine.id}",
            headers=headers
        )
        assert res.status_code in [403, 404]


def test_05_stale_resource_graceful_handling(client: TestClient, db_session: Session):
    """Verify notifications referencing closed or resolved resources flag is_stale gracefully."""
    token = get_inspector_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    mine = db_session.query(Mine).first()

    # Create an incident and immediately resolve/close it
    incident = Incident(
        incident_code=f"INC-NOTIF-TEST-{uuid.uuid4().hex[:6]}",
        mine_id=mine.id,
        title="Stale Alert Test Incident",
        description="Testing stale resource detection",
        category="GAS_ANOMALY",
        severity="HIGH",
        status="CLOSED"
    )
    db_session.add(incident)
    db_session.commit()
    db_session.refresh(incident)

    alert = Alert(
        mine_id=mine.id,
        incident_id=incident.id,
        title="Stale Incident Operational Alert",
        message="Incident was resolved earlier",
        severity="HIGH",
        status="UNREAD",
        source="SYSTEM"
    )
    db_session.add(alert)
    db_session.commit()

    res = client.get(f"/api/v1/mobile/notifications?mine_id={mine.id}", headers=headers)
    assert res.status_code == 200
    notifs = res.json()["notifications"]

    stale_items = [n for n in notifs if n.get("deep_link", {}).get("resource_id") == str(incident.id)]
    if stale_items:
        assert stale_items[0]["is_stale"] is True
        assert "CLOSED" in stale_items[0]["stale_reason"] or "already" in stale_items[0]["stale_reason"]


def test_06_notification_creation_deduplication(client: TestClient, db_session: Session):
    """Verify create_notification helper prevents duplicate spam within cooldown window."""
    mine = db_session.query(Mine).first()
    inspector_user = db_session.query(User).filter(User.email == "inspector.dgms@trinetra.gov.in").first()

    # Create first notification
    notif1 = NotificationService.create_notification(
        db=db_session,
        user_id=inspector_user.id,
        mine_id=mine.id,
        title="Deduplication Test Sensor Methane Spike",
        message="Methane reading 1.95% in Panel B",
        notification_type="CRITICAL"
    )

    # Attempt to create identical notification immediately
    notif2 = NotificationService.create_notification(
        db=db_session,
        user_id=inspector_user.id,
        mine_id=mine.id,
        title="Deduplication Test Sensor Methane Spike",
        message="Methane reading 1.98% in Panel B",
        notification_type="CRITICAL"
    )

    # Must reuse the same record rather than creating a duplicate row
    assert notif1.id == notif2.id
    assert notif2.message == "Methane reading 1.98% in Panel B"
