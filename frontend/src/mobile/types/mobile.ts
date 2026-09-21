export type MobileTab = 'home' | 'tasks' | 'map' | 'copilot' | 'more';

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
