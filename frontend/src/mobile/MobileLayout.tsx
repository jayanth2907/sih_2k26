import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { MobileTab } from './types/mobile';
import { MobileTopBar } from './components/MobileTopBar';
import { MobileBottomNav } from './components/MobileBottomNav';
import { MobileHomeScreen } from './screens/MobileHomeScreen';
import { MobileTasksScreen } from './screens/MobileTasksScreen';
import { MobileMapScreen } from './screens/MobileMapScreen';
import { MobileCopilotScreen } from './screens/MobileCopilotScreen';
import { MobileMoreScreen } from './screens/MobileMoreScreen';
import { AlertTriangle, LogIn } from 'lucide-react';
import { TouchButton } from './components/TouchButton';

interface MobileLayoutProps {
  onSwitchToDesktop: () => void;
  initialTab?: MobileTab;
}

export const MobileLayout: React.FC<MobileLayoutProps> = ({
  onSwitchToDesktop,
  initialTab = 'home',
}) => {
  const { isAuthenticated, logout } = useAuth();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<MobileTab>(() => {
    const path = window.location.pathname;
    if (path.includes('/mobile/tasks')) return 'tasks';
    if (path.includes('/mobile/map')) return 'map';
    if (path.includes('/mobile/copilot')) return 'copilot';
    if (path.includes('/mobile/more')) return 'more';
    return initialTab;
  });

  // Sync tab changes to URL pathname without page reloads
  const handleTabChange = (tab: MobileTab) => {
    setActiveTab(tab);
    const newPath = tab === 'home' ? '/mobile' : `/mobile/${tab}`;
    if (window.location.pathname !== newPath) {
      window.history.pushState({ tab }, '', newPath);
    }
  };

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path.includes('/mobile/tasks')) setActiveTab('tasks');
      else if (path.includes('/mobile/map')) setActiveTab('map');
      else if (path.includes('/mobile/copilot')) setActiveTab('copilot');
      else if (path.includes('/mobile/more')) setActiveTab('more');
      else if (path.startsWith('/mobile')) setActiveTab('home');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Unauthenticated / Session Expired Guard
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#080A09] text-slate-100 flex items-center justify-center p-6">
        <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-4 text-center">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 className="font-bold text-base text-slate-100 font-sans">
              {t('sessionExpired')}
            </h2>
            <p className="text-xs text-slate-400 font-sans leading-relaxed">
              {t('sessionExpiredDesc')}
            </p>
          </div>
          <TouchButton
            variant="primary"
            fullWidth
            size="lg"
            onClick={() => {
              window.location.href = '/login';
            }}
            icon={<LogIn className="w-4 h-4" />}
          >
            {t('signInAgain')}
          </TouchButton>
        </div>
      </div>
    );
  }

  const renderScreen = () => {
    switch (activeTab) {
      case 'home':
        return <MobileHomeScreen onNavigateTab={handleTabChange} />;
      case 'tasks':
        return <MobileTasksScreen />;
      case 'map':
        return <MobileMapScreen />;
      case 'copilot':
        return <MobileCopilotScreen />;
      case 'more':
        return <MobileMoreScreen onSwitchToDesktop={onSwitchToDesktop} />;
      default:
        return <MobileHomeScreen onNavigateTab={handleTabChange} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#080A09] text-slate-100 font-sans flex flex-col antialiased selection:bg-amber-500 selection:text-slate-950">
      {/* Fixed Mobile Top Bar */}
      <MobileTopBar onNavigateTab={handleTabChange} />

      {/* Main Screen Content Viewport */}
      <main className="flex-1 p-4 pb-24 overflow-y-auto w-full max-w-lg mx-auto touch-manipulation">
        {renderScreen()}
      </main>

      {/* Fixed Mobile Bottom Navigation */}
      <MobileBottomNav activeTab={activeTab} onTabChange={handleTabChange} />
    </div>
  );
};
