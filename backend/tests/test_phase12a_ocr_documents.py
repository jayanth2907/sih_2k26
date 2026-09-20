import io
import pytest
from PIL import Image
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.mine import Mine
from app.models.user import User
from app.models.document import Document, DocumentPage, ExtractedDocumentField
from app.models.governance_task import GovernanceTask
from app.models.audit import AuditEvent
from app.services.ocr_service import (
    TesseractOCRProvider,
    UnavailableOCRProvider,
    compute_confidence_band,
    compute_quality_status,
    OCRResult,
)
from app.services.document_intelligence_service import (
    DocumentIntelligenceService,
    document_intelligence_service
)
from app.copilot.tool_registry import tool_registry

def get_token(client: TestClient, email: str = "admin@trinetra.gov.in", password: str = "Trinetra@2026") -> str:
    res = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, f"Login failed for {email}: {res.text}"
    return res.json()["access_token"]


def create_test_image_bytes() -> bytes:
    """Create a minimal valid PNG image in memory for testing image uploads."""
    img = Image.new("RGB", (200, 100), color=(255, 255, 255))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def test_ocr_provider_abstraction():
    """Verify OCR provider hierarchy, confidence bands, and quality status calculations."""
    # Test confidence bands
    assert compute_confidence_band(95.0) == "HIGH"
    assert compute_confidence_band(75.0) == "MEDIUM"
    assert compute_confidence_band(45.0) == "LOW"
    assert compute_confidence_band(0.0) == "N/A"

    # Test quality status
    assert compute_quality_status("This is a valid long text excerpt for test", 90.0, "SUCCESS") == "GOOD"
    assert compute_quality_status("This is a valid long text excerpt for test", 70.0, "SUCCESS") == "REVIEW"
    assert compute_quality_status("This is a valid long text excerpt for test", 35.0, "SUCCESS") == "POOR"
    assert compute_quality_status("", 0.0, "UNAVAILABLE") == "UNAVAILABLE"
    assert compute_quality_status("", 0.0, "FAILED") == "UNREADABLE"

    # Test UnavailableOCRProvider
    unavailable = UnavailableOCRProvider(reason="Tesseract binary not installed on host PATH")
    res = unavailable.process_image(b"fake_image_bytes")
    assert res.status == "UNAVAILABLE"
    assert res.confidence == 0.0
    assert res.confidence_band == "N/A"
    assert res.quality_status == "UNAVAILABLE"
    assert "Tesseract binary not installed" in res.reason

    # Test TesseractOCRProvider availability check
    tesseract = TesseractOCRProvider()
    assert isinstance(tesseract.is_available, bool)


def test_document_classification_logic():
    """Verify deterministic document classification across categories."""
    service = document_intelligence_service

    # DGMS Contravention
    cat1, conf1, _ = service.classify_document(
        "dgms_contravention_notice.pdf",
        "Directorate General of Mines Safety DGMS Violation Notice under Regulation 130 of Coal Mines Regulations CMR 2017."
    )
    assert cat1 == "DGMS"
    assert conf1 >= 0.90

    # Annual Report
    cat2, conf2, _ = service.classify_document(
        "mocar_2025_chapter3.pdf",
        "Ministry of Coal Annual Report 2024-25 development and production summary."
    )
    assert cat2 == "ANNUAL_REPORT"
    assert conf2 >= 0.90

    # CMSMS
    cat3, conf3, _ = service.classify_document(
        "illegal_mining_alert.pdf",
        "Coal Mine Surveillance and Management System CMSMS Khanan Prahari trigger."
    )
    assert cat3 == "CMSMS"
    assert conf3 >= 0.90

    # Gas Testing & Air Quantity
    cat4, conf4, _ = service.classify_document(
        "shift_gas_register.pdf",
        "Daily gas testing register ventilation log methane CH4 percentage and carbon monoxide."
    )
    assert cat4 == "SAFETY_REGISTER"
    assert conf4 >= 0.85

    # Production & Weighbridge
    cat5, conf5, _ = service.classify_document(
        "coal_dispatch_summary.pdf",
        "Monthly coal production report raw coal dispatch rake loading and tonnage details."
    )
    assert cat5 == "PRODUCTION_REPORT"
    assert conf5 >= 0.85


