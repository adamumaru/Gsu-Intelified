import React, { useState, useEffect } from 'react';
import type { Match, User, Item, PickupSchedule } from '../types';
import { mockApiService } from '../services/mockApiService';
import { geminiService } from '../services/geminiService';
import { CAMPUS_LOCATIONS } from '../constants';
import { useLocalization } from '../hooks/useLocalization';

interface SchedulePickupModalProps {
  isOpen: boolean;
  onClose: () => void;
  match: Match;
  currentUser: User;
  lostItem: Item;
  foundItem: Item;
  onScheduleUpdate: (schedule: PickupSchedule) => void;
  onRefreshData: () => void;
}

export const SchedulePickupModal: React.FC<SchedulePickupModalProps> = ({
  isOpen,
  onClose,
  match,
  currentUser,
  lostItem,
  foundItem,
  onScheduleUpdate,
  onRefreshData,
}) => {
  const { t } = useLocalization();
  const schedule = match.pickupSchedule;
  const isRequester = currentUser.id === schedule?.requesterId;
  
  const [date, setDate] = useState(schedule?.date || new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(schedule?.time || '12:00');
  const [location, setLocation] = useState(schedule?.location || CAMPUS_LOCATIONS[0]);
  const [notes, setNotes] = useState(schedule?.notes || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  
  useEffect(() => {
    if (isOpen && schedule) {
      setDate(schedule.date);
      setTime(schedule.time);
      setLocation(schedule.location);
      setNotes(schedule.notes || '');
    }
  }, [isOpen, schedule]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const newSchedule = await mockApiService.schedulePickup(match.id, {
        requesterId: currentUser.id,
        date,
        time,
        location,
        notes
    });
    onScheduleUpdate(newSchedule);
    setIsSubmitting(false);
    // In a real app, you might not close it, but wait for confirmation.
    // For this simulation, we'll close it after submission.
    onClose();
  };

  const handleStatusUpdate = async (newStatus: 'accepted' | 'completed') => {
      if (!schedule) return;
      setIsSubmitting(true);
      const updatedSchedule = await mockApiService.updatePickupStatus(schedule.id, newStatus);
      if(updatedSchedule) {
          onScheduleUpdate(updatedSchedule);
          if (newStatus === 'completed') {
              onRefreshData();
          }
      }
      setIsSubmitting(false);
      onClose();
  };

  const handleAiSuggest = async () => {
    setIsAiLoading(true);
    const suggestion = await geminiService.suggestPickupLocation(lostItem);
    if(suggestion && CAMPUS_LOCATIONS.includes(suggestion.location)) {
        setLocation(suggestion.location);
        setNotes(prev => `${t('aiSuggestion')}: ${suggestion.reason}\n\n${prev}`);
    }
    setIsAiLoading(false);
  };
  
  const generateICalFile = () => {
    const code = Math.floor(100000 + Math.random() * 900000);
    const startTime = new Date(`${date}T${time}:00`).toISOString().replace(/[-:.]/g, '');
    const endTime = new Date(new Date(`${date}T${time}:00`).getTime() + 30 * 60000).toISOString().replace(/[-:.]/g, '');
    
    const icalContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//GSU IntelliFind//EN',
      'BEGIN:VEVENT',
      `UID:${schedule!.id}@gsu-lostandfound.com`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:.]/g, '')}`,
      `DTSTART:${startTime}`,
      `DTEND:${endTime}`,
      `SUMMARY:Pickup for: ${lostItem.name}`,
      `DESCRIPTION:Item Recovery Details\\nItem: ${lostItem.name}\\nRecovery Code: ${code}\\nOwner: ${match.ownerName}\\nFinder: ${match.finderName}\\nNotes: ${notes.replace(/\n/g, '\\n')}`,
      `LOCATION:${location}`,
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([icalContent], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pickup_reminder.ics';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const renderContent = () => {
      if(schedule?.status === 'accepted') {
          return (
            <div className="text-center space-y-4">
                <h3 className="text-2xl font-bold text-deep-navy dark:text-white mb-2">{t('pickupConfirmed')}</h3>
                <p className="text-gray-600 dark:text-gray-300">A pickup has been scheduled for:</p>
                <div className="p-4 bg-soft-mint dark:bg-gray-700 rounded-xl">
                    <p className="font-bold text-lg text-primary-green dark:text-primary-gold">{new Date(date).toDateString()}</p>
                    <p className="text-deep-navy dark:text-warm-gray text-lg">{time} at {location}</p>
                </div>
                
                <div className="grid grid-cols-1 gap-3">
                    <button onClick={generateICalFile} className="w-full py-3 px-4 bg-primary-green text-white rounded-pill font-semibold hover:bg-green-700 flex items-center justify-center">
                        <CalendarIcon /> <span className="ml-2">{t('downloadCalendar')}</span>
                    </button>
                    
                    <button 
                        onClick={() => handleStatusUpdate('completed')} 
                        disabled={isSubmitting}
                        className="w-full py-3 px-4 bg-primary-gold text-deep-navy rounded-pill font-bold hover:bg-yellow-500 shadow-soft"
                    >
                        {isSubmitting ? 'Updating...' : `✅ ${t('markCompleted')}`}
                    </button>
                </div>
                
                <p className="text-xs text-gray-500 dark:text-gray-400 italic mt-4">
                    Only mark as completed once both parties have successfully met and the item has been recovered.
                </p>
            </div>
          )
      }
      if(schedule?.status === 'pending' && !isRequester) {
          return (
             <div className="text-center">
                <h3 className="text-xl font-bold text-deep-navy dark:text-white mb-2">{match.ownerName} has proposed a pickup time.</h3>
                <div className="my-4 p-4 bg-soft-mint dark:bg-gray-700 rounded-xl">
                    <p className="font-bold text-lg text-primary-green dark:text-primary-gold">{new Date(date).toDateString()}</p>
                    <p className="text-deep-navy dark:text-warm-gray text-lg">{time} at {location}</p>
                </div>
                <div className="flex gap-4">
                    <button onClick={() => {}} className="flex-1 py-3 px-4 bg-gray-200 dark:bg-gray-600 text-deep-navy dark:text-warm-gray rounded-pill font-semibold">{t('proposeNewTime')}</button>
                    <button onClick={() => handleStatusUpdate('accepted')} className="flex-1 py-3 px-4 bg-primary-green text-white rounded-pill font-semibold">{t('acceptTime')}</button>
                </div>
            </div>
          )
      }
      return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <input type="date" value={date} onChange={e => setDate(e.target.value)} required className="w-full p-3 bg-warm-gray dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl"/>
            <input type="time" value={time} onChange={e => setTime(e.target.value)} required className="w-full p-3 bg-warm-gray dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl"/>
            
            <div className="relative">
                <select value={location} onChange={e => setLocation(e.target.value)} required className="w-full p-3 bg-warm-gray dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl appearance-none pr-10">
                    {CAMPUS_LOCATIONS.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                </select>
                 <button type="button" onClick={handleAiSuggest} disabled={isAiLoading} className="absolute right-2 top-1/2 -translate-y-1/2 text-xs bg-primary-gold text-deep-navy font-bold px-2 py-1 rounded-pill flex items-center disabled:opacity-50">
                    {isAiLoading ? <><Spinner small/> <span className="ml-1.5">{t('suggesting')}</span></> : `✨ ${t('getAISuggestion')}`}
                </button>
            </div>

            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes (e.g., 'I'll be wearing a red hat')" rows={3} className="w-full p-3 bg-warm-gray dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl"></textarea>
            
            <button type="submit" disabled={isSubmitting} className="w-full py-3 px-4 bg-primary-green text-white rounded-pill font-semibold hover:bg-green-700 disabled:bg-gray-400">
                {isSubmitting ? 'Submitting...' : schedule ? t('proposeNewTime') : t('proposeTime')}
            </button>
        </form>
      )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-deep-navy rounded-3xl shadow-soft-lg w-full max-w-md p-6 relative animate-fade-in">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <CloseIcon />
        </button>
        <h2 className="text-2xl font-bold text-center mb-4 text-deep-navy dark:text-white">{t('schedulePickupTitle')}</h2>
        {renderContent()}
      </div>
    </div>
  );
};


const CloseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>;
const Spinner: React.FC<{small?: boolean}> = ({small}) => <div className={`animate-spin rounded-full border-b-2 ${small ? 'h-4 w-4' : 'h-8 w-8'} border-current`}></div>;
const CalendarIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" /></svg>;