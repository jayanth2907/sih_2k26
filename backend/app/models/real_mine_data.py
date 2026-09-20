from datetime import datetime, timezone
from enum import Enum
from sqlalchemy import (
    Column, Integer, String, Text, Float, DateTime, Boolean, ForeignKey, Index
)
from sqlalchemy.orm import relationship
from app.db.base import Base

class AuthorityLevelEnum(str, Enum):
    TIER_1_OFFICIAL_REGULATORY = "TIER_1_OFFICIAL_REGULATORY"   # DGMS, MoEFCC, MoC Gazette
    TIER_2_OFFICIAL_MINE_BLOCK = "TIER_2_OFFICIAL_MINE_BLOCK"   # CMPDI Mine Summaries / Geological Reports
    TIER_3_TRINETRA_OPERATIONAL = "TIER_3_TRINETRA_OPERATIONAL" # Field Audits, Verified IoT, Sensor Telemetry
    TIER_4_SIMULATED_DEMO = "TIER_4_SIMULATED_DEMO"             # Hackathon Synthetic / Simulated Scenarios

class DataStatusEnum(str, Enum):
    SOURCE_DERIVED = "SOURCE_DERIVED"   # Directly parsed from authoritative source document
    APPROXIMATE = "APPROXIMATE"         # Stated as approximate / tentative in official document
    SCHEMATIC = "SCHEMATIC"             # Diagrammatic / conceptual representation
    SIMULATED = "SIMULATED"             # Synthetic test data for demo workflows
    USER_ENTERED = "USER_ENTERED"       # Entered by user/field officer without source file
    UNKNOWN = "UNKNOWN"

class GeometryStatusEnum(str, Enum):
    SURVEY_DERIVED = "SURVEY_DERIVED"   # High-precision survey / DGPS / Total Station boundary
    SOURCE_DERIVED = "SOURCE_DERIVED"   # Directly quoted from official coordinates / plan
    APPROXIMATE = "APPROXIMATE"         # Tentative or regional exploration boundary
    SCHEMATIC = "SCHEMATIC"             # Simplified bounding box or polygon for visualization
    SIMULATED = "SIMULATED"             # Synthetic geometry for testing

class ExtractionMethodEnum(str, Enum):
    DIGITAL_PDF = "DIGITAL_PDF"
    OCR_DERIVED = "OCR_DERIVED"
    OCR_REQUIRED = "OCR_REQUIRED"
    MANUAL_VERIFIED = "MANUAL_VERIFIED"
    SIMULATED = "SIMULATED"

class ValidationStatusEnum(str, Enum):
    VALID = "VALID"
    WARNING = "WARNING"
    INVALID = "INVALID"
    UNVALIDATED = "UNVALIDATED"


class DataProvenance(Base):
    __tablename__ = "data_provenance"

    id = Column(Integer, primary_key=True, index=True)
    document_title = Column(String(255), nullable=False)
    document_filename = Column(String(255), nullable=False)
    document_hash = Column(String(64), nullable=False, index=True) # SHA-256
    source_organization = Column(String(255), nullable=False) # e.g. "Ministry of Coal / CMPDI"
    document_type = Column(String(100), nullable=False) # e.g. "OFFICIAL_MINE_SUMMARY"
    publication_date = Column(String(50), nullable=True)
    effective_date = Column(String(50), nullable=True)
    source_url = Column(String(500), nullable=True) # Only if genuinely available
    page_number = Column(Integer, nullable=True, index=True)
    section_heading = Column(String(255), nullable=True)
    source_text_reference = Column(Text, nullable=True)
    extraction_method = Column(String(50), default="DIGITAL_PDF", nullable=False)
    authority_level = Column(String(50), default="TIER_2_OFFICIAL_MINE_BLOCK", nullable=False)
    data_status = Column(String(50), default="SOURCE_DERIVED", nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)


