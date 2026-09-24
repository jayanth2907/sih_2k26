export * from './analytics';

export type RoleType = 
  | 'SYSTEM_ADMIN' 
  | 'MINE_MANAGER' 
  | 'MINE_SAFETY_OFFICER' 
  | 'FIELD_INSPECTOR' 
  | 'CONTRACTOR_MANAGER' 
  | 'REGULATOR';

export interface User {
  id: number;
  email: string;
  full_name: string;
  designation?: string;
  department?: string;
  roles: RoleType[];
  assigned_mine_ids: number[];
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  expires_in_minutes: number;
  user: User;
}

export interface Mine {
  id: number;
  code: string;
  name: string;
  description?: string;
  mine_type: string;
  state: string;
  district: string;
  latitude?: number;
  longitude?: number;
  elevation?: number;
  status: string;
  is_simulated?: string;
  data_status?: string;
  created_at: string;
  updated_at: string;
}

export interface MineZone {
  id: number;
  code: string;
  name: string;
  zone_type: string;
  risk_category: string;
  origin_x: number;
  origin_y: number;
  origin_z: number;
  width: number;
  length: number;
  height: number;
  level_id?: number;
}

export interface MineLevel {
  id: number;
  code: string;
  name: string;
  depth_meters: number;
  elevation?: number;
  sequence_order: number;
  zones: MineZone[];
}

export interface MineDetail extends Mine {
  levels: MineLevel[];
  total_sensors: number;
  total_cameras: number;
  active_incidents: number;
  risk_score?: number;
  risk_severity?: string;
}

export interface Sensor {
  id: number;
  sensor_code: string;
  mine_id: number;
  level_id?: number;
  zone_id?: number;
  sensor_type_id: number;
  name: string;
  unit: string;
  normal_min?: number;
  normal_max?: number;
  warning_threshold: number;
  critical_threshold: number;
  x: number;
  y: number;
  z: number;
  latitude?: number;
  longitude?: number;
  status: 'ACTIVE' | 'WARNING' | 'CRITICAL' | 'OFFLINE' | 'MAINTENANCE';
  last_value?: number;
  last_reading_at?: string;
  sensor_type_code?: string;
  zone_name?: string;
  level_name?: string;
}

export interface SensorReading {
  id: number;
  sensor_id: number;
  timestamp: string;
  value: number;
  unit: string;
  quality: string;
  source: string;
  ingestion_timestamp: string;
}

export interface Camera {
  id: number;
  camera_code: string;
  mine_id: number;
  name: string;
  camera_type: string;
  stream_url?: string;
  status: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  fov: number;
  resolution?: string;
  is_simulated: string;
  zone_name?: string;
  level_name?: string;
}

export interface Equipment {
  id: number;
  equipment_code: string;
  mine_id: number;
  name: string;
  category: string;
  status: string;
  manufacturer?: string;
  model_number?: string;
  x: number;
  y: number;
  z: number;
  last_serviced_at?: string;
  next_service_due?: string;
  zone_name?: string;
}

export type IncidentStatus = 
  | 'OPEN' 
  | 'TRIAGED' 
  | 'ASSIGNED' 
  | 'IN_PROGRESS' 
  | 'RESOLVED' 
  | 'VERIFIED' 
  | 'CLOSED' 
  | 'ESCALATED';

export interface IncidentEvent {
  id: number;
  actor_id?: number;
  from_status?: string;
  to_status: string;
  comment?: string;
  created_at: string;
}

export interface Incident {
  id: number;
  incident_code: string;
  mine_id: number;
  level_id?: number;
  zone_id?: number;
  title: string;
  description: string;
  category: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: IncidentStatus;
  sla_hours: number;
  sla_due_at?: string;
  is_escalated: string;
  escalation_level: number;
  resolution_notes?: string;
  resolved_at?: string;
  verified_at?: string;
  closed_at?: string;
  x: number;
  y: number;
  z: number;
  latitude?: number;
  longitude?: number;
  created_at: string;
  reporter_name?: string;
  assignee_name?: string;
  zone_name?: string;
  mine_name?: string;
  events?: IncidentEvent[];
}

export interface CorrectiveAction {
  id: number;
  violation_id: number;
  action_text: string;
  target_completion_date: string;
  status: string;
  assignee_name?: string;
  completed_at?: string;
}

export interface Violation {
  id: number;
  violation_code: string;
  mine_id: number;
  title: string;
  description: string;
  regulatory_clause: string;
  statute: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: string;
  remedial_deadline?: string;
  financial_penalty_amount: number;
  created_at: string;
  inspector_name?: string;
  zone_name?: string;
  mine_name?: string;
  corrective_actions: CorrectiveAction[];
}

export interface RiskFactor {
  id: number;
  factor_name: string;
  weight: number;
  contribution_points: number;
  details?: string;
}

export interface RiskScore {
  id: number;
  mine_id: number;
  score: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  rule_score: number;
  ml_score: number;
  silence_risk_score: number;
  explanation: string;
  model_version: string;
  rule_version: string;
  generated_at: string;
  factors: RiskFactor[];
}

