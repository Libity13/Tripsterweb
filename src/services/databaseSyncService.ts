// Database Sync Service - Handle database operations with optimistic updates
import { supabase } from '@/lib/unifiedSupabaseClient';
import { toast } from 'sonner';
import { geocodingService } from './geocodingService';
import { Destination } from '@/types/database';

export class DatabaseSyncService {
  // Sync destinations order to database
  async syncDestinationsOrder(destinations: Destination[], tripId: string): Promise<void> {
    try {
      console.log('🔄 Syncing destinations order to database:', destinations.length, 'destinations');
      
      // Group destinations by visit_date
      const destinationsByDay = destinations.reduce((acc, dest) => {
        const day = dest.visit_date || 1;
        if (!acc[day]) acc[day] = [];
        acc[day].push(dest);
        return acc;
      }, {} as Record<string, Destination[]>);

      // Create all updates array for batch upsert
      const allUpdates: Array<{id: string, trip_id: string, visit_date: number, order_index: number}> = [];

      for (const [day, dayDestinations] of Object.entries(destinationsByDay)) {
        console.log(`📅 Preparing updates for day ${day}: ${dayDestinations.length} destinations`);
        
        // Create updates for this day
        const dayUpdates = dayDestinations.map((dest, index) => ({
          id: dest.id,
          trip_id: tripId,
          visit_date: parseInt(day),
          order_index: index + 1
        }));

        allUpdates.push(...dayUpdates);
      }

      // Use single batch update to avoid constraint conflicts
      if (allUpdates.length > 0) {
        // Update each destination individually but in sequence to avoid conflicts
        for (const update of allUpdates) {
          // @ts-ignore - Supabase type inference issue
          const { error } = await supabase
            .from('destinations')
            .update({ 
              visit_date: update.visit_date,
              order_index: update.order_index 
            })
            .eq('id', update.id)
            .eq('trip_id', update.trip_id);

          if (error) {
            console.error('❌ Error updating destination order:', error);
            throw error;
          }
        }
      }

      console.log('✅ Destinations order synced successfully');
    } catch (error) {
      console.error('❌ Error syncing destinations order:', error);
      throw error;
    }
  }

  // Add destination to database
  async addDestination(destination: Omit<Destination, 'id'>, tripId: string): Promise<Destination> {
    try {
      console.log('➕ Adding destination to database:', destination.name);
      
      // Get next order index for the specific day
      const nextOrderIndex = await this.getNextOrderIndex(tripId, destination.visit_date);
      
      // Fill missing data with defaults
      const destinationData = {
        trip_id: tripId,
        name: destination.name,
        name_en: destination.name_en || destination.name,
        description: destination.description || 'สถานที่ท่องเที่ยว',
        description_en: destination.description_en || 'Tourist attraction',
        latitude: destination.latitude || null,
        longitude: destination.longitude || null,
        rating: destination.rating || 0,
        visit_duration: destination.visit_duration || 60,
        estimated_cost: destination.estimated_cost || 0,
        place_types: destination.place_types || ['tourist_attraction'],
        photos: destination.photos || [],
        order_index: nextOrderIndex,
        visit_date: destination.visit_date || 1, // Support day assignment (INTEGER day number), default to day 1
        language: 'th',
        is_favorite: false,
        is_visited: false,
        recommended_by_ai: true
      };
      
      const { data, error } = await supabase
        .from('destinations')
        .insert(destinationData)
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Destination added successfully:', data);
      
      // Try to get coordinates if missing
      if (!data.latitude || !data.longitude) {
        console.log('🔍 Attempting to geocode destination:', data.name);
        try {
          await geocodingService.processMissingCoordinates([data]);
        } catch (error) {
          console.warn('⚠️ Could not geocode destination:', error);
        }
      }
      
      return data;
    } catch (error) {
      console.error('❌ Error adding destination:', error);
      throw error;
    }
  }

  // Update destination in database
  async updateDestination(destinationId: string, updates: Partial<Destination>, tripId: string): Promise<Destination> {
    try {
      console.log('🔄 Updating destination in database:', destinationId);
      
      const { data, error } = await supabase
        .from('destinations')
        .update(updates)
        .eq('id', destinationId)
        .eq('trip_id', tripId)
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Destination updated successfully:', data);
      return data;
    } catch (error) {
      console.error('❌ Error updating destination:', error);
      throw error;
    }
  }

  // Remove destination from database
  async removeDestination(destinationId: string, tripId: string): Promise<void> {
    try {
      console.log('🗑️ Removing destination from database:', destinationId);
      
      const { error } = await supabase
        .from('destinations')
        .delete()
        .eq('id', destinationId)
        .eq('trip_id', tripId);

      if (error) throw error;
      
      console.log('✅ Destination removed successfully');
      
      // After deletion, renormalize order indices to prevent constraint violations
      await this.renormalizeOrderIndices(tripId);
    } catch (error) {
      console.error('❌ Error removing destination:', error);
      throw error;
    }
  }

