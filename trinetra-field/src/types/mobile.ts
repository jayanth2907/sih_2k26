export type MobileTab = 'home' | 'tasks' | 'map' | 'incidents' | 'copilot' | 'more' | 'notifications' | 'sync' | 'reviews' | 'documents' | 'workforce' | 'reporting' | 'contractors' | 'grievances' | 'intelligence';

export interface MobileProductionReportItem {
  id: number;
  report_code: string;
  shift: string;
  report_date: string;
  material_type: string;
  planned_quantity: number;
  actual_quantity: number;
  unit: string;
  variance_quantity: number;
  variance_percentage: number;
  status: string;
  deviation_flag: string;
  notes?: string | null;
  reporting_officer?: string | null;
  created_at: string;
}

export interface MobileEnvironmentalRuleItem {
  id: number;
  rule_code: string;
  parameter_name: string;
  threshold_limit: number;
  unit: string;
  severity: string;
  statute_reference: string;
  description?: string | null;
}

export interface MobileEnvironmentalObservationItem {
  id: number;
  parameter_name: string;
  observed_value: number;
  threshold_limit: number;
  unit: string;
  severity: string;
  status: string;
  location_context?: string | null;
  detected_at: string;
  action_taken?: string | null;
  rule_code?: string | null;
}

export interface MobileComplianceObservationItem {
  id: number;
  violation_code: string;
  title: string;
  description: string;
  regulatory_clause: string;
  statute: string;
  severity: string;
  status: string;
  remedial_deadline?: string | null;
  financial_penalty_amount: number;
  created_at: string;
  corrective_actions_count: number;
}

export interface MobileFieldReportingSummaryResponse {
  mine_id: number;
  mine_name: string;
  shift_context: MobileShiftContext;
  production_summary: {
    today_planned_tonnes: number;
    today_actual_tonnes: number;
    variance_percentage: number;
    reports_count: number;
    recent_reports: MobileProductionReportItem[];
  };
  environment_summary: {
    configured_rules: MobileEnvironmentalRuleItem[];
    active_observations_count: number;
    recent_observations: MobileEnvironmentalObservationItem[];
  };
  compliance_summary: {
    open_violations_count: number;
    recent_violations: MobileComplianceObservationItem[];
  };
  pending_approvals_count: number;
}

export interface MobileProductionReportCreate {
  mine_id: number;
  report_date: string;
  shift: string;
  planned_quantity: number;
  actual_quantity: number;
  unit?: string;
  material_type?: string;
  coal_grade?: string;
  provenance_source?: 'MANUAL' | 'SENSOR_DERIVED' | 'IMPORTED' | 'SIMULATED';
  reporting_method?: string;
  notes?: string;
  evidence_url?: string;
  evidence_file_name?: string;
  evidence_file_hash?: string;
  device_latitude?: number;
  device_longitude?: number;
  location_source?: 'ACTUAL_GPS' | 'SURVEYED_LOCATION';
  location_accuracy_meters?: number;
}

export interface MobileEnvironmentalObservationCreate {
  mine_id: number;
  rule_id?: number;
  parameter_name: string;
  observed_value: number;
  unit: string;
  measurement_source?: 'MANUAL' | 'SENSOR_DERIVED' | 'SIMULATED';
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  location_context?: string;
  device_latitude?: number;
  device_longitude?: number;
  location_source?: 'ACTUAL_GPS' | 'SURVEYED_LOCATION';
  action_taken?: string;
  evidence_url?: string;
  evidence_file_name?: string;
  evidence_file_hash?: string;
}

export interface MobileComplianceObservationCreate {
  mine_id: number;
  title: string;
  description: string;
  regulatory_clause?: string;
  statute?: string;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  observation_source?: 'MANUAL' | 'AUDIT_DERIVED' | 'SIMULATED';
  remedial_deadline?: string;
  corrective_action_title?: string;
  corrective_action_description?: string;
  action_owner_id?: number;
  evidence_url?: string;
  evidence_file_name?: string;
  evidence_file_hash?: string;
  device_latitude?: number;
  device_longitude?: number;
  location_source?: 'ACTUAL_GPS' | 'SURVEYED_LOCATION';
}

