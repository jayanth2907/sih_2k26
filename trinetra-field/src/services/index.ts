import api from './api';
import type { 
  AuthResponse, User, Mine, MineDetail, Sensor, SensorReading, Camera, Equipment, 
  Incident, IncidentStatus, Violation, RiskScore, AnomalyEvent, Alert, 
  SpatialContextResponse, MineTelemetrySummary, AuditEvent, DigitalTwinState,
  ProductionReport, Worker, AttendanceRecord, Contractor, Contract,
  EnvironmentalObservation, Grievance, ApprovalRequest, RegulatoryReport,
  GovernanceTask, GovernanceDashboardSummary,
  PredictiveRiskSummary, SignalAttribution, MLModelInfo,
  FieldInspection, FieldEvidence, SyncBatchRequest, SyncBatchResponse, ZoneRiskPrediction,
  IntegrationHealthResponse, SystemHealthResponse, ExternalReport, AuditChainVerification, AdapterHealthStatus, SystemHealthComponent,
  DemoPreflightReport, DemoScenarioSummary, DemoScenarioDetail, DemoStepResponse, DemoResetResponse, DemoScenarioStep, DemoPreflightItem,
  DocumentDTO, DocumentSummaryDTO, DocumentPageDTO, ExtractedDocumentFieldDTO, DocumentProcessingStatusDTO,
  GisMapDTO, GisRiskHotspotDTO, SpatialContextDTO, GisSearchResponseDTO,
  OperationalNotification, NotificationUnreadCounts, NotificationListResponse,
  SyncStatusResponse, SyncLogsResponse, QueuedSyncOperation
} from '../types';

export const authService = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const res = await api.post<AuthResponse>('/auth/login', { email, password });
    if (res.data.access_token) {
      localStorage.setItem('trinetra_token', res.data.access_token);
      localStorage.setItem('trinetra_user', JSON.stringify(res.data.user));
    }
    return res.data;
  },

  getCurrentUser: async (): Promise<User> => {
    const res = await api.get<User>('/auth/me');
    localStorage.setItem('trinetra_user', JSON.stringify(res.data));
    return res.data;
  },

  logout: () => {
    localStorage.removeItem('trinetra_token');
    localStorage.removeItem('trinetra_user');
  },

  getStoredUser: (): User | null => {
    const raw = localStorage.getItem('trinetra_user');
    return raw ? JSON.parse(raw) : null;
  },

  getToken: (): string | null => {
    return localStorage.getItem('trinetra_token');
  }
};

export const mineService = {
  getMines: async (): Promise<Mine[]> => {
    const res = await api.get<Mine[]>('/mines');
    return res.data;
  },

  getMineDetail: async (mineId: number): Promise<MineDetail> => {
    const res = await api.get<MineDetail>(`/mines/${mineId}`);
    return res.data;
  },

  getDigitalTwin: async (mineId: number): Promise<DigitalTwinState> => {
    const res = await api.get<DigitalTwinState>(`/mines/${mineId}/digital-twin`);
    return res.data;
  }
};

export const sensorService = {
  getSensors: async (mineId: number, status?: string): Promise<Sensor[]> => {
    const params = status ? { mine_id: mineId, status } : { mine_id: mineId };
    const res = await api.get<Sensor[]>('/sensors', { params });
    return res.data;
  },

  getSensorDetail: async (sensorId: number): Promise<Sensor> => {
    const res = await api.get<Sensor>(`/sensors/${sensorId}`);
    return res.data;
  },

  getSensorReadings: async (sensorId: number, limit = 50): Promise<SensorReading[]> => {
    const res = await api.get<SensorReading[]>(`/sensors/${sensorId}/readings`, { params: { limit } });
    return res.data;
  },

  simulateBatch: async (mineId: number) => {
    const res = await api.post(`/sensors/simulate-batch/${mineId}`);
    return res.data;
  },

  simulateScenario: async (mineId: number, scenario: string, sensorCode?: string) => {
    const res = await api.post(`/sensors/simulate-scenario/${mineId}`, {
      scenario,
      sensor_code: sensorCode
    });
    return res.data;
  },

  getMineSummary: async (mineId: number): Promise<MineTelemetrySummary> => {
    const res = await api.get<MineTelemetrySummary>(`/mines/${mineId}/telemetry/summary`);
    return res.data;
  },

  getAllMinesSummary: async (): Promise<MineTelemetrySummary[]> => {
    const res = await api.get<MineTelemetrySummary[]>('/mines/telemetry/summary-all');
    return res.data;
  }
};

