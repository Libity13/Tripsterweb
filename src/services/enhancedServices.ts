// Enhanced Service Layer Architecture
import { Trip, Destination, ChatMessage } from '@/types/database';
import { supabase } from '@/lib/unifiedSupabaseClient';
import { config } from '@/config/environment';

// Base Service Interface
interface BaseService {
  initialize(): Promise<void>;
  cleanup(): Promise<void>;
}

// Enhanced AI Service
export class EnhancedAIService implements BaseService {
  private retryCount = 0;
  private maxRetries = 3;

  async initialize(): Promise<void> {
    console.log('🤖 Initializing Enhanced AI Service');
  }

  async cleanup(): Promise<void> {
    console.log('🤖 Cleaning up Enhanced AI Service');
  }

  async processUserInput(
    input: string, 
    context: {
      tripId?: string;
      history?: Array<{role: string; content: string}>;
      language?: string;
    }
  ): Promise<{
    success: boolean;
    message: string;
    actions: any[];
    suggest_login: boolean;
    processingState: 'analyzing' | 'planning' | 'adding_destinations' | 'completed' | 'error';
  }> {
    try {
      console.log('🤖 Processing user input:', input);
      
      const response = await fetch(config.edgeFunctions.aiChat, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          message: input,
          trip_id: context.tripId,
          language: context.language || 'th',
          history: context.history || []
        })
      });

      if (!response.ok) {
        throw new Error(`AI service error: ${response.status}`);
      }

      const data = await response.json();
      
      // Determine processing state based on actions
      const processingState = this.determineProcessingState(data.actions);
      
      return {
        success: true,
        message: data.reply || data.message || 'ไม่สามารถประมวลผลได้',
        actions: data.actions || [],
        suggest_login: data.suggest_login || false,
        processingState
      };
    } catch (error) {
      console.error('❌ AI service error:', error);
      return {
        success: false,
        message: 'เกิดข้อผิดพลาดในการประมวลผล กรุณาลองใหม่',
        actions: [],
        suggest_login: false,
        processingState: 'error'
      };
    }
  }

  private determineProcessingState(actions: any[]): 'analyzing' | 'planning' | 'adding_destinations' | 'completed' | 'error' {
    if (!actions || actions.length === 0) return 'analyzing';
    
    const hasAddDestinations = actions.some(a => a.action === 'ADD_DESTINATIONS');
    const hasAskPersonalInfo = actions.some(a => a.action === 'ASK_PERSONAL_INFO');
    
    if (hasAskPersonalInfo) return 'analyzing';
    if (hasAddDestinations) return 'adding_destinations';
    
    return 'completed';
  }

  async resolvePlace(name: string, locationContext?: string): Promise<any> {
    try {
      const response = await fetch(config.edgeFunctions.googlePlaces, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          query: name,
          location: locationContext
        })
      });

      if (!response.ok) {
        throw new Error(`Places service error: ${response.status}`);
      }

      const data = await response.json();
      return data.results?.[0] || null;
    } catch (error) {
      console.error('❌ Place resolution error:', error);
      return null;
    }
  }
}

// Enhanced Trip Service
export class EnhancedTripService implements BaseService {
  async initialize(): Promise<void> {
    console.log('🏖️ Initializing Enhanced Trip Service');
  }

  async cleanup(): Promise<void> {
    console.log('🏖️ Cleaning up Enhanced Trip Service');
  }

  async createTrip(tripData: Partial<Trip>): Promise<Trip> {
    try {
      console.log('🏖️ Creating trip:', tripData);
      
      const { data, error } = await supabase
        .from('trips')
        .insert([{
          title: tripData.title || 'ทริปใหม่',
          title_en: tripData.title_en || 'New Travel Plan',
          description: tripData.description || 'ทริปที่สร้างจาก Tripster AI',
          description_en: tripData.description_en || 'Travel plan created from Tripster AI',
          start_date: tripData.start_date || new Date().toISOString().split('T')[0],
          end_date: tripData.end_date || new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          budget_max: tripData.budget_max || 10000,
          budget_min: tripData.budget_min || 1000,
          language: tripData.language || 'th',
          currency: tripData.currency || 'THB',
          status: tripData.status || 'planning'
        }])
        .select()
        .single();

      if (error) throw error;
      
      console.log('✅ Trip created:', data);
      return data as Trip;
    } catch (error) {
      console.error('❌ Error creating trip:', error);
      throw error;
    }
  }

  async getTrip(tripId: string): Promise<Trip | null> {
    try {
      console.log('🔍 Getting trip:', tripId);
      
      // Get trip data
      const { data: tripData, error: tripError } = await supabase
        .from('trips')
        .select('*')
        .eq('id', tripId)
        .single();

      if (tripError) throw tripError;
      if (!tripData) return null;

      // Get destinations
      const { data: destinations, error: destError } = await supabase
        .from('destinations')
        .select('*')
        .eq('trip_id', tripId)
        .order('visit_date', { ascending: true })
        .order('order_index', { ascending: true });

      if (destError) throw destError;

      const trip: Trip = {
        ...tripData,
        destinations: destinations || []
      };

      console.log('✅ Trip loaded:', trip);
      return trip;
    } catch (error) {
      console.error('❌ Error getting trip:', error);
      return null;
    }
  }