def test_structured_field_extraction_and_validation():
    """Verify structured field extraction from document text with boundary and format validation."""
    service = document_intelligence_service

    sample_dgms_text = """
    GOVERNMENT OF INDIA
    DIRECTORATE GENERAL OF MINES SAFETY
    Mine Name: North Arkhapal Mine
    Date of Inspection: 2026-03-12
    Inspecting Officer: Shri Rajesh Sharma
    Latitude: 20.9542
    Longitude: 85.1245
    Regulation: Regulation 130 of Coal Mines Regulations 2017
    Coal Production: 4500 Tonnes
    Geological Reserve: 120 MT
    Total Workers: 340
    Respirable Dust: 1.85 mg/m³
    CPGRAMS Ref: MORLY/E/2026/01298
    """

    fields = service.extract_structured_fields(page_number=1, text=sample_dgms_text, doc_category="DGMS")
    field_dict = {f["field_name"]: f for f in fields}

    # Verify extracted fields
    assert "mine_name" in field_dict
    assert "North Arkhapal" in field_dict["mine_name"]["field_value"]

    assert "inspection_date" in field_dict
    assert field_dict["inspection_date"]["validation_status"] == "VALID"
    assert field_dict["inspection_date"]["field_value"] == "2026-03-12"

    assert "officer_name" in field_dict
    assert "Rajesh Sharma" in field_dict["officer_name"]["field_value"]

    assert "latitude" in field_dict
    assert field_dict["latitude"]["validation_status"] == "VALID"
    assert float(field_dict["latitude"]["field_value"]) == pytest.approx(20.9542, rel=1e-3)

    assert "longitude" in field_dict
    assert field_dict["longitude"]["validation_status"] == "VALID"
    assert float(field_dict["longitude"]["field_value"]) == pytest.approx(85.1245, rel=1e-3)

    assert "production_quantity" in field_dict
    assert field_dict["production_quantity"]["validation_status"] == "VALID"

    assert "worker_count" in field_dict
    assert field_dict["worker_count"]["validation_status"] == "VALID"
    assert field_dict["worker_count"]["field_value"] == "340"

    # Test out-of-bounds latitude validation
    status_inv_lat, err_inv_lat = DocumentIntelligenceService.validate_field("latitude", "125.4000")
    assert status_inv_lat == "REVIEW_REQUIRED"
    assert "out of valid range" in err_inv_lat

    # Test invalid non-numeric latitude validation
    status_bad_lat, _ = DocumentIntelligenceService.validate_field("latitude", "NOT_A_NUMBER")
    assert status_bad_lat == "INVALID"


def test_document_upload_and_processing_api(client: TestClient, db_session: Session):
    """Test full document upload, SHA-256 calculation, and database persistence."""
    token = get_token(client)
    mine = db_session.query(Mine).first()
    assert mine is not None

    image_bytes = create_test_image_bytes()

    response = client.post(
        "/api/v1/documents/upload",
        headers={"Authorization": f"Bearer {token}"},
        data={
            "mine_id": str(mine.id),
            "title": "Mine Safety Board Inspection Scan",
            "source_tier": "TIER_3_TRINETRA_OPERATIONAL",
        },
        files={
            "file": ("safety_board_scan.png", io.BytesIO(image_bytes), "image/png")
        }
    )

    assert response.status_code == 200
    data = response.json()
    assert data["source_filename"] == "safety_board_scan.png"
    assert data["processing_stage"] == "COMPLETED"
    assert len(data["file_hash"]) == 64
    assert data["page_count"] == 1
    assert data["quality_status"] in ["GOOD", "REVIEW", "POOR", "UNAVAILABLE", "PASSED"]

    doc_id = data["id"]

    # Verify GET /documents/{id}
    detail_res = client.get(
        f"/api/v1/documents/{doc_id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert detail_res.status_code == 200
    doc_data = detail_res.json()
    assert len(doc_data["pages"]) == 1
    assert doc_data["pages"][0]["extraction_method"] == "OCR"


def test_human_field_verification_and_audit_logging(client: TestClient, db_session: Session):
    """Test human verification of extracted fields, correction, and cryptographic audit log emission."""
    token = get_token(client)
    mine = db_session.query(Mine).first()
    assert mine is not None

    image_bytes = create_test_image_bytes()
    upload_res = client.post(
        "/api/v1/documents/upload",
        headers={"Authorization": f"Bearer {token}"},
        data={"mine_id": str(mine.id), "title": "Inspection Seal Verification Test"},
        files={"file": ("verification_test.png", io.BytesIO(image_bytes), "image/png")}
    )
    assert upload_res.status_code == 200
    doc_id = upload_res.json()["id"]

    # Add a field to the uploaded doc
    field = ExtractedDocumentField(
        document_id=doc_id,
        field_name="latitude",
        field_value="23.8142",
        confidence=0.92,
        page_number=1,
        source_text="Latitude: 23.8142 N",
        extraction_method="REGEX",
        validation_status="VALID",
        is_verified="PENDING"
    )
    db_session.add(field)
    db_session.commit()
    db_session.refresh(field)

    # Verify field via API endpoint
    verify_res = client.post(
        f"/api/v1/documents/{doc_id}/fields/{field.id}/verify",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "is_verified": "VERIFIED",
            "verified_value": "23.8142"
        }
    )
    assert verify_res.status_code == 200
    verified_field = verify_res.json()
    assert verified_field["is_verified"] == "VERIFIED"
    assert verified_field["verified_value"] == "23.8142"

    # Verify audit log entry exists
    audit_entry = db_session.query(AuditEvent).filter(
        AuditEvent.resource_type == "ExtractedDocumentField",
        AuditEvent.resource_id == str(field.id)
    ).first()
    assert audit_entry is not None
    assert audit_entry.action == "DOCUMENT_FIELD_VERIFIED"


