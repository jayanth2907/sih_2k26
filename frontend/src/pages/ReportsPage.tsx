import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { useMineContext } from '../context/MineContext';
import { governanceService } from '../services';
import { RegulatoryReport } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { FileText, Download, Send, Plus, X, ShieldCheck } from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const { selectedMine } = useMineContext();
  const [reports, setReports] = useState<RegulatoryReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Generate Report Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [reportType, setReportType] = useState('DGMS_SAFETY_SUMMARY');
  const [title, setTitle] = useState('');
  const [periodStart, setPeriodStart] = useState('2026-09-01');
  const [periodEnd, setPeriodEnd] = useState('2026-09-13');
  const [isGenerating, setIsGenerating] = useState(false);

  // Submit for Approval Modal
  const [selectedReport, setSelectedReport] = useState<RegulatoryReport | null>(null);
  const [notes, setNotes] = useState('');
  const [isSubmittingApproval, setIsSubmittingApproval] = useState(false);

  const fetchReports = async () => {
    if (!selectedMine) return;
    setIsLoading(true);
    try {
      const data = await governanceService.getReports(selectedMine.id);
      setReports(data);
    } catch (err) {
      console.error('Failed to load regulatory reports:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [selectedMine?.id]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMine) return;
    setIsGenerating(true);
    try {
      await governanceService.generateReport({
        mine_id: selectedMine.id,
        report_type: reportType,
        title: title || `${reportType.replace(/_/g, ' ')} (${periodStart} to ${periodEnd})`,
        reporting_period_start: periodStart,
        reporting_period_end: periodEnd
      });
      setIsModalOpen(false);
      setTitle('');
      await fetchReports();
    } catch (err: any) {
      console.error('Failed to generate report:', err);
      alert(err.response?.data?.detail || 'Report generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadPdf = async (reportId: number) => {
    try {
      await governanceService.downloadReportPdf(reportId);
    } catch (err) {
      console.error('Failed to download PDF:', err);
      alert('Failed to download statutory PDF.');
    }
  };

  const handleSubmitForApproval = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReport || !selectedMine) return;
    setIsSubmittingApproval(true);
    try {
      await governanceService.createApprovalRequest({
        mine_id: selectedMine.id,
        resource_type: 'RegulatoryReport',
        resource_id: String(selectedReport.id),
        title: `Statutory Sign-off for ${selectedReport.title}`,
        description: notes || 'Submitted for Mine Manager executive endorsement per DGMS standards.',
        required_role: 'MINE_MANAGER'
      });
      setSelectedReport(null);
      setNotes('');
      await fetchReports();
      alert('Report submitted for digital approval sign-off.');
    } catch (err: any) {
      console.error('Failed to submit for approval:', err);
      alert(err.response?.data?.detail || 'Failed to submit for approval');
    } finally {
      setIsSubmittingApproval(false);
    }
  };

  if (!selectedMine) return null;

  const totalReports = reports.length;
  const approvedReports = reports.filter((r) => r.status === 'APPROVED' || r.status === 'SEALED').length;
  const pendingApprovals = reports.filter((r) => r.status === 'PENDING_APPROVAL' || r.status === 'SUBMITTED').length;

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
              <FileText className="w-5 h-5 text-amber-400 shrink-0" />
              Statutory & Regulatory Report Generation
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-mono bg-[#121614] text-amber-400 border border-[#27302B] font-semibold">
              REPORTLAB ENGINE
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 font-sans">
            Server-side generation of DGMS compliance dossiers, safety audit summaries, and production variance statements.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>GENERATE STATUTORY REPORT</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-[#0D100F] border border-[#1B211E] space-y-1 shadow-xs bg-gradient-to-br from-[#0D100F] to-[#121614]">
          <span className="font-sans text-[10.5px] uppercase font-semibold text-slate-400 tracking-wider block">Generated Dossiers</span>
          <p className="font-mono text-2xl font-black text-white">{totalReports}</p>
        </div>
        <div className="p-4 rounded-xl bg-[#0D100F] border border-[#1B211E] space-y-1 shadow-xs bg-gradient-to-br from-[#0D100F] to-[#121614]">
          <span className="font-sans text-[10.5px] uppercase font-semibold text-slate-400 tracking-wider block">Awaiting Sign-off</span>
          <p className="font-mono text-2xl font-black text-amber-400">{pendingApprovals}</p>
        </div>
        <div className="p-4 rounded-xl bg-[#0D100F] border border-[#1B211E] space-y-1 shadow-xs bg-gradient-to-br from-[#0D100F] to-[#121614]">
          <span className="font-sans text-[10.5px] uppercase font-semibold text-slate-400 tracking-wider block">Approved & Sealed</span>
          <p className="font-mono text-2xl font-black text-emerald-400">{approvedReports}</p>
        </div>
      </div>

      {/* Reports Table */}
      <div className="bg-[#0D100F] border border-[#1B211E] rounded-xl overflow-hidden shadow-xs p-4 space-y-3">
        <h3 className="font-sans text-sm font-bold text-white flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
          Statutory Report Archive & Version Ledger
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead>
              <tr className="bg-[#121614] border-b border-[#1B211E] text-slate-400 uppercase tracking-wider text-[10.5px] font-semibold">
                <th className="py-3 px-3 font-mono">Report Code</th>
                <th className="py-3 px-3">Title & Type</th>
                <th className="py-3 px-3">Reporting Period</th>
                <th className="py-3 px-3 font-mono">Version</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Generated</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1B211E]/60 text-slate-300">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 font-mono text-xs animate-pulse">
                    Loading statutory reports...
                  </td>
                </tr>
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-slate-400 font-sans text-xs">
                    No statutory reports generated for this mine yet.
                  </td>
                </tr>
              ) : (
                reports.map((r) => (
                  <tr key={r.id} className="hover:bg-[#141A17] transition-colors">
                    <td className="py-2.5 px-3 font-mono font-bold text-amber-400">{r.report_code}</td>
                    <td className="py-2.5 px-3">
                      <p className="font-bold text-white">{r.title}</p>
                      <p className="font-mono text-[10px] text-slate-500">{r.report_type}</p>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-300">
                      {r.reporting_period_start} to {r.reporting_period_end}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-300">
                      v{r.current_version}.0
                    </td>
                    <td className="py-2.5 px-3">
                      <StatusBadge status={r.status} size="sm" />
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-400">
                      {r.generated_at ? new Date(r.generated_at).toLocaleDateString() : 'Recent'}
                    </td>
                    <td className="py-2.5 px-3 text-right space-x-2">
                      <button
                        onClick={() => handleDownloadPdf(r.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 border border-amber-500/40 text-xs font-bold cursor-pointer transition-colors shadow-xs"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>PDF</span>
                      </button>

                      {r.status === 'GENERATED' && (
                        <button
                          onClick={() => setSelectedReport(r)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#121614] text-cyan-300 hover:bg-[#171C19] border border-[#232A26] text-xs font-semibold cursor-pointer transition-colors"
                        >
                          <Send className="w-3.5 h-3.5 text-cyan-400" />
                          <span>SIGN-OFF</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Generate Report Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-[#080A09]/85 backdrop-blur-md z-50 flex items-center justify-center p-4 font-sans">
          <div className="bg-[#0D100F] border border-[#27302B] rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-xs animate-in fade-in zoom-in duration-150">
            <div className="flex items-start justify-between border-b border-[#1B211E] pb-3">
              <div>
                <span className="font-mono text-[10.5px] text-amber-400 uppercase tracking-wider font-bold">ReportLab Generation</span>
                <h3 className="text-base font-bold text-white mt-0.5">Generate Statutory Regulatory Report</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleGenerate} className="space-y-3">
              <div>
                <label className="block text-[11px] text-slate-300 font-medium mb-1">Report Type</label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  className="w-full px-3 py-2 bg-[#080A09] border border-[#1B211E] rounded-lg text-slate-200 text-xs focus:border-amber-500"
                >
                  <option value="DGMS_SAFETY_SUMMARY">DGMS Monthly Safety & Inspection Summary</option>
                  <option value="ENVIRONMENTAL_SUMMARY">Atmospheric & Environmental Threshold Audit</option>
                  <option value="PRODUCTION_SUMMARY">Coal Seam Extraction & Output Variance Report</option>
                  <option value="MINE_GOVERNANCE_SUMMARY">TRINETRA Mine Master Governance Dossier</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-slate-300 font-medium mb-1">Custom Title (Optional)</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. DGMS Fortnightly Inspection - Bharat Deep Shaft 4"
                  className="w-full px-3 py-2 bg-[#080A09] border border-[#1B211E] rounded-lg text-slate-200 text-xs focus:border-amber-500 font-sans"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-300 font-medium mb-1">Period Start</label>
                  <input
                    type="date"
                    required
                    value={periodStart}
                    onChange={(e) => setPeriodStart(e.target.value)}
                    className="w-full px-3 py-2 bg-[#080A09] border border-[#1B211E] rounded-lg text-slate-200 text-xs focus:border-amber-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-300 font-medium mb-1">Period End</label>
                  <input
                    type="date"
                    required
                    value={periodEnd}
                    onChange={(e) => setPeriodEnd(e.target.value)}
                    className="w-full px-3 py-2 bg-[#080A09] border border-[#1B211E] rounded-lg text-slate-200 text-xs focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              <div className="p-3 bg-[#080A09] rounded-lg border border-[#1B211E] text-[10.5px] text-slate-400 font-sans">
                <span className="font-bold text-amber-400 block mb-1">Report Notice:</span>
                Generated reports are sealed with a unique cryptographic SHA-256 audit reference. Reports submitted for approval become immutable upon final sign-off.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1B211E]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-[#121614] text-slate-300 border border-[#232A26] text-xs font-medium cursor-pointer hover:bg-[#171C19]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isGenerating}
                  className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold uppercase transition-all cursor-pointer shadow-xs"
                >
                  {isGenerating ? 'Compiling PDF...' : 'Compile & Generate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Submit for Approval Modal */}
      {selectedReport && (
        <div className="fixed inset-0 bg-[#080A09]/85 backdrop-blur-md z-50 flex items-center justify-center p-4 font-sans">
          <div className="bg-[#0D100F] border border-[#27302B] rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4 text-xs animate-in fade-in zoom-in duration-150">
            <div className="flex items-start justify-between border-b border-[#1B211E] pb-3">
              <div>
                <span className="font-mono text-[10.5px] text-amber-400 uppercase tracking-wider font-bold">Digital Sign-off Chain</span>
                <h3 className="text-base font-bold text-white mt-0.5">Submit Report for Sign-off</h3>
              </div>
              <button onClick={() => setSelectedReport(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-slate-300">
              Submit <span className="font-mono font-bold text-white">{selectedReport.report_code}</span> for executive review and statutory seal.
            </p>

            <form onSubmit={handleSubmitForApproval} className="space-y-3">
              <div>
                <label className="block text-[11px] text-slate-300 font-medium mb-1">Submission Notes</label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Forwarding for Mine Manager endorsement per DGMS circular..."
                  className="w-full px-3 py-2 bg-[#080A09] border border-[#1B211E] rounded-lg text-slate-200 text-xs focus:border-amber-500 font-sans"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1B211E]">
                <button
                  type="button"
                  onClick={() => setSelectedReport(null)}
                  className="px-4 py-2 rounded-lg bg-[#121614] text-slate-300 border border-[#232A26] text-xs font-medium cursor-pointer hover:bg-[#171C19]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingApproval}
                  className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold uppercase transition-all cursor-pointer shadow-xs"
                >
                  {isSubmittingApproval ? 'Submitting...' : 'Initiate Approval'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </motion.div>
  );
};
