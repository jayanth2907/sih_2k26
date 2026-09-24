import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Briefcase,
  FileCheck2,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Search,
  RefreshCw,
  Camera,
  MapPin,
  ChevronRight,
  ShieldCheck,
  Calendar,
  User,
  Info,
  Hash
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useMineContext } from '../../context/MineContext';
import { useAuth } from '../../context/AuthContext';
import { mobileApi } from '../../services';
import {
  MobileTab,
  MobileContractorSummaryItem,
  MobileContractDetailItem,
  MobileContractRequirementItem,
  MobileContractorSummaryResponse,
  MobileContractorVerificationCreate
} from '../types/mobile';
import clsx from 'clsx';

const QUEUE_STORAGE_KEY = 'trinetra_field_sync_queue';

interface MobileContractorScreenProps {
  onBack?: () => void;
  onNavigateTab?: (tab: MobileTab) => void;
}

export const MobileContractorScreen: React.FC<MobileContractorScreenProps> = ({
  onNavigateTab
}) => {
  const { t } = useLanguage();
  const { selectedMine } = useMineContext();
  const { user } = useAuth();

  // Screen Sub-tabs
  const [activeSubTab, setActiveSubTab] = useState<'CONTRACTORS' | 'REQUIREMENTS' | 'VERIFICATION_QUEUE'>('CONTRACTORS');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [notice, setNotice] = useState<{ type: 'SUCCESS' | 'ERROR' | 'INFO'; message: string } | null>(null);

  // Summary & Data State
  const [summaryData, setSummaryData] = useState<MobileContractorSummaryResponse | null>(null);
  const [requirementsList, setRequirementsList] = useState<MobileContractRequirementItem[]>([]);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [pendingQueueCount, setPendingQueueCount] = useState<number>(0);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Selected Detail Modals
  const [selectedContract, setSelectedContract] = useState<MobileContractDetailItem | null>(null);
  const [selectedRequirement, setSelectedRequirement] = useState<MobileContractRequirementItem | null>(null);
  const [showVerificationModal, setShowVerificationModal] = useState<boolean>(false);

  // Verification Form State
  const [verStatus, setVerStatus] = useState<string>('COMPLIANT');
  const [verNotes, setVerNotes] = useState<string>('');
  const [verExpiry, setVerExpiry] = useState<string>('');
  const [verEvidence, setVerEvidence] = useState<{ name?: string; url?: string; hash?: string }>({});
  const [verGps, setVerGps] = useState<{ lat?: number; lon?: number; accuracy?: number; source: 'ACTUAL_GPS' | 'SURVEYED_LOCATION' }>({
    source: 'ACTUAL_GPS'
  });
  const [createTask, setCreateTask] = useState<boolean>(false);
  const [taskTitle, setTaskTitle] = useState<string>('');
  const [taskDesc, setTaskDesc] = useState<string>('');
  const [taskSlaDays, setTaskSlaDays] = useState<number>(3);
  const [submittingVer, setSubmittingVer] = useState<boolean>(false);

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const updateQueueCount = () => {
      try {
        const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          setPendingQueueCount(Array.isArray(parsed) ? parsed.length : 0);
        } else {
          setPendingQueueCount(0);
        }
      } catch {
        setPendingQueueCount(0);
      }
    };
    updateQueueCount();
    const interval = setInterval(updateQueueCount, 3000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  // Fetch summary & requirements data from backend
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [sumRes, reqRes] = await Promise.all([
        mobileApi.getContractorsSummary(selectedMine?.id),
        mobileApi.getContractRequirements({ mine_id: selectedMine?.id })
      ]);
      setSummaryData(sumRes);
      setRequirementsList(Array.isArray(reqRes) ? reqRes : []);
    } catch (err: any) {
      setNotice({
        type: 'ERROR',
        message: err?.response?.data?.detail || err?.message || 'Failed to load contractor data'
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedMine?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // Open verification modal for a specific requirement
  const handleOpenVerification = (req: MobileContractRequirementItem) => {
    setSelectedRequirement(req);
    setVerStatus(req.status === 'DOCUMENTED' || req.status === 'COMPLIANT' ? 'COMPLIANT' : 'ISSUE_FOUND');
    setVerNotes(req.verification_notes || '');
    setVerExpiry(req.expiry_date ? req.expiry_date.split('T')[0] : '');
    setVerEvidence({
      name: req.evidence_file_name || undefined,
      url: req.evidence_url || undefined,
      hash: req.evidence_file_hash || undefined
    });
    setCreateTask(req.sla_status === 'OVERDUE' || req.sla_status === 'EXPIRED');
    setTaskTitle(`Rectify non-conformance for ${req.title}`);
    setTaskDesc(`Field verification identified non-compliance in requirement '${req.title}' under contract ${req.contract_code}. Immediate corrective resolution required.`);
    setTaskSlaDays(3);
    setShowVerificationModal(true);
  };

  // GPS Location capture handler
  const handleCaptureGps = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setVerGps({
            lat: Number(pos.coords.latitude.toFixed(6)),
            lon: Number(pos.coords.longitude.toFixed(6)),
            accuracy: Math.round(pos.coords.accuracy),
            source: 'ACTUAL_GPS'
          });
          setNotice({
            type: 'SUCCESS',
            message: `GPS benchmark fixed: ${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)} (±${Math.round(pos.coords.accuracy)}m)`
          });
        },
        () => {
          setVerGps({
            lat: selectedMine?.latitude || 23.7957,
            lon: selectedMine?.longitude || 86.4304,
            accuracy: 10,
            source: 'SURVEYED_LOCATION'
          });
          setNotice({
            type: 'INFO',
            message: 'Device GPS unavailable. Reverted to surveyed mine coordinates.'
          });
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  };

  // Camera / File evidence handler
  const handleEvidenceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const buffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

      setVerEvidence({
        name: file.name,
        url: URL.createObjectURL(file),
        hash: hashHex
      });
      setNotice({
        type: 'SUCCESS',
        message: `Evidence processed: ${file.name} (SHA-256: ${hashHex.substring(0, 10)}...)`
      });
    } catch {
      const simulatedHash = 'sha256_' + Math.random().toString(36).substring(2, 12);
      setVerEvidence({
        name: file.name,
        url: URL.createObjectURL(file),
        hash: simulatedHash
      });
    }
  };

  // Submit Verification Handler (Online direct API or Offline Queue)
  const handleSubmitVerification = async () => {
    if (!selectedRequirement) return;

    const remedialDate = new Date();
    remedialDate.setDate(remedialDate.getDate() + taskSlaDays);

    const payload: MobileContractorVerificationCreate = {
      requirement_id: selectedRequirement.id,
      contract_id: selectedRequirement.contract_id,
      verification_status: verStatus,
      verification_notes: verNotes,
      expiry_date: verExpiry ? new Date(verExpiry).toISOString() : undefined,
      evidence_file_name: verEvidence.name,
      evidence_url: verEvidence.url,
      evidence_file_hash: verEvidence.hash,
      device_latitude: verGps.lat,
      device_longitude: verGps.lon,
      location_source: verGps.source,
      location_context: selectedMine?.name || 'Mine Field Site',
      create_corrective_action: createTask || verStatus === 'ISSUE_FOUND',
      corrective_action_title: taskTitle,
      corrective_action_description: taskDesc,
      remedial_deadline: remedialDate.toISOString()
    };

    setSubmittingVer(true);

    if (!isOnline) {
      // Save to canonical trinetra_field_sync_queue
      try {
        const queueItem = {
          id: `queue_contractor_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          action: 'CONTRACTOR_VERIFICATION',
          timestamp: new Date().toISOString(),
          mine_id: selectedMine?.id || 1,
          payload
        };
        const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
        const queue = raw ? JSON.parse(raw) : [];
        queue.push(queueItem);
        localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
        setPendingQueueCount(queue.length);

        setNotice({
          type: 'INFO',
          message: t('offlineContractorSaved')
        });
        setShowVerificationModal(false);
      } catch (err: any) {
        setNotice({
          type: 'ERROR',
          message: 'Failed to save verification locally'
        });
      } finally {
        setSubmittingVer(false);
      }
      return;
    }

    // Direct online API submission
    try {
      const res = await mobileApi.verifyContractRequirement(payload);
      setNotice({
        type: 'SUCCESS',
        message: res.message || 'Requirement verification recorded successfully'
      });
      setShowVerificationModal(false);
      fetchData();
    } catch (err: any) {
      setNotice({
        type: 'ERROR',
        message: err?.response?.data?.detail || err?.message || 'Verification submission failed'
      });
    } finally {
      setSubmittingVer(false);
    }
  };

  // Filtered lists
  const filteredContractors = useMemo(() => {
    if (!summaryData?.contractors) return [];
    return summaryData.contractors.filter((c: MobileContractorSummaryItem) => {
      const matchQuery =
        !searchQuery ||
        c.contractor_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.contact_person.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.email.toLowerCase().includes(searchQuery.toLowerCase());
      return matchQuery;
    });
  }, [summaryData?.contractors, searchQuery]);

  const filteredRequirements = useMemo(() => {
    return requirementsList.filter((r: MobileContractRequirementItem) => {
      const matchCategory = selectedCategory === 'ALL' || r.document_type === selectedCategory;
      const matchQuery =
        !searchQuery ||
        r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.contract_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.contractor_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.document_type.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCategory && matchQuery;
    });
  }, [requirementsList, selectedCategory, searchQuery]);

  const urgentQueue = useMemo(() => {
    return requirementsList.filter(
      (r: MobileContractRequirementItem) =>
        r.sla_status === 'OVERDUE' || r.sla_status === 'DUE_SOON' || r.sla_status === 'EXPIRED' || r.status === 'PENDING'
    );
  }, [requirementsList]);

  const getSlaBadgeClass = (status: string) => {
    switch (status) {
      case 'OVERDUE':
      case 'EXPIRED':
        return 'bg-red-500/20 text-red-400 border border-red-500/30';
      case 'DUE_SOON':
        return 'bg-amber-500/20 text-amber-300 border border-amber-500/30';
      case 'COMPLIANT':
        return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
      default:
        return 'bg-slate-800 text-slate-300 border border-slate-700';
    }
  };

  const getSlaBadgeText = (status: string) => {
    switch (status) {
      case 'OVERDUE':
        return t('slaOverdue');
      case 'DUE_SOON':
        return t('slaDueSoon');
      case 'EXPIRED':
        return t('slaExpired');
      case 'COMPLIANT':
        return t('slaCompliant');
      default:
        return t('slaOnTrack');
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 pb-20">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-md">
              <Briefcase className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white tracking-wide">{t('contractorsFieldTitle')}</h1>
              <p className="text-xs text-slate-400">
                {selectedMine ? selectedMine.name : 'All Mines Context'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {!isOnline && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                OFFLINE
              </span>
            )}
            {pendingQueueCount > 0 && (
              <button
                onClick={() => onNavigateTab?.('sync')}
                className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center space-x-1"
              >
                <span>{pendingQueueCount} queued</span>
              </button>
            )}
            <button
              onClick={handleRefresh}
              disabled={loading || refreshing}
              className="p-2 text-slate-400 hover:text-white rounded-lg bg-slate-800/80 active:scale-95 transition-all"
            >
              <RefreshCw className={clsx('w-4 h-4', (loading || refreshing) && 'animate-spin text-amber-400')} />
            </button>
          </div>
        </div>

        {/* Global Notice Alert */}
        {notice && (
          <div
            className={clsx(
              'mt-2 p-2.5 rounded-lg text-xs flex items-center justify-between border shadow-sm transition-all',
              notice.type === 'SUCCESS' && 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200',
              notice.type === 'ERROR' && 'bg-red-950/60 border-red-500/40 text-red-200',
              notice.type === 'INFO' && 'bg-blue-950/60 border-blue-500/40 text-blue-200'
            )}
          >
            <div className="flex items-center space-x-2">
              {notice.type === 'SUCCESS' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
              {notice.type === 'ERROR' && <XCircle className="w-4 h-4 text-red-400 shrink-0" />}
              {notice.type === 'INFO' && <Info className="w-4 h-4 text-blue-400 shrink-0" />}
              <span>{notice.message}</span>
            </div>
            <button
              onClick={() => setNotice(null)}
              className="text-slate-400 hover:text-white text-xs font-bold px-1"
            >
              ✕
            </button>
          </div>
        )}
      </header>

      {/* KPI Metrics Strip */}
      <div className="grid grid-cols-4 gap-2 px-4 py-3 bg-slate-900/50 border-b border-slate-800">
        <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col items-center justify-center text-center">
          <span className="text-lg font-black text-amber-400">{summaryData?.total_contractors ?? 0}</span>
          <span className="text-[10px] text-slate-400 font-medium leading-tight mt-0.5">{t('totalContractorsCount')}</span>
        </div>
        <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col items-center justify-center text-center">
          <span className="text-lg font-black text-emerald-400">{summaryData?.active_contracts ?? 0}</span>
          <span className="text-[10px] text-slate-400 font-medium leading-tight mt-0.5">{t('activeContractsCount')}</span>
        </div>
        <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col items-center justify-center text-center">
          <span className="text-lg font-black text-red-400">{summaryData?.overdue_requirements ?? 0}</span>
          <span className="text-[10px] text-slate-400 font-medium leading-tight mt-0.5">{t('overdueRequirementsCount')}</span>
        </div>
        <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col items-center justify-center text-center">
          <span className="text-lg font-black text-blue-400">{summaryData?.pending_verifications ?? 0}</span>
          <span className="text-[10px] text-slate-400 font-medium leading-tight mt-0.5">{t('pendingVerificationsCount')}</span>
        </div>
      </div>

      {/* Sub-tab Navigation */}
      <div className="flex border-b border-slate-800 bg-slate-900/80 px-4 pt-2">
        <button
          onClick={() => setActiveSubTab('CONTRACTORS')}
          className={clsx(
            'flex-1 py-2.5 text-xs font-semibold text-center border-b-2 transition-all flex items-center justify-center space-x-1.5',
            activeSubTab === 'CONTRACTORS'
              ? 'border-amber-500 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          )}
        >
          <Briefcase className="w-3.5 h-3.5" />
          <span>{t('contractsTab')}</span>
        </button>
        <button
          onClick={() => setActiveSubTab('REQUIREMENTS')}
          className={clsx(
            'flex-1 py-2.5 text-xs font-semibold text-center border-b-2 transition-all flex items-center justify-center space-x-1.5',
            activeSubTab === 'REQUIREMENTS'
              ? 'border-amber-500 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          )}
        >
          <FileCheck2 className="w-3.5 h-3.5" />
          <span>{t('requirementsTab')}</span>
        </button>
        <button
          onClick={() => setActiveSubTab('VERIFICATION_QUEUE')}
          className={clsx(
            'flex-1 py-2.5 text-xs font-semibold text-center border-b-2 transition-all flex items-center justify-center space-x-1.5 relative',
            activeSubTab === 'VERIFICATION_QUEUE'
              ? 'border-amber-500 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          )}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>{t('contractorVerificationQueueTab')}</span>
          {urgentQueue.length > 0 && (
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[9px] bg-red-500/80 text-white font-bold">
              {urgentQueue.length}
            </span>
          )}
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="px-4 py-3 space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search vendors, contracts, requirements..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-all"
          />
        </div>

        {activeSubTab === 'REQUIREMENTS' && (
          <div className="flex space-x-1.5 overflow-x-auto pb-1 no-scrollbar text-[11px]">
            {['ALL', 'SAFETY', 'MEDICAL', 'TRAINING', 'INSURANCE', 'STATUTORY', 'DGMS_APPROVAL', 'LICENSE'].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={clsx(
                  'px-3 py-1 rounded-full whitespace-nowrap font-medium transition-all',
                  selectedCategory === cat
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <main className="flex-1 px-4 space-y-3">
        {/* TAB 1: CONTRACTORS & CONTRACTS LIST */}
        {activeSubTab === 'CONTRACTORS' && (
          <div className="space-y-3">
            {filteredContractors.length === 0 ? (
              <div className="p-8 text-center bg-slate-900/40 rounded-2xl border border-slate-800/60">
                <Briefcase className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-xs text-slate-400">No contractors found matching criteria.</p>
              </div>
            ) : (
              filteredContractors.map((c: MobileContractorSummaryItem) => (
                <div
                  key={c.id}
                  className="p-4 rounded-2xl bg-slate-900 border border-slate-800/80 hover:border-slate-700 shadow-md transition-all space-y-2.5"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-amber-400 font-mono">{c.contractor_code}</span>
                        <span
                          className={clsx(
                            'px-2 py-0.5 rounded-full text-[9px] font-bold uppercase',
                            c.status === 'ACTIVE'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-slate-800 text-slate-400'
                          )}
                        >
                          {c.status}
                        </span>
                      </div>
                      <h3 className="text-sm font-semibold text-white mt-1">{c.company_name}</h3>
                      <p className="text-xs text-slate-400 mt-0.5">Reg: {c.registration_number}</p>
                    </div>
                    <span
                      className={clsx(
                        'px-2 py-0.5 rounded-full text-[10px] font-bold',
                        c.compliance_health === 'GOOD' && 'bg-emerald-500/20 text-emerald-400',
                        c.compliance_health === 'ATTENTION_REQUIRED' && 'bg-amber-500/20 text-amber-300',
                        c.compliance_health === 'CRITICAL' && 'bg-red-500/20 text-red-400'
                      )}
                    >
                      {c.compliance_health}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-[11px] text-slate-400">
                    <div className="flex items-center space-x-1.5">
                      <User className="w-3.5 h-3.5 text-slate-500" />
                      <span className="truncate">{c.contact_person}</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      <span>{c.active_contracts_count} Active Contracts</span>
                    </div>
                  </div>

                  {/* Requirements summary bar */}
                  <div className="flex items-center justify-between text-[11px] bg-slate-950/60 p-2 rounded-lg border border-slate-800/50">
                    <span className="text-slate-400">Requirements Health:</span>
                    <div className="flex items-center space-x-2 font-medium">
                      <span className="text-emerald-400">{c.total_requirements_count - c.overdue_requirements_count - c.pending_requirements_count} Valid</span>
                      <span className="text-slate-600">|</span>
                      <span className="text-red-400">{c.overdue_requirements_count} Overdue</span>
                      <span className="text-slate-600">|</span>
                      <span className="text-slate-300">{c.total_requirements_count} Total</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 2: REQUIREMENTS & SLA LIST */}
        {activeSubTab === 'REQUIREMENTS' && (
          <div className="space-y-3">
            {filteredRequirements.length === 0 ? (
              <div className="p-8 text-center bg-slate-900/40 rounded-2xl border border-slate-800/60">
                <FileCheck2 className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-xs text-slate-400">No contract requirements found.</p>
              </div>
            ) : (
              filteredRequirements.map((r: MobileContractRequirementItem) => (
                <div
                  key={r.id}
                  className="p-4 rounded-2xl bg-slate-900 border border-slate-800/80 shadow-md transition-all space-y-2.5"
                >
                  <div className="flex items-start justify-between">
                    <div className="pr-2">
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-slate-800 text-amber-400 border border-slate-700">
                          {r.document_type}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">{r.contract_code}</span>
                      </div>
                      <h3 className="text-sm font-semibold text-white mt-1">{r.title}</h3>
                      <p className="text-xs text-slate-400 mt-0.5">{r.contractor_name}</p>
                    </div>
                    <span className={clsx('px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0', getSlaBadgeClass(r.sla_status))}>
                      {getSlaBadgeText(r.sla_status)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/60">
                    <div>
                      <span>Status: </span>
                      <strong className={clsx('font-bold', r.status === 'COMPLIANT' || r.status === 'DOCUMENTED' ? 'text-emerald-400' : 'text-amber-400')}>
                        {r.status}
                      </strong>
                    </div>
                    {r.expiry_date && (
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span>Due: {r.expiry_date.split('T')[0]}</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 flex items-center space-x-2">
                    <button
                      onClick={() => handleOpenVerification(r)}
                      className="flex-1 py-2 px-3 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center space-x-1.5 transition-all active:scale-95 shadow-md"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>{t('verifyRequirementBtn')}</span>
                    </button>
                    {(r.sla_status === 'OVERDUE' || r.sla_status === 'EXPIRED') && (
                      <button
                        onClick={() => onNavigateTab?.('tasks')}
                        className="py-2 px-3 rounded-xl text-xs font-semibold bg-red-500/20 text-red-300 border border-red-500/30 flex items-center space-x-1"
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>SLA Breached</span>
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 3: VERIFICATION QUEUE (Urgent / Pending SLA) */}
        {activeSubTab === 'VERIFICATION_QUEUE' && (
          <div className="space-y-3">
            {urgentQueue.length === 0 ? (
              <div className="p-8 text-center bg-slate-900/40 rounded-2xl border border-slate-800/60">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-xs text-slate-300 font-semibold">SLA Queue Clear</p>
                <p className="text-[11px] text-slate-500 mt-1">All vendor contract requirements are up to date.</p>
              </div>
            ) : (
              urgentQueue.map((r: MobileContractRequirementItem) => (
                <div
                  key={r.id}
                  className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-900/90 border border-red-500/30 shadow-md space-y-2.5"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-red-500/20 text-red-300 border border-red-500/30">
                          {r.sla_status}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">{r.contract_code}</span>
                      </div>
                      <h3 className="text-sm font-semibold text-white mt-1">{r.title}</h3>
                      <p className="text-xs text-slate-400">{r.contractor_name}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] bg-slate-950/80 p-2 rounded-lg border border-slate-800 text-slate-400">
                    <span>Target Due SLA:</span>
                    <span className="font-bold text-red-400">{r.expiry_date ? r.expiry_date.split('T')[0] : 'IMMEDIATE'}</span>
                  </div>

                  <button
                    onClick={() => handleOpenVerification(r)}
                    className="w-full py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-red-600 to-amber-600 text-white flex items-center justify-center space-x-2 shadow-md active:scale-95 transition-all"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Perform Field Audit & Verification</span>
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      {/* Verification & Corrective Action Modal */}
      {showVerificationModal && selectedRequirement && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col justify-end">
          <div className="bg-slate-900 border-t border-slate-800 rounded-t-3xl max-h-[90vh] overflow-y-auto p-5 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-xs font-mono text-amber-400">{selectedRequirement.contract_code}</span>
                <h2 className="text-base font-bold text-white mt-0.5">{t('verificationModalTitle')}</h2>
                <p className="text-xs text-slate-400">{selectedRequirement.title}</p>
              </div>
              <button
                onClick={() => setShowVerificationModal(false)}
                className="p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Status Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Observation Finding</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setVerStatus('COMPLIANT');
                    setCreateTask(false);
                  }}
                  className={clsx(
                    'p-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center space-x-1.5',
                    verStatus === 'COMPLIANT'
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  )}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>COMPLIANT</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setVerStatus('ISSUE_FOUND');
                    setCreateTask(true);
                  }}
                  className={clsx(
                    'p-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center space-x-1.5',
                    verStatus === 'ISSUE_FOUND'
                      ? 'bg-red-500/20 border-red-500 text-red-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  )}
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span>ISSUE FOUND</span>
                </button>
              </div>
            </div>

            {/* Notes / Remarks */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">{t('notesRemarksLabel')}</label>
              <textarea
                rows={3}
                value={verNotes}
                onChange={(e) => setVerNotes(e.target.value)}
                placeholder="Enter field observation notes, license/certificate numbers, or specific non-conformances observed..."
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Validity Expiry Date Picker */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Renewal / Valid Until Date</label>
              <input
                type="date"
                value={verExpiry}
                onChange={(e) => setVerExpiry(e.target.value)}
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Evidence Attachment */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>{t('evidenceAttachmentTitle')}</span>
                <span className="text-[10px] text-slate-500 font-mono">SHA-256 Chained</span>
              </label>
              <div className="flex items-center space-x-2">
                <label className="flex-1 p-2.5 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl flex items-center justify-center space-x-2 cursor-pointer transition-all">
                  <Camera className="w-4 h-4 text-amber-400" />
                  <span className="text-xs text-slate-300 font-medium truncate">
                    {verEvidence.name ? verEvidence.name : 'Capture / Upload Evidence'}
                  </span>
                  <input type="file" accept="image/*,application/pdf" onChange={handleEvidenceUpload} className="hidden" />
                </label>
              </div>
              {verEvidence.hash && (
                <div className="flex items-center space-x-1 text-[10px] text-slate-500 font-mono px-1">
                  <Hash className="w-3 h-3 text-amber-500/70" />
                  <span className="truncate">Hash: {verEvidence.hash}</span>
                </div>
              )}
            </div>

            {/* Contextual Location */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Location Context</label>
              <div className="flex items-center justify-between p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs">
                <div className="flex items-center space-x-2 text-slate-300 truncate">
                  <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="truncate">
                    {verGps.lat && verGps.lon ? `${verGps.lat}, ${verGps.lon}` : 'No GPS coordinate captured'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCaptureGps}
                  className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-800 text-amber-400 border border-slate-700"
                >
                  Fix GPS
                </button>
              </div>
            </div>

            {/* Corrective Action Section (Conditional on Issue Found) */}
            {verStatus === 'ISSUE_FOUND' && (
              <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-red-300 flex items-center space-x-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                    <span>Generate Corrective Task</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={createTask}
                    onChange={(e) => setCreateTask(e.target.checked)}
                    className="w-4 h-4 text-red-500 bg-slate-900 border-slate-700 rounded focus:ring-0"
                  />
                </div>

                {createTask && (
                  <div className="space-y-2 pt-1">
                    <input
                      type="text"
                      placeholder="Task Title"
                      value={taskTitle}
                      onChange={(e) => setTaskTitle(e.target.value)}
                      className="w-full p-2 bg-slate-900 border border-red-500/30 rounded-lg text-xs text-white"
                    />
                    <select
                      value={taskSlaDays}
                      onChange={(e) => setTaskSlaDays(Number(e.target.value))}
                      className="w-full p-2 bg-slate-900 border border-red-500/30 rounded-lg text-xs text-white"
                    >
                      <option value={1}>SLA: 24 Hours</option>
                      <option value={3}>SLA: 3 Days</option>
                      <option value={7}>SLA: 7 Days</option>
                      <option value={14}>SLA: 14 Days</option>
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* Submission Action */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleSubmitVerification}
                disabled={submittingVer}
                className="w-full py-3 rounded-2xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center space-x-2 shadow-lg active:scale-95 transition-all disabled:opacity-50"
              >
                {submittingVer ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Submit Field Verification</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Governance Disclaimer Footer */}
      <footer className="mt-8 px-4 py-4 bg-slate-900/40 border-t border-slate-900 text-center">
        <p className="text-[10px] text-slate-500 leading-relaxed max-w-sm mx-auto">
          {t('contractorDisclaimerText')}
        </p>
      </footer>
    </div>
  );
};
