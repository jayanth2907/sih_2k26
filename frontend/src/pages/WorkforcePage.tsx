import React, { useEffect, useState } from 'react';
import { useMineContext } from '../context/MineContext';
import { useLanguage } from '../context/LanguageContext';
import { governanceService } from '../services';
import { Worker, AttendanceRecord } from '../types';
import { Users, Clock, Plus, X, UserCheck, ShieldCheck, Search, CheckCircle2, AlertCircle } from 'lucide-react';
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
  const absentCount = attendance.filter((a) => a.status === 'ABSENT').length;
  const attendanceRate = totalWorkers > 0 ? ((presentCount + lateCount) / totalWorkers) * 100 : 0;

  const filteredWorkers = workers.filter((w) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      w.full_name.toLowerCase().includes(q) ||
      w.worker_code.toLowerCase().includes(q) ||
      w.designation.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-400" />
              {t('workforceManagement')}
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-blue-950/80 text-blue-400 border border-blue-800">
              DGMS FORM-E STATUTORY MUSTER
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {t('workforceSubtitle')}
          </p>
        </div>

        <button
          onClick={handleOpenModal}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all shadow-lg shadow-amber-500/10 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{t('recordAttendance')}</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 font-mono text-xs">
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md space-y-1">
          <span className="text-slate-500 text-[10px] uppercase">{t('activeWorkers')}</span>
          <p className="text-2xl font-bold text-white">{totalWorkers}</p>
          <p className="text-[10px] text-slate-400">Registered on roster</p>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md space-y-1">
          <span className="text-slate-500 text-[10px] uppercase">Present Today</span>
          <p className="text-2xl font-bold text-emerald-400">{presentCount}</p>
          <p className="text-[10px] text-slate-400">Verified at shift gate</p>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md space-y-1">
          <span className="text-slate-500 text-[10px] uppercase">Late / Exceptions</span>
          <p className="text-2xl font-bold text-amber-400">{lateCount}</p>
          <p className="text-[10px] text-slate-400">Pending shift sign-off</p>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md space-y-1">
          <span className="text-slate-500 text-[10px] uppercase">{t('attendanceRate')}</span>
          <p className="text-2xl font-bold text-cyan-400">{attendanceRate.toFixed(1)}%</p>
          <p className="text-[10px] text-slate-400">Muster compliance</p>
        </div>
      </div>

      {/* Configured Mine Shifts */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 backdrop-blur-md">
        <h3 className="text-xs font-bold text-slate-300 font-mono uppercase tracking-wider mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-400" />
          Configured Statutory Mine Shifts (Form E)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
          <div className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-400">Shift A — Morning General</span>
              <span className="text-[10px] text-emerald-400 font-bold">ACTIVE</span>
            </div>
            <p className="text-slate-300 text-xs">06:00 — 14:00 (8 Hours)</p>
          </div>
          <div className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-400">Shift B — Afternoon</span>
              <span className="text-[10px] text-slate-400">SCHEDULED</span>
            </div>
            <p className="text-slate-300 text-xs">14:00 — 22:00 (8 Hours)</p>
          </div>
          <div className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-400">Shift C — Night Deep Seam</span>
              <span className="text-[10px] text-slate-400">SCHEDULED</span>
            </div>
            <p className="text-slate-300 text-xs">22:00 — 06:00 (8 Hours)</p>
          </div>
        </div>
      </div>

      {/* Attendance & Muster Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-md space-y-3 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono text-xs">
          <h3 className="font-bold text-white flex items-center gap-2">
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
              className="w-full pl-8 pr-3 py-1.5 bg-[#0D100F] border border-[#232A26] rounded-lg text-slate-200 text-xs focus:border-amber-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-3">Worker Code</th>
                <th className="py-2.5 px-3">Personnel Name</th>
                <th className="py-2.5 px-3">Designation / Role</th>
                <th className="py-2.5 px-3">Attendance Date</th>
                <th className="py-2.5 px-3">Verification Mode</th>
                <th className="py-2.5 px-3">Muster Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {attendance.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-500">
                    No attendance logs recorded for selected mine. Click "Record Attendance" above to log records.
                  </td>
                </tr>
              ) : (
                attendance.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-amber-400">{a.worker_code || `W-${a.worker_id}`}</td>
                    <td className="py-2.5 px-3 font-semibold text-white">{a.worker_name || 'Mine Personnel'}</td>
                    <td className="py-2.5 px-3 text-slate-300">{a.designation || 'Technician'}</td>
                    <td className="py-2.5 px-3 text-white">{a.attendance_date}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 font-mono">
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
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 font-mono text-xs animate-in fade-in zoom-in duration-150">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] text-amber-400 uppercase tracking-wider font-bold">DGMS Form E Muster Roll</span>
                <h3 className="text-base font-bold text-white mt-0.5">{t('recordAttendance')}</h3>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formFeedback && (
              <div className={`p-3 rounded-xl border flex items-center gap-2 ${
                formFeedback.type === 'success' 
                  ? 'bg-emerald-950/80 border-emerald-700 text-emerald-300' 
                  : 'bg-rose-950/80 border-rose-700 text-rose-300'
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
                  className="w-full px-3 py-2.5 bg-[#0D100F] border border-[#232A26] rounded-xl text-slate-200 text-xs focus:border-amber-500 focus:outline-none cursor-pointer"
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
                {workers.length === 0 && (
                  <p className="text-[10px] text-amber-400 mt-1">
                    Note: No personnel registered under this mine dossier. Please select an active mine.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-300 font-medium mb-1.5">
                    {t('shift')} <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={shiftCode}
                    onChange={(e) => setShiftCode(e.target.value)}
                    className="w-full px-3 py-2.5 bg-[#0D100F] border border-[#232A26] rounded-xl text-slate-200 text-xs focus:border-amber-500 focus:outline-none cursor-pointer"
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
                    className="w-full px-3 py-2.5 bg-[#0D100F] border border-[#232A26] rounded-xl text-slate-200 text-xs focus:border-amber-500 focus:outline-none cursor-pointer"
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
                  className="w-full px-3 py-2.5 bg-[#0D100F] border border-[#232A26] rounded-xl text-slate-200 text-xs focus:border-amber-500 focus:outline-none font-sans"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-medium cursor-pointer hover:bg-slate-700 transition-colors"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || workers.length === 0}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold uppercase transition-all cursor-pointer shadow-md disabled:opacity-50"
                >
                  {isSubmitting ? 'Recording Muster...' : t('saveAttendance')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
