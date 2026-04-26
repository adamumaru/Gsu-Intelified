import { mockLostItems, mockFoundItems, mockUser } from '../constants';
import type { Item, Match, PickupSchedule, PickupScheduleStatus } from '../types';
import { geminiService } from './geminiService';

const simulateDelay = (ms: number) => new Promise(res => setTimeout(res, ms));

let mockSchedules: PickupSchedule[] = [];

export const mockApiService = {
  async getLostItems(): Promise<Item[]> {
    await simulateDelay(500);
    return [...mockLostItems];
  },

  async getFoundItems(): Promise<Item[]> {
    await simulateDelay(500);
    return [...mockFoundItems];
  },

  async reportItem(itemData: Omit<Item, 'id' | 'userId' | 'isApproved'>): Promise<Item> {
    await simulateDelay(1000);
    const newItem: Item = {
      ...itemData,
      id: `${itemData.status}_${Date.now()}`,
      userId: 'user_123', // Mocked user
      isApproved: false, // Items need admin approval
    };
    if (newItem.status === 'lost') {
      mockLostItems.unshift(newItem);
    } else {
      mockFoundItems.unshift(newItem);
    }
    return newItem;
  },

  async getMatches(lostItem: Item, allFoundItems: Item[]): Promise<Match[]> {
    await simulateDelay(1500);
    const potentialMatches = allFoundItems.filter(foundItem => foundItem.category === lostItem.category);
    
    // FIX: Add an explicit return type to the async map function to ensure the created object conforms to the Match type.
    const matchesPromises = potentialMatches.map(async (foundItem): Promise<Match | null> => {
      const aiResult = await geminiService.getAISmartMatch(lostItem, foundItem);
      if (aiResult.matchScore > 40) { // Threshold for a potential match
        // In a real app, you'd look up user names from user IDs.
        const ownerName = mockUser.id === lostItem.userId ? mockUser.name : "Another Student";
        const finderName = "A Kind Finder"; // Mocked for simplicity
        
        const matchId = `match_${lostItem.id}_${foundItem.id}`;
        const existingSchedule = mockSchedules.find(s => s.matchId === matchId);

        return {
          id: matchId,
          lostItemId: lostItem.id,
          foundItemId: foundItem.id,
          ownerId: lostItem.userId,
          finderId: foundItem.userId,
          ownerName,
          finderName,
          matchScore: aiResult.matchScore,
          reasons: aiResult.reasons,
          status: 'pending',
          pickupSchedule: existingSchedule,
        };
      }
      return null;
    });

    const matches = (await Promise.all(matchesPromises))
      .filter((match): match is Match => match !== null)
      .sort((a, b) => b.matchScore - a.matchScore);
      
    return matches;
  },
  
  async schedulePickup(matchId: string, details: Omit<PickupSchedule, 'id' | 'status' | 'createdAt' | 'matchId' | 'receiverId'>): Promise<PickupSchedule> {
      await simulateDelay(700);
      const newSchedule: PickupSchedule = {
          ...details,
          id: `sched_${Date.now()}`,
          matchId,
          receiverId: 'user_456', // Mocked
          status: 'pending',
          createdAt: new Date().toISOString(),
      };
      mockSchedules.push(newSchedule);
      return newSchedule;
  },
  
  async updatePickupStatus(scheduleId: string, status: PickupScheduleStatus): Promise<PickupSchedule | null> {
    await simulateDelay(500);
    const scheduleIndex = mockSchedules.findIndex(s => s.id === scheduleId);
    if (scheduleIndex > -1) {
        const schedule = mockSchedules[scheduleIndex];
        schedule.status = status;
        
        if (status === 'completed') {
            // Extract item IDs from matchId (match_lostId_foundId)
            const parts = schedule.matchId.split('_');
            if (parts.length >= 3) {
                const lostId = parts[1];
                const foundId = parts[2];
                this.updateItemStatus(lostId, 'claimed');
                this.updateItemStatus(foundId, 'claimed');
            }
        }
        return schedule;
    }
    return null;
  },

  async updateItemStatus(itemId: string, status: Item['status']): Promise<boolean> {
      await simulateDelay(300);
      const lostIndex = mockLostItems.findIndex(i => i.id === itemId);
      if (lostIndex > -1) {
          mockLostItems[lostIndex].status = status;
          return true;
      }
      const foundIndex = mockFoundItems.findIndex(i => i.id === itemId);
      if (foundIndex > -1) {
          mockFoundItems[foundIndex].status = status;
          return true;
      }
      return false;
  },

  async initiateCall(matchId: string): Promise<{ callId: string }> {
    console.log(`Initiating secure call for match: ${matchId}`);
    await simulateDelay(2500); // Simulate ringing
    console.log(`Call connected for match: ${matchId}`);
    return { callId: `call_${Date.now()}` };
  },

  async endCall(callId: string): Promise<{ success: boolean }> {
    console.log(`Ending call: ${callId}`);
    await simulateDelay(200);
    return { success: true };
  },
};