export interface MobileWorkforceWorker {
  id: number;
  worker_code: string;
  full_name: string;
  designation: string;
  trade_category: string;
  mine_id: number;
  contractor_id?: number | null;
  contractor_name?: string | null;
  is_contractual: boolean;
  blood_group?: string | null;
  medical_fitness_expiry?: string | null;
  safety_induction_completed: boolean;
  status: string;
  attendance_id?: number | null;
  attendance_status: string;
  verification_mode: string;
  check_in_time?: string | null;
  marked_by?: string | null;
  notes?: string | null;
}

export interface MobileWorkforceSummary {
  total_assigned: number;
  present_count: number;
  absent_count: number;
  on_leave_count: number;
  pending_attendance_count: number;
  off_duty_count: number;
}

export interface MobileShiftContext {
  has_active_shift: boolean;
  mine_id: number;
  mine_name: string;
  shift_name: string;
  shift_code: string;
  start_time: string;
  end_time: string;
  attendance_status: string;
  verification_mode: string;
  check_in_time?: string | null;
}

export interface MobileWorkforceResponse {
  shift_context: MobileShiftContext;
  summary: MobileWorkforceSummary;
  workers: MobileWorkforceWorker[];
}

export interface MobileShiftHandoverCategoryItem {
  id: number;
  code: string;
  title: string;
  severity?: string;
  priority?: string;
  status: string;
}

export interface MobileShiftHandoverCategory {
  category: 'INCIDENTS' | 'TASKS' | 'INSPECTIONS' | 'ALERTS' | 'ENVIRONMENT';
  title: string;
  count: number;
  deep_link: string;
  items: MobileShiftHandoverCategoryItem[];
}

export interface MobileShiftHandoverRecord {
  id: number;
  handover_code: string;
  mine_id: number;
  from_shift_code: string;
  to_shift_code: string;
  outgoing_officer_id: number;
  outgoing_officer_name?: string | null;
  incoming_officer_id?: number | null;
  incoming_officer_name?: string | null;
  status: string;
  summary_notes?: string | null;
  safety_summary?: string | null;
  open_items_count: number;
  acknowledged_at?: string | null;
  acknowledgment_notes?: string | null;
  created_at: string;
}

export interface MobileShiftHandoverSummaryResponse {
  mine_id: number;
  current_shift: {
    shift_code: string;
    shift_name: string;
    start_time: string;
    end_time: string;
  };
  next_shift: {
    shift_code: string;
    shift_name: string;
  };
  open_items_summary: {
    total_open_items: number;
    open_incidents_count: number;
    overdue_tasks_count: number;
    pending_inspections_count: number;
    critical_alerts_count: number;
    environmental_observations_count: number;
  };
  categories: MobileShiftHandoverCategory[];
  recent_handovers: MobileShiftHandoverRecord[];
}


export type NetworkStatusType = 'ONLINE' | 'OFFLINE' | 'SYNCING' | 'SYNC_COMPLETE' | 'SYNC_ERROR';

export interface MobileTaskCounts {
  assignedTasks: number;
  highPriority: number;
  pendingSync: number;
}

export type MobileAction =
  | 'INSPECTION_CREATE'
  | 'INSPECTION_AUDIT'
  | 'INCIDENT_REPORT'
  | 'INCIDENT_MANAGE'
  | 'OBSERVATION_CREATE'
  | 'EVIDENCE_CAPTURE'
  | 'EVIDENCE_VERIFY'
  | 'APPROVAL_ACTION'
  | 'MINE_OVERVIEW'
  | 'STATUTORY_AUDIT'
  | 'VIOLATION_VIEW'
  | 'WORKFORCE_VERIFY'
  | 'DIAGNOSTICS_VIEW';

export interface MobileReviewCounts {
  total: number;
  pending: number;
  urgent: number;
  overdue: number;
  returned: number;
  approved: number;
  rejected: number;
}

