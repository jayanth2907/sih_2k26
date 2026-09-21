import React, { useState, useEffect, useRef } from 'react';
import { useMineContext } from '../../context/MineContext';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { MobileCard } from '../components/MobileCard';
import { TouchButton } from '../components/TouchButton';
import { 
  ClipboardCheck, 
  Clock, 
  MapPin, 
  AlertTriangle, 
  CheckCircle2, 
  Camera, 
  FileText, 
  ShieldCheck, 
  Navigation, 
  ArrowLeft, 
  Save, 
  Send, 
  Info,
  X,
  Plus,
  Flame,
  Activity,
  CheckCircle,
  HelpCircle,
  Hash
} from 'lucide-react';
import { mobileApi, FieldInspection, ChecklistItem, FieldEvidence } from '../../services';
import clsx from 'clsx';

interface MobileInspectionExecutionScreenProps {
  inspectionId: number;
  onBack: () => void;
  onSubmitted?: () => void;
}

export const MobileInspectionExecutionScreen: React.FC<MobileInspectionExecutionScreenProps> = ({
  inspectionId,
  onBack,
  onSubmitted
}) => {
  const { selectedMine } = useMineContext();
  const { t } = useLanguage();
  const { user } = useAuth();

  const [inspection, setInspection] = useState<FieldInspection | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeStep, setActiveStep] = useState<'DETAILS' | 'CHECKLIST' | 'EVIDENCE' | 'REVIEW' | 'SUCCESS'>('DETAILS');
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [activeObservationIndex, setActiveObservationIndex] = useState<number | null>(null);

  // Evidence state
  const [evidences, setEvidences] = useState<any[]>([]);
  const [isHashing, setIsHashing] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Location state
  const [gpsLocation, setGpsLocation] = useState<{
    latitude: number;
    longitude: number;
    accuracy: number | null;
    isActualGps: boolean;
  }>({
    latitude: selectedMine?.latitude || 23.75,
    longitude: selectedMine?.longitude || 86.42,
    accuracy: null,
    isActualGps: false
  });
  const [gpsStatus, setGpsStatus] = useState<'IDLE' | 'LOCATING' | 'ACQUIRED' | 'SURVEYED'>('IDLE');

  // Submission & Offline state
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [isSavedOffline, setIsSavedOffline] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Initial load: Fetch inspection details
  useEffect(() => {
    let isMounted = true;
    const fetchInspection = async () => {
      setLoading(true);
      try {
        // First check local draft cache
        const draftKey = `trinetra_field_draft_insp_${inspectionId}`;
        const cachedDraft = localStorage.getItem(draftKey);
        
        const data = await mobileApi.getInspectionById(inspectionId);
        if (isMounted && data) {
          setInspection(data);
          if (cachedDraft) {
            try {
              const parsed = JSON.parse(cachedDraft);
              setChecklist(parsed.checklist || data.checklist || []);
              if (parsed.evidences) setEvidences(parsed.evidences);
            } catch {
              setChecklist(data.checklist || []);
            }
          } else {
            setChecklist(data.checklist || []);
            if (data.evidences) setEvidences(data.evidences);
          }

          // If status is already IN_PROGRESS, advance to checklist
          if (data.status === 'IN_PROGRESS') {
            setActiveStep('CHECKLIST');
          }
        }
      } catch (err) {
        console.error('Failed to load inspection details:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchInspection();
    return () => {
      isMounted = false;
    };
  }, [inspectionId]);

  // Request actual GPS location
  const captureGps = () => {
    setGpsStatus('LOCATING');
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGpsLocation({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: Math.round(pos.coords.accuracy),
            isActualGps: true
          });
          setGpsStatus('ACQUIRED');
        },
        (err) => {
          console.warn('GPS unavailable, fallback to mine coordinates:', err.message);
          setGpsLocation({
            latitude: selectedMine?.latitude || 23.75,
            longitude: selectedMine?.longitude || 86.42,
            accuracy: null,
            isActualGps: false
          });
          setGpsStatus('SURVEYED');
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      setGpsStatus('SURVEYED');
    }
  };

  // Start Inspection transition: SCHEDULED -> IN_PROGRESS
  const handleStartInspection = async () => {
    try {
      setLoading(true);
      captureGps();
      const updated = await mobileApi.updateInspection(inspectionId, {
        status: 'IN_PROGRESS',
        latitude: gpsLocation.latitude,
        longitude: gpsLocation.longitude,
        gps_accuracy_meters: gpsLocation.accuracy || undefined
      });
      setInspection((prev) => prev ? { ...prev, status: 'IN_PROGRESS' } : null);
      setActiveStep('CHECKLIST');
    } catch (err) {
      console.warn('Could not update online, proceeding in offline mode:', err);
      setActiveStep('CHECKLIST');
    } finally {
      setLoading(false);
    }
  };

  // Checklist Item Status Change
  const handleCheckStatusChange = (
    index: number,
    status: 'COMPLIANT' | 'OBSERVATION' | 'NON_COMPLIANT' | 'NOT_APPLICABLE'
  ) => {
    setChecklist((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        status,
        severity: status === 'NON_COMPLIANT' ? (next[index].severity || 'HIGH') : (status === 'OBSERVATION' ? (next[index].severity || 'MEDIUM') : undefined)
      };
      saveDraftLocally(next, evidences);
      return next;
    });

    if (status === 'OBSERVATION' || status === 'NON_COMPLIANT') {
      setActiveObservationIndex(index);
    }
  };

  // Observation Details Change
  const updateObservationDetails = (
    index: number,
    fields: Partial<ChecklistItem>
  ) => {
    setChecklist((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...fields };
      saveDraftLocally(next, evidences);
      return next;
    });
  };

  // Browser Camera / File Capture with Live SHA-256 Hashing
  const handleFileCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsHashing(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

      const newEvidence = {
        id: Date.now(),
        evidence_code: `EVID-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
        evidence_type: file.type.startsWith('image/') ? 'PHOTO' : 'DOCUMENT',
        title: file.name,
        description: `Captured during inspection #${inspectionId}`,
        file_url_or_path: URL.createObjectURL(file),
        file_hash_sha256: hashHex,
        file_size_bytes: file.size,
        latitude: gpsLocation.latitude,
        longitude: gpsLocation.longitude,
        gps_accuracy_meters: gpsLocation.accuracy,
        client_capture_timestamp: new Date().toISOString(),
        isLocal: true
      };

      const nextEvidences = [...evidences, newEvidence];
      setEvidences(nextEvidences);
      saveDraftLocally(checklist, nextEvidences);

      // Attempt immediate background upload if online
      try {
        if (navigator.onLine && selectedMine?.id) {
          await mobileApi.recordEvidence({
            evidence_code: newEvidence.evidence_code,
            mine_id: selectedMine.id,
            inspection_id: inspectionId,
            evidence_type: newEvidence.evidence_type,
            title: newEvidence.title,
            description: newEvidence.description,
            file_url_or_path: newEvidence.file_url_or_path,
            file_hash_sha256: newEvidence.file_hash_sha256,
            file_size_bytes: newEvidence.file_size_bytes,
            latitude: newEvidence.latitude,
            longitude: newEvidence.longitude,
            gps_accuracy_meters: newEvidence.gps_accuracy_meters,
            client_capture_timestamp: newEvidence.client_capture_timestamp
          });
        }
      } catch (uploadErr) {
        console.warn('Evidence queued for offline sync:', uploadErr);
      }
    } catch (err) {
      console.error('Failed to hash/capture file:', err);
    } finally {
      setIsHashing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Local Draft Persistence
  const saveDraftLocally = (currChecklist: ChecklistItem[], currEvidences: any[]) => {
    const draftKey = `trinetra_field_draft_insp_${inspectionId}`;
    const payload = {
      inspectionId,
      mineId: selectedMine?.id,
      userId: user?.id,
      checklist: currChecklist,
      evidences: currEvidences,
      gpsLocation,
      savedAt: new Date().toISOString()
    };
    localStorage.setItem(draftKey, JSON.stringify(payload));
  };

  // Count checklist metrics
  const completedCount = checklist.filter((c) => c.status && c.status !== ('PENDING' as any)).length;
  const compliantCount = checklist.filter((c) => c.status === 'COMPLIANT').length;
  const observationCount = checklist.filter((c) => c.status === 'OBSERVATION').length;
  const nonCompliantCount = checklist.filter((c) => c.status === 'NON_COMPLIANT').length;
  const naCount = checklist.filter((c) => c.status === 'NOT_APPLICABLE').length;

  // Validation before submission
  const validateInspection = (): boolean => {
    setValidationError(null);

    // Check if any non-compliant items are missing notes
    const missingNotes = checklist.some(
      (c) => (c.status === 'NON_COMPLIANT' || c.status === 'OBSERVATION') && (!c.notes || c.notes.trim().length === 0)
    );
    if (missingNotes) {
      setValidationError(t('validationErrorNotesRequired'));
      return false;
    }

    return true;
  };

  // Submit Inspection Handler (Online + Offline Resilient)
  const handleSubmitInspection = async () => {
    if (!validateInspection()) return;

    setSubmitting(true);
    setValidationError(null);

    const overallSeverity = nonCompliantCount > 0 ? 'HIGH' : observationCount > 0 ? 'MEDIUM' : 'LOW';
    const notesSummary = `Completed with ${compliantCount} compliant, ${observationCount} observations, ${nonCompliantCount} non-compliant items.`;

    try {
      if (navigator.onLine) {
        // Online Submission
        await mobileApi.updateInspection(inspectionId, {
          status: 'COMPLETED',
          checklist,
          summary_notes: notesSummary,
          severity_assessment: overallSeverity,
          latitude: gpsLocation.latitude,
          longitude: gpsLocation.longitude,
          gps_accuracy_meters: gpsLocation.accuracy || undefined
        });

        // Clear draft
        localStorage.removeItem(`trinetra_field_draft_insp_${inspectionId}`);
        setIsSavedOffline(false);
        setActiveStep('SUCCESS');
      } else {
        throw new Error('Network offline');
      }
    } catch (err) {
      // Offline fallback: Enqueue into Phase 7 offline sync queue
      const opId = `op-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const offlineQueueKey = 'trinetra_field_sync_queue';
      const rawQueue = localStorage.getItem(offlineQueueKey);
      const queue = rawQueue ? JSON.parse(rawQueue) : [];

      queue.push({
        operation_id: opId,
        entity_type: 'INSPECTION',
        entity_id: String(inspectionId),
        operation_type: 'UPDATE',
        client_timestamp: new Date().toISOString(),
        payload: {
          id: inspectionId,
          status: 'COMPLETED',
          checklist,
          summary_notes: notesSummary,
          severity_assessment: overallSeverity,
          latitude: gpsLocation.latitude,
          longitude: gpsLocation.longitude,
          gps_accuracy_meters: gpsLocation.accuracy
        }
      });

      localStorage.setItem(offlineQueueKey, JSON.stringify(queue));
      setIsSavedOffline(true);
      setActiveStep('SUCCESS');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 pb-20 max-w-lg mx-auto py-12 text-center">
        <div className="w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs font-mono text-slate-400">Loading inspection workspace...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24 max-w-lg mx-auto">
      {/* Top Header Navigation */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t('backToTaskListBtn')}</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold text-amber-400">
            {inspection?.inspection_code || `INSP-#${inspectionId}`}
          </span>
          <span
            className={clsx(
              'font-mono text-[9px] px-2 py-0.5 rounded-full font-bold uppercase border',
              inspection?.status === 'COMPLETED'
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                : inspection?.status === 'IN_PROGRESS'
                ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
                : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
            )}
          >
            {inspection?.status || 'ASSIGNED'}
          </span>
        </div>
      </div>

      {/* STEP 1: TASK DETAILS & PREDICTIVE RISK CONTEXT */}
      {activeStep === 'DETAILS' && (
        <div className="space-y-4">
          <MobileCard className="p-4 space-y-3.5">
            <div className="space-y-1">
              <span className="text-[10px] font-mono text-amber-400 uppercase tracking-wider font-semibold">
                {inspection?.inspection_type || 'STATUTORY SAFETY INSPECTION'}
              </span>
              <h2 className="text-base font-bold text-slate-100">
                {inspection?.summary_notes || 'Scheduled Field Compliance & Safety Check'}
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono text-slate-300 border-t border-b border-slate-800/80 py-2.5">
              <div>
                <span className="text-[10px] text-slate-500 block">MINE & LEVEL</span>
                <span className="font-semibold text-slate-200">{inspection?.mine_name || selectedMine?.name}</span>
                <span className="text-[11px] text-slate-400 block">{inspection?.level_name || 'Level L-02'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">ZONE / WORKING FACE</span>
                <span className="font-semibold text-slate-200">{inspection?.zone_name || 'East Longwall Face'}</span>
              </div>
            </div>

            {/* Predictive Risk Reason Callout */}
            <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-3 space-y-2">
              <div className="flex items-center gap-2 text-xs font-mono text-amber-300 font-bold">
                <Flame className="w-4 h-4 text-amber-400" />
                <span>{t('reasonContextLabel')}</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                {t('predictiveRiskHotspotLabel')}: Predicted escalation risk requires field verification before end of shift.
              </p>
              <div className="text-[11px] font-mono text-slate-400 bg-slate-900/80 rounded-lg p-2 space-y-1 border border-slate-800">
                <span className="text-[10px] text-slate-500 block">{t('contributingSignalsLabel')}:</span>
                <div className="flex items-center gap-1.5 text-amber-300">
                  <Activity className="w-3 h-3 text-amber-400" />
                  <span>Methane drift & ventilation pressure differential</span>
                </div>
              </div>
            </div>

            {/* Start Inspection Action */}
            <TouchButton
              variant="primary"
              size="lg"
              fullWidth
              onClick={handleStartInspection}
              icon={<ClipboardCheck className="w-4 h-4" />}
            >
              {t('startInspectionBtn')}
            </TouchButton>
          </MobileCard>
        </div>
      )}

      {/* STEP 2: CHECKLIST EXECUTION */}
      {activeStep === 'CHECKLIST' && (
        <div className="space-y-4">
          {/* Progress Bar & Summary */}
          <div className="rounded-xl bg-slate-900 border border-slate-800 p-3 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-300 font-bold">{t('inspectionTitle')}</span>
              <span className="text-amber-400 font-bold">
                {completedCount} / {checklist.length} {t('checksCompletedLabel')}
              </span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
              <div
                className="bg-amber-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${checklist.length > 0 ? (completedCount / checklist.length) * 100 : 0}%` }}
              />
            </div>
          </div>

          {/* Checklist Items */}
          <div className="space-y-3">
            {checklist.map((item, idx) => (
              <MobileCard key={item.id || idx} className="p-3.5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider font-semibold">
                      {item.category}
                    </span>
                    <h4 className="text-xs font-semibold text-slate-100 leading-snug">
                      {item.item_text}
                    </h4>
                  </div>
                  {item.status && item.status !== ('PENDING' as any) && (
                    <span
                      className={clsx(
                        'font-mono text-[9px] px-1.5 py-0.5 rounded font-bold uppercase shrink-0',
                        item.status === 'COMPLIANT'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : item.status === 'NON_COMPLIANT'
                          ? 'bg-red-500/20 text-red-300'
                          : item.status === 'OBSERVATION'
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-slate-800 text-slate-400'
                      )}
                    >
                      {item.status}
                    </span>
                  )}
                </div>

                {/* Touch Target Status Options */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={() => handleCheckStatusChange(idx, 'COMPLIANT')}
                    className={clsx(
                      'py-2 px-2.5 rounded-xl border text-xs font-mono font-medium flex items-center justify-center gap-1.5 min-h-[44px] transition-all',
                      item.status === 'COMPLIANT'
                        ? 'bg-emerald-600/30 border-emerald-500 text-emerald-200 font-bold'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    )}
                  >
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{t('checkItemCompliant')}</span>
                  </button>

                  <button
                    onClick={() => handleCheckStatusChange(idx, 'OBSERVATION')}
                    className={clsx(
                      'py-2 px-2.5 rounded-xl border text-xs font-mono font-medium flex items-center justify-center gap-1.5 min-h-[44px] transition-all',
                      item.status === 'OBSERVATION'
                        ? 'bg-amber-600/30 border-amber-500 text-amber-200 font-bold'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    )}
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    <span>{t('checkItemObservation')}</span>
                  </button>

                  <button
                    onClick={() => handleCheckStatusChange(idx, 'NON_COMPLIANT')}
                    className={clsx(
                      'py-2 px-2.5 rounded-xl border text-xs font-mono font-medium flex items-center justify-center gap-1.5 min-h-[44px] transition-all',
                      item.status === 'NON_COMPLIANT'
                        ? 'bg-red-600/30 border-red-500 text-red-200 font-bold'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    )}
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                    <span>{t('checkItemNonCompliant')}</span>
                  </button>

                  <button
                    onClick={() => handleCheckStatusChange(idx, 'NOT_APPLICABLE')}
                    className={clsx(
                      'py-2 px-2.5 rounded-xl border text-xs font-mono font-medium flex items-center justify-center gap-1.5 min-h-[44px] transition-all',
                      item.status === 'NOT_APPLICABLE'
                        ? 'bg-slate-700 border-slate-600 text-slate-200 font-bold'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    )}
                  >
                    <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                    <span>{t('checkItemNotApplicable')}</span>
                  </button>
                </div>

                {/* Observation / Non-Compliance Note Details */}
                {(item.status === 'OBSERVATION' || item.status === 'NON_COMPLIANT') && (
                  <div className="pt-2 border-t border-slate-800/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-amber-400 uppercase font-bold">
                        {t('addObservationNote')}
                      </span>
                      {item.regulatory_reference && (
                        <span className="text-[9px] font-mono text-slate-500">
                          {item.regulatory_reference}
                        </span>
                      )}
                    </div>

                    <textarea
                      value={item.notes || ''}
                      onChange={(e) => updateObservationDetails(idx, { notes: e.target.value })}
                      placeholder="Describe observed field condition..."
                      rows={2}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500/50"
                    />

                    {/* Severity Selection */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono text-slate-500">{t('observationSeverityLabel')}:</span>
                      {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const).map((sev) => (
                        <button
                          key={sev}
                          onClick={() => updateObservationDetails(idx, { severity: sev })}
                          className={clsx(
                            'px-2 py-0.5 rounded font-mono text-[9px] font-bold uppercase transition-all',
                            item.severity === sev
                              ? sev === 'CRITICAL' || sev === 'HIGH'
                                ? 'bg-red-500 text-slate-950'
                                : 'bg-amber-500 text-slate-950'
                              : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                          )}
                        >
                          {sev}
                        </button>
                      ))}
                    </div>

                    {/* Human Verification Notice */}
                    <p className="text-[10px] font-mono text-slate-500 italic">
                      {t('humanVerificationNotice')}
                    </p>
                  </div>
                )}
              </MobileCard>
            ))}
          </div>

          {/* Checklist Bottom Sticky Navigation */}
          <div className="sticky bottom-20 bg-slate-950/95 backdrop-blur border border-slate-800 rounded-2xl p-2.5 flex items-center gap-2 shadow-2xl">
            <TouchButton
              variant="outline"
              size="md"
              onClick={() => {
                saveDraftLocally(checklist, evidences);
                alert('Inspection draft saved locally.');
              }}
              icon={<Save className="w-4 h-4" />}
            >
              {t('saveDraftBtn')}
            </TouchButton>

            <TouchButton
              variant="primary"
              size="md"
              fullWidth
              onClick={() => setActiveStep('EVIDENCE')}
            >
              Next: Evidence ({evidences.length})
            </TouchButton>
          </div>
        </div>
      )}

      {/* STEP 3: EVIDENCE & LOCATION */}
      {activeStep === 'EVIDENCE' && (
        <div className="space-y-4">
          {/* Location Capture Card */}
          <MobileCard className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Navigation className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs font-mono font-bold text-slate-100 uppercase">
                  {t('captureLocationLabel')}
                </h3>
              </div>
              <span
                className={clsx(
                  'text-[9px] font-mono px-2 py-0.5 rounded-full font-bold uppercase border',
                  gpsLocation.isActualGps
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                )}
              >
                {gpsLocation.isActualGps ? t('gpsAvailableLabel') : t('locationSimulatedLabel')}
              </span>
            </div>

            <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-800 space-y-1 font-mono text-xs text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-500">LAT / LON:</span>
                <span className="text-slate-200">
                  {gpsLocation.latitude.toFixed(6)}, {gpsLocation.longitude.toFixed(6)}
                </span>
              </div>
              {gpsLocation.accuracy && (
                <div className="flex justify-between">
                  <span className="text-slate-500">ACCURACY:</span>
                  <span className="text-emerald-400">±{gpsLocation.accuracy} meters</span>
                </div>
              )}
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>DATUM:</span>
                <span>WGS84</span>
              </div>
            </div>

            <TouchButton
              variant="outline"
              size="sm"
              fullWidth
              onClick={captureGps}
              icon={<Navigation className="w-3.5 h-3.5 text-cyan-400" />}
            >
              {gpsStatus === 'LOCATING' ? 'Acquiring GPS Fix...' : 'Refresh GPS Coordinates'}
            </TouchButton>
          </MobileCard>

          {/* Evidence Capture Card */}
          <MobileCard className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-mono font-bold text-slate-100 uppercase">
                  {t('attachedEvidenceTitle')} ({evidences.length})
                </h3>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                {t('browserCameraLabel')}
              </span>
            </div>

            {/* Hidden native input for capture */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              capture="environment"
              onChange={handleFileCapture}
              className="hidden"
            />

            {/* Evidence action buttons */}
            <div className="grid grid-cols-2 gap-2">
              <TouchButton
                variant="primary"
                size="md"
                onClick={() => fileInputRef.current?.click()}
                disabled={isHashing}
                icon={<Camera className="w-4 h-4" />}
              >
                {isHashing ? 'Hashing SHA-256...' : t('takePhotoBtn')}
              </TouchButton>

              <TouchButton
                variant="outline"
                size="md"
                onClick={() => fileInputRef.current?.click()}
                disabled={isHashing}
                icon={<FileText className="w-4 h-4" />}
              >
                {t('documentUploadBtn')}
              </TouchButton>
            </div>

            {/* Evidence list items */}
            {evidences.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-800">
                {evidences.map((ev, idx) => (
                  <div
                    key={ev.id || idx}
                    className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center shrink-0 text-amber-400 font-mono text-xs">
                        {ev.evidence_type === 'PHOTO' ? <Camera className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                      </div>
                      <div className="truncate">
                        <span className="text-xs font-bold text-slate-200 block truncate">
                          {ev.title || `Evidence #${idx + 1}`}
                        </span>
                        <span className="text-[9px] font-mono text-emerald-400 flex items-center gap-1">
                          <Hash className="w-2.5 h-2.5" />
                          {ev.file_hash_sha256 ? `${ev.file_hash_sha256.substring(0, 12)}...` : 'Pending Hash'}
                        </span>
                      </div>
                    </div>

                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 shrink-0">
                      {ev.isLocal ? 'Queued' : 'Synced'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </MobileCard>

          {/* Navigation Controls */}
          <div className="flex items-center gap-2 pt-2">
            <TouchButton
              variant="outline"
              size="md"
              onClick={() => setActiveStep('CHECKLIST')}
            >
              Back to Checklist
            </TouchButton>

            <TouchButton
              variant="primary"
              size="md"
              fullWidth
              onClick={() => setActiveStep('REVIEW')}
            >
              Proceed to Review
            </TouchButton>
          </div>
        </div>
      )}

      {/* STEP 4: INSPECTION REVIEW */}
      {activeStep === 'REVIEW' && (
        <div className="space-y-4">
          <MobileCard className="p-4 space-y-4">
            <div className="space-y-1">
              <span className="text-[10px] font-mono text-amber-400 uppercase tracking-wider font-semibold">
                {t('inspectionReviewTitle')}
              </span>
              <h3 className="text-sm font-bold text-slate-100">
                {inspection?.inspection_code} • {selectedMine?.name}
              </h3>
            </div>

            {/* Checklist Breakdown Summary */}
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="p-2 rounded-xl bg-emerald-950/30 border border-emerald-500/20">
                <span className="text-base font-bold text-emerald-300 font-mono">{compliantCount}</span>
                <span className="text-[9px] font-mono text-slate-400 block uppercase">Compliant</span>
              </div>
              <div className="p-2 rounded-xl bg-amber-950/30 border border-amber-500/20">
                <span className="text-base font-bold text-amber-300 font-mono">{observationCount}</span>
                <span className="text-[9px] font-mono text-slate-400 block uppercase">Observations</span>
              </div>
              <div className="p-2 rounded-xl bg-red-950/30 border border-red-500/20">
                <span className="text-base font-bold text-red-300 font-mono">{nonCompliantCount}</span>
                <span className="text-[9px] font-mono text-slate-400 block uppercase">Non-Compliant</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-base font-bold text-slate-400 font-mono">{naCount}</span>
                <span className="text-[9px] font-mono text-slate-500 block uppercase">N/A</span>
              </div>
            </div>

            {/* Evidence & Location Audit Checklist */}
            <div className="space-y-2 border-t border-slate-800 pt-3 text-xs font-mono text-slate-300">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">EVIDENCE ITEMS:</span>
                <span className="font-bold text-slate-200">{evidences.length} items</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">LOCATION STATUS:</span>
                <span className={gpsLocation.isActualGps ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                  {gpsLocation.isActualGps ? 'Actual GPS Fixed' : 'Surveyed Mine Coords'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">STATUS:</span>
                <span className="text-emerald-400 font-bold">{t('readyToSubmitStatus')}</span>
              </div>
            </div>

            {/* Validation Error Notice if any */}
            {validationError && (
              <div className="rounded-xl border border-red-500/30 bg-red-950/30 p-3 text-xs font-mono text-red-300 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{validationError}</span>
              </div>
            )}

            {/* Final Submission Buttons */}
            <div className="space-y-2 pt-2">
              <TouchButton
                variant="primary"
                size="lg"
                fullWidth
                onClick={handleSubmitInspection}
                disabled={submitting}
                icon={<Send className="w-4 h-4" />}
              >
                {submitting ? 'Submitting Inspection...' : t('submitInspectionBtn')}
              </TouchButton>

              <TouchButton
                variant="outline"
                size="md"
                fullWidth
                onClick={() => {
                  saveDraftLocally(checklist, evidences);
                  alert('Inspection draft saved locally.');
                }}
                icon={<Save className="w-4 h-4" />}
              >
                {t('saveDraftBtn')}
              </TouchButton>
            </div>
          </MobileCard>
        </div>
      )}

      {/* STEP 5: SUCCESS STATE */}
      {activeStep === 'SUCCESS' && (
        <div className="space-y-4 text-center py-6">
          <MobileCard className="p-6 space-y-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h2 className="text-base font-bold text-slate-100 font-sans">
                {isSavedOffline ? 'SAVED OFFLINE' : t('inspectionSubmittedSuccess')}
              </h2>
              <p className="text-xs font-mono text-slate-400">
                {inspection?.inspection_code || `INSP-#${inspectionId}`}
              </p>
            </div>

            <div className="rounded-xl bg-slate-900 border border-slate-800 p-3 text-xs font-mono text-slate-300 space-y-1 text-left">
              <div className="flex justify-between">
                <span className="text-slate-500">STATUS:</span>
                <span className="text-emerald-400 font-bold">COMPLETED</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">EVIDENCE:</span>
                <span>{evidences.length} items attached</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">AUDIT:</span>
                <span className="text-emerald-400 font-bold">
                  {isSavedOffline ? 'QUEUED FOR SYNC' : t('auditRecordedConfirmed')}
                </span>
              </div>
            </div>

            {isSavedOffline && (
              <p className="text-[11px] font-mono text-amber-400 bg-amber-950/30 border border-amber-500/30 rounded-xl p-2.5">
                {t('savedOfflineNotice')}
              </p>
            )}

            <div className="space-y-2 pt-2">
              <TouchButton
                variant="primary"
                size="md"
                fullWidth
                onClick={() => {
                  if (onSubmitted) onSubmitted();
                  onBack();
                }}
              >
                {t('backToTaskListBtn')}
              </TouchButton>
            </div>
          </MobileCard>
        </div>
      )}
    </div>
  );
};
