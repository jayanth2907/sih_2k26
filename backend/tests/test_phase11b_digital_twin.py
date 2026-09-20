import pytest
import os
import json
from app.models.mine import Mine
from app.models.real_mine_data import (
    DataProvenance,
    MineProfile,
    MineBoundary,
    MineCoordinate,
    MineSeam,
    MineClearance,
    MineDataQualityRecord
)
from app.services.spatial_transformation_service import SpatialTransformationService
from app.services.mine_service import MineService


def get_token(client, email, password="Trinetra@2026"):
    res = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, f"Login failed for {email}: {res.text}"
    return res.json()["access_token"]


# =========================================================================
# 1. SPATIAL TRANSFORMATION SERVICE UNIT TESTS
# =========================================================================

def test_spatial_transformation_origin_projection():
    """Verify projecting origin coordinates results in (0, 0)."""
    east_m, south_m = SpatialTransformationService.lat_lon_to_local_meters(23.75, 85.50, 23.75, 85.50)
    assert abs(east_m) < 0.001
    assert abs(south_m) < 0.001


def test_spatial_transformation_east_north_displacement():
    """Verify displacement increases X for East and produces negative Z for North in LTP frame."""
    # Point slightly east: delta_lon > 0
    east_m, south_m = SpatialTransformationService.lat_lon_to_local_meters(23.00, 85.01, 23.00, 85.00)
    assert east_m > 0
    assert abs(south_m) < 0.001

    # Point slightly north: delta_lat > 0, south_m should be negative (North is -Z in Three.js)
    east_m_n, south_m_n = SpatialTransformationService.lat_lon_to_local_meters(23.01, 85.00, 23.00, 85.00)
    assert abs(east_m_n) < 0.001
    assert south_m_n < 0


def test_spatial_transformation_boundary_vertices(db_session):
    """Verify polygon vertices transformation produces valid 3D polygon loop."""
    noa_mine = db_session.query(Mine).filter(Mine.code == "BLOCK-NOA-71").first()
    assert noa_mine is not None
    boundary = db_session.query(MineBoundary).filter(MineBoundary.mine_id == noa_mine.id).first()
    assert boundary is not None

    origin_lat = boundary.min_latitude or noa_mine.latitude or 20.98
    origin_lon = boundary.min_longitude or noa_mine.longitude or 85.04

    vertices_3d = SpatialTransformationService.project_boundary_polygon(
        boundary.min_latitude,
        boundary.max_latitude,
        boundary.min_longitude,
        boundary.max_longitude,
        origin_lat,
        origin_lon,
        0.0
    )
    assert len(vertices_3d) >= 4
    for v in vertices_3d:
        assert "x" in v and "y" in v and "z" in v
        assert "latitude" in v and "longitude" in v


def test_spatial_transformation_completeness_calculation(db_session):
    """Verify completeness service tags real blocks vs simulated mines accurately."""
    # 1. Real Block
    noa_mine = db_session.query(Mine).filter(Mine.code == "BLOCK-NOA-71").first()
    assert noa_mine is not None
    boundary = db_session.query(MineBoundary).filter(MineBoundary.mine_id == noa_mine.id).first()
    coords = db_session.query(MineCoordinate).filter(MineCoordinate.mine_id == noa_mine.id).all()
    seams = db_session.query(MineSeam).filter(MineSeam.mine_id == noa_mine.id).all()

    comp_real = SpatialTransformationService.compute_data_completeness(noa_mine, boundary, coords, seams)
    assert comp_real["geometry_status"] in ["APPROXIMATE", "SOURCE_DERIVED"]
    assert comp_real["is_simulated"] == "NO"
    assert comp_real["underground_workings"] == "NOT_DOCUMENTED"
    assert comp_real["boundary"] == "AVAILABLE"

    # 2. Simulated Mine
    bds_mine = db_session.query(Mine).filter(Mine.code == "MINE-BDS-04").first()
    assert bds_mine is not None
    comp_sim = SpatialTransformationService.compute_data_completeness(bds_mine, None, [], [])
    assert comp_sim["geometry_status"] == "SIMULATED"
    assert comp_sim["is_simulated"] == "YES"
    assert comp_sim["underground_workings"] == "AVAILABLE"


# =========================================================================
# 2. DIGITAL TWIN API ENDPOINT TESTS (REAL MINE VS SIMULATED MINE)
# =========================================================================

