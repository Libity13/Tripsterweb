// Geocoding Service - Fill missing coordinates for destinations
import { supabase } from '@/lib/unifiedSupabaseClient';

export interface GeocodingResult {
  latitude: number;
  longitude: number;
  formatted_address: string;
  place_id?: string;
  // Enhanced place details
  rating?: number;
  user_ratings_total?: number;
  price_level?: number;
  opening_hours?: {
    open_now?: boolean;
    weekday_text?: string[];
    periods?: any[];
  };
  phone_number?: string;
  international_phone_number?: string;
  website?: string;
  photos?: string[];
  place_types?: string[];
}

export class GeocodingService {
  // Get coordinates for a destination name
  async geocodeDestination(destinationName: string, locationContext?: string): Promise<GeocodingResult | null> {
    try {
      console.log('🔍 Geocoding destination:', destinationName, locationContext ? `in ${locationContext}` : '');
      
      // Try to find in places_cache first (if table exists)
      try {
        const { data: cached, error: cacheError } = await supabase
          .from('places_cache' as any)
          .select('*')
          .ilike('name', `%${destinationName}%`)
          .limit(1);

        if (!cacheError && cached && cached.length > 0) {
          console.log('✅ Found in cache:', cached[0]);
          const place = cached[0] as any;
          return {
            latitude: place.latitude,
            longitude: place.longitude,
            formatted_address: place.formatted_address,
            place_id: place.place_id,
            // Enhanced place details from cache
            rating: place.rating,
            user_ratings_total: place.user_ratings_total,
            price_level: place.price_level,
            opening_hours: place.opening_hours,
            phone_number: place.phone_number,
            international_phone_number: place.international_phone_number,
            website: place.website,
            photos: place.photos,
            place_types: place.place_types
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
      
      // 3. Add context (include location context if available)
      if (locationContext) {
        searchQueries.push(`${destinationName} ${locationContext}`);
      }
      searchQueries.push(`${destinationName} สถานที่ท่องเที่ยว`);
      searchQueries.push(`${destinationName} ประเทศไทย`);
      
      // 4. Try removing parentheses content (e.g., "The glass cafe(เดอะกลาสคาเฟ่)" → "The glass cafe")
      const withoutParentheses = destinationName.replace(/\([^)]*\)/g, '').trim();
      if (withoutParentheses !== destinationName && withoutParentheses.length >= 3) {
        searchQueries.push(withoutParentheses);
        if (locationContext) {
          searchQueries.push(`${withoutParentheses} ${locationContext}`);
        }
      }
      
      // 5. Add common alternative names for famous places
      const alternativeNames: Record<string, string[]> = {
        'วัดร่องขุ่น': ['White Temple', 'Wat Rong Khun', 'วัดร่องขุ่น เชียงราย'],
        'ดอยตุง': ['Doi Tung', 'ดอยตุง เชียงราย', 'สวนแม่ฟ้าหลวง'],
        'โรงแรมเลอ เมอริเดียน เชียงราย': ['Le Meridien Chiang Rai', 'Le Méridien Chiang Rai Resort'],
        'ร้านอาหารบ้านดำ': ['บ้านดำ', 'Baan Dam Museum', 'พิพิธภัณฑ์บ้านดำ เชียงราย'],
      };
      
      const nameLower = destinationName.toLowerCase();
      for (const [key, alternatives] of Object.entries(alternativeNames)) {
        if (nameLower.includes(key.toLowerCase()) || key.toLowerCase().includes(nameLower)) {
          searchQueries.push(...alternatives);
        }
      }
      
      // 6. Try first significant word (skip common words like "The", "A", "An", and must be >= 3 chars)
      const words = destinationName.split(' ').map(w => w.trim()).filter(w => w.length > 0);
      const commonWords = ['the', 'a', 'an', 'at', 'in', 'on', 'of', 'to', 'ร้าน', 'โรงแรม'];
      const significantWord = words.find(word => 
        word.length >= 3 && 
        !commonWords.includes(word.toLowerCase()) &&
        !/^[0-9]+$/.test(word) // Not just numbers
      );
      if (significantWord && significantWord !== destinationName) {
        searchQueries.push(`${significantWord} ประเทศไทย`);
        if (locationContext) {
          searchQueries.push(`${significantWord} ${locationContext}`);
        }
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
                fields: 'place_id,geometry,formatted_address,name,photos,rating,user_ratings_total,types,price_level,opening_hours,formatted_phone_number,international_phone_number,website'
              }
            }
          });

          if (error) {
            console.warn(`⚠️ Error with query "${query}":`, error);
            continue;
          }

          if (data && data.results && data.results.length > 0) {
            // Find the best match from results
            let place = data.results[0];
            
            // If we have location context, try to find a result that matches the context
            if (locationContext) {
              const contextLower = locationContext.toLowerCase();
              // Split context into keywords (e.g., "เชียงราย" → ["เชียงราย"])
              const contextKeywords = contextLower.split(/[\s,]+/).filter(k => k.length >= 3);
              
              // Try to find a result where address contains context
              const matchWithContext = data.results.find((result: any) => {
                const address = (result.formatted_address || '').toLowerCase();
                return contextKeywords.some(keyword => address.includes(keyword));
              });
              
              if (matchWithContext) {
                console.log(`✅ Found context match for "${locationContext}": "${matchWithContext.name}" in ${matchWithContext.formatted_address}`);
                place = matchWithContext;
              } else {
                console.log(`⚠️ First result "${place.name}" (${place.formatted_address}) does not match context "${locationContext}". Checking alternatives...`);
                // [STRICT] If provided context is NOT in the result address, do NOT accept it blindly.
                // Exception: If the place name itself contains the context (e.g. "Central Plaza Chiang Rai")
                const nameHasContext = contextKeywords.some(k => place.name.toLowerCase().includes(k));
                const addressHasContext = contextKeywords.some(k => (place.formatted_address || '').toLowerCase().includes(k));
                
                if (!nameHasContext && !addressHasContext) {
                     console.warn(`❌ Strict Check Failed: "${place.name}" (${place.formatted_address}) does NOT match context "${locationContext}". Skipping this result set.`);
                     // Continue to next search query strategy
                     continue;
                }
              }
            }
            
            // Validate result: name should have some similarity with original query
            const resultName = place.name.toLowerCase();
            const originalName = destinationName.toLowerCase();
            const thaiNameLower = thaiNameMatch?.[1]?.toLowerCase() || '';
            const formattedAddress = (place.formatted_address || '').toLowerCase();
            
            // ✅ ผ่อนปรนเงื่อนไข - เชื่อใจ Google Places API มากขึ้น
            // Google Places API Text Search (region='th') มักจะแม่นยำอยู่แล้ว
            // เราจะไม่เช็คความเกี่ยวข้องของชื่ออย่างเข้มงวด เพื่อแก้ปัญหา "หาดป่าตอง" vs "Patong Beach"
            console.log(`✅ Accepting result from Google: "${place.name}" for query "${query}"`);
            
            // Comment out name relevance check to trust Google more
            // const isRelevant = 
            //   resultName.includes(originalName) ||
            //   originalName.includes(resultName) ||
            //   (thaiNameLower && (resultName.includes(thaiNameLower) || thaiNameLower.includes(resultName))) ||
            //   query === destinationName || 
            //   query.includes('ประเทศไทย');
            // 
            // if (!isRelevant && query !== destinationName) {
            //   console.warn(`⚠️ Result "${place.name}" doesn't seem relevant to query "${query}", trying next...`);
            //   continue;
            // }
            
            // [FIX] เพิ่ม Strict Check สำหรับกรณีที่มี Context แต่ผลลัพธ์ที่ได้ไม่ตรง Context เลย
            // โดยเฉพาะกรณีที่ Google Places ส่งผลลัพธ์ของที่อื่นมาแทน (เช่น ค้นหา "ร้านครัวคุณยาย พะเยา" แต่ได้ "ร้านครัวคุณยาย ตาก")
            if (locationContext) {
              const contextLower = locationContext.toLowerCase();
              const contextKeywords = contextLower.split(/[\s,]+/).filter(k => k.length >= 3);
              const formattedAddress = (place.formatted_address || '').toLowerCase();
              const placeName = (place.name || '').toLowerCase();
              
              const hasContextMatch = contextKeywords.some(keyword => 
                formattedAddress.includes(keyword) || placeName.includes(keyword)
              );
              
              if (!hasContextMatch) {
                console.warn(`⚠️ STRICT REJECTION: "${place.name}" (${place.formatted_address}) does not match required context "${locationContext}".`);
                // Skip this result entirely if strict context check fails
                continue;
              }
            }

            console.log(`✅ Found via Google Places with query "${query}":`, place);
            
            // Extract photo references if available
            const photos = place.photos?.map((photo: any) => photo.photo_reference) || [];
            
            return {
              latitude: place.geometry.location.lat,
              longitude: place.geometry.location.lng,
              formatted_address: place.formatted_address,
              place_id: place.place_id,
              // Enhanced place details
              rating: place.rating,
              user_ratings_total: place.user_ratings_total,
              price_level: place.price_level,
              opening_hours: place.opening_hours ? {
                open_now: place.opening_hours.open_now,
                weekday_text: place.opening_hours.weekday_text,
                periods: place.opening_hours.periods
              } : undefined,
              phone_number: place.formatted_phone_number,
              international_phone_number: place.international_phone_number,
              website: place.website,
              photos,
              place_types: place.types
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
          place_id: coordinates.place_id,
          // Enhanced place details
          rating: coordinates.rating || null,
          user_ratings_total: coordinates.user_ratings_total || null,
          price_level: coordinates.price_level || null,
          opening_hours: coordinates.opening_hours || null,
          phone_number: coordinates.phone_number || null,
          website: coordinates.website || null,
          photos: coordinates.photos || null,
          place_types: coordinates.place_types || null
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
  async processMissingCoordinates(destinations: any[], locationContext?: string): Promise<void> {
    const destinationsWithoutCoords = destinations.filter(dest => 
      !dest.latitude || !dest.longitude
    );

    console.log(`🔍 Found ${destinationsWithoutCoords.length} destinations without coordinates`, 
                locationContext ? `in ${locationContext}` : '');

    for (const destination of destinationsWithoutCoords) {
      try {
        const coordinates = await this.geocodeDestination(destination.name, locationContext);
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
