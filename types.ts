export type ItemStatus = 'lost' | 'found' | 'claimed';
export type ItemCategory = 'Electronics' | 'Apparel' | 'Books' | 'Keys' | 'Wallets & Purses' | 'ID & Cards' | 'Jewelry' | 'Other';
export type UserRole = 'student' | 'admin';
export type Badge = 'Campus Hero' | 'Top Finder' | 'Good Samaritan';
export type PickupScheduleStatus = 'pending' | 'accepted' | 'rescheduled' | 'completed';
export type CallStatus = 'connected' | 'missed' | 'ended';

export interface QRCode {
    id: string;
    itemId: string;
    qrImageUrl: string;
}
export interface User {
  id: string;
  name: string;
  email: string;
  matricNumber: string;
  role: UserRole;
  score: number;
  badges: Badge[];
  qrcodes: QRCode[];
}

export interface Item {
  id: string;
  name: string;
  category: ItemCategory;
  description: string;
  location: string;
  date: string; // ISO string format
  imageUrl?: string;
  status: ItemStatus;
  userId: string;
  isApproved: boolean;
}

export interface PickupSchedule {
    id: string;
    matchId: string;
    requesterId: string;
    receiverId: string;
    date: string; // ISO string for date
    time: string; // e.g., "14:30"
    location: string;
    status: PickupScheduleStatus;
    notes?: string;
    createdAt: string; // ISO string
}

export interface Match {
  id:string;
  lostItemId: string;
  foundItemId: string;
  ownerId: string;
  finderId: string;
  ownerName: string;
  finderName: string;
  matchScore: number; // 0-100
  reasons: string[];
  status: 'pending' | 'confirmed' | 'rejected';
  pickupSchedule?: PickupSchedule;
}

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: number;
}

export interface CallLog {
    id: string;
    matchId: string;
    callerId: string;
    receiverId: string;
    callStart: string; // ISO string
    callEnd: string; // ISO string
    status: CallStatus;
}