def test_digital_twin_endpoint_real_mine_noa_71(client, db_session):
    """Verify /api/v1/mines/{id}/digital-twin returns rich spatial & provenance foundation for BLOCK-NOA-71."""
    token = get_token(client, "admin@trinetra.gov.in")
    noa_mine = db_session.query(Mine).filter(Mine.code == "BLOCK-NOA-71").first()
    assert noa_mine is not None

    res = client.get(
        f"/api/v1/mines/{noa_mine.id}/digital-twin",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 200, res.text
    data = res.json()

    # Mine metadata
    assert data["mine"]["code"] == "BLOCK-NOA-71"
    assert data["profile"] is not None
    assert "North of Arkhapal" in data["profile"]["official_name"]

    # Spatial reference
    sref = data["spatial_reference"]
    assert sref is not None
    assert sref["source_crs"] in ["WGS84_AND_COALGRID", "EPSG:4326 (WGS84)"]
    assert "LOCAL_MINE_FRAME" in sref["visualization_crs"] or "LOCAL_TANGENT_PLANE" in sref["visualization_crs"]
    assert sref["unit"] == "meters"
    assert sref["origin_reference"]["latitude"] is not None

    # Boundary with 3D vertices
    bnd = data["boundary"]
    assert bnd is not None
    assert bnd["geometry_status"] == "APPROXIMATE"
    assert len(bnd["vertices_3d"]) >= 4
    for v in bnd["vertices_3d"]:
        assert "x" in v and "y" in v and "z" in v

    # Cardinal Coordinates
    coords = data["coordinates"]
    assert isinstance(coords, list)
    assert len(coords) >= 4
    labels = [c["point_label"] for c in coords]
    assert "A" in labels and "B" in labels

    # Seams Stratigraphy
    seams = data["seams"]
    assert isinstance(seams, list)
    assert len(seams) >= 1
    seam_names = [s["seam_name"] for s in seams]
    assert len(seam_names) > 0

    # Completeness flags
    comp = data["data_completeness"]
    assert comp is not None
    assert comp["geometry_status"] == "APPROXIMATE"
    assert comp["underground_workings"] == "NOT_DOCUMENTED"


def test_digital_twin_endpoint_real_mine_choritand_66(client, db_session):
    """Verify /api/v1/mines/{id}/digital-twin returns rich spatial & provenance foundation for BLOCK-CT-66."""
    token = get_token(client, "admin@trinetra.gov.in")
    ct_mine = db_session.query(Mine).filter(Mine.code == "BLOCK-CT-66").first()
    assert ct_mine is not None

    res = client.get(
        f"/api/v1/mines/{ct_mine.id}/digital-twin",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 200, res.text
    data = res.json()

    assert data["mine"]["code"] == "BLOCK-CT-66"
    assert data["profile"] is not None
    assert data["boundary"] is not None
    assert data["boundary"]["geometry_status"] == "SOURCE_DERIVED"
    assert len(data["boundary"]["vertices_3d"]) >= 4


def test_digital_twin_endpoint_simulated_mine_preservation(client, db_session):
    """Verify /api/v1/mines/{id}/digital-twin preserves 100% of simulated demo mine structure for MINE-BDS-04."""
    token = get_token(client, "admin@trinetra.gov.in")
    bds_mine = db_session.query(Mine).filter(Mine.code == "MINE-BDS-04").first()
    assert bds_mine is not None

    res = client.get(
        f"/api/v1/mines/{bds_mine.id}/digital-twin",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 200, res.text
    data = res.json()

    # Preserved operational assets
    assert data["mine"]["code"] == "MINE-BDS-04"
    assert len(data["levels"]) > 0
    assert len(data["zones"]) > 0
    assert len(data["sensors"]) > 0
    assert len(data["cameras"]) > 0
    assert len(data["equipment"]) > 0

    # Tagged as SIMULATED
    assert data["data_completeness"]["geometry_status"] == "SIMULATED"
    assert data["data_completeness"]["is_simulated"] == "YES"


# =========================================================================
# 3. RBAC & TENANCY TESTS FOR DIGITAL TWIN
# =========================================================================

def test_digital_twin_rbac_access_control(client, db_session):
    """Verify role-based access control and mine tenant restrictions on Digital Twin."""
    # Regulator access
    regulator_token = get_token(client, "regulator@dgms.gov.in")
    noa_mine = db_session.query(Mine).filter(Mine.code == "BLOCK-NOA-71").first()

    res = client.get(
        f"/api/v1/mines/{noa_mine.id}/digital-twin",
        headers={"Authorization": f"Bearer {regulator_token}"}
    )
    assert res.status_code == 200

    # Unauthenticated access rejected
    res_unauth = client.get(f"/api/v1/mines/{noa_mine.id}/digital-twin")
    assert res_unauth.status_code == 401
