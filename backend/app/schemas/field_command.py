from datetime import datetime
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class AttentionItem(BaseModel):
    id: str
    source_type: str  # "PREDICTIVE_RISK", "INCIDENT", "TASK", "REVIEW", "GRIEVANCE", "CONTRACTOR_SLA", "ENVIRONMENT", "COMPLIANCE"
    title: str
    subtitle: str
    severity: str  # "CRITICAL", "HIGH", "MEDIUM", "LOW"
    status: str
    mine_id: int
    zone_name: Optional[str] = None
    created_at: datetime
    due_at: Optional[datetime] = None
    deep_link: str
    source_label: str  # e.g. "SOURCE: PREDICTIVE MODEL (30m Horizon)", "SOURCE: DGMS CMR 2017"
    actionable: bool = True
    recommended_action: Optional[str] = None


class MyWorkItem(BaseModel):
    id: str
    work_type: str  # "TASK", "INSPECTION", "REVIEW", "PREDICTION_VERIFY", "GRIEVANCE_INVESTIGATE", "CONTRACTOR_VERIFY"
    title: str
    priority: str
    status: str
    due_at: Optional[datetime] = None
    deep_link: str
    source_label: str


class NearbyItem(BaseModel):
    id: str
    item_type: str  # "RISK", "INCIDENT", "TASK", "INSPECTION", "SENSOR"
    title: str
    distance_meters: Optional[float] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    zone_name: Optional[str] = None
    severity: str = "MEDIUM"
    deep_link: str


class CommandSummaryResponse(BaseModel):
    mine_id: int
    mine_name: str
    shift_name: str
    shift_type: str
    user_role: str
    user_name: str
    data_freshness: str  # "LIVE", "LAST_KNOWN", "STALE", "UNAVAILABLE"
    is_simulated: bool = True
    attention_items: List[AttentionItem] = []
    my_work_items: List[MyWorkItem] = []
    nearby_items: List[NearbyItem] = []
    counts: Dict[str, int] = {}
    last_sync_timestamp: Optional[datetime] = None


class UnifiedTimelineEvent(BaseModel):
    id: int
    timestamp: datetime
    action: str
    actor_name: str
    actor_role: str
    description: str
    category: str  # "RISK", "VERIFICATION", "EVIDENCE", "GOVERNANCE", "REVIEW", "SIGN_OFF", "AUDIT"
    metadata: Dict[str, Any] = {}


class RelatedRecordsResponse(BaseModel):
    resource_type: str
    resource_id: str
    mine_id: int
    risk_predictions: List[Dict[str, Any]] = []
    incidents: List[Dict[str, Any]] = []
    governance_tasks: List[Dict[str, Any]] = []
    inspections: List[Dict[str, Any]] = []
    evidence: List[Dict[str, Any]] = []
    environmental_observations: List[Dict[str, Any]] = []
    compliance_observations: List[Dict[str, Any]] = []
    contractor_verifications: List[Dict[str, Any]] = []
    grievances: List[Dict[str, Any]] = []
    approval_requests: List[Dict[str, Any]] = []
    audit_events: List[Dict[str, Any]] = []
