import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Users, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  UserCheck, 
  ArrowRightLeft, 
  Search, 
  Filter, 
  RefreshCw, 
  ShieldCheck, 
  Send, 
  FileText, 
  AlertTriangle, 
  ChevronRight, 
  PlusCircle, 
  Building2, 
  MapPin, 
  Check, 
  Edit3, 
  Calendar,
  Layers,
  Activity,
  Lock
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useMineContext } from '../context/MineContext';
import { useAuth } from '../context/AuthContext';
import { mobileApi } from '../services';
import { 
  MobileTab, 
  MobileWorkforceWorker, 
  MobileWorkforceSummary, 
  MobileShiftContext, 
  MobileShiftHandoverSummaryResponse,
  MobileShiftHandoverRecord
} from '../types/mobile';
import clsx from 'clsx';

const QUEUE_STORAGE_KEY = 'trinetra_field_sync_queue';

interface MobileWorkforceScreenProps {
  onBack?: () => void;
  onNavigateTab?: (tab: MobileTab) => void;
}

export const MobileWorkforceScreen: React.FC<MobileWorkforceScreenProps> = ({
  onBack,
  onNavigateTab
}) => {
  const { t } = useLanguage();
  const { selectedMine } = useMineContext();
  const { user } = useAuth();

  // Screen State
  const [activeSubTab, setActiveSubTab] = useState<'ROSTER' | 'HANDOVER'>('ROSTER');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [notice, setNotice] = useState<{ type: 'SUCCESS' | 'ERROR' | 'INFO'; message: string } | null>(null);

  // Workforce & Roster Data
  const [workers, setWorkers] = useState<MobileWorkforceWorker[]>([]);
  const [summary, setSummary] = useState<MobileWorkforceSummary>({
    total_assigned: 0,
    present_count: 0,
    absent_count: 0,
    on_leave_count: 0,
    pending_attendance_count: 0,
    off_duty_count: 0
  });
  const [shiftCtx, setShiftCtx] = useState<MobileShiftContext | null>(null);

  // Handover Data
  const [handoverData, setHandoverData] = useState<MobileShiftHandoverSummaryResponse | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTrade, setSelectedTrade] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Attendance Correction Modal
  const [correctingWorker, setCorrectingWorker] = useState<MobileWorkforceWorker | null>(null);
  const [newStatus, setNewStatus] = useState<string>('PRESENT');
  const [correctionReason, setCorrectionReason] = useState<string>('');
  const [submittingCorrection, setSubmittingCorrection] = useState<boolean>(false);

  // Create Handover Form State
  const [showCreateHandover, setShowCreateHandover] = useState<boolean>(false);
  const [handoverNotes, setHandoverNotes] = useState<string>('');
  const [safetySummary, setSafetySummary] = useState<string>('');
  const [submittingHandover, setSubmittingHandover] = useState<boolean>(false);

  // Acknowledge Handover Modal
  const [acknowledgingHandover, setAcknowledgingHandover] = useState<MobileShiftHandoverRecord | null>(null);
  const [ackNotes, setAckNotes] = useState<string>('');
  const [submittingAck, setSubmittingAck] = useState<boolean>(false);

  // Fetch Workforce Roster
  const fetchWorkforceData = useCallback(async (isSilent = false) => {
    if (!selectedMine?.id) return;
    if (!isSilent) setLoading(true);
    try {
      const res = await mobileApi.getWorkforce({
        mine_id: selectedMine.id,
        trade: selectedTrade !== 'ALL' ? selectedTrade : undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        search: searchQuery.trim() || undefined
      });
      if (res) {
        setWorkers(res.workers || []);
        setSummary(res.summary || {
          total_assigned: 0,
          present_count: 0,
          absent_count: 0,
          on_leave_count: 0,
          pending_attendance_count: 0,
          off_duty_count: 0
        });
        setShiftCtx(res.shift_context || null);
      }
    } catch (err: any) {
      console.error('Failed to load mobile workforce data', err);
      setNotice({ type: 'ERROR', message: 'Failed to load workforce roster.' });
    } finally {
      if (!isSilent) setLoading(false);
      setRefreshing(false);
    }
  }, [selectedMine?.id, selectedTrade, statusFilter, searchQuery]);

  // Fetch Handover Summary
  const fetchHandoverData = useCallback(async () => {
    if (!selectedMine?.id) return;
    try {
      const res = await mobileApi.getShiftHandoverSummary(selectedMine.id);
      if (res) {
        setHandoverData(res);
      }
    } catch (err: any) {
      console.error('Failed to load shift handover data', err);
    }
  }, [selectedMine?.id]);

  useEffect(() => {
    fetchWorkforceData();
    fetchHandoverData();
  }, [fetchWorkforceData, fetchHandoverData]);

  // Offline Enqueue Utility
  const enqueueOfflineOperation = (operationType: string, entityType: string, entityId: string, payload: any) => {
    try {
      const existing = JSON.parse(localStorage.getItem(QUEUE_STORAGE_KEY) || '[]');
      const op = {
        operation_id: `op-wf-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        entity_type: entityType,
        entity_id: entityId,
        operation_type: operationType,
        payload,
        client_timestamp: new Date().toISOString(),
        sync_status: 'QUEUED'
      };
      existing.push(op);
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(existing));
    } catch (e) {
      console.error('Failed to enqueue offline workforce operation', e);
    }
  };

  // Record Attendance Action
  const handleRecordAttendance = async (workerId: number, targetStatus: string) => {
    if (!selectedMine?.id) return;

    // Optimistic UI update
    setWorkers(prev => prev.map(w => w.id === workerId ? {
      ...w,
      attendance_status: targetStatus,
      verification_mode: 'MANUAL',
      check_in_time: targetStatus === 'PRESENT' ? new Date().toISOString() : w.check_in_time
    } : w));

    if (!navigator.onLine) {
      enqueueOfflineOperation('CREATE', 'ATTENDANCE', String(workerId), {
        worker_id: workerId,
        status: targetStatus,
        shift_code: shiftCtx?.shift_code || 'A',
        notes: 'Offline field check-in'
      });
      setNotice({ type: 'INFO', message: t('offlineAttendanceSaved') });
      setTimeout(() => setNotice(null), 4000);
      return;
    }

    try {
      // Get device position context if available
      let lat: number | undefined;
      let lng: number | undefined;
      if (navigator.geolocation) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 3000 });
          });
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
        } catch {
          // Fallback gracefully without blocking
        }
      }

      await mobileApi.recordAttendance({
        worker_id: workerId,
        mine_id: selectedMine.id,
        shift_code: shiftCtx?.shift_code || 'A',
        status: targetStatus,
        notes: 'Muster roll field entry',
        device_latitude: lat,
        device_longitude: lng
      });

      setNotice({ type: 'SUCCESS', message: `Attendance marked as ${targetStatus}.` });
      setTimeout(() => setNotice(null), 3000);
      fetchWorkforceData(true);
    } catch (err: any) {
      console.error('Failed to record attendance', err);
      setNotice({ type: 'ERROR', message: 'Failed to record attendance on server.' });
      fetchWorkforceData(true);
    }
  };

  // Submit Attendance Correction
  const handleSubmitCorrection = async () => {
    if (!correctingWorker || !selectedMine?.id) return;
    if (!correctionReason.trim() || correctionReason.trim().length < 3) {
      setNotice({ type: 'ERROR', message: 'A mandatory correction reason is required.' });
      return;
    }

    setSubmittingCorrection(true);
    try {
      if (!navigator.onLine) {
        enqueueOfflineOperation('UPDATE', 'ATTENDANCE', String(correctingWorker.id), {
          worker_id: correctingWorker.id,
          attendance_id: correctingWorker.attendance_id,
          status: newStatus,
          notes: `[Corrected: ${correctionReason.trim()}]`
        });
        setNotice({ type: 'INFO', message: t('offlineAttendanceSaved') });
        setCorrectingWorker(null);
        setCorrectionReason('');
        return;
      }

      await mobileApi.correctAttendance({
        attendance_id: correctingWorker.attendance_id || correctingWorker.id,
        mine_id: selectedMine.id,
        new_status: newStatus,
        correction_reason: correctionReason.trim()
      });

      setNotice({ type: 'SUCCESS', message: 'Attendance status corrected and audited.' });
      setCorrectingWorker(null);
      setCorrectionReason('');
      fetchWorkforceData(true);
    } catch (err: any) {
      console.error('Failed to correct attendance', err);
      setNotice({ type: 'ERROR', message: 'Failed to submit attendance correction.' });
    } finally {
      setSubmittingCorrection(false);
      setTimeout(() => setNotice(null), 3500);
    }
  };

  // Submit Shift Handover
  const handleCreateHandover = async () => {
    if (!selectedMine?.id || !handoverData) return;
    if (!handoverNotes.trim()) {
      setNotice({ type: 'ERROR', message: 'Please provide shift summary notes.' });
      return;
    }

    setSubmittingHandover(true);
    const payload = {
      mine_id: selectedMine.id,
      from_shift_code: handoverData.current_shift.shift_code,
      to_shift_code: handoverData.next_shift.shift_code,
      summary_notes: handoverNotes.trim(),
      safety_summary: safetySummary.trim() || undefined
    };

    try {
      if (!navigator.onLine) {
        enqueueOfflineOperation('CREATE', 'HANDOVER', 'offline-ho', payload);
        setNotice({ type: 'INFO', message: t('offlineHandoverSaved') });
        setShowCreateHandover(false);
        setHandoverNotes('');
        setSafetySummary('');
        return;
      }

      await mobileApi.createShiftHandover(payload);
      setNotice({ type: 'SUCCESS', message: 'Shift handover submitted successfully.' });
      setShowCreateHandover(false);
      setHandoverNotes('');
      setSafetySummary('');
      fetchHandoverData();
    } catch (err: any) {
      console.error('Failed to create shift handover', err);
      setNotice({ type: 'ERROR', message: 'Failed to submit shift handover.' });
    } finally {
      setSubmittingHandover(false);
      setTimeout(() => setNotice(null), 3500);
    }
  };

  // Acknowledge Handover
  const handleAcknowledgeHandover = async () => {
    if (!acknowledgingHandover) return;
    setSubmittingAck(true);

    try {
      if (!navigator.onLine) {
        enqueueOfflineOperation('ACKNOWLEDGE', 'HANDOVER', String(acknowledgingHandover.id), {
          handover_id: acknowledgingHandover.id,
          acknowledgment_notes: ackNotes.trim() || undefined
        });
        setNotice({ type: 'INFO', message: t('offlineHandoverSaved') });
        setAcknowledgingHandover(null);
        setAckNotes('');
        return;
      }

      await mobileApi.acknowledgeShiftHandover(acknowledgingHandover.id, {
        acknowledgment_notes: ackNotes.trim() || undefined
      });

      setNotice({ type: 'SUCCESS', message: 'Shift handover acknowledged.' });
      setAcknowledgingHandover(null);
      setAckNotes('');
      fetchHandoverData();
    } catch (err: any) {
      console.error('Failed to acknowledge handover', err);
      setNotice({ type: 'ERROR', message: 'Failed to acknowledge handover.' });
    } finally {
      setSubmittingAck(false);
      setTimeout(() => setNotice(null), 3500);
    }
  };

  // Trade categories for filter carousel
  const tradePills = ['ALL', 'MINER', 'OPERATOR', 'ELECTRICIAN', 'FITTER', 'OVERMAN', 'DRILLER'];

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 pb-24">
      {/* Top Banner Notice */}
      {notice && (
        <div className={clsx(
          "sticky top-0 z-50 px-4 py-2.5 text-xs font-medium flex items-center justify-between shadow-md",
          notice.type === 'SUCCESS' && "bg-emerald-950/90 text-emerald-300 border-b border-emerald-500/30",
          notice.type === 'ERROR' && "bg-rose-950/90 text-rose-300 border-b border-rose-500/30",
          notice.type === 'INFO' && "bg-cyan-950/90 text-cyan-300 border-b border-cyan-500/30"
        )}>
          <span>{notice.message}</span>
          <button onClick={() => setNotice(null)} className="text-slate-400 hover:text-white p-1">×</button>
        </div>
      )}

      {/* Screen Header */}
      <div className="p-4 bg-slate-900/80 backdrop-blur-sm border-b border-slate-800">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-400" />
            <h1 className="text-base font-bold tracking-tight text-white">{t('mobileWorkforceTitle')}</h1>
          </div>
          <button
            onClick={() => {
              setRefreshing(true);
              fetchWorkforceData();
              fetchHandoverData();
            }}
            disabled={refreshing}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 active:scale-95 transition-all"
            title="Refresh"
          >
            <RefreshCw className={clsx("w-4 h-4", refreshing && "animate-spin text-indigo-400")} />
          </button>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">{t('mobileWorkforceSubtitle')}</p>
      </div>

      {/* Current Shift Operational Context Card */}
      <div className="mx-4 mt-3 p-3.5 rounded-xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-indigo-950/40 border border-indigo-900/30 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-semibold text-indigo-300">{t('currentShiftTitle')}</span>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            {shiftCtx?.shift_code || 'A'} • {shiftCtx?.shift_name || 'Shift A (Morning)'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs text-slate-300 mt-2.5">
          <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
            <span className="text-[10px] text-slate-400 block">{t('activeShiftWindow')}</span>
            <span className="font-semibold text-slate-200">{shiftCtx ? `${shiftCtx.start_time} - ${shiftCtx.end_time}` : '06:00 - 14:00'}</span>
          </div>
          <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
            <span className="text-[10px] text-slate-400 block">Operational Mine</span>
            <span className="font-semibold text-slate-200 truncate block">{selectedMine?.name || 'Bharat Coking Coalfield'}</span>
          </div>
        </div>
      </div>

      {/* Summary Metric Counters */}
      <div className="grid grid-cols-4 gap-2 mx-4 mt-3">
        <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-center">
          <div className="text-[10px] text-slate-400 font-medium">{t('totalAssignedWorkers')}</div>
          <div className="text-base font-bold text-slate-100 mt-0.5">{summary.total_assigned}</div>
        </div>
        <div className="p-2.5 rounded-xl bg-slate-900 border border-emerald-900/30 text-center">
          <div className="text-[10px] text-emerald-400 font-medium">{t('presentWorkers')}</div>
          <div className="text-base font-bold text-emerald-300 mt-0.5">{summary.present_count}</div>
        </div>
        <div className="p-2.5 rounded-xl bg-slate-900 border border-rose-900/30 text-center">
          <div className="text-[10px] text-rose-400 font-medium">{t('absentWorkers')}</div>
          <div className="text-base font-bold text-rose-300 mt-0.5">{summary.absent_count}</div>
        </div>
        <div className="p-2.5 rounded-xl bg-slate-900 border border-amber-900/30 text-center">
          <div className="text-[10px] text-amber-400 font-medium">{t('onLeaveWorkers')}</div>
          <div className="text-base font-bold text-amber-300 mt-0.5">{summary.on_leave_count}</div>
        </div>
      </div>

      {/* Primary Sub-Tab Switcher */}
      <div className="flex mx-4 mt-4 p-1 rounded-xl bg-slate-900 border border-slate-800">
        <button
          onClick={() => setActiveSubTab('ROSTER')}
          className={clsx(
            "flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all",
            activeSubTab === 'ROSTER' 
              ? "bg-indigo-600 text-white shadow-sm" 
              : "text-slate-400 hover:text-slate-200"
          )}
        >
          <Users className="w-3.5 h-3.5" />
          <span>{t('rosterTab')} ({workers.length})</span>
        </button>
        <button
          onClick={() => setActiveSubTab('HANDOVER')}
          className={clsx(
            "flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all",
            activeSubTab === 'HANDOVER' 
              ? "bg-indigo-600 text-white shadow-sm" 
              : "text-slate-400 hover:text-slate-200"
          )}
        >
          <ArrowRightLeft className="w-3.5 h-3.5" />
          <span>{t('shiftHandoverTab')}</span>
          {handoverData && handoverData.open_items_summary.total_open_items > 0 && (
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[9px] bg-rose-500 text-white font-bold">
              {handoverData.open_items_summary.total_open_items}
            </span>
          )}
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SUB-TAB 1: WORKER ROSTER & ATTENDANCE */}
      {/* ========================================================================= */}
      {activeSubTab === 'ROSTER' && (
        <div className="flex flex-col px-4 mt-3 space-y-3">
          {/* Search & Filter Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by worker name, code, or designation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-900 border border-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Trade Category Pill Carousel */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {tradePills.map(trade => (
              <button
                key={trade}
                onClick={() => setSelectedTrade(trade)}
                className={clsx(
                  "px-3 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-all border",
                  selectedTrade === trade
                    ? "bg-indigo-600/30 text-indigo-300 border-indigo-500/50"
                    : "bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700"
                )}
              >
                {trade}
              </button>
            ))}
          </div>

          {/* Status Filter Carousel */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
            {['ALL', 'PRESENT', 'ABSENT', 'ON_LEAVE', 'OFF_DUTY'].map(st => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={clsx(
                  "px-2.5 py-0.5 rounded-lg text-[10px] font-semibold border transition-all",
                  statusFilter === st
                    ? "bg-slate-800 text-white border-slate-600"
                    : "bg-slate-950 text-slate-500 border-slate-800/80 hover:text-slate-400"
                )}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Worker List */}
          {loading ? (
            <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin text-indigo-400 mb-2" />
              <p className="text-xs">Loading worker roster...</p>
            </div>
          ) : workers.length === 0 ? (
            <div className="p-8 text-center rounded-xl bg-slate-900/60 border border-slate-800 text-slate-400 text-xs">
              No workers found matching the selected filters.
            </div>
          ) : (
            <div className="space-y-2.5">
              {workers.map(worker => {
                const isPresent = worker.attendance_status === 'PRESENT';
                const isAbsent = worker.attendance_status === 'ABSENT';
                const isLeave = worker.attendance_status === 'ON_LEAVE';
                const isOffDuty = worker.attendance_status === 'OFF_DUTY';

                return (
                  <div 
                    key={worker.id}
                    className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-all shadow-sm"
                  >
                    {/* Worker Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-white">{worker.full_name}</span>
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-slate-800 text-slate-300">
                            {worker.worker_code}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                          <span>{worker.designation}</span>
                          <span>•</span>
                          <span className="text-indigo-300 font-medium">{worker.trade_category}</span>
                        </div>
                      </div>

                      {/* Attendance Status Badge */}
                      <span className={clsx(
                        "px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1",
                        isPresent && "bg-emerald-950/60 text-emerald-400 border-emerald-500/40",
                        isAbsent && "bg-rose-950/60 text-rose-400 border-rose-500/40",
                        isLeave && "bg-amber-950/60 text-amber-400 border-amber-500/40",
                        isOffDuty && "bg-slate-800 text-slate-400 border-slate-700"
                      )}>
                        {isPresent && <CheckCircle2 className="w-3 h-3" />}
                        {isAbsent && <XCircle className="w-3 h-3" />}
                        {isLeave && <Clock className="w-3 h-3" />}
                        {worker.attendance_status}
                      </span>
                    </div>

                    {/* Meta Tags (Contractor, Safety induction, Verification method) */}
                    <div className="grid grid-cols-2 gap-2 mt-2.5 pt-2 border-t border-slate-800/80 text-[10px] text-slate-400">
                      <div>
                        <span className="text-slate-500 block">Employer / Contractor:</span>
                        <span className="text-slate-300 font-medium truncate block">
                          {worker.contractor_name || (worker.is_contractual ? 'Contractor Crew' : 'Direct Payroll (CIL)')}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Verification:</span>
                        <span className="text-slate-300 font-medium">
                          {worker.verification_mode || 'MANUAL'}
                          {worker.marked_by ? ` (by ${worker.marked_by})` : ''}
                        </span>
                      </div>
                    </div>

                    {/* Quick Attendance Actions */}
                    <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-slate-800/60">
                      <button
                        onClick={() => handleRecordAttendance(worker.id, 'PRESENT')}
                        className={clsx(
                          "flex-1 py-1.5 rounded-lg text-[11px] font-semibold border flex items-center justify-center gap-1 transition-all",
                          isPresent
                            ? "bg-emerald-600/30 text-emerald-300 border-emerald-500/50"
                            : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-emerald-950/40 hover:text-emerald-300"
                        )}
                      >
                        <Check className="w-3 h-3" />
                        <span>{t('markPresent')}</span>
                      </button>

                      <button
                        onClick={() => handleRecordAttendance(worker.id, 'ABSENT')}
                        className={clsx(
                          "flex-1 py-1.5 rounded-lg text-[11px] font-semibold border flex items-center justify-center gap-1 transition-all",
                          isAbsent
                            ? "bg-rose-600/30 text-rose-300 border-rose-500/50"
                            : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-rose-950/40 hover:text-rose-300"
                        )}
                      >
                        <XCircle className="w-3 h-3" />
                        <span>{t('markAbsent')}</span>
                      </button>

                      <button
                        onClick={() => {
                          setCorrectingWorker(worker);
                          setNewStatus(worker.attendance_status);
                          setCorrectionReason('');
                        }}
                        className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 flex items-center gap-1"
                        title="Correction"
                      >
                        <Edit3 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 2: SHIFT HANDOVER */}
      {/* ========================================================================= */}
      {activeSubTab === 'HANDOVER' && (
        <div className="flex flex-col px-4 mt-3 space-y-3">
          {/* Shift Continuity Overview */}
          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-200">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-indigo-400" />
                <span>Shift Transition</span>
              </div>
              <span className="text-[10px] font-mono text-indigo-300 bg-indigo-950 px-2 py-0.5 rounded border border-indigo-800/40">
                {handoverData?.current_shift.shift_code || 'A'} → {handoverData?.next_shift.shift_code || 'B'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-2.5 text-xs">
              <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">{t('outgoingShift')}</span>
                <span className="font-semibold text-slate-200">Shift {handoverData?.current_shift.shift_code || 'A'}</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">{t('incomingShift')}</span>
                <span className="font-semibold text-slate-200">Shift {handoverData?.next_shift.shift_code || 'B'}</span>
              </div>
            </div>
          </div>

          {/* Aggregated Open Items Checklist */}
          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-400" />
                <span>{t('openHandoverItems')}</span>
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {handoverData?.open_items_summary.total_open_items || 0} Open
              </span>
            </div>

            {/* Category Cards */}
            <div className="space-y-1.5">
              {handoverData?.categories.map(cat => (
                <div 
                  key={cat.category}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 transition-all cursor-pointer"
                  onClick={() => onNavigateTab && onNavigateTab((cat.category === 'INCIDENTS' ? 'incidents' : cat.category === 'TASKS' ? 'tasks' : 'tasks') as MobileTab)}
                >
                  <div className="flex items-center gap-2">
                    {cat.category === 'INCIDENTS' && <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />}
                    {cat.category === 'TASKS' && <FileText className="w-3.5 h-3.5 text-blue-400" />}
                    {cat.category === 'INSPECTIONS' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                    {cat.category === 'ALERTS' && <Activity className="w-3.5 h-3.5 text-amber-400" />}
                    {cat.category === 'ENVIRONMENT' && <Building2 className="w-3.5 h-3.5 text-cyan-400" />}
                    <span className="text-xs font-medium text-slate-200">{cat.title}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={clsx(
                      "px-2 py-0.5 rounded-full text-[10px] font-bold font-mono",
                      cat.count > 0 ? "bg-rose-950 text-rose-300 border border-rose-800/40" : "bg-slate-800 text-slate-400"
                    )}>
                      {cat.count}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action to Create New Handover */}
          {!showCreateHandover ? (
            <button
              onClick={() => setShowCreateHandover(true)}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm active:scale-98 transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{t('createHandoverBtn')}</span>
            </button>
          ) : (
            /* Create Handover Form Card */
            <div className="p-3.5 rounded-xl bg-slate-900 border border-indigo-900/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-300">Draft Outgoing Handover</span>
                <button 
                  onClick={() => setShowCreateHandover(false)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
              </div>

              <div>
                <label className="text-[10px] font-semibold text-slate-400 block mb-1">
                  Operational Summary & Bench Works
                </label>
                <textarea
                  rows={3}
                  value={handoverNotes}
                  onChange={(e) => setHandoverNotes(e.target.value)}
                  placeholder={t('handoverNotesPlaceholder')}
                  className="w-full p-2.5 text-xs rounded-lg bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-slate-400 block mb-1">
                  Safety & Environmental Notes
                </label>
                <textarea
                  rows={2}
                  value={safetySummary}
                  onChange={(e) => setSafetySummary(e.target.value)}
                  placeholder={t('safetyNotesPlaceholder')}
                  className="w-full p-2.5 text-xs rounded-lg bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <button
                onClick={handleCreateHandover}
                disabled={submittingHandover || !handoverNotes.trim()}
                className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm"
              >
                {submittingHandover ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>Submit Handover Log</span>
              </button>
            </div>
          )}

          {/* Recent Shift Handovers List */}
          <div className="space-y-2 pt-2">
            <h3 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Shift Handover Logs</span>
            </h3>

            {handoverData?.recent_handovers && handoverData.recent_handovers.length > 0 ? (
              handoverData.recent_handovers.map(ho => {
                const isAck = ho.status === 'ACKNOWLEDGED';
                return (
                  <div 
                    key={ho.id}
                    className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-indigo-300">{ho.handover_code}</span>
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-slate-800 text-slate-300">
                          Shift {ho.from_shift_code} → {ho.to_shift_code}
                        </span>
                      </div>
                      <span className={clsx(
                        "px-2 py-0.5 rounded-full text-[10px] font-bold border",
                        isAck ? "bg-emerald-950/60 text-emerald-400 border-emerald-500/30" : "bg-amber-950/60 text-amber-400 border-amber-500/30"
                      )}>
                        {isAck ? t('handoverAcknowledgedBadge') : t('handoverSubmittedBadge')}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">{ho.summary_notes}</p>
                    {ho.safety_summary && (
                      <div className="p-2 rounded bg-slate-950/70 text-[11px] text-amber-300/90 border border-amber-900/30">
                        <span className="font-semibold block text-[10px] text-amber-400">Safety Observation:</span>
                        {ho.safety_summary}
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-slate-800/80">
                      <span>By: {ho.outgoing_officer_name || 'Shift In-Charge'}</span>
                      <span>{new Date(ho.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>

                    {!isAck && (
                      <button
                        onClick={() => {
                          setAcknowledgingHandover(ho);
                          setAckNotes('');
                        }}
                        className="w-full mt-2 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm active:scale-98"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{t('acknowledgeHandoverBtn')}</span>
                      </button>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="p-4 text-center rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400">
                No shift handovers logged for this mine today.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Disclaimers & Privacy Notice */}
      <div className="mx-4 mt-6 p-3 rounded-xl bg-slate-900/60 border border-slate-800/60 text-[10px] text-slate-400 space-y-1.5">
        <div className="flex items-start gap-1.5">
          <Lock className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
          <span>{t('dataPrivacyNotice')}</span>
        </div>
        <div className="flex items-start gap-1.5 text-slate-500">
          <ShieldCheck className="w-3 h-3 text-indigo-400 shrink-0 mt-0.5" />
          <span>{t('noBiometricDisclaimer')}</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: ATTENDANCE CORRECTION */}
      {/* ========================================================================= */}
      {correctingWorker && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-4 space-y-4 shadow-2xl animate-in fade-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-indigo-400" />
                <h3 className="text-xs font-bold text-white">{t('attendanceCorrectionTitle')}</h3>
              </div>
              <button 
                onClick={() => setCorrectingWorker(null)}
                className="text-slate-400 hover:text-white text-base"
              >
                ×
              </button>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 block">Worker</span>
              <span className="text-xs font-bold text-white">{correctingWorker.full_name} ({correctingWorker.worker_code})</span>
            </div>

            <div>
              <label className="text-[10px] font-semibold text-slate-400 block mb-1">New Attendance Status</label>
              <div className="grid grid-cols-3 gap-1.5">
                {['PRESENT', 'ABSENT', 'ON_LEAVE'].map(st => (
                  <button
                    key={st}
                    onClick={() => setNewStatus(st)}
                    className={clsx(
                      "py-1.5 text-xs font-bold rounded-lg border transition-all",
                      newStatus === st 
                        ? "bg-indigo-600 text-white border-indigo-500" 
                        : "bg-slate-950 text-slate-400 border-slate-800"
                    )}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] font-semibold text-slate-400 block mb-1">
                {t('correctionReasonLabel')} <span className="text-rose-400">*</span>
              </label>
              <textarea
                rows={3}
                value={correctionReason}
                onChange={(e) => setCorrectionReason(e.target.value)}
                placeholder={t('correctionReasonPlaceholder')}
                className="w-full p-2.5 text-xs rounded-lg bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setCorrectingWorker(null)}
                className="flex-1 py-2 text-xs font-semibold rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitCorrection}
                disabled={submittingCorrection || !correctionReason.trim()}
                className="flex-1 py-2 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white flex items-center justify-center gap-1.5"
              >
                {submittingCorrection && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Apply Correction</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ACKNOWLEDGE HANDOVER */}
      {/* ========================================================================= */}
      {acknowledgingHandover && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-4 space-y-4 shadow-2xl animate-in fade-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-bold text-white">{t('acknowledgeHandoverBtn')}</h3>
              </div>
              <button 
                onClick={() => setAcknowledgingHandover(null)}
                className="text-slate-400 hover:text-white text-base"
              >
                ×
              </button>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 block">Handover Log</span>
              <span className="text-xs font-mono font-bold text-indigo-300">{acknowledgingHandover.handover_code}</span>
              <p className="text-xs text-slate-300 mt-1">{acknowledgingHandover.summary_notes}</p>
            </div>

            <div>
              <label className="text-[10px] font-semibold text-slate-400 block mb-1">
                Incoming Shift Acknowledgment Notes
              </label>
              <textarea
                rows={2}
                value={ackNotes}
                onChange={(e) => setAckNotes(e.target.value)}
                placeholder="Shift crew briefed on active observations and safety items..."
                className="w-full p-2.5 text-xs rounded-lg bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setAcknowledgingHandover(null)}
                className="flex-1 py-2 text-xs font-semibold rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleAcknowledgeHandover}
                disabled={submittingAck}
                className="flex-1 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white flex items-center justify-center gap-1.5 shadow-sm"
              >
                {submittingAck && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirm Acknowledgment</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
