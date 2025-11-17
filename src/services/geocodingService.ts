// Geocoding Service - Fill missing coordinates for destinations
import { supabase } from '@/lib/unifiedSupabaseClient';

export interface GeocodingResult {
  latitude: number;
  longitude: number;
  formatted_address: string;
  place_id?: string;
}

export class GeocodingService {
  // Get coordinates for a destination name
  async geocodeDestination(destinationName: string): Promise<GeocodingResult | null> {
    try {
      console.log('🔍 Geocoding destination:', destinationName);
      
      // Try to find in places_cache first (if table exists)
      try {
        const { data: cached, error: cacheError } = await supabase
          .from('places_cache' as any)
          .select('*')
          .ilike('name', `%${destinationName}%`)
          .limit(1);

        if (!cacheError && cached && cached.length > 0) {
          console.log('✅ Found in cache:', cached[0]);
          return {
            latitude: (cached[0] as any).latitude,
            longitude: (cached[0] as any).longitude,
            formatted_address: (cached[0] as any).formatted_address,
            place_id: (cached[0] as any).place_id
          };
        }
      } catch (error) {
        console.log('ℹ️ Places cache table not available, skipping cache lookup');
      }

      // If not in cache, try Google Places API with multiple search strategies
      const searchQueries: string[] = [];
      
      // 1. Try extracting Thai name from parentheses first (e.g., "The glass cafe(เดอะกลาสคาเฟ่)" → "เดอะกลาสคาเฟ่")
      const thaiNameMatch = destinationName.match(/\(([^)]+)\)/);
      if (thaiNameMatch && thaiNameMatch[1]) {
        const thaiName = thaiNameMatch[1].trim();
        if (thaiName.length >= 3) {
          searchQueries.push(thaiName);
          searchQueries.push(`${thaiName} ประเทศไทย`);
        }
      }
      
      // 2. Original query
      searchQueries.push(destinationName);
      
      // 3. Add context
      searchQueries.push(`${destinationName} สถานที่ท่องเที่ยว`);
      searchQueries.push(`${destinationName} ประเทศไทย`);
      
      // 4. Try removing parentheses content (e.g., "The glass cafe(เดอะกลาสคาเฟ่)" → "The glass cafe")
      const withoutParentheses = destinationName.replace(/\([^)]*\)/g, '').trim();
      if (withoutParentheses !== destinationName && withoutParentheses.length >= 3) {
        searchQueries.push(withoutParentheses);
      }
      
      // 5. Try first significant word (skip common words like "The", "A", "An", and must be >= 3 chars)
      const words = destinationName.split(' ').map(w => w.trim()).filter(w => w.length > 0);
      const commonWords = ['the', 'a', 'an', 'at', 'in', 'on', 'of', 'to'];
      const significantWord = words.find(word => 
        word.length >= 3 && 
        !commonWords.includes(word.toLowerCase()) &&
        !/^[0-9]+$/.test(word) // Not just numbers
      );
      if (significantWord && significantWord !== destinationName) {
        searchQueries.push(`${significantWord} ประเทศไทย`);
      }

