// AI Service - Resolver for Google Places integration
import { TripActionSchema, TripActionsSchema, TripAction, TripActions } from "@/schemas/tripActions";
import { tripService } from "@/services/tripService";
import { supabase } from "@/lib/unifiedSupabaseClient";
import { config } from "@/config/environment";
import { provinces, getProvinceByAlias } from "@/data/provinces";

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
      // Trip duration data - CRITICAL for preventing extra days
      total_days?: number;
      start_date?: string;
      end_date?: string;
      destinations_count?: number;
    }, 
    language: string = 'th'
  ) {
    try {
      console.log('🤖 AI attempt 1/3');
      console.log('📊 Trip context for AI:', { 
        total_days: context.total_days, 
        start_date: context.start_date,
        end_date: context.end_date,
        destinations_count: context.destinations_count
      });
      
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
          style: context.style || 'detailed',
          // Trip duration data - CRITICAL for AI to respect trip duration
          total_days: context.total_days,
          start_date: context.start_date,
          end_date: context.end_date,
          destinations_count: context.destinations_count
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

// ============================================================
// 🌍 Sub-Destination Mapping: เมืองท่องเที่ยว → จังหวัดแม่
// (ใช้ร่วมกับ provinces.ts สำหรับจังหวัดหลัก)
// ============================================================
const SUB_DESTINATION_MAPPING: Record<string, { parentProvince: string; keywords: string[] }> = {
  // ภาคกลาง - เมืองท่องเที่ยว
  'หัวหิน': { parentProvince: 'ประจวบคีรีขันธ์', keywords: ['hua hin', 'huahin', 'หัวหิน'] },
  'hua hin': { parentProvince: 'ประจวบคีรีขันธ์', keywords: ['hua hin', 'huahin', 'หัวหิน'] },
  'ชะอำ': { parentProvince: 'เพชรบุรี', keywords: ['cha-am', 'cha am', 'ชะอำ'] },
  'cha-am': { parentProvince: 'เพชรบุรี', keywords: ['cha-am', 'cha am', 'ชะอำ'] },
  'เขาค้อ': { parentProvince: 'เพชรบูรณ์', keywords: ['khao kho', 'khaokho', 'เขาค้อ'] },
  'khao kho': { parentProvince: 'เพชรบูรณ์', keywords: ['khao kho', 'khaokho', 'เขาค้อ'] },
  'ภูทับเบิก': { parentProvince: 'เพชรบูรณ์', keywords: ['phu thap boek', 'ภูทับเบิก'] },
  
  // ภาคตะวันออก - เมืองท่องเที่ยว
  'พัทยา': { parentProvince: 'ชลบุรี', keywords: ['pattaya', 'พัทยา'] },
  'pattaya': { parentProvince: 'ชลบุรี', keywords: ['pattaya', 'พัทยา'] },
  'เกาะล้าน': { parentProvince: 'ชลบุรี', keywords: ['koh larn', 'ko larn', 'koh lan', 'เกาะล้าน'] },
  'บางแสน': { parentProvince: 'ชลบุรี', keywords: ['bangsaen', 'bang saen', 'บางแสน'] },
  'เกาะช้าง': { parentProvince: 'ตราด', keywords: ['koh chang', 'ko chang', 'เกาะช้าง'] },
  'koh chang': { parentProvince: 'ตราด', keywords: ['koh chang', 'ko chang', 'เกาะช้าง'] },
  'เกาะหมาก': { parentProvince: 'ตราด', keywords: ['koh mak', 'ko mak', 'เกาะหมาก'] },
  'เกาะกูด': { parentProvince: 'ตราด', keywords: ['koh kood', 'ko kood', 'koh kut', 'เกาะกูด'] },
  'เกาะเสม็ด': { parentProvince: 'ระยอง', keywords: ['koh samet', 'ko samet', 'เกาะเสม็ด'] },
  
  // ภาคใต้ - เมืองท่องเที่ยว
  'เกาะสมุย': { parentProvince: 'สุราษฎร์ธานี', keywords: ['koh samui', 'ko samui', 'samui', 'เกาะสมุย', 'สมุย'] },
  'koh samui': { parentProvince: 'สุราษฎร์ธานี', keywords: ['koh samui', 'ko samui', 'samui', 'เกาะสมุย', 'สมุย'] },
  'เกาะพะงัน': { parentProvince: 'สุราษฎร์ธานี', keywords: ['koh phangan', 'ko phangan', 'phangan', 'เกาะพะงัน'] },
  'เกาะเต่า': { parentProvince: 'สุราษฎร์ธานี', keywords: ['koh tao', 'ko tao', 'เกาะเต่า'] },
  'หาดใหญ่': { parentProvince: 'สงขลา', keywords: ['hat yai', 'hatyai', 'หาดใหญ่'] },
  'hat yai': { parentProvince: 'สงขลา', keywords: ['hat yai', 'hatyai', 'หาดใหญ่'] },
  'เกาะลันตา': { parentProvince: 'กระบี่', keywords: ['koh lanta', 'ko lanta', 'lanta', 'เกาะลันตา', 'ลันตา'] },
  'koh lanta': { parentProvince: 'กระบี่', keywords: ['koh lanta', 'ko lanta', 'lanta', 'เกาะลันตา', 'ลันตา'] },
  'เกาะพีพี': { parentProvince: 'กระบี่', keywords: ['koh phi phi', 'phi phi', 'เกาะพีพี', 'พีพี'] },
  'koh phi phi': { parentProvince: 'กระบี่', keywords: ['koh phi phi', 'phi phi', 'เกาะพีพี', 'พีพี'] },
  'อ่าวนาง': { parentProvince: 'กระบี่', keywords: ['ao nang', 'aonang', 'อ่าวนาง'] },
  'เขาหลัก': { parentProvince: 'พังงา', keywords: ['khao lak', 'khaolak', 'เขาหลัก'] },
  'เกาะยาว': { parentProvince: 'พังงา', keywords: ['koh yao', 'ko yao', 'เกาะยาว'] },
  'เกาะลิเป๊ะ': { parentProvince: 'สตูล', keywords: ['koh lipe', 'ko lipe', 'lipe', 'เกาะลิเป๊ะ', 'ลิเป๊ะ'] },
  'koh lipe': { parentProvince: 'สตูล', keywords: ['koh lipe', 'ko lipe', 'lipe', 'เกาะลิเป๊ะ', 'ลิเป๊ะ'] },
  
  // ภาคเหนือ - เมืองท่องเที่ยว
  'ปาย': { parentProvince: 'แม่ฮ่องสอน', keywords: ['pai', 'ปาย'] },
  'pai': { parentProvince: 'แม่ฮ่องสอน', keywords: ['pai', 'ปาย'] },
  'ดอยอินทนนท์': { parentProvince: 'เชียงใหม่', keywords: ['doi inthanon', 'inthanon', 'ดอยอินทนนท์', 'อินทนนท์'] },
  'ดอยสุเทพ': { parentProvince: 'เชียงใหม่', keywords: ['doi suthep', 'suthep', 'ดอยสุเทพ', 'สุเทพ'] },
  'เชียงดาว': { parentProvince: 'เชียงใหม่', keywords: ['chiang dao', 'เชียงดาว'] },
  'แม่กำปอง': { parentProvince: 'เชียงใหม่', keywords: ['mae kampong', 'แม่กำปอง'] },
  'ดอยตุง': { parentProvince: 'เชียงราย', keywords: ['doi tung', 'ดอยตุง'] },
  'สามเหลี่ยมทองคำ': { parentProvince: 'เชียงราย', keywords: ['golden triangle', 'สามเหลี่ยมทองคำ'] },
  'ภูชี้ฟ้า': { parentProvince: 'เชียงราย', keywords: ['phu chi fa', 'ภูชี้ฟ้า'] },
  
  // ภาคอีสาน - เมืองท่องเที่ยว
  'ภูกระดึง': { parentProvince: 'เลย', keywords: ['phu kradueng', 'ภูกระดึง'] },
  'ภูเรือ': { parentProvince: 'เลย', keywords: ['phu ruea', 'ภูเรือ'] },
  'เชียงคาน': { parentProvince: 'เลย', keywords: ['chiang khan', 'เชียงคาน'] },
  'chiang khan': { parentProvince: 'เลย', keywords: ['chiang khan', 'เชียงคาน'] },
};

// Helper: ทำความสะอาดชื่อสถานที่ (ตัดคำขยายในวงเล็บออก)
function cleanPlaceName(name: string): string {
  // ตัดคำขยายในวงเล็บ เช่น "Wat Rong Khun (White Temple)" → "Wat Rong Khun"
  // หรือ "ร้านอาหาร... (อร่อยมาก)" → "ร้านอาหาร..."
  return name.replace(/\s*\([^)]*\)\s*/g, '').trim();
}

// Helper: หา Keywords ที่ต้องเช็คจาก provinces.ts + SUB_DESTINATION_MAPPING
function getProvinceKeywords(locationCtx: string): string[] {
  const ctx = locationCtx.toLowerCase().trim();
  const keywords: string[] = [];
  
  // 1. ลองหาใน provinces.ts ก่อน (ใช้ getProvinceByAlias)
  const province = getProvinceByAlias(ctx);
  if (province) {
    // เพิ่ม aliases ทั้งหมดของจังหวัดนั้น
    keywords.push(...province.aliases);
    // เพิ่มชื่อจังหวัดด้วย
    keywords.push(province.name.toLowerCase());
    console.log(`📍 Found province: ${province.name} with aliases: [${province.aliases.join(', ')}]`);
  }
  
  // 2. ลองหาใน SUB_DESTINATION_MAPPING (เมืองท่องเที่ยวย่อย)
  const subDest = SUB_DESTINATION_MAPPING[ctx];
  if (subDest) {
    // เพิ่ม keywords ของเมืองย่อย
    keywords.push(...subDest.keywords);
    
    // เพิ่ม keywords ของจังหวัดแม่ด้วย
    const parentProvince = getProvinceByAlias(subDest.parentProvince);
    if (parentProvince) {
      keywords.push(...parentProvince.aliases);
      keywords.push(parentProvince.name.toLowerCase());
    }
    console.log(`🏝️ Found sub-destination: ${ctx} → parent: ${subDest.parentProvince}`);
  }
  
  // 3. ถ้าไม่เจอตรงๆ ลองหาคำที่มีใน context ใน SUB_DESTINATION_MAPPING
  if (keywords.length === 0) {
    for (const [key, value] of Object.entries(SUB_DESTINATION_MAPPING)) {
      if (ctx.includes(key.toLowerCase())) {
        keywords.push(...value.keywords);
        const parentProvince = getProvinceByAlias(value.parentProvince);
        if (parentProvince) {
          keywords.push(...parentProvince.aliases);
        }
      }
    }
  }
  
  // 4. ถ้ายังไม่เจอ ลองค้นหาใน provinces object โดยตรง
  if (keywords.length === 0) {
    for (const [provinceName, provinceData] of Object.entries(provinces)) {
      for (const alias of provinceData.aliases) {
        if (ctx.includes(alias.toLowerCase())) {
          keywords.push(...provinceData.aliases);
          keywords.push(provinceData.name.toLowerCase());
          break;
        }
      }
    }
  }
  
  // 5. Fallback: แยกคำจาก context
  if (keywords.length === 0) {
    keywords.push(...ctx.split(/[-\s,/]+/).filter(w => w.length >= 2));
  }
  
  // Remove duplicates and return
  return [...new Set(keywords.map(k => k.toLowerCase()))];
}

async function resolvePlace(name: string, locationCtx?: string): Promise<ResolvedPlace | null> {
  try {
    // 1. ทำความสะอาดชื่อ: ตัดคำขยายที่ทำให้สับสนออก
    const cleanName = cleanPlaceName(name);
    
    // 2. สร้าง Query ที่ "บังคับจังหวัด" อย่างแน่นหนา
    const q = locationCtx ? `${cleanName} ${locationCtx}` : cleanName;
    console.log(`🔍 Resolving place: "${q}" (original: "${name}")`);
    
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

    // ============================================================
    // 🛠️ IMPROVED LOGIC: Cross-Language Resolution (Thai <-> English)
    // ยืดหยุ่นมากขึ้นเพื่อรองรับการค้นหาภาษาอังกฤษในประเทศไทย
    // ============================================================
    if (locationCtx) {
      const address = (first.formatted_address || "").toLowerCase();
      const ctx = locationCtx.toLowerCase().trim();
      const placeName = (first.name || "").toLowerCase();
      const searchName = cleanName.toLowerCase();
      
      // หา Keywords ที่ต้องเช็คจาก Province Mapping (ทั้งไทย/อังกฤษ)
      const validKeywords = getProvinceKeywords(ctx);
      console.log(`🔍 Checking keywords: [${validKeywords.join(', ')}] in address: "${address}"`);
      
      // เช็คว่าที่อยู่ที่ได้จาก Google มีคำพวกนี้ไหม?
      const isLocationCorrect = validKeywords.some(kw => address.includes(kw.toLowerCase()));
      
      // [NEW] เช็คว่าอยู่ในประเทศไทยหรือไม่ (Fallback สำหรับ Cross-language)
      const isInThailand = address.includes('thailand') || address.includes('ประเทศไทย') || address.includes('ไทย');
      
      if (isLocationCorrect) {
        // ✅ ผ่าน! ถ้าจังหวัดถูก เราเชื่อ Google เลยว่ามันคือสถานที่ที่ user อยากได้
        console.log(`✅ Location Match: "${first.name}" is in ${validKeywords.slice(0, 3).join('/')}`);
      } else {
        console.warn(
          `⚠️ Location Mismatch: "${first.name}" address "${address}" ` +
          `not matching context "${ctx}". Keywords: [${validKeywords.join(', ')}]`
        );
        
        // [IMPROVED] Name Matching ที่ยืดหยุ่นมากขึ้น
        // 1. Direct match (เหมือนเดิม)
        // 2. Tokenized match - เปรียบเทียบแบบตัดคำ (เพื่อรองรับกรณีชื่อยาวๆ)
        // 3. Cross-language tokens - "Wat" == "วัด", "Temple", etc.
        const searchTokens = searchName.split(/[\s-]+/).filter(t => t.length >= 2);
        const placeTokens = placeName.split(/[\s-]+/).filter(t => t.length >= 2);
        
        const nameMatch = 
          placeName.includes(searchName) || 
          searchName.includes(placeName) ||
          // Tokenized match: ถ้ามี token ใดตรงกัน (และยาวพอ)
          searchTokens.some(token => token.length >= 3 && placeName.includes(token)) ||
          placeTokens.some(token => token.length >= 3 && searchName.includes(token)) ||
          // Cross-language common words match
          (searchName.includes('wat') && (placeName.includes('วัด') || placeName.includes('temple'))) ||
          (searchName.includes('temple') && (placeName.includes('วัด') || placeName.includes('wat'))) ||
          (searchName.includes('beach') && (placeName.includes('หาด') || placeName.includes('beach'))) ||
          (searchName.includes('market') && (placeName.includes('ตลาด') || placeName.includes('market'))) ||
          (searchName.includes('park') && (placeName.includes('สวน') || placeName.includes('อุทยาน'))) ||
          (searchName.includes('mountain') && (placeName.includes('ภูเขา') || placeName.includes('ดอย'))) ||
          (searchName.includes('lake') && (placeName.includes('บึง') || placeName.includes('ทะเลสาบ'))) ||
          (searchName.includes('museum') && placeName.includes('พิพิธภัณฑ์')) ||
          (searchName.includes('restaurant') && (placeName.includes('ร้าน') || placeName.includes('ร้านอาหาร')));
        
        if (nameMatch && !locationCtx) {
          // [STRICT] อนุญาต Name Match เฉพาะกรณีไม่มี Context เท่านั้น
          // ถ้ามี Context (เช่นระบุจังหวัด) แล้ว address ไม่ตรง เราจะไม่ใช้ Name Match เพื่อป้องกันการมั่วข้ามจังหวัด
          console.log(
            `✅ Fallback (Name Match without Context): "${first.name}" ~ "${cleanName}"`
          );
        } else if (nameMatch && locationCtx) {
             // [STRICT] มี Context แต่ Address ไม่ตรง แม้ชื่อตรงก็ไม่เอา (เสี่ยงคนละสาขา/คนละที่)
             console.log(`❌ Skipping: Name matched "${first.name}" but address mismatch with context "${locationCtx}". Address: "${address}"`);
             return null;
        } else if (isInThailand && !locationCtx) {
          // [NEW] ถ้าอยู่ในประเทศไทยและเราไม่ได้ระบุ Context → เชื่อ Google
          console.log(
            `✅ Fallback (Thailand no context): "${first.name}" is in Thailand. `
          );
        } else {
          // [STRICT] ถ้ามี Context แต่ไม่ตรงทั้งที่อยู่และชื่อ -> ไม่เอาเลย (ป้องกันการมั่วพิกัดข้ามจังหวัด)
          console.log(`❌ Skipping: Location mismatch. Context: "${ctx}", Address: "${address}"`);
          return null; 
        }
      }
    }
    // ============================================================

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

    // [FIX] Sort actions to ensure correct execution order
    // MODIFY_TRIP (resize trip first) -> UPDATE_TRIP_INFO -> REMOVE (clear old) -> ADD (add new to correct days) -> REORDER
    const ACTION_PRIORITY: Record<string, number> = {
      'MODIFY_TRIP': 0,
      'UPDATE_TRIP_INFO': 1,
      'REMOVE_DESTINATIONS': 2,
      'ADD_DESTINATIONS': 3,
      'REORDER_DESTINATIONS': 4,
    };
    
    actions.sort((a, b) => {
      const pA = ACTION_PRIORITY[a.action] || 99;
      const pB = ACTION_PRIORITY[b.action] || 99;
      return pA - pB;
    });

    for (const action of actions) {
      console.log(`🎯 Processing action: ${action.action}`);
      
      switch (action.action) {
        case "ADD_DESTINATIONS": {
          const actionDay = action.day ?? 1;
          console.log(`📅 Adding destinations (action.day: ${actionDay})`);
          
          // Check for duplicates before adding
          const existingDestinations = await tripService.getTrip(tripId);
          const existingNames = existingDestinations?.destinations?.map(d => d.name.toLowerCase()) || [];
          const existingPlaceIds = (existingDestinations?.destinations || [])
            .map(d => (d as any).place_id)
            .filter(Boolean) as string[];
          
          // Get trip info to calculate proper day distribution
          const trip = await tripService.getTrip(tripId);
          const rawDiffDays = trip ? Math.ceil((new Date(trip.end_date).getTime() - new Date(trip.start_date).getTime()) / (1000 * 60 * 60 * 24)) : 0;
          // [FIX] tripDays should be diff + 1 (inclusive dates)
          const tripDays = Math.max(1, rawDiffDays + 1);
          console.log(`📅 Trip has ${tripDays} days (Start: ${trip?.start_date}, End: ${trip?.end_date})`);
          
          // 🆕 Smart Distribution Logic (same as databaseSyncService.ts)
          // Check if ANY destination has day specified
          const hasDestDays = action.destinations.some((d: any) => d.day && typeof d.day === 'number');
          
          // Check if destinations are ACTUALLY distributed across multiple days
          const uniqueDays = new Set(
            action.destinations
              .filter((d: any) => d.day && typeof d.day === 'number')
              .map((d: any) => d.day)
          );
          const isActuallyDistributed = uniqueDays.size > 1;
          
          // Force distribute if:
          // 1. No individual days specified, OR
          // 2. All destinations have same day (not actually distributed), AND
          // 3. There are more than 2 destinations, AND
          // 4. Trip has multiple days
          const shouldForceDistribute = (
            !hasDestDays || // No days specified
            (!isActuallyDistributed && hasDestDays) // All in same day
          ) && action.destinations.length > 2 && tripDays > 1;
          
          console.log('📅 Distribution check:', {
            actionDay,
            hasDestDays,
            isActuallyDistributed,
            uniqueDaysCount: uniqueDays.size,
            destinationsCount: action.destinations.length,
            tripDays,
            shouldForceDistribute,
            reason: shouldForceDistribute 
              ? (hasDestDays && !isActuallyDistributed 
                ? '🔄 All destinations in same day - forcing distribution!'
                : '🔄 No individual days - forcing distribution!')
              : (isActuallyDistributed 
                ? '✅ Already distributed across multiple days'
                : '⚠️ Not forcing distribution')
          });
          
          // Track order_index per day to avoid collisions
          const orderIndexByDay: Record<number, number> = {};
          // Initialize with max order_index from existing destinations
          for (const dest of existingDestinations?.destinations || []) {
            const destDay = dest.visit_date ?? 1;
            const destOrder = (dest as any).order_index ?? 0;
            orderIndexByDay[destDay] = Math.max(orderIndexByDay[destDay] ?? 0, destOrder);
          }
          
          for (let i = 0; i < action.destinations.length; i++) {
            const dest = action.destinations[i];
            
            // 🆕 Smart day calculation
            let targetDay: number;
            
            if ((dest as any).day && typeof (dest as any).day === 'number' && !shouldForceDistribute) {
              // AI specified day for this destination, and it's actually distributed
              targetDay = Math.min(Math.max(1, (dest as any).day), tripDays);
            } else if (shouldForceDistribute && tripDays > 1) {
              // 🆕 Force distribute across days
              const destinationsPerDay = Math.ceil(action.destinations.length / tripDays);
              targetDay = Math.floor(i / destinationsPerDay) + 1;
              targetDay = Math.min(targetDay, tripDays); // Clamp to trip days
              console.log(`🔄 Auto-distributing "${dest.name}" to day ${targetDay} (${i+1}/${action.destinations.length})`);
            } else {
              // Fallback: use action.day or default 1
              const requestedDay = (dest as any).day ?? actionDay;
              targetDay = Math.min(Math.max(1, requestedDay), tripDays);
            }
            
            // Log warning if AI tried to add to a day beyond trip duration
            const originalRequestedDay = (dest as any).day ?? actionDay;
            if (originalRequestedDay > tripDays) {
              console.warn(`⚠️ AI tried to add "${dest.name}" to day ${originalRequestedDay}, but trip only has ${tripDays} days. Clamped to day ${targetDay}.`);
            }
            
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

            // Calculate next order_index for this day
            const nextOrderIndex = (orderIndexByDay[targetDay] ?? 0) + 1;
            orderIndexByDay[targetDay] = nextOrderIndex;

            // Use only real data from AI - no fake estimates
            const estimatedCost = (dest as any).estimated_cost > 0 
              ? (dest as any).estimated_cost 
              : null;

            // Use only real duration from AI
            const durationMinutes = dest.minHours 
              ? Math.round(dest.minHours * 60) 
              : null;

            console.log(`📍 Adding ${dest.name} to day ${targetDay} (order: ${nextOrderIndex}${estimatedCost ? `, cost: ฿${estimatedCost}` : ''}${durationMinutes ? `, duration: ${durationMinutes}min` : ''})`);
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
              estimated_cost: estimatedCost,
              duration_minutes: durationMinutes,
              rating: resolved.rating,
              user_ratings_total: resolved.user_ratings_total,
              price_level: resolved.price_level,
              opening_hours: null,
              order_index: nextOrderIndex
            });
          }
          
          // 🆕 Update trip name based on location context
          if (action.location_context) {
            await tripService.updateTripNameByLocation(tripId, action.location_context);
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

        case "MODIFY_TRIP": {
          console.log(`🔄 Modifying trip:`, JSON.stringify(action, null, 2));
          
          // Handle both nested and flat formats
          const tripModification = (action as any).trip_modification || action;
          const newTotalDays = tripModification.new_total_days || tripModification.new_days || null;
          const extendToProvince = tripModification.extend_to_province || null;
          
          console.log(`📅 MODIFY_TRIP parsed: newTotalDays=${newTotalDays}, extendToProvince=${extendToProvince}`);
          
          if (newTotalDays && newTotalDays > 0) {
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
          } else {
            console.warn('⚠️ MODIFY_TRIP action received but new_total_days not found or invalid');
          }
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
