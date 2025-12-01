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

export interface DistanceValidationResult {
  valid: boolean;
  distance: number;
  severity: 'ok' | 'warning' | 'error';
  message?: string;
  canOverride: boolean;
}

export interface DailyTimeEstimate {
  totalHours: number;
  breakdown: {
    visiting: number;    // Hours spent at attractions
    travel: number;      // Hours spent traveling between places
    meals: number;       // Hours spent at meals
    buffer: number;      // Buffer time for unexpected delays
  };
  isOverLimit: boolean;
  missingComponents: string[]; // e.g., ['lodging', 'restaurant']
  warnings: string[];
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

  /**
   * Validate distance between two destinations
   * @param distance Distance in kilometers
   * @param userAdded Whether the destination was manually added by user
   * @returns Validation result with severity and message
   */
  validateDistance(distance: number, userAdded: boolean = false): DistanceValidationResult {
    // If user manually added, allow override even if distance is large
    if (userAdded && distance > 20) {
      return {
        valid: true,
        distance,
        severity: 'warning',
        message: `⚠️ ระยะทาง ${distance.toFixed(1)} กม. ค่อนข้างไกล (ขับรถประมาณ ${Math.round(distance / 40 * 60)} นาที)`,
        canOverride: true
      };
    }

    // Green zone: 0-20 km (recommended limit)
    if (distance <= 20) {
      return {
        valid: true,
        distance,
        severity: 'ok',
        canOverride: true
      };
    }

    // Red zone: > 20 km (hard block - AI shouldn't suggest, but user can override)
    return {
      valid: false,
      distance,
      severity: 'error',
      message: `❌ ระยะทาง ${distance.toFixed(1)} กม. เกินขีดจำกัดที่แนะนำ (20 กม.) - ใช้เวลาขับรถประมาณ ${Math.round(distance / 40 * 60)} นาที`,
      canOverride: true // User can still add manually
    };
  }

  /**
   * Estimate total time needed for a day's itinerary
   * @param destinations List of destinations for the day
   * @returns Time estimate breakdown and validation
   */
  async estimateDailyTime(destinations: Destination[]): Promise<DailyTimeEstimate> {
    const warnings: string[] = [];
    const missingComponents: string[] = [];

    // Check for required components
    const hasLodging = destinations.some(d => d.place_type === 'lodging');
    const hasRestaurant = destinations.some(d => d.place_type === 'restaurant');
    const hasAttraction = destinations.some(d => d.place_type === 'tourist_attraction');

    if (!hasLodging) missingComponents.push('lodging');
    if (!hasRestaurant) missingComponents.push('restaurant');
    if (!hasAttraction) missingComponents.push('tourist_attraction');

    // Calculate time breakdown
    let visitingTime = 0;
    let travelTime = 0;
    let mealsTime = 0;

    // Estimate visiting time for each destination
    for (const dest of destinations) {
      if (dest.place_type === 'tourist_attraction') {
        // Use minHours if available, otherwise default to 1.5 hours
        visitingTime += dest.minHours || 1.5;
      } else if (dest.place_type === 'restaurant') {
        // Meals typically take 1-1.5 hours
        mealsTime += 1.25;
      }
      // Lodging doesn't count towards daily activity time
    }

    // Calculate travel time between destinations
    const routeData = await this.calculateRouteDistanceReal(
      destinations.filter(d => d.latitude && d.longitude)
    );
    travelTime = routeData.totalDuration / 60; // Convert minutes to hours

    // Add buffer time (15 minutes per transition)
    const bufferTime = (destinations.length - 1) * 0.25; // 15 min = 0.25 hours

    const totalHours = visitingTime + travelTime + mealsTime + bufferTime;

    // Generate warnings based on new 6-8 hour constraints
    if (totalHours > 8) {
      warnings.push(`❌ แผนวันนี้ใช้เวลา ${totalHours.toFixed(1)} ชั่วโมง (เกินขีดจำกัด 8 ชั่วโมง) - ควรลดจำนวนสถานที่`);
    } else if (totalHours > 6) {
      warnings.push(`⚠️ แผนวันนี้ใช้เวลา ${totalHours.toFixed(1)} ชั่วโมง (เกือบถึงขีดจำกัด 6-8 ชั่วโมง)`);
    }

    if (destinations.filter(d => d.place_type === 'tourist_attraction').length > 4) {
      warnings.push('⚠️ สถานที่ท่องเที่ยวมากเกินไป (ควรไม่เกิน 4 แห่ง) อาจทำให้รีบเร่งและเหนื่อย');
    }

    if (mealsTime < 1) {
      warnings.push('⚠️ ควรเพิ่มร้านอาหารอย่างน้อย 1 ร้าน');
    }

    return {
      totalHours,
      breakdown: {
        visiting: visitingTime,
        travel: travelTime,
        meals: mealsTime,
        buffer: bufferTime
      },
      isOverLimit: totalHours > 8,
      missingComponents,
      warnings
    };
  }

