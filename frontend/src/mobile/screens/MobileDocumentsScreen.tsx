import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useMineContext } from '../../context/MineContext';
import { useLanguage } from '../../context/LanguageContext';
import { MobileCard } from '../components/MobileCard';
import { TouchButton } from '../components/TouchButton';
import {
  MobileDocumentCounts,
  MobileDocumentItem,
  MobileDocumentDetail,
  StatutoryRequirementDetail
} from '../types/mobile';
import {
  FileText,
  Search,
  BookOpen,
  Shield,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Copy,
  Check,
  Sparkles,
  ExternalLink,
  Layers,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  X,
  FileCheck,
  Building2,
  Calendar,
  Eye,
  Info,
  RefreshCw,
  Hash,
  Download
} from 'lucide-react';
import clsx from 'clsx';

interface MobileDocumentsScreenProps {
  onBack?: () => void;
  onNavigateTab?: (tab: any, params?: any) => void;
  initialRequirementRef?: string;
  initialDocumentCode?: string;
}

export const MobileDocumentsScreen: React.FC<MobileDocumentsScreenProps> = ({
  onBack,
  onNavigateTab,
  initialRequirementRef,
  initialDocumentCode
}) => {
  const { user } = useAuth();
  const { selectedMine } = useMineContext();
  const { t } = useLanguage();

  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [documents, setDocuments] = useState<MobileDocumentItem[]>([]);
  const [counts, setCounts] = useState<MobileDocumentCounts>({
    total: 0,
    statutory: 0,
    mine_operational: 0,
    ocr_verified: 0,
    pending_review: 0
  });
  const [loading, setLoading] = useState<boolean>(true);

  // Document Detail & Viewer Modal
  const [selectedDocId, setSelectedDocId] = useState<string | null>(initialDocumentCode || null);
  const [documentDetail, setDocumentDetail] = useState<MobileDocumentDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);
  const [docSearchQuery, setDocSearchQuery] = useState<string>('');

  // Statutory Requirement Modal
  const [requirementModalRef, setRequirementModalRef] = useState<string | null>(initialRequirementRef || null);
  const [requirementDetail, setRequirementDetail] = useState<StatutoryRequirementDetail | null>(null);
  const [reqLoading, setReqLoading] = useState<boolean>(false);

  // Copied Hash State
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  // Fetch document list
  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const mineParam = selectedMine?.id ? `mine_id=${selectedMine.id}` : '';
      const catParam = activeCategory !== 'ALL' ? `category=${activeCategory}` : '';
      const searchParam = searchQuery.trim() ? `search=${encodeURIComponent(searchQuery.trim())}` : '';
      const queryParams = [mineParam, catParam, searchParam].filter(Boolean).join('&');

      const token = localStorage.getItem('trinetra_access_token');
      const res = await fetch(`/api/v1/mobile/documents${queryParams ? `?${queryParams}` : ''}`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        }
      });

      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
        if (data.counts) {
          setCounts(data.counts);
        }
      }
    } catch (err) {
      console.error('Failed to load mobile documents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [selectedMine?.id, activeCategory, searchQuery]);

  // Load single document detail when selected
  useEffect(() => {
    if (!selectedDocId) {
      setDocumentDetail(null);
      return;
    }

    const fetchDetail = async () => {
      setDetailLoading(true);
      try {
        const token = localStorage.getItem('trinetra_access_token');
        const res = await fetch(`/api/v1/mobile/documents/${encodeURIComponent(selectedDocId)}`, {
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json'
          }
        });

        if (res.ok) {
          const data = await res.json();
          setDocumentDetail(data);
          setCurrentPageIndex(0);
        }
      } catch (err) {
        console.error('Failed to load document detail:', err);
      } finally {
        setDetailLoading(false);
      }
    };

    fetchDetail();
  }, [selectedDocId]);

  // Load statutory requirement when modal opened
  useEffect(() => {
    if (!requirementModalRef) {
      setRequirementDetail(null);
      return;
    }

    const fetchReq = async () => {
      setReqLoading(true);
      try {
        const token = localStorage.getItem('trinetra_access_token');
        const res = await fetch(`/api/v1/mobile/documents/requirement/${encodeURIComponent(requirementModalRef)}`, {
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json'
          }
        });

        if (res.ok) {
          const data = await res.json();
          setRequirementDetail(data);
        }
      } catch (err) {
        console.error('Failed to resolve statutory requirement:', err);
      } finally {
        setReqLoading(false);
      }
    };

    fetchReq();
  }, [requirementModalRef]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(label);
    setTimeout(() => setCopiedHash(null), 2500);
  };

  const handleAskCopilot = (docTitle: string, docCode: string) => {
    if (onNavigateTab) {
      onNavigateTab('copilot', {
        initialPrompt: `Explain the statutory requirements and safety obligations in ${docTitle} (${docCode}).`
      });
    }
  };

  const categoryOptions = [
    { id: 'ALL', label: 'All Documents' },
    { id: 'DGMS', label: 'DGMS Statutory' },
    { id: 'MINE_SAFETY', label: 'Mine Safety' },
    { id: 'ENVIRONMENT', label: 'Environment' },
    { id: 'COMPLIANCE', label: 'Compliance & SOP' },
    { id: 'INSPECTION', label: 'Inspection Notices' },
    { id: 'CIRCULAR', label: 'DGMS Circulars' },
    { id: 'SOURCE_DATA', label: 'Source Dossiers' }
  ];

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 pb-24">
      {/* Top Header */}
      <div className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 p-4 shadow-lg">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                aria-label="Go Back"
                className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white active:scale-95 transition-all"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-400" />
                <h1 className="text-base font-bold tracking-tight text-white">{t('fieldDocuments')}</h1>
              </div>
              <p className="text-[11px] text-slate-400 truncate max-w-[260px]">{t('documentsSubtitle')}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-[10px] font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            OFFLINE READY
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mt-2">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('searchDocumentsPlaceholder')}
            className="w-full pl-9 pr-8 py-2 bg-slate-950/80 border border-slate-700/80 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Category Pills Carousel */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pt-3 pb-1">
          {categoryOptions.map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={clsx(
                  'px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 active:scale-95',
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-semibold'
                    : 'bg-slate-850 text-slate-400 border border-slate-800 hover:bg-slate-800 hover:text-slate-200'
                )}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-4 space-y-4 max-w-2xl mx-auto w-full">
        {/* Metric Summary Counters */}
        <div className="grid grid-cols-4 gap-2">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-center shadow-sm">
            <span className="text-[10px] font-mono text-slate-400 block uppercase truncate">Total</span>
            <span className="text-base font-bold text-white mt-0.5 block">{counts.total}</span>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-center shadow-sm">
            <span className="text-[10px] font-mono text-indigo-400 block uppercase truncate">Statutory</span>
            <span className="text-base font-bold text-indigo-400 mt-0.5 block">{counts.statutory}</span>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-center shadow-sm">
            <span className="text-[10px] font-mono text-cyan-400 block uppercase truncate">Mine Docs</span>
            <span className="text-base font-bold text-cyan-400 mt-0.5 block">{counts.mine_operational}</span>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-center shadow-sm">
            <span className="text-[10px] font-mono text-emerald-400 block uppercase truncate">Verified</span>
            <span className="text-base font-bold text-emerald-400 mt-0.5 block">{counts.ocr_verified}</span>
          </div>
        </div>

        {/* Document Cards List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 space-y-3">
            <RefreshCw className="w-7 h-7 text-indigo-400 animate-spin" />
            <p className="text-xs text-slate-400">{t('loadingDocumentDetails')}</p>
          </div>
        ) : documents.length === 0 ? (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-800/80 flex items-center justify-center mx-auto text-slate-500">
              <FileText className="w-6 h-6" />
            </div>
            <p className="text-xs text-slate-400">{t('noDocumentsFound')}</p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-xs text-indigo-400 font-semibold hover:underline"
              >
                Clear Search Filter
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map((doc) => {
              const isStatutory = doc.is_statutory;
              return (
                <MobileCard
                  key={doc.id}
                  className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-all rounded-2xl p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={clsx(
                            'text-[9px] font-mono px-2 py-0.5 rounded-md font-bold uppercase tracking-wider',
                            isStatutory
                              ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30'
                              : 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                          )}
                        >
                          {isStatutory ? 'TIER 1 STATUTORY' : 'TIER 3 OPERATIONAL'}
                        </span>
                        <span className="text-[9px] font-mono px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                          {doc.category}
                        </span>
                        {doc.ocr_status === 'TEXT_NATIVE' && (
                          <span className="text-[9px] font-mono px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            TEXT NATIVE
                          </span>
                        )}
                        {doc.ocr_status === 'COMPLETED' && (
                          <span className="text-[9px] font-mono px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-400 border border-blue-500/30">
                            OCR VERIFIED
                          </span>
                        )}
                      </div>
                      <h3 className="text-xs font-bold text-white leading-snug pt-0.5">{doc.title}</h3>
                      <div className="flex items-center gap-3 text-[10px] text-slate-400 pt-0.5">
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-slate-500" />
                          {doc.organization || doc.mine_name || 'Central'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-500" />
                          {doc.year}
                        </span>
                        <span className="flex items-center gap-1 font-mono">
                          <FileText className="w-3 h-3 text-slate-500" />
                          {doc.page_count} {doc.page_count === 1 ? 'Page' : 'Pages'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Document Excerpt / Description */}
                  {doc.description && (
                    <p className="text-[11px] text-slate-300/90 mt-2.5 line-clamp-2 bg-slate-950/60 p-2 rounded-lg border border-slate-850">
                      {doc.description}
                    </p>
                  )}

                  {/* SHA-256 Fingerprint & Action Buttons */}
                  <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex flex-col gap-2">
                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                      <span className="truncate max-w-[200px]">SHA-256: {doc.file_hash_sha256.slice(0, 16)}...</span>
                      <button
                        onClick={() => copyToClipboard(doc.file_hash_sha256, doc.id)}
                        className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-sans"
                      >
                        {copiedHash === doc.id ? (
                          <span className="text-emerald-400 flex items-center gap-1">
                            <Check className="w-3 h-3" /> Copied
                          </span>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" /> Copy Hash
                          </>
                        )}
                      </button>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => setSelectedDocId(doc.id)}
                        className="flex-1 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-indigo-600/20"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        {t('openDocumentBtn')}
                      </button>

                      <button
                        onClick={() => handleAskCopilot(doc.title, doc.document_code)}
                        className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-750 active:scale-95 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all border border-slate-750"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        {t('askCopilotBtn')}
                      </button>
                    </div>
                  </div>
                </MobileCard>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* FULL DOCUMENT VIEWER MODAL */}
      {/* ========================================================================= */}
      {selectedDocId && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex flex-col justify-end animate-in fade-in duration-200">
          <div className="bg-slate-900 border-t border-slate-800 rounded-t-3xl max-h-[92vh] h-full flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
              <div className="flex items-center gap-2 overflow-hidden">
                <BookOpen className="w-5 h-5 text-indigo-400 flex-shrink-0" />
                <div className="overflow-hidden">
                  <h2 className="text-xs font-bold text-white truncate">{documentDetail?.title || 'Document Stream'}</h2>
                  <span className="text-[10px] font-mono text-slate-400 truncate block">
                    {documentDetail?.document_code} • {documentDetail?.organization}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedDocId(null)}
                className="p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white active:scale-95 transition-all flex-shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            {detailLoading || !documentDetail ? (
              <div className="flex-1 flex flex-col items-center justify-center space-y-3 p-8">
                <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
                <p className="text-xs text-slate-400">{t('loadingDocumentDetails')}</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Provenance & Cryptographic Strip */}
                <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">{t('sourceTier')}</span>
                    <span className="font-mono text-indigo-300 font-bold">{documentDetail.source_tier}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">{t('issuingOrganization')}</span>
                    <span className="text-slate-200 font-medium truncate max-w-[200px]">
                      {documentDetail.organization || documentDetail.mine_name}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">SHA-256 Fingerprint</span>
                    <button
                      onClick={() => copyToClipboard(documentDetail.file_hash_sha256, 'modal_hash')}
                      className="text-[10px] font-mono text-indigo-400 flex items-center gap-1 hover:underline"
                    >
                      {copiedHash === 'modal_hash' ? (
                        <span className="text-emerald-400 flex items-center gap-1">
                          <Check className="w-3 h-3" /> Copied
                        </span>
                      ) : (
                        <>
                          {documentDetail.file_hash_sha256.slice(0, 16)}... <Copy className="w-3 h-3" />
                        </>
                      )}
                    </button>
                  </div>
                  <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-900">
                    <span className="text-slate-400">Offline Availability</span>
                    <span className="text-emerald-400 font-semibold flex items-center gap-1 text-[10px]">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Cached on Device
                    </span>
                  </div>
                </div>

                {/* Page Navigation Controls */}
                {documentDetail.pages.length > 0 && (
                  <div className="bg-slate-850 p-2.5 rounded-2xl border border-slate-800 flex items-center justify-between">
                    <button
                      disabled={currentPageIndex === 0}
                      onClick={() => setCurrentPageIndex((prev) => Math.max(0, prev - 1))}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 text-xs text-slate-200 font-medium disabled:opacity-30 disabled:pointer-events-none flex items-center gap-1 active:scale-95"
                    >
                      <ChevronLeft className="w-4 h-4" /> {t('prevPage')}
                    </button>
                    <span className="text-xs font-mono font-bold text-white">
                      {t('pageNavigation')} {currentPageIndex + 1} {t('ofWord')} {documentDetail.pages.length}
                    </span>
                    <button
                      disabled={currentPageIndex === documentDetail.pages.length - 1}
                      onClick={() => setCurrentPageIndex((prev) => Math.min(documentDetail.pages.length - 1, prev + 1))}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 text-xs text-slate-200 font-medium disabled:opacity-30 disabled:pointer-events-none flex items-center gap-1 active:scale-95"
                    >
                      {t('nextPage')} <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Page Content Stream Viewer */}
                {documentDetail.pages.length > 0 ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[10px] text-slate-400 px-1">
                      <span className="font-semibold text-slate-300">
                        {documentDetail.pages[currentPageIndex]?.section_heading || `Section / Page ${currentPageIndex + 1}`}
                      </span>
                      <span className="font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        {documentDetail.pages[currentPageIndex]?.extraction_method}
                      </span>
                    </div>

                    <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-xs text-slate-200 font-mono leading-relaxed whitespace-pre-wrap max-h-80 overflow-y-auto select-text">
                      {documentDetail.pages[currentPageIndex]?.text_content || 'No text content on this page.'}
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-xs text-slate-300 leading-relaxed">
                    {documentDetail.extracted_text || documentDetail.description}
                  </div>
                )}

                {/* Extracted Fields Table (Operational Records) */}
                {documentDetail.fields && documentDetail.fields.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <FileCheck className="w-4 h-4 text-cyan-400" />
                      {t('documentFieldsTitle')}
                    </h4>
                    <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden divide-y divide-slate-850">
                      {documentDetail.fields.map((f) => (
                        <div key={f.id} className="p-3 flex items-center justify-between gap-2 text-xs">
                          <div>
                            <span className="font-mono text-[10px] text-slate-400 block uppercase">{f.field_name}</span>
                            <span className="font-bold text-white">{f.field_value}</span>
                          </div>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                            {f.is_verified === 'VERIFIED' ? t('humanVerifiedBadge') : 'PENDING'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Modal Bottom Action Tray */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/90 flex gap-2">
              <button
                onClick={() => handleAskCopilot(documentDetail?.title || '', documentDetail?.document_code || '')}
                className="flex-1 py-3 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-600/30"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                {t('askCopilotBtn')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STATUTORY REQUIREMENT MODAL */}
      {/* ========================================================================= */}
      {requirementModalRef && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-400" />
                <h3 className="text-xs font-bold text-white">{t('statutoryRequirementTitle')}</h3>
              </div>
              <button
                onClick={() => setRequirementModalRef(null)}
                className="p-1 rounded-full bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {reqLoading || !requirementDetail ? (
              <div className="py-10 text-center space-y-2">
                <RefreshCw className="w-6 h-6 text-indigo-400 animate-spin mx-auto" />
                <p className="text-xs text-slate-400">Resolving statutory citation...</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-wider block font-semibold">
                    {requirementDetail.regulation_ref}
                  </span>
                  <h4 className="text-sm font-bold text-white">{requirementDetail.regulation_name}</h4>
                  <p className="text-[11px] text-slate-400">
                    {requirementDetail.document_title} • Page {requirementDetail.page_number}
                  </p>
                </div>

                {/* Verbatim Rule Excerpt Box */}
                <div className="bg-slate-950 p-4 rounded-2xl border-l-4 border-indigo-500 border-y border-r border-slate-800 space-y-2">
                  <span className="text-[10px] font-mono text-slate-400 uppercase block font-bold">
                    {t('verbatimStatutoryText')}
                  </span>
                  <p className="text-xs text-slate-200 font-mono leading-relaxed select-text">
                    "{requirementDetail.verbatim_text}"
                  </p>
                </div>

                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-1">
                  <span>Domain: {requirementDetail.domain}</span>
                  <span>Effective: {requirementDetail.effective_from || '2017'}</span>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => {
                      const code = requirementDetail.document_code;
                      setRequirementModalRef(null);
                      setSelectedDocId(code);
                    }}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    Open Source Document
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