export interface AnomalyEvent {
  id: number;
  mine_id: number;
  sensor_id?: number;
  level_id?: number;
  zone_id?: number;
  incident_id?: number;
  anomaly_type: string;
  severity: string;
  observed_value?: number;
  expected_range?: string;
  threshold_limit?: number;
  unit?: string;
  description: string;
  x: number;
  y: number;
  z: number;
  source: string;
  status: string;
  detected_at: string;
  resolved_at?: string;
  sensor_code?: string;
  zone_name?: string;
  level_name?: string;
  mine_name?: string;
}

export interface Alert {
  id: number;
  mine_id: number;
  sensor_id?: number;
  anomaly_id?: number;
  incident_id?: number;
  title: string;
  message: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  risk_score: number;
  status: 'UNREAD' | 'READ' | 'ACKNOWLEDGED' | 'RESOLVED';
  source: string;
  recipient_scope: string;
  location_context?: string;
  created_at: string;
  acknowledged_at?: string;
  resolved_at?: string;
  sensor_code?: string;
  mine_name?: string;
}

export interface NearbyCameraDTO {
  id: number;
  camera_code: string;
  name: string;
  camera_type: string;
  x: number;
  y: number;
  z: number;
  distance_meters: number;
  yaw: number;
  pitch: number;
  fov: number;
  stream_url?: string;
  is_simulated: string;
}

export interface NearbyEquipmentDTO {
  id: number;
  equipment_code: string;
  name: string;
  category: string;
  status: string;
  x: number;
  y: number;
  z: number;
  distance_meters: number;
  last_serviced_at?: string;
}

export interface SpatialContextResponse {
  anomaly_id: number;
  anomaly_type: string;
  severity: string;
  detected_at: string;
  observed_value?: number;
  threshold_limit?: number;
  explanation: string;
  mine: {
    id: number;
    code: string;
    name: string;
    state: string;
    district: string;
  };
  level?: {
    id: number;
    code: string;
    name: string;
    depth_meters: number;
  };
  zone?: {
    id: number;
    code: string;
    name: string;
    zone_type: string;
    risk_category: string;
  };
  sensor: {
    id: number;
    code: string;
    name: string;
    unit: string;
    status: string;
  };
  coordinates: {
    x: number;
    y: number;
    z: number;
  };
  nearby_cameras: NearbyCameraDTO[];
  nearby_equipment: NearbyEquipmentDTO[];
  related_incident?: {
    id: number;
    code: string;
    title: string;
    status: string;
    severity: string;
  };
}

export interface MineTelemetrySummary {
  mine_id: number;
  mine_code: string;
  mine_name: string;
  total_sensors: number;
  online_sensors: number;
  offline_sensors: number;
  normal_sensors: number;
  warning_sensors: number;
  critical_sensors: number;
  active_anomalies: number;
  active_alerts: number;
  critical_alerts: number;
  open_incidents: number;
  current_risk_score: number;
  current_risk_severity: string;
  generated_at: string;
}

export interface AuditEvent {
  id: number;
  actor_id?: number;
  action: string;
  resource_type: string;
  resource_id?: string;
  mine_id?: number;
  before_state?: string;
  after_state?: string;
  metadata_json?: string;
  current_event_hash?: string;
  timestamp: string;
}

export interface DigitalTwinState {
  mine: Mine;
  levels: MineLevel[];
  zones: MineZone[];
  sensors: any[];
  cameras: any[];
  equipment: any[];
  active_incidents: any[];
  anomalies: any[];
  current_risk_score?: number;
  current_risk_severity?: string;

  // Phase 11B: Source-Derived Spatial Foundation & Provenance
  profile?: MineProfileDTO;
  spatial_reference?: {
    source_crs: string;
    source_datum: string;
    visualization_crs: string;
    origin_reference: { latitude: number; longitude: number; elevation: number };
    transformation_method: string;
    unit: string;
  };
  boundary?: MineBoundaryDTO & {
    vertices_3d?: Array<{ x: number; y: number; z: number; label?: string; latitude?: number; longitude?: number }>;
  };
  coordinates?: Array<MineCoordinateDTO & { local_x: number; local_y: number; local_z: number }>;
  seams?: MineSeamDTO[];
  data_completeness?: {
    boundary: string;
    coordinates: string;
    seams: string;
    elevation: string;
    underground_workings: string;
    geometry_status: string;
    is_simulated: string;
    data_status: string;
  };
  quality_record?: MineDataQualityDTO;
}


export interface ProductionReport {
  id: number;
  report_code: string;
  mine_id: number;
  report_date: string;
  shift: string;
  material_type: string;
  planned_quantity: number;
  actual_quantity: number;
  unit: string;
  variance_quantity: number;
  variance_percentage: number;
  status: string;
  deviation_flag: string;
  reporting_officer_id?: number;
  notes?: string;
  created_at: string;
}

export interface Worker {
  id: number;
  worker_code: string;
  full_name: string;
  designation: string;
  trade_category: string;
  mine_id: number;
  contractor_id?: number;
  is_contractual: boolean;
  emergency_contact?: string;
  blood_group?: string;
  status: string;
  created_at: string;
}

export interface AttendanceRecord {
  id: number;
  worker_id: number;
  mine_id: number;
  worker_code?: string;
  worker_name?: string;
  designation?: string;
  attendance_date: string;
  status: string;
  verification_mode: string;
  check_in_time?: string;
  created_at: string;
}

