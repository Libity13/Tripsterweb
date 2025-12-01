// Trip Service - Real database integration
import { supabase } from '@/lib/unifiedSupabaseClient';
import { authService } from './authService';
import { Trip, Destination } from '@/types/database';
export type { Trip, Destination } from '@/types/database';

export const tripService = {
  // Create new trip
  async createTrip(tripData: Partial<Trip>): Promise<Trip> {
    // Get current user or guest ID
    const currentUser = await authService.getCurrentUser();
    const isAuthenticated = !!currentUser;
    
    const insertData: any = {
      title: tripData.title || 'แผนการเดินทางใหม่',
      title_en: tripData.title_en || 'New Travel Plan',
      description: tripData.description || 'แผนการเดินทางที่สร้างจาก AI Chat',
      description_en: tripData.description_en || 'Travel plan created from AI Chat',
      start_date: tripData.start_date || new Date().toISOString().split('T')[0],
      end_date: tripData.end_date || new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      total_duration: tripData.total_duration || 0,
      language: tripData.language || 'th'
    };

    // Only add total_cost if it exists in the database
    if ((tripData as any).total_cost !== undefined) {
      (insertData as any).total_cost = (tripData as any).total_cost;
    }

    // Set user_id or guest_id based on authentication status
    if (isAuthenticated) {
      insertData.user_id = currentUser.id;
      insertData.guest_id = null;
    } else {
      insertData.user_id = null;
      insertData.guest_id = authService.getGuestId();
    }

    const { data, error } = await supabase
      .from('trips')
      .insert([insertData])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create trip: ${error.message}`);
    }

    return {
      ...data,
      destinations: [],
      title_en: (data as any).title_en || data.title,
      description_en: (data as any).description_en || data.description,
      total_duration: 0,
      total_cost: 0,
      language: 'th'
    } as Trip;
  },

  // Load trip by ID
  async getTrip(tripId: string): Promise<Trip | null> {
    console.log('🔍 tripService.getTrip: Loading trip with ID:', tripId);
    
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('*')
      .eq('id', tripId)
      .single();

    if (tripError) {
      console.error('❌ tripService.getTrip: Error loading trip:', tripError);
      return null;
    }

    console.log('✅ tripService.getTrip: Trip loaded:', trip);

    // Load destinations
    const { data: destinations, error: destError } = await supabase
      .from('destinations')
      .select('*')
      .eq('trip_id', tripId)
      .order('order_index');

    if (destError) {
      console.error('❌ tripService.getTrip: Error loading destinations:', destError);
    }

    console.log('✅ tripService.getTrip: Destinations loaded:', destinations);

    const result = {
      ...trip,
      destinations: (destinations || []).map(dest => ({
        ...dest,
        name_en: (dest as any).name_en || dest.name,
        description_en: (dest as any).description_en || dest.description,
        rating: (dest as any).rating || 0,
        visit_duration: (dest as any).duration_minutes || 60,
        estimated_cost: (dest as any).estimated_cost || 0,
        place_types: (dest as any).place_types || ['tourist_attraction'],
        photos: (dest as any).photos || []
      })),
      title_en: (trip as any).title_en || trip.title,
      description_en: (trip as any).description_en || trip.description,
      total_duration: 0,
      total_cost: 0,
      language: 'th'
    } as Trip;

    console.log('✅ tripService.getTrip: Final result:', result);
    return result;
  },

  // Update trip
  async updateTrip(tripId: string, updates: Partial<Trip>): Promise<Trip> {
    const { data, error } = await supabase
      .from('trips')
      .update(updates)
      .eq('id', tripId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update trip: ${error.message}`);
    }

    return {
      ...data,
      title_en: (data as any).title_en || data.title,
      description_en: (data as any).description_en || data.description,
      total_duration: 0,
      total_cost: 0,
      language: 'th',
      destinations: []
    } as Trip;
  },

  // Add destination to trip
  async addDestination(tripId: string, destination: Omit<Destination, 'id'>): Promise<Destination> {
    console.log('📍 tripService.addDestination: Adding destination:', destination.name);
    console.log('📍 tripService.addDestination: Destination data:', {
      name: destination.name,
      place_id: destination.place_id,
      latitude: destination.latitude,
      longitude: destination.longitude,
      rating: destination.rating,
      formatted_address: destination.formatted_address,
      visit_date: destination.visit_date
    });
    
    // Get current user or guest ID
    const currentUser = await authService.getCurrentUser();
    const isAuthenticated = !!currentUser;
    
    // แปลงชนิดให้ชัวร์ทั้งหมด
    const insertData: any = {
      trip_id: tripId,
      name: destination.name,
      name_en: destination.name_en || destination.name,
      description: destination.description || '',
      description_en: destination.description_en || '',
      latitude: destination.latitude === null ? null : Number(destination.latitude),
      longitude: destination.longitude === null ? null : Number(destination.longitude),
      rating: destination.rating || 0,
      visit_duration: destination.visit_duration == null ? null : Math.round(Number(destination.visit_duration)),
      estimated_cost: destination.estimated_cost == null ? null : Math.round(Number(destination.estimated_cost)),
      place_types: destination.place_types || [],
      photos: destination.photos || [],
      visit_date: destination.visit_date ? Number(destination.visit_date) : 1,
      // ปล่อย order_index ให้ DB จัด auto ต่อวัน
      place_id: destination.place_id || null,
      formatted_address: destination.formatted_address || null,
      opening_hours: destination.opening_hours || null,
      price_level: destination.price_level || null,
      user_ratings_total: destination.user_ratings_total || null
    };

    if (isAuthenticated) {
      insertData.user_id = currentUser.id;
      insertData.guest_id = null;
    } else {
      insertData.user_id = null;
      insertData.guest_id = authService.getGuestId();
    }

    const { data, error } = await supabase
      .from('destinations')
      .insert([insertData])
      .select()
      .single();

    if (error) {
      console.error('❌ tripService.addDestination: Error:', error);
      throw new Error(`Failed to add destination: ${error.message}`);
    }

    console.log('✅ tripService.addDestination: Successfully added destination:', {
      id: data.id,
      name: data.name,
      place_id: (data as any).place_id,
      latitude: data.latitude,
      longitude: data.longitude,
      visit_date: (data as any).visit_date
    });

    return {
      ...data,
      name_en: (data as any).name_en || data.name,
      description_en: (data as any).description_en || data.description,
      rating: (data as any).rating || 0,
      visit_duration: (data as any).duration_minutes || 60,
      estimated_cost: (data as any).estimated_cost || 0,
      place_types: (data as any).place_types || ['tourist_attraction'],
      photos: (data as any).photos || []
    } as Destination;
  },

  // Update destination
  async updateDestination(destinationId: string, updates: Partial<Destination>): Promise<Destination> {
    const { data, error } = await supabase
      .from('destinations')
      .update(updates)
      .eq('id', destinationId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update destination: ${error.message}`);
    }

    return {
      ...data,
      name_en: (data as any).name_en || data.name,
      description_en: (data as any).description_en || data.description,
      rating: (data as any).rating || 0,
      visit_duration: (data as any).duration_minutes || 60,
      estimated_cost: (data as any).estimated_cost || 0,
      place_types: (data as any).place_types || ['tourist_attraction'],
      photos: (data as any).photos || []
    } as Destination;
  },

  // Delete destination
  async deleteDestination(destinationId: string): Promise<void> {
    const { error } = await supabase
      .from('destinations')
      .delete()
      .eq('id', destinationId);

    if (error) {
      throw new Error(`Failed to delete destination: ${error.message}`);
    }
  },

  // Remove destinations by names
  async removeDestinationsByNames(tripId: string, names: string[]): Promise<void> {
    console.log('🗑️ tripService.removeDestinationsByNames: Removing destinations:', names);
    
    const { error } = await supabase
      .from('destinations')
      .delete()
      .eq('trip_id', tripId)
      .in('name', names);

    if (error) {
      console.error('❌ tripService.removeDestinationsByNames: Error:', error);
      throw new Error(`Failed to remove destinations: ${error.message}`);
    }

    console.log('✅ tripService.removeDestinationsByNames: Successfully removed destinations');
  },

  // Reorder destinations
  async reorderDestinations(tripId: string, orders: Array<{name: string, day: number, order_index: number}>): Promise<void> {
    console.log('🔄 tripService.reorderDestinations: Reordering destinations:', orders);
    
    // อัปเดตทีละรายการให้ไปอยู่ day/order ที่กำหนด
    for (const order of orders) {
      const { error } = await supabase
        .from('destinations')
        .update({
          visit_date: Number(order.day),
          order_index: Number(order.order_index)
        })
        .eq('trip_id', tripId)
        .eq('name', order.name);

      if (error) {
        console.error('❌ tripService.reorderDestinations: Error updating', order.name, ':', error);
        throw new Error(`Failed to reorder destination ${order.name}: ${error.message}`);
      }
    }

    console.log('✅ tripService.reorderDestinations: Successfully reordered destinations');
  },

  // Update trip info
  async updateTripInfo(tripId: string, updates: {
    days?: number;
    start_date?: string;
    budget_min?: number;
    budget_max?: number;
  }): Promise<void> {
    console.log('📝 tripService.updateTripInfo: Updating trip info:', updates);
    
    // 1. Fetch current trip to calculate dates
    const { data: currentTrip, error: fetchError } = await supabase
      .from('trips')
      .select('start_date, end_date')
      .eq('id', tripId)
      .single();

    if (fetchError || !currentTrip) {
      throw new Error(`Failed to fetch trip for update: ${fetchError?.message || 'Trip not found'}`);
    }

    const updateData: any = {};
    let newStartDateStr = updates.start_date || currentTrip.start_date;
    
    // Calculate duration in ms
    // If days provided, use it. Else calculate from current start/end (or default 1)
    let days = updates.days;
    if (!days) {
      const start = new Date(currentTrip.start_date).getTime();
      const end = new Date(currentTrip.end_date).getTime();
      const diff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
      days = Math.max(1, diff + 1); // +1 because same day is 1 day duration
    }

    if (updates.start_date || updates.days) {
       const startDate = new Date(newStartDateStr);
       const endDate = new Date(startDate);
       // end = start + (days - 1)
       endDate.setDate(startDate.getDate() + (days - 1));
       
       updateData.start_date = startDate.toISOString().split('T')[0];
       updateData.end_date = endDate.toISOString().split('T')[0];
    }

    if (updates.budget_min !== undefined) updateData.budget_min = Number(updates.budget_min);
    if (updates.budget_max !== undefined) updateData.budget_max = Number(updates.budget_max);

    // Do NOT update 'days' column as it doesn't exist
    
    const { error } = await supabase
      .from('trips')
      .update(updateData)
      .eq('id', tripId);

    if (error) {
      console.error('❌ tripService.updateTripInfo: Error:', error);
      throw new Error(`Failed to update trip info: ${error.message}`);
    }

    console.log('✅ tripService.updateTripInfo: Successfully updated trip info');
  },

  // Get user trips - FIXED: Filter by user_id or guest_id
  async getUserTrips(): Promise<Trip[]> {
    // Get current user or guest ID
    const currentUser = await authService.getCurrentUser();
    const isAuthenticated = !!currentUser;
    const guestId = authService.getGuestId();
    
    let query = supabase
      .from('trips')
      .select(`
        *,
        destinations (*)
      `)
      .order('created_at', { ascending: false });
    
    // ✅ SECURITY FIX: Filter by user_id or guest_id
    if (isAuthenticated) {
      // Logged in user: show only their trips
      query = query.eq('user_id', currentUser.id);
      console.log('🔐 getUserTrips: Filtering by user_id:', currentUser.id);
    } else if (guestId) {
      // Guest user: show only their guest trips
      query = query.eq('guest_id', guestId);
      console.log('🔐 getUserTrips: Filtering by guest_id:', guestId);
    } else {
      // No user and no guest ID: return empty array
      console.log('🔐 getUserTrips: No user or guest ID, returning empty array');
      return [];
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to load trips: ${error.message}`);
    }

    console.log(`✅ getUserTrips: Found ${data?.length || 0} trips`);

    return (data || []).map(trip => ({
      ...trip,
      title_en: (trip as any).title_en || trip.title,
      description_en: (trip as any).description_en || trip.description,
      total_duration: 0,
      total_cost: 0,
      language: 'th',
      destinations: ((trip as any).destinations || []).map((dest: any) => ({
        ...dest,
        name_en: dest.name_en || dest.name,
        description_en: dest.description_en || dest.description,
        rating: dest.rating || 0,
        visit_duration: dest.duration_minutes || 60,
        estimated_cost: dest.estimated_cost || 0,
        place_types: dest.place_types || ['tourist_attraction'],
        photos: dest.photos || []
      }))
    })) as Trip[];
  },

  // Update trip status
  async updateTripStatus(tripId: string, status: string): Promise<void> {
    console.log('📊 tripService.updateTripStatus:', tripId, status);
    
    const { error } = await supabase
      .from('trips')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', tripId);
    
    if (error) {
      console.error('❌ tripService.updateTripStatus: Error:', error);
      throw new Error(`Failed to update trip status: ${error.message}`);
    }
    
    console.log('✅ tripService.updateTripStatus: Success');
  },

  // Delete trip and all related data
  async deleteTrip(tripId: string): Promise<void> {
    console.log('🗑️ tripService.deleteTrip: Deleting trip:', tripId);
    
    // Get current user to verify ownership
    const currentUser = await authService.getCurrentUser();
    const guestId = authService.getGuestId();
    
    // First, delete all destinations
    const { error: destError } = await supabase
      .from('destinations')
      .delete()
      .eq('trip_id', tripId);
    
    if (destError) {
      console.error('❌ tripService.deleteTrip: Error deleting destinations:', destError);
      throw new Error(`Failed to delete destinations: ${destError.message}`);
    }
    
    // Then, delete all chat messages
    const { error: chatError } = await supabase
      .from('chat_messages')
      .delete()
      .eq('trip_id', tripId);
    
    if (chatError) {
      console.warn('⚠️ tripService.deleteTrip: Error deleting chat messages:', chatError);
      // Don't throw, just warn - chat messages might not exist
    }
    
    // Finally, delete the trip itself
    let deleteQuery = supabase
      .from('trips')
      .delete()
      .eq('id', tripId);
    
    // ✅ SECURITY: Only allow deleting own trips
    if (currentUser) {
      deleteQuery = deleteQuery.eq('user_id', currentUser.id);
    } else if (guestId) {
      deleteQuery = deleteQuery.eq('guest_id', guestId);
    } else {
      throw new Error('Unauthorized: Cannot delete trip without authentication');
    }
    
    const { error } = await deleteQuery;
    
    if (error) {
      console.error('❌ tripService.deleteTrip: Error:', error);
      throw new Error(`Failed to delete trip: ${error.message}`);
    }
    
    console.log('✅ tripService.deleteTrip: Successfully deleted trip');
  }
};
