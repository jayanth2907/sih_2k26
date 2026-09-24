import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { useMineContext } from '../context/MineContext';
import { useLanguage } from '../context/LanguageContext';
import { documentService } from '../services';
import { DocumentDTO, DocumentSummaryDTO, DocumentPageDTO, ExtractedDocumentFieldDTO } from '../types';
import { 
  FileText, 
  Upload, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  Eye, 
  Trash2, 
  ShieldCheck, 
  Search, 
  Filter, 
  Sparkles, 
  Layers, 
  Check, 
  Copy, 
  Clock, 
  RefreshCw, 
  Edit2, 
  X, 
  Building2, 
  FileCheck, 
  Cpu, 
  Hash, 
  ChevronRight,
  Shield,
  FileSpreadsheet
} from 'lucide-react';
import clsx from 'clsx';

export const DocumentsPage: React.FC = () => {
  const { selectedMine, setCurrentTab } = useMineContext();
  const { t } = useLanguage();

  const [documents, setDocuments] = useState<DocumentSummaryDTO[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<DocumentDTO | null>(null);
  const [selectedPageNum, setSelectedPageNum] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  // Filter States
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Upload Modal State
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState<string>('');
  const [uploadTier, setUploadTier] = useState<string>('TIER_3_TRINETRA_OPERATIONAL');
  const [uploadProgressStage, setUploadProgressStage] = useState<string>('IDLE');

  // Governance Draft Modal State
  const [showDraftModal, setShowDraftModal] = useState<boolean>(false);
  const [draftTitle, setDraftTitle] = useState<string>('');
  const [draftDescription, setDraftDescription] = useState<string>('');
  const [draftSuccessMsg, setDraftSuccessMsg] = useState<string | null>(null);

  // Field Editing State
  const [editingFieldId, setEditingFieldId] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadDocuments();
  }, [selectedMine?.id, categoryFilter, statusFilter]);

  const loadDocuments = async () => {
    setIsLoading(true);
    try {
      const catParam = categoryFilter === 'ALL' ? undefined : categoryFilter;
      const statusParam = statusFilter === 'ALL' ? undefined : statusFilter;
      const data = await documentService.getDocuments(selectedMine?.id, catParam, undefined, statusParam);
      setDocuments(data);
    } catch (err) {
      console.error('Failed to load documents:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectDocument = async (docId: number) => {
    try {
      const fullDoc = await documentService.getDocument(docId);
      setSelectedDoc(fullDoc);
      setSelectedPageNum(1);
    } catch (err) {
      console.error('Failed to load document details:', err);
    }
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;

    setIsUploading(true);
    setUploadError(null);
    setUploadProgressStage('VALIDATING');

    try {
      setUploadProgressStage('EXTRACTING_AND_OCR');
      const newDoc = await documentService.uploadDocument(
        uploadFile,
        selectedMine?.id,
        uploadTitle || uploadFile.name,
        uploadTier
      );
      setUploadProgressStage('COMPLETED');
      setShowUploadModal(false);
      setUploadFile(null);
      setUploadTitle('');
      await loadDocuments();
      setSelectedDoc(newDoc);
    } catch (err: any) {
      setUploadError(err.response?.data?.detail || 'Failed to upload and process document.');
      setUploadProgressStage('FAILED');
    } finally {
      setIsUploading(false);
    }
  };

  const handleVerifyField = async (fieldId: number, isVerified: 'VERIFIED' | 'REJECTED' | 'EDITED', valueOverride?: string) => {
    if (!selectedDoc) return;
    try {
      const updatedField = await documentService.verifyField(
        selectedDoc.id,
        fieldId,
        isVerified,
        valueOverride
      );
      setSelectedDoc({
        ...selectedDoc,
        fields: selectedDoc.fields.map(f => f.id === fieldId ? updatedField : f)
      });
      setEditingFieldId(null);
    } catch (err) {
      console.error('Failed to verify field:', err);
    }
  };

  const handleVerifyAll = async () => {
    if (!selectedDoc) return;
    try {
      const updated = await documentService.verifyAllFields(selectedDoc.id);
      setSelectedDoc(updated);
      await loadDocuments();
    } catch (err) {
      console.error('Failed to verify all fields:', err);
    }
  };

  const handleCreateDraftTask = async () => {
    if (!selectedDoc || !draftTitle.trim()) return;
    try {
      const res = await documentService.createDraftGovernance(
        selectedDoc.id,
        draftTitle,
        draftDescription
      );
      setDraftSuccessMsg(res.message || 'Draft task created successfully!');
      setTimeout(() => {
        setShowDraftModal(false);
        setDraftSuccessMsg(null);
        setDraftTitle('');
        setDraftDescription('');
      }, 2000);
    } catch (err) {
      console.error('Failed to create draft governance task:', err);
    }
  };

  const handleDeleteDocument = async (docId: number) => {
    if (!window.confirm('Are you sure you want to delete this document and its extracted index?')) return;
    try {
      await documentService.deleteDocument(docId);
      if (selectedDoc?.id === docId) setSelectedDoc(null);
      await loadDocuments();
    } catch (err) {
      console.error('Failed to delete document:', err);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(text);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const renderTierBadge = (tier: string) => {
    switch (tier) {
      case 'TIER_1_OFFICIAL_REGULATORY':
      case 'TIER_1':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">TIER 1: REGULATORY</span>;
      case 'TIER_2_OFFICIAL_MINE_BLOCK':
      case 'TIER_2':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">TIER 2: MINE DOSSIER</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/30">TIER 3: OPERATIONAL</span>;
    }
  };

  const renderQualityBadge = (quality: string) => {
    switch (quality) {
      case 'GOOD':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">GOOD</span>;
      case 'REVIEW':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">REVIEW NEEDED</span>;
      case 'UNAVAILABLE':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold">OCR UNAVAILABLE</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold">POOR / UNREADABLE</span>;
    }
  };

  const filteredDocs = documents.filter(d => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return d.title.toLowerCase().includes(q) || d.doc_type.toLowerCase().includes(q) || d.file_hash.toLowerCase().includes(q);
  });

  const activePage = selectedDoc?.pages.find(p => p.page_number === selectedPageNum);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-6 max-w-7xl mx-auto pb-12 font-sans text-slate-100"
    >
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-xl bg-[#0D100F] border border-[#1B211E] shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-white tracking-wide font-sans">
                Document Intelligence & OCR Digitization
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-[#121614] border border-[#27302B] text-[10.5px] font-mono text-amber-400">
                Phase 12A Hybrid Engine
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 font-sans">
              Scanned PDF & image digitization, deterministic classification, structured field extraction, and page-level provenance.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowUploadModal(true)}
            className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs font-mono flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Document</span>
          </button>
        </div>
      </div>

      {/* Top Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-sm">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Total Documents</span>
          <span className="text-2xl font-bold text-white mt-1 block">{documents.length}</span>
        </div>
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-sm">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Native Pages</span>
          <span className="text-2xl font-bold text-emerald-400 mt-1 block">
            {documents.reduce((acc, d) => acc + (d.native_page_count || 0), 0)}
          </span>
        </div>
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-sm">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">OCR Digitize Pages</span>
          <span className="text-2xl font-bold text-cyan-400 mt-1 block">
            {documents.reduce((acc, d) => acc + (d.ocr_page_count || 0), 0)}
          </span>
        </div>
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-sm">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Avg OCR Confidence</span>
          <span className="text-2xl font-bold text-amber-400 mt-1 block">
            {documents.length > 0 ? (documents.reduce((acc, d) => acc + (d.average_ocr_confidence || 100), 0) / documents.length).toFixed(1) : 100}%
          </span>
        </div>
      </div>

      {/* Main Grid: Document List on Left, Inspector on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Document Cards & Filters */}
        <div className={clsx('space-y-4', selectedDoc ? 'lg:col-span-5' : 'lg:col-span-12')}>
          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search documents by title, type, hash..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-amber-500/50"
              />
            </div>
            <div className="flex items-center gap-2">
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none"
              >
                <option value="ALL">All Categories</option>
                <option value="DGMS">DGMS Legislation</option>
                <option value="INSPECTION_REPORT">Inspection Reports</option>
                <option value="SAFETY_REGISTER">Safety Registers</option>
                <option value="PRODUCTION_REPORT">Production Reports</option>
                <option value="ENVIRONMENT_REPORT">Environmental Reports</option>
                <option value="CONTRACTOR_DOCUMENT">Contractor Documents</option>
                <option value="CMSMS">CMSMS / Khanan Prahari</option>
              </select>
            </div>
          </div>

          {/* Document Cards List */}
          {isLoading ? (
            <div className="p-8 text-center text-slate-400 font-mono text-xs">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-400" />
              Loading document catalog...
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="p-8 text-center rounded-xl bg-slate-900 border border-slate-800 text-slate-400 text-xs">
              No documents found. Click "Upload Document" to ingest a scanned or native PDF.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[650px] overflow-y-auto pr-1">
              {filteredDocs.map(doc => {
                const isSelected = selectedDoc?.id === doc.id;
                return (
                  <div
                    key={doc.id}
                    onClick={() => handleSelectDocument(doc.id)}
                    className={clsx(
                      'p-4 rounded-xl border text-xs space-y-2.5 transition-all cursor-pointer group shadow-sm',
                      isSelected 
                        ? 'bg-slate-900 border-amber-500/60 ring-1 ring-amber-500/30' 
                        : 'bg-slate-900/70 hover:bg-slate-900 border-slate-800 hover:border-slate-700'
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-amber-400 shrink-0" />
                          <h4 className="font-bold text-white group-hover:text-amber-300 transition-colors truncate">
                            {doc.title}
                          </h4>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate">
                          {doc.source_filename || 'Uploaded file'}
                        </p>
                      </div>
                      <ChevronRight className={clsx(
                        'w-4 h-4 transition-transform',
                        isSelected ? 'text-amber-400 translate-x-0.5' : 'text-slate-400 group-hover:text-slate-300'
                      )} />
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {renderTierBadge(doc.source_tier)}
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-cyan-300 border border-slate-700">
                        {doc.doc_type}
                      </span>
                      {renderQualityBadge(doc.quality_status)}
                    </div>

                    {/* Stats & Metadata Footer */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[10px] font-mono text-slate-400">
                      <span>{doc.page_count} Pages ({doc.native_page_count} Native / {doc.ocr_page_count} OCR)</span>
                      <span>OCR: {doc.average_ocr_confidence ? `${doc.average_ocr_confidence}%` : 'N/A'}</span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                      <span className="truncate max-w-[200px]">SHA: {doc.file_hash.slice(0, 16)}...</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteDocument(doc.id);
                        }}
                        className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                        title="Delete Document"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Full Document Inspector & Structured Review */}
        {selectedDoc && (
          <div className="lg:col-span-7 space-y-4">
            {/* Inspector Header Card */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-400" />
                    <h3 className="text-base font-bold text-white">{selectedDoc.title}</h3>
                  </div>
                  <p className="text-xs text-slate-400 font-mono">
                    Classified as <strong className="text-amber-400">{selectedDoc.doc_type}</strong> ({selectedDoc.classification_reason})
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleVerifyAll}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Accept All Valid</span>
                  </button>
                  <button
                    onClick={() => {
                      setDraftTitle(`Observation from ${selectedDoc.title}`);
                      setDraftDescription(`Extracted from ${selectedDoc.title} (SHA-256: ${selectedDoc.file_hash.slice(0, 16)}...).\nFields verified: ${selectedDoc.fields.filter(f => f.is_verified === 'VERIFIED').length}/${selectedDoc.fields.length}`);
                      setShowDraftModal(true);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/40 text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Draft Governance</span>
                  </button>
                  <button
                    onClick={() => setSelectedDoc(null)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* SHA-256 Provenance Box */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400 truncate max-w-[400px]">
                  Original SHA-256: <strong className="text-emerald-400">{selectedDoc.file_hash}</strong>
                </span>
                <button
                  onClick={() => copyToClipboard(selectedDoc.file_hash)}
                  className="flex items-center gap-1 text-amber-400 hover:text-amber-300"
                >
                  {copiedHash === selectedDoc.file_hash ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedHash === selectedDoc.file_hash ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              {/* Page Selector Tabs */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                  <span>Page-Level Inspector ({selectedDoc.pages.length} Pages)</span>
                  {activePage && (
                    <span className="text-cyan-400">
                      Method: {activePage.extraction_method} • Provider: {activePage.ocr_provider} • Confidence: {activePage.ocr_confidence ?? 100}%
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {selectedDoc.pages.map(p => (
                    <button
                      key={p.page_number}
                      onClick={() => setSelectedPageNum(p.page_number)}
                      className={clsx(
                        'px-3 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer',
                        selectedPageNum === p.page_number
                          ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                          : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                      )}
                    >
                      Page {p.page_number} ({p.extraction_method === 'OCR' ? 'OCR' : 'Native'})
                    </button>
                  ))}
                </div>
              </div>

              {/* Active Page Extracted Text Preview */}
              {activePage && (
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 text-xs font-mono leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap">
                  {activePage.text_content}
                </div>
              )}
            </div>

            {/* Extracted Structured Fields Table */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <h4 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                    Extracted Structured Fields ({selectedDoc.fields.length})
                  </h4>
                </div>
                <span className="text-xs font-mono text-slate-400">Human Verification Required</span>
              </div>

              {selectedDoc.fields.length === 0 ? (
                <p className="text-xs text-slate-400 italic p-4 text-center">
                  No structured fields detected with high confidence in this document.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 text-[10px] uppercase">
                        <th className="pb-2">Field</th>
                        <th className="pb-2">Extracted Value</th>
                        <th className="pb-2">Page</th>
                        <th className="pb-2">Confidence</th>
                        <th className="pb-2">Validation</th>
                        <th className="pb-2 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {selectedDoc.fields.map(field => {
                        const isEditing = editingFieldId === field.id;
                        return (
                          <tr key={field.id} className="hover:bg-slate-950/40">
                            <td className="py-2.5 text-amber-400 font-bold">{field.field_name}</td>
                            <td className="py-2.5 text-slate-200">
                              {isEditing ? (
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="text"
                                    value={editingValue}
                                    onChange={e => setEditingValue(e.target.value)}
                                    className="bg-slate-950 border border-amber-500 rounded px-2 py-0.5 text-xs text-white focus:outline-none"
                                  />
                                  <button
                                    onClick={() => handleVerifyField(field.id, 'EDITED', editingValue)}
                                    className="p-1 rounded bg-emerald-500 text-slate-950"
                                  >
                                    <Check className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => setEditingFieldId(null)}
                                    className="p-1 rounded bg-slate-800 text-slate-400"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <span>{field.field_value}</span>
                              )}
                            </td>
                            <td className="py-2.5 text-slate-400">p. {field.page_number}</td>
                            <td className="py-2.5 text-cyan-400">{(field.confidence * 100).toFixed(0)}%</td>
                            <td className="py-2.5">
                              <span className={clsx(
                                'px-1.5 py-0.5 rounded text-[9px] font-bold',
                                field.validation_status === 'VALID' ? 'bg-emerald-500/20 text-emerald-300' :
                                field.validation_status === 'REVIEW_REQUIRED' ? 'bg-amber-500/20 text-amber-300' :
                                'bg-rose-500/20 text-rose-300'
                              )}>
                                {field.validation_status}
                              </span>
                            </td>
                            <td className="py-2.5 text-right space-x-1.5">
                              {field.is_verified === 'VERIFIED' ? (
                                <span className="text-[10px] text-emerald-400 font-bold flex items-center justify-end gap-1">
                                  <CheckCircle2 className="w-3 h-3" /> Verified
                                </span>
                              ) : (
                                <>
                                  <button
                                    onClick={() => handleVerifyField(field.id, 'VERIFIED')}
                                    className="p-1 rounded bg-slate-800 hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-400"
                                    title="Accept Field"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingFieldId(field.id);
                                      setEditingValue(field.field_value);
                                    }}
                                    className="p-1 rounded bg-slate-800 hover:bg-amber-500/20 text-slate-400 hover:text-amber-400"
                                    title="Edit Value"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleVerifyField(field.id, 'REJECTED')}
                                    className="p-1 rounded bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400"
                                    title="Mark Invalid"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Upload Document Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">Upload Compliance / Mine Document</h3>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleFileUpload} className="space-y-4 text-xs font-mono">
              <div>
                <label className="text-slate-300 block mb-1">Document Title</label>
                <input
                  type="text"
                  placeholder="e.g. Rohne Safety Inspection Report Aug 2026"
                  value={uploadTitle}
                  onChange={e => setUploadTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1">Source Tier</label>
                <select
                  value={uploadTier}
                  onChange={e => setUploadTier(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none"
                >
                  <option value="TIER_1_OFFICIAL_REGULATORY">TIER 1: Official Regulatory (DGMS / Ministry)</option>
                  <option value="TIER_2_OFFICIAL_MINE_BLOCK">TIER 2: Official Mine / Coal Block Dossier</option>
                  <option value="TIER_3_TRINETRA_OPERATIONAL">TIER 3: TRINETRA Operational / Colliery Record</option>
                </select>
              </div>

              {/* File Dropzone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="p-6 border-2 border-dashed border-slate-700 hover:border-amber-500/50 rounded-xl text-center cursor-pointer bg-slate-950/50 transition-colors"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={e => setUploadFile(e.target.files?.[0] || null)}
                  accept=".pdf,.png,.jpg,.jpeg,.tiff"
                  className="hidden"
                />
                <Upload className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                {uploadFile ? (
                  <div>
                    <span className="font-bold text-white block">{uploadFile.name}</span>
                    <span className="text-[10px] text-slate-400">({(uploadFile.size / 1024).toFixed(0)} KB)</span>
                  </div>
                ) : (
                  <div>
                    <span className="text-slate-300 block">Click to select PDF or image file</span>
                    <span className="text-[10px] text-slate-400 block mt-1">Supports PDF (Native & Scanned), PNG, JPG, TIFF (Max 25MB)</span>
                  </div>
                )}
              </div>

              {/* Processing Stage Indicator */}
              {isUploading && (
                <div className="p-3 rounded-xl bg-slate-950 border border-amber-500/30 text-amber-400 space-y-1">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing Document Intelligence Pipeline...</span>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Computing SHA-256 → Detecting Text / OCR → Extracting Fields → Updating RAG Index
                  </p>
                </div>
              )}

              {uploadError && (
                <p className="text-rose-400 text-xs">{uploadError}</p>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!uploadFile || isUploading}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-bold cursor-pointer"
                >
                  {isUploading ? 'Ingesting...' : 'Start Ingestion'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Draft Governance Action Modal */}
      {showDraftModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-4 shadow-2xl font-mono text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">Create Draft Governance Task</h3>
              </div>
              <button
                onClick={() => setShowDraftModal(false)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 space-y-1">
              <span className="font-bold block">Human-in-the-Loop Statutory Protection:</span>
              <p className="text-[10px] leading-relaxed">
                This action creates a <strong>DRAFT</strong> officer observation task for review. It will <strong>NOT</strong> automatically create a final statutory violation.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-slate-300 block mb-1">Task Title</label>
                <input
                  type="text"
                  value={draftTitle}
                  onChange={e => setDraftTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="text-slate-300 block mb-1">Observation & Findings</label>
                <textarea
                  rows={4}
                  value={draftDescription}
                  onChange={e => setDraftDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {draftSuccessMsg && (
              <p className="text-emerald-400 text-xs font-bold">{draftSuccessMsg}</p>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowDraftModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateDraftTask}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold cursor-pointer"
              >
                Create Draft Task
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};
