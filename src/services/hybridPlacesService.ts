import { supabase } from '@/lib/unifiedSupabaseClient';

export class HybridPlacesService {
  private googleApiKey: string;

  constructor(googleApiKey: string) {
    this.googleApiKey = googleApiKey;
  }

  // Smart search: Check cache first, then Google API
  async searchPlaces(query: string, location?: { lat: number; lng: number }, radius?: number) {
    try {
      // 1. Check cache first
      const cachedResults = await this.getCachedPlaces(query, location, radius);
      
      if (cachedResults.length > 0) {
        console.log('📦 Using cached data');
        return cachedResults;
      }

      // 2. Fetch from Google Places API
      console.log('🌐 Fetching from Google Places API');
      const googleResults = await this.fetchFromGooglePlaces(query, location, radius);
      
      // 3. Cache the results
      await this.cachePlaces(googleResults);
      
      return googleResults;
    } catch (error) {
      console.error('Search error:', error);
      throw error;
    }
  }

  // Get nearby places using PostGIS
  async getNearbyPlaces(location: { lat: number; lng: number }, radius: number = 1000, limit: number = 20) {
    const { data, error } = await supabase.rpc('find_nearby_places', {
      p_latitude: location.lat,
      p_longitude: location.lng,
      p_radius_meters: radius,
      p_limit: limit
    });

    if (error) throw error;
    return data;
  }

  // Get place details (cache first, then Google)
  async getPlaceDetails(placeId: string) {
    try {
      // 1. Check cache
      const { data: cached, error } = await supabase
        .from('places_cache')
        .select('*')
        .eq('place_id', placeId)
        .single();

      if (cached && !this.isCacheExpired(cached.cache_expires_at)) {
        console.log('📦 Using cached place details');
        return cached;
      }

      // 2. Fetch from Google Places API
      console.log('🌐 Fetching place details from Google');
      const googleDetails = await this.fetchPlaceDetailsFromGoogle(placeId);
      
      // 3. Update cache
      await this.updatePlaceCache(placeId, googleDetails);
      
      return googleDetails;
    } catch (error) {
      console.error('Get place details error:', error);
      throw error;
    }
  }

  // Smart refresh: Update expired cache
  async refreshExpiredPlaces() {
    const { data: expiredPlaces, error } = await supabase
      .from('places_cache')
      .select('place_id')
      .lt('cache_expires_at', new Date().toISOString())
      .limit(10);

    if (error) throw error;

    for (const place of expiredPlaces || []) {
      try {
        const updatedData = await this.fetchPlaceDetailsFromGoogle(place.place_id);
        await this.updatePlaceCache(place.place_id, updatedData);
        console.log(`🔄 Refreshed place: ${place.place_id}`);
      } catch (error) {
        console.error(`Failed to refresh place ${place.place_id}:`, error);
      }
    }
  }

  // Private methods
  private async getCachedPlaces(query: string, location?: { lat: number; lng: number }, radius?: number) {
    let queryBuilder = supabase
      .from('places_cache')
      .select('*')
      .ilike('name', `%${query}%`)
      .gt('cache_expires_at', new Date().toISOString());

    if (location && radius) {
      // Use PostGIS for spatial search
      const { data, error } = await supabase.rpc('find_nearby_places', {
        p_latitude: location.lat,
        p_longitude: location.lng,
        p_radius_meters: radius,
        p_limit: 20
      });

      if (error) throw error;
      return data || [];
    }

    const { data, error } = await queryBuilder.limit(20);
    if (error) throw error;
    return data || [];
  }

  private async fetchFromGooglePlaces(query: string, location?: { lat: number; lng: number }, radius?: number) {
    const { data, error } = await supabase.functions.invoke('google-places', {
      body: {
        action: 'search',
        data: { query, location, radius }
      }
    });

    if (error) throw error;
    return data.data?.results || [];
  }

  private async fetchPlaceDetailsFromGoogle(placeId: string) {
    const { data, error } = await supabase.functions.invoke('google-places', {
      body: {
        action: 'details',
        data: { placeId }
      }
    });

    if (error) throw error;
    return data.data?.result;
  }

  private async cachePlaces(places: any[]) {
    const placesToCache = places.map(place => ({
      place_id: place.place_id,
      name: place.name,
      formatted_address: place.formatted_address,
      latitude: place.geometry?.location?.lat,
      longitude: place.geometry?.location?.lng,
      place_types: place.types || [],
      rating: place.rating,
      user_ratings_total: place.user_ratings_total,
      price_level: place.price_level,
      photos: place.photos || [],
      opening_hours: place.opening_hours,
      phone_number: place.formatted_phone_number,
      website: place.website,
      google_data: place,
      last_updated: new Date().toISOString(),
      cache_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
    }));

    const { error } = await supabase
      .from('places_cache')
      .upsert(placesToCache, { onConflict: 'place_id' });

    if (error) throw error;
  }

  private async updatePlaceCache(placeId: string, placeData: any) {
    const { error } = await supabase
      .from('places_cache')
      .update({
        name: placeData.name,
        formatted_address: placeData.formatted_address,
        rating: placeData.rating,
        user_ratings_total: placeData.user_ratings_total,
        price_level: placeData.price_level,
        photos: placeData.photos,
        opening_hours: placeData.opening_hours,
        phone_number: placeData.formatted_phone_number,
        website: placeData.website,
        google_data: placeData,
        last_updated: new Date().toISOString(),
        cache_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      })
      .eq('place_id', placeId);

    if (error) throw error;
  }

  private isCacheExpired(expiresAt: string): boolean {
    return new Date(expiresAt) < new Date();
  }
}
