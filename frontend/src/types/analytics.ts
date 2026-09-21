export type TimeRangeType = 
  | 'TODAY' 
  | 'LAST_7_DAYS' 
  | 'LAST_30_DAYS' 
  | 'LAST_90_DAYS' 
  | 'THIS_MONTH' 
  | 'THIS_QUARTER' 
  | 'CUSTOM';

export type DataModeType = 
  | 'REAL' 
  | 'SIMULATED' 
  | 'MODEL' 
  | 'DEMO' 
  | 'SOURCE_DERIVED' 
  | 'APPROXIMATE'
  | 'OPERATIONAL';

export interface TimeRangeDTO {
  range_type: TimeRangeType;
  start_time: string;
  end_time: string;
  prev_start_time?: string | null;
  prev_end_time?: string | null;
}

export interface TrendMetricDTO {
  current_value: number;
  previous_value?: number | null;
  delta?: number | null;
  percentage_delta?: number | null;
  unit: string;
  data_mode: string;
}

export interface DataQualityDTO {
  record_count: number;
  missing_periods: string[];
  data_mode: string;
  is_simulated: string;
  data_as_of: string;
  notes?: string | null;
}

export interface TimeSeriesPointDTO {
  date: string;
  value: number;
  count: number;
  label?: string | null;
  entity_ids: number[];
  observed_value?: number | null;
  target_value?: number | null;
  forecast_value?: number | null;
  severity?: string | null;
  probability?: number | null;
}

export interface WhatChangedItem {
  id?: string;
  domain?: string;
  title: string;
  description?: string;
  detail?: string;
  category?: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL' | 'NORMAL' | 'SUCCESS';
  delta_description?: string | null;
  metric_name?: string | null;
  current_value?: number | null;
  previous_value?: number | null;
  timestamp?: string;
}

export interface CategoryBreakdownDTO {
  category: string;
  count: number;
  percentage: number;
  severity?: string | null;
  entity_type: string;
  entity_ids: number[];
}

export interface DrillDownEntityDTO {
  id: number;
  code: string;
  title: string;
  entity_type: string;
  category?: string | null;
  severity?: string | null;
  status?: string | null;
  timestamp?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  digital_twin_id?: string | null;
  gis_context?: string | null;
}

export interface GovernanceOverviewAnalyticsDTO {
  mine_id: number;
  mine_name: string;
  time_range: TimeRangeDTO;
  data_as_of: string;
  data_quality: DataQualityDTO;
  
  total_incidents: TrendMetricDTO;
  open_incidents: TrendMetricDTO;
  critical_incidents: TrendMetricDTO;
  active_alerts: TrendMetricDTO;
  open_violations: TrendMetricDTO;
  overdue_corrective_actions: TrendMetricDTO;
  sla_breaches: TrendMetricDTO;
  pending_inspections: TrendMetricDTO;
  open_governance_tasks: TrendMetricDTO;
  environmental_deviations: TrendMetricDTO;
  open_grievances: TrendMetricDTO;
  active_contractor_issues: TrendMetricDTO;
  predictive_high_hotspots: TrendMetricDTO;
  field_inspections_pending: TrendMetricDTO;
  what_changed?: WhatChangedItem[];
}

export interface SafetyAnalyticsDTO {
  mine_id: number;
  mine_name: string;
  time_range: TimeRangeDTO;
  data_as_of: string;
  data_quality: DataQualityDTO;

  total_incidents: number;
  open_incidents: number;
  resolved_incidents: number;
  avg_resolution_hours?: number | null;
  
  incidents_by_day: TimeSeriesPointDTO[];
  incidents_by_severity: CategoryBreakdownDTO[];
  incidents_by_category: CategoryBreakdownDTO[];
  
  anomalies_count: number;
  critical_anomalies_count: number;
  anomalies_by_day: TimeSeriesPointDTO[];
  
  alerts_by_severity: CategoryBreakdownDTO[];
  alerts_resolved_count: number;
  recurring_hazards: CategoryBreakdownDTO[];
  drilldown_entities: DrillDownEntityDTO[];
}

export interface ComplianceAnalyticsDTO {
  mine_id: number;
  mine_name: string;
  time_range: TimeRangeDTO;
  data_as_of: string;
  data_quality: DataQualityDTO;

  total_inspections: number;
  total_violations: number;
  open_violations: number;
  verified_violations: number;
  
  violations_by_severity: CategoryBreakdownDTO[];
  violations_by_statute: CategoryBreakdownDTO[];
  
  corrective_actions_total: number;
  corrective_actions_pending: number;
  corrective_actions_overdue: number;
  sla_compliance_rate_percent: number;
  escalations_count: number;
  
  compliance_chain: Array<Record<string, any>>;
  compliance_trend?: TimeSeriesPointDTO[];
  violations_by_day?: TimeSeriesPointDTO[];
  actions_by_day?: TimeSeriesPointDTO[];
  resolved_by_day?: TimeSeriesPointDTO[];
  drilldown_entities: DrillDownEntityDTO[];
}

