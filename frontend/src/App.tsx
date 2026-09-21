import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { MineProvider } from './context/MineContext';
import { LanguageProvider } from './context/LanguageContext';
import { LoginPage } from './pages/LoginPage';
import { AppLayout } from './layouts/AppLayout';
import { MobileLayout } from './mobile/MobileLayout';

const MainApp: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [isMobileMode, setIsMobileMode] = useState<boolean>(() => {
    return window.location.pathname.startsWith('/mobile') || (window.innerWidth < 768 && window.location.pathname !== '/');
  });

  useEffect(() => {
    const handlePopState = () => {
      setIsMobileMode(window.location.pathname.startsWith('/mobile'));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const switchToDesktop = () => {
    setIsMobileMode(false);
    if (window.location.pathname.startsWith('/mobile')) {
      window.history.pushState({}, '', '/');
    }
  };

  const switchToMobile = () => {
    setIsMobileMode(true);
    if (!window.location.pathname.startsWith('/mobile')) {
      window.history.pushState({}, '', '/mobile');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 font-mono text-xs">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin"></div>
          <span>INITIALIZING TRINETRA GOVERNANCE CORE...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <MineProvider>
      {isMobileMode ? (
        <MobileLayout onSwitchToDesktop={switchToDesktop} />
      ) : (
        <AppLayout onSwitchToMobile={switchToMobile} />
      )}
    </MineProvider>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <LanguageProvider>
        <MainApp />
      </LanguageProvider>
    </AuthProvider>
  );
};

export default App;

