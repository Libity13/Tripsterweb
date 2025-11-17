// Google Directions API Edge Function
// Proxy for Google Directions API to hide API key and add server-side logic

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

const GOOGLE_API_KEY = Deno.env.get('GOOGLE_MAPS_API_KEY');

interface DirectionsRequest {
  origin: {
    lat: number;
    lng: number;
  } | string;
  destination: {
    lat: number;
    lng: number;
  } | string;
  waypoints?: Array<{
    lat: number;
    lng: number;
  } | string>;
  mode?: 'driving' | 'walking' | 'bicycling' | 'transit';
  optimize?: boolean; // Google's route optimization
  language?: string;
  region?: string;
}

interface DirectionsResponse {
  routes: Array<{
    legs: Array<{
      distance: {
        text: string;
        value: number; // meters
      };
      duration: {
        text: string;
        value: number; // seconds
      };
      start_address: string;
      end_address: string;
      start_location: {
        lat: number;
        lng: number;
      };
      end_location: {
        lat: number;
        lng: number;
      };
      steps: Array<any>;
    }>;
    overview_polyline: {
      points: string;
    };
    summary: string;
    warnings: string[];
    waypoint_order: number[];
  }>;
  status: string;
  error_message?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!GOOGLE_API_KEY) {
      throw new Error('GOOGLE_MAPS_API_KEY not configured');
    }

    const body: DirectionsRequest = await req.json();
    
    // Validate required fields
    if (!body.origin || !body.destination) {
      return new Response(
        JSON.stringify({ error: 'origin and destination are required' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Build Google Directions API URL
    const params = new URLSearchParams();
    
    // Origin
    if (typeof body.origin === 'string') {
      params.append('origin', body.origin);
    } else {
      params.append('origin', `${body.origin.lat},${body.origin.lng}`);
    }
    
    // Destination
    if (typeof body.destination === 'string') {
      params.append('destination', body.destination);
    } else {
      params.append('destination', `${body.destination.lat},${body.destination.lng}`);
    }
    
    // Waypoints
    if (body.waypoints && body.waypoints.length > 0) {
      const waypointsStr = body.waypoints
        .map(wp => typeof wp === 'string' ? wp : `${wp.lat},${wp.lng}`)
        .join('|');
      
      if (body.optimize) {
        params.append('waypoints', `optimize:true|${waypointsStr}`);
      } else {
        params.append('waypoints', waypointsStr);
      }
    }
    
    // Mode
    params.append('mode', body.mode || 'driving');
    
    // Language
    params.append('language', body.language || 'th');
    
    // Region
    params.append('region', body.region || 'th');
    
    // API Key
    params.append('key', GOOGLE_API_KEY);

    // Call Google Directions API
    const url = `https://maps.googleapis.com/maps/api/directions/json?${params.toString()}`;
    
    console.log('🚗 Calling Google Directions API...');
    
    const response = await fetch(url);
    const data: DirectionsResponse = await response.json();

    if (!response.ok || data.status !== 'OK') {
      console.error('❌ Google Directions API error:', data);
      return new Response(
        JSON.stringify({
          error: data.error_message || `Directions API error: ${data.status}`,
          status: data.status
        }),
        {
          status: response.status || 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('✅ Directions API response received');

    // Return the directions data
    return new Response(
      JSON.stringify(data),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('❌ Error in google-directions function:', error);
    
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

