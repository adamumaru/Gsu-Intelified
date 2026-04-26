import React, { useState, useEffect, useCallback } from 'react';
import type { Item, User, Match, PickupSchedule } from '../types';
import { mockApiService } from '../services/mockApiService';
import { ItemCard } from './ItemCard';
import { SchedulePickupModal } from './SchedulePickupModal';
import { useLocalization } from '../hooks/useLocalization';

interface DashboardProps {
  user: User;
  lostItems: Item[];
  foundItems: Item[];
  onReportLost: () => void;
  onReportFound: () => void;
  onInitiateCall: (match: Match) => void;
  onRefreshData: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ user, lostItems, foundItems, onReportLost, onReportFound, onInitiateCall, onRefreshData }) => {
  const [activeTab, setActiveTab] = useState<'lost' | 'found'>('lost');
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [isMatchLoading, setIsMatchLoading] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const { t } = useLocalization();

  const userLostItems = lostItems.filter(item => item.userId === user.id && item.status === 'lost');
  const userFoundItems = foundItems.filter(item => item.userId === user.id && item.status === 'found');
  
  const findMatches = useCallback(async (item: Item) => {
    setSelectedItem(item);
    setIsMatchLoading(true);
    setMatches([]);
    const foundMatches = await mockApiService.getMatches(item, foundItems);
    setMatches(foundMatches);
    setIsMatchLoading(false);
  }, [foundItems]);
  
  const handleScheduleUpdate = (updatedSchedule: PickupSchedule) => {
      setMatches(prevMatches => prevMatches.map(match => 
          match.id === updatedSchedule.matchId 
          ? { ...match, pickupSchedule: updatedSchedule }
          : match
      ));
      setSelectedMatch(prevMatch => prevMatch ? { ...prevMatch, pickupSchedule: updatedSchedule } : null);
  };

  const openScheduleModal = (match: Match) => {
      setSelectedMatch(match);
      setIsScheduleModalOpen(true);
  };
  
  useEffect(() => {
    if (userLostItems.length > 0) {
      if (!selectedItem || !userLostItems.some(i => i.id === selectedItem.id)) {
        findMatches(userLostItems[0]);
      }
    } else {
        setSelectedItem(null);
        setMatches([]);
    }
  }, [userLostItems, findMatches, selectedItem]);

  const renderItems = (items: Item[]) => {
    if (items.length === 0) {
      return <p className="text-gray-500 dark:text-gray-400 mt-4 text-center">You have not reported any {activeTab} items yet.</p>;
    }
    return (
      <div className="space-y-3 pr-2 overflow-y-auto max-h-[60vh]">
        {items.map(item => (
          <div key={item.id} onClick={() => activeTab === 'lost' && findMatches(item)}>
             <ItemCard item={item} isSelected={selectedItem?.id === item.id && activeTab === 'lost'} />
          </div>
        ))}
      </div>
    );
  };
  
  const renderMatches = () => {
    if (isMatchLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-full">
            <Spinner />
            <p className="mt-4 text-primary-green font-semibold">Gemini is looking for matches...</p>
        </div>
      )
    }
    
    if (!selectedItem) {
        return <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-gray-800 rounded-2xl"><p className="text-gray-500 dark:text-gray-400">Select a lost item to see potential matches.</p></div>
    }

    if (matches.length === 0) {
      return <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-gray-800 rounded-2xl"><p className="text-gray-500 dark:text-gray-400">No matches found for "{selectedItem.name}".</p></div>
    }

    return (
      <div className="space-y-4">
        {matches.map(match => {
            const foundItem = foundItems.find(item => item.id === match.foundItemId);
            if (!foundItem) return null;
            return <MatchCard 
                        key={match.id} 
                        match={match} 
                        foundItem={foundItem}
                        lostItem={selectedItem}
                        onSchedule={() => openScheduleModal(match)}
                        onInitiateCall={() => onInitiateCall(match)}
                   />
        })}
      </div>
    );
  };

  return (
    <>
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white dark:bg-deep-navy p-6 rounded-2xl shadow-soft">
        <div>
            <h2 className="text-3xl font-bold text-deep-navy dark:text-white">Welcome, {user.name}!</h2>
            <p className="text-gray-600 dark:text-gray-300 mt-1">Manage your items and find what you've lost.</p>
        </div>
        <div className="flex space-x-3 mt-4 sm:mt-0">
          <Button onClick={onReportLost} variant="primary">Report Lost Item</Button>
          <Button onClick={onReportFound} variant="secondary">Report Found Item</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-5 lg:col-span-4 bg-white dark:bg-deep-navy p-4 sm:p-6 rounded-2xl shadow-soft">
          <h3 className="text-xl font-bold mb-4 border-b border-gray-200 dark:border-gray-700 pb-3 text-deep-navy dark:text-white">Your Reported Items</h3>
          <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
            <TabButton title="Lost Items" isActive={activeTab === 'lost'} onClick={() => setActiveTab('lost')} />
            <TabButton title="Found Items" isActive={activeTab === 'found'} onClick={() => setActiveTab('found')} />
          </div>
          {activeTab === 'lost' ? renderItems(userLostItems) : renderItems(userFoundItems)}
        </div>

        <div className="md:col-span-7 lg:col-span-8 bg-white dark:bg-deep-navy p-4 sm:p-6 rounded-2xl shadow-soft min-h-[50vh]">
          <h3 className="text-xl font-bold mb-4 border-b border-gray-200 dark:border-gray-700 pb-3 text-deep-navy dark:text-white">
            Potential Matches for <span className="text-primary-green">{selectedItem?.name || '...'}</span>
          </h3>
          <div className="overflow-y-auto max-h-[60vh] p-1">
            {renderMatches()}
          </div>
        </div>
      </div>
    </div>
    {isScheduleModalOpen && selectedMatch && (
        <SchedulePickupModal 
            isOpen={isScheduleModalOpen}
            onClose={() => setIsScheduleModalOpen(false)}
            match={selectedMatch}
            currentUser={user}
            lostItem={selectedItem!}
            foundItem={foundItems.find(i => i.id === selectedMatch.foundItemId)!}
            onScheduleUpdate={handleScheduleUpdate}
            onRefreshData={onRefreshData}
        />
    )}
    </>
  );
};

