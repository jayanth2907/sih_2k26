export type SupportedLanguage = 'en' | 'hi' | 'te';

export interface Translations {
  appName: string;
  appSubtitle: string;
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
}

export const translations: Record<SupportedLanguage, Translations> = {
  en: {
    appName: 'TRINETRA',
    appSubtitle: 'Mine Governance AI',
    liveDashboard: 'Live Dashboard',
    gisCommandMap: '2D GIS Command Map',
    demoControlCenter: 'Demo Control Center',
    documentIntelligence: 'Document Intelligence & OCR',
    aiRiskIntelligence: 'AI Risk Intelligence',
    aiCopilot: 'AI Governance Copilot',
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
    productionLogs: 'Production Logs',
    workforceMuster: 'Workforce & Muster',
    contractorsSla: 'Contractors & SLA',
    atmosphereEnv: 'Atmosphere & Env',
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
    allStatus: 'ALL STATUS'
  },
  hi: {
    appName: 'त्रिनेत्र (TRINETRA)',
    appSubtitle: 'खदान प्रशासन एवं सुरक्षा AI',
    liveDashboard: 'लाइव डैशबोर्ड',
    gisCommandMap: '2D GIS कमांड मानचित्र',
    demoControlCenter: 'डेमो कंट्रोल सेंटर',
    documentIntelligence: 'दस्तावेज़ इंटेलिजेंस एवं OCR',
    aiRiskIntelligence: 'AI जोखिम विश्लेषण',
    aiCopilot: 'AI गवर्नेंस कोपायलट',
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
    productionLogs: 'उत्पादन विवरण',
    workforceMuster: 'कार्यबल एवं उपस्थिति',
    contractorsSla: 'ठेकेदार एवं SLA',
    atmosphereEnv: 'पर्यावरण एवं गैस निगरानी',
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
    allStatus: 'सभी स्थितियां'
  },
  te: {
    appName: 'త్రినేత్ర (TRINETRA)',
    appSubtitle: 'గనుల పరిపాలన & భద్రత AI',
    liveDashboard: 'లైవ్ డాష్‌బోర్డ్',
    gisCommandMap: '2D GIS కమాండ్ మ్యాప్',
    demoControlCenter: 'డెమో కంట్రోల్ సెంటర్',
    documentIntelligence: 'డాక్యుమెంట్ ఇంటెలిజెన్స్ & OCR',
    aiRiskIntelligence: 'AI ప్రమాద విశ్లేషణ',
    aiCopilot: 'AI గవర్నెన్స్ కోపైలట్',
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
    productionLogs: 'ఉత్పత్తి వివరాలు',
    workforceMuster: 'కార్మికులు & హాజరు',
    contractorsSla: 'కాంట్రాక్టర్లు & SLA',
    atmosphereEnv: 'వాతావరణం & పర్యావరణం',
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
    allStatus: 'అన్ని స్థితులు'
  }
};

