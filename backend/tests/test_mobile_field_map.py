import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.mine import Mine
from app.models.real_mine_data import MineProfile, MineBoundary
from app.models.field_operation import FieldInspection
from app.models.sensor import Sensor
from app.models.incident import Incident
from app.models.risk import RiskScore

def get_token(client: TestClient, email: str = "inspector.dgms@trinetra.gov.in", password: str = "Trinetra@2026") -> str:
    res = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, f"Login failed for {email}: {res.text}"
    return res.json()["access_token"]

def get_manager_token(client: TestClient, email: str = "manager.mine1@trinetra.gov.in", password: str = "Trinetra@2026") -> str:
    res = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, f"Login failed for {email}: {res.text}"
    return res.json()["access_token"]

def test_01_authorized_mobile_map_retrieval(client: TestClient, db_session: Session):
    """Verify authorized inspector can retrieve complete 2D GIS map package for their assigned mine."""
    token = get_token(client, "inspector.dgms@trinetra.gov.in")
    mine = db_session.query(Mine).filter(Mine.code == "MINE-BDS-04").first()
    assert mine is not None

    res = client.get(f"/api/v1/gis/mines/{mine.id}/map", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()
    assert data["mine"]["id"] == mine.id
    assert data["mine"]["code"] == "MINE-BDS-04"
    assert "boundaries" in data
    assert "operational_features" in data
    assert "risk_hotspots" in data
    assert len(data["boundaries"]) > 0

def test_02_unauthorized_map_access_rejected(client: TestClient, db_session: Session):
    """Verify unauthenticated requests to GIS map are rejected with 401."""
    mine = db_session.query(Mine).filter(Mine.code == "MINE-BDS-04").first()
    res = client.get(f"/api/v1/gis/mines/{mine.id}/map")
    assert res.status_code in [401, 403]

def test_03_cross_mine_map_isolation(client: TestClient, db_session: Session):
    """Verify a scoped mine manager cannot access another unauthorized mine's spatial map."""
    mgr_token = get_manager_token(client, "manager.mine1@trinetra.gov.in") # Mine 1
    # Attempt to query Mine 2 (or a non-assigned real mine)
    unassigned_mine = db_session.query(Mine).filter(Mine.code == "REAL-JOG-01").first()
    if unassigned_mine:
        res = client.get(f"/api/v1/gis/mines/{unassigned_mine.id}/map", headers={"Authorization": f"Bearer {mgr_token}"})
        assert res.status_code == 403

def test_04_mine_boundary_geojson_integrity(client: TestClient, db_session: Session):
    """Verify boundary features contain valid GeoJSON rings and geometry status."""
    token = get_token(client, "inspector.dgms@trinetra.gov.in")
    mine = db_session.query(Mine).filter(Mine.code == "MINE-BDS-04").first()

    res = client.get(f"/api/v1/gis/mines/{mine.id}/map", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    boundaries = res.json()["boundaries"]
    assert len(boundaries) > 0

    first_boundary = boundaries[0]
    assert "coordinates_geojson" in first_boundary
    geojson_ring = first_boundary["coordinates_geojson"]
    assert isinstance(geojson_ring, list)
    assert len(geojson_ring) >= 3 # Valid polygon
    # First point should equal last point to form a closed ring
    assert geojson_ring[0] == geojson_ring[-1]

def test_05_risk_hotspots_current_vs_predictive_distinction(client: TestClient, db_session: Session):
    """Verify risk hotspots provide scores, risk bands, and predictive escalation factors."""
    token = get_token(client, "inspector.dgms@trinetra.gov.in")
    mine = db_session.query(Mine).filter(Mine.code == "MINE-BDS-04").first()

    res = client.get(f"/api/v1/gis/mines/{mine.id}/map", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    risk_hotspots = res.json()["risk_hotspots"]

    if len(risk_hotspots) > 0:
        spot = risk_hotspots[0]
        assert "risk_score" in spot
        assert "risk_band" in spot
        assert spot["risk_band"] in ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
        assert "contributing_factors" in spot
        assert isinstance(spot["contributing_factors"], list)

def test_06_operational_features_sensors_and_incidents(client: TestClient, db_session: Session):
    """Verify operational features contain structured sensor, incident, and task telemetry."""
    token = get_token(client, "inspector.dgms@trinetra.gov.in")
    mine = db_session.query(Mine).filter(Mine.code == "MINE-BDS-04").first()

    res = client.get(f"/api/v1/gis/mines/{mine.id}/map", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    features = res.json()["operational_features"]

    for feat in features:
        assert "feature_type" in feat
        assert "latitude" in feat
        assert "longitude" in feat
        assert "trust_badge" in feat
        assert feat["trust_badge"] in ["SOURCE_DERIVED", "APPROXIMATE", "OPERATIONAL", "SIMULATED", "NOT_DOCUMENTED"]

def test_07_spatial_context_proximity_query(client: TestClient, db_session: Session):
    """Verify spatial context endpoint resolves nearest zone, assets, and geofence containment."""
    token = get_token(client, "inspector.dgms@trinetra.gov.in")
    mine = db_session.query(Mine).filter(Mine.code == "MINE-BDS-04").first()

    res = client.get(
        f"/api/v1/gis/mines/{mine.id}/context?latitude={mine.latitude or 23.7957}&longitude={mine.longitude or 86.4304}",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 200
    ctx = res.json()
    assert "target_coordinate" in ctx
    assert "boundary_status" in ctx
    assert "nearest_sensors" in ctx
    assert "total_entities_nearby" in ctx

def test_08_source_derived_real_mine_boundary_trust(client: TestClient, db_session: Session):
    """Verify real source-derived mines return SOURCE_DERIVED trust status and official provenance."""
    token = get_token(client, "inspector.dgms@trinetra.gov.in")
    real_mine = db_session.query(Mine).filter(Mine.data_status == "SOURCE_DERIVED_REAL").first()
    if real_mine:
        res = client.get(f"/api/v1/gis/mines/{real_mine.id}/map", headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 200
        data = res.json()
        assert data["mine"]["data_status"] == "SOURCE_DERIVED_REAL"
        assert not data["mine"]["is_simulated"]

def test_09_gis_unified_search_endpoint(client: TestClient, db_session: Session):
    """Verify unified GIS search returns searchable spatial entities across zones, sensors, and tasks."""
    token = get_token(client, "inspector.dgms@trinetra.gov.in")
    mine = db_session.query(Mine).filter(Mine.code == "MINE-BDS-04").first()

    res = client.get(f"/api/v1/gis/search?q=Longwall&mine_id={mine.id}", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    search_data = res.json()
    assert "query" in search_data
    assert "items" in search_data
    assert "results_count" in search_data
    assert isinstance(search_data["items"], list)
    assert search_data["results_count"] > 0
