import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { useMineContext } from '../context/MineContext';
import { useLanguage } from '../context/LanguageContext';
import { governanceService } from '../services';
import { Worker, AttendanceRecord } from '../types';
import { Users, Clock, Plus, X, UserCheck, Search, CheckCircle2, AlertCircle } from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';

export const WorkforcePage: React.FC = () => {
  const { selectedMine } = useMineContext();
  const { t } = useLanguage();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Mark Attendance Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedWorkerId, setSelectedWorkerId] = useState<number | ''>('');
  const [shiftCode, setShiftCode] = useState<string>('A');
  const [attendanceStatus, setAttendanceStatus] = useState<string>('PRESENT');
  const [remarks, setRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formFeedback, setFormFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchData = async () => {
    if (!selectedMine) return;
    setIsLoading(true);
    try {
      const [workersData, attendanceData] = await Promise.all([
        governanceService.getWorkers(selectedMine.id),
        governanceService.getAttendanceRoster(selectedMine.id)
      ]);
      setWorkers(workersData);
      setAttendance(attendanceData);
      if (workersData.length > 0 && selectedWorkerId === '') {
        setSelectedWorkerId(workersData[0].id);
      }
    } catch (err) {
      console.error('Failed to load workforce data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedMine?.id]);

  const handleOpenModal = () => {
    setFormFeedback(null);
    setRemarks('');
    if (workers.length > 0 && selectedWorkerId === '') {
      setSelectedWorkerId(workers[0].id);
    }
    setIsModalOpen(true);
  };

  const handleMarkAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMine || selectedWorkerId === '') {
      setFormFeedback({ type: 'error', message: 'Please select a valid worker from the roster.' });
      return;
    }
    setIsSubmitting(true);
    setFormFeedback(null);
    try {
      await governanceService.markAttendance({
        worker_id: Number(selectedWorkerId),
        mine_id: selectedMine.id,
        shift_code: shiftCode,
        status: attendanceStatus,
        verification_mode: 'SIMULATED',
        notes: remarks || undefined
      });
      setFormFeedback({ type: 'success', message: 'Attendance recorded and verified in statutory muster roll.' });
      setTimeout(async () => {
        setIsModalOpen(false);
        setRemarks('');
        setFormFeedback(null);
        await fetchData();
      }, 900);
    } catch (err: any) {
      console.error('Failed to record attendance:', err);
      setFormFeedback({ 
        type: 'error', 
        message: err.response?.data?.detail || 'Failed to record attendance in database.' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!selectedMine) return null;

  const totalWorkers = workers.length;
  const presentCount = attendance.filter((a) => a.status === 'PRESENT').length;
  const lateCount = attendance.filter((a) => a.status === 'LATE').length;
  const attendanceRate = totalWorkers > 0 ? ((presentCount + lateCount) / totalWorkers) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-6 font-sans text-slate-100"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1B211E] pb-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2 font-sans">
              <Users className="w-5 h-5 text-amber-400 shrink-0" />
              {t('workforceManagement')}
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-mono bg-[#121614] text-amber-400 border border-[#27302B] font-semibold">
              DGMS FORM-E STATUTORY MUSTER
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 font-sans">
            {t('workforceSubtitle')}
          </p>
        </div>

        <button
          onClick={handleOpenModal}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{t('recordAttendance')}</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-[#0D100F] border border-[#1B211E] space-y-1 shadow-xs bg-gradient-to-br from-[#0D100F] to-[#121614]">
          <span className="font-sans text-[10.5px] uppercase font-semibold text-slate-400 tracking-wider block">{t('activeWorkers')}</span>
          <p className="font-mono text-2xl font-black text-white">{totalWorkers}</p>
          <p className="font-sans text-[11px] text-slate-400">Registered on roster</p>
        </div>
        <div className="p-4 rounded-xl bg-[#0D100F] border border-[#1B211E] space-y-1 shadow-xs bg-gradient-to-br from-[#0D100F] to-[#121614]">
          <span className="font-sans text-[10.5px] uppercase font-semibold text-slate-400 tracking-wider block">Present Today</span>
          <p className="font-mono text-2xl font-black text-emerald-400">{presentCount}</p>
          <p className="font-sans text-[11px] text-slate-400">Verified at shift gate</p>
        </div>
        <div className="p-4 rounded-xl bg-[#0D100F] border border-[#1B211E] space-y-1 shadow-xs bg-gradient-to-br from-[#0D100F] to-[#121614]">
          <span className="font-sans text-[10.5px] uppercase font-semibold text-slate-400 tracking-wider block">Late / Exceptions</span>
          <p className="font-mono text-2xl font-black text-amber-400">{lateCount}</p>
          <p className="font-sans text-[11px] text-slate-400">Pending shift sign-off</p>
        </div>
        <div className="p-4 rounded-xl bg-[#0D100F] border border-[#1B211E] space-y-1 shadow-xs bg-gradient-to-br from-[#0D100F] to-[#121614]">
          <span className="font-sans text-[10.5px] uppercase font-semibold text-slate-400 tracking-wider block">{t('attendanceRate')}</span>
          <p className="font-mono text-2xl font-black text-cyan-400">{attendanceRate.toFixed(1)}%</p>
          <p className="font-sans text-[11px] text-slate-400">Muster compliance</p>
        </div>
      </div>

      {/* Configured Mine Shifts */}
      <div className="bg-[#0D100F] border border-[#1B211E] rounded-xl p-4 space-y-3 shadow-xs">
        <h3 className="text-xs font-bold text-slate-200 font-sans uppercase tracking-wider flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-400 shrink-0" />
          Configured Statutory Mine Shifts (Form E)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-sans text-xs">
          <div className="p-3 bg-[#080A09] border border-[#1B211E] rounded-lg space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-amber-300">Shift A — Morning General</span>
              <span className="font-mono text-[10px] text-emerald-400 font-bold">ACTIVE</span>
            </div>
            <p className="text-slate-400 text-xs font-mono">06:00 — 14:00 (8 Hours)</p>
          </div>
          <div className="p-3 bg-[#080A09] border border-[#1B211E] rounded-lg space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-amber-300">Shift B — Afternoon</span>
              <span className="font-mono text-[10px] text-slate-500">SCHEDULED</span>
            </div>
            <p className="text-slate-400 text-xs font-mono">14:00 — 22:00 (8 Hours)</p>
          </div>
          <div className="p-3 bg-[#080A09] border border-[#1B211E] rounded-lg space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-amber-300">Shift C — Night Deep Seam</span>
              <span className="font-mono text-[10px] text-slate-500">SCHEDULED</span>
            </div>
            <p className="text-slate-400 text-xs font-mono">22:00 — 06:00 (8 Hours)</p>
          </div>
        </div>
      </div>

      {/* Attendance & Muster Table */}
      <div className="bg-[#0D100F] border border-[#1B211E] rounded-xl overflow-hidden shadow-xs p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-sans text-xs">
          <h3 className="font-bold text-white flex items-center gap-2 text-sm">
            <UserCheck className="w-4 h-4 text-amber-400" />
            Daily Muster Roll & Attendance Log
          </h3>

          <div className="relative max-w-xs w-full">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder={t('searchWorkers')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-[#080A09] border border-[#1B211E] rounded-lg text-slate-200 text-xs focus:border-amber-500 focus:outline-none font-sans"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead>
              <tr className="bg-[#121614] border-b border-[#1B211E] text-slate-400 uppercase tracking-wider text-[10.5px] font-semibold">
                <th className="py-3 px-3 font-mono">Worker Code</th>
                <th className="py-3 px-3">Personnel Name</th>
                <th className="py-3 px-3">Designation / Role</th>
                <th className="py-3 px-3">Attendance Date</th>
                <th className="py-3 px-3">Verification Mode</th>
                <th className="py-3 px-3">Muster Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1B211E]/60 text-slate-300">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 font-mono text-xs animate-pulse">
                    Loading attendance roster...
                  </td>
                </tr>
              ) : attendance.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-400 font-sans text-xs">
                    No attendance logs recorded for selected mine. Click "Record Attendance" above to log records.
                  </td>
                </tr>
              ) : (
                attendance.map((a) => (
                  <tr key={a.id} className="hover:bg-[#141A17] transition-colors">
                    <td className="py-2.5 px-3 font-mono font-bold text-amber-400">{a.worker_code || `W-${a.worker_id}`}</td>
                    <td className="py-2.5 px-3 font-bold text-white">{a.worker_name || 'Mine Personnel'}</td>
                    <td className="py-2.5 px-3 text-slate-300">{a.designation || 'Technician'}</td>
                    <td className="py-2.5 px-3 font-mono text-white">{a.attendance_date}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-[#121614] text-slate-400 border border-[#27302B] font-mono">
                        {a.verification_mode}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <StatusBadge status={a.status} size="sm" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Attendance Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-[#080A09]/85 backdrop-blur-md z-50 flex items-center justify-center p-4 font-sans">
          <div className="bg-[#0D100F] border border-[#27302B] rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-xs animate-in fade-in zoom-in duration-150">
            <div className="flex items-start justify-between border-b border-[#1B211E] pb-3">
              <div>
                <span className="font-mono text-[10.5px] text-amber-400 uppercase tracking-wider font-bold">DGMS Form E Muster Roll</span>
                <h3 className="text-base font-bold text-white mt-0.5">{t('recordAttendance')}</h3>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#121614] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formFeedback && (
              <div className={`p-3 rounded-lg border flex items-center gap-2 ${
                formFeedback.type === 'success' 
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}>
                {formFeedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                <p className="text-xs font-sans">{formFeedback.message}</p>
              </div>
            )}

            <form onSubmit={handleMarkAttendance} className="space-y-4">
              <div>
                <label className="block text-[11px] text-slate-300 font-medium mb-1.5">
                  {t('workerName')} <span className="text-rose-400">*</span>
                </label>
                <select
                  value={selectedWorkerId}
                  onChange={(e) => setSelectedWorkerId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-3 py-2 bg-[#080A09] border border-[#1B211E] rounded-lg text-slate-200 text-xs focus:border-amber-500 focus:outline-none cursor-pointer"
                  required
                >
                  <option value="" disabled>
                    {workers.length === 0 ? '-- No registered workers found for this mine --' : '-- [ Select worker ▼ ] --'}
                  </option>
                  {workers.map((w) => (
                    <option key={w.id} value={w.id} className="bg-[#0D100F] text-slate-200">
                      {w.worker_code} — {w.full_name} ({w.designation})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-300 font-medium mb-1.5">
                    {t('shift')} <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={shiftCode}
                    onChange={(e) => setShiftCode(e.target.value)}
                    className="w-full px-3 py-2 bg-[#080A09] border border-[#1B211E] rounded-lg text-slate-200 text-xs focus:border-amber-500 focus:outline-none cursor-pointer"
                  >
                    <option value="A" className="bg-[#0D100F] text-slate-200">Shift A — 06:00–14:00 (Morning)</option>
                    <option value="B" className="bg-[#0D100F] text-slate-200">Shift B — 14:00–22:00 (Afternoon)</option>
                    <option value="C" className="bg-[#0D100F] text-slate-200">Shift C — 22:00–06:00 (Night Deep)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-300 font-medium mb-1.5">
                    Muster Status <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={attendanceStatus}
                    onChange={(e) => setAttendanceStatus(e.target.value)}
                    className="w-full px-3 py-2 bg-[#080A09] border border-[#1B211E] rounded-lg text-slate-200 text-xs focus:border-amber-500 focus:outline-none cursor-pointer"
                  >
                    <option value="PRESENT" className="bg-[#0D100F] text-slate-200">Present — On Shift</option>
                    <option value="LATE" className="bg-[#0D100F] text-slate-200">Late — Exception Logged</option>
                    <option value="ABSENT" className="bg-[#0D100F] text-slate-200">Absent — Not Reported</option>
                    <option value="ON_LEAVE" className="bg-[#0D100F] text-slate-200">On Leave — Statutory Permitted</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-slate-300 font-medium mb-1.5">
                  Remarks / Gate Muster Notes
                </label>
                <input
                  type="text"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="e.g., Gate 2 biometric scan verified, PPE check completed..."
                  className="w-full px-3 py-2 bg-[#080A09] border border-[#1B211E] rounded-lg text-slate-200 text-xs focus:border-amber-500 focus:outline-none font-sans"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#1B211E]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-[#121614] text-slate-300 border border-[#232A26] text-xs font-medium cursor-pointer hover:bg-[#171C19]"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || workers.length === 0}
                  className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold uppercase transition-all cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? 'Recording Muster...' : t('saveAttendance')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </motion.div>
  );
};