export interface ProductionAnalyticsDTO {
  mine_id: number;
  mine_name: string;
  time_range: TimeRangeDTO;
  data_as_of: string;
  data_quality: DataQualityDTO;

  planned_quantity_total: number;
  actual_quantity_total: number;
  variance_quantity_total: number;
  variance_percentage: number;
  unit: string;
  
  production_trend: TimeSeriesPointDTO[];
  production_by_shift: CategoryBreakdownDTO[];
  production_by_material: CategoryBreakdownDTO[];
  reports_submitted_count: number;
  deviations_flagged_count: number;
}

export interface WorkforceAnalyticsDTO {
  mine_id: number;
  mine_name: string;
  time_range: TimeRangeDTO;
  data_as_of: string;
  data_quality: DataQualityDTO;

  total_workers_registered: number;
  contractual_workers_count: number;
  regular_workers_count: number;
  
  total_attendance_records: number;
  present_count: number;
  absent_count: number;
  late_count: number;
  attendance_rate_percent: number;
  
  attendance_trend: TimeSeriesPointDTO[];
  attendance_by_shift: CategoryBreakdownDTO[];
  workers_by_trade: CategoryBreakdownDTO[];
}

export interface EnvironmentalParameterDTO {
  parameter_name: string;
  observation_count: number;
  latest_value?: number | null;
  threshold_limit?: number | null;
  unit: string;
  deviation_count: number;
  status: 'NORMAL' | 'DEVIATION' | 'NO_DATA';
}

export interface EnvironmentalAnalyticsDTO {
  mine_id: number;
  mine_name: string;
  time_range: TimeRangeDTO;
  data_as_of: string;
  data_quality: DataQualityDTO;

  total_observations: number;
  total_deviations: number;
  active_deviations: number;
  parameters: EnvironmentalParameterDTO[];
  readings_over_time: TimeSeriesPointDTO[];
  parameter_trends?: Record<string, TimeSeriesPointDTO[]>;
  drilldown_entities: DrillDownEntityDTO[];
}

export interface ContractorAnalyticsDTO {
  mine_id: number;
  mine_name: string;
  time_range: TimeRangeDTO;
  data_as_of: string;
  data_quality: DataQualityDTO;

  active_contractors_count: number;
  total_contracts: number;
  active_contracts: number;
  expiring_soon_contracts: number;
  expired_contracts: number;
  total_contract_value: number;
  requirement_deviations_count: number;
  contractor_governance_tasks: number;
  contracts_by_status: CategoryBreakdownDTO[];
}

export interface GrievanceAnalyticsDTO {
  mine_id: number;
  mine_name: string;
  time_range: TimeRangeDTO;
  data_as_of: string;
  data_quality: DataQualityDTO;

  total_grievances: number;
  open_grievances: number;
  resolved_grievances: number;
  overdue_grievances: number;
  avg_disposal_days?: number | null;
  grievances_by_category: CategoryBreakdownDTO[];
  grievances_by_priority: CategoryBreakdownDTO[];
  grievances_by_status: CategoryBreakdownDTO[];
}

export interface FieldOperationsAnalyticsDTO {
  mine_id: number;
  mine_name: string;
  time_range: TimeRangeDTO;
  data_as_of: string;
  data_quality: DataQualityDTO;

  scheduled_inspections: number;
  in_progress_inspections: number;
  completed_inspections: number;
  submitted_inspections: number;
  
  total_evidence_count: number;
  evidence_by_type: CategoryBreakdownDTO[];
  
  sync_logs_total: number;
  sync_accepted_count: number;
  sync_conflict_count: number;
  sync_rejected_count: number;
  
  inspections_by_day: TimeSeriesPointDTO[];
  drilldown_entities: DrillDownEntityDTO[];
}

export interface PredictiveRiskAnalyticsDTO {
  mine_id: number;
  mine_name: string;
  time_range: TimeRangeDTO;
  data_as_of: string;
  data_quality: DataQualityDTO;

  latest_prediction_score?: number | null;
  latest_severity?: string | null;
  latest_probability?: number | null;
  horizon_minutes: number;
  model_version: string;
  
  total_predictions_generated: number;
  high_critical_predictions_count: number;
  risk_trend: TimeSeriesPointDTO[];
  severity_distribution: CategoryBreakdownDTO[];
  top_contributing_features: Array<Record<string, any>>;
  active_hotspots_count: number;
}

export interface MineComparativeMetricDTO {
  mine_id: number;
  mine_name: string;
  state: string;
  district: string;
  data_status: string;
  is_simulated: string;
  
  open_incidents: number;
  open_violations: number;
  sla_breaches: number;
  planned_production: number;
  actual_production: number;
  production_variance: number;
  attendance_rate_percent: number;
  environmental_deviations: number;
  predictive_risk_score?: number | null;
  active_hotspots: number;
}

export interface CrossMineBenchmarkingDTO {
  time_range: TimeRangeDTO;
  data_as_of: string;
  authorized_mines_count: number;
  mines: MineComparativeMetricDTO[];
}