  async addDestination(tripId: string, destination: Omit<Destination, 'id'>): Promise<Destination> {
    try {
      console.log('📍 Adding destination:', destination);
      
      const { data, error } = await supabase
        .from('destinations')
        .insert([{
          ...destination,
          trip_id: tripId
        }])
        .select()
        .single();

      if (error) throw error;
      
      console.log('✅ Destination added:', data);
      return data as Destination;
    } catch (error) {
      console.error('❌ Error adding destination:', error);
      throw error;
    }
  }

  async addDestinationsBatch(tripId: string, destinations: Omit<Destination, 'id'>[]): Promise<Destination[]> {
    try {
      console.log('📍 Adding destinations batch:', destinations.length);
      
      const batchSize = 5;
      const results: Destination[] = [];
      
      for (let i = 0; i < destinations.length; i += batchSize) {
        const batch = destinations.slice(i, i + batchSize);
        const batchData = batch.map(dest => ({
          ...dest,
          trip_id: tripId
        }));
        
        const { data, error } = await supabase
          .from('destinations')
          .insert(batchData)
          .select();

        if (error) throw error;
        results.push(...(data as Destination[]));
      }
      
      console.log('✅ Destinations batch added:', results.length);
      return results;
    } catch (error) {
      console.error('❌ Error adding destinations batch:', error);
      throw error;
    }
  }

  async removeDestinationsByNames(tripId: string, destinationNames: string[]): Promise<void> {
    try {
      console.log('🗑️ Removing destinations:', destinationNames);
      
      const { error } = await supabase
        .from('destinations')
        .delete()
        .eq('trip_id', tripId)
        .in('name', destinationNames);

      if (error) throw error;
      
      console.log('✅ Destinations removed');
    } catch (error) {
      console.error('❌ Error removing destinations:', error);
      throw error;
    }
  }

  async updateTrip(tripId: string, updates: Partial<Trip>): Promise<Trip> {
    try {
      console.log('🔄 Updating trip:', tripId, updates);
      
      const { data, error } = await supabase
        .from('trips')
        .update(updates)
        .eq('id', tripId)
        .select()
        .single();

      if (error) throw error;
      
      console.log('✅ Trip updated:', data);
      return data as Trip;
    } catch (error) {
      console.error('❌ Error updating trip:', error);
      throw error;
    }
  }
}

// Enhanced Error Service
export class ErrorService implements BaseService {
  async initialize(): Promise<void> {
    console.log('⚠️ Initializing Error Service');
  }

  async cleanup(): Promise<void> {
    console.log('⚠️ Cleaning up Error Service');
  }

  handleError(error: any, context: string): {
    message: string;
    type: 'network' | 'ai' | 'database' | 'validation';
    retryable: boolean;
  } {
    console.error(`❌ Error in ${context}:`, error);
    
    if (error.message?.includes('network') || error.message?.includes('fetch')) {
      return {
        message: 'เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาตรวจสอบอินเทอร์เน็ต',
        type: 'network',
        retryable: true
      };
    }
    
    if (error.message?.includes('AI') || error.message?.includes('OpenAI')) {
      return {
        message: 'เกิดข้อผิดพลาดในการประมวลผล AI กรุณาลองใหม่',
        type: 'ai',
        retryable: true
      };
    }
    
    if (error.message?.includes('database') || error.message?.includes('Supabase')) {
      return {
        message: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่',
        type: 'database',
        retryable: true
      };
    }
    
    return {
      message: 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ กรุณาลองใหม่',
      type: 'validation',
      retryable: false
    };
  }
}

// Service Manager
export class ServiceManager {
  private services: Map<string, BaseService> = new Map();
  
  constructor() {
    this.registerServices();
  }
  
  private registerServices(): void {
    this.services.set('ai', new EnhancedAIService());
    this.services.set('trip', new EnhancedTripService());
    this.services.set('error', new ErrorService());
  }
  
  async initializeAll(): Promise<void> {
    console.log('🚀 Initializing all services...');
    for (const [name, service] of this.services) {
      try {
        await service.initialize();
        console.log(`✅ Service ${name} initialized`);
      } catch (error) {
        console.error(`❌ Failed to initialize service ${name}:`, error);
      }
    }
  }
  
  async cleanupAll(): Promise<void> {
    console.log('🧹 Cleaning up all services...');
    for (const [name, service] of this.services) {
      try {
        await service.cleanup();
        console.log(`✅ Service ${name} cleaned up`);
      } catch (error) {
        console.error(`❌ Failed to cleanup service ${name}:`, error);
      }
    }
  }
  
  getService<T extends BaseService>(name: string): T {
    const service = this.services.get(name);
    if (!service) {
      throw new Error(`Service ${name} not found`);
    }
    return service as T;
  }
}

// Export singleton instance
export const serviceManager = new ServiceManager();

// Export individual services for convenience
export const aiService = serviceManager.getService<EnhancedAIService>('ai');
export const tripService = serviceManager.getService<EnhancedTripService>('trip');
export const errorService = serviceManager.getService<ErrorService>('error');
