from datetime import datetime, date
from typing import List, Optional, Dict, Any
from enum import Enum
from pydantic import BaseModel, Field


class TimeRangeEnum(str, Enum):
    TODAY = "TODAY"
    LAST_7_DAYS = "LAST_7_DAYS"
    LAST_30_DAYS = "LAST_30_DAYS"
    LAST_90_DAYS = "LAST_90_DAYS"
    THIS_MONTH = "THIS_MONTH"
    THIS_QUARTER = "THIS_QUARTER"
    CUSTOM = "CUSTOM"


class DataModeEnum(str, Enum):
    REAL = "REAL"
    SIMULATED = "SIMULATED"
    MODEL = "MODEL"
    DEMO = "DEMO"
    SOURCE_DERIVED = "SOURCE_DERIVED"
    APPROXIMATE = "APPROXIMATE"


class TimeRangeDTO(BaseModel):
    range_type: TimeRangeEnum
    start_time: datetime
    end_time: datetime
    prev_start_time: Optional[datetime] = None
    prev_end_time: Optional[datetime] = None


class TrendMetricDTO(BaseModel):
    current_value: float
    previous_value: Optional[float] = None
    delta: Optional[float] = None
    percentage_delta: Optional[float] = None
    unit: str = "count"
    data_mode: str = "OPERATIONAL"


class DataQualityDTO(BaseModel):
    record_count: int = 0
    missing_periods: List[str] = []
    data_mode: str = "OPERATIONAL"
    is_simulated: str = "NO"
    data_as_of: datetime
    notes: Optional[str] = None


class TimeSeriesPointDTO(BaseModel):
    date: str # YYYY-MM-DD or ISO
    value: float
    count: int = 0
    label: Optional[str] = None
    entity_ids: List[int] = []
    observed_value: Optional[float] = None
    target_value: Optional[float] = None
    forecast_value: Optional[float] = None
    severity: Optional[str] = None
    probability: Optional[float] = None


class CategoryBreakdownDTO(BaseModel):
    category: str
    count: int
    percentage: float = 0.0
    severity: Optional[str] = None
    entity_type: str
    entity_ids: List[int] = []


class DrillDownEntityDTO(BaseModel):
    id: int
    code: str
    title: str
    entity_type: str
    category: Optional[str] = None
    severity: Optional[str] = None
    status: Optional[str] = None
    timestamp: Optional[datetime] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    digital_twin_id: Optional[str] = None
    gis_context: Optional[str] = None


# =========================================================================
# DOMAIN RESPONSE DTOs
# =========================================================================

class GovernanceOverviewAnalyticsDTO(BaseModel):
    mine_id: int
    mine_name: str
    time_range: TimeRangeDTO
    data_as_of: datetime
    data_quality: DataQualityDTO
    
    total_incidents: TrendMetricDTO
    open_incidents: TrendMetricDTO
    critical_incidents: TrendMetricDTO
    active_alerts: TrendMetricDTO
    open_violations: TrendMetricDTO
    overdue_corrective_actions: TrendMetricDTO
    sla_breaches: TrendMetricDTO
    pending_inspections: TrendMetricDTO
    open_governance_tasks: TrendMetricDTO
    environmental_deviations: TrendMetricDTO
    open_grievances: TrendMetricDTO
    active_contractor_issues: TrendMetricDTO
    predictive_high_hotspots: TrendMetricDTO
    field_inspections_pending: TrendMetricDTO
    what_changed: List[Dict[str, Any]] = []


class SafetyAnalyticsDTO(BaseModel):
    mine_id: int
    mine_name: str
    time_range: TimeRangeDTO
    data_as_of: datetime
    data_quality: DataQualityDTO

    total_incidents: int
    open_incidents: int
    resolved_incidents: int
    avg_resolution_hours: Optional[float] = None
    
    incidents_by_day: List[TimeSeriesPointDTO] = []
    incidents_by_severity: List[CategoryBreakdownDTO] = []
    incidents_by_category: List[CategoryBreakdownDTO] = []
    
    anomalies_count: int
    critical_anomalies_count: int
    anomalies_by_day: List[TimeSeriesPointDTO] = []
    
    alerts_by_severity: List[CategoryBreakdownDTO] = []
    alerts_resolved_count: int
    recurring_hazards: List[CategoryBreakdownDTO] = []
    drilldown_entities: List[DrillDownEntityDTO] = []


class ComplianceAnalyticsDTO(BaseModel):
    mine_id: int
    mine_name: str
    time_range: TimeRangeDTO
    data_as_of: datetime
    data_quality: DataQualityDTO

    total_inspections: int
    total_violations: int
    open_violations: int
    verified_violations: int
    
    violations_by_severity: List[CategoryBreakdownDTO] = []
    violations_by_statute: List[CategoryBreakdownDTO] = []
    
    corrective_actions_total: int
    corrective_actions_pending: int
    corrective_actions_overdue: int
    sla_compliance_rate_percent: float
    escalations_count: int
    
    compliance_chain: List[Dict[str, Any]] = [] # Traceable violation -> corrective action -> escalation
    compliance_trend: List[TimeSeriesPointDTO] = []
    violations_by_day: List[TimeSeriesPointDTO] = []
    actions_by_day: List[TimeSeriesPointDTO] = []
    resolved_by_day: List[TimeSeriesPointDTO] = []
    drilldown_entities: List[DrillDownEntityDTO] = []


