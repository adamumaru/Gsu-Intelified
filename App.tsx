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
import { mockApiService } from './services/mockApiService';
import { locales } from './locales';
import { useLocalization } from './hooks/useLocalization';
import { SafeCallModal } from './components/SafeCallModal';
import { supabase } from './services/supabaseClient';

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
  const [leaderboard, setLeaderboard] = useState<Omit<User, 'email' | 'matricNumber' | 'role' | 'qrcodes'>[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSessionLoading, setIsSessionLoading] = useState(true);
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

  // Supabase Session and Auth Listener
  useEffect(() => {
    // Check for active session on load
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const profile = await mockApiService.getUserProfile(session.user.id);
        if (profile) {
          profile.email = session.user.email || '';
          setCurrentUser(profile);
          setAuthState('authenticated');
        }
      }
      setIsSessionLoading(false);
    }).catch(() => {
      setIsSessionLoading(false);
    });

    // Listen to real-time auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const profile = await mockApiService.getUserProfile(session.user.id);
        if (profile) {
          profile.email = session.user.email || '';
          setCurrentUser(profile);
          setAuthState('authenticated');
        }
      } else {
        setCurrentUser(null);
        setAuthState('unauthenticated');
      }
      setIsSessionLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const fetchedLostItems = await mockApiService.getLostItems();
    const fetchedFoundItems = await mockApiService.getFoundItems();
    const fetchedLeaderboard = await mockApiService.getLeaderboard();
    setLostItems(fetchedLostItems);
    setFoundItems(fetchedFoundItems);
    setLeaderboard(fetchedLeaderboard);
    setIsLoading(false);
  };

  useEffect(() => {
    if (authState === 'authenticated') {
      loadData();
    }
  }, [authState]);
  
  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setAuthState('authenticated');
  };
  
  const handleLogout = async () => {
    setIsLoading(true);
    await supabase.auth.signOut();
    setCurrentUser(null);
    setAuthState('unauthenticated');
    setView('dashboard');
    setIsLoading(false);
  }

  const handleItemReported = (item: Item) => {
    if (item.status === 'lost') {
      setLostItems(prev => [item, ...prev]);
    } else {
      setFoundItems(prev => [item, ...prev]);
    }
    setView('dashboard');
    loadData(); // Reload all data to keep it fully synced with the DB
  };
  
  const handleInitiateCall = (match: Match) => {
    const counterpartName = currentUser?.id === match.ownerId ? match.finderName : match.ownerName;
    const counterpartRole = currentUser?.id === match.ownerId ? 'finder' : 'owner';
    setCallCounterpart({ name: counterpartName, role: counterpartRole });
    setCallStatus('ringing');
    mockApiService.initiateCall(match.id).then((callRes) => {
      setCallStatus('connected');
      // Store current call ID on window for simulator references
      (window as any).currentCallId = callRes.callId;
    });
  }
  
  const handleEndCall = () => {
    const callId = (window as any).currentCallId || 'call_fallback';
    mockApiService.endCall(callId);
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
        const userItems = [...lostItems, ...foundItems].filter(item => item.userId === currentUser?.id);
        return <ProfileView user={currentUser!} leaderboard={leaderboard} userItems={userItems} onBack={() => setView('dashboard')} />;
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
  
  if (isSessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-warm-gray dark:bg-gray-900">
        <Spinner />
      </div>
    );
  }

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