from typing import List, Optional, Any, Dict
from datetime import datetime, date
from pydantic import BaseModel, ConfigDict

# --- Production Schemas ---
class ProductionReportCreate(BaseModel):
    mine_id: int
    report_date: Optional[date] = None
    shift: str = "A"
    material_type: str = "COAL_RAW"
    planned_quantity: float
    actual_quantity: float
    unit: str = "TONNES"
    notes: Optional[str] = None

class ProductionReportRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    report_code: str
    mine_id: int
    report_date: date
    shift: str
    material_type: str
    planned_quantity: float
    actual_quantity: float
    unit: str
    variance_quantity: float
    variance_percentage: float
    status: str
    deviation_flag: str
    reporting_officer_id: Optional[int] = None
    notes: Optional[str] = None
    created_at: datetime

# --- Workforce & Attendance Schemas ---
class WorkerCreate(BaseModel):
    mine_id: int
    worker_code: str
    full_name: str
    designation: str
    trade_category: str = "MINER"
    contractor_id: Optional[int] = None
    is_contractual: bool = False
    emergency_contact: Optional[str] = None
    blood_group: Optional[str] = None

class WorkerRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    worker_code: str
    full_name: str
    designation: str
    trade_category: str
    mine_id: int
    contractor_id: Optional[int] = None
    is_contractual: bool
    emergency_contact: Optional[str] = None
    blood_group: Optional[str] = None
    status: str
    created_at: datetime

class AttendanceLogCreate(BaseModel):
    worker_id: int
    mine_id: int
    shift_code: str = "A"
    status: str = "PRESENT" # PRESENT, ABSENT, LATE, ON_LEAVE
    verification_mode: str = "SIMULATED"
    notes: Optional[str] = None

class AttendanceRecordRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    worker_id: int
    mine_id: int
    attendance_date: date
    status: str
    verification_mode: str
    check_in_time: Optional[datetime] = None
    created_at: datetime
    worker_name: Optional[str] = None
    worker_code: Optional[str] = None


class MobileAttendanceLogCreate(BaseModel):
    worker_id: int
    mine_id: int
    shift_code: str = "A"
    status: str = "PRESENT" # PRESENT, ABSENT, ON_LEAVE, OFF_DUTY
    notes: Optional[str] = None
    device_latitude: Optional[float] = None
    device_longitude: Optional[float] = None


class MobileAttendanceCorrection(BaseModel):
    attendance_id: int
    mine_id: int
    new_status: str
    correction_reason: str


class ShiftHandoverCreate(BaseModel):
    mine_id: int
    from_shift_code: str = "A"
    to_shift_code: str = "B"
    summary_notes: str
    safety_summary: Optional[str] = None


class ShiftHandoverAcknowledge(BaseModel):
    acknowledgment_notes: Optional[str] = None


class ShiftHandoverRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    handover_code: str
    mine_id: int
    from_shift_code: str
    to_shift_code: str
    outgoing_officer_id: int
    outgoing_officer_name: Optional[str] = None
    incoming_officer_id: Optional[int] = None
    incoming_officer_name: Optional[str] = None
    status: str
    summary_notes: Optional[str] = None
    safety_summary: Optional[str] = None
    open_items_count: int
    acknowledged_at: Optional[datetime] = None
    acknowledgment_notes: Optional[str] = None
    created_at: datetime


# --- Contractor Schemas ---
class ContractorCreate(BaseModel):
    contractor_code: str
    company_name: str
    registration_number: str
    contact_person: str
    email: str
    phone: str
    pan_number: Optional[str] = None
    gst_number: Optional[str] = None

class ContractorRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    contractor_code: str
    company_name: str
    registration_number: str
    contact_person: str
    email: str
    phone: str
    safety_rating: float
    status: str
    created_at: datetime

class ContractCreate(BaseModel):
    contractor_id: int
    mine_id: int
    contract_code: str
    work_scope: str
    description: Optional[str] = None
    start_date: date
    end_date: date
    total_value: float

class ContractRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    contract_code: str
    contractor_id: int
    mine_id: int
    work_scope: str
    description: Optional[str] = None
    start_date: date
    end_date: date
    total_value: float
    status: str
    compliance_status: str
    created_at: datetime
    contractor_name: Optional[str] = None

# --- Environmental Schemas ---
class EnvironmentalObservationCreate(BaseModel):
    mine_id: int
    parameter_name: str
    observed_value: float
    threshold_limit: float
    unit: str
    severity: str = "MEDIUM"
    location_context: Optional[str] = None
    x: Optional[float] = 0.0
    y: Optional[float] = 0.0
    z: Optional[float] = 0.0
    action_taken: Optional[str] = None

class EnvironmentalObservationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    mine_id: int
    parameter_name: str
    observed_value: float
    threshold_limit: float
    unit: str
    severity: str
    status: str
    location_context: Optional[str] = None
    x: float
    y: float
    z: float
    detected_at: datetime

# --- Grievance Schemas ---
class GrievanceCreate(BaseModel):
    mine_id: int
    category: str = "SAFETY"
    title: str
    description: str
    priority: str = "MEDIUM"
    anonymous: bool = False

class GrievanceUpdate(BaseModel):
    status: str
    resolution_notes: Optional[str] = None
    assigned_to_id: Optional[int] = None

class GrievanceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    grievance_code: str
    mine_id: int
    category: str
    title: str
    description: str
    priority: str
    status: str
    anonymous: bool
    sla_hours: int
    due_at: datetime
    is_escalated: bool
    resolution_notes: Optional[str] = None
    created_at: datetime
    submitted_by_name: Optional[str] = None

# --- Digital Approvals Schemas ---
class ApprovalRequestCreate(BaseModel):
    resource_type: str
    resource_id: str
    mine_id: int
    title: str
    description: Optional[str] = None
    required_role: str = "MINE_MANAGER"

class ApprovalDecision(BaseModel):
    action: str # APPROVE, REJECT, REQUEST_CHANGES
    comments: Optional[str] = None

class ApprovalResubmit(BaseModel):
    comments: Optional[str] = None
    updated_description: Optional[str] = None

class ApprovalActionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    actor_id: int
    actor_name: Optional[str] = None
    action: str
    role_used: str
    comments: Optional[str] = None
    created_at: datetime

class ApprovalRequestRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    request_code: str
    resource_type: str
    resource_id: str
    mine_id: int
    mine_name: Optional[str] = None
    title: str
    description: Optional[str] = None
    requester_id: int
    requester_name: Optional[str] = None
    required_role: str
    status: str
    final_decision_at: Optional[datetime] = None
    created_at: datetime
    actions: List[ApprovalActionRead] = []

class MobileReviewItem(BaseModel):
    id: int
    request_code: str
    resource_type: str
    resource_id: str
    mine_id: int
    mine_name: str
    title: str
    description: Optional[str] = None
    requester_id: int
    requester_name: str
    required_role: str
    status: str
    priority: str = "MEDIUM"
    evidence_count: int = 0
    location_summary: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_source: Optional[str] = "ACTUAL_GPS"
    due_at: Optional[datetime] = None
    is_overdue: bool = False
    sla_text: str = "ON TRACK"
    can_approve: bool = True
    sod_warning: Optional[str] = None
    created_at: datetime
    final_decision_at: Optional[datetime] = None
    last_action: Optional[str] = None

