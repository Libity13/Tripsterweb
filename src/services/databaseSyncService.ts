// Database Sync Service - Handle database operations with optimistic updates
import { supabase } from '@/lib/unifiedSupabaseClient';
import { toast } from 'sonner';
import { geocodingService } from './geocodingService';
import { tripService } from './tripService';
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

      // Two-phase update with random offset to avoid unique constraint violations
      if (allUpdates.length > 0) {
        // Generate unique random offset for this batch (9000-9999 range)
        const randomOffset = Math.floor(Math.random() * 1000) + 9000;
        console.log(`🔄 Phase 1: Setting temporary order indices with random offset ${randomOffset}`);
        
        // Phase 1: Set all order_index to temporary high values with random offset
        for (let i = 0; i < allUpdates.length; i++) {
          const update = allUpdates[i];
          const tempOrderIndex = randomOffset + i; // Use random offset + index
          
          const { error } = await supabase
            .from('destinations')
            .update({ order_index: tempOrderIndex })
            .eq('id', update.id)
            .eq('trip_id', update.trip_id);

          if (error) {
            console.error('❌ Error setting temporary order index:', error);
            throw error;
          }
        }

        // Small delay to ensure Phase 1 completes (150ms)
        await new Promise(resolve => setTimeout(resolve, 150));
        
        // Phase 2: Update to final values (visit_date and order_index)
        console.log('🔄 Phase 2: Setting final order indices and visit_date');
        for (const update of allUpdates) {
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
  async addDestination(destination: Omit<Destination, 'id'>, tripId: string, locationContext?: string): Promise<Destination> {
    try {
      console.log('➕ Adding destination to database:', destination.name, locationContext ? `(context: ${locationContext})` : '');
      
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
        console.log('🔍 Attempting to geocode destination:', data.name, locationContext ? `with context: ${locationContext}` : '');
        try {
          await geocodingService.processMissingCoordinates([data], locationContext);
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

  // Move destination to a different day
  async moveDestination(destinationName: string, targetDay: number, tripId: string, targetPosition?: number): Promise<void> {
    try {
      console.log(`🔀 Moving destination "${destinationName}" to day ${targetDay}, position ${targetPosition || 'end'}`);
      
      // Find the destination
      const { data: destination, error: fetchError } = await supabase
        .from('destinations')
        .select('*')
        .eq('trip_id', tripId)
        .eq('name', destinationName)
        .single();

      if (fetchError || !destination) {
        console.error('❌ Destination not found:', destinationName);
        throw new Error(`Destination "${destinationName}" not found`);
      }

      // Get all destinations
      const allDestinations = await this.loadDestinations(tripId);
      
      // Remove this destination from its current position
      const otherDestinations = allDestinations.filter(d => d.id !== destination.id);
      
      // Group by day
      const destinationsByDay: Record<number, Destination[]> = {};
      otherDestinations.forEach(dest => {
        const day = dest.visit_date || 1;
        if (!destinationsByDay[day]) destinationsByDay[day] = [];
        destinationsByDay[day].push(dest);
      });
      
      // Add to target day
      if (!destinationsByDay[targetDay]) destinationsByDay[targetDay] = [];
      
      const newPosition = targetPosition !== undefined && targetPosition > 0 
        ? Math.min(targetPosition - 1, destinationsByDay[targetDay].length) // Convert to 0-based index
        : destinationsByDay[targetDay].length; // Add to end
        
      destinationsByDay[targetDay].splice(newPosition, 0, {
        ...destination,
        visit_date: targetDay
      });
      
      // Rebuild array with correct order_index
      const newDestinations: Destination[] = [];
      Object.keys(destinationsByDay)
        .map(Number)
        .sort((a, b) => a - b)
        .forEach(day => {
          const dayDests = destinationsByDay[day];
          dayDests.forEach((dest, index) => {
            newDestinations.push({
              ...dest,
              visit_date: day,
              order_index: index + 1
            });
          });
        });
      
      // Sync to database
      await this.syncDestinationsOrder(newDestinations, tripId);
      
      console.log(`✅ Moved destination "${destinationName}" to day ${targetDay}`);
    } catch (error) {
      console.error('❌ Error moving destination:', error);
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
  async syncAIActions(
    actions: any[], 
    tripId: string,
    callbacks?: {
      onGeocodingProgress?: (current: number, total: number, placeName: string) => void;
      onGeocodingFailed?: (placeName: string) => void;
    }
  ): Promise<void> {
    try {
      console.log('🤖 Syncing AI actions to database:', actions.length, 'actions');
      
      // 🆕 Sort actions to ensure correct execution order
      // MODIFY_TRIP (resize trip first) -> REMOVE -> ADD -> REORDER
      const ACTION_PRIORITY: Record<string, number> = {
        'MODIFY_TRIP': 0,
        'UPDATE_TRIP_INFO': 1,
        'REMOVE_DESTINATIONS': 2,
        'ADD_DESTINATIONS': 3,
        'REORDER_DESTINATIONS': 4,
        'MOVE_DESTINATION': 5,
      };
      
      const sortedActions = [...actions].sort((a, b) => {
        const pA = ACTION_PRIORITY[a.action] ?? 99;
        const pB = ACTION_PRIORITY[b.action] ?? 99;
        return pA - pB;
      });
      
      console.log('📋 Actions sorted by priority:', sortedActions.map(a => a.action));
      
      // Count total destinations for progress tracking
      let totalDestinations = 0;
      let currentDestination = 0;
      
      for (const action of sortedActions) {
        if (action.action === 'ADD_DESTINATIONS' && action.destinations) {
          totalDestinations += action.destinations.length;
        }
      }
      
      // 🆕 Track MODIFY_TRIP's new_total_days to use for ADD_DESTINATIONS that follow
      let modifyTripNewDays: number | null = null;
      
      for (const action of sortedActions) {
        switch (action.action) {
          case 'ADD_DESTINATIONS':
            if (action.destinations && action.destinations.length > 0) {
              const locationContext = action.location_context || null;
              console.log('📅 AI action details:', { 
                action: action.action, 
                day: action.day, 
                destinations: action.destinations.length,
                location_context: locationContext,
                modifyTripNewDays
              });
              
              // Extract day from action or default to 1
              let targetDay = action.day || null;
              
              // If no day specified, try to extract from action context
              if (!targetDay && action.context) {
                const dayMatch = action.context.match(/วันที่(\d+)/);
                if (dayMatch) {
                  targetDay = parseInt(dayMatch[1]);
                }
              }
              
              // 🆕 If this follows a MODIFY_TRIP, put ALL destinations in the new day
              // This is for "เพิ่มวันที่ 3 ไปมหาสารคาม" where new places should go to day 3
              if (!targetDay && modifyTripNewDays !== null) {
                targetDay = modifyTripNewDays;
                console.log(`📅 Using MODIFY_TRIP's new_total_days=${modifyTripNewDays} as target day for all destinations`);
              }
              
              // 🆕 ALWAYS fetch trip info to get totalTripDays for Clamp
              let totalTripDays = 1;
              
              // Get trip info to calculate total days (ALWAYS needed for Clamp)
              try {
                const { data: trip, error } = await supabase
                  .from('trips')
                  .select('start_date, end_date')
                  .eq('id', tripId)
                  .single();
                
                if (!error && trip?.start_date && trip?.end_date) {
                  const start = new Date(trip.start_date);
                  const end = new Date(trip.end_date);
                  totalTripDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
                  console.log(`📅 Trip has ${totalTripDays} days`);
                } else {
                  console.warn('⚠️ Could not get trip dates, defaulting to 1 day');
                  totalTripDays = 1;
                }
              } catch (error) {
                console.error('❌ Error getting trip info:', error);
                totalTripDays = 1;
              }
              
              // 🧠 Smart Distribution Logic:
              // - ถ้า destinations แต่ละตัวมี dest.day → ใช้ dest.day
              // - ถ้าไม่มี dest.day และ มี action.day → ใช้ action.day (แต่ถ้า > 3 ตัว ควรกระจาย)
              // - ถ้าไม่มีทั้งคู่ → กระจายอัตโนมัติ
              
              // Check if ANY destination has day specified
              const hasDestDays = action.destinations.some((d: any) => d.day && typeof d.day === 'number');
              
              // 🆕 Check if destinations are ACTUALLY distributed across multiple days
              // (not all in day 1 or all in same day)
              const uniqueDays = new Set(
                action.destinations
                  .filter((d: any) => d.day && typeof d.day === 'number')
                  .map((d: any) => d.day)
              );
              const isActuallyDistributed = uniqueDays.size > 1;
              
              // 🆕 Force distribute if:
              // 1. No individual days specified, OR
              // 2. All destinations have same day (not actually distributed), AND
              // 3. There are more than 2 destinations, AND
              // 4. Trip has multiple days
              // 5. 🆕 NOT following a MODIFY_TRIP (which sets a specific target day)
              const shouldForceDistribute = modifyTripNewDays === null && (
                !hasDestDays || // No days specified
                (!isActuallyDistributed && hasDestDays) // All in same day
              ) && action.destinations.length > 2 && totalTripDays > 1;
              
              const shouldDistribute = !targetDay || shouldForceDistribute;
              
              console.log('📅 Distribution check:', {
                targetDay,
                hasDestDays,
                isActuallyDistributed,
                uniqueDaysCount: uniqueDays.size,
                destinationsCount: action.destinations.length,
                totalTripDays,
                shouldForceDistribute,
                shouldDistribute,
                reason: shouldForceDistribute 
                  ? (hasDestDays && !isActuallyDistributed 
                    ? '🔄 All destinations in same day - forcing distribution!'
                    : '🔄 No individual days - forcing distribution!')
                  : (isActuallyDistributed 
                    ? '✅ Already distributed across multiple days'
                    : '⚠️ Not forcing distribution')
              });
              
              for (let i = 0; i < action.destinations.length; i++) {
                const dest = action.destinations[i];
                currentDestination++;
                const placeName = dest.name || dest.name_en || 'Unknown';
                
                // Report progress
                if (callbacks?.onGeocodingProgress) {
                  callbacks.onGeocodingProgress(currentDestination, totalDestinations, placeName);
                }
                
                // 🧠 Logic การเลือกวัน (เรียงลำดับความสำคัญ):
                // 1. dest.day (วันที่ AI ระบุมากับสถานที่)
                // 2. Smart Distribution (ถ้า shouldDistribute = true)
                // 3. action.day (วันที่ระบุมากับกลุ่มคำสั่ง)
                // 4. Fallback to day 1
                let visitDate: number;
                
                if (dest.day && typeof dest.day === 'number') {
                  // ✅ AI ระบุวันมากับสถานที่โดยตรง - ใช้เลย!
                  visitDate = Math.min(dest.day, totalTripDays); // Clamp ไม่ให้เกิน
                  console.log(`📅 Using dest.day=${dest.day} for "${placeName}" (clamped to ${visitDate})`);
                } else if (shouldDistribute && totalTripDays > 1) {
                  // 🆕 Smart Distribution - กระจายสถานที่ไปตามวัน
                  const destinationsPerDay = Math.ceil(action.destinations.length / totalTripDays);
                  visitDate = Math.floor(i / destinationsPerDay) + 1;
                  visitDate = Math.min(visitDate, totalTripDays); // ไม่เกินจำนวนวัน
                  console.log(`📅 Auto-distributing "${placeName}" to day ${visitDate} (${i+1}/${action.destinations.length})`);
                } else if (targetDay) {
                  // ใช้วันจาก action.day (only if not force distributing)
                  visitDate = Math.min(targetDay, totalTripDays);
                } else {
                  visitDate = 1; // fallback
                }
                
                // Map day field to visit_date for proper day assignment
                const destinationWithDay = {
                  ...dest,
                  visit_date: visitDate
                };
                console.log(`📅 Adding destination "${placeName}" to day ${destinationWithDay.visit_date}`);
                
                try {
                  await this.addDestination(destinationWithDay, tripId, locationContext);
                } catch (error) {
                  console.error(`❌ Failed to add destination: ${placeName}`, error);
                  if (callbacks?.onGeocodingFailed) {
                    callbacks.onGeocodingFailed(placeName);
                  }
                }
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
            
          case 'MOVE_DESTINATION':
            if (action.destination_name && action.target_day) {
              console.log('🔀 Moving destination:', action.destination_name, 'to day', action.target_day);
              await this.moveDestination(action.destination_name, action.target_day, tripId, action.target_position);
            }
            break;
            
          case 'REORDER_DESTINATIONS':
            if (action.destination_order && action.destination_order.length > 0) {
              await this.syncDestinationsOrder(action.destination_order, tripId);
            }
            break;
          
          case 'MODIFY_TRIP':
            console.log('🔄 MODIFY_TRIP action:', JSON.stringify(action, null, 2));
            
            // Handle both nested and flat formats
            const tripModification = action.trip_modification || action;
            const newTotalDays = tripModification.new_total_days || tripModification.new_days || null;
            const extendToProvince = tripModification.extend_to_province || null;
            
            // 🆕 Store new_total_days for ADD_DESTINATIONS that follow
            if (newTotalDays && newTotalDays > 0) {
              modifyTripNewDays = newTotalDays;
            }
            
            console.log(`📅 MODIFY_TRIP parsed: newTotalDays=${newTotalDays}, extendToProvince=${extendToProvince}`);
            
            if (newTotalDays && newTotalDays > 0) {
              try {
                const trip = await tripService.getTrip(tripId);
                if (trip) {
                  // Calculate current days
                  const currentStart = new Date(trip.start_date);
                  const currentEnd = new Date(trip.end_date);
                  const currentDays = Math.max(1, Math.ceil((currentEnd.getTime() - currentStart.getTime()) / (1000 * 60 * 60 * 24)) + 1);
                  
                  console.log(`📅 Current trip: ${currentDays} days (${trip.start_date} to ${trip.end_date})`);
                  console.log(`📅 Changing trip duration from ${currentDays} to ${newTotalDays} days`);
                  
                  // Update trip duration
                  await tripService.updateTripInfo(tripId, {
                    days: newTotalDays
                  });
                  
                  console.log(`✅ Trip duration updated to ${newTotalDays} days`);
                  
                  // If extending to new province, update trip name
                  if (extendToProvince) {
                    console.log(`🗺️ Trip extended to new province: ${extendToProvince}`);
                    // Get current title and append new province if not already included
                    const currentTitle = trip.title || '';
                    if (!currentTitle.includes(extendToProvince)) {
                      const baseProvince = currentTitle.match(/ทริป([ก-๙a-zA-Z]+)/)?.[1] || '';
                      const newTitle = baseProvince 
                        ? `ทริป${baseProvince}-${extendToProvince} ${newTotalDays} วัน`
                        : `ทริป${extendToProvince} ${newTotalDays} วัน`;
                      
                      await tripService.updateTrip(tripId, { title: newTitle });
                      console.log(`📝 Updated trip title to: ${newTitle}`);
                    }
                  }
                }
              } catch (error) {
                console.error('❌ Error processing MODIFY_TRIP:', error);
              }
            } else {
              console.warn('⚠️ MODIFY_TRIP action received but new_total_days not found or invalid');
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
