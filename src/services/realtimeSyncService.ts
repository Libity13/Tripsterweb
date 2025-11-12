// Real-time Sync Service - Handle real-time updates for trips and destinations
import { supabase } from '@/lib/unifiedSupabaseClient';
import { toast } from 'sonner';

export interface RealtimeSyncOptions {
  tripId: string;
  onDestinationsUpdate?: (destinations: any[]) => void;
  onTripUpdate?: (trip: any) => void;
  onError?: (error: any) => void;
}

export class RealtimeSyncService {
  private channels: Map<string, any> = new Map();
  private subscriptions: Map<string, any> = new Map();

  // Subscribe to trip changes
  subscribeToTrip(tripId: string, options: RealtimeSyncOptions) {
    console.log('🔄 Setting up real-time sync for trip:', tripId);
    
    // Clean up existing subscription
    this.unsubscribeFromTrip(tripId);

    // Subscribe to destinations changes
    const destinationsChannel = supabase
      .channel(`trip-${tripId}-destinations`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'destinations',
          filter: `trip_id=eq.${tripId}`
        },
        (payload) => {
          console.log('📱 Destination change detected:', payload);
          this.handleDestinationChange(payload, options);
        }
      )
      .subscribe();

    // Subscribe to trip changes
    const tripChannel = supabase
      .channel(`trip-${tripId}-trip`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trips',
          filter: `id=eq.${tripId}`
        },
        (payload) => {
          console.log('📱 Trip change detected:', payload);
          this.handleTripChange(payload, options);
        }
      )
      .subscribe();

    // Store channels
    this.channels.set(tripId, { destinationsChannel, tripChannel });
    
    return { destinationsChannel, tripChannel };
  }

  // Handle destination changes
  private async handleDestinationChange(payload: any, options: RealtimeSyncOptions) {
    try {
      const { eventType, new: newRecord, old: oldRecord } = payload;
      
      console.log('🔄 Processing destination change:', { eventType, newRecord, oldRecord });

      if (eventType === 'INSERT') {
        // New destination added
        toast.success(`เพิ่มสถานที่ "${newRecord.name}" แล้ว`);
        
        // Reload destinations
        await this.reloadDestinations(options);
      } else if (eventType === 'UPDATE') {
        // Destination updated
        toast.success(`อัปเดตสถานที่ "${newRecord.name}" แล้ว`);
        
        // Reload destinations
        await this.reloadDestinations(options);
      } else if (eventType === 'DELETE') {
        // Destination deleted
        toast.success(`ลบสถานที่ "${oldRecord.name}" แล้ว`);
        
        // Reload destinations
        await this.reloadDestinations(options);
      }
    } catch (error) {
      console.error('❌ Error handling destination change:', error);
      if (options.onError) {
        options.onError(error);
      }
    }
  }

  // Handle trip changes
  private async handleTripChange(payload: any, options: RealtimeSyncOptions) {
    try {
      const { eventType, new: newRecord, old: oldRecord } = payload;
      
      console.log('🔄 Processing trip change:', { eventType, newRecord, oldRecord });

      if (eventType === 'UPDATE') {
        // Trip updated
        toast.success('อัปเดตข้อมูลทริปแล้ว');
        
        if (options.onTripUpdate) {
          options.onTripUpdate(newRecord);
        }
      }
    } catch (error) {
      console.error('❌ Error handling trip change:', error);
      if (options.onError) {
        options.onError(error);
      }
    }
  }

  // Reload destinations from database
  private async reloadDestinations(options: RealtimeSyncOptions) {
    try {
      const { data: destinations, error } = await supabase
        .from('destinations')
        .select('*')
        .eq('trip_id', options.tripId)
        .order('order_index');

      if (error) throw error;

      if (options.onDestinationsUpdate) {
        options.onDestinationsUpdate(destinations || []);
      }
    } catch (error) {
      console.error('❌ Error reloading destinations:', error);
      if (options.onError) {
        options.onError(error);
      }
    }
  }

  // Unsubscribe from trip
  unsubscribeFromTrip(tripId: string) {
    const channels = this.channels.get(tripId);
    if (channels) {
      console.log('🔄 Cleaning up real-time sync for trip:', tripId);
      
      if (channels.destinationsChannel) {
        supabase.removeChannel(channels.destinationsChannel);
      }
      if (channels.tripChannel) {
        supabase.removeChannel(channels.tripChannel);
      }
      
      this.channels.delete(tripId);
    }
  }

  // Unsubscribe from all trips
  unsubscribeFromAll() {
    console.log('🔄 Cleaning up all real-time subscriptions');
    
    for (const [tripId, channels] of this.channels) {
      this.unsubscribeFromTrip(tripId);
    }
  }

  // Get subscription status
  getSubscriptionStatus(tripId: string) {
    return this.channels.has(tripId);
  }
}

// Export singleton instance
export const realtimeSyncService = new RealtimeSyncService();
