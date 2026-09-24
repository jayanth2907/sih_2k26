import React, { useState, useEffect, useRef } from 'react';
import { useMineContext } from '../context/MineContext';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
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
  Hash,
  ChevronDown,
  ChevronUp,
  RotateCw,
  Trash2,
  Check,
  Ban,
  Shield,
  Layers,
  Image as ImageIcon
} from 'lucide-react';
import { mobileApi, FieldInspection, ChecklistItem, FieldEvidence } from '../services';
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
  const [evidences, setEvidences] = useState<FieldEvidence[]>([]);
  const [isHashing, setIsHashing] = useState<boolean>(false);
  const [activeEvidenceModal, setActiveEvidenceModal] = useState<any | null>(null);
  const [isAddingNote, setIsAddingNote] = useState<boolean>(false);
  const [noteTitle, setNoteTitle] = useState<string>('');
  const [noteText, setNoteText] = useState<string>('');
  const [linkedCheckIndex, setLinkedCheckIndex] = useState<number>(-1);
  const [expandedTechDetails, setExpandedTechDetails] = useState<Record<string, boolean>>({});

  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Location state
  const [gpsLocation, setGpsLocation] = useState<{
    latitude: number;
    longitude: number;
    accuracy: number | null;
    isActualGps: boolean;
    locationQuality: 'GOOD' | 'FAIR' | 'LOW' | 'SURVEYED';
  }>({
    latitude: selectedMine?.latitude || 23.75,
    longitude: selectedMine?.longitude || 86.42,
    accuracy: null,
    isActualGps: false,
    locationQuality: 'SURVEYED'
  });
  const [gpsStatus, setGpsStatus] = useState<'IDLE' | 'LOCATING' | 'ACQUIRED' | 'SURVEYED'>('IDLE');

  // Submission & Offline state
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [isSavedOffline, setIsSavedOffline] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // User roles & Permissions
  const userRoles = user?.roles || [];
  const isSupervisor = userRoles.some((r: string) => ['SYSTEM_ADMIN', 'MINE_MANAGER', 'MINE_SAFETY_OFFICER', 'REGULATOR'].includes(r));

  // Initial load: Fetch inspection details
  useEffect(() => {
    let isMounted = true;
    const fetchInspection = async () => {
      setLoading(true);
      try {
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
          const acc = Math.round(pos.coords.accuracy);
          const quality: 'GOOD' | 'FAIR' | 'LOW' = acc <= 15 ? 'GOOD' : acc <= 50 ? 'FAIR' : 'LOW';

          setGpsLocation({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: acc,
            isActualGps: true,
            locationQuality: quality
          });
          setGpsStatus('ACQUIRED');
        },
        (err) => {
          console.warn('GPS unavailable, fallback to mine coordinates:', err.message);
          setGpsLocation({
            latitude: selectedMine?.latitude || 23.75,
            longitude: selectedMine?.longitude || 86.42,
            accuracy: null,
            isActualGps: false,
            locationQuality: 'SURVEYED'
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
      await mobileApi.updateInspection(inspectionId, {
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

  // Browser Camera / File Selection with Live SHA-256 Hashing & Preview Modal
  const handleFileSelected = async (file: File, isFromCamera: boolean) => {
    if (!file) return;

    setIsHashing(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

      const previewUrl = URL.createObjectURL(file);
      const isImage = file.type.startsWith('image/');

      const preparedEvidence: FieldEvidence = {
        id: Date.now(),
        evidence_code: `EVID-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
        mine_id: selectedMine?.id || 1,
        inspection_id: inspectionId,
        evidence_type: isImage ? 'PHOTO' : 'DOCUMENT',
        title: file.name,
        description: `Captured for Inspection #${inspectionId}`,
        file_url_or_path: previewUrl,
        preview_url: previewUrl,
        file_hash_sha256: hashHex,
        file_size_bytes: file.size,
        mime_type: file.type || (isImage ? 'image/jpeg' : 'application/octet-stream'),
        location_source: gpsLocation.isActualGps ? 'ACTUAL_GPS' : 'SURVEYED_MINE',
        verification_status: 'PENDING',
        latitude: gpsLocation.latitude,
        longitude: gpsLocation.longitude,
        gps_accuracy_meters: gpsLocation.accuracy || undefined,
        client_capture_timestamp: new Date().toISOString(),
        sync_status: 'LOCAL',
        isLocal: true
      };

      // Open interactive preview modal before confirming
      setActiveEvidenceModal({
        evidence: preparedEvidence,
        isFromCamera,
        file
      });
    } catch (err) {
      console.error('Failed to hash/capture file:', err);
    } finally {
      setIsHashing(false);
      if (cameraInputRef.current) cameraInputRef.current.value = '';
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Confirm Evidence from Preview Modal
  const handleConfirmEvidence = async (confirmedEvidence: FieldEvidence) => {
    const nextEvidences = [...evidences, confirmedEvidence];
    setEvidences(nextEvidences);
    saveDraftLocally(checklist, nextEvidences);
    setActiveEvidenceModal(null);

    // Attempt immediate background sync if online
    if (navigator.onLine && selectedMine?.id) {
      try {
        await mobileApi.recordEvidence({
          evidence_code: confirmedEvidence.evidence_code,
          mine_id: selectedMine.id,
          inspection_id: inspectionId,
          evidence_type: confirmedEvidence.evidence_type,
          title: confirmedEvidence.title,
          description: confirmedEvidence.description,
          file_url_or_path: confirmedEvidence.file_url_or_path,
          file_hash_sha256: confirmedEvidence.file_hash_sha256,
          file_size_bytes: confirmedEvidence.file_size_bytes,
          mime_type: confirmedEvidence.mime_type,
          location_source: confirmedEvidence.location_source,
          latitude: confirmedEvidence.latitude,
          longitude: confirmedEvidence.longitude,
          gps_accuracy_meters: confirmedEvidence.gps_accuracy_meters,
          client_capture_timestamp: confirmedEvidence.client_capture_timestamp
        });

        // Mark as synced
        setEvidences((prev) =>
          prev.map((e) =>
            e.evidence_code === confirmedEvidence.evidence_code
              ? { ...e, sync_status: 'SYNCED', isLocal: false }
              : e
          )
        );
      } catch (uploadErr) {
        console.warn('Evidence queued locally for offline batch sync:', uploadErr);
      }
    }
  };

  // Remove Evidence before final submission
  const handleRemoveEvidence = (evidenceCode: string) => {
    const target = evidences.find((e) => e.evidence_code === evidenceCode);
    if (target?.preview_url) {
      URL.revokeObjectURL(target.preview_url);
    }
    const nextEvidences = evidences.filter((e) => e.evidence_code !== evidenceCode);
    setEvidences(nextEvidences);
    saveDraftLocally(checklist, nextEvidences);
  };

  // Add Written Note Evidence
  const handleAddNoteEvidence = () => {
    if (!noteTitle.trim()) return;

    const textEncoder = new TextEncoder();
    const encoded = textEncoder.encode(noteText);
    crypto.subtle.digest('SHA-256', encoded).then((hashBuffer) => {
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

      const newNoteEvidence: FieldEvidence = {
        id: Date.now(),
        evidence_code: `EVID-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
        mine_id: selectedMine?.id || 1,
        inspection_id: inspectionId,
        evidence_type: 'NOTE',
        title: noteTitle,
        description: noteText,
        file_hash_sha256: hashHex,
        file_size_bytes: encoded.length,
        mime_type: 'text/plain',
        location_source: gpsLocation.isActualGps ? 'ACTUAL_GPS' : 'SURVEYED_MINE',
        verification_status: 'PENDING',
        latitude: gpsLocation.latitude,
        longitude: gpsLocation.longitude,
        gps_accuracy_meters: gpsLocation.accuracy || undefined,
        client_capture_timestamp: new Date().toISOString(),
        sync_status: 'LOCAL',
        isLocal: true
      };

      const nextEvidences = [...evidences, newNoteEvidence];
      setEvidences(nextEvidences);
      saveDraftLocally(checklist, nextEvidences);
      setNoteTitle('');
      setNoteText('');
      setIsAddingNote(false);
    });
  };

  // Supervisor Verify Evidence Handler
  const handleVerifyEvidence = async (evidenceId: number, isApprove: boolean) => {
    const notes = prompt(isApprove ? 'Enter verification confirmation notes (optional):' : 'Enter rejection reason (required):');
    if (!isApprove && !notes) return;

    try {
      if (isApprove) {
        await mobileApi.verifyEvidence(evidenceId, notes || undefined);
        setEvidences((prev) =>
          prev.map((e) => (e.id === evidenceId ? { ...e, verification_status: 'VERIFIED', verification_notes: notes || undefined } : e))
        );
      } else {
        await mobileApi.rejectEvidence(evidenceId, notes || undefined);
        setEvidences((prev) =>
          prev.map((e) => (e.id === evidenceId ? { ...e, verification_status: 'REJECTED', verification_notes: notes || undefined } : e))
        );
      }
    } catch (err: any) {
      alert(`Verification action failed: ${err.message || err}`);
    }
  };

  // Local Draft Persistence
  const saveDraftLocally = (currChecklist: ChecklistItem[], currEvidences: FieldEvidence[]) => {
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

    const missingNotes = checklist.some(
      (c) => (c.status === 'NON_COMPLIANT' || c.status === 'OBSERVATION') && (!c.notes || c.notes.trim().length === 0)
    );
    if (missingNotes) {
      setValidationError(t('validationErrorNotesRequired'));
      return false;
    }

    return true;
  };

  // Submit Inspection Handler
  const handleSubmitInspection = async () => {
    if (!validateInspection()) return;

    setSubmitting(true);
    setValidationError(null);

    const overallSeverity = nonCompliantCount > 0 ? 'HIGH' : observationCount > 0 ? 'MEDIUM' : 'LOW';
    const notesSummary = `Completed with ${compliantCount} compliant, ${observationCount} observations, ${nonCompliantCount} non-compliant items.`;

    try {
      if (navigator.onLine) {
        await mobileApi.updateInspection(inspectionId, {
          status: 'COMPLETED',
          checklist,
          summary_notes: notesSummary,
          severity_assessment: overallSeverity,
          latitude: gpsLocation.latitude,
          longitude: gpsLocation.longitude,
          gps_accuracy_meters: gpsLocation.accuracy || undefined
        });

        localStorage.removeItem(`trinetra_field_draft_insp_${inspectionId}`);
        setIsSavedOffline(false);
        setActiveStep('SUCCESS');
      } else {
        throw new Error('Network offline');
      }
    } catch {
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
                      {item.item_text || item.title}
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

      {/* STEP 3: EVIDENCE & LOCATION (MOBILE-03) */}
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
                    ? gpsLocation.locationQuality === 'GOOD'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                    : 'bg-slate-800 text-slate-300 border-slate-700'
                )}
              >
                {gpsLocation.isActualGps ? t('gpsAvailableLabel') : t('locationSimulatedLabel')}
              </span>
            </div>

            <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-800 space-y-1.5 font-mono text-xs text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-500">LAT / LON:</span>
                <span className="text-slate-200 font-semibold">
                  {gpsLocation.latitude.toFixed(6)}, {gpsLocation.longitude.toFixed(6)}
                </span>
              </div>
              {gpsLocation.accuracy && (
                <div className="flex justify-between">
                  <span className="text-slate-500">ACCURACY:</span>
                  <span className="text-emerald-400 font-bold">±{gpsLocation.accuracy} meters</span>
                </div>
              )}
              <div className="flex justify-between text-[10px] text-slate-400">
                <span className="text-slate-500">QUALITY:</span>
                <span>
                  {gpsLocation.locationQuality === 'GOOD'
                    ? t('locationQualityGood')
                    : gpsLocation.locationQuality === 'FAIR'
                    ? t('locationQualityFair')
                    : gpsLocation.locationQuality === 'LOW'
                    ? t('locationQualityLow')
                    : 'Surveyed Reference'}
                </span>
              </div>
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
              icon={<RotateCw className={clsx('w-3.5 h-3.5 text-cyan-400', gpsStatus === 'LOCATING' && 'animate-spin')} />}
            >
              {gpsStatus === 'LOCATING' ? t('locatingStatus') : t('refreshLocationBtn')}
            </TouchButton>
          </MobileCard>

          {/* Evidence Capture Actions Card */}
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

            {/* Hidden native inputs for camera capture & file selection */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => e.target.files?.[0] && handleFileSelected(e.target.files[0], true)}
              className="hidden"
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf,text/plain"
              onChange={(e) => e.target.files?.[0] && handleFileSelected(e.target.files[0], false)}
              className="hidden"
            />

            {/* 3 Evidence Action Buttons */}
            <div className="grid grid-cols-3 gap-2">
              <TouchButton
                variant="primary"
                size="sm"
                onClick={() => cameraInputRef.current?.click()}
                disabled={isHashing}
                icon={<Camera className="w-3.5 h-3.5" />}
              >
                {t('capturePhoto')}
              </TouchButton>

              <TouchButton
                variant="secondary"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isHashing}
                icon={<FileText className="w-3.5 h-3.5" />}
              >
                {t('chooseFile')}
              </TouchButton>

              <TouchButton
                variant="outline"
                size="sm"
                onClick={() => setIsAddingNote(true)}
                icon={<Plus className="w-3.5 h-3.5" />}
              >
                {t('addNoteEvidence')}
              </TouchButton>
            </div>

            {/* Inline Note Creation Form */}
            {isAddingNote && (
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2 mt-2 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-amber-400 uppercase font-bold">
                    Add Written Note Evidence
                  </span>
                  <button onClick={() => setIsAddingNote(false)} className="text-slate-500 hover:text-slate-300">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <input
                  type="text"
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  placeholder="Note Title / Subject..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500/50"
                />
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder={t('evidenceNotePlaceholder')}
                  rows={3}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500/50"
                />
                <div className="flex justify-end gap-2 pt-1">
                  <TouchButton variant="outline" size="sm" onClick={() => setIsAddingNote(false)}>
                    Cancel
                  </TouchButton>
                  <TouchButton variant="primary" size="sm" onClick={handleAddNoteEvidence}>
                    Save Note
                  </TouchButton>
                </div>
              </div>
            )}

            {/* List of Evidence Items with Collapsible Technical Details */}
            {evidences.length > 0 && (
              <div className="space-y-2.5 pt-2 border-t border-slate-800">
                {evidences.map((ev, idx) => {
                  const isExpanded = expandedTechDetails[ev.evidence_code || String(idx)] || false;

                  return (
                    <div
                      key={ev.id || ev.evidence_code || idx}
                      className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2 transition-all"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5 overflow-hidden">
                          {ev.preview_url || ev.file_url_or_path ? (
                            <img
                              src={ev.preview_url || ev.file_url_or_path}
                              alt={ev.title}
                              className="w-12 h-12 rounded-lg object-cover bg-slate-800 shrink-0 border border-slate-700"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-slate-800 flex items-center justify-center shrink-0 text-amber-400 font-mono text-xs border border-slate-700">
                              {ev.evidence_type === 'PHOTO' ? <Camera className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                            </div>
                          )}

                          <div className="truncate space-y-0.5">
                            <span className="text-xs font-bold text-slate-100 block truncate">
                              {ev.title || `Evidence #${idx + 1}`}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400 block">
                              {ev.evidence_type} • {ev.file_size_bytes ? `${Math.round(ev.file_size_bytes / 1024)} KB` : 'Local Note'}
                            </span>
                            <div className="flex items-center gap-1 text-[9px] font-mono text-emerald-400">
                              <Hash className="w-2.5 h-2.5" />
                              <span>{t('hashVerifiedLabel')}</span>
                            </div>
                          </div>
                        </div>

                        {/* Status badge & Delete local action */}
                        <div className="flex flex-col items-end gap-1">
                          <span
                            className={clsx(
                              'text-[9px] font-mono px-1.5 py-0.5 rounded font-bold uppercase border',
                              ev.verification_status === 'VERIFIED'
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                : ev.verification_status === 'REJECTED'
                                ? 'bg-red-500/20 text-red-300 border-red-500/30'
                                : ev.isLocal
                                ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                                : 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
                            )}
                          >
                            {ev.verification_status === 'VERIFIED'
                              ? t('verifiedBadge')
                              : ev.verification_status === 'REJECTED'
                              ? t('rejectedBadge')
                              : ev.isLocal
                              ? t('syncStatusLocal')
                              : t('syncStatusSynced')}
                          </span>

                          {ev.isLocal && (
                            <button
                              onClick={() => handleRemoveEvidence(ev.evidence_code)}
                              className="text-slate-500 hover:text-red-400 p-1 transition-colors"
                              title="Remove unsent local evidence"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Supervisor Verification Controls */}
                      {isSupervisor && (
                        <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs">
                          <span className="text-[10px] font-mono text-slate-400">Reviewer Verification:</span>
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => handleVerifyEvidence(ev.id, true)}
                              className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono flex items-center gap-1 hover:bg-emerald-900"
                            >
                              <Check className="w-3 h-3" />
                              <span>Verify</span>
                            </button>
                            <button
                              onClick={() => handleVerifyEvidence(ev.id, false)}
                              className="px-2 py-0.5 rounded bg-red-950 text-red-300 border border-red-500/40 text-[10px] font-mono flex items-center gap-1 hover:bg-red-900"
                            >
                              <Ban className="w-3 h-3" />
                              <span>Reject</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Collapsible Technical Details Trigger */}
                      <button
                        onClick={() =>
                          setExpandedTechDetails((prev) => ({
                            ...prev,
                            [ev.evidence_code || String(idx)]: !isExpanded
                          }))
                        }
                        className="flex items-center justify-between w-full pt-1 text-[10px] font-mono text-slate-500 hover:text-slate-300 transition-colors"
                      >
                        <span>{isExpanded ? t('hideTechnicalDetailsTitle') : t('technicalDetailsTitle')}</span>
                        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>

                      {/* Expanded Technical Details Card */}
                      {isExpanded && (
                        <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1 font-mono text-[10px] text-slate-400 animate-in fade-in">
                          <div className="flex justify-between">
                            <span className="text-slate-500">CODE:</span>
                            <span className="text-slate-300 font-semibold">{ev.evidence_code}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">MIME / SIZE:</span>
                            <span className="text-slate-300">{ev.mime_type || 'image/jpeg'} • {ev.file_size_bytes} bytes</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">LOCATION SOURCE:</span>
                            <span className="text-cyan-400">{ev.location_source || 'ACTUAL_GPS'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">COORDINATES:</span>
                            <span className="text-slate-300">{ev.latitude?.toFixed(6)}, {ev.longitude?.toFixed(6)}</span>
                          </div>
                          <div className="space-y-0.5 pt-1 border-t border-slate-800/80">
                            <span className="text-slate-500 block">SHA-256 INTEGRITY FINGERPRINT:</span>
                            <span className="text-emerald-400 break-all select-all font-bold block text-[9px]">
                              {ev.file_hash_sha256}
                            </span>
                          </div>
                          <p className="text-[9px] text-slate-500 italic pt-0.5">
                            {t('sha256Explanation')}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
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
                <span className="font-bold text-slate-200">{evidences.length} items attached</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">LOCATION STATUS:</span>
                <span className={gpsLocation.isActualGps ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                  {gpsLocation.isActualGps ? `Actual GPS Fixed (±${gpsLocation.accuracy}m)` : 'Surveyed Mine Coords'}
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

      {/* MODAL: Evidence Preview & Confirmation Before Adding (MOBILE-03) */}
      {activeEvidenceModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-3.5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono font-bold text-slate-100 uppercase">
                {t('evidencePreviewTitle')}
              </h3>
              <button
                onClick={() => {
                  if (activeEvidenceModal.evidence.preview_url) {
                    URL.revokeObjectURL(activeEvidenceModal.evidence.preview_url);
                  }
                  setActiveEvidenceModal(null);
                }}
                className="text-slate-500 hover:text-slate-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Image Preview if photo */}
            {activeEvidenceModal.evidence.preview_url && activeEvidenceModal.evidence.evidence_type === 'PHOTO' ? (
              <div className="relative rounded-xl overflow-hidden bg-slate-950 border border-slate-800 max-h-48 flex items-center justify-center">
                <img
                  src={activeEvidenceModal.evidence.preview_url}
                  alt="Captured Evidence Preview"
                  className="w-full h-48 object-contain"
                />
              </div>
            ) : (
              <div className="p-6 rounded-xl bg-slate-950 border border-slate-800 text-center space-y-2">
                <FileText className="w-8 h-8 text-amber-400 mx-auto" />
                <span className="text-xs font-bold text-slate-200 block truncate">
                  {activeEvidenceModal.evidence.title}
                </span>
              </div>
            )}

            {/* Metadata Summary */}
            <div className="bg-slate-950 rounded-xl p-2.5 border border-slate-800 space-y-1 font-mono text-[10px] text-slate-400">
              <div className="flex justify-between">
                <span className="text-slate-500">SIZE / TYPE:</span>
                <span className="text-slate-300">
                  {Math.round(activeEvidenceModal.evidence.file_size_bytes / 1024)} KB • {activeEvidenceModal.evidence.mime_type}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">LOCATION:</span>
                <span className="text-cyan-400">
                  {gpsLocation.isActualGps ? `GPS ±${gpsLocation.accuracy}m` : 'Surveyed Mine Reference'}
                </span>
              </div>
              <div className="pt-1 border-t border-slate-800/80">
                <span className="text-slate-500 block">SHA-256 FINGERPRINT:</span>
                <span className="text-emerald-400 font-bold block truncate">
                  {activeEvidenceModal.evidence.file_hash_sha256}
                </span>
              </div>
            </div>

            {/* Link to Checklist Observation Selector */}
            {checklist.length > 0 && (
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-400 block">
                  {t('linkObservationLabel')}:
                </label>
                <select
                  value={linkedCheckIndex}
                  onChange={(e) => setLinkedCheckIndex(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500/50 font-mono"
                >
                  <option value={-1}>General Inspection Evidence</option>
                  {checklist.map((c, i) => (
                    <option key={i} value={i}>
                      {c.category}: {c.item_text || c.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Action Buttons: Retake, Remove, Confirm */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <TouchButton
                variant="outline"
                size="sm"
                onClick={() => {
                  if (activeEvidenceModal.evidence.preview_url) {
                    URL.revokeObjectURL(activeEvidenceModal.evidence.preview_url);
                  }
                  setActiveEvidenceModal(null);
                  if (activeEvidenceModal.isFromCamera) {
                    cameraInputRef.current?.click();
                  } else {
                    fileInputRef.current?.click();
                  }
                }}
              >
                {t('retakePhoto')}
              </TouchButton>

              <TouchButton
                variant="primary"
                size="sm"
                onClick={() => handleConfirmEvidence(activeEvidenceModal.evidence)}
              >
                {t('usePhoto')}
              </TouchButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
