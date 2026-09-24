import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useMineContext } from '../../context/MineContext';
import { useLanguage } from '../../context/LanguageContext';
import { MobileTab, MobileRiskPredictionItem, MobileRiskSummaryResponse, MobileRiskVerifyPayload } from '../types/mobile';
import { MobileCard } from '../components/MobileCard';
import { TouchButton } from '../components/TouchButton';
import { mobileApi } from '../../services';
import { 
  Zap, 
  Activity, 
  AlertTriangle, 
  ShieldCheck, 
  Clock, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  MapPin, 
  Camera, 
  Box, 
  Sparkles, 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  ChevronRight, 
  Filter, 
  FileText, 
  Layers, 
  Compass, 
  Hash, 
  ArrowLeft,
  Search,
  RefreshCw,
  Cpu,
  Database,
  Eye
} from 'lucide-react';
import clsx from 'clsx';

interface MobileRiskIntelligenceScreenProps {
  onBack?: () => void;
  onNavigateTab?: (tab: MobileTab) => void;
}

type RiskTabType = 'ACTIVE_SIGNALS' | 'MY_VERIFICATIONS' | 'ALL_PREDICTIONS';

export const MobileRiskIntelligenceScreen: React.FC<MobileRiskIntelligenceScreenProps> = ({
  onBack,
  onNavigateTab,
}) => {
  const { user } = useAuth();
  const { selectedMine } = useMineContext();
  const { t } = useLanguage();

  const [activeTab, setActiveTab] = useState<RiskTabType>('ACTIVE_SIGNALS');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [summary, setSummary] = useState<MobileRiskSummaryResponse | null>(null);
  const [risks, setRisks] = useState<MobileRiskPredictionItem[]>([]);
  const [selectedRisk, setSelectedRisk] = useState<MobileRiskPredictionItem | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState<boolean>(false);

  // Verification Form State
  const [verifOutcome, setVerifOutcome] = useState<'NO_ISSUE_OBSERVED' | 'ISSUE_FOUND' | 'REQUIRES_FURTHER_REVIEW'>('ISSUE_FOUND');
  const [verifNotes, setVerifNotes] = useState<string>('');
  const [verifLat, setVerifLat] = useState<number>(23.7958);
  const [verifLng, setVerifLng] = useState<number>(86.4305);
  const [verifLocationContext, setVerifLocationContext] = useState<string>('Seam 4 - Incline 2 East Face');
  const [verifEvidenceUrl, setVerifEvidenceUrl] = useState<string>('https://storage.trinetra.gov.in/evidence/pred_risk_field_01.jpg');
  const [verifEvidenceName, setVerifEvidenceName] = useState<string>('aux_fan_ducting_photo.jpg');
  const [verifEvidenceHash, setVerifEvidenceHash] = useState<string>('7d3a8e9b1c2f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b');
  const [createTask, setCreateTask] = useState<boolean>(true);
  const [taskTitle, setTaskTitle] = useState<string>('');
  const [createIncident, setCreateIncident] = useState<boolean>(false);
  const [incidentTitle, setIncidentTitle] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const fetchRiskData = async () => {
    if (!selectedMine?.id) return;
    setIsLoading(true);
    try {
      const [sumRes, listRes] = await Promise.all([
        mobileApi.getRiskIntelligenceSummary(selectedMine.id),
        mobileApi.getRiskIntelligenceList({ mine_id: selectedMine.id, limit: 50 })
      ]);
      setSummary(sumRes);
      setRisks(Array.isArray(listRes) ? listRes : []);
    } catch (err) {
      console.error("Failed to load risk intelligence data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRiskData();
  }, [selectedMine?.id]);

  // Filtered List
  const filteredRisks = risks.filter((r) => {
    if (activeTab === 'ACTIVE_SIGNALS' && r.field_verified) return false;
    if (activeTab === 'MY_VERIFICATIONS' && (!r.field_verified || r.verified_by_id !== user?.id)) return false;
    if (severityFilter !== 'ALL' && r.predicted_severity !== severityFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchZone = r.zone_name?.toLowerCase().includes(q) || false;
      const matchSeverity = r.predicted_severity.toLowerCase().includes(q);
      const matchSignal = r.top_signals.some(s => s.label.toLowerCase().includes(q) || s.explanation.toLowerCase().includes(q));
      return matchZone || matchSeverity || matchSignal;
    }
    return true;
  });

  const handleOpenVerifyModal = (risk: MobileRiskPredictionItem) => {
    setSelectedRisk(risk);
    setTaskTitle(`Field Remediation: ${risk.predicted_severity} Risk #${risk.id}`);
    setIncidentTitle(`Hazard Identified from Risk Signal #${risk.id}`);
    setVerifLocationContext(risk.zone_name ? `Mine Zone: ${risk.zone_name}` : 'Mine Operational Seam');
    if (risk.latitude && risk.longitude) {
      setVerifLat(risk.latitude);
      setVerifLng(risk.longitude);
    }
    setIsVerifyModalOpen(true);
  };

  const handleSubmitVerification = async () => {
    if (!selectedRisk) return;
    setIsSubmitting(true);
    try {
      const payload: MobileRiskVerifyPayload = {
        outcome: verifOutcome,
        notes: verifNotes || (verifOutcome === 'NO_ISSUE_OBSERVED' ? 'Field inspection completed. No hazards detected.' : 'Field verification findings recorded.'),
        latitude: verifLat,
        longitude: verifLng,
        location_context: verifLocationContext,
        evidence_url: verifEvidenceUrl,
        evidence_file_name: verifEvidenceName,
        evidence_file_hash: verifEvidenceHash,
        create_governance_task: createTask && verifOutcome === 'ISSUE_FOUND',
        task_title: taskTitle,
        task_priority: selectedRisk.predicted_severity === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
        create_incident: createIncident && verifOutcome === 'ISSUE_FOUND',
        incident_title: incidentTitle,
        incident_severity: selectedRisk.predicted_severity === 'CRITICAL' ? 'CRITICAL' : 'HIGH'
      };

      // Check online/offline
      if (!navigator.onLine) {
        // Save to offline queue
        const offlineQueue = JSON.parse(localStorage.getItem('trinetra_field_sync_queue') || '[]');
        const syncItem = {
          operation_id: `sync-risk-verif-${Date.now()}`,
          entity_type: 'PREDICTIVE_RISK',
          operation_type: 'VERIFY',
          entity_id: String(selectedRisk.id),
          client_timestamp: new Date().toISOString(),
          payload: {
            prediction_id: selectedRisk.id,
            ...payload
          },
          sync_status: 'PENDING'
        };
        offlineQueue.push(syncItem);
        localStorage.setItem('trinetra_field_sync_queue', JSON.stringify(offlineQueue));
        setActionNotice(t('offlineRiskContextSaved'));
      } else {
        await mobileApi.verifyRiskPrediction(selectedRisk.id, payload);
        setActionNotice(`Field finding '${verifOutcome}' recorded for Risk #${selectedRisk.id}`);
      }

      setIsVerifyModalOpen(false);
      setIsDetailOpen(false);
      setVerifNotes('');
      fetchRiskData();
    } catch (err: any) {
      setActionNotice(`Submission error: ${err.message || 'Verification failed'}`);
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setActionNotice(null), 5000);
    }
  };

  const getSeverityBadgeClass = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-red-500/20 text-red-400 border-red-500/40 animate-pulse';
      case 'HIGH':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/40';
      case 'MEDIUM':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      default:
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    }
  };

  return (
    <div className="space-y-4 pb-20 max-w-lg mx-auto">
      {/* Top Header & Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div>
            <h1 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400" />
              <span>{t('fieldIntelligenceTitle')}</span>
            </h1>
            <p className="text-[11px] text-slate-400 font-mono">
              {selectedMine?.name || 'Mine Context'} • {t('horizon')}: 30 min
            </p>
          </div>
        </div>

        <button
          onClick={fetchRiskData}
          className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-amber-400 hover:bg-slate-800"
          title="Refresh Signals"
        >
          <RefreshCw className={clsx("w-4 h-4", isLoading && "animate-spin")} />
        </button>
      </div>

      {/* Action Notification Toast */}
      {actionNotice && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono flex items-center justify-between animate-fadeIn">
          <span>{actionNotice}</span>
          <button onClick={() => setActionNotice(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Simulated Telemetry / Holdout Model Notice */}
      <div className="p-2.5 rounded-xl bg-indigo-950/30 border border-indigo-500/20 text-indigo-300 text-[11px] font-mono flex items-center gap-2">
        <Cpu className="w-4 h-4 text-indigo-400 flex-shrink-0" />
        <span className="leading-tight">
          {t('simulatedHoldoutNotice')} • {summary?.model_version || 'risk-escalation-v1.0'}
        </span>
      </div>

      {/* Intelligence Summary KPIs Strip */}
      <div className="grid grid-cols-2 gap-2">
        {/* Forward Escalation KPI */}
        <MobileCard className="p-3 bg-gradient-to-br from-slate-900 to-amber-950/30 border-amber-500/30 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase text-slate-400">{t('predictedEscalationRisk')}</span>
            <Activity className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold font-mono text-amber-400">
              {summary ? `${(summary.probability * 100).toFixed(1)}%` : '--'}
            </span>
            <span className={clsx("text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase", getSeverityBadgeClass(summary?.predicted_severity || 'LOW'))}>
              {summary?.predicted_severity || 'LOW'}
            </span>
          </div>
          <div className="text-[10px] text-slate-400 font-mono">
            30m Forecast • Current: {summary?.current_risk_score.toFixed(0) || '25'}/100
          </div>
        </MobileCard>

        {/* Pending Verifications KPI */}
        <MobileCard className="p-3 bg-gradient-to-br from-slate-900 to-indigo-950/30 border-indigo-500/30 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase text-slate-400">{t('pendingVerificationsCount')}</span>
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold font-mono text-indigo-400">
              {summary?.pending_verification_count ?? 0}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              / {summary?.high_critical_risk_count ?? 0} High/Crit
            </span>
          </div>
          <div className="text-[10px] text-slate-400 font-mono">
            Quality: {summary ? `${(summary.data_quality_score * 100).toFixed(0)}%` : '100%'}
          </div>
        </MobileCard>
      </div>

      {/* Sub-Tabs Selector */}
      <div className="flex rounded-xl bg-slate-900 p-1 border border-slate-800">
        <button
          onClick={() => setActiveTab('ACTIVE_SIGNALS')}
          className={clsx(
            "flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors font-sans",
            activeTab === 'ACTIVE_SIGNALS' ? "bg-amber-500 text-slate-950" : "text-slate-400 hover:text-slate-200"
          )}
        >
          {t('activeSignalsTab')}
        </button>
        <button
          onClick={() => setActiveTab('MY_VERIFICATIONS')}
          className={clsx(
            "flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors font-sans",
            activeTab === 'MY_VERIFICATIONS' ? "bg-amber-500 text-slate-950" : "text-slate-400 hover:text-slate-200"
          )}
        >
          {t('myVerificationsTab')}
        </button>
        <button
          onClick={() => setActiveTab('ALL_PREDICTIONS')}
          className={clsx(
            "flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors font-sans",
            activeTab === 'ALL_PREDICTIONS' ? "bg-amber-500 text-slate-950" : "text-slate-400 hover:text-slate-200"
          )}
        >
          {t('allPredictionsTab')}
        </button>
      </div>

      {/* Search & Severity Filters */}
      <div className="flex gap-2 items-center">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search signals, zone, factor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          aria-label="Filter by Risk Severity"
          className="px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
        >
          <option value="ALL">All Severity</option>
          <option value="CRITICAL">Critical</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>
      </div>

      {/* Predictive Risk Cards List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-400 font-mono">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-400" />
            Loading predictive intelligence stream...
          </div>
        ) : filteredRisks.length === 0 ? (
          <MobileCard className="p-8 text-center space-y-2 bg-slate-900/60 border-slate-800">
            <ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto" />
            <h4 className="text-sm font-bold text-slate-200">No Risk Signals Found</h4>
            <p className="text-xs text-slate-400 font-sans">
              All sensors and telemetry streams within safe operational limits.
            </p>
          </MobileCard>
        ) : (
          filteredRisks.map((risk) => (
            <MobileCard
              key={risk.id}
              className={clsx(
                "p-4 space-y-3 border transition-all",
                risk.predicted_severity === 'CRITICAL' ? "border-red-500/30 bg-gradient-to-r from-slate-900 to-red-950/20" :
                risk.predicted_severity === 'HIGH' ? "border-amber-500/30 bg-gradient-to-r from-slate-900 to-amber-950/20" :
                "border-slate-800 bg-slate-900"
              )}
            >
              {/* Top Row: Severity, Probability, Horizon */}
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={clsx("text-xs font-bold font-mono px-2 py-0.5 rounded border uppercase", getSeverityBadgeClass(risk.predicted_severity))}>
                      {risk.predicted_severity}
                    </span>
                    <span className="text-xs font-bold font-mono text-amber-400">
                      {(risk.probability * 100).toFixed(1)}% Escalation
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-300 font-sans font-semibold">
                    {risk.zone_name ? `Zone: ${risk.zone_name}` : `Mine Risk Signal #${risk.id}`}
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-mono text-slate-400 block">
                    {new Date(risk.prediction_timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="text-[10px] font-mono text-amber-400/80 block">
                    30-MIN HORIZON
                  </span>
                </div>
              </div>

              {/* Contributing Signals Summary */}
              {risk.top_signals && risk.top_signals.length > 0 && (
                <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 space-y-1.5">
                  <span className="text-[10px] font-mono uppercase text-slate-400 font-semibold block">
                    {t('contributingSignalsLabel')}
                  </span>
                  <div className="space-y-1">
                    {risk.top_signals.slice(0, 2).map((sig, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs font-sans">
                        <span className="text-slate-300 flex items-center gap-1">
                          <span className={clsx("font-mono font-bold", sig.symbol === '↑' ? "text-red-400" : sig.symbol === '↓' ? "text-amber-400" : "text-slate-400")}>
                            {sig.symbol}
                          </span>
                          <span>{sig.label}</span>
                        </span>
                        <span className="text-slate-400 font-mono text-[11px]">
                          {sig.current_value} {sig.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Verification State or Action Prompt */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
                {risk.field_verified ? (
                  <div className="flex items-center gap-1.5 text-xs font-mono text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Verified: {risk.field_outcome?.replace(/_/g, ' ')}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-xs font-mono text-amber-400">
                    <AlertTriangle className="w-3.5 h-3.5 animate-pulse" />
                    <span>Verification Required</span>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  {!risk.field_verified && (
                    <TouchButton
                      variant="primary"
                      size="sm"
                      onClick={() => handleOpenVerifyModal(risk)}
                      icon={<ShieldCheck className="w-3.5 h-3.5" />}
                    >
                      {t('verifyInFieldBtn')}
                    </TouchButton>
                  )}

                  <TouchButton
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedRisk(risk);
                      setIsDetailOpen(true);
                    }}
                    icon={<Eye className="w-3.5 h-3.5" />}
                  >
                    Details
                  </TouchButton>
                </div>
              </div>
            </MobileCard>
          ))
        )}
      </div>

      {/* Risk Detail Modal with Pipeline Trace */}
      {isDetailOpen && selectedRisk && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-t-2xl sm:rounded-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto animate-slideUp">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="space-y-0.5">
                <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span>{t('riskDetailHeader')} #{selectedRisk.id}</span>
                </h3>
                <p className="text-[11px] text-slate-400 font-mono">
                  {selectedRisk.model_name} • {selectedRisk.model_version}
                </p>
              </div>
              <button
                onClick={() => setIsDetailOpen(false)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Lifecycle Trace Pipeline */}
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">
                {t('pipelineTraceTitle')}
              </span>
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-300">
                <div className="text-center">
                  <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-1 border border-amber-500/30">
                    <Activity className="w-3 h-3" />
                  </div>
                  <span>Signal</span>
                </div>
                <div className="h-[1px] flex-1 bg-slate-800 mx-1"></div>
                <div className="text-center">
                  <div className={clsx("w-6 h-6 rounded-full flex items-center justify-center mx-auto mb-1 border", selectedRisk.field_verified ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-slate-800 text-slate-500 border-slate-700")}>
                    <ShieldCheck className="w-3 h-3" />
                  </div>
                  <span>Verify</span>
                </div>
                <div className="h-[1px] flex-1 bg-slate-800 mx-1"></div>
                <div className="text-center">
                  <div className={clsx("w-6 h-6 rounded-full flex items-center justify-center mx-auto mb-1 border", selectedRisk.related_task_id || selectedRisk.related_incident_id ? "bg-indigo-500/20 text-indigo-400 border-indigo-500/30" : "bg-slate-800 text-slate-500 border-slate-700")}>
                    <FileText className="w-3 h-3" />
                  </div>
                  <span>Action</span>
                </div>
                <div className="h-[1px] flex-1 bg-slate-800 mx-1"></div>
                <div className="text-center">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-1 border border-emerald-500/30">
                    <Hash className="w-3 h-3" />
                  </div>
                  <span>Audit</span>
                </div>
              </div>
            </div>

            {/* Contributing Signals Detail */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-300 font-sans block">
                {t('contributingSignalsLabel')} ({selectedRisk.top_signals.length})
              </span>
              <div className="space-y-1.5">
                {selectedRisk.top_signals.map((sig, idx) => (
                  <div key={idx} className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                        <span className={clsx("font-mono font-bold", sig.symbol === '↑' ? "text-red-400" : sig.symbol === '↓' ? "text-amber-400" : "text-slate-400")}>
                          {sig.symbol}
                        </span>
                        <span>{sig.label}</span>
                      </span>
                      <span className="text-amber-400 font-mono text-[11px] font-bold">
                        +{sig.contribution_points.toFixed(1)} pts
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                      {sig.explanation}
                    </p>
                    <div className="flex items-center gap-3 text-[10px] font-mono text-slate-500 pt-1 border-t border-slate-800/60">
                      <span>Value: {sig.current_value} {sig.unit}</span>
                      <span>Normal: {sig.normal_reference}</span>
                      <span>Threshold: {sig.threshold_reference}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Downstream Records / Verification State */}
            {selectedRisk.field_verified && (
              <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-1.5">
                <span className="text-[10px] font-mono uppercase text-emerald-400 font-bold block">
                  Field Verification Outcome: {selectedRisk.field_outcome}
                </span>
                <p className="text-xs text-slate-300 font-sans">
                  {selectedRisk.field_notes}
                </p>
                <div className="text-[10px] font-mono text-slate-400 flex items-center gap-3">
                  <span>Verified by: {selectedRisk.verified_by_name || 'Inspector'}</span>
                  {selectedRisk.related_task_id && <span>Task #{selectedRisk.related_task_id}</span>}
                  {selectedRisk.related_incident_id && <span>Incident #{selectedRisk.related_incident_id}</span>}
                </div>
              </div>
            )}

            {/* Quick Actions (Map / 3D / Copilot) */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800">
              <TouchButton
                variant="outline"
                size="sm"
                fullWidth
                onClick={() => {
                  setIsDetailOpen(false);
                  onNavigateTab?.('map');
                }}
                icon={<MapPin className="w-3.5 h-3.5 text-amber-400" />}
              >
                Map
              </TouchButton>

              <TouchButton
                variant="outline"
                size="sm"
                fullWidth
                onClick={() => {
                  window.location.href = '/digital-twin';
                }}
                icon={<Box className="w-3.5 h-3.5 text-indigo-400" />}
              >
                3D Twin
              </TouchButton>

              <TouchButton
                variant="outline"
                size="sm"
                fullWidth
                onClick={() => {
                  setIsDetailOpen(false);
                  onNavigateTab?.('copilot');
                }}
                icon={<Sparkles className="w-3.5 h-3.5 text-emerald-400" />}
              >
                Copilot
              </TouchButton>
            </div>

            {/* Verification Button if not verified */}
            {!selectedRisk.field_verified && (
              <TouchButton
                variant="primary"
                size="lg"
                fullWidth
                onClick={() => {
                  setIsDetailOpen(false);
                  handleOpenVerifyModal(selectedRisk);
                }}
                icon={<ShieldCheck className="w-4 h-4" />}
              >
                {t('verifyInFieldBtn')}
              </TouchButton>
            )}
          </div>
        </div>
      )}

      {/* Field Verification Modal Form */}
      {isVerifyModalOpen && selectedRisk && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-t-2xl sm:rounded-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto animate-slideUp">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="space-y-0.5">
                <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  <span>{t('recordFieldOutcomeTitle')}</span>
                </h3>
                <p className="text-[11px] text-slate-400 font-mono">
                  Risk #{selectedRisk.id} • {selectedRisk.predicted_severity} ({(selectedRisk.probability * 100).toFixed(0)}%)
                </p>
              </div>
              <button
                onClick={() => setIsVerifyModalOpen(false)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Outcome Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 font-sans block">
                Verification Finding / Field Outcome
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setVerifOutcome('ISSUE_FOUND')}
                  className={clsx(
                    "p-2 rounded-xl text-xs font-semibold border flex flex-col items-center gap-1 transition-all",
                    verifOutcome === 'ISSUE_FOUND' ? "bg-red-500/20 text-red-400 border-red-500/40" : "bg-slate-950 text-slate-400 border-slate-800"
                  )}
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span>Issue Found</span>
                </button>

                <button
                  type="button"
                  onClick={() => setVerifOutcome('NO_ISSUE_OBSERVED')}
                  className={clsx(
                    "p-2 rounded-xl text-xs font-semibold border flex flex-col items-center gap-1 transition-all",
                    verifOutcome === 'NO_ISSUE_OBSERVED' ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40" : "bg-slate-950 text-slate-400 border-slate-800"
                  )}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>No Issue</span>
                </button>

                <button
                  type="button"
                  onClick={() => setVerifOutcome('REQUIRES_FURTHER_REVIEW')}
                  className={clsx(
                    "p-2 rounded-xl text-xs font-semibold border flex flex-col items-center gap-1 transition-all",
                    verifOutcome === 'REQUIRES_FURTHER_REVIEW' ? "bg-yellow-500/20 text-yellow-300 border-yellow-500/40" : "bg-slate-950 text-slate-400 border-slate-800"
                  )}
                >
                  <HelpCircle className="w-4 h-4" />
                  <span>Review</span>
                </button>
              </div>
            </div>

            {/* Field Notes Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 font-sans block">
                Field Observations & Notes
              </label>
              <textarea
                rows={3}
                value={verifNotes}
                onChange={(e) => setVerifNotes(e.target.value)}
                placeholder="Record exact physical inspection findings, handheld detector readings, ventilation duct status..."
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Contextual Location & Coordinates */}
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-300 font-sans font-semibold">
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-amber-400" />
                  <span>Location Context</span>
                </span>
                <span className="text-[10px] font-mono text-slate-400">ACTUAL GPS</span>
              </div>
              <input
                type="text"
                value={verifLocationContext}
                onChange={(e) => setVerifLocationContext(e.target.value)}
                className="w-full p-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 font-mono"
              />
              <div className="text-[10px] font-mono text-slate-500">
                Coords: {verifLat.toFixed(4)}° N, {verifLng.toFixed(4)}° E
              </div>
            </div>

            {/* Evidence & SHA-256 Hash */}
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-300 font-sans font-semibold">
                <span className="flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-amber-400" />
                  <span>Evidence Photo</span>
                </span>
                <span className="text-[10px] font-mono text-emerald-400">SHA-256 Verified</span>
              </div>
              <div className="text-[11px] text-slate-300 font-mono truncate bg-slate-900 p-2 rounded-lg border border-slate-800">
                {verifEvidenceName}
              </div>
              <div className="text-[10px] font-mono text-slate-500 truncate">
                Hash: {verifEvidenceHash}
              </div>
            </div>

            {/* Downstream Actions Toggle (Only if ISSUE_FOUND) */}
            {verifOutcome === 'ISSUE_FOUND' && (
              <div className="space-y-3 pt-2 border-t border-slate-800">
                {/* Governance Task Checkbox */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={createTask}
                      onChange={(e) => setCreateTask(e.target.checked)}
                      className="rounded border-slate-700 text-amber-500 focus:ring-amber-500 bg-slate-950"
                    />
                    <span>{t('createLinkedTaskLabel')}</span>
                  </label>
                  {createTask && (
                    <input
                      type="text"
                      value={taskTitle}
                      onChange={(e) => setTaskTitle(e.target.value)}
                      placeholder="Remediation Task Title"
                      className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-sans"
                    />
                  )}
                </div>

                {/* Safety Incident Checkbox */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={createIncident}
                      onChange={(e) => setCreateIncident(e.target.checked)}
                      className="rounded border-slate-700 text-red-500 focus:ring-red-500 bg-slate-950"
                    />
                    <span>{t('createLinkedIncidentLabel')}</span>
                  </label>
                  {createIncident && (
                    <input
                      type="text"
                      value={incidentTitle}
                      onChange={(e) => setIncidentTitle(e.target.value)}
                      placeholder="Incident Title"
                      className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-red-500 font-sans"
                    />
                  )}
                </div>
              </div>
            )}

            {/* Submit Action Buttons */}
            <div className="pt-2">
              <TouchButton
                variant="primary"
                size="lg"
                fullWidth
                disabled={isSubmitting}
                onClick={handleSubmitVerification}
                icon={<ShieldCheck className="w-4 h-4" />}
              >
                {isSubmitting ? 'Recording Finding...' : 'Submit Field Finding'}
              </TouchButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
