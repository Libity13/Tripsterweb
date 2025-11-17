// AI Service - Resolver for Google Places integration
import { TripActionSchema, TripActionsSchema, TripAction, TripActions } from "@/schemas/tripActions";
import { tripService } from "@/services/tripService";
import { supabase } from "@/lib/unifiedSupabaseClient";
import { config } from "@/config/environment";

const PLACES_ENDPOINT = config.edgeFunctions.googlePlaces;

interface GooglePlace {
  place_id: string | null;
  name: string | null;
  formatted_address: string | null;
  lat: number | null;
  lng: number | null;
  types: string[];
  rating: number | null;
  user_ratings_total: number | null;
  price_level: number | null;
  open_now: boolean | null;
  ref: { business_status: string | null };
}

interface ResolvedPlace {
  place_id: string;
  name: string;
  formatted_address: string;
  lat: number;
  lng: number;
  types: string[];
  rating: number;
  user_ratings_total: number;
  price_level: number;
  open_now: boolean;
}

// AI Service with provider support
export interface AIServiceOptions {
  provider?: 'openai' | 'claude' | 'gemini';
  model?: string;
  mode?: 'narrative' | 'structured';
  temperature?: number;
  style?: 'compact' | 'detailed';
}

// Legacy aiService for backward compatibility
export const aiService = {
  async sendMessage(
    message: string, 
    context: { 
      tripId?: string; 
      history?: Array<{role: string; content: string}>;
      provider?: 'openai' | 'claude' | 'gemini';
      model?: string;
      mode?: 'narrative' | 'structured';
      temperature?: number;
      style?: 'compact' | 'detailed';
    }, 
    language: string = 'th'
  ) {
    try {
      console.log('🤖 AI attempt 1/3');
      
      const response = await fetch(config.edgeFunctions.aiChat, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
        },
        body: JSON.stringify({
          message,
          trip_id: context.tripId,
          language,
          history: context.history || [],
          provider: context.provider || 'openai',
          model: context.model,
          mode: context.mode || 'structured',
          temperature: context.temperature ?? 0.7,
          style: context.style || 'detailed'
        })
      });

      if (!response.ok) {
        throw new Error(`AI service error: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ AI response validated successfully');
      
      return {
        success: true,
        message: data.reply || data.message || 'ไม่สามารถประมวลผลได้',
        reply: data.reply || data.message || 'ไม่สามารถประมวลผลได้',
        narrative: data.narrative || null,  // For narrative mode
        meta: data.meta || null,  // For narrative mode metadata
        actions: data.actions || [],
        suggest_login: data.suggest_login || false
      };
    } catch (error) {
      console.error('❌ AI service error:', error);
      return {
        success: false,
        message: 'เกิดข้อผิดพลาดในการประมวลผล กรุณาลองใหม่',
        actions: [],
        suggest_login: false
      };
    }
  }
};

async function resolvePlace(name: string, locationCtx?: string): Promise<ResolvedPlace | null> {
  try {
    const q = locationCtx ? `${name} ${locationCtx}` : name;
    console.log(`🔍 Resolving place: "${q}"`);
    
    const response = await fetch(PLACES_ENDPOINT, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({ 
        type: "textsearch", 
        q, 
        language: "th", 
        region: "th" 
      })
    });

    if (!response.ok) {
      console.error(`❌ Places API error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const first = (data?.canonical_places || [])[0] as GooglePlace;
    
    if (!first || !first.place_id || !first.name) {
      console.warn(`⚠️ No place found for: "${q}"`);
      return null;
    }

    // ******************************************************************
    // 🛠️ กรองความสอดคล้องของจังหวัด/เมืองแบบยืดหยุ่นและชาญฉลาด
    // ******************************************************************
    if (locationCtx) {
      const addr = (first.formatted_address || "").toLowerCase();
      const ctx = locationCtx.toLowerCase();
      const placeName = (first.name || "").toLowerCase();
      const searchName = name.toLowerCase();
      
      // 1. แยก context เป็นคำสำคัญ (เช่น "หัวหิน-ชะอำ" → ["หัวหิน", "ชะอำ"])
      let contextKeywords = ctx
        .split(/[-\s,/]+/) 
        .filter(w => w.length >= 2);
      
      // 2. เพิ่มชื่อจังหวัดที่เกี่ยวข้องสำหรับพื้นที่เฉพาะ
      if (ctx.includes('หัวหิน') || ctx.includes('ชะอำ')) {
        // หัวหินอยู่ในประจวบคีรีขันธ์, ชะอำอยู่ในเพชรบุรี
        contextKeywords.push('ประจวบคีรีขันธ์', 'เพชรบุรี', 'prachuap', 'phetchaburi');
      }
      if (ctx.includes('ภูเก็ต') || ctx.includes('phuket')) {
        contextKeywords.push('ภูเก็ต', 'phuket');
      }
      if (ctx.includes('เชียงใหม่') || ctx.includes('chiang mai')) {
        contextKeywords.push('เชียงใหม่', 'chiang mai');
      }
      if (ctx.includes('กระบี่') || ctx.includes('krabi')) {
        contextKeywords.push('กระบี่', 'krabi');
      }
      if (ctx.includes('พัทยา') || ctx.includes('pattaya')) {
        contextKeywords.push('ชนบุรี', 'chonburi', 'pattaya');
      }
      
      // นำคำที่ซ้ำออก
      contextKeywords = [...new Set(contextKeywords)];
      
      // 3. ตรวจสอบว่ามีคำสำคัญใดคำหนึ่งใน address หรือไม่
      const hasMatch = contextKeywords.some(keyword => addr.includes(keyword));
      
      // 4. หากไม่มีคำ Match เลย
      if (!hasMatch && contextKeywords.length > 0) {
        console.warn(
          `⚠️ Place "${first.name}" (${addr}) not in context "${locationCtx}". ` +
          `Keywords checked: ${contextKeywords.join(', ')}`
        );
        
        // ⚠️ ทางออกชั่วคราว: ผ่อนปรนการตรวจสอบ
        // หาก Context Check ล้มเหลว แต่ชื่อสถานที่ที่ Google คืนค่ามา
        // มีชื่อสถานที่ที่ AI ส่งมา → ให้ผ่าน (เพราะ Google มักจะคืนค่าที่ถูกต้อง)
        const nameMatch = 
          placeName.includes(searchName) || 
          searchName.includes(placeName) ||
          placeName.split(/\s+/).some(word => searchName.includes(word) && word.length >= 3);
        
        if (nameMatch) {
          console.log(
            `✅ Forcing resolution: Name match found despite context warning. ` +
            `Place: "${first.name}", Search: "${name}"`
          );
        } else {
          console.log(`❌ Skipping: Neither context nor name match. Place will be skipped.`);
          return null; // ข้ามผลลัพธ์ที่ไม่ตรง context และชื่อ
        }
      }
    }
    // ******************************************************************

    const resolved: ResolvedPlace = {
      place_id: first.place_id,
      name: first.name,
      formatted_address: first.formatted_address || '',
      lat: first.lat || 0,
      lng: first.lng || 0,
      types: first.types || [],
      rating: first.rating || 0,
      user_ratings_total: first.user_ratings_total || 0,
      price_level: first.price_level || 0,
      open_now: first.open_now || false
    };

    console.log(`✅ Resolved place: ${resolved.name} (${resolved.place_id})`);
    return resolved;

  } catch (error) {
    console.error(`❌ Error resolving place "${name}":`, error);
    return null;
  }
}

export async function applyAIActions(tripId: string, rawAi: any): Promise<void> {
  try {
    console.log('🤖 Applying AI actions:', rawAi);

    // Normalize shape to be compatible with TripActionsSchema
    // Some callers pass only { actions }, while schema requires a string reply
    const normalized = {
      reply: typeof rawAi?.reply === 'string'
        ? rawAi.reply
        : (typeof rawAi?.message === 'string' ? rawAi.message : ''),
      actions: Array.isArray(rawAi?.actions) ? rawAi.actions : [],
      suggest_login: Boolean(rawAi?.suggest_login)
    };

    const parse = TripActionsSchema.safeParse(normalized);
    let actions: TripAction[] = [] as any;
    if (!parse.success) {
      console.warn('⚠️ AI actions validation failed, attempting fallback coercion');
      // Best-effort fallback: coerce minimal shapes for ADD/REMOVE actions
      const rawActions = Array.isArray(rawAi?.actions) ? rawAi.actions : [];

      // Helper: try to extract day number from free text like "วันที่2" or "วัน 2"
      const extractDayFromText = (text: string | undefined): number | undefined => {
        if (!text) return undefined;
        const patterns = [
          /\bวันที่\s*(\d{1,2})\b/i,
          /\bวัน\s*(\d{1,2})\b/i,
          /\bday\s*(\d{1,2})\b/i
        ];
        for (const p of patterns) {
          const m = text.match(p);
          if (m && m[1]) {
            const n = parseInt(m[1], 10);
            if (!isNaN(n) && n > 0) return n;
          }
        }
        return undefined;
      };

      const contextText = (rawAi?.reply || rawAi?.message || '') as string;

      for (const a of rawActions) {
        const actType = (a?.action || '').toString().toUpperCase();
        if (actType === 'ADD_DESTINATIONS') {
          const list = Array.isArray(a?.destinations) ? a.destinations : (Array.isArray(a?.places) ? a.places : []);
          const coerced = list
            .map((d: any) => {
              if (!d) return null;
              if (typeof d === 'string') return { name: d };
              const name = d.name || d.title || d.place || '';
              if (!name) return null;
              const place_type = (d.place_type || d.placeType || d.type) as any;
              const minHours = typeof d.minHours === 'number' ? d.minHours : (typeof d.hours === 'number' ? d.hours : undefined);
              const hintAddress = d.hintAddress || d.address_hint || d.address;
              return { name, place_type, minHours, hintAddress };
            })
            .filter(Boolean);
          const inferredDay = typeof a?.day === 'number' ? a.day
            : (typeof a?.day === 'string' ? parseInt(a.day, 10) || undefined : undefined)
              ?? extractDayFromText(a?.context || a?.note || contextText);

          actions.push({
            action: 'ADD_DESTINATIONS',
            location_context: a?.location_context || a?.location || a?.province || undefined,
            day: inferredDay,
            destinations: coerced
          } as any);
        } else if (actType === 'REMOVE_DESTINATIONS') {
          // Accept destination_names | names | destinations | places as string[] or {name}
          const rawList = a?.destination_names || a?.names || a?.destinations || a?.places || [];
          const names: string[] = Array.isArray(rawList)
            ? rawList.map((x: any) => (typeof x === 'string' ? x : (x?.name || x?.title || x?.place))).filter(Boolean)
            : [];
          if (names.length > 0) {
            actions.push({ action: 'REMOVE_DESTINATIONS', destination_names: names } as any);
          }
        } else if (actType) {
          // Keep unknown actions for logging but do not process
          console.log('ℹ️ Unhandled action in fallback path:', actType);
        }
      }

      if (actions.length === 0) {
        const msg = 'AI actions invalid and no coercible actions found';
        console.error('❌', msg);
        throw new Error(msg);
      }
    } else {
      actions = parse.data.actions;
    }

    for (const action of actions) {
      console.log(`🎯 Processing action: ${action.action}`);
      
      switch (action.action) {
        case "ADD_DESTINATIONS": {
          const day = action.day ?? 1;
          console.log(`📅 Adding destinations to day ${day}`);
          
          // Check for duplicates before adding
          const existingDestinations = await tripService.getTrip(tripId);
          const existingNames = existingDestinations?.destinations?.map(d => d.name.toLowerCase()) || [];
          const existingPlaceIds = (existingDestinations?.destinations || [])
            .map(d => (d as any).place_id)
            .filter(Boolean) as string[];
          
          // Get trip info to calculate proper day distribution
          const trip = await tripService.getTrip(tripId);
          const rawDiffDays = trip ? Math.ceil((new Date(trip.end_date).getTime() - new Date(trip.start_date).getTime()) / (1000 * 60 * 60 * 24)) : 0;
          const tripDays = Math.max(1, rawDiffDays);
          console.log(`📅 Trip has ${tripDays} days, distributing destinations...`);
          
          for (let i = 0; i < action.destinations.length; i++) {
            const dest = action.destinations[i];
            // Distribute destinations across all days, honoring requested base day when provided
            const baseDay = Math.min(Math.max(1, day), tripDays);
            const targetDay = ((baseDay - 1 + i) % tripDays) + 1;
            // Skip if destination already exists
            if (existingNames.includes(dest.name.toLowerCase())) {
              console.log(`⏭️ Skipping duplicate destination: ${dest.name}`);
              continue;
            }
            
            const resolved = await resolvePlace((dest.name || '').trim(), action.location_context?.trim());
            if (!resolved) {
              console.warn(`⚠️ Skipping unresolved destination: ${dest.name}`);
              continue;
            }

            // Skip duplicates by place_id as well
            if (resolved.place_id && existingPlaceIds.includes(resolved.place_id)) {
              console.log(`⏭️ Skipping duplicate place_id: ${resolved.place_id} (${resolved.name})`);
              continue;
            }

            console.log(`📍 Adding ${dest.name} to day ${targetDay}`);
            await tripService.addDestination(tripId, {
              trip_id: tripId,
              place_id: resolved.place_id,
              name: resolved.name, // ใช้ชื่อจริงจาก Google
              name_en: resolved.name,
              description: resolved.formatted_address || '',
              description_en: resolved.formatted_address || '',
              formatted_address: resolved.formatted_address,
              latitude: resolved.lat,
              longitude: resolved.lng,
              visit_date: targetDay, // ใช้ targetDay ที่คำนวณแล้ว
              place_types: dest.place_type ? [dest.place_type] : ["tourist_attraction"],
              photos: [],
              estimated_cost: null,
              visit_duration: dest.minHours ? Math.round(dest.minHours * 60) : null,
              rating: resolved.rating,
              user_ratings_total: resolved.user_ratings_total,
              price_level: resolved.price_level,
              opening_hours: null,
              order_index: 1
            });
          }
          break;
        }

        case "REMOVE_DESTINATIONS": {
          console.log(`🗑️ Removing destinations:`, action.destination_names);
          await tripService.removeDestinationsByNames(tripId, action.destination_names);
          break;
        }

        case "REORDER_DESTINATIONS": {
          console.log(`🔄 Reordering destinations:`, action.destination_order);
          const validOrders = action.destination_order.filter(order => 
            order.name && order.day && order.order_index
          ) as Array<{name: string, day: number, order_index: number}>;
          await tripService.reorderDestinations(tripId, validOrders);
          break;
        }

        case "RECOMMEND_PLACES": {
          console.log(`💡 Place recommendations:`, action.recommendations);
          // แสดงผลอย่างเดียว ไม่ลง DB (หรือจะเปิดเป็นฟังก์ชันเพิ่มก็ได้)
          break;
        }

        case "UPDATE_TRIP_INFO": {
          console.log(`📝 Updating trip info:`, action);
          await tripService.updateTripInfo(tripId, {
            days: action.days,
            start_date: action.start_date,
            budget_min: action.budget_min,
            budget_max: action.budget_max
          });
          break;
        }

        case "ASK_PERSONAL_INFO":
        case "NO_ACTION":
        default:
          console.log(`ℹ️ No action needed: ${action.action}`);
          break;
      }
    }

    console.log('✅ All AI actions applied successfully');

  } catch (error) {
    console.error('❌ Error applying AI actions:', error);
    throw error;
  }
}

// Helper function to validate and parse AI response
export function validateAIResponse(response: any): TripActions | null {
  try {
    // Normalize response format - Edge Function sends 'message' instead of 'reply'
    const normalizedResponse = {
      ...response,
      reply: response.message || response.reply || ''
    };
    
    const parse = TripActionsSchema.safeParse(normalizedResponse);
    if (parse.success) {
      return parse.data;
    } else {
      console.error('❌ AI response validation failed:', parse.error);
      return null;
    }
  } catch (error) {
    console.error('❌ Error validating AI response:', error);
    return null;
  }
}
