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
from app.services.real_mine_ingestion_service import RealMineIngestionService, compute_sha256, DOCUMENTS_DIR
from app.services.real_mine_validator import RealMineValidator
from app.core.security import create_access_token

def get_token(client, email, password="Trinetra@2026"):
    res = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, f"Login failed for {email}: {res.text}"
    return res.json()["access_token"]


# =========================================================================
# 1. DOCUMENT HASH & PROVENANCE INTEGRITY
# =========================================================================

def test_document_hash_generation():
    """Verify SHA-256 hash generation on real source documents."""
    doc_filenames = [
        "Mine_SUMMARY_66_Choritand_Tilaya.pdf",
        "Mine_Summary_67_Jogeshwar_Coal_Block.pdf",
        "Mine_Summary_68_Rabodh.pdf",
        "Mine_Summary_69_Rohne.pdf",
        "Mine_Summary_70_Urtan_North.pdf",
        "Mine_Summary_71_NORTH_OF_ARKHAPAL_Block.pdf"
    ]
    for fn in doc_filenames:
        file_path = os.path.join(DOCUMENTS_DIR, fn)
        assert os.path.exists(file_path), f"Source document missing: {fn}"
        h = compute_sha256(file_path)
        assert len(h) == 64, f"Invalid SHA-256 length for {fn}"
        assert all(c in "0123456789abcdef" for c in h)

def test_provenance_records_created(db_session):
    """Verify DataProvenance records contain document hashes, page numbers, and authority levels."""
    provenances = db_session.query(DataProvenance).all()
    assert len(provenances) >= 6
    for p in provenances:
        assert p.document_title is not None
        assert p.document_hash is not None
        assert len(p.document_hash) == 64
        assert p.page_number is not None and p.page_number >= 1
        assert p.authority_level in ["TIER_1_OFFICIAL_REGULATORY", "TIER_2_OFFICIAL_MINE_BLOCK", "TIER_3_TRINETRA_OPERATIONAL", "TIER_4_SIMULATED_DEMO"]
        assert p.data_status in ["SOURCE_DERIVED", "APPROXIMATE", "SCHEMATIC", "SIMULATED", "USER_ENTERED", "UNKNOWN"]

def test_ingestion_idempotency(db_session):
    """Verify re-running ingestion does not create duplicate mines or corrupt relationships."""
    initial_mine_count = db_session.query(Mine).count()
    svc = RealMineIngestionService(db_session)
    reports = svc.ingest_all()
    assert len(reports) == 6
    final_mine_count = db_session.query(Mine).count()
    assert initial_mine_count == final_mine_count

# =========================================================================
# 2. SIX REAL COAL BLOCKS DATA TRACEABILITY
# =========================================================================

def test_choritand_tilaya_data_integrity(db_session):
    """Verify authentic facts for Choritand Tilaya Coal Block (Page 1-4)."""
    mine = db_session.query(Mine).filter(Mine.code == "BLOCK-CT-66").first()
    assert mine is not None
    assert mine.is_simulated == "NO"
    assert mine.data_status == "SOURCE_DERIVED"

    profile = db_session.query(MineProfile).filter(MineProfile.mine_id == mine.id).first()
    assert profile is not None
    assert profile.official_name == "Choritand Tilaya Coal Block"
    assert profile.coalfield == "West Bokaro Coalfield"
    assert profile.state == "Jharkhand"
    assert profile.district == "Bokaro"
    assert profile.geological_block_area_sq_km == 2.42
    assert profile.mining_lease_area_ha == 242.0
    assert profile.forest_area_ha == 127.35
    assert profile.non_forest_area_ha == 172.38
    assert profile.total_geological_reserve_mt == 97.035
    assert profile.total_extractable_reserve_mt == 9.552
    assert profile.target_capacity_mtpa == 0.78
    assert "G9" in profile.average_grade_documented
    assert profile.provenance.page_number == 1
    assert profile.provenance.document_filename == "Mine_SUMMARY_66_Choritand_Tilaya.pdf"

    # Seams
    seams = db_session.query(MineSeam).filter(MineSeam.mine_id == mine.id).all()
    assert len(seams) == 13
    seam_x = next(s for s in seams if s.seam_name == "X")
    assert seam_x.geological_reserve_mt == 7.826
    assert seam_x.extractable_reserve_mt == 5.81
    assert seam_x.mining_method == "OC"

    # Clearances
    clearances = db_session.query(MineClearance).filter(MineClearance.mine_id == mine.id).all()
    assert len(clearances) == 5
    mp_clear = next(c for c in clearances if c.clearance_type == "MINE_PLAN")
    assert mp_clear.status == "APPROVED"
    assert mp_clear.reference_number == "13016/33I/2009-CA-I"