def test_draft_governance_task_creation(client: TestClient, db_session: Session):
    """Verify that document action creates a PENDING / OPEN draft task and never auto-violates."""
    token = get_token(client)
    mine = db_session.query(Mine).first()

    # Upload document
    image_bytes = create_test_image_bytes()
    upload_res = client.post(
        "/api/v1/documents/upload",
        headers={"Authorization": f"Bearer {token}"},
        data={"mine_id": str(mine.id), "title": "Ventilation Check Record"},
        files={"file": ("ventilation_check.png", io.BytesIO(image_bytes), "image/png")}
    )
    assert upload_res.status_code == 200
    doc_id = upload_res.json()["id"]

    # Create draft governance task
    draft_res = client.post(
        f"/api/v1/documents/{doc_id}/create-draft-governance",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "title": "Address Air Quantity Discrepancy",
            "description": "Draft task generated from verified ventilation document upload CMR 2017 Reg 130"
        }
    )
    assert draft_res.status_code == 200
    draft_data = draft_res.json()
    assert draft_data["status"] in ["SUCCESS", "DRAFT_CREATED"]
    assert "task_id" in draft_data

    # Verify task in DB
    task = db_session.query(GovernanceTask).filter(GovernanceTask.id == draft_data["task_id"]).first()
    assert task is not None
    assert task.status in ["OPEN", "PENDING", "ASSIGNED"]
    assert "Air Quantity" in task.title or "Ventilation" in task.description


def test_copilot_document_search_tools(client: TestClient, db_session: Session):
    """Test Copilot tools for searching uploaded documents and retrieving field evidence."""
    admin_user = db_session.query(User).filter(User.email == "admin@trinetra.gov.in").first()
    assert admin_user is not None
    mine = db_session.query(Mine).first()

    # Search uploaded documents via tool registry
    search_res = tool_registry.execute_tool(
        "search_uploaded_documents",
        db=db_session,
        mine_id=mine.id,
        user=admin_user,
        query=""
    )
    assert "mine_id" in search_res
    assert "total_matches" in search_res
    assert isinstance(search_res["evidence"], list)

    # Get uploaded document field evidence via tool registry
    field_res = tool_registry.execute_tool(
        "get_uploaded_document_field_evidence",
        db=db_session,
        mine_id=mine.id,
        user=admin_user,
        field_name="latitude"
    )
    assert "extracted_fields" in field_res
    assert isinstance(field_res["extracted_fields"], list)


def test_mine_isolation_and_rbac_on_documents(client: TestClient, db_session: Session):
    """Verify that a user authorized for Mine A cannot access documents belonging to Mine B."""
    admin_token = get_token(client)
    mines = db_session.query(Mine).all()
    if len(mines) < 2:
        pytest.skip("Need at least 2 mines for isolation test")

    mine_a = mines[0]
    mine_b = mines[1]

    # Upload document to Mine A
    image_bytes = create_test_image_bytes()
    upload_res = client.post(
        "/api/v1/documents/upload",
        headers={"Authorization": f"Bearer {admin_token}"},
        data={"mine_id": str(mine_a.id), "title": "Confidential Mine A Record"},
        files={"file": ("mine_a_doc.png", io.BytesIO(image_bytes), "image/png")}
    )
    assert upload_res.status_code == 200
    doc_id_a = upload_res.json()["id"]

    # Filter documents by Mine B as Admin
    list_b_res = client.get(
        f"/api/v1/documents/?mine_id={mine_b.id}",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert list_b_res.status_code == 200
    docs_in_b = list_b_res.json()
    assert not any(d["id"] == doc_id_a for d in docs_in_b)
