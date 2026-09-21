import React from 'react';
import { Home, CheckSquare, MapPin, Sparkles, MoreHorizontal } from 'lucide-react';
import { MobileTab } from '../types/mobile';
import { useLanguage } from '../../context/LanguageContext';
import clsx from 'clsx';

interface MobileBottomNavProps {
  activeTab: MobileTab;
  onTabChange: (tab: MobileTab) => void;
  taskBadgeCount?: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onTabChange,
  taskBadgeCount = 0,
}) => {
  const { t } = useLanguage();

  const navItems: Array<{
    id: MobileTab;
    label: string;
    icon: React.ReactNode;
    badge?: number;
  }> = [
    {
      id: 'home',
      label: t('mobileHome'),
      icon: <Home className="w-5 h-5" />,
    },
    {
      id: 'tasks',
      label: t('mobileTasks'),
      icon: <CheckSquare className="w-5 h-5" />,
      badge: taskBadgeCount,
    },
    {
      id: 'map',
      label: t('mobileMap'),
      icon: <MapPin className="w-5 h-5" />,
    },
    {
      id: 'copilot',
      label: t('mobileCopilot'),
      icon: <Sparkles className="w-5 h-5" />,
    },
    {
      id: 'more',
      label: t('mobileMore'),
      icon: <MoreHorizontal className="w-5 h-5" />,
    },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-[#0B0F19]/95 backdrop-blur-lg border-t border-slate-800/90 px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] touch-manipulation select-none"
      role="navigation"
      aria-label="Mobile Navigation"
    >
      <div className="max-w-md mx-auto grid grid-cols-5 gap-1">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={clsx(
                'flex flex-col items-center justify-center py-1 rounded-xl transition-all min-h-[48px] relative active:scale-95',
                isActive
                  ? 'text-amber-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 active:text-slate-100'
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className="relative">
                {item.icon}
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1 -right-2 bg-amber-500 text-slate-950 font-bold text-[9px] font-mono px-1 rounded-full min-w-[14px] h-[14px] flex items-center justify-center">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight font-sans">
                {item.label}
              </span>
              {isActive && (
                <span className="absolute bottom-0.5 w-6 h-0.5 bg-amber-500 rounded-full shadow-sm shadow-amber-500/50" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
