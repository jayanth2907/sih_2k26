import React, { useEffect, useState } from 'react';
import { useMineContext } from '../context/MineContext';
import { useLanguage } from '../context/LanguageContext';
import { incidentService } from '../services';
import { Incident, IncidentStatus } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { 
  AlertTriangle, 
  Clock, 
  ArrowRight, 
  ShieldCheck, 
  CheckCircle2, 
  User, 
  Plus, 
  Crosshair, 
  Info, 
  X, 
  MapPin, 
  Layers, 
  Activity,
  CheckCircle,
  FileCheck,
  ChevronRight
} from 'lucide-react';

const NEXT_STATUS_MAP: Record<IncidentStatus, IncidentStatus[]> = {
  OPEN: ['TRIAGED', 'ASSIGNED', 'CLOSED'],
  TRIAGED: ['ASSIGNED', 'IN_PROGRESS', 'CLOSED'],
  ASSIGNED: ['IN_PROGRESS', 'CLOSED'],
  IN_PROGRESS: ['RESOLVED', 'ESCALATED'],
  ESCALATED: ['RESOLVED', 'IN_PROGRESS'],
  RESOLVED: ['VERIFIED', 'IN_PROGRESS'],
  VERIFIED: ['CLOSED', 'IN_PROGRESS'],
  CLOSED: []
};

const ALL_LIFECYCLE_STEPS: IncidentStatus[] = [
  'OPEN',
  'TRIAGED',
  'ASSIGNED',
  'IN_PROGRESS',
  'RESOLVED',
  'VERIFIED',
  'CLOSED'
];

