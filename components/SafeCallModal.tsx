import React, { useState, useEffect } from 'react';
import { useLocalization } from '../hooks/useLocalization';

type CallStatus = 'idle' | 'ringing' | 'connected' | 'ended';
interface SafeCallModalProps {
  status: CallStatus;
  counterpart: { name: string; role: 'owner' | 'finder' } | null;
  onEndCall: () => void;
}

const CallTimer: React.FC = () => {
    const [seconds, setSeconds] = useState(0);
    useEffect(() => {
        const timer = setInterval(() => {
            setSeconds(prev => prev + 1);
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const formatTime = (totalSeconds: number) => {
        const mins = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
        const secs = (totalSeconds % 60).toString().padStart(2, '0');
        return `${mins}:${secs}`;
    }
    return <p className="text-sm text-gray-300">{formatTime(seconds)}</p>
}

export const SafeCallModal: React.FC<SafeCallModalProps> = ({ status, counterpart, onEndCall }) => {
    const { t } = useLocalization();
    const [isMuted, setIsMuted] = useState(false);
    
    useEffect(() => {
      // Reset mute state when a new call starts
      if (status === 'ringing') {
        setIsMuted(false);
      }
    }, [status])

    if (status === 'idle') return null;
    
    const counterpartLabel = counterpart?.role === 'finder' ? t('privateFinder') : t('itemOwner');

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 animate-fade-in">
            <div className="bg-deep-navy rounded-3xl shadow-soft-lg w-full max-w-sm p-8 text-white text-center">
                {status === 'ringing' && (
                    <div className="animate-pulse">
                        <h2 className="text-2xl font-bold">{t('calling')}...</h2>
                        <p className="text-gray-300 mt-1">{counterpartLabel}</p>
                    </div>
                )}

                {status === 'connected' && (
                    <>
                        <div className="w-24 h-24 bg-primary-gold rounded-full mx-auto flex items-center justify-center text-deep-navy font-bold text-5xl mb-4">
                            {counterpart?.name.charAt(0)}
                        </div>
                        <h2 className="text-2xl font-bold">{counterpartLabel}</h2>
                        <CallTimer />
                    </>
                )}
                
                 {status === 'ended' && (
                    <div>
                        <h2 className="text-2xl font-bold">{t('callEnded')}</h2>
                    </div>
                )}
                
                { (status === 'ringing' || status === 'connected') &&
                    <div className="mt-10 flex justify-around items-center">
                        {status === 'connected' && (
                            <button onClick={() => setIsMuted(prev => !prev)} className="flex flex-col items-center space-y-1 text-gray-300 hover:text-white">
                               {isMuted ? <MicOffIcon/> : <MicIcon/>}
                                <span className="text-xs">{isMuted ? t('unmute') : t('mute')}</span>
                            </button>
                        )}
                        <button onClick={onEndCall} className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center hover:bg-red-700">
                           <PhoneDownIcon />
                        </button>
                    </div>
                }
            </div>
        </div>
    );
};

const MicIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-14 0m7 6v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>;
const MicOffIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.083A7.002 7.002 0 004 11v3l-2 2v2h18v-2l-2-2v-3a7.002 7.002 0 00-7-5.917zM9 19v-2a3 3 0 00-3-3H4a3 3 0 00-3 3v2h6zm11 0v-2a3 3 0 00-3-3h-1a3 3 0 00-3 3v2h7zM16 11a4 4 0 00-8 0v3h8v-3z" /></svg>;
const PhoneDownIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2 2m-2-2v5.5A2.5 2.5 0 0115.5 14h-1.052a2.5 2.5 0 01-2.296-1.584l-1.32-3.3a1 1 0 00-1.664 0l-1.32 3.3A2.5 2.5 0 016.552 14H5.5A2.5 2.5 0 013 11.5V6m3-2l2 2m0 0l2-2m-2 2V2" /></svg>;