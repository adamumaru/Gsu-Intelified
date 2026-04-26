import React from 'react';
import type { Item } from '../types';

interface ItemCardProps {
  item: Item;
  isSelected?: boolean;
}

export const ItemCard: React.FC<ItemCardProps> = ({ item, isSelected = false }) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const statusColor = item.status === 'lost' ? 'border-red-500' : 'border-green-500';
  const selectedClasses = isSelected ? 'ring-2 ring-primary-green shadow-soft-lg' : 'hover:shadow-soft hover:scale-[1.02]';

  return (
    <div className={`flex items-center space-x-4 p-3 bg-white dark:bg-gray-800 rounded-2xl border-l-4 ${statusColor} ${selectedClasses} transition-all duration-200 cursor-pointer`}>
      <img
        src={item.imageUrl || 'https://picsum.photos/seed/default/100'}
        alt={item.name}
        className="w-20 h-20 object-cover rounded-xl flex-shrink-0"
      />
      <div className="flex-grow overflow-hidden">
        <p className="font-bold text-deep-navy dark:text-white truncate">{item.name}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">{item.category}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {item.status === 'lost' ? 'Lost on' : 'Found on'} {formatDate(item.date)}
        </p>
      </div>
    </div>
  );
};
