from datetime import datetime, timezone
from sqlalchemy import (
    Column, Integer, String, Text, Float, DateTime, Boolean, ForeignKey, Index
)
from sqlalchemy.orm import relationship
from app.db.base import Base

class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    mine_id = Column(Integer, ForeignKey("mines.id", ondelete="CASCADE"), nullable=True, index=True)
    uploader_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    
    title = Column(String(255), nullable=False)
    source_filename = Column(String(255), nullable=True)
    doc_type = Column(String(100), default="OTHER", nullable=False) # Classification category
    source_tier = Column(String(50), default="TIER_3_TRINETRA_OPERATIONAL", nullable=False) # TIER_1 to TIER_4
    source_category = Column(String(100), default="OTHER", nullable=False) # DGMS, INSPECTION_REPORT, etc.
    
    file_path = Column(String(500), nullable=False)
    file_hash = Column(String(64), nullable=False, index=True) # SHA-256 hash of original file
    original_sha256 = Column(String(64), nullable=True) # Alias / backward-compatible SHA-256
    mime_type = Column(String(100), default="application/pdf", nullable=False)
    file_size_bytes = Column(Integer, default=0, nullable=False)
    
    page_count = Column(Integer, default=1, nullable=False)
    native_page_count = Column(Integer, default=0, nullable=False)
    ocr_page_count = Column(Integer, default=0, nullable=False)
    
    ocr_status = Column(String(50), default="PENDING", nullable=False) # PENDING, PROCESSING, COMPLETED, FAILED, OCR_UNAVAILABLE
    processing_stage = Column(String(50), default="RECEIVED", nullable=False) # RECEIVED, VALIDATING, TEXT_EXTRACTION, OCR_PROCESSING, FIELD_EXTRACTION, VALIDATING_FIELDS, INDEXING, COMPLETED, PARTIAL, FAILED, OCR_UNAVAILABLE
    quality_status = Column(String(50), default="GOOD", nullable=False) # GOOD, REVIEW, POOR, UNREADABLE, UNAVAILABLE
    
    extracted_text = Column(Text, nullable=True)
    confidence_score = Column(Float, nullable=True) # Overall document confidence
    average_ocr_confidence = Column(Float, nullable=True) # Average OCR confidence
    classification_confidence = Column(Float, default=1.0, nullable=False)
    classification_reason = Column(String(500), nullable=True)
    
    verification_status = Column(String(50), default="PENDING_REVIEW", nullable=False) # PENDING_REVIEW, IN_REVIEW, VERIFIED, REJECTED
    verified_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    verified_at = Column(DateTime, nullable=True)
    
    processing_error = Column(Text, nullable=True)
    uploaded_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    mine = relationship("Mine")
    uploader = relationship("User", foreign_keys=[uploader_id])
    verifier = relationship("User", foreign_keys=[verified_by_user_id])
    pages = relationship("DocumentPage", back_populates="document", cascade="all, delete-orphan", order_by="DocumentPage.page_number")
    fields = relationship("ExtractedDocumentField", back_populates="document", cascade="all, delete-orphan")


class DocumentPage(Base):
    __tablename__ = "document_pages"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True)
    page_number = Column(Integer, nullable=False, index=True)
    
    extraction_method = Column(String(50), default="TEXT_NATIVE", nullable=False) # TEXT_NATIVE, OCR, HYBRID, FAILED
    ocr_provider = Column(String(50), default="NONE", nullable=False) # TESSERACT, PYPDF_NATIVE, UNAVAILABLE
    ocr_confidence = Column(Float, nullable=True) # 0.0 to 100.0
    ocr_confidence_band = Column(String(20), default="N/A", nullable=False) # HIGH (>=85), MEDIUM (60-84), LOW (<60), N/A
    quality_status = Column(String(50), default="GOOD", nullable=False) # GOOD, REVIEW, POOR, UNREADABLE, UNAVAILABLE
    
    page_hash = Column(String(64), nullable=True) # SHA-256 of extracted text
    page_image_path = Column(String(500), nullable=True) # Rasterized page image for frontend side-by-side view
    text_content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    document = relationship("Document", back_populates="pages")


class ExtractedDocumentField(Base):
    __tablename__ = "extracted_document_fields"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True)
    page_number = Column(Integer, default=1, nullable=False)
    
    field_name = Column(String(100), nullable=False, index=True) # e.g. "mine_name", "inspection_date", "officer_name", "latitude", "longitude"
    field_value = Column(String(500), nullable=False)
    confidence = Column(Float, default=1.0, nullable=False) # 0.0 to 1.0
    source_text = Column(Text, nullable=True) # Verbatim sentence/excerpt where found
    extraction_method = Column(String(50), default="REGEX", nullable=False) # REGEX, PATTERN_MATCH, KEYWORD_LOOKUP, OCR_EXTRACTION
    
    validation_status = Column(String(50), default="VALID", nullable=False) # VALID, REVIEW_REQUIRED, INVALID
    validation_error = Column(String(500), nullable=True)
    
    is_verified = Column(String(20), default="PENDING", nullable=False) # PENDING, VERIFIED, REJECTED, EDITED
    verified_value = Column(String(500), nullable=True) # Overridden/corrected value by human reviewer
    verified_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    verified_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    document = relationship("Document", back_populates="fields")
    verifier = relationship("User", foreign_keys=[verified_by_user_id])