export interface Contractor {
  id: number;
  contractor_code: string;
  company_name: string;
  registration_number: string;
  contact_person: string;
  email: string;
  phone: string;
  safety_rating: number;
  status: string;
  created_at: string;
}

export interface Contract {
  id: number;
  contract_code: string;
  contractor_id: number;
  mine_id: number;
  work_scope: string;
  description?: string;
  start_date: string;
  end_date: string;
  total_value: number;
  status: string;
  compliance_status: string;
  created_at: string;
  contractor_name?: string;
}

export interface EnvironmentalObservation {
  id: number;
  mine_id: number;
  parameter_name: string;
  observed_value: number;
  threshold_limit: number;
  unit: string;
  severity: string;
  status: string;
  location_context?: string;
  x: number;
  y: number;
  z: number;
  detected_at: string;
}

export interface Grievance {
  id: number;
  grievance_code: string;
  mine_id: number;
  category: string;
  title: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: string;
  anonymous: boolean;
  sla_hours: number;
  due_at: string;
  is_escalated: boolean;
  resolution_notes?: string;
  created_at: string;
  submitted_by_name?: string;
}

export interface ApprovalRequest {
  id: number;
  request_code: string;
  resource_type: string;
  resource_id: string;
  mine_id: number;
  title: string;
  description?: string;
  requester_id: number;
  required_role: string;
  status: string;
  created_at: string;
  requester_name?: string;
  actions?: Array<{
    id: number;
    action: string;
    comments?: string;
    performed_at: string;
    approver?: { name: string };
  }>;
}

export interface RegulatoryReport {
  id: number;
  report_code: string;
  mine_id: number;
  report_type: string;
  title: string;
  reporting_period_start: string;
  reporting_period_end: string;
  status: string;
  current_version: number;
  generated_at: string;
  generated_by_id: number;
  summary_data?: any;
}

export interface GovernanceTask {
  id: number;
  task_code: string;
  mine_id: number;
  mine_name?: string;
  domain: string;
  category?: string;
  task_type?: string;
  title: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | string;
  status: 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'VERIFIED' | 'CLOSED' | 'ESCALATED' | string;
  assignee_id?: number;
  assignee_name?: string;
  assigned_to_name?: string;
  created_by_id?: number;
  created_by_name?: string;
  due_at: string;
  due_date?: string;
  is_overdue?: boolean;
  is_due_today?: boolean;
  sla_text?: string;
  sla_status: string;
  source_resource_type?: string;
  source_resource_id?: string;
  related_incident_id?: number;
  related_incident_code?: string;
  related_incident_severity?: string;
  zone_id?: number;
  zone_name?: string;
  latitude?: number;
  longitude?: number;
  target_latitude?: number;
  target_longitude?: number;
  escalation_level?: number;
  created_at: string;
  resolved_at?: string;
  resolution_notes?: string;
}

export interface ShiftContextResponse {
  has_active_shift: boolean;
  mine_id: number;
  mine_name: string;
  shift_name: string;
  shift_code: string;
  start_time: string;
  end_time: string;
  attendance_status: string;
  verification_mode: string;
  check_in_time?: string;
}

export interface WorkQueueCounts {
  total: number;
  critical: number;
  high: number;
  due_today: number;
  overdue: number;
  assigned?: number;
  in_progress?: number;
  completed: number;
  pending_verification: number;
  verification_pending?: number;
}

export interface WorkQueueResponse {
  mine_id: number;
  tasks: GovernanceTask[];
  counts: WorkQueueCounts;
  shift_context: ShiftContextResponse;
}

export interface OperationalNotification {
  id: string;
  raw_id: number;
  source_system: 'NOTIFICATION' | 'ALERT';
  title: string;
  message: string;
  notification_type: string;
  category: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'INFO' | string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'INFO' | string;
  mine_id?: number;
  mine_name?: string;
  zone_name?: string;
  location_context?: string;
  latitude?: number;
  longitude?: number;
  is_read: boolean;
  created_at: string;
  link?: string;
  deep_link: {
    destination_tab: 'home' | 'tasks' | 'map' | 'incidents' | 'copilot' | 'more' | string;
    resource_type: string;
    resource_id: string;
    coordinates?: { x: number; y: number; z: number };
  };
  is_stale?: boolean;
  stale_reason?: string;
}

export interface NotificationUnreadCounts {
  total_unread: number;
  critical_unread: number;
  tasks_unread: number;
  incidents_unread: number;
  verification_unread: number;
  last_updated: string;
}

export interface NotificationListResponse {
  mine_id?: number;
  total_count: number;
  notifications: OperationalNotification[];
  counts: NotificationUnreadCounts;
}

export interface GovernanceDashboardSummary {
  mine_id: number;
  mine_name: string;
  production_today_tonnes: number;
  production_planned_tonnes: number;
  production_variance_pct: number;
  attendance_headcount: number;
  attendance_present_pct: number;
  active_contracts: number;
  contracts_expiring_soon: number;
  open_environmental_observations: number;
  open_grievances: number;
  grievances_sla_breached: number;
  pending_approvals: number;
  reports_generated_month: number;
  open_governance_tasks: number;
  governance_risk_score: number;
  governance_risk_severity: string;
}

