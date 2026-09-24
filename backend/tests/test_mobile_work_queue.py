import pytest
import uuid
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.mine import Mine
from app.models.governance_task import GovernanceTask
from app.models.workforce import Shift, AttendanceRecord
from app.models.audit import AuditEvent
from app.models.user import User

def get_inspector_token(client: TestClient, email: str = "inspector.dgms@trinetra.gov.in", password: str = "Trinetra@2026") -> str:
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


def test_01_mobile_work_queue_retrieval(client: TestClient, db_session: Session):
    """Verify inspector can retrieve the unified mobile work queue with accurate count breakdowns."""
    token = get_inspector_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    mine = db_session.query(Mine).first()
    assert mine is not None

    # Seed a test GovernanceTask
    task = GovernanceTask(
        task_code=f"GT-WKB-{uuid.uuid4().hex[:6].upper()}",
        mine_id=mine.id,
        title="MOBILE-06 Test Statutory Inspection",
        description="Verify methane sensor telemetry and ventilation airflow at North Face",
        domain="SAFETY",
        priority="HIGH",
        status="ASSIGNED",
        due_at=datetime.now(timezone.utc) + timedelta(hours=4),
        source_resource_type="STATUTORY_SCHEDULE"
    )
    db_session.add(task)
    db_session.commit()
    db_session.refresh(task)

    res = client.get(f"/api/v1/mobile/work-queue?mine_id={mine.id}", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "tasks" in data
    assert "counts" in data
    assert isinstance(data["tasks"], list)
    
    counts = data["counts"]
    assert "total" in counts
    assert "critical" in counts
    assert "high" in counts
    assert "due_today" in counts
    assert "overdue" in counts
    assert "assigned" in counts
    assert "in_progress" in counts
    assert "completed" in counts
    assert "verification_pending" in counts
    assert counts["total"] >= 1


def test_02_task_status_lifecycle_transitions(client: TestClient, db_session: Session):
    """Verify task state progression: ASSIGNED -> IN_PROGRESS -> RESOLVED -> VERIFIED -> CLOSED."""
    inspector_token = get_inspector_token(client)
    manager_token = get_manager_token(client)
    inspector_headers = {"Authorization": f"Bearer {inspector_token}"}
    manager_headers = {"Authorization": f"Bearer {manager_token}"}

    mine = db_session.query(Mine).first()
    inspector_user = db_session.query(User).filter(User.email == "inspector.dgms@trinetra.gov.in").first()

    # Create a task assigned to inspector
    task = GovernanceTask(
        task_code=f"GT-LIFE-{uuid.uuid4().hex[:6].upper()}",
        mine_id=mine.id,
        title="Ventilation Airway Clearance Test",
        description="Check haul road ventilation shaft dampers",
        domain="SAFETY",
        priority="CRITICAL",
        status="ASSIGNED",
        assignee_id=inspector_user.id if inspector_user else None,
        due_at=datetime.now(timezone.utc) + timedelta(hours=6)
    )
    db_session.add(task)
    db_session.commit()
    db_session.refresh(task)

    # 1. Inspector transitions: ASSIGNED -> IN_PROGRESS
    res1 = client.patch(
        f"/api/v1/mobile/tasks/{task.id}/status",
        json={"status": "IN_PROGRESS"},
        headers=inspector_headers
    )
    assert res1.status_code == 200
    assert res1.json()["task_status"] == "IN_PROGRESS"

    # 2. Inspector transitions: IN_PROGRESS -> RESOLVED (Requires resolution_notes)
    res2 = client.patch(
        f"/api/v1/mobile/tasks/{task.id}/status",
        json={
            "status": "RESOLVED",
            "resolution_notes": "Ventilation dampers unblocked, airflow measured at 18.5 m/s, zero obstruction found."
        },
        headers=inspector_headers
    )
    assert res2.status_code == 200
    assert res2.json()["task_status"] == "RESOLVED"

    # 3. Manager verifies: RESOLVED -> VERIFIED
    res3 = client.patch(
        f"/api/v1/mobile/tasks/{task.id}/status",
        json={"status": "VERIFIED"},
        headers=manager_headers
    )
    assert res3.status_code == 200
    assert res3.json()["task_status"] == "VERIFIED"

    # 4. Manager closes: VERIFIED -> CLOSED
    res4 = client.patch(
        f"/api/v1/mobile/tasks/{task.id}/status",
        json={"status": "CLOSED"},
        headers=manager_headers
    )
    assert res4.status_code == 200
    assert res4.json()["task_status"] == "CLOSED"


def test_03_invalid_transitions_and_sod_enforcement(client: TestClient, db_session: Session):
    """Verify invalid state jumps, missing notes on completion, and Separation of Duties rules."""
    inspector_token = get_inspector_token(client)
    inspector_headers = {"Authorization": f"Bearer {inspector_token}"}

    mine = db_session.query(Mine).first()
    inspector_user = db_session.query(User).filter(User.email == "inspector.dgms@trinetra.gov.in").first()

    task = GovernanceTask(
        task_code=f"GT-SOD-{uuid.uuid4().hex[:6].upper()}",
        mine_id=mine.id,
        title="SoD Test Task",
        description="Testing separation of duties enforcement",
        domain="SAFETY",
        priority="MEDIUM",
        status="ASSIGNED",
        assignee_id=inspector_user.id if inspector_user else None,
        due_at=datetime.now(timezone.utc) + timedelta(hours=8)
    )
    db_session.add(task)
    db_session.commit()
    db_session.refresh(task)

    # 1. Invalid transition jump: ASSIGNED -> CLOSED (should fail with 422/400)
    res_jump = client.patch(
        f"/api/v1/mobile/tasks/{task.id}/status",
        json={"status": "CLOSED"},
        headers=inspector_headers
    )
    assert res_jump.status_code in [400, 422]

    # 2. Missing resolution notes on RESOLVED
    # Move to IN_PROGRESS first
    client.patch(f"/api/v1/mobile/tasks/{task.id}/status", json={"status": "IN_PROGRESS"}, headers=inspector_headers)
    res_no_notes = client.patch(
        f"/api/v1/mobile/tasks/{task.id}/status",
        json={"status": "RESOLVED", "resolution_notes": ""},
        headers=inspector_headers
    )
    assert res_no_notes.status_code in [400, 422]

    # 3. Complete task with notes
    res_resolved = client.patch(
        f"/api/v1/mobile/tasks/{task.id}/status",
        json={"status": "RESOLVED", "resolution_notes": "Proper resolution documentation provided."},
        headers=inspector_headers
    )
    assert res_resolved.status_code == 200

    # 4. Inspector self-verifying own assigned task should be rejected (403 or 422 SoD)
    res_sod = client.patch(
        f"/api/v1/mobile/tasks/{task.id}/status",
        json={"status": "VERIFIED"},
        headers=inspector_headers
    )
    assert res_sod.status_code in [400, 403, 422]


def test_04_shift_context_retrieval(client: TestClient, db_session: Session):
    """Verify shift and active attendance context endpoint."""
    token = get_inspector_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    mine = db_session.query(Mine).first()
    res = client.get(f"/api/v1/mobile/shift-context?mine_id={mine.id}", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "shift_name" in data
    assert "start_time" in data
    assert "end_time" in data
    assert "attendance_status" in data
    assert "verification_mode" in data
    assert "has_active_shift" in data


def test_05_audit_event_logged_on_status_change(client: TestClient, db_session: Session):
    """Verify that every task status transition generates an immutable AuditEvent."""
    inspector_token = get_inspector_token(client)
    inspector_headers = {"Authorization": f"Bearer {inspector_token}"}

    mine = db_session.query(Mine).first()

    task = GovernanceTask(
        task_code=f"GT-AUD-{uuid.uuid4().hex[:6].upper()}",
        mine_id=mine.id,
        title="Audited Task State Progression",
        description="Audit logging validation",
        domain="COMPLIANCE",
        priority="LOW",
        status="OPEN",
        due_at=datetime.now(timezone.utc) + timedelta(hours=24)
    )
    db_session.add(task)
    db_session.commit()
    db_session.refresh(task)

    initial_audit_count = db_session.query(AuditEvent).filter(
        AuditEvent.resource_type == "GOVERNANCE_TASK",
        AuditEvent.resource_id == str(task.id)
    ).count()

    res = client.patch(
        f"/api/v1/mobile/tasks/{task.id}/status",
        json={"status": "IN_PROGRESS"},
        headers=inspector_headers
    )
    assert res.status_code == 200

    new_audit_count = db_session.query(AuditEvent).filter(
        AuditEvent.resource_type == "GOVERNANCE_TASK",
        AuditEvent.resource_id == str(task.id)
    ).count()
    assert new_audit_count == initial_audit_count + 1


def test_06_work_queue_count_and_filter_consistency(client: TestClient, db_session: Session):
    """BUG-03: Verify count breakdown and deadline flag consistency across all status categories."""
    inspector_token = get_inspector_token(client)
    headers = {"Authorization": f"Bearer {inspector_token}"}

    mine = db_session.query(Mine).first()
    assert mine is not None

    now = datetime.now(timezone.utc)
    today_due = now.replace(hour=20, minute=0, second=0, microsecond=0)
    overdue_due = now - timedelta(days=2)
    future_due = now + timedelta(days=5)

    # 1. Assigned future task
    t_assigned = GovernanceTask(
        task_code=f"GT-CNT-{uuid.uuid4().hex[:6].upper()}",
        mine_id=mine.id,
        title="Test Assigned Future Task",
        description="Assigned task due in future",
        domain="SAFETY",
        priority="MEDIUM",
        status="ASSIGNED",
        due_at=future_due
    )
    # 2. In progress task due today
    t_in_progress = GovernanceTask(
        task_code=f"GT-CNT-{uuid.uuid4().hex[:6].upper()}",
        mine_id=mine.id,
        title="Test In Progress Due Today",
        description="Ongoing task due today",
        domain="OPERATIONS",
        priority="HIGH",
        status="IN_PROGRESS",
        due_at=today_due
    )
    # 3. Overdue task
    t_overdue = GovernanceTask(
        task_code=f"GT-CNT-{uuid.uuid4().hex[:6].upper()}",
        mine_id=mine.id,
        title="Test Overdue Task",
        description="Task overdue past deadline",
        domain="ENVIRONMENT",
        priority="CRITICAL",
        status="ASSIGNED",
        due_at=overdue_due
    )
    # 4. Resolved task awaiting verification
    t_resolved = GovernanceTask(
        task_code=f"GT-CNT-{uuid.uuid4().hex[:6].upper()}",
        mine_id=mine.id,
        title="Test Resolved Verification Task",
        description="Task completed by inspector, awaiting supervisor signoff",
        domain="SAFETY",
        priority="HIGH",
        status="RESOLVED",
        due_at=future_due,
        resolution_notes="Completed sensor replacement."
    )

    db_session.add_all([t_assigned, t_in_progress, t_overdue, t_resolved])
    db_session.commit()

    res = client.get(f"/api/v1/mobile/work-queue?mine_id={mine.id}", headers=headers)
    assert res.status_code == 200
    data = res.json()
    tasks = data["tasks"]
    counts = data["counts"]

    # Verify counts match task array sizes exactly
    assert counts["total"] == len(tasks)
    
    assigned_tasks = [t for t in tasks if t["status"] in ["ASSIGNED", "OPEN"]]
    assert counts["assigned"] == len(assigned_tasks)

    in_progress_tasks = [t for t in tasks if t["status"] == "IN_PROGRESS"]
    assert counts["in_progress"] == len(in_progress_tasks)

    due_today_tasks = [t for t in tasks if t["is_due_today"] and t["status"] not in ["CLOSED", "VERIFIED"]]
    assert counts["due_today"] == len(due_today_tasks)

    overdue_tasks = [t for t in tasks if t["is_overdue"]]
    assert counts["overdue"] == len(overdue_tasks)

    verif_tasks = [t for t in tasks if t["status"] in ["RESOLVED", "SUBMITTED"]]
    assert counts["verification_pending"] == len(verif_tasks)

    completed_tasks = [t for t in tasks if t["status"] in ["COMPLETED", "RESOLVED", "VERIFIED", "CLOSED"]]
    assert counts["completed"] == len(completed_tasks)

    # Verify task items contain expected deadline and SLA attributes
    overdue_item = next(t for t in tasks if t["id"] == t_overdue.id)
    assert overdue_item["is_overdue"] is True
    assert "OVERDUE" in overdue_item["sla_text"]
    assert overdue_item["due_at"] is not None


def test_07_mine_isolation_and_role_scoping(client: TestClient, db_session: Session):
    """BUG-03: Verify mine isolation and that tasks do not leak across mine boundaries."""
    inspector_token = get_inspector_token(client)
    headers = {"Authorization": f"Bearer {inspector_token}"}

    mines = db_session.query(Mine).all()
    if len(mines) >= 2:
        mine_a, mine_b = mines[0], mines[1]

        # Seed task in mine A
        t_a = GovernanceTask(
            task_code=f"GT-MNA-{uuid.uuid4().hex[:6].upper()}",
            mine_id=mine_a.id,
            title="Mine A Isolated Task",
            description="Task specifically in Mine A",
            domain="SAFETY",
            priority="LOW",
            status="OPEN",
            due_at=datetime.now(timezone.utc) + timedelta(days=1)
        )
        # Seed task in mine B
        t_b = GovernanceTask(
            task_code=f"GT-MNB-{uuid.uuid4().hex[:6].upper()}",
            mine_id=mine_b.id,
            title="Mine B Isolated Task",
            description="Task specifically in Mine B",
            domain="SAFETY",
            priority="LOW",
            status="OPEN",
            due_at=datetime.now(timezone.utc) + timedelta(days=1)
        )
        db_session.add_all([t_a, t_b])
        db_session.commit()

        # Query Mine A
        res_a = client.get(f"/api/v1/mobile/work-queue?mine_id={mine_a.id}", headers=headers)
        assert res_a.status_code == 200
        mine_a_task_ids = [t["id"] for t in res_a.json()["tasks"]]
        assert t_a.id in mine_a_task_ids
        assert t_b.id not in mine_a_task_ids

        # Query Mine B
        res_b = client.get(f"/api/v1/mobile/work-queue?mine_id={mine_b.id}", headers=headers)
        assert res_b.status_code == 200
        mine_b_task_ids = [t["id"] for t in res_b.json()["tasks"]]
        assert t_b.id in mine_b_task_ids
        assert t_a.id not in mine_b_task_ids

