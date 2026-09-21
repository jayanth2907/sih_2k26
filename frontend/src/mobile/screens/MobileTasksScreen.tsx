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
  Layers3, 
  Sparkles,
  Info
} from 'lucide-react';
import { mobileApi, FieldInspection } from '../../services';
import clsx from 'clsx';

export const MobileTasksScreen: React.FC = () => {
  const { selectedMine } = useMineContext();
  const { t } = useLanguage();

  const [inspections, setInspections] = useState<FieldInspection[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filter, setFilter] = useState<'ALL' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED'>('ALL');
  const [search, setSearch] = useState<string>('');

  useEffect(() => {
    let isMounted = true;
    const fetchTasks = async () => {
      setLoading(true);
      try {
        if (selectedMine?.id) {
          const data = await mobileApi.getAssignedInspections(selectedMine.id);
          if (isMounted) setInspections(Array.isArray(data) ? data : []);
        } else {
          if (isMounted) setInspections([]);
        }
      } catch {
        if (isMounted) setInspections([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchTasks();
    return () => {
      isMounted = false;
    };
  }, [selectedMine?.id]);

  const filteredInspections = inspections.filter((item: any) => {
    const matchesFilter =
      filter === 'ALL' ||
      (filter === 'ASSIGNED' && (item.status === 'ASSIGNED' || item.status === 'SCHEDULED')) ||
      (filter === 'IN_PROGRESS' && item.status === 'IN_PROGRESS') ||
      (filter === 'COMPLETED' && (item.status === 'COMPLETED' || item.status === 'SUBMITTED'));

    const query = search.toLowerCase();
    const matchesSearch =
      !search ||
      item.inspection_code?.toLowerCase().includes(query) ||
      item.title?.toLowerCase().includes(query) ||
      item.zone_name?.toLowerCase().includes(query);

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
        <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
          MOBILE-01
        </span>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search task code, zone or title..."
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

      {/* Notice Banner */}
      <div className="rounded-xl border border-indigo-500/20 bg-indigo-950/20 p-3 text-[11px] font-mono text-indigo-300 flex items-start gap-2">
        <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
        <span>
          Task execution & dynamic DGMS checklists activate in <strong>MOBILE-02</strong>. Below shows live task queue state.
        </span>
      </div>

      {/* Task List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-slate-900/60 border border-slate-800 animate-pulse" />
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
              Any statutory shift inspections or risk mitigation tasks assigned to your role will appear here automatically.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredInspections.map((item: any) => (
            <MobileCard key={item.id} className="p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-amber-400">
                      {item.inspection_code || `TASK-#${item.id}`}
                    </span>
                    <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 uppercase">
                      {item.inspection_type || 'STATUTORY'}
                    </span>
                  </div>
                  <h4 className="font-semibold text-sm text-slate-100 font-sans">
                    {item.title || 'General Mine Statutory Inspection'}
                  </h4>
                </div>

                <span
                  className={clsx(
                    'font-mono text-[10px] px-2 py-0.5 rounded-full font-bold uppercase',
                    item.status === 'COMPLETED'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : item.status === 'IN_PROGRESS'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  )}
                >
                  {item.status || 'ASSIGNED'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono text-slate-400 border-t border-slate-800/80 pt-2.5">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" />
                  <span className="truncate">{item.zone_name || 'Main Working Face'}</span>
                </div>
                <div className="flex items-center gap-1.5 justify-end">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>{item.scheduled_time ? new Date(item.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Shift 1'}</span>
                </div>
              </div>

              <TouchButton
                variant="outline"
                size="sm"
                fullWidth
                className="mt-2 text-xs"
                disabled
              >
                Inspection Checklist (Activates in Phase 2)
              </TouchButton>
            </MobileCard>
          ))}
        </div>
      )}
    </div>
  );
};