export interface MobileReviewItemData {
  id: number;
  request_code: string;
  resource_type: string;
  resource_id: string;
  mine_id: number;
  mine_name: string;
  title: string;
  description?: string;
  requester_id: number;
  requester_name: string;
  required_role: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED';
  priority: string;
  evidence_count: number;
  location_summary?: string;
  latitude?: number;
  longitude?: number;
  location_source?: string;
  is_overdue: boolean;
  sla_text: string;
  can_approve: boolean;
  sod_warning?: string;
  created_at: string;
  final_decision_at?: string;
  last_action?: string;
}

export interface ReviewChecklistItem {
  item_id: string;
  description: string;
  status: string;
  notes?: string;
}

export interface ReviewEvidenceItem {
  id: number;
  evidence_code: string;
  title: string;
  description?: string;
  evidence_type: string;
  file_hash_sha256: string;
  file_size_bytes: number;
  mime_type?: string;
  location_source?: string;
  latitude?: number;
  longitude?: number;
  gps_accuracy_meters?: number;
  verification_status: string;
  client_capture_timestamp?: string;
  captured_by_name?: string;
}

export interface ReviewTimelineItem {
  id: string | number;
  action: string;
  actor_id?: number;
  actor_name?: string;
  role_used?: string;
  comments?: string;
  created_at?: string;
}

export interface MobileReviewDetailData {
  id: number;
  request_code: string;
  resource_type: string;
  resource_id: string;
  mine_id: number;
  mine_name: string;
  title: string;
  description?: string;
  requester_id: number;
  requester_name: string;
  required_role: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED';
  priority: string;
  created_at: string;
  final_decision_at?: string;
  can_approve: boolean;
  sod_warning?: string;
  latitude?: number;
  longitude?: number;
  location_source?: string;
  zone_name?: string;
  level_name?: string;
  checklist: ReviewChecklistItem[];
  observations?: string;
  severity?: string;
  statutory_reference?: string;
  evidences: ReviewEvidenceItem[];
  related_incident_id?: number;
  related_incident_code?: string;
  related_task_id?: number;
  related_task_code?: string;
  related_violation_id?: number;
  predictive_risk_score?: number;
  timeline: ReviewTimelineItem[];
}

// MOBILE-10: Field Documents & Statutory Types
export interface MobileDocumentCounts {
  total: number;
  statutory: number;
  mine_operational: number;
  ocr_verified: number;
  pending_review: number;
}

export interface MobileDocumentItem {
  id: string;
  numeric_id?: number | null;
  document_code: string;
  title: string;
  category: string;
  source_category?: string;
  source_tier: string;
  organization?: string;
  year?: string;
  status: string;
  ocr_status: string;
  page_count: number;
  file_hash_sha256: string;
  mime_type?: string;
  is_statutory: boolean;
  mine_id?: number | null;
  mine_name?: string;
  uploaded_at?: string;
  verification_status: string;
  confidence_score?: number;
  available_offline: boolean;
  stale: boolean;
  description?: string;
}

export interface MobileDocumentPage {
  id: number;
  page_number: number;
  section_heading?: string;
  extraction_method: string;
  ocr_provider?: string;
  ocr_confidence?: number;
  ocr_confidence_band?: string;
  quality_status: string;
  page_hash?: string;
  text_content: string;
}

export interface MobileExtractedField {
  id: number;
  field_name: string;
  field_value: string;
  confidence: number;
  source_text?: string;
  validation_status: string;
  is_verified: string;
  verified_value?: string;
}

export interface MobileDocumentDetail extends MobileDocumentItem {
  source_filename?: string;
  file_size_bytes?: number;
  processing_stage?: string;
  quality_status?: string;
  extracted_text?: string;
  effective_from?: string;
  effective_to?: string;
  verified_at?: string;
  pages: MobileDocumentPage[];
  fields: MobileExtractedField[];
}

export interface StatutoryRequirementDetail {
  regulation_ref: string;
  found: boolean;
  document_code: string;
  document_title: string;
  organization: string;
  regulation_name: string;
  page_number: number;
  section_heading: string;
  verbatim_text: string;
  domain: string;
  source_tier: string;
  effective_from?: string;
  file_hash_sha256: string;
}