  /**
   * Validate that a day's plan has all necessary components
   * @param destinations List of destinations for the day
   * @returns Validation result with missing components
   */
  validateDailyPlan(destinations: Destination[]): {
    isComplete: boolean;
    missingComponents: string[];
    suggestions: string[];
  } {
    const missingComponents: string[] = [];
    const suggestions: string[] = [];

    const hasLodging = destinations.some(d => d.place_type === 'lodging');
    const hasRestaurant = destinations.some(d => d.place_type === 'restaurant');
    const hasAttraction = destinations.some(d => d.place_type === 'tourist_attraction');

    if (!hasLodging) {
      missingComponents.push('lodging');
      suggestions.push('🏨 เพิ่มที่พัก');
    }

    if (!hasRestaurant) {
      missingComponents.push('restaurant');
      suggestions.push('🍽️ เพิ่มร้านอาหาร');
    }

    if (!hasAttraction) {
      missingComponents.push('tourist_attraction');
      suggestions.push('🏛️ เพิ่มสถานที่ท่องเที่ยว');
    }

    return {
      isComplete: missingComponents.length === 0,
      missingComponents,
      suggestions
    };
  }

  /**
   * 🎯 Context-Aware Scheduling: Find the best day for a new location
   * Based on geographic proximity to existing destinations
   * @param newPlace - New place coordinates { latitude, longitude }
   * @param currentDestinations - Array of existing destinations
   * @returns Recommended day, reason, and distance to closest place (or null if not applicable)
   */
  findBestDayForLocation(
    newPlace: { latitude: number; longitude: number },
    currentDestinations: Destination[]
  ): { day: number; reason: string; distance: number } | null {
    // Validate inputs
    if (!newPlace.latitude || !newPlace.longitude || currentDestinations.length === 0) {
      return null;
    }

    // Group destinations by day (only those with valid coordinates)
    const destinationsByDay: Record<number, Destination[]> = {};
    currentDestinations.forEach(d => {
      const day = d.visit_date || 1;
      if (d.latitude && d.longitude) {
        if (!destinationsByDay[day]) destinationsByDay[day] = [];
        destinationsByDay[day].push(d);
      }
    });

    // If no destinations have coordinates, can't calculate
    if (Object.keys(destinationsByDay).length === 0) {
      return null;
    }

    let bestDay = 1;
    let minDistance = Infinity;
    let closestPlace: string = '';

    // Find the closest place across all days
    for (const [dayStr, dayDests] of Object.entries(destinationsByDay)) {
      const day = parseInt(dayStr);
      
      for (const dest of dayDests) {
        const dist = this.calculateDistance(
          newPlace.latitude, 
          newPlace.longitude,
          dest.latitude!, 
          dest.longitude!
        );
        
        if (dist < minDistance) {
          minDistance = dist;
          bestDay = day;
          closestPlace = dest.name;
        }
      }
    }

    // Threshold for "nearby" recommendation (updated to 20 km limit)
    const NEARBY_THRESHOLD_KM = 20;
    
    if (minDistance <= NEARBY_THRESHOLD_KM) {
      // Within recommended limit - strong recommendation
      return { 
        day: bestDay, 
        reason: `อยู่ใกล้ "${closestPlace}" ในวันที่ ${bestDay} (${minDistance.toFixed(1)} กม.)`,
        distance: minDistance
      };
    }

    // Too far (> 20 km) - don't recommend
    return null;
  }
}

export const routeOptimizationService = new RouteOptimizationService();

