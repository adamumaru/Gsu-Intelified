import React, { useState } from 'react';
import type { User, Badge, Item } from '../types';

interface ProfileViewProps {
  user: User;
  leaderboard: Omit<User, 'email' | 'matricNumber' | 'role' | 'qrcodes'>[];
  userItems: Item[];
  onBack: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ user, leaderboard, userItems, onBack }) => {
    const [selectedItemId, setSelectedItemId] = useState('');
    const qrCodeUrl = selectedItemId 
        ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=GSU-ITEM-${selectedItemId}` 
        : '';
        
  return (
    <div className="space-y-6">
       <div className="flex items-center mb-6">
        <button onClick={onBack} className="mr-4 text-gray-500 hover:text-primary-green dark:hover:text-primary-gold">
            <ArrowLeftIcon />
        </button>
        <h2 className="text-3xl font-bold text-deep-navy dark:text-white">Your Profile & Progress</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Profile & Gamification */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-deep-navy p-6 rounded-2xl shadow-soft flex items-center space-x-6 transition-colors duration-300">
             <div className="w-24 h-24 bg-primary-gold rounded-full flex items-center justify-center text-deep-navy font-bold text-5xl flex-shrink-0">
                {user.name.charAt(0)}
            </div>
            <div>
                <h3 className="text-2xl font-bold">{user.name}</h3>
                <p className="text-gray-500 dark:text-gray-400">{user.email || 'student@gsu.edu'}</p>
                <div className="mt-2 text-primary-green dark:text-primary-gold font-bold text-lg">
                    Score: {user.score}
                </div>
            </div>
          </div>
          
           <div className="bg-white dark:bg-deep-navy p-6 rounded-2xl shadow-soft transition-colors duration-300">
              <h3 className="font-bold text-xl mb-4">Your Badges</h3>
              <div className="flex flex-wrap gap-4">
                {user.badges.map(badge => <BadgeChip key={badge} badge={badge} />)}
                {user.badges.length === 0 && <p className="text-sm text-gray-500">No badges yet. Find or return an item to earn one!</p>}
              </div>
           </div>

           <div className="bg-white dark:bg-deep-navy p-6 rounded-2xl shadow-soft transition-colors duration-300">
              <h3 className="font-bold text-xl mb-4">Generate QR Item Tag</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Generate a unique QR code to stick on your valuable items. If someone finds it, they can scan it to securely notify you.</p>
               <div className="flex flex-col sm:flex-row items-center gap-4">
                    <select
                        value={selectedItemId}
                        onChange={(e) => setSelectedItemId(e.target.value)}
                        className="flex-grow w-full sm:w-auto bg-warm-gray dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-pill px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-green text-gray-900 dark:text-white"
                    >
                       <option value="">Select an item to tag...</option>
                       {userItems.map(item => (
                           <option key={item.id} value={item.id}>{item.name} ({item.status === 'lost' ? 'Lost' : item.status === 'found' ? 'Found' : 'Recovered'})</option>
                       ))}
                       {userItems.length === 0 && (
                           <>
                               <option value="item_laptop_123">Macbook Pro 14"</option>
                               <option value="item_keys_456">Apartment Keys</option>
                               <option value="item_bottle_789">Hydro Flask</option>
                           </>
                       )}
                    </select>
                    <button disabled={!selectedItemId} className="px-6 py-2 bg-primary-green text-white rounded-pill font-semibold disabled:bg-gray-400 w-full sm:w-auto transition-transform hover:scale-105 active:scale-95 disabled:hover:scale-100">Generate</button>
               </div>
               {qrCodeUrl && (
                    <div className="mt-6 text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl">
                        <h4 className="font-bold">Your Unique QR Code</h4>
                        <img src={qrCodeUrl} alt="Generated QR Code" className="mx-auto my-4 rounded-xl shadow-md bg-white p-2" />
                        <button className="px-4 py-2 bg-primary-gold text-deep-navy rounded-pill font-semibold transition-transform hover:scale-105 active:scale-95">Print Label</button>
                    </div>
               )}
           </div>
        </div>

        {/* Right Column: Leaderboard */}
        <div className="bg-white dark:bg-deep-navy p-6 rounded-2xl shadow-soft transition-colors duration-300">
            <h3 className="font-bold text-xl mb-4">Campus Leaderboard</h3>
            <ul className="space-y-3">
                {leaderboard.map((player, index) => (
                    <li key={player.id} className="flex items-center space-x-4 p-2 rounded-xl transition-colors hover:bg-warm-gray dark:hover:bg-gray-800">
                        <span className={`font-bold w-6 text-center ${index < 3 ? 'text-primary-gold' : 'text-gray-400'}`}>{index + 1}</span>
                         <div className="w-10 h-10 bg-soft-mint rounded-full flex items-center justify-center text-primary-green font-bold text-lg">
                            {player.name.charAt(0)}
                        </div>
                        <div className="flex-grow">
                            <p className="font-semibold">{player.name}</p>
                            <p className="text-sm text-gray-500">{player.score} pts</p>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
      </div>
    </div>
  );
};


const BadgeChip: React.FC<{badge: Badge}> = ({badge}) => {
    const badgeColors: Record<Badge, string> = {
        'Campus Hero': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
        'Top Finder': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
        'Good Samaritan': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    }
    return (
        <span className={`px-3 py-1.5 text-sm font-semibold rounded-pill ${badgeColors[badge]}`}>
            {badge === 'Campus Hero' && '🏆 '}
            {badge === 'Top Finder' && '🥇 '}
            {badge === 'Good Samaritan' && '💖 '}
            {badge}
        </span>
    )
}

const ArrowLeftIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
);
