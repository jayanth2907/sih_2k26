import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { MineProvider } from './context/MineContext';
import { LanguageProvider } from './context/LanguageContext';
import { FieldLoginScreen } from './screens/FieldLoginScreen';
import { MobileTab } from './types/mobile';
import { MobileTopBar } from './components/MobileTopBar';
import { MobileBottomNav } from './components/MobileBottomNav';
import { MobileHomeScreen } from './screens/MobileHomeScreen';
import { MobileTasksScreen } from './screens/MobileTasksScreen';
import { MobileMapScreen } from './screens/MobileMapScreen';
import { MobileIncidentResponseScreen } from './screens/MobileIncidentResponseScreen';
import { MobileCopilotScreen } from './screens/MobileCopilotScreen';
import { MobileMoreScreen } from './screens/MobileMoreScreen';
import { MobileNotificationsScreen } from './screens/MobileNotificationsScreen';
import { MobileSyncCenterScreen } from './screens/MobileSyncCenterScreen';
import { MobileReviewCenterScreen } from './screens/MobileReviewCenterScreen';
import { MobileDocumentsScreen } from './screens/MobileDocumentsScreen';
import { MobileWorkforceScreen } from './screens/MobileWorkforceScreen';
import { MobileFieldReportingScreen } from './screens/MobileFieldReportingScreen';
import { MobileContractorScreen } from './screens/MobileContractorScreen';
import { MobileGrievanceScreen } from './screens/MobileGrievanceScreen';
import { MobileRiskIntelligenceScreen } from './screens/MobileRiskIntelligenceScreen';

const FieldAppLayout: React.FC = () => {
  const [activeTab, setActiveTab] = useState<MobileTab>(() => {
    const path = window.location.pathname.toLowerCase();
    if (path.includes('/tasks')) return 'tasks';
    if (path.includes('/map')) return 'map';
    if (path.includes('/incidents')) return 'incidents';
    if (path.includes('/copilot')) return 'copilot';
    if (path.includes('/more')) return 'more';
    if (path.includes('/notifications')) return 'notifications';
    if (path.includes('/sync')) return 'sync';
    if (path.includes('/reviews')) return 'reviews';
    if (path.includes('/documents')) return 'documents';
    if (path.includes('/workforce')) return 'workforce';
    if (path.includes('/reporting')) return 'reporting';
    if (path.includes('/contractors')) return 'contractors';
    if (path.includes('/grievances')) return 'grievances';
    if (path.includes('/intelligence')) return 'intelligence';
    return 'home';
  });

  const handleTabChange = (tab: MobileTab) => {
    setActiveTab(tab);
    const newPath = tab === 'home' ? '/' : `/${tab}`;
    if (window.location.pathname !== newPath) {
      window.history.pushState({ tab }, '', newPath);
    }
  };

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.toLowerCase();
      if (path.includes('/tasks')) setActiveTab('tasks');
      else if (path.includes('/map')) setActiveTab('map');
      else if (path.includes('/incidents')) setActiveTab('incidents');
      else if (path.includes('/copilot')) setActiveTab('copilot');
      else if (path.includes('/more')) setActiveTab('more');
      else if (path.includes('/notifications')) setActiveTab('notifications');
      else if (path.includes('/sync')) setActiveTab('sync');
      else if (path.includes('/reviews')) setActiveTab('reviews');
      else if (path.includes('/documents')) setActiveTab('documents');
      else if (path.includes('/workforce')) setActiveTab('workforce');
      else if (path.includes('/reporting')) setActiveTab('reporting');
      else if (path.includes('/contractors')) setActiveTab('contractors');
      else if (path.includes('/grievances')) setActiveTab('grievances');
      else if (path.includes('/intelligence')) setActiveTab('intelligence');
      else setActiveTab('home');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const renderScreen = () => {
    switch (activeTab) {
      case 'home':
        return <MobileHomeScreen onNavigateTab={handleTabChange} />;
      case 'tasks':
        return <MobileTasksScreen onNavigateTab={handleTabChange} />;
      case 'map':
        return <MobileMapScreen />;
      case 'incidents':
        return <MobileIncidentResponseScreen onNavigateTab={handleTabChange} />;
      case 'copilot':
        return <MobileCopilotScreen />;
      case 'notifications':
        return <MobileNotificationsScreen onNavigateTab={handleTabChange} />;
      case 'sync':
        return <MobileSyncCenterScreen onBack={() => handleTabChange('home')} onNavigateTab={handleTabChange} />;
      case 'reviews':
        return <MobileReviewCenterScreen onBack={() => handleTabChange('home')} onNavigateTab={handleTabChange} />;
      case 'documents':
        return <MobileDocumentsScreen onBack={() => handleTabChange('home')} onNavigateTab={handleTabChange} />;
      case 'workforce':
        return <MobileWorkforceScreen onBack={() => handleTabChange('home')} onNavigateTab={handleTabChange} />;
      case 'reporting':
        return <MobileFieldReportingScreen onBack={() => handleTabChange('home')} onNavigateTab={handleTabChange} />;
      case 'contractors':
        return <MobileContractorScreen onBack={() => handleTabChange('home')} onNavigateTab={handleTabChange} />;
      case 'grievances':
        return <MobileGrievanceScreen onBack={() => handleTabChange('home')} onNavigateTab={handleTabChange} />;
      case 'intelligence':
        return <MobileRiskIntelligenceScreen onBack={() => handleTabChange('home')} onNavigateTab={handleTabChange} />;
      case 'more':
        return <MobileMoreScreen onNavigateTab={handleTabChange} />;
      default:
        return <MobileHomeScreen onNavigateTab={handleTabChange} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#080A09] text-slate-100 font-sans flex flex-col antialiased selection:bg-amber-500 selection:text-slate-950">
      {/* Fixed Field Top Bar */}
      <MobileTopBar onNavigateTab={handleTabChange} />

      {/* Main Screen Content Viewport */}
      <main className="flex-1 p-4 pb-24 overflow-y-auto w-full max-w-lg mx-auto touch-manipulation">
        {renderScreen()}
      </main>

      {/* Fixed Field Bottom Navigation */}
      <MobileBottomNav activeTab={activeTab} onTabChange={handleTabChange} />
    </div>
  );
};

const MainFieldApp: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 font-mono text-xs">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin"></div>
          <span>INITIALIZING TRINETRA FIELD APP...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <FieldLoginScreen />;
  }

  return (
    <MineProvider>
      <FieldAppLayout />
    </MineProvider>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <LanguageProvider>
        <MainFieldApp />
      </LanguageProvider>
    </AuthProvider>
  );
};

export default App;
