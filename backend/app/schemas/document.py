from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict


class DocumentPageRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    document_id: int
    page_number: int
    extraction_method: str
    ocr_provider: str
    ocr_confidence: Optional[float] = None
    ocr_confidence_band: str
    quality_status: str
    page_hash: Optional[str] = None
    page_image_path: Optional[str] = None
    text_content: str
    created_at: datetime


class ExtractedDocumentFieldRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    document_id: int
    page_number: int
    field_name: str
    field_value: str
    confidence: float
    source_text: Optional[str] = None
    extraction_method: str
    validation_status: str
    validation_error: Optional[str] = None
    is_verified: str
    verified_value: Optional[str] = None
    verified_by_user_id: Optional[int] = None
    verified_at: Optional[datetime] = None
    created_at: datetime


class DocumentSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    mine_id: Optional[int] = None
    title: str
    source_filename: Optional[str] = None
    doc_type: str
    source_tier: str
    source_category: str
    file_hash: str
    file_size_bytes: int
    page_count: int
    native_page_count: int
    ocr_page_count: int
    ocr_status: str
    processing_stage: str
    quality_status: str
    average_ocr_confidence: Optional[float] = None
    classification_confidence: float
    classification_reason: Optional[str] = None
    verification_status: str
    uploaded_at: datetime


class DocumentRead(DocumentSummary):
    model_config = ConfigDict(from_attributes=True)

    extracted_text: Optional[str] = None
    processing_error: Optional[str] = None
    pages: List[DocumentPageRead] = []
    fields: List[ExtractedDocumentFieldRead] = []


class FieldVerificationRequest(BaseModel):
    is_verified: str = "VERIFIED" # VERIFIED, REJECTED, EDITED
    verified_value: Optional[str] = None


class DraftGovernanceRequest(BaseModel):
    title: str
    description: str


class DocumentProcessingStatus(BaseModel):
    document_id: int
    title: str
    file_hash: str
    processing_stage: str
    ocr_status: str
    quality_status: str
    page_count: int
    native_page_count: int
    ocr_page_count: int
    average_ocr_confidence: Optional[float] = None
    fields_count: int
    verification_status: str
