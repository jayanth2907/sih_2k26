import React, { useState, useEffect, useMemo } from 'react';
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
  UserCheck,
  X,
  Play,
  RotateCcw,
  Check,
  Bot,
  ChevronRight,
  Filter
} from 'lucide-react';
import { mobileApi, GovernanceTask, WorkQueueCounts } from '../../services';
import { MobileInspectionExecutionScreen } from './MobileInspectionExecutionScreen';
import clsx from 'clsx';

interface MobileTasksScreenProps {
  onNavigateTab?: (tab: any) => void;
}

type TabType = 'ALL' | 'ASSIGNED' | 'IN_PROGRESS' | 'DUE_TODAY' | 'OVERDUE' | 'COMPLETED' | 'VERIFICATION';
type PriorityFilter = 'ALL' | 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export const MobileTasksScreen: React.FC<MobileTasksScreenProps> = ({ onNavigateTab }) => {
  const { selectedMine, setFocusedTarget, setCurrentTab } = useMineContext();
  const { t } = useLanguage();

  const [tasks, setTasks] = useState<GovernanceTask[]>([]);
  const [counts, setCounts] = useState<WorkQueueCounts | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<TabType>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('ALL');
  const [search, setSearch] = useState<string>('');
  
  // Selected inspection execution view
  const [selectedInspectionId, setSelectedInspectionId] = useState<number | null>(null);
  
  // Selected task detail view modal
  const [selectedTask, setSelectedTask] = useState<GovernanceTask | null>(null);
  
  // Task completion / review modal
  const [reviewModalTask, setReviewModalTask] = useState<GovernanceTask | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState<string>('');
  const [evidenceConfirmed, setEvidenceConfirmed] = useState<boolean>(false);
  const [actionSubmitting, setActionSubmitting] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchWorkQueue = async () => {
    setLoading(true);
    try {
      if (selectedMine?.id) {
        const data = await mobileApi.getWorkQueue(selectedMine.id);
        if (data && Array.isArray(data.tasks)) {
          setTasks(data.tasks);
          setCounts(data.counts || null);
        } else {
          setTasks([]);
          setCounts(null);
        }
      } else {
        setTasks([]);
        setCounts(null);
      }
    } catch {
      setTasks([]);
      setCounts(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkQueue();
  }, [selectedMine?.id]);

  // Handle task status transition
  const handleStatusTransition = async (taskId: number, newStatus: string, notes?: string) => {
    setActionSubmitting(true);
    setActionError(null);
    try {
      const updated = await mobileApi.updateTaskStatus(taskId, {
        status: newStatus,
        resolution_notes: notes
      });
      // Update local task state
      setTasks((prev: GovernanceTask[]) => prev.map(item => item.id === taskId ? { ...item, ...updated } : item));
      if (selectedTask?.id === taskId) {
        setSelectedTask((prev: GovernanceTask | null) => prev ? { ...prev, ...updated } : null);
      }
      setReviewModalTask(null);
      setResolutionNotes('');
      setEvidenceConfirmed(false);
      // Refresh list to update counters accurately
      fetchWorkQueue();
    } catch (err: any) {
      const errorMsg = err?.response?.data?.detail || 'Failed to update task status';
      setActionError(errorMsg);
    } finally {
      setActionSubmitting(false);
    }
  };

  // If a user opened a specific inspection for execution
  if (selectedInspectionId !== null) {
    return (
      <MobileInspectionExecutionScreen
        inspectionId={selectedInspectionId}
        onBack={() => setSelectedInspectionId(null)}
        onSubmitted={() => {
          setSelectedInspectionId(null);
          fetchWorkQueue();
        }}
      />
    );
  }

  // Filter and Sort Tasks
  const filteredTasks = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    return tasks.filter((task) => {
      // 1. Tab filter
      let matchesTab = true;
      const status = (task.status || 'OPEN').toUpperCase();
      const dueDate = task.due_date ? new Date(task.due_date) : null;
      const isOverdue = dueDate ? dueDate < now && status !== 'RESOLVED' && status !== 'VERIFIED' && status !== 'CLOSED' : false;
      const isDueToday = dueDate ? task.due_date?.startsWith(todayStr) : false;

      if (activeTab === 'ASSIGNED') {
        matchesTab = status === 'ASSIGNED' || status === 'OPEN';
      } else if (activeTab === 'IN_PROGRESS') {
        matchesTab = status === 'IN_PROGRESS';
      } else if (activeTab === 'DUE_TODAY') {
        matchesTab = Boolean(isDueToday && status !== 'RESOLVED' && status !== 'VERIFIED' && status !== 'CLOSED');
      } else if (activeTab === 'OVERDUE') {
        matchesTab = isOverdue;
      } else if (activeTab === 'COMPLETED') {
        matchesTab = status === 'RESOLVED' || status === 'VERIFIED' || status === 'CLOSED';
      } else if (activeTab === 'VERIFICATION') {
        matchesTab = status === 'RESOLVED';
      }

      // 2. Priority filter
      let matchesPriority = true;
      if (priorityFilter !== 'ALL') {
        matchesPriority = (task.priority || 'MEDIUM').toUpperCase() === priorityFilter;
      }

      // 3. Search query
      let matchesSearch = true;
      if (search.trim()) {
        const q = search.toLowerCase();
        matchesSearch =
          (task.title || '').toLowerCase().includes(q) ||
          (task.description || '').toLowerCase().includes(q) ||
          (task.category || '').toLowerCase().includes(q) ||
          (task.zone_name || '').toLowerCase().includes(q) ||
          (task.source_resource_type || '').toLowerCase().includes(q) ||
          (task.task_type || '').toLowerCase().includes(q);
      }

      return matchesTab && matchesPriority && matchesSearch;
    }).sort((a, b) => {
      // Deterministic priority ordering: CRITICAL > HIGH > MEDIUM > LOW
      const priorityWeight: Record<string, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
      const weightA = priorityWeight[(a.priority || 'MEDIUM').toUpperCase()] || 0;
      const weightB = priorityWeight[(b.priority || 'MEDIUM').toUpperCase()] || 0;

      if (weightA !== weightB) {
        return weightB - weightA;
      }

      // Next by due_date ascending (closest deadline first)
      if (a.due_date && b.due_date) {
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      }
      if (a.due_date) return -1;
      if (b.due_date) return 1;

      // Fallback: newest created first
      return new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime();
    });
  }, [tasks, activeTab, priorityFilter, search]);

  const tabs: { key: TabType; label: string; count?: number }[] = [
    { key: 'ALL', label: t('allTasks'), count: counts?.total },
    { key: 'ASSIGNED', label: 'ASSIGNED', count: counts?.assigned },
    { key: 'IN_PROGRESS', label: t('inProgress'), count: counts?.in_progress },
    { key: 'DUE_TODAY', label: t('dueToday'), count: counts?.due_today },
    { key: 'OVERDUE', label: t('overdue'), count: counts?.overdue },
    { key: 'VERIFICATION', label: t('verificationQueue'), count: counts?.verification_pending },
    { key: 'COMPLETED', label: t('completed'), count: counts?.completed },
  ];

  const getPriorityBadgeClass = (priority?: string) => {
    switch (priority?.toUpperCase()) {
      case 'CRITICAL':
        return 'bg-red-500/20 text-red-300 border-red-500/40 animate-pulse';
      case 'HIGH':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'MEDIUM':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
      case 'LOW':
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  const getStatusBadgeClass = (status?: string) => {
    switch (status?.toUpperCase()) {
      case 'CLOSED':
      case 'VERIFIED':
        return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
      case 'RESOLVED':
        return 'bg-purple-500/15 text-purple-300 border-purple-500/30';
      case 'IN_PROGRESS':
        return 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30';
      case 'ASSIGNED':
      case 'OPEN':
      default:
        return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
    }
  };

  const formatDueDate = (dateStr?: string) => {
    if (!dateStr) return 'No due date';
    const due = new Date(dateStr);
    const now = new Date();
    const diffHours = Math.round((due.getTime() - now.getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 0) {
      return `Overdue by ${Math.abs(diffHours)}h`;
    } else if (diffHours === 0) {
      return 'Due now';
    } else if (diffHours <= 24) {
      return `Due in ${diffHours}h`;
    } else {
      return due.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
  };

  return (
    <div className="space-y-4 pb-20 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-100 font-sans flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-amber-400" />
            {t('workQueue')}
          </h2>
          <span className="text-[11px] font-mono text-slate-400">
            {selectedMine?.name || 'Mine'} • {filteredTasks.length} tasks
          </span>
        </div>
        <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-950/40 text-emerald-400 border border-emerald-500/30 font-bold">
          MOBILE-06 ACTIVE
        </span>
      </div>

      {/* Tabs scroll area */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs font-mono">
        {tabs.map((tab) => {
          const isSelected = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={clsx(
                'px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all flex items-center gap-1.5 border',
                isSelected
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                  : 'bg-slate-900/90 text-slate-400 border-slate-800 hover:text-slate-200'
              )}
            >
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && (
                <span
                  className={clsx(
                    'text-[10px] px-1.5 py-0.2 rounded-full font-extrabold',
                    isSelected ? 'bg-slate-950 text-amber-400' : 'bg-slate-800 text-slate-300'
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Search & Priority Filter Controls */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by title, zone, source, domain..."
            className="w-full bg-slate-900/90 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs font-mono text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
          />
          {search && (
            <button 
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Priority quick-filter pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-[10px] font-mono">
          <span className="text-slate-500 flex items-center gap-1 px-1">
            <Filter className="w-3 h-3" />
            {t('taskPriority')}:
          </span>
          {(['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as PriorityFilter[]).map((p) => (
            <button
              key={p}
              onClick={() => setPriorityFilter(p)}
              className={clsx(
                'px-2 py-0.5 rounded-lg font-bold border transition-colors',
                priorityFilter === p
                  ? 'bg-slate-800 text-amber-400 border-amber-500/50'
                  : 'bg-slate-950/60 text-slate-500 border-slate-800/80 hover:text-slate-300'
              )}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Task Cards List */}
      {loading ? (
        <div className="p-8 text-center text-slate-400 font-mono text-xs space-y-2">
          <Clock className="w-6 h-6 text-amber-400 animate-spin mx-auto" />
          <p>{t('loadingWorkQueue')}</p>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="p-8 text-center rounded-2xl bg-slate-900/50 border border-slate-800 text-slate-400 font-mono text-xs space-y-2">
          <CheckCircle2 className="w-8 h-8 text-emerald-400/50 mx-auto" />
          <p>{t('noAssignedTasks')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((task) => {
            const isCritical = task.priority === 'CRITICAL';
            const isHigh = task.priority === 'HIGH';
            const isOverdue = task.due_date ? new Date(task.due_date) < new Date() && !['RESOLVED', 'VERIFIED', 'CLOSED'].includes(task.status) : false;

            return (
              <MobileCard
                key={task.id}
                className={clsx(
                  'p-3.5 space-y-3 bg-slate-900 border transition-all relative overflow-hidden',
                  isCritical
                    ? 'border-red-500/50 bg-red-950/10'
                    : isHigh
                    ? 'border-amber-500/40 bg-amber-950/5'
                    : isOverdue
                    ? 'border-orange-500/40'
                    : 'border-slate-800'
                )}
              >
                {/* Top Row: Task Category / Source, Priority & Status */}
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono text-[11px] font-bold text-slate-300">
                        TASK-{task.id}
                      </span>
                      <span className={clsx('font-mono text-[9px] px-1.5 py-0.5 rounded font-bold uppercase border', getPriorityBadgeClass(task.priority))}>
                        {task.priority || 'MEDIUM'}
                      </span>
                      {task.category && (
                        <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 uppercase">
                          {task.category}
                        </span>
                      )}
                      {task.source_resource_type && (
                        <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-blue-950/40 text-blue-300 border border-blue-500/30 uppercase">
                          {task.source_resource_type}
                        </span>
                      )}
                    </div>
                    <h4 
                      onClick={() => setSelectedTask(task)}
                      className="text-sm font-semibold text-slate-100 font-sans leading-tight cursor-pointer hover:text-amber-400 transition-colors"
                    >
                      {task.title}
                    </h4>
                  </div>

                  <span className={clsx('font-mono text-[10px] px-2 py-0.5 rounded-full font-bold uppercase shrink-0 border', getStatusBadgeClass(task.status))}>
                    {task.status || 'OPEN'}
                  </span>
                </div>

                {/* Description snippet */}
                {task.description && (
                  <p className="text-xs text-slate-400 line-clamp-2 font-sans">
                    {task.description}
                  </p>
                )}

                {/* Context & Location Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs font-mono text-slate-400 border-t border-slate-800/80 pt-2.5">
                  <div className="flex items-center gap-1.5 truncate">
                    <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="truncate">{task.zone_name || selectedMine?.name || 'Mine Zone'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 justify-end">
                    <Clock className={clsx('w-3.5 h-3.5 shrink-0', isOverdue ? 'text-red-400' : 'text-slate-500')} />
                    <span className={clsx(isOverdue ? 'text-red-400 font-bold' : 'text-slate-400')}>
                      {formatDueDate(task.due_date)}
                    </span>
                  </div>
                </div>

                {/* Assignment & Reason Snippet */}
                {task.assigned_to_name && (
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 bg-slate-950/60 p-1.5 rounded-lg border border-slate-800/60">
                    <span className="flex items-center gap-1 text-slate-500">
                      <UserCheck className="w-3 h-3 text-slate-500" />
                      {t('assignedTo')}:
                    </span>
                    <span className="text-slate-300 font-semibold truncate max-w-[180px]">
                      {task.assigned_to_name}
                    </span>
                  </div>
                )}

                {/* Task Actions Toolbar */}
                <div className="grid grid-cols-3 gap-1.5 pt-1">
                  {/* View on Map */}
                  <TouchButton
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setFocusedTarget({
                        type: 'zone',
                        id: task.zone_id || task.id,
                        x: task.target_latitude || selectedMine?.latitude || 23.7957,
                        y: 0,
                        z: task.target_longitude || selectedMine?.longitude || 86.4304,
                        title: task.title
                      });
                      if (onNavigateTab) {
                        onNavigateTab('map');
                      } else {
                        setCurrentTab('map');
                      }
                    }}
                    icon={<MapPin className="w-3.5 h-3.5 text-amber-400" />}
                  >
                    {t('viewOnMap')}
                  </TouchButton>

                  {/* Deep Link Action (Start Inspection / Open Incident / Copilot) */}
                  {task.source_resource_type === 'INCIDENT' ? (
                    <TouchButton
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (onNavigateTab) {
                          onNavigateTab('incidents');
                        } else {
                          setCurrentTab('incidents');
                        }
                      }}
                      icon={<AlertTriangle className="w-3.5 h-3.5 text-red-400" />}
                    >
                      Incident
                    </TouchButton>
                  ) : task.task_type === 'INSPECTION' || task.category === 'STATUTORY_INSPECTION' ? (
                    <TouchButton
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        if (task.source_resource_id) {
                          setSelectedInspectionId(Number(task.source_resource_id));
                        } else {
                          setSelectedTask(task);
                        }
                      }}
                      icon={<ClipboardCheck className="w-3.5 h-3.5" />}
                    >
                      Inspect
                    </TouchButton>
                  ) : (
                    <TouchButton
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (onNavigateTab) {
                          onNavigateTab('copilot');
                        } else {
                          setCurrentTab('copilot');
                        }
                      }}
                      icon={<Bot className="w-3.5 h-3.5 text-cyan-400" />}
                    >
                      Copilot
                    </TouchButton>
                  )}

                  {/* Details / Open Modal */}
                  <TouchButton
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedTask(task)}
                    icon={<ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                  >
                    {t('taskDetails')}
                  </TouchButton>
                </div>
              </MobileCard>
            );
          })}
        </div>
      )}

      {/* Task Details Modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom-5">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-800 flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs font-bold text-amber-400">
                    TASK-{selectedTask.id}
                  </span>
                  <span className={clsx('font-mono text-[9px] px-1.5 py-0.5 rounded font-bold uppercase border', getPriorityBadgeClass(selectedTask.priority))}>
                    {selectedTask.priority}
                  </span>
                  <span className={clsx('font-mono text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase border', getStatusBadgeClass(selectedTask.status))}>
                    {selectedTask.status}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-100 font-sans leading-snug">
                  {selectedTask.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 overflow-y-auto space-y-4 text-xs font-sans text-slate-300">
              {/* Description */}
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">
                  Description
                </span>
                <p className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 leading-relaxed">
                  {selectedTask.description || 'No detailed instructions provided.'}
                </p>
              </div>

              {/* Task Attributes Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80 space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase block">{t('taskDomain')}</span>
                  <span className="font-semibold text-slate-200">{selectedTask.category || 'GENERAL'}</span>
                </div>
                <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80 space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase block">Source</span>
                  <span className="font-semibold text-slate-200">{selectedTask.source_resource_type || 'MANUAL'}</span>
                </div>
                <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80 space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase block">Location</span>
                  <span className="font-semibold text-slate-200 truncate block">{selectedTask.zone_name || selectedMine?.name || 'Mine Zone'}</span>
                </div>
                <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80 space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase block">Due SLA</span>
                  <span className="font-semibold text-amber-400">{formatDueDate(selectedTask.due_date)}</span>
                </div>
              </div>

              {/* Resolution Notes (if completed) */}
              {selectedTask.resolution_notes && (
                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider block">
                    Resolution Notes
                  </span>
                  <p className="bg-emerald-950/20 p-3 rounded-xl border border-emerald-500/30 text-emerald-200 font-mono text-xs">
                    {selectedTask.resolution_notes}
                  </p>
                </div>
              )}

              {/* Error Message */}
              {actionError && (
                <div className="p-2.5 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 font-mono text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{actionError}</span>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/50 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                {/* State Machine Transition Buttons */}
                {selectedTask.status === 'ASSIGNED' || selectedTask.status === 'OPEN' ? (
                  <TouchButton
                    variant="primary"
                    size="md"
                    loading={actionSubmitting}
                    onClick={() => handleStatusTransition(selectedTask.id, 'IN_PROGRESS')}
                    icon={<Play className="w-4 h-4" />}
                  >
                    {t('startTask')}
                  </TouchButton>
                ) : selectedTask.status === 'IN_PROGRESS' ? (
                  <TouchButton
                    variant="primary"
                    size="md"
                    onClick={() => setReviewModalTask(selectedTask)}
                    icon={<Check className="w-4 h-4" />}
                  >
                    {t('completeTask')}
                  </TouchButton>
                ) : selectedTask.status === 'RESOLVED' ? (
                  <>
                    <TouchButton
                      variant="primary"
                      size="md"
                      loading={actionSubmitting}
                      onClick={() => handleStatusTransition(selectedTask.id, 'VERIFIED')}
                      icon={<CheckCircle2 className="w-4 h-4" />}
                    >
                      Verify
                    </TouchButton>
                    <TouchButton
                      variant="outline"
                      size="md"
                      loading={actionSubmitting}
                      onClick={() => handleStatusTransition(selectedTask.id, 'IN_PROGRESS', 'Reopened by supervisor')}
                      icon={<RotateCcw className="w-4 h-4 text-amber-400" />}
                    >
                      Reject
                    </TouchButton>
                  </>
                ) : selectedTask.status === 'VERIFIED' ? (
                  <TouchButton
                    variant="primary"
                    size="md"
                    loading={actionSubmitting}
                    onClick={() => handleStatusTransition(selectedTask.id, 'CLOSED')}
                    icon={<CheckCircle2 className="w-4 h-4" />}
                  >
                    Close Task
                  </TouchButton>
                ) : null}

                {/* Deep Link to Map */}
                <TouchButton
                  variant="outline"
                  size="md"
                  onClick={() => {
                    setSelectedTask(null);
                    setFocusedTarget({
                      type: 'zone',
                      id: selectedTask.zone_id || selectedTask.id,
                      x: selectedTask.target_latitude || selectedMine?.latitude || 23.7957,
                      y: 0,
                      z: selectedTask.target_longitude || selectedMine?.longitude || 86.4304,
                      title: selectedTask.title
                    });
                    if (onNavigateTab) {
                      onNavigateTab('map');
                    } else {
                      setCurrentTab('map');
                    }
                  }}
                  icon={<MapPin className="w-4 h-4 text-amber-400" />}
                >
                  {t('viewOnMap')}
                </TouchButton>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Task Review / Pre-Completion Modal */}
      {reviewModalTask && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-2xl w-full max-w-lg flex flex-col shadow-2xl animate-in slide-in-from-bottom-5">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-slate-100 font-sans">
                  {t('taskReview')}
                </h3>
              </div>
              <button
                onClick={() => setReviewModalTask(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4 text-xs font-sans">
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 space-y-1">
                <span className="font-mono text-[10px] text-amber-400 font-bold block">
                  TASK-{reviewModalTask.id} • {reviewModalTask.title}
                </span>
                <p className="text-slate-400 text-xs font-sans">{reviewModalTask.description}</p>
              </div>

              {/* Resolution Notes Input */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono text-slate-300 font-semibold block">
                  Field Actions Taken & Observations (Required):
                </label>
                <textarea
                  rows={3}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Document mitigation actions, gas measurements, physical checks completed..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Confirmation Checkbox */}
              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={evidenceConfirmed}
                  onChange={(e) => setEvidenceConfirmed(e.target.checked)}
                  className="mt-0.5 rounded border-slate-700 text-amber-500 focus:ring-amber-500/20"
                />
                <span className="text-[11px] text-slate-300 font-mono">
                  I confirm all statutory field checks and required safety procedures were executed.
                </span>
              </label>

              {/* Error indicator */}
              {actionError && (
                <div className="p-2.5 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 font-mono text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{actionError}</span>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-950/50 flex gap-2">
              <TouchButton
                variant="outline"
                size="md"
                onClick={() => setReviewModalTask(null)}
              >
                Cancel
              </TouchButton>

              <TouchButton
                variant="primary"
                size="md"
                disabled={!resolutionNotes.trim() || !evidenceConfirmed}
                loading={actionSubmitting}
                onClick={() => handleStatusTransition(reviewModalTask.id, 'RESOLVED', resolutionNotes)}
                icon={<Check className="w-4 h-4" />}
              >
                Submit Resolution
              </TouchButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
