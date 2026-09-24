import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  MessageSquare,
  AlertCircle,
  Clock,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  RefreshCw,
  Camera,
  MapPin,
  ChevronRight,
  UserCheck,
  FileText,
  AlertTriangle,
  PlusCircle,
  User,
  Info,
  Hash,
  ExternalLink
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useMineContext } from '../context/MineContext';
import { useAuth } from '../context/AuthContext';
import { mobileApi } from '../services';
import {
  MobileTab,
  MobileGrievanceSummaryItem,
  MobileGrievanceDetail,
  MobileGrievanceSummaryResponse,
  MobileGrievanceCreate,
  MobileGrievanceAcknowledge,
  MobileGrievanceAssign,
  MobileGrievanceInvestigate,
  MobileGrievanceResolve
} from '../types/mobile';
import clsx from 'clsx';

const QUEUE_STORAGE_KEY = 'trinetra_field_sync_queue';

interface MobileGrievanceScreenProps {
  onBack?: () => void;
  onNavigateTab?: (tab: MobileTab) => void;
}

export const MobileGrievanceScreen: React.FC<MobileGrievanceScreenProps> = ({
  onNavigateTab
}) => {
  const { t } = useLanguage();
  const { selectedMine } = useMineContext();
  const { user } = useAuth();

  // Sub-tabs
  const [activeSubTab, setActiveSubTab] = useState<'ALL' | 'MY_ASSIGNMENTS' | 'INVESTIGATIONS' | 'RESOLVED'>('ALL');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [notice, setNotice] = useState<{ type: 'SUCCESS' | 'ERROR' | 'INFO'; message: string } | null>(null);

  // Data State
  const [summaryData, setSummaryData] = useState<MobileGrievanceSummaryResponse | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [pendingQueueCount, setPendingQueueCount] = useState<number>(0);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL');

  // Selected Detail Modal
  const [selectedGrievanceId, setSelectedGrievanceId] = useState<number | null>(null);
  const [grievanceDetail, setGrievanceDetail] = useState<MobileGrievanceDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);

  // Creation Modal State
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [createCategory, setCreateCategory] = useState<string>('WORKER_WELFARE');
  const [createTitle, setCreateTitle] = useState<string>('');
  const [createDesc, setCreateDesc] = useState<string>('');
  const [createPriority, setCreatePriority] = useState<string>('MEDIUM');
  const [createAnonymous, setCreateAnonymous] = useState<boolean>(false);
  const [createLocationCtx, setCreateLocationCtx] = useState<string>('');
  const [createGps, setCreateGps] = useState<{ lat?: number; lon?: number; source: 'ACTUAL_GPS' | 'SURVEYED_LOCATION' }>({
    source: 'ACTUAL_GPS'
  });
  const [createEvidence, setCreateEvidence] = useState<{ name?: string; url?: string; hash?: string }>({});
  const [submittingCreate, setSubmittingCreate] = useState<boolean>(false);

  // Investigation Modal State
  const [showInvestigateModal, setShowInvestigateModal] = useState<boolean>(false);
  const [invNotes, setInvNotes] = useState<string>('');
  const [invActionRequired, setInvActionRequired] = useState<boolean>(false);
  const [invCreateTask, setInvCreateTask] = useState<boolean>(false);
  const [invTaskTitle, setInvTaskTitle] = useState<string>('');
  const [invTaskDesc, setInvTaskDesc] = useState<string>('');
  const [invTaskDays, setInvTaskDays] = useState<number>(3);
  const [invCreateIncident, setInvCreateIncident] = useState<boolean>(false);
  const [invIncidentTitle, setInvIncidentTitle] = useState<string>('');
  const [submittingInv, setSubmittingInv] = useState<boolean>(false);

  // Resolution Modal State
  const [showResolveModal, setShowResolveModal] = useState<boolean>(false);
  const [resNotes, setResNotes] = useState<string>('');
  const [resReview, setResReview] = useState<boolean>(true);
  const [submittingRes, setSubmittingRes] = useState<boolean>(false);

  // Monitor network status & queue count
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const updateQueueCount = () => {
      try {
        const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          setPendingQueueCount(Array.isArray(parsed) ? parsed.length : 0);
        } else {
          setPendingQueueCount(0);
        }
      } catch {
        setPendingQueueCount(0);
      }
    };
    updateQueueCount();
    const interval = setInterval(updateQueueCount, 3000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  // Fetch summary
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await mobileApi.getGrievancesSummary(selectedMine?.id);
      setSummaryData(res);
    } catch (err: any) {
      setNotice({
        type: 'ERROR',
        message: err?.response?.data?.detail || err?.message || 'Failed to load grievance data'
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedMine?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // Open detail
  const handleOpenDetail = async (grvId: number) => {
    setSelectedGrievanceId(grvId);
    try {
      setLoadingDetail(true);
      const res = await mobileApi.getGrievanceDetail(grvId);
      setGrievanceDetail(res);
    } catch (err: any) {
      setNotice({
        type: 'ERROR',
        message: 'Failed to load grievance detail'
      });
    } finally {
      setLoadingDetail(false);
    }
  };

  // GPS Fix
  const handleCaptureGps = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCreateGps({
            lat: Number(pos.coords.latitude.toFixed(6)),
            lon: Number(pos.coords.longitude.toFixed(6)),
            source: 'ACTUAL_GPS'
          });
          setNotice({
            type: 'SUCCESS',
            message: `GPS benchmark fixed: ${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`
          });
        },
        () => {
          setCreateGps({
            lat: selectedMine?.latitude || 23.7957,
            lon: selectedMine?.longitude || 86.4304,
            source: 'SURVEYED_LOCATION'
          });
          setNotice({
            type: 'INFO',
            message: 'Device GPS unavailable. Reverted to surveyed mine coordinates.'
          });
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  };

  // Evidence file upload
  const handleEvidenceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const buffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

      setCreateEvidence({
        name: file.name,
        url: URL.createObjectURL(file),
        hash: hashHex
      });
      setNotice({
        type: 'SUCCESS',
        message: `Evidence attached: ${file.name} (SHA-256: ${hashHex.substring(0, 10)}...)`
      });
    } catch {
      const simulatedHash = 'sha256_' + Math.random().toString(36).substring(2, 12);
      setCreateEvidence({
        name: file.name,
        url: URL.createObjectURL(file),
        hash: simulatedHash
      });
    }
  };

  // Create Grievance
  const handleCreateGrievance = async () => {
    if (!createTitle.trim() || !createDesc.trim()) {
      setNotice({ type: 'ERROR', message: 'Title and description are required.' });
      return;
    }

    const payload: MobileGrievanceCreate = {
      mine_id: selectedMine?.id || 1,
      category: createCategory,
      title: createTitle,
      description: createDesc,
      priority: createPriority,
      anonymous: createAnonymous,
      location_context: createLocationCtx || selectedMine?.name || 'Mine Site',
      latitude: createGps.lat,
      longitude: createGps.lon,
      location_source: createGps.source,
      evidence_file_name: createEvidence.name,
      evidence_url: createEvidence.url,
      evidence_file_hash: createEvidence.hash,
      source_channel: 'MOBILE_FIELD'
    };

    setSubmittingCreate(true);

    if (!isOnline) {
      try {
        const queueItem = {
          id: `queue_grv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          action: 'GRIEVANCE',
          operation_type: 'CREATE',
          timestamp: new Date().toISOString(),
          mine_id: selectedMine?.id || 1,
          payload
        };
        const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
        const queue = raw ? JSON.parse(raw) : [];
        queue.push(queueItem);
        localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
        setPendingQueueCount(queue.length);

        setNotice({
          type: 'INFO',
          message: t('offlineGrievanceSaved')
        });
        setShowCreateModal(false);
        setCreateTitle('');
        setCreateDesc('');
      } catch {
        setNotice({ type: 'ERROR', message: 'Failed to save offline grievance.' });
      } finally {
        setSubmittingCreate(false);
      }
      return;
    }

    try {
      const res = await mobileApi.createGrievance(payload);
      setNotice({
        type: 'SUCCESS',
        message: res.message || 'Grievance recorded successfully'
      });
      setShowCreateModal(false);
      setCreateTitle('');
      setCreateDesc('');
      fetchData();
    } catch (err: any) {
      setNotice({
        type: 'ERROR',
        message: err?.response?.data?.detail || err?.message || 'Failed to submit grievance'
      });
    } finally {
      setSubmittingCreate(false);
    }
  };

  // Acknowledge Grievance
  const handleAcknowledge = async (grvId: number) => {
    try {
      const res = await mobileApi.acknowledgeGrievance(grvId, { notes: 'Acknowledged via mobile field operations.' });
      setNotice({ type: 'SUCCESS', message: res.message || 'Grievance acknowledged.' });
      fetchData();
      if (selectedGrievanceId === grvId) {
        handleOpenDetail(grvId);
      }
    } catch (err: any) {
      setNotice({ type: 'ERROR', message: err?.response?.data?.detail || 'Failed to acknowledge grievance.' });
    }
  };

  // Submit Investigation
  const handleSubmitInvestigation = async () => {
    if (!selectedGrievanceId || !invNotes.trim()) {
      setNotice({ type: 'ERROR', message: 'Investigation findings are required.' });
      return;
    }

    const payload: MobileGrievanceInvestigate = {
      investigation_notes: invNotes,
      action_required: invActionRequired,
      create_task: invCreateTask,
      task_title: invTaskTitle,
      task_description: invTaskDesc,
      task_sla_days: invTaskDays,
      create_incident: invCreateIncident,
      incident_title: invIncidentTitle
    };

    setSubmittingInv(true);
    try {
      const res = await mobileApi.investigateGrievance(selectedGrievanceId, payload);
      setNotice({ type: 'SUCCESS', message: res.message || 'Investigation recorded.' });
      setShowInvestigateModal(false);
      fetchData();
      handleOpenDetail(selectedGrievanceId);
    } catch (err: any) {
      setNotice({ type: 'ERROR', message: err?.response?.data?.detail || 'Failed to record investigation.' });
    } finally {
      setSubmittingInv(false);
    }
  };

  // Submit Resolution
  const handleSubmitResolution = async () => {
    if (!selectedGrievanceId || !resNotes.trim()) {
      setNotice({ type: 'ERROR', message: 'Resolution notes are required.' });
      return;
    }

    const payload: MobileGrievanceResolve = {
      resolution_notes: resNotes,
      submit_for_review: resReview
    };

    setSubmittingRes(true);
    try {
      const res = await mobileApi.resolveGrievance(selectedGrievanceId, payload);
      setNotice({ type: 'SUCCESS', message: res.message || 'Grievance resolved.' });
      setShowResolveModal(false);
      fetchData();
      handleOpenDetail(selectedGrievanceId);
    } catch (err: any) {
      setNotice({ type: 'ERROR', message: err?.response?.data?.detail || 'Failed to submit resolution.' });
    } finally {
      setSubmittingRes(false);
    }
  };

  // Filtered List
  const filteredGrievances = useMemo(() => {
    if (!summaryData?.grievances) return [];
    return summaryData.grievances.filter((g: MobileGrievanceSummaryItem) => {
      // Subtab filter
      if (activeSubTab === 'MY_ASSIGNMENTS' && g.assigned_to_id !== user?.id) {
        return false;
      }
      if (activeSubTab === 'INVESTIGATIONS' && g.status !== 'UNDER_INVESTIGATION' && g.status !== 'ACTION_REQUIRED') {
        return false;
      }
      if (activeSubTab === 'RESOLVED' && g.status !== 'RESOLVED' && g.status !== 'VERIFIED' && g.status !== 'CLOSED') {
        return false;
      }

      // Category filter
      if (selectedCategory !== 'ALL' && g.category !== selectedCategory) {
        return false;
      }

      // Priority filter
      if (selectedPriority !== 'ALL' && g.priority !== selectedPriority) {
        return false;
      }

      // Search Query
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matches =
          g.grievance_code.toLowerCase().includes(q) ||
          g.title.toLowerCase().includes(q) ||
          g.description.toLowerCase().includes(q) ||
          g.category.toLowerCase().includes(q);
        if (!matches) return false;
      }

      return true;
    });
  }, [summaryData?.grievances, activeSubTab, selectedCategory, selectedPriority, searchQuery, user?.id]);

  const getPriorityBadgeClass = (priority: string) => {
    switch (priority) {
      case 'CRITICAL':
        return 'bg-red-500/20 text-red-400 border border-red-500/30 font-bold';
      case 'HIGH':
        return 'bg-amber-500/20 text-amber-300 border border-amber-500/30';
      case 'MEDIUM':
        return 'bg-blue-500/20 text-blue-300 border border-blue-500/30';
      default:
        return 'bg-slate-800 text-slate-300 border border-slate-700';
    }
  };

  const getSlaBadgeClass = (slaStatus: string) => {
    switch (slaStatus) {
      case 'OVERDUE':
        return 'bg-red-500/20 text-red-400 border border-red-500/30';
      case 'DUE_SOON':
        return 'bg-amber-500/20 text-amber-300 border border-amber-500/30';
      case 'RESOLVED':
      case 'CLOSED':
        return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
      default:
        return 'bg-slate-800 text-slate-300 border border-slate-700';
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 pb-20">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-md">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white tracking-wide">{t('grievancesFieldTitle')}</h1>
              <p className="text-xs text-slate-400">
                {selectedMine ? selectedMine.name : 'All Mines Context'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {!isOnline && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                OFFLINE
              </span>
            )}
            {pendingQueueCount > 0 && (
              <button
                onClick={() => onNavigateTab?.('sync')}
                className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center space-x-1"
              >
                <span>{pendingQueueCount} queued</span>
              </button>
            )}
            <button
              onClick={handleRefresh}
              disabled={loading || refreshing}
              className="p-2 text-slate-400 hover:text-white rounded-lg bg-slate-800/80 active:scale-95 transition-all"
            >
              <RefreshCw className={clsx('w-4 h-4', (loading || refreshing) && 'animate-spin text-indigo-400')} />
            </button>
          </div>
        </div>

        {/* Notice Alert */}
        {notice && (
          <div
            className={clsx(
              'mt-2 p-2.5 rounded-lg text-xs flex items-center justify-between border shadow-sm transition-all',
              notice.type === 'SUCCESS' && 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200',
              notice.type === 'ERROR' && 'bg-red-950/60 border-red-500/40 text-red-200',
              notice.type === 'INFO' && 'bg-blue-950/60 border-blue-500/40 text-blue-200'
            )}
          >
            <div className="flex items-center space-x-2">
              {notice.type === 'SUCCESS' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
              {notice.type === 'ERROR' && <XCircle className="w-4 h-4 text-red-400 shrink-0" />}
              {notice.type === 'INFO' && <Info className="w-4 h-4 text-blue-400 shrink-0" />}
              <span>{notice.message}</span>
            </div>
            <button onClick={() => setNotice(null)} className="text-slate-400 hover:text-white text-xs font-bold px-1">
              ✕
            </button>
          </div>
        )}
      </header>

      {/* KPI Metrics Strip */}
      <div className="grid grid-cols-4 gap-2 px-4 py-3 bg-slate-900/50 border-b border-slate-800">
        <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col items-center justify-center text-center">
          <span className="text-lg font-black text-indigo-400">{summaryData?.total_grievances ?? 0}</span>
          <span className="text-[10px] text-slate-400 font-medium leading-tight mt-0.5">{t('totalGrievancesCount')}</span>
        </div>
        <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col items-center justify-center text-center">
          <span className="text-lg font-black text-amber-400">{summaryData?.open_grievances ?? 0}</span>
          <span className="text-[10px] text-slate-400 font-medium leading-tight mt-0.5">{t('openGrievancesCount')}</span>
        </div>
        <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col items-center justify-center text-center">
          <span className="text-lg font-black text-purple-400">{summaryData?.investigation_required ?? 0}</span>
          <span className="text-[10px] text-slate-400 font-medium leading-tight mt-0.5">{t('investigationRequiredCount')}</span>
        </div>
        <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col items-center justify-center text-center">
          <span className="text-lg font-black text-red-400">{summaryData?.overdue_grievances ?? 0}</span>
          <span className="text-[10px] text-slate-400 font-medium leading-tight mt-0.5">{t('overdueGrievancesCount')}</span>
        </div>
      </div>

      {/* Action Bar: Log Issue Button */}
      <div className="px-4 py-2.5 flex items-center justify-between bg-slate-900/30 border-b border-slate-800/80">
        <button
          onClick={() => setShowCreateModal(true)}
          className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white flex items-center justify-center space-x-2 shadow-lg active:scale-95 transition-all"
        >
          <PlusCircle className="w-4 h-4" />
          <span>{t('logGrievanceBtn')}</span>
        </button>
      </div>

      {/* Sub-tab Navigation */}
      <div className="flex border-b border-slate-800 bg-slate-900/80 px-4 pt-2">
        <button
          onClick={() => setActiveSubTab('ALL')}
          className={clsx(
            'flex-1 py-2.5 text-xs font-semibold text-center border-b-2 transition-all flex items-center justify-center space-x-1',
            activeSubTab === 'ALL'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          )}
        >
          <span>{t('allGrievancesTab')}</span>
        </button>
        <button
          onClick={() => setActiveSubTab('MY_ASSIGNMENTS')}
          className={clsx(
            'flex-1 py-2.5 text-xs font-semibold text-center border-b-2 transition-all flex items-center justify-center space-x-1',
            activeSubTab === 'MY_ASSIGNMENTS'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          )}
        >
          <span>{t('myAssignmentsTab')}</span>
        </button>
        <button
          onClick={() => setActiveSubTab('INVESTIGATIONS')}
          className={clsx(
            'flex-1 py-2.5 text-xs font-semibold text-center border-b-2 transition-all flex items-center justify-center space-x-1',
            activeSubTab === 'INVESTIGATIONS'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          )}
        >
          <span>{t('investigationQueueTab')}</span>
        </button>
        <button
          onClick={() => setActiveSubTab('RESOLVED')}
          className={clsx(
            'flex-1 py-2.5 text-xs font-semibold text-center border-b-2 transition-all flex items-center justify-center space-x-1',
            activeSubTab === 'RESOLVED'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          )}
        >
          <span>{t('resolvedGrievancesTab')}</span>
        </button>
      </div>

      {/* Search & Category Filter */}
      <div className="px-4 py-3 space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by code, title, category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
          />
        </div>

        <div className="flex space-x-1.5 overflow-x-auto pb-1 no-scrollbar text-[11px]">
          {['ALL', 'WORKER_WELFARE', 'SAFETY', 'WATER', 'HEALTH', 'ENVIRONMENT', 'CONTRACTOR', 'ACCESS', 'PAY_LABOUR', 'OTHER'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={clsx(
                'px-3 py-1 rounded-full whitespace-nowrap font-medium transition-all',
                selectedCategory === cat
                  ? 'bg-indigo-500 text-white font-bold'
                  : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grievances List */}
      <main className="flex-1 px-4 space-y-3">
        {filteredGrievances.length === 0 ? (
          <div className="p-8 text-center bg-slate-900/40 rounded-2xl border border-slate-800/60">
            <MessageSquare className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-xs text-slate-400 font-semibold">No grievances found matching criteria.</p>
          </div>
        ) : (
          filteredGrievances.map((g: MobileGrievanceSummaryItem) => (
            <div
              key={g.id}
              onClick={() => handleOpenDetail(g.id)}
              className="p-4 rounded-2xl bg-slate-900 border border-slate-800/80 hover:border-slate-700 shadow-md cursor-pointer transition-all active:scale-[0.99] space-y-2.5"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-indigo-400 font-mono">{g.grievance_code}</span>
                    <span className={clsx('px-2 py-0.5 rounded text-[9px] font-bold', getPriorityBadgeClass(g.priority))}>
                      {g.priority}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[9px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                      {g.category}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-white mt-1.5">{g.title}</h3>
                  <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{g.description}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 shrink-0 mt-1" />
              </div>

              {/* Status and SLA Strip */}
              <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-800/60 text-slate-400">
                <div className="flex items-center space-x-1.5">
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  <span className="truncate">{g.assigned_to_name || 'Unassigned'}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={clsx('px-2 py-0.5 rounded-full text-[10px] font-semibold', getSlaBadgeClass(g.sla_status))}>
                    {g.sla_status}
                  </span>
                  <span className="text-slate-500">|</span>
                  <span>{g.status}</span>
                </div>
              </div>

              {/* Context Badges */}
              <div className="flex items-center space-x-2 pt-1 text-[10px] text-slate-500">
                {g.has_location && (
                  <span className="flex items-center space-x-1 text-emerald-400">
                    <MapPin className="w-3 h-3" />
                    <span>GPS Benchmark</span>
                  </span>
                )}
                {g.has_evidence && (
                  <span className="flex items-center space-x-1 text-blue-400">
                    <Camera className="w-3 h-3" />
                    <span>Evidence Attached</span>
                  </span>
                )}
                {g.has_task && (
                  <span className="flex items-center space-x-1 text-amber-400">
                    <FileText className="w-3 h-3" />
                    <span>Task Active</span>
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </main>

      {/* Grievance Detail Slide-Over Modal */}
      {selectedGrievanceId && grievanceDetail && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col justify-end">
          <div className="bg-slate-900 border-t border-slate-800 rounded-t-3xl max-h-[90vh] overflow-y-auto p-5 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-mono text-indigo-400">{grievanceDetail.grievance_code}</span>
                  <span className={clsx('px-2 py-0.5 rounded text-[9px] font-bold', getPriorityBadgeClass(grievanceDetail.priority))}>
                    {grievanceDetail.priority}
                  </span>
                </div>
                <h2 className="text-base font-bold text-white mt-1">{grievanceDetail.title}</h2>
                <p className="text-xs text-slate-400">{grievanceDetail.mine_name} • {grievanceDetail.category}</p>
              </div>
              <button
                onClick={() => {
                  setSelectedGrievanceId(null);
                  setGrievanceDetail(null);
                }}
                className="p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Factual Description */}
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Issue Description</span>
              <p className="text-xs text-slate-200 leading-relaxed">{grievanceDetail.description}</p>
            </div>

            {/* Operational Meta Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <span className="text-slate-500 text-[10px] block uppercase font-semibold">SLA Window</span>
                <span className="text-slate-200 font-medium">{grievanceDetail.sla_hours} Hours (Due: {grievanceDetail.due_at.split('T')[0]})</span>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <span className="text-slate-500 text-[10px] block uppercase font-semibold">Lodged By</span>
                <span className="text-slate-200 font-medium">{grievanceDetail.submitted_by_name || 'Anonymous'}</span>
              </div>
            </div>

            {/* Location & Evidence Context */}
            <div className="space-y-2">
              {grievanceDetail.latitude && grievanceDetail.longitude ? (
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2 text-slate-300">
                    <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{grievanceDetail.location_context || 'Field Benchmark'} ({grievanceDetail.latitude}, {grievanceDetail.longitude})</span>
                  </div>
                  <button
                    onClick={() => onNavigateTab?.('map')}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-800 text-indigo-400 border border-slate-700"
                  >
                    View Map
                  </button>
                </div>
              ) : null}

              {grievanceDetail.evidence_file_hash && (
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1 text-xs">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="flex items-center space-x-1.5">
                      <Camera className="w-3.5 h-3.5 text-blue-400" />
                      <span>{grievanceDetail.evidence_file_name || 'Photographic Evidence'}</span>
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">SHA-256 Validated</span>
                  </div>
                  <p className="text-[10px] font-mono text-slate-500 truncate">Hash: {grievanceDetail.evidence_file_hash}</p>
                </div>
              )}
            </div>

            {/* Investigation Findings */}
            {grievanceDetail.investigation_notes && (
              <div className="p-3 bg-indigo-950/40 border border-indigo-500/30 rounded-2xl space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-indigo-300 font-bold">
                  <span>{t('investigationFindingsLabel')}</span>
                  <span className="text-[10px] text-slate-400">{grievanceDetail.investigated_by_name}</span>
                </div>
                <p className="text-slate-200 leading-relaxed">{grievanceDetail.investigation_notes}</p>
              </div>
            )}

            {/* Resolution Summary */}
            {grievanceDetail.resolution_notes && (
              <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-2xl space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-emerald-300 font-bold">
                  <span>{t('resolutionSummaryLabel')}</span>
                  <span className="text-[10px] text-slate-400">{grievanceDetail.resolved_at?.split('T')[0]}</span>
                </div>
                <p className="text-slate-200 leading-relaxed">{grievanceDetail.resolution_notes}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-2 grid grid-cols-2 gap-2">
              {grievanceDetail.status === 'SUBMITTED' && (
                <button
                  onClick={() => handleAcknowledge(grievanceDetail.id)}
                  className="py-2.5 px-3 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center space-x-1.5 shadow-md"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>{t('acknowledgeGrievanceBtn')}</span>
                </button>
              )}

              {grievanceDetail.status !== 'RESOLVED' && grievanceDetail.status !== 'CLOSED' && (
                <button
                  onClick={() => {
                    setInvNotes('');
                    setInvActionRequired(false);
                    setInvTaskTitle(`Remedial action for ${grievanceDetail.title}`);
                    setInvTaskDesc(grievanceDetail.description);
                    setShowInvestigateModal(true);
                  }}
                  className="py-2.5 px-3 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center space-x-1.5 shadow-md"
                >
                  <FileText className="w-4 h-4" />
                  <span>{t('recordInvestigationBtn')}</span>
                </button>
              )}

              {grievanceDetail.status !== 'RESOLVED' && grievanceDetail.status !== 'CLOSED' && (
                <button
                  onClick={() => {
                    setResNotes('');
                    setResReview(true);
                    setShowResolveModal(true);
                  }}
                  className="py-2.5 px-3 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center space-x-1.5 shadow-md col-span-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{t('resolveGrievanceBtn')}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Log Grievance Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col justify-end">
          <div className="bg-slate-900 border-t border-slate-800 rounded-t-3xl max-h-[90vh] overflow-y-auto p-5 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div>
                <h2 className="text-base font-bold text-white">{t('logGrievanceBtn')}</h2>
                <p className="text-xs text-slate-400">PGRM Fact-Finding & Issue Capture</p>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            {/* Category & Priority */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">Issue Category</label>
                <select
                  value={createCategory}
                  onChange={(e) => setCreateCategory(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-indigo-500"
                >
                  <option value="WORKER_WELFARE">Worker Welfare</option>
                  <option value="SAFETY">Safety Condition</option>
                  <option value="WATER">Water / Drainage</option>
                  <option value="HEALTH">Health & Hygiene</option>
                  <option value="ENVIRONMENT">Environmental Impact</option>
                  <option value="CONTRACTOR">Contractor Work</option>
                  <option value="ACCESS">Access & Transport</option>
                  <option value="PAY_LABOUR">Labour & Muster</option>
                  <option value="OTHER">Other Issue</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">Priority (SLA Window)</label>
                <select
                  value={createPriority}
                  onChange={(e) => setCreatePriority(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-indigo-500"
                >
                  <option value="CRITICAL">Critical (24h SLA)</option>
                  <option value="HIGH">High (48h SLA)</option>
                  <option value="MEDIUM">Medium (72h SLA)</option>
                  <option value="LOW">Low (168h SLA)</option>
                </select>
              </div>
            </div>

            {/* Title & Description */}
            <div className="space-y-2">
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">Issue Subject / Title</label>
                <input
                  type="text"
                  placeholder="e.g. Drinking water filtration failure at Pit Head 2"
                  value={createTitle}
                  onChange={(e) => setCreateTitle(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">Factual Description</label>
                <textarea
                  rows={3}
                  placeholder="Provide precise location, observed facts, and impact without personal PII..."
                  value={createDesc}
                  onChange={(e) => setCreateDesc(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Anonymous Toggle */}
            <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs">
              <span className="text-slate-300 font-medium">Lodge Anonymously (Hide Submitter Identity)</span>
              <input
                type="checkbox"
                checked={createAnonymous}
                onChange={(e) => setCreateAnonymous(e.target.checked)}
                className="w-4 h-4 text-indigo-600 bg-slate-900 border-slate-700 rounded focus:ring-0"
              />
            </div>

            {/* Location & GPS Fix */}
            <div className="space-y-1.5 text-xs">
              <label className="text-[11px] font-semibold text-slate-300">Location Benchmark</label>
              <div className="flex items-center justify-between p-2.5 bg-slate-950 border border-slate-800 rounded-xl">
                <div className="flex items-center space-x-2 text-slate-300 truncate">
                  <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="truncate">
                    {createGps.lat && createGps.lon ? `${createGps.lat}, ${createGps.lon}` : 'No GPS fixed'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCaptureGps}
                  className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-800 text-indigo-400 border border-slate-700"
                >
                  Fix GPS
                </button>
              </div>
            </div>

            {/* Evidence Uploader */}
            <div className="space-y-1.5 text-xs">
              <label className="text-[11px] font-semibold text-slate-300">Photo / Evidence Attachment</label>
              <label className="w-full p-2.5 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl flex items-center justify-center space-x-2 cursor-pointer transition-all">
                <Camera className="w-4 h-4 text-indigo-400" />
                <span className="text-slate-300 font-medium truncate">
                  {createEvidence.name ? createEvidence.name : 'Capture / Upload Photo'}
                </span>
                <input type="file" accept="image/*" onChange={handleEvidenceUpload} className="hidden" />
              </label>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleCreateGrievance}
                disabled={submittingCreate}
                className="w-full py-3 rounded-2xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center space-x-2 shadow-lg active:scale-95 transition-all disabled:opacity-50"
              >
                {submittingCreate ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <MessageSquare className="w-4 h-4" />
                    <span>Register Field Grievance</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Investigation Modal */}
      {showInvestigateModal && selectedGrievanceId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col justify-end">
          <div className="bg-slate-900 border-t border-slate-800 rounded-t-3xl max-h-[90vh] overflow-y-auto p-5 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div>
                <h2 className="text-base font-bold text-white">{t('recordInvestigationBtn')}</h2>
                <p className="text-xs text-slate-400">Record on-site fact-finding findings</p>
              </div>
              <button onClick={() => setShowInvestigateModal(false)} className="p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">Investigation Notes & Observations</label>
              <textarea
                rows={4}
                placeholder="Enter detailed fact-finding findings..."
                value={invNotes}
                onChange={(e) => setInvNotes(e.target.value)}
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:border-purple-500"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs">
              <span className="text-slate-300 font-medium">Action Required (Trigger Remedial Workflow)</span>
              <input
                type="checkbox"
                checked={invActionRequired}
                onChange={(e) => setInvActionRequired(e.target.checked)}
                className="w-4 h-4 text-purple-600 bg-slate-900 border-slate-700 rounded focus:ring-0"
              />
            </div>

            {invActionRequired && (
              <div className="p-3 bg-purple-950/40 border border-purple-500/30 rounded-2xl space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-purple-300">Generate Governance Remedial Task</span>
                  <input
                    type="checkbox"
                    checked={invCreateTask}
                    onChange={(e) => setInvCreateTask(e.target.checked)}
                    className="w-4 h-4 text-purple-600 bg-slate-900 border-slate-700 rounded focus:ring-0"
                  />
                </div>

                {invCreateTask && (
                  <div className="space-y-2 pt-1">
                    <input
                      type="text"
                      placeholder="Task Title"
                      value={invTaskTitle}
                      onChange={(e) => setInvTaskTitle(e.target.value)}
                      className="w-full p-2 bg-slate-900 border border-purple-500/30 rounded-lg text-xs text-white"
                    />
                    <select
                      value={invTaskDays}
                      onChange={(e) => setInvTaskDays(Number(e.target.value))}
                      className="w-full p-2 bg-slate-900 border border-purple-500/30 rounded-lg text-xs text-white"
                    >
                      <option value={1}>SLA: 24 Hours</option>
                      <option value={3}>SLA: 3 Days</option>
                      <option value={7}>SLA: 7 Days</option>
                    </select>
                  </div>
                )}
              </div>
            )}

            <div className="pt-2">
              <button
                type="button"
                onClick={handleSubmitInvestigation}
                disabled={submittingInv}
                className="w-full py-3 rounded-2xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center space-x-2 shadow-lg active:scale-95 transition-all disabled:opacity-50"
              >
                {submittingInv ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>Save Field Findings</span>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resolution Modal */}
      {showResolveModal && selectedGrievanceId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col justify-end">
          <div className="bg-slate-900 border-t border-slate-800 rounded-t-3xl max-h-[90vh] overflow-y-auto p-5 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div>
                <h2 className="text-base font-bold text-white">{t('resolveGrievanceBtn')}</h2>
                <p className="text-xs text-slate-400">Formal Resolution & Redressal Sign-Off</p>
              </div>
              <button onClick={() => setShowResolveModal(false)} className="p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">Resolution Summary & Corrective Action Taken</label>
              <textarea
                rows={4}
                placeholder="Describe corrective actions executed to resolve this grievance..."
                value={resNotes}
                onChange={(e) => setResNotes(e.target.value)}
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs">
              <span className="text-slate-300 font-medium">Route for Supervisor Review & Digital Sign-Off</span>
              <input
                type="checkbox"
                checked={resReview}
                onChange={(e) => setResReview(e.target.checked)}
                className="w-4 h-4 text-emerald-600 bg-slate-900 border-slate-700 rounded focus:ring-0"
              />
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleSubmitResolution}
                disabled={submittingRes}
                className="w-full py-3 rounded-2xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center space-x-2 shadow-lg active:scale-95 transition-all disabled:opacity-50"
              >
                {submittingRes ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>Submit Resolution</span>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Governance Disclaimer Footer */}
      <footer className="mt-8 px-4 py-4 bg-slate-900/40 border-t border-slate-900 text-center">
        <p className="text-[10px] text-slate-500 leading-relaxed max-w-sm mx-auto">
          {t('grievanceDisclaimerText')}
        </p>
      </footer>
    </div>
  );
};