def test_jogeshwar_data_integrity(db_session):
    """Verify authentic facts for Jogeshwar Coal Block (Page 1-4)."""
    mine = db_session.query(Mine).filter(Mine.code == "BLOCK-JOG-67").first()
    assert mine is not None
    profile = mine.profile
    assert profile.geological_block_area_sq_km == 2.70
    assert profile.total_geological_reserve_mt == 84.030
    assert profile.total_extractable_reserve_mt == 7.356
    assert profile.target_capacity_mtpa == 0.60
    assert "JSMDC" in profile.prior_allocatee_name

    # Check that NOT APPROVED clearances are preserved verbatim
    clearances = db_session.query(MineClearance).filter(MineClearance.mine_id == mine.id).all()
    for cl in clearances:
        if cl.clearance_type in ["MINE_PLAN", "FOREST_CLEARANCE", "ENVIRONMENTAL_CLEARANCE"]:
            assert cl.status == "NOT_APPROVED"
        elif cl.clearance_type == "MINING_LEASE":
            assert cl.status == "NOT_APPLIED"

def test_rabodh_data_integrity(db_session):
    """Verify authentic facts for Rabodh Coal Block (Page 1-4)."""
    mine = db_session.query(Mine).filter(Mine.code == "BLOCK-RAB-68").first()
    assert mine is not None
    profile = mine.profile
    assert profile.geological_block_area_sq_km == 5.85
    assert profile.total_geological_reserve_mt == 133.17
    assert profile.total_extractable_reserve_mt == 46.19
    assert profile.target_capacity_mtpa == 2.50
    assert "Gerua Nadi" in profile.drainage_description

    seams = db_session.query(MineSeam).filter(MineSeam.mine_id == mine.id).all()
    assert len(seams) == 13
    seam_v = next(s for s in seams if s.seam_name == "V")
    assert seam_v.geological_reserve_mt == 44.87
    assert seam_v.extractable_reserve_mt == 22.31

def test_rohne_data_integrity(db_session):
    """Verify authentic facts for Rohne Coal Block (Page 1-3)."""
    mine = db_session.query(Mine).filter(Mine.code == "BLOCK-ROH-69").first()
    assert mine is not None
    profile = mine.profile
    assert profile.geological_block_area_sq_km == 12.45 # 1245 Ha
    assert profile.total_geological_reserve_mt == 241.735
    assert profile.total_extractable_reserve_mt == 191.54
    assert profile.target_capacity_mtpa == 8.00
    assert "JSW Steel" in profile.prior_allocatee_name

    ec_clear = db_session.query(MineClearance).filter(
        MineClearance.mine_id == mine.id,
        MineClearance.clearance_type == "ENVIRONMENTAL_CLEARANCE"
    ).first()
    assert ec_clear is not None
    assert ec_clear.status == "APPROVED"
    assert "J-11015/266/2008-IA.II(M)" in ec_clear.reference_number

def test_urtan_north_data_integrity(db_session):
    """Verify authentic facts for Urtan North Coal Block (Page 1-2)."""
    mine = db_session.query(Mine).filter(Mine.code == "BLOCK-URT-70").first()
    assert mine is not None
    profile = mine.profile
    assert profile.state == "Madhya Pradesh"
    assert profile.district == "Anuppur"
    assert profile.coalfield == "Sohagpur Coalfield"
    assert profile.geological_block_area_sq_km == 4.75
    assert profile.total_geological_reserve_mt == 69.823
    assert profile.total_extractable_reserve_mt == 25.721
    assert profile.mining_method_documented == "Underground (UG)"
    assert profile.target_capacity_mtpa == 0.60
    assert "Jindal Steel" in profile.prior_allocatee_name

    fc_clear = db_session.query(MineClearance).filter(
        MineClearance.mine_id == mine.id,
        MineClearance.clearance_type == "FOREST_CLEARANCE"
    ).first()
    assert fc_clear is not None
    assert fc_clear.status == "NOT_REQUIRED"

