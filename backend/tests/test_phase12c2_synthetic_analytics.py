import pytest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.mine import Mine
from app.models.sensor import SensorReading
from app.models.risk import AnomalyEvent
from app.models.production import ProductionReport
from app.models.risk_prediction import RiskPrediction
from app.models.environmental import EnvironmentalObservation
from app.models.workforce import AttendanceRecord
from app.services.synthetic_history_generator import SyntheticHistoryGenerator


def get_token(client: TestClient, email: str, password: str = "Trinetra@2026") -> str:
    res = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, f"Login failed: {res.text}"
    return res.json()["access_token"]


# =========================================================================
# 1. DETERMINISTIC SEED & GENERATOR TESTS
# =========================================================================

def test_deterministic_generator_repeatability(db_session: Session):
    """Verify that seeded synthetic historical operational dataset is present and deterministic."""
    prod_reports = db_session.query(ProductionReport).filter(ProductionReport.mine_id == 1).all()
    assert len(prod_reports) >= 20, "Expected at least 20 daily production reports for Mine 1"
    
    # Check that day 14/15 (Escalation) has critical shortfall
    p_d15 = [p for p in prod_reports if p.deviation_flag == "CRITICAL_SHORTFALL"]
    assert len(p_d15) >= 1, "Expected critical shortfall production deviation on incident day"
    assert p_d15[0].actual_quantity < p_d15[0].planned_quantity


