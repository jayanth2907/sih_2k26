import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.mine import Mine
from app.models.user import User
from app.models.real_mine_data import MineBoundary, MineCoordinate, MineProfile, DataProvenance
from app.models.governance_task import GovernanceTask
from app.models.audit import AuditEvent
from app.services.spatial_context_service import SpatialContextService, spatial_context_service
from app.copilot.tool_registry import tool_registry

def get_token(client: TestClient, email: str = "admin@trinetra.gov.in", password: str = "Trinetra@2026") -> str:
    res = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, f"Login failed for {email}: {res.text}"
    return res.json()["access_token"]


def test_spatial_proximity_and_haversine_calculations():
    """Verify Great-Circle Haversine distance calculations on WGS84 coordinates."""
    # Equator 1 degree longitude is ~111.32 km
    dist_1deg = SpatialContextService.haversine_distance_meters(0.0, 0.0, 0.0, 1.0)
    assert 111000 <= dist_1deg <= 112000

    # Distance to identical point is 0
    dist_zero = SpatialContextService.haversine_distance_meters(23.8142, 86.4215, 23.8142, 86.4215)
    assert dist_zero == 0.0

    # Distance between two nearby coordinates in Jharia coalfield (~1.5 km)
    dist_local = SpatialContextService.haversine_distance_meters(23.8100, 86.4200, 23.8200, 86.4300)
    assert 1000 <= dist_local <= 2000


def test_boundary_geofencing_containment(db_session: Session):
    """Verify geo-fencing correctly identifies inside vs outside documented bounding box."""
    mine = db_session.query(Mine).first()
    assert mine is not None

    # Synthetic boundary for testing
    boundary = MineBoundary(
        mine_id=mine.id,
        boundary_type="LIMITING_BOX",
        geometry_status="SOURCE_DERIVED",
        min_latitude=20.0,
        max_latitude=21.0,
        min_longitude=85.0,
        max_longitude=86.0
    )

    # Inside point
    inside_res = SpatialContextService.check_boundary_containment(20.5, 85.5, [boundary])
    assert inside_res["status"] == "INSIDE_DOCUMENTED_BOUNDARY"
    assert inside_res["is_inside"] is True

    # Outside point
    outside_res = SpatialContextService.check_boundary_containment(22.0, 87.0, [boundary])
    assert outside_res["status"] == "OUTSIDE_DOCUMENTED_BOUNDARY_REVIEW"
    assert outside_res["is_inside"] is False

    # Empty boundary list
    unknown_res = SpatialContextService.check_boundary_containment(20.5, 85.5, [])
    assert unknown_res["status"] == "UNKNOWN"
    assert unknown_res["is_inside"] is None


