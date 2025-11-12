// Database helper functions
import { supabase } from '@/lib/unifiedSupabaseClient';

// Get content by language preference
export const getLocalizedContent = (
  thai: string | null, 
  english: string | null, 
  language: string = 'th'
): string => {
  if (language === 'en' && english && english.trim()) {
    return english;
  }
  return thai || english || '';
};

// Trip operations
export const tripService = {
  // Create new trip
  async create(tripData: {
    title: string;
    title_en?: string;
    description?: string;
    description_en?: string;
    start_date?: string;
    end_date?: string;
    budget_max?: number;
    language?: string;
  }) {
    const { data, error } = await supabase
      .from('trips')
      .insert({
        ...tripData,
        language: tripData.language || 'th'
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Get user trips
  async getUserTrips(userId: string) {
    const { data, error } = await supabase
      .from('trips')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Get trip with destinations
  async getTripWithDestinations(tripId: string) {
    const { data, error } = await supabase
      .from('trips')
      .select(`
        *,
        destinations (*)
      `)
      .eq('id', tripId)
      .single();

    if (error) throw error;
    return data;
  }
};

// Destination operations
export const destinationService = {
  // Add destination to trip
  async add(tripId: string, destinationData: {
    name: string;
    name_en?: string;
    description?: string;
    description_en?: string;
    latitude?: number;
    longitude?: number;
    order_index: number;
    place_id?: string;
    language?: string;
  }) {
    const { data, error } = await supabase
      .from('destinations')
      .insert({
        trip_id: tripId,
        ...destinationData,
        language: destinationData.language || 'th'
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Update destination order
  async updateOrder(destinationId: string, orderIndex: number) {
    const { data, error } = await supabase
      .from('destinations')
      .update({ order_index: orderIndex })
      .eq('id', destinationId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Get trip destinations
  async getTripDestinations(tripId: string) {
    const { data, error } = await supabase
      .from('destinations')
      .select('*')
      .eq('trip_id', tripId)
      .order('order_index');

    if (error) throw error;
    return data;
  }
};

// Chat operations
export const chatService = {
  // Send message
  async sendMessage(tripId: string, messageData: {
    content: string;
    content_en?: string;
    role: 'user' | 'assistant' | 'system';
    language?: string;
  }) {
    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        trip_id: tripId,
        user_id: (await supabase.auth.getUser()).data.user?.id,
        ...messageData,
        language: messageData.language || 'th'
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Get trip messages
  async getTripMessages(tripId: string) {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('trip_id', tripId)
      .order('created_at');

    if (error) throw error;
    return data;
  }
};

// Places operations
export const placesService = {
  // Search places
  async search(query: string, location?: { lat: number; lng: number }, radius?: number) {
    const { data, error } = await supabase.functions.invoke('google-places', {
      body: {
        action: 'search',
        data: { query, location, radius }
      }
    });

    if (error) throw error;
    return data;
  },

  // Get place details
  async getDetails(placeId: string) {
    const { data, error } = await supabase.functions.invoke('google-places', {
      body: {
        action: 'details',
        data: { placeId }
      }
    });

    if (error) throw error;
    return data;
  },

  // Find nearby places using PostGIS
  async findNearby(latitude: number, longitude: number, radius: number = 5000) {
    const { data, error } = await supabase
      .rpc('find_places_nearby', {
        p_latitude: latitude,
        p_longitude: longitude,
        p_radius_meters: radius
      });

    if (error) throw error;
    return data;
  }
};
