from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class DataProvenanceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    document_title: str
    document_filename: str
    document_hash: str
    source_organization: str
    document_type: str
    publication_date: Optional[str] = None
    effective_date: Optional[str] = None
    source_url: Optional[str] = None
    page_number: Optional[int] = None
    section_heading: Optional[str] = None
    source_text_reference: Optional[str] = None
    extraction_method: str
    authority_level: str
    data_status: str
    notes: Optional[str] = None
    created_at: datetime


class MineBoundaryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    mine_id: int
    boundary_type: str
    description: Optional[str] = None
    datum: str
    coordinate_system: str
    geometry_status: str
    min_latitude: Optional[float] = None
    max_latitude: Optional[float] = None
    min_longitude: Optional[float] = None
    max_longitude: Optional[float] = None
    raw_coordinate_text: Optional[str] = None
    provenance: Optional[DataProvenanceRead] = None


class MineCoordinateRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    mine_id: int
    point_label: str
    sequence_order: int
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    lat_dms_raw: Optional[str] = None
    lon_dms_raw: Optional[str] = None
    x_proj: Optional[float] = None
    y_proj: Optional[float] = None
    x_proj_raw: Optional[str] = None
    y_proj_raw: Optional[str] = None
    datum: str
    coordinate_system: str
    geometry_status: str
    notes: Optional[str] = None
    provenance: Optional[DataProvenanceRead] = None


class MineSeamRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    mine_id: int
    seam_name: str
    seam_code: Optional[str] = None
    sequence_order: int
    thickness_min_m: Optional[float] = None
    thickness_max_m: Optional[float] = None
    thickness_raw: Optional[str] = None
    depth_min_m: Optional[float] = None
    depth_max_m: Optional[float] = None
    parting_min_m: Optional[float] = None
    parting_max_m: Optional[float] = None
    parting_raw: Optional[str] = None
    geological_reserve_mt: Optional[float] = None
    geological_reserve_raw: Optional[str] = None
    extractable_reserve_mt: Optional[float] = None
    extractable_reserve_raw: Optional[str] = None
    grade: Optional[str] = None
    mining_method: Optional[str] = None
    workability_status: str
    data_status: str
    provenance: Optional[DataProvenanceRead] = None


class MineClearanceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    mine_id: int
    clearance_type: str
    status: str
    status_raw: Optional[str] = None
    reference_number: Optional[str] = None
    grant_date: Optional[str] = None
    authority: Optional[str] = None
    area_covered_ha: Optional[float] = None
    notes: Optional[str] = None
    data_status: str
    provenance: Optional[DataProvenanceRead] = None


class MineDataAttributeRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    mine_id: int
    category: str
    attribute_key: str
    display_label: str
    raw_value: Optional[str] = None
    normalized_numeric_value: Optional[float] = None
    unit: Optional[str] = None
    data_status: str
    validation_status: str
    provenance: Optional[DataProvenanceRead] = None


class MineDataQualityRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    mine_id: int
    overall_status: str
    source_coverage: float
    provenance_coverage: float
    validation_errors: int
    approximate_geometry: bool
    survey_grade_geometry: bool
    total_attributes_extracted: int
    missing_critical_fields: Optional[str] = None
    calculated_at: datetime


class MineProfileRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    mine_id: int
    official_name: str
    normalized_name: str
    display_name: str
    aliases: Optional[str] = None
    coalfield: str
    sub_basin: Optional[str] = None
    state: str
    district: str
    tehsil: Optional[str] = None
    villages: Optional[str] = None
    topo_sheet_no: Optional[str] = None
    geological_block_area_sq_km: Optional[float] = None
    mining_lease_area_ha: Optional[float] = None
    project_area_ha: Optional[float] = None
    forest_area_ha: Optional[float] = None
    non_forest_area_ha: Optional[float] = None
    nearest_rail_head: Optional[str] = None
    road_connectivity: Optional[str] = None
    nearest_airport: Optional[str] = None
    surface_infrastructure_built: Optional[str] = None
    annual_rainfall_mm: Optional[str] = None
    temperature_range: Optional[str] = None
    drainage_description: Optional[str] = None
    exploration_agency: Optional[str] = None
    exploration_status: Optional[str] = None
    total_boreholes: Optional[int] = None
    total_meterage_drilled: Optional[float] = None
    borehole_density_per_sq_km: Optional[float] = None
    general_dip: Optional[str] = None
    general_strike: Optional[str] = None
    mining_method_documented: Optional[str] = None
    target_capacity_mtpa: Optional[float] = None
    target_capacity_raw: Optional[str] = None
    total_geological_reserve_mt: Optional[float] = None
    total_extractable_reserve_mt: Optional[float] = None
    average_grade_documented: Optional[str] = None
    stripping_ratio_cum_per_te: Optional[float] = None
    total_overburden_mcum: Optional[float] = None
    prior_allocatee_name: Optional[str] = None
    project_status_documented: Optional[str] = None
    data_status: str
    geometry_status: str
    validation_status: str
    provenance: Optional[DataProvenanceRead] = None


class RealMineSummaryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    code: str
    name: str
    official_name: str
    coalfield: str
    state: str
    district: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    total_area_sq_km: Optional[float] = None
    mining_method: Optional[str] = None
    geological_reserve_mt: Optional[float] = None
    data_status: str
    geometry_status: str
    is_simulated: str
    provenance_doc: str
    provenance_hash: str


class RealMineDetailRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    code: str
    name: str
    mine_type: str
    state: str
    district: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    data_status: str
    is_simulated: str
    profile: Optional[MineProfileRead] = None
    boundaries: List[MineBoundaryRead] = []
    coordinates: List[MineCoordinateRead] = []
    seams: List[MineSeamRead] = []
    clearances: List[MineClearanceRead] = []
    data_attributes: List[MineDataAttributeRead] = []
    quality_record: Optional[MineDataQualityRead] = None


class IngestionReportItem(BaseModel):
    mine_code: str
    mine_name: str
    document_filename: str
    document_hash: str
    pages_processed: int
    attributes_extracted: int
    seams_extracted: int
    coordinates_extracted: int
    clearances_extracted: int
    geometry_status: str
    validation_errors: List[str] = []
    status: str