// MOBILE-13: Contractor Field Operations & SLA Types
export interface MobileContractRequirementItem {
  id: number;
  contract_id: number;
  contract_code: string;
  contractor_name: string;
  title: string;
  document_type: string;
  mandatory: boolean;
  status: string; // DOCUMENTED, PENDING, EXPIRED, NOT_PROVIDED, ISSUE_FOUND
  expiry_date?: string | null;
  sla_status: string; // ON_TRACK, DUE_SOON, OVERDUE, EXPIRED, COMPLIANT
  days_until_expiry?: number | null;
  verification_notes?: string | null;
  verified_at?: string | null;
  verified_by_id?: number | null;
  verified_by_name?: string | null;
  evidence_file_name?: string | null;
  evidence_url?: string | null;
  evidence_file_hash?: string | null;
  location_context?: string | null;
}

export interface MobileContractDetailItem {
  id: number;
  contract_code: string;
  contractor_id: number;
  contractor_name: string;
  mine_id: number;
  mine_name: string;
  work_scope: string;
  description?: string | null;
  start_date: string;
  end_date: string;
  total_value: number;
  status: string; // ACTIVE, EXPIRING, EXPIRED, SUSPENDED, CLOSED
  compliance_status: string; // COMPLIANT, REVIEW_REQUIRED, NON_COMPLIANT
  responsible_officer_id?: number | null;
  responsible_officer_name?: string | null;
  requirements_count: number;
  documented_count: number;
  pending_count: number;
  expired_count: number;
  overdue_count: number;
  requirements: MobileContractRequirementItem[];
}

export interface MobileContractorSummaryItem {
  id: number;
  contractor_code: string;
  company_name: string;
  registration_number: string;
  contact_person: string;
  email: string;
  phone: string;
  safety_rating: number;
  status: string;
  contracts_count: number;
  active_contracts_count: number;
  total_requirements_count: number;
  overdue_requirements_count: number;
  pending_requirements_count: number;
  compliance_health: 'GOOD' | 'ATTENTION_REQUIRED' | 'CRITICAL';
}

export interface MobileContractorSummaryResponse {
  mine_id: number;
  mine_name: string;
  total_contractors: number;
  active_contracts: number;
  total_requirements: number;
  overdue_requirements: number;
  pending_verifications: number;
  open_corrective_actions: number;
  contractors: MobileContractorSummaryItem[];
}

export interface MobileContractorVerificationCreate {
  requirement_id: number;
  contract_id?: number;
  verification_status: string; // DOCUMENTED, PENDING, EXPIRED, NOT_PROVIDED, ISSUE_FOUND, COMPLIANT
  verification_notes: string;
  expiry_date?: string;
  evidence_file_name?: string;
  evidence_url?: string;
  evidence_file_hash?: string;
  device_latitude?: number;
  device_longitude?: number;
  location_source?: 'ACTUAL_GPS' | 'SURVEYED_LOCATION';
  location_context?: string;
  create_corrective_action?: boolean;
  corrective_action_title?: string;
  corrective_action_description?: string;
  remedial_deadline?: string;
  assigned_to_id?: number;
}

// MOBILE-14: Grievance & Public/Worker Issue Field Types
export interface MobileGrievanceSummaryItem {
  id: number;
  grievance_code: string;
  mine_id: number;
  mine_name: string;
  category: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  anonymous: boolean;
  submitted_by_name?: string | null;
  assigned_to_id?: number | null;
  assigned_to_name?: string | null;
  sla_hours: number;
  due_at: string;
  sla_status: 'ON_TRACK' | 'DUE_SOON' | 'OVERDUE' | 'RESOLVED' | 'CLOSED';
  is_escalated: boolean;
  created_at: string;
  has_evidence: boolean;
  has_location: boolean;
  has_task: boolean;
  has_incident: boolean;
}

export interface MobileGrievanceSummaryResponse {
  mine_id: number;
  mine_name: string;
  total_grievances: number;
  open_grievances: number;
  assigned_grievances: number;
  investigation_required: number;
  overdue_grievances: number;
  resolved_grievances: number;
  grievances: MobileGrievanceSummaryItem[];
}

