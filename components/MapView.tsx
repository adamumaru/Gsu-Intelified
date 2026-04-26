import React from 'react';
import { mockHotspots } from '../constants';

export const MapView: React.FC = () => {
  return (
    <div className="bg-white dark:bg-deep-navy p-4 sm:p-6 rounded-2xl shadow-soft-lg">
      <h2 className="text-3xl font-bold text-deep-navy dark:text-white mb-4">Campus Hotspots</h2>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        This map shows areas on campus where items are most frequently reported lost or found.
      </p>

      <div className="relative w-full aspect-[16/10] bg-gray-200 dark:bg-gray-800 rounded-2xl overflow-hidden border-4 border-soft-mint dark:border-gray-700">
        {/* Placeholder for an actual map image */}
        <img 
            src="https://www.pdffiller.com/preview/49/79/49079549/large.png" 
            alt="GSU Campus Map" 
            className="w-full h-full object-cover opacity-50"
        />
        
        {/* Render Hotspots */}
        {mockHotspots.map(spot => (
          <div
            key={spot.id}
            className="absolute -translate-x-1/2 -translate-y-1/2 group"
            style={{ top: spot.coords.top, left: spot.coords.left }}
          >
            <div className="w-5 h-5 bg-primary-gold rounded-full cursor-pointer flex items-center justify-center animate-pulse">
                <div className="w-3 h-3 bg-white rounded-full"></div>
            </div>
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max bg-deep-navy text-white text-xs rounded-lg py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              {spot.name} ({spot.count} items)
              <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-deep-navy"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
