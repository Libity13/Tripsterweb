// Narrative Extraction Service - Extract structured place data from narrative text
import { aiService } from './aiService';
import { config } from '@/config/environment';

export interface ExtractedPlace {
  name: string;
  place_id?: string;
  hintAddress?: string;
  minHours?: number;
  place_type?: 'tourist_attraction' | 'lodging' | 'restaurant';
  day?: number;
  description?: string;
}

export interface ExtractionResult {
  success: boolean;
  places: ExtractedPlace[];
  error?: string;
  metadata?: {
    totalPlaces: number;
    extractionTime: number;
    model: string;
  };
}

/**
 * Extract structured place data from narrative text
 * This is Step 2 of the Two-Step AI flow:
 * Step 1: Generate Narrative (mode: 'narrative')
 * Step 2: Extract Places (mode: 'structured', this function)
 * Step 3: Search & Store (in ChatPanel/ItineraryPanel)
 */
export async function extractPlacesFromNarrative(
  narrative: string,
  options: {
    provider?: 'openai' | 'claude' | 'gemini';
    model?: string;
    temperature?: number;
    tripId?: string;
    tripDays?: number;
  } = {}
): Promise<ExtractionResult> {
  const startTime = Date.now();
  
  try {
    console.log('📝 Extracting places from narrative...');
    console.log('📄 Narrative length:', narrative.length, 'characters');
    
    // Construct extraction prompt
    const extractionPrompt = `จาก narrative ด้านล่างนี้ กรุณา extract สถานที่ท่องเที่ยวทั้งหมดออกมาเป็น JSON Array

Narrative:
${narrative}

กรุณา extract สถานที่ท่องเที่ยวทั้งหมดออกมาเป็น JSON Array ในรูปแบบนี้:
{
  "reply": "string (short summary)",
  "actions": [
    {
      "action": "ADD_DESTINATIONS",
      "destinations": [
        {
          "name": "string (ชื่อสถานที่)",
          "place_id": "string (optional, Google place_id if known)",
          "hintAddress": "string (optional, ที่อยู่หรือจังหวัด)",
          "minHours": "number (optional, จำนวนชั่วโมงที่ใช้เที่ยว)",
          "place_type": "tourist_attraction | lodging | restaurant (optional)",
          "day": "number (optional, วันที่ในทริป 1-based)"
        }
      ],
      "location_context": "string (จังหวัดหรือเมืองหลัก)"
    }
  ]
}

CRITICAL: 
- Extract ALL places mentioned in the narrative
- Include tourist attractions, accommodations, and restaurants
- Try to identify the day number from the narrative (e.g., "Day 1", "วันที่ 1", "วันแรก")
- Include location context (province/city) if mentioned
- Use specific place names, not generic names
- If a place is mentioned multiple times, include it only once`;

    // Call AI with structured mode to extract places
    const response = await aiService.sendMessage(
      extractionPrompt,
      {
        tripId: options.tripId,
        history: [],
        provider: options.provider || 'openai',
        model: options.model,
        mode: 'structured', // Use structured mode for extraction
        temperature: options.temperature ?? 0.3, // Lower temperature for more consistent extraction
        style: 'detailed'
      },
      'th'
    );

    if (!response.success) {
      throw new Error('AI extraction failed');
    }

    // Validate and parse AI response
    const validatedResponse = validateExtractionResponse(response);
    
    if (!validatedResponse || !validatedResponse.actions || validatedResponse.actions.length === 0) {
      throw new Error('No places extracted from narrative');
    }

    // Extract places from actions
    const places: ExtractedPlace[] = [];
    for (const action of validatedResponse.actions) {
      if (action.action === 'ADD_DESTINATIONS' && action.destinations) {
        for (const dest of action.destinations) {
          places.push({
            name: dest.name,
            place_id: dest.place_id,
            hintAddress: dest.hintAddress || action.location_context,
            minHours: dest.minHours,
            place_type: dest.place_type || 'tourist_attraction',
            day: dest.day,
            description: dest.description
          });
        }
      }
    }

    const extractionTime = Date.now() - startTime;
    
    console.log('✅ Extracted places:', places.length);
    console.log('⏱️ Extraction time:', extractionTime, 'ms');

    return {
      success: true,
      places,
      metadata: {
        totalPlaces: places.length,
        extractionTime,
        model: options.model || 'default'
      }
    };

  } catch (error) {
    console.error('❌ Error extracting places from narrative:', error);
    return {
      success: false,
      places: [],
      error: error instanceof Error ? error.message : 'Unknown error',
      metadata: {
        totalPlaces: 0,
        extractionTime: Date.now() - startTime,
        model: options.model || 'default'
      }
    };
  }
}

/**
 * Validate extraction response from AI
 */
function validateExtractionResponse(response: any): any {
  try {
    // Check if response has actions
    if (!response.actions || !Array.isArray(response.actions)) {
      console.warn('⚠️ No actions in extraction response');
      return null;
    }

    // Check if there's at least one ADD_DESTINATIONS action
    const addDestinationsAction = response.actions.find(
      (action: any) => action.action === 'ADD_DESTINATIONS'
    );

    if (!addDestinationsAction) {
      console.warn('⚠️ No ADD_DESTINATIONS action in extraction response');
      return null;
    }

    // Check if destinations exist
    if (!addDestinationsAction.destinations || !Array.isArray(addDestinationsAction.destinations)) {
      console.warn('⚠️ No destinations in ADD_DESTINATIONS action');
      return null;
    }

    // Validate destinations
    const validDestinations = addDestinationsAction.destinations.filter(
      (dest: any) => dest && dest.name && typeof dest.name === 'string' && dest.name.trim().length > 0
    );

    if (validDestinations.length === 0) {
      console.warn('⚠️ No valid destinations in extraction response');
      return null;
    }

    // Return validated response with filtered destinations
    return {
      ...response,
      actions: [
        {
          ...addDestinationsAction,
          destinations: validDestinations
        }
      ]
    };

  } catch (error) {
    console.error('❌ Error validating extraction response:', error);
    return null;
  }
}

/**
 * Helper function to search Google Places for extracted place names
 * This is Step 3 of the Two-Step AI flow
 */
export async function searchPlacesForExtractedNames(
  places: ExtractedPlace[],
  locationContext?: string
): Promise<Array<ExtractedPlace & { googlePlace?: any }>> {
  try {
    console.log('🔍 Searching Google Places for', places.length, 'places...');
    
    const results = await Promise.allSettled(
      places.map(async (place) => {
        try {
          // Use Google Places API to search for the place
          const searchQuery = locationContext 
            ? `${place.name} ${locationContext}`
            : place.name;

          const response = await fetch(config.edgeFunctions.googlePlaces, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify({
              type: 'textsearch',
              q: searchQuery,
              language: 'th',
              region: 'th'
            })
          });

          if (!response.ok) {
            throw new Error(`Places API error: ${response.status}`);
          }

          const data = await response.json();
          const firstPlace = (data?.canonical_places || [])[0];

          if (firstPlace && firstPlace.place_id) {
            return {
              ...place,
              place_id: firstPlace.place_id,
              googlePlace: firstPlace
            };
          }

          return place;

        } catch (error) {
          console.warn(`⚠️ Failed to search place "${place.name}":`, error);
          return place;
        }
      })
    );

    const successfulResults = results
      .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
      .map(result => result.value);

    console.log('✅ Found Google Places for', successfulResults.length, 'places');

    return successfulResults;

  } catch (error) {
    console.error('❌ Error searching Google Places:', error);
    return places;
  }
}