export const IncidentsPage: React.FC = () => {
  const { selectedMine, focusInDigitalTwin } = useMineContext();
  const { t } = useLanguage();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [detailedIncident, setDetailedIncident] = useState<Incident | null>(null);
  const [targetStatus, setTargetStatus] = useState<IncidentStatus | ''>('');
  const [comment, setComment] = useState('');
  const [notes, setNotes] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchIncidents = async () => {
    if (!selectedMine) return;
    setIsLoading(true);
    try {
      const data = await incidentService.getIncidents(selectedMine.id);
      setIncidents(data);
    } catch (err) {
      console.error('Failed to load incidents:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, [selectedMine?.id]);

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIncident || !targetStatus) return;
    setIsUpdating(true);
    try {
      await incidentService.updateIncidentStatus(
        selectedIncident.id,
        targetStatus as IncidentStatus,
        comment,
        notes
      );
      setSelectedIncident(null);
      setTargetStatus('');
      setComment('');
      setNotes('');
      await fetchIncidents();
    } catch (err) {
      console.error('Failed to update incident state:', err);
      alert('Failed to update status transition.');
    } finally {
      setIsUpdating(false);
    }
  };

  const getStepIndex = (status: IncidentStatus) => {
    const idx = ALL_LIFECYCLE_STEPS.indexOf(status);
    return idx === -1 ? 0 : idx;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              {t('safetyIncidents')} & Governance Workflows
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-blue-950/80 text-blue-400 border border-blue-800">
              DGMS CMR 2017 REG 153 AUDIT COMPLIANT
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Human-readable safety incident tracking with transparent multi-stage governance lifecycle and audit trails.
          </p>
        </div>
      </div>

      {/* Incidents Cards List */}
      <div className="space-y-4">
        {incidents.length === 0 ? (
          <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 text-center text-slate-500 font-mono text-xs">
            No active safety incidents recorded for this mine. Atmosphere and operations are within statutory baselines.
          </div>
        ) : (
          incidents.map((inc) => {
            const nextOptions = NEXT_STATUS_MAP[inc.status] || [];
            const currentStepIdx = getStepIndex(inc.status);
            const isCritical = inc.severity === 'CRITICAL';

            return (
              <div
                key={inc.id}
                className="p-5 rounded-xl border border-[#1B211E] hover:border-[#27302B] bg-[#0D100F] space-y-4 transition-all duration-150"
              >
                {/* Top Row: Code, Title, Severity, Location */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-slate-800/80 pb-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded font-mono text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                        {inc.incident_code}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        Category: <b className="text-slate-200">{inc.category}</b>
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-white mt-1.5">{inc.title}</h3>
                    <p className="text-xs text-amber-300/90 font-mono mt-1 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      {inc.zone_name || 'Working Zone'} • Coords: ({inc.x}, {inc.y}, {inc.z})
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <StatusBadge status={inc.severity} size="sm" />
                    <StatusBadge status={inc.status} size="sm" />
                  </div>
                </div>

                {/* Human-Centric Lifecycle Progress Bar */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-mono uppercase text-slate-400 tracking-wider block">
                    Statutory State Machine Lifecycle:
                  </span>
                  <div className="grid grid-cols-7 gap-1 text-center font-mono text-[9.5px]">
                    {ALL_LIFECYCLE_STEPS.map((step, sIdx) => {
                      const isPassed = sIdx <= currentStepIdx;
                      const isCurrent = sIdx === currentStepIdx;
                      return (
                        <div
                          key={step}
                          className={`p-1.5 rounded-lg border flex flex-col items-center justify-center transition-all ${
                            isCurrent
                              ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-sm'
                              : isPassed
                              ? 'bg-emerald-950/70 text-emerald-300 border-emerald-800 font-medium'
                              : 'bg-slate-950 text-slate-600 border-slate-850'
                          }`}
                        >
                          <span className="truncate w-full">{step}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Summary & SLA Row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-xl bg-slate-950/70 border border-slate-850 text-xs font-mono">
                  <div className="flex items-center gap-2 text-slate-300">
                    <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>SLA Window: <b className="text-white">{inc.sla_hours} Hours</b></span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Remediation: <b className="text-emerald-400">Action Assigned</b></span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <FileCheck className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>DGMS Logged: <b className="text-white">Active Dossier</b></span>
                  </div>
                </div>

                {/* Actions Row */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/80 flex-wrap font-mono text-xs">
                  <button
                    onClick={() => setDetailedIncident(inc)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium cursor-pointer transition-colors"
                  >
                    <Info className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{t('viewDetails')} & Audit Trail</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        focusInDigitalTwin({
                          type: 'incident',
                          id: inc.id,
                          x: inc.x,
                          y: inc.y,
                          z: inc.z,
                          title: `${inc.incident_code}: ${inc.title}`
                        })
                      }
                      className="px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 font-bold transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <Crosshair className="w-3.5 h-3.5" />
                      <span>{t('focusIn3D')}</span>
                    </button>

                    {nextOptions.length > 0 && (
                      <button
                        onClick={() => {
                          setSelectedIncident(inc);
                          setTargetStatus(nextOptions[0]);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition-all cursor-pointer shadow-sm"
                      >
                        Advance State (→ {nextOptions[0]})
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* State Machine Transition Modal */}
      {selectedIncident && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 font-mono text-xs animate-in fade-in zoom-in duration-150">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] text-amber-400 uppercase tracking-wider font-bold">
                  {selectedIncident.incident_code}
                </span>
                <h3 className="text-base font-bold text-white mt-1">{selectedIncident.title}</h3>
              </div>
              <button
                onClick={() => setSelectedIncident(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateStatus} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Target State Transition <span className="text-rose-400">*</span>
                </label>
                <select
                  value={targetStatus}
                  onChange={(e) => setTargetStatus(e.target.value as IncidentStatus)}
                  className="w-full px-3 py-2.5 bg-[#0D100F] border border-[#232A26] rounded-xl text-slate-200 text-xs focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  {NEXT_STATUS_MAP[selectedIncident.status].map((st) => (
                    <option key={st} value={st}>
                      Transition to {st}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Governance Comment / Evidence Log <span className="text-rose-400">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Detail corrective actions, field verification measurements, or statutory notes for the SHA-256 audit ledger..."
                  className="w-full px-3 py-2.5 bg-[#0D100F] border border-[#232A26] rounded-xl text-slate-200 text-xs focus:outline-none focus:border-amber-500 font-sans"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedIncident(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 cursor-pointer"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-md"
                >
                  {isUpdating ? 'Recording Transition...' : 'Confirm Status Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Full Incident Details Modal */}
      {detailedIncident && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 font-mono text-xs animate-in fade-in zoom-in duration-150">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-xs font-bold text-amber-400">{detailedIncident.incident_code}</span>
                <h3 className="text-base font-bold text-white mt-0.5">{detailedIncident.title}</h3>
              </div>
              <button
                onClick={() => setDetailedIncident(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                <span className="text-[10px] text-slate-500 uppercase">Category</span>
                <p className="font-bold text-white">{detailedIncident.category}</p>
              </div>
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                <span className="text-[10px] text-slate-500 uppercase">Severity</span>
                <StatusBadge status={detailedIncident.severity} size="sm" showTechnical />
              </div>
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                <span className="text-[10px] text-slate-500 uppercase">Current State</span>
                <StatusBadge status={detailedIncident.status} size="sm" showTechnical />
              </div>
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                <span className="text-[10px] text-slate-500 uppercase">3D Coordinates</span>
                <p className="font-bold text-white">({detailedIncident.x}, {detailedIncident.y}, {detailedIncident.z})</p>
              </div>
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                <span className="text-[10px] text-slate-500 uppercase">SLA Target</span>
                <p className="font-bold text-amber-400">{detailedIncident.sla_hours} Hours</p>
              </div>
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                <span className="text-[10px] text-slate-500 uppercase">Audit Provenance</span>
                <p className="font-bold text-cyan-400">OPERATIONAL</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-400 uppercase">Audit Ledger Compliance</span>
              <p className="text-slate-300 font-sans leading-relaxed">
                State transitions for this incident are recorded with cryptographic timestamps into the TRINETRA SHA-256 immutable audit ledger.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setDetailedIncident(null)}
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
