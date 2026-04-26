import type { Item, User, ItemCategory, Badge } from './types';

export const ITEM_CATEGORIES: ItemCategory[] = [
  'Electronics', 'Apparel', 'Books', 'Keys', 'Wallets & Purses', 'ID & Cards', 'Jewelry', 'Other'
];

export const CAMPUS_LOCATIONS: string[] = [
    "GSU Library Entrance",
    "Student Center East (Panther Statue)",
    "Sparks Hall Information Desk",
    "Classroom South Lobby",
    "University Commons Front Desk",
    "Campus Police Station",
];

export const mockUser: User = {
  id: 'user_123',
  name: 'Adam umaru',
  email: 'adamumaru57@gmail.com',
  matricNumber: '001234567',
  role: 'student',
  score: 150,
  badges: ['Campus Hero', 'Good Samaritan'],
  qrcodes: [
    { id: 'qr_1', itemId: 'lost_2', qrImageUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=GSU-ITEM-lost_2' }
  ],
};

export const mockLeaderboard: Omit<User, 'email' | 'matricNumber' | 'role' | 'qrcodes'>[] = [
  { id: 'user_123', name: 'Adam umaru', score: 150, badges: ['Campus Hero', 'Good Samaritan']},
  { id: 'user_456', name: 'Jane Doe', score: 125, badges: ['Top Finder']},
  { id: 'user_789', name: 'John Smith', score: 90, badges: ['Good Samaritan']},
  { id: 'user_101', name: 'Ada Lovelace', score: 75, badges: []},
  { id: 'user_112', name: 'Charles Babbage', score: 50, badges: ['Good Samaritan']},
]

export const mockHotspots = [
    { id: 'spot_1', name: 'GSU Library', coords: { top: '35%', left: '40%' }, count: 12 },
    { id: 'spot_2', name: 'Student Center East', coords: { top: '55%', left: '60%' }, count: 8 },
    { id: 'spot_3', name: 'Classroom South', coords: { top: '75%', left: '30%' }, count: 5 },
    { id: 'spot_4', name: 'Sparks Hall', coords: { top: '25%', left: '70%' }, count: 3 },
];

export const mockLostItems: Item[] = [
  {
    id: 'lost_1',
    name: 'iPhone 14 Pro',
    category: 'Electronics',
    description: 'Black iPhone 14 Pro in a clear case. Has a small crack on the top left corner. The lock screen is a picture of a golden retriever.',
    location: 'GSU Library, 3rd Floor',
    date: '2023-10-26T10:00:00Z',
    imageUrl: 'https://picsum.photos/seed/iphone/400/300',
    status: 'lost',
    userId: 'user_123',
    isApproved: true,
  },
  {
    id: 'lost_2',
    name: 'Blue North Face Jacket',
    category: 'Apparel',
    description: 'Men\'s size large, dark blue North Face jacket. Has a GSU keychain in the right pocket.',
    location: 'Student Center East',
    date: '2023-10-25T15:30:00Z',
    imageUrl: 'https://picsum.photos/seed/jacket/400/300',
    status: 'lost',
    userId: 'user_456',
    isApproved: true,
  },
];

export const mockFoundItems: Item[] = [
  {
    id: 'found_1',
    name: 'Found: Black iPhone',
    category: 'Electronics',
    description: 'Found a black iPhone near the coffee shop in the library. It has a cracked screen. The background shows a dog.',
    location: 'GSU Library, near Argo Tea',
    date: '2023-10-26T11:00:00Z',
    imageUrl: 'https://picsum.photos/seed/iphonefound/400/300',
    status: 'found',
    userId: 'user_456',
    isApproved: true,
  },
  {
    id: 'found_2',
    name: 'Keys with Red Lanyard',
    category: 'Keys',
    description: 'Set of two keys on a red GSU lanyard. One key looks like a car key (Toyota).',
    location: 'Classroom South',
    date: '2023-10-27T09:00:00Z',
    imageUrl: 'https://picsum.photos/seed/keys/400/300',
    status: 'found',
    userId: 'user_789',
    isApproved: false,
  },
];