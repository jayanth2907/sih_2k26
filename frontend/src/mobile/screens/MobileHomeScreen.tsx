import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useMineContext } from '../../context/MineContext';
import { useLanguage } from '../../context/LanguageContext';
import { canMobile } from '../rbac/mobilePermissions';
import { MobileTab, CommandSummaryResponse, AttentionItem, MyWorkItem, NearbyItem } from '../types/mobile';
import { MobileCard } from '../components/MobileCard';
import { TouchButton } from '../components/TouchButton';
import { 
  ClipboardCheck, 
  AlertOctagon, 
  Camera, 
  ShieldCheck, 
  FileSpreadsheet, 
  Activity, 
  CheckCircle2, 
  Clock, 
  Sparkles,
  ArrowRight,
  Info,
  ShieldAlert,
  Wifi,
  WifiOff,
  Zap,
  MapPin,
  FileText,
  UserCheck,
  Link2,
  History,
  X,
  RefreshCw
} from 'lucide-react';
import { mobileApi } from '../../services';
import { RelatedRecordsWidget } from '../components/RelatedRecordsWidget';
import { UnifiedTimelineWidget } from '../components/UnifiedTimelineWidget';

interface MobileHomeScreenProps {
  onNavigateTab: (tab: MobileTab) => void;
}