class MobileReviewDetail(BaseModel):
    id: int
    request_code: str
    resource_type: str
    resource_id: str
    mine_id: int
    mine_name: str
    title: str
    description: Optional[str] = None
    requester_id: int
    requester_name: str
    required_role: str
    status: str
    priority: str = "MEDIUM"
    created_at: datetime
    final_decision_at: Optional[datetime] = None
    can_approve: bool = True
    sod_warning: Optional[str] = None
    
    # Field context & Spatial
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_source: Optional[str] = "ACTUAL_GPS"
    zone_name: Optional[str] = None
    level_name: Optional[str] = None
    
    # DGMS checklist & Observations
    checklist: List[Dict[str, Any]] = []
    observations: Optional[str] = None
    severity: Optional[str] = "LOW"
    statutory_reference: Optional[str] = None
    
    # Evidence items
    evidences: List[Dict[str, Any]] = []
    
    # Related Governance
    related_incident_id: Optional[int] = None
    related_incident_code: Optional[str] = None
    related_task_id: Optional[int] = None
    related_task_code: Optional[str] = None
    related_violation_id: Optional[int] = None
    predictive_risk_score: Optional[float] = None
    
    # Audit & Timeline
    timeline: List[Dict[str, Any]] = []

# --- Regulatory Report Schemas ---
class ReportGenerateRequest(BaseModel):
    mine_id: int
    report_type: str # COMPLIANCE_SUMMARY, SAFETY_INSPECTION_SUMMARY, INCIDENT_SUMMARY, ENVIRONMENTAL_SUMMARY, PRODUCTION_SUMMARY, MINE_GOVERNANCE_SUMMARY
    title: str
    reporting_period_start: date
    reporting_period_end: date

class RegulatoryReportRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    report_code: str
    mine_id: int
    report_type: str
    title: str
    reporting_period_start: date
    reporting_period_end: date
    status: str
    current_version: int
    generated_at: datetime
    generated_by_id: int
    summary_data: Optional[Dict[str, Any]] = None

# --- Governance Task & SLA Schemas ---
class GovernanceTaskCreate(BaseModel):
    mine_id: int
    domain: str = "SAFETY"
    title: str
    description: str
    priority: str = "MEDIUM"
    assignee_id: Optional[int] = None
    due_at: datetime
    source_resource_type: Optional[str] = None
    source_resource_id: Optional[str] = None

class GovernanceTaskRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    task_code: str
    mine_id: int
    domain: str
    title: str
    description: str
    priority: str
    status: str
    sla_status: str
    due_at: datetime
    escalation_level: int
    assignee_id: Optional[int] = None
    created_at: datetime

# --- Unified Governance Dashboard Summary ---
class GovernanceDashboardSummary(BaseModel):
    mine_id: int
    mine_name: str
    production_today_tonnes: float
    production_planned_tonnes: float
    production_variance_pct: float
    attendance_headcount: int
    attendance_present_pct: float
    active_contracts: int
    contracts_expiring_soon: int
    open_environmental_observations: int
    open_grievances: int
    grievances_sla_breached: int
    pending_approvals: int
    reports_generated_month: int
    open_governance_tasks: int
    governance_risk_score: float
    governance_risk_severity: str


# --- MOBILE-12 Field Reporting Schemas ---
class MobileProductionReportCreate(BaseModel):
    mine_id: int
    shift: str = "A"
    report_date: Optional[date] = None
    material_type: str = "COAL_RAW"
    planned_quantity: float
    actual_quantity: float
    unit: str = "TONNES"
    coal_grade: Optional[str] = "G-11 Steam Coal"
    production_source: str = "MANUAL" # MANUAL, SENSOR_DERIVED, IMPORTED, SIMULATED
    notes: Optional[str] = None
    evidence_code: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class MobileEnvironmentalObservationCreate(BaseModel):
    mine_id: int
    parameter_name: str # PM10, PM2.5, NOISE_DB, WATER_PH, EFFLUENT_TSS, AMBIENT_TEMP
    observed_value: float
    unit: str = "µg/m³"
    rule_id: Optional[int] = None
    threshold_limit: Optional[float] = None
    measurement_source: str = "MANUAL" # MANUAL, SENSOR_DERIVED, SIMULATED
    severity: Optional[str] = "MEDIUM"
    location_context: Optional[str] = "Bench Area / Incline Pit"
    x: Optional[float] = 0.0
    y: Optional[float] = 0.0
    z: Optional[float] = 0.0
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    action_taken: Optional[str] = None
    evidence_code: Optional[str] = None


