import { supabase } from './supabaseClient';
import type { Item, Match, PickupSchedule, PickupScheduleStatus, User } from '../types';
import { geminiService } from './geminiService';

// Mapper to convert snake_case Postgres DB Item to camelCase App Item
function mapDbItemToAppItem(dbItem: any): Item {
  return {
    id: dbItem.id,
    name: dbItem.name,
    category: dbItem.category,
    description: dbItem.description,
    location: dbItem.location,
    date: dbItem.date,
    imageUrl: dbItem.image_url || undefined,
    status: dbItem.status,
    userId: dbItem.user_id,
    isApproved: dbItem.is_approved
  };
}

// Mapper to convert camelCase App Item to snake_case Postgres DB Item
function mapAppItemToDbItem(appItem: Omit<Item, 'id' | 'userId' | 'isApproved'> & { userId: string }) {
  return {
    name: appItem.name,
    category: appItem.category,
    description: appItem.description,
    location: appItem.location,
    date: appItem.date,
    image_url: appItem.imageUrl || null,
    status: appItem.status,
    user_id: appItem.userId,
    is_approved: false // Always requires approval on creation
  };
}

function mapDbScheduleToAppSchedule(dbSchedule: any): PickupSchedule {
  return {
    id: dbSchedule.id,
    matchId: dbSchedule.match_id,
    requesterId: dbSchedule.requester_id,
    receiverId: dbSchedule.receiver_id,
    date: dbSchedule.date,
    time: dbSchedule.time,
    location: dbSchedule.location,
    status: dbSchedule.status,
    notes: dbSchedule.notes || undefined,
    createdAt: dbSchedule.created_at
  };
}