export const MobileHomeScreen: React.FC<MobileHomeScreenProps> = ({ onNavigateTab }) => {
  const { user } = useAuth();
  const { selectedMine } = useMineContext();
  const { t } = useLanguage();

  const [commandData, setCommandData] = useState<CommandSummaryResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [selectedEntityForModal, setSelectedEntityForModal] = useState<{
    type: string;
    id: string | number;
    title: string;
    source: string;
  } | null>(null);
  const [activeModalTab, setActiveModalTab] = useState<'timeline' | 'related'>('timeline');

  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  const loadFieldCommandData = useCallback(async () => {
    if (!selectedMine?.id) {
      setCommandData(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const summary = await mobileApi.getFieldCommandSummary(selectedMine.id);
      setCommandData(summary);
    } catch (err) {
      console.warn('Field Command summary load failed, using local/cached fallback:', err);
    } finally {
      setIsLoading(false);
    }

    // Read local sync queue count if present
    try {
      const rawQueue = localStorage.getItem('trinetra_field_sync_queue');
      if (rawQueue) {
        const parsed = JSON.parse(rawQueue);
        if (Array.isArray(parsed)) {
          setPendingSyncCount(parsed.filter((item: any) => item.sync_status === 'PENDING').length);
        }
      }
    } catch {
      // queue error fallback
    }
  }, [selectedMine?.id]);

  useEffect(() => {
    loadFieldCommandData();
  }, [loadFieldCommandData]);

  const primaryRole = user?.roles?.[0] || 'FIELD_INSPECTOR';

  const parseDeepLinkToTab = (deepLink: string): MobileTab => {
    if (!deepLink) return 'tasks';
    if (deepLink.includes('/mobile/intelligence')) return 'intelligence';
    if (deepLink.includes('/mobile/incidents')) return 'incidents';
    if (deepLink.includes('/mobile/tasks')) return 'tasks';
    if (deepLink.includes('/mobile/reviews')) return 'reviews';
    if (deepLink.includes('/mobile/grievances')) return 'grievances';
    if (deepLink.includes('/mobile/contractors')) return 'contractors';
    if (deepLink.includes('/mobile/reporting')) return 'reporting';
    if (deepLink.includes('/mobile/documents')) return 'documents';
    if (deepLink.includes('/mobile/workforce')) return 'workforce';
    if (deepLink.includes('/mobile/map')) return 'map';
    if (deepLink.includes('/mobile/copilot')) return 'copilot';
    return 'tasks';
  };

  const getSourceBadge = (source: string) => {
    switch (source) {
      case 'PREDICTIVE_RISK':
        return { label: t('sourcePredictiveModel'), color: 'bg-amber-500/20 text-amber-300 border-amber-500/40', icon: Zap };
      case 'INCIDENT':
        return { label: t('sourceIncidentLog'), color: 'bg-red-500/20 text-red-300 border-red-500/40', icon: AlertOctagon };
      case 'TASK':
        return { label: t('sourceTaskQueue'), color: 'bg-blue-500/20 text-blue-300 border-blue-500/40', icon: ClipboardCheck };
      case 'REVIEW':
        return { label: t('sourceSupervisorReview'), color: 'bg-purple-500/20 text-purple-300 border-purple-500/40', icon: ShieldCheck };
      case 'CONTRACTOR_SLA':
        return { label: t('sourceContractorSla'), color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40', icon: UserCheck };
      case 'GRIEVANCE':
        return { label: t('sourcePgrmGrievance'), color: 'bg-pink-500/20 text-pink-300 border-pink-500/40', icon: FileText };
      case 'ENVIRONMENT':
        return { label: t('sourceEnvObservation'), color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40', icon: Activity };
      case 'COMPLIANCE':
        return { label: t('sourceStatutoryCompliance'), color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40', icon: FileSpreadsheet };
      default:
        return { label: source, color: 'bg-slate-700/40 text-slate-300 border-slate-600', icon: Info };
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity?.toUpperCase()) {
      case 'CRITICAL':
        return 'bg-red-500/20 text-red-400 border-red-500/50 font-bold';
      case 'HIGH':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/50 font-semibold';
      case 'MEDIUM':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/40';
      case 'LOW':
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  const attentionItems = commandData?.attention_items || [];
  const myWorkItems = commandData?.my_work_items || [];
  const nearbyItems = commandData?.nearby_items || [];

  return (
    <div className="space-y-4 pb-20 max-w-lg mx-auto">
      {/* 1. FIELD COMMAND HEADER */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/40 border border-amber-500/20 p-4 shadow-lg">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] font-bold tracking-widest text-amber-400 uppercase">
                {t('fieldCommandTitle')}
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            </div>
            <h1 className="text-lg font-bold text-slate-100 font-sans tracking-tight">
              {commandData?.mine_name || selectedMine?.name || t('selectMinePrompt')}
            </h1>
            <p className="text-xs text-slate-400 font-mono">
              {user?.full_name} • <span className="text-amber-400/90 font-semibold">{primaryRole.replace(/_/g, ' ')}</span>
            </p>
          </div>
          <button
            onClick={loadFieldCommandData}
            title="Refresh Field Command"
            className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 transition-colors"
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Operational Indicators: Shift, Network, Last Sync */}
        <div className="mt-3 pt-3 border-t border-slate-800/80 grid grid-cols-3 gap-2 text-[11px] font-mono">
          <div className="bg-slate-950/70 p-2 rounded-xl border border-slate-800/80">
            <div className="text-[9px] text-slate-400 uppercase">{t('currentShiftLabel')}</div>
            <div className="font-bold text-amber-300 truncate mt-0.5">
              {commandData?.shift_name || 'Shift A'} ({commandData?.shift_type || 'A'})
            </div>
          </div>

          <div className="bg-slate-950/70 p-2 rounded-xl border border-slate-800/80">
            <div className="text-[9px] text-slate-400 uppercase">{t('networkStatusLabel')}</div>
            <div className="flex items-center gap-1 font-bold mt-0.5">
              {isOnline ? (
                <>
                  <Wifi className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-300">ONLINE</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3 text-amber-400" />
                  <span className="text-amber-300">OFFLINE</span>
                </>
              )}
            </div>
          </div>

          <div className="bg-slate-950/70 p-2 rounded-xl border border-slate-800/80">
            <div className="text-[9px] text-slate-400 uppercase">{t('lastSyncLabel')}</div>
            <div className="font-bold text-slate-200 truncate mt-0.5">
              {pendingSyncCount > 0 ? `${pendingSyncCount} Queued` : 'Sync OK'}
            </div>
          </div>
        </div>
      </div>

      {/* Action Notification Toast */}
      {actionNotice && (
        <div className="rounded-xl bg-amber-500/15 border border-amber-500/40 p-3 text-xs text-amber-200 flex items-center gap-2 animate-in fade-in duration-150">
          <Info className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* 2. ATTENTION SECTION (Unified Priority Items) */}
      <MobileCard className="p-4 bg-slate-900 border-slate-800 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-400" />
            <h3 className="font-semibold text-xs text-slate-200 uppercase font-mono tracking-wider">
              {t('attentionSectionTitle')}
            </h3>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 font-bold">
            {attentionItems.length} Urgent Items
          </span>
        </div>

        {attentionItems.length === 0 ? (
          <div className="p-3 text-center text-xs text-slate-500 font-mono bg-slate-950/40 rounded-xl border border-slate-800">
            {t('noAttentionItems')}
          </div>
        ) : (
          <div className="space-y-2">
            {attentionItems.map((item: AttentionItem) => {
              const badge = getSourceBadge(item.source_type);
              const IconComp = badge.icon;
              return (
                <div
                  key={`att-${item.id}`}
                  onClick={() => onNavigateTab(parseDeepLinkToTab(item.deep_link))}
                  className="p-3 bg-slate-950/70 hover:bg-slate-950 border border-slate-800/80 rounded-xl space-y-2 cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border flex items-center gap-1 font-mono uppercase ${badge.color}`}>
                      <IconComp className="w-3 h-3" />
                      {badge.label}
                    </span>
                    <span className={`text-[9px] px-2 py-0.5 rounded border font-mono ${getSeverityBadge(item.severity)}`}>
                      {item.severity}
                    </span>
                  </div>

                  <div className="text-xs font-semibold text-slate-100">
                    {item.title}
                  </div>
                  <div className="text-[11px] text-slate-400 leading-relaxed">
                    {item.subtitle}
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-[10px] font-mono">
                    <span className="text-slate-500">ID #{item.id}</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEntityForModal({
                            type: item.source_type,
                            id: item.id,
                            title: item.title,
                            source: item.source_label
                          });
                        }}
                        className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                      >
                        <History className="w-3 h-3" />
                        Audit Trace
                      </button>
                      <span className="text-amber-400 flex items-center gap-0.5 font-semibold">
                        {item.recommended_action || t('viewDetailsBtn')}
                        <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </MobileCard>

      {/* 3. MY WORK SECTION (Assigned Execution Queue) */}
      <MobileCard className="p-4 bg-slate-900 border-slate-800 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4 text-amber-400" />
            <h3 className="font-semibold text-xs text-slate-200 uppercase font-mono tracking-wider">
              {t('myWorkSectionTitle')}
            </h3>
          </div>
          <span className="text-[10px] font-mono text-slate-400">
            {myWorkItems.length} Assigned Items
          </span>
        </div>

        {myWorkItems.length === 0 ? (
          <div className="p-3 text-center text-xs text-slate-500 font-mono bg-slate-950/40 rounded-xl border border-slate-800">
            {t('noMyWorkItems')}
          </div>
        ) : (
          <div className="space-y-2">
            {myWorkItems.slice(0, 4).map((work: MyWorkItem) => (
              <div
                key={`mw-${work.id}`}
                onClick={() => onNavigateTab(parseDeepLinkToTab(work.deep_link))}
                className="p-3 bg-slate-950/60 hover:bg-slate-950 border border-slate-800/80 rounded-xl space-y-1.5 cursor-pointer transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-semibold text-slate-300 flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${work.priority === 'CRITICAL' ? 'bg-red-400' : 'bg-amber-400'}`} />
                    {work.title}
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-slate-300 uppercase">
                    {work.status}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span>{work.work_type} #{work.id}</span>
                  <span className="text-amber-400/90">{work.due_at ? `Due ${work.due_at}` : 'Action Pending'}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        <TouchButton
          variant="primary"
          fullWidth
          size="md"
          onClick={() => onNavigateTab('tasks')}
          icon={<ArrowRight className="w-4 h-4" />}
        >
          {t('openWorkQueue')}
        </TouchButton>
      </MobileCard>

      {/* 4. NEARBY FIELD HAZARDS & CONTEXT (GIS Proximity) */}
      <MobileCard className="p-4 bg-slate-900 border-slate-800 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-400" />
            <h3 className="font-semibold text-xs text-slate-200 uppercase font-mono tracking-wider">
              {t('nearbySectionTitle')}
            </h3>
          </div>
          <TouchButton
            variant="ghost"
            size="sm"
            onClick={() => onNavigateTab('map')}
            className="!p-1 text-emerald-400 text-xs"
          >
            Open 2D GIS Map
          </TouchButton>
        </div>

        {nearbyItems.length === 0 ? (
          <div className="p-3 text-center text-xs text-slate-500 font-mono bg-slate-950/40 rounded-xl border border-slate-800">
            {t('noNearbyItems')}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {nearbyItems.map((nearby: NearbyItem) => (
              <div
                key={`nb-${nearby.id}`}
                onClick={() => onNavigateTab(parseDeepLinkToTab(nearby.deep_link))}
                className="p-2.5 bg-slate-950/60 hover:bg-slate-950 border border-slate-800/80 rounded-xl space-y-1 cursor-pointer"
              >
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="text-emerald-400 font-bold">{nearby.distance_meters ? `${nearby.distance_meters}m` : 'Nearby'}</span>
                  <span className={`px-1 py-0.2 rounded border text-[9px] ${getSeverityBadge(nearby.severity)}`}>
                    {nearby.severity}
                  </span>
                </div>
                <div className="text-xs font-semibold text-slate-200 truncate">
                  {nearby.title}
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  {nearby.item_type}
                </div>
              </div>
            ))}
          </div>
        )}
      </MobileCard>

      {/* 5. ROLE-AWARE QUICK ACTIONS */}
      <div className="space-y-2.5 pt-1">
        <div className="flex items-center justify-between px-1">
          <span className="font-mono text-xs font-bold text-slate-400 uppercase tracking-wider">
            {t('quickActionsTitle')}
          </span>
          <span className="text-[10px] font-mono text-amber-500 uppercase">
            {primaryRole}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {/* Action 1: New Inspection */}
          {canMobile('INSPECTION_CREATE', user) && (
            <TouchButton
              variant="secondary"
              className="flex-col !items-start !justify-between p-3.5 h-auto min-h-[80px] bg-slate-900/90 text-left border-slate-800"
              onClick={() => onNavigateTab('tasks')}
            >
              <div className="flex items-center justify-between w-full">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 uppercase">CMR 2017</span>
              </div>
              <div className="mt-2">
                <div className="font-semibold text-xs text-slate-100">{t('startInspection')}</div>
                <div className="text-[10px] text-slate-400 font-mono">Statutory Checklist</div>
              </div>
            </TouchButton>
          )}

          {/* Action 2: Field Report */}
          <TouchButton
            variant="secondary"
            className="flex-col !items-start !justify-between p-3.5 h-auto min-h-[80px] bg-slate-900/90 text-left border-slate-800"
            onClick={() => onNavigateTab('reporting')}
          >
            <div className="flex items-center justify-between w-full">
              <FileSpreadsheet className="w-5 h-5 text-indigo-400" />
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 uppercase">MOBILE-12</span>
            </div>
            <div className="mt-2">
              <div className="font-semibold text-xs text-slate-100">{t('fieldReportingTitle')}</div>
              <div className="text-[10px] text-slate-400 font-mono">Production & Env</div>
            </div>
          </TouchButton>

          {/* Action 3: Report Incident */}
          {canMobile('INCIDENT_REPORT', user) && (
            <TouchButton
              variant="secondary"
              className="flex-col !items-start !justify-between p-3.5 h-auto min-h-[80px] bg-slate-900/90 text-left border-slate-800"
              onClick={() => onNavigateTab('incidents')}
            >
              <div className="flex items-center justify-between w-full">
                <AlertOctagon className="w-5 h-5 text-red-400" />
                <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
              </div>
              <div className="mt-2">
                <div className="font-semibold text-xs text-slate-100">{t('reportIncident')}</div>
                <div className="text-[10px] text-slate-400 font-mono">Immediate Escalation</div>
              </div>
            </TouchButton>
          )}

          {/* Action 4: Log Grievance */}
          <TouchButton
            variant="secondary"
            className="flex-col !items-start !justify-between p-3.5 h-auto min-h-[80px] bg-slate-900/90 text-left border-slate-800"
            onClick={() => onNavigateTab('grievances')}
          >
            <div className="flex items-center justify-between w-full">
              <FileText className="w-5 h-5 text-pink-400" />
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 uppercase">PGRM</span>
            </div>
            <div className="mt-2">
              <div className="font-semibold text-xs text-slate-100">{t('grievancesFieldTitle')}</div>
              <div className="text-[10px] text-slate-400 font-mono">Citizen / Worker</div>
            </div>
          </TouchButton>

          {/* Action 5: Contractor SLA Operations */}
          <TouchButton
            variant="secondary"
            className="flex-col !items-start !justify-between p-3.5 h-auto min-h-[80px] bg-slate-900/90 text-left border-slate-800"
            onClick={() => onNavigateTab('contractors')}
          >
            <div className="flex items-center justify-between w-full">
              <UserCheck className="w-5 h-5 text-yellow-400" />
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 uppercase">SLA</span>
            </div>
            <div className="mt-2">
              <div className="font-semibold text-xs text-slate-100">{t('contractorsFieldTitle')}</div>
              <div className="text-[10px] text-slate-400 font-mono">Requirements & Audit</div>
            </div>
          </TouchButton>

          {/* Action 6: Shift Handover */}
          <TouchButton
            variant="secondary"
            className="flex-col !items-start !justify-between p-3.5 h-auto min-h-[80px] bg-slate-900/90 text-left border-slate-800"
            onClick={() => onNavigateTab('workforce')}
          >
            <div className="flex items-center justify-between w-full">
              <Clock className="w-5 h-5 text-cyan-400" />
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 uppercase">MOBILE-11</span>
            </div>
            <div className="mt-2">
              <div className="font-semibold text-xs text-slate-100">{t('shiftHandoverTab')}</div>
              <div className="text-[10px] text-slate-400 font-mono">Unresolved Shift Log</div>
            </div>
          </TouchButton>
        </div>
      </div>

      {/* 6. AI COPILOT LAUNCHER */}
      <MobileCard 
        interactive 
        onClick={() => onNavigateTab('copilot')}
        className="p-4 bg-gradient-to-r from-slate-900 to-indigo-950/40 border-indigo-500/30"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="font-semibold text-xs text-slate-100">{t('aiCopilot')}</div>
              <div className="text-[11px] text-slate-400 font-mono">Ask DGMS rules, gas limits & operational queries</div>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400" />
        </div>
      </MobileCard>

      {/* 7. CROSS-DOMAIN AUDIT & RELATED RECORDS MODAL */}
      {selectedEntityForModal && selectedMine?.id && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-2 animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl p-4 max-h-[85vh] overflow-y-auto space-y-4 shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div>
                <div className="text-[10px] font-mono text-amber-400 uppercase font-bold">
                  {selectedEntityForModal.source} TRACE
                </div>
                <h3 className="text-sm font-bold text-slate-100">
                  {selectedEntityForModal.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedEntityForModal(null)}
                className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Sub-tabs */}
            <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800 font-mono text-xs">
              <button
                onClick={() => setActiveModalTab('timeline')}
                className={`py-1.5 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                  activeModalTab === 'timeline'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                Audit Timeline
              </button>
              <button
                onClick={() => setActiveModalTab('related')}
                className={`py-1.5 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                  activeModalTab === 'related'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Link2 className="w-3.5 h-3.5" />
                Related Records
              </button>
            </div>

            {activeModalTab === 'timeline' ? (
              <UnifiedTimelineWidget
                resourceType={selectedEntityForModal.type}
                resourceId={selectedEntityForModal.id}
                mineId={selectedMine.id}
              />
            ) : (
              <RelatedRecordsWidget
                resourceType={selectedEntityForModal.type}
                resourceId={selectedEntityForModal.id}
                mineId={selectedMine.id}
                onNavigate={(tab) => {
                  setSelectedEntityForModal(null);
                  onNavigateTab(tab as MobileTab);
                }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};
