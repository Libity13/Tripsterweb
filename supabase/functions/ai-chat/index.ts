/// <reference types="https://deno.land/types/lib.deno.d.ts" />



import { createClient } from "npm:@supabase/supabase-js@2.30.0";



// --- CORS Headers Configuration ---

function getCorsHeaders(req: Request) {

  const allowedOrigins = (Deno.env.get('ALLOWED_ORIGINS') ?? '').split(',').map(s => s.trim()).filter(Boolean);

  const origin = req.headers.get('Origin') ?? '';

  const allowedOrigin = allowedOrigins.includes(origin) ? origin : (allowedOrigins[0] ?? '*');



  const baseHeaders: Record<string, string> = {

    'Access-Control-Allow-Methods': 'POST, OPTIONS',

    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',

    'Vary': 'Origin'

  };



  if (allowedOrigin === '*') {

    return { ...baseHeaders, 'Access-Control-Allow-Origin': '*' };

  } else {

    return {

      ...baseHeaders,

      'Access-Control-Allow-Origin': allowedOrigin,

      'Access-Control-Allow-Credentials': 'true'

    };

  }

}



// --- Supabase Initialization ---

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;

const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;



// Function to create Supabase client with JWT (optional)

function createSupabaseClient(jwt?: string) {

  if (jwt) {

    return createClient(supabaseUrl, supabaseAnonKey, {

      auth: {

        persistSession: false,

      },

      global: {

        headers: {

          'Authorization': `Bearer ${jwt}`,

        },

      },

    });

  } else {

    // Anonymous client

    return createClient(supabaseUrl, supabaseAnonKey);

  }

}



// --- AI Provider API Setup ---

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';



const CLAUDE_API_KEY = Deno.env.get('CLAUDE_API_KEY');

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';



const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';



// --- Global Setup (สำหรับ OPTIONS preflight request) ---

function handleOptionsRequest(req: Request) {

  return new Response(null, {

    status: 204,

    headers: getCorsHeaders(req),

  });

}



// --- Types for AI Provider Configuration ---

type AIProvider = 'openai' | 'claude' | 'gemini';

type AIMode = 'narrative' | 'structured' | 'extraction';

type AIStyle = 'compact' | 'detailed';



interface AICallOptions {

  model?: string;

  temperature?: number;

  mode?: AIMode;

  style?: AIStyle;

  trip_id?: string;

}



// --- Function to get System Prompt based on Mode ---

