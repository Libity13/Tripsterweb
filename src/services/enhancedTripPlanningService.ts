// Enhanced Trip Planning Service - Inspired by Layla.ai
import { databaseSyncService } from './databaseSyncService';
import { geocodingService } from './geocodingService';

export interface TravelPreferences {
  travelStyle: 'relaxing' | 'adventure' | 'cultural' | 'foodie' | 'nature' | 'urban';
  budget: 'budget' | 'mid-range' | 'luxury';
  travelType: 'family' | 'couple' | 'solo' | 'friends';
  duration: number; // days
  interests: string[];
  specialRequirements?: string[];
}

export interface PersonalizedItinerary {
  destinations: any[];
  totalCost: number;
  totalDuration: number;
  highlights: string[];
  recommendations: string[];
}

export class EnhancedTripPlanningService {
  // Create personalized itinerary based on preferences
  async createPersonalizedItinerary(
    query: string, 
    preferences: TravelPreferences,
    tripId: string
  ): Promise<PersonalizedItinerary> {
    try {
      console.log('🎯 Creating personalized itinerary:', { query, preferences });
      
      // Search for destinations based on travel style
      const destinations = await this.searchDestinationsByStyle(query, preferences);
      
      // Calculate costs based on budget
      const costEstimates = this.calculateCosts(destinations, preferences.budget);
      
      // Generate highlights and recommendations
      const highlights = this.generateHighlights(destinations, preferences);
      const recommendations = this.generateRecommendations(preferences);
      
      return {
        destinations,
        totalCost: costEstimates.total,
        totalDuration: preferences.duration,
        highlights,
        recommendations
      };
    } catch (error) {
      console.error('❌ Error creating personalized itinerary:', error);
      throw error;
    }
  }

  // Search destinations based on travel style
  private async searchDestinationsByStyle(query: string, preferences: TravelPreferences): Promise<any[]> {
    const styleQueries = this.getStyleBasedQueries(query, preferences.travelStyle);
    const allDestinations: any[] = [];

    for (const styleQuery of styleQueries) {
      try {
        const destinations = await geocodingService.searchTouristAttractions(styleQuery, 3);
        allDestinations.push(...destinations);
      } catch (error) {
        console.warn('⚠️ Error searching with style query:', styleQuery, error);
      }
    }

    // Remove duplicates and sort by relevance
    const uniqueDestinations = this.removeDuplicates(allDestinations);
    return this.sortByRelevance(uniqueDestinations, preferences);
  }

  // Get style-based search queries
  private getStyleBasedQueries(baseQuery: string, style: string): string[] {
    const styleModifiers = {
      relaxing: ['รีสอร์ท', 'สปา', 'ชายหาด', 'ธรรมชาติ'],
      adventure: ['ผจญภัย', 'ภูเขา', 'กิจกรรม', 'แอดเวนเจอร์'],
      cultural: ['วัฒนธรรม', 'ประวัติศาสตร์', 'วัด', 'พิพิธภัณฑ์'],
      foodie: ['อาหาร', 'ตลาด', 'ร้านอาหาร', 'สตรีทฟู้ด'],
      nature: ['ธรรมชาติ', 'อุทยาน', 'น้ำตก', 'ป่า'],
      urban: ['เมือง', 'ช้อปปิ้ง', 'คาเฟ่', 'ไนท์ไลฟ์']
    };

    const modifiers = styleModifiers[style] || [];
    return [
      baseQuery,
      ...modifiers.map(modifier => `${baseQuery} ${modifier}`)
    ];
  }

  // Calculate costs based on budget level
  private calculateCosts(destinations: any[], budgetLevel: string): { total: number; breakdown: any } {
    const budgetMultipliers = {
      budget: 0.7,
      'mid-range': 1.0,
      luxury: 1.8
    };

    const multiplier = budgetMultipliers[budgetLevel] || 1.0;
    const baseCost = destinations.reduce((sum, dest) => sum + (dest.estimated_cost || 500), 0);
    
    return {
      total: Math.round(baseCost * multiplier),
      breakdown: {
        accommodation: Math.round(baseCost * 0.4 * multiplier),
        activities: Math.round(baseCost * 0.3 * multiplier),
        food: Math.round(baseCost * 0.2 * multiplier),
        transport: Math.round(baseCost * 0.1 * multiplier)
      }
    };
  }

  // Generate highlights based on destinations and preferences
  private generateHighlights(destinations: any[], preferences: TravelPreferences): string[] {
    const highlights: string[] = [];
    
    destinations.forEach((dest, index) => {
      if (dest.rating && dest.rating > 4.0) {
        highlights.push(`⭐ ${dest.name} - สถานที่ยอดนิยม (${dest.rating}/5)`);
      }
      
      if (dest.place_types?.includes('tourist_attraction')) {
        highlights.push(`🏛️ ${dest.name} - สถานที่ท่องเที่ยวสำคัญ`);
      }
    });

    // Add style-specific highlights
    if (preferences.travelStyle === 'relaxing') {
      highlights.push('🌊 สถานที่ผ่อนคลายและสวยงาม');
    } else if (preferences.travelStyle === 'adventure') {
      highlights.push('🏔️ กิจกรรมผจญภัยและท้าทาย');
    }

    return highlights.slice(0, 5); // Limit to 5 highlights
  }

  // Generate personalized recommendations
  private generateRecommendations(preferences: TravelPreferences): string[] {
    const recommendations: string[] = [];

    // Travel type recommendations
    if (preferences.travelType === 'family') {
      recommendations.push('👨‍👩‍👧‍👦 สถานที่เหมาะสำหรับครอบครัว');
      recommendations.push('🍽️ ร้านอาหารที่เด็กทานได้');
    } else if (preferences.travelType === 'couple') {
      recommendations.push('💕 สถานที่โรแมนติก');
      recommendations.push('🍷 ร้านอาหารสำหรับคู่รัก');
    } else if (preferences.travelType === 'solo') {
      recommendations.push('🚶‍♀️ สถานที่ปลอดภัยสำหรับคนเดียว');
      recommendations.push('📱 แอปที่ควรมีสำหรับเที่ยวคนเดียว');
    }

    // Budget recommendations
    if (preferences.budget === 'budget') {
      recommendations.push('💰 เคล็ดลับประหยัดเงิน');
      recommendations.push('🚌 การเดินทางราคาประหยัด');
    } else if (preferences.budget === 'luxury') {
      recommendations.push('🏨 โรงแรมหรูระดับ 5 ดาว');
      recommendations.push('🍽️ ร้านอาหารมิชลิน');
    }

    return recommendations;
  }

  // Remove duplicate destinations
  private removeDuplicates(destinations: any[]): any[] {
    const seen = new Set();
    return destinations.filter(dest => {
      const key = dest.place_id || dest.name;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  // Sort destinations by relevance to preferences
  private sortByRelevance(destinations: any[], preferences: TravelPreferences): any[] {
    return destinations.sort((a, b) => {
      // Prioritize by rating
      const ratingA = a.rating || 0;
      const ratingB = b.rating || 0;
      
      if (ratingA !== ratingB) return ratingB - ratingA;
      
      // Then by user ratings total
      const totalA = a.user_ratings_total || 0;
      const totalB = b.user_ratings_total || 0;
      
      return totalB - totalA;
    });
  }
}

export const enhancedTripPlanningService = new EnhancedTripPlanningService();
