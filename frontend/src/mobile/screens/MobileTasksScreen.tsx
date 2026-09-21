import React, { useState, useEffect } from 'react';
import { useMineContext } from '../../context/MineContext';
import { useLanguage } from '../../context/LanguageContext';
import { MobileCard } from '../components/MobileCard';
import { TouchButton } from '../components/TouchButton';
import { 
  ClipboardCheck, 
  Clock, 
  MapPin, 
  AlertTriangle, 
  CheckCircle2, 
  Search, 
  Flame,
  ArrowRight,
  ShieldAlert,
  Calendar,
  Activity,
  UserCheck
} from 'lucide-react';
import { mobileApi, FieldInspection } from '../../services';
import { MobileInspectionExecutionScreen } from './MobileInspectionExecutionScreen';
import clsx from 'clsx';

export const MobileTasksScreen: React.FC = () => {
  const { selectedMine } = useMineContext();
  const { t } = useLanguage();

  const [inspections, setInspections] = useState<FieldInspection[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filter, setFilter] = useState<'ALL' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED'>('ALL');
  const [search, setSearch] = useState<string>('');
  const [selectedInspectionId, setSelectedInspectionId] = useState<number | null>(null);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      if (selectedMine?.id) {
        const data = await mobileApi.getAssignedInspections(selectedMine.id);
        setInspections(Array.isArray(data) ? data : []);
      } else {
        setInspections([]);
      }
    } catch {
      setInspections([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [selectedMine?.id]);

  // If a user has opened a specific inspection for execution
  if (selectedInspectionId !== null) {
    return (
      <MobileInspectionExecutionScreen
        inspectionId={selectedInspectionId}
        onBack={() => setSelectedInspectionId(null)}
        onSubmitted={() => {
          setSelectedInspectionId(null);
          fetchTasks();
        }}
      />
    );
  }

  const filteredInspections = inspections.filter((item: any) => {
    const matchesFilter =
      filter === 'ALL' ||
      (filter === 'ASSIGNED' && (item.status === 'ASSIGNED' || item.status === 'SCHEDULED')) ||
      (filter === 'IN_PROGRESS' && item.status === 'IN_PROGRESS') ||
      (filter === 'COMPLETED' && (item.status === 'COMPLETED' || item.status === 'SUBMITTED' || item.status === 'VERIFIED'));

    const query = search.toLowerCase();
    const matchesSearch =
      !search ||
      item.inspection_code?.toLowerCase().includes(query) ||
      item.summary_notes?.toLowerCase().includes(query) ||
      item.title?.toLowerCase().includes(query) ||
      item.zone_name?.toLowerCase().includes(query) ||
      item.inspection_type?.toLowerCase().includes(query);

    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-4 pb-20 max-w-lg mx-auto">
      {/* Title & Filter Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-100 font-sans">
            {t('assignedTasks')}
          </h2>
          <span className="text-[11px] font-mono text-slate-400">
            {selectedMine?.name || 'Mine'} • {filteredInspections.length} tasks
          </span>
        </div>
        <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-950/40 text-emerald-400 border border-emerald-500/30 font-bold">
          MOBILE-02 ACTIVE
        </span>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search task ID, title, zone or type..."
          className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500/50 min-h-[44px]"
        />
      </div>

      {/* Status Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {(['ALL', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={clsx(
              'px-3 py-1.5 rounded-xl font-mono text-[11px] uppercase transition-all shrink-0 min-h-[40px] flex items-center',
              filter === f
                ? 'bg-amber-500 text-slate-950 font-bold shadow-sm shadow-amber-500/20'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Task List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-slate-900/60 border border-slate-800 animate-pulse" />
          ))}
        </div>
      ) : filteredInspections.length === 0 ? (
        <div className="py-12 px-4 text-center rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-800/80 flex items-center justify-center mx-auto text-slate-400">
            <ClipboardCheck className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold text-sm text-slate-200">
              {t('noTasksAssigned')}
            </h3>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              Statutory inspections and predictive risk mitigation tasks assigned to your role appear here automatically.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredInspections.map((item: any) => {
            const isHighPriority = item.severity_assessment === 'HIGH' || item.severity_assessment === 'CRITICAL' || (item.predicted_zone_risk && item.predicted_zone_risk > 60);
            
            return (
              <MobileCard key={item.id} className="p-4 space-y-3">
                {/* Header: Code, Priority, Status */}
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-amber-400">
                        {item.inspection_code || `TASK-#${item.id}`}
                      </span>
                      <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 uppercase">
                        {item.inspection_type?.replace(/_/g, ' ') || 'STATUTORY'}
                      </span>
                      {isHighPriority && (
                        <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-red-950/60 text-red-400 border border-red-500/40 uppercase font-bold flex items-center gap-1">
                          <Flame className="w-2.5 h-2.5" />
                          HIGH PRIORITY
                        </span>
                      )}
                    </div>
                    <h4 className="font-semibold text-sm text-slate-100 font-sans">
                      {item.summary_notes || item.title || 'Statutory Face Inspection & Gas Verification'}
                    </h4>
                  </div>

                  <span
                    className={clsx(
                      'font-mono text-[10px] px-2 py-0.5 rounded-full font-bold uppercase shrink-0 border',
                      item.status === 'COMPLETED' || item.status === 'SUBMITTED' || item.status === 'VERIFIED'
                        ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                        : item.status === 'IN_PROGRESS'
                        ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
                        : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                    )}
                  >
                    {item.status || 'SCHEDULED'}
                  </span>
                </div>

                {/* Location & Schedule Context */}
                <div className="grid grid-cols-2 gap-2 text-xs font-mono text-slate-400 border-t border-slate-800/80 pt-2.5">
                  <div className="flex items-center gap-1.5 truncate">
                    <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="truncate">{item.zone_name || 'East Longwall Face 102'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 justify-end">
                    <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>{item.scheduled_date ? new Date(item.scheduled_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Due Shift 1'}</span>
                  </div>
                </div>

                {/* Reason / Predictive Risk Info */}
                <div className="rounded-lg bg-slate-950/80 border border-slate-800/80 p-2 text-[11px] font-mono text-slate-300 flex items-center justify-between">
                  <span className="text-slate-500">{t('reasonContextLabel')}:</span>
                  <span className="text-amber-400 font-semibold truncate max-w-[200px]">
                    {item.predicted_zone_risk && item.predicted_zone_risk > 50 ? 'Predictive risk hotspot' : 'Routine compliance schedule'}
                  </span>
                </div>

                {/* Open / Start Task Action */}
                <TouchButton
                  variant={item.status === 'COMPLETED' ? 'outline' : 'primary'}
                  size="md"
                  fullWidth
                  onClick={() => setSelectedInspectionId(item.id)}
                  icon={item.status === 'COMPLETED' ? <CheckCircle2 className="w-4 h-4" /> : <ClipboardCheck className="w-4 h-4" />}
                >
                  {item.status === 'COMPLETED'
                    ? t('viewInspectionBtn')
                    : item.status === 'IN_PROGRESS'
                    ? 'Continue Inspection'
                    : t('openTaskBtn')}
                </TouchButton>
              </MobileCard>
            );
          })}
        </div>
      )}
    </div>
  );
};