function getSystemPrompt(mode: AIMode, style: AIStyle, locale: string): string {

  if (mode === 'narrative') {

    // Narrative Mode: Generate natural travel plan description

    const detailLevel = style === 'detailed' ? 'detailed and comprehensive' : 'concise';

    return `You are Tripster AI, a helpful travel planning assistant.



Your task is to create a ${detailLevel} narrative travel plan in ${locale === 'th' ? 'Thai' : 'English'} language.



You MUST respond with ONLY valid JSON in this exact format:

\`\`\`json

{

  "reply": "string (short summary message)",

  "narrative": "string (full day-by-day travel plan narrative)",

  "meta": {

    "audience": "family" | "solo" | "couple" | "friends" (optional),

    "budget": "low" | "medium" | "high" (optional),

    "language": "${locale}"

  }

}

\`\`\`



CRITICAL: Narrative Requirements:

- Write a natural, engaging travel plan narrative (NOT structured JSON)

- Include day-by-day itinerary with morning, afternoon, evening activities

- Describe each destination with context and recommendations

- Use ${style === 'detailed' ? 'detailed descriptions' : 'concise bullet points'}

- Make it readable and enjoyable for travelers

- Include practical tips (best times to visit, what to bring, etc.)



Example narrative structure:

"Day 1: Arrival and Exploration

Morning: Start your journey at [place name], where you can [activity description]...

Afternoon: Head to [place name] for [activity]...

Evening: Enjoy dinner at [restaurant name] featuring [cuisine type]..."



Respond in ${locale === 'th' ? 'Thai' : 'English'} language.`;

  } else if (mode === 'extraction') {

    // Extraction Mode: Extract places from narrative

    return `Analyze the travel plan narrative provided in the user message. Your task is to extract all mentioned destinations (tourist attractions, lodging, restaurants) and their details.



You MUST respond with ONLY valid JSON in this exact format:

{

  "extracted_places": [

    {

      "name": "ชื่อสถานที่",

      "day": 1, // Day number (1-based index)

      "type": "tourist_attraction|restaurant|lodging|other",

      "time": "เช้า|บ่าย|เย็น|ทั้งวัน", // Time context

      "minHours": 2 // Optional: estimated hours to spend

    },

    // ... more places

  ]

}



CRITICAL: 

- Extract ALL places mentioned in the narrative

- Include tourist attractions, accommodations, and restaurants

- Try to identify the day number from the narrative (e.g., "Day 1", "วันที่ 1", "วันแรก")

- Infer time context (morning, afternoon, evening) from the narrative

- Return ONLY the JSON object. Do not include any text outside the JSON.

- Do not use markdown code blocks (no \`\`\`json)



${locale === 'th' ? 'ตอบเป็นภาษาไทยโดยใช้ชื่อสถานที่ที่ระบุใน Narrative' : 'Respond in English, using the place names provided in the Narrative'}`;

  } else {

    // Structured Mode: Original JSON structure with actions

    return `You are Tripster AI, a helpful travel planning assistant.



    You MUST respond with ONLY valid JSON in this exact format:

    {

      "reply": "string (your response message)",

      "actions": [

        {

          "action": "ADD_DESTINATIONS" | "REMOVE_DESTINATIONS" | "MOVE_DESTINATION" | "REORDER_DESTINATIONS" | "UPDATE_TRIP_INFO" | "RECOMMEND_PLACES" | "ASK_PERSONAL_INFO" | "NO_ACTION",

          "destinations": [

            {

              "name": "string",

              "place_id": "string (optional, Google place_id if known)",

              "hintAddress": "string (optional)",

              "minHours": "number (optional)",

              "place_type": "tourist_attraction | lodging | restaurant (optional)",

              "day": "number (optional, 1-based day index in the trip)"

            }

          ],

          "location_context": "string (city/region for recommendations)",

          "place_types": ["restaurant", "lodging", "tourist_attraction"],

          "recommendations": [

            {

              "name": "string",

              "type": "restaurant" | "lodging" | "tourist_attraction",

              "description": "string (optional)"

            }

          ],

          "personal_info": {

            "travel_companions": "string (ครอบครัว, เพื่อน, แฟน, คนเดียว)",

            "budget_range": "string (งบประมาณต่อคนหรือทั้งหมด)",

            "travel_style": "string (ผ่อนคลาย, ผจญภัย, วัฒนธรรม, ช้อปปิ้ง)"

          }

        }

      ]

    }



    Rules:

    - If user asks about travel destinations, use action: "ADD_DESTINATIONS"

    - If user asks for recommendations (ร้านอาหาร, ที่พัก, ที่เที่ยว), use action: "RECOMMEND_PLACES"

    - If user wants to remove places, use action: "REMOVE_DESTINATIONS"

    - If user wants to move ONE place to a different day, use action: "MOVE_DESTINATION" (preferred for single moves)

    - If user wants to reorder multiple places, use action: "REORDER_DESTINATIONS"

    - If you need to ask about personal preferences (companions, budget, style), use action: "ASK_PERSONAL_INFO"

    - If no specific action needed, use action: "NO_ACTION"



    For RECOMMEND_PLACES:

    - Extract location_context from user message (e.g., "เชียงใหม่", "กรุงเทพ")

    - Identify place_types requested (restaurant, lodging, tourist_attraction)

    - Provide 3-5 specific recommendations with names, types, and descriptions

    - Include photos array for each recommendation if available

    - Make recommendations specific to the location_context



    CRITICAL: Smart Initial Request Processing:

    - If user provides a COMPLETE request with destination, duration, companions, and budget in one message, extract all information and proceed directly to ADD_DESTINATIONS.

    - If user provides PARTIAL information (e.g., only destination and duration), ask for missing details using ASK_PERSONAL_INFO.

    - Look for keywords: "ไปกับ", "กับ", "ครอบครัว", "เพื่อน", "แฟน", "คนเดียว" for companions.

    - Look for numbers with "บาท", "งบ", "ค่าใช้จ่าย" for budget.

    - Look for "เน้น", "ชอบ", "สไตล์" for travel style.

    - If you have ALL required information, proceed directly to ADD_DESTINATIONS.

    - If missing information, use ASK_PERSONAL_INFO to ask for missing details only.



    CRITICAL: Complete Travel Planning:

    - When creating a travel plan (ADD_DESTINATIONS), ALWAYS include a mix of:

      1. Tourist attractions (วัด, ดอย, อุทยาน, สถานที่สำคัญ)

      2. Accommodations (โรงแรม, รีสอร์ท, ที่พัก) - use "lodging" type

      3. Restaurants (ร้านอาหารท้องถิ่น, คาเฟ่) - use "restaurant" type

    - For each destination, specify the appropriate type: "tourist_attraction", "lodging", or "restaurant"

    - Include 2-3 tourist attractions, 1-2 accommodations, and 2-3 restaurants

    - Make sure all recommendations are within the specified location_context



    CRITICAL: Location Context Validation (STRICT - NO EXCEPTIONS):

    - ALL destinations MUST be located within the specified location_context

    - If location_context is "กาญจนบุรี", ALL places must be in Kanchanaburi province ONLY

    - If location_context is "เชียงราย", ALL places must be in Chiang Rai province ONLY

    - If location_context is "เพชรบูรณ์", ALL places must be in Phetchabun province ONLY

    - If location_context is "กรุงเทพ", ALL places must be in Bangkok ONLY

    - If location_context is "เชียงใหม่", ALL places must be in Chiang Mai province ONLY

    - If location_context is "ภูเก็ต", ALL places must be in Phuket province ONLY

    - If location_context is "พัทยา", ALL places must be in Chonburi province ONLY

    - DO NOT suggest places from other provinces or regions

    - Double-check the province/region of each suggested place before including it

    - If you're unsure about a location, do NOT include it in your suggestions

    - Common mistakes to avoid:

      * "วัดพระธาตุผาเงา" is in Chiang Rai, NOT Phetchabun

      * "วัดพระธาตุดอยสุเทพ" is in Chiang Mai, NOT other provinces

      * "สะพานข้ามแม่น้ำแคว" is in Kanchanaburi, NOT other provinces



    CRITICAL: Specific Place Names (NO GENERIC NAMES - STRICT):

    - Use SPECIFIC, REAL place names that exist in the location

    - DO NOT use generic names like "โรงแรม[จังหวัด]", "คาเฟ่[จังหวัด]", "ร้านอาหาร[จังหวัด]"

    - Use actual hotel names, restaurant names, and attraction names

    - Examples of GOOD names:

      * "โรงแรมดุสิตธานี", "รีสอร์ทเอราวัณ", "ที่พักริมแม่น้ำแคว"

      * "ร้านอาหารแม่ครัว", "คาเฟ่เมืองเก่า", "ร้านอาหารดอยสุเทพ"

      * "วัดพระธาตุดอยสุเทพ", "ดอยอินทนนท์", "น้ำตกเอราวัณ"

      * "เขาค้อ", "ภูทับเบิก", "น้ำตกศรีดิษฐ์" (for Phetchabun)

      * "วัดพระธาตุผาเงา", "ดอยตุง", "สามเหลี่ยมทองคำ" (for Chiang Rai)

    - Examples of BAD names (FORBIDDEN):

      * "โรงแรมกาญจนบุรี", "คาเฟ่กาญจนบุรี", "ร้านอาหารกาญจนบุรี"

      * "โรงแรมเชียงใหม่", "คาเฟ่เชียงใหม่", "ร้านอาหารเชียงใหม่"

      * "โรงแรมเพชรบูรณ์", "คาเฟ่เขาค้อ", "ร้านอาหารเพชรบูรณ์"

      * "โรงแรมเชียงราย", "คาเฟ่เชียงราย", "ร้านอาหารเชียงราย"



    CRITICAL: Accommodation Planning:

    - For multi-day trips (2+ days), suggest 1-2 accommodations per day

    - For 3-day trips: suggest 2-3 different accommodations

    - For 2-day trips: suggest 1-2 different accommodations

    - Include variety: hotels, resorts, guesthouses, homestays

    - Consider proximity to tourist attractions

    - Include accommodations with different price ranges based on budget

    - Always specify the correct place_type as "lodging" for accommodations

    - Use specific accommodation names that clearly indicate the correct province



    CRITICAL: Check conversation history carefully:

    - If user has already provided companions and budget information, DO NOT ask again

    - Proceed directly to ADD_DESTINATIONS action when you have both pieces of information

    - Look for keywords like "แฟน", "ครอบครัว", "เพื่อน", "คนเดียว" for companions

    - Look for numbers with "บาท" or "บาท" for budget



    CRITICAL: NEVER use ADD_DESTINATIONS with just a city name:

    - If user mentions only a city/province (e.g., "เชียงราย", "กรุงเทพ", "เชียงใหม่"), use RECOMMEND_PLACES instead

    - ADD_DESTINATIONS should only be used for specific attractions/places, not city names

    - For city names, suggest 3-5 popular attractions using RECOMMEND_PLACES action



    CRITICAL for MODIFICATION requests (STRICT - NO EXCEPTIONS):

    - If Conversation History contains ANY previous ADD_DESTINATIONS or RECOMMEND_PLACES actions, this means a trip plan ALREADY EXISTS.

    - When a trip plan exists, user requests are MODIFICATION requests, NOT initial planning requests.

    - For modification requests, NEVER use ASK_PERSONAL_INFO action - this is FORBIDDEN.

    - Focus ONLY on performing the requested modification (ADD_DESTINATIONS, REMOVE_DESTINATIONS, REORDER_DESTINATIONS).

    

    MODIFICATION KEYWORDS (if user says these, it's a modification request):

    - "เพิ่ม", "ใส่", "เอา", "ย้าย", "ลบ", "เอาออก", "แก้ไข", "เปลี่ยน", "จัดเรียง", "คำนวณ", "แนะนำ", "ช่วยหา", "หาที่พัก", "หาร้านอาหาร"

    - ANY request with a specific place name AFTER initial trip creation is a modification request

    

    MODIFICATION RULES:

    - If user says "เพิ่ม [place name]" → use ADD_DESTINATIONS with that place

    - If user says "ลบ [place name]" → use REMOVE_DESTINATIONS with destination_names: ["[place name]"] (MANDATORY)

    - If user says "ย้าย [place name] ไปวันที่ X" or "ย้าย [place name] ไปวันแรก/หลัง" → use MOVE_DESTINATION with destination_name and target_day

    - If user says "จัดเรียง" → use REORDER_DESTINATIONS

    - If user says "ช่วยหา", "หาที่พัก", "หาร้านอาหาร" → use RECOMMEND_PLACES with location_context from history

    - NEVER ask for companions/budget in modification requests
    
    
    
    CRITICAL: MOVE_DESTINATION Format:
    
    {
      "action": "MOVE_DESTINATION",
      "destination_name": "exact place name from user message",
      "target_day": 1, // day number (1, 2, 3, etc.)
      "target_position": 1 // optional, omit to add at end of day
    }
    
    Example: User says "ย้าย ครัวบ้านไร่ ไปวันแรก" → 
    {
      "action": "MOVE_DESTINATION",
      "destination_name": "ครัวบ้านไร่",
      "target_day": 1
    }

    - ALWAYS extract location_context from conversation history for RECOMMEND_PLACES

    

    CRITICAL: REMOVE_DESTINATIONS Requirements (STRICT - NO EXCEPTIONS):

    - When using REMOVE_DESTINATIONS, you MUST include destination_names array with exact place names

    - Example: If user says "ลบน้ำตกศรีดิษฐ์" → destination_names: ["น้ำตกศรีดิษฐ์"]

    - If user says "ลบโรงแรมกาญจนบุรี" → destination_names: ["โรงแรมกาญจนบุรี"]

    - If user says "ลบ Le Erawan Phang Nga Hotel" → destination_names: ["Le Erawan Phang Nga Hotel"]

    - The destination_names must match exactly with the place names in the current trip

    - NEVER use REMOVE_DESTINATIONS without destination_names array

    - ALWAYS extract the exact place name from user's message



    Sample questions to ask:

    - "ไม่ทราบว่าทริปนี้ไปเที่ยวกับใครบ้างครับ? (เช่น ครอบครัว, เพื่อน, แฟน, หรือไปคนเดียว)"

    - "พอจะมีงบประมาณคร่าวๆ สำหรับทริปนี้ไหมครับ? (เช่น ต่อคน หรือทั้งหมด)"

    - "ถ้าไม่สะดวกบอกก็ไม่เป็นไรครับ/ค่ะ"



    Respond in ${locale === 'th' ? 'Thai' : 'English'} language.`;

  }

}



