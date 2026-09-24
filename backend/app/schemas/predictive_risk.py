from typing import List, Optional, Any, Dict
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class SignalAttribution(BaseModel):
    feature: str = ""
    label: str = ""
    direction: str = "NEUTRAL" # INCREASING_RISK, MITIGATING_RISK, NEUTRAL
    symbol: str = "→" # ↑, ↓, →
    current_value: float = 0.0
    unit: str = ""
    normal_reference: float = 0.0
    threshold_reference: float = 0.0
    contribution_points: float = 0.0
    explanation: str = ""

class RiskPredictionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    mine_id: int
    zone_id: Optional[int] = None
    level_id: Optional[int] = None
    prediction_timestamp: datetime
    horizon_minutes: int
    predicted_risk_score: float
    predicted_severity: str
    probability: float
    predicted_class: int
    current_risk_score: float
    model_name: str
    model_version: str
    dataset_type: str
    data_quality_score: float
    data_quality_notes: str
    explanation_json: str
    created_at: datetime

class PredictiveRiskSummary(BaseModel):
    mine_id: int
    mine_name: str
    current_risk_score: float
    current_severity: str
    predicted_risk_score: float
    predicted_severity: str
    risk_delta: float
    trend_direction: str # UP, DOWN, STABLE
    probability: float
    horizon_minutes: int
    model_name: str
    model_version: str
    dataset_provenance: str # SIMULATED_DEMO or PRODUCTION
    data_quality_score: float
    data_quality_notes: str
    is_alert_active: bool
    top_signals: List[SignalAttribution]
    evaluated_at: datetime

class MLModelRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    model_name: str
    version: str
    algorithm: str
    target_variable: str
    horizon_minutes: int
    status: str
    is_default: bool
    dataset_source: str
    metrics_json: str
    trained_at: datetime
    trained_by: str
    description: Optional[str] = None


# ==========================================
# MOBILE-15 Field Intelligence Schemas
# ==========================================

class MobileRiskPredictionItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    mine_id: int
    zone_id: Optional[int] = None
    zone_name: Optional[str] = None
    prediction_timestamp: datetime
    horizon_minutes: int
    predicted_risk_score: float
    predicted_severity: str
    probability: float
    predicted_class: int
    current_risk_score: float
    model_name: str
    model_version: str
    dataset_type: str
    data_quality_score: float
    data_quality_notes: str
    top_signals: List[SignalAttribution]
    field_verified: bool
    field_outcome: Optional[str] = None
    field_notes: Optional[str] = None
    verified_by_id: Optional[int] = None
    verified_by_name: Optional[str] = None
    verified_at: Optional[datetime] = None
    related_task_id: Optional[int] = None
    related_incident_id: Optional[int] = None
    evidence_url: Optional[str] = None
    evidence_file_name: Optional[str] = None
    evidence_file_hash: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_context: Optional[str] = None
    created_at: datetime


class MobileRiskSummaryResponse(BaseModel):
    mine_id: int
    mine_name: str
    current_risk_score: float
    current_severity: str
    predicted_risk_score: float
    predicted_severity: str
    probability: float
    horizon_minutes: int
    model_version: str
    data_quality_score: float
    data_quality_notes: str
    dataset_provenance: str # SIMULATED_DEMO or PRODUCTION
    high_critical_risk_count: int
    pending_verification_count: int
    is_alert_active: bool
    top_signals: List[SignalAttribution]
    last_evaluated: datetime
    freshness_status: str # LIVE, FRESH, STALE, UNAVAILABLE


class MobileRiskVerifyPayload(BaseModel):
    outcome: str # NO_ISSUE_OBSERVED, ISSUE_FOUND, REQUIRES_FURTHER_REVIEW
    notes: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_context: Optional[str] = None
    evidence_url: Optional[str] = None
    evidence_file_name: Optional[str] = None
    evidence_file_hash: Optional[str] = None
    create_governance_task: bool = False
    task_title: Optional[str] = None
    task_priority: Optional[str] = "HIGH"
    create_incident: bool = False
    incident_title: Optional[str] = None
    incident_severity: Optional[str] = "HIGH"