class ProductionAnalyticsDTO(BaseModel):
    mine_id: int
    mine_name: str
    time_range: TimeRangeDTO
    data_as_of: datetime
    data_quality: DataQualityDTO

    planned_quantity_total: float
    actual_quantity_total: float
    variance_quantity_total: float
    variance_percentage: float
    unit: str = "TONNES"
    
    production_trend: List[TimeSeriesPointDTO] = []
    production_by_shift: List[CategoryBreakdownDTO] = []
    production_by_material: List[CategoryBreakdownDTO] = []
    reports_submitted_count: int
    deviations_flagged_count: int


class WorkforceAnalyticsDTO(BaseModel):
    mine_id: int
    mine_name: str
    time_range: TimeRangeDTO
    data_as_of: datetime
    data_quality: DataQualityDTO

    total_workers_registered: int
    contractual_workers_count: int
    regular_workers_count: int
    
    total_attendance_records: int
    present_count: int
    absent_count: int
    late_count: int
    attendance_rate_percent: float
    
    attendance_trend: List[TimeSeriesPointDTO] = []
    attendance_by_shift: List[CategoryBreakdownDTO] = []
    workers_by_trade: List[CategoryBreakdownDTO] = []


class EnvironmentalParameterDTO(BaseModel):
    parameter_name: str
    observation_count: int
    latest_value: Optional[float] = None
    threshold_limit: Optional[float] = None
    unit: str
    deviation_count: int
    status: str # NORMAL, DEVIATION, NO_DATA


class EnvironmentalAnalyticsDTO(BaseModel):
    mine_id: int
    mine_name: str
    time_range: TimeRangeDTO
    data_as_of: datetime
    data_quality: DataQualityDTO

    total_observations: int
    total_deviations: int
    active_deviations: int
    parameters: List[EnvironmentalParameterDTO] = []
    readings_over_time: List[TimeSeriesPointDTO] = []
    parameter_trends: Dict[str, List[TimeSeriesPointDTO]] = {}
    drilldown_entities: List[DrillDownEntityDTO] = []


class ContractorAnalyticsDTO(BaseModel):
    mine_id: int
    mine_name: str
    time_range: TimeRangeDTO
    data_as_of: datetime
    data_quality: DataQualityDTO

    active_contractors_count: int
    total_contracts: int
    active_contracts: int
    expiring_soon_contracts: int
    expired_contracts: int
    total_contract_value: float
    requirement_deviations_count: int
    contractor_governance_tasks: int
    contracts_by_status: List[CategoryBreakdownDTO] = []


class GrievanceAnalyticsDTO(BaseModel):
    mine_id: int
    mine_name: str
    time_range: TimeRangeDTO
    data_as_of: datetime
    data_quality: DataQualityDTO

    total_grievances: int
    open_grievances: int
    resolved_grievances: int
    overdue_grievances: int
    avg_disposal_days: Optional[float] = None
    grievances_by_category: List[CategoryBreakdownDTO] = []
    grievances_by_priority: List[CategoryBreakdownDTO] = []
    grievances_by_status: List[CategoryBreakdownDTO] = []


class FieldOperationsAnalyticsDTO(BaseModel):
    mine_id: int
    mine_name: str
    time_range: TimeRangeDTO
    data_as_of: datetime
    data_quality: DataQualityDTO

    scheduled_inspections: int
    in_progress_inspections: int
    completed_inspections: int
    submitted_inspections: int
    
    total_evidence_count: int
    evidence_by_type: List[CategoryBreakdownDTO] = []
    
    sync_logs_total: int
    sync_accepted_count: int
    sync_conflict_count: int
    sync_rejected_count: int
    
    inspections_by_day: List[TimeSeriesPointDTO] = []
    drilldown_entities: List[DrillDownEntityDTO] = []


class PredictiveRiskAnalyticsDTO(BaseModel):
    mine_id: int
    mine_name: str
    time_range: TimeRangeDTO
    data_as_of: datetime
    data_quality: DataQualityDTO

    latest_prediction_score: Optional[float] = None
    latest_severity: Optional[str] = None
    latest_probability: Optional[float] = None
    horizon_minutes: int = 30
    model_version: str = "risk-escalation-v1.0"
    
    total_predictions_generated: int
    high_critical_predictions_count: int
    risk_trend: List[TimeSeriesPointDTO] = []
    severity_distribution: List[CategoryBreakdownDTO] = []
    top_contributing_features: List[Dict[str, Any]] = []
    active_hotspots_count: int


class MineComparativeMetricDTO(BaseModel):
    mine_id: int
    mine_name: str
    state: str
    district: str
    data_status: str
    is_simulated: str
    
    open_incidents: int
    open_violations: int
    sla_breaches: int
    planned_production: float
    actual_production: float
    production_variance: float
    attendance_rate_percent: float
    environmental_deviations: int
    predictive_risk_score: Optional[float] = None
    active_hotspots: int


class CrossMineBenchmarkingDTO(BaseModel):
    time_range: TimeRangeDTO
    data_as_of: datetime
    authorized_mines_count: int
    mines: List[MineComparativeMetricDTO] = []