// --- ฟังก์ชันเรียก OpenAI API ---

async function callOpenAI(

  userMessage: string, 

  locale: string, 

  conversationHistory: Array<{role: string, content: string}> = [], 

  options: AICallOptions = {},

  retryCount = 0

) {

    if (!OPENAI_API_KEY) {

        throw new Error("OPENAI_API_KEY is not set.");

    }



    const model = options.model || 'gpt-4o-mini';

    const temperature = options.temperature ?? 0.7;

    const mode = options.mode || 'structured';

    const style = options.style || 'detailed';

    const trip_id = options.trip_id;



    // Get appropriate prompt based on mode

    const systemPrompt = getSystemPrompt(mode, style, locale);



    // Debug: Log conversation history format

    console.log('🔍 Debug conversationHistory:', {

        type: typeof conversationHistory,

        isArray: Array.isArray(conversationHistory),

        length: conversationHistory?.length,

        sample: conversationHistory?.slice(0, 2)

    });



    // สร้าง messages array ที่ถูกต้องตาม OpenAI format

    const messages = [

        { role: "system", content: systemPrompt },

        // ใส่ทุกข้อความใน history (ตรวจสอบว่าเป็น Array ก่อน)

        ...(Array.isArray(conversationHistory) ? conversationHistory.map(msg => ({ role: msg.role, content: msg.content })) : []),

        // ใส่ข้อความล่าสุดพร้อมคำสั่งสำคัญ

        { 

            role: "user", 

            content: `${userMessage}\n\nCONTEXT CHECK:

- Conversation History Length: ${conversationHistory ? conversationHistory.length : 0} messages

- Trip ID: ${trip_id || 'None'}

- Current User Message: "${userMessage}"



DECISION LOGIC:

1. If this is the FIRST message (no history) → Ask for companions and budget first

2. If history exists and contains trip planning → This is a MODIFICATION request

3. For modification requests → NEVER ask for personal info, focus on the request



MODIFICATION RULES (when trip exists):

- "เพิ่ม [place]" → ADD_DESTINATIONS

- "ลบ [place]" → REMOVE_DESTINATIONS with destination_names: ["[place]"] (MANDATORY)

- "ย้าย [place] ไปวันที่ X" → MOVE_DESTINATION with destination_name and target_day

- "ช่วยหา" → RECOMMEND_PLACES

- "จัดเรียง" → REORDER_DESTINATIONS



CRITICAL: If user says "ลบ [place name]" → destination_names: ["[place name]"] (MANDATORY)

CRITICAL: If user says "ลบ Le Erawan Phang Nga Hotel" → destination_names: ["Le Erawan Phang Nga Hotel"] (MANDATORY)

CRITICAL: NEVER use REMOVE_DESTINATIONS without destination_names array - this will cause errors!



EXTRACT DESTINATION NAME FROM USER MESSAGE:

- Look for patterns like "ลบ [name] ออกจากวันที่1" → extract "[name]"

- Look for patterns like "ลบ [name]" → extract "[name]"

- The destination name should be the exact text between "ลบ" and "ออกจาก" or end of sentence`

        }

    ];



    const payload = {

        model: model,

        response_format: { type: "json_object" },

        messages: messages,

        max_tokens: mode === 'narrative' ? 2000 : 800,

        temperature: temperature

    };



    try {

        const controller = new AbortController();

        const timeoutId = setTimeout(() => controller.abort(), 25000); // 25s timeout



        const response = await fetch(OPENAI_API_URL, {

            method: 'POST',

            headers: { 

                'Content-Type': 'application/json',

                'Authorization': `Bearer ${OPENAI_API_KEY}`

            },

            body: JSON.stringify(payload),

            signal: controller.signal

        });



        clearTimeout(timeoutId);



        if (!response.ok) {

            const errorBody = await response.json();

            console.error("OpenAI API Error:", response.status, errorBody);

            throw new Error(`OpenAI API Error: ${response.status} ${JSON.stringify(errorBody)}`);

        }



        const result = await response.json();

        const content = result.choices?.[0]?.message?.content || "{}";

        

        // Validate JSON

        let parsed;

        try {

            parsed = JSON.parse(content);

        } catch (parseError) {

            console.error('JSON parse error:', parseError);

            if (retryCount < 1) {

                console.log('Retrying OpenAI call...');

                return await callOpenAI(userMessage, locale, conversationHistory, options, retryCount + 1);

            }

            throw new Error('Invalid JSON response from AI');

        }



        return parsed;

    } catch (error) {

        console.error('OpenAI API Error:', error);

        if (retryCount < 1 && (error.name === 'AbortError' || error.message.includes('429') || error.message.includes('5'))) {

            console.log('Retrying OpenAI call due to retryable error...');

            return await callOpenAI(userMessage, locale, conversationHistory, options, retryCount + 1);

        }

        throw error;

    }

}