export const cameraService = {
  getCameras: async (mineId: number): Promise<Camera[]> => {
    const res = await api.get<Camera[]>('/cameras', { params: { mine_id: mineId } });
    return res.data;
  },

  getEquipment: async (mineId: number): Promise<Equipment[]> => {
    const res = await api.get<Equipment[]>('/equipment', { params: { mine_id: mineId } });
    return res.data;
  }
};

export const incidentService = {
  getIncidents: async (mineId?: number, status?: string): Promise<Incident[]> => {
    const params: Record<string, any> = {};
    if (mineId) params.mine_id = mineId;
    if (status) params.status = status;
    const res = await api.get<Incident[]>('/incidents', { params });
    return res.data;
  },

  createIncident: async (incident: Partial<Incident>): Promise<Incident> => {
    const res = await api.post<Incident>('/incidents', incident);
    return res.data;
  },

  updateIncidentStatus: async (
    incidentId: number, 
    status: IncidentStatus, 
    comment?: string, 
    notes?: string,
    assigneeId?: number
  ): Promise<Incident> => {
    const res = await api.patch<Incident>(`/incidents/${incidentId}/status`, {
      status,
      comment,
      resolution_notes: notes,
      assignee_id: assigneeId
    });
    return res.data;
  },

  getViolations: async (mineId?: number): Promise<Violation[]> => {
    const params: Record<string, any> = {};
    if (mineId) params.mine_id = mineId;
    const res = await api.get<Violation[]>('/violations', { params });
    return res.data;
  }
};

export const alertService = {
  getAlerts: async (mineId?: number, status?: string, severity?: string): Promise<Alert[]> => {
    const params: Record<string, any> = {};
    if (mineId) params.mine_id = mineId;
    if (status) params.status = status;
    if (severity) params.severity = severity;
    const res = await api.get<Alert[]>('/alerts', { params });
    return res.data;
  },

  updateAlertStatus: async (alertId: number, status: string): Promise<Alert> => {
    const res = await api.patch<Alert>(`/alerts/${alertId}/status`, { status });
    return res.data;
  }
};

export const riskService = {
  getMineRisk: async (mineId: number, recalculate = false): Promise<RiskScore> => {
    const res = await api.get<RiskScore>(`/risk/${mineId}`, { params: { recalculate } });
    return res.data;
  },

  getAnomalies: async (mineId?: number, status?: string): Promise<AnomalyEvent[]> => {
    const params: Record<string, any> = {};
    if (mineId) params.mine_id = mineId;
    if (status) params.status = status;
    const res = await api.get<AnomalyEvent[]>('/anomalies', { params });
    return res.data;
  },

  getAnomalySpatialContext: async (anomalyId: number, radius = 250): Promise<SpatialContextResponse> => {
    const res = await api.get<SpatialContextResponse>(`/anomalies/${anomalyId}/context`, { params: { radius_meters: radius } });
    return res.data;
  },

  getAuditTrail: async (mineId?: number, resourceType?: string): Promise<AuditEvent[]> => {
    const params: Record<string, any> = {};
    if (mineId) params.mine_id = mineId;
    if (resourceType) params.resource_type = resourceType;
    const res = await api.get<AuditEvent[]>('/audit', { params });
    return res.data;
  }
};

