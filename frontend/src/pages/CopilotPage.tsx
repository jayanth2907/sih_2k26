import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { useMineContext } from '../context/MineContext';
import { useLanguage } from '../context/LanguageContext';
import { copilotService } from '../services';
import { CopilotQueryResponse, CopilotQuickPrompt, EvidenceItem } from '../types';
import { MarkdownRenderer } from '../components/MarkdownRenderer';
import { 
  BrainCircuit, 
  Send, 
  Sparkles, 
  Layers3, 
  FileText, 
  Trash2, 
  ArrowRight, 
  Shield,
  BookOpen,
  X,
  Copy,
  Check,
  Landmark,
  FileCheck,
  Compass,
  Scale,
  Building2,
  Info,
  RefreshCw
} from 'lucide-react';
import clsx from 'clsx';

interface Message {
  id: string;
  sender: 'user' | 'copilot';
  text?: string;
  response?: CopilotQueryResponse;
  timestamp: string;
}

export const CopilotPage: React.FC = () => {
  const { selectedMine, setCurrentTab, setFocusedTarget } = useMineContext();
  const { language, t } = useLanguage();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [quickPrompts, setQuickPrompts] = useState<CopilotQuickPrompt[]>([]);
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceItem | null>(null);
  const [copiedHash, setCopiedHash] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load quick prompts on mount
  useEffect(() => {
    copilotService.getQuickPrompts()
      .then((data) => setQuickPrompts(Array.isArray(data) ? data : []))
      .catch((err) => {
        console.error('Failed to load quick prompts:', err);
        setQuickPrompts([]);
      });
  }, []);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Initial welcome message
  useEffect(() => {
    if (selectedMine && messages.length === 0) {
      const welcomeText = language === 'hi' 
        ? `नमस्ते। मैं त्रिनेत्र AI गवर्नेंस एवं नियामक कोपायलट हूँ। ${selectedMine.name} के अधिकृत डेटाबेस, डीजीएमएस नियमों, सीएमएसएमएस एसओपी और आधिकारिक बजट के संबंध में कोई भी प्रश्न पूछें।`
        : language === 'te'
        ? `నమస్కారం. నేను త్రినేత్ర AI గవర్నెన్స్ మరియు రెగ్యులేటరీ కోపైలట్. ${selectedMine.name} కొరకు అధికారిక డీజీఎంఎస్ నియమాలు, సీఎంఎస్ఎంఎస్ మరియు బడ్జెట్ ఆధారిత ప్రశ్నలను అడగండి.`
        : `Welcome to TRINETRA AI Governance Copilot (Phase 11C). I provide authoritative, evidence-grounded answers across DGMS regulations (CMR 2017, Mines Rules 1955), Ministry of Coal Annual Reports, Union Budget 2026-27, CMSMS/Khanan Prahari SOPs, PGRM cell, and real mine block dossiers for ${selectedMine.name}.`;

      setMessages([
        {
          id: 'welcome',
          sender: 'copilot',
          text: welcomeText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }
  }, [selectedMine?.id, language]);

  const handleSendQuery = async (queryText?: string) => {
    const q = (queryText || inputQuery).trim();
    if (!q || !selectedMine || isLoading) return;

    const userMsgId = `user_${Date.now()}`;
    const newMessages: Message[] = [
      ...messages,
      {
        id: userMsgId,
        sender: 'user',
        text: q,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ];

    setMessages(newMessages);
    setInputQuery('');
    setIsLoading(true);

    try {
      const res: CopilotQueryResponse = await copilotService.query({
        mine_id: selectedMine.id,
        query: q,
        language: language
      });

      setMessages([
        ...newMessages,
        {
          id: `copilot_${Date.now()}`,
          sender: 'copilot',
          response: res,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } catch (err: any) {
      setMessages([
        ...newMessages,
        {
          id: `err_${Date.now()}`,
          sender: 'copilot',
          text: err.response?.data?.detail || 'Copilot service is temporarily unavailable. Please verify mine authorization and connectivity.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleActionClick = (action: any) => {
    if (action.action_type === 'FOCUS_3D_ZONE' || action.action_type === 'FOCUS_3D_MINE') {
      const payload = action.payload || {};
      setFocusedTarget({
        x: payload.x ?? 0,
        y: payload.y ?? 200,
        z: payload.z ?? -180,
        distance: payload.distance ?? 65,
        title: payload.title || payload.label || 'Target Location',
        type: 'zone',
        id: payload.zone_code || payload.mine_id
      });
      setCurrentTab('digital-twin');
    } else if (action.action_type === 'NAVIGATE_TAB') {
      const targetTab = action.payload?.tab || 'dashboard';
      setCurrentTab(targetTab);
    }
  };

  const getPromptText = (p: CopilotQuickPrompt) => {
    if (!p) return '';
    if (language === 'hi') return p.prompt_hi || p.prompt_en || '';
    if (language === 'te') return p.prompt_te || p.prompt_en || '';
    return p.prompt_en || '';
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const renderTierBadge = (tier?: string) => {
    if (!tier) return null;
    switch (tier) {
      case 'TIER_1':
        return (
          <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-mono text-emerald-400 flex items-center gap-1">
            <Scale className="w-3 h-3" /> TIER 1: OFFICIAL GOVT
          </span>
        );
      case 'TIER_2':
        return (
          <span className="px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/30 text-[10px] font-mono text-cyan-400 flex items-center gap-1">
            <Building2 className="w-3 h-3" /> TIER 2: MINE DOSSIER
          </span>
        );
      case 'TIER_3':
        return (
          <span className="px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-[10px] font-mono text-amber-400 flex items-center gap-1">
            <Shield className="w-3 h-3" /> TIER 3: OPERATIONAL
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-md bg-purple-500/10 border border-purple-500/30 text-[10px] font-mono text-purple-400 flex items-center gap-1">
            <Compass className="w-3 h-3" /> TIER 4: SIMULATED
          </span>
        );
    }
  };

  const renderStatusBadge = (status?: string) => {
    if (!status) return null;
    switch (status) {
      case 'CURRENT':
      case 'CURRENT_REGULATORY_FRAMEWORK':
      case 'CURRENT_RELEVANT_REGULATION':
        return (
          <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-mono font-bold">
            CURRENT
          </span>
        );
      case 'HISTORICAL':
      case 'SUPERSEDED':
        return (
          <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-mono font-bold">
            HISTORICAL / SUPERSEDED
          </span>
        );
      case 'APPROXIMATE':
        return (
          <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[9px] font-mono font-bold">
            APPROXIMATE GEOMETRY
          </span>
        );
      case 'REAL_SOURCE':
      case 'SOURCE_DERIVED':
        return (
          <span className="px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 border border-blue-500/40 text-[9px] font-mono font-bold">
            SOURCE-DERIVED
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-md bg-slate-700 text-slate-300 text-[9px] font-mono">
            {status}
          </span>
        );
    }
  };

  const quickFilterPills = [
    { id: 'ALL', label: 'All Categories' },
    { id: 'REGULATION', label: 'DGMS & Regulations' },
    { id: 'RISK', label: 'Operational Risk' },
    { id: 'CMSMS', label: 'CMSMS & Grievances' },
    { id: 'BUDGET', label: 'Union Budget 2026-27' },
    { id: 'MINE_FACTS', label: 'Real Mine Blocks' },
  ];

  const filteredPrompts = (quickPrompts || []).filter((p) => {
    if (!p) return false;
    if (categoryFilter === 'ALL') return true;
    if (categoryFilter === 'REGULATION') return p.category === 'COMPLIANCE' || p.category === 'GOVERNMENT';
    if (categoryFilter === 'RISK') return p.category === 'SAFETY' || p.category === 'RISK';
    if (categoryFilter === 'CMSMS') return p.category === 'CMSMS' || p.category === 'PGRM';
    if (categoryFilter === 'BUDGET') return p.category === 'BUDGET' || p.category === 'ANNUAL_REPORT';
    if (categoryFilter === 'MINE_FACTS') return p.category === 'MINE_FACT';
    return true;
  });

  if (!selectedMine) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-400 font-sans text-xs space-y-3">
        <RefreshCw className="w-5 h-5 animate-spin text-amber-400" />
        <span>Loading mine context for AI Copilot...</span>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-4 max-w-6xl mx-auto pb-6 font-sans text-slate-100"
    >
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-[#0D100F] border border-[#1B211E] shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
            <BrainCircuit className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-white tracking-wide uppercase font-sans">
                {t('aiCopilot')} — Phase 11C
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-[#121614] border border-[#27302B] text-[10px] font-mono text-emerald-400">
                Evidence-Grounded RAG Active
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 font-sans">
              Authoritative DGMS, Annual Report, Union Budget 2026-27 & Real Mine Block Intelligence for <span className="text-amber-400 font-semibold">{selectedMine.name}</span> ({selectedMine.code})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-lg bg-[#121614] border border-[#1B211E] text-[11px] font-mono text-slate-300 flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span>RBAC & Mine Isolation Active</span>
          </div>
          <button
            onClick={() => setMessages([])}
            className="p-2 rounded-lg bg-[#121614] hover:bg-[#1B211E] text-slate-400 hover:text-rose-400 border border-[#1B211E] transition-colors cursor-pointer"
            title={t('clearChat')}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Category Pills and Quick Prompts Bar */}
      <div className="space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {quickFilterPills.map((pill) => (
              <button
                key={pill.id}
                onClick={() => setCategoryFilter(pill.id)}
                className={clsx(
                  'px-2.5 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer',
                  categoryFilter === pill.id
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                    : 'bg-[#0D100F] text-slate-400 hover:text-slate-200 border border-[#1B211E] hover:border-[#27302B]'
                )}
              >
                {pill.label}
              </button>
            ))}
          </div>
          <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5 uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            {t('quickActions')}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
          {filteredPrompts.slice(0, 6).map((p) => (
            <button
              key={p.id}
              onClick={() => handleSendQuery(getPromptText(p))}
              disabled={isLoading}
              className="text-left p-2.5 rounded-lg bg-[#0D100F] hover:bg-[#121614] border border-[#1B211E] hover:border-[#27302B] text-xs text-slate-300 transition-all flex items-start gap-2.5 cursor-pointer disabled:opacity-50 group"
            >
              <ArrowRight className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5 group-hover:translate-x-0.5 transition-transform" />
              <div className="truncate">
                <span className="text-[10px] font-mono text-amber-400/80 block uppercase tracking-wider">{p.category}</span>
                <span className="font-medium text-slate-200 line-clamp-1">{getPromptText(p)}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Chat Stream */}
      <div className="h-[520px] rounded-xl bg-[#0D100F] border border-[#1B211E] p-4 overflow-y-auto space-y-4 shadow-xs">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={clsx(
              'flex flex-col',
              msg.sender === 'user' ? 'items-end' : 'items-start'
            )}
          >
            {/* Sender Label & Timestamp */}
            <div className="flex items-center gap-2 mb-1 px-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                {msg.sender === 'user' ? 'Mine Officer' : 'TRINETRA Grounded RAG Copilot'}
              </span>
              <span className="text-[9px] font-mono text-slate-400">{msg.timestamp}</span>
            </div>

            {/* Message Bubble / Card */}
            {msg.sender === 'user' ? (
              <div className="max-w-xl p-3.5 rounded-xl rounded-tr-none bg-amber-500/10 border border-amber-500/30 text-slate-100 text-xs font-medium shadow-xs">
                {msg.text}
              </div>
            ) : (
              <div className="max-w-3xl w-full p-4 rounded-xl rounded-tl-none bg-[#080A09] border border-[#1B211E] text-slate-200 text-xs space-y-4 shadow-xs">
                {/* Fallback Simple Text (Welcome or Error) */}
                {msg.text && (
                  <p className="text-slate-200 leading-relaxed whitespace-pre-wrap font-sans text-xs">{msg.text}</p>
                )}

                {/* Structured Evidence-Grounded Response */}
                {msg.response && (
                  <div className="space-y-4">
                    {/* Header tags: Classification & Domain */}
                    <div className="flex flex-wrap items-center gap-2">
                      {msg.response.question_type && (
                        <span className="px-2 py-0.5 rounded-md bg-[#121614] border border-[#27302B] text-[10px] font-mono text-amber-400">
                          {msg.response.question_type}
                        </span>
                      )}
                      {msg.response.domain_detected && (
                        <span className="px-2 py-0.5 rounded-md bg-[#121614] border border-[#27302B] text-[10px] font-mono text-cyan-400">
                          DOMAIN: {msg.response.domain_detected}
                        </span>
                      )}
                      {msg.response.citation_validation_status && (
                        <span className={clsx(
                          'px-2 py-0.5 rounded-md text-[10px] font-mono flex items-center gap-1',
                          msg.response.citation_validation_status === 'VALIDATED'
                            ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                            : 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
                        )}>
                          <FileCheck className="w-3 h-3" /> {msg.response.citation_validation_status}
                        </span>
                      )}
                    </div>

                    {/* Grounded Markdown Body */}
                    <div className="p-4 rounded-lg bg-[#0D100F] border border-[#1B211E] font-sans text-slate-100 leading-relaxed text-xs">
                      <MarkdownRenderer content={msg.response.answer_markdown || msg.response.summary || ''} />
                    </div>

                    {/* Dual Risk Status Banner if present */}
                    {msg.response.predictive_signal && (
                      <div className="p-3.5 rounded-lg bg-[#0D100F] border border-[#1B211E] grid grid-cols-2 sm:grid-cols-4 gap-3 text-center font-mono">
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider block">{t('currentRisk')}</span>
                          <span className="text-sm font-bold text-amber-400 mt-0.5 block">
                            {msg.response.predictive_signal.current_risk_score.toFixed(1)} / 100
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider block">{t('predictedRisk')}</span>
                          <span className="text-sm font-bold text-rose-400 mt-0.5 block">
                            {msg.response.predictive_signal.predicted_risk_score.toFixed(1)} / 100
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider block">{t('horizon')}</span>
                          <span className="text-xs font-bold text-cyan-400 mt-1 block">
                            {msg.response.predictive_signal.horizon}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider block">{t('probability')}</span>
                          <span className="text-xs font-bold text-emerald-400 mt-1 block">
                            {(msg.response.predictive_signal.probability * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Evidence & Provenance Cards */}
                    {msg.response.evidence && msg.response.evidence.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10.5px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                            <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
                            Grounded Document Evidence ({msg.response.evidence.length} Sources)
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">Click card to inspect source</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {msg.response.evidence.map((ev, idx) => (
                            <div
                              key={idx}
                              onClick={() => setSelectedEvidence(ev)}
                              className="p-3 rounded-lg bg-[#0D100F] hover:bg-[#121614] border border-[#1B211E] hover:border-[#27302B] text-xs space-y-1.5 cursor-pointer transition-colors group"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <span className="font-bold text-amber-400 group-hover:text-amber-300 transition-colors line-clamp-1 font-sans">
                                  {ev.source_title || ev.title}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-400 line-clamp-2 font-sans">
                                {ev.excerpt || ev.description}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-[#0D100F] border border-[#1B211E] text-slate-400 text-xs font-mono">
            <RefreshCw className="w-4 h-4 text-amber-400 animate-spin" />
            <span>Conducting RAG retrieval across government and mine block archives...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendQuery();
        }}
        className="flex items-center gap-2 p-2 rounded-xl bg-[#0D100F] border border-[#1B211E] focus-within:border-amber-500/50 transition-colors shadow-xs"
      >
        <input
          type="text"
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          placeholder={t('askCopilotPlaceholder')}
          disabled={isLoading}
          className="flex-1 bg-transparent px-3 py-2 text-xs text-slate-100 placeholder-slate-400 focus:outline-none font-sans"
        />
        <button
          type="submit"
          disabled={isLoading || !inputQuery.trim()}
          className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-bold text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
        >
          <span>{t('sendQuery')}</span>
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>

      {/* Source Inspector Modal */}
      {selectedEvidence && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs font-sans">
          <div className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-xl bg-[#0D100F] border border-[#1B211E] p-6 space-y-4 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 pb-3 border-b border-[#1B211E]">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Landmark className="w-5 h-5 text-amber-400" />
                  <h3 className="text-base font-bold text-white">
                    {selectedEvidence.source_title || selectedEvidence.title}
                  </h3>
                </div>
                <p className="text-xs text-slate-400">
                  {selectedEvidence.organization || 'Statutory Source Archive'}
                </p>
              </div>
              <button
                onClick={() => setSelectedEvidence(null)}
                className="p-1.5 rounded-lg bg-[#121614] hover:bg-[#1B211E] text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Badges Bar */}
            <div className="flex flex-wrap items-center gap-2">
              {renderTierBadge(selectedEvidence.source_tier)}
              {renderStatusBadge(selectedEvidence.status)}
            </div>

            {/* Verbatim Excerpt */}
            <div className="space-y-1.5">
              <span className="text-xs font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-amber-400" />
                Verbatim Extracted Excerpt
              </span>
              <div className="p-4 rounded-lg bg-[#080A09] border border-[#1B211E] text-slate-300 text-xs leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap font-mono">
                {selectedEvidence.excerpt || selectedEvidence.description || 'No excerpt available.'}
              </div>
            </div>

            {/* Footer */}
            <div className="pt-2 flex items-center justify-between text-xs text-slate-400 border-t border-[#1B211E]">
              <span>TRINETRA Evidence Provenance Guarantee</span>
              <button
                onClick={() => setSelectedEvidence(null)}
                className="px-4 py-2 rounded-lg bg-[#121614] hover:bg-[#1B211E] text-slate-200 border border-[#27302B] font-mono text-xs cursor-pointer transition-colors"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};