// --- ฟังก์ชัน Fallback Message สำหรับ Multi-language ---

function getFallbackMessage(language: string): string {

  if (language === 'en') {

    return `Hello! I'm TravelMate AI, your travel planning assistant.



Sorry, the AI system is temporarily down, but I can still help you:



🗺️ **Search Places** - Type "search" + place name

📍 **Recommend Places** - Tell me where you want to go

✈️ **Plan Trip** - Tell me how many days you want to travel



Try asking me! 😊`;

  }



  // Default to Thai

  return `สวัสดีครับ! ผมคือ Tripster AI ผู้ช่วยวางแผนทริป



ขออภัยครับ ระบบ AI ขัดข้องชั่วคราว แต่ผมยังสามารถช่วยคุณได้:



🗺️ **ค้นหาสถานที่** - พิมพ์ "ค้นหา" + สถานที่ที่ต้องการ

📍 **แนะนำสถานที่** - บอกผมว่าอยากไปที่ไหน

✈️ **วางแผนทริป** - บอกผมว่าอยากไปกี่วัน



ลองถามผมดูครับ! 😊`;

}



// --- ฟังก์ชันเรียก Claude API ---

async function callClaude(

  userMessage: string,

  locale: string,

  conversationHistory: Array<{role: string, content: string}> = [],

  options: AICallOptions = {},

  retryCount = 0

) {

  if (!CLAUDE_API_KEY) {

    throw new Error("CLAUDE_API_KEY is not set.");

  }



  const model = options.model || 'claude-3-5-sonnet-20240620'; // Stable, recommended Claude 3.5 Sonnet

  const temperature = options.temperature ?? 0.7;

  const mode = options.mode || 'structured';

  const style = options.style || 'detailed';

  const trip_id = options.trip_id;



  // Get appropriate prompt based on mode

  const systemPrompt = getSystemPrompt(mode, style, locale);



  // Convert conversation history to Claude format

  const messages: Array<{role: 'user' | 'assistant', content: string}> = [];

  

  // Add conversation history

  for (const msg of conversationHistory) {

    if (msg.role === 'user' || msg.role === 'assistant') {

      messages.push({

        role: msg.role as 'user' | 'assistant',

        content: msg.content

      });

    }

  }



  // Add current user message

  const userContent = mode === 'structured' 

    ? `${userMessage}\n\nCONTEXT CHECK:

- Conversation History Length: ${conversationHistory ? conversationHistory.length : 0} messages

- Trip ID: ${trip_id || 'None'}

- Current User Message: "${userMessage}"



DECISION LOGIC:

1. If this is the FIRST message (no history) → Ask for companions and budget first

2. If history exists and contains trip planning → This is a MODIFICATION request

3. For modification requests → NEVER ask for personal info, focus on the request



MODIFICATION RULES (when trip exists):

- "เพิ่ม [place]" → ADD_DESTINATIONS

- "ลบ [place]" → REMOVE_DESTINATIONS with destination_names: ["[place]"] (MANDATORY)

- "ย้าย [place] ไปวันที่ X" → MOVE_DESTINATION with destination_name and target_day

- "ช่วยหา" → RECOMMEND_PLACES

- "จัดเรียง" → REORDER_DESTINATIONS`

    : userMessage;



  messages.push({

    role: 'user',

    content: userContent

  });



  const payload = {

    model: model,

    max_tokens: mode === 'narrative' ? 2000 : 1500, // Increased to 1500 for structured/extraction to reduce truncation

    temperature: temperature,

    system: systemPrompt,

    messages: messages

  };



  try {

    const controller = new AbortController();

    const timeoutId = setTimeout(() => controller.abort(), 45000); // Increased to 45s for Claude



    const response = await fetch(ANTHROPIC_API_URL, {

      method: 'POST',

      headers: {

        'Content-Type': 'application/json',

        'x-api-key': CLAUDE_API_KEY,

        'anthropic-version': '2023-06-01'

      },

      body: JSON.stringify(payload),

      signal: controller.signal

    });



    clearTimeout(timeoutId);



    if (!response.ok) {

      const errorBody = await response.json();

      console.error("Claude API Error:", response.status, errorBody);

      throw new Error(`Claude API Error: ${response.status} ${JSON.stringify(errorBody)}`);

    }



    const result = await response.json();

    let content = result.content?.[0]?.text || "{}";



    // Helper function to find complete JSON object by brace matching

    function findCompleteJsonObject(text: string): string | null {

      const start = text.indexOf('{');

      if (start === -1) return null;

      

      let braceCount = 0;

      let inString = false;

      let escapeNext = false;

      

      for (let i = start; i < text.length; i++) {

        const char = text[i];

        

        if (escapeNext) {

          escapeNext = false;

          continue;

        }

        

        if (char === '\\') {

          escapeNext = true;

          continue;

        }

        

        if (char === '"' && !escapeNext) {

          inString = !inString;

          continue;

        }

        

        if (!inString) {

          if (char === '{') {

            braceCount++;

          } else if (char === '}') {

            braceCount--;

            if (braceCount === 0) {

              return text.substring(start, i + 1); // Found complete JSON

            }

          }

        }

      }

      

      return null; // Truncated or incomplete

    }



    // Strip markdown code blocks if present (Claude sometimes returns ```json ... ```)

    // Try multiple patterns to handle different formats

    const patterns = [

      /```json\s*([\s\S]*?)\s*```/,  // ```json ... ```

      /```\s*json\s*([\s\S]*?)\s*```/, // ``` json ... ```

      /```\s*([\s\S]*?)\s*```/,        // ``` ... ``` (no label)

    ];



    let contentToParse = content;

    let jsonMatchFound = false;



    // 1. Try to extract from markdown code blocks

    for (const pattern of patterns) {

      const match = content.match(pattern);

      if (match && match[1]) {

        contentToParse = match[1].trim();

        jsonMatchFound = true;

        break;

      }

    }



    // 2. If no complete code block found, try to find complete JSON object using brace matching

    if (!jsonMatchFound) {

      const completeJson = findCompleteJsonObject(content);

      if (completeJson) {

        contentToParse = completeJson;

        jsonMatchFound = true;

      }

    }



    // 3. If still no match, try to extract JSON even if closing ``` is missing (truncated)

    if (!jsonMatchFound) {

      if (content.startsWith('```json') || content.startsWith('```')) {

        const truncatedMatch = content.match(/```json\s*([\s\S]*)/);

        if (truncatedMatch && truncatedMatch[1]) {

          const extracted = truncatedMatch[1].trim();

          const completeJson = findCompleteJsonObject(extracted);

          if (completeJson) {

            contentToParse = completeJson;

            jsonMatchFound = true;

          } else {

            contentToParse = extracted;

          }

        } else {

          const truncatedMatch2 = content.match(/```\s*([\s\S]*)/);

          if (truncatedMatch2 && truncatedMatch2[1]) {

            const extracted = truncatedMatch2[1].trim();

            const completeJson = findCompleteJsonObject(extracted);

            if (completeJson) {

              contentToParse = completeJson;

              jsonMatchFound = true;

            } else {

              contentToParse = extracted;

            }

          }

        }

      } else {

        // Try to find JSON object directly

        const completeJson = findCompleteJsonObject(content);

        if (completeJson) {

          contentToParse = completeJson;

        }

      }

    }



    // Trim whitespace

    contentToParse = contentToParse.trim();



    // Validate JSON

    let parsed;

    try {

      parsed = JSON.parse(contentToParse);

    } catch (parseError) {

      console.error('JSON parse error:', parseError);

      console.error('Raw content length:', content.length);

      console.error('Content to parse length:', contentToParse.length);

      

      // Try to repair common JSON issues

      try {

        // 1. Try to fix unterminated strings by finding the last valid JSON structure

        let repairedContent = contentToParse;

        

        // 2. Remove trailing incomplete strings or objects

        const lastCompleteObject = findCompleteJsonObject(contentToParse);

        if (lastCompleteObject) {

          repairedContent = lastCompleteObject;

          console.log('Attempting to parse repaired JSON (length:', repairedContent.length, ')');

          parsed = JSON.parse(repairedContent);

          console.log('✅ Successfully parsed repaired JSON');

        } else {

          throw new Error('Could not repair JSON');

        }

      } catch (repairError) {

        console.error('JSON repair failed:', repairError);

        

        if (retryCount < 1) {

          console.log('Retrying Claude call...');

          return await callClaude(userMessage, locale, conversationHistory, options, retryCount + 1);

        }

        

        throw new Error('Invalid JSON response from AI');

      }

    }



    return parsed;

  } catch (error) {

    console.error('Claude API Error:', error);

    if (retryCount < 1 && (error.name === 'AbortError' || error.message.includes('429') || error.message.includes('5'))) {

      console.log('Retrying Claude call due to retryable error...');

      return await callClaude(userMessage, locale, conversationHistory, options, retryCount + 1);

    }

    throw error;

  }

}



