import React, { useState } from 'react';
import type { Item } from '../types';
import { geminiService } from '../services/geminiService';
import { mockHotspots } from '../constants';

interface AdminViewProps {
  allItems: Item[];
}

interface AdminItem extends Item {
    aiAnalysis?: {
        analysis: string;
        suspicionLevel: number;
    };
    isAiLoading?: boolean;
}

type AdminTab = 'dashboard' | 'reports';

export const AdminView: React.FC<AdminViewProps> = ({ allItems }) => {
  const [items, setItems] = useState<AdminItem[]>(allItems);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('pending');
  const [activeTab, setActiveTab] = useState<AdminTab>('reports');

  const getAiAnalysis = async (itemId: string) => {
    setItems(prevItems => prevItems.map(i => i.id === itemId ? { ...i, isAiLoading: true } : i));
    
    const itemToAnalyze = items.find(i => i.id === itemId);
    if (itemToAnalyze) {
        const analysis = await geminiService.analyzeForAdmin(itemToAnalyze);
        setItems(prevItems => prevItems.map(i => i.id === itemId ? { ...i, aiAnalysis: analysis, isAiLoading: false } : i));
    }
  }

  const toggleApproval = (itemId: string) => {
    setItems(prevItems => prevItems.map(i => i.id === itemId ? { ...i, isApproved: !i.isApproved } : i));
  }
  
  const filteredItems = items.filter(item => {
    if (filter === 'pending') return !item.isApproved;
    if (filter === 'approved') return item.isApproved;
    return true;
  }).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  const renderReports = () => (
    <>
      <div className="flex space-x-2 mb-6 border-b border-gray-200 dark:border-gray-700 pb-3">
        <FilterButton label="Pending Approval" isActive={filter === 'pending'} onClick={() => setFilter('pending')} />
        <FilterButton label="Approved" isActive={filter === 'approved'} onClick={() => setFilter('approved')} />
        <FilterButton label="All Reports" isActive={filter === 'all'} onClick={() => setFilter('all')} />
      </div>
      <div className="space-y-4">
        {filteredItems.length > 0 ? filteredItems.map(item => (
            <AdminItemCard key={item.id} item={item} onAnalyze={getAiAnalysis} onApprove={toggleApproval} />
        )) : <p className="text-gray-500 dark:text-gray-400">No items match the current filter.</p>}
      </div>
    </>
  );
  
  const renderDashboard = () => (
    <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard title="Total Reports" value={allItems.length} />
            <StatCard title="Pending Approval" value={allItems.filter(i => !i.isApproved).length} />
            <StatCard title="Recovered Items" value={allItems.filter(i => i.status === 'claimed').length} />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl">
                <h3 className="font-bold text-lg mb-2">AI Daily Summary</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">"Today saw a high volume of 'Electronics' reports, particularly around the GSU Library. One report for a 'Rolex Watch' was flagged for high suspicion due to vague details. Recommend monitoring." - Gemini</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl">
                <h3 className="font-bold text-lg mb-2">Item Hotspots</h3>
                <ul className="space-y-2">
                    {mockHotspots.map(spot => (
                        <li key={spot.id} className="flex justify-between items-center text-sm">
                            <span className="text-gray-700 dark:text-gray-200">{spot.name}</span>
                            <span className="font-semibold bg-soft-mint text-primary-green px-2 py-0.5 rounded-pill">{spot.count} items</span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    </div>
  );

  return (
    <div className="bg-white dark:bg-deep-navy p-6 rounded-2xl shadow-soft-lg">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-3xl font-bold text-deep-navy dark:text-white">Admin Panel</h2>
         <div className="flex bg-gray-200 dark:bg-gray-700 rounded-pill p-1">
            <TabButton label="Reports" isActive={activeTab === 'reports'} onClick={() => setActiveTab('reports')} />
            <TabButton label="Dashboard" isActive={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
        </div>
      </div>
      
      {activeTab === 'reports' ? renderReports() : renderDashboard()}
    </div>
  );
};

const StatCard: React.FC<{title: string, value: number | string, subtitle?: string}> = ({title, value, subtitle}) => (
    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl shadow-sm">
        <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
        <p className="text-3xl font-bold text-deep-navy dark:text-white">{value}</p>
        {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
    </div>
);


const TabButton: React.FC<{label: string, isActive: boolean, onClick: () => void}> = ({label, isActive, onClick}) => (
    <button onClick={onClick} className={`px-4 py-1.5 rounded-pill text-sm font-semibold transition-colors ${isActive ? 'bg-white dark:bg-deep-navy shadow' : 'text-gray-600 dark:text-gray-300 hover:text-deep-navy dark:hover:text-white'}`}>
        {label}
    </button>
)

const FilterButton: React.FC<{label: string, isActive: boolean, onClick: () => void}> = ({label, isActive, onClick}) => (
    <button onClick={onClick} className={`px-4 py-2 rounded-pill text-sm font-medium transition-colors ${isActive ? 'bg-primary-green text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'}`}>
        {label}
    </button>
);

const AdminItemCard: React.FC<{item: AdminItem, onAnalyze: (id: string) => void, onApprove: (id: string) => void}> = ({item, onAnalyze, onApprove}) => {
    const suspicionColor = item.aiAnalysis && item.aiAnalysis.suspicionLevel > 5 ? 'text-red-500' : item.aiAnalysis && item.aiAnalysis.suspicionLevel > 2 ? 'text-yellow-500' : 'text-green-500';
    
    return (
        <div className="border border-gray-200 dark:border-gray-700 rounded-2xl p-4 shadow-sm bg-gray-50 dark:bg-gray-800 grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
            {/* Item Info */}
            <div className="md:col-span-1 flex space-x-4">
                <img src={item.imageUrl} alt={item.name} className="w-24 h-24 object-cover rounded-xl flex-shrink-0" />
                <div>
                    <p className="font-bold">{item.name}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">{item.category}</p>
                    <p className="text-xs text-gray-400">ID: {item.id}</p>
                    <span className={`capitalize px-2 py-1 text-xs font-semibold rounded-full ${
                        item.status === 'lost' ? 'bg-red-100 text-red-800' : 
                        item.status === 'found' ? 'bg-green-100 text-green-800' : 
                        'bg-blue-100 text-blue-800'
                    }`}>
                        {item.status}
                    </span>
                </div>
            </div>

            {/* AI Analysis */}
            <div className="md:col-span-1">
                <h4 className="font-semibold text-gray-700 dark:text-gray-200 mb-2">Gemini AI Analysis</h4>
                {item.aiAnalysis ? (
                    <div className="text-sm bg-white dark:bg-gray-700 p-3 rounded-xl border dark:border-gray-600">
                        <p>{item.aiAnalysis.analysis}</p>
                        <p className={`font-bold mt-2 ${suspicionColor}`}>Suspicion Level: {item.aiAnalysis.suspicionLevel}/10</p>
                    </div>
                ) : (
                    <button onClick={() => onAnalyze(item.id)} disabled={item.isAiLoading} className="text-sm px-3 py-1.5 bg-primary-gold text-deep-navy rounded-pill font-semibold hover:bg-yellow-500 disabled:opacity-50 flex items-center">
                        {item.isAiLoading ? <><Spinner small/> <span className="ml-2">Analyzing...</span></> : 'Analyze with AI'}
                    </button>
                )}
            </div>

            {/* Actions */}
            <div className="md:col-span-1 flex flex-col items-start md:items-end justify-between h-full">
                <p className="text-sm text-gray-500">Reported on: {new Date(item.date).toLocaleDateString()}</p>
                <div className="flex space-x-2 mt-2">
                    <button className="px-4 py-2 bg-red-600 text-white rounded-pill text-sm font-semibold hover:bg-red-700">Reject</button>
                    <button onClick={() => onApprove(item.id)} className={`px-4 py-2 rounded-pill text-sm font-semibold text-white ${item.isApproved ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-green-600 hover:bg-green-700'}`}>
                        {item.isApproved ? 'Un-approve' : 'Approve'}
                    </button>
                </div>
            </div>
        </div>
    )
}

const Spinner: React.FC<{small?: boolean}> = ({small}) => (
    <div className={`animate-spin rounded-full border-b-2 ${small ? 'h-5 w-5' : 'h-8 w-8'} border-primary-green`}></div>
);