def test_north_of_arkhapal_approximate_geometry_and_cardinal_points(db_session):
    """Verify North of Arkhapal: 9 Cardinal points A-I in CoalGrid & WGS84, explicit APPROXIMATE geometry status."""
    mine = db_session.query(Mine).filter(Mine.code == "BLOCK-NOA-71").first()
    assert mine is not None
    profile = mine.profile
    assert profile.official_name == "North of Arkhapal and Srirampur (Northern Part) Coal Block"
    assert profile.geological_block_area_sq_km == 11.70
    assert profile.total_geological_reserve_mt == 920.0
    assert profile.target_capacity_raw == "NA"
    assert profile.data_status == "APPROXIMATE"
    assert profile.geometry_status == "APPROXIMATE"

    # Boundary
    boundary = db_session.query(MineBoundary).filter(MineBoundary.mine_id == mine.id).first()
    assert boundary is not None
    assert boundary.geometry_status == "APPROXIMATE"
    assert boundary.boundary_type == "POLYGON"

    # Coordinates
    coords = db_session.query(MineCoordinate).filter(MineCoordinate.mine_id == mine.id).order_by(MineCoordinate.sequence_order.asc()).all()
    assert len(coords) == 9
    labels = [c.point_label for c in coords]
    assert labels == ["A", "B", "C", "D", "E", "F", "G", "H", "I"]

    point_a = coords[0]
    assert point_a.point_label == "A"
    assert point_a.x_proj == pytest.approx(3119053.1837, abs=1e-3)
    assert point_a.y_proj == pytest.approx(780982.2045, abs=1e-3)
    assert point_a.latitude == pytest.approx(21.022756, abs=1e-4)
    assert point_a.longitude == pytest.approx(85.143188, abs=1e-4)
    assert point_a.geometry_status == "APPROXIMATE"
    assert point_a.provenance.page_number == 10

    # Clearances (all NA in official summary)
    clearances = db_session.query(MineClearance).filter(MineClearance.mine_id == mine.id).all()
    for cl in clearances:
        assert cl.status == "NA"
        assert cl.provenance.page_number == 3

# =========================================================================
# 3. REAL VS SIMULATED ISOLATION
# =========================================================================

def test_real_vs_simulated_mine_separation(db_session):
    """Verify strict separation between simulated demo mines and real source-derived mines."""
    simulated_mines = db_session.query(Mine).filter(Mine.is_simulated == "YES").all()
    assert len(simulated_mines) == 3
    for m in simulated_mines:
        assert m.code in ["MINE-BDS-04", "MINE-SOB-02", "MINE-RS-07"]

    real_mines = db_session.query(Mine).filter(Mine.is_simulated == "NO").all()
    assert len(real_mines) == 6
    for m in real_mines:
        assert m.code in ["BLOCK-CT-66", "BLOCK-JOG-67", "BLOCK-RAB-68", "BLOCK-ROH-69", "BLOCK-URT-70", "BLOCK-NOA-71"]
        assert m.data_status in ["SOURCE_DERIVED", "APPROXIMATE"]

# =========================================================================
# 4. VALIDATOR AND QUALITY CHECKS
# =========================================================================

def test_validator_rejects_invalid_values():
    """Verify validator catches physical domain errors."""
    # Coordinate range error
    errs = RealMineValidator.validate_coordinates(95.0, 85.0, "P1", "Test Mine")
    assert len(errs) == 1
    assert "between -90 and 90" in errs[0]

    # Negative area error
    errs2 = RealMineValidator.validate_profile({"geological_block_area_sq_km": -5.0})
    assert len(errs2) == 1
    assert "cannot be negative" in errs2[0]

    # Min > Max error
    errs3 = RealMineValidator.validate_range(15.0, 5.0, "Thickness")
    assert len(errs3) == 1
    assert "cannot exceed max" in errs3[0]

    # Missing provenance link error
    errs4 = RealMineValidator.validate_provenance_link(None, "SOURCE_DERIVED", "MineProfile", "Test")
    assert len(errs4) == 1
    assert "Missing provenance link" in errs4[0]

