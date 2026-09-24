export type SupportedLanguage = 'en' | 'hi' | 'te';

export interface Translations {
  appName: string;
  appSubtitle: string;
  navCommand: string;
  navMonitor: string;
  navGovern: string;
  navIntelligence: string;
  liveDashboard: string;
  aiRiskIntelligence: string;
  aiCopilot: string;
  operationalAlerts: string;
  productionLogs: string;
  workforceMuster: string;
  contractorsSla: string;
  atmosphereEnv: string;
  sensorsTelemetry: string;
  minesLevels: string;
  cctvMachinery: string;
  safetyIncidents: string;
  dgmsViolations: string;
  grievanceRedressal: string;
  statutoryReports: string;
  digitalSignoffs: string;
  spatialTwin: string;
  riskAuditTrail: string;
  currentRisk: string;
  predictedRisk: string;
  horizon: string;
  probability: string;
  focusIn3D: string;
  viewEvidence: string;
  viewTasks: string;
  viewViolations: string;
  viewIncidents: string;
  askCopilotPlaceholder: string;
  sendQuery: string;
  clearChat: string;
  quickActions: string;
  dataProvenance: string;
  evidenceSignals: string;
  recommendedAction: string;
  insufficientData: string;
  systemNormal: string;
  criticalAlert: string;
  warningAlert: string;
  fieldOperations: string;
  startInspection: string;
  reportIncident: string;
  recordObservation: string;
  captureEvidence: string;
  syncQueue: string;
  syncNow: string;
  onlineStatus: string;
  offlineStatus: string;
  syncingStatus: string;
  pendingSyncCount: string;
  gpsAccuracy: string;
  sha256Hash: string;
  integrationsHealth: string;
  auditIntegrity: string;
  circuitBreaker: string;
  sourceProvenance: string;
  demoControlCenter: string;
  documentIntelligence: string;
  gisCommandMap: string;
  governanceIntelligence: string;
  governanceSubtitle: string;
  dataAsOfLabel: string;
  dataTrustLabel: string;
  sourceDerivedLabel: string;
  operationalLabel: string;
  simulatedLabel: string;
  modelDerivedLabel: string;
  attentionRequiredLabel: string;
  whatChangedLabel: string;
  crossMineViewLabel: string;
  safetyIntelligenceLabel: string;
  complianceIntelligenceLabel: string;
  productionPerformanceLabel: string;
  environmentalMonitoringLabel: string;
  predictiveRisk30MinLabel: string;
  noDataLabel: string;
  viewInGisLabel: string;
  viewContractorsLabel: string;
  openFieldOperationsLabel: string;
  openPgrmWorkflowLabel: string;
  languageSelect: string;
  // Sensors & Telemetry
  sensorTelemetryNodes: string;
  sensorTelemetrySubtitle: string;
  scenarioControlsTitle: string;
  scenarioImpactTitle: string;
  scenarioImpactSubtitle: string;
  normalBaseline: string;
  methaneSpike: string;
  coSurge: string;
  ventilationDrop: string;
  sensorSilence: string;
  multiHazardSpike: string;
  sensorCode: string;
  sensorNameType: string;
  zoneLevel: string;
  liveTelemetry: string;
  thresholds: string;
  coords3d: string;
  status: string;
  history: string;
  centerInTwin: string;
  viewReadingHistory: string;
  // Workforce
  workforceManagement: string;
  workforceSubtitle: string;
  activeWorkers: string;
  shiftsToday: string;
  attendanceRate: string;
  certCompliance: string;
  searchWorkers: string;
  allShifts: string;
  allMines: string;
  workerName: string;
  designation: string;
  shift: string;
  assignedMine: string;
  attendance: string;
  safetyCert: string;
  // Common Actions
  generateReport: string;
  downloadPdf: string;
  viewDetails: string;
  exportData: string;
  filterBy: string;
  allStatus: string;
  // Human-Centric Terminology Layer
  liveMonitoring: string;
  unusualReading: string;
  safetyLimitExceeded: string;
  sensorNotReporting: string;
  missingMonitoringSignal: string;
  actionRequired: string;
  assignedAction: string;
  forecastedRisk: string;
  syncFieldRecords: string;
  externalSignal: string;
  riskAssessment: string;
  nearbyInformation: string;
  sourceAndEvidence: string;
  fromSourceDocument: string;
  demonstrationData: string;
  aiModelForecast: string;
  viewTechnicalDetails: string;
  hideTechnicalDetails: string;
  todaysFieldInspections: string;
  recordAttendance: string;
  saveAttendance: string;
  cancel: string;
  selectWorker: string;
  currentCondition: string;
  whatItMeans: string;
  whyTitle: string;
  decisionSupportDisclaimer: string;
  // Mobile Foundation (MOBILE-01)
  trinetraField: string;
  fieldIntelligence: string;
  fieldMotto: string;
  mobileHome: string;
  mobileTasks: string;
  mobileMap: string;
  mobileCopilot: string;
  mobileMore: string;
  assignedTasks: string;
  highPriority: string;
  pendingSync: string;
  todayOverview: string;
  myTasks: string;
  conductInspection: string;
  fieldObservation: string;
  safetyAudit: string;
  statutoryAudit: string;
  activeViolations: string;
  riskHeatmap: string;
  shiftApprovals: string;
  incidentLog: string;
  complianceEvidence: string;
  officialReports: string;
  noTasksAssigned: string;
  noMinesAssigned: string;
  sessionExpired: string;
  sessionExpiredDesc: string;
  signInAgain: string;
  serverError: string;
  serverErrorDesc: string;
  networkOnlineNotice: string;
  networkOfflineNotice: string;
  networkSyncingNotice: string;
  networkSyncCompleteNotice: string;
  networkSyncErrorNotice: string;
  authorizedMines: string;
  switchMine: string;
  selectMinePrompt: string;
  profileAndRole: string;
  languageSelection: string;
  systemDiagnostics: string;
  signOutButton: string;
  phaseFoundationNotice: string;
  // Mobile Field Execution (MOBILE-02)
  taskDetailsTitle: string;
  dueTimeLabel: string;
  assignedByLabel: string;
  reasonContextLabel: string;
  predictiveRiskHotspotLabel: string;
  contributingSignalsLabel: string;
  startInspectionBtn: string;
  openTaskBtn: string;
  inspectionTitle: string;
  checksCompletedLabel: string;
  checkItemCompliant: string;
  checkItemObservation: string;
  checkItemNonCompliant: string;
  checkItemNotApplicable: string;
  addObservationNote: string;
  observationSeverityLabel: string;
  recommendationLabel: string;
  statuteReferenceLabel: string;
  humanVerificationNotice: string;
  potentialNonComplianceNotice: string;
  attachedEvidenceTitle: string;
  browserCameraLabel: string;
  takePhotoBtn: string;
  documentUploadBtn: string;
  hashVerifiedLabel: string;
  captureLocationLabel: string;
  gpsAvailableLabel: string;
  locationSimulatedLabel: string;
  datumWgs84Label: string;
  inspectionReviewTitle: string;
  saveDraftBtn: string;
  submitInspectionBtn: string;
  inspectionSubmittedSuccess: string;
  auditRecordedConfirmed: string;
  savedOfflineNotice: string;
  validationErrorIncomplete: string;
  validationErrorNotesRequired: string;
  backToTaskListBtn: string;
  viewInspectionBtn: string;
  readyToSubmitStatus: string;
  evidenceItemsCount: string;
  // Mobile Field Evidence & GPS (MOBILE-03)
  capturePhoto: string;
  chooseFile: string;
  addNoteEvidence: string;
  evidencePreviewTitle: string;
  retakePhoto: string;
  usePhoto: string;
  removeEvidence: string;
  evidenceNotePlaceholder: string;
  linkObservationLabel: string;
  locationQualityGood: string;
  locationQualityFair: string;
  locationQualityLow: string;
  refreshLocationBtn: string;
  locatingStatus: string;
  evidenceFingerprintCreated: string;
  sha256Explanation: string;
  technicalDetailsTitle: string;
  hideTechnicalDetailsTitle: string;
  syncStatusLocal: string;
  syncStatusQueued: string;
  syncStatusSyncing: string;
  syncStatusSynced: string;
  syncStatusFailed: string;
  retrySyncBtn: string;
  verifyEvidenceBtn: string;
  rejectEvidenceBtn: string;
  verificationNotesPrompt: string;
  verifiedBadge: string;
  rejectedBadge: string;
  pendingVerificationBadge: string;
  // Mobile Field Map & Spatial Intelligence (MOBILE-04)
  fieldMapTitle: string;
  spatialOrientation: string;
  myLocation: string;
  nearbyIntelligence: string;
  openTasksCount: string;
  highCriticalRisk: string;
  openIncidents: string;
  sensorAnomalies: string;
  nearMeFilter: string;
  allMineFilter: string;
  layerMineBoundary: string;
  layerMyLocation: string;
  layerTasks: string;
  layerRisk: string;
  layerSensors: string;
  layerIncidents: string;
  currentRiskLabel: string;
  predictedRiskLabel: string;
  predictedEscalation: string;
  withinHorizon: string;
  inspectAction: string;
  openTaskAction: string;
  viewSensorAction: string;
  openIncidentAction: string;
  askCopilotAction: string;
  viewIn3dAction: string;
  gpsActiveStatus: string;
  gpsLowAccuracyStatus: string;
  gpsUnavailableStatus: string;
  surveyedReferenceStatus: string;
  gpsUnavailableMineContext: string;
  mapDataUnavailable: string;
  mapDataUnavailableOffline: string;
  staleDataNotice: string;
  lastUpdatedLabel: string;
  updateTimeUnavailable: string;
  sourceDerivedBadge: string;
  actualGpsBadge: string;
  simulatedDemoBadge: string;
  basemapSatellite: string;
  basemapTerrain: string;
  viewOnMap: string;
  // Mobile Field Intelligence + Incident Response (MOBILE-05)
  fieldResponse: string;
  incidentResponseWorkflow: string;
  activeIncidents: string;
  correctiveActions: string;
  fieldResponseTitle: string;
  fieldIncidentResponse: string;
  startFieldResponseBtn: string;
  incidentDetailsTitle: string;
  incidentLifecycleStatus: string;
  recordObservationBtn: string;
  createCorrectiveActionBtn: string;
  assignCorrectiveAction: string;
  correctiveActionTitle: string;
  correctiveActionPriority: string;
  correctiveActionDueDate: string;
  slaDueIn: string;
  slaOverdueBy: string;
  slaUnavailable: string;
  resolveIncidentBtn: string;
  verifyIncidentBtn: string;
  rejectIncidentBtn: string;
  closeIncidentBtn: string;
  rejectionReasonPrompt: string;
  responseChecklistTitle: string;
  responseTimelineTitle: string;
  responseReviewTitle: string;
  incidentTriageBtn: string;
  incidentAssignBtn: string;
  quickObservationType: string;
  quickObservationSeverity: string;
  quickObservationNotes: string;
  observationSavedSuccess: string;
  correctiveActionCreatedSuccess: string;
  incidentResolvedSuccess: string;
  incidentVerifiedSuccess: string;
  incidentRejectedNotice: string;
  overdueActionsCount: string;
  pendingVerificationCount: string;
  highCriticalOpenIncidents: string;
  // Mobile Field Tasks, Work Queue & Shift Operations (MOBILE-06)
  myWork: string;
  workQueue: string;
  openWorkQueue: string;
  currentShift: string;
  shiftSummary: string;
  activeShift: string;
  noActiveShift: string;
  attendanceStatus: string;
  taskDetails: string;
  taskReview: string;
  startTask: string;
  completeTask: string;
  taskCompletedSuccess: string;
  noAssignedTasks: string;
  noAssignedTasksDesc: string;
  noOverdueTasks: string;
  noPendingVerification: string;
  dueToday: string;
  overdue: string;
  inProgress: string;
  completed: string;
  pendingVerification: string;
  allTasks: string;
  taskPriority: string;
  taskDomain: string;
  assignedTo: string;
  slaInformationUnavailable: string;
  locationNotAvailable: string;
  workQueueMayBeStale: string;
  requiredInfoMissing: string;
  conflictReviewRequired: string;
  loadingWorkQueue: string;
  verificationQueue: string;
  // Mobile Field Communications & Actionable Notifications (MOBILE-07)
  notifications: string;
  notificationsCenterTitle: string;
  attentionSectionTitle: string;
  allNotificationsTab: string;
  unreadTab: string;
  criticalTab: string;
  tasksTab: string;
  incidentsTab: string;
  riskTab: string;
  verificationTab: string;
  markReadBtn: string;
  markAllReadBtn: string;
  allNotificationsRead: string;
  viewAllNotifications: string;
  noNotifications: string;
  noUnreadNotifications: string;
  notificationsMayBeStale: string;
  staleResourceNotice: string;
  viewWorkQueueBtn: string;
  openIncidentBtn: string;
  viewRiskBtn: string;
  reviewVerificationBtn: string;
  askCopilotBtn: string;
  loadingNotifications: string;
  // Mobile Offline Resilience & Sync Center (MOBILE-08)
  syncCenterTitle: string;
  savedLocally: string;
  queuedForSync: string;
  syncingStatusText: string;
  serverAcknowledged: string;
  auditRecorded: string;
  syncFailedText: string;
  syncConflictText: string;
  lastSuccessfulServerSync: string;
  noServerSyncRecorded: string;
  syncNowBtn: string;
  retrySafeAllBtn: string;
  retryOpBtn: string;
  clearSyncedBtn: string;
  mayBeStaleNotice: string;
  reviewConflictBtn: string;
  deviceOnlineStatus: string;
  serverReachableStatus: string;
  serverUnreachableStatus: string;
  localDraftsCount: string;
  pendingOperationsCount: string;
  storageUsageTitle: string;
  gisFreshnessTitle: string;
  notificationsFreshnessTitle: string;
  safeToRetryLabel: string;
  unsafeToRetryLabel: string;
  conflictResolutionModalTitle: string;
  localVersionLabel: string;
  serverVersionLabel: string;
  keepLocalBtn: string;
  acceptServerBtn: string;
  noPendingOperationsMsg: string;
  // Mobile Supervisor Review & Digital Sign-Off (MOBILE-09)
  reviewCenterTitle: string;
  reviewCenterSubtitle: string;
  pendingReviewTab: string;
  urgentReviewsTab: string;
  overdueReviewsTab: string;
  returnedReviewsTab: string;
  approvedReviewsTab: string;
  rejectedReviewsTab: string;
  allReviewsTab: string;
  reviewActionBtn: string;
  approveAndSignOffBtn: string;
  returnForCorrectionBtn: string;
  rejectReviewBtn: string;
  confirmApprovalTitle: string;
  confirmApprovalNotice: string;
  sodBlockedWarning: string;
  mandatoryRejectionReasonPrompt: string;
  rejectionReasonPlaceholder: string;
  returnReasonPrompt: string;
  returnReasonPlaceholder: string;
  resubmitReviewBtn: string;
  resubmitNotesPrompt: string;
  resubmitNotesPlaceholder: string;
  digitalSignOffRecorded: string;
  serverAuditChained: string;
  evidenceSha256Fingerprint: string;
  surveyedMineLocation: string;
  actualGpsLocation: string;
  auditTimelineTitle: string;
  dgmsChecklistReview: string;
  noReviewsFound: string;
  loadingReviewDetails: string;
  reviewDecisionSuccess: string;
  resourceDetailsTitle: string;
  submitterInfoTitle: string;
  observationsNotesTitle: string;
  evidenceGalleryTitle: string;
  relatedGovernanceTitle: string;
  fieldDocuments: string;
  documentsSubtitle: string;
  statutoryTab: string;
  mineOperationalTab: string;
  ocrVerifiedTab: string;
  pendingVerificationTab: string;
  searchDocumentsPlaceholder: string;
  openDocumentBtn: string;
  viewRequirementBtn: string;
  statutoryRequirementTitle: string;
  verbatimStatutoryText: string;
  sourceProvenanceTitle: string;
  sourceTier: string;
  issuingOrganization: string;
  effectiveDate: string;
  statutoryRef: string;
  textNativeExtraction: string;
  ocrExtraction: string;
  humanVerifiedBadge: string;
  humanReviewRequiredBadge: string;
  staleDocumentNotice: string;
  offlineAvailableNotice: string;
  connectionRequiredNotice: string;
  searchInsideDocPlaceholder: string;
  noDocumentsFound: string;
  loadingDocumentDetails: string;
  pageNavigation: string;
  ofWord: string;
  nextPage: string;
  prevPage: string;
  copySha256Fingerprint: string;
  hashCopiedTooltip: string;
  verifiedByOfficer: string;
  documentFieldsTitle: string;
  // Mobile Workforce, Attendance & Shift Handover (MOBILE-11)
  mobileWorkforceTitle: string;
  mobileWorkforceSubtitle: string;
  currentShiftTitle: string;
  activeShiftWindow: string;
  totalAssignedWorkers: string;
  presentWorkers: string;
  absentWorkers: string;
  onLeaveWorkers: string;
  pendingAttendance: string;
  offDutyWorkers: string;
  markPresent: string;
  markAbsent: string;
  markLeave: string;
  markOffDuty: string;
  recordAttendanceBtn: string;
  correctAttendanceBtn: string;
  attendanceCorrectionTitle: string;
  correctionReasonLabel: string;
  correctionReasonPlaceholder: string;
  manualAttendanceBadge: string;
  deviceLocationContext: string;
  shiftHandoverTab: string;
  rosterTab: string;
  openHandoverItems: string;
  createHandoverBtn: string;
  acknowledgeHandoverBtn: string;
  handoverAcknowledgedBadge: string;
  handoverSubmittedBadge: string;
  handoverNotesPlaceholder: string;
  safetyNotesPlaceholder: string;
  outgoingShift: string;
  incomingShift: string;
  overdueTasks: string;
  pendingInspections: string;
  criticalAlerts: string;
  environmentalObs: string;
  dataPrivacyNotice: string;
  noBiometricDisclaimer: string;
  offlineAttendanceSaved: string;
  offlineHandoverSaved: string;
  // Mobile Field Reporting (MOBILE-12)
  fieldReportingTitle: string;
  fieldReportingSubtitle: string;
  productionReportTab: string;
  environmentObservationTab: string;
  complianceObservationTab: string;
  plannedQuantityLabel: string;
  actualQuantityLabel: string;
  varianceLabel: string;
  coalGradeLabel: string;
  materialTypeLabel: string;
  provenanceLabel: string;
  provenanceManual: string;
  provenanceSensor: string;
  provenanceImported: string;
  provenanceSimulated: string;
  locationSourceLabel: string;
  locationActualGps: string;
  locationSurveyed: string;
  statutoryRuleLabel: string;
  thresholdLimitLabel: string;
  observedValueLabel: string;
  noConfiguredRuleNotice: string;
  thresholdExceededNotice: string;
  thresholdWithinLimitNotice: string;
  cmrRegulationLabel: string;
  violationTitleLabel: string;
  violationDescriptionLabel: string;
  correctiveActionLabel: string;
  remedialDeadlineLabel: string;
  statutoryDisclaimerText: string;
  environmentalDisclaimerText: string;
  productionDisclaimerText: string;
  savedOfflinePendingSync: string;
  submitForSupervisorReview: string;
  reportingSummaryTitle: string;
  reportsSubmittedCount: string;
  activeObservationsCount: string;
  openViolationsCount: string;
  recordProductionBtn: string;
  recordEnvObservationBtn: string;
  recordViolationBtn: string;
  evidenceAttachmentTitle: string;
  notesRemarksLabel: string;
  unitLabel: string;
  // Mobile Contractor Field Operations & SLA Management (MOBILE-13)
  contractorsFieldTitle: string;
  contractorsFieldSubtitle: string;
  contractsTab: string;
  requirementsTab: string;
  contractorVerificationQueueTab: string;
  totalContractorsCount: string;
  activeContractsCount: string;
  overdueRequirementsCount: string;
  pendingVerificationsCount: string;
  contractorCodeLabel: string;
  workScopeLabel: string;
  contractValueLabel: string;
  validityPeriodLabel: string;
  slaStatusLabel: string;
  slaOnTrack: string;
  slaDueSoon: string;
  slaOverdue: string;
  slaExpired: string;
  slaCompliant: string;
  verifyRequirementBtn: string;
  recordIssueBtn: string;
  verificationModalTitle: string;
  contractorDisclaimerText: string;
  offlineContractorSaved: string;
  contractDetailTitle: string;
  requirementDetailTitle: string;
  createCorrectiveTaskLabel: string;
  assigneeRoleLabel: string;
  remedialActionPlanLabel: string;
  // Mobile Grievance Field Operations (MOBILE-14)
  grievancesFieldTitle: string;
  grievancesFieldSubtitle: string;
  allGrievancesTab: string;
  myAssignmentsTab: string;
  investigationQueueTab: string;
  resolvedGrievancesTab: string;
  totalGrievancesCount: string;
  openGrievancesCount: string;
  investigationRequiredCount: string;
  overdueGrievancesCount: string;
  logGrievanceBtn: string;
  acknowledgeGrievanceBtn: string;
  assignInvestigatorBtn: string;
  recordInvestigationBtn: string;
  resolveGrievanceBtn: string;
  reopenGrievanceBtn: string;
  grievanceDisclaimerText: string;
  offlineGrievanceSaved: string;
  grievanceDetailTitle: string;
  complainantTypeLabel: string;
  anonymousComplaint: string;
  nodalOfficerLabel: string;
  investigationFindingsLabel: string;
  actionRequiredLabel: string;
  resolutionSummaryLabel: string;
  // Mobile Field Intelligence & Predictive Risk Actions (MOBILE-15)
  fieldIntelligenceTitle: string;
  fieldIntelligenceSubtitle: string;
  activeSignalsTab: string;
  myVerificationsTab: string;
  allPredictionsTab: string;
  predictedEscalationRisk: string;
  modelProvenanceLabel: string;
  verifyInFieldBtn: string;
  recordFieldOutcomeTitle: string;
  outcomeNoIssue: string;
  outcomeIssueFound: string;
  outcomeFurtherReview: string;
  createLinkedTaskLabel: string;
  createLinkedIncidentLabel: string;
  dataFreshnessLive: string;
  dataFreshnessStale: string;
  dataFreshnessUnavailable: string;
  simulatedHoldoutNotice: string;
  pipelineTraceTitle: string;
  offlineRiskContextSaved: string;
  riskDetailHeader: string;
  activeAlertsLabel: string;
  horizonMinutesLabel: string;
  escalationProbabilityLabel: string;
  normalBaselineLabel: string;
  statutoryLimitLabel: string;
  // Cross-Domain Field Command (MOBILE-16)
  fieldCommandTitle: string;
  fieldCommandSubtitle: string;
  myWorkSectionTitle: string;
  nearbySectionTitle: string;
  quickActionsTitle: string;
  sourcePredictiveModel: string;
  sourceIncidentLog: string;
  sourceTaskQueue: string;
  sourceSupervisorReview: string;
  sourceContractorSla: string;
  sourcePgrmGrievance: string;
  sourceEnvObservation: string;
  sourceStatutoryCompliance: string;
  relatedRecordsTitle: string;
  unifiedTimelineTitle: string;
  noAttentionItems: string;
  noMyWorkItems: string;
  noNearbyItems: string;
  verifyRiskBtn: string;
  reviewItemBtn: string;
  completeTaskBtn: string;
  investigateGrievanceBtn: string;
  viewDetailsBtn: string;
  lastSyncLabel: string;
  currentShiftLabel: string;
  networkStatusLabel: string;
  staleContextWarning: string;
}