class MobileComplianceObservationCreate(BaseModel):
    mine_id: int
    title: str
    description: str
    regulatory_clause: str # e.g. "CMR 2017 - Reg 153 (Ventilation)"
    statute: str = "DGMS_CMR_2017"
    severity: str = "HIGH" # LOW, MEDIUM, HIGH, CRITICAL
    remedial_deadline: Optional[datetime] = None
    financial_penalty_amount: Optional[float] = 0.0
    corrective_action_text: Optional[str] = None
    corrective_action_target_date: Optional[datetime] = None
    location_context: Optional[str] = "Main Haul Road / Shaft Bottom"
    evidence_code: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


# --- MOBILE-13: Contractor Field Operations & SLA Schemas ---
class MobileContractRequirementItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    contract_id: int
    contract_code: str
    contractor_name: str
    title: str
    document_type: str
    mandatory: bool
    status: str # DOCUMENTED, PENDING, EXPIRED, NOT_PROVIDED, ISSUE_FOUND
    expiry_date: Optional[date] = None
    sla_status: str # ON_TRACK, DUE_SOON, OVERDUE, EXPIRED, COMPLIANT
    days_until_expiry: Optional[int] = None
    verification_notes: Optional[str] = None
    verified_at: Optional[datetime] = None
    verified_by_id: Optional[int] = None
    verified_by_name: Optional[str] = None
    evidence_code: Optional[str] = None
    evidence_file_name: Optional[str] = None
    evidence_file_hash: Optional[str] = None
    location_context: Optional[str] = None


class MobileContractDetailItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    contract_code: str
    contractor_id: int
    contractor_name: str
    mine_id: int
    mine_name: str
    work_scope: str
    description: Optional[str] = None
    start_date: date
    end_date: date
    total_value: float
    status: str # ACTIVE, EXPIRING, EXPIRED, SUSPENDED, CLOSED
    compliance_status: str # COMPLIANT, REVIEW_REQUIRED, NON_COMPLIANT
    responsible_officer_id: Optional[int] = None
    responsible_officer_name: Optional[str] = None
    requirements_count: int = 0
    documented_count: int = 0
    pending_count: int = 0
    expired_count: int = 0
    overdue_count: int = 0
    requirements: List[MobileContractRequirementItem] = []


class MobileContractorSummaryItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    contractor_code: str
    company_name: str
    registration_number: str
    contact_person: str
    email: str
    phone: str
    safety_rating: float
    status: str
    contracts_count: int = 0
    active_contracts_count: int = 0
    total_requirements_count: int = 0
    overdue_requirements_count: int = 0
    pending_requirements_count: int = 0
    compliance_health: str = "GOOD" # GOOD, ATTENTION_REQUIRED, CRITICAL


class MobileContractorSummaryResponse(BaseModel):
    mine_id: int
    mine_name: str
    total_contractors: int
    active_contracts: int
    total_requirements: int
    overdue_requirements: int
    pending_verifications: int
    open_corrective_actions: int
    contractors: List[MobileContractorSummaryItem] = []


class MobileContractorVerificationCreate(BaseModel):
    requirement_id: int
    contract_id: Optional[int] = None
    verification_status: str # DOCUMENTED, PENDING, EXPIRED, NOT_PROVIDED, ISSUE_FOUND
    verification_notes: str
    expiry_date: Optional[date] = None
    evidence_file_name: Optional[str] = None
    evidence_url: Optional[str] = None
    evidence_file_hash: Optional[str] = None
    device_latitude: Optional[float] = None
    device_longitude: Optional[float] = None
    location_source: Optional[str] = "ACTUAL_GPS"
    location_context: Optional[str] = None
    create_corrective_action: Optional[bool] = False
    corrective_action_title: Optional[str] = None
    corrective_action_description: Optional[str] = None
    remedial_deadline: Optional[date] = None
    assigned_to_id: Optional[int] = None