      for (const query of searchQueries) {
        // Skip queries that are too short (less than 3 characters) or just numbers
        if (query.length < 3 || /^[0-9\s]+$/.test(query)) {
          console.log(`⏭️ Skipping too short or invalid query: "${query}"`);
          continue;
        }
        
        try {
          console.log(`🔍 Searching with query: "${query}"`);
          
          const { data, error } = await supabase.functions.invoke('google-places', {
            body: {
              type: 'textsearch',
              q: query,
              language: 'th',
              region: 'th',
              params: {
                type: 'tourist_attraction',
                fields: 'place_id,geometry,formatted_address,name,photos,rating,user_ratings_total,types'
              }
            }
          });

          if (error) {
            console.warn(`⚠️ Error with query "${query}":`, error);
            continue;
          }

          if (data && data.results && data.results.length > 0) {
            const place = data.results[0];
            
            // Validate result: name should have some similarity with original query
            const resultName = place.name.toLowerCase();
            const originalName = destinationName.toLowerCase();
            const thaiNameLower = thaiNameMatch?.[1]?.toLowerCase() || '';
            
            // Check if result is relevant
            const isRelevant = 
              resultName.includes(originalName) ||
              originalName.includes(resultName) ||
              (thaiNameLower && (resultName.includes(thaiNameLower) || thaiNameLower.includes(resultName))) ||
              query === destinationName || // Trust original query
              query.includes('ประเทศไทย'); // Trust queries with country context
            
            if (!isRelevant && query !== destinationName) {
              console.warn(`⚠️ Result "${place.name}" doesn't seem relevant to query "${query}", trying next...`);
              continue;
            }
            
            console.log(`✅ Found via Google Places with query "${query}":`, place);
            
            return {
              latitude: place.geometry.location.lat,
              longitude: place.geometry.location.lng,
              formatted_address: place.formatted_address,
              place_id: place.place_id
            };
          }
        } catch (error) {
          console.warn(`⚠️ Error searching with "${query}":`, error);
          continue;
        }
      }

      console.warn('⚠️ No coordinates found for:', destinationName);
      return null;
    } catch (error) {
      console.error('❌ Error geocoding destination:', error);
      return null;
    }
  }

  // Update destination with coordinates
  async updateDestinationCoordinates(destinationId: string, coordinates: GeocodingResult): Promise<void> {
    try {
      console.log('🔄 Updating destination coordinates:', destinationId);
      
      const { error } = await supabase
        .from('destinations')
        .update({
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
          formatted_address: coordinates.formatted_address,
          place_id: coordinates.place_id
        })
        .eq('id', destinationId);

      if (error) throw error;

      console.log('✅ Destination coordinates updated successfully');
    } catch (error) {
      console.error('❌ Error updating destination coordinates:', error);
      throw error;
    }
  }

  // Process destinations without coordinates
  async processMissingCoordinates(destinations: any[]): Promise<void> {
    const destinationsWithoutCoords = destinations.filter(dest => 
      !dest.latitude || !dest.longitude
    );

    console.log(`🔍 Found ${destinationsWithoutCoords.length} destinations without coordinates`);

    for (const destination of destinationsWithoutCoords) {
      try {
        const coordinates = await this.geocodeDestination(destination.name);
        if (coordinates) {
          await this.updateDestinationCoordinates(destination.id, coordinates);
          console.log(`✅ Updated coordinates for: ${destination.name}`);
        } else {
          console.warn(`⚠️ Could not find coordinates for: ${destination.name}`);
        }
      } catch (error) {
        console.error(`❌ Error processing ${destination.name}:`, error);
      }
    }
  }

  // Search for multiple tourist attractions
  async searchTouristAttractions(query: string, limit: number = 5): Promise<any[]> {
    try {
      console.log(`🔍 Searching tourist attractions for: "${query}"`);
      
      const searchQueries = [
        `${query} สถานที่ท่องเที่ยว`,
        `${query} ประเทศไทย`,
        query
      ];

      for (const searchQuery of searchQueries) {
        try {
          const { data, error } = await supabase.functions.invoke('google-places', {
            body: {
              type: 'textsearch',
              q: searchQuery,
              language: 'th',
              region: 'th',
              params: {
                type: 'tourist_attraction',
                fields: 'place_id,geometry,formatted_address,name,photos,rating,user_ratings_total,types,opening_hours'
              }
            }
          });

          if (error) {
            console.warn(`⚠️ Error with query "${searchQuery}":`, error);
            continue;
          }

          if (data && data.results && data.results.length > 0) {
            console.log(`✅ Found ${data.results.length} places with query "${searchQuery}"`);
            return data.results.slice(0, limit);
          }
        } catch (error) {
          console.warn(`⚠️ Error searching with "${searchQuery}":`, error);
          continue;
        }
      }

      console.warn('⚠️ No tourist attractions found for:', query);
      return [];
    } catch (error) {
      console.error('❌ Error searching tourist attractions:', error);
      return [];
    }
  }
}

export const geocodingService = new GeocodingService();
