import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useMineContext } from '../../context/MineContext';
import { useLanguage } from '../../context/LanguageContext';
import { NetworkStatusBadge } from './NetworkStatusBadge';
import { MineSelectorModal } from './MineSelectorModal';
import { ChevronDown, Shield, User as UserIcon } from 'lucide-react';
import { MobileTab } from '../types/mobile';

interface MobileTopBarProps {
  onNavigateTab: (tab: MobileTab) => void;
}

export const MobileTopBar: React.FC<MobileTopBarProps> = ({ onNavigateTab }) => {
  const { user } = useAuth();
  const { selectedMine } = useMineContext();
  const { t } = useLanguage();
  const [mineModalOpen, setMineModalOpen] = useState(false);

  const primaryRole = user?.roles?.[0]?.replace(/_/g, ' ') || 'FIELD OPERATOR';

  return (
    <>
      <header className="sticky top-0 z-40 bg-[#080A09]/95 backdrop-blur-md border-b border-slate-800/80 px-4 py-2.5 flex items-center justify-between gap-2 touch-manipulation">
        {/* Left: Brand + Field Subtitle */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-slate-950 font-bold text-sm shadow-md shadow-amber-500/20">
            <Shield className="w-4 h-4 fill-slate-950" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 leading-none">
              <span className="font-mono font-bold text-sm text-slate-100 tracking-tight">
                TRINETRA
              </span>
              <span className="text-[10px] font-mono font-black uppercase px-1.5 py-0.2 rounded bg-amber-500 text-slate-950">
                FIELD
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono tracking-wider">
              {t('fieldIntelligence')}
            </span>
          </div>
        </div>

        {/* Center: Mine Selector Button */}
        <button
          onClick={() => setMineModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 active:scale-95 transition-all max-w-[140px] sm:max-w-[180px] min-h-[44px]"
          title="Switch Mine"
          aria-label="Select Mine"
        >
          <div className="text-left truncate">
            <div className="text-[10px] font-mono text-amber-400 uppercase leading-none truncate">
              {selectedMine?.code || 'MINE'}
            </div>
            <div className="text-xs font-semibold text-slate-200 truncate leading-tight">
              {selectedMine?.name || t('selectMinePrompt')}
            </div>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        </button>

        {/* Right: Network Status + User Avatar */}
        <div className="flex items-center gap-2 shrink-0">
          <NetworkStatusBadge />

          <button
            onClick={() => onNavigateTab('more')}
            className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-300 hover:text-amber-400 active:scale-95 transition-all"
            title={`${user?.full_name || 'User'} (${primaryRole})`}
            aria-label="User Profile"
          >
            <UserIcon className="w-4 h-4" />
          </button>
        </div>
      </header>

      <MineSelectorModal
        isOpen={mineModalOpen}
        onClose={() => setMineModalOpen(false)}
      />
    </>
  );
};
