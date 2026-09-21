import React, { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { MobileCard } from '../components/MobileCard';
import { TouchButton } from '../components/TouchButton';
import { 
  Sparkles, 
  Send, 
  Mic, 
  BookOpen, 
  Flame, 
  ShieldAlert, 
  CheckCircle2, 
  Info,
  Layers3
} from 'lucide-react';

export const MobileCopilotScreen: React.FC = () => {
  const { t } = useLanguage();
  const [query, setQuery] = useState('');
  const [notice, setNotice] = useState<string | null>(null);

  const quickPrompts = [
    {
      title: 'CH₄ & Gas Statutory Limits',
      desc: 'DGMS CMR 2017 Regulation 169 maximum permissible gas limits',
      icon: <Flame className="w-4 h-4 text-amber-400" />,
    },
    {
      title: 'Auxiliary Ventilation Velocity',
      desc: 'Minimum airflow velocity rules at underground blind headings',
      icon: <ShieldAlert className="w-4 h-4 text-red-400" />,
    },
    {
      title: 'Strata Support (Rock Bolts)',
      desc: 'DGMS guidelines for resin bolt installation and pull testing',
      icon: <BookOpen className="w-4 h-4 text-cyan-400" />,
    },
    {
      title: 'Emergency Evacuation SOP',
      desc: 'Self-rescuer deployment protocol and refuge bay markers',
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
    },
  ];

  const handlePromptClick = (title: string) => {
    setQuery(title);
    setNotice(`Field Copilot engine activates in MOBILE-08. Prompt prepared: "${title}"`);
    setTimeout(() => setNotice(null), 4000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setNotice(`Mobile Copilot engine activates in MOBILE-08. Input recorded: "${query}"`);
    setTimeout(() => setNotice(null), 4000);
  };

  return (
    <div className="space-y-4 pb-20 max-w-lg mx-auto">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-100 font-sans">
            {t('aiCopilot')}
          </h2>
          <span className="text-[11px] font-mono text-slate-400">
            Field Intelligence Assistant • DGMS & Safety Guidance
          </span>
        </div>
        <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
          MOBILE-01
        </span>
      </div>

      {/* Notice */}
      {notice && (
        <div className="rounded-xl bg-indigo-500/15 border border-indigo-500/30 p-3 text-xs text-indigo-200 flex items-center gap-2">
          <Info className="w-4 h-4 text-indigo-400 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* Copilot Hero Card */}
      <div className="rounded-2xl bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-900 border border-indigo-500/30 p-4 space-y-2 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-100 font-sans">
              TRINETRA Mining AI Assistant
            </h3>
            <p className="text-xs text-slate-400 font-sans">
              Statutory regulations, gas thresholds, and SOP verification in the field.
            </p>
          </div>
        </div>
      </div>

      {/* Quick Field Guidance Prompts */}
      <div className="space-y-2">
        <span className="font-mono text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
          Quick Statutory References
        </span>

        <div className="space-y-2">
          {quickPrompts.map((p, idx) => (
            <MobileCard
              key={idx}
              interactive
              onClick={() => handlePromptClick(p.title)}
              className="p-3.5 flex items-start gap-3 bg-slate-900/90 hover:border-slate-750"
            >
              <div className="p-2 rounded-xl bg-slate-800 shrink-0 mt-0.5">
                {p.icon}
              </div>
              <div className="space-y-0.5 flex-1">
                <div className="font-semibold text-xs text-slate-200">{p.title}</div>
                <div className="text-[11px] text-slate-400 font-sans leading-relaxed">{p.desc}</div>
              </div>
            </MobileCard>
          ))}
        </div>
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="pt-2">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask statutory regulation, SOP or limits..."
            className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 min-h-[48px]"
          />
          <TouchButton
            type="submit"
            variant="primary"
            size="md"
            className="shrink-0 min-h-[48px] min-w-[48px] px-3 !bg-indigo-600 hover:!bg-indigo-500"
            icon={<Send className="w-4 h-4 text-white" />}
          >
            Ask
          </TouchButton>
        </div>
      </form>
    </div>
  );
};
