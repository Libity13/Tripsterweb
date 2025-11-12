// Enhanced Places Service - Inspired by Tripster
import { supabase } from '@/lib/unifiedSupabaseClient';

export interface EnhancedPlaceSearchParams {
  q: string;
  type?: 'tourist_attraction' | 'lodging' | 'restaurant' | 'shopping_mall';
  language?: string;
  region?: string;
  location?: { lat: number; lng: number };
  radius?: number;
}

export interface EnhancedPlace {
  place_id: string;
  name: string;
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  photos?: Array<{
    photo_reference: string;
    height: number;
    width: number;
  }>;
  rating?: number;
  user_ratings_total?: number;
  types?: string[];
  opening_hours?: {
    weekday_text: string[];
  };
  website?: string;
  url?: string;
}

export interface EnhancedPlacesResponse {
  status: string;
  results?: EnhancedPlace[];
  next_page_token?: string;
  error_message?: string;
}

export const enhancedPlacesService = {
  // Search places with enhanced filtering
  async searchPlaces(params: EnhancedPlaceSearchParams): Promise<EnhancedPlacesResponse> {
    try {
      console.log('🔍 Enhanced searching places:', params.q);
      
      const response = await supabase.functions.invoke('google-places', {
        body: {
          type: 'textsearch',
          q: params.q,
          language: params.language || 'th',
          region: params.region || 'th',
          location: params.location,
          radius: params.radius,
          params: {
            type: params.type || 'tourist_attraction',
            fields: 'place_id,geometry,formatted_address,name,photos,rating,user_ratings_total,types,opening_hours,website,url'
          }
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const data = response.data;

      if (data.error) {
        throw new Error(data.error);
      }

      // Enhanced filtering like Tripster
      if (data.results) {
        data.results = data.results
          .filter(place => place.geometry)
          .sort((a, b) => (b.rating || 0) - (a.rating || 0) || (b.user_ratings_total || 0) - (a.user_ratings_total || 0));
      }

      return data;
    } catch (error: any) {
      console.error('Error fetching enhanced places:', error);
      return {
        status: 'ERROR',
        error_message: error.message || 'Failed to fetch places'
      };
    }
  },

  // Get place details
  async getPlaceDetails(placeId: string): Promise<EnhancedPlace | null> {
    try {
      const response = await supabase.functions.invoke('google-places', {
        body: {
          type: 'details',
          place_id: placeId,
          language: 'th',
          region: 'th',
          params: {
            fields: 'name,formatted_address,photo,rating,user_ratings_total,types,website,url,opening_hours'
          }
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      return response.data.result || null;
    } catch (error: any) {
      console.error('Error fetching place details:', error);
      return null;
    }
  },

  // Get nearby places
  async getNearbyPlaces(
    location: { lat: number; lng: number },
    type: string = 'tourist_attraction',
    radius: number = 5000
  ): Promise<EnhancedPlacesResponse> {
    try {
      const response = await supabase.functions.invoke('google-places', {
        body: {
          type: 'nearby',
          location,
          radius,
          language: 'th',
          region: 'th',
          params: {
            type,
            fields: 'place_id,geometry,formatted_address,name,photos,rating,user_ratings_total,types'
          }
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const data = response.data;

      if (data.error) {
        throw new Error(data.error);
      }

      // Enhanced filtering
      if (data.results) {
        data.results = data.results
          .filter(place => place.geometry)
          .sort((a, b) => (b.rating || 0) - (a.rating || 0) || (b.user_ratings_total || 0) - (a.user_ratings_total || 0));
      }

      return data;
    } catch (error: any) {
      console.error('Error fetching nearby places:', error);
      return {
        status: 'ERROR',
        error_message: error.message || 'Failed to fetch nearby places'
      };
    }
  },

  // Get photo URL
  getPhotoUrl(photoReference: string, maxWidth: number = 400): string {
    if (!photoReference) return 'https://example.com/placeholder.jpg';
    return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photo_reference=${photoReference}&key=${import.meta.env.VITE_GOOGLE_PLACES_API_KEY}`;
  },

  // Create Google Maps URL
  createGoogleMapsUrl(latitude: number, longitude: number, placeName: string): string {
    if (!latitude || !longitude) return '';
    return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}&query_place=${encodeURIComponent(placeName)}`;
  }
};