const Button: React.FC<{ onClick: () => void; children: React.ReactNode; variant: 'primary' | 'secondary' }> = ({ onClick, children, variant }) => {
    const baseClasses = "px-6 py-3 rounded-pill font-semibold shadow-soft transition-transform transform hover:scale-105 focus:outline-none focus:ring-4";
    const variantClasses = variant === 'primary' 
        ? "bg-primary-green text-white focus:ring-green-300"
        : "bg-primary-gold text-deep-navy focus:ring-yellow-300";
    return <button className={`${baseClasses} ${variantClasses}`} onClick={onClick}>{children}</button>
};

const TabButton: React.FC<{ title: string; isActive: boolean; onClick: () => void }> = ({ title, isActive, onClick }) => {
    return (
        <button onClick={onClick} className={`px-4 py-2 text-sm font-medium transition-colors w-full ${isActive ? 'border-b-2 border-primary-green text-primary-green' : 'text-gray-500 dark:text-gray-400 hover:text-primary-green dark:hover:text-primary-gold'}`}>
            {title}
        </button>
    )
};

const Spinner: React.FC = () => (
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-green"></div>
);

const MatchCard: React.FC<{ match: Match; foundItem: Item; lostItem: Item; onSchedule: () => void; onInitiateCall: () => void; }> = ({ match, foundItem, lostItem, onSchedule, onInitiateCall }) => {
  const { t } = useLocalization();

  const handleVerify = () => {
    const code = Math.floor(100000 + Math.random() * 900000);
    alert(`Verification Initiated!\n\nYour 6-digit recovery code is: ${code}\n\nShare this code with the other person to confirm the exchange.`);
  }

  const getScheduleStatusText = () => {
      if (!match.pickupSchedule) return null;
      const { status, date, time, location } = match.pickupSchedule;
      const formattedDate = new Date(date).toLocaleDateString([], { month: 'short', day: 'numeric' });
      switch (status) {
          case 'pending':
              return `Pickup request pending for ${formattedDate} at ${time}.`;
          case 'accepted':
              return `✅ Confirmed: ${location} on ${formattedDate} at ${time}.`;
          case 'rescheduled':
              return `Reschedule request for ${formattedDate} at ${time}.`;
          case 'completed':
              return `Item exchange completed.`;
          default:
              return null;
      }
  }

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-2xl p-4 shadow-sm hover:shadow-soft transition-shadow bg-gray-50 dark:bg-gray-800">
      <div className="flex flex-col sm:flex-row items-start space-y-4 sm:space-y-0 sm:space-x-4">
        <img src={foundItem.imageUrl} alt={foundItem.name} className="w-full sm:w-28 h-40 sm:h-28 object-cover rounded-xl flex-shrink-0" />
        <div className="flex-grow w-full">
          <div className="flex justify-between items-start">
            <h4 className="font-bold text-lg text-deep-navy dark:text-white">{foundItem.name}</h4>
             <div className="relative w-20 h-20 flex-shrink-0">
                <svg className="w-full h-full" viewBox="0 0 36 36">
                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none" className="stroke-gray-200 dark:stroke-gray-600" strokeWidth="3" />
                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none" className="stroke-primary-green" strokeWidth="3"
                        strokeDasharray={`${match.matchScore}, 100`} strokeLinecap="round" />
                </svg>
                <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center text-xl font-bold text-deep-navy dark:text-warm-gray">
                    {match.matchScore}%
                </div>
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{foundItem.description}</p>
          <div className="mt-3 p-3 bg-soft-mint/30 dark:bg-gray-700/50 rounded-lg">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Gemini's Analysis:</p>
            <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-300 mt-1 space-y-1">
              {match.reasons.map((reason, index) => <li key={index}>{reason}</li>)}
            </ul>
          </div>
        </div>
      </div>
       {match.pickupSchedule && (
        <div className="mt-3 text-center p-2 rounded-lg bg-primary-gold/20 text-yellow-800 dark:text-primary-gold font-semibold text-sm">
            {getScheduleStatusText()}
        </div>
      )}
      <div className="mt-4 flex flex-wrap gap-2 justify-end">
          <button onClick={onInitiateCall} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-deep-navy dark:text-warm-gray rounded-pill text-sm font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center">
            <PhoneIcon /> <span className="ml-1.5">{t('callSecurely')}</span>
          </button>
          <button onClick={onSchedule} className="px-4 py-2 bg-primary-gold text-deep-navy rounded-pill text-sm font-semibold hover:bg-yellow-500 flex items-center">
            <CalendarIcon /> <span className="ml-1.5">{t('schedulePickup')}</span>
          </button>
          <button onClick={handleVerify} className="px-4 py-2 bg-primary-green text-white rounded-pill text-sm font-semibold hover:bg-green-700 flex items-center">
            <CheckIcon /> <span className="ml-1.5">{t('verifyRecovery')}</span>
          </button>
      </div>
    </div>
  )
}

const PhoneIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.518.76a11.034 11.034 0 006.364 6.364l.76-1.518a1 1 0 011.06-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" /></svg>;
const CalendarIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" /></svg>;
const CheckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>;