# --- MOBILE-14: Grievance & Public/Worker Issue Field Operations ---
class MobileGrievanceSummaryItem(BaseModel):
    id: int
    grievance_code: str
    mine_id: int
    mine_name: str
    category: str
    title: str
    description: str
    priority: str
    status: str
    anonymous: bool
    submitted_by_name: Optional[str] = None
    assigned_to_id: Optional[int] = None
    assigned_to_name: Optional[str] = None
    sla_hours: int
    due_at: datetime
    sla_status: str # ON_TRACK, DUE_SOON, OVERDUE, RESOLVED, CLOSED
    is_escalated: bool
    created_at: datetime
    has_evidence: bool = False
    has_location: bool = False
    has_task: bool = False
    has_incident: bool = False


class MobileGrievanceSummaryResponse(BaseModel):
    mine_id: int
    mine_name: str
    total_grievances: int
    open_grievances: int
    assigned_grievances: int
    investigation_required: int
    overdue_grievances: int
    resolved_grievances: int
    grievances: List[MobileGrievanceSummaryItem] = []


class MobileGrievanceDetail(BaseModel):
    id: int
    grievance_code: str
    mine_id: int
    mine_name: str
    category: str
    title: str
    description: str
    priority: str
    status: str
    anonymous: bool
    submitted_by_id: Optional[int] = None
    submitted_by_name: Optional[str] = None
    assigned_to_id: Optional[int] = None
    assigned_to_name: Optional[str] = None
    sla_hours: int
    due_at: datetime
    sla_status: str
    is_escalated: bool
    escalation_level: int = 0
    
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_source: Optional[str] = None
    location_context: Optional[str] = None
    
    evidence_url: Optional[str] = None
    evidence_file_name: Optional[str] = None
    evidence_file_hash: Optional[str] = None
    
    investigation_notes: Optional[str] = None
    investigated_by_id: Optional[int] = None
    investigated_by_name: Optional[str] = None
    investigated_at: Optional[datetime] = None
    action_required: bool = False
    
    resolution_notes: Optional[str] = None
    resolved_at: Optional[datetime] = None
    verified_at: Optional[datetime] = None
    closed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    related_task_id: Optional[int] = None
    related_task_code: Optional[str] = None
    related_incident_id: Optional[int] = None
    related_incident_code: Optional[str] = None
    source_channel: str = "MOBILE_FIELD"
    
    acknowledged_at: Optional[datetime] = None
    acknowledged_by_id: Optional[int] = None
    acknowledged_by_name: Optional[str] = None


class MobileGrievanceCreate(BaseModel):
    mine_id: int
    category: str = "WORKER_WELFARE" # WORKER_WELFARE, SAFETY, ENVIRONMENT, WATER, HEALTH, ACCESS, CONTRACTOR, INFRASTRUCTURE, PAY_LABOUR, OTHER
    title: str
    description: str
    priority: str = "MEDIUM" # LOW, MEDIUM, HIGH, CRITICAL
    anonymous: bool = False
    location_context: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_source: Optional[str] = "ACTUAL_GPS"
    evidence_file_name: Optional[str] = None
    evidence_url: Optional[str] = None
    evidence_file_hash: Optional[str] = None
    source_channel: Optional[str] = "MOBILE_FIELD"


class MobileGrievanceAcknowledge(BaseModel):
    notes: Optional[str] = None


class MobileGrievanceAssign(BaseModel):
    assigned_to_id: int
    priority: Optional[str] = None
    notes: Optional[str] = None


class MobileGrievanceInvestigate(BaseModel):
    investigation_notes: str
    action_required: bool = False
    evidence_file_name: Optional[str] = None
    evidence_url: Optional[str] = None
    evidence_file_hash: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_source: Optional[str] = "ACTUAL_GPS"
    create_task: Optional[bool] = False
    task_title: Optional[str] = None
    task_description: Optional[str] = None
    task_sla_days: Optional[int] = 3
    create_incident: Optional[bool] = False
    incident_title: Optional[str] = None
    incident_severity: Optional[str] = "MEDIUM"


class MobileGrievanceResolve(BaseModel):
    resolution_notes: str
    submit_for_review: bool = True