export interface MobileGrievanceDetail {
  id: number;
  grievance_code: string;
  mine_id: number;
  mine_name: string;
  category: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  anonymous: boolean;
  submitted_by_id?: number | null;
  submitted_by_name?: string | null;
  assigned_to_id?: number | null;
  assigned_to_name?: string | null;
  sla_hours: number;
  due_at: string;
  sla_status: 'ON_TRACK' | 'DUE_SOON' | 'OVERDUE' | 'RESOLVED' | 'CLOSED';
  is_escalated: boolean;
  escalation_level: number;
  latitude?: number | null;
  longitude?: number | null;
  location_source?: string | null;
  location_context?: string | null;
  evidence_url?: string | null;
  evidence_file_name?: string | null;
  evidence_file_hash?: string | null;
  investigation_notes?: string | null;
  investigated_by_id?: number | null;
  investigated_by_name?: string | null;
  investigated_at?: string | null;
  action_required: boolean;
  resolution_notes?: string | null;
  resolved_at?: string | null;
  verified_at?: string | null;
  closed_at?: string | null;
  created_at: string;
  updated_at: string;
  related_task_id?: number | null;
  related_task_code?: string | null;
  related_incident_id?: number | null;
  related_incident_code?: string | null;
  source_channel: string;
  acknowledged_at?: string | null;
  acknowledged_by_id?: number | null;
  acknowledged_by_name?: string | null;
}

export interface MobileGrievanceCreate {
  mine_id: number;
  category: string; // WORKER_WELFARE, SAFETY, ENVIRONMENT, WATER, HEALTH, ACCESS, CONTRACTOR, INFRASTRUCTURE, PAY_LABOUR, OTHER
  title: string;
  description: string;
  priority: string; // LOW, MEDIUM, HIGH, CRITICAL
  anonymous?: boolean;
  location_context?: string;
  latitude?: number;
  longitude?: number;
  location_source?: 'ACTUAL_GPS' | 'SURVEYED_LOCATION';
  evidence_file_name?: string;
  evidence_url?: string;
  evidence_file_hash?: string;
  source_channel?: string;
}

export interface MobileGrievanceAcknowledge {
  notes?: string;
}

export interface MobileGrievanceAssign {
  assigned_to_id: number;
  priority?: string;
  notes?: string;
}

