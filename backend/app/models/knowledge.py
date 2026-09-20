from datetime import datetime, timezone
from enum import Enum
from sqlalchemy import (
    Column, Integer, String, Text, Float, DateTime, Boolean, ForeignKey, Index
)
from sqlalchemy.orm import relationship
from app.db.base import Base

class SourceTierEnum(str, Enum):
    TIER_1_OFFICIAL_REGULATORY = "TIER_1_OFFICIAL_REGULATORY"
    TIER_2_OFFICIAL_MINE_BLOCK = "TIER_2_OFFICIAL_MINE_BLOCK"
    TIER_3_TRINETRA_OPERATIONAL = "TIER_3_TRINETRA_OPERATIONAL"
    TIER_4_SIMULATED_DEMO = "TIER_4_SIMULATED_DEMO"

class DocumentStatusEnum(str, Enum):
    CURRENT = "CURRENT"
    CURRENT_REGULATORY_FRAMEWORK = "CURRENT_REGULATORY_FRAMEWORK"
    CURRENT_RELEVANT_REGULATION = "CURRENT_RELEVANT_REGULATION"
    HISTORICAL = "HISTORICAL"
    SUPERSEDED = "SUPERSEDED"
    UNKNOWN = "UNKNOWN"
    REAL_SOURCE = "REAL_SOURCE"
    SIMULATED = "SIMULATED"
    APPROXIMATE = "APPROXIMATE"
    SOURCE_DERIVED = "SOURCE_DERIVED"
    SCHEMATIC = "SCHEMATIC"

class GovernmentDocument(Base):
    __tablename__ = "government_documents"

    id = Column(Integer, primary_key=True, index=True)
    document_code = Column(String(100), unique=True, nullable=False, index=True)
    title = Column(String(255), nullable=False)
    organization = Column(String(255), nullable=False)
    year = Column(String(50), nullable=True)
    source_tier = Column(String(50), default="TIER_1_OFFICIAL_REGULATORY", nullable=False)
    status = Column(String(50), default="CURRENT", nullable=False)
    file_path = Column(String(500), nullable=False)
    file_hash = Column(String(64), nullable=False, index=True)  # SHA-256
    page_count = Column(Integer, default=1, nullable=False)
    domains = Column(Text, nullable=True)  # JSON or comma-delimited
    effective_from = Column(String(50), nullable=True)
    effective_to = Column(String(50), nullable=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    chunks = relationship("DocumentChunk", back_populates="document", cascade="all, delete-orphan")

class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("government_documents.id", ondelete="CASCADE"), nullable=False, index=True)
    chunk_index = Column(Integer, default=0, nullable=False)
    page_number = Column(Integer, nullable=False, index=True)
    section_heading = Column(String(255), nullable=True)
    text_content = Column(Text, nullable=False)
    chunk_hash = Column(String(64), nullable=False, index=True)  # SHA-256
    source_tier = Column(String(50), default="TIER_1_OFFICIAL_REGULATORY", nullable=False)
    source_status = Column(String(50), default="CURRENT", nullable=False)
    domain = Column(String(100), nullable=True, index=True)
    keywords = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    document = relationship("GovernmentDocument", back_populates="chunks")
