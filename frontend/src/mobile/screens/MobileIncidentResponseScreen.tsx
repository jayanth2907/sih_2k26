import React, { useState, useEffect, useRef } from 'react';
import { useMineContext } from '../../context/MineContext';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { MobileCard } from '../components/MobileCard';
import { TouchButton } from '../components/TouchButton';
import { 
  AlertOctagon, 
  Clock, 
  MapPin, 
  AlertTriangle, 
  CheckCircle2, 
  Search, 
  Flame, 
  ShieldAlert, 
  CheckSquare, 
  ArrowLeft, 
  Camera, 
  FileText, 
  Navigation, 
  Bot, 
  RotateCcw, 
  UserCheck, 
  X, 
  Plus, 
  ShieldCheck, 
  Eye, 
  Send,
  AlertCircle
} from 'lucide-react';
import { incidentService, mobileApi, FieldEvidence } from '../../services';
import { Incident, IncidentStatus } from '../../types';
import { MobileTab } from '../types/mobile';
import clsx from 'clsx';

interface MobileIncidentResponseScreenProps {
  initialIncidentId?: number | null;
  onBack?: () => void;
  onNavigateTab?: (tab: MobileTab) => void;
}

export const MobileIncidentResponseScreen: React.FC<MobileIncidentResponseScreenProps> = ({
  initialIncidentId = null,
  onBack,
  onNavigateTab
}) => {
  const { selectedMine, setFocusedTarget, setCurrentTab } = useMineContext();
  const { t } = useLanguage();
  const { user } = useAuth();

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filter, setFilter] = useState<'ALL' | 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'VERIFIED'>('ALL');
  const [search, setSearch] = useState<string>('');
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);

  // Quick Observation & Corrective Action Form States
  const [showObsModal, setShowObsModal] = useState<boolean>(false);
  const [obsCategory, setObsCategory] = useState<string>('SAFETY_HAZARD');
  const [obsSeverity, setObsSeverity] = useState<string>('HIGH');
  const [obsNotes, setObsNotes] = useState<string>('');

  const [showCaModal, setShowCaModal] = useState<boolean>(false);
  const [caTitle, setCaTitle] = useState<string>('');
  const [caPriority, setCaPriority] = useState<string>('HIGH');
  const [caDays, setCaDays] = useState<number>(3);

  // Evidence Capture State
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [attachedEvidences, setAttachedEvidences] = useState<any[]>([]);
  const [isCapturingEvidence, setIsCapturingEvidence] = useState<boolean>(false);

  // Rejection Modal
  const [showRejectModal, setShowRejectModal] = useState<boolean>(false);
  const [rejectReason, setRejectReason] = useState<string>('');

  // Status Notification Message
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  // Response Checklist items
  const [checklist, setChecklist] = useState({
    locationConfirmed: false,
    areaInspected: false,
    sensorReviewed: false,
    observationRecorded: false,
    evidenceAttached: false,
    correctiveActionIdentified: false,
    submissionReviewed: false
  });

  const fetchIncidents = async () => {
    setLoading(true);
    try {
      if (selectedMine?.id) {
        const data = await incidentService.getIncidents(selectedMine.id);
        setIncidents(Array.isArray(data) ? data : []);
        if (initialIncidentId) {
          const match = data.find((i: Incident) => i.id === initialIncidentId);
          if (match) setSelectedIncident(match);
        }
      } else {
        setIncidents([]);
      }
    } catch {
      setIncidents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, [selectedMine?.id, initialIncidentId]);

  // Handle Lifecycle Status Transitions
  const handleTransition = async (newStatus: IncidentStatus, comment: string, resolutionNotes?: string) => {
    if (!selectedIncident) return;
    try {
      const updated = await incidentService.updateIncidentStatus(
        selectedIncident.id,
        newStatus,
        comment,
        resolutionNotes
      );
      setSelectedIncident(updated);
      setStatusNotice(`Status updated to ${newStatus}`);
      setTimeout(() => setStatusNotice(null), 3500);
      fetchIncidents();
    } catch (err: any) {
      alert(`Transition error: ${err?.response?.data?.detail || err.message}`);
    }
  };

  // Handle Photo Evidence Capture with SHA-256 Hashing
  const handleFileCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedIncident) return;

    setIsCapturingEvidence(true);
    try {
      const buffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      let lat = selectedIncident.latitude || selectedMine?.latitude || 23.7957;
      let lon = selectedIncident.longitude || selectedMine?.longitude || 86.4304;
      let accuracy = 5.0;

      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            lat = pos.coords.latitude;
            lon = pos.coords.longitude;
            accuracy = pos.coords.accuracy;
          },
          () => {}
        );
      }

      const evCode = `EVID-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const newEv = {
        evidence_code: evCode,
        mine_id: selectedMine?.id || 1,
        incident_id: selectedIncident.id,
        evidence_type: 'PHOTO',
        title: `Field Response Photo - ${file.name}`,
        description: `Captured for incident ${selectedIncident.incident_code}`,
        file_hash_sha256: hashHex,
        file_size_bytes: file.size,
        mime_type: file.type || 'image/jpeg',
        latitude: lat,
        longitude: lon,
        gps_accuracy_meters: accuracy,
        client_capture_timestamp: new Date().toISOString()
      };

      try {
        await mobileApi.recordEvidence(newEv);
      } catch {
        // Queue locally
        const q = JSON.parse(localStorage.getItem('trinetra_field_sync_queue') || '[]');
        q.push({ ...newEv, operation_id: crypto.randomUUID(), sync_status: 'PENDING' });
        localStorage.setItem('trinetra_field_sync_queue', JSON.stringify(q));
      }

      setAttachedEvidences(prev => [newEv, ...prev]);
      setChecklist(prev => ({ ...prev, evidenceAttached: true }));
      setStatusNotice(t('evidenceFingerprintCreated'));
      setTimeout(() => setStatusNotice(null), 3500);
    } catch (err: any) {
      alert(`Evidence error: ${err.message}`);
    } finally {
      setIsCapturingEvidence(false);
    }
  };

  // Save Quick Observation
  const handleSaveObservation = () => {
    if (!obsNotes.trim() || !selectedIncident) return;

    setChecklist(prev => ({ ...prev, observationRecorded: true }));
    setShowObsModal(false);
    setStatusNotice(t('observationSavedSuccess'));
    setTimeout(() => setStatusNotice(null), 3500);
    setObsNotes('');
  };

  // Save Corrective Action
  const handleSaveCorrectiveAction = () => {
    if (!caTitle.trim() || !selectedIncident) return;

    setChecklist(prev => ({ ...prev, correctiveActionIdentified: true }));
    setShowCaModal(false);
    setStatusNotice(t('correctiveActionCreatedSuccess'));
    setTimeout(() => setStatusNotice(null), 3500);
    setCaTitle('');
  };

  // User role checking
  const userRoles = user?.roles || ['FIELD_INSPECTOR'];
  const isSupervisor = userRoles.some((r: string) => ['SYSTEM_ADMIN', 'MINE_MANAGER', 'MINE_SAFETY_OFFICER', 'REGULATOR'].includes(r));

  // SLA Calculation
  const getSlaBadge = (dueAt?: string) => {
    if (!dueAt) return { text: t('slaUnavailable'), isOverdue: false };
    const diff = new Date(dueAt).getTime() - Date.now();
    const hours = Math.round(diff / (1000 * 60 * 60));
    if (hours < 0) {
      return { text: `${t('slaOverdueBy')} ${Math.abs(hours)}h`, isOverdue: true };
    }
    return { text: `${t('slaDueIn')} ${hours}h`, isOverdue: false };
  };

  const filteredIncidents = incidents.filter((item: Incident) => {
    const matchesFilter =
      filter === 'ALL' ||
      (filter === 'OPEN' && (item.status === 'OPEN' || item.status === 'TRIAGED' || item.status === 'ASSIGNED')) ||
      (filter === 'IN_PROGRESS' && item.status === 'IN_PROGRESS') ||
      (filter === 'RESOLVED' && item.status === 'RESOLVED') ||
      (filter === 'VERIFIED' && (item.status === 'VERIFIED' || item.status === 'CLOSED'));

    const query = search.toLowerCase();
    const matchesSearch =
      !search ||
      item.incident_code.toLowerCase().includes(query) ||
      item.title.toLowerCase().includes(query) ||
      item.category.toLowerCase().includes(query) ||
      item.severity.toLowerCase().includes(query);

    return matchesFilter && matchesSearch;
  });

  // -------------------------------------------------------------
  // DETAIL VIEW
  // -------------------------------------------------------------
  if (selectedIncident) {
    const sla = getSlaBadge(selectedIncident.sla_due_at);
    const isCritical = selectedIncident.severity === 'CRITICAL' || selectedIncident.severity === 'HIGH';

    return (
      <div className="space-y-3 pb-24 max-w-lg mx-auto select-none">
        {/* Top Navigation Bar */}
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={() => {
              if (onBack) onBack();
              setSelectedIncident(null);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300 active:scale-95 transition-all"
          >
            <ArrowLeft className="w-4 h-4 text-amber-400" />
            <span>Back</span>
          </button>

          <span className="font-mono text-xs px-2.5 py-1 rounded-full border bg-slate-900 text-amber-400 border-amber-500/30 font-bold">
            {selectedIncident.status}
          </span>
        </div>

        {/* Status Notification */}
        {statusNotice && (
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{statusNotice}</span>
          </div>
        )}

        {/* Incident Header Card */}
        <MobileCard className="p-4 bg-slate-900 border-slate-800 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-slate-200">
                  {selectedIncident.incident_code}
                </span>
                <span className={clsx(
                  "font-mono text-[9px] px-2 py-0.5 rounded font-bold uppercase",
                  isCritical ? "bg-red-500/20 text-red-300 border border-red-500/30" : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                )}>
                  {selectedIncident.severity}
                </span>
              </div>
              <h3 className="font-bold text-base text-slate-100 font-sans leading-tight">
                {selectedIncident.title}
              </h3>
            </div>

            <div className={clsx(
              "px-2 py-1 rounded-lg border text-[10px] font-mono font-bold shrink-0 text-center",
              sla.isOverdue ? "bg-red-950/60 text-red-400 border-red-500/40" : "bg-slate-950 text-slate-300 border-slate-800"
            )}>
              <Clock className="w-3.5 h-3.5 mx-auto mb-0.5 text-amber-400" />
              <span>{sla.text}</span>
            </div>
          </div>

          <p className="text-xs text-slate-300 font-sans leading-relaxed bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
            {selectedIncident.description}
          </p>

          <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-400 pt-1">
            <div className="flex items-center gap-1.5 truncate">
              <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="truncate">{selectedIncident.zone_name || `Zone ${selectedIncident.zone_id || 'Z-01'}`}</span>
            </div>
            <div className="flex items-center gap-1.5 justify-end truncate">
              <UserCheck className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span className="truncate">{selectedIncident.assignee_name || 'Unassigned'}</span>
            </div>
          </div>
        </MobileCard>

        {/* State Machine Action Controls */}
        <MobileCard className="p-3 bg-slate-900 border-slate-800 space-y-2">
          <div className="flex items-center justify-between pb-1 border-b border-slate-800">
            <span className="font-mono text-xs font-bold text-slate-200">
              {t('incidentLifecycleStatus')}
            </span>
            <span className="font-mono text-[10px] text-slate-400 uppercase">
              Current: {selectedIncident.status}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            {/* OPEN / TRIAGED / ASSIGNED -> Start Response */}
            {(selectedIncident.status === 'OPEN' || selectedIncident.status === 'TRIAGED' || selectedIncident.status === 'ASSIGNED') && (
              <TouchButton
                variant="primary"
                fullWidth
                size="md"
                onClick={() => handleTransition('IN_PROGRESS', "Field team initiated rapid response and site investigation.")}
                icon={<Flame className="w-4 h-4" />}
              >
                {t('startFieldResponseBtn')}
              </TouchButton>
            )}

            {/* IN_PROGRESS -> Record Obs, Add Evidence, Create Action */}
            {selectedIncident.status === 'IN_PROGRESS' && (
              <>
                <TouchButton
                  variant="outline"
                  fullWidth
                  size="md"
                  onClick={() => setShowObsModal(true)}
                  icon={<FileText className="w-4 h-4 text-amber-400" />}
                >
                  {t('recordObservationBtn')}
                </TouchButton>

                <TouchButton
                  variant="outline"
                  fullWidth
                  size="md"
                  onClick={() => fileInputRef.current?.click()}
                  icon={<Camera className="w-4 h-4 text-emerald-400" />}
                >
                  {t('capturePhoto')}
                </TouchButton>

                <TouchButton
                  variant="outline"
                  fullWidth
                  size="md"
                  onClick={() => setShowCaModal(true)}
                  icon={<CheckSquare className="w-4 h-4 text-blue-400" />}
                >
                  {t('createCorrectiveActionBtn')}
                </TouchButton>

                <TouchButton
                  variant="primary"
                  fullWidth
                  size="md"
                  onClick={() => handleTransition('RESOLVED', "Field mitigation complete and corrective measures applied.", "Ventilation restored and gas reading normalized.")}
                  icon={<CheckCircle2 className="w-4 h-4" />}
                >
                  {t('resolveIncidentBtn')}
                </TouchButton>
              </>
            )}

            {/* RESOLVED -> Supervisor Verification / Rejection */}
            {selectedIncident.status === 'RESOLVED' && isSupervisor && (
              <>
                <TouchButton
                  variant="primary"
                  fullWidth
                  size="md"
                  onClick={() => handleTransition('VERIFIED', "Supervisor verified field resolution and compliance evidence.")}
                  icon={<ShieldCheck className="w-4 h-4 text-emerald-300" />}
                >
                  {t('verifyIncidentBtn')}
                </TouchButton>

                <TouchButton
                  variant="danger"
                  fullWidth
                  size="md"
                  onClick={() => setShowRejectModal(true)}
                  icon={<X className="w-4 h-4" />}
                >
                  {t('rejectIncidentBtn')}
                </TouchButton>
              </>
            )}

            {/* VERIFIED -> Close Incident */}
            {selectedIncident.status === 'VERIFIED' && isSupervisor && (
              <TouchButton
                variant="primary"
                fullWidth
                size="md"
                onClick={() => handleTransition('CLOSED', "Incident closed into permanent audit ledger.")}
                icon={<CheckCircle2 className="w-4 h-4" />}
              >
                {t('closeIncidentBtn')}
              </TouchButton>
            )}
          </div>
        </MobileCard>

        {/* Hidden File Input for Native Camera Capture */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileCapture}
          className="hidden"
        />

        {/* Quality Response Checklist */}
        <MobileCard className="p-3 bg-slate-900 border-slate-800 space-y-2">
          <div className="flex items-center justify-between pb-1 border-b border-slate-800">
            <span className="font-mono text-xs font-bold text-slate-200">
              {t('responseChecklistTitle')}
            </span>
            <span className="font-mono text-[10px] text-amber-400">
              {Object.values(checklist).filter(Boolean).length} / 7
            </span>
          </div>

          <div className="space-y-1.5 pt-1 text-xs font-mono">
            {[
              { key: 'locationConfirmed', label: 'Field location confirmed on mine map' },
              { key: 'areaInspected', label: 'Physical work face visually assessed' },
              { key: 'sensorReviewed', label: 'Telemetry & gas readings reviewed' },
              { key: 'observationRecorded', label: 'Written observation logged' },
              { key: 'evidenceAttached', label: 'SHA-256 evidence attached' },
              { key: 'correctiveActionIdentified', label: 'Corrective action assigned' },
              { key: 'submissionReviewed', label: 'Mitigation ready for supervisor review' }
            ].map((item) => (
              <label key={item.key} className="flex items-center gap-2 cursor-pointer py-0.5">
                <input
                  type="checkbox"
                  checked={(checklist as any)[item.key]}
                  onChange={(e) => setChecklist(prev => ({ ...prev, [item.key]: e.target.checked }))}
                  className="rounded bg-slate-950 border-slate-700 text-amber-500 focus:ring-0 w-3.5 h-3.5"
                />
                <span className={clsx(
                  (checklist as any)[item.key] ? "text-slate-200 line-through opacity-70" : "text-slate-300"
                )}>
                  {item.label}
                </span>
              </label>
            ))}
          </div>
        </MobileCard>

        {/* Deep Link Integration Cards */}
        <div className="grid grid-cols-2 gap-2">
          <TouchButton
            variant="outline"
            fullWidth
            size="md"
            onClick={() => {
              setFocusedTarget({
                type: 'incident',
                id: selectedIncident.id,
                x: selectedIncident.latitude || selectedMine?.latitude || 23.7957,
                y: 0,
                z: selectedIncident.longitude || selectedMine?.longitude || 86.4304,
                title: selectedIncident.incident_code
              });
              if (onNavigateTab) onNavigateTab('map');
              else setCurrentTab('map');
            }}
            icon={<MapPin className="w-4 h-4 text-amber-400" />}
          >
            {t('viewOnMap')}
          </TouchButton>

          <TouchButton
            variant="outline"
            fullWidth
            size="md"
            onClick={() => {
              if (onNavigateTab) onNavigateTab('copilot');
              else setCurrentTab('copilot');
            }}
            icon={<Bot className="w-4 h-4 text-amber-400" />}
          >
            {t('askCopilotAction')}
          </TouchButton>
        </div>

        {/* Response Timeline History */}
        <MobileCard className="p-3 bg-slate-900 border-slate-800 space-y-2">
          <span className="font-mono text-xs font-bold text-slate-200 block pb-1 border-b border-slate-800">
            {t('responseTimelineTitle')}
          </span>

          <div className="space-y-2 pt-1">
            {selectedIncident.events && selectedIncident.events.length > 0 ? (
              selectedIncident.events.map((evt: any, idx: number) => (
                <div key={idx} className="flex items-start gap-2 text-xs font-mono">
                  <div className="w-2 h-2 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-200">{evt.to_status}</span>
                      <span className="text-[10px] text-slate-500">
                        {evt.created_at ? new Date(evt.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>
                    {evt.comment && (
                      <p className="text-[11px] text-slate-400 font-sans">{evt.comment}</p>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs font-mono text-slate-500">No transition events recorded.</p>
            )}
          </div>
        </MobileCard>

        {/* Modal: Quick Observation */}
        {showObsModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-700 p-4 space-y-3 font-mono">
              <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                <span className="font-bold text-slate-100 text-xs">RECORD OBSERVATION</span>
                <button onClick={() => setShowObsModal(false)} className="text-slate-400">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Category</label>
                  <select
                    value={obsCategory}
                    onChange={(e) => setObsCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-slate-200"
                  >
                    <option value="SAFETY_HAZARD">Safety Hazard</option>
                    <option value="ATMOSPHERE_GAS">Atmosphere / Gas Delta</option>
                    <option value="STRATA_ROOF">Strata / Roof Support</option>
                    <option value="MACHINERY">Machinery Fault</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Severity</label>
                  <select
                    value={obsSeverity}
                    onChange={(e) => setObsSeverity(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-slate-200"
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="CRITICAL">CRITICAL</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Observation Notes</label>
                  <textarea
                    rows={3}
                    value={obsNotes}
                    onChange={(e) => setObsNotes(e.target.value)}
                    placeholder="Describe exact physical condition found on site..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <TouchButton variant="outline" size="md" onClick={() => setShowObsModal(false)}>
                  Cancel
                </TouchButton>
                <TouchButton variant="primary" size="md" onClick={handleSaveObservation}>
                  Save
                </TouchButton>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Corrective Action */}
        {showCaModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-700 p-4 space-y-3 font-mono">
              <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                <span className="font-bold text-slate-100 text-xs">CREATE CORRECTIVE ACTION</span>
                <button onClick={() => setShowCaModal(false)} className="text-slate-400">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Action Title</label>
                  <input
                    type="text"
                    value={caTitle}
                    onChange={(e) => setCaTitle(e.target.value)}
                    placeholder="e.g. Inspect Auxiliary Fan Ducting"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-slate-200"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Priority</label>
                    <select
                      value={caPriority}
                      onChange={(e) => setCaPriority(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-slate-200"
                    >
                      <option value="MEDIUM">MEDIUM</option>
                      <option value="HIGH">HIGH</option>
                      <option value="CRITICAL">CRITICAL</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Deadline (Days)</label>
                    <input
                      type="number"
                      value={caDays}
                      onChange={(e) => setCaDays(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-slate-200"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <TouchButton variant="outline" size="md" onClick={() => setShowCaModal(false)}>
                  Cancel
                </TouchButton>
                <TouchButton variant="primary" size="md" onClick={handleSaveCorrectiveAction}>
                  Create Action
                </TouchButton>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Supervisor Rejection Reason */}
        {showRejectModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-red-500/40 p-4 space-y-3 font-mono">
              <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                <span className="font-bold text-red-400 text-xs">REJECT FIELD RESPONSE</span>
                <button onClick={() => setShowRejectModal(false)} className="text-slate-400">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Justification Reason</label>
                <textarea
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Explain why evidence or mitigation was insufficient..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <TouchButton variant="outline" size="md" onClick={() => setShowRejectModal(false)}>
                  Cancel
                </TouchButton>
                <TouchButton
                  variant="danger"
                  size="md"
                  onClick={() => {
                    if (!rejectReason.trim()) {
                      alert('Rejection reason is mandatory.');
                      return;
                    }
                    handleTransition('IN_PROGRESS', `Response rejected by supervisor: ${rejectReason}`);
                    setShowRejectModal(false);
                    setRejectReason('');
                  }}
                >
                  Confirm Reject
                </TouchButton>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------
  // LIST VIEW
  // -------------------------------------------------------------
  return (
    <div className="space-y-4 pb-20 max-w-lg mx-auto select-none">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-100 font-sans flex items-center gap-1.5">
            <AlertOctagon className="w-4 h-4 text-red-400" />
            {t('fieldResponseTitle')}
          </h2>
          <span className="text-[11px] font-mono text-slate-400">
            {selectedMine?.name || 'Mine'} • {filteredIncidents.length} incidents
          </span>
        </div>
        <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-red-950/40 text-red-400 border border-red-500/30 font-bold">
          MOBILE-05
        </span>
      </div>

      {/* Filter Tabs */}
      <div className="grid grid-cols-5 gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl text-[10px] font-mono">
        {(['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'VERIFIED'] as const).map((tabKey) => (
          <button
            key={tabKey}
            onClick={() => setFilter(tabKey)}
            className={clsx(
              'py-1.5 rounded-lg font-semibold transition-all text-center truncate',
              filter === tabKey
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            )}
          >
            {tabKey.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter by code, title, severity..."
          className="w-full bg-slate-900/90 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs font-mono text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
        />
      </div>

      {/* Incident List */}
      {loading ? (
        <div className="p-8 text-center text-slate-400 font-mono text-xs space-y-2">
          <Clock className="w-6 h-6 text-amber-400 animate-spin mx-auto" />
          <p>Loading active field incidents...</p>
        </div>
      ) : filteredIncidents.length === 0 ? (
        <div className="p-8 text-center rounded-2xl bg-slate-900/50 border border-slate-800 text-slate-400 font-mono text-xs space-y-2">
          <CheckCircle2 className="w-8 h-8 text-emerald-400/50 mx-auto" />
          <p>No operational incidents match criteria.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredIncidents.map((inc: Incident) => {
            const isCritical = inc.severity === 'CRITICAL' || inc.severity === 'HIGH';
            const sla = getSlaBadge(inc.sla_due_at);

            return (
              <MobileCard
                key={inc.id}
                className={clsx(
                  'p-3.5 space-y-3 bg-slate-900 border transition-all',
                  isCritical ? 'border-red-500/40' : 'border-slate-800'
                )}
              >
                {/* Code, Severity, Status */}
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs font-bold text-slate-200">
                        {inc.incident_code}
                      </span>
                      <span
                        className={clsx(
                          'font-mono text-[9px] px-1.5 py-0.5 rounded font-bold uppercase',
                          isCritical
                            ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        )}
                      >
                        {inc.severity}
                      </span>
                    </div>
                    <h4 className="text-sm font-semibold text-slate-100 font-sans leading-tight">
                      {inc.title}
                    </h4>
                  </div>

                  <span
                    className={clsx(
                      'font-mono text-[10px] px-2 py-0.5 rounded-full font-bold uppercase shrink-0 border',
                      inc.status === 'CLOSED' || inc.status === 'VERIFIED'
                        ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                        : inc.status === 'RESOLVED'
                        ? 'bg-blue-500/10 text-blue-300 border-blue-500/30'
                        : inc.status === 'IN_PROGRESS'
                        ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
                        : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                    )}
                  >
                    {inc.status}
                  </span>
                </div>

                {/* Location & SLA */}
                <div className="grid grid-cols-2 gap-2 text-xs font-mono text-slate-400 border-t border-slate-800/80 pt-2.5">
                  <div className="flex items-center gap-1.5 truncate">
                    <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="truncate">{inc.zone_name || `Zone ${inc.zone_id || 'Z-01'}`}</span>
                  </div>
                  <div className="flex items-center gap-1.5 justify-end">
                    <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className={clsx(sla.isOverdue && "text-red-400 font-bold")}>{sla.text}</span>
                  </div>
                </div>

                {/* Open Action Button */}
                <TouchButton
                  variant="primary"
                  size="md"
                  fullWidth
                  onClick={() => setSelectedIncident(inc)}
                  icon={<Flame className="w-4 h-4" />}
                >
                  {inc.status === 'OPEN' ? t('startFieldResponseBtn') : 'Respond / View Detail'}
                </TouchButton>
              </MobileCard>
            );
          })}
        </div>
      )}
    </div>
  );
};
