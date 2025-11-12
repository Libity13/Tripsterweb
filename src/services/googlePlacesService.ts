// Google Places Service - Direct API calls to Edge Function
import { supabase } from '@/lib/unifiedSupabaseClient';

export interface PlaceSearchParams {
  q: string;
  type?: 'textsearch' | 'details' | 'nearby';
  place_id?: string;
  pagetoken?: string;
  language?: string;
  region?: string;
  location?: { lat: number; lng: number };
  radius?: number;
  params?: Record<string, any>;
}

export interface PlaceResult {
  place_id: string;
  name: string;
  formatted_address: string;
  geometry: {
    location: { lat: number; lng: number };
  };
  rating?: number;
  user_ratings_total?: number;
  price_level?: number;
  photos?: Array<{
    photo_reference: string;
    height: number;
    width: number;
  }>;
  types?: string[];
  opening_hours?: {
    open_now: boolean;
    weekday_text: string[];
  };
  website?: string;
  phone_number?: string;
}

export interface PlacesResponse {
  status: string;
  next_page_token?: string;
  results?: PlaceResult[];
  result?: PlaceResult;
  error_message?: string;
}

export const googlePlacesService = {
  // Search places
  async searchPlaces(params: PlaceSearchParams): Promise<PlacesResponse> {
    try {
      console.log('🔍 Searching places:', params.q);
      
      // Call Edge Function using supabase-js
      const response = await supabase.functions.invoke('google-places', {
        body: {
          type: params.type || 'textsearch',
          q: params.q,
          place_id: params.place_id,
          pagetoken: params.pagetoken,
          language: params.language || 'th',
          region: params.region || 'th',
          location: params.location,
          radius: params.radius,
          params: params.params || {}
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const data = response.data;

      if (data.error) {
        throw new Error(data.error);
      }

      return data;
    } catch (error) {
      console.error('Google Places API error:', error);
      throw error;
    }
  },

  // Get place details
  async getPlaceDetails(place_id: string, language: string = 'th'): Promise<PlaceResult | null> {
    try {
      const response = await this.searchPlaces({
        type: 'details',
        place_id,
        language
      });

      return response.result || null;
    } catch (error) {
      console.error('Get place details error:', error);
      return null;
    }
  },

  // Search nearby places
  async searchNearby(
    location: { lat: number; lng: number },
    radius: number,
    keyword?: string,
    language: string = 'th'
  ): Promise<PlaceResult[]> {
    try {
      const response = await this.searchPlaces({
        type: 'nearby',
        q: keyword || '',
        location,
        radius,
        language
      });

      return response.results || [];
    } catch (error) {
      console.error('Search nearby error:', error);
      return [];
    }
  },

  // Text search with pagination
  async textSearch(
    query: string,
    language: string = 'th',
    region: string = 'th',
    pagetoken?: string
  ): Promise<{ results: PlaceResult[]; next_page_token?: string }> {
    try {
      const response = await this.searchPlaces({
        type: 'textsearch',
        q: query,
        language,
        region,
        pagetoken
      });

      return {
        results: response.results || [],
        next_page_token: response.next_page_token
      };
    } catch (error) {
      console.error('Text search error:', error);
      return { results: [] };
    }
  }
};