export const translations: Record<SupportedLanguage, Translations> = {
  en: {
    appName: 'TRINETRA',
    appSubtitle: 'Mine Governance AI',
    navCommand: 'COMMAND',
    navMonitor: 'MONITOR',
    navGovern: 'GOVERN',
    navIntelligence: 'INTELLIGENCE',
    liveDashboard: 'Live Dashboard',
    gisCommandMap: '2D GIS Command Map',
    demoControlCenter: 'Demo Control Center',
    documentIntelligence: 'Document Intelligence & OCR',
    aiRiskIntelligence: 'Predictive Risk',
    aiCopilot: 'AI Copilot',
    fieldOperations: 'Field Operations',
    integrationsHealth: 'Integrations & Health',
    auditIntegrity: 'Cryptographic Audit Integrity',
    circuitBreaker: 'Circuit Breaker',
    sourceProvenance: 'Source Provenance',
    startInspection: 'Start Inspection',
    reportIncident: 'Report Incident',
    recordObservation: 'Record Observation',
    captureEvidence: 'Capture Evidence',
    syncQueue: 'Sync Queue',
    syncNow: 'Sync Now',
    onlineStatus: 'ONLINE',
    offlineStatus: 'OFFLINE (Local Queue Active)',
    syncingStatus: 'SYNCING...',
    pendingSyncCount: 'Pending Synchronization',
    gpsAccuracy: 'GPS Accuracy',
    sha256Hash: 'SHA-256 Evidence Hash',
    operationalAlerts: 'Operational Alerts',
    productionLogs: 'Production & Reports',
    workforceMuster: 'Workforce & Attendance',
    contractorsSla: 'Contractors & SLA',
    atmosphereEnv: 'Environment & Air Quality',
    sensorsTelemetry: 'Sensors & Telemetry',
    minesLevels: 'Mines & Levels',
    cctvMachinery: 'CCTV & Machinery',
    safetyIncidents: 'Safety Incidents',
    dgmsViolations: 'DGMS Violations',
    grievanceRedressal: 'Grievance Redressal',
    statutoryReports: 'Statutory Reports',
    digitalSignoffs: 'Digital Sign-offs',
    spatialTwin: '3D Spatial Twin',
    riskAuditTrail: 'Risk & Audit Trail',
    currentRisk: 'Current Operational Risk',
    predictedRisk: 'Predicted Risk (30m)',
    horizon: 'Prediction Horizon',
    probability: 'Escalation Probability',
    focusIn3D: 'FOCUS IN 3D',
    viewEvidence: 'VIEW EVIDENCE',
    viewTasks: 'VIEW GOVERNANCE TASKS',
    viewViolations: 'VIEW VIOLATIONS',
    viewIncidents: 'VIEW INCIDENTS',
    askCopilotPlaceholder: 'Ask a governance or safety question about your authorized mine data...',
    sendQuery: 'Send Query',
    clearChat: 'Clear History',
    quickActions: 'Quick Governance Queries',
    dataProvenance: 'Data Source: REAL BACKEND DATA | SIMULATED TELEMETRY',
    evidenceSignals: 'Grounding Evidence & Observed Signals',
    recommendedAction: 'Recommended Statutory Next Step',
    insufficientData: 'Insufficient telemetry data to generate reliable prediction.',
    systemNormal: 'All parameters within DGMS statutory limits.',
    criticalAlert: 'CRITICAL ESCALATION',
    warningAlert: 'STATUTORY WARNING',
    governanceIntelligence: 'Governance Intelligence',
    governanceSubtitle: 'Cross-domain operational, compliance and predictive intelligence',
    dataAsOfLabel: 'DATA AS OF',
    dataTrustLabel: 'DATA TRUST',
    sourceDerivedLabel: 'SOURCE-DERIVED',
    operationalLabel: 'OPERATIONAL',
    simulatedLabel: 'DATA MODE: SIMULATED',
    modelDerivedLabel: 'MODEL-DERIVED',
    attentionRequiredLabel: 'ATTENTION REQUIRED',
    whatChangedLabel: 'WHAT CHANGED',
    crossMineViewLabel: 'CROSS-MINE VIEW',
    safetyIntelligenceLabel: 'SAFETY INTELLIGENCE',
    complianceIntelligenceLabel: 'COMPLIANCE INTELLIGENCE',
    productionPerformanceLabel: 'PRODUCTION PERFORMANCE',
    environmentalMonitoringLabel: 'ENVIRONMENTAL MONITORING',
    predictiveRisk30MinLabel: 'PREDICTIVE RISK — 30 MIN',
    noDataLabel: 'NO DATA',
    viewInGisLabel: 'VIEW IN GIS',
    viewContractorsLabel: 'VIEW CONTRACTORS',
    openFieldOperationsLabel: 'OPEN FIELD OPERATIONS',
    openPgrmWorkflowLabel: 'OPEN PGRM WORKFLOW',
    languageSelect: 'Language',
    sensorTelemetryNodes: 'Environmental & Telemetry Nodes',
    sensorTelemetrySubtitle: 'Real-time gas concentration, air velocity, dust PM, and strata seismic monitoring with deterministic simulation.',
    scenarioControlsTitle: 'Deterministic Simulation Scenario Controls (SIH Testing)',
    scenarioImpactTitle: 'Active Scenario Pipeline Response',
    scenarioImpactSubtitle: 'Real-time telemetry injection, threshold evaluation, and incident trigger status',
    normalBaseline: 'Normal Baseline',
    methaneSpike: 'Methane Spike',
    coSurge: 'CO Gas Surge',
    ventilationDrop: 'Ventilation Drop',
    sensorSilence: 'Sensor Silence',
    multiHazardSpike: 'Multi-Hazard Spike',
    sensorCode: 'Sensor Code',
    sensorNameType: 'Sensor Name / Type',
    zoneLevel: 'Zone / Level',
    liveTelemetry: 'Live Telemetry',
    thresholds: 'Thresholds (Warn / Crit)',
    coords3d: '3D Coords (x,y,z)',
    status: 'Status',
    history: 'History',
    centerInTwin: 'Center in 3D Digital Twin',
    viewReadingHistory: 'View Telemetry Reading History',
    workforceManagement: 'Workforce & Muster Intelligence',
    workforceSubtitle: 'Statutory Form E muster roll, biometric attendance, DGMS safety certifications, and shift allocations.',
    activeWorkers: 'Active Workers',
    shiftsToday: 'Active Shifts',
    attendanceRate: 'Muster Attendance Rate',
    certCompliance: 'DGMS Cert Compliance',
    searchWorkers: 'Search workers by name, token, designation...',
    allShifts: 'All Shifts',
    allMines: 'All Mine Allocations',
    workerName: 'Worker Name / Token',
    designation: 'Designation / Role',
    shift: 'Assigned Shift',
    assignedMine: 'Allocated Mine',
    attendance: 'Muster Attendance',
    safetyCert: 'DGMS Cert Status',
    generateReport: 'Generate Statutory Report',
    downloadPdf: 'Download Signed PDF',
    viewDetails: 'View Details',
    exportData: 'Export Data',
    filterBy: 'Filter By',
    allStatus: 'ALL STATUS',
    // Human-Centric Terminology Layer
    liveMonitoring: 'Live Monitoring',
    unusualReading: 'Unusual Reading',
    safetyLimitExceeded: 'Safety Limit Exceeded',
    sensorNotReporting: 'Sensor Not Reporting',
    missingMonitoringSignal: 'Missing Monitoring Signal',
    actionRequired: 'Action Required',
    assignedAction: 'Assigned Action',
    forecastedRisk: 'Forecasted Risk',
    syncFieldRecords: 'Sync Field Records',
    externalSignal: 'External Signal',
    riskAssessment: 'Risk Assessment',
    nearbyInformation: 'Nearby Information',
    sourceAndEvidence: 'Source & Evidence',
    fromSourceDocument: 'From Source Document',
    demonstrationData: 'Demonstration Data',
    aiModelForecast: 'AI/Model Forecast',
    viewTechnicalDetails: 'View Technical Details',
    hideTechnicalDetails: 'Hide Technical Details',
    todaysFieldInspections: "Today's Field Inspections",
    recordAttendance: 'Record Attendance',
    saveAttendance: 'Save Attendance',
    cancel: 'Cancel',
    selectWorker: 'Select Worker',
    currentCondition: 'Current Condition',
    whatItMeans: 'What It Means',
    whyTitle: 'Key Contributing Factors (Why?)',
    decisionSupportDisclaimer: 'Decision Support Only: Human verification required before statutory or operational action.',
    // Mobile Foundation (MOBILE-01)
    trinetraField: 'TRINETRA FIELD',
    fieldIntelligence: 'FIELD INTELLIGENCE',
    fieldMotto: 'Observe. Verify. Record. Act.',
    mobileHome: 'Home',
    mobileTasks: 'Tasks',
    mobileMap: 'Map',
    mobileCopilot: 'Copilot',
    mobileMore: 'More',
    assignedTasks: 'Assigned Tasks',
    highPriority: 'High Priority',
    pendingSync: 'Pending Sync',
    todayOverview: 'TODAY',
    myTasks: 'My Tasks',
    conductInspection: 'Start Inspection',
    fieldObservation: 'Field Observation',
    safetyAudit: 'Safety Audit',
    statutoryAudit: 'Statutory Audit',
    activeViolations: 'Active Violations',
    riskHeatmap: 'Risk Heatmap',
    shiftApprovals: 'Shift Approvals',
    incidentLog: 'Incident Log',
    complianceEvidence: 'Compliance Evidence',
    officialReports: 'Official Reports',
    noTasksAssigned: 'No field tasks are currently assigned to you.',
    noMinesAssigned: 'No authorized mines found for this account.',
    sessionExpired: 'SESSION EXPIRED',
    sessionExpiredDesc: 'Your TRINETRA session has expired. Please sign in again.',
    signInAgain: 'Sign In Again',
    serverError: 'SERVER ERROR',
    serverErrorDesc: 'TRINETRA could not reach the server.',
    networkOnlineNotice: 'Connected to TRINETRA Core. Real-time sync operational.',
    networkOfflineNotice: 'You are offline. Work will be saved locally.',
    networkSyncingNotice: 'Synchronizing field records with TRINETRA Core...',
    networkSyncCompleteNotice: 'All field operations synchronized successfully.',
    networkSyncErrorNotice: 'Sync encounter errors. Queued for automatic retry.',
    authorizedMines: 'Authorized Mines',
    switchMine: 'Switch Mine',
    selectMinePrompt: 'Select an authorized operational mine:',
    profileAndRole: 'Profile & Role',
    languageSelection: 'Language',
    systemDiagnostics: 'Diagnostics & Sync',
    signOutButton: 'Sign Out',
    phaseFoundationNotice: 'Mobile Foundation Shell Active (Phase 1). Operational engines activate in subsequent phases.',
    // Mobile Field Execution (MOBILE-02)
    taskDetailsTitle: 'Task Details',
    dueTimeLabel: 'Due Time',
    assignedByLabel: 'Assigned By',
    reasonContextLabel: 'Reason & Context',
    predictiveRiskHotspotLabel: 'Predictive Risk Hotspot',
    contributingSignalsLabel: 'Contributing Signals',
    startInspectionBtn: 'Start Inspection',
    openTaskBtn: 'Open Task',
    inspectionTitle: 'Field Inspection',
    checksCompletedLabel: 'checks completed',
    checkItemCompliant: 'Compliant',
    checkItemObservation: 'Observation',
    checkItemNonCompliant: 'Non-Compliant',
    checkItemNotApplicable: 'N/A',
    addObservationNote: 'Add Observation Note',
    observationSeverityLabel: 'Severity',
    recommendationLabel: 'Recommendation',
    statuteReferenceLabel: 'Statute Reference',
    humanVerificationNotice: 'Human Verification Required: Field observations do not automatically establish statutory violations.',
    potentialNonComplianceNotice: 'Potential non-compliance recorded for supervisory verification.',
    attachedEvidenceTitle: 'Attached Evidence',
    browserCameraLabel: 'Browser Camera / File',
    takePhotoBtn: 'Take Photo',
    documentUploadBtn: 'Attach File',
    hashVerifiedLabel: 'SHA-256 Hashed',
    captureLocationLabel: 'Capture Location',
    gpsAvailableLabel: 'Actual GPS Fixed',
    locationSimulatedLabel: 'Surveyed Mine Coordinates',
    datumWgs84Label: 'Datum: WGS84',
    inspectionReviewTitle: 'Inspection Review',
    saveDraftBtn: 'Save Draft',
    submitInspectionBtn: 'Submit Inspection',
    inspectionSubmittedSuccess: 'Inspection Submitted Successfully',
    auditRecordedConfirmed: 'AUDIT: RECORDED',
    savedOfflineNotice: 'SAVED OFFLINE — Work will synchronize when network connectivity returns.',
    validationErrorIncomplete: 'Incomplete inspection checks remaining.',
    validationErrorNotesRequired: 'Please provide notes and severity for non-compliant items.',
    backToTaskListBtn: 'Back to Task List',
    viewInspectionBtn: 'View Inspection',
    readyToSubmitStatus: 'Ready to Submit',
    evidenceItemsCount: 'Evidence Items',
    // Mobile Field Evidence & GPS (MOBILE-03 - English)
    capturePhoto: '+ Capture Photo',
    chooseFile: '+ Choose File',
    addNoteEvidence: '+ Add Note',
    evidencePreviewTitle: 'Evidence Preview',
    retakePhoto: 'Retake',
    usePhoto: 'Use Photo',
    removeEvidence: 'Remove',
    evidenceNotePlaceholder: 'Enter written observation or note details...',
    linkObservationLabel: 'Linked Observation / Check',
    locationQualityGood: 'Good (High Precision)',
    locationQualityFair: 'Fair (Medium Precision)',
    locationQualityLow: 'Low Precision',
    refreshLocationBtn: 'Refresh Location',
    locatingStatus: 'Locating GPS...',
    evidenceFingerprintCreated: 'SHA-256 integrity fingerprint generated',
    sha256Explanation: 'SHA-256 records the integrity fingerprint of the evidence file processed by TRINETRA.',
    technicalDetailsTitle: 'Technical Details',
    hideTechnicalDetailsTitle: 'Hide Technical Details',
    syncStatusLocal: 'Saved Locally',
    syncStatusQueued: 'Queued for Sync',
    syncStatusSyncing: 'Syncing with Server...',
    syncStatusSynced: 'Synchronized',
    syncStatusFailed: 'Upload Failed',
    retrySyncBtn: 'Retry Upload',
    verifyEvidenceBtn: 'Verify Evidence',
    rejectEvidenceBtn: 'Reject Evidence',
    verificationNotesPrompt: 'Supervisor Verification Notes',
    verifiedBadge: 'Verified',
    rejectedBadge: 'Rejected',
    pendingVerificationBadge: 'Pending Review',
    // Mobile Field Map & Spatial Intelligence (MOBILE-04)
    fieldMapTitle: 'Field Map',
    spatialOrientation: 'Spatial Field Orientation',
    myLocation: 'My Location',
    nearbyIntelligence: 'Nearby Intelligence',
    openTasksCount: 'Open Tasks',
    highCriticalRisk: 'High/Critical Risk',
    openIncidents: 'Open Incidents',
    sensorAnomalies: 'Sensor Anomalies',
    nearMeFilter: 'Near Me',
    allMineFilter: 'All Mine',
    layerMineBoundary: 'Mine Boundary',
    layerMyLocation: 'My Location',
    layerTasks: 'Tasks',
    layerRisk: 'Risk Hotspots',
    layerSensors: 'Sensors',
    layerIncidents: 'Incidents',
    currentRiskLabel: 'CURRENT RISK',
    predictedRiskLabel: 'PREDICTED RISK',
    predictedEscalation: 'Predicted Escalation',
    withinHorizon: 'within 30 min',
    inspectAction: 'Inspect',
    openTaskAction: 'Open Task',
    viewSensorAction: 'View Sensor',
    openIncidentAction: 'Open Incident',
    askCopilotAction: 'Ask Copilot',
    viewIn3dAction: 'View in 3D',
    gpsActiveStatus: 'GPS Active',
    gpsLowAccuracyStatus: 'GPS Low Accuracy',
    gpsUnavailableStatus: 'GPS Unavailable',
    surveyedReferenceStatus: 'Surveyed Reference',
    gpsUnavailableMineContext: 'GPS unavailable — showing mine context.',
    mapDataUnavailable: 'Map Data Unavailable',
    mapDataUnavailableOffline: 'Map Data Unavailable Offline',
    staleDataNotice: 'OFFLINE — Data may be stale',
    lastUpdatedLabel: 'Last updated',
    updateTimeUnavailable: 'Update time unavailable',
    sourceDerivedBadge: 'SOURCE-DERIVED',
    actualGpsBadge: 'ACTUAL GPS',
    simulatedDemoBadge: 'SIMULATED DEMO',
    basemapSatellite: 'Satellite',
    basemapTerrain: 'Terrain',
    viewOnMap: 'View on Map',
    // Mobile Field Intelligence + Incident Response (MOBILE-05)
    fieldResponse: 'Field Response',
    incidentResponseWorkflow: 'Incident Response Workflow',
    activeIncidents: 'Active Incidents',
    correctiveActions: 'Corrective Actions',
    fieldResponseTitle: 'Field Response',
    fieldIncidentResponse: 'Incident Response & Mitigation',
    startFieldResponseBtn: 'Start Response',
    incidentDetailsTitle: 'Incident Details',
    incidentLifecycleStatus: 'Lifecycle Status',
    recordObservationBtn: 'Record Observation',
    createCorrectiveActionBtn: 'Create Corrective Action',
    assignCorrectiveAction: 'Assign Action',
    correctiveActionTitle: 'Corrective Action',
    correctiveActionPriority: 'Action Priority',
    correctiveActionDueDate: 'Remedial Deadline',
    slaDueIn: 'Due in',
    slaOverdueBy: 'Overdue by',
    slaUnavailable: 'SLA deadline not recorded',
    resolveIncidentBtn: 'Mark as Resolved',
    verifyIncidentBtn: 'Verify Resolution',
    rejectIncidentBtn: 'Reject Response',
    closeIncidentBtn: 'Close Incident',
    rejectionReasonPrompt: 'Enter justification reason for rejection',
    responseChecklistTitle: 'Response Quality Checklist',
    responseTimelineTitle: 'Incident Response Timeline',
    responseReviewTitle: 'Field Response Review',
    incidentTriageBtn: 'Triage Incident',
    incidentAssignBtn: 'Assign Investigator',
    quickObservationType: 'Observation Category',
    quickObservationSeverity: 'Observed Severity',
    quickObservationNotes: 'Observation Writeup',
    observationSavedSuccess: 'Field observation recorded and queued for audit.',
    correctiveActionCreatedSuccess: 'Corrective action assigned and tracked.',
    incidentResolvedSuccess: 'Incident marked as resolved. Pending supervisor verification.',
    incidentVerifiedSuccess: 'Incident resolution verified and recorded in audit ledger.',
    incidentRejectedNotice: 'Response rejected. Incident returned to investigation.',
    overdueActionsCount: 'Overdue Actions',
    pendingVerificationCount: 'Pending Verification',
    highCriticalOpenIncidents: 'High/Critical Open',
    // Mobile Field Tasks, Work Queue & Shift Operations (MOBILE-06)
    myWork: 'My Work',
    workQueue: 'Work Queue',
    openWorkQueue: 'Open Work Queue',
    currentShift: 'Current Shift',
    shiftSummary: 'Shift Summary',
    activeShift: 'Active Shift',
    noActiveShift: 'No Active Shift',
    attendanceStatus: 'Attendance',
    taskDetails: 'Task Details',
    taskReview: 'Task Completion Review',
    startTask: 'Start Task',
    completeTask: 'Complete Task',
    taskCompletedSuccess: 'Task marked as completed.',
    noAssignedTasks: 'No Assigned Tasks',
    noAssignedTasksDesc: "You're clear for now.",
    noOverdueTasks: 'No Overdue Tasks',
    noPendingVerification: 'No Pending Verification',
    dueToday: 'Due Today',
    overdue: 'Overdue',
    inProgress: 'In Progress',
    completed: 'Completed',
    pendingVerification: 'Pending Verification',
    allTasks: 'All Tasks',
    taskPriority: 'Priority',
    taskDomain: 'Domain',
    assignedTo: 'Assigned To',
    slaInformationUnavailable: 'SLA Information Unavailable',
    locationNotAvailable: 'Location Not Available',
    workQueueMayBeStale: 'Work queue may be stale',
    requiredInfoMissing: 'Required Information Missing',
    conflictReviewRequired: 'Conflict — Review Required',
    loadingWorkQueue: 'Loading Work Queue...',
    verificationQueue: 'Verification Queue',
    // Mobile Field Communications & Actionable Notifications (MOBILE-07)
    notifications: 'Notifications',
    notificationsCenterTitle: 'Field Notifications & Comms',
    attentionSectionTitle: 'Operational Attention',
    allNotificationsTab: 'ALL',
    unreadTab: 'UNREAD',
    criticalTab: 'CRITICAL',
    tasksTab: 'TASKS',
    incidentsTab: 'INCIDENTS',
    riskTab: 'RISK',
    verificationTab: 'VERIFICATION',
    markReadBtn: 'Mark Read',
    markAllReadBtn: 'Mark All Read',
    allNotificationsRead: 'All notifications marked as read',
    viewAllNotifications: 'View All Notifications',
    noNotifications: 'No notifications available in current scope.',
    noUnreadNotifications: 'No unread notifications.',
    notificationsMayBeStale: 'Offline: Notifications may be stale',
    staleResourceNotice: 'This resource is no longer active or has already been resolved.',
    viewWorkQueueBtn: 'View Work Queue',
    openIncidentBtn: 'Open Incident',
    viewRiskBtn: 'View Risk',
    reviewVerificationBtn: 'Review Verification',
    askCopilotBtn: 'Ask Copilot',
    loadingNotifications: 'Loading notifications & operational alerts...',
    // Mobile Offline Resilience & Sync Center (MOBILE-08)
    syncCenterTitle: 'Sync Center & Offline Resilience',
    savedLocally: 'Saved locally',
    queuedForSync: 'Queued for sync',
    syncingStatusText: 'Syncing...',
    serverAcknowledged: 'Server acknowledged',
    auditRecorded: 'Audit recorded',
    syncFailedText: 'Failed',
    syncConflictText: 'Conflict',
    lastSuccessfulServerSync: 'Last Successful Server Sync',
    noServerSyncRecorded: 'No successful server synchronization recorded',
    syncNowBtn: 'Sync Now',
    retrySafeAllBtn: 'Retry All Safe',
    retryOpBtn: 'Retry',
    clearSyncedBtn: 'Clear Acknowledged',
    mayBeStaleNotice: 'May be stale while offline',
    reviewConflictBtn: 'Review Conflict',
    deviceOnlineStatus: 'Device Online',
    serverReachableStatus: 'Server Reachable',
    serverUnreachableStatus: 'Server Unreachable',
    localDraftsCount: 'Local Drafts',
    pendingOperationsCount: 'Pending Operations',
    storageUsageTitle: 'Offline Storage Usage',
    gisFreshnessTitle: 'GIS Spatial Freshness',
    notificationsFreshnessTitle: 'Notifications Freshness',
    safeToRetryLabel: 'Safe to Retry',
    unsafeToRetryLabel: 'Unsafe / Validation Conflict',
    conflictResolutionModalTitle: 'Sync Conflict Resolution',
    localVersionLabel: 'Local Version',
    serverVersionLabel: 'Server Version',
    keepLocalBtn: 'Keep Local & Retry',
    acceptServerBtn: 'Accept Server State',
    noPendingOperationsMsg: 'No pending offline operations. All records synchronized.',
    // Mobile Supervisor Review & Digital Sign-Off (MOBILE-09)
    reviewCenterTitle: 'Review & Sign-Off Center',
    reviewCenterSubtitle: 'Supervisory Verification, Separation of Duties & Digital Sign-Off',
    pendingReviewTab: 'Pending Review',
    urgentReviewsTab: 'Urgent',
    overdueReviewsTab: 'Overdue',
    returnedReviewsTab: 'Returned',
    approvedReviewsTab: 'Approved',
    rejectedReviewsTab: 'Rejected',
    allReviewsTab: 'All',
    reviewActionBtn: 'Review & Sign Off',
    approveAndSignOffBtn: 'Approve & Sign Off',
    returnForCorrectionBtn: 'Return for Correction',
    rejectReviewBtn: 'Reject',
    confirmApprovalTitle: 'Confirm Digital Sign-Off',
    confirmApprovalNotice: 'A verifiable digital sign-off and server-authoritative audit trail will be permanently recorded.',
    sodBlockedWarning: 'Separation of Duties: You cannot approve your own submission.',
    mandatoryRejectionReasonPrompt: 'Mandatory Rejection Reason',
    rejectionReasonPlaceholder: 'Provide specific statutory or operational reasons for rejection...',
    returnReasonPrompt: 'Reason for Return & Correction',
    returnReasonPlaceholder: 'Explain what evidence or data must be corrected or added...',
    resubmitReviewBtn: 'Resubmit Work',
    resubmitNotesPrompt: 'Correction & Revision Notes',
    resubmitNotesPlaceholder: 'Describe the changes made and additional evidence provided...',
    digitalSignOffRecorded: 'Digital Sign-Off Recorded',
    serverAuditChained: 'Server Audit Trail Chained',
    evidenceSha256Fingerprint: 'SHA-256 Tamper-Evident Fingerprint',
    surveyedMineLocation: 'Surveyed Mine Coordinate',
    actualGpsLocation: 'Live Actual GPS Coordinate',
    auditTimelineTitle: 'Audit & Review Timeline',
    dgmsChecklistReview: 'DGMS Statutory Observations & Checklist',
    noReviewsFound: 'No review items matching the selected criteria.',
    loadingReviewDetails: 'Loading review context & evidence...',
    reviewDecisionSuccess: 'Review decision recorded successfully.',
    resourceDetailsTitle: 'Resource Identity & Scope',
    submitterInfoTitle: 'Submission & Inspector Context',
    observationsNotesTitle: 'Field Observations & DGMS Findings',
    evidenceGalleryTitle: 'Cryptographic Field Evidence Gallery',
    relatedGovernanceTitle: 'Linked Governance & Risk Intelligence',
    fieldDocuments: 'Field Documents & Statutory Records',
    documentsSubtitle: 'Authoritative DGMS regulations, mine dossiers, and field records',
    statutoryTab: 'Statutory Acts',
    mineOperationalTab: 'Mine Operational',
    ocrVerifiedTab: 'OCR Verified',
    pendingVerificationTab: 'Pending Review',
    searchDocumentsPlaceholder: 'Search regulations, circulars, acts, challans, or records...',
    openDocumentBtn: 'Open Document',
    viewRequirementBtn: 'View Requirement',
    statutoryRequirementTitle: 'Statutory Compliance Requirement',
    verbatimStatutoryText: 'Verbatim Statutory Rule Excerpt',
    sourceProvenanceTitle: 'Source Provenance & Cryptographic Fingerprint',
    sourceTier: 'Source Tier',
    issuingOrganization: 'Issuing Organization',
    effectiveDate: 'Effective Date',
    statutoryRef: 'Statutory Reference',
    textNativeExtraction: 'Text-Native Stream',
    ocrExtraction: 'OCR Extracted Stream',
    humanVerifiedBadge: 'Verified by Officer',
    humanReviewRequiredBadge: 'Requires Human Review',
    staleDocumentNotice: 'Stale Source (Offline Cache > 7 Days)',
    offlineAvailableNotice: 'Available Offline',
    connectionRequiredNotice: 'Connection Required for Full Stream',
    searchInsideDocPlaceholder: 'Search keywords within document text...',
    noDocumentsFound: 'No documents matching the selected criteria.',
    loadingDocumentDetails: 'Loading document stream & provenance...',
    pageNavigation: 'Page',
    ofWord: 'of',
    nextPage: 'Next Page',
    prevPage: 'Previous Page',
    copySha256Fingerprint: 'Copy SHA-256 Fingerprint',
    hashCopiedTooltip: 'SHA-256 Hash Copied to Clipboard!',
    verifiedByOfficer: 'Human Officer Verified',
    documentFieldsTitle: 'Extracted Operational Fields',
    // Mobile Workforce, Attendance & Shift Handover (MOBILE-11)
    mobileWorkforceTitle: 'Workforce & Shift Handover',
    mobileWorkforceSubtitle: 'Statutory attendance roster, shift allocations, and digital handover logs.',
    currentShiftTitle: 'Current Operational Shift',
    activeShiftWindow: 'Configured Shift Window',
    totalAssignedWorkers: 'Assigned Workers',
    presentWorkers: 'Present',
    absentWorkers: 'Absent',
    onLeaveWorkers: 'On Leave',
    pendingAttendance: 'Pending',
    offDutyWorkers: 'Off Duty',
    markPresent: 'Mark Present',
    markAbsent: 'Mark Absent',
    markLeave: 'Mark On Leave',
    markOffDuty: 'Mark Off Duty',
    recordAttendanceBtn: 'Record Attendance',
    correctAttendanceBtn: 'Correct Status',
    attendanceCorrectionTitle: 'Attendance Correction',
    correctionReasonLabel: 'Mandatory Correction Reason',
    correctionReasonPlaceholder: 'Enter official justification for muster roll amendment...',
    manualAttendanceBadge: 'Manual Record',
    deviceLocationContext: 'Device Context',
    shiftHandoverTab: 'Shift Handover',
    rosterTab: 'Worker Roster',
    openHandoverItems: 'Open Handover Items',
    createHandoverBtn: 'Create Shift Handover',
    acknowledgeHandoverBtn: 'Acknowledge Handover',
    handoverAcknowledgedBadge: 'Handover Acknowledged',
    handoverSubmittedBadge: 'Handover Submitted',
    handoverNotesPlaceholder: 'Enter shift operations summary, ongoing bench works, or equipment notes...',
    safetyNotesPlaceholder: 'Enter safety observations, ventilation status, or environmental alerts...',
    outgoingShift: 'Outgoing Shift',
    incomingShift: 'Incoming Shift',
    overdueTasks: 'Overdue Tasks',
    pendingInspections: 'Pending Inspections',
    criticalAlerts: 'Critical Alerts',
    environmentalObs: 'Environmental Notes',
    dataPrivacyNotice: 'Privacy Protected: Direct personal phone, banking, and Aadhaar numbers are redacted.',
    noBiometricDisclaimer: 'Statutory Governance Record: Attendance is recorded manually by authorized supervisors. Device coordinates are saved as contextual metadata only.',
    offlineAttendanceSaved: 'Attendance saved locally — server acknowledgment pending.',
    offlineHandoverSaved: 'Shift handover saved locally — server acknowledgment pending.',
    // Mobile Field Reporting (MOBILE-12)
    fieldReportingTitle: 'Field Reporting',
    fieldReportingSubtitle: 'Production, Environmental & Statutory Compliance Observation Capture',
    productionReportTab: 'Production',
    environmentObservationTab: 'Environment',
    complianceObservationTab: 'Compliance',
    plannedQuantityLabel: 'Planned Quantity',
    actualQuantityLabel: 'Actual Quantity Recorded',
    varianceLabel: 'Variance',
    coalGradeLabel: 'Coal Grade / Quality',
    materialTypeLabel: 'Material Type',
    provenanceLabel: 'Data Provenance / Source',
    provenanceManual: 'MANUAL ENTRY',
    provenanceSensor: 'SENSOR DERIVED',
    provenanceImported: 'EXTERNAL IMPORTED',
    provenanceSimulated: 'SIMULATED DEMO',
    locationSourceLabel: 'Location Context',
    locationActualGps: 'Actual GPS Fix',
    locationSurveyed: 'Surveyed Mine Coordinate',
    statutoryRuleLabel: 'Statutory Rule Reference',
    thresholdLimitLabel: 'Configured Threshold',
    observedValueLabel: 'Observed Measurement',
    noConfiguredRuleNotice: 'No statutory threshold rule configured for this parameter.',
    thresholdExceededNotice: 'THRESHOLD EXCEEDED — Supervisor review required.',
    thresholdWithinLimitNotice: 'Within configured environmental safety threshold.',
    cmrRegulationLabel: 'DGMS / CMR 2017 Clause',
    violationTitleLabel: 'Observation / Non-Conformance Title',
    violationDescriptionLabel: 'Detailed Observation Description',
    correctiveActionLabel: 'Proposed Remedial / Corrective Action',
    remedialDeadlineLabel: 'Target Resolution SLA / Date',
    statutoryDisclaimerText: 'Statutory Governance: TRINETRA captures field non-conformances with source provenance. Human officials remain authoritative for legal determinations.',
    environmentalDisclaimerText: 'Operational Environmental Log: Sensor and manual readings are contextual and uncertified for statutory clearance unless verified by NABL lab.',
    productionDisclaimerText: 'Mine Dispatch & Shift Output Record: Shift records route through Mine Manager for digital sign-off and audit chaining.',
    savedOfflinePendingSync: 'Saved locally — Pending server synchronization.',
    submitForSupervisorReview: 'Submit for Supervisor Review & Sign-Off',
    reportingSummaryTitle: 'Shift Reporting Status',
    reportsSubmittedCount: 'Production Reports',
    activeObservationsCount: 'Active Observations',
    openViolationsCount: 'Open Non-Conformances',
    recordProductionBtn: 'Record Production Log',
    recordEnvObservationBtn: 'Log Environmental Reading',
    recordViolationBtn: 'Log Compliance Observation',
    evidenceAttachmentTitle: 'Attached Photographic / Field Evidence',
    notesRemarksLabel: 'Operational Remarks / Field Notes',
    unitLabel: 'Measurement Unit',
    // Mobile Contractor Field Operations & SLA Management (MOBILE-13)
    contractorsFieldTitle: 'Contractor Operations & SLA',
    contractorsFieldSubtitle: 'Contract Verification, SLA Tracking & Corrective Governance',
    contractsTab: 'Contracts',
    requirementsTab: 'SLA & Requirements',
    contractorVerificationQueueTab: 'Verification Queue',
    totalContractorsCount: 'Registered Vendors',
    activeContractsCount: 'Active Contracts',
    overdueRequirementsCount: 'Overdue SLA Items',
    pendingVerificationsCount: 'Pending Verifications',
    contractorCodeLabel: 'Vendor Code',
    workScopeLabel: 'Scope of Work',
    contractValueLabel: 'Contract Value',
    validityPeriodLabel: 'Validity Window',
    slaStatusLabel: 'SLA Compliance State',
    slaOnTrack: 'On Track',
    slaDueSoon: 'Due Soon',
    slaOverdue: 'SLA Breached / Overdue',
    slaExpired: 'Validity Expired',
    slaCompliant: 'Requirement Verified',
    verifyRequirementBtn: 'Verify Requirement',
    recordIssueBtn: 'Log Contractor Issue',
    verificationModalTitle: 'Field Requirement Verification',
    contractorDisclaimerText: 'Contractor Governance: TRINETRA enforces field SLA compliance and audit chaining. Contractual verification does not substitute statutory mine clearances.',
    offlineContractorSaved: 'Verification saved offline — Queued in trinetra_field_sync_queue.',
    contractDetailTitle: 'Contract Agreement Details',
    requirementDetailTitle: 'Requirement Compliance Spec',
    createCorrectiveTaskLabel: 'Generate Corrective Task (Governance Queue)',
    assigneeRoleLabel: 'Assignee Responsible Role',
    remedialActionPlanLabel: 'Remedial Action Plan',
    // Mobile Grievance Field Operations (MOBILE-14)
    grievancesFieldTitle: 'Grievances & Worker Issues',
    grievancesFieldSubtitle: 'PGRM Redressal, Field Fact-Finding & Resolution Governance',
    allGrievancesTab: 'All Issues',
    myAssignmentsTab: 'Assigned to Me',
    investigationQueueTab: 'Investigations',
    resolvedGrievancesTab: 'Resolved',
    totalGrievancesCount: 'Total Lodged',
    openGrievancesCount: 'Open Issues',
    investigationRequiredCount: 'Action Required',
    overdueGrievancesCount: 'SLA Breached',
    logGrievanceBtn: 'Log Field Grievance',
    acknowledgeGrievanceBtn: 'Acknowledge Receipt',
    assignInvestigatorBtn: 'Assign Investigator',
    recordInvestigationBtn: 'Record Field Findings',
    resolveGrievanceBtn: 'Submit Resolution',
    reopenGrievanceBtn: 'Reopen Grievance',
    grievanceDisclaimerText: 'PGRM Redressal Governance: TRINETRA captures worker and public grievances with audit integrity. Factual recording does not determine legal liability or statutory fault.',
    offlineGrievanceSaved: 'Grievance saved offline — Queued in trinetra_field_sync_queue.',
    grievanceDetailTitle: 'Grievance Dossier',
    complainantTypeLabel: 'Lodged By',
    anonymousComplaint: 'Anonymous Worker / Citizen',
    nodalOfficerLabel: 'PGRM Nodal Officer',
    investigationFindingsLabel: 'Field Investigation Findings',
    actionRequiredLabel: 'Action Required',
    resolutionSummaryLabel: 'Resolution Summary',
    // Mobile Field Intelligence & Predictive Risk Actions (MOBILE-15)
    fieldIntelligenceTitle: 'Field Risk Intelligence',
    fieldIntelligenceSubtitle: 'Forward-looking 30-min operational risk forecasting, contributing signals & field verification',
    activeSignalsTab: 'Active Signals',
    myVerificationsTab: 'My Verifications',
    allPredictionsTab: 'All Signals',
    predictedEscalationRisk: 'Predicted Escalation Risk',
    modelProvenanceLabel: 'Model & Provenance',
    verifyInFieldBtn: 'Verify in Field',
    recordFieldOutcomeTitle: 'Record Field Verification Finding',
    outcomeNoIssue: 'No Issue Observed',
    outcomeIssueFound: 'Issue Found',
    outcomeFurtherReview: 'Requires Further Review',
    createLinkedTaskLabel: 'Generate Remediation Task (Governance Queue)',
    createLinkedIncidentLabel: 'Report Safety Incident Record',
    dataFreshnessLive: 'LIVE TELEMETRY',
    dataFreshnessStale: 'STALE / CACHED CONTEXT',
    dataFreshnessUnavailable: 'PREDICTION UNAVAILABLE',
    simulatedHoldoutNotice: 'SIMULATED DEMO TELEMETRY (Holdout Model Evaluation)',
    pipelineTraceTitle: 'Operational Risk Lifecycle Trace',
    offlineRiskContextSaved: 'Field verification saved locally — Queued in trinetra_field_sync_queue.',
    riskDetailHeader: 'Predictive Risk Signal Dossier',
    activeAlertsLabel: 'Active Risk Alerts',
    horizonMinutesLabel: 'Forecast Horizon',
    escalationProbabilityLabel: 'Escalation Probability',
    normalBaselineLabel: 'Normal Baseline',
    statutoryLimitLabel: 'Statutory Threshold',
    // Cross-Domain Field Command (MOBILE-16)
    fieldCommandTitle: 'Field Command Center',
    fieldCommandSubtitle: 'Unified cross-domain operational intelligence, priority attention & field execution queue',
    myWorkSectionTitle: 'My Assigned Work',
    nearbySectionTitle: 'Nearby Field Hazards & Context',
    quickActionsTitle: 'Quick Field Operations',
    sourcePredictiveModel: 'PREDICTIVE RISK SIGNAL',
    sourceIncidentLog: 'SAFETY INCIDENT',
    sourceTaskQueue: 'GOVERNANCE TASK',
    sourceSupervisorReview: 'SUPERVISOR REVIEW',
    sourceContractorSla: 'CONTRACTOR SLA',
    sourcePgrmGrievance: 'PGRM GRIEVANCE',
    sourceEnvObservation: 'ENVIRONMENTAL RULE',
    sourceStatutoryCompliance: 'STATUTORY COMPLIANCE',
    relatedRecordsTitle: 'Cross-Domain Linked Records',
    unifiedTimelineTitle: 'Cryptographic Audit & Lifecycle Timeline',
    noAttentionItems: 'No urgent high-priority items requiring field escalation.',
    noMyWorkItems: 'No pending tasks or inspections assigned to your queue.',
    noNearbyItems: 'No high-risk entities detected within immediate proximity.',
    verifyRiskBtn: 'Verify in Field',
    reviewItemBtn: 'Review & Sign-Off',
    completeTaskBtn: 'Execute Task',
    investigateGrievanceBtn: 'Investigate',
    viewDetailsBtn: 'View Details',
    lastSyncLabel: 'Last Sync',
    currentShiftLabel: 'Current Shift',
    networkStatusLabel: 'Network',
    staleContextWarning: 'Context updated >15m ago — cached offline data.'
  },
  hi: {
    appName: 'त्रिनेत्र (TRINETRA)',
    appSubtitle: 'खदान प्रशासन एवं सुरक्षा AI',
    navCommand: 'COMMAND',
    navMonitor: 'MONITOR',
    navGovern: 'GOVERN',
    navIntelligence: 'INTELLIGENCE',
    liveDashboard: 'लाइव डैशबोर्ड',
    gisCommandMap: '2D GIS कमांड मानचित्र',
    demoControlCenter: 'डेमो कंट्रोल सेंटर',
    documentIntelligence: 'दस्तावेज़ इंटेलिजेंस एवं OCR',
    aiRiskIntelligence: 'पूर्वानुमानित जोखिम',
    aiCopilot: 'AI कोपायलट',
    fieldOperations: 'फील्ड ऑपरेशन्स',
    integrationsHealth: 'एकीकरण एवं स्वास्थ्य',
    auditIntegrity: 'क्रिप्टोग्राफिक ऑडिट अखंडता',
    circuitBreaker: 'सर्किट ब्रेकर',
    sourceProvenance: 'स्रोत प्रमाणिकता',
    startInspection: 'निरीक्षण शुरू करें',
    reportIncident: 'घटना दर्ज करें',
    recordObservation: 'अवलोकन दर्ज करें',
    captureEvidence: 'साक्ष्य कैप्चर करें',
    syncQueue: 'सिंक कतार',
    syncNow: 'अभी सिंक करें',
    onlineStatus: 'ऑनलाइन',
    offlineStatus: 'ऑफलाइन (स्थानीय कतार सक्रिय)',
    syncingStatus: 'सिंक्रनाइज़ हो रहा है...',
    pendingSyncCount: 'लंबित सिंक्रनाइज़ेशन',
    gpsAccuracy: 'जीपीएस सटीकता',
    sha256Hash: 'SHA-256 साक्ष्य हैश',
    operationalAlerts: 'परिचालन चेतावनियां',
    productionLogs: 'उत्पादन और रिपोर्ट',
    workforceMuster: 'कार्यबल और उपस्थिति',
    contractorsSla: 'ठेकेदार एवं SLA',
    atmosphereEnv: 'पर्यावरण और वायु गुणवत्ता',
    sensorsTelemetry: 'सेंसर एवं टेलीमेट्री',
    minesLevels: 'खदानें एवं सीम स्तर',
    cctvMachinery: 'CCTV एवं भारी मशीनरी',
    safetyIncidents: 'सुरक्षा घटनाएं',
    dgmsViolations: 'DGMS वैधानिक उल्लंघन',
    grievanceRedressal: 'शिकायत निवारण',
    statutoryReports: 'वैधानिक रिपोर्ट',
    digitalSignoffs: 'डिजिटल अनुमोदन',
    spatialTwin: '3D स्थानिक डिजिटल ट्विन',
    riskAuditTrail: 'जोखिम एवं ऑडिट ट्रेल',
    currentRisk: 'वर्तमान परिचालन जोखिम',
    predictedRisk: 'अनुमानित जोखिम (30 मिनट)',
    horizon: 'पूर्वानुमान समय-सीमा',
    probability: 'वृद्धि की संभावना',
    focusIn3D: '3D में देखें',
    viewEvidence: 'साक्ष्य देखें',
    viewTasks: 'प्रशासनिक कार्य देखें',
    viewViolations: 'उल्लंघन देखें',
    viewIncidents: 'घटनाएं देखें',
    askCopilotPlaceholder: 'अपनी अधिकृत खदान से संबंधित सुरक्षा या प्रशासनिक प्रश्न पूछें...',
    sendQuery: 'प्रश्न भेजें',
    clearChat: 'इतिहास साफ करें',
    quickActions: 'त्वरित प्रशासनिक प्रश्न',
    dataProvenance: 'डेटा स्रोत: वास्तविक बैकएंड डेटा | सिम्युलेटेड टेलीमेट्री',
    evidenceSignals: 'सत्यापित साक्ष्य एवं संकेत',
    recommendedAction: 'अनुशंसित वैधानिक आगामी कदम',
    insufficientData: 'विश्वसनीय पूर्वानुमान के लिए अपर्याप्त डेटा।',
    systemNormal: 'सभी पैरामीटर DGMS वैधानिक सीमा में हैं।',
    criticalAlert: 'गंभीर जोखिम चेतावनी',
    warningAlert: 'वैधानिक चेतावनी',
    governanceIntelligence: 'गवर्नेंस इंटेलिजेंस',
    governanceSubtitle: 'क्रॉस-डोमेन परिचालन, अनुपालन एवं भविष्य कहनेवाला विश्लेषण',
    dataAsOfLabel: 'डेटा समय',
    dataTrustLabel: 'डेटा विश्वसनीयता',
    sourceDerivedLabel: 'स्रोत-व्युत्पन्न',
    operationalLabel: 'परिचालन',
    simulatedLabel: 'डेटा मोड: सिम्युलेटेड',
    modelDerivedLabel: 'मॉडल-व्युत्पन्न',
    attentionRequiredLabel: 'ध्यान आवश्यक',
    whatChangedLabel: 'क्या बदला (अवधि तुलना)',
    crossMineViewLabel: 'क्रॉस-माइन तुलना',
    safetyIntelligenceLabel: 'सुरक्षा आसूचना',
    complianceIntelligenceLabel: 'अनुपालन आसूचना',
    productionPerformanceLabel: 'उत्पादन प्रदर्शन',
    environmentalMonitoringLabel: 'पर्यावरण निगरानी',
    predictiveRisk30MinLabel: 'पूर्वानुमानित जोखिम — 30 मिनट',
    noDataLabel: 'डेटा उपलब्ध नहीं',
    viewInGisLabel: 'GIS में देखें',
    viewContractorsLabel: 'ठेकेदार देखें',
    openFieldOperationsLabel: 'फील्ड ऑपरेशन्स खोलें',
    openPgrmWorkflowLabel: 'PGRM वर्कफ़्लो खोलें',
    languageSelect: 'भाषा',
    sensorTelemetryNodes: 'पर्यावरण एवं टेलीमेट्री नोड्स',
    sensorTelemetrySubtitle: 'रीयल-टाइम गैस सांद्रता, वायु वेग, धूल पीएम और स्ट्रैटा भूकंपीय निगरानी।',
    scenarioControlsTitle: 'नियतात्मक सिमुलेशन परिदृश्य नियंत्रण (SIH परीक्षण)',
    scenarioImpactTitle: 'सक्रिय परिदृश्य पाइपलाइन प्रतिक्रिया',
    scenarioImpactSubtitle: 'रीयल-टाइम टेलीमेट्री इंजेक्शन, थ्रेशोल्ड मूल्यांकन और अलर्ट स्थिति',
    normalBaseline: 'सामान्य बेसलाइन',
    methaneSpike: 'मीथेन वृद्धि (स्पाइक)',
    coSurge: 'कार्बन मोनोऑक्साइड गैस वृद्धि',
    ventilationDrop: 'वेंटिलेशन में गिरावट',
    sensorSilence: 'सेंसर मौन / ऑफलाइन',
    multiHazardSpike: 'बहु-खतरा स्पाइक',
    sensorCode: 'सेंसर कोड',
    sensorNameType: 'सेंसर नाम / प्रकार',
    zoneLevel: 'ज़ोन / स्तर',
    liveTelemetry: 'लाइव टेलीमेट्री',
    thresholds: 'सीमाएं (चेतावनी / गंभीर)',
    coords3d: '3D निर्देशांक (x,y,z)',
    status: 'स्थिति',
    history: 'इतिहास',
    centerInTwin: '3D डिजिटल ट्विन में केंद्रित करें',
    viewReadingHistory: 'रीडिंग इतिहास देखें',
    workforceManagement: 'कार्यबल एवं मस्टर रोल प्रबंधन',
    workforceSubtitle: 'वैधानिक फॉर्म E मस्टर रोल, बायोमेट्रिक उपस्थिति और DGMS सुरक्षा प्रमाणपत्र।',
    activeWorkers: 'सक्रिय श्रमिक',
    shiftsToday: 'सक्रिय शिफ्ट',
    attendanceRate: 'उपस्थिति दर',
    certCompliance: 'DGMS प्रमाणन अनुपालन',
    searchWorkers: 'श्रमिक का नाम, टोकन या पद खोजें...',
    allShifts: 'सभी शिफ्ट',
    allMines: 'सभी खदान आवंटन',
    workerName: 'श्रमिक का नाम / टोकन',
    designation: 'पद / भूमिका',
    shift: 'आवंटित शिफ्ट',
    assignedMine: 'आवंटित खदान',
    attendance: 'मस्टर उपस्थिति',
    safetyCert: 'DGMS प्रमाणन स्थिति',
    generateReport: 'वैधानिक रिपोर्ट तैयार करें',
    downloadPdf: 'हस्ताक्षरित PDF डाउनलोड करें',
    viewDetails: 'विवरण देखें',
    exportData: 'डेटा निर्यात करें',
    filterBy: 'फ़िल्टर करें',
    allStatus: 'सभी स्थितियां',
    // Human-Centric Terminology Layer (Hindi)
    liveMonitoring: 'लाइव निगरानी',
    unusualReading: 'असामान्य रीडिंग',
    safetyLimitExceeded: 'सुरक्षा सीमा पार',
    sensorNotReporting: 'सेंसर रिपोर्ट नहीं कर रहा',
    missingMonitoringSignal: 'निगरानी संकेत अनुपस्थित',
    actionRequired: 'कार्रवाई आवश्यक',
    assignedAction: 'आवंटित कार्रवाई',
    forecastedRisk: 'पूर्वानुमानित जोखिम',
    syncFieldRecords: 'फील्ड रिकॉर्ड सिंक करें',
    externalSignal: 'बाहरी संकेत',
    riskAssessment: 'जोखिम मूल्यांकन',
    nearbyInformation: 'आस-पास की जानकारी',
    sourceAndEvidence: 'स्रोत एवं साक्ष्य',
    fromSourceDocument: 'स्रोत दस्तावेज़ से',
    demonstrationData: 'प्रदर्शन डेटा (डेमो)',
    aiModelForecast: 'AI/मॉडल पूर्वानुमान',
    viewTechnicalDetails: 'तकनीकी विवरण देखें',
    hideTechnicalDetails: 'तकनीकी विवरण छिपाएं',
    todaysFieldInspections: 'आज के फील्ड निरीक्षण',
    recordAttendance: 'उपस्थिति दर्ज करें',
    saveAttendance: 'उपस्थिति सहेजें',
    cancel: 'रद्द करें',
    selectWorker: 'श्रमिक चुनें',
    currentCondition: 'वर्तमान स्थिति',
    whatItMeans: 'इसका क्या अर्थ है',
    whyTitle: 'मुख्य योगदान कारक (कारण)',
    decisionSupportDisclaimer: 'केवल निर्णय समर्थन: वैधानिक या परिचालन कार्रवाई से पहले मानव सत्यापन आवश्यक है।',
    // Mobile Foundation (MOBILE-01 - Hindi)
    trinetraField: 'त्रिनेत्र फील्ड',
    fieldIntelligence: 'फील्ड इंटेलिजेंस',
    fieldMotto: 'निरीक्षण करें। सत्यापित करें। दर्ज करें। कार्रवाई करें।',
    mobileHome: 'होम',
    mobileTasks: 'कार्य',
    mobileMap: 'मानचित्र',
    mobileCopilot: 'को-पायलट',
    mobileMore: 'अधिक',
    assignedTasks: 'आवंटित कार्य',
    highPriority: 'उच्च प्राथमिकता',
    pendingSync: 'लंबित सिंक',
    todayOverview: 'आज का विवरण',
    myTasks: 'मेरे कार्य',
    conductInspection: 'निरीक्षण शुरू करें',
    fieldObservation: 'फील्ड अवलोकन',
    safetyAudit: 'सुरक्षा ऑडिट',
    statutoryAudit: 'वैधानिक ऑडिट',
    activeViolations: 'सक्रिय उल्लंघन',
    riskHeatmap: 'जोखिम हीटमैप',
    shiftApprovals: 'शिफ्ट स्वीकृतियां',
    incidentLog: 'घटना लॉग',
    complianceEvidence: 'अनुपालन साक्ष्य',
    officialReports: 'आधिकारिक रिपोर्ट',
    noTasksAssigned: 'वर्तमान में आपको कोई फील्ड कार्य आवंटित नहीं है।',
    noMinesAssigned: 'इस खाते के लिए कोई अधिकृत खदान नहीं मिली।',
    sessionExpired: 'सत्र समाप्त हो गया',
    sessionExpiredDesc: 'आपका त्रिनेत्र सत्र समाप्त हो गया है। कृपया पुनः साइन इन करें।',
    signInAgain: 'पुनः साइन इन करें',
    serverError: 'सर्वर त्रुटि',
    serverErrorDesc: 'त्रिनेत्र सर्वर से कनेक्ट नहीं हो सका।',
    networkOnlineNotice: 'त्रिनेत्र कोर से जुड़ा हुआ। रीयल-टाइम सिंक सक्रिय है।',
    networkOfflineNotice: 'आप ऑफ़लाइन हैं। कार्य स्थानीय रूप से सहेजा जाएगा।',
    networkSyncingNotice: 'फील्ड रिकॉर्ड्स को त्रिनेत्र कोर के साथ सिंक किया जा रहा है...',
    networkSyncCompleteNotice: 'सभी फील्ड संचालन सफलतापूर्वक सिंक हो गए हैं।',
    networkSyncErrorNotice: 'सिंक में त्रुटि। स्वतः पुनः प्रयास के लिए कतारबद्ध।',
    authorizedMines: 'अधिकृत खदानें',
    switchMine: 'खदान बदलें',
    selectMinePrompt: 'एक अधिकृत परिचालन खदान चुनें:',
    profileAndRole: 'प्रोफ़ाइल एवं भूमिका',
    languageSelection: 'भाषा',
    systemDiagnostics: 'डायग्नोस्टिक्स एवं सिंक',
    signOutButton: 'साइन आउट',
    phaseFoundationNotice: 'मोबाइल फाउंडेशन शेल सक्रिय (फेज 1)। परिचालन इंजन बाद के चरणों में सक्रिय होंगे।',
    // Mobile Field Execution (MOBILE-02 - Hindi)
    taskDetailsTitle: 'कार्य विवरण',
    dueTimeLabel: 'नियत समय',
    assignedByLabel: 'द्वारा आवंटित',
    reasonContextLabel: 'कारण एवं संदर्भ',
    predictiveRiskHotspotLabel: 'पूर्वानुमानित जोखिम हॉटस्पॉट',
    contributingSignalsLabel: 'योगदान देने वाले संकेत',
    startInspectionBtn: 'निरीक्षण शुरू करें',
    openTaskBtn: 'कार्य खोलें',
    inspectionTitle: 'फील्ड निरीक्षण',
    checksCompletedLabel: 'जांच पूर्ण',
    checkItemCompliant: 'अनुपालन',
    checkItemObservation: 'अवलोकन',
    checkItemNonCompliant: 'गैर-अनुपालन',
    checkItemNotApplicable: 'लागू नहीं',
    addObservationNote: 'अवलोकन नोट जोड़ें',
    observationSeverityLabel: 'गंभीरता',
    recommendationLabel: 'सिफारिश',
    statuteReferenceLabel: 'वैधानिक संदर्भ',
    humanVerificationNotice: 'मानव सत्यापन आवश्यक: फील्ड अवलोकन स्वतः कानूनी उल्लंघन स्थापित नहीं करते हैं।',
    potentialNonComplianceNotice: 'पर्यवेक्षी सत्यापन के लिए संभावित गैर-अनुपालन दर्ज किया गया।',
    attachedEvidenceTitle: 'संलग्न साक्ष्य',
    browserCameraLabel: 'ब्राउज़र कैमरा / फ़ाइल',
    takePhotoBtn: 'फोटो लें',
    documentUploadBtn: 'फ़ाइल संलग्न करें',
    hashVerifiedLabel: 'SHA-256 हैशेड',
    captureLocationLabel: 'स्थान कैप्चर करें',
    gpsAvailableLabel: 'वास्तविक GPS फिक्स',
    locationSimulatedLabel: 'सर्वेक्षित खदान निर्देशांक',
    datumWgs84Label: 'डेटम: WGS84',
    inspectionReviewTitle: 'निरीक्षण समीक्षा',
    saveDraftBtn: 'ड्राफ्ट सहेजें',
    submitInspectionBtn: 'निरीक्षण सबमिट करें',
    inspectionSubmittedSuccess: 'निरीक्षण सफलतापूर्वक सबमिट किया गया',
    auditRecordedConfirmed: 'ऑडिट: रिकॉर्ड किया गया',
    savedOfflineNotice: 'ऑफ़लाइन सहेजा गया — नेटवर्क वापस आने पर कार्य सिंक हो जाएगा।',
    validationErrorIncomplete: 'अपूर्ण निरीक्षण जांच शेष हैं।',
    validationErrorNotesRequired: 'कृपया गैर-अनुपालन वस्तुओं के लिए नोट और गंभीरता प्रदान करें।',
    backToTaskListBtn: 'कार्य सूची पर वापस जाएं',
    viewInspectionBtn: 'निरीक्षण देखें',
    readyToSubmitStatus: 'सबमिट करने के लिए तैयार',
    evidenceItemsCount: 'साक्ष्य वस्तुएं',
    // Mobile Field Evidence & GPS (MOBILE-03 - Hindi)
    capturePhoto: '+ फोटो कैप्चर करें',
    chooseFile: '+ फ़ाइल चुनें',
    addNoteEvidence: '+ नोट जोड़ें',
    evidencePreviewTitle: 'साक्ष्य पूर्वावलोकन',
    retakePhoto: 'पुनः फोटो लें',
    usePhoto: 'फोटो का उपयोग करें',
    removeEvidence: 'हटाएं',
    evidenceNotePlaceholder: 'लिखित अवलोकन या नोट का विवरण दर्ज करें...',
    linkObservationLabel: 'संबंधित अवलोकन / जांच',
    locationQualityGood: 'उत्कृष्ट (उच्च परिशुद्धता)',
    locationQualityFair: 'मध्यम (संतोषजनक परिशुद्धता)',
    locationQualityLow: 'कम परिशुद्धता',
    refreshLocationBtn: 'स्थान रिफ्रेश करें',
    locatingStatus: 'GPS स्थान खोजा जा रहा है...',
    evidenceFingerprintCreated: 'SHA-256 अखंडता फिंगरप्रिंट तैयार किया गया',
    sha256Explanation: 'SHA-256 त्रिनेत्र द्वारा संसाधित साक्ष्य फ़ाइल के अखंडता फिंगरप्रिंट को रिकॉर्ड करता है।',
    technicalDetailsTitle: 'तकनीकी विवरण',
    hideTechnicalDetailsTitle: 'तकनीकी विवरण छिपाएं',
    syncStatusLocal: 'स्थानीय रूप से सहेजा गया',
    syncStatusQueued: 'सिंक के लिए कतारबद्ध',
    syncStatusSyncing: 'सर्वर के साथ सिंक हो रहा है...',
    syncStatusSynced: 'सिंक्रनाइज़्ड',
    syncStatusFailed: 'अपलोड विफल',
    retrySyncBtn: 'पुनः अपलोड करें',
    verifyEvidenceBtn: 'साक्ष्य सत्यापित करें',
    rejectEvidenceBtn: 'साक्ष्य अस्वीकार करें',
    verificationNotesPrompt: 'पर्यवेक्षक सत्यापन नोट्स',
    verifiedBadge: 'सत्यापित',
    rejectedBadge: 'अस्वीकृत',
    pendingVerificationBadge: 'समीक्षा लंबित',
    // Mobile Field Map & Spatial Intelligence (MOBILE-04)
    fieldMapTitle: 'फील्ड मानचित्र',
    spatialOrientation: 'स्थानिक फील्ड अभिविन्यास',
    myLocation: 'मेरा स्थान',
    nearbyIntelligence: 'निकटवर्ती खुफिया जानकारी',
    openTasksCount: 'खुले कार्य',
    highCriticalRisk: 'उच्च/गंभीर जोखिम',
    openIncidents: 'खुली घटनाएं',
    sensorAnomalies: 'सेंसर विसंगतियां',
    nearMeFilter: 'मेरे पास',
    allMineFilter: 'पूरी खदान',
    layerMineBoundary: 'खदान सीमा',
    layerMyLocation: 'मेरा स्थान',
    layerTasks: 'कार्य',
    layerRisk: 'जोखिम हॉटस्पॉट',
    layerSensors: 'सेंसर',
    layerIncidents: 'घटनाएं',
    currentRiskLabel: 'वर्तमान जोखिम',
    predictedRiskLabel: 'पूर्वानुमानित जोखिम',
    predictedEscalation: 'पूर्वानुमानित वृद्धि',
    withinHorizon: '30 मिनट के भीतर',
    inspectAction: 'निरीक्षण करें',
    openTaskAction: 'कार्य खोलें',
    viewSensorAction: 'सेंसर देखें',
    openIncidentAction: 'घटना खोलें',
    askCopilotAction: 'कोपायलट से पूछें',
    viewIn3dAction: '3D में देखें',
    gpsActiveStatus: 'GPS सक्रिय',
    gpsLowAccuracyStatus: 'GPS कम सटीकता',
    gpsUnavailableStatus: 'GPS अनुपलब्ध',
    surveyedReferenceStatus: 'सर्वेक्षित संदर्भ',
    gpsUnavailableMineContext: 'GPS अनुपलब्ध — खदान संदर्भ दिखाया जा रहा है।',
    mapDataUnavailable: 'मानचित्र डेटा अनुपलब्ध',
    mapDataUnavailableOffline: 'ऑफ़लाइन मानचित्र डेटा अनुपलब्ध',
    staleDataNotice: 'ऑफ़लाइन — डेटा पुराना हो सकता है',
    lastUpdatedLabel: 'अंतिम अद्यतन',
    updateTimeUnavailable: 'अद्यतन समय अनुपलब्ध',
    sourceDerivedBadge: 'स्रोत-प्राप्त',
    actualGpsBadge: 'वास्तविक GPS',
    simulatedDemoBadge: 'सिम्युलेटेड डेमो',
    basemapSatellite: 'सैटेलाइट',
    basemapTerrain: 'टेरेन',
    viewOnMap: 'मानचित्र पर देखें',
    // Mobile Field Intelligence + Incident Response (MOBILE-05)
    fieldResponse: 'फील्ड प्रतिक्रिया',
    incidentResponseWorkflow: 'घटना प्रतिक्रिया कार्यप्रवाह',
    activeIncidents: 'सक्रिय घटनाएं',
    correctiveActions: 'सुधारात्मक कार्रवाइयां',
    fieldResponseTitle: 'फील्ड प्रतिक्रिया',
    fieldIncidentResponse: 'घटना प्रतिक्रिया एवं शमन',
    startFieldResponseBtn: 'प्रतिक्रिया शुरू करें',
    incidentDetailsTitle: 'घटना का विवरण',
    incidentLifecycleStatus: 'जीवनचक्र स्थिति',
    recordObservationBtn: 'अवलोकन दर्ज करें',
    createCorrectiveActionBtn: 'सुधारात्मक कार्रवाई बनाएं',
    assignCorrectiveAction: 'कार्रवाई सौंपें',
    correctiveActionTitle: 'सुधारात्मक कार्रवाई',
    correctiveActionPriority: 'कार्रवाई प्राथमिकता',
    correctiveActionDueDate: 'सुधार की अंतिम तिथि',
    slaDueIn: 'शेष समय',
    slaOverdueBy: 'विलंबित समय',
    slaUnavailable: 'SLA समय सीमा उपलब्ध नहीं',
    resolveIncidentBtn: 'समाधान के रूप में चिह्नित करें',
    verifyIncidentBtn: 'समाधान सत्यापित करें',
    rejectIncidentBtn: 'प्रतिक्रिया अस्वीकार करें',
    closeIncidentBtn: 'घटना बंद करें',
    rejectionReasonPrompt: 'अस्वीकृति का कारण दर्ज करें',
    responseChecklistTitle: 'प्रतिक्रिया गुणवत्ता चेकलिस्ट',
    responseTimelineTitle: 'घटना प्रतिक्रिया समयरेखा',
    responseReviewTitle: 'फील्ड प्रतिक्रिया समीक्षा',
    incidentTriageBtn: 'घटना का वर्गीकरण करें',
    incidentAssignBtn: 'जांचकर्ता नियुक्त करें',
    quickObservationType: 'अवलोकन श्रेणी',
    quickObservationSeverity: 'अवलोकित गंभीरता',
    quickObservationNotes: 'अवलोकन विवरण',
    observationSavedSuccess: 'फील्ड अवलोकन दर्ज किया गया और ऑडिट के लिए कतारबद्ध है।',
    correctiveActionCreatedSuccess: 'सुधारात्मक कार्रवाई सौंपी गई और ट्रैक की जा रही है।',
    incidentResolvedSuccess: 'घटना हल हो गई। पर्यवेक्षक सत्यापन लंबित है।',
    incidentVerifiedSuccess: 'घटना समाधान सत्यापित और ऑडिट लेज़र में दर्ज किया गया।',
    incidentRejectedNotice: 'प्रतिक्रिया अस्वीकार की गई। घटना जांच में वापस भेजी गई।',
    overdueActionsCount: 'विलंबित कार्रवाइयां',
    pendingVerificationCount: 'लंबित सत्यापन',
    highCriticalOpenIncidents: 'उच्च/गंभीर खुली घटनाएं',
    // Mobile Field Tasks, Work Queue & Shift Operations (MOBILE-06)
    myWork: 'मेरा कार्य',
    workQueue: 'कार्य कतार',
    openWorkQueue: 'कार्य कतार खोलें',
    currentShift: 'वर्तमान शिफ्ट',
    shiftSummary: 'शिफ्ट सारांश',
    activeShift: 'सक्रिय शिफ्ट',
    noActiveShift: 'कोई सक्रिय शिफ्ट नहीं',
    attendanceStatus: 'उपस्थिति',
    taskDetails: 'कार्य विवरण',
    taskReview: 'कार्य पूर्णता समीक्षा',
    startTask: 'कार्य शुरू करें',
    completeTask: 'कार्य पूर्ण करें',
    taskCompletedSuccess: 'कार्य पूर्ण के रूप में चिह्नित किया गया।',
    noAssignedTasks: 'कोई सौंपा गया कार्य नहीं',
    noAssignedTasksDesc: 'आप अभी के लिए मुक्त हैं।',
    noOverdueTasks: 'कोई बकाया कार्य नहीं',
    noPendingVerification: 'कोई लंबित सत्यापन नहीं',
    dueToday: 'आज देय',
    overdue: 'अतिदेय',
    inProgress: 'प्रगति पर है',
    completed: 'पूर्ण',
    pendingVerification: 'लंबित सत्यापन',
    allTasks: 'सभी कार्य',
    taskPriority: 'प्राथमिकता',
    taskDomain: 'डोमेन',
    assignedTo: 'सौंपा गया',
    slaInformationUnavailable: 'SLA जानकारी उपलब्ध नहीं है',
    locationNotAvailable: 'स्थान उपलब्ध नहीं है',
    workQueueMayBeStale: 'कार्य कतार पुरानी हो सकती है',
    requiredInfoMissing: 'आवश्यक जानकारी गायब है',
    conflictReviewRequired: 'विवाद — समीक्षा आवश्यक है',
    loadingWorkQueue: 'कार्य कतार लोड हो रही है...',
    verificationQueue: 'सत्यापन कतार',
    // Mobile Field Communications & Actionable Notifications (MOBILE-07)
    notifications: 'सूचनाएं',
    notificationsCenterTitle: 'फ़ील्ड सूचनाएं एवं संचार',
    attentionSectionTitle: 'परिचालन ध्यान',
    allNotificationsTab: 'सभी',
    unreadTab: 'अपठित',
    criticalTab: 'गंभीर',
    tasksTab: 'कार्य',
    incidentsTab: 'घटनाएं',
    riskTab: 'जोखिम',
    verificationTab: 'सत्यापन',
    markReadBtn: 'पढ़ा हुआ चिह्नित करें',
    markAllReadBtn: 'सभी को पढ़ा हुआ चिह्नित करें',
    allNotificationsRead: 'सभी सूचनाएं पढ़ी गईं',
    viewAllNotifications: 'सभी सूचनाएं देखें',
    noNotifications: 'वर्तमान दायरे में कोई सूचना उपलब्ध नहीं है।',
    noUnreadNotifications: 'कोई अपठित सूचना नहीं है।',
    notificationsMayBeStale: 'ऑफलाइन: सूचनाएं पुरानी हो सकती हैं',
    staleResourceNotice: 'यह संसाधन अब सक्रिय नहीं है या पहले ही हल हो चुका है।',
    viewWorkQueueBtn: 'कार्य कतार देखें',
    openIncidentBtn: 'घटना खोलें',
    viewRiskBtn: 'जोखिम देखें',
    reviewVerificationBtn: 'सत्यापन की समीक्षा करें',
    askCopilotBtn: 'कोपायलट से पूछें',
    loadingNotifications: 'सूचनाएं एवं अलर्ट लोड हो रहे हैं...',
    // Mobile Offline Resilience & Sync Center (MOBILE-08)
    syncCenterTitle: 'सिंक केंद्र एवं ऑफलाइन लचीलापन',
    savedLocally: 'स्थानीय रूप से सहेजा गया',
    queuedForSync: 'सिंक के लिए कतारबद्ध',
    syncingStatusText: 'सिंक हो रहा है...',
    serverAcknowledged: 'सर्वर द्वारा स्वीकृत',
    auditRecorded: 'ऑडिट दर्ज किया गया',
    syncFailedText: 'विफल',
    syncConflictText: 'विवाद',
    lastSuccessfulServerSync: 'अंतिम सफल सर्वर सिंक',
    noServerSyncRecorded: 'कोई सफल सर्वर सिंक्रोनाइज़ेशन दर्ज नहीं हुआ',
    syncNowBtn: 'अभी सिंक करें',
    retrySafeAllBtn: 'सभी सुरक्षित पुनः प्रयास करें',
    retryOpBtn: 'पुनः प्रयास',
    clearSyncedBtn: 'स्वीकृत रिकॉर्ड हटाएं',
    mayBeStaleNotice: 'ऑफलाइन होने पर पुराना हो सकता है',
    reviewConflictBtn: 'विवाद की समीक्षा करें',
    deviceOnlineStatus: 'डिवाइस ऑनलाइन',
    serverReachableStatus: 'सर्वर पहुंच योग्य',
    serverUnreachableStatus: 'सर्वर अनुपलब्ध',
    localDraftsCount: 'स्थानीय ड्राफ्ट',
    pendingOperationsCount: 'लंबित कार्यवाहियां',
    storageUsageTitle: 'ऑफलाइन स्टोरेज उपयोग',
    gisFreshnessTitle: 'GIS स्थानिक ताजगी',
    notificationsFreshnessTitle: 'सूचनाओं की ताजगी',
    safeToRetryLabel: 'पुनः प्रयास हेतु सुरक्षित',
    unsafeToRetryLabel: 'असुरक्षित / सत्यापन विवाद',
    conflictResolutionModalTitle: 'सिंक विवाद समाधान',
    localVersionLabel: 'स्थानीय संस्करण',
    serverVersionLabel: 'सर्वर संस्करण',
    keepLocalBtn: 'स्थानीय रखें और पुनः प्रयास करें',
    acceptServerBtn: 'सर्वर स्थिति स्वीकार करें',
    noPendingOperationsMsg: 'कोई लंबित ऑफलाइन कार्रवाई नहीं है। सभी रिकॉर्ड सिंक्रनाइज़ हैं।',
    // Mobile Supervisor Review & Digital Sign-Off (MOBILE-09)
    reviewCenterTitle: 'समीक्षा एवं डिजिटल हस्ताक्षर केंद्र',
    reviewCenterSubtitle: 'पर्यवेक्षी सत्यापन, कर्तव्यों का पृथक्करण और डिजिटल हस्ताक्षर',
    pendingReviewTab: 'समीक्षा लंबित',
    urgentReviewsTab: 'अति आवश्यक',
    overdueReviewsTab: 'समयसीमा समाप्त',
    returnedReviewsTab: 'सुधार हेतु वापस',
    approvedReviewsTab: 'स्वीकृत',
    rejectedReviewsTab: 'अस्वीकृत',
    allReviewsTab: 'सभी',
    reviewActionBtn: 'समीक्षा व निर्णय',
    approveAndSignOffBtn: 'स्वीकृत करें और हस्ताक्षर करें',
    returnForCorrectionBtn: 'सुधार हेतु वापस भेजें',
    rejectReviewBtn: 'अस्वीकार करें',
    confirmApprovalTitle: 'डिजिटल हस्ताक्षर की पुष्टि करें',
    confirmApprovalNotice: 'आगे बढ़ने पर, एक सत्यापन योग्य डिजिटल हस्ताक्षर और सर्वर ऑडिट ट्रेल स्थायी रूप से दर्ज होगा।',
    sodBlockedWarning: 'कर्तव्यों का पृथक्करण: आप अपनी स्वयं की प्रविष्टि को स्वीकृत नहीं कर सकते।',
    mandatoryRejectionReasonPrompt: 'अनिवार्य अस्वीकृति कारण',
    rejectionReasonPlaceholder: 'अस्वीकृति के लिए विशिष्ट वैधानिक या परिचालन कारण दर्ज करें...',
    returnReasonPrompt: 'वापसी और सुधार का कारण',
    returnReasonPlaceholder: 'स्पष्ट करें कि कौन से साक्ष्य या डेटा को ठीक या जोड़ा जाना चाहिए...',
    resubmitReviewBtn: 'कार्य पुनः प्रस्तुत करें',
    resubmitNotesPrompt: 'संशोधन एवं सुधार विवरण',
    resubmitNotesPlaceholder: 'किए गए परिवर्तनों और संलग्न साक्ष्यों का विवरण दें...',
    digitalSignOffRecorded: 'डिजिटल हस्ताक्षर दर्ज किया गया',
    serverAuditChained: 'सर्वर ऑडिट ट्रेल दर्ज',
    evidenceSha256Fingerprint: 'SHA-256 छेड़छाड़-रोधी फ़िंगरप्रिंट',
    surveyedMineLocation: 'सर्वेक्षित खदान निर्देशांक',
    actualGpsLocation: 'सजीव वास्तविक जीपीएस निर्देशांक',
    auditTimelineTitle: 'ऑडिट और समीक्षा समयरेखा',
    dgmsChecklistReview: 'डीजीएमएस वैधानिक अवलोकन और चेकलिस्ट',
    noReviewsFound: 'चयनित मानदंडों से मेल खाने वाला कोई समीक्षा आइटम नहीं मिला।',
    loadingReviewDetails: 'समीक्षा संदर्भ और साक्ष्य लोड हो रहे हैं...',
    reviewDecisionSuccess: 'समीक्षा निर्णय सफलतापूर्वक दर्ज किया गया।',
    resourceDetailsTitle: 'संसाधन पहचान और दायरा',
    submitterInfoTitle: 'प्रस्तुतकर्ता और निरीक्षक विवरण',
    observationsNotesTitle: 'क्षेत्रीय अवलोकन एवं डीजीएमएस निष्कर्ष',
    evidenceGalleryTitle: 'क्रिप्टोग्राफिक साक्ष्य गैलरी',
    relatedGovernanceTitle: 'संबद्ध शासन और जोखिम संदर्भ',
    fieldDocuments: 'फील्ड दस्तावेज़ एवं वैधानिक अभिलेख',
    documentsSubtitle: 'प्रामाणिक डीजीएमएस विनियम, खदान डोजियर एवं फील्ड रिकॉर्ड्स',
    statutoryTab: 'वैधानिक अधिनियम',
    mineOperationalTab: 'खदान परिचालन',
    ocrVerifiedTab: 'ओसीआर सत्यापित',
    pendingVerificationTab: 'समीक्षा लंबित',
    searchDocumentsPlaceholder: 'विनियम, परिपत्र, अधिनियम, चालान या रिकॉर्ड खोजें...',
    openDocumentBtn: 'दस्तावेज़ खोलें',
    viewRequirementBtn: 'अनिवार्यता देखें',
    statutoryRequirementTitle: 'वैधानिक अनुपालन अनिवार्यता',
    verbatimStatutoryText: 'मूल वैधानिक नियम उद्धरण',
    sourceProvenanceTitle: 'स्रोत प्रमाणिकता एवं क्रिप्टोग्राफिक फ़िंगरप्रिंट',
    sourceTier: 'स्रोत स्तर',
    issuingOrganization: 'जारीकर्ता संगठन',
    effectiveDate: 'प्रभावी तिथि',
    statutoryRef: 'वैधानिक संदर्भ',
    textNativeExtraction: 'टेक्स्ट-नेटिव स्ट्रीम',
    ocrExtraction: 'ओसीआर एक्सट्रैक्टेड स्ट्रीम',
    humanVerifiedBadge: 'अधिकारी द्वारा सत्यापित',
    humanReviewRequiredBadge: 'मानव समीक्षा आवश्यक',
    staleDocumentNotice: 'पुराना स्रोत (ऑफ़लाइन कैश > 7 दिन)',
    offlineAvailableNotice: 'ऑफ़लाइन उपलब्ध',
    connectionRequiredNotice: 'पूर्ण स्ट्रीम हेतु कनेक्शन आवश्यक',
    searchInsideDocPlaceholder: 'दस्तावेज़ में कीवर्ड खोजें...',
    noDocumentsFound: 'चयनित मानदंडों से मेल खाने वाला कोई दस्तावेज़ नहीं मिला।',
    loadingDocumentDetails: 'दस्तावेज़ स्ट्रीम एवं स्रोत विवरण लोड हो रहे हैं...',
    pageNavigation: 'पृष्ठ',
    ofWord: 'का',
    nextPage: 'अगला पृष्ठ',
    prevPage: 'पिछला पृष्ठ',
    copySha256Fingerprint: 'SHA-256 फ़िंगरप्रिंट कॉपी करें',
    hashCopiedTooltip: 'SHA-256 हैश क्लिपबोर्ड पर कॉपी किया गया!',
    verifiedByOfficer: 'मानव अधिकारी द्वारा सत्यापित',
    documentFieldsTitle: 'निकाले गए परिचालन फ़ील्ड',
    // Mobile Workforce, Attendance & Shift Handover (MOBILE-11)
    mobileWorkforceTitle: 'कार्यबल एवं शिफ्ट हैंडओवर',
    mobileWorkforceSubtitle: 'वैधानिक उपस्थिति रजिस्टर, शिफ्ट आवंटन और डिजिटल हैंडओवर रिकॉर्ड्स।',
    currentShiftTitle: 'वर्तमान परिचालन शिफ्ट',
    activeShiftWindow: 'कॉन्फ़िगर की गई शिफ्ट समय-सीमा',
    totalAssignedWorkers: 'आवंटित श्रमिक',
    presentWorkers: 'उपस्थित',
    absentWorkers: 'अनुपस्थित',
    onLeaveWorkers: 'छुट्टी पर',
    pendingAttendance: 'लंबित',
    offDutyWorkers: 'ड्यूटी समाप्त',
    markPresent: 'उपस्थित चिह्नित करें',
    markAbsent: 'अनुपस्थित चिह्नित करें',
    markLeave: 'छुट्टी चिह्नित करें',
    markOffDuty: 'ऑफ ड्यूटी चिह्नित करें',
    recordAttendanceBtn: 'उपस्थिति दर्ज करें',
    correctAttendanceBtn: 'स्थिति संशोधित करें',
    attendanceCorrectionTitle: 'उपस्थिति संशोधन',
    correctionReasonLabel: 'अनिवार्य संशोधन कारण',
    correctionReasonPlaceholder: 'मस्टर रोल संशोधन के लिए आधिकारिक कारण दर्ज करें...',
    manualAttendanceBadge: 'मैन्युअल प्रविष्टि',
    deviceLocationContext: 'डिवाइस संदर्भ',
    shiftHandoverTab: 'शिफ्ट हैंडओवर',
    rosterTab: 'श्रमिक रजिस्टर',
    openHandoverItems: 'लंबित हैंडओवर बिंदु',
    createHandoverBtn: 'शिफ्ट हैंडओवर बनाएं',
    acknowledgeHandoverBtn: 'हैंडओवर स्वीकार करें',
    handoverAcknowledgedBadge: 'हैंडओवर स्वीकृत',
    handoverSubmittedBadge: 'हैंडओवर प्रस्तुत',
    handoverNotesPlaceholder: 'शिफ्ट परिचालन सारांश, चालू बेंच कार्य या उपकरण विवरण दर्ज करें...',
    safetyNotesPlaceholder: 'सुरक्षा अवलोकन, वेंटिलेशन स्थिति या पर्यावरणीय अलर्ट दर्ज करें...',
    outgoingShift: 'निवर्तमान शिफ्ट',
    incomingShift: 'आगामी शिफ्ट',
    overdueTasks: 'अतिदेय कार्य',
    pendingInspections: 'लंबित निरीक्षण',
    criticalAlerts: 'गंभीर अलर्ट',
    environmentalObs: 'पर्यावरणीय नोट्स',
    dataPrivacyNotice: 'गोपनीयता सुरक्षित: व्यक्तिगत फोन, बैंक खाता और आधार विवरण हटा दिए गए हैं।',
    noBiometricDisclaimer: 'वैधानिक शासन रिकॉर्ड: उपस्थिति अधिकृत पर्यवेक्षक द्वारा मैन्युअल रूप से दर्ज की जाती है। डिवाइस निर्देशांक केवल प्रासंगिक संदर्भ के रूप में सहेजे जाते हैं।',
    offlineAttendanceSaved: 'उपस्थिति स्थानीय रूप से सहेजी गई — सर्वर पावती लंबित।',
    offlineHandoverSaved: 'शिफ्ट हैंडओवर स्थानीय रूप से सहेजा गया — सर्वर पावती लंबित।',
    // Mobile Field Reporting (MOBILE-12)
    fieldReportingTitle: 'फील्ड रिपोर्टिंग',
    fieldReportingSubtitle: 'उत्पादन, पर्यावरण एवं वैधानिक अनुपालन अवलोकन कैप्चर',
    productionReportTab: 'उत्पादन',
    environmentObservationTab: 'पर्यावरण',
    complianceObservationTab: 'अनुपालन',
    plannedQuantityLabel: 'नियोजित मात्रा',
    actualQuantityLabel: 'वास्तविक दर्ज मात्रा',
    varianceLabel: 'अंतर (Variance)',
    coalGradeLabel: 'कोयला ग्रेड / गुणवत्ता',
    materialTypeLabel: 'सामग्री का प्रकार',
    provenanceLabel: 'डेटा स्रोत / प्रमाणिकता',
    provenanceManual: 'मैन्युअल प्रविष्टि',
    provenanceSensor: 'सेंसर आधारित',
    provenanceImported: 'बाहरी आयातित',
    provenanceSimulated: 'सिम्युलेटेड डेमो',
    locationSourceLabel: 'स्थान संदर्भ',
    locationActualGps: 'वास्तविक जीपीएस',
    locationSurveyed: 'सर्वेक्षित खदान निर्देशांक',
    statutoryRuleLabel: 'वैधानिक नियम संदर्भ',
    thresholdLimitLabel: 'कॉन्फ़िगर की गई सीमा',
    observedValueLabel: 'प्रेक्षित मान (माप)',
    noConfiguredRuleNotice: 'इस पैरामीटर के लिए कोई वैधानिक सीमा नियम कॉन्फ़िगर नहीं है।',
    thresholdExceededNotice: 'सीमा पार हो गई — पर्यवेक्षक समीक्षा आवश्यक।',
    thresholdWithinLimitNotice: 'कॉन्फ़िगर की गई पर्यावरणीय सुरक्षा सीमा के भीतर।',
    cmrRegulationLabel: 'DGMS / CMR 2017 नियम',
    violationTitleLabel: 'अवलोकन / गैर-अनुपालन शीर्षक',
    violationDescriptionLabel: 'विस्तृत अवलोकन विवरण',
    correctiveActionLabel: 'प्रस्तावित सुधारात्मक कार्रवाई',
    remedialDeadlineLabel: 'समाधान लक्ष्य तिथि',
    statutoryDisclaimerText: 'वैधानिक शासन: त्रिनेत्र स्रोत प्रमाणिकता के साथ फील्ड उल्लंघनों को रिकॉर्ड करता है। कानूनी निर्णयों के लिए अधिकृत अधिकारी ही मान्य हैं।',
    environmentalDisclaimerText: 'परिचालन पर्यावरण लॉग: सेंसर एवं मैन्युअल रीडिंग प्रासंगिक हैं और NABL प्रयोगशाला सत्यापन के बिना वैधानिक मंजूरी के लिए प्रमाणित नहीं हैं।',
    productionDisclaimerText: 'खदान प्रेषण एवं उत्पादन रिकॉर्ड: डिजिटल साइन-ऑफ और ऑडिट चेनिंग के लिए रिपोर्ट खान प्रबंधक को भेजी जाती है।',
    savedOfflinePendingSync: 'स्थानीय रूप से सहेजा गया — सर्वर सिंक्रनाइज़ेशन लंबित।',
    submitForSupervisorReview: 'पर्यवेक्षक समीक्षा और साइन-ऑफ के लिए भेजें',
    reportingSummaryTitle: 'शिफ्ट रिपोर्टिंग स्थिति',
    reportsSubmittedCount: 'उत्पादन रिपोर्टें',
    activeObservationsCount: 'सक्रिय अवलोकन',
    openViolationsCount: 'खुले गैर-अनुपालन',
    recordProductionBtn: 'उत्पादन लॉग दर्ज करें',
    recordEnvObservationBtn: 'पर्यावरणीय माप दर्ज करें',
    recordViolationBtn: 'अनुपालन अवलोकन दर्ज करें',
    evidenceAttachmentTitle: 'संलग्न फोटोग्राफिक / फील्ड साक्ष्य',
    notesRemarksLabel: 'परिचालन टिप्पणियां / फील्ड नोट्स',
    unitLabel: 'माप इकाई',
    // Mobile Contractor Field Operations & SLA Management (MOBILE-13)
    contractorsFieldTitle: 'ठेकेदार संचालन एवं SLA',
    contractorsFieldSubtitle: 'अनुबंध सत्यापन, SLA ट्रैकिंग और सुधारात्मक शासन',
    contractsTab: 'अनुबंध',
    requirementsTab: 'SLA एवं आवश्यकताएं',
    contractorVerificationQueueTab: 'सत्यापन कतार',
    totalContractorsCount: 'पंजीकृत वेंडर',
    activeContractsCount: 'सक्रिय अनुबंध',
    overdueRequirementsCount: 'अतिदेय SLA मदें',
    pendingVerificationsCount: 'लंबित सत्यापन',
    contractorCodeLabel: 'वेंडर कोड',
    workScopeLabel: 'कार्य का दायरा',
    contractValueLabel: 'अनुबंध मूल्य',
    validityPeriodLabel: 'वैधता अवधि',
    slaStatusLabel: 'SLA अनुपालन स्थिति',
    slaOnTrack: 'समय पर',
    slaDueSoon: 'शीघ्र देय',
    slaOverdue: 'SLA उल्लंघन / अतिदेय',
    slaExpired: 'वैधता समाप्त',
    slaCompliant: 'आवश्यकता सत्यापित',
    verifyRequirementBtn: 'आवश्यकता सत्यापित करें',
    recordIssueBtn: 'ठेकेदार समस्या दर्ज करें',
    verificationModalTitle: 'फील्ड आवश्यकता सत्यापन',
    contractorDisclaimerText: 'ठेकेदार शासन: त्रिनेत्र फील्ड SLA अनुपालन और ऑडिट चेनिंग लागू करता है। संविदात्मक सत्यापन वैधानिक खदान मंजूरी का विकल्प नहीं है।',
    offlineContractorSaved: 'सत्यापन ऑफ़लाइन सहेजा गया — trinetra_field_sync_queue में कतारबद्ध।',
    contractDetailTitle: 'अनुबंध समझौता विवरण',
    requirementDetailTitle: 'आवश्यकता अनुपालन विनिर्देश',
    createCorrectiveTaskLabel: 'सुधारात्मक कार्य बनाएं (गवर्नेंस कतार)',
    assigneeRoleLabel: 'जिम्मेदार पद / भूमिका',
    remedialActionPlanLabel: 'सुधारात्मक कार्य योजना',
    // Mobile Grievance Field Operations (MOBILE-14)
    grievancesFieldTitle: 'शिकायतें एवं कामगार मुद्दे',
    grievancesFieldSubtitle: 'PGRM निवारण, फील्ड तथ्य-जांच एवं समाधान प्रशासन',
    allGrievancesTab: 'सभी मुद्दे',
    myAssignmentsTab: 'मुझे सौंपे गए',
    investigationQueueTab: 'जांच कतार',
    resolvedGrievancesTab: 'समाधानित',
    totalGrievancesCount: 'कुल दर्ज',
    openGrievancesCount: 'सक्रिय मामले',
    investigationRequiredCount: 'कार्रवाई आवश्यक',
    overdueGrievancesCount: 'SLA उल्लंघन',
    logGrievanceBtn: 'फील्ड शिकायत दर्ज करें',
    acknowledgeGrievanceBtn: 'पावती दर्ज करें',
    assignInvestigatorBtn: 'जांचकर्ता नियुक्त करें',
    recordInvestigationBtn: 'फील्ड निष्कर्ष दर्ज करें',
    resolveGrievanceBtn: 'समाधान प्रस्तुत करें',
    reopenGrievanceBtn: 'शिकायत पुनः खोलें',
    grievanceDisclaimerText: 'PGRM निवारण शासन: त्रिनेत्र ऑडिट अखंडता के साथ कामगार एवं सार्वजनिक शिकायतों को दर्ज करता है। तथ्यात्मक रिकॉर्डिंग कानूनी दायित्व या वैधानिक गलती तय नहीं करती है।',
    offlineGrievanceSaved: 'शिकायत ऑफ़लाइन सहेजी गई — trinetra_field_sync_queue में कतारबद्ध।',
    grievanceDetailTitle: 'शिकायत विवरण',
    complainantTypeLabel: 'शिकायतकर्ता',
    anonymousComplaint: 'गुमनाम कामगार / नागरिक',
    nodalOfficerLabel: 'PGRM नोडल अधिकारी',
    investigationFindingsLabel: 'फील्ड जांच निष्कर्ष',
    actionRequiredLabel: 'कार्रवाई आवश्यक',
    resolutionSummaryLabel: 'समाधान सारांश',
    // Mobile Field Intelligence & Predictive Risk Actions (MOBILE-15)
    fieldIntelligenceTitle: 'क्षेत्रीय जोखिम बुद्धिमत्ता',
    fieldIntelligenceSubtitle: 'अग्रिम 30-मिनट का परिचालन जोखिम पूर्वानुमान, योगदान संकेत एवं क्षेत्रीय सत्यापन',
    activeSignalsTab: 'सक्रिय संकेत',
    myVerificationsTab: 'मेरे सत्यापन',
    allPredictionsTab: 'सभी संकेत',
    predictedEscalationRisk: 'पूर्वानुमानित वृद्धि जोखिम',
    modelProvenanceLabel: 'मॉडल एवं स्रोत प्रमाणिकता',
    verifyInFieldBtn: 'क्षेत्र में सत्यापित करें',
    recordFieldOutcomeTitle: 'फील्ड सत्यापन निष्कर्ष दर्ज करें',
    outcomeNoIssue: 'कोई समस्या नहीं देखी गई',
    outcomeIssueFound: 'समस्या पाई गई',
    outcomeFurtherReview: 'आगे समीक्षा की आवश्यकता',
    createLinkedTaskLabel: 'सुधारात्मक कार्य बनाएं (गवर्नेंस कतार)',
    createLinkedIncidentLabel: 'सुरक्षा घटना रिकॉर्ड करें',
    dataFreshnessLive: 'सजीव टेलीमेट्री (LIVE)',
    dataFreshnessStale: 'पुराना / संचित संदर्भ',
    dataFreshnessUnavailable: 'पूर्वानुमान अनुपलब्ध',
    simulatedHoldoutNotice: 'सिम्युलेटेड डेमो टेलीमेट्री (होल्डआउट मॉडल मूल्यांकन)',
    pipelineTraceTitle: 'परिचालन जोखिम जीवनचक्र ट्रेस',
    offlineRiskContextSaved: 'फील्ड सत्यापन स्थानीय रूप से सहेजा गया — trinetra_field_sync_queue में कतारबद्ध।',
    riskDetailHeader: 'पूर्वानुमानित जोखिम संकेत विवरण',
    activeAlertsLabel: 'सक्रिय जोखिम चेतावनियां',
    horizonMinutesLabel: 'पूर्वानुमान क्षितिज',
    escalationProbabilityLabel: 'वृद्धि की संभावना',
    normalBaselineLabel: 'सामान्य बेसलाइन',
    statutoryLimitLabel: 'वैधानिक सीमा',
    // Cross-Domain Field Command (MOBILE-16)
    fieldCommandTitle: 'फील्ड कमांड सेंटर',
    fieldCommandSubtitle: 'एकीकृत क्रॉस-डोमेन परिचालन खुफिया, प्राथमिकता ध्यान एवं फील्ड निष्पादन कतार',
    myWorkSectionTitle: 'मेरा सौंपा गया कार्य',
    nearbySectionTitle: 'निकटवर्ती फील्ड खतरे एवं संदर्भ',
    quickActionsTitle: 'त्वरित फील्ड संचालन',
    sourcePredictiveModel: 'पूर्वानुमानित जोखिम संकेत',
    sourceIncidentLog: 'सुरक्षा घटना',
    sourceTaskQueue: 'गवर्नेंस कार्य',
    sourceSupervisorReview: 'पर्यवेक्षक समीक्षा',
    sourceContractorSla: 'ठेकेदार SLA',
    sourcePgrmGrievance: 'PGRM शिकायत',
    sourceEnvObservation: 'पर्यावरण नियम',
    sourceStatutoryCompliance: 'वैधानिक अनुपालन',
    relatedRecordsTitle: 'क्रॉस-डोमेन लिंक किए गए रिकॉर्ड',
    unifiedTimelineTitle: 'क्रिप्टोग्राफिक ऑडिट एवं जीवनचक्र समयरेखा',
    noAttentionItems: 'फील्ड एस्केलेशन की आवश्यकता वाला कोई जरूरी आइटम नहीं है।',
    noMyWorkItems: 'आपकी कतार में कोई लंबित कार्य या निरीक्षण नहीं सौंपा गया है।',
    noNearbyItems: 'निकटवर्ती क्षेत्र में कोई उच्च जोखिम वाली इकाई नहीं मिली।',
    verifyRiskBtn: 'फील्ड में सत्यापित करें',
    reviewItemBtn: 'समीक्षा एवं साइन-ऑफ',
    completeTaskBtn: 'कार्य निष्पादित करें',
    investigateGrievanceBtn: 'जांच करें',
    viewDetailsBtn: 'विवरण देखें',
    lastSyncLabel: 'अंतिम सिंक',
    currentShiftLabel: 'वर्तमान शिफ्ट',
    networkStatusLabel: 'नेटवर्क',
    staleContextWarning: 'संदर्भ 15 मिनट से अधिक पुराना है — ऑफ़लाइन डेटा।'
  },
  te: {
    appName: 'త్రినేత్ర (TRINETRA)',
    appSubtitle: 'గనుల పరిపాలన & భద్రత AI',
    navCommand: 'COMMAND',
    navMonitor: 'MONITOR',
    navGovern: 'GOVERN',
    navIntelligence: 'INTELLIGENCE',
    liveDashboard: 'లైవ్ డాష్‌బోర్డ్',
    gisCommandMap: '2D GIS కమాండ్ మ్యాప్',
    demoControlCenter: 'డెమో కంట్రోల్ సెంటర్',
    documentIntelligence: 'డాక్యుమెంట్ ఇంటెలిజెన్స్ & OCR',
    aiRiskIntelligence: 'ప్రిడిక్టివ్ రిస్క్',
    aiCopilot: 'AI కోపైలట్',
    fieldOperations: 'ఫీల్డ్ ఆపరేషన్స్',
    integrationsHealth: 'ఇంటిగ్రేషన్లు & ఆరోగ్యం',
    auditIntegrity: 'క్రిప్టోగ్రాఫిక్ ఆడిట్ సమగ్రత',
    circuitBreaker: 'సర్క్యూట్ బ్రేకర్',
    sourceProvenance: 'మూల ప్రామాణికత',
    startInspection: 'తనిఖీ ప్రారంభించండి',
    reportIncident: 'సంఘటన నమోదు చేయండి',
    recordObservation: 'పరిశీలన నమోదు చేయండి',
    captureEvidence: 'సాక్ష్యాలను సేకరించండి',
    syncQueue: 'సింక్ క్యూ',
    syncNow: 'ఇప్పుడే సింక్ చేయండి',
    onlineStatus: 'ఆన్‌లైన్',
    offlineStatus: 'ఆఫ్‌లైన్ (లోకల్ క్యూ యాక్టివ్)',
    syncingStatus: 'సింక్ అవుతోంది...',
    pendingSyncCount: 'పెండింగ్ సింక్రొనైజేషన్',
    gpsAccuracy: 'జీపీఎస్ ఖచ్చితత్వం',
    sha256Hash: 'SHA-256 సాక్ష్య హ్యాష్',
    operationalAlerts: 'కార్యాచరణ హెచ్చరికలు',
    productionLogs: 'ఉత్పత్తి & నివేదికలు',
    workforceMuster: 'కార్మిక వర్గం & హాజరు',
    contractorsSla: 'కాంట్రాక్టర్లు & SLA',
    atmosphereEnv: 'పర్యావరణం & గాలి నాణ్యత',
    sensorsTelemetry: 'సెన్సార్లు & టెలిమెట్రీ',
    minesLevels: 'గనులు & స్థాయిలు',
    cctvMachinery: 'CCTV & యంత్రాలు',
    safetyIncidents: 'భద్రతా సంఘటనలు',
    dgmsViolations: 'DGMS చట్టబద్ధ ఉల్లంఘనలు',
    grievanceRedressal: 'ఫిర్యాదుల పరిష్కారం',
    statutoryReports: 'చట్టబద్ధ నివేదికలు',
    digitalSignoffs: 'డిజిటల్ ఆమోదాలు',
    spatialTwin: '3D డిజిటల్ ట్విన్',
    riskAuditTrail: 'ప్రమాద & ఆడిట్ చరిత్ర',
    currentRisk: 'ప్రస్తుత కార్యాచరణ ప్రమాదం',
    predictedRisk: 'అంచనా వేసిన ప్రమాదం (30ని)',
    horizon: 'అంచనా సమయ పరిమితి',
    probability: 'పెరిగే సంభావ్యత',
    focusIn3D: '3D లో వీక్షించండి',
    viewEvidence: 'సాక్ష్యాలను చూడండి',
    viewTasks: 'పరిపాలనా పనులను చూడండి',
    viewViolations: 'ఉల్లంఘనలను చూడండి',
    viewIncidents: 'సంఘటనలను చూడండి',
    askCopilotPlaceholder: 'మీ గని సమాచారం మరియు భద్రతపై ప్రశ్న అడగండి...',
    sendQuery: 'ప్రశ్న పంపండి',
    clearChat: 'చరిత్ర తొలగించండి',
    quickActions: 'త్వరిత పరిపాలనా ప్రశ్నలు',
    dataProvenance: 'డేటా మూలం: వాస్తవ బ్యాకెండ్ డేటా | సిమ్యులేటెడ్ టెలిమెట్రీ',
    evidenceSignals: 'నిరూపిత సాక్ష్యాలు & సంకేతాలు',
    recommendedAction: 'సిఫార్సు చేయబడిన తదుపరి చర్య',
    insufficientData: 'ఖచ్చితమైన అంచనాకు సరిపడా డేటా లేదు.',
    systemNormal: 'అన్ని పారామితులు చట్టబద్ధమైన పరిమితుల్లో ఉన్నాయి.',
    criticalAlert: 'తీవ్ర హెచ్చరిక',
    warningAlert: 'చట్టబద్ధ హెచ్చరిక',
    governanceIntelligence: 'గవర్నెన్స్ ఇంటెలిజెన్స్',
    governanceSubtitle: 'క్రాస్-డొమైన్ ఆపరేషనల్, కంప్లైయన్స్ మరియు ప్రిడిక్టివ్ ఇంటెలిజెన్స్',
    dataAsOfLabel: 'డేటా సమయం',
    dataTrustLabel: 'డేటా విశ్వసనీయత',
    sourceDerivedLabel: 'సోర్స్-డెరైవ్డ్',
    operationalLabel: 'ఆపరేషనల్',
    simulatedLabel: 'డేటా మోడ్: సిమ్యులేటెడ్',
    modelDerivedLabel: 'మోడల్-డెరైవ్డ్',
    attentionRequiredLabel: 'శ్రద్ధ అవసరం',
    whatChangedLabel: 'ఏమి మారింది (మార్పుల వివరాలు)',
    crossMineViewLabel: 'క్రాస్-మైన్ పోలిక',
    safetyIntelligenceLabel: 'భద్రతా ఇంటెలిజెన్స్',
    complianceIntelligenceLabel: 'కంప్లైయన్స్ ఇంటెలిజెన్స్',
    productionPerformanceLabel: 'ఉత్పత్తి పనితీరు',
    environmentalMonitoringLabel: 'పర్యావరణ పర్యవేక్షణ',
    predictiveRisk30MinLabel: 'అంచనా ప్రమాదం — 30 నిమిషాలు',
    noDataLabel: 'డేటా లేదు',
    viewInGisLabel: 'GIS లో చూడండి',
    viewContractorsLabel: 'కాంట్రాక్టర్లను చూడండి',
    openFieldOperationsLabel: 'ఫీల్డ్ ఆపరేషన్స్ తెరవండి',
    openPgrmWorkflowLabel: 'PGRM వర్క్‌ఫ్లో తెరవండి',
    languageSelect: 'భాష',
    sensorTelemetryNodes: 'పర్యావరణ & టెలిమెట్రీ నోడ్లు',
    sensorTelemetrySubtitle: 'రియల్ టైమ్ గ్యాస్ సాంద్రత, గాలి వేగం, ధూళి పీఎమ్ మరియు స్ట్రాటా భూకంప పర్యవేక్షణ.',
    scenarioControlsTitle: 'డిటర్మినిస్టిక్ సిమ్యులేషన్ దృశ్య నియంత్రణలు (SIH పరీక్ష)',
    scenarioImpactTitle: 'క్రియాశీల దృశ్య పైప్‌లైన్ ప్రతిస్పందన',
    scenarioImpactSubtitle: 'రియల్ టైమ్ టెలిమెట్రీ ఇంజెక్షన్, థ్రెషోల్డ్ మూల్యాంకనం మరియు హెచ్చరిక స్థితి',
    normalBaseline: 'సాధారణ బేస్‌లైన్',
    methaneSpike: 'మీథేన్ పెరుగుదల (స్పైక్)',
    coSurge: 'కార్బన్ మోనాక్సైడ్ గ్యాస్ సర్జ్',
    ventilationDrop: 'వెంటిలేషన్ తగ్గుదల',
    sensorSilence: 'సెన్సార్ నిశ్శబ్దం / ఆఫ్‌లైన్',
    multiHazardSpike: 'బహుళ-ప్రమాద స్పైక్',
    sensorCode: 'సెన్సార్ కోడ్',
    sensorNameType: 'సెన్సార్ పేరు / రకం',
    zoneLevel: 'జోన్ / స్థాయి',
    liveTelemetry: 'లైవ్ టెలిమెట్రీ',
    thresholds: 'పరిమితులు (హెచ్చరిక / ప్రమాదం)',
    coords3d: '3D కోఆర్డినేట్స్ (x,y,z)',
    status: 'స్థితి',
    history: 'చరిత్ర',
    centerInTwin: '3D డిజిటల్ ట్విన్ లో కేంద్రీకరించండి',
    viewReadingHistory: 'రీడింగ్ చరిత్ర చూడండి',
    workforceManagement: 'కార్మికులు & మస్టర్ నిర్వహణ',
    workforceSubtitle: 'చట్టబద్ధమైన ఫారం E మస్టర్ రోల్, బయోమెట్రిక్ హాజరు మరియు DGMS భద్రతా ధృవీకరణలు.',
    activeWorkers: 'క్రియాశీల కార్మికులు',
    shiftsToday: 'క్రియాశీల షిఫ్టులు',
    attendanceRate: 'హాజరు రేటు',
    certCompliance: 'DGMS సర్టిఫికేషన్ కంప్లైయన్స్',
    searchWorkers: 'కార్మికుని పేరు, టోకెన్ లేదా హోదా కోసం శోధించండి...',
    allShifts: 'అన్ని షిఫ్ట్‌లు',
    allMines: 'అన్ని గనుల కేటాయింపులు',
    workerName: 'కార్మికుని పేరు / టోకెన్',
    designation: 'హోదా / పాత్ర',
    shift: 'కేటాయించిన షిఫ్ట్',
    assignedMine: 'కేటాయించిన గని',
    attendance: 'మస్టర్ హాజరు',
    safetyCert: 'DGMS సర్టిఫికేషన్ స్థితి',
    generateReport: 'చట్టబద్ధ నివేదికను రూపొందించండి',
    downloadPdf: 'సంతకం చేసిన PDF డౌన్‌లోడ్ చేయండి',
    viewDetails: 'వివరాలు చూడండి',
    exportData: 'డేటాను ఎగుమతి చేయండి',
    filterBy: 'ఫిల్టర్ చేయండి',
    allStatus: 'అన్ని స్థితులు',
    // Human-Centric Terminology Layer (Telugu)
    liveMonitoring: 'లైవ్ పర్యవేక్షణ',
    unusualReading: 'అసాధారణ రీడింగ్',
    safetyLimitExceeded: 'భద్రతా పరిమితి మించింది',
    sensorNotReporting: 'సెన్సార్ నివేదించడం లేదు',
    missingMonitoringSignal: 'పర్యవేక్షణ సంకేతం లోపించింది',
    actionRequired: 'చర్య అవసరం',
    assignedAction: 'కేటాయించిన చర్య',
    forecastedRisk: 'అంచనా వేసిన ప్రమాదం',
    syncFieldRecords: 'ఫీల్డ్ రికార్డులను సింక్ చేయండి',
    externalSignal: 'బాహ్య సంకేతం',
    riskAssessment: 'ప్రమాద మూల్యాంకనం',
    nearbyInformation: 'సమీప సమాచారం',
    sourceAndEvidence: 'మూలం & సాక్ష్యం',
    fromSourceDocument: 'మూల పత్రం నుండి',
    demonstrationData: 'ప్రదర్శన డేటా (డెమో)',
    aiModelForecast: 'AI/మోడల్ అంచనా',
    viewTechnicalDetails: 'సాంకేతిక వివరాలు చూడండి',
    hideTechnicalDetails: 'సాంకేతిక వివరాలు దాచండి',
    todaysFieldInspections: 'నేటి ఫీల్డ్ తనిఖీలు',
    recordAttendance: 'హాజరు నమోదు చేయండి',
    saveAttendance: 'హాజరును సేవ్ చేయండి',
    cancel: 'రద్దు చేయండి',
    selectWorker: 'కార్మికుడిని ఎంచుకోండి',
    currentCondition: 'ప్రస్తుత పరిస్థితి',
    whatItMeans: 'దీని అర్థం ఏమిటి',
    whyTitle: 'ముఖ్య కారణాలు',
    decisionSupportDisclaimer: 'కేవలం నిర్ణయ మద్దతు: చట్టబద్ధమైన లేదా కార్యాచరణ చర్యకు ముందు మానవ ధృవీకరణ అవసరం.',
    // Mobile Foundation (MOBILE-01 - Telugu)
    trinetraField: 'త్రినేత్ర ఫీల్డ్',
    fieldIntelligence: 'ఫీల్డ్ ఇంటెలిజెన్స్',
    fieldMotto: 'పరిశీలించండి. ధృవీకరించండి. నమోదు చేయండి. చర్య తీసుకోండి.',
    mobileHome: 'హోమ్',
    mobileTasks: 'టాస్క్‌లు',
    mobileMap: 'మ్యాప్',
    mobileCopilot: 'కో-పైలట్',
    mobileMore: 'మరిన్ని',
    assignedTasks: 'కేటాయించిన టాస్క్‌లు',
    highPriority: 'అధిక ప్రాధాన్యత',
    pendingSync: 'పెండింగ్ సింక్',
    todayOverview: 'నేటి వివరాలు',
    myTasks: 'నా టాస్క్‌లు',
    conductInspection: 'తనిఖీని ప్రారంభించండి',
    fieldObservation: 'ఫీల్డ్ పరిశీలన',
    safetyAudit: 'భద్రతా ఆడిట్',
    statutoryAudit: 'చట్టబద్ధ ఆడిట్',
    activeViolations: 'క్రియాశీల ఉల్లంఘనలు',
    riskHeatmap: 'రిస్క్ హీట్‌మ్యాప్',
    shiftApprovals: 'షిఫ్ట్ ఆమోదాలు',
    incidentLog: 'సంఘటన లాగ్',
    complianceEvidence: 'సమ్మతి సాక్ష్యం',
    officialReports: 'అధికారిక నివేదికలు',
    noTasksAssigned: 'ప్రస్తుతం మీకు ఎలాంటి ఫీల్డ్ టాస్క్‌లు కేటాయించబడలేదు.',
    noMinesAssigned: 'ఈ ఖాతా కోసం అధికారిక గనులు కనుగొనబడలేదు.',
    sessionExpired: 'సెషన్ ముగిసింది',
    sessionExpiredDesc: 'మీ త్రినేత్ర సెషన్ ముగిసింది. దయచేసి మళ్లీ సైన్ ఇన్ చేయండి.',
    signInAgain: 'మళ్లీ సైన్ ఇన్ చేయండి',
    serverError: 'సర్వర్ లోపం',
    serverErrorDesc: 'త్రినేత్ర సర్వర్‌ను సంప్రదించలేకపోయింది.',
    networkOnlineNotice: 'త్రినేత్ర కోర్‌కు అనుసంధానించబడింది. రియల్-టైమ్ సింక్ సక్రియంగా ఉంది.',
    networkOfflineNotice: 'మీరు ఆఫ్‌లైన్‌లో ఉన్నారు. పని స్థానికంగా సేవ్ చేయబడుతుంది.',
    networkSyncingNotice: 'ఫీల్డ్ రికార్డులు త్రినేత్ర కోర్‌తో సింక్ అవుతున్నాయి...',
    networkSyncCompleteNotice: 'అన్ని ఫీల్డ్ కార్యకలాపాలు విజయవంతంగా సింక్ అయ్యాయి.',
    networkSyncErrorNotice: 'సింక్ లోపం. స్వయంచాలక పునఃప్రయత్నం కోసం వేచి ఉంది.',
    authorizedMines: 'అధికారిక గనులు',
    switchMine: 'గనిని మార్చండి',
    selectMinePrompt: 'అధికారిక కార్యాచరణ గనిని ఎంచుకోండి:',
    profileAndRole: 'ప్రొఫైల్ & పాత్ర',
    languageSelection: 'భాష',
    systemDiagnostics: 'డయాగ్నస్టిక్స్ & సింక్',
    signOutButton: 'సైన్ అవుట్',
    phaseFoundationNotice: 'మొబైల్ ఫౌండేషన్ షెల్ సక్రియంగా ఉంది (ఫేజ్ 1). తరువాతి దశలలో కార్యాచరణ ఇంజిన్లు ప్రారంభించబడతాయి.',
    // Mobile Field Execution (MOBILE-02 - Telugu)
    taskDetailsTitle: 'టాస్క్ వివరాలు',
    dueTimeLabel: 'గడువు సమయం',
    assignedByLabel: 'కేటాయించిన వారు',
    reasonContextLabel: 'కారణం & సందర్భం',
    predictiveRiskHotspotLabel: 'ప్రిడిక్టివ్ రిస్క్ హాట్‌స్పాట్',
    contributingSignalsLabel: 'సంబంధిత సంకేతాలు',
    startInspectionBtn: 'తనిఖీ ప్రారంభించండి',
    openTaskBtn: 'టాస్క్ తెరవండి',
    inspectionTitle: 'ఫీల్డ్ తనిఖీ',
    checksCompletedLabel: 'తనిఖీలు పూర్తయ్యాయి',
    checkItemCompliant: 'అనుగుణంగా ఉంది (Compliant)',
    checkItemObservation: 'పరిశీలన (Observation)',
    checkItemNonCompliant: 'ఉల్లంఘన/అసమ్మతి (Non-Compliant)',
    checkItemNotApplicable: 'వర్తించదు (N/A)',
    addObservationNote: 'పరిశీలన గమనికను జోడించండి',
    observationSeverityLabel: 'తీవ్రత',
    recommendationLabel: 'సిఫార్సు',
    statuteReferenceLabel: 'చట్టబద్ధ నిబంధన సూచన',
    humanVerificationNotice: 'మానవ ధృవీకరణ అవసరం: ఫీల్డ్ పరిశీలనలు స్వయంచాలకంగా చట్టబద్ధమైన ఉల్లంఘనలుగా నిర్ధారించబడవు.',
    potentialNonComplianceNotice: 'పర్యవేక్షక ధృవీకరణ కోసం సంభావ్య అసమ్మతి నమోదు చేయబడింది.',
    attachedEvidenceTitle: 'జతచేసిన సాక్ష్యాలు',
    browserCameraLabel: 'బ్రౌజర్ కెమెరా / ఫైల్',
    takePhotoBtn: 'ఫోటో తీయండి',
    documentUploadBtn: 'ఫైల్ జతచేయండి',
    hashVerifiedLabel: 'SHA-256 హ్యాష్ చేయబడింది',
    captureLocationLabel: 'స్థానాన్ని నమోదు చేయండి',
    gpsAvailableLabel: 'వాస్తవ GPS స్థిరీకరణ',
    locationSimulatedLabel: 'సర్వే చేసిన గని కోఆర్డినేట్స్',
    datumWgs84Label: 'డేటమ్: WGS84',
    inspectionReviewTitle: 'తనిఖీ సమీక్ష',
    saveDraftBtn: 'డ్రాఫ్ట్ సేవ్ చేయండి',
    submitInspectionBtn: 'తనిఖీని సమర్పించండి',
    inspectionSubmittedSuccess: 'తనిఖీ విజయవంతంగా సమర్పించబడింది',
    auditRecordedConfirmed: 'ఆడిట్: నమోదు చేయబడింది',
    savedOfflineNotice: 'ఆఫ్‌లైన్‌లో సేవ్ చేయబడింది — నెట్‌వర్క్ పునరుద్ధరించబడినప్పుడు సింక్ అవుతుంది.',
    validationErrorIncomplete: 'అసంపూర్ణ తనిఖీ అంశాలు ఉన్నాయి.',
    validationErrorNotesRequired: 'దయచేసి అసమ్మతి అంశాలకు తీవ్రత మరియు గమనికను నమోదు చేయండి.',
    backToTaskListBtn: 'టాస్క్ జాబితాకు తిరిగి వెళ్లండి',
    viewInspectionBtn: 'తనిఖీని చూడండి',
    readyToSubmitStatus: 'సమర్పణకు సిద్ధంగా ఉంది',
    evidenceItemsCount: 'సాక్ష్య అంశాలు',
    // Mobile Field Evidence & GPS (MOBILE-03 - Telugu)
    capturePhoto: '+ ఫోటో తీయండి',
    chooseFile: '+ ఫైల్ ఎంచుకోండి',
    addNoteEvidence: '+ గమనిక జోడించండి',
    evidencePreviewTitle: 'సాక్ష్య ప్రివ్యూ',
    retakePhoto: 'మళ్లీ తీయండి',
    usePhoto: 'ఫోటో ఉపయోగించండి',
    removeEvidence: 'తొలగించండి',
    evidenceNotePlaceholder: 'పరిశీలన లేదా గమనిక వివరాలను నమోదు చేయండి...',
    linkObservationLabel: 'లింక్ చేయబడిన పరిశీలన / తనిఖీ',
    locationQualityGood: 'ఉత్తమం (అధిక ఖచ్చితత్వం)',
    locationQualityFair: 'మధ్యస్థం (సంతృప్తికర ఖచ్చితత్వం)',
    locationQualityLow: 'తక్కువ ఖచ్చితత్వం',
    refreshLocationBtn: 'స్థానాన్ని రిఫ్రెష్ చేయండి',
    locatingStatus: 'GPS లొకేషన్ వెతుకుతోంది...',
    evidenceFingerprintCreated: 'SHA-256 సమగ్రత వేలిముద్ర రూపొందించబడింది',
    sha256Explanation: 'SHA-256 త్రినేత్ర ద్వారా ప్రాసెస్ చేయబడిన సాక్ష్య ఫైల్ యొక్క సమగ్రత వేలిముద్రను రికార్డ్ చేస్తుంది.',
    technicalDetailsTitle: 'సాంకేతిక వివరాలు',
    hideTechnicalDetailsTitle: 'సాంకేతిక వివరాలు దాచండి',
    syncStatusLocal: 'స్థానికంగా భద్రపరచబడింది',
    syncStatusQueued: 'సింక్ క్యూలో ఉంది',
    syncStatusSyncing: 'సర్వర్‌తో సింక్ అవుతోంది...',
    syncStatusSynced: 'సింక్రొనైజ్ చేయబడింది',
    syncStatusFailed: 'అప్‌లోడ్ విఫలమైంది',
    retrySyncBtn: 'మళ్లీ అప్‌లోడ్ చేయండి',
    verifyEvidenceBtn: 'సాక్ష్యాన్ని ధృవీకరించండి',
    rejectEvidenceBtn: 'సాక్ష్యాన్ని తిరస్కరించండి',
    verificationNotesPrompt: 'పర్యవేక్షక ధృవీకరణ గమనికలు',
    verifiedBadge: 'ధృవీకరించబడింది',
    rejectedBadge: 'తిరస్కరించబడింది',
    pendingVerificationBadge: 'సమీక్ష పెండింగ్‌లో ఉంది',
    // Mobile Field Map & Spatial Intelligence (MOBILE-04)
    fieldMapTitle: 'ఫీల్డ్ మ్యాప్',
    spatialOrientation: 'స్పేషియల్ ఫీల్డ్ ఓరియంటేషన్',
    myLocation: 'నా స్థానం',
    nearbyIntelligence: 'సమీప ఇంటెలిజెన్స్',
    openTasksCount: 'తెరిచిన టాస్క్‌లు',
    highCriticalRisk: 'అధిక/క్లిష్టమైన రిస్క్',
    openIncidents: 'తెరిచిన సంఘటనలు',
    sensorAnomalies: 'సెన్సార్ క్రమరాహిత్యాలు',
    nearMeFilter: 'నా సమీపంలో',
    allMineFilter: 'మొత్తం గని',
    layerMineBoundary: 'గని సరిహద్దు',
    layerMyLocation: 'నా స్థానం',
    layerTasks: 'టాస్క్‌లు',
    layerRisk: 'రిస్క్ హాట్‌స్పాట్‌లు',
    layerSensors: 'సెన్సార్లు',
    layerIncidents: 'సంఘటనలు',
    currentRiskLabel: 'ప్రస్తుత రిస్క్',
    predictedRiskLabel: 'ప్రిడిక్టివ్ రిస్క్',
    predictedEscalation: 'అంచనా వేసిన తీవ్రత',
    withinHorizon: '30 నిమిషాలలో',
    inspectAction: 'తనిఖీ చేయండి',
    openTaskAction: 'టాస్క్ తెరవండి',
    viewSensorAction: 'సెన్సార్ చూడండి',
    openIncidentAction: 'సంఘటన తెరవండి',
    askCopilotAction: 'కోపైలట్‌ని అడగండి',
    viewIn3dAction: '3Dలో చూడండి',
    gpsActiveStatus: 'GPS సక్రియం',
    gpsLowAccuracyStatus: 'GPS తక్కువ ఖచ్చితత్వం',
    gpsUnavailableStatus: 'GPS అందుబాటులో లేదు',
    surveyedReferenceStatus: 'సర్వే రిఫరెన్స్',
    gpsUnavailableMineContext: 'GPS అందుబాటులో లేదు — గని సందర్భం చూపబడుతోంది.',
    mapDataUnavailable: 'మ్యాప్ డేటా అందుబాటులో లేదు',
    mapDataUnavailableOffline: 'ఆఫ్‌లైన్ మ్యాప్ డేటా అందుబాటులో లేదు',
    staleDataNotice: 'ఆఫ్‌లైన్ — డేటా పాతది కావచ్చు',
    lastUpdatedLabel: 'చివరిగా అప్‌డేట్ చేయబడింది',
    updateTimeUnavailable: 'అప్‌డేట్ సమయం అందుబాటులో లేదు',
    sourceDerivedBadge: 'మూల-ఉద్భవించినది',
    actualGpsBadge: 'వాస్తవ GPS',
    simulatedDemoBadge: 'సిమ్యులేటెడ్ డెమో',
    basemapSatellite: 'శాటిలైట్',
    basemapTerrain: 'టెర్రైన్',
    viewOnMap: 'మ్యాప్‌లో చూడండి',
    // Mobile Field Intelligence + Incident Response (MOBILE-05)
    fieldResponse: 'ఫీల్డ్ ప్రతిస్పందన',
    incidentResponseWorkflow: 'సంఘటన ప్రతిస్పందన వర్క్‌ఫ్లో',
    activeIncidents: 'సక్రియ సంఘటనలు',
    correctiveActions: 'దిద్దుబాటు చర్యలు',
    fieldResponseTitle: 'ఫీల్డ్ ప్రతిస్పందన',
    fieldIncidentResponse: 'సంఘటన ప్రతిస్పందన & నివారణ',
    startFieldResponseBtn: 'ప్రతిస్పందన ప్రారంభించండి',
    incidentDetailsTitle: 'సంఘటన వివరాలు',
    incidentLifecycleStatus: 'జీవితచక్ర స్థితి',
    recordObservationBtn: 'పరిశీలన నమోదు చేయండి',
    createCorrectiveActionBtn: 'దిద్దుబాటు చర్య సృష్టించండి',
    assignCorrectiveAction: 'చర్యను అప్పగించండి',
    correctiveActionTitle: 'దిద్దుబాటు చర్య',
    correctiveActionPriority: 'చర్య ప్రాధాన్యత',
    correctiveActionDueDate: 'పరిష్కార గడువు',
    slaDueIn: 'మిగిలిన సమయం',
    slaOverdueBy: 'ఆలస్యమైన సమయం',
    slaUnavailable: 'SLA గడువు అందుబాటులో లేదు',
    resolveIncidentBtn: 'పరిష్కరించబడినట్లు గుర్తించండి',
    verifyIncidentBtn: 'పరిష్కారాన్ని ధృవీకరించండి',
    rejectIncidentBtn: 'ప్రతిస్పందనను తిరస్కరించండి',
    closeIncidentBtn: 'సంఘటనను మూసివేయండి',
    rejectionReasonPrompt: 'తిరస్కరణ కారణాన్ని నమోదు చేయండి',
    responseChecklistTitle: 'ప్రతిస్పందన చెక్‌లిస్ట్',
    responseTimelineTitle: 'సంఘటన ప్రతిస్పందన కాలక్రమం',
    responseReviewTitle: 'ఫీల్డ్ ప్రతిస్పందన సమీక్ష',
    incidentTriageBtn: 'సంఘటనను వర్గీకరించండి',
    incidentAssignBtn: 'పరిశోధకుడిని నియమించండి',
    quickObservationType: 'పరిశీలన వర్గం',
    quickObservationSeverity: 'పరిశీలించిన తీవ్రత',
    quickObservationNotes: 'పరిశీలన గమనికలు',
    observationSavedSuccess: 'ఫీల్డ్ పరిశీలన నమోదు చేయబడింది మరియు ఆడిట్ కోసం భద్రపరచబడింది.',
    correctiveActionCreatedSuccess: 'దిద్దుబాటు చర్య కేటాయించబడింది మరియు పర్యవేక్షించబడుతోంది.',
    incidentResolvedSuccess: 'సంఘటన పరిష్కరించబడింది. పర్యవేక్షక ధృవీకరణ పెండింగ్‌లో ఉంది.',
    incidentVerifiedSuccess: 'సంఘటన పరిష్కారం ధృవీకరించబడింది మరియు ఆడిట్ లెడ్జర్‌లో నమోదు చేయబడింది.',
    incidentRejectedNotice: 'ప్రతిస్పందన తిరస్కరించబడింది. సంఘటన తిరిగి దర్యాప్తుకు పంపబడింది.',
    overdueActionsCount: 'గడువు ముగిసిన చర్యలు',
    pendingVerificationCount: 'పెండింగ్ ధృవీకరణ',
    highCriticalOpenIncidents: 'అధిక/క్లిష్టమైన తెరిచిన సంఘటనలు',
    // Mobile Field Tasks, Work Queue & Shift Operations (MOBILE-06)
    myWork: 'నా పని',
    workQueue: 'పని క్యూ',
    openWorkQueue: 'పని క్యూ తెరవండి',
    currentShift: 'ప్రస్తుత షిఫ్ట్',
    shiftSummary: 'షిఫ్ట్ సారాంశం',
    activeShift: 'సక్రియ షిఫ్ట్',
    noActiveShift: 'సక్రియ షిఫ్ట్ లేదు',
    attendanceStatus: 'హాజరు',
    taskDetails: 'పని వివరాలు',
    taskReview: 'పని పూర్తి సమీక్ష',
    startTask: 'పని ప్రారంభించండి',
    completeTask: 'పని పూర్తి చేయండి',
    taskCompletedSuccess: 'పని పూర్తయినట్లు గుర్తించబడింది.',
    noAssignedTasks: 'కేటాయించిన పనులు లేవు',
    noAssignedTasksDesc: 'మీకు ప్రస్తుతం పనులు లేవు.',
    noOverdueTasks: 'ఆలస్యమైన పనులు లేవు',
    noPendingVerification: 'పెండింగ్ ధృవీకరణ లేదు',
    dueToday: 'ఈరోజు గడువు',
    overdue: 'గడువు ముగిసింది',
    inProgress: 'పురోగతిలో ఉంది',
    completed: 'పూర్తయింది',
    pendingVerification: 'పెండింగ్ ధృవీకరణ',
    allTasks: 'అన్ని పనులు',
    taskPriority: 'ప్రాధాన్యత',
    taskDomain: 'డొమైన్',
    assignedTo: 'కేటాయించబడినది',
    slaInformationUnavailable: 'SLA సమాచారం అందుబాటులో లేదు',
    locationNotAvailable: 'స్థానం అందుబాటులో లేదు',
    workQueueMayBeStale: 'పని క్యూ పాతది కావచ్చు',
    requiredInfoMissing: 'అవసరమైన సమాచారం లేదు',
    conflictReviewRequired: 'వివాదం — సమీక్ష అవసరం',
    loadingWorkQueue: 'పని క్యూ లోడ్ అవుతోంది...',
    verificationQueue: 'ధృవీకరణ క్యూ',
    // Mobile Field Communications & Actionable Notifications (MOBILE-07)
    notifications: 'నోటిఫికేషన్‌లు',
    notificationsCenterTitle: 'ఫీల్డ్ నోటిఫికేషన్‌లు & కమ్యూనికేషన్స్',
    attentionSectionTitle: 'ఆపరేషనల్ అటెన్షన్',
    allNotificationsTab: 'అన్నీ',
    unreadTab: 'చదవనివి',
    criticalTab: 'క్లిష్టమైనవి',
    tasksTab: 'పనులు',
    incidentsTab: 'సంఘటనలు',
    riskTab: 'రిస్క్',
    verificationTab: 'ధృవీకరణ',
    markReadBtn: 'చదివినట్లు గుర్తించు',
    markAllReadBtn: 'అన్నీ చదివినట్లు గుర్తించు',
    allNotificationsRead: 'అన్ని నోటిఫికేషన్‌లు చదివినట్లు గుర్తించబడ్డాయి',
    viewAllNotifications: 'అన్ని నోటిఫికేషన్‌లను వీక్షించండి',
    noNotifications: 'ప్రస్తుత పరిధిలో నోటిఫికేషన్‌లు అందుబాటులో లేవు.',
    noUnreadNotifications: 'చదవని నోటిఫికేషన్‌లు లేవు.',
    notificationsMayBeStale: 'ఆఫ్‌లైన్: నోటిఫికేషన్‌లు పాతవి కావచ్చు',
    staleResourceNotice: 'ఈ వనరు ఇకపై సక్రియంగా లేదు లేదా ఇప్పటికే పరిష్కరించబడింది.',
    viewWorkQueueBtn: 'పని క్యూని వీక్షించండి',
    openIncidentBtn: 'సంఘటన తెరవండి',
    viewRiskBtn: 'రిస్క్ వీక్షించండి',
    reviewVerificationBtn: 'ధృవీకరణను సమీక్షించండి',
    askCopilotBtn: 'కోపైలట్‌ను అడగండి',
    loadingNotifications: 'నోటిఫికేషన్‌లు మరియు అలర్ట్‌లు లోడ్ అవుతున్నాయి...',
    // Mobile Offline Resilience & Sync Center (MOBILE-08)
    syncCenterTitle: 'సింక్ సెంటర్ & ఆఫ్‌లైన్ రెసిలియన్స్',
    savedLocally: 'స్థానికంగా భద్రపరచబడింది',
    queuedForSync: 'సింక్ క్యూలో ఉంది',
    syncingStatusText: 'సింక్ అవుతోంది...',
    serverAcknowledged: 'సర్వర్ ఆమోదించింది',
    auditRecorded: 'ఆడిట్ నమోదు చేయబడింది',
    syncFailedText: 'విఫలమైంది',
    syncConflictText: 'వివాదం',
    lastSuccessfulServerSync: 'చివరి విజయవంతమైన సర్వర్ సింక్',
    noServerSyncRecorded: 'ఎలాంటి విజయవంతమైన సర్వర్ సింక్ రికార్డు కాలేదు',
    syncNowBtn: 'ఇప్పుడే సింక్ చేయండి',
    retrySafeAllBtn: 'అన్ని సురక్షితమైనవి మళ్లీ ప్రయత్నించండి',
    retryOpBtn: 'మళ్లీ ప్రయత్నించండి',
    clearSyncedBtn: 'ఆమోదించబడిన రికార్డులను క్లియర్ చేయండి',
    mayBeStaleNotice: 'ఆఫ్‌లైన్‌లో ఉన్నప్పుడు పాతది కావచ్చు',
    reviewConflictBtn: 'వివాదాన్ని సమీక్షించండి',
    deviceOnlineStatus: 'పరికరం ఆన్‌లైన్',
    serverReachableStatus: 'సర్వర్ కనెక్ట్ అయింది',
    serverUnreachableStatus: 'సర్వర్ అందుబాటులో లేదు',
    localDraftsCount: 'స్థానిక డ్రాఫ్ట్‌లు',
    pendingOperationsCount: 'పెండింగ్ కార్యకలాపాలు',
    storageUsageTitle: 'ఆఫ్‌లైన్ నిల్వ వినియోగం',
    gisFreshnessTitle: 'GIS స్పేషియల్ తాజాదనం',
    notificationsFreshnessTitle: 'నోటిఫికేషన్‌ల తాజాదనం',
    safeToRetryLabel: 'మళ్లీ ప్రయత్నించడం సురక్షితం',
    unsafeToRetryLabel: 'అసురక్షితం / ధ్రువీకరణ వివాదం',
    conflictResolutionModalTitle: 'సింక్ వివాద పరిష్కారం',
    localVersionLabel: 'స్థానిక వెర్షన్',
    serverVersionLabel: 'సర్వర్ వెర్షన్',
    keepLocalBtn: 'స్థానిక డేటాను ఉంచి మళ్లీ ప్రయత్నించండి',
    acceptServerBtn: 'సర్వర్ స్థితిని అంగీకరించండి',
    noPendingOperationsMsg: 'పెండింగ్ ఆఫ్‌లైన్ కార్యకలాపాలు లేవు. అన్ని రికార్డులు సింక్రొనైజ్ అయ్యాయి.',
    // Mobile Supervisor Review & Digital Sign-Off (MOBILE-09)
    reviewCenterTitle: 'సమీక్ష & డిజిటల్ సంతకం కేంద్రం',
    reviewCenterSubtitle: 'పర్యవేక్షణ ధృవీకరణ, విధులను వేరుచేయడం & డిజిటల్ సంతకం',
    pendingReviewTab: 'సమీక్ష పెండింగ్‌లో ఉంది',
    urgentReviewsTab: 'అత్యవసరం',
    overdueReviewsTab: 'గడువు ముగిసింది',
    returnedReviewsTab: 'దిద్దుబాటు కోసం పంపబడింది',
    approvedReviewsTab: 'ఆమోదించబడింది',
    rejectedReviewsTab: 'తిరస్కరించబడింది',
    allReviewsTab: 'అన్నీ',
    reviewActionBtn: 'సమీక్షించి నిర్ణయించండి',
    approveAndSignOffBtn: 'ఆమోదించి సంతకం చేయండి',
    returnForCorrectionBtn: 'దిద్దుబాటు కోసం తిరిగి పంపండి',
    rejectReviewBtn: 'తిరస్కరించండి',
    confirmApprovalTitle: 'డిజిటల్ సంతకాన్ని నిర్ధారించండి',
    confirmApprovalNotice: 'కొనసాగడం ద్వారా, ధృవీకరించదగిన డిజిటల్ సంతకం మరియు సర్వర్ ఆడిట్ రికార్డ్ శాశ్వతంగా భద్రపరచబడుతుంది.',
    sodBlockedWarning: 'బాధ్యతల విభజన: మీ స్వంత సమర్పణను మీరే ఆమోదించలేరు.',
    mandatoryRejectionReasonPrompt: 'తప్పనిసరి తిరస్కరణ కారణం',
    rejectionReasonPlaceholder: 'తిరస్కరణ కోసం నిర్దిష్ట చట్టబద్ధమైన లేదా కార్యాచరణ కారణాలను నమోదు చేయండి...',
    returnReasonPrompt: 'తిరిగి పంపడం & దిద్దుబాటు కారణం',
    returnReasonPlaceholder: 'ఏ సాక్ష్యం లేదా డేటాను సరిదిద్దాలి లేదా జోడించాలో వివరించండి...',
    resubmitReviewBtn: 'పనిని మళ్లీ సమర్పించండి',
    resubmitNotesPrompt: 'దిద్దుబాటు & సవరణ వివరాలు',
    resubmitNotesPlaceholder: 'చేసిన మార్పులు మరియు అదనపు సాక్ష్యాలను వివరించండి...',
    digitalSignOffRecorded: 'డిజిటల్ సంతకం నమోదు చేయబడింది',
    serverAuditChained: 'సర్వర్ ఆడిట్ రికార్డ్ నమోదు చేయబడింది',
    evidenceSha256Fingerprint: 'SHA-256 ట్యాంపర్-ఎవిడెంట్ వేలిముద్ర',
    surveyedMineLocation: 'సర్వే చేయబడిన గని కోఆర్డినేట్',
    actualGpsLocation: 'ప్రత్యక్ష వాస్తవ GPS కోఆర్డినేట్',
    auditTimelineTitle: 'ఆడిట్ మరియు సమీక్ష కాలక్రమం',
    dgmsChecklistReview: 'DGMS చట్టబద్ధమైన పరిశీలనలు & చెక్‌లిస్ట్',
    noReviewsFound: 'ఎంచుకున్న ప్రమాణాలకు సరిపోలే సమీక్ష అంశాలు లేవు.',
    loadingReviewDetails: 'సమీక్ష సందర్భం & సాక్ష్యాలు లోడ్ అవుతున్నాయి...',
    reviewDecisionSuccess: 'సమీక్ష నిర్ణయం విజయవంతంగా నమోదు చేయబడింది.',
    resourceDetailsTitle: 'వనరు గుర్తింపు & పరిధి',
    submitterInfoTitle: 'సమర్పకుడు & ఇన్‌స్పెక్టర్ వివరాలు',
    observationsNotesTitle: 'ఫీల్డ్ పరిశీలనలు & DGMS ఫలితాలు',
    evidenceGalleryTitle: 'క్రిప్టోగ్రాఫిక్ ఫీల్డ్ సాక్ష్యాల గ్యాలరీ',
    relatedGovernanceTitle: 'లింక్ చేయబడిన గవర్నెన్స్ & రిస్క్ ఇంటెలిజెన్స్',
    fieldDocuments: 'ఫీల్డ్ పత్రాలు మరియు చట్టబద్ధమైన రికార్డులు',
    documentsSubtitle: 'అధికారిక DGMS నిబంధనలు, గని డోసియర్లు మరియు ఫీల్డ్ రికార్డులు',
    statutoryTab: 'చట్టబద్ధమైన చట్టాలు',
    mineOperationalTab: 'గని ఆపరేషనల్',
    ocrVerifiedTab: 'OCR ధృవీకరించబడింది',
    pendingVerificationTab: 'సమీక్ష పెండింగ్‌లో ఉంది',
    searchDocumentsPlaceholder: 'నిబంధనలు, సర్క్యులర్లు, చలానాలు లేదా రికార్డులను శోధించండి...',
    openDocumentBtn: 'పత్రాన్ని తెరవండి',
    viewRequirementBtn: 'నియమాన్ని చూడండి',
    statutoryRequirementTitle: 'చట్టబద్ధమైన సమ్మతి ఆవశ్యకత',
    verbatimStatutoryText: 'అసలు చట్టబద్ధమైన నియమం సారాంశం',
    sourceProvenanceTitle: 'మూల మూలం & క్రిప్టోగ్రాఫిక్ వేలిముద్ర',
    sourceTier: 'మూల శ్రేణి',
    issuingOrganization: 'జారీ చేసిన సంస్థ',
    effectiveDate: 'అమలు తేదీ',
    statutoryRef: 'చట్టబద్ధమైన సూచన',
    textNativeExtraction: 'టెక్స్ట్-నేటివ్ స్ట్రీమ్',
    ocrExtraction: 'OCR సంగ్రహించిన స్ట్రీమ్',
    humanVerifiedBadge: 'అధికారి ధృవీకరించారు',
    humanReviewRequiredBadge: 'మానవ సమీక్ష అవసరం',
    staleDocumentNotice: 'పాత మూలం (ఆఫ్‌లైన్ కాష్ > 7 రోజులు)',
    offlineAvailableNotice: 'ఆఫ్‌లైన్‌లో అందుబాటులో ఉంది',
    connectionRequiredNotice: 'పూర్తి స్ట్రీమ్ కోసం కనెక్షన్ అవసరం',
    searchInsideDocPlaceholder: 'పత్రంలో కీవర్డ్‌లను శోధించండి...',
    noDocumentsFound: 'ఎంచుకున్న ప్రమాణాలకు సరిపోలే పత్రాలు లేవు.',
    loadingDocumentDetails: 'పత్రం స్ట్రీమ్ & మూల వివరాలు లోడ్ అవుతున్నాయి...',
    pageNavigation: 'పేజీ',
    ofWord: 'లో',
    nextPage: 'తదుపరి పేజీ',
    prevPage: 'మునుపటి పేజీ',
    copySha256Fingerprint: 'SHA-256 హాష్ కాపీ చేయండి',
    hashCopiedTooltip: 'SHA-256 వేలిముద్ర కాపీ చేయబడింది!',
    verifiedByOfficer: 'మానవ అధికారి ధృవీకరించారు',
    documentFieldsTitle: 'సంగ్రహించిన ఆపరేషనల్ ఫీల్డ్‌లు',
    // Mobile Workforce, Attendance & Shift Handover (MOBILE-11)
    mobileWorkforceTitle: 'కార్మిక శక్తి & షిఫ్ట్ హ్యాండోవర్',
    mobileWorkforceSubtitle: 'చట్టబద్ధమైన హాజరు రిజిస్టర్, షిఫ్ట్ కేటాయింపులు మరియు డిజిటల్ హ్యాండోవర్ లాగ్‌లు.',
    currentShiftTitle: 'ప్రస్తుత కార్యాచరణ షిఫ్ట్',
    activeShiftWindow: 'కాన్ఫిగర్ చేయబడిన షిఫ్ట్ విండో',
    totalAssignedWorkers: 'కేటాయించిన కార్మికులు',
    presentWorkers: 'హాజరయ్యారు',
    absentWorkers: 'గైర్హాజరు',
    onLeaveWorkers: 'సెలవులో ఉన్నారు',
    pendingAttendance: 'పెండింగ్',
    offDutyWorkers: 'డ్యూటీ ముగిసింది',
    markPresent: 'హాజరుగా గుర్తించండి',
    markAbsent: 'గైర్హాజరుగా గుర్తించండి',
    markLeave: 'సెలవుగా గుర్తించండి',
    markOffDuty: 'ఆఫ్ డ్యూటీగా గుర్తించండి',
    recordAttendanceBtn: 'హాజరును రికార్డ్ చేయండి',
    correctAttendanceBtn: 'స్థితిని సరిదిద్దండి',
    attendanceCorrectionTitle: 'హాజరు సవరణ',
    correctionReasonLabel: 'తప్పనిసరి సవరణ కారణం',
    correctionReasonPlaceholder: 'మస్టర్ రోల్ సవరణ కోసం అధికారిక కారణాన్ని నమోదు చేయండి...',
    manualAttendanceBadge: 'మాన్యువల్ రికార్డ్',
    deviceLocationContext: 'పరికర సందర్భం',
    shiftHandoverTab: 'షిఫ్ట్ హ్యాండోవర్',
    rosterTab: 'కార్మికుల రోస్టర్',
    openHandoverItems: 'పెండింగ్ హ్యాండోవర్ అంశాలు',
    createHandoverBtn: 'షిఫ్ట్ హ్యాండోవర్‌ను సృష్టించండి',
    acknowledgeHandoverBtn: 'హ్యాండోవర్‌ను అంగీకరించండి',
    handoverAcknowledgedBadge: 'హ్యాండోవర్ అంగీకరించబడింది',
    handoverSubmittedBadge: 'హ్యాండోవర్ సమర్పించబడింది',
    handoverNotesPlaceholder: 'షిఫ్ట్ కార్యకలాపాల సారాంశం, కొనసాగుతున్న బెంచ్ పనులు లేదా పరికరాల గమనికలను నమోదు చేయండి...',
    safetyNotesPlaceholder: 'భద్రతా పరిశీలనలు, వెంటిలేషన్ స్థితి లేదా పర్యావరణ హెచ్చరికలను నమోదు చేయండి...',
    outgoingShift: 'ముగిసే షిఫ్ట్',
    incomingShift: 'తదుపరి షిఫ్ట్',
    overdueTasks: 'గడువు ముగిసిన పనులు',
    pendingInspections: 'పెండింగ్ తనిఖీలు',
    criticalAlerts: 'కీలక హెచ్చరికలు',
    environmentalObs: 'పర్యావరణ గమనికలు',
    dataPrivacyNotice: 'గోప్యత రక్షించబడింది: ప్రత్యక్ష వ్యక్తిగత ఫోన్, బ్యాంకింగ్ మరియు ఆధార్ నంబర్లు తొలగించబడ్డాయి.',
    noBiometricDisclaimer: 'చట్టబద్ధమైన పాలన రికార్డు: అధికారం కలిగిన పర్యవేక్షకులు మాన్యువల్‌గా హాజరును రికార్డ్ చేస్తారు. పరికర కోఆర్డినేట్‌లు సందర్భోచిత మెటాడేటాగా మాత్రమే సేవ్ చేయబడతాయి.',
    offlineAttendanceSaved: 'హాజరు స్థానికంగా సేవ్ చేయబడింది — సర్వర్ నిర్ధారణ పెండింగ్‌లో ఉంది.',
    offlineHandoverSaved: 'షిఫ్ట్ హ్యాండోవర్ స్థానికంగా సేవ్ చేయబడింది — సర్వర్ నిర్ధారణ పెండింగ్‌లో ఉంది.',
    // Mobile Field Reporting (MOBILE-12)
    fieldReportingTitle: 'ఫీల్డ్ రిపోర్టింగ్',
    fieldReportingSubtitle: 'ఉత్పత్తి, పర్యావరణ & చట్టబద్ధమైన సమ్మతి పరిశీలన నమోదు',
    productionReportTab: 'ఉత్పత్తి',
    environmentObservationTab: 'పర్యావరణం',
    complianceObservationTab: 'సమ్మతి',
    plannedQuantityLabel: 'ప్రణాళిక పరిమాణం',
    actualQuantityLabel: 'వాస్తవ నమోదైన పరిమాణం',
    varianceLabel: 'వ్యత్యాసం (Variance)',
    coalGradeLabel: 'బొగ్గు గ్రేడ్ / నాణ్యత',
    materialTypeLabel: 'మెటీరియల్ రకం',
    provenanceLabel: 'డేటా మూలం / ప్రామాణికత',
    provenanceManual: 'మాన్యువల్ ఎంట్రీ',
    provenanceSensor: 'సెన్సార్ ఆధారితం',
    provenanceImported: 'బాహ్య దిగుమతి',
    provenanceSimulated: 'సిమ్యులేటెడ్ డెమో',
    locationSourceLabel: 'స్థాన సందర్భం',
    locationActualGps: 'వాస్తవ GPS',
    locationSurveyed: 'సర్వే చేసిన మైన్ కోఆర్డినేట్',
    statutoryRuleLabel: 'చట్టబద్ధమైన నియమ సూచన',
    thresholdLimitLabel: 'కాన్ఫిగర్ చేసిన పరిమితి',
    observedValueLabel: 'పరిశీలించిన కొలత',
    noConfiguredRuleNotice: 'ఈ పారామీటర్ కోసం ఎటువంటి చట్టబద్ధమైన పరిమితి నియమం కాన్ఫిగర్ చేయబడలేదు.',
    thresholdExceededNotice: 'పరిమితి మించిపోయింది — పర్యవేక్షకుడి సమీక్ష అవసరం.',
    thresholdWithinLimitNotice: 'కాన్ఫిగర్ చేసిన పర్యావరణ భద్రతా పరిమితిలో ఉంది.',
    cmrRegulationLabel: 'DGMS / CMR 2017 నిబంధన',
    violationTitleLabel: 'పరిశీలన / నిబంధన ఉల్లంఘన శీర్షిక',
    violationDescriptionLabel: 'వివరణాత్మక పరిశీలన వివరణ',
    correctiveActionLabel: 'ప్రతిపాదిత దిద్దుబాటు చర్య',
    remedialDeadlineLabel: 'పరిష్కార గడువు తేదీ',
    statutoryDisclaimerText: 'చట్టబద్ధమైన పాలన: త్రినేత్ర మూల ప్రామాణికతతో ఫీల్డ్ పరిశీలనలను రికార్డ్ చేస్తుంది. చట్టపరమైన నిర్ధారణలకు అధికారులే ప్రామాణికం.',
    environmentalDisclaimerText: 'కార్యాచరణ పర్యావరణ లాగ్: సెన్సార్ మరియు మాన్యువల్ రీడింగ్‌లు సందర్భోచితమైనవి మరియు NABL ల్యాబ్ ధృవీకరణ లేకుండా చట్టబద్ధమైన అనుమతికి సర్టిఫైడ్ కావు.',
    productionDisclaimerText: 'మైన్ డిస్పాచ్ & షిఫ్ట్ ఉత్పత్తి రికార్డు: డిజిటల్ సైన్-ఆఫ్ మరియు ఆడిట్ చైనింగ్ కోసం రికార్డులు మైన్ మేనేజర్‌కు వెళ్తాయి.',
    savedOfflinePendingSync: 'స్థానికంగా సేవ్ చేయబడింది — సర్వర్ సింక్రొనైజేషన్ పెండింగ్‌లో ఉంది.',
    submitForSupervisorReview: 'పర్యవేక్షకుడి సమీక్ష & సైన్-ఆఫ్ కోసం సమర్పించండి',
    reportingSummaryTitle: 'షిఫ్ట్ రిపోర్టింగ్ స్థితి',
    reportsSubmittedCount: 'ఉత్పత్తి నివేదికలు',
    activeObservationsCount: 'క్రియాశీల పరిశీలనలు',
    openViolationsCount: 'తెరిచిన ఉల్లంఘనలు',
    recordProductionBtn: 'ఉత్పత్తి లాగ్‌ను నమోదు చేయండి',
    recordEnvObservationBtn: 'పర్యావరణ రీడింగ్‌ను లాగ్ చేయండి',
    recordViolationBtn: 'సమ్మతి పరిశీలనను లాగ్ చేయండి',
    evidenceAttachmentTitle: 'జోడించిన ఫోటోగ్రాఫిక్ / ఫీల్డ్ సాక్ష్యం',
    notesRemarksLabel: 'కార్యాచరణ వ్యాఖ్యలు / ఫీల్డ్ గమనికలు',
    unitLabel: 'కొలత యూనిట్',
    // Mobile Contractor Field Operations & SLA Management (MOBILE-13)
    contractorsFieldTitle: 'కాంట్రాక్టర్ కార్యకలాపాలు & SLA',
    contractorsFieldSubtitle: 'కాంట్రాక్ట్ ధృవీకరణ, SLA ట్రాకింగ్ మరియు దిద్దుబాటు పాలన',
    contractsTab: 'కాంట్రాక్ట్‌లు',
    requirementsTab: 'SLA & అవసరాలు',
    contractorVerificationQueueTab: 'ధృవీకరణ క్యూ',
    totalContractorsCount: 'నమోదైన విక్రేతలు',
    activeContractsCount: 'క్రియాశీల కాంట్రాక్ట్‌లు',
    overdueRequirementsCount: 'గడువు ముగిసిన SLA అంశాలు',
    pendingVerificationsCount: 'పెండింగ్ ధృవీకరణలు',
    contractorCodeLabel: 'వెండర్ కోడ్',
    workScopeLabel: 'పని పరిధి',
    contractValueLabel: 'కాంట్రాక్ట్ విలువ',
    validityPeriodLabel: 'చెల్లుబాటు కాలం',
    slaStatusLabel: 'SLA సమ్మతి స్థితి',
    slaOnTrack: 'సమయానికి ఉంది',
    slaDueSoon: 'త్వరలో గడువు',
    slaOverdue: 'SLA ఉల్లంఘన / గడువు దాటింది',
    slaExpired: 'చెల్లుబాటు గడువు ముగిసింది',
    slaCompliant: 'అవసరం ధృవీకరించబడింది',
    verifyRequirementBtn: 'అవసరాన్ని ధృవీకరించండి',
    recordIssueBtn: 'కాంట్రాక్టర్ సమస్యను నమోదు చేయండి',
    verificationModalTitle: 'ఫీల్డ్ అవసరాల ధృవీకరణ',
    contractorDisclaimerText: 'కాంట్రాక్టర్ పాలన: త్రినేత్ర ఫీల్డ్ SLA సమ్మతి మరియు ఆడిట్ చైనింగ్‌ను అమలు చేస్తుంది. కాంట్రాక్ట్ ధృవీకరణ చట్టబద్ధమైన గని అనుమతులకు ప్రత్యామ్నాయం కాదు.',
    offlineContractorSaved: 'ధృవీకరణ ఆఫ్‌లైన్‌లో సేవ్ చేయబడింది — trinetra_field_sync_queue లో క్యూ చేయబడింది.',
    contractDetailTitle: 'కాంట్రాక్ట్ ఒప్పందం వివరాలు',
    requirementDetailTitle: 'అవసరాల సమ్మతి వివరణ',
    createCorrectiveTaskLabel: 'దిద్దుబాటు టాస్క్ సృష్టించండి (పాలన క్యూ)',
    assigneeRoleLabel: 'బాధ్యతాయుతమైన పాత్ర / హోదా',
    remedialActionPlanLabel: 'పరిష్కార కార్యాచరణ ప్రణాళిక',
    // Mobile Grievance Field Operations (MOBILE-14)
    grievancesFieldTitle: 'ఫిర్యాదులు & కార్మికుల సమస్యలు',
    grievancesFieldSubtitle: 'PGRM పరిష్కారం, ఫీల్డ్ వాస్తవ పరిశీలన & పాలన',
    allGrievancesTab: 'అన్ని సమస్యలు',
    myAssignmentsTab: 'నాకు కేటాయించినవి',
    investigationQueueTab: 'విచారణ క్యూ',
    resolvedGrievancesTab: 'పరిష్కరించబడినవి',
    totalGrievancesCount: 'మొత్తం నమోదైనవి',
    openGrievancesCount: 'క్రియాశీల సమస్యలు',
    investigationRequiredCount: 'చర్య అవసరం',
    overdueGrievancesCount: 'SLA ఉల్లంఘన',
    logGrievanceBtn: 'ఫీల్డ్ ఫిర్యాదును నమోదు చేయండి',
    acknowledgeGrievanceBtn: 'రసీదు నమోదు చేయండి',
    assignInvestigatorBtn: 'విచారణాధికారిని కేటాయించండి',
    recordInvestigationBtn: 'క్షేత్రస్థాయి ఫలితాలను నమోదు చేయండి',
    resolveGrievanceBtn: 'పరిష్కారాన్ని సమర్పించండి',
    reopenGrievanceBtn: 'ఫిర్యాదును తిరిగి తెరవండి',
    grievanceDisclaimerText: 'PGRM పరిష్కార పాలన: త్రినేత్ర ఆడిట్ సమగ్రతతో కార్మికులు మరియు ప్రజల ఫిర్యాదులను రికార్డ్ చేస్తుంది. వాస్తవిక రికార్డింగ్ చట్టపరమైన బాధ్యతను లేదా చట్టబద్ధమైన తప్పును నిర్ణయించదు.',
    offlineGrievanceSaved: 'ఫిర్యాదు ఆఫ్‌లైన్‌లో సేవ్ చేయబడింది — trinetra_field_sync_queue లో క్యూ చేయబడింది.',
    grievanceDetailTitle: 'ఫిర్యాదు వివరాలు',
    complainantTypeLabel: 'ఫిర్యాదుదారుడు',
    anonymousComplaint: 'గుర్తుతెలియని కార్మికుడు / పౌరుడు',
    nodalOfficerLabel: 'PGRM నోడల్ అధికారి',
    investigationFindingsLabel: 'క్షేత్ర విచారణ ఫలితాలు',
    actionRequiredLabel: 'చర్య అవసరం',
    resolutionSummaryLabel: 'పరిష్కార సారాంశం',
    // Mobile Field Intelligence & Predictive Risk Actions (MOBILE-15)
    fieldIntelligenceTitle: 'క్షేత్ర ప్రమాద ఇంటెలిజెన్స్',
    fieldIntelligenceSubtitle: 'ముందస్తు 30-నిమిషాల కార్యాచరణ ప్రమాద సూచన, సహాయక సంకేతాలు & క్షేత్ర ధృవీకరణ',
    activeSignalsTab: 'క్రియాశీల సంకేతాలు',
    myVerificationsTab: 'నా ధృవీకరణలు',
    allPredictionsTab: 'అన్ని సంకేతాలు',
    predictedEscalationRisk: 'అంచనా వేసిన తీవ్రత ప్రమాదం',
    modelProvenanceLabel: 'మోడల్ & మూలం',
    verifyInFieldBtn: 'క్షేత్రంలో ధృవీకరించండి',
    recordFieldOutcomeTitle: 'క్షేత్ర పరిశీలన ఫలితాన్ని నమోదు చేయండి',
    outcomeNoIssue: 'ఏ సమస్యా కనిపించలేదు',
    outcomeIssueFound: 'సమస్య కనుగొనబడింది',
    outcomeFurtherReview: 'మరింత సమీక్ష అవసరం',
    createLinkedTaskLabel: 'పరిష్కార టాస్క్ సృష్టించండి (పాలన క్యూ)',
    createLinkedIncidentLabel: 'భద్రతా సంఘటన నమోదు చేయండి',
    dataFreshnessLive: 'లైవ్ టెలిమెట్రీ (LIVE)',
    dataFreshnessStale: 'పాత / నిల్వ చేయబడిన సందర్భం',
    dataFreshnessUnavailable: 'అంచనా అందుబాటులో లేదు',
    simulatedHoldoutNotice: 'సిమ్యులేటెడ్ డెమో టెలిమెట్రీ (హోల్డౌట్ మోడల్ మూల్యాంకనం)',
    pipelineTraceTitle: 'కార్యాచరణ ప్రమాద జీవితచక్రం',
    offlineRiskContextSaved: 'క్షేత్ర ధృవీకరణ స్థానికంగా సేవ్ చేయబడింది — trinetra_field_sync_queue లో క్యూ చేయబడింది.',
    riskDetailHeader: 'అంచనా ప్రమాద సంకేత వివరాలు',
    activeAlertsLabel: 'క్రియాశీల ప్రమాద హెచ్చరికలు',
    horizonMinutesLabel: 'సూచన వ్యవధి',
    escalationProbabilityLabel: 'తీవ్రత సంభావ్యత',
    normalBaselineLabel: 'సాధారణ బేస్‌లైన్',
    statutoryLimitLabel: 'చట్టబద్ధమైన పరిమితి',
    // Cross-Domain Field Command (MOBILE-16)
    fieldCommandTitle: 'ఫీల్డ్ కమాండ్ సెంటర్',
    fieldCommandSubtitle: 'ఏకీకృత క్రాస్-డొమైన్ కార్యాచరణ ఇంటెలిజెన్స్, ప్రాధాన్యత దృష్టి & ఫీల్డ్ ఎగ్జిక్యూషన్ క్యూ',
    myWorkSectionTitle: 'నాకు కేటాయించిన పని',
    nearbySectionTitle: 'సమీపంలోని ఫీల్డ్ ప్రమాదాలు & సందర్భం',
    quickActionsTitle: 'శీఘ్ర ఫీల్డ్ కార్యకలాపాలు',
    sourcePredictiveModel: 'ప్రిడిక్టివ్ రిస్క్ సిగ్నల్',
    sourceIncidentLog: 'భద్రతా సంఘటన',
    sourceTaskQueue: 'పాలన టాస్క్',
    sourceSupervisorReview: 'సూపర్‌వైజర్ సమీక్ష',
    sourceContractorSla: 'కాంట్రాక్టర్ SLA',
    sourcePgrmGrievance: 'PGRM ఫిర్యాదు',
    sourceEnvObservation: 'పర్యావరణ నియమం',
    sourceStatutoryCompliance: 'చట్టబద్ధమైన సమ్మతి',
    relatedRecordsTitle: 'క్రాస్-డొమైన్ లింక్ చేయబడిన రికార్డులు',
    unifiedTimelineTitle: 'క్రిప్టోగ్రాఫిక్ ఆడిట్ & జీవనచక్ర కాలక్రమం',
    noAttentionItems: 'ఫీల్డ్ ఎస్కలేషన్ అవసరమయ్యే అత్యవసర అంశాలు ఏవీ లేవు.',
    noMyWorkItems: 'మీ క్యూలో పెండింగ్ పనులు లేదా తనిఖీలు కేటాయించబడలేదు.',
    noNearbyItems: 'సమీపంలో ఎటువంటి అధిక-ప్రమాదకర అంశాలు గుర్తించబడలేదు.',
    verifyRiskBtn: 'ఫీల్డ్‌లో ధృవీకరించండి',
    reviewItemBtn: 'సమీక్ష & సైన్-ఆఫ్',
    completeTaskBtn: 'టాస్క్ పూర్తి చేయండి',
    investigateGrievanceBtn: 'విచారించండి',
    viewDetailsBtn: 'వివరాలు చూడండి',
    lastSyncLabel: 'చివరి సింక్',
    currentShiftLabel: 'ప్రస్తుత షిఫ్ట్',
    networkStatusLabel: 'నెట్‌వర్క్',
    staleContextWarning: 'సందర్భం 15 నిమిషాల క్రితం నవీకరించబడింది — కాష్ చేయబడిన ఆఫ్-లైన్ డేటా.'
  }
};

