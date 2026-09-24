from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, ConfigDict


class GisProvenanceRead(BaseModel):
    document_title: str
    document_filename: str
    document_hash: str
    page_number: Optional[int] = None
    section_heading: Optional[str] = None
    authority_level: str
    data_status: str
    source_text_reference: Optional[str] = None


class GisCoordinateFeature(BaseModel):
    id: int
    point_label: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    lat_dms_raw: Optional[str] = None
    lon_dms_raw: Optional[str] = None
    local_x: float = 0.0
    local_z: float = 0.0
    datum: str = "WGS84"
    geometry_status: str = "SOURCE_DERIVED"
    provenance: Optional[GisProvenanceRead] = None


class GisBoundaryFeature(BaseModel):
    id: int
    boundary_type: str
    min_latitude: Optional[float] = None
    max_latitude: Optional[float] = None
    min_longitude: Optional[float] = None
    max_longitude: Optional[float] = None
    geometry_status: str # SOURCE_DERIVED, APPROXIMATE, SCHEMATIC
    area_sq_km: Optional[float] = None
    coordinates_geojson: List[List[float]] = [] # [ [lon, lat], ... ]
    provenance: Optional[GisProvenanceRead] = None


class GisSeamFeature(BaseModel):
    id: int
    seam_name: str
    thickness_min_m: Optional[float] = None
    thickness_max_m: Optional[float] = None
    depth_min_m: Optional[float] = None
    depth_max_m: Optional[float] = None
    geological_reserve_mt: Optional[float] = None
    is_schematic: bool = True
    provenance: Optional[GisProvenanceRead] = None


class GisOperationalFeature(BaseModel):
    id: str
    entity_id: int
    feature_type: str # SENSOR, CAMERA, INCIDENT, ALERT, INSPECTION, GOVERNANCE_TASK, ENVIRONMENTAL, CMSMS
    code: str
    title: str
    status: Optional[str] = None
    severity: Optional[str] = None
    latitude: float
    longitude: float
    value: Optional[str] = None
    unit: Optional[str] = None
    trust_badge: str # SOURCE_DERIVED, APPROXIMATE, OPERATIONAL, SIMULATED, NOT_DOCUMENTED
    created_at: Optional[str] = None
    properties: Dict[str, Any] = {}


class GisRiskHotspot(BaseModel):
    id: str
    hotspot_type: str # CURRENT_RISK, ANOMALY_HOTSPOT, PREDICTIVE_HOTSPOT
    title: str
    latitude: float
    longitude: float
    risk_score: float
    risk_band: str # LOW, MEDIUM, HIGH, CRITICAL
    source_type: str
    source_model: str
    trust_badge: str
    prediction_horizon: Optional[str] = None
    escalation_probability: Optional[float] = None
    explanation: str
    contributing_factors: List[str] = []
    recommended_action: str
    created_at: Optional[str] = None


class GisTrustMetrics(BaseModel):
    source_derived_count: int
    approximate_count: int
    operational_count: int
    simulated_count: int
    not_documented_count: int


class GisDashboardStats(BaseModel):
    current_risk_score: float
    current_risk_band: str
    predictive_hotspots_count: int
    open_incidents_count: int
    open_field_tasks_count: int
    sla_breaches_count: int
    active_alerts_count: int
    last_updated: str


class GisMineMetadata(BaseModel):
    id: int
    code: str
    name: str
    official_name: str
    state: str
    district: str
    latitude: float
    longitude: float
    total_area_sq_km: Optional[float] = None
    data_status: str # SOURCE_DERIVED, APPROXIMATE, etc.
    geometry_status: str # SOURCE_DERIVED, APPROXIMATE, etc.
    is_simulated: str
    provenance_doc: str
    provenance_hash: str


class GisMapResponse(BaseModel):
    mine: GisMineMetadata
    boundaries: List[GisBoundaryFeature]
    source_coordinates: List[GisCoordinateFeature]
    seams: List[GisSeamFeature]
    operational_features: List[GisOperationalFeature]
    risk_hotspots: List[GisRiskHotspot]
    trust_metrics: GisTrustMetrics
    dashboard_stats: GisDashboardStats


class SpatialContextResponse(BaseModel):
    target_coordinate: Dict[str, float]
    boundary_status: Dict[str, Any]
    nearest_sensors: List[Dict[str, Any]]
    nearest_incidents: List[Dict[str, Any]]
    nearest_inspections: List[Dict[str, Any]]
    total_entities_nearby: int


class GisSearchItem(BaseModel):
    id: str
    title: str
    type: str # MINE, COORDINATE, SENSOR, INCIDENT, TASK, INSPECTION, DOCUMENT
    category: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    mine_id: int
    mine_name: str
    trust_badge: str
    snippet: str


class GisSearchResponse(BaseModel):
    query: str
    results_count: int
    items: List[GisSearchItem]


class GisMineOverviewItem(BaseModel):
    id: int
    code: str
    name: str
    official_name: str
    mine_type: str
    state: str
    district: str
    latitude: float
    longitude: float
    total_area_sq_km: Optional[float] = None
    data_status: str
    geometry_status: str
    is_simulated: str
    provenance_doc: Optional[str] = None
    provenance_hash: Optional[str] = None
    operator: Optional[str] = None
    coalfield: Optional[str] = None
    
    # Operational & Risk State
    current_risk_score: float
    current_risk_band: str # CRITICAL, HIGH, MEDIUM, LOW
    open_incidents_count: int
    open_field_tasks_count: int
    total_sensors: int
    online_sensors: int
    offline_sensors: int
    reporting_rate_percent: float
    active_anomalies_count: int
    sla_breaches_count: int
    predictive_hotspots_count: int
    active_alerts_count: int
    
    # Simplified bounding polygon for quick spatial boundary highlight
    simplified_boundary: List[List[float]] = []


class GisOverviewResponse(BaseModel):
    total_authorized_mines: int
    critical_risk_mines: int
    high_risk_mines: int
    medium_risk_mines: int
    low_risk_mines: int
    total_active_incidents: int
    total_open_tasks: int
    total_sensors_online: int
    total_sensors_count: int
    mines: List[GisMineOverviewItem] = []

