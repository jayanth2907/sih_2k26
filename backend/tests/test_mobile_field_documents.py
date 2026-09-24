import pytest
import uuid
import hashlib
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.mine import Mine
from app.models.user import User
from app.models.document import Document, DocumentPage, ExtractedDocumentField

def get_token(client: TestClient, email: str, password: str = "Trinetra@2026") -> str:
    res = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, f"Login failed for {email}: {res.text}"
    return res.json()["access_token"]

def test_01_mobile_documents_queue_and_summary_counters(client: TestClient, db_session: Session):
    """Verify unified mobile document center returns accurate counts and combined documents."""
    manager_token = get_token(client, "manager.mine1@trinetra.gov.in")
    headers = {"Authorization": f"Bearer {manager_token}"}

    mine = db_session.query(Mine).first()
    assert mine is not None

    res = client.get(f"/api/v1/mobile/documents?mine_id={mine.id}", headers=headers)
    assert res.status_code == 200
    data = res.json()

    assert "counts" in data
    assert "documents" in data
    counts = data["counts"]
    assert counts["total"] >= 10
    assert counts["statutory"] >= 5
    assert counts["ocr_verified"] >= 1

    doc_codes = [d["document_code"] for d in data["documents"]]
    assert "DGMS_CMR_2017" in doc_codes
    assert "DGMS_TECH_CIR_2_2025" in doc_codes

def test_02_search_and_category_filtering(client: TestClient, db_session: Session):
    """Verify filtering by statutory categories and keyword search."""
    manager_token = get_token(client, "manager.mine1@trinetra.gov.in")
    headers = {"Authorization": f"Bearer {manager_token}"}

    # 1. Category Filter: DGMS / MINE_SAFETY
    res_cat = client.get("/api/v1/mobile/documents?category=DGMS", headers=headers)
    assert res_cat.status_code == 200
    cat_data = res_cat.json()
    assert len(cat_data["documents"]) > 0
    for doc in cat_data["documents"]:
        assert doc["category"] in ["DGMS", "MINE_SAFETY", "COMPLIANCE"] or "DGMS" in doc["document_code"]

    # 2. Search query: "Ventilation"
    res_search = client.get("/api/v1/mobile/documents?search=Ventilation", headers=headers)
    assert res_search.status_code == 200
    search_data = res_search.json()
    assert len(search_data["documents"]) >= 1
    titles = [d["title"].lower() + d["description"].lower() for d in search_data["documents"]]
    assert any("ventilation" in t for t in titles)

def test_03_statutory_document_detail_resolution(client: TestClient, db_session: Session):
    """Verify detailed statutory document resolution with page sections and SHA-256 fingerprint."""
    inspector_token = get_token(client, "inspector.dgms@trinetra.gov.in")
    headers = {"Authorization": f"Bearer {inspector_token}"}

    res = client.get("/api/v1/mobile/documents/DGMS_CMR_2017", headers=headers)
    assert res.status_code == 200
    detail = res.json()

    assert detail["document_code"] == "DGMS_CMR_2017"
    assert detail["is_statutory"] is True
    assert detail["source_tier"] == "TIER_1_OFFICIAL_REGULATORY"
    assert len(detail["file_hash_sha256"]) == 64
    assert len(detail["pages"]) >= 1
    assert detail["pages"][0]["extraction_method"] == "TEXT_NATIVE"
    assert detail["available_offline"] is True

def test_04_operational_mine_document_detail_and_fields(client: TestClient, db_session: Session):
    """Verify operational mine document detail returns OCR pages and extracted fields."""
    manager_token = get_token(client, "manager.mine1@trinetra.gov.in")
    headers = {"Authorization": f"Bearer {manager_token}"}

    mine = db_session.query(Mine).first()
    manager = db_session.query(User).filter(User.email == "manager.mine1@trinetra.gov.in").first()

    # Create test operational document
    test_hash = hashlib.sha256(b"Test Operational Mine Safety Document").hexdigest()
    op_doc = Document(
        mine_id=mine.id,
        uploader_id=manager.id,
        title="Quarterly Strata & Roof Bolting Inspection Notice",
        source_filename="strata_roof_q3_2026.pdf",
        doc_type="INSPECTION",
        source_tier="TIER_3_TRINETRA_OPERATIONAL",
        source_category="INSPECTION_REPORT",
        file_path="/data/uploads/strata_roof_q3_2026.pdf",
        file_hash=test_hash,
        page_count=2,
        ocr_status="COMPLETED",
        processing_stage="COMPLETED",
        quality_status="GOOD",
        extracted_text="Torque tests verified for 250 resin bolts in Seam III.",
        confidence_score=0.96,
        verification_status="VERIFIED",
        uploaded_at=datetime.now(timezone.utc)
    )
    db_session.add(op_doc)
    db_session.commit()
    db_session.refresh(op_doc)

    # Add page and field
    page1 = DocumentPage(
        document_id=op_doc.id,
        page_number=1,
        extraction_method="HYBRID",
        ocr_provider="PYPDF_NATIVE",
        ocr_confidence=96.0,
        ocr_confidence_band="HIGH",
        quality_status="GOOD",
        page_hash=hashlib.sha256(b"Page 1 Text").hexdigest(),
        text_content="Seam III Strata Inspection Report: Torque test passed with 12 tonnes load."
    )
    field1 = ExtractedDocumentField(
        document_id=op_doc.id,
        page_number=1,
        field_name="anchorage_load_tonnes",
        field_value="12.0",
        confidence=0.98,
        source_text="anchorage capacity 12.0 tonnes",
        validation_status="VALID",
        is_verified="VERIFIED"
    )
    db_session.add(page1)
    db_session.add(field1)
    db_session.commit()

    # Fetch detail via mobile API
    res = client.get(f"/api/v1/mobile/documents/{op_doc.id}", headers=headers)
    assert res.status_code == 200
    doc_detail = res.json()

    assert doc_detail["id"] == str(op_doc.id)
    assert doc_detail["numeric_id"] == op_doc.id
    assert doc_detail["is_statutory"] is False
    assert doc_detail["file_hash_sha256"] == test_hash
    assert len(doc_detail["pages"]) >= 1
    assert len(doc_detail["fields"]) >= 1
    assert doc_detail["fields"][0]["field_name"] == "anchorage_load_tonnes"