export const mockApiService = {
  // Helper to load user profile details
  async getUserProfile(userId: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error("Error fetching user profile:", error);
      return null;
    }

    return {
      id: data.id,
      name: data.name,
      email: '', // Available via auth.users but profiles doesn't require it publicly
      matricNumber: data.matric_number,
      role: data.role,
      score: data.score,
      badges: data.badges,
      qrcodes: [] // Generated dynamically in UI
    };
  },

  async getLostItems(): Promise<Item[]> {
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .eq('status', 'lost')
      .order('date', { ascending: false });

    if (error) {
      console.error("Error loading lost items:", error);
      return [];
    }

    return data.map(mapDbItemToAppItem);
  },

  async getFoundItems(): Promise<Item[]> {
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .eq('status', 'found')
      .order('date', { ascending: false });

    if (error) {
      console.error("Error loading found items:", error);
      return [];
    }

    return data.map(mapDbItemToAppItem);
  },

  async reportItem(itemData: Omit<Item, 'id' | 'userId' | 'isApproved'>): Promise<Item> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("User must be logged in to report an item.");
    }

    const dbItem = mapAppItemToDbItem({
      ...itemData,
      userId: user.id
    });

    const { data, error } = await supabase
      .from('items')
      .insert([dbItem])
      .select()
      .single();

    if (error) {
      console.error("Error inserting item:", error);
      throw error;
    }

    return mapDbItemToAppItem(data);
  },

  async getMatches(lostItem: Item, allFoundItems: Item[]): Promise<Match[]> {
    // 1. Fetch any existing matches stored in Supabase for this lost item
    const { data: dbMatches, error: matchesError } = await supabase
      .from('matches')
      .select('*, pickup_schedule:pickup_schedules(*)')
      .eq('lost_item_id', lostItem.id);

    if (matchesError) {
      console.error("Error loading db matches:", matchesError);
    }

    const existingMatchesMap = new Map<string, any>();
    if (dbMatches) {
      dbMatches.forEach(m => {
        existingMatchesMap.set(m.found_item_id, m);
      });
    }

    // 2. Filter found items in same category to calculate smart AI matching
    const potentialMatches = allFoundItems.filter(foundItem => foundItem.category === lostItem.category);

    const matchesPromises = potentialMatches.map(async (foundItem): Promise<Match | null> => {
      // If we have an existing match recorded in Supabase, load and return it directly
      if (existingMatchesMap.has(foundItem.id)) {
        const dbMatch = existingMatchesMap.get(foundItem.id);
        const ownerProfile = await this.getUserProfile(dbMatch.owner_id);
        const finderProfile = await this.getUserProfile(dbMatch.finder_id);

        const schedule = dbMatch.pickup_schedule && dbMatch.pickup_schedule.length > 0 
          ? dbMatch.pickup_schedule[0] 
          : null;

        return {
          id: dbMatch.id,
          lostItemId: dbMatch.lost_item_id,
          foundItemId: dbMatch.found_item_id,
          ownerId: dbMatch.owner_id,
          finderId: dbMatch.finder_id,
          ownerName: ownerProfile?.name || "Lost Item Owner",
          finderName: finderProfile?.name || "Finder",
          matchScore: dbMatch.match_score,
          reasons: dbMatch.reasons,
          status: dbMatch.status,
          pickupSchedule: schedule ? mapDbScheduleToAppSchedule(schedule) : undefined
        };
      }

      // Otherwise, call the Gemini AI Smart Matcher!
      const aiResult = await geminiService.getAISmartMatch(lostItem, foundItem);
      
      if (aiResult.matchScore > 40) {
        // Fetch profiles to get full names
        const ownerProfile = await this.getUserProfile(lostItem.userId);
        const finderProfile = await this.getUserProfile(foundItem.userId);

        // Store this match in Supabase so we cache it
        const { data: newDbMatch, error: insertError } = await supabase
          .from('matches')
          .insert([{
            lost_item_id: lostItem.id,
            found_item_id: foundItem.id,
            owner_id: lostItem.userId,
            finder_id: foundItem.userId,
            match_score: aiResult.matchScore,
            reasons: aiResult.reasons,
            status: 'pending'
          }])
          .select()
          .single();

        if (insertError) {
          console.error("Error creating match row in DB:", insertError);
          return null;
        }

        return {
          id: newDbMatch.id,
          lostItemId: newDbMatch.lost_item_id,
          foundItemId: newDbMatch.found_item_id,
          ownerId: newDbMatch.owner_id,
          finderId: newDbMatch.finder_id,
          ownerName: ownerProfile?.name || "Lost Item Owner",
          finderName: finderProfile?.name || "Finder",
          matchScore: newDbMatch.match_score,
          reasons: newDbMatch.reasons,
          status: 'pending'
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    // Fetch match to know who the other user is
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select('*')
      .eq('id', matchId)
      .single();

    if (matchError) throw matchError;

    // receiverId is the counterpart (whoever isn't the logged-in requester)
    const receiverId = user.id === match.owner_id ? match.finder_id : match.owner_id;

    const { data, error } = await supabase
      .from('pickup_schedules')
      .insert([{
        match_id: matchId,
        requester_id: user.id,
        receiver_id: receiverId,
        date: details.date,
        time: details.time,
        location: details.location,
        status: 'pending',
        notes: details.notes || null
      }])
      .select()
      .single();

    if (error) {
      console.error("Error scheduling pickup:", error);
      throw error;
    }

    return mapDbScheduleToAppSchedule(data);
  },

  async updatePickupStatus(scheduleId: string, status: PickupScheduleStatus): Promise<PickupSchedule | null> {
    const { data, error } = await supabase
      .from('pickup_schedules')
      .update({ status })
      .eq('id', scheduleId)
      .select()
      .single();

    if (error) {
      console.error("Error updating schedule status:", error);
      return null;
    }

    if (status === 'completed') {
      // Fetch match to get lost and found item IDs
      const { data: schedule } = await supabase
        .from('pickup_schedules')
        .select('*, match:matches(*)')
        .eq('id', scheduleId)
        .single();

      if (schedule && schedule.match) {
        await this.updateItemStatus(schedule.match.lost_item_id, 'claimed');
        await this.updateItemStatus(schedule.match.found_item_id, 'claimed');

        // Increase scores in profiles for successful return (finder earns points!)
        const finderId = schedule.match.finder_id;
        const { data: profile } = await supabase
          .from('profiles')
          .select('score, badges')
          .eq('id', finderId)
          .single();

        if (profile) {
          const newScore = profile.score + 50; // Earn 50 points
          const updatedBadges = [...profile.badges];
          if (newScore >= 100 && !updatedBadges.includes('Campus Hero')) {
            updatedBadges.push('Campus Hero');
          }
          if (!updatedBadges.includes('Good Samaritan')) {
            updatedBadges.push('Good Samaritan');
          }

          await supabase
            .from('profiles')
            .update({ score: newScore, badges: updatedBadges })
            .eq('id', finderId);
        }
      }
    }

    return mapDbScheduleToAppSchedule(data);
  },

  async updateItemStatus(itemId: string, status: Item['status']): Promise<boolean> {
    const { error } = await supabase
      .from('items')
      .update({ status })
      .eq('id', itemId);

    if (error) {
      console.error("Error updating item status:", error);
      return false;
    }
    return true;
  },

  async updateItemApproval(itemId: string, isApproved: boolean): Promise<boolean> {
    const { error } = await supabase
      .from('items')
      .update({ is_approved: isApproved })
      .eq('id', itemId);

    if (error) {
      console.error("Error updating item approval:", error);
      return false;
    }
    return true;
  },

  async deleteItem(itemId: string): Promise<boolean> {
    const { error } = await supabase
      .from('items')
      .delete()
      .eq('id', itemId);

    if (error) {
      console.error("Error deleting item:", error);
      return false;
    }
    return true;
  },

  async getLeaderboard(): Promise<Omit<User, 'email' | 'matricNumber' | 'role' | 'qrcodes'>[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, score, badges')
      .order('score', { ascending: false });

    if (error) {
      console.error("Error getting leaderboard:", error);
      return [];
    }

    return data.map(p => ({
      id: p.id,
      name: p.name,
      score: p.score,
      badges: p.badges
    }));
  },

  async initiateCall(matchId: string): Promise<{ callId: string }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select('*')
      .eq('id', matchId)
      .single();

    if (matchError) throw matchError;

    const receiverId = user.id === match.owner_id ? match.finder_id : match.owner_id;

    const { data, error } = await supabase
      .from('call_logs')
      .insert([{
        match_id: matchId,
        caller_id: user.id,
        receiver_id: receiverId,
        status: 'connected'
      }])
      .select()
      .single();

    if (error) {
      console.error("Error loggiing call start:", error);
      throw error;
    }

    return { callId: data.id };
  },

  async endCall(callId: string): Promise<{ success: boolean }> {
    const { error } = await supabase
      .from('call_logs')
      .update({
        call_end: new Date().toISOString(),
        status: 'ended'
      })
      .eq('id', callId);

    if (error) {
      console.error("Error logging call end:", error);
      return { success: false };
    }
    return { success: true };
  }
};