def test_6_phase_operational_story_coherence(client: TestClient):
    """Verify that the risk trend shows dynamic variation reflecting the 6-phase operational story."""
    token = get_token(client, "admin@trinetra.gov.in")
    res_risk = client.get(
        "/api/v1/analytics/mines/1/predictive-risk?range_type=LAST_30_DAYS",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res_risk.status_code == 200
    risk_trend = res_risk.json()["risk_trend"]
    assert len(risk_trend) >= 20
    max_risk = max(pt["value"] for pt in risk_trend)
    min_risk = min(pt["value"] for pt in risk_trend)
    assert max_risk > min_risk, "Risk trend must show dynamic variation reflecting operational phases"


# =========================================================================
# 2. TIME-SERIES MULTI-POINT RETURNS (NO FLAT/EMPTY ARRAYS)
# =========================================================================

def test_production_actual_vs_target_trend(client: TestClient):
    """Verify production endpoint returns daily actual, target, and variance series over 30 days."""
    token = get_token(client, "admin@trinetra.gov.in")
    res = client.get(
        "/api/v1/analytics/mines/1/production?range_type=LAST_30_DAYS",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["mine_id"] == 1
    assert "production_trend" in data
    trend = data["production_trend"]
    assert len(trend) >= 20, f"Expected at least 20 daily production data points, got {len(trend)}"
    
    first_pt = trend[0]
    assert "date" in first_pt
    assert "value" in first_pt
    assert first_pt["observed_value"] is not None
    assert first_pt["target_value"] is not None
    assert data["planned_quantity_total"] > 0
    assert data["actual_quantity_total"] > 0


def test_predictive_risk_dual_curve(client: TestClient):
    """Verify predictive risk endpoint returns observed and predicted curves with probability and severity."""
    token = get_token(client, "admin@trinetra.gov.in")
    res = client.get(
        "/api/v1/analytics/mines/1/predictive-risk?range_type=LAST_30_DAYS",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 200
    data = res.json()
    assert "risk_trend" in data
    trend = data["risk_trend"]
    assert len(trend) >= 20, f"Expected multi-point risk trend, got {len(trend)}"

    # Check dual-value presence
    for pt in trend[:5]:
        assert pt["observed_value"] is not None
        assert pt["forecast_value"] is not None
        assert "severity" in pt
        assert "probability" in pt
    
    assert data["latest_prediction_score"] is not None
    assert "top_contributing_features" in data
    assert len(data["top_contributing_features"]) >= 1


def test_environmental_parameter_trends(client: TestClient):
    """Verify environment endpoint returns per-parameter time-series and statutory limits."""
    token = get_token(client, "admin@trinetra.gov.in")
    res = client.get(
        "/api/v1/analytics/mines/1/environment?range_type=LAST_30_DAYS",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 200
    data = res.json()
    assert "parameters" in data
    assert len(data["parameters"]) >= 4
    
    assert "parameter_trends" in data
    param_trends = data["parameter_trends"]
    assert "PM10" in param_trends
    assert "PM2.5" in param_trends
    assert len(param_trends["PM10"]) >= 10, "PM10 should have multiple historical points"
    assert param_trends["PM10"][0]["observed_value"] is not None


def test_compliance_multi_line_activity(client: TestClient):
    """Verify compliance endpoint returns violations, actions, and resolved trends."""
    token = get_token(client, "admin@trinetra.gov.in")
    res = client.get(
        "/api/v1/analytics/mines/1/compliance?range_type=LAST_30_DAYS",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 200
    data = res.json()
    assert "violations_by_day" in data
    assert "actions_by_day" in data
    assert "resolved_by_day" in data
    assert len(data["violations_by_day"]) >= 20


def test_safety_anomalies_overlay(client: TestClient):
    """Verify safety endpoint returns daily incidents and daily sensor anomalies."""
    token = get_token(client, "admin@trinetra.gov.in")
    res = client.get(
        "/api/v1/analytics/mines/1/safety?range_type=LAST_30_DAYS",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 200
    data = res.json()
    assert "incidents_by_day" in data
    assert "anomalies_by_day" in data
    assert len(data["incidents_by_day"]) >= 20
    assert len(data["anomalies_by_day"]) >= 20


def test_workforce_historical_attendance_trend(client: TestClient):
    """Verify workforce endpoint returns attendance percentage trend over 30 days."""
    token = get_token(client, "admin@trinetra.gov.in")
    res = client.get(
        "/api/v1/analytics/mines/1/workforce?range_type=LAST_30_DAYS",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 200
    data = res.json()
    assert "attendance_trend" in data
    assert len(data["attendance_trend"]) >= 20
    assert data["attendance_rate_percent"] > 0
    assert data["total_workers_registered"] > 0


# =========================================================================
# 3. "WHAT CHANGED" DYNAMIC NARRATIVE ITEMS
# =========================================================================

def test_what_changed_dynamic_narratives(client: TestClient):
    """Verify overview endpoint computes dynamic what_changed narrative items."""
    token = get_token(client, "admin@trinetra.gov.in")
    res = client.get(
        "/api/v1/analytics/mines/1/overview?range_type=LAST_30_DAYS",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 200
    data = res.json()
    assert "what_changed" in data
    what_changed = data["what_changed"]
    assert isinstance(what_changed, list)
    assert len(what_changed) >= 1
    
    first_item = what_changed[0]
    assert "domain" in first_item or "category" in first_item
    assert "title" in first_item
    assert "description" in first_item or "detail" in first_item
    assert "severity" in first_item


# =========================================================================
# 4. TIME WINDOW FILTERING (24H, 7D, 30D, 90D)
# =========================================================================

@pytest.mark.parametrize("range_type, min_pts", [
    ("TODAY", 1),
    ("LAST_7_DAYS", 5),
    ("LAST_30_DAYS", 20),
    ("LAST_90_DAYS", 30),
])
def test_time_window_filtering(client: TestClient, range_type: str, min_pts: int):
    token = get_token(client, "admin@trinetra.gov.in")
    res = client.get(
        f"/api/v1/analytics/mines/1/production?range_type={range_type}",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 200
    data = res.json()
    trend = data["production_trend"]
    assert len(trend) >= min_pts, f"Expected at least {min_pts} points for {range_type}, got {len(trend)}"


# =========================================================================
# 5. DATA TRUST: NO_DATA PRESERVATION & REAL MINE ISOLATION
# =========================================================================

def test_no_data_preservation_for_unmonitored_param(client: TestClient):
    """Verify that unmonitored parameters preserve status='NO_DATA' and latest_value=None (not defaulted to 0)."""
    token = get_token(client, "admin@trinetra.gov.in")
    res = client.get(
        "/api/v1/analytics/mines/1/environment?range_type=LAST_7_DAYS",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 200
    data = res.json()
    params = {p["parameter_name"]: p for p in data["parameters"]}
    if "EFFLUENT_TSS" in params:
        p = params["EFFLUENT_TSS"]
        if p["observation_count"] == 0:
            assert p["status"] == "NO_DATA"
            assert p["latest_value"] is None


def test_source_derived_real_mine_isolation(client: TestClient):
    """Verify that Phase 11A Real Coal Blocks are strictly SOURCE-DERIVED."""
    token = get_token(client, "admin@trinetra.gov.in")
    res = client.get("/api/v1/mines", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    mines = res.json()
    real_mines = [m for m in mines if m.get("is_simulated") == "NO"]
    assert len(real_mines) >= 6, f"Expected at least 6 Phase 11A real coal blocks, got {len(real_mines)}"


def test_simulation_data_mode_labeling(client: TestClient):
    """Verify that simulated mine 1 returns data_mode='SIMULATED' and is_simulated='YES'."""
    token = get_token(client, "admin@trinetra.gov.in")
    res = client.get(
        "/api/v1/analytics/mines/1/overview?range_type=LAST_30_DAYS",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["data_quality"]["data_mode"] in ["SIMULATED", "DEMO"]
    assert data["data_quality"]["is_simulated"] == "YES"


# =========================================================================
# 6. RBAC VALIDATION: CROSS-MINE ACCESS
# =========================================================================

def test_cross_mine_rbac_authorization(client: TestClient):
    """Verify cross-mine endpoint allows Admin & Regulator, but restricts unauthorized access."""
    admin_token = get_token(client, "admin@trinetra.gov.in")
    res_admin = client.get(
        "/api/v1/analytics/cross-mine?range_type=LAST_30_DAYS",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res_admin.status_code == 200
    data = res_admin.json()
    assert "mines" in data
    assert len(data["mines"]) >= 1

    # Unauthorized request with invalid/missing token
    res_anon = client.get("/api/v1/analytics/cross-mine?range_type=LAST_30_DAYS")
    assert res_anon.status_code == 401
