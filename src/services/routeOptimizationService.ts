// Route Optimization Service - Optimize destination order to minimize travel distance
import { Destination } from '@/types/database';

const DIRECTIONS_API_ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-directions`;

export interface OptimizedRoute {
  destinations: Destination[];
  totalDistance: number; // in kilometers
  estimatedTravelTime: number; // in minutes
  improvements: {
    originalDistance: number;
    optimizedDistance: number;
    savedDistance: number;
    savedTime: number;
  };
  useRealDistances: boolean; // true if using Google Directions API
}

export interface RouteSegment {
  from: Destination;
  to: Destination;
  distance: number; // in kilometers
  duration: number; // in minutes
  isEstimated: boolean; // true if using Haversine formula fallback
}

interface DirectionsAPIResponse {
  routes: Array<{
    legs: Array<{
      distance: {
        value: number; // meters
      };
      duration: {
        value: number; // seconds
      };
    }>;
  }>;
  status: string;
}

export class RouteOptimizationService {
  // Calculate distance between two points using Haversine formula
  calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return distance;
  }

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  // Estimate travel time based on distance (average speed: 40 km/h in city, 60 km/h outside)
  private estimateTravelTime(distance: number): number {
    const avgSpeed = 40; // km/h (conservative estimate for city travel)
    return (distance / avgSpeed) * 60; // convert to minutes
  }

  // Get real distance and duration from Google Directions API
  async getRealDistanceAndDuration(
    from: Destination,
    to: Destination
  ): Promise<{ distance: number; duration: number } | null> {
    if (!from.latitude || !from.longitude || !to.latitude || !to.longitude) {
      return null;
    }

    try {
      const response = await fetch(DIRECTIONS_API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          origin: {
            lat: from.latitude,
            lng: from.longitude
          },
          destination: {
            lat: to.latitude,
            lng: to.longitude
          },
          mode: 'driving',
          language: 'th',
          region: 'th'
        })
      });

      if (!response.ok) {
        console.warn('⚠️ Directions API error, falling back to Haversine');
        return null;
      }

      const data: DirectionsAPIResponse = await response.json();

      if (data.status !== 'OK' || !data.routes || data.routes.length === 0) {
        console.warn('⚠️ No routes found, falling back to Haversine');
        return null;
      }

      const leg = data.routes[0].legs[0];
      
      return {
        distance: leg.distance.value / 1000, // Convert meters to kilometers
        duration: leg.duration.value / 60 // Convert seconds to minutes
      };

    } catch (error) {
      console.warn('⚠️ Error calling Directions API:', error);
      return null;
    }
  }

  // Calculate total distance for a route (using Haversine - fast but estimated)
  calculateRouteDistance(destinations: Destination[]): number {
    if (destinations.length < 2) return 0;

    let totalDistance = 0;
    for (let i = 0; i < destinations.length - 1; i++) {
      const from = destinations[i];
      const to = destinations[i + 1];

      if (from.latitude && from.longitude && to.latitude && to.longitude) {
        totalDistance += this.calculateDistance(
          from.latitude,
          from.longitude,
          to.latitude,
          to.longitude
        );
      }
    }

    return totalDistance;
  }

  // Calculate total distance for a route (using Google Directions API - real but slower)
  async calculateRouteDistanceReal(destinations: Destination[]): Promise<{
    totalDistance: number;
    totalDuration: number;
    useRealDistances: boolean;
  }> {
    if (destinations.length < 2) {
      return { totalDistance: 0, totalDuration: 0, useRealDistances: false };
    }

    let totalDistance = 0;
    let totalDuration = 0;
    let successCount = 0;

    // Try to get real distances for all segments
    for (let i = 0; i < destinations.length - 1; i++) {
      const from = destinations[i];
      const to = destinations[i + 1];

      if (from.latitude && from.longitude && to.latitude && to.longitude) {
        const realData = await this.getRealDistanceAndDuration(from, to);
        
        if (realData) {
          totalDistance += realData.distance;
          totalDuration += realData.duration;
          successCount++;
        } else {
          // Fallback to Haversine
          const distance = this.calculateDistance(
            from.latitude,
            from.longitude,
            to.latitude,
            to.longitude
          );
          totalDistance += distance;
          totalDuration += this.estimateTravelTime(distance);
        }
      }
    }

    const useRealDistances = successCount > 0;
    
    console.log(
      `📏 Route calculation: ${successCount}/${destinations.length - 1} segments using real distances`
    );

    return {
      totalDistance,
      totalDuration,
      useRealDistances
    };
  }

  // Get route segments with distance and duration (using Haversine - fast estimation)
  getRouteSegments(destinations: Destination[]): RouteSegment[] {
    if (destinations.length < 2) return [];

    const segments: RouteSegment[] = [];
    for (let i = 0; i < destinations.length - 1; i++) {
      const from = destinations[i];
      const to = destinations[i + 1];

      if (from.latitude && from.longitude && to.latitude && to.longitude) {
        const distance = this.calculateDistance(
          from.latitude,
          from.longitude,
          to.latitude,
          to.longitude
        );

        segments.push({
          from,
          to,
          distance,
          duration: this.estimateTravelTime(distance),
          isEstimated: true
        });
      }
    }

    return segments;
  }

  // Get route segments with real distance and duration (using Google Directions API)
  async getRouteSegmentsReal(destinations: Destination[]): Promise<RouteSegment[]> {
    if (destinations.length < 2) return [];

    const segments: RouteSegment[] = [];
    
    for (let i = 0; i < destinations.length - 1; i++) {
      const from = destinations[i];
      const to = destinations[i + 1];

      if (from.latitude && from.longitude && to.latitude && to.longitude) {
        const realData = await this.getRealDistanceAndDuration(from, to);
        
        if (realData) {
          segments.push({
            from,
            to,
            distance: realData.distance,
            duration: realData.duration,
            isEstimated: false
          });
        } else {
          // Fallback to Haversine
          const distance = this.calculateDistance(
            from.latitude,
            from.longitude,
            to.latitude,
            to.longitude
          );

          segments.push({
            from,
            to,
            distance,
            duration: this.estimateTravelTime(distance),
            isEstimated: true
          });
        }
      }
    }

    return segments;
  }

  // Optimize route using Nearest Neighbor algorithm
  // This is a greedy algorithm that always picks the nearest unvisited destination
  optimizeRoute(destinations: Destination[]): OptimizedRoute {
    // Need at least 2 destinations with coordinates
    const validDestinations = destinations.filter(
      d => d.latitude && d.longitude
    );

    if (validDestinations.length < 2) {
      return {
        destinations,
        totalDistance: 0,
        estimatedTravelTime: 0,
        improvements: {
          originalDistance: 0,
          optimizedDistance: 0,
          savedDistance: 0,
          savedTime: 0
        },
        useRealDistances: false
      };
    }

    // Calculate original distance
    const originalDistance = this.calculateRouteDistance(validDestinations);

    // Start with the first destination (usually lodging or starting point)
    const optimized: Destination[] = [validDestinations[0]];
    const remaining = validDestinations.slice(1);

    // Greedy nearest neighbor algorithm
    while (remaining.length > 0) {
      const current = optimized[optimized.length - 1];
      let nearestIndex = 0;
      let nearestDistance = Infinity;

      // Find nearest unvisited destination
      for (let i = 0; i < remaining.length; i++) {
        const candidate = remaining[i];
        if (
          current.latitude &&
          current.longitude &&
          candidate.latitude &&
          candidate.longitude
        ) {
          const distance = this.calculateDistance(
            current.latitude,
            current.longitude,
            candidate.latitude,
            candidate.longitude
          );

          if (distance < nearestDistance) {
            nearestDistance = distance;
            nearestIndex = i;
          }
        }
      }

      // Add nearest to optimized route and remove from remaining
      optimized.push(remaining[nearestIndex]);
      remaining.splice(nearestIndex, 1);
    }

    // Add any destinations without coordinates at the end
    const destinationsWithoutCoords = destinations.filter(
      d => !d.latitude || !d.longitude
    );
    optimized.push(...destinationsWithoutCoords);

    // Calculate optimized distance
    const optimizedDistance = this.calculateRouteDistance(optimized);
    const savedDistance = originalDistance - optimizedDistance;
    const savedTime = this.estimateTravelTime(savedDistance);

    return {
      destinations: optimized,
      totalDistance: optimizedDistance,
      estimatedTravelTime: this.estimateTravelTime(optimizedDistance),
      improvements: {
        originalDistance,
        optimizedDistance,
        savedDistance,
        savedTime
      },
      useRealDistances: false // This method uses Haversine
    };
  }

  // Optimize route using real Google Directions API distances
  async optimizeRouteReal(destinations: Destination[]): Promise<OptimizedRoute> {
    const validDestinations = destinations.filter(
      d => d.latitude && d.longitude
    );

    if (validDestinations.length < 2) {
      return {
        destinations,
        totalDistance: 0,
        estimatedTravelTime: 0,
        improvements: {
          originalDistance: 0,
          optimizedDistance: 0,
          savedDistance: 0,
          savedTime: 0
        },
        useRealDistances: false
      };
    }

    // Calculate original distance with real API
    const originalData = await this.calculateRouteDistanceReal(validDestinations);
    
    // Use Haversine for optimization logic (fast), then calculate real distance for final route
    const haversineOptimized = this.optimizeRoute(destinations);
    
    // Calculate real distance for optimized route
    const optimizedData = await this.calculateRouteDistanceReal(haversineOptimized.destinations);

    const savedDistance = Math.max(0, originalData.totalDistance - optimizedData.totalDistance);
    const savedTime = Math.max(0, originalData.totalDuration - optimizedData.totalDuration);

    console.log(
      `✅ Real route optimization: ${originalData.totalDistance.toFixed(1)}km → ` +
      `${optimizedData.totalDistance.toFixed(1)}km (saved ${savedDistance.toFixed(1)}km, ${Math.round(savedTime)}min)`
    );

    return {
      destinations: haversineOptimized.destinations,
      totalDistance: optimizedData.totalDistance,
      estimatedTravelTime: optimizedData.totalDuration,
      improvements: {
        originalDistance: originalData.totalDistance,
        optimizedDistance: optimizedData.totalDistance,
        savedDistance,
        savedTime
      },
      useRealDistances: optimizedData.useRealDistances
    };
  }

  // Smart optimization: Consider place types (lodging first, restaurants between attractions)
  smartOptimizeRoute(destinations: Destination[]): OptimizedRoute {
    const validDestinations = destinations.filter(
      d => d.latitude && d.longitude
    );

    if (validDestinations.length < 2) {
      return this.optimizeRoute(destinations);
    }

    // Categorize destinations
    const lodging = validDestinations.filter(d => d.place_type === 'lodging');
    const restaurants = validDestinations.filter(d => d.place_type === 'restaurant');
    const attractions = validDestinations.filter(
      d => d.place_type === 'tourist_attraction' || !d.place_type
    );

    // Strategy:
    // 1. Start with lodging (if any)
    // 2. Optimize attractions route
    // 3. Insert restaurants at appropriate intervals (every 2-3 attractions)

    const optimized: Destination[] = [];

    // Start with lodging
    if (lodging.length > 0) {
      optimized.push(lodging[0]);
    }

    // Optimize attractions
    if (attractions.length > 0) {
      const startPoint = optimized.length > 0 ? optimized[optimized.length - 1] : attractions[0];
      const attractionsOptimized = this.nearestNeighborFrom(startPoint, attractions);
      
      // Insert restaurants every 2-3 attractions
      let restaurantIndex = 0;
      for (let i = 0; i < attractionsOptimized.length; i++) {
        optimized.push(attractionsOptimized[i]);
        
        // Add restaurant after every 2-3 attractions (around lunch/dinner time)
        if ((i + 1) % 3 === 0 && restaurantIndex < restaurants.length) {
          // Find nearest restaurant to current position
          const current = optimized[optimized.length - 1];
          let nearestRestaurant = restaurants[restaurantIndex];
          let nearestDistance = Infinity;
          
          for (let j = restaurantIndex; j < restaurants.length; j++) {
            const restaurant = restaurants[j];
            if (current.latitude && current.longitude && restaurant.latitude && restaurant.longitude) {
              const distance = this.calculateDistance(
                current.latitude,
                current.longitude,
                restaurant.latitude,
                restaurant.longitude
              );
              if (distance < nearestDistance) {
                nearestDistance = distance;
                nearestRestaurant = restaurant;
              }
            }
          }
          
          optimized.push(nearestRestaurant);
          restaurantIndex++;
        }
      }
      
      // Add remaining restaurants at the end
      while (restaurantIndex < restaurants.length) {
        optimized.push(restaurants[restaurantIndex]);
        restaurantIndex++;
      }
    } else {
      // No attractions, just add restaurants
      optimized.push(...restaurants);
    }

    // Add any destinations without coordinates at the end
    const destinationsWithoutCoords = destinations.filter(
      d => !d.latitude || !d.longitude
    );
    optimized.push(...destinationsWithoutCoords);

    // Calculate metrics
    const originalDistance = this.calculateRouteDistance(validDestinations);
    const optimizedDistance = this.calculateRouteDistance(optimized.filter(d => d.latitude && d.longitude));
    const savedDistance = Math.max(0, originalDistance - optimizedDistance);
    const savedTime = this.estimateTravelTime(savedDistance);

    return {
      destinations: optimized,
      totalDistance: optimizedDistance,
      estimatedTravelTime: this.estimateTravelTime(optimizedDistance),
      improvements: {
        originalDistance,
        optimizedDistance,
        savedDistance,
        savedTime
      },
      useRealDistances: false // This method uses Haversine
    };
  }

  // Smart optimization with real Google Directions API distances
  async smartOptimizeRouteReal(destinations: Destination[]): Promise<OptimizedRoute> {
    const validDestinations = destinations.filter(
      d => d.latitude && d.longitude
    );

    if (validDestinations.length < 2) {
      return this.optimizeRouteReal(destinations);
    }

    // Use Haversine for smart optimization logic (fast)
    const haversineOptimized = this.smartOptimizeRoute(destinations);
    
    // Calculate real distances for the optimized route
    const originalData = await this.calculateRouteDistanceReal(validDestinations);
    const optimizedData = await this.calculateRouteDistanceReal(
      haversineOptimized.destinations.filter(d => d.latitude && d.longitude)
    );

    const savedDistance = Math.max(0, originalData.totalDistance - optimizedData.totalDistance);
    const savedTime = Math.max(0, originalData.totalDuration - optimizedData.totalDuration);

    console.log(
      `✨ Smart route optimization (real): ${originalData.totalDistance.toFixed(1)}km → ` +
      `${optimizedData.totalDistance.toFixed(1)}km (saved ${savedDistance.toFixed(1)}km, ${Math.round(savedTime)}min)`
    );

    return {
      destinations: haversineOptimized.destinations,
      totalDistance: optimizedData.totalDistance,
      estimatedTravelTime: optimizedData.totalDuration,
      improvements: {
        originalDistance: originalData.totalDistance,
        optimizedDistance: optimizedData.totalDistance,
        savedDistance,
        savedTime
      },
      useRealDistances: optimizedData.useRealDistances
    };
  }

  // Helper: Nearest neighbor from a specific start point
  private nearestNeighborFrom(start: Destination, destinations: Destination[]): Destination[] {
    if (destinations.length === 0) return [];
    if (destinations.length === 1) return destinations;

    const optimized: Destination[] = [];
    const remaining = [...destinations];
    let current = start;

    while (remaining.length > 0) {
      let nearestIndex = 0;
      let nearestDistance = Infinity;

      for (let i = 0; i < remaining.length; i++) {
        const candidate = remaining[i];
        if (
          current.latitude &&
          current.longitude &&
          candidate.latitude &&
          candidate.longitude
        ) {
          const distance = this.calculateDistance(
            current.latitude,
            current.longitude,
            candidate.latitude,
            candidate.longitude
          );

          if (distance < nearestDistance) {
            nearestDistance = distance;
            nearestIndex = i;
          }
        }
      }

      const nearest = remaining[nearestIndex];
      optimized.push(nearest);
      remaining.splice(nearestIndex, 1);
      current = nearest;
    }

    return optimized;
  }
}

export const routeOptimizationService = new RouteOptimizationService();