// --- ฟังก์ชันเรียก Gemini API (Fallback) ---

async function callGemini(

  userMessage: string,

  locale: string,

  conversationHistory: Array<{role: string, content: string}> = [],

  options: AICallOptions = {}

) {

    if (!GEMINI_API_KEY) {

        throw new Error("GEMINI_API_KEY is not set.");

    }



    const model = options.model || 'gemini-1.5-flash';

    const temperature = options.temperature ?? 0.7;

    const mode = options.mode || 'structured';

    const style = options.style || 'detailed';



    // Get appropriate prompt based on mode

    const systemPrompt = getSystemPrompt(mode, style, locale);



    // Convert conversation history to Gemini format

    const contents: Array<{role: string, parts: Array<{text: string}>}> = [];

    

    // Add conversation history

    for (const msg of conversationHistory) {

      if (msg.role === 'user' || msg.role === 'assistant') {

        contents.push({

          role: msg.role === 'user' ? 'user' : 'model',

          parts: [{ text: msg.content }]

        });

      }

    }



    // Add current user message

    contents.push({

      role: 'user',

      parts: [{ text: userMessage }]

    });



    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;



    const payload = {

        contents: contents,

        systemInstruction: {

          parts: [{ text: systemPrompt }]

        },

        generationConfig: {

            temperature: temperature,

            maxOutputTokens: mode === 'narrative' ? 2000 : 1000,

            topP: 0.9

        }

    };



    const response = await fetch(url, {

        method: 'POST',

        headers: { 

            'Content-Type': 'application/json'

        },

        body: JSON.stringify(payload)

    });



    if (!response.ok) {

        const errorBody = await response.text();

        console.error("Gemini API Error:", response.status, errorBody);

        throw new Error(`Gemini API Error: ${response.status} ${errorBody}`);

    }



    const result = await response.json();

    const content = result?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

    

    // Validate JSON

    let parsed;

    try {

      parsed = JSON.parse(content);

    } catch (parseError) {

      console.error('JSON parse error:', parseError);

      // Return as text if not JSON

      return { reply: content, actions: [] };

    }

    

    return parsed;

}



