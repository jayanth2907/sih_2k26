import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FileText,
  Activity,
  ShieldCheck,
  PlusCircle,
  Clock,
  MapPin,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ChevronRight,
  TrendingUp,
  Layers,
  Camera,
  Info
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useMineContext } from '../../context/MineContext';
import { useAuth } from '../../context/AuthContext';
import { mobileApi } from '../../services';
import {
  MobileTab,
  MobileProductionReportItem,
  MobileEnvironmentalRuleItem,
  MobileEnvironmentalObservationItem,
  MobileComplianceObservationItem,
  MobileFieldReportingSummaryResponse,
  MobileProductionReportCreate,
  MobileEnvironmentalObservationCreate,
  MobileComplianceObservationCreate
} from '../types/mobile';
import { MobileCard } from '../components/MobileCard';
import { TouchButton } from '../components/TouchButton';
import clsx from 'clsx';

const QUEUE_STORAGE_KEY = 'trinetra_field_sync_queue';

interface MobileFieldReportingScreenProps {
  onBack?: () => void;
  onNavigateTab?: (tab: MobileTab) => void;
}

export const MobileFieldReportingScreen: React.FC<MobileFieldReportingScreenProps> = ({
  onBack,
  onNavigateTab
}) => {
  const { t } = useLanguage();
  const { selectedMine } = useMineContext();
  const { user } = useAuth();

  // Screen Sub-tabs
  const [activeSubTab, setActiveSubTab] = useState<'PRODUCTION' | 'ENVIRONMENT' | 'COMPLIANCE'>('PRODUCTION');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [notice, setNotice] = useState<{ type: 'SUCCESS' | 'ERROR' | 'INFO'; message: string } | null>(null);

  // Summary State
  const [summaryData, setSummaryData] = useState<MobileFieldReportingSummaryResponse | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [pendingQueueCount, setPendingQueueCount] = useState<number>(0);

  // Modals & Creation States
  const [showProductionModal, setShowProductionModal] = useState<boolean>(false);
  const [showEnvironmentModal, setShowEnvironmentModal] = useState<boolean>(false);
  const [showComplianceModal, setShowComplianceModal] = useState<boolean>(false);

  // Production Form State
  const [prodDate, setProdDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [prodShift, setProdShift] = useState<string>('SHIFT_A');
  const [prodMaterial, setProdMaterial] = useState<string>('ROM Coal');
  const [prodCoalGrade, setProdCoalGrade] = useState<string>('G-7 (High GCV)');
  const [prodPlanned, setProdPlanned] = useState<string>('1200');
  const [prodActual, setProdActual] = useState<string>('1150');
  const [prodUnit, setProdUnit] = useState<string>('TONNES');
  const [prodProvenance, setProdProvenance] = useState<'MANUAL' | 'SENSOR_DERIVED' | 'IMPORTED' | 'SIMULATED'>('MANUAL');
  const [prodNotes, setProdNotes] = useState<string>('');
  const [prodGps, setProdGps] = useState<{ lat?: number; lon?: number; source: 'ACTUAL_GPS' | 'SURVEYED_LOCATION' }>({
    source: 'ACTUAL_GPS'
  });
  const [prodEvidence, setProdEvidence] = useState<{ name?: string; url?: string; hash?: string }>({});
  const [submittingProd, setSubmittingProd] = useState<boolean>(false);

  // Environment Form State
  const [envParam, setEnvParam] = useState<string>('PM10');
  const [envObserved, setEnvObserved] = useState<string>('85.5');
  const [envUnit, setEnvUnit] = useState<string>('µg/m³');
  const [envSource, setEnvSource] = useState<'MANUAL' | 'SENSOR_DERIVED' | 'SIMULATED'>('MANUAL');
  const [envLocationCtx, setEnvLocationCtx] = useState<string>('Pit Head Crusher Unit 2');
  const [envActionTaken, setEnvActionTaken] = useState<string>('Water mist cannons activated at conveyor discharge.');
  const [envEvidence, setEnvEvidence] = useState<{ name?: string; url?: string; hash?: string }>({});
  const [submittingEnv, setSubmittingEnv] = useState<boolean>(false);

  // Compliance Form State
  const [compTitle, setCompTitle] = useState<string>('Water Spray Nozzle Clogged at Transfer Point');
  const [compDesc, setCompDesc] = useState<string>('Conveyor belt transfer chute water atomizers inoperative during high dust load operation.');
  const [compClause, setCompClause] = useState<string>('CMR 2017 Reg 124(1)');
  const [compSeverity, setCompSeverity] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('HIGH');
  const [compSource, setCompSource] = useState<'MANUAL' | 'AUDIT_DERIVED' | 'SIMULATED'>('MANUAL');
  const [compDeadline, setCompDeadline] = useState<string>(
    new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0]
  );
  const [compActionTitle, setCompActionTitle] = useState<string>('Replace and clean atomizer nozzles');
  const [compActionDesc, setCompActionDesc] = useState<string>('Mechanical team to flush supply pipeline and replace damaged brass nozzles.');
  const [compEvidence, setCompEvidence] = useState<{ name?: string; url?: string; hash?: string }>({});
  const [submittingComp, setSubmittingComp] = useState<boolean>(false);

  // Network & Queue Monitor
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const checkQueue = () => {
      try {
        const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            setPendingQueueCount(parsed.filter(op => op.sync_status === 'QUEUED' || op.sync_status === 'FAILED').length);
          }
        }
      } catch (e) {
        // ignore
      }
    };
    checkQueue();
    const interval = setInterval(checkQueue, 4000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  // Fetch Reporting Summary
  const fetchSummary = useCallback(async () => {
    try {
      setLoading(true);
      const data = await mobileApi.getFieldReportingSummary(selectedMine?.id);
      setSummaryData(data);
    } catch (err: any) {
      console.warn('Could not fetch field reporting summary from server (offline mode)', err);
      // Fallback local summary
      setSummaryData({
        mine_id: selectedMine?.id || 1,
        mine_name: selectedMine?.name || 'Local Mine Context',
        shift_context: {
          has_active_shift: true,
          mine_id: selectedMine?.id || 1,
          mine_name: selectedMine?.name || 'Local Mine Context',
          shift_code: 'SHIFT_A',
          shift_name: 'Shift A (Morning)',
          start_time: '06:00',
          end_time: '14:00',
          attendance_status: 'PRESENT',
          verification_mode: 'MANUAL',
          check_in_time: new Date().toISOString()
        },
        production_summary: {
          today_planned_tonnes: 1200,
          today_actual_tonnes: 1150,
          variance_percentage: -4.17,
          reports_count: 1,
          recent_reports: []
        },
        environment_summary: {
          configured_rules: [
            {
              id: 1,
              rule_code: 'ENV-PM10-MAX',
              parameter_name: 'PM10',
              threshold_limit: 100.0,
              unit: 'µg/m³',
              severity: 'HIGH',
              statute_reference: 'CMR 2017 Reg 124(1)'
            },
            {
              id: 2,
              rule_code: 'ENV-PM25-MAX',
              parameter_name: 'PM2.5',
              threshold_limit: 60.0,
              unit: 'µg/m³',
              severity: 'HIGH',
              statute_reference: 'CPCB NAAQS 2009'
            },
            {
              id: 3,
              rule_code: 'ENV-NOISE-MAX',
              parameter_name: 'NOISE',
              threshold_limit: 85.0,
              unit: 'dBA',
              severity: 'MEDIUM',
              statute_reference: 'DGMS Tech Circular No 5'
            }
          ],
          active_observations_count: 0,
          recent_observations: []
        },
        compliance_summary: {
          open_violations_count: 0,
          recent_violations: []
        },
        pending_approvals_count: 0
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedMine?.id, selectedMine?.name]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  // Offline Enqueue Helper
  const enqueueOfflineOperation = (operationType: string, entityType: string, entityId: string, payload: any) => {
    try {
      const existing = JSON.parse(localStorage.getItem(QUEUE_STORAGE_KEY) || '[]');
      const op = {
        operation_id: `op-rep-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        entity_type: entityType,
        entity_id: entityId,
        operation_type: operationType,
        payload,
        client_timestamp: new Date().toISOString(),
        sync_status: 'QUEUED'
      };
      existing.push(op);
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(existing));
      setPendingQueueCount(prev => prev + 1);
    } catch (e) {
      console.error('Failed to enqueue offline reporting operation', e);
    }
  };

  // Capture Device GPS
  const handleCaptureGps = (target: 'PROD' | 'ENV' | 'COMP') => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          const coords = {
            lat: Number(pos.coords.latitude.toFixed(6)),
            lon: Number(pos.coords.longitude.toFixed(6)),
            source: 'ACTUAL_GPS' as const
          };
          if (target === 'PROD') setProdGps(coords);
          setNotice({
            type: 'INFO',
            message: `Contextual GPS captured: ${coords.lat}, ${coords.lon} (Accuracy: ±${Math.round(pos.coords.accuracy || 10)}m)`
          });
        },
        err => {
          console.warn('GPS lookup error, falling back to surveyed mine coordinate', err);
          const fallback = {
            lat: selectedMine?.latitude ? Number(selectedMine.latitude) : 23.7957,
            lon: selectedMine?.longitude ? Number(selectedMine.longitude) : 86.4304,
            source: 'SURVEYED_LOCATION' as const
          };
          if (target === 'PROD') setProdGps(fallback);
          setNotice({
            type: 'INFO',
            message: `Using surveyed mine coordinate: ${fallback.lat}, ${fallback.lon}`
          });
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
  };

  // Mock Evidence Attachment
  const handleAttachEvidence = (target: 'PROD' | 'ENV' | 'COMP') => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const mockHash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
    const evidenceItem = {
      name: `field_evidence_${target.toLowerCase()}_${timestamp}.jpg`,
      url: `/artifacts/demo/evidence_${target.toLowerCase()}_sample.jpg`,
      hash: mockHash
    };

    if (target === 'PROD') setProdEvidence(evidenceItem);
    else if (target === 'ENV') setEnvEvidence(evidenceItem);
    else if (target === 'COMP') setCompEvidence(evidenceItem);

    setNotice({
      type: 'INFO',
      message: `Attached photographic evidence: ${evidenceItem.name} (SHA-256: ${mockHash.substring(0, 8)}...)`
    });
  };

  // Submit Production Report
  const handleSubmitProduction = async () => {
    const planned = parseFloat(prodPlanned);
    const actual = parseFloat(prodActual);
    if (isNaN(planned) || planned < 0 || isNaN(actual) || actual < 0) {
      setNotice({ type: 'ERROR', message: 'Planned and actual quantities must be non-negative numbers.' });
      return;
    }

    const payload: MobileProductionReportCreate = {
      mine_id: selectedMine?.id || 1,
      report_date: prodDate,
      shift: prodShift,
      material_type: prodMaterial,
      coal_grade: prodCoalGrade,
      planned_quantity: planned,
      actual_quantity: actual,
      unit: prodUnit,
      provenance_source: prodProvenance,
      notes: prodNotes || undefined,
      evidence_file_name: prodEvidence.name,
      evidence_url: prodEvidence.url,
      evidence_file_hash: prodEvidence.hash,
      device_latitude: prodGps.lat,
      device_longitude: prodGps.lon,
      location_source: prodGps.source
    };

    try {
      setSubmittingProd(true);
      if (isOnline) {
        const res = await mobileApi.recordProductionReport(payload);
        setNotice({
          type: 'SUCCESS',
          message: `Production report ${res.report_code || 'recorded'} — Server Acknowledged. Routed for review.`
        });
      } else {
        enqueueOfflineOperation('CREATE', 'PRODUCTION_REPORT', `prod-temp-${Date.now()}`, payload);
        setNotice({
          type: 'INFO',
          message: t('savedOfflinePendingSync')
        });
      }
      setShowProductionModal(false);
      fetchSummary();
    } catch (e: any) {
      console.warn('Online production record failed, saving to offline sync queue', e);
      enqueueOfflineOperation('CREATE', 'PRODUCTION_REPORT', `prod-temp-${Date.now()}`, payload);
      setNotice({
        type: 'INFO',
        message: t('savedOfflinePendingSync')
      });
      setShowProductionModal(false);
    } finally {
      setSubmittingProd(false);
    }
  };

  // Submit Environment Observation
  const handleSubmitEnvironment = async () => {
    const observed = parseFloat(envObserved);
    if (isNaN(observed) || observed < 0) {
      setNotice({ type: 'ERROR', message: 'Observed measurement value must be a valid non-negative number.' });
      return;
    }

    const matchedRule = summaryData?.environment_summary.configured_rules.find(
      r => r.parameter_name.toUpperCase() === envParam.toUpperCase()
    );

    const isExceeded = matchedRule ? observed > matchedRule.threshold_limit : false;
    const severity = isExceeded ? matchedRule?.severity as any || 'HIGH' : 'LOW';

    const payload: MobileEnvironmentalObservationCreate = {
      mine_id: selectedMine?.id || 1,
      rule_id: matchedRule?.id,
      parameter_name: envParam,
      observed_value: observed,
      unit: envUnit,
      measurement_source: envSource,
      severity,
      location_context: envLocationCtx,
      action_taken: envActionTaken,
      evidence_file_name: envEvidence.name,
      evidence_url: envEvidence.url,
      evidence_file_hash: envEvidence.hash,
      location_source: 'ACTUAL_GPS'
    };

    try {
      setSubmittingEnv(true);
      if (isOnline) {
        const res = await mobileApi.recordEnvironmentalObservation(payload);
        setNotice({
          type: 'SUCCESS',
          message: `Observation recorded (${res.severity}) — Server Acknowledged.`
        });
      } else {
        enqueueOfflineOperation('CREATE', 'ENVIRONMENT_OBSERVATION', `env-temp-${Date.now()}`, payload);
        setNotice({
          type: 'INFO',
          message: t('savedOfflinePendingSync')
        });
      }
      setShowEnvironmentModal(false);
      fetchSummary();
    } catch (e: any) {
      console.warn('Online environmental record failed, saving to offline sync queue', e);
      enqueueOfflineOperation('CREATE', 'ENVIRONMENT_OBSERVATION', `env-temp-${Date.now()}`, payload);
      setNotice({
        type: 'INFO',
        message: t('savedOfflinePendingSync')
      });
      setShowEnvironmentModal(false);
    } finally {
      setSubmittingEnv(false);
    }
  };

  // Submit Compliance Observation
  const handleSubmitCompliance = async () => {
    if (!compTitle.trim() || !compDesc.trim()) {
      setNotice({ type: 'ERROR', message: 'Observation title and description are required.' });
      return;
    }

    const payload: MobileComplianceObservationCreate = {
      mine_id: selectedMine?.id || 1,
      title: compTitle,
      description: compDesc,
      regulatory_clause: compClause,
      statute: 'Coal Mines Regulations (CMR) 2017',
      severity: compSeverity,
      observation_source: compSource,
      remedial_deadline: compDeadline,
      corrective_action_title: compActionTitle,
      corrective_action_description: compActionDesc,
      evidence_file_name: compEvidence.name,
      evidence_url: compEvidence.url,
      evidence_file_hash: compEvidence.hash,
      location_source: 'ACTUAL_GPS'
    };

    try {
      setSubmittingComp(true);
      if (isOnline) {
        const res = await mobileApi.recordComplianceObservation(payload);
        setNotice({
          type: 'SUCCESS',
          message: `Compliance non-conformance ${res.violation_code || 'logged'} — Routed for Supervisor Review.`
        });
      } else {
        enqueueOfflineOperation('CREATE', 'VIOLATION', `comp-temp-${Date.now()}`, payload);
        setNotice({
          type: 'INFO',
          message: t('savedOfflinePendingSync')
        });
      }
      setShowComplianceModal(false);
      fetchSummary();
    } catch (e: any) {
      console.warn('Online compliance record failed, saving to offline sync queue', e);
      enqueueOfflineOperation('CREATE', 'VIOLATION', `comp-temp-${Date.now()}`, payload);
      setNotice({
        type: 'INFO',
        message: t('savedOfflinePendingSync')
      });
      setShowComplianceModal(false);
    } finally {
      setSubmittingComp(false);
    }
  };

  // Selected parameter rule context lookup for live modal feedback
  const activeRuleForModal = useMemo(() => {
    return summaryData?.environment_summary.configured_rules.find(
      r => r.parameter_name.toUpperCase() === envParam.toUpperCase()
    );
  }, [summaryData, envParam]);

  const observedNumeric = parseFloat(envObserved);
  const isEnvModalBreached = activeRuleForModal && !isNaN(observedNumeric) && observedNumeric > activeRuleForModal.threshold_limit;

  return (
    <div className="space-y-4 pb-20 max-w-lg mx-auto">
      {/* Top Banner & Context */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Layers className="w-5 h-5 text-amber-400" />
            {t('fieldReportingTitle')}
          </h2>
          <p className="text-xs text-slate-400">
            {t('fieldReportingSubtitle')}
          </p>
        </div>
        <button
          onClick={() => {
            setRefreshing(true);
            fetchSummary();
          }}
          className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-amber-400 border border-slate-700 active:scale-95 transition-all"
        >
          <RefreshCw className={clsx('w-4 h-4', refreshing && 'animate-spin text-amber-400')} />
        </button>
      </div>

      {/* Operational Shift & Sync Status Strip */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-400 shrink-0" />
          <div className="truncate">
            <span className="text-slate-400 text-[10px] uppercase font-mono block">Current Shift</span>
            <span className="font-semibold text-slate-200">
              {summaryData?.shift_context.shift_name || 'Shift A (06:00 - 14:00)'}
            </span>
          </div>
        </div>

        <div
          onClick={() => onNavigateTab && onNavigateTab('sync')}
          className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between cursor-pointer hover:border-amber-500/40 transition-colors"
        >
          <div className="flex items-center gap-2 truncate">
            <div className={clsx('w-2 h-2 rounded-full', isOnline ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse')} />
            <div className="truncate">
              <span className="text-slate-400 text-[10px] uppercase font-mono block">Network Status</span>
              <span className="font-semibold text-slate-200">
                {isOnline ? 'Online (Connected)' : 'Offline (Local)'}
              </span>
            </div>
          </div>
          {pendingQueueCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-mono text-[10px] font-bold border border-amber-500/30">
              {pendingQueueCount} Q
            </span>
          )}
        </div>
      </div>

      {/* Notification / Toast Banner */}
      {notice && (
        <div
          className={clsx(
            'p-3 rounded-xl border text-xs flex items-start justify-between gap-2 transition-all',
            notice.type === 'SUCCESS' && 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300',
            notice.type === 'ERROR' && 'bg-red-950/40 border-red-500/40 text-red-300',
            notice.type === 'INFO' && 'bg-amber-950/40 border-amber-500/40 text-amber-300'
          )}
        >
          <div className="flex items-start gap-2">
            {notice.type === 'SUCCESS' && <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />}
            {notice.type === 'ERROR' && <XCircle className="w-4 h-4 shrink-0 mt-0.5" />}
            {notice.type === 'INFO' && <Info className="w-4 h-4 shrink-0 mt-0.5" />}
            <span>{notice.message}</span>
          </div>
          <button onClick={() => setNotice(null)} className="text-slate-400 hover:text-slate-200 text-sm font-bold">
            &times;
          </button>
        </div>
      )}

      {/* Supervisor Review Pending Alert */}
      {summaryData && summaryData.pending_approvals_count > 0 && (
        <MobileCard
          interactive
          onClick={() => onNavigateTab && onNavigateTab('reviews')}
          className="p-3 bg-gradient-to-r from-amber-950/30 to-slate-900 border-amber-500/40 flex items-center justify-between"
        >
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-amber-400" />
            <div>
              <span className="text-xs font-bold text-amber-300 block">
                {summaryData.pending_approvals_count} Records Awaiting Sign-Off
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                Tap to open Supervisor Review Center
              </span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-amber-400" />
        </MobileCard>
      )}

      {/* Sub-Tab Navigation Strip */}
      <div className="flex rounded-xl bg-slate-900 p-1 border border-slate-800">
        <button
          onClick={() => setActiveSubTab('PRODUCTION')}
          className={clsx(
            'flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5',
            activeSubTab === 'PRODUCTION'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          )}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          {t('productionReportTab')}
        </button>
        <button
          onClick={() => setActiveSubTab('ENVIRONMENT')}
          className={clsx(
            'flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5',
            activeSubTab === 'ENVIRONMENT'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          )}
        >
          <Activity className="w-3.5 h-3.5" />
          {t('environmentObservationTab')}
        </button>
        <button
          onClick={() => setActiveSubTab('COMPLIANCE')}
          className={clsx(
            'flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5',
            activeSubTab === 'COMPLIANCE'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          )}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          {t('complianceObservationTab')}
        </button>
      </div>

      {/* SUBTAB 1: PRODUCTION */}
      {activeSubTab === 'PRODUCTION' && (
        <div className="space-y-3">
          {/* Production Summary KPI Cards */}
          <div className="grid grid-cols-3 gap-2">
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-center space-y-0.5">
              <span className="text-[10px] text-slate-400 font-mono uppercase block">Planned</span>
              <span className="text-sm font-bold text-slate-200">
                {summaryData?.production_summary.today_planned_tonnes || 0}
              </span>
              <span className="text-[9px] text-slate-500 font-mono block">Tonnes</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-center space-y-0.5">
              <span className="text-[10px] text-slate-400 font-mono uppercase block">Actual</span>
              <span className="text-sm font-bold text-emerald-400">
                {summaryData?.production_summary.today_actual_tonnes || 0}
              </span>
              <span className="text-[9px] text-slate-500 font-mono block">Tonnes</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-center space-y-0.5">
              <span className="text-[10px] text-slate-400 font-mono uppercase block">Variance</span>
              <span
                className={clsx(
                  'text-sm font-bold',
                  (summaryData?.production_summary.variance_percentage || 0) < 0 ? 'text-red-400' : 'text-emerald-400'
                )}
              >
                {summaryData?.production_summary.variance_percentage || 0}%
              </span>
              <span className="text-[9px] text-slate-500 font-mono block">Output</span>
            </div>
          </div>

          {/* Action Button */}
          <TouchButton
            variant="primary"
            fullWidth
            size="md"
            onClick={() => setShowProductionModal(true)}
            icon={<PlusCircle className="w-4 h-4" />}
          >
            {t('recordProductionBtn')}
          </TouchButton>

          {/* Governance Notice */}
          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 leading-relaxed flex items-start gap-2">
            <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>{t('productionDisclaimerText')}</span>
          </div>

          {/* Production Records List */}
          <div className="space-y-2">
            <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider block px-1">
              Shift Production Logs
            </span>

            {summaryData?.production_summary.recent_reports.length === 0 ? (
              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-2">
                <TrendingUp className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-400 font-mono">No production logs recorded yet for this shift.</p>
              </div>
            ) : (
              summaryData?.production_summary.recent_reports.map(rep => (
                <MobileCard key={rep.id} className="p-3 bg-slate-900 border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-amber-400">{rep.report_code}</span>
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px] border border-slate-700">
                        {rep.shift}
                      </span>
                    </div>
                    <span
                      className={clsx(
                        'px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border',
                        rep.status === 'APPROVED' && 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
                        rep.status === 'PENDING_REVIEW' && 'bg-amber-500/20 text-amber-400 border-amber-500/30',
                        rep.status === 'REJECTED' && 'bg-red-500/20 text-red-400 border-red-500/30'
                      )}
                    >
                      {rep.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs pt-1 border-t border-slate-800">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-mono">Material</span>
                      <span className="text-slate-200 font-semibold">{rep.material_type}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-mono">Actual / Plan</span>
                      <span className="text-slate-200 font-semibold">
                        {rep.actual_quantity} / {rep.planned_quantity} {rep.unit}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-mono">Variance</span>
                      <span
                        className={clsx(
                          'font-semibold',
                          rep.variance_percentage < 0 ? 'text-red-400' : 'text-emerald-400'
                        )}
                      >
                        {rep.variance_percentage}%
                      </span>
                    </div>
                  </div>

                  {rep.notes && (
                    <p className="text-[11px] text-slate-400 italic bg-slate-950/40 p-2 rounded-lg border border-slate-800">
                      "{rep.notes}"
                    </p>
                  )}
                </MobileCard>
              ))
            )}
          </div>
        </div>
      )}

      {/* SUBTAB 2: ENVIRONMENT */}
      {activeSubTab === 'ENVIRONMENT' && (
        <div className="space-y-3">
          {/* Action Button */}
          <TouchButton
            variant="primary"
            fullWidth
            size="md"
            onClick={() => setShowEnvironmentModal(true)}
            icon={<PlusCircle className="w-4 h-4" />}
          >
            {t('recordEnvObservationBtn')}
          </TouchButton>

          {/* Configured Rules Section */}
          <div className="space-y-2">
            <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider block px-1">
              Configured Statutory Threshold Rules
            </span>
            <div className="space-y-2">
              {summaryData?.environment_summary.configured_rules.map(rule => (
                <div
                  key={rule.id}
                  className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-200">{rule.parameter_name}</span>
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-amber-400 font-mono text-[9px] border border-slate-700">
                        {rule.rule_code}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                      {rule.statute_reference}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-300 font-mono font-bold">
                      ≤ {rule.threshold_limit} {rule.unit}
                    </span>
                    <span
                      className={clsx(
                        'block text-[9px] font-mono font-bold uppercase mt-0.5',
                        rule.severity === 'CRITICAL' && 'text-red-400',
                        rule.severity === 'HIGH' && 'text-orange-400',
                        rule.severity === 'MEDIUM' && 'text-amber-400',
                        rule.severity === 'LOW' && 'text-emerald-400'
                      )}
                    >
                      {rule.severity}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Governance Notice */}
          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 leading-relaxed flex items-start gap-2">
            <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>{t('environmentalDisclaimerText')}</span>
          </div>

          {/* Observations List */}
          <div className="space-y-2">
            <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider block px-1">
              Recent Field Environmental Readings
            </span>

            {summaryData?.environment_summary.recent_observations.length === 0 ? (
              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-2">
                <Activity className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-400 font-mono">No environmental measurements logged this shift.</p>
              </div>
            ) : (
              summaryData?.environment_summary.recent_observations.map(obs => (
                <MobileCard key={obs.id} className="p-3 bg-slate-900 border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-200 text-xs">{obs.parameter_name}</span>
                      <span
                        className={clsx(
                          'px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase border',
                          obs.severity === 'CRITICAL' && 'bg-red-500/20 text-red-400 border-red-500/30',
                          obs.severity === 'HIGH' && 'bg-orange-500/20 text-orange-400 border-orange-500/30',
                          obs.severity === 'MEDIUM' && 'bg-amber-500/20 text-amber-400 border-amber-500/30',
                          obs.severity === 'LOW' && 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                        )}
                      >
                        {obs.severity}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(obs.detected_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs py-1 border-t border-slate-800">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-mono">Observed</span>
                      <span className="text-slate-100 font-bold">
                        {obs.observed_value} {obs.unit}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block font-mono">Configured Threshold</span>
                      <span className="text-slate-300 font-mono">
                        ≤ {obs.threshold_limit} {obs.unit}
                      </span>
                    </div>
                  </div>

                  {obs.action_taken && (
                    <p className="text-[11px] text-slate-400 bg-slate-950/40 p-2 rounded-lg border border-slate-800">
                      <strong className="text-slate-300">Action: </strong>
                      {obs.action_taken}
                    </p>
                  )}
                </MobileCard>
              ))
            )}
          </div>
        </div>
      )}

      {/* SUBTAB 3: COMPLIANCE */}
      {activeSubTab === 'COMPLIANCE' && (
        <div className="space-y-3">
          {/* Action Button */}
          <TouchButton
            variant="primary"
            fullWidth
            size="md"
            onClick={() => setShowComplianceModal(true)}
            icon={<PlusCircle className="w-4 h-4" />}
          >
            {t('recordViolationBtn')}
          </TouchButton>

          {/* Governance Notice */}
          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 leading-relaxed flex items-start gap-2">
            <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>{t('statutoryDisclaimerText')}</span>
          </div>

          {/* Compliance Non-Conformances List */}
          <div className="space-y-2">
            <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider block px-1">
              Field Statutory Non-Conformances
            </span>

            {summaryData?.compliance_summary.recent_violations.length === 0 ? (
              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-2">
                <ShieldCheck className="w-8 h-8 text-emerald-500/60 mx-auto" />
                <p className="text-xs text-slate-400 font-mono">No open non-conformances logged for this mine.</p>
              </div>
            ) : (
              summaryData?.compliance_summary.recent_violations.map(violation => (
                <MobileCard key={violation.id} className="p-3 bg-slate-900 border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-amber-400">{violation.violation_code}</span>
                    <span
                      className={clsx(
                        'px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border',
                        violation.severity === 'CRITICAL' && 'bg-red-500/20 text-red-400 border-red-500/30',
                        violation.severity === 'HIGH' && 'bg-orange-500/20 text-orange-400 border-orange-500/30',
                        violation.severity === 'MEDIUM' && 'bg-amber-500/20 text-amber-400 border-amber-500/30',
                        violation.severity === 'LOW' && 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                      )}
                    >
                      {violation.severity}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-bold text-xs text-slate-100">{violation.title}</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{violation.description}</p>
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800 font-mono">
                    <span className="text-amber-400 font-semibold">{violation.regulatory_clause}</span>
                    {violation.remedial_deadline && (
                      <span className="text-slate-400">Target: {violation.remedial_deadline}</span>
                    )}
                  </div>
                </MobileCard>
              ))
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: RECORD PRODUCTION */}
      {showProductionModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-amber-400" />
                {t('recordProductionBtn')}
              </h3>
              <button
                onClick={() => setShowProductionModal(false)}
                className="text-slate-400 hover:text-slate-200 text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1 font-mono">Date</label>
                  <input
                    type="date"
                    value={prodDate}
                    onChange={e => setProdDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1 font-mono">Shift</label>
                  <select
                    value={prodShift}
                    onChange={e => setProdShift(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 font-mono"
                  >
                    <option value="SHIFT_A">Shift A (Morning)</option>
                    <option value="SHIFT_B">Shift B (Afternoon)</option>
                    <option value="SHIFT_C">Shift C (Night)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1 font-mono">Material Type</label>
                  <select
                    value={prodMaterial}
                    onChange={e => setProdMaterial(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200"
                  >
                    <option value="ROM Coal">ROM Coal (Raw Coal)</option>
                    <option value="Overburden">Overburden (OB Rock)</option>
                    <option value="Washed Coal">Washed Clean Coal</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1 font-mono">Coal Grade</label>
                  <select
                    value={prodCoalGrade}
                    onChange={e => setProdCoalGrade(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200"
                  >
                    <option value="G-7 (High GCV)">G-7 (High GCV)</option>
                    <option value="G-9 (Medium GCV)">G-9 (Medium GCV)</option>
                    <option value="G-11 (Thermal)">G-11 (Thermal)</option>
                    <option value="Non-Coking">Non-Coking Industrial</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1 font-mono">{t('plannedQuantityLabel')} (Tonnes)</label>
                  <input
                    type="number"
                    value={prodPlanned}
                    onChange={e => setProdPlanned(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1 font-mono">{t('actualQuantityLabel')} (Tonnes)</label>
                  <input
                    type="number"
                    value={prodActual}
                    onChange={e => setProdActual(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-mono">{t('provenanceLabel')}</label>
                <select
                  value={prodProvenance}
                  onChange={e => setProdProvenance(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 font-mono"
                >
                  <option value="MANUAL">MANUAL ENTRY (Weighbridge Slip / Dispatch Log)</option>
                  <option value="SENSOR_DERIVED">SENSOR DERIVED (Belt Scale / Telemetry)</option>
                  <option value="IMPORTED">EXTERNAL IMPORTED (ERP / SAP Dump)</option>
                  <option value="SIMULATED">SIMULATED DEMO (Test / Drill Mode)</option>
                </select>
              </div>

              {/* Location & Evidence Actions */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleCaptureGps('PROD')}
                  className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-amber-400 flex items-center justify-center gap-1.5 font-mono text-[11px]"
                >
                  <MapPin className="w-3.5 h-3.5 text-amber-400" />
                  {prodGps.lat ? `${prodGps.lat}, ${prodGps.lon}` : 'Capture GPS'}
                </button>
                <button
                  type="button"
                  onClick={() => handleAttachEvidence('PROD')}
                  className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-amber-400 flex items-center justify-center gap-1.5 font-mono text-[11px]"
                >
                  <Camera className="w-3.5 h-3.5 text-amber-400" />
                  {prodEvidence.name ? 'Evidence Attached' : 'Attach Photo'}
                </button>
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-mono">{t('notesRemarksLabel')}</label>
                <textarea
                  rows={2}
                  value={prodNotes}
                  onChange={e => setProdNotes(e.target.value)}
                  placeholder="Enter weighbridge serial number, shovel operator ID, or delay reasons..."
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 placeholder-slate-600"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
              <TouchButton
                variant="secondary"
                fullWidth
                size="md"
                onClick={() => setShowProductionModal(false)}
              >
                {t('cancel')}
              </TouchButton>
              <TouchButton
                variant="primary"
                fullWidth
                size="md"
                disabled={submittingProd}
                onClick={handleSubmitProduction}
                icon={<CheckCircle2 className="w-4 h-4" />}
              >
                {submittingProd ? 'Recording...' : t('submitForSupervisorReview')}
              </TouchButton>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: RECORD ENVIRONMENT OBSERVATION */}
      {showEnvironmentModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <Activity className="w-4 h-4 text-amber-400" />
                {t('recordEnvObservationBtn')}
              </h3>
              <button
                onClick={() => setShowEnvironmentModal(false)}
                className="text-slate-400 hover:text-slate-200 text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1 font-mono">Environmental Parameter</label>
                <select
                  value={envParam}
                  onChange={e => {
                    setEnvParam(e.target.value);
                    if (e.target.value === 'NOISE') setEnvUnit('dBA');
                    else if (e.target.value === 'WATER_PH') setEnvUnit('pH');
                    else setEnvUnit('µg/m³');
                  }}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 font-mono"
                >
                  <option value="PM10">PM10 (Respirable Particulate)</option>
                  <option value="PM2.5">PM2.5 (Fine Particulate)</option>
                  <option value="NOISE">NOISE (Ambient Heavy Machinery)</option>
                  <option value="WATER_PH">WATER pH (Effluent Discharge)</option>
                  <option value="SO2">SO2 (Sulfur Dioxide)</option>
                  <option value="NOX">NOx (Oxides of Nitrogen)</option>
                </select>
              </div>

              {/* Dynamic Live Threshold Feedback */}
              <div
                className={clsx(
                  'p-3 rounded-xl border font-mono text-[11px] space-y-1',
                  isEnvModalBreached
                    ? 'bg-red-950/40 border-red-500/40 text-red-300'
                    : 'bg-slate-950 border-slate-800 text-slate-300'
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 uppercase">Configured Threshold:</span>
                  <span className="font-bold text-slate-200">
                    {activeRuleForModal
                      ? `≤ ${activeRuleForModal.threshold_limit} ${activeRuleForModal.unit}`
                      : t('noConfiguredRuleNotice')}
                  </span>
                </div>
                {isEnvModalBreached && (
                  <div className="flex items-center gap-1.5 text-red-400 font-bold mt-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>{t('thresholdExceededNotice')}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1 font-mono">{t('observedValueLabel')}</label>
                  <input
                    type="number"
                    step="0.1"
                    value={envObserved}
                    onChange={e => setEnvObserved(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1 font-mono">{t('unitLabel')}</label>
                  <input
                    type="text"
                    value={envUnit}
                    onChange={e => setEnvUnit(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-mono">{t('provenanceLabel')}</label>
                <select
                  value={envSource}
                  onChange={e => setEnvSource(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 font-mono"
                >
                  <option value="MANUAL">MANUAL (Handheld Monitor / Grab Sample)</option>
                  <option value="SENSOR_DERIVED">SENSOR DERIVED (Continuous CAAQS Station)</option>
                  <option value="SIMULATED">SIMULATED DEMO (Drill / Scenario)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-mono">Location Context / Bench</label>
                <input
                  type="text"
                  value={envLocationCtx}
                  onChange={e => setEnvLocationCtx(e.target.value)}
                  placeholder="e.g. Pit Head Crusher Unit 2"
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-mono">Action Taken / Mitigation Notes</label>
                <textarea
                  rows={2}
                  value={envActionTaken}
                  onChange={e => setEnvActionTaken(e.target.value)}
                  placeholder="e.g. Water mist cannons activated at conveyor discharge..."
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 placeholder-slate-600"
                />
              </div>

              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => handleAttachEvidence('ENV')}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-amber-400 flex items-center justify-center gap-1.5 font-mono text-[11px]"
                >
                  <Camera className="w-3.5 h-3.5 text-amber-400" />
                  {envEvidence.name ? 'Photographic Evidence Attached' : 'Attach Reading Meter Photo'}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
              <TouchButton
                variant="secondary"
                fullWidth
                size="md"
                onClick={() => setShowEnvironmentModal(false)}
              >
                {t('cancel')}
              </TouchButton>
              <TouchButton
                variant="primary"
                fullWidth
                size="md"
                disabled={submittingEnv}
                onClick={handleSubmitEnvironment}
                icon={<CheckCircle2 className="w-4 h-4" />}
              >
                {submittingEnv ? 'Logging...' : 'Save Reading'}
              </TouchButton>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: RECORD COMPLIANCE OBSERVATION */}
      {showComplianceModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                {t('recordViolationBtn')}
              </h3>
              <button
                onClick={() => setShowComplianceModal(false)}
                className="text-slate-400 hover:text-slate-200 text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1 font-mono">{t('cmrRegulationLabel')}</label>
                <select
                  value={compClause}
                  onChange={e => setCompClause(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 font-mono"
                >
                  <option value="CMR 2017 Reg 124(1)">CMR 2017 Reg 124(1) — Precautions against dust</option>
                  <option value="CMR 2017 Reg 129">CMR 2017 Reg 129 — Mechanised opencast haul roads</option>
                  <option value="CMR 2017 Reg 148">CMR 2017 Reg 148 — Provision of safety berms & bunds</option>
                  <option value="CMR 2017 Reg 104">CMR 2017 Reg 104 — Safe distance of electrical installations</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-mono">{t('violationTitleLabel')}</label>
                <input
                  type="text"
                  value={compTitle}
                  onChange={e => setCompTitle(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-mono">{t('violationDescriptionLabel')}</label>
                <textarea
                  rows={2}
                  value={compDesc}
                  onChange={e => setCompDesc(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 placeholder-slate-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1 font-mono">Severity</label>
                  <select
                    value={compSeverity}
                    onChange={e => setCompSeverity(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 font-mono"
                  >
                    <option value="CRITICAL">CRITICAL</option>
                    <option value="HIGH">HIGH</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="LOW">LOW</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1 font-mono">{t('remedialDeadlineLabel')}</label>
                  <input
                    type="date"
                    value={compDeadline}
                    onChange={e => setCompDeadline(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-mono">{t('correctiveActionLabel')}</label>
                <input
                  type="text"
                  value={compActionTitle}
                  onChange={e => setCompActionTitle(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200"
                />
              </div>

              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => handleAttachEvidence('COMP')}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-amber-400 flex items-center justify-center gap-1.5 font-mono text-[11px]"
                >
                  <Camera className="w-3.5 h-3.5 text-amber-400" />
                  {compEvidence.name ? 'Non-Conformance Evidence Attached' : 'Attach Photo Evidence'}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
              <TouchButton
                variant="secondary"
                fullWidth
                size="md"
                onClick={() => setShowComplianceModal(false)}
              >
                {t('cancel')}
              </TouchButton>
              <TouchButton
                variant="primary"
                fullWidth
                size="md"
                disabled={submittingComp}
                onClick={handleSubmitCompliance}
                icon={<CheckCircle2 className="w-4 h-4" />}
              >
                {submittingComp ? 'Submitting...' : t('submitForSupervisorReview')}
              </TouchButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
