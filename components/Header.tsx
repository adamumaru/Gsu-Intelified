import React, { useState, useRef, useEffect } from 'react';
import type { User } from '../types';
import { useLocalization } from '../hooks/useLocalization';

interface HeaderProps {
  user: User | null;
  setView: (view: 'dashboard' | 'admin' | 'profile' | 'map') => void;
  onLogout: () => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const LanguageSwitcher: React.FC = () => {
    const { language, setLanguage, t } = useLocalization();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const languages = {
        en: 'English',
        ha: 'Hausa',
        pi: 'Pidgin'
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={dropdownRef}>
            <button onClick={() => setIsOpen(!isOpen)} className="text-white hover:text-primary-gold transition-colors flex items-center">
                <GlobeIcon />
                <span className="ml-1 hidden sm:inline">{languages[language]}</span>
            </button>
            {isOpen && (
                <div className="absolute right-0 mt-2 w-32 bg-white dark:bg-deep-navy rounded-xl shadow-soft-lg py-1 z-50 border border-gray-200 dark:border-gray-700">
                    {Object.entries(languages).map(([code, name]) => (
                        <button key={code} onClick={() => { setLanguage(code); setIsOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-deep-navy dark:text-warm-gray hover:bg-warm-gray dark:hover:bg-gray-800">
                            {name}
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}

export const Header: React.FC<HeaderProps> = ({ user, setView, onLogout, theme, toggleTheme }) => {
  const { t } = useLocalization();
  const [showConfirmLogout, setShowConfirmLogout] = useState(false);
  const logoutRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (logoutRef.current && !logoutRef.current.contains(event.target as Node)) {
            setShowConfirmLogout(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="bg-deep-navy shadow-soft-lg sticky top-0 z-50">
      <div className="container mx-auto px-4 md:px-6 py-3 flex justify-between items-center">
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setView('dashboard')}>
            <img src="/favicon.png" className="w-10 h-10 object-contain rounded-xl" alt="GSU IntelliFind Logo" />
            <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">
              {t('appTitle')}
            </h1>
        </div>
        <nav className="flex items-center space-x-4">
          <button onClick={() => setView('dashboard')} className="text-white hover:text-primary-gold transition-colors font-medium hidden sm:block">{t('dashboard')}</button>
          <button onClick={() => setView('map')} className="text-white hover:text-primary-gold transition-colors font-medium hidden sm:block">{t('map')}</button>
          {user?.role === 'admin' && (
            <button onClick={() => setView('admin')} className="text-white hover:text-primary-gold transition-colors font-medium hidden sm:block">{t('admin')}</button>
          )}
           <LanguageSwitcher />
           <button onClick={toggleTheme} className="text-white hover:text-primary-gold transition-colors" aria-label="Toggle theme">
             {theme === 'light' ? <MoonIcon /> : <SunIcon />}
          </button>
          {user && (
            <div ref={logoutRef} className="flex items-center space-x-3 pl-3 border-l border-gray-600 relative">
                <div onClick={() => setView('profile')} className="flex items-center space-x-3 cursor-pointer">
                    <div className="text-right hidden sm:block font-sans">
                      <p className="text-white font-semibold leading-tight text-sm">{user.name}</p>
                      <p className="text-gray-400 text-xs leading-tight capitalize">{user.role}</p>
                    </div>
                    <div className="w-10 h-10 bg-primary-gold rounded-full flex items-center justify-center text-deep-navy font-bold text-lg">
                        {user.name.charAt(0)}
                    </div>
                </div>
                <button onClick={() => setShowConfirmLogout(!showConfirmLogout)} className="text-white hover:text-primary-gold" aria-label="Logout">
                  <LogoutIcon />
                </button>

                {showConfirmLogout && (
                  <div className="absolute right-0 top-12 mt-2 w-64 bg-white dark:bg-deep-navy rounded-2xl shadow-soft-lg p-4 z-50 border border-gray-200 dark:border-gray-700 animate-fade-in-down">
                    <p className="text-sm font-semibold text-deep-navy dark:text-white mb-3">Are you sure you want to log out?</p>
                    <div className="flex justify-end space-x-2">
                      <button 
                        onClick={() => setShowConfirmLogout(false)} 
                        className="px-3 py-1.5 text-xs font-semibold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-warm-gray rounded-pill transition-colors"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={() => { setShowConfirmLogout(false); onLogout(); }} 
                        className="px-4 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-pill transition-transform transform hover:scale-105"
                      >
                        Log Out
                      </button>
                    </div>
                  </div>
                )}
            </div>
          )}
        </nav>
      </div>
    </header>
  );
};

const SunIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
);

const MoonIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
);

const LogoutIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
);

const GlobeIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2h8a2 2 0 002-2v-1a2 2 0 012-2h1.945M7.707 4.293l.243-.243a2 2 0 012.828 0l.486.486a2 2 0 002.828 0l.243-.243m-4.243 12.072V19a2 2 0 002 2h2a2 2 0 002-2v-2.072M12 12c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm0 0a4.006 4.006 0 00-2.06 7.272M12 12a4.006 4.006 0 012.06 7.272" /></svg>
);