  // Remove destination by name
  async removeDestinationByName(destinationName: string, tripId: string): Promise<void> {
    try {
      console.log('🗑️ Removing destination by name from database:', destinationName);
      
      const { error } = await supabase
        .from('destinations')
        .delete()
        .eq('name', destinationName)
        .eq('trip_id', tripId);

      if (error) throw error;
      
      console.log('✅ Destination removed by name successfully');
      
      // After deletion, renormalize order indices to prevent constraint violations
      await this.renormalizeOrderIndices(tripId);
    } catch (error) {
      console.error('❌ Error removing destination by name:', error);
      throw error;
    }
  }

  // Renormalize order indices after deletions to prevent constraint violations
  async renormalizeOrderIndices(tripId: string): Promise<void> {
    try {
      console.log('🔄 Renormalizing order indices after deletion');
      
      // Get all destinations grouped by visit_date
      const { data: destinations, error: fetchError } = await supabase
        .from('destinations')
        .select('id, visit_date, order_index')
        .eq('trip_id', tripId)
        .order('visit_date', { ascending: true })
        .order('order_index', { ascending: true });

      if (fetchError) throw fetchError;

      if (!destinations || destinations.length === 0) return;

      // Group by visit_date and renormalize order_index
      const destinationsByDay = (destinations as any[]).reduce((acc, dest) => {
        const day = dest.visit_date || 1;
        if (!acc[day]) acc[day] = [];
        acc[day].push(dest);
        return acc;
      }, {} as Record<number, any[]>);

      // Update order_index for each day to be sequential (1, 2, 3, ...)
      for (const [day, dayDestinations] of Object.entries(destinationsByDay)) {
        console.log(`📅 Renormalizing order for day ${day}: ${(dayDestinations as any[]).length} destinations`);
        
        for (let i = 0; i < (dayDestinations as any[]).length; i++) {
          const dest = (dayDestinations as any[])[i];
          const newOrderIndex = i + 1;
          
          // Only update if order_index has changed
          if (dest.order_index !== newOrderIndex) {
            const { error } = await supabase
              .from('destinations')
              .update({ order_index: newOrderIndex })
              .eq('id', dest.id)
              .eq('trip_id', tripId);

            if (error) {
              console.error('❌ Error renormalizing order index:', error);
              throw error;
            }
          }
        }
      }
      
      console.log('✅ Order indices renormalized successfully');
    } catch (error) {
      console.error('❌ Error renormalizing order indices:', error);
      throw error;
    }
  }

  // Get next order index for new destination
  private async getNextOrderIndex(tripId: string, visitDate?: number): Promise<number> {
    try {
      let query = supabase
        .from('destinations')
        .select('order_index')
        .eq('trip_id', tripId);
      
      // If visitDate is provided, get order index for that specific day
      if (visitDate) {
        // @ts-ignore - Supabase type inference issue
        query = query.eq('visit_date', visitDate);
      }
      
      const { data, error } = await query
        .order('order_index', { ascending: false })
        .limit(1);

      if (error) throw error;

      const maxOrder = data && data.length > 0 ? (data[0].order_index || 0) : 0;
      console.log(`📊 Next order index for trip ${tripId}, day ${visitDate || 'all'}: ${maxOrder + 1}`);
      return maxOrder + 1;
    } catch (error) {
      console.error('❌ Error getting next order index:', error);
      return 1;
    }
  }

  // Load destinations from database
  async loadDestinations(tripId: string): Promise<Destination[]> {
    try {
      console.log('📱 Loading destinations from database for trip:', tripId);
      
      const { data, error } = await supabase
        .from('destinations')
        .select('*')
        .eq('trip_id', tripId)
        .order('order_index');

      if (error) throw error;

      console.log('✅ Destinations loaded successfully:', data?.length || 0, 'destinations');
      return data || [];
    } catch (error) {
      console.error('❌ Error loading destinations:', error);
      throw error;
    }
  }

  // Batch update destinations
  async batchUpdateDestinations(destinations: Destination[], tripId: string): Promise<void> {
    try {
      console.log('🔄 Batch updating destinations:', destinations.length, 'destinations');
      
      // Update each destination
      for (const dest of destinations) {
        const { error } = await supabase
          .from('destinations')
          .update({
            name: dest.name,
            name_en: dest.name_en,
            description: dest.description,
            description_en: dest.description_en,
            latitude: dest.latitude,
            longitude: dest.longitude,
            rating: dest.rating,
            visit_duration: dest.visit_duration,
            estimated_cost: dest.estimated_cost,
            place_types: dest.place_types,
            photos: dest.photos,
            order_index: dest.order_index
          })
          .eq('id', dest.id)
          .eq('trip_id', tripId);

        if (error) {
          console.error('❌ Error updating destination:', dest.id, error);
          throw error;
        }
      }

      console.log('✅ Batch update completed successfully');
    } catch (error) {
      console.error('❌ Error batch updating destinations:', error);
      throw error;
    }
  }

