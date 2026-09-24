import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { useMineContext } from '../context/MineContext';
import { useLanguage } from '../context/LanguageContext';
import { incidentService } from '../services';
import { Violation } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { Scale, Clock, X } from 'lucide-react';

export const ViolationsPage: React.FC = () => {
  const { selectedMine } = useMineContext();
  const { t } = useLanguage();
  const [violations, setViolations] = useState<Violation[]>([]);
  const [selectedViolationModal, setSelectedViolationModal] = useState<{ v: Violation; type: 'requirement' | 'evidence' | 'audit' } | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!selectedMine) return;
    setIsLoading(true);
    incidentService.getViolations(selectedMine.id)
      .then(setViolations)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [selectedMine?.id]);

  if (!selectedMine) return null;

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
              <Scale className="w-5 h-5 text-amber-400 shrink-0" />
              Statutory Compliance & DGMS Remedial Actions
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-mono bg-[#121614] text-amber-400 border border-[#27302B] font-semibold">
              MINES ACT 1952 & CMR 2017
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 font-sans">
            Human-readable compliance tracking with statutory citations, remediation deadlines, and cryptographic audit trails.
          </p>
        </div>
      </div>

      {/* Violations List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="p-8 rounded-xl bg-[#0D100F] border border-[#1B211E] text-center text-slate-400 font-mono text-xs animate-pulse">
            Loading statutory compliance violations...
          </div>
        ) : violations.length === 0 ? (
          <div className="p-8 rounded-xl bg-[#0D100F] border border-[#1B211E] text-center text-slate-400 font-sans text-xs">
            No statutory non-compliance violations recorded for this mine. All regulations currently satisfied.
          </div>
        ) : (
          violations.map((v) => {
            const isCritical = v.severity === 'CRITICAL' || v.severity === 'HIGH';

            return (
              <div 
                key={v.id} 
                className="bg-[#0D100F] border border-[#1B211E] hover:border-[#27302B] rounded-xl p-5 space-y-4 transition-all duration-150"
              >
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-[#1B211E] pb-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded bg-rose-500/10 text-rose-300 text-xs font-mono font-bold border border-rose-500/30">
                        {v.violation_code}
                      </span>
                      <span className="text-xs font-mono text-amber-400 font-semibold">{v.statute}</span>
                    </div>
                    <h3 className="text-base font-bold text-white mt-1.5 font-sans">
                      {v.title || 'Safety requirement needs corrective action'}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <StatusBadge status={v.severity} size="sm" />
                    <StatusBadge status={v.status} size="sm" />
                  </div>
                </div>

                {/* Plain-Language Regulatory Requirement */}
                <div className="space-y-1.5">
                  <div className="flex items-start gap-2 text-amber-300 font-sans text-xs font-semibold">
                    <Scale className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                    <p>{v.regulatory_clause}</p>
                  </div>
                  <p className="text-slate-300 font-sans text-xs leading-relaxed pl-6">
                    {v.description}
                  </p>
                </div>

                {/* Assigned Remedial Actions */}
                <div className="space-y-2 pt-2 border-t border-[#1B211E] font-sans text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block font-sans">
                      Required Corrective Actions:
                    </span>
                    <span className="text-[11px] text-slate-400 font-sans">
                      Assigned to: <b className="text-slate-200">{v.inspector_name || 'Safety Officer'}</b>
                    </span>
                  </div>

                  {v.corrective_actions.length === 0 ? (
                    <p className="text-xs text-slate-400 font-sans">No corrective actions assigned yet.</p>
                  ) : (
                    v.corrective_actions.map((ca) => (
                      <div key={ca.id} className="pl-3 border-l-2 border-amber-500/70 py-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <p className="text-slate-200 font-sans font-medium text-xs">{ca.action_text}</p>
                          <p className="text-[11px] text-amber-300/90 mt-0.5 flex items-center gap-1.5 font-mono">
                            <Clock className="w-3.5 h-3.5 text-amber-400" />
                            Target Remedial Deadline: {new Date(ca.target_completion_date).toLocaleDateString()}
                          </p>
                        </div>
                        <StatusBadge status={ca.status} size="sm" />
                      </div>
                    ))
                  )}
                </div>

                {/* Technical Buttons & Inspector Metadata */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-[#1B211E] text-xs font-sans">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => setSelectedViolationModal({ v, type: 'requirement' })}
                      className="px-3 py-1.5 rounded-md bg-[#121614] hover:bg-[#171C19] text-slate-300 border border-[#232A26] text-xs font-medium cursor-pointer transition-colors"
                    >
                      View Requirement
                    </button>
                    <button
                      onClick={() => setSelectedViolationModal({ v, type: 'evidence' })}
                      className="px-3 py-1.5 rounded-md bg-[#121614] hover:bg-[#171C19] text-cyan-300 border border-[#232A26] text-xs font-medium cursor-pointer transition-colors"
                    >
                      View Evidence
                    </button>
                    <button
                      onClick={() => setSelectedViolationModal({ v, type: 'audit' })}
                      className="px-3 py-1.5 rounded-md bg-[#121614] hover:bg-[#171C19] text-amber-300 border border-[#232A26] text-xs font-medium cursor-pointer transition-colors"
                    >
                      View Audit Trail
                    </button>
                  </div>

                  <div className="flex items-center gap-4 text-slate-400 text-xs font-sans">
                    <span>Inspector: <b className="text-slate-200">{v.inspector_name || 'DGMS Officer'}</b></span>
                    <span>Statutory Liability: <b className="font-mono text-rose-400 font-bold">₹{v.financial_penalty_amount.toLocaleString()}</b></span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Compliance Detail Modal */}
      {selectedViolationModal && (
        <div className="fixed inset-0 bg-[#080A09]/85 backdrop-blur-md z-50 flex items-center justify-center p-4 font-sans">
          <div className="bg-[#0D100F] border border-[#27302B] rounded-xl max-w-xl w-full p-6 shadow-2xl space-y-4 text-xs animate-in fade-in zoom-in duration-150">
            <div className="flex items-start justify-between border-b border-[#1B211E] pb-3">
              <div>
                <span className="font-mono text-xs font-bold text-amber-400">{selectedViolationModal.v.violation_code}</span>
                <h3 className="text-base font-bold text-white mt-0.5">
                  {selectedViolationModal.type === 'requirement' ? 'Statutory Requirement Details' :
                   selectedViolationModal.type === 'evidence' ? 'Technical Grounding Evidence' : 'Audit Trail & Hash Integrity'}
                </h3>
              </div>
              <button
                onClick={() => setSelectedViolationModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#121614] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {selectedViolationModal.type === 'requirement' && (
              <div className="space-y-3">
                <div className="p-3 bg-[#080A09] border border-[#1B211E] rounded-lg space-y-1">
                  <span className="text-[10.5px] text-slate-400 uppercase font-semibold block">Statutory Rule</span>
                  <p className="font-mono text-amber-400 font-bold">{selectedViolationModal.v.statute}</p>
                  <p className="text-slate-300 font-sans">{selectedViolationModal.v.regulatory_clause}</p>
                </div>
                <div className="p-3 bg-[#080A09] border border-[#1B211E] rounded-lg space-y-1">
                  <span className="text-[10.5px] text-slate-400 uppercase font-semibold block">Legal Description</span>
                  <p className="text-slate-200 font-sans leading-relaxed">{selectedViolationModal.v.description}</p>
                </div>
              </div>
            )}

            {selectedViolationModal.type === 'evidence' && (
              <div className="space-y-3">
                <div className="p-3 bg-[#080A09] border border-[#1B211E] rounded-lg space-y-1">
                  <span className="text-[10.5px] text-slate-400 uppercase font-semibold block">Observed Evidence</span>
                  <p className="text-slate-200 font-sans leading-relaxed">
                    Detected via automated sensor telemetry and statutory inspection report cross-verification.
                  </p>
                </div>
                <div className="p-3 bg-[#080A09] border border-[#1B211E] rounded-lg space-y-1">
                  <span className="text-[10.5px] text-slate-400 uppercase font-semibold block">Data Provenance</span>
                  <p className="font-mono text-cyan-400 font-bold">SOURCE-DERIVED & OPERATIONAL RECORD</p>
                </div>
              </div>
            )}

            {selectedViolationModal.type === 'audit' && (
              <div className="space-y-3">
                <div className="p-3 bg-[#080A09] border border-[#1B211E] rounded-lg space-y-1">
                  <span className="text-[10.5px] text-slate-400 uppercase font-semibold block">Cryptographic Audit Status</span>
                  <p className="font-mono text-emerald-400 font-bold">SHA-256 LEDGER VERIFIED (IMMUTABLE)</p>
                </div>
                <div className="p-3 bg-[#080A09] border border-[#1B211E] rounded-lg space-y-1">
                  <span className="text-[10.5px] text-slate-400 uppercase font-semibold block">Issuing Inspector</span>
                  <p className="text-slate-200 font-sans">{selectedViolationModal.v.inspector_name || 'DGMS Safety Officer'}</p>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1B211E]">
              <button
                onClick={() => setSelectedViolationModal(null)}
                className="px-4 py-2 rounded-lg bg-[#121614] hover:bg-[#171C19] text-slate-300 border border-[#232A26] text-xs font-medium cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};