export interface MobileGrievanceInvestigate {
  investigation_notes: string;
  action_required?: boolean;
  evidence_file_name?: string;
  evidence_url?: string;
  evidence_file_hash?: string;
  latitude?: number;
  longitude?: number;
  location_source?: 'ACTUAL_GPS' | 'SURVEYED_LOCATION';
  create_task?: boolean;
  task_title?: string;
  task_description?: string;
  task_sla_days?: number;
  create_incident?: boolean;
  incident_title?: string;
  incident_severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface MobileGrievanceResolve {
  resolution_notes: string;
  submit_for_review?: boolean;
}

// ============================================================================
// MOBILE-15 Field Intelligence & Predictive Risk Actions
// ============================================================================

export interface SignalAttributionItem {
  feature: string;
  label: string;
  direction: 'INCREASING_RISK' | 'MITIGATING_RISK' | 'NEUTRAL';
  symbol: string;
  current_value: number;
  unit: string;
  normal_reference: number;
  threshold_reference: number;
  contribution_points: number;
  explanation: string;
}

export interface MobileRiskPredictionItem {
  id: number;
  mine_id: number;
  zone_id?: number | null;
  zone_name?: string | null;
  prediction_timestamp: string;
  horizon_minutes: number;
  predicted_risk_score: number;
  predicted_severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  probability: number;
  predicted_class: number;
  current_risk_score: number;
  model_name: string;
  model_version: string;
  dataset_type: string;
  data_quality_score: number;
  data_quality_notes: string;
  top_signals: SignalAttributionItem[];
  field_verified: boolean;
  field_outcome?: 'NO_ISSUE_OBSERVED' | 'ISSUE_FOUND' | 'REQUIRES_FURTHER_REVIEW' | null;
  field_notes?: string | null;
  verified_by_id?: number | null;
  verified_by_name?: string | null;
  verified_at?: string | null;
  related_task_id?: number | null;
  related_incident_id?: number | null;
  evidence_url?: string | null;
  evidence_file_name?: string | null;
  evidence_file_hash?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  location_context?: string | null;
  created_at: string;
}

export interface MobileRiskSummaryResponse {
  mine_id: number;
  mine_name: string;
  current_risk_score: number;
  current_severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  predicted_risk_score: number;
  predicted_severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  probability: number;
  horizon_minutes: number;
  model_version: string;
  data_quality_score: number;
  data_quality_notes: string;
  dataset_provenance: string;
  high_critical_risk_count: number;
  pending_verification_count: number;
  is_alert_active: boolean;
  top_signals: SignalAttributionItem[];
  last_evaluated: string;
  freshness_status: 'LIVE' | 'LAST_KNOWN_PREDICTION' | 'STALE' | 'UNAVAILABLE';
}

export interface MobileRiskVerifyPayload {
  outcome: 'NO_ISSUE_OBSERVED' | 'ISSUE_FOUND' | 'REQUIRES_FURTHER_REVIEW';
  notes: string;
  latitude?: number;
  longitude?: number;
  location_context?: string;
  evidence_url?: string;
  evidence_file_name?: string;
  evidence_file_hash?: string;
  create_governance_task?: boolean;
  task_title?: string;
  task_priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  create_incident?: boolean;
  incident_title?: string;
  incident_severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

// ============================================================
// MOBILE-16: Cross-Domain Field Command & Integration Types
// ============================================================

export interface AttentionItem {
  id: string;
  source_type: 'PREDICTIVE_RISK' | 'INCIDENT' | 'TASK' | 'REVIEW' | 'GRIEVANCE' | 'CONTRACTOR_SLA' | 'ENVIRONMENT' | 'COMPLIANCE';
  title: string;
  subtitle: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  status: string;
  mine_id: number;
  zone_name?: string | null;
  created_at: string;
  due_at?: string | null;
  deep_link: string;
  source_label: string;
  actionable: boolean;
  recommended_action?: string | null;
}

export interface MyWorkItem {
  id: string;
  work_type: 'TASK' | 'INSPECTION' | 'REVIEW' | 'PREDICTION_VERIFY' | 'GRIEVANCE_INVESTIGATE' | 'CONTRACTOR_VERIFY';
  title: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  status: string;
  due_at?: string | null;
  deep_link: string;
  source_label: string;
}

export interface NearbyItem {
  id: string;
  item_type: 'RISK' | 'INCIDENT' | 'TASK' | 'INSPECTION' | 'SENSOR';
  title: string;
  distance_meters?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  zone_name?: string | null;
  severity: string;
  deep_link: string;
}

export interface CommandSummaryResponse {
  mine_id: number;
  mine_name: string;
  shift_name: string;
  shift_type: string;
  user_role: string;
  user_name: string;
  data_freshness: 'LIVE' | 'LAST_KNOWN' | 'STALE' | 'UNAVAILABLE';
  is_simulated: boolean;
  attention_items: AttentionItem[];
  my_work_items: MyWorkItem[];
  nearby_items: NearbyItem[];
  counts: Record<string, number>;
  last_sync_timestamp?: string | null;
}

export interface UnifiedTimelineEvent {
  id: number;
  timestamp: string;
  action: string;
  actor_name: string;
  actor_role: string;
  description: string;
  category: 'RISK' | 'VERIFICATION' | 'EVIDENCE' | 'GOVERNANCE' | 'REVIEW' | 'SIGN_OFF' | 'AUDIT';
  metadata?: Record<string, any>;
}

export interface RelatedRecordsResponse {
  resource_type: string;
  resource_id: string;
  mine_id: number;
  risk_predictions: Array<Record<string, any>>;
  incidents: Array<Record<string, any>>;
  governance_tasks: Array<Record<string, any>>;
  inspections: Array<Record<string, any>>;
  evidence: Array<Record<string, any>>;
  environmental_observations: Array<Record<string, any>>;
  compliance_observations: Array<Record<string, any>>;
  contractor_verifications: Array<Record<string, any>>;
  grievances: Array<Record<string, any>>;
  approval_requests: Array<Record<string, any>>;
  audit_events: Array<Record<string, any>>;
}