  // Sync AI actions to database
  async syncAIActions(actions: any[], tripId: string): Promise<void> {
    try {
      console.log('🤖 Syncing AI actions to database:', actions.length, 'actions');
      
      for (const action of actions) {
        switch (action.action) {
          case 'ADD_DESTINATIONS':
            if (action.destinations && action.destinations.length > 0) {
              console.log('📅 AI action details:', { 
                action: action.action, 
                day: action.day, 
                destinations: action.destinations.length 
              });
              
              // Extract day from action or default to 1
              let targetDay = action.day || 1;
              
              // If no day specified, try to extract from action context
              if (!action.day && action.context) {
                const dayMatch = action.context.match(/วันที่(\d+)/);
                if (dayMatch) {
                  targetDay = parseInt(dayMatch[1]);
                }
              }
              
              console.log('📅 Using target day:', targetDay);
              
              for (const dest of action.destinations) {
                // Map day field to visit_date for proper day assignment
                const destinationWithDay = {
                  ...dest,
                  visit_date: targetDay // Use extracted or default day
                };
                console.log('📅 Adding destination with visit_date:', destinationWithDay.visit_date);
                await this.addDestination(destinationWithDay, tripId);
              }
            }
            break;
            
          case 'REMOVE_DESTINATIONS':
            if (action.destination_names && action.destination_names.length > 0) {
              console.log('🗑️ Removing destinations by names:', action.destination_names);
              for (const destName of action.destination_names) {
                await this.removeDestinationByName(destName, tripId);
              }
            } else if (action.destinations && action.destinations.length > 0) {
              // Fallback: try to extract names from destinations array
              console.log('🗑️ Removing destinations by destinations array:', action.destinations);
              const namesToRemove = action.destinations.map((dest: any) => dest.name).filter(Boolean);
              for (const destName of namesToRemove) {
                await this.removeDestinationByName(destName, tripId);
              }
            } else if (action.context) {
              // Fallback: try to extract destination name from context
              console.log('🗑️ Attempting to extract destination name from context:', action.context);
              const contextMatch = action.context.match(/ลบ\s+([^ออกจาก]+)/i);
              if (contextMatch) {
                const destName = contextMatch[1].trim();
                console.log('🗑️ Extracted destination name from context:', destName);
                await this.removeDestinationByName(destName, tripId);
              } else {
                console.warn('⚠️ Could not extract destination name from context:', action.context);
              }
            } else {
              console.warn('⚠️ REMOVE_DESTINATIONS action has no destination_names, destinations, or context');
            }
            break;
            
          case 'REORDER_DESTINATIONS':
            if (action.destination_order && action.destination_order.length > 0) {
              await this.syncDestinationsOrder(action.destination_order, tripId);
            }
            break;
            
          case 'ASK_PERSONAL_INFO':
            console.log('❓ Ask personal info:', action);
            // AI จะถามคำถามเกี่ยวกับผู้ร่วมเดินทางและงบประมาณ
            // ไม่ต้องทำอะไรเพิ่มเติม เพราะ AI จะแสดงข้อความถามใน reply
            break;
        }
      }

      console.log('✅ AI actions synced successfully');
    } catch (error) {
      console.error('❌ Error syncing AI actions:', error);
      throw error;
    }
  }

  // Search and add multiple tourist attractions
  async searchAndAddTouristAttractions(query: string, tripId: string, limit: number = 3): Promise<Destination[]> {
    try {
      console.log(`🔍 Searching tourist attractions for: "${query}"`);
      
      const attractions = await geocodingService.searchTouristAttractions(query, limit);
      
      if (attractions.length === 0) {
        console.warn('⚠️ No tourist attractions found');
        return [];
      }

      const addedDestinations: Destination[] = [];
      
      for (const attraction of attractions) {
        try {
          const nextOrderIndex = await this.getNextOrderIndex(tripId);
          
          const destinationData = {
            trip_id: tripId,
            name: attraction.name,
            name_en: attraction.name,
            description: 'สถานที่ท่องเที่ยว',
            description_en: 'Tourist attraction',
            latitude: attraction.geometry.location.lat,
            longitude: attraction.geometry.location.lng,
            rating: attraction.rating || 0,
            visit_duration: 120, // 2 hours default
            estimated_cost: 500, // Default cost
            place_types: attraction.types || ['tourist_attraction'],
            photos: attraction.photos ? attraction.photos.map((p: any) => p.photo_reference) : [],
            formatted_address: attraction.formatted_address,
            place_id: attraction.place_id,
            order_index: nextOrderIndex,
            language: 'th',
            is_favorite: false,
            is_visited: false,
            recommended_by_ai: true
          };

          const { data, error } = await supabase
            .from('destinations')
            .insert(destinationData)
            .select()
            .single();

          if (error) throw error;

          addedDestinations.push(data);
          console.log(`✅ Added attraction: ${attraction.name}`);
        } catch (error) {
          console.error(`❌ Error adding attraction ${attraction.name}:`, error);
        }
      }

      console.log(`✅ Added ${addedDestinations.length} tourist attractions`);
      return addedDestinations;
    } catch (error) {
      console.error('❌ Error searching and adding tourist attractions:', error);
      throw error;
    }
  }
}

export const databaseSyncService = new DatabaseSyncService();
