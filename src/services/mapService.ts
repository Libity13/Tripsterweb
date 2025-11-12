// Map Service for Google Maps integration
import { supabase } from '@/lib/unifiedSupabaseClient';

export interface MapLocation {
  lat: number;
  lng: number;
  name: string;
  place_id?: string;
}

export interface RouteInfo {
  distance: string;
  duration: string;
  steps: any[];
}

export const mapService = {
  // Get directions between two points
  async getDirections(from: MapLocation, to: MapLocation): Promise<RouteInfo> {
    try {
      const response = await fetch(`https://maps.googleapis.com/maps/api/directions/json?origin=${from.lat},${from.lng}&destination=${to.lat},${to.lng}&key=${import.meta.env.VITE_GOOGLE_MAP_API_KEY}`);
      const data = await response.json();
      
      if (data.status !== 'OK') {
        throw new Error(`Directions API error: ${data.status}`);
      }

      const route = data.routes[0];
      const leg = route.legs[0];

      return {
        distance: leg.distance.text,
        duration: leg.duration.text,
        steps: leg.steps
      };
    } catch (error) {
      console.error('Directions error:', error);
      throw error;
    }
  },

  // Get optimized route for multiple destinations
  async getOptimizedRoute(destinations: MapLocation[]): Promise<RouteInfo> {
    try {
      const waypoints = destinations.slice(1, -1).map(dest => `${dest.lat},${dest.lng}`).join('|');
      const origin = `${destinations[0].lat},${destinations[0].lng}`;
      const destination = `${destinations[destinations.length - 1].lat},${destinations[destinations.length - 1].lng}`;
      
      const response = await fetch(`https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&waypoints=optimize:true|${waypoints}&key=${import.meta.env.VITE_GOOGLE_MAP_API_KEY}`);
      const data = await response.json();
      
      if (data.status !== 'OK') {
        throw new Error(`Directions API error: ${data.status}`);
      }

      const route = data.routes[0];
      const leg = route.legs[0];

      return {
        distance: leg.distance.text,
        duration: leg.duration.text,
        steps: leg.steps
      };
    } catch (error) {
      console.error('Optimized route error:', error);
      throw error;
    }
  },

  // Get map bounds for multiple locations
  getMapBounds(locations: MapLocation[]) {
    if (locations.length === 0) return null;

    const lats = locations.map(loc => loc.lat);
    const lngs = locations.map(loc => loc.lng);

    return {
      north: Math.max(...lats),
      south: Math.min(...lats),
      east: Math.max(...lngs),
      west: Math.min(...lngs)
    };
  },

  // Calculate center point
  getCenterPoint(locations: MapLocation[]) {
    if (locations.length === 0) return { lat: 13.7563, lng: 100.5018 }; // Bangkok default

    const lat = locations.reduce((sum, loc) => sum + loc.lat, 0) / locations.length;
    const lng = locations.reduce((sum, loc) => sum + loc.lng, 0) / locations.length;

    return { lat, lng };
  }
};
