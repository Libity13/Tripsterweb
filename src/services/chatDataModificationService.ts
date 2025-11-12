// Chat Data Modification Service
import { supabase } from '@/lib/unifiedSupabaseClient';

export interface DataModificationRequest {
  type: 'add_destination' | 'remove_destination' | 'update_destination' | 'reorder_destinations' | 'update_trip_info';
  data: any;
  tripId?: string;
  userId?: string;
}

export interface DataModificationResponse {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

export class ChatDataModificationService {
  
  // Add destination through chat
  async addDestination(request: DataModificationRequest): Promise<DataModificationResponse> {
    try {
      const { name, description, latitude, longitude, visit_duration, estimated_cost } = request.data;
      
      const { data, error } = await supabase
        .from('destinations')
        .insert({
          trip_id: request.tripId,
          name,
          description,
          latitude,
          longitude,
          visit_duration: visit_duration || 2,
          estimated_cost: estimated_cost || 0,
          order_index: await this.getNextOrderIndex(request.tripId)
        })
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        message: `เพิ่มสถานที่ "${name}" เรียบร้อยแล้ว`,
        data
      };
    } catch (error) {
      return {
        success: false,
        message: 'ไม่สามารถเพิ่มสถานที่ได้',
        error: error.message
      };
    }
  }

  // Remove destination through chat
  async removeDestination(request: DataModificationRequest): Promise<DataModificationResponse> {
    try {
      const { destinationId } = request.data;
      
      const { error } = await supabase
        .from('destinations')
        .delete()
        .eq('id', destinationId)
        .eq('trip_id', request.tripId);

      if (error) throw error;

      return {
        success: true,
        message: 'ลบสถานที่เรียบร้อยแล้ว'
      };
    } catch (error) {
      return {
        success: false,
        message: 'ไม่สามารถลบสถานที่ได้',
        error: error.message
      };
    }
  }

  // Update destination through chat
  async updateDestination(request: DataModificationRequest): Promise<DataModificationResponse> {
    try {
      const { destinationId, updates } = request.data;
      
      const { data, error } = await supabase
        .from('destinations')
        .update(updates)
        .eq('id', destinationId)
        .eq('trip_id', request.tripId)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        message: 'อัปเดตสถานที่เรียบร้อยแล้ว',
        data
      };
    } catch (error) {
      return {
        success: false,
        message: 'ไม่สามารถอัปเดตสถานที่ได้',
        error: error.message
      };
    }
  }

  // Reorder destinations through chat
  async reorderDestinations(request: DataModificationRequest): Promise<DataModificationResponse> {
    try {
      const { destinationIds } = request.data;
      
      // Update order_index for each destination
      const updates = destinationIds.map((id: string, index: number) => ({
        id,
        order_index: index
      }));

      for (const update of updates) {
        await supabase
          .from('destinations')
          .update({ order_index: update.order_index })
          .eq('id', update.id)
          .eq('trip_id', request.tripId);
      }

      return {
        success: true,
        message: 'เรียงลำดับสถานที่เรียบร้อยแล้ว'
      };
    } catch (error) {
      return {
        success: false,
        message: 'ไม่สามารถเรียงลำดับสถานที่ได้',
        error: error.message
      };
    }
  }

  // Update trip information through chat
  async updateTripInfo(request: DataModificationRequest): Promise<DataModificationResponse> {
    try {
      const { updates } = request.data;
      
      const { data, error } = await supabase
        .from('trips')
        .update(updates)
        .eq('id', request.tripId)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        message: 'อัปเดตข้อมูลทริปเรียบร้อยแล้ว',
        data
      };
    } catch (error) {
      return {
        success: false,
        message: 'ไม่สามารถอัปเดตข้อมูลทริปได้',
        error: error.message
      };
    }
  }

  // Parse chat message for data modification commands
  parseModificationCommand(message: string): DataModificationRequest | null {
    const lowerMessage = message.toLowerCase();

    // Add destination patterns
    if (lowerMessage.includes('เพิ่ม') && (lowerMessage.includes('สถานที่') || lowerMessage.includes('ที่เที่ยว'))) {
      return {
        type: 'add_destination',
        data: this.extractDestinationData(message)
      };
    }

    // Remove destination patterns
    if (lowerMessage.includes('ลบ') && (lowerMessage.includes('สถานที่') || lowerMessage.includes('ที่เที่ยว'))) {
      return {
        type: 'remove_destination',
        data: this.extractDestinationId(message)
      };
    }

    // Update destination patterns
    if (lowerMessage.includes('แก้ไข') || lowerMessage.includes('เปลี่ยน')) {
      return {
        type: 'update_destination',
        data: this.extractUpdateData(message)
      };
    }

    // Reorder patterns
    if (lowerMessage.includes('เรียงลำดับ') || lowerMessage.includes('สลับ')) {
      return {
        type: 'reorder_destinations',
        data: this.extractReorderData(message)
      };
    }

    // Update trip info patterns
    if (lowerMessage.includes('อัปเดต') && (lowerMessage.includes('ทริป') || lowerMessage.includes('แผน'))) {
      return {
        type: 'update_trip_info',
        data: this.extractTripUpdateData(message)
      };
    }

    return null;
  }

  // Execute data modification based on chat command
  async executeModification(request: DataModificationRequest): Promise<DataModificationResponse> {
    switch (request.type) {
      case 'add_destination':
        return await this.addDestination(request);
      case 'remove_destination':
        return await this.removeDestination(request);
      case 'update_destination':
        return await this.updateDestination(request);
      case 'reorder_destinations':
        return await this.reorderDestinations(request);
      case 'update_trip_info':
        return await this.updateTripInfo(request);
      default:
        return {
          success: false,
          message: 'ไม่รู้จักคำสั่งนี้',
          error: 'Unknown command type'
        };
    }
  }

  // Helper methods for data extraction
  private extractDestinationData(message: string): any {
    // Simple extraction - in real implementation, use NLP
    const nameMatch = message.match(/เพิ่ม\s+(.+?)(?:\s+ที่|$)/);
    return {
      name: nameMatch ? nameMatch[1] : 'สถานที่ใหม่',
      description: '',
      visit_duration: 2,
      estimated_cost: 0
    };
  }

  private extractDestinationId(message: string): any {
    // Extract destination ID or name
    const idMatch = message.match(/ลบ\s+(.+?)(?:\s+ที่|$)/);
    return {
      destinationId: idMatch ? idMatch[1] : null
    };
  }

  private extractUpdateData(message: string): any {
    return {
      destinationId: null, // Extract from message
      updates: {} // Extract update fields
    };
  }

  private extractReorderData(message: string): any {
    return {
      destinationIds: [] // Extract ordered IDs
    };
  }

  private extractTripUpdateData(message: string): any {
    return {
      updates: {} // Extract trip update fields
    };
  }

  private async getNextOrderIndex(tripId?: string): Promise<number> {
    if (!tripId) return 0;
    
    const { data } = await supabase
      .from('destinations')
      .select('order_index')
      .eq('trip_id', tripId)
      .order('order_index', { ascending: false })
      .limit(1);

    return data && data.length > 0 ? data[0].order_index + 1 : 0;
  }
}

// Factory function
export function createChatDataModificationService(): ChatDataModificationService {
  return new ChatDataModificationService();
}