export interface SignalAttribution {
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

export interface PredictiveRiskSummary {
  mine_id: number;
  mine_name: string;
  current_risk_score: number;
  current_severity: string;
  predicted_risk_score: number;
  predicted_severity: string;
  risk_delta: number;
  trend_direction: 'UP' | 'DOWN' | 'STABLE';
  probability: number;
  horizon_minutes: number;
  model_name: string;
  model_version: string;
  dataset_provenance: string;
  data_quality_score: number;
  data_quality_notes: string;
  is_alert_active: boolean;
  top_signals: SignalAttribution[];
  evaluated_at: string;
  recommended_action?: string;
}

export interface MLModelInfo {
  id: number;
  model_name: string;
  version: string;
  algorithm: string;
  target_variable: string;
  horizon_minutes: number;
  status: string;
  is_default: boolean;
  dataset_source: string;
  metrics_json: string;
  trained_at: string;
  trained_by: string;
  description?: string;
}

// Phase 6 & Phase 11C Copilot & Multilingual Interfaces
export interface EvidenceItem {
  source_type: string;
  source_tier?: string;
  source_title?: string;
  organization?: string;
  document_id?: string;
  page_number?: number;
  section?: string;
  document_date?: string;
  effective_from?: string;
  effective_to?: string;
  status?: string;
  source_hash?: string;
  excerpt?: string;
  domain?: string;
  entity_id?: string;
  title: string;
  description: string;
  status_or_value: string;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'INFO';
  deep_link?: {
    tab?: string;
    target_type?: string;
    target_id?: string;
    coordinates?: { x: number; y: number; z: number };
  };
}

export interface CopilotAction {
  action_type: string;
  label: string;
  payload: Record<string, any>;
}

export interface PredictiveSignalSummary {
  current_risk_score: number;
  predicted_risk_score: number;
  horizon: string;
  probability: number;
  top_signals: string[];
}

export interface CopilotQueryRequest {
  mine_id: number;
  query: string;
  conversation_id?: string;
  language?: 'en' | 'hi' | 'te';
}

export interface CopilotQueryResponse {
  conversation_id: string;
  mine_id: number;
  mine_name: string;
  language: 'en' | 'hi' | 'te';
  query: string;
  intent: string;
  question_type?: string;
  domain_detected?: string;
  tools_invoked: string[];
  summary: string;
  evidence: EvidenceItem[];
  predictive_signal?: PredictiveSignalSummary;
  recommended_next_step: string;
  actions: CopilotAction[];
  answer_markdown: string;
  data_provenance: string;
  provider_used: string;
  data_coverage: string;
  confidence?: string;
  limitations?: string;
  citation_validation_status?: string;
  timestamp: string;
}

export interface CopilotQuickPrompt {
  id: string;
  category: string;
  prompt_en: string;
  prompt_hi: string;
  prompt_te: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  allowed_roles: string[];
  parameters: Record<string, any>;
}

// Phase 7 & Mobile: Field Operations & Offline Sync Types
export interface ChecklistItem {
  id: string;
  title?: string;
  item_text?: string;
  category: string;
  status: 'PENDING' | 'COMPLIANT' | 'OBSERVATION' | 'NON_COMPLIANT' | 'NOT_APPLICABLE' | 'PASS' | 'FAIL' | 'FLAG';
  notes?: string | null;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | null;
  evidence_codes?: string[];
  recommendation?: string | null;
  statute_reference?: string | null;
  regulatory_reference?: string | null;
}

export interface FieldInspection {
  id: number;
  inspection_code: string;
  mine_id: number;
  level_id?: number;
  zone_id?: number;
  inspector_id?: number;
  title?: string;
  description?: string;
  inspection_type: string;
  scheduled_date?: string;
  started_at?: string;
  completed_at?: string;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'SUBMITTED' | 'VERIFIED' | 'CANCELLED';
  checklist?: ChecklistItem[];
  checklist_items?: ChecklistItem[];
  summary_notes?: string;
  findings_summary?: string;
  severity_assessment?: string;
  overall_severity?: string;
  latitude?: number;
  longitude?: number;
  gps_accuracy_meters?: number;
  current_zone_risk?: number;
  predicted_zone_risk?: number;
  evidences?: FieldEvidence[];
  created_at: string;
  updated_at: string;
  mine_name?: string;
  zone_name?: string;
  level_name?: string;
  inspector_name?: string;
}

export interface FieldEvidence {
  id: number;
  evidence_code: string;
  mine_id: number;
  mine_name?: string;
  inspection_id?: number;
  inspection_code?: string;
  observation_id?: number;
  incident_id?: number;
  captured_by_id?: number;
  captured_by_name?: string;
  evidence_type: string; // PHOTO, DOCUMENT, NOTE, SENSOR_LOG
  title: string;
  description?: string;
  file_url_or_path?: string;
  file_hash_sha256: string;
  file_size_bytes?: number;
  mime_type?: string;
  location_source?: string; // ACTUAL_GPS, SURVEYED_MINE, SIMULATED
  verification_status?: 'PENDING' | 'VERIFIED' | 'REJECTED';
  verified_by_id?: number;
  verified_by_name?: string;
  verification_notes?: string;
  latitude?: number;
  longitude?: number;
  accuracy_meters?: number;
  gps_accuracy_meters?: number;
  client_capture_timestamp?: string;
  server_received_timestamp?: string;
  captured_at?: string;
  server_received_at?: string;
  sync_status?: string;
  isLocal?: boolean;
  preview_url?: string;
  created_at?: string;
}

export interface SyncOperationItem {
  operation_id: string;
  entity_type: string;
  entity_id?: string;
  operation?: string;
  operation_type?: string;
  payload: Record<string, any>;
  client_timestamp?: string;
  client_version?: string;
}

export interface SyncBatchRequest {
  client_version?: string;
  mine_id: number;
  operations: SyncOperationItem[];
}

export interface SyncOperationResult {
  operation_id: string;
  entity_type: string;
  entity_id: string;
  server_id?: number;
  status: 'ACCEPTED' | 'REJECTED' | 'CONFLICT' | 'ALREADY_PROCESSED';
  error_message?: string;
  server_timestamp?: string;
}

export interface SyncBatchResponse {
  batch_id?: string;
  mine_id: number;
  processed_count?: number;
  total_operations?: number;
  accepted_count?: number;
  accepted_operations?: number;
  rejected_count?: number;
  rejected_operations?: number;
  conflict_count?: number;
  conflict_operations?: number;
  results: SyncOperationResult[];
  processed_at?: string;
}

export interface QueuedSyncOperation {
  operation_id: string;
  entity_type: 'INSPECTION' | 'OBSERVATION' | 'INCIDENT' | 'EVIDENCE' | 'TASK' | 'CORRECTIVE_ACTION';
  entity_id?: string;
  server_id?: number;
  operation_type: 'CREATE' | 'UPDATE' | 'TRANSITION';
  payload: Record<string, any>;
  client_timestamp: string;
  sync_status: 'LOCAL' | 'QUEUED' | 'SYNCING' | 'SYNCED' | 'FAILED' | 'CONFLICT';
  retry_count: number;
  last_attempt_timestamp?: string;
  last_error?: string;
  dependency_id?: string;
  mine_id?: number;
  conflict_data?: {
    local_state?: any;
    server_state?: any;
    reason?: string;
  };
}

export interface SyncStatusMetrics {
  total_logged: number;
  accepted: number;
  rejected: number;
  conflicts: number;
  already_processed: number;
}

export interface SyncStatusResponse {
  mine_id?: number;
  last_server_sync_timestamp: string | null;
  metrics: SyncStatusMetrics;
}

export interface SyncLogItem {
  id: number;
  operation_id: string;
  mine_id: number;
  user_id: number;
  entity_type: string;
  entity_id: string | null;
  operation_type: string;
  client_timestamp: string | null;
  status: string;
  error_message: string | null;
  created_at: string | null;
}

export interface SyncLogsResponse {
  total: number;
  limit: number;
  offset: number;
  logs: SyncLogItem[];
}

export interface ZoneRiskPrediction {
  zone_id: number;
  zone_name: string;
  current_risk_score: number;
  predicted_risk_score: number;
  predicted_risk_level: string;
  horizon_minutes: number;
  probability: number;
}

// Phase 8: External Integrations & System Health Types
export interface AdapterHealthStatus {
  name: string;
  source_system: string;
  mode: string;
  status: 'HEALTHY' | 'DEGRADED' | 'OFFLINE';
  circuit_state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  latency_ms: number;
  last_sync_time?: string;
  last_error?: string;
  records_processed: number;
  records_rejected: number;
  adapter_version: string;
}

export interface IntegrationHealthResponse {
  overall_health: string;
  total_adapters: number;
  adapters: AdapterHealthStatus[];
  timestamp: string;
}

export interface ExternalReport {
  id: number;
  event_id: string;
  source_system: string;
  source_record_id: string;
  source_mode: string;
  event_type: string;
  mine_id?: number;
  mine_code?: string;
  zone_id?: number;
  zone_name?: string;
  title: string;
  description?: string;
  severity: string;
  latitude?: number;
  longitude?: number;
  spatial_match_status: string;
  distance_to_mine_meters?: number;
  raw_payload_hash: string;
  status: string;
  verification_notes?: string;
  adapter_version: string;
  received_at: string;
  created_at: string;
}

export interface AuditChainVerification {
  status: 'VALID' | 'TAMPER_DETECTED';
  total_events: number;
  chain_head_hash?: string;
  corrupted_event_id?: number;
  failure_reason?: string;
  verified_at: string;
}

export interface SystemHealthComponent {
  name: string;
  status: 'HEALTHY' | 'DEGRADED' | 'OFFLINE';
  details: string;
  latency_ms?: number;
}

export interface SystemHealthResponse {
  status: 'HEALTHY' | 'DEGRADED' | 'OFFLINE';
  version: string;
  environment: string;
  components: SystemHealthComponent[];
  timestamp: string;
}

// ==========================================
// PHASE 9: SIH DEMO SCENARIO ENGINE TYPES
// ==========================================
export interface DemoScenarioStep {
  step_id: number;
  step_key: string;
  title: string;
  description: string;
  system_component: string;
  expected_state: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  executed_at?: string;
  details?: Record<string, any>;
}

export interface DemoScenarioSummary {
  scenario_id: string;
  name: string;
  category: string;
  target_mine_id: string;
  target_zone_id?: string;
  description: string;
  total_steps: number;
  current_step_index: number;
  status: 'IDLE' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'FAILED';
  last_run_id?: string;
  last_executed_at?: string;
}

export interface DemoScenarioDetail extends DemoScenarioSummary {
  steps: DemoScenarioStep[];
  key_takeaway: string;
  governance_boundary: string;
}

export interface DemoPreflightItem {
  component: string;
  name: string;
  status: 'PASS' | 'WARN' | 'FAIL';
  latency_ms: number;
  message: string;
  is_critical: boolean;
}

export interface DemoPreflightReport {
  is_ready: boolean;
  overall_status: 'READY' | 'DEGRADED' | 'NOT_READY';
  mode: string;
  timestamp: string;
  checks: DemoPreflightItem[];
  active_scenario_id?: string;
}

export interface DemoStepResponse {
  scenario_id: string;
  run_id: string;
  step_index: number;
  step_key: string;
  title: string;
  status: string;
  completed: boolean;
  next_step_available: boolean;
  state_updates: Record<string, any>;
  message: string;
}

export interface DemoResetResponse {
  success: boolean;
  scenario_id?: string;
  message: string;
  records_reset: Record<string, number>;
  timestamp: string;
}

// ==========================================
// PHASE 11A: REAL MINE DATA FOUNDATION & PROVENANCE
// ==========================================

export interface DataProvenanceDTO {
  id: number;
  document_title: string;
  document_filename: string;
  document_hash: string;
  source_organization: string;
  document_type: string;
  publication_date?: string;
  effective_date?: string;
  source_url?: string;
  page_number?: number;
  section_heading?: string;
  source_text_reference?: string;
  extraction_method: string;
  authority_level: string;
  data_status: string;
  notes?: string;
  created_at: string;
}

export interface MineBoundaryDTO {
  id: number;
  mine_id: number;
  boundary_type: string;
  description?: string;
  datum: string;
  coordinate_system: string;
  geometry_status: string;
  min_latitude?: number;
  max_latitude?: number;
  min_longitude?: number;
  max_longitude?: number;
  area_sq_km?: number;
  perimeter_km?: number;
  raw_coordinate_text?: string;
  prov_doc_title?: string;
  prov_doc_hash?: string;
  prov_page_number?: number;
  prov_verbatim_text?: string;
  vertices_3d?: Array<{
    x: number;
    y: number;
    z: number;
    point_label?: string;
    label?: string;
    latitude?: number;
    longitude?: number;
    sequence_order?: number;
  }>;
  provenance?: DataProvenanceDTO;
}

export interface MineCoordinateDTO {
  id: number;
  mine_id: number;
  point_label: string;
  sequence_order: number;
  latitude?: number;
  longitude?: number;
  lat_dms_raw?: string;
  lon_dms_raw?: string;
  latitude_dms?: string;
  longitude_dms?: string;
  elevation_m?: number;
  x_proj?: number;
  y_proj?: number;
  x_proj_raw?: string;
  y_proj_raw?: string;
  x?: number;
  y?: number;
  z?: number;
  local_x?: number;
  local_y?: number;
  local_z?: number;
  datum: string;
  coordinate_system: string;
  geometry_status: string;
  notes?: string;
  prov_doc_title?: string;
  prov_doc_hash?: string;
  prov_page_number?: number;
  prov_verbatim_text?: string;
  provenance?: DataProvenanceDTO;
}

export interface MineSeamDTO {
  id: number;
  mine_id: number;
  seam_name: string;
  seam_code?: string;
  sequence_order: number;
  thickness_min_m?: number;
  thickness_max_m?: number;
  thickness_raw?: string;
  depth_min_m?: number;
  depth_max_m?: number;
  depth_from_m?: number;
  depth_to_m?: number;
  parting_min_m?: number;
  parting_max_m?: number;
  parting_raw?: string;
  geological_reserve_mt?: number;
  geological_reserve_raw?: string;
  extractable_reserve_mt?: number;
  extractable_reserve_raw?: string;
  grade?: string;
  coal_grade?: string;
  stratigraphic_order?: number;
  mining_method?: string;
  workability_status: string;
  data_status: string;
  geometry_status?: string;
  prov_doc_title?: string;
  prov_doc_hash?: string;
  prov_page_number?: number;
  prov_verbatim_text?: string;
  provenance?: DataProvenanceDTO;
}

export interface MineClearanceDTO {
  id: number;
  mine_id: number;
  clearance_type: string;
  status: string;
  status_raw?: string;
  reference_number?: string;
  grant_date?: string;
  authority?: string;
  area_covered_ha?: number;
  notes?: string;
  data_status: string;
  provenance?: DataProvenanceDTO;
}

export interface MineProfileDTO {
  id: number;
  mine_id: number;
  official_name: string;
  normalized_name: string;
  display_name: string;
  aliases?: string;
  block_name?: string;
  coalfield: string;
  sub_basin?: string;
  state: string;
  district: string;
  tehsil?: string;
  villages?: string;
  topo_sheet_no?: string;
  geological_block_area_sq_km?: number;
  mining_lease_area_ha?: number;
  project_area_ha?: number;
  forest_area_ha?: number;
  non_forest_area_ha?: number;
  nearest_rail_head?: string;
  road_connectivity?: string;
  nearest_airport?: string;
  surface_infrastructure_built?: string;
  annual_rainfall_mm?: string;
  temperature_range?: string;
  drainage_description?: string;
  exploration_agency?: string;
  exploration_status?: string;
  total_boreholes?: number;
  total_meterage_drilled?: number;
  borehole_density_per_sq_km?: number;
  general_dip?: string;
  general_strike?: string;
  mining_method_documented?: string;
  target_capacity_mtpa?: number;
  target_capacity_raw?: string;
  total_geological_reserve_mt?: number;
  geological_reserves_mt?: number;
  total_extractable_reserve_mt?: number;
  average_grade_documented?: string;
  stripping_ratio_cum_per_te?: number;
  total_overburden_mcum?: number;
  prior_allocatee_name?: string;
  project_status_documented?: string;
  data_status: string;
  geometry_status: string;
  validation_status: string;
  source_title?: string;
  source_sha256?: string;
  source_page_number?: number;
  source_authority?: string;
  provenance?: DataProvenanceDTO;
}

export interface RealMineSummaryDTO {
  id: number;
  code: string;
  name: string;
  official_name: string;
  coalfield: string;
  state: string;
  district: string;
  latitude?: number;
  longitude?: number;
  total_area_sq_km?: number;
  mining_method?: string;
  geological_reserve_mt?: number;
  data_status: string;
  geometry_status: string;
  is_simulated: string;
  provenance_doc: string;
  provenance_hash: string;
}

export interface MineDataQualityDTO {
  mine_id: number;
  overall_status: string;
  source_coverage: number;
  provenance_coverage: number;
  validation_errors: number;
  approximate_geometry: boolean;
  survey_grade_geometry: boolean;
  total_attributes_extracted: number;
  missing_critical_fields?: string;
  source_title?: string;
  source_sha256?: string;
  source_page_number?: number;
  source_authority?: string;
  overall_score?: number;
  calculated_at: string;
}

export interface RealMineDetailDTO {
  id: number;
  code: string;
  name: string;
  mine_type: string;
  state: string;
  district: string;
  latitude?: number;
  longitude?: number;
  data_status: string;
  is_simulated: string;
  profile?: MineProfileDTO;
  boundaries: MineBoundaryDTO[];
  coordinates: MineCoordinateDTO[];
  seams: MineSeamDTO[];
  clearances: MineClearanceDTO[];
  quality_record?: MineDataQualityDTO;
}

// Aliases for ease of consumption
export type RealMineCoordinate = MineCoordinateDTO;
export type RealMineSeam = MineSeamDTO;
export type RealMineProfile = MineProfileDTO;
export type RealMineQualityRecord = MineDataQualityDTO;
export type MineBoundary = MineBoundaryDTO;

// Phase 12A: Document Intelligence & OCR Types
export interface DocumentPageDTO {
  id: number;
  document_id: number;
  page_number: number;
  extraction_method: 'TEXT_NATIVE' | 'OCR' | 'HYBRID' | 'FAILED';
  ocr_provider: string;
  ocr_confidence?: number;
  ocr_confidence_band: 'HIGH' | 'MEDIUM' | 'LOW' | 'N/A';
  quality_status: 'GOOD' | 'REVIEW' | 'POOR' | 'UNREADABLE' | 'UNAVAILABLE';
  page_hash?: string;
  page_image_path?: string;
  text_content: string;
  created_at: string;
}

export interface ExtractedDocumentFieldDTO {
  id: number;
  document_id: number;
  page_number: number;
  field_name: string;
  field_value: string;
  confidence: number;
  source_text?: string;
  extraction_method: string;
  validation_status: 'VALID' | 'REVIEW_REQUIRED' | 'INVALID';
  validation_error?: string;
  is_verified: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'EDITED';
  verified_value?: string;
  verified_by_user_id?: number;
  verified_at?: string;
  created_at: string;
}

export interface DocumentSummaryDTO {
  id: number;
  mine_id?: number;
  title: string;
  source_filename?: string;
  doc_type: string;
  source_tier: string;
  source_category: string;
  file_hash: string;
  file_size_bytes: number;
  page_count: number;
  native_page_count: number;
  ocr_page_count: number;
  ocr_status: string;
  processing_stage: 'RECEIVED' | 'VALIDATING' | 'TEXT_EXTRACTION' | 'OCR_PROCESSING' | 'FIELD_EXTRACTION' | 'VALIDATING_FIELDS' | 'INDEXING' | 'COMPLETED' | 'PARTIAL' | 'FAILED' | 'OCR_UNAVAILABLE';
  quality_status: 'GOOD' | 'REVIEW' | 'POOR' | 'UNREADABLE' | 'UNAVAILABLE';
  average_ocr_confidence?: number;
  classification_confidence: number;
  classification_reason?: string;
  verification_status: string;
  uploaded_at: string;
}

export interface DocumentDTO extends DocumentSummaryDTO {
  extracted_text?: string;
  processing_error?: string;
  pages: DocumentPageDTO[];
  fields: ExtractedDocumentFieldDTO[];
}

export interface DocumentProcessingStatusDTO {
  document_id: number;
  title: string;
  file_hash: string;
  processing_stage: string;
  ocr_status: string;
  quality_status: string;
  page_count: number;
  native_page_count: number;
  ocr_page_count: number;
  average_ocr_confidence?: number;
  fields_count: number;
  verification_status: string;
}

// ==========================================
// Phase 12B: 2D GIS & Spatial Governance DTOs
// ==========================================

export interface GisProvenanceDTO {
  document_title: string;
  document_filename: string;
  document_hash: string;
  page_number?: number;
  section_heading?: string;
  authority_level: string;
  data_status: string;
  source_text_reference?: string;
}

export interface GisCoordinateFeatureDTO {
  id: number;
  point_label: string;
  latitude?: number;
  longitude?: number;
  lat_dms_raw?: string;
  lon_dms_raw?: string;
  local_x: number;
  local_z: number;
  datum: string;
  geometry_status: string;
  provenance?: GisProvenanceDTO;
}

export interface GisBoundaryFeatureDTO {
  id: number;
  boundary_type: string;
  min_latitude?: number;
  max_latitude?: number;
  min_longitude?: number;
  max_longitude?: number;
  geometry_status: string;
  area_sq_km?: number;
  coordinates_geojson: number[][]; // [ [lon, lat], ... ]
  provenance?: GisProvenanceDTO;
}

export interface GisSeamFeatureDTO {
  id: number;
  seam_name: string;
  thickness_min_m?: number;
  thickness_max_m?: number;
  depth_min_m?: number;
  depth_max_m?: number;
  geological_reserve_mt?: number;
  is_schematic: boolean;
  provenance?: GisProvenanceDTO;
}

export interface GisOperationalFeatureDTO {
  id: string;
  entity_id: number;
  feature_type: 'SENSOR' | 'CAMERA' | 'INCIDENT' | 'ALERT' | 'INSPECTION' | 'GOVERNANCE_TASK' | 'ENVIRONMENTAL' | 'CMSMS';
  code: string;
  title: string;
  status?: string;
  severity?: string;
  latitude: number;
  longitude: number;
  value?: string;
  unit?: string;
  trust_badge: 'SOURCE_DERIVED' | 'APPROXIMATE' | 'OPERATIONAL' | 'SIMULATED' | 'NOT_DOCUMENTED';
  created_at?: string;
  properties: Record<string, any>;
}

export interface GisRiskHotspotDTO {
  id: string;
  hotspot_type: 'CURRENT_RISK' | 'ANOMALY_HOTSPOT' | 'PREDICTIVE_HOTSPOT';
  title: string;
  latitude: number;
  longitude: number;
  risk_score: number;
  risk_band: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  source_type: string;
  source_model: string;
  trust_badge: string;
  prediction_horizon?: string;
  escalation_probability?: number;
  explanation: string;
  contributing_factors: string[];
  recommended_action: string;
  created_at?: string;
}

export interface GisTrustMetricsDTO {
  source_derived_count: number;
  approximate_count: number;
  operational_count: number;
  simulated_count: number;
  not_documented_count: number;
}

export interface GisDashboardStatsDTO {
  current_risk_score: number;
  current_risk_band: string;
  predictive_hotspots_count: number;
  open_incidents_count: number;
  open_field_tasks_count: number;
  sla_breaches_count: number;
  active_alerts_count: number;
  last_updated: string;
}

export interface GisMineMetadataDTO {
  id: number;
  code: string;
  name: string;
  official_name: string;
  state: string;
  district: string;
  latitude: number;
  longitude: number;
  total_area_sq_km?: number;
  data_status: string;
  geometry_status: string;
  is_simulated: string;
  provenance_doc: string;
  provenance_hash: string;
}

export interface GisMapDTO {
  mine: GisMineMetadataDTO;
  boundaries: GisBoundaryFeatureDTO[];
  source_coordinates: GisCoordinateFeatureDTO[];
  seams: GisSeamFeatureDTO[];
  operational_features: GisOperationalFeatureDTO[];
  risk_hotspots: GisRiskHotspotDTO[];
  trust_metrics: GisTrustMetricsDTO;
  dashboard_stats: GisDashboardStatsDTO;
}

export interface SpatialContextDTO {
  target_coordinate: { latitude: number; longitude: number };
  boundary_status: {
    status: string;
    label: string;
    is_inside?: boolean;
    notes?: string;
  };
  nearest_sensors: Array<{
    id: number;
    code: string;
    name: string;
    type: string;
    distance_meters: number;
    trust_badge: string;
  }>;
  nearest_incidents: Array<{
    id: number;
    code: string;
    title: string;
    severity: string;
    distance_meters: number;
    trust_badge: string;
  }>;
  nearest_inspections: Array<{
    id: number;
    code: string;
    title: string;
    distance_meters: number;
    trust_badge: string;
  }>;
  total_entities_nearby: number;
}

export interface GisSearchItemDTO {
  id: string;
  title: string;
  type: string;
  category: string;
  latitude?: number;
  longitude?: number;
  mine_id: number;
  mine_name: string;
  trust_badge: string;
  snippet: string;
}

export interface GisSearchResponseDTO {
  query: string;
  results_count: number;
  items: GisSearchItemDTO[];
}







