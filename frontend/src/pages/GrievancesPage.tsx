import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { useMineContext } from '../context/MineContext';
import { governanceService } from '../services';
import { Grievance } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { MessageSquare, Clock, Plus, X } from 'lucide-react';

export const GrievancesPage: React.FC = () => {
  const { selectedMine } = useMineContext();
  const [grievances, setGrievances] = useState<Grievance[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Submit Modal
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('SAFETY');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('HIGH');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update / Resolve Modal
  const [selectedGrievance, setSelectedGrievance] = useState<Grievance | null>(null);
  const [newStatus, setNewStatus] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchGrievances = async () => {
    if (!selectedMine) return;
    setIsLoading(true);
    try {
      const data = await governanceService.getGrievances(selectedMine.id);
      setGrievances(data);
    } catch (err) {
      console.error('Failed to load grievances:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGrievances();
  }, [selectedMine?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMine) return;
    setIsSubmitting(true);
    try {
      await governanceService.submitGrievance({
        mine_id: selectedMine.id,
        title,
        category,
        priority,
        description,
        anonymous: false
      });
      setIsSubmitModalOpen(false);
      setTitle('');
      setDescription('');
      await fetchGrievances();
    } catch (err: any) {
      console.error('Failed to submit grievance:', err);
      alert(err.response?.data?.detail || 'Submission failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGrievance) return;
    setIsUpdating(true);
    try {
      await governanceService.updateGrievanceStatus(
        selectedGrievance.id,
        newStatus || selectedGrievance.status,
        resolutionNotes || undefined
      );
      setSelectedGrievance(null);
      await fetchGrievances();
    } catch (err: any) {
      console.error('Failed to update grievance:', err);
      alert(err.response?.data?.detail || 'Update failed');
    } finally {
      setIsUpdating(false);
    }
  };

  if (!selectedMine) return null;

  const totalGrievances = grievances.length;
  const openCount = grievances.filter((g) => ['SUBMITTED', 'ACKNOWLEDGED', 'ASSIGNED', 'IN_PROGRESS', 'ESCALATED'].includes(g.status)).length;
  const escalatedCount = grievances.filter((g) => g.is_escalated).length;
  const resolvedCount = grievances.filter((g) => ['RESOLVED', 'VERIFIED', 'CLOSED'].includes(g.status)).length;

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
              <MessageSquare className="w-5 h-5 text-amber-400 shrink-0" />
              Workforce Grievance Redressal & SLA Tracking
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-mono bg-[#121614] text-amber-400 border border-[#27302B] font-semibold">
              DGMS LABOUR & SAFETY OMBUDSMAN
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 font-sans">
            Auditable dispute resolution, safety hazard complaints, contractor grievances, and automated escalation timers.
          </p>
        </div>

        <button
          onClick={() => setIsSubmitModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>LODGE GRIEVANCE</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-[#0D100F] border border-[#1B211E] space-y-1 shadow-xs bg-gradient-to-br from-[#0D100F] to-[#121614]">
          <span className="font-sans text-[10.5px] uppercase font-semibold text-slate-400 tracking-wider block">Total Lodged</span>
          <p className="font-mono text-2xl font-black text-white">{totalGrievances}</p>
        </div>
        <div className="p-4 rounded-xl bg-[#0D100F] border border-[#1B211E] space-y-1 shadow-xs bg-gradient-to-br from-[#0D100F] to-[#121614]">
          <span className="font-sans text-[10.5px] uppercase font-semibold text-slate-400 tracking-wider block">Active & In-Progress</span>
          <p className="font-mono text-2xl font-black text-amber-400">{openCount}</p>
        </div>
        <div className="p-4 rounded-xl bg-[#0D100F] border border-[#1B211E] space-y-1 shadow-xs bg-gradient-to-br from-[#0D100F] to-[#121614]">
          <span className="font-sans text-[10.5px] uppercase font-semibold text-slate-400 tracking-wider block">Escalated</span>
          <p className="font-mono text-2xl font-black text-rose-400">{escalatedCount}</p>
        </div>
        <div className="p-4 rounded-xl bg-[#0D100F] border border-[#1B211E] space-y-1 shadow-xs bg-gradient-to-br from-[#0D100F] to-[#121614]">
          <span className="font-sans text-[10.5px] uppercase font-semibold text-slate-400 tracking-wider block">Resolved / Closed</span>
          <p className="font-mono text-2xl font-black text-emerald-400">{resolvedCount}</p>
        </div>
      </div>

      {/* Grievance Ledger Table */}
      <div className="bg-[#0D100F] border border-[#1B211E] rounded-xl overflow-hidden shadow-xs p-4 space-y-3">
        <h3 className="font-sans text-sm font-bold text-white flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-400 shrink-0" />
          Grievance Ledger & Resolution Workflow
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead>
              <tr className="bg-[#121614] border-b border-[#1B211E] text-slate-400 uppercase tracking-wider text-[10.5px] font-semibold">
                <th className="py-3 px-3 font-mono">Case Code</th>
                <th className="py-3 px-3">Category & Title</th>
                <th className="py-3 px-3">Priority</th>
                <th className="py-3 px-3">Due By (SLA)</th>
                <th className="py-3 px-3">Escalated?</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1B211E]/60 text-slate-300">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 font-mono text-xs animate-pulse">
                    Loading grievances...
                  </td>
                </tr>
              ) : grievances.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-slate-400 font-sans text-xs">
                    No active grievances lodged for this mine.
                  </td>
                </tr>
              ) : (
                grievances.map((g) => (
                  <tr key={g.id} className="hover:bg-[#141A17] transition-colors">
                    <td className="py-2.5 px-3 font-mono font-bold text-amber-400">{g.grievance_code}</td>
                    <td className="py-2.5 px-3">
                      <p className="font-bold text-white">{g.title}</p>
                      <p className="text-[10.5px] text-slate-400">Category: {g.category}</p>
                    </td>
                    <td className="py-2.5 px-3">
                      <StatusBadge status={g.priority} size="sm" />
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-400">
                      {g.due_at ? new Date(g.due_at).toLocaleString() : 'N/A'}
                    </td>
                    <td className="py-2.5 px-3 font-mono">
                      {g.is_escalated ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-300 border border-rose-500/30">
                          ESCALATED
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] bg-[#121614] text-slate-400 border border-[#232A26]">
                          STANDARD
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <StatusBadge status={g.status} size="sm" />
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => {
                          setSelectedGrievance(g);
                          setNewStatus(g.status);
                          setResolutionNotes(g.resolution_notes || '');
                        }}
                        className="px-3 py-1.5 rounded-md bg-[#121614] text-slate-200 hover:bg-[#171C19] border border-[#232A26] text-xs font-semibold cursor-pointer transition-colors"
                      >
                        MANAGE
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Lodge Grievance Modal */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 bg-[#080A09]/85 backdrop-blur-md z-50 flex items-center justify-center p-4 font-sans">
          <div className="bg-[#0D100F] border border-[#27302B] rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-xs animate-in fade-in zoom-in duration-150">
            <div className="flex items-start justify-between border-b border-[#1B211E] pb-3">
              <div>
                <span className="font-mono text-[10.5px] text-amber-400 uppercase tracking-wider font-bold">Formal Ombudsman</span>
                <h3 className="text-base font-bold text-white mt-0.5">Lodge Formal Mine Grievance</h3>
              </div>
              <button onClick={() => setIsSubmitModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] text-slate-300 font-medium mb-1">Grievance Title / Subject</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Inadequate ventilation at Headings 4B..."
                  className="w-full px-3 py-2 bg-[#080A09] border border-[#1B211E] rounded-lg text-slate-200 text-xs focus:border-amber-500 font-sans"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-300 font-medium mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-[#080A09] border border-[#1B211E] rounded-lg text-slate-200 text-xs focus:border-amber-500"
                  >
                    <option value="SAFETY">Safety Hazard</option>
                    <option value="ENVIRONMENT">Environmental</option>
                    <option value="LABOUR">Labour & Welfare</option>
                    <option value="CONTRACTOR">Contractor Issue</option>
                    <option value="FACILITIES">Mine Facilities</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-300 font-medium mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full px-3 py-2 bg-[#080A09] border border-[#1B211E] rounded-lg text-slate-200 text-xs focus:border-amber-500"
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="CRITICAL">CRITICAL</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-slate-300 font-medium mb-1">Detailed Description & Location</label>
                <textarea
                  rows={3}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide precise details of the safety concern or grievance..."
                  className="w-full px-3 py-2 bg-[#080A09] border border-[#1B211E] rounded-lg text-slate-200 text-xs focus:border-amber-500 font-sans"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1B211E]">
                <button
                  type="button"
                  onClick={() => setIsSubmitModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-[#121614] text-slate-300 border border-[#232A26] text-xs font-medium cursor-pointer hover:bg-[#171C19]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold uppercase transition-all cursor-pointer shadow-xs"
                >
                  {isSubmitting ? 'Submitting...' : 'Register Grievance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage Grievance Modal */}
      {selectedGrievance && (
        <div className="fixed inset-0 bg-[#080A09]/85 backdrop-blur-md z-50 flex items-center justify-center p-4 font-sans">
          <div className="bg-[#0D100F] border border-[#27302B] rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-xs animate-in fade-in zoom-in duration-150">
            <div className="flex items-start justify-between border-b border-[#1B211E] pb-3">
              <div>
                <span className="font-mono text-[10.5px] text-amber-400 uppercase tracking-wider font-bold">{selectedGrievance.grievance_code} • Workflow Action</span>
                <h3 className="text-base font-bold text-white mt-0.5">{selectedGrievance.title}</h3>
              </div>
              <button onClick={() => setSelectedGrievance(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-[#080A09] rounded-lg border border-[#1B211E] text-slate-300 text-xs font-sans">
              <p className="font-semibold text-white mb-1">Details:</p>
              <p>{selectedGrievance.description}</p>
            </div>

            <form onSubmit={handleUpdate} className="space-y-3">
              <div>
                <label className="block text-[11px] text-slate-300 font-medium mb-1">Update Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-[#080A09] border border-[#1B211E] rounded-lg text-slate-200 text-xs focus:border-amber-500 font-mono"
                >
                  <option value="SUBMITTED">SUBMITTED</option>
                  <option value="ACKNOWLEDGED">ACKNOWLEDGED</option>
                  <option value="ASSIGNED">ASSIGNED</option>
                  <option value="IN_PROGRESS">IN_PROGRESS</option>
                  <option value="RESOLVED">RESOLVED</option>
                  <option value="VERIFIED">VERIFIED</option>
                  <option value="CLOSED">CLOSED</option>
                  <option value="ESCALATED">ESCALATED</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-slate-300 font-medium mb-1">Resolution Summary / Action Notes</label>
                <textarea
                  rows={3}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Auxiliary fan replaced and airflow restored to 28 m3/min..."
                  className="w-full px-3 py-2 bg-[#080A09] border border-[#1B211E] rounded-lg text-slate-200 text-xs focus:border-amber-500 font-sans"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1B211E]">
                <button
                  type="button"
                  onClick={() => setSelectedGrievance(null)}
                  className="px-4 py-2 rounded-lg bg-[#121614] text-slate-300 border border-[#232A26] text-xs font-medium cursor-pointer hover:bg-[#171C19]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold uppercase transition-all cursor-pointer shadow-xs"
                >
                  {isUpdating ? 'Updating...' : 'Save Status Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </motion.div>
  );
};