def test_05_resolve_statutory_requirement(client: TestClient, db_session: Session):
    """Verify resolving statutory citations to exact regulations, pages, and excerpts."""
    inspector_token = get_token(client, "inspector.dgms@trinetra.gov.in")
    headers = {"Authorization": f"Bearer {inspector_token}"}

    # 1. CMR 2017 Reg 130 (Ventilation)
    res_130 = client.get("/api/v1/mobile/documents/requirement/CMR 2017 Reg 130", headers=headers)
    assert res_130.status_code == 200
    data_130 = res_130.json()
    assert data_130["found"] is True
    assert data_130["document_code"] == "DGMS_CMR_2017"
    assert data_130["page_number"] == 54
    assert data_130["domain"] == "VENTILATION"
    assert "6.0 cubic meters per minute" in data_130["verbatim_text"]

    # 2. CMR 2017 Reg 153 (Methane Limit)
    res_153 = client.get("/api/v1/mobile/documents/requirement/CMR 2017 Reg 153", headers=headers)
    assert res_153.status_code == 200
    data_153 = res_153.json()
    assert data_153["found"] is True
    assert data_153["page_number"] == 62
    assert "0.75%" in data_153["verbatim_text"]

    # 3. CMR 2017 Reg 104 (Strata Support)
    res_104 = client.get("/api/v1/mobile/documents/requirement/CMR 2017 Reg 104", headers=headers)
    assert res_104.status_code == 200
    data_104 = res_104.json()
    assert data_104["found"] is True
    assert data_104["domain"] == "STRATA_CONTROL"
    assert "Systematic Support Rules" in data_104["verbatim_text"]

def test_06_mine_isolation_and_rbac_on_mobile_documents(client: TestClient, db_session: Session):
    """Verify multi-tenant isolation prevents cross-mine document inspection."""
    manager1_token = get_token(client, "manager.mine1@trinetra.gov.in")
    headers1 = {"Authorization": f"Bearer {manager1_token}"}

    mine2 = db_session.query(Mine).filter(Mine.id == 2).first()
    if not mine2:
        mine2 = Mine(name="Mine 2 Test Isolated", code="SOB-02", state="Jharkhand", district="Dhanbad", status="ACTIVE")
        db_session.add(mine2)
        db_session.commit()

    # Create document in Mine 2
    doc_mine2 = Document(
        mine_id=2,
        title="Mine 2 Confidential Production & Safety Summary",
        source_filename="mine2_confidential.pdf",
        doc_type="COMPLIANCE",
        file_path="/data/uploads/mine2_confidential.pdf",
        file_hash=hashlib.sha256(b"Mine 2 Confidential Content").hexdigest(),
        page_count=1,
        ocr_status="COMPLETED",
        uploaded_at=datetime.now(timezone.utc)
    )
    db_session.add(doc_mine2)
    db_session.commit()
    db_session.refresh(doc_mine2)

    # Manager 1 attempts to retrieve Mine 2 document detail -> 403 Forbidden
    res_detail = client.get(f"/api/v1/mobile/documents/{doc_mine2.id}", headers=headers1)
    assert res_detail.status_code == 403

    # Manager 1 attempts to query queue for Mine 2 -> 403 Forbidden
    res_queue = client.get("/api/v1/mobile/documents?mine_id=2", headers=headers1)
    assert res_queue.status_code == 403

def test_07_unauthenticated_request_rejected(client: TestClient):
    """Verify unauthorized requests without valid JWT token return 401."""
    res = client.get("/api/v1/mobile/documents")
    assert res.status_code == 401
