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
  desktopPortalLink: string;
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
    desktopPortalLink: 'Desktop Command Center',
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
    pendingVerificationBadge: 'Pending Review'
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
    desktopPortalLink: 'डेस्कटॉप कमांड सेंटर',
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
    pendingVerificationBadge: 'समीक्षा लंबित'
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
    desktopPortalLink: 'డెస్క్‌టాప్ కమాండ్ సెంటర్',
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
    pendingVerificationBadge: 'సమీక్ష పెండింగ్‌లో ఉంది'
  }
};

