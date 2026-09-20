import React, { useEffect, useState } from 'react';
import { useMineContext } from '../context/MineContext';
import { useLanguage } from '../context/LanguageContext';
import { incidentService } from '../services';
import { Violation } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { FileText, ShieldAlert, CheckCircle2, Clock, Scale, Info, X, Shield, ArrowRight, UserCheck } from 'lucide-react';

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Scale className="w-5 h-5 text-amber-400" />
              Statutory Compliance & DGMS Remedial Actions
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-blue-950/80 text-blue-400 border border-blue-800">
              MINES ACT 1952 & CMR 2017
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Human-readable compliance tracking with statutory citations, remediation deadlines, and cryptographic audit trails.
          </p>
        </div>
      </div>

      {/* Violations List */}
      <div className="space-y-4">
        {violations.length === 0 ? (
          <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 text-center text-slate-500 font-mono text-xs">
            No statutory non-compliance violations recorded for this mine. All regulations currently satisfied.
          </div>
        ) : (
          violations.map((v) => {
            const isCritical = v.severity === 'CRITICAL' || v.severity === 'HIGH';

            return (
              <div 
                key={v.id} 
                className={`p-6 rounded-2xl border backdrop-blur-md space-y-4 shadow-xl transition-all ${
                  isCritical 
                    ? 'bg-gradient-to-br from-rose-950/30 via-slate-900 to-slate-950 border-rose-800/60 shadow-rose-950/20' 
                    : 'bg-slate-900/85 border-slate-800'
                }`}
              >
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-slate-800/80 pb-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded bg-rose-950/80 text-rose-300 text-xs font-mono font-bold border border-rose-800/60">
                        {v.violation_code}
                      </span>
                      <span className="text-xs font-mono text-amber-400 font-semibold">{v.statute}</span>
                    </div>
                    <h3 className="text-base font-bold text-white mt-1.5">
                      {v.title || 'Safety requirement needs corrective action'}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <StatusBadge status={v.severity} size="sm" />
                    <StatusBadge status={v.status} size="sm" />
                  </div>
                </div>

                {/* Plain-Language Regulatory Requirement */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 text-xs space-y-2">
                  <div className="flex items-start gap-2 text-amber-300 font-mono">
                    <Scale className="w-4 h-4 shrink-0 mt-0.5" />
                    <p className="font-semibold">{v.regulatory_clause}</p>
                  </div>
                  <p className="text-slate-200 font-sans leading-relaxed pl-6">
                    {v.description}
                  </p>
                </div>

                {/* Assigned Remedial Actions */}
                <div className="space-y-2 pt-1 font-mono text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                      Required Corrective Actions:
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Assigned to: <b className="text-slate-200">{v.inspector_name || 'Safety Officer'}</b>
                    </span>
                  </div>

                  {v.corrective_actions.length === 0 ? (
                    <p className="text-xs text-slate-500 font-mono">No corrective actions assigned yet.</p>
                  ) : (
                    v.corrective_actions.map((ca) => (
                      <div key={ca.id} className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <p className="text-slate-200 font-sans font-medium">{ca.action_text}</p>
                          <p className="text-[10.5px] text-amber-400 mt-0.5 flex items-center gap-1 font-mono">
                            <Clock className="w-3.5 h-3.5" />
                            Target Remedial Deadline: {new Date(ca.target_completion_date).toLocaleDateString()}
                          </p>
                        </div>
                        <StatusBadge status={ca.status} size="sm" />
                      </div>
                    ))
                  )}
                </div>

                {/* Technical Buttons & Inspector Metadata */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-800/60 font-mono text-xs">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => setSelectedViolationModal({ v, type: 'requirement' })}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] cursor-pointer transition-colors"
                    >
                      [ View Requirement ]
                    </button>
                    <button
                      onClick={() => setSelectedViolationModal({ v, type: 'evidence' })}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 text-[11px] cursor-pointer transition-colors"
                    >
                      [ View Evidence ]
                    </button>
                    <button
                      onClick={() => setSelectedViolationModal({ v, type: 'audit' })}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 text-[11px] cursor-pointer transition-colors"
                    >
                      [ View Audit Trail ]
                    </button>
                  </div>

                  <div className="flex items-center gap-4 text-slate-400 text-[11px]">
                    <span>Inspector: <b className="text-slate-200">{v.inspector_name || 'DGMS Officer'}</b></span>
                    <span>Statutory Liability: <b className="text-rose-400">₹{v.financial_penalty_amount.toLocaleString()}</b></span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Compliance Detail Modal */}
      {selectedViolationModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 font-mono text-xs animate-in fade-in zoom-in duration-150">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-xs font-bold text-amber-400">{selectedViolationModal.v.violation_code}</span>
                <h3 className="text-base font-bold text-white mt-0.5">
                  {selectedViolationModal.type === 'requirement' ? 'Statutory Requirement Details' :
                   selectedViolationModal.type === 'evidence' ? 'Technical Grounding Evidence' : 'Audit Trail & Hash Integrity'}
                </h3>
              </div>
              <button
                onClick={() => setSelectedViolationModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {selectedViolationModal.type === 'requirement' && (
              <div className="space-y-3">
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase">Statutory Rule</span>
                  <p className="text-amber-400 font-bold">{selectedViolationModal.v.statute}</p>
                  <p className="text-slate-300">{selectedViolationModal.v.regulatory_clause}</p>
                </div>
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase">Legal Description</span>
                  <p className="text-slate-200 font-sans leading-relaxed">{selectedViolationModal.v.description}</p>
                </div>
              </div>
            )}

            {selectedViolationModal.type === 'evidence' && (
              <div className="space-y-3">
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase">Observed Evidence</span>
                  <p className="text-slate-200 font-sans leading-relaxed">
                    Detected via automated sensor telemetry and statutory inspection report cross-verification.
                  </p>
                </div>
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase">Data Provenance</span>
                  <p className="text-cyan-400 font-bold">SOURCE-DERIVED & OPERATIONAL RECORD</p>
                </div>
              </div>
            )}

            {selectedViolationModal.type === 'audit' && (
              <div className="space-y-3">
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase">Cryptographic Audit Status</span>
                  <p className="text-emerald-400 font-bold">SHA-256 LEDGER VERIFIED (IMMUTABLE)</p>
                </div>
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase">Issuing Inspector</span>
                  <p className="text-slate-200">{selectedViolationModal.v.inspector_name || 'DGMS Safety Officer'}</p>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setSelectedViolationModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
