import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useMineContext } from '../../context/MineContext';
import { useLanguage } from '../../context/LanguageContext';
import { MobileCard } from '../components/MobileCard';
import { TouchButton } from '../components/TouchButton';
import { 
  MobileReviewCounts, 
  MobileReviewItemData, 
  MobileReviewDetailData 
} from '../types/mobile';
import { 
  ShieldCheck, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  RotateCcw, 
  Search, 
  Filter, 
  Camera, 
  MapPin, 
  Copy, 
  Check, 
  ChevronRight, 
  ArrowLeft, 
  Send, 
  FileText, 
  Sparkles, 
  Layers, 
  History, 
  Lock,
  Compass,
  AlertOctagon,
  RefreshCw,
  BookOpen
} from 'lucide-react';
import clsx from 'clsx';

interface MobileReviewCenterScreenProps {
  onBack?: () => void;
  onNavigateTab?: (tab: any) => void;
}

export const MobileReviewCenterScreen: React.FC<MobileReviewCenterScreenProps> = ({ onBack, onNavigateTab }) => {
  const { user } = useAuth();
  const { selectedMine } = useMineContext();
  const { t } = useLanguage();

  const [activeStatusTab, setActiveStatusTab] = useState<string>('PENDING');
  const [selectedResourceType, setSelectedResourceType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  const [reviews, setReviews] = useState<MobileReviewItemData[]>([]);
  const [counts, setCounts] = useState<MobileReviewCounts>({
    total: 0,
    pending: 0,
    urgent: 0,
    overdue: 0,
    returned: 0,
    approved: 0,
    rejected: 0
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [selectedReviewId, setSelectedReviewId] = useState<number | null>(null);
  const [reviewDetail, setReviewDetail] = useState<MobileReviewDetailData | null>(null);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);

  // Decision Modal State
  const [decisionModal, setDecisionModal] = useState<'APPROVE' | 'REJECT' | 'REQUEST_CHANGES' | 'RESUBMIT' | null>(null);
  const [decisionComment, setDecisionComment] = useState<string>('');
  const [submittingDecision, setSubmittingDecision] = useState<boolean>(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const primaryRole = user?.roles?.[0] || 'FIELD_INSPECTOR';

  // Fetch reviews list
  const fetchReviews = async () => {
    setLoading(true);
    try {
      const mineParam = selectedMine?.id ? `mine_id=${selectedMine.id}` : '';
      const statusParam = activeStatusTab !== 'ALL' ? `status=${activeStatusTab}` : '';
      const resParam = selectedResourceType !== 'ALL' ? `resource_type=${selectedResourceType}` : '';
      const queryParams = [mineParam, statusParam, resParam].filter(Boolean).join('&');

      const token = localStorage.getItem('trinetra_access_token');
      const res = await fetch(`/api/v1/mobile/reviews${queryParams ? `?${queryParams}` : ''}`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        }
      });

      if (res.ok) {
        const data = await res.json();
        setReviews(data.reviews || []);
        if (data.counts) {
          setCounts(data.counts);
        }
      }
    } catch (err) {
      console.error('Failed to fetch mobile reviews:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [selectedMine?.id, activeStatusTab, selectedResourceType]);

  // Fetch single review detail
  const fetchDetail = async (id: number) => {
    setDetailLoading(true);
    try {
      const token = localStorage.getItem('trinetra_access_token');
      const res = await fetch(`/api/v1/mobile/reviews/${id}`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        }
      });
      if (res.ok) {
        const data = await res.json();
        setReviewDetail(data);
      }
    } catch (err) {
      console.error('Failed to fetch review detail:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleOpenDetail = (id: number) => {
    setSelectedReviewId(id);
    fetchDetail(id);
  };

  const handleCloseDetail = () => {
    setSelectedReviewId(null);
    setReviewDetail(null);
    setDecisionModal(null);
    setDecisionComment('');
  };

  const handleCopyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2500);
  };

  // Submit Review Decision
  const handleSubmitDecision = async () => {
    if (!selectedReviewId || !decisionModal) return;

    if ((decisionModal === 'REJECT' || decisionModal === 'REQUEST_CHANGES') && !decisionComment.trim()) {
      setFeedbackMessage({
        text: decisionModal === 'REJECT' ? t('mandatoryRejectionReasonPrompt') : t('returnReasonPrompt'),
        type: 'error'
      });
      return;
    }

    setSubmittingDecision(true);
    setFeedbackMessage(null);

    try {
      const token = localStorage.getItem('trinetra_access_token');

      if (decisionModal === 'RESUBMIT') {
        const res = await fetch(`/api/v1/mobile/reviews/${selectedReviewId}/resubmit`, {
          method: 'POST',
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            comments: decisionComment.trim(),
            updated_description: decisionComment.trim()
          })
        });

        if (res.ok) {
          setFeedbackMessage({ text: t('reviewDecisionSuccess'), type: 'success' });
          setDecisionModal(null);
          setDecisionComment('');
          fetchDetail(selectedReviewId);
          fetchReviews();
        } else {
          const errData = await res.json();
          setFeedbackMessage({ text: errData.detail || 'Resubmission failed', type: 'error' });
        }
      } else {
        const res = await fetch(`/api/v1/mobile/reviews/${selectedReviewId}/decision`, {
          method: 'POST',
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: decisionModal,
            comments: decisionComment.trim() || undefined
          })
        });

        if (res.ok) {
          setFeedbackMessage({ text: t('reviewDecisionSuccess'), type: 'success' });
          setDecisionModal(null);
          setDecisionComment('');
          fetchDetail(selectedReviewId);
          fetchReviews();
        } else {
          const errData = await res.json();
          setFeedbackMessage({ text: errData.detail || 'Action failed', type: 'error' });
        }
      }
    } catch (err: any) {
      setFeedbackMessage({ text: err.message || 'Network error occurred', type: 'error' });
    } finally {
      setSubmittingDecision(false);
    }
  };

  // Filter items by search query
  const filteredReviews = useMemo(() => {
    if (!searchQuery.trim()) return reviews;
    const q = searchQuery.toLowerCase();
    return reviews.filter(r => 
      r.title.toLowerCase().includes(q) ||
      r.request_code.toLowerCase().includes(q) ||
      r.requester_name.toLowerCase().includes(q) ||
      r.resource_type.toLowerCase().includes(q)
    );
  }, [reviews, searchQuery]);

  return (
    <div className="space-y-4 pb-20 max-w-lg mx-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white active:scale-95 transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-amber-400" />
              <span>{t('reviewCenterTitle')}</span>
            </h2>
            <p className="text-[11px] text-slate-400 font-mono">
              {selectedMine?.name || 'All Authorized Mines'}
            </p>
          </div>
        </div>

        <button
          onClick={fetchReviews}
          disabled={loading}
          className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-amber-400 active:scale-95 transition-all"
        >
          <RefreshCw className={clsx("w-4 h-4", loading && "animate-spin text-amber-400")} />
        </button>
      </div>

      {/* Metric Counters Strip */}
      <div className="grid grid-cols-4 gap-2">
        <button
          onClick={() => setActiveStatusTab('PENDING')}
          className={clsx(
            'p-2.5 rounded-xl border flex flex-col items-center justify-center transition-all',
            activeStatusTab === 'PENDING'
              ? 'bg-amber-500/15 border-amber-500 text-amber-300'
              : 'bg-slate-900 border-slate-800 text-slate-400'
          )}
        >
          <span className="text-base font-bold font-mono">{counts.pending}</span>
          <span className="text-[10px] uppercase font-bold tracking-tight">{t('pendingReviewTab')}</span>
        </button>

        <button
          onClick={() => setActiveStatusTab('URGENT')}
          className={clsx(
            'p-2.5 rounded-xl border flex flex-col items-center justify-center transition-all',
            activeStatusTab === 'URGENT'
              ? 'bg-orange-500/15 border-orange-500 text-orange-300'
              : 'bg-slate-900 border-slate-800 text-slate-400'
          )}
        >
          <span className="text-base font-bold font-mono">{counts.urgent}</span>
          <span className="text-[10px] uppercase font-bold tracking-tight">{t('urgentReviewsTab')}</span>
        </button>

        <button
          onClick={() => setActiveStatusTab('RETURNED')}
          className={clsx(
            'p-2.5 rounded-xl border flex flex-col items-center justify-center transition-all',
            activeStatusTab === 'RETURNED'
              ? 'bg-yellow-500/15 border-yellow-500 text-yellow-300'
              : 'bg-slate-900 border-slate-800 text-slate-400'
          )}
        >
          <span className="text-base font-bold font-mono">{counts.returned}</span>
          <span className="text-[10px] uppercase font-bold tracking-tight">{t('returnedReviewsTab')}</span>
        </button>

        <button
          onClick={() => setActiveStatusTab('APPROVED')}
          className={clsx(
            'p-2.5 rounded-xl border flex flex-col items-center justify-center transition-all',
            activeStatusTab === 'APPROVED'
              ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300'
              : 'bg-slate-900 border-slate-800 text-slate-400'
          )}
        >
          <span className="text-base font-bold font-mono">{counts.approved}</span>
          <span className="text-[10px] uppercase font-bold tracking-tight">{t('approvedReviewsTab')}</span>
        </button>
      </div>

      {/* Filter Tabs Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs font-mono">
        {[
          { id: 'PENDING', label: t('pendingReviewTab') },
          { id: 'URGENT', label: t('urgentReviewsTab') },
          { id: 'OVERDUE', label: t('overdueReviewsTab') },
          { id: 'RETURNED', label: t('returnedReviewsTab') },
          { id: 'APPROVED', label: t('approvedReviewsTab') },
          { id: 'REJECTED', label: t('rejectedReviewsTab') },
          { id: 'ALL', label: t('allReviewsTab') }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveStatusTab(tab.id)}
            className={clsx(
              'px-3 py-1.5 rounded-lg font-semibold uppercase whitespace-nowrap transition-all',
              activeStatusTab === tab.id
                ? 'bg-amber-500 text-slate-950 shadow'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search & Resource Filter Bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search reviews, IDs, submitters..."
            className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <select
          value={selectedResourceType}
          onChange={(e) => setSelectedResourceType(e.target.value)}
          className="bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 px-3 py-2 focus:outline-none focus:border-amber-500 font-mono"
        >
          <option value="ALL">All Types</option>
          <option value="FIELD_INSPECTION">Inspections</option>
          <option value="GOVERNANCE_TASK">Tasks</option>
          <option value="INCIDENT">Incidents</option>
          <option value="STATUTORY_REPORT">Reports</option>
        </select>
      </div>

      {/* Review Cards List */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400 font-mono animate-pulse">
            {t('loadingReviewDetails')}
          </div>
        ) : filteredReviews.length === 0 ? (
          <MobileCard className="p-8 text-center text-xs text-slate-400 font-mono">
            {t('noReviewsFound')}
          </MobileCard>
        ) : (
          filteredReviews.map(item => {
            const isPending = item.status === 'PENDING';
            const isApproved = item.status === 'APPROVED';
            const isReturned = item.status === 'CHANGES_REQUESTED';
            const isRejected = item.status === 'REJECTED';

            return (
              <MobileCard
                key={item.id}
                className={clsx(
                  'p-4 space-y-3 transition-all border',
                  isPending && item.priority === 'HIGH' && 'border-orange-500/40 bg-gradient-to-br from-slate-900 to-orange-950/10',
                  isPending && item.is_overdue && 'border-red-500/40 bg-gradient-to-br from-slate-900 to-red-950/10',
                  isApproved && 'border-emerald-500/30 bg-gradient-to-br from-slate-900 to-emerald-950/10',
                  isReturned && 'border-yellow-500/30 bg-gradient-to-br from-slate-900 to-yellow-950/10',
                  isRejected && 'border-slate-800 opacity-80'
                )}
              >
                {/* Card Top Strip */}
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px] font-bold uppercase border border-slate-700">
                        {item.resource_type.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[11px] font-mono font-bold text-amber-400">
                        {item.request_code}
                      </span>
                    </div>
                    <h3 className="font-bold text-sm text-slate-100 font-sans leading-tight">
                      {item.title}
                    </h3>
                  </div>

                  {/* Status Badge */}
                  <span className={clsx(
                    'px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase flex items-center gap-1 shrink-0 border',
                    isPending && 'bg-amber-500/20 text-amber-400 border-amber-500/40',
                    isApproved && 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
                    isReturned && 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
                    isRejected && 'bg-red-500/20 text-red-400 border-red-500/40'
                  )}>
                    {isApproved && <CheckCircle2 className="w-3 h-3" />}
                    {isReturned && <RotateCcw className="w-3 h-3" />}
                    {isRejected && <XCircle className="w-3 h-3" />}
                    {isPending && <Clock className="w-3 h-3" />}
                    <span>{item.status.replace(/_/g, ' ')}</span>
                  </span>
                </div>

                {/* Submitter & Location Context */}
                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-400 pt-1 border-t border-slate-800/80">
                  <div>
                    <span className="text-slate-500 block text-[9px] uppercase">Submitter</span>
                    <span className="text-slate-200 font-medium truncate block">{item.requester_name}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9px] uppercase">Timeline / SLA</span>
                    <span className={clsx(
                      'font-medium truncate block',
                      item.is_overdue ? 'text-red-400' : 'text-slate-300'
                    )}>
                      {item.sla_text}
                    </span>
                  </div>
                </div>

                {/* Badges bar */}
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-1">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 bg-slate-800/80 px-2 py-0.5 rounded text-slate-300">
                      <Camera className="w-3 h-3 text-amber-400" />
                      <span>{item.evidence_count} items</span>
                    </span>
                    <span className="inline-flex items-center gap-1 bg-slate-800/80 px-2 py-0.5 rounded text-slate-300">
                      <MapPin className="w-3 h-3 text-cyan-400" />
                      <span>{item.location_source === 'ACTUAL_GPS' ? 'GPS' : 'Mine Ref'}</span>
                    </span>
                  </div>

                  {item.sod_warning && (
                    <span className="text-[10px] text-amber-400 font-mono flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      <span>SoD Active</span>
                    </span>
                  )}
                </div>

                {/* Action Trigger */}
                <TouchButton
                  variant={isPending ? 'primary' : 'secondary'}
                  fullWidth
                  size="md"
                  onClick={() => handleOpenDetail(item.id)}
                  icon={<ChevronRight className="w-4 h-4" />}
                >
                  {isPending ? t('reviewActionBtn') : 'View Review Details'}
                </TouchButton>
              </MobileCard>
            );
          })
        )}
      </div>

      {/* Review Detail & Sign-Off Modal */}
      {selectedReviewId && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col justify-end sm:items-center sm:justify-center p-0 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-t-3xl sm:rounded-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-200">
            
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
              <div className="space-y-0.5">
                <span className="text-[10px] font-mono uppercase text-amber-400 font-bold tracking-wider">
                  {reviewDetail?.resource_type.replace(/_/g, ' ') || 'REVIEW DETAIL'}
                </span>
                <h3 className="font-bold text-sm text-slate-100 font-sans">
                  {reviewDetail?.request_code}
                </h3>
              </div>

              <button
                onClick={handleCloseDetail}
                className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 overflow-y-auto space-y-4 text-xs">
              {detailLoading || !reviewDetail ? (
                <div className="p-8 text-center text-slate-400 font-mono animate-pulse">
                  {t('loadingReviewDetails')}
                </div>
              ) : (
                <>
                  {/* Feedback Message */}
                  {feedbackMessage && (
                    <div className={clsx(
                      'p-3 rounded-xl border text-xs font-mono flex items-center gap-2',
                      feedbackMessage.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'
                    )}>
                      {feedbackMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
                      <span>{feedbackMessage.text}</span>
                    </div>
                  )}

                  {/* Separation of Duties Notice */}
                  {reviewDetail.sod_warning && (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono text-[11px] flex items-start gap-2.5">
                      <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold block uppercase">Separation of Duties Enforced</span>
                        <span>{t('sodBlockedWarning')}</span>
                      </div>
                    </div>
                  )}

                  {/* Section: Submitter & Context */}
                  <MobileCard className="p-3 bg-slate-950/60 border-slate-800 space-y-2">
                    <span className="font-mono text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      {t('submitterInfoTitle')}
                    </span>
                    <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                      <div>
                        <span className="text-slate-500 block text-[9px] uppercase">Submitter</span>
                        <span className="text-slate-200 font-semibold">{reviewDetail.requester_name}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[9px] uppercase">Mine</span>
                        <span className="text-slate-200">{reviewDetail.mine_name}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[9px] uppercase">Submitted At</span>
                        <span className="text-slate-400">{new Date(reviewDetail.created_at).toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[9px] uppercase">Required Role</span>
                        <span className="text-amber-400 font-semibold">{reviewDetail.required_role}</span>
                      </div>
                    </div>
                  </MobileCard>

                  {/* Section: Field Context & Spatial Location */}
                  <MobileCard className="p-3 bg-slate-950/60 border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Field Coordinates & GPS
                      </span>
                      <span className={clsx(
                        'px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase',
                        reviewDetail.location_source === 'ACTUAL_GPS' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-cyan-500/20 text-cyan-400'
                      )}>
                        {reviewDetail.location_source === 'ACTUAL_GPS' ? t('actualGpsLocation') : t('surveyedMineLocation')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-300">
                      <span>Lat: {reviewDetail.latitude?.toFixed(5) || '23.79570'}, Lon: {reviewDetail.longitude?.toFixed(5) || '86.43040'}</span>
                      {onNavigateTab && (
                        <button
                          onClick={() => {
                            handleCloseDetail();
                            onNavigateTab('map');
                          }}
                          className="text-amber-400 underline font-sans text-[11px] flex items-center gap-1"
                        >
                          <Compass className="w-3 h-3" />
                          <span>View on Map</span>
                        </button>
                      )}
                    </div>
                  </MobileCard>

                  {/* Section: Observations & Checklist */}
                  <MobileCard className="p-3 bg-slate-950/60 border-slate-800 space-y-2.5">
                    <span className="font-mono text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      {t('observationsNotesTitle')}
                    </span>
                    <p className="text-slate-200 text-xs font-sans leading-relaxed">
                      {reviewDetail.observations || reviewDetail.description || 'No additional observation notes provided.'}
                    </p>

                    {reviewDetail.checklist && reviewDetail.checklist.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[10px] font-mono text-slate-400 font-bold uppercase block">
                          {t('dgmsChecklistReview')}
                        </span>
                        {reviewDetail.checklist.map((item, idx) => (
                          <div key={idx} className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-[11px] space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="font-mono font-bold text-slate-300">{item.item_id}: {item.description}</span>
                              <span className={clsx(
                                'px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase',
                                item.status === 'COMPLIANT' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                              )}>
                                {item.status}
                              </span>
                            </div>
                            {item.notes && (
                              <p className="text-slate-400 text-[10px] font-sans italic">{item.notes}</p>
                            )}
                            {onNavigateTab && (
                              <div className="flex justify-end pt-0.5">
                                <button
                                  onClick={() => {
                                    handleCloseDetail();
                                    onNavigateTab('documents');
                                  }}
                                  className="text-[10px] font-mono text-indigo-400 hover:text-indigo-300 flex items-center gap-1 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20"
                                >
                                  <BookOpen className="w-3 h-3" />
                                  <span>{t('viewRequirementBtn')}</span>
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </MobileCard>

                  {/* Section: Evidence Gallery with SHA-256 Tamper Seals */}
                  <MobileCard className="p-3 bg-slate-950/60 border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        {t('evidenceGalleryTitle')}
                      </span>
                      <span className="text-[10px] font-mono text-amber-400 font-bold">
                        {reviewDetail.evidences.length} Attached
                      </span>
                    </div>

                    {reviewDetail.evidences.length === 0 ? (
                      <p className="text-slate-500 text-[11px] font-mono">No evidence photos attached to this record.</p>
                    ) : (
                      <div className="space-y-2">
                        {reviewDetail.evidences.map((ev) => (
                          <div key={ev.id} className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <div className="p-1.5 rounded-lg bg-slate-800 text-amber-400">
                                  <Camera className="w-4 h-4" />
                                </div>
                                <div>
                                  <span className="font-bold text-slate-200 text-xs block">{ev.title}</span>
                                  <span className="text-[10px] font-mono text-slate-400">{ev.evidence_code}</span>
                                </div>
                              </div>
                              <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[9px] uppercase">
                                {ev.evidence_type}
                              </span>
                            </div>

                            {/* SHA-256 Fingerprint */}
                            <div className="bg-slate-950 p-2 rounded-lg border border-slate-800/80 flex items-center justify-between text-[10px] font-mono">
                              <span className="text-slate-400 truncate max-w-[240px]">
                                SHA-256: {ev.file_hash_sha256}
                              </span>
                              <button
                                onClick={() => handleCopyHash(ev.file_hash_sha256)}
                                className="p-1 text-slate-400 hover:text-amber-400"
                                title="Copy SHA-256 hash"
                              >
                                {copiedHash === ev.file_hash_sha256 ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </MobileCard>

                  {/* Section: Server-Side Audit Timeline */}
                  <MobileCard className="p-3 bg-slate-950/60 border-slate-800 space-y-2">
                    <span className="font-mono text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      {t('auditTimelineTitle')}
                    </span>
                    <div className="space-y-2">
                      {reviewDetail.timeline.map((entry, idx) => (
                        <div key={idx} className="flex items-start gap-2.5 text-[11px] font-mono">
                          <div className="w-2 h-2 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                          <div className="flex-1">
                            <div className="flex justify-between text-slate-400">
                              <span className="font-bold text-slate-200">{entry.action}</span>
                              <span className="text-[10px]">{entry.created_at ? new Date(entry.created_at).toLocaleTimeString() : ''}</span>
                            </div>
                            <span className="text-slate-400 text-[10px] block">Actor: {entry.actor_name} ({entry.role_used})</span>
                            {entry.comments && (
                              <p className="text-slate-300 text-[11px] font-sans mt-0.5 bg-slate-900/60 p-1.5 rounded border border-slate-800">
                                {entry.comments}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </MobileCard>
                </>
              )}
            </div>

            {/* Modal Actions Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/80 space-y-2">
              {reviewDetail?.status === 'PENDING' && (
                <div className="grid grid-cols-3 gap-2">
                  <TouchButton
                    variant="primary"
                    size="md"
                    disabled={!reviewDetail.can_approve}
                    onClick={() => setDecisionModal('APPROVE')}
                    icon={<CheckCircle2 className="w-4 h-4" />}
                  >
                    {t('approveAndSignOffBtn')}
                  </TouchButton>

                  <TouchButton
                    variant="secondary"
                    size="md"
                    onClick={() => setDecisionModal('REQUEST_CHANGES')}
                    icon={<RotateCcw className="w-4 h-4 text-yellow-400" />}
                  >
                    {t('returnForCorrectionBtn')}
                  </TouchButton>

                  <TouchButton
                    variant="danger"
                    size="md"
                    onClick={() => setDecisionModal('REJECT')}
                    icon={<XCircle className="w-4 h-4 text-white" />}
                  >
                    {t('rejectReviewBtn')}
                  </TouchButton>
                </div>
              )}

              {(reviewDetail?.status === 'CHANGES_REQUESTED' || reviewDetail?.status === 'REJECTED') && (
                <TouchButton
                  variant="primary"
                  fullWidth
                  size="md"
                  onClick={() => setDecisionModal('RESUBMIT')}
                  icon={<Send className="w-4 h-4" />}
                >
                  {t('resubmitReviewBtn')}
                </TouchButton>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Decision Input / Confirmation Modal */}
      {decisionModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h4 className="font-bold text-sm text-slate-100 font-sans flex items-center gap-2">
                {decisionModal === 'APPROVE' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                {decisionModal === 'REQUEST_CHANGES' && <RotateCcw className="w-5 h-5 text-yellow-400" />}
                {decisionModal === 'REJECT' && <XCircle className="w-5 h-5 text-red-400" />}
                {decisionModal === 'RESUBMIT' && <Send className="w-5 h-5 text-amber-400" />}
                <span>
                  {decisionModal === 'APPROVE' && t('confirmApprovalTitle')}
                  {decisionModal === 'REQUEST_CHANGES' && t('returnForCorrectionBtn')}
                  {decisionModal === 'REJECT' && t('rejectReviewBtn')}
                  {decisionModal === 'RESUBMIT' && t('resubmitReviewBtn')}
                </span>
              </h4>
              <button
                onClick={() => setDecisionModal(null)}
                className="text-slate-400 hover:text-white"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {decisionModal === 'APPROVE' ? (
              <div className="space-y-3">
                <p className="text-xs text-slate-300 font-sans leading-relaxed">
                  {t('confirmApprovalNotice')}
                </p>
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono space-y-1 text-slate-400">
                  <div>Resource: <span className="text-slate-200">{reviewDetail?.title}</span></div>
                  <div>Reviewer: <span className="text-amber-400">{user?.full_name}</span></div>
                  <div>Role: <span className="text-slate-200">{primaryRole}</span></div>
                </div>
                <div>
                  <label className="text-[10px] font-mono text-slate-400 uppercase block mb-1">
                    Supervisory Review Notes (Optional)
                  </label>
                  <textarea
                    value={decisionComment}
                    onChange={(e) => setDecisionComment(e.target.value)}
                    placeholder="Enter optional sign-off remarks..."
                    className="w-full h-20 p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-[10px] font-mono text-slate-400 uppercase block">
                  {decisionModal === 'REJECT' && t('mandatoryRejectionReasonPrompt')}
                  {decisionModal === 'REQUEST_CHANGES' && t('returnReasonPrompt')}
                  {decisionModal === 'RESUBMIT' && t('resubmitNotesPrompt')}
                </label>
                <textarea
                  value={decisionComment}
                  onChange={(e) => setDecisionComment(e.target.value)}
                  placeholder={
                    decisionModal === 'REJECT' ? t('rejectionReasonPlaceholder') :
                    decisionModal === 'REQUEST_CHANGES' ? t('returnReasonPlaceholder') :
                    t('resubmitNotesPlaceholder')
                  }
                  className="w-full h-24 p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 font-sans"
                />
              </div>
            )}

            <div className="flex items-center gap-2 pt-2">
              <TouchButton
                variant={decisionModal === 'APPROVE' ? 'primary' : decisionModal === 'REJECT' ? 'danger' : 'primary'}
                fullWidth
                size="md"
                disabled={submittingDecision}
                onClick={handleSubmitDecision}
              >
                {submittingDecision ? 'Submitting...' : 'Confirm'}
              </TouchButton>
              <TouchButton
                variant="secondary"
                fullWidth
                size="md"
                onClick={() => setDecisionModal(null)}
              >
                Cancel
              </TouchButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
