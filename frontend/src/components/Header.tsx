import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useMineContext } from '../context/MineContext';
import { useLanguage } from '../context/LanguageContext';
import { MineSelector } from './MineSelector';
import { LogOut, Bot, Activity, Smartphone, Globe2, ChevronDown } from 'lucide-react';
import GradientMenu, { GradientMenuItem } from './ui/gradient-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

export const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const { setCurrentTab } = useMineContext();
  const { language, setLanguage } = useLanguage();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const topbarUtilityItems: GradientMenuItem[] = [
    {
      title: 'AI Copilot',
      icon: <Bot className="h-5 w-5" aria-hidden="true" />,
      gradientFrom: '#D6A243',
      gradientTo: '#9E7226',
      iconColor: 'text-[#D6A243]'
    },
    {
      title: 'Field App',
      icon: <Smartphone className="h-5 w-5" aria-hidden="true" />,
      gradientFrom: '#CBD1CE',
      gradientTo: '#9CA5A0',
      iconColor: 'text-[#626B63]'
    }
  ];

  const handleTopbarUtility = (item: GradientMenuItem) => {
    if (item.title === 'AI Copilot') setCurrentTab('copilot');
    if (item.title === 'Field App') setCurrentTab('field-operations');
  };

  return (
    <header className="min-h-16 bg-[#121513]/75 border-b border-[#232923]/80 backdrop-blur-xl sticky top-0 z-30 px-3 md:px-5 py-2 flex flex-wrap lg:flex-nowrap items-center justify-between gap-3 shadow-[0_8px_24px_rgba(0,0,0,0.12)]">
      {/* Left: Active Mine Switcher */}
      <div className="flex min-w-0 items-center">
        <MineSelector />
      </div>

      {/* Center: Combined system and telemetry status */}
      <div className="hidden lg:flex min-w-0 items-center rounded-xl border border-[#232923] bg-[#191D19]/85 px-4 py-2 shadow-[0_6px_18px_rgba(0,0,0,0.12)]">
        <button
          onClick={() => setCurrentTab('integrations-health')}
          title="Inspect Government Integrations & System Health"
          className="flex items-center gap-2.5 border-r border-[#303830] pr-5 text-left transition-colors hover:text-[#6EAA87]"
        >
          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#00C98B] shadow-[0_0_6px_rgba(0,201,139,0.35)] animate-pulse" />
          <span className="flex flex-col leading-none">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#626B63]">System</span>
            <span className="mt-1 text-[11px] font-mono font-semibold uppercase tracking-wide text-[#6EAA87]">Operational</span>
          </span>
        </button>
        <div className="flex items-center gap-2.5 pl-5 text-[11px] font-mono">
          <Activity className="h-4 w-4 shrink-0 text-[#D6A243]" />
          <span className="flex flex-col leading-none">
            <span className="text-[10px] uppercase tracking-wider text-[#626B63]">Telemetry</span>
            <span className="mt-1 whitespace-nowrap font-semibold uppercase tracking-wide text-[#D6A243]">Simulated</span>
          </span>
          <ChevronDown className="ml-2 h-3.5 w-3.5 text-[#626B63]" aria-hidden="true" />
        </div>
      </div>

      {/* Right: Language Switcher, Copilot Trigger, User Profile & Actions */}
      <div className="flex shrink-0 items-center gap-2.5">
        {/* Compact language selector */}
        <div className="hidden sm:flex items-center gap-2 text-[#8A9189]">
          <Globe2 className="h-3.5 w-3.5" aria-hidden="true" />
          <Select
            value={language}
            onValueChange={(value: string) => setLanguage(value as 'en' | 'hi' | 'te')}
          >
            <SelectTrigger aria-label="Select language">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="en">EN</SelectItem>
              <SelectItem value="hi">हिं</SelectItem>
              <SelectItem value="te">తె</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* AI Copilot and Field App utility actions */}
        <GradientMenu
          items={topbarUtilityItems}
          onSelect={handleTopbarUtility}
          compact
          className="shrink-0"
        />

        {/* Admin profile menu */}
        <div className="relative border-l border-[#232923] pl-2">
          <button
            onClick={() => setIsProfileOpen((open) => !open)}
            className="flex h-9 items-center gap-2 rounded-md px-2 text-left transition-colors hover:bg-white/[0.025] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D6A243]/60"
            aria-label="Open admin profile menu"
            aria-expanded={isProfileOpen}
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[#191D19] text-[#D6A243] font-bold text-xs font-mono">
              {user?.full_name ? user.full_name.charAt(0) : 'U'}
            </span>
            <span className="hidden lg:block text-left">
              <span className="block text-xs font-semibold text-[#E6E8E3] leading-tight">{user?.full_name || 'Authorized User'}</span>
              <span className="block text-[9.5px] text-[#D6A243] font-mono uppercase">
                {user?.roles?.[0]?.replace(/_/g, ' ') || 'SYSTEM OPERATOR'}
              </span>
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-[#626B63]" aria-hidden="true" />
          </button>
          {isProfileOpen && (
            <div className="absolute right-0 top-11 z-50 min-w-44 rounded-md border border-[#232923] bg-[#191D19] p-1.5 shadow-xl">
              <button
                onClick={logout}
                className="flex w-full items-center gap-2 rounded px-2.5 py-2 text-left text-xs text-[#8A9189] transition-colors hover:bg-rose-500/[0.08] hover:text-[#D96C68]"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
