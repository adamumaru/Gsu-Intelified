import React, { useState, useEffect, createContext } from 'react';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { ReportItemView } from './components/ReportItemView';
import { AdminView } from './components/AdminView';
import { AIChatWidget } from './components/AIChatWidget';
import { AuthView } from './components/AuthView';
import { ProfileView } from './components/ProfileView';
import { MapView } from './components/MapView';
import type { Item, User, Match } from './types';
import { mockLeaderboard } from './constants';
import { mockApiService } from './services/mockApiService';
import { locales } from './locales';
import { useLocalization } from './hooks/useLocalization';
import { SafeCallModal } from './components/SafeCallModal';

type View = 'dashboard' | 'reportLost' | 'reportFound' | 'admin' | 'profile' | 'map';
type AuthState = 'unauthenticated' | 'authenticated';
type Theme = 'light' | 'dark';
type CallStatus = 'idle' | 'ringing' | 'connected' | 'ended';

export const LocalizationContext = createContext({
  language: 'en',
  setLanguage: (lang: string) => {},
  t: (key: string) => key,
});

const AppContent: React.FC = () => {
  const [view, setView] = useState<View>('dashboard');
  const [authState, setAuthState] = useState<AuthState>('unauthenticated');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [lostItems, setLostItems] = useState<Item[]>([]);
  const [foundItems, setFoundItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [theme, setTheme] = useState<Theme>('light');
  
  // State for Safe Call Modal
  const [callStatus, setCallStatus] = useState<CallStatus>('idle');
  const [callCounterpart, setCallCounterpart] = useState<{name: string, role: 'owner' | 'finder'} | null>(null);

  const { t } = useLocalization();

  useEffect(() => {
    const localTheme = window.localStorage.getItem('theme') as Theme;
    if (localTheme) {
      setTheme(localTheme);
    }
  }, []);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    window.localStorage.setItem('theme', theme);
  }, [theme]);

  const loadData = async () => {
    setIsLoading(true);
    const fetchedLostItems = await mockApiService.getLostItems();
    const fetchedFoundItems = await mockApiService.getFoundItems();
    setLostItems(fetchedLostItems);
    setFoundItems(fetchedFoundItems);
    setIsLoading(false);
  };
  
  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setAuthState('authenticated');
    loadData();
  };
  
  const handleLogout = () => {
    setCurrentUser(null);
    setAuthState('unauthenticated');
  }

  const handleItemReported = (item: Item) => {
    if (item.status === 'lost') {
      setLostItems(prev => [item, ...prev]);
    } else {
      setFoundItems(prev => [item, ...prev]);
    }
    setView('dashboard');
  };
  
  const handleInitiateCall = (match: Match) => {
    // In a real app, you'd distinguish between owner and finder
    const counterpartName = currentUser?.id === match.ownerId ? match.finderName : match.ownerName;
    const counterpartRole = currentUser?.id === match.ownerId ? 'finder' : 'owner';
    setCallCounterpart({ name: counterpartName, role: counterpartRole });
    setCallStatus('ringing');
    mockApiService.initiateCall(match.id).then(() => {
      setCallStatus('connected');
    });
  }
  
  const handleEndCall = () => {
    mockApiService.endCall('call_123'); // a real app would use a dynamic call ID
    setCallStatus('ended');
    setTimeout(() => {
        setCallStatus('idle');
        setCallCounterpart(null);
    }, 2000); // Show "ended" screen for 2 seconds
  }

  const renderView = () => {
    if (isLoading) {
      return <div className="flex justify-center items-center h-64"><Spinner /></div>;
    }
    switch (view) {
      case 'reportLost':
        return <ReportItemView type="lost" onReportSubmit={handleItemReported} onBack={() => setView('dashboard')} />;
      case 'reportFound':
        return <ReportItemView type="found" onReportSubmit={handleItemReported} onBack={() => setView('dashboard')} />;
      case 'admin':
        return <AdminView allItems={[...lostItems, ...foundItems]}/>;
      case 'profile':
        return <ProfileView user={currentUser!} leaderboard={mockLeaderboard} onBack={() => setView('dashboard')} />;
      case 'map':
        return <MapView />;
      case 'dashboard':
      default:
        return <Dashboard 
                  user={currentUser!} 
                  lostItems={lostItems} 
                  foundItems={foundItems} 
                  onReportLost={() => setView('reportLost')}
                  onReportFound={() => setView('reportFound')}
                  onInitiateCall={handleInitiateCall}
                  onRefreshData={loadData}
                />;
    }
  };
  
  if (authState === 'unauthenticated') {
    return <AuthView onLoginSuccess={handleLoginSuccess} />
  }

  return (
    <div className="min-h-screen bg-warm-gray dark:bg-gray-900 font-sans text-deep-navy dark:text-warm-gray transition-colors duration-300">
      <Header 
        user={currentUser} 
        setView={setView} 
        onLogout={handleLogout} 
        theme={theme} 
        toggleTheme={() => setTheme(t => t === 'light' ? 'dark' : 'light')} 
      />
      <main className="container mx-auto p-4 md:p-6">
        {renderView()}
      </main>
      <AIChatWidget />
       <SafeCallModal 
          status={callStatus}
          counterpart={callCounterpart}
          onEndCall={handleEndCall}
       />
    </div>
  );
};

const App: React.FC = () => {
  const [language, setLanguage] = useState('en');
  
  const t = (key: string) => {
    const lang = locales[language] || locales.en;
    return lang[key] || key;
  };

  return (
    <LocalizationContext.Provider value={{ language, setLanguage, t }}>
       <AppContent />
    </LocalizationContext.Provider>
  )
}

const Spinner: React.FC = () => (
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-green"></div>
);

export default App;