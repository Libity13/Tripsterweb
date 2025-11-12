// Travel Plan Service - Inspired by Tripster
import { supabase } from '@/lib/unifiedSupabaseClient';
import { enhancedPlacesService } from './enhancedPlacesService';

export interface TravelPlanRequest {
  startLocation: string;
  destination: string;
  budget: number;
  preference: string;
  travelWith: string;
  transport: string;
  travelDateStart: string;
  travelDateEnd: string;
}

export interface TravelPlanResponse {
  success: boolean;
  plan?: {
    destinations: Array<{
      name: string;
      address: string;
      rating: number;
      photoUrl: string;
      mapUrl: string;
      description: string;
    }>;
    hotels: Array<{
      name: string;
      address: string;
      rating: number;
      photoUrl: string;
      mapUrl: string;
    }>;
    aiResponse: string;
  };
  error?: string;
}

export const travelPlanService = {
  // Create travel plan
  async createTravelPlan(request: TravelPlanRequest): Promise<TravelPlanResponse> {
    try {
      console.log('🗺️ Creating travel plan:', request);

      // Create AI prompt
      const aiPrompt = `
        ช่วยวางแผนการท่องเที่ยวในประเทศไทยโดยอิงจากข้อมูลต่อไปนี้:
        - จุดเริ่มต้น: ${request.startLocation}
        - ปลายทาง: ${request.destination}
        - งบประมาณ: ${request.budget} บาท
        - ความชอบ: ${request.preference}
        - เดินทางกับ: ${request.travelWith}
        - วิธีการเดินทาง: ${request.transport}
        - วันเดินทางไป: ${request.travelDateStart}
        - วันเดินทางกลับ: ${request.travelDateEnd}
        
        แนะนำสถานที่ท่องเที่ยว 2-3 แห่งที่เหมาะสมกับความชอบและงบประมาณ พร้อมชื่อสถานที่, ที่อยู่, และคำอธิบายสั้น ๆ
        แนะนำโรงแรม 1-2 แห่งใกล้สถานที่ท่องเที่ยวหลัก โดยพิจารณาความนิยม (เรตติ้ง) และราคาที่เหมาะสมกับ ${request.budget} บาท
        หากเดินทางจาก ${request.startLocation} ไป ${request.destination} ด้วย ${request.transport} ควรใช้เส้นทางไหน หรือมีคำแนะนำอะไรเพิ่มเติม
        หากไม่มีข้อมูลตรงตามความชอบ ให้แนะนำสถานที่ยอดนิยมใกล้เคียงใน ${request.destination}
      `;

      // Get AI response
      const aiResponse = await supabase.functions.invoke('ai-chat', {
        body: {
          message: aiPrompt,
          conversationHistory: [],
          provider: 'gemini'
        }
      });

      if (aiResponse.error) {
        throw new Error(aiResponse.error.message);
      }

      const aiText = aiResponse.data.response;

      // Extract place names from AI response
      const placeNames = this.extractPlaceNames(aiText);
      const hotelNames = this.extractHotelNames(aiText);

      // Get place details
      const destinations = await Promise.all(
        placeNames.slice(0, 3).map(async (name) => {
          const places = await enhancedPlacesService.searchPlaces({ q: name });
          if (places.results && places.results.length > 0) {
            const place = places.results[0];
            return {
              name: place.name,
              address: place.formatted_address,
              rating: place.rating || 0,
              photoUrl: place.photos?.[0] ? enhancedPlacesService.getPhotoUrl(place.photos[0].photo_reference) : '',
              mapUrl: enhancedPlacesService.createGoogleMapsUrl(place.geometry.location.lat, place.geometry.location.lng, place.name),
              description: `เรตติ้ง: ${place.rating || 'N/A'} (รีวิว: ${place.user_ratings_total || 'N/A'})`
            };
          }
          return null;
        })
      );

      // Get hotel details
      const hotels = await Promise.all(
        hotelNames.slice(0, 2).map(async (name) => {
          const places = await enhancedPlacesService.searchPlaces({ q: name, type: 'lodging' });
          if (places.results && places.results.length > 0) {
            const place = places.results[0];
            return {
              name: place.name,
              address: place.formatted_address,
              rating: place.rating || 0,
              photoUrl: place.photos?.[0] ? enhancedPlacesService.getPhotoUrl(place.photos[0].photo_reference) : '',
              mapUrl: enhancedPlacesService.createGoogleMapsUrl(place.geometry.location.lat, place.geometry.location.lng, place.name)
            };
          }
          return null;
        })
      );

      return {
        success: true,
        plan: {
          destinations: destinations.filter(Boolean),
          hotels: hotels.filter(Boolean),
          aiResponse: aiText
        }
      };
    } catch (error: any) {
      console.error('Error creating travel plan:', error);
      return {
        success: false,
        error: error.message || 'Failed to create travel plan'
      };
    }
  },

  // Extract place names from AI response
  extractPlaceNames(text: string): string[] {
    const placePatterns = [
      /สถานที่ท่องเที่ยว:\s*([^\n]+)/g,
      /ที่เที่ยว:\s*([^\n]+)/g,
      /แนะนำ:\s*([^\n]+)/g,
      /(\d+\.\s*[^\n]+)/g
    ];

    const places: string[] = [];
    placePatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const placeName = match[1].trim().replace(/\*\*/g, '').split(' - ')[0];
        if (placeName && !places.includes(placeName)) {
          places.push(placeName);
        }
      }
    });

    return places;
  },

  // Extract hotel names from AI response
  extractHotelNames(text: string): string[] {
    const hotelPatterns = [
      /โรงแรม:\s*([^\n]+)/g,
      /ที่พัก:\s*([^\n]+)/g,
      /แนะนำโรงแรม:\s*([^\n]+)/g
    ];

    const hotels: string[] = [];
    hotelPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const hotelName = match[1].trim().replace(/\*\*/g, '').split(' - ')[0];
        if (hotelName && !hotels.includes(hotelName)) {
          hotels.push(hotelName);
        }
      }
    });

    return hotels;
  }
};
