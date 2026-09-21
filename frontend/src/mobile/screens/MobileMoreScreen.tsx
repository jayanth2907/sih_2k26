import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useMineContext } from '../../context/MineContext';
import { useLanguage } from '../../context/LanguageContext';
import { SupportedLanguage } from '../../i18n/translations';
import { MobileCard } from '../components/MobileCard';
import { TouchButton } from '../components/TouchButton';
import { MineSelectorModal } from '../components/MineSelectorModal';
import { 
  User as UserIcon, 
  Pickaxe, 
  Languages, 
  Activity, 
  Monitor, 
  LogOut, 
  ShieldCheck, 
  Check, 
  ChevronRight,
  Database,
  Smartphone
} from 'lucide-react';
import clsx from 'clsx';

interface MobileMoreScreenProps {
  onSwitchToDesktop: () => void;
}

export const MobileMoreScreen: React.FC<MobileMoreScreenProps> = ({ onSwitchToDesktop }) => {
  const { user, logout } = useAuth();
  const { selectedMine } = useMineContext();
  const { language, setLanguage, t } = useLanguage();

  const [mineModalOpen, setMineModalOpen] = useState(false);

  const languages: Array<{ code: SupportedLanguage; label: string; native: string }> = [
    { code: 'en', label: 'English', native: 'English' },
    { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
    { code: 'te', label: 'Telugu', native: 'తెలుగు' },
  ];

  const primaryRole = user?.roles?.[0]?.replace(/_/g, ' ') || 'FIELD OPERATOR';

  return (
    <div className="space-y-4 pb-20 max-w-lg mx-auto">
      {/* User Profile Card */}
      <MobileCard className="p-4 bg-slate-900 border-slate-800 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-base">
            <UserIcon className="w-6 h-6" />
          </div>
          <div className="space-y-0.5">
            <h3 className="font-bold text-sm text-slate-100 font-sans">
              {user?.full_name || 'Field Operator'}
            </h3>
            <p className="text-xs text-slate-400 font-mono">
              {user?.email}
            </p>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-800 text-amber-400 font-mono text-[10px] font-semibold uppercase border border-slate-700">
              <ShieldCheck className="w-3 h-3 text-amber-400" />
              <span>{primaryRole}</span>
            </div>
          </div>
        </div>
      </MobileCard>

      {/* Authorized Mine Section */}
      <div className="space-y-2">
        <span className="font-mono text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
          {t('authorizedMines')}
        </span>

        <MobileCard
          interactive
          onClick={() => setMineModalOpen(true)}
          className="p-4 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-slate-800 text-amber-400">
              <Pickaxe className="w-5 h-5" />
            </div>
            <div>
              <div className="font-semibold text-xs text-slate-200">
                {selectedMine?.name || t('selectMinePrompt')}
              </div>
              <div className="text-[11px] text-slate-400 font-mono">
                {selectedMine?.code} • {selectedMine?.district || selectedMine?.state}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs text-amber-400 font-mono font-semibold">
            <span>{t('switchMine')}</span>
            <ChevronRight className="w-4 h-4" />
          </div>
        </MobileCard>
      </div>

      {/* Multilingual Language Switcher */}
      <div className="space-y-2">
        <span className="font-mono text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
          {t('languageSelection')}
        </span>

        <MobileCard className="p-3">
          <div className="grid grid-cols-3 gap-2">
            {languages.map((lang) => {
              const isSelected = language === lang.code;
              return (
                <button
                  key={lang.code}
                  onClick={() => setLanguage(lang.code)}
                  className={clsx(
                    'p-2.5 rounded-xl border flex flex-col items-center justify-center transition-all min-h-[52px] active:scale-95',
                    isSelected
                      ? 'bg-amber-500/15 border-amber-500 text-slate-100 shadow-sm'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  )}
                >
                  <span className="text-xs font-bold font-sans">{lang.native}</span>
                  <span className="text-[10px] font-mono text-slate-400">{lang.label}</span>
                </button>
              );
            })}
          </div>
        </MobileCard>
      </div>

      {/* System Diagnostics */}
      <div className="space-y-2">
        <span className="font-mono text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
          {t('systemDiagnostics')}
        </span>

        <MobileCard className="p-4 space-y-2 text-xs font-mono">
          <div className="flex justify-between text-slate-300 pb-1.5 border-b border-slate-800">
            <span className="text-slate-400">Mobile Shell:</span>
            <span className="text-amber-400 font-bold">TRINETRA FIELD v1.0 (MOBILE-01)</span>
          </div>
          <div className="flex justify-between text-slate-300 pb-1.5 border-b border-slate-800">
            <span className="text-slate-400">PWA Mode:</span>
            <span className="text-emerald-400">Standalone Web App</span>
          </div>
          <div className="flex justify-between text-slate-300 pb-1.5 border-b border-slate-800">
            <span className="text-slate-400">API Endpoint:</span>
            <span className="text-slate-300 truncate max-w-[180px]">{import.meta.env.VITE_API_URL || '/api/v1'}</span>
          </div>
          <div className="flex justify-between text-slate-300">
            <span className="text-slate-400">Offline Queue:</span>
            <span className="text-slate-300">Local DB Active</span>
          </div>
        </MobileCard>
      </div>

      {/* Desktop Portal Switcher */}
      <TouchButton
        variant="secondary"
        fullWidth
        size="lg"
        onClick={onSwitchToDesktop}
        icon={<Monitor className="w-5 h-5 text-amber-400" />}
      >
        {t('desktopPortalLink')}
      </TouchButton>

      {/* Sign Out Button */}
      <TouchButton
        variant="danger"
        fullWidth
        size="lg"
        onClick={logout}
        icon={<LogOut className="w-5 h-5 text-white" />}
      >
        {t('signOutButton')}
      </TouchButton>

      <MineSelectorModal
        isOpen={mineModalOpen}
        onClose={() => setMineModalOpen(false)}
      />
    </div>
  );
};