export const governanceService = {
  // Production
  getProductionReports: async (mineId: number): Promise<ProductionReport[]> => {
    const res = await api.get<ProductionReport[]>(`/governance/production/${mineId}`);
    return res.data;
  },

  submitProductionReport: async (payload: Partial<ProductionReport>): Promise<ProductionReport> => {
    const res = await api.post<ProductionReport>('/governance/production', payload);
    return res.data;
  },

  // Workforce & Attendance
  getWorkers: async (mineId: number): Promise<Worker[]> => {
    const res = await api.get<Worker[]>(`/governance/workers/${mineId}`);
    return res.data;
  },

  markAttendance: async (payload: { worker_id: number; mine_id: number; shift_code?: string; status?: string; verification_mode?: string; notes?: string }): Promise<AttendanceRecord> => {
    const res = await api.post<AttendanceRecord>('/governance/attendance', payload);
    return res.data;
  },

  getAttendanceRoster: async (mineId: number): Promise<AttendanceRecord[]> => {
    const res = await api.get<AttendanceRecord[]>(`/governance/attendance/${mineId}`);
    return res.data;
  },

  // Contractors
  getContractors: async (): Promise<Contractor[]> => {
    const res = await api.get<Contractor[]>('/governance/contractors');
    return res.data;
  },

  getContracts: async (mineId: number): Promise<Contract[]> => {
    const res = await api.get<Contract[]>(`/governance/contracts/${mineId}`);
    return res.data;
  },

  // Environment
  getEnvironmentalObservations: async (mineId: number): Promise<EnvironmentalObservation[]> => {
    const res = await api.get<EnvironmentalObservation[]>(`/governance/environment/observations/${mineId}`);
    return res.data;
  },

  createEnvironmentalObservation: async (payload: Partial<EnvironmentalObservation>): Promise<EnvironmentalObservation> => {
    const res = await api.post<EnvironmentalObservation>('/governance/environment/observations', payload);
    return res.data;
  },

  // Grievances
  getGrievances: async (mineId: number): Promise<Grievance[]> => {
    const res = await api.get<Grievance[]>(`/governance/grievances/${mineId}`);
    return res.data;
  },

  submitGrievance: async (payload: Partial<Grievance>): Promise<Grievance> => {
    const res = await api.post<Grievance>('/governance/grievances', payload);
    return res.data;
  },

  updateGrievanceStatus: async (grievanceId: number, status: string, notes?: string): Promise<Grievance> => {
    const res = await api.patch<Grievance>(`/governance/grievances/${grievanceId}/status`, { status, resolution_notes: notes });
    return res.data;
  },

  // Approvals
  getApprovalRequests: async (mineId: number): Promise<ApprovalRequest[]> => {
    const res = await api.get<ApprovalRequest[]>(`/governance/approvals/${mineId}`);
    return res.data;
  },

  createApprovalRequest: async (payload: Partial<ApprovalRequest>): Promise<ApprovalRequest> => {
    const res = await api.post<ApprovalRequest>('/governance/approvals/request', payload);
    return res.data;
  },

  processApprovalDecision: async (requestId: number, action: string, comments?: string): Promise<ApprovalRequest> => {
    const res = await api.post<ApprovalRequest>(`/governance/approvals/${requestId}/decision`, { action, comments });
    return res.data;
  },

  // Regulatory Reports
  getReports: async (mineId: number): Promise<RegulatoryReport[]> => {
    const res = await api.get<RegulatoryReport[]>(`/governance/reports/${mineId}`);
    return res.data;
  },

  generateReport: async (payload: { mine_id: number; report_type: string; title: string; reporting_period_start: string; reporting_period_end: string }): Promise<RegulatoryReport> => {
    const res = await api.post<RegulatoryReport>('/governance/reports/generate', payload);
    return res.data;
  },

  downloadReportPdf: async (reportId: number) => {
    const res = await api.get(`/governance/reports/${reportId}/pdf`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `TRINETRA_Statutory_Report_${reportId}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  },

  // Summary & Tasks
  getGovernanceSummary: async (mineId: number): Promise<GovernanceDashboardSummary> => {
    const res = await api.get<GovernanceDashboardSummary>(`/governance/summary/${mineId}`);
    return res.data;
  },

  getGovernanceTasks: async (mineId: number): Promise<GovernanceTask[]> => {
    const res = await api.get<GovernanceTask[]>(`/governance/tasks/${mineId}`);
    return res.data;
  }
};

export const predictiveRiskService = {
  getLatestPredictiveRisk: async (mineId: number): Promise<PredictiveRiskSummary> => {
    const res = await api.get<PredictiveRiskSummary>(`/predictive-risk/latest/${mineId}`);
    return res.data;
  },

  evaluatePredictiveRisk: async (mineId: number, zoneId?: number): Promise<PredictiveRiskSummary> => {
    const res = await api.post<PredictiveRiskSummary>(`/predictive-risk/evaluate/${mineId}`, null, {
      params: zoneId ? { zone_id: zoneId } : {}
    });
    return res.data;
  },

  getPredictionsHistory: async (mineId: number, limit = 50): Promise<any[]> => {
    const res = await api.get<any[]>(`/predictive-risk/history/${mineId}`, {
      params: { limit }
    });
    return res.data;
  },

  getRegisteredModels: async (): Promise<MLModelInfo[]> => {
    const res = await api.get<MLModelInfo[]>('/predictive-risk/models');
    return res.data;
  }
};

export const copilotService = {
  query: async (request: { mine_id: number; query: string; conversation_id?: string; language?: string }): Promise<any> => {
    const res = await api.post('/copilot/query', request);
    return res.data;
  },

  getQuickPrompts: async (): Promise<any[]> => {
    const res = await api.get('/copilot/quick-prompts');
    return res.data;
  },

  getTools: async (): Promise<any[]> => {
    const res = await api.get('/copilot/tools');
    return res.data;
  },

  getHistory: async (mineId: number, limit = 20): Promise<any[]> => {
    const res = await api.get(`/copilot/history/${mineId}`, { params: { limit } });
    return res.data;
  }
};

export const mobileService = {
  getAssignedInspections: async (mineId: number): Promise<FieldInspection[]> => {
    const res = await api.get<FieldInspection[]>(`/mobile/inspections`, { params: { mine_id: mineId } });
    return res.data;
  },

  getInspectionById: async (id: number): Promise<FieldInspection> => {
    const res = await api.get<FieldInspection>(`/mobile/inspections/${id}`);
    return res.data;
  },

  createInspection: async (data: any): Promise<FieldInspection> => {
    const res = await api.post<FieldInspection>('/mobile/inspections', data);
    return res.data;
  },

  updateInspection: async (id: number, data: any): Promise<FieldInspection> => {
    const res = await api.put<FieldInspection>(`/mobile/inspections/${id}`, data);
    return res.data;
  },

  recordEvidence: async (data: any): Promise<FieldEvidence> => {
    const res = await api.post<FieldEvidence>('/mobile/evidence', data);
    return res.data;
  },

  getEvidenceById: async (evidenceId: number): Promise<FieldEvidence> => {
    const res = await api.get<FieldEvidence>(`/mobile/evidence/${evidenceId}`);
    return res.data;
  },

  verifyEvidence: async (evidenceId: number, notes?: string): Promise<any> => {
    const res = await api.post(`/mobile/evidence/${evidenceId}/verify`, null, {
      params: notes ? { notes } : {}
    });
    return res.data;
  },

  rejectEvidence: async (evidenceId: number, reason?: string): Promise<any> => {
    const res = await api.post(`/mobile/evidence/${evidenceId}/reject`, null, {
      params: reason ? { reason } : {}
    });
    return res.data;
  },

  syncBatch: async (data: SyncBatchRequest): Promise<SyncBatchResponse> => {
    const res = await api.post<SyncBatchResponse>('/mobile/sync', data);
    return res.data;
  },

  getSyncStatus: async (mineId?: number): Promise<SyncStatusResponse> => {
    const res = await api.get<SyncStatusResponse>('/mobile/sync/status', { params: mineId ? { mine_id: mineId } : {} });
    return res.data;
  },

  getSyncLogs: async (mineId?: number, status?: string, limit: number = 50, offset: number = 0): Promise<SyncLogsResponse> => {
    const params: any = { limit, offset };
    if (mineId) params.mine_id = mineId;
    if (status) params.status = status;
    const res = await api.get<SyncLogsResponse>('/mobile/sync/logs', { params });
    return res.data;
  },

  getWorkQueue: async (mineId?: number): Promise<any> => {
    const res = await api.get('/mobile/work-queue', { params: mineId ? { mine_id: mineId } : {} });
    return res.data;
  },

  updateTaskStatus: async (taskId: number, payloadOrStatus: string | { status: string; resolution_notes?: string; comment?: string }, notes?: string, comment?: string): Promise<any> => {
    let payload: { status: string; resolution_notes?: string; comment?: string };
    if (typeof payloadOrStatus === 'string') {
      payload = { status: payloadOrStatus, resolution_notes: notes, comment };
    } else {
      payload = payloadOrStatus;
    }
    const res = await api.patch(`/mobile/tasks/${taskId}/status`, payload);
    return res.data;
  },

  getShiftContext: async (mineId: number): Promise<any> => {
    const res = await api.get('/mobile/shift-context', { params: { mine_id: mineId } });
    return res.data;
  },

  getNotifications: async (mineId?: number, status?: string, category?: string): Promise<NotificationListResponse> => {
    const params: any = {};
    if (mineId) params.mine_id = mineId;
    if (status) params.status = status;
    if (category) params.category = category;
    const res = await api.get<NotificationListResponse>('/mobile/notifications', { params });
    return res.data;
  },

  getUnreadCounts: async (mineId?: number): Promise<NotificationUnreadCounts> => {
    const params: any = {};
    if (mineId) params.mine_id = mineId;
    const res = await api.get<NotificationUnreadCounts>('/mobile/notifications/unread-count', { params });
    return res.data;
  },

  markNotificationRead: async (notificationId: string): Promise<any> => {
    const res = await api.patch(`/mobile/notifications/${notificationId}/read`);
    return res.data;
  },

  markAllNotificationsRead: async (mineId?: number): Promise<any> => {
    const params: any = {};
    if (mineId) params.mine_id = mineId;
    const res = await api.post('/mobile/notifications/mark-all-read', null, { params });
    return res.data;
  },

  getWorkforce: async (params?: { mine_id?: number; shift_code?: string; trade?: string; search?: string; status?: string }): Promise<any> => {
    const res = await api.get('/mobile/workforce', { params });
    return res.data;
  },

  recordAttendance: async (payload: { worker_id: number; mine_id: number; shift_code?: string; status?: string; notes?: string; device_latitude?: number; device_longitude?: number }): Promise<any> => {
    const res = await api.post('/mobile/workforce/attendance', payload);
    return res.data;
  },

  correctAttendance: async (payload: { attendance_id: number; mine_id: number; new_status: string; correction_reason: string }): Promise<any> => {
    const res = await api.post('/mobile/workforce/attendance/correct', payload);
    return res.data;
  },

  getShiftHandoverSummary: async (mineId?: number): Promise<any> => {
    const res = await api.get('/mobile/workforce/handover', { params: mineId ? { mine_id: mineId } : {} });
    return res.data;
  },

  createShiftHandover: async (payload: { mine_id: number; from_shift_code: string; to_shift_code: string; summary_notes: string; safety_summary?: string }): Promise<any> => {
    const res = await api.post('/mobile/workforce/handover', payload);
    return res.data;
  },

  acknowledgeShiftHandover: async (handoverId: number, payload: { acknowledgment_notes?: string }): Promise<any> => {
    const res = await api.post(`/mobile/workforce/handover/${handoverId}/acknowledge`, payload);
    return res.data;
  },

  getFieldReportingSummary: async (mineId?: number): Promise<any> => {
    const params: any = {};
    if (mineId) params.mine_id = mineId;
    const res = await api.get('/mobile/reporting/summary', { params });
    return res.data;
  },

  getProductionReports: async (mineId?: number): Promise<any> => {
    const params: any = {};
    if (mineId) params.mine_id = mineId;
    const res = await api.get('/mobile/reporting/production', { params });
    return res.data;
  },

  recordProductionReport: async (payload: any): Promise<any> => {
    const res = await api.post('/mobile/reporting/production', payload);
    return res.data;
  },

  getEnvironmentalData: async (mineId?: number): Promise<any> => {
    const params: any = {};
    if (mineId) params.mine_id = mineId;
    const res = await api.get('/mobile/reporting/environment', { params });
    return res.data;
  },

  recordEnvironmentalObservation: async (payload: any): Promise<any> => {
    const res = await api.post('/mobile/reporting/environment', payload);
    return res.data;
  },

  getComplianceData: async (mineId?: number): Promise<any> => {
    const params: any = {};
    if (mineId) params.mine_id = mineId;
    const res = await api.get('/mobile/reporting/compliance', { params });
    return res.data;
  },

  recordComplianceObservation: async (payload: any): Promise<any> => {
    const res = await api.post('/mobile/reporting/compliance', payload);
    return res.data;
  },

  getContractorsSummary: async (mineId?: number): Promise<any> => {
    const params: any = {};
    if (mineId) params.mine_id = mineId;
    const res = await api.get('/mobile/contractors/summary', { params });
    return res.data;
  },

  getContractorsList: async (params?: { mine_id?: number; search?: string }): Promise<any> => {
    const res = await api.get('/mobile/contractors', { params });
    return res.data;
  },

  getContractDetail: async (contractId: number): Promise<any> => {
    const res = await api.get(`/mobile/contractors/contracts/${contractId}`);
    return res.data;
  },

  getContractRequirements: async (params?: { mine_id?: number; contract_id?: number; status_filter?: string }): Promise<any> => {
    const res = await api.get('/mobile/contractors/requirements', { params });
    return res.data;
  },

  verifyContractRequirement: async (payload: any): Promise<any> => {
    const res = await api.post('/mobile/contractors/requirements/verify', payload);
    return res.data;
  },

  // MOBILE-14: Grievance Field Operations
  getGrievancesSummary: async (mineId?: number): Promise<any> => {
    const params: any = {};
    if (mineId) params.mine_id = mineId;
    const res = await api.get('/mobile/grievances/summary', { params });
    return res.data;
  },

  getGrievancesList: async (params?: {
    mine_id?: number;
    status?: string;
    category?: string;
    priority?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<any> => {
    const res = await api.get('/mobile/grievances', { params });
    return res.data;
  },

  getGrievanceDetail: async (grievanceId: number): Promise<any> => {
    const res = await api.get(`/mobile/grievances/${grievanceId}`);
    return res.data;
  },

  createGrievance: async (payload: any): Promise<any> => {
    const res = await api.post('/mobile/grievances', payload);
    return res.data;
  },

  acknowledgeGrievance: async (grievanceId: number, payload?: any): Promise<any> => {
    const res = await api.post(`/mobile/grievances/${grievanceId}/acknowledge`, payload || {});
    return res.data;
  },

  assignGrievance: async (grievanceId: number, payload: any): Promise<any> => {
    const res = await api.post(`/mobile/grievances/${grievanceId}/assign`, payload);
    return res.data;
  },

  investigateGrievance: async (grievanceId: number, payload: any): Promise<any> => {
    const res = await api.post(`/mobile/grievances/${grievanceId}/investigate`, payload);
    return res.data;
  },

  resolveGrievance: async (grievanceId: number, payload: any): Promise<any> => {
    const res = await api.post(`/mobile/grievances/${grievanceId}/resolve`, payload);
    return res.data;
  },

  // MOBILE-15: Field Intelligence & Predictive Risk Actions
  getRiskIntelligenceSummary: async (mineId: number): Promise<any> => {
    const res = await api.get('/mobile/intelligence/summary', { params: { mine_id: mineId } });
    return res.data;
  },

  getRiskIntelligenceList: async (params: {
    mine_id: number;
    status?: string;
    severity?: string;
    limit?: number;
  }): Promise<any> => {
    const res = await api.get('/mobile/intelligence/risks', { params });
    return res.data;
  },

  getRiskIntelligenceDetail: async (predictionId: number): Promise<any> => {
    const res = await api.get(`/mobile/intelligence/risks/${predictionId}`);
    return res.data;
  },

  verifyRiskPrediction: async (predictionId: number, payload: any): Promise<any> => {
    const res = await api.post(`/mobile/intelligence/risks/${predictionId}/verify`, payload);
    return res.data;
  },

  // MOBILE-16: Cross-Domain Field Command & Integration
  getFieldCommandSummary: async (mineId: number, latitude?: number, longitude?: number): Promise<any> => {
    const params: Record<string, any> = { mine_id: mineId };
    if (latitude !== undefined) params.latitude = latitude;
    if (longitude !== undefined) params.longitude = longitude;
    const res = await api.get('/mobile/command/summary', { params });
    return res.data;
  },

  getUnifiedResourceTimeline: async (resourceType: string, resourceId: string, mineId: number): Promise<any> => {
    const res = await api.get(`/mobile/command/timeline/${resourceType}/${resourceId}`, { params: { mine_id: mineId } });
    return res.data;
  },

  getCrossDomainRelatedRecords: async (resourceType: string, resourceId: string, mineId: number): Promise<any> => {
    const res = await api.get(`/mobile/command/related/${resourceType}/${resourceId}`, { params: { mine_id: mineId } });
    return res.data;
  }
};

export const notificationService = {
  getNotifications: mobileService.getNotifications,
  getUnreadCounts: mobileService.getUnreadCounts,
  markNotificationRead: mobileService.markNotificationRead,
  markAllNotificationsRead: mobileService.markAllNotificationsRead
};

export const mobileApi = mobileService;
export const predictiveRiskApi = {
  getSummary: async (mineId: number) => {
    return predictiveRiskService.getLatestPredictiveRisk(mineId);
  }
};

export const integrationsService = {
  getHealth: async (): Promise<IntegrationHealthResponse> => {
    const res = await api.get<IntegrationHealthResponse>('/integrations/health');
    return res.data;
  },

  getSystemHealth: async (): Promise<SystemHealthResponse> => {
    const res = await api.get<SystemHealthResponse>('/integrations/system-health');
    return res.data;
  },

  getExternalReports: async (mineId?: number, sourceSystem?: string): Promise<ExternalReport[]> => {
    const res = await api.get<ExternalReport[]>('/integrations/reports', {
      params: {
        ...(mineId ? { mine_id: mineId } : {}),
        ...(sourceSystem ? { source_system: sourceSystem } : {})
      }
    });
    return res.data;
  },

  syncAdapter: async (sourceSystem: string, mineId?: number): Promise<any> => {
    const res = await api.post(`/integrations/sync/${sourceSystem}`, null, {
      params: mineId ? { mine_id: mineId } : {}
    });
    return res.data;
  },

  simulateFailure: async (sourceSystem: string): Promise<any> => {
    const res = await api.post(`/integrations/simulate-failure/${sourceSystem}`);
    return res.data;
  },

  simulateRecovery: async (sourceSystem: string): Promise<any> => {
    const res = await api.post(`/integrations/simulate-recovery/${sourceSystem}`);
    return res.data;
  },

  verifyAuditChain: async (): Promise<AuditChainVerification> => {
    const res = await api.get<AuditChainVerification>('/integrations/audit-verify');
    return res.data;
  }
};

export const integrationsApi = integrationsService;

export const demoService = {
  getPreflightCheck: async (): Promise<DemoPreflightReport> => {
    const res = await api.get<DemoPreflightReport>('/demo/preflight');
    return res.data;
  },

  getScenarios: async (): Promise<DemoScenarioSummary[]> => {
    const res = await api.get<DemoScenarioSummary[]>('/demo/scenarios');
    return res.data;
  },

  getScenarioDetail: async (scenarioId: string): Promise<DemoScenarioDetail> => {
    const res = await api.get<DemoScenarioDetail>(`/demo/scenarios/${scenarioId}`);
    return res.data;
  },

  executeStep: async (scenarioId: string, runId?: string, force?: boolean): Promise<DemoStepResponse> => {
    const res = await api.post<DemoStepResponse>(`/demo/scenarios/${scenarioId}/step`, {
      run_id: runId,
      force: force ?? false
    });
    return res.data;
  },

  runAllSteps: async (scenarioId: string, runId?: string): Promise<DemoStepResponse[]> => {
    const res = await api.post<DemoStepResponse[]>(`/demo/scenarios/${scenarioId}/run-all`, {
      run_id: runId
    });
    return res.data;
  },

  resetScenario: async (scenarioId: string): Promise<DemoResetResponse> => {
    const res = await api.post<DemoResetResponse>(`/demo/scenarios/${scenarioId}/reset`);
    return res.data;
  },

  resetAllDemoData: async (): Promise<DemoResetResponse> => {
    const res = await api.post<DemoResetResponse>('/demo/reset-all');
    return res.data;
  }
};

export const demoApi = demoService;

export const realMineDataService = {
  getRealMines: async (): Promise<any[]> => {
    const res = await api.get('/mine-data/real-mines');
    return res.data;
  },

  getRealMineDetail: async (mineId: number): Promise<any> => {
    const res = await api.get(`/mine-data/${mineId}`);
    return res.data;
  },

  getCoordinates: async (mineId: number): Promise<any[]> => {
    const res = await api.get(`/mine-data/${mineId}/coordinates`);
    return res.data;
  },

  getSeams: async (mineId: number): Promise<any[]> => {
    const res = await api.get(`/mine-data/${mineId}/seams`);
    return res.data;
  },

  getClearances: async (mineId: number): Promise<any[]> => {
    const res = await api.get(`/mine-data/${mineId}/clearances`);
    return res.data;
  },

  getProvenance: async (mineId: number): Promise<any[]> => {
    const res = await api.get(`/mine-data/${mineId}/provenance`);
    return res.data;
  },

  getQualitySummary: async (mineId: number): Promise<any> => {
    const res = await api.get(`/mine-data/${mineId}/quality`);
    return res.data;
  }
};

export const documentService = {
  uploadDocument: async (file: File, mineId?: number, title?: string, sourceTier = 'TIER_3_TRINETRA_OPERATIONAL'): Promise<DocumentDTO> => {
    const formData = new FormData();
    formData.append('file', file);
    if (mineId) formData.append('mine_id', mineId.toString());
    if (title) formData.append('title', title);
    formData.append('source_tier', sourceTier);
    const res = await api.post<DocumentDTO>('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
  },

  getDocuments: async (mineId?: number, docType?: string, qualityStatus?: string, verificationStatus?: string): Promise<DocumentSummaryDTO[]> => {
    const params: any = {};
    if (mineId) params.mine_id = mineId;
    if (docType) params.doc_type = docType;
    if (qualityStatus) params.quality_status = qualityStatus;
    if (verificationStatus) params.verification_status = verificationStatus;
    const res = await api.get<DocumentSummaryDTO[]>('/documents', { params });
    return res.data;
  },

  getDocument: async (documentId: number): Promise<DocumentDTO> => {
    const res = await api.get<DocumentDTO>(`/documents/${documentId}`);
    return res.data;
  },

  getDocumentPages: async (documentId: number): Promise<DocumentPageDTO[]> => {
    const res = await api.get<DocumentPageDTO[]>(`/documents/${documentId}/pages`);
    return res.data;
  },

  getDocumentFields: async (documentId: number): Promise<ExtractedDocumentFieldDTO[]> => {
    const res = await api.get<ExtractedDocumentFieldDTO[]>(`/documents/${documentId}/fields`);
    return res.data;
  },

  verifyField: async (documentId: number, fieldId: number, isVerified: string, verifiedValue?: string): Promise<ExtractedDocumentFieldDTO> => {
    const res = await api.post<ExtractedDocumentFieldDTO>(`/documents/${documentId}/fields/${fieldId}/verify`, {
      is_verified: isVerified,
      verified_value: verifiedValue
    });
    return res.data;
  },

  verifyAllFields: async (documentId: number): Promise<DocumentDTO> => {
    const res = await api.post<DocumentDTO>(`/documents/${documentId}/verify-all`);
    return res.data;
  },

  createDraftGovernance: async (documentId: number, title: string, description: string): Promise<any> => {
    const res = await api.post(`/documents/${documentId}/create-draft-governance`, { title, description });
    return res.data;
  },

  getOcrStatus: async (documentId: number): Promise<DocumentProcessingStatusDTO> => {
    const res = await api.get<DocumentProcessingStatusDTO>(`/documents/${documentId}/ocr-status`);
    return res.data;
  },

  deleteDocument: async (documentId: number): Promise<any> => {
    const res = await api.delete(`/documents/${documentId}`);
    return res.data;
  }
};

export const gisService = {
  getMineMap: async (mineId: number): Promise<GisMapDTO> => {
    const res = await api.get<GisMapDTO>(`/gis/mines/${mineId}/map`);
    return res.data;
  },

  getSpatialContext: async (mineId: number, lat: number, lon: number): Promise<SpatialContextDTO> => {
    const res = await api.get<SpatialContextDTO>(`/gis/mines/${mineId}/context`, {
      params: { latitude: lat, longitude: lon }
    });
    return res.data;
  },

  getMineRisk: async (mineId: number): Promise<GisRiskHotspotDTO[]> => {
    const res = await api.get<GisRiskHotspotDTO[]>(`/gis/mines/${mineId}/risk`);
    return res.data;
  },

  searchGis: async (q: string, mineId?: number): Promise<GisSearchResponseDTO> => {
    const res = await api.get<GisSearchResponseDTO>('/gis/search', {
      params: { q, ...(mineId ? { mine_id: mineId } : {}) }
    });
    return res.data;
  },

  createFieldTaskFromGis: async (featureId: string, mineId: number, title: string, notes?: string): Promise<any> => {
    const res = await api.post(`/gis/features/${featureId}/field-task`, null, {
      params: { mine_id: mineId, title, ...(notes ? { notes } : {}) }
    });
    return res.data;
  }
};

export { analyticsService } from './analyticsService';

export type { 
  FieldInspection, 
  FieldEvidence, 
  ChecklistItem, 
  SyncOperationItem, 
  SyncBatchRequest, 
  SyncOperationResult, 
  SyncBatchResponse, 
  ZoneRiskPrediction,
  AdapterHealthStatus,
  IntegrationHealthResponse,
  ExternalReport,
  AuditChainVerification,
  SystemHealthComponent,
  SystemHealthResponse,
  DemoScenarioStep,
  DemoScenarioSummary,
  DemoScenarioDetail,
  DemoPreflightItem,
  DemoPreflightReport,
  DemoStepResponse,
  DemoResetResponse,
  GisMapDTO,
  GisRiskHotspotDTO,
  GisBoundaryFeatureDTO,
  GisCoordinateFeatureDTO,
  GisOperationalFeatureDTO,
  SpatialContextDTO,
  GisSearchResponseDTO,
  GisSearchItemDTO,
  GovernanceTask,
  WorkQueueResponse,
  WorkQueueCounts,
  ShiftContextResponse,
  OperationalNotification,
  NotificationUnreadCounts,
  NotificationListResponse
} from '../types';