def test_data_quality_records_computed(db_session):
    """Verify all real mines have precomputed data quality metrics."""
    q_records = db_session.query(MineDataQualityRecord).all()
    assert len(q_records) >= 6
    for q in q_records:
        assert q.overall_status in ["VALIDATED", "REVIEW_REQUIRED"]
        assert q.source_coverage > 0.0
        assert q.provenance_coverage >= 0.95

# =========================================================================
# 5. API ENDPOINTS & RBAC ACCESS
# =========================================================================

def test_api_list_real_mines(client, db_session):
    """Verify GET /api/v1/mine-data/real-mines returns only the 6 authentic mines with provenance."""
    token = get_token(client, "admin@trinetra.gov.in")
    auth_headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/v1/mine-data/real-mines", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert len(data) == 6
    codes = [d["code"] for d in data]
    assert "BLOCK-CT-66" in codes
    assert "BLOCK-NOA-71" in codes
    for item in data:
        assert item["is_simulated"] == "NO"
        assert item["provenance_doc"] != ""
        assert len(item["provenance_hash"]) == 64

def test_api_get_real_mine_detail_and_seams(client, db_session):
    """Verify GET /api/v1/mine-data/{id} and seams sub-endpoint."""
    mine = db_session.query(Mine).filter(Mine.code == "BLOCK-CT-66").first()
    token = get_token(client, "admin@trinetra.gov.in")
    auth_headers = {"Authorization": f"Bearer {token}"}

    res = client.get(f"/api/v1/mine-data/{mine.id}", headers=auth_headers)
    assert res.status_code == 200
    detail = res.json()
    assert detail["code"] == "BLOCK-CT-66"
    assert detail["profile"]["geological_block_area_sq_km"] == 2.42
    assert len(detail["seams"]) == 13

    # Seams endpoint
    seams_res = client.get(f"/api/v1/mine-data/{mine.id}/seams", headers=auth_headers)
    assert seams_res.status_code == 200
    assert len(seams_res.json()) == 13

    # Coordinates endpoint
    coords_res = client.get(f"/api/v1/mine-data/{mine.id}/coordinates", headers=auth_headers)
    assert coords_res.status_code == 200

    # Clearances endpoint
    clear_res = client.get(f"/api/v1/mine-data/{mine.id}/clearances", headers=auth_headers)
    assert clear_res.status_code == 200
    assert len(clear_res.json()) == 5

    # Provenance endpoint
    prov_res = client.get(f"/api/v1/mine-data/{mine.id}/provenance", headers=auth_headers)
    assert prov_res.status_code == 200
    assert len(prov_res.json()) >= 4

    # Quality endpoint
    qual_res = client.get(f"/api/v1/mine-data/{mine.id}/quality", headers=auth_headers)
    assert qual_res.status_code == 200
    assert qual_res.json()["provenance_coverage"] >= 0.95

def test_cross_mine_access_enforcement(client, db_session):
    """Verify mine managers cannot access unassigned real mines, whereas Admin/Regulator can."""
    mine = db_session.query(Mine).filter(Mine.code == "BLOCK-CT-66").first()
    
    # Manager of Mine 1 is not assigned to BLOCK-CT-66
    mgr1_token = get_token(client, "manager.mine1@trinetra.gov.in")
    mgr1_headers = {"Authorization": f"Bearer {mgr1_token}"}
    res_mgr = client.get(f"/api/v1/mine-data/{mine.id}", headers=mgr1_headers)
    assert res_mgr.status_code == 403

    # Admin has cross-mine access
    admin_token = get_token(client, "admin@trinetra.gov.in")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    res_admin = client.get(f"/api/v1/mine-data/{mine.id}", headers=admin_headers)
    assert res_admin.status_code == 200

    # Regulator has statutory cross-mine access
    reg_token = get_token(client, "regulator@dgms.gov.in")
    reg_headers = {"Authorization": f"Bearer {reg_token}"}
    res_reg = client.get(f"/api/v1/mine-data/{mine.id}", headers=reg_headers)
    assert res_reg.status_code == 200