// --- Router function to call appropriate AI provider ---

async function callAIWithProvider(

  provider: AIProvider,

  userMessage: string,

  locale: string,

  conversationHistory: Array<{role: string, content: string}> = [],

  options: AICallOptions = {}

): Promise<any> {

  console.log(`🤖 Calling AI provider: ${provider} with mode: ${options.mode || 'structured'}`);

  

  switch (provider) {

    case 'openai':

      return await callOpenAI(userMessage, locale, conversationHistory, options);

    case 'claude':

      return await callClaude(userMessage, locale, conversationHistory, options);

    case 'gemini':

      return await callGemini(userMessage, locale, conversationHistory, options);

    default:

      throw new Error(`Unsupported AI provider: ${provider}`);

  }

}



Deno.serve(async (req: Request) => {

  if (req.method === 'OPTIONS') {

    return handleOptionsRequest(req);

  }



  try {

    if (req.method !== 'POST') {

      return new Response('Method Not Allowed', { status: 405, headers: getCorsHeaders(req) });

    }



    // --- Extract JWT from Authorization header (optional) ---

    const authHeader = req.headers.get('Authorization') || '';

    console.log('🔐 Auth header present:', !!authHeader);

    let supabase;

    let user: { id: string } | null = null;



    if (authHeader && authHeader.startsWith('Bearer ')) {

      const jwt = authHeader.replace('Bearer ', '');

      

      // Check if it's anon key (starts with eyJ)

      if (jwt.startsWith('eyJ')) {

        console.log('ℹ️ Using anon key for authentication');

        supabase = createSupabaseClient(); // Anonymous client

        user = null;

      } else {

        // Try JWT token authentication

      supabase = createSupabaseClient(jwt);



      // Try to get user from JWT (with error handling)

      try {

        const { data: { user: authUser }, error: userError } = await supabase.auth.getUser();

        if (!userError && authUser) {

          user = authUser;

          console.log('✅ Authenticated user:', authUser.id);

        } else {

          console.log('⚠️ JWT validation failed:', userError?.message || 'Unknown error');

            console.log('⚠️ JWT token:', jwt.substring(0, 50) + '...');

          supabase = createSupabaseClient(); // Anonymous client

          user = null;

        }

      } catch (error) {

        console.log('⚠️ JWT validation failed, falling back to anonymous:', error.message);

          console.log('⚠️ JWT token:', jwt.substring(0, 50) + '...');

        supabase = createSupabaseClient(); // Anonymous client

        user = null;

        }

      }

    } else {

      // No JWT provided, use anonymous access

      console.log('ℹ️ No JWT provided, using anonymous access');

      supabase = createSupabaseClient(); // Anonymous client

      user = null;

    }



    // --- Parse Payload ---

    const payload = await req.json();

    const { 

      trip_id, 

      session_id, 

      message, 

      locale = 'th', 

      language = 'th', 

      history = [],

      provider = 'openai',  // Default to OpenAI

      model,

      mode = 'structured',   // Default to structured mode

      temperature = 0.7,    // Default temperature

      style = 'detailed',   // Default style

      // Extraction mode inputs

      narrative_text_input, // Narrative text to extract places from

      location_context      // Location context for extraction

    } = payload;

    if (!message) {

      return new Response(JSON.stringify({ error: 'message is required' }), { status: 400, headers: getCorsHeaders(req) });

    }



    // --- Check trip ownership if trip_id is provided and user is authenticated ---

    if (trip_id && user) {

      const { data: trip, error: tripError } = await supabase

        .from('trips')

        .select('id, user_id')

        .eq('id', trip_id)

        .eq('user_id', user!.id) // user is guaranteed to be non-null here

        .single();



      if (tripError || !trip) {

        return new Response(JSON.stringify({ error: 'Trip not found or access denied' }), { status: 404, headers: getCorsHeaders(req) });

      }

    }



    // Use language parameter (fallback to locale for backward compatibility)

    const currentLanguage = language || locale || 'th';



    // Insert user message (only if user is authenticated)

    if (user) {

      await supabase.from('chat_messages').insert([{

        trip_id: trip_id || null,

        user_id: user!.id, // user is guaranteed to be non-null here

        role: 'user',

        content: message,

        session_id,

        language: currentLanguage

      }]);

    }



    // --- AI Chat Logic: Call OpenAI API with Gemini Fallback ---

    let assistantText: string;

    let assistantStructured: any;



    try {

      // Use conversation history from frontend (preferred) or fallback to database

      let conversationHistory: Array<{role: string, content: string}> = [];

      if (history && history.length > 0) {

        // Use history from frontend - convert to proper format

        conversationHistory = history.map((msg: any) => ({ role: msg.role, content: msg.content }));

        console.log('📱 Using conversation history from frontend:', history.length, 'messages');

      } else if (trip_id) {

        // Fallback to database history

        const { data: chatHistory } = await supabase

          .from('chat_messages')

          .select('role, content')

          .eq('trip_id', trip_id)

          .order('created_at', { ascending: true })

          .limit(10);



        if (chatHistory && chatHistory.length > 0) {

          conversationHistory = chatHistory; // ส่งเป็น Array ของ objects

          console.log('📱 Using conversation history from database:', chatHistory.length, 'messages');

        }

      }



      // Prepare AI call options

      const aiOptions: AICallOptions = {

        model: model,

        temperature: temperature,

        mode: mode as AIMode,

        style: style as AIStyle,

        trip_id: trip_id

      };



      // Prepare user message based on mode

      let userMessageForAI = message;



      if (mode === 'extraction') {

        // Override message for extraction mode

        userMessageForAI = `Narrative to extract places from (Location: ${location_context || 'Unknown'}):\n\n${narrative_text_input || message}`;

      }



      // Call appropriate AI provider

      const aiResponse = await callAIWithProvider(

        provider as AIProvider,

        userMessageForAI,

        currentLanguage,

        conversationHistory,

        aiOptions

      );



      // Parse AI response

      if (aiResponse && typeof aiResponse === 'object') {

        // Generate reply from actions if reply is missing or empty
        let generatedReply = aiResponse.reply;
        if (!generatedReply || generatedReply.trim() === '') {
          const actions = aiResponse.actions || [];
          if (actions.length > 0) {
            const action = actions[0];
            if (action.action === 'ADD_DESTINATIONS' && action.destinations && action.destinations.length > 0) {
              const destNames = action.destinations.map((d: any) => d.name).join(', ');
              generatedReply = `ได้เพิ่มสถานที่ ${action.destinations.length} แห่งให้คุณแล้ว: ${destNames}`;
            } else if (action.action === 'REMOVE_DESTINATIONS' && action.destination_names && action.destination_names.length > 0) {
              generatedReply = `ได้ลบสถานที่ ${action.destination_names.join(', ')} ออกจากแผนการเดินทางแล้ว`;
            } else if (action.action === 'ASK_PERSONAL_INFO') {
              generatedReply = 'กรุณาบอกข้อมูลเพิ่มเติมเกี่ยวกับการเดินทางของคุณ เช่น จำนวนคน งบประมาณ หรือสไตล์การเที่ยว';
            } else {
              generatedReply = 'ได้ประมวลผลคำขอของคุณแล้ว';
            }
          } else {
            generatedReply = 'ได้ประมวลผลคำขอของคุณแล้ว';
          }
        }

        assistantText = generatedReply || aiResponse.narrative || aiResponse.message || 'ขออภัย ไม่สามารถประมวลผลได้';

        assistantStructured = {

          intent: 'ai_reply',

          entities: {},

          actions: aiResponse.actions || [],

          narrative: aiResponse.narrative || null,

          meta: aiResponse.meta || null,

          // Extraction mode response

          extracted_places: aiResponse.extracted_places || null

        };

      } else {

        assistantText = String(aiResponse);

        assistantStructured = { intent: 'ai_reply', entities: {} };

      }



      console.log(`✅ ${provider} response successful`);

    } catch (error) {

      console.error(`${provider} API failed, trying fallback:`, error);

      console.error(`Error details:`, {

        message: error instanceof Error ? error.message : String(error),

        stack: error instanceof Error ? error.stack : undefined,

        provider,

        model,

        mode

      });



      // Check if it's a quota/rate limit error

      const errorString = String(error);

      const isQuotaError = /429|insufficient_quota|401|rate/i.test(errorString);

      const isApiKeyError = /API.*key|api.*key|not.*set|CLAUDE_API_KEY/i.test(errorString);



      // Try fallback to another provider if quota error

      if (isQuotaError && provider !== 'gemini') {

        try {

          console.log(`🔄 Switching to Gemini due to ${provider} quota/rate limit`);

          const fallbackOptions: AICallOptions = {

            model: model,

            temperature: temperature,

            mode: mode as AIMode,

            style: style as AIStyle,

            trip_id: trip_id

          };

          // Use conversationHistory from the outer scope

          let fallbackHistory: Array<{role: string, content: string}> = [];

          if (history && history.length > 0) {

            fallbackHistory = history.map((msg: any) => ({ role: msg.role, content: msg.content }));

          }

          const fallbackResponse = await callGemini(message, currentLanguage, fallbackHistory, fallbackOptions);

          assistantText = fallbackResponse.reply || fallbackResponse.narrative || String(fallbackResponse);

          assistantStructured = {

            intent: 'gemini_reply',

            entities: {},

            actions: fallbackResponse.actions || [],

            narrative: fallbackResponse.narrative || null

          };

          console.log('✅ Gemini fallback successful');

        } catch (geminiError) {

          console.error('Gemini fallback also failed:', geminiError);

          // Final fallback to simple response

          assistantText = getFallbackMessage(currentLanguage);

          assistantStructured = { intent: 'fallback_reply', entities: {} };

        }

      } else {

        // For non-quota errors, use simple fallback

        // Check if it's an API key error

        if (isApiKeyError) {

          console.error(`❌ ${provider} API Key Error: Please set ${provider.toUpperCase()}_API_KEY in Supabase Edge Function secrets`);

          assistantText = `ขออภัยครับ ระบบ AI ขัดข้องชั่วคราว (API Key ไม่ถูกตั้งค่า) กรุณาติดต่อผู้ดูแลระบบ`;

        } else {

          assistantText = getFallbackMessage(currentLanguage);

        }

        assistantStructured = { intent: 'fallback_reply', entities: {} };

      }

    }



    // Save assistant message (only if user is authenticated)

    let inserted: { id: string } | null = null;

    if (user) {

      const { data: insertedData } = await supabase.from('chat_messages').insert([{

        trip_id: trip_id || null,

        user_id: user!.id, // user is guaranteed to be non-null here

        role: 'assistant',

        content: assistantText,

        metadata: assistantStructured,

        session_id,

        language: currentLanguage

      }]).select('id').single();

      inserted = insertedData as { id: string } | null;

    }



    // Return Response

    return new Response(

      JSON.stringify({

        success: true,

        message: assistantText,

        reply: assistantText,  // For backward compatibility

        narrative: assistantStructured?.narrative || null,  // For narrative mode

        meta: assistantStructured?.meta || null,  // For narrative mode metadata

        actions: assistantStructured?.actions ?? [],

        structured: assistantStructured ?? null,

        suggest_login: false,

        message_id: inserted?.id ?? null

      }),

      {

        status: 200,

        headers: {

          'Content-Type': 'application/json',

          ...getCorsHeaders(req)

        }

      }

    );



  } catch (err) {

    console.error('Edge Function Error:', err);

    // Return Error Response พร้อม CORS

    return new Response(

      JSON.stringify({

        success: false,

        message: 'Internal Server Error',

        error: String(err),

        actions: [],

        structured: null,

        suggest_login: false,

        message_id: null

      }),

      {

        status: 500,

        headers: {

          'Content-Type': 'application/json',

          ...getCorsHeaders(req)

        }

      }

    );

  }

});