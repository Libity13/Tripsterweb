import { useState, useCallback } from 'react';
import { HybridPlacesService } from '@/services/hybridPlacesService';

export const useHybridPlaces = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cacheStats, setCacheStats] = useState<any>(null);

  const placesService = new HybridPlacesService(
    import.meta.env.VITE_GOOGLE_PLACES_API_KEY || ''
  );

  // Smart search with cache-first strategy
  const searchPlaces = useCallback(async (
    query: string, 
    location?: { lat: number; lng: number }, 
    radius?: number
  ) => {
    setLoading(true);
    setError(null);

    try {
      const results = await placesService.searchPlaces(query, location, radius);
      return results;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [placesService]);

  // Get nearby places using PostGIS (super fast!)
  const getNearbyPlaces = useCallback(async (
    location: { lat: number; lng: number },
    radius: number = 1000,
    limit: number = 20
  ) => {
    setLoading(true);
    setError(null);

    try {
      const results = await placesService.getNearbyPlaces(location, radius, limit);
      return results;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nearby search failed');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [placesService]);

  // Get place details (cache first, then Google)
  const getPlaceDetails = useCallback(async (placeId: string) => {
    setLoading(true);
    setError(null);

    try {
      const details = await placesService.getPlaceDetails(placeId);
      return details;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Get details failed');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [placesService]);

  // Refresh expired cache
  const refreshExpiredPlaces = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      await placesService.refreshExpiredPlaces();
      console.log('🔄 Cache refreshed successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Refresh failed');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [placesService]);

  return {
    searchPlaces,
    getNearbyPlaces,
    getPlaceDetails,
    refreshExpiredPlaces,
    loading,
    error,
    cacheStats
  };
};
