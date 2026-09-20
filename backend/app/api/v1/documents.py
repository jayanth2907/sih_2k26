from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.authz import (
    get_current_active_user,
    check_mine_access,
    require_mine_access,
    require_roles
)
from app.core.permissions import RoleEnum
from app.models.user import User
from app.models.mine import Mine
from app.models.document import Document, DocumentPage, ExtractedDocumentField
from app.schemas.document import (
    DocumentSummary,
    DocumentRead,
    DocumentPageRead,
    ExtractedDocumentFieldRead,
    FieldVerificationRequest,
    DraftGovernanceRequest,
    DocumentProcessingStatus
)
from app.services.document_intelligence_service import document_intelligence_service
from app.services.audit_service import AuditService

router = APIRouter(prefix="/documents", tags=["Document Intelligence & OCR"])


@router.post("/upload", response_model=DocumentRead)
async def upload_document(
    file: UploadFile = File(...),
    mine_id: Optional[int] = Form(None),
    title: Optional[str] = Form(None),
    source_tier: str = Form("TIER_3_TRINETRA_OPERATIONAL"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Upload and process document (PDF, PNG, JPEG, TIFF) through the hybrid OCR & extraction pipeline.
    Enforces MIME validation, file size limit (25MB), RBAC, and mine isolation.
    """
    # 1. Mine Access Check
    if mine_id is not None:
        mine = db.query(Mine).filter(Mine.id == mine_id).first()
        if not mine:
            raise HTTPException(status_code=404, detail=f"Mine {mine_id} not found")
        if not check_mine_access(current_user, mine_id, db):
            raise HTTPException(status_code=403, detail=f"User {current_user.email} not authorized for Mine {mine_id}")

    # 2. File Validation
    filename = file.filename or "uploaded_file.pdf"
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in ["pdf", "png", "jpg", "jpeg", "tiff"]:
        raise HTTPException(status_code=400, detail=f"Unsupported file type .{ext}. Allowed: PDF, PNG, JPG, JPEG, TIFF")

    content = await file.read()
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    if len(content) > 25 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File exceeds maximum allowed size of 25MB.")

    # 3. Execute Document Intelligence Pipeline
    doc = document_intelligence_service.process_document(
        file_bytes=content,
        filename=filename,
        title=title,
        mine_id=mine_id,
        uploader_id=current_user.id,
        source_tier=source_tier,
        db=db
    )
    return doc


@router.get("", response_model=List[DocumentSummary])
def list_documents(
    mine_id: Optional[int] = Query(None),
    doc_type: Optional[str] = Query(None),
    quality_status: Optional[str] = Query(None),
    verification_status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    List uploaded documents with mine isolation and filtering.
    """
    query = db.query(Document)
    if mine_id is not None:
        if not check_mine_access(current_user, mine_id, db):
            raise HTTPException(status_code=403, detail=f"Access denied to Mine {mine_id}")
        query = query.filter(Document.mine_id == mine_id)

    if doc_type:
        query = query.filter(Document.doc_type == doc_type)
    if quality_status:
        query = query.filter(Document.quality_status == quality_status)
    if verification_status:
        query = query.filter(Document.verification_status == verification_status)

    return query.order_by(Document.uploaded_at.desc()).all()


@router.get("/{document_id}", response_model=DocumentRead)
def get_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Retrieve full document metadata, pages, extracted fields, and verification status.
    """
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail=f"Document {document_id} not found")
    if doc.mine_id and not check_mine_access(current_user, doc.mine_id, db):
        raise HTTPException(status_code=403, detail=f"Access denied to document for Mine {doc.mine_id}")
    return doc


@router.get("/{document_id}/pages", response_model=List[DocumentPageRead])
def get_document_pages(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get all pages for a document with extraction method (TEXT_NATIVE vs OCR) and confidence.
    """
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail=f"Document {document_id} not found")
    if doc.mine_id and not check_mine_access(current_user, doc.mine_id, db):
        raise HTTPException(status_code=403, detail=f"Access denied to document for Mine {doc.mine_id}")
    
    pages = db.query(DocumentPage).filter(DocumentPage.document_id == document_id).order_by(DocumentPage.page_number).all()
    return pages


@router.get("/{document_id}/fields", response_model=List[ExtractedDocumentFieldRead])
def get_document_fields(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get structured fields extracted from document with validation flags.
    """
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail=f"Document {document_id} not found")
    if doc.mine_id and not check_mine_access(current_user, doc.mine_id, db):
        raise HTTPException(status_code=403, detail=f"Access denied to document for Mine {doc.mine_id}")
    
    fields = db.query(ExtractedDocumentField).filter(ExtractedDocumentField.document_id == document_id).all()
    return fields


@router.post("/{document_id}/fields/{field_id}/verify", response_model=ExtractedDocumentFieldRead)
def verify_document_field(
    document_id: int,
    field_id: int,
    req: FieldVerificationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Human-in-the-loop field verification: Accept, Edit, or Reject an extracted field.
    """
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail=f"Document {document_id} not found")
    if doc.mine_id and not check_mine_access(current_user, doc.mine_id, db):
        raise HTTPException(status_code=403, detail=f"Access denied to document for Mine {doc.mine_id}")

    try:
        updated_field = document_intelligence_service.verify_field(
            document_id=document_id,
            field_id=field_id,
            is_verified=req.is_verified,
            verified_value=req.verified_value,
            user=current_user,
            db=db
        )
        return updated_field
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/{document_id}/verify-all", response_model=DocumentRead)
def verify_all_valid_fields(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Accept all VALID extracted fields on a document in a single audited action.
    """
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail=f"Document {document_id} not found")
    if doc.mine_id and not check_mine_access(current_user, doc.mine_id, db):
        raise HTTPException(status_code=403, detail=f"Access denied to document for Mine {doc.mine_id}")

    fields = db.query(ExtractedDocumentField).filter(
        ExtractedDocumentField.document_id == document_id,
        ExtractedDocumentField.validation_status == "VALID",
        ExtractedDocumentField.is_verified == "PENDING"
    ).all()

    for f in fields:
        f.is_verified = "VERIFIED"
        f.verified_by_user_id = current_user.id
        f.verified_at = db.query(Document).first().uploaded_at

    doc.verification_status = "VERIFIED"
    db.commit()
    db.refresh(doc)

    AuditService.log_event(
        db=db,
        actor_id=current_user.id,
        action="DOCUMENT_ALL_FIELDS_VERIFIED",
        resource_type="DOCUMENT",
        resource_id=str(doc.id),
        mine_id=doc.mine_id,
        metadata={"verified_fields_count": len(fields)}
    )
    return doc


@router.post("/{document_id}/create-draft-governance")
def create_draft_governance_task(
    document_id: int,
    req: DraftGovernanceRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Create a DRAFT governance task from document findings.
    Enforces rule: Never automatically creates a final statutory violation.
    """
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail=f"Document {document_id} not found")
    if doc.mine_id and not check_mine_access(current_user, doc.mine_id, db):
        raise HTTPException(status_code=403, detail=f"Access denied to document for Mine {doc.mine_id}")

    task = document_intelligence_service.create_draft_governance_task(
        document_id=document_id,
        title=req.title,
        description=req.description,
        user=current_user,
        db=db
    )
    return {
        "status": "DRAFT_CREATED",
        "task_id": task.id,
        "task_title": task.title,
        "message": "Draft governance task created for human officer verification."
    }


@router.get("/{document_id}/ocr-status", response_model=DocumentProcessingStatus)
def get_document_ocr_status(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Poll processing stage and OCR confidence status in real time.
    """
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail=f"Document {document_id} not found")
    if doc.mine_id and not check_mine_access(current_user, doc.mine_id, db):
        raise HTTPException(status_code=403, detail=f"Access denied to document for Mine {doc.mine_id}")

    f_count = db.query(ExtractedDocumentField).filter(ExtractedDocumentField.document_id == document_id).count()

    return DocumentProcessingStatus(
        document_id=doc.id,
        title=doc.title,
        file_hash=doc.file_hash,
        processing_stage=doc.processing_stage,
        ocr_status=doc.ocr_status,
        quality_status=doc.quality_status,
        page_count=doc.page_count,
        native_page_count=doc.native_page_count,
        ocr_page_count=doc.ocr_page_count,
        average_ocr_confidence=doc.average_ocr_confidence,
        fields_count=f_count,
        verification_status=doc.verification_status
    )


@router.delete("/{document_id}")
def delete_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([RoleEnum.SYSTEM_ADMIN, RoleEnum.MINE_MANAGER]))
):
    """
    Delete document with audit logging. Restricted to MINE_MANAGER and SYSTEM_ADMIN.
    """
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail=f"Document {document_id} not found")
    if doc.mine_id and not check_mine_access(current_user, doc.mine_id, db):
        raise HTTPException(status_code=403, detail=f"Access denied to delete document for Mine {doc.mine_id}")

    doc_id = doc.id
    doc_title = doc.title
    mine_id = doc.mine_id

    db.delete(doc)
    db.commit()

    AuditService.log_event(
        db=db,
        actor_id=current_user.id,
        action="DOCUMENT_DELETED",
        resource_type="DOCUMENT",
        resource_id=str(doc_id),
        mine_id=mine_id,
        metadata={"title": doc_title}
    )
    return {"status": "DELETED", "document_id": doc_id}
