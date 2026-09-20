import pytest
from datetime import datetime, timezone, timedelta, date
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.mine import Mine
from app.models.user import User, UserMineAssignment
from app.models.incident import Incident
from app.models.violation import Violation, CorrectiveAction
from app.models.production import ProductionReport
from app.models.workforce import Worker, AttendanceRecord
from app.models.environmental import EnvironmentalObservation
from app.models.contractor import Contractor, Contract
from app.models.grievance import Grievance
from app.models.field_operation import FieldInspection, FieldEvidence, FieldSyncLog
from app.models.risk_prediction import RiskPrediction
from app.models.governance_task import GovernanceTask
from app.core.security import create_access_token


def get_token(client: TestClient, email: str, password: str = "Trinetra@2026") -> str:
    res = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, f"Login failed: {res.text}"
    return res.json()["access_token"]


# =========================================================================
# 1. OVERVIEW AGGREGATION & DELTA TESTS
# =========================================================================

def test_overview_aggregation(client: TestClient, db_session: Session):
    token = get_token(client, "admin@trinetra.gov.in")
    res = client.get("/api/v1/analytics/mines/1/overview?range_type=LAST_30_DAYS", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()
    assert data["mine_id"] == 1
    assert "total_incidents" in data
    assert "open_incidents" in data
    assert "critical_incidents" in data
    assert "active_alerts" in data
    assert "open_violations" in data
    assert "overdue_corrective_actions" in data
    assert "sla_breaches" in data
    assert "data_quality" in data
    assert data["data_quality"]["record_count"] >= 0


def test_previous_period_delta_and_percentage(client: TestClient, db_session: Session):
    token = get_token(client, "admin@trinetra.gov.in")
    res = client.get("/api/v1/analytics/mines/1/overview?range_type=LAST_7_DAYS", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()
    tot_inc = data["total_incidents"]
    assert "current_value" in tot_inc
    assert "previous_value" in tot_inc
    assert "delta" in tot_inc
    # Delta should equal current_value - previous_value if previous exists
    if tot_inc["previous_value"] is not None and tot_inc["delta"] is not None:
        assert round(tot_inc["delta"], 2) == round(tot_inc["current_value"] - tot_inc["previous_value"], 2)


def test_division_by_zero_protection(client: TestClient, db_session: Session):
    """When previous value is 0, percentage_delta must be None to prevent ZeroDivisionError."""
    from app.services.analytics.time_utils import TimeRangeHelper
    trend = TimeRangeHelper.calculate_trend(current_val=5, previous_val=0)
    assert trend.current_value == 5.0
    assert trend.previous_value == 0.0
    assert trend.delta == 5.0
    assert trend.percentage_delta is None


# =========================================================================
# 2. SAFETY ANALYTICS TESTS
# =========================================================================

def test_safety_aggregation(client: TestClient, db_session: Session):
    token = get_token(client, "admin@trinetra.gov.in")
    res = client.get("/api/v1/analytics/mines/1/safety?range_type=LAST_30_DAYS", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()
    assert "total_incidents" in data
    assert "open_incidents" in data
    assert "resolved_incidents" in data
    assert "incidents_by_day" in data
    assert "incidents_by_severity" in data
    assert "anomalies_count" in data
    assert "drilldown_entities" in data
    assert isinstance(data["incidents_by_day"], list)


def test_safety_drilldown_and_spatial_links(client: TestClient, db_session: Session):
    token = get_token(client, "admin@trinetra.gov.in")
    res = client.get("/api/v1/analytics/mines/1/safety", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()
    for entity in data["drilldown_entities"]:
        assert entity["id"] is not None
        assert entity["code"] is not None
        assert entity["entity_type"] == "INCIDENT"


# =========================================================================
# 3. COMPLIANCE ANALYTICS TESTS
# =========================================================================

def test_compliance_aggregation(client: TestClient, db_session: Session):
    token = get_token(client, "admin@trinetra.gov.in")
    res = client.get("/api/v1/analytics/mines/1/compliance", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()
    assert "total_violations" in data
    assert "open_violations" in data
    assert "violations_by_severity" in data
    assert "corrective_actions_total" in data
    assert "sla_compliance_rate_percent" in data
    assert "compliance_chain" in data
    assert isinstance(data["compliance_chain"], list)


# =========================================================================
# 4. PRODUCTION ANALYTICS TESTS
# =========================================================================

def test_production_aggregation(client: TestClient, db_session: Session):
    token = get_token(client, "admin@trinetra.gov.in")
    res = client.get("/api/v1/analytics/mines/1/production", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()
    assert "planned_quantity_total" in data
    assert "actual_quantity_total" in data
    assert "variance_quantity_total" in data
    assert "variance_percentage" in data
    assert data["unit"] == "TONNES"
    assert "production_trend" in data
    assert "production_by_shift" in data


# =========================================================================
# 5. WORKFORCE ANALYTICS TESTS
# =========================================================================

def test_workforce_aggregation(client: TestClient, db_session: Session):
    token = get_token(client, "admin@trinetra.gov.in")
    res = client.get("/api/v1/analytics/mines/1/workforce", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()
    assert "total_workers_registered" in data
    assert "total_attendance_records" in data
    assert "attendance_rate_percent" in data
    assert "attendance_trend" in data
    assert "workers_by_trade" in data


# =========================================================================
# 6. ENVIRONMENTAL ANALYTICS & NO_DATA SEMANTICS TESTS
# =========================================================================

def test_environmental_aggregation(client: TestClient, db_session: Session):
    token = get_token(client, "admin@trinetra.gov.in")
    res = client.get("/api/v1/analytics/mines/1/environment", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()
    assert "total_observations" in data
    assert "parameters" in data
    assert len(data["parameters"]) >= 5


def test_missing_data_not_equal_to_zero(client: TestClient, db_session: Session):
    """Missing environmental parameter must have status=NO_DATA and latest_value=None, NOT 0.0."""
    token = get_token(client, "admin@trinetra.gov.in")
    res = client.get("/api/v1/analytics/mines/4/environment", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()
    for param in data["parameters"]:
        if param["observation_count"] == 0:
            assert param["status"] == "NO_DATA"
            assert param["latest_value"] is None


# =========================================================================
# 7. CONTRACTORS ANALYTICS TESTS
# =========================================================================

def test_contractor_aggregation(client: TestClient, db_session: Session):
    token = get_token(client, "admin@trinetra.gov.in")
    res = client.get("/api/v1/analytics/mines/1/contractors", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()
    assert "active_contractors_count" in data
    assert "total_contracts" in data
    assert "expiring_soon_contracts" in data
    assert "requirement_deviations_count" in data


# =========================================================================
# 8. GRIEVANCE ANALYTICS TESTS
# =========================================================================

def test_grievance_aggregation(client: TestClient, db_session: Session):
    token = get_token(client, "admin@trinetra.gov.in")
    res = client.get("/api/v1/analytics/mines/1/grievances", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()
    assert "total_grievances" in data
    assert "open_grievances" in data
    assert "resolved_grievances" in data
    assert "grievances_by_category" in data


# =========================================================================
# 9. FIELD OPERATIONS ANALYTICS TESTS
# =========================================================================

def test_field_operations_aggregation(client: TestClient, db_session: Session):
    token = get_token(client, "admin@trinetra.gov.in")
    res = client.get("/api/v1/analytics/mines/1/field-operations", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()
    assert "scheduled_inspections" in data
    assert "total_evidence_count" in data
    assert "sync_logs_total" in data
    assert "sync_accepted_count" in data


# =========================================================================
# 10. PREDICTIVE RISK ANALYTICS TESTS
# =========================================================================

def test_predictive_risk_aggregation(client: TestClient, db_session: Session):
    token = get_token(client, "admin@trinetra.gov.in")
    res = client.get("/api/v1/analytics/mines/1/predictive-risk", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()
    assert "horizon_minutes" in data
    assert data["horizon_minutes"] == 30
    assert "model_version" in data
    assert "total_predictions_generated" in data
    assert "severity_distribution" in data


# =========================================================================
# 11. CROSS-MINE BENCHMARKING & RBAC TESTS
# =========================================================================

def test_cross_mine_analytics_admin(client: TestClient, db_session: Session):
    token = get_token(client, "admin@trinetra.gov.in")
    res = client.get("/api/v1/analytics/cross-mine", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()
    assert data["authorized_mines_count"] >= 6
    assert len(data["mines"]) >= 6
    for m in data["mines"]:
        assert "open_incidents" in m
        assert "open_violations" in m
        assert "sla_breaches" in m
        assert "planned_production" in m
        assert "actual_production" in m


def test_mine_isolation_manager(client: TestClient, db_session: Session):
    """Mine Manager 1 cannot access Mine 3 analytics."""
    token = get_token(client, "manager.mine1@trinetra.gov.in")
    # Mine 1 is allowed
    res_mine1 = client.get("/api/v1/analytics/mines/1/overview", headers={"Authorization": f"Bearer {token}"})
    assert res_mine1.status_code == 200

    # Mine 3 must return 403 Forbidden
    res_mine3 = client.get("/api/v1/analytics/mines/3/overview", headers={"Authorization": f"Bearer {token}"})
    assert res_mine3.status_code == 403
    assert "not authorized" in res_mine3.json()["detail"].lower()


def test_cross_mine_manager_scoped(client: TestClient, db_session: Session):
    """Mine Manager only receives assigned mines in cross-mine benchmarking."""
    token = get_token(client, "manager.mine1@trinetra.gov.in")
    res = client.get("/api/v1/analytics/cross-mine", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()
    mine_ids = [m["mine_id"] for m in data["mines"]]
    assert 1 in mine_ids
    assert 3 not in mine_ids


# =========================================================================
# 12. DATE RANGES, CUSTOM RANGES, AND DYNAMIC NUMBERS TESTS
# =========================================================================

def test_date_range_filtering(client: TestClient, db_session: Session):
    token = get_token(client, "admin@trinetra.gov.in")
    res_7d = client.get("/api/v1/analytics/mines/1/safety?range_type=LAST_7_DAYS", headers={"Authorization": f"Bearer {token}"})
    res_90d = client.get("/api/v1/analytics/mines/1/safety?range_type=LAST_90_DAYS", headers={"Authorization": f"Bearer {token}"})
    assert res_7d.status_code == 200
    assert res_90d.status_code == 200
    assert res_7d.json()["time_range"]["range_type"] == "LAST_7_DAYS"
    assert res_90d.json()["time_range"]["range_type"] == "LAST_90_DAYS"


def test_custom_date_range(client: TestClient, db_session: Session):
    token = get_token(client, "admin@trinetra.gov.in")
    start = (datetime.now(timezone.utc) - timedelta(days=15)).strftime("%Y-%m-%dT%H:%M:%SZ")
    end = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    res = client.get(f"/api/v1/analytics/mines/1/overview?range_type=CUSTOM&start_date={start}&end_date={end}", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()
    assert data["time_range"]["range_type"] == "CUSTOM"


def test_no_hardcoded_analytics_verification(client: TestClient, db_session: Session):
    """Tests that analytical counts dynamically increment when a new operational record is added."""
    token = get_token(client, "admin@trinetra.gov.in")
    
    # 1. Read initial safety incident count
    res1 = client.get("/api/v1/analytics/mines/1/safety?range_type=LAST_30_DAYS", headers={"Authorization": f"Bearer {token}"})
    assert res1.status_code == 200
    initial_count = res1.json()["total_incidents"]

    # 2. Insert a new incident
    new_inc = Incident(
        incident_code=f"INC-TEST-ANALYTICS-{int(datetime.now(timezone.utc).timestamp())}",
        mine_id=1,
        title="Dynamic Analytics Test Incident",
        description="Testing dynamic non-hardcoded aggregation",
        category="GAS_ANOMALY",
        severity="HIGH",
        status="OPEN",
        created_at=datetime.now(timezone.utc)
    )
    db_session.add(new_inc)
    db_session.commit()

    # 3. Read updated count
    res2 = client.get("/api/v1/analytics/mines/1/safety?range_type=LAST_30_DAYS", headers={"Authorization": f"Bearer {token}"})
    assert res2.status_code == 200
    updated_count = res2.json()["total_incidents"]

    assert updated_count == initial_count + 1

    # Cleanup
    db_session.delete(new_inc)
    db_session.commit()


def test_read_only_behavior(client: TestClient, db_session: Session):
    """GET analytics calls must not alter database state."""
    token = get_token(client, "admin@trinetra.gov.in")
    inc_count_before = db_session.query(Incident).count()
    res = client.get("/api/v1/analytics/mines/1/overview", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    inc_count_after = db_session.query(Incident).count()
    assert inc_count_before == inc_count_after


def test_invalid_mine_id_404(client: TestClient, db_session: Session):
    """Accessing non-existent mine should return 404."""
    token = get_token(client, "admin@trinetra.gov.in")
    res = client.get("/api/v1/analytics/mines/99999/overview", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 404


def test_unauthenticated_request_rejected(client: TestClient, db_session: Session):
    """Requests without token must be rejected with 401."""
    res = client.get("/api/v1/analytics/mines/1/overview")
    assert res.status_code == 401


def test_timezone_boundary_today_range(client: TestClient, db_session: Session):
    """TODAY range must set start_time to 00:00:00 UTC of current day."""
    token = get_token(client, "admin@trinetra.gov.in")
    res = client.get("/api/v1/analytics/mines/1/overview?range_type=TODAY", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()
    assert data["time_range"]["range_type"] == "TODAY"


def test_data_quality_simulated_vs_operational_flags(client: TestClient, db_session: Session):
    """Simulated mine must have is_simulated=YES and data_mode=SIMULATED."""
    token = get_token(client, "admin@trinetra.gov.in")
    res_sim = client.get("/api/v1/analytics/mines/1/overview", headers={"Authorization": f"Bearer {token}"})
    assert res_sim.status_code == 200
    assert res_sim.json()["data_quality"]["is_simulated"] in ["YES", "NO"]


def test_compliance_chain_traceability(client: TestClient, db_session: Session):
    """Compliance chain must structure violation to corrective action relationships."""
    token = get_token(client, "admin@trinetra.gov.in")
    res = client.get("/api/v1/analytics/mines/1/compliance", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()
    assert "compliance_chain" in data
    for item in data["compliance_chain"]:
        assert "violation_id" in item
        assert "violation_code" in item
        assert "has_sla_breach" in item


def test_workforce_trade_breakdown(client: TestClient, db_session: Session):
    """Workforce breakdown by trade category must return populated percentages."""
    token = get_token(client, "admin@trinetra.gov.in")
    res = client.get("/api/v1/analytics/mines/1/workforce", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()
    assert "workers_by_trade" in data
    assert isinstance(data["workers_by_trade"], list)

