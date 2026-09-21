import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useMineContext } from '../../context/MineContext';
import { useLanguage } from '../../context/LanguageContext';
import { canMobile } from '../rbac/mobilePermissions';
import { MobileTab } from '../types/mobile';
import { MobileCard } from '../components/MobileCard';
import { TouchButton } from '../components/TouchButton';
import { 
  ClipboardCheck, 
  AlertOctagon, 
  Camera, 
  Eye, 
  ShieldCheck, 
  FileSpreadsheet, 
  Users, 
  Flame, 
  Activity, 
  CheckCircle2, 
  Clock, 
  Sparkles,
  ArrowRight,
  Info
} from 'lucide-react';
import { mobileApi, FieldInspection } from '../../services';

interface MobileHomeScreenProps {
  onNavigateTab: (tab: MobileTab) => void;
}

export const MobileHomeScreen: React.FC<MobileHomeScreenProps> = ({ onNavigateTab }) => {
  const { user } = useAuth();
  const { selectedMine } = useMineContext();
  const { t } = useLanguage();

  const [inspections, setInspections] = useState<FieldInspection[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Read assigned inspections from existing backend mobile endpoint
  useEffect(() => {
    let isMounted = true;
    const loadFieldData = async () => {
      setIsLoading(true);
      try {
        if (selectedMine?.id) {
          const data = await mobileApi.getAssignedInspections(selectedMine.id);
          if (isMounted) {
            setInspections(Array.isArray(data) ? data : []);
          }
        } else {
          if (isMounted) setInspections([]);
        }
      } catch {
        if (isMounted) setInspections([]);
      } finally {
        if (isMounted) setIsLoading(false);
      }

      // Read local sync queue count if present
      try {
        const rawQueue = localStorage.getItem('trinetra_field_sync_queue');
        if (rawQueue) {
          const parsed = JSON.parse(rawQueue);
          if (Array.isArray(parsed) && isMounted) {
            setPendingSyncCount(parsed.filter((item: any) => item.sync_status === 'PENDING').length);
          }
        }
      } catch {
        // queue error fallback
      }
    };

    loadFieldData();
    return () => {
      isMounted = false;
    };
  }, [selectedMine?.id]);

  const assignedTasksCount = inspections.length;
  const highPriorityCount = inspections.filter((i: any) => i.priority === 'HIGH' || i.priority === 'CRITICAL').length;
  const primaryRole = user?.roles?.[0] || 'FIELD_INSPECTOR';

  const handleActionClick = (actionName: string, targetTab?: MobileTab) => {
    if (targetTab) {
      onNavigateTab(targetTab);
      return;
    }
    setActionNotice(`${actionName}: Mobile execution engine activates in Phase 2+`);
    setTimeout(() => setActionNotice(null), 3500);
  };

  return (
    <div className="space-y-4 pb-20 max-w-lg mx-auto">
      {/* Field Intelligence Motto Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/40 border border-amber-500/20 p-4 shadow-lg">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] font-bold tracking-widest text-amber-400 uppercase">
                {t('trinetraField')}
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            </div>
            <h1 className="text-lg font-bold text-slate-100 font-sans tracking-tight">
              {selectedMine?.name || t('selectMinePrompt')}
            </h1>
            <p className="text-xs text-slate-400 font-mono">
              {user?.full_name} • <span className="text-amber-400/90 font-semibold">{primaryRole.replace(/_/g, ' ')}</span>
            </p>
          </div>
          <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
          <span className="italic text-slate-300">"{t('fieldMotto')}"</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 uppercase">
            Phase 1 Foundation
          </span>
        </div>
      </div>

      {/* Action Notification Toast */}
      {actionNotice && (
        <div className="rounded-xl bg-amber-500/15 border border-amber-500/40 p-3 text-xs text-amber-200 flex items-center gap-2 animate-in fade-in duration-150">
          <Info className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* TODAY High-Value Operational Metrics */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="font-mono text-xs font-bold text-slate-400 uppercase tracking-wider">
            {t('todayOverview')}
          </span>
          <span className="text-[11px] font-mono text-slate-500">
            {new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          <MobileCard 
            interactive 
            onClick={() => onNavigateTab('tasks')}
            className="p-3 text-center flex flex-col items-center justify-center min-h-[88px]"
          >
            <div className="text-2xl font-bold font-mono text-slate-100">
              {isLoading ? '...' : assignedTasksCount}
            </div>
            <div className="text-[11px] font-medium text-slate-400 mt-1 line-clamp-1">
              {t('assignedTasks')}
            </div>
          </MobileCard>

          <MobileCard 
            interactive 
            onClick={() => onNavigateTab('tasks')}
            className="p-3 text-center flex flex-col items-center justify-center min-h-[88px]"
            variant={highPriorityCount > 0 ? 'critical' : 'default'}
          >
            <div className={`text-2xl font-bold font-mono ${highPriorityCount > 0 ? 'text-red-400' : 'text-slate-100'}`}>
              {isLoading ? '...' : highPriorityCount}
            </div>
            <div className="text-[11px] font-medium text-slate-400 mt-1 line-clamp-1">
              {t('highPriority')}
            </div>
          </MobileCard>

          <MobileCard 
            interactive 
            onClick={() => onNavigateTab('more')}
            className="p-3 text-center flex flex-col items-center justify-center min-h-[88px]"
            variant={pendingSyncCount > 0 ? 'amber' : 'default'}
          >
            <div className={`text-2xl font-bold font-mono ${pendingSyncCount > 0 ? 'text-amber-400' : 'text-slate-100'}`}>
              {pendingSyncCount}
            </div>
            <div className="text-[11px] font-medium text-slate-400 mt-1 line-clamp-1">
              {t('pendingSync')}
            </div>
          </MobileCard>
        </div>
      </div>

      {/* Role-Adaptive Quick Actions */}
      <div className="space-y-2.5 pt-1">
        <div className="flex items-center justify-between px-1">
          <span className="font-mono text-xs font-bold text-slate-400 uppercase tracking-wider">
            {t('quickActions')}
          </span>
          <span className="text-[10px] font-mono text-amber-500 uppercase">
            {primaryRole}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {/* Action 1: My Tasks */}
          <TouchButton
            variant="secondary"
            className="flex-col !items-start !justify-between p-3.5 h-auto min-h-[80px] bg-slate-900/90 text-left border-slate-800"
            onClick={() => onNavigateTab('tasks')}
          >
            <div className="flex items-center justify-between w-full">
              <ClipboardCheck className="w-5 h-5 text-amber-400" />
              <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
            </div>
            <div className="mt-2">
              <div className="font-semibold text-xs text-slate-100">{t('myTasks')}</div>
              <div className="text-[10px] text-slate-400 font-mono">{assignedTasksCount} active</div>
            </div>
          </TouchButton>

          {/* Action 2: Field Inspection / Audit */}
          {canMobile('INSPECTION_CREATE', user) && (
            <TouchButton
              variant="secondary"
              className="flex-col !items-start !justify-between p-3.5 h-auto min-h-[80px] bg-slate-900/90 text-left border-slate-800"
              onClick={() => onNavigateTab('tasks')}
            >
              <div className="flex items-center justify-between w-full">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 uppercase">DGMS</span>
              </div>
              <div className="mt-2">
                <div className="font-semibold text-xs text-slate-100">{t('conductInspection')}</div>
                <div className="text-[10px] text-slate-400 font-mono">CMR 2017 Format</div>
              </div>
            </TouchButton>
          )}

          {/* Action 3: Report Incident */}
          {canMobile('INCIDENT_REPORT', user) && (
            <TouchButton
              variant="secondary"
              className="flex-col !items-start !justify-between p-3.5 h-auto min-h-[80px] bg-slate-900/90 text-left border-slate-800"
              onClick={() => handleActionClick('Report Incident')}
            >
              <div className="flex items-center justify-between w-full">
                <AlertOctagon className="w-5 h-5 text-red-400" />
                <span className="w-2 h-2 rounded-full bg-red-400" />
              </div>
              <div className="mt-2">
                <div className="font-semibold text-xs text-slate-100">{t('reportIncident')}</div>
                <div className="text-[10px] text-slate-400 font-mono">Urgent Hazard</div>
              </div>
            </TouchButton>
          )}

          {/* Action 4: Capture Evidence */}
          {canMobile('EVIDENCE_CAPTURE', user) && (
            <TouchButton
              variant="secondary"
              className="flex-col !items-start !justify-between p-3.5 h-auto min-h-[80px] bg-slate-900/90 text-left border-slate-800"
              onClick={() => handleActionClick('Capture Evidence')}
            >
              <div className="flex items-center justify-between w-full">
                <Camera className="w-5 h-5 text-cyan-400" />
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 uppercase">SHA-256</span>
              </div>
              <div className="mt-2">
                <div className="font-semibold text-xs text-slate-100">{t('captureEvidence')}</div>
                <div className="text-[10px] text-slate-400 font-mono">Geo-Tagged Seal</div>
              </div>
            </TouchButton>
          )}

          {/* Action 5: Safety Audit (Safety Officer / Regulator) */}
          {canMobile('STATUTORY_AUDIT', user) && (
            <TouchButton
              variant="secondary"
              className="flex-col !items-start !justify-between p-3.5 h-auto min-h-[80px] bg-slate-900/90 text-left border-slate-800"
              onClick={() => handleActionClick('Statutory Audit')}
            >
              <div className="flex items-center justify-between w-full">
                <FileSpreadsheet className="w-5 h-5 text-purple-400" />
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 uppercase">DGMS</span>
              </div>
              <div className="mt-2">
                <div className="font-semibold text-xs text-slate-100">{t('statutoryAudit')}</div>
                <div className="text-[10px] text-slate-400 font-mono">Legal Oversight</div>
              </div>
            </TouchButton>
          )}

          {/* Action 6: Approvals / Permits (Mine Manager) */}
          {canMobile('APPROVAL_ACTION', user) && (
            <TouchButton
              variant="secondary"
              className="flex-col !items-start !justify-between p-3.5 h-auto min-h-[80px] bg-slate-900/90 text-left border-slate-800"
              onClick={() => handleActionClick('Shift Approvals')}
            >
              <div className="flex items-center justify-between w-full">
                <ShieldCheck className="w-5 h-5 text-amber-400" />
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 uppercase">Permit</span>
              </div>
              <div className="mt-2">
                <div className="font-semibold text-xs text-slate-100">{t('shiftApprovals')}</div>
                <div className="text-[10px] text-slate-400 font-mono">Work Permittees</div>
              </div>
            </TouchButton>
          )}

          {/* Action 7: Field Observation */}
          {canMobile('OBSERVATION_CREATE', user) && (
            <TouchButton
              variant="secondary"
              className="flex-col !items-start !justify-between p-3.5 h-auto min-h-[80px] bg-slate-900/90 text-left border-slate-800"
              onClick={() => handleActionClick('Record Observation')}
            >
              <div className="flex items-center justify-between w-full">
                <Eye className="w-5 h-5 text-indigo-400" />
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 uppercase">Field</span>
              </div>
              <div className="mt-2">
                <div className="font-semibold text-xs text-slate-100">{t('fieldObservation')}</div>
                <div className="text-[10px] text-slate-400 font-mono">Atmosphere & Strata</div>
              </div>
            </TouchButton>
          )}
        </div>
      </div>

      {/* Field Intelligence Assistant Launcher */}
      <MobileCard 
        interactive 
        onClick={() => onNavigateTab('copilot')}
        className="p-4 bg-gradient-to-r from-slate-900 to-indigo-950/30 border-indigo-500/20"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="font-semibold text-xs text-slate-100">{t('aiCopilot')}</div>
              <div className="text-[11px] text-slate-400 font-mono">Ask DGMS rules, gas limits & SOPs</div>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400" />
        </div>
      </MobileCard>

      {/* Foundation Status Alert */}
      <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-[11px] font-mono text-slate-400 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
        <span className="leading-relaxed">
          {t('phaseFoundationNotice')}
        </span>
      </div>
    </div>
  );
};