def test_mine_map_retrieval_api(client: TestClient, db_session: Session):
    """Verify full 2D GIS map package retrieval with boundaries, coordinates, and trust metrics."""
    token = get_token(client)
    mine = db_session.query(Mine).first()
    assert mine is not None

    res = client.get(f"/api/v1/gis/mines/{mine.id}/map", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()

    # Mine metadata
    assert "mine" in data
    assert data["mine"]["id"] == mine.id
    assert "geometry_status" in data["mine"]

    # Boundaries and GeoJSON polygon ring
    assert "boundaries" in data
    assert isinstance(data["boundaries"], list)

    # Source coordinates
    assert "source_coordinates" in data
    assert isinstance(data["source_coordinates"], list)

    # Operational overlays
    assert "operational_features" in data
    assert "risk_hotspots" in data
    assert "trust_metrics" in data
    assert "dashboard_stats" in data

    # Trust metrics counts
    metrics = data["trust_metrics"]
    assert metrics["source_derived_count"] >= 0
    assert metrics["simulated_count"] >= 0


def test_north_of_arkhapal_approximate_status(client: TestClient, db_session: Session):
    """Verify that North of Arkhapal retains its official APPROXIMATE geometry status."""
    token = get_token(client)
    arkhapal_profile = db_session.query(MineProfile).filter(
        MineProfile.official_name.ilike("%arkhapal%") | MineProfile.display_name.ilike("%arkhapal%")
    ).first()

    if arkhapal_profile:
        mine_id = arkhapal_profile.mine_id
        res = client.get(f"/api/v1/gis/mines/{mine_id}/map", headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 200
        data = res.json()
        assert data["mine"]["geometry_status"] == "APPROXIMATE"
        assert data["trust_metrics"]["approximate_count"] >= 1


def test_operational_vs_simulated_tagging(client: TestClient, db_session: Session):
    """Verify that operational features are strictly tagged with explicit trust categories."""
    token = get_token(client)
    mine = db_session.query(Mine).first()

    res = client.get(f"/api/v1/gis/mines/{mine.id}/map", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    features = res.json()["operational_features"]

    for f in features:
        if f["feature_type"] == "SENSOR":
            assert f["trust_badge"] == "SIMULATED"
        elif f["feature_type"] == "CMSMS":
            assert f["trust_badge"] == "SIMULATED"
        elif f["feature_type"] in ["INCIDENT", "ALERT", "INSPECTION", "GOVERNANCE_TASK", "ENVIRONMENTAL"]:
            assert f["trust_badge"] == "OPERATIONAL"


def test_spatial_risk_aggregation_api(client: TestClient, db_session: Session):
    """Verify spatial risk aggregation endpoint returns risk score (0-100) and risk band."""
    token = get_token(client)
    mine = db_session.query(Mine).first()

    res = client.get(f"/api/v1/gis/mines/{mine.id}/risk", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    hotspots = res.json()
    assert len(hotspots) >= 1

    for h in hotspots:
        assert 0.0 <= h["risk_score"] <= 100.0
        assert h["risk_band"] in ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
        assert len(h["explanation"]) > 0
        assert len(h["recommended_action"]) > 0


def test_spatial_context_endpoint(client: TestClient, db_session: Session):
    """Verify /gis/mines/{id}/context returns nearest operational objects and boundary status."""
    token = get_token(client)
    mine = db_session.query(Mine).first()
    lat = mine.latitude or 23.5000
    lon = mine.longitude or 85.5000

    res = client.get(
        f"/api/v1/gis/mines/{mine.id}/context?latitude={lat}&longitude={lon}",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 200
    data = res.json()
    assert "boundary_status" in data
    assert "nearest_sensors" in data
    assert "nearest_incidents" in data
    assert "nearest_inspections" in data


def test_gis_field_task_creation_and_audit(client: TestClient, db_session: Session):
    """Verify creating a field inspection task from GIS hotspot emits an AuditEvent."""
    token = get_token(client)
    mine = db_session.query(Mine).first()

    res = client.post(
        f"/api/v1/gis/features/hotspot-pred-1/field-task?mine_id={mine.id}&title=Verify+Elevated+Methane+Risk",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "SUCCESS"
    assert "task_id" in data

    # Verify task in DB is tagged as spatial recommendation
    task = db_session.query(GovernanceTask).filter(GovernanceTask.id == data["task_id"]).first()
    assert task is not None
    assert "[SPATIAL RECOMMENDATION]" in task.title
    assert task.source_resource_type == "GIS_SPATIAL_HOTSPOT"

    # Verify audit log event
    audit = db_session.query(AuditEvent).filter(
        AuditEvent.action == "GIS_FIELD_TASK_CREATED",
        AuditEvent.resource_id == str(task.id)
    ).first()
    assert audit is not None


def test_copilot_spatial_risk_context_tool(client: TestClient, db_session: Session):
    """Test get_spatial_risk_context tool through Copilot tool registry."""
    admin_user = db_session.query(User).filter(User.email == "admin@trinetra.gov.in").first()
    assert admin_user is not None
    mine = db_session.query(Mine).first()

    tool_res = tool_registry.execute_tool(
        "get_spatial_risk_context",
        db=db_session,
        mine_id=mine.id,
        user=admin_user,
        latitude=mine.latitude,
        longitude=mine.longitude,
        feature_id="hotspot-test-01"
    )
    assert "mine_id" in tool_res
    assert "boundary_status" in tool_res
    assert "nearest_sensors" in tool_res
    assert "active_spatial_risk_hotspots" in tool_res


def test_mine_isolation_and_rbac_on_gis(client: TestClient, db_session: Session):
    """Verify that a user without access to Mine B receives HTTP 403 when requesting GIS data."""
    admin_token = get_token(client)
    mines = db_session.query(Mine).all()
    if len(mines) < 2:
        pytest.skip("Need at least 2 mines for isolation test")

    mine1 = mines[0]
    mine2 = mines[1]

    manager_user = db_session.query(User).filter(User.email == "manager.mine1@trinetra.gov.in").first()
    if not manager_user:
        pytest.skip("Manager user not seeded")

    mgr_token = get_token(client, email=manager_user.email)

    # Manager querying assigned mine succeeds
    mgr_res1 = client.get(f"/api/v1/gis/mines/{mine1.id}/map", headers={"Authorization": f"Bearer {mgr_token}"})
    assert mgr_res1.status_code == 200

    # Manager querying unassigned mine is rejected with 403
    mgr_res2 = client.get(f"/api/v1/gis/mines/{mine2.id}/map", headers={"Authorization": f"Bearer {mgr_token}"})
    assert mgr_res2.status_code == 403


def test_unified_gis_search(client: TestClient, db_session: Session):
    """Verify unified GIS search returns coordinates, sensors, and incidents."""
    token = get_token(client)
    mine = db_session.query(Mine).first()

    res = client.get(f"/api/v1/gis/search?q={mine.name[:4]}", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()
    assert data["results_count"] >= 1
    assert any(item["mine_id"] == mine.id for item in data["items"])


def test_gis_overview_multi_mine_and_rbac(client: TestClient, db_session: Session):
    """Verify multi-mine overview endpoint returns authorized mines, risk scores, and isolation."""
    admin_token = get_token(client, email="admin@trinetra.gov.in")
    all_mines = db_session.query(Mine).all()
    assert len(all_mines) >= 1

    # 1. Admin gets all authorized mines
    res_admin = client.get("/api/v1/gis/overview", headers={"Authorization": f"Bearer {admin_token}"})
    assert res_admin.status_code == 200
    data_admin = res_admin.json()
    assert data_admin["total_authorized_mines"] == len(all_mines)
    assert len(data_admin["mines"]) == len(all_mines)

    for m_item in data_admin["mines"]:
        assert "id" in m_item
        assert "name" in m_item
        assert "latitude" in m_item
        assert "longitude" in m_item
        assert "current_risk_score" in m_item
        assert m_item["current_risk_band"] in ("CRITICAL", "HIGH", "MED", "MEDIUM", "LOW")
        assert "total_sensors" in m_item
        assert "online_sensors" in m_item
        assert "open_incidents_count" in m_item
        assert "open_field_tasks_count" in m_item
        assert "simplified_boundary" in m_item

    # 2. Manager RBAC isolation test
    manager_user = db_session.query(User).filter(User.email == "manager.mine1@trinetra.gov.in").first()
    if manager_user:
        mgr_token = get_token(client, email=manager_user.email)
        res_mgr = client.get("/api/v1/gis/overview", headers={"Authorization": f"Bearer {mgr_token}"})
        assert res_mgr.status_code == 200
        data_mgr = res_mgr.json()
        # Manager should only see assigned mine(s)
        assert data_mgr["total_authorized_mines"] <= len(all_mines)
        for m_item in data_mgr["mines"]:
            assert m_item["id"] == 1  # Assigned to mine 1