class MineProfile(Base):
    __tablename__ = "mine_profiles"

    id = Column(Integer, primary_key=True, index=True)
    mine_id = Column(Integer, ForeignKey("mines.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    
    # Naming normalization
    official_name = Column(String(255), nullable=False) # e.g. "North of Arkhapal Srirampur (Northern Part) Coal Block"
    normalized_name = Column(String(255), nullable=False, index=True) # e.g. "north-of-arkhapal-srirampur"
    display_name = Column(String(255), nullable=False) # e.g. "North of Arkhapal"
    aliases = Column(Text, nullable=True) # JSON or comma-delimited
    
    # Geographic & administrative
    coalfield = Column(String(100), nullable=False)
    sub_basin = Column(String(100), nullable=True)
    state = Column(String(100), nullable=False)
    district = Column(String(100), nullable=False)
    tehsil = Column(String(100), nullable=True)
    villages = Column(Text, nullable=True)
    topo_sheet_no = Column(String(100), nullable=True)
    
    # Area breakdown (in sq km & ha)
    geological_block_area_sq_km = Column(Float, nullable=True)
    mining_lease_area_ha = Column(Float, nullable=True)
    project_area_ha = Column(Float, nullable=True)
    forest_area_ha = Column(Float, nullable=True)
    non_forest_area_ha = Column(Float, nullable=True)
    
    # Connectivity & Infrastructure
    nearest_rail_head = Column(Text, nullable=True)
    road_connectivity = Column(Text, nullable=True)
    nearest_airport = Column(Text, nullable=True)
    surface_infrastructure_built = Column(Text, nullable=True)
    
    # Climate & Topography
    annual_rainfall_mm = Column(String(100), nullable=True)
    temperature_range = Column(String(100), nullable=True)
    drainage_description = Column(Text, nullable=True)
    
    # Exploration & Geology Summary
    exploration_agency = Column(String(255), nullable=True)
    exploration_status = Column(Text, nullable=True)
    total_boreholes = Column(Integer, nullable=True)
    total_meterage_drilled = Column(Float, nullable=True)
    borehole_density_per_sq_km = Column(Float, nullable=True)
    general_dip = Column(String(255), nullable=True)
    general_strike = Column(String(255), nullable=True)
    
    # Mining parameters
    mining_method_documented = Column(String(100), nullable=True) # OC, UG, MIXED, UNGRADED
    target_capacity_mtpa = Column(Float, nullable=True)
    target_capacity_raw = Column(String(100), nullable=True) # e.g. "0.78 Mty" or "NA"
    total_geological_reserve_mt = Column(Float, nullable=True)
    total_extractable_reserve_mt = Column(Float, nullable=True)
    average_grade_documented = Column(String(100), nullable=True)
    stripping_ratio_cum_per_te = Column(Float, nullable=True)
    total_overburden_mcum = Column(Float, nullable=True)
    
    # Allocation & status
    prior_allocatee_name = Column(Text, nullable=True)
    project_status_documented = Column(String(100), nullable=True)
    
    # Trust & Geometry classification
    data_status = Column(String(50), default="SOURCE_DERIVED", nullable=False)
    geometry_status = Column(String(50), default="SOURCE_DERIVED", nullable=False)
    validation_status = Column(String(50), default="VALID", nullable=False)
    
    # Link to primary provenance
    provenance_id = Column(Integer, ForeignKey("data_provenance.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    mine = relationship("Mine", back_populates="profile")
    provenance = relationship("DataProvenance")


class MineBoundary(Base):
    __tablename__ = "mine_boundaries"

    id = Column(Integer, primary_key=True, index=True)
    mine_id = Column(Integer, ForeignKey("mines.id", ondelete="CASCADE"), nullable=False, index=True)
    boundary_type = Column(String(50), default="LIMITING_BOX", nullable=False) # LIMITING_BOX, POLYGON, TEXTUAL_DESCRIPTION
    description = Column(Text, nullable=True)
    datum = Column(String(50), default="WGS84", nullable=False) # WGS84, COALGRID, LOCAL
    coordinate_system = Column(String(100), default="GEOGRAPHIC_WGS84", nullable=False)
    geometry_status = Column(String(50), default="SOURCE_DERIVED", nullable=False) # SURVEY_DERIVED, SOURCE_DERIVED, APPROXIMATE, SCHEMATIC
    min_latitude = Column(Float, nullable=True)
    max_latitude = Column(Float, nullable=True)
    min_longitude = Column(Float, nullable=True)
    max_longitude = Column(Float, nullable=True)
    raw_coordinate_text = Column(Text, nullable=True)
    
    provenance_id = Column(Integer, ForeignKey("data_provenance.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    mine = relationship("Mine", back_populates="boundaries")
    provenance = relationship("DataProvenance")


class MineCoordinate(Base):
    __tablename__ = "mine_coordinates"

    id = Column(Integer, primary_key=True, index=True)
    mine_id = Column(Integer, ForeignKey("mines.id", ondelete="CASCADE"), nullable=False, index=True)
    point_label = Column(String(50), nullable=False) # e.g. "A", "B", "NW_CORNER"
    sequence_order = Column(Integer, default=0, nullable=False)
    
    # Geographic (WGS84)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    lat_dms_raw = Column(String(100), nullable=True) # e.g. '21° 01\' 21.920" N'
    lon_dms_raw = Column(String(100), nullable=True) # e.g. '85° 08\' 35.478" E'
    
    # Projected / Grid coordinates (e.g. CoalGrid)
    x_proj = Column(Float, nullable=True) # CoalGrid X
    y_proj = Column(Float, nullable=True) # CoalGrid Y
    x_proj_raw = Column(String(100), nullable=True)
    y_proj_raw = Column(String(100), nullable=True)
    
    datum = Column(String(50), default="WGS84", nullable=False)
    coordinate_system = Column(String(100), default="WGS84", nullable=False)
    geometry_status = Column(String(50), default="SOURCE_DERIVED", nullable=False)
    notes = Column(Text, nullable=True)
    
    provenance_id = Column(Integer, ForeignKey("data_provenance.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    mine = relationship("Mine", back_populates="coordinates")
    provenance = relationship("DataProvenance")


class MineSeam(Base):
    __tablename__ = "mine_seams"

    id = Column(Integer, primary_key=True, index=True)
    mine_id = Column(Integer, ForeignKey("mines.id", ondelete="CASCADE"), nullable=False, index=True)
    seam_name = Column(String(100), nullable=False) # e.g. "Seam V Top", "Seam X", "Seam XV"
    seam_code = Column(String(50), nullable=True)
    sequence_order = Column(Integer, default=0, nullable=False)
    
    # Thickness & Depth (in meters)
    thickness_min_m = Column(Float, nullable=True)
    thickness_max_m = Column(Float, nullable=True)
    thickness_raw = Column(String(100), nullable=True) # e.g. "0.35-4.02"
    depth_min_m = Column(Float, nullable=True)
    depth_max_m = Column(Float, nullable=True)
    parting_min_m = Column(Float, nullable=True)
    parting_max_m = Column(Float, nullable=True)
    parting_raw = Column(String(100), nullable=True)
    
    # Reserves (in Million Tonnes)
    geological_reserve_mt = Column(Float, nullable=True)
    geological_reserve_raw = Column(String(100), nullable=True) # e.g. "8.702" or "Not estimated"
    extractable_reserve_mt = Column(Float, nullable=True)
    extractable_reserve_raw = Column(String(100), nullable=True)
    
    # Quality & Mining
    grade = Column(String(100), nullable=True) # e.g. "W-III to Ungraded*", "G9"
    mining_method = Column(String(100), nullable=True) # OC, UG, Mixed, Not provided
    workability_status = Column(String(100), default="WORKABLE", nullable=False) # WORKABLE, NON_WORKABLE, IMPERSISTENT, NOT_ESTIMATED
    
    data_status = Column(String(50), default="SOURCE_DERIVED", nullable=False)
    provenance_id = Column(Integer, ForeignKey("data_provenance.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    mine = relationship("Mine", back_populates="seams")
    provenance = relationship("DataProvenance")


class MineClearance(Base):
    __tablename__ = "mine_clearances"

    id = Column(Integer, primary_key=True, index=True)
    mine_id = Column(Integer, ForeignKey("mines.id", ondelete="CASCADE"), nullable=False, index=True)
    clearance_type = Column(String(100), nullable=False) # MINE_PLAN, FOREST_CLEARANCE, ENVIRONMENTAL_CLEARANCE, MINING_LEASE, LAND_ACQUISITION, PAF_RNR
    status = Column(String(100), nullable=False) # APPROVED, NOT_APPROVED, NOT_APPLIED, PENDING, NOT_REQUIRED, NA, IN_PRINCIPAL_APPROVED
    status_raw = Column(Text, nullable=True) # Exact verbatim string from source
    reference_number = Column(String(255), nullable=True)
    grant_date = Column(String(50), nullable=True)
    authority = Column(String(255), nullable=True)
    area_covered_ha = Column(Float, nullable=True)
    notes = Column(Text, nullable=True)
    
    data_status = Column(String(50), default="SOURCE_DERIVED", nullable=False)
    provenance_id = Column(Integer, ForeignKey("data_provenance.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    mine = relationship("Mine", back_populates="clearances")
    provenance = relationship("DataProvenance")


class MineDataAttribute(Base):
    __tablename__ = "mine_data_attributes"

    id = Column(Integer, primary_key=True, index=True)
    mine_id = Column(Integer, ForeignKey("mines.id", ondelete="CASCADE"), nullable=False, index=True)
    category = Column(String(100), nullable=False, index=True) # LOCATION, AREA, GEOLOGY, RESERVES, CLEARANCES, INFRASTRUCTURE
    attribute_key = Column(String(100), nullable=False, index=True) # e.g. "forest_area", "borehole_density"
    display_label = Column(String(255), nullable=False)
    raw_value = Column(Text, nullable=True)
    normalized_numeric_value = Column(Float, nullable=True)
    unit = Column(String(50), nullable=True)
    data_status = Column(String(50), default="SOURCE_DERIVED", nullable=False)
    validation_status = Column(String(50), default="VALID", nullable=False)
    
    provenance_id = Column(Integer, ForeignKey("data_provenance.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    mine = relationship("Mine", back_populates="data_attributes")
    provenance = relationship("DataProvenance")


class MineDataQualityRecord(Base):
    __tablename__ = "mine_data_quality_records"

    id = Column(Integer, primary_key=True, index=True)
    mine_id = Column(Integer, ForeignKey("mines.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    overall_status = Column(String(50), default="VALIDATED", nullable=False) # VALIDATED, REVIEW_REQUIRED, INCOMPLETE
    source_coverage = Column(Float, default=1.0, nullable=False) # 0.0 to 1.0
    provenance_coverage = Column(Float, default=1.0, nullable=False)
    validation_errors = Column(Integer, default=0, nullable=False)
    approximate_geometry = Column(Boolean, default=False, nullable=False)
    survey_grade_geometry = Column(Boolean, default=False, nullable=False)
    total_attributes_extracted = Column(Integer, default=0, nullable=False)
    missing_critical_fields = Column(Text, nullable=True) # JSON list
    calculated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    mine = relationship("Mine", back_populates="quality_record")
