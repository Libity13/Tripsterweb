-- ============================================
-- PostGIS Functions for TravelMate AI
-- Hybrid Google Places + PostGIS System
-- ============================================

-- Function 1: Find nearby places using PostGIS
CREATE OR REPLACE FUNCTION find_nearby_places(
  p_latitude DECIMAL,
  p_longitude DECIMAL,
  p_radius_meters INTEGER DEFAULT 1000,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  place_id TEXT,
  name TEXT,
  formatted_address TEXT,
  latitude DECIMAL,
  longitude DECIMAL,
  rating DECIMAL,
  user_ratings_total INTEGER,
  price_level INTEGER,
  place_types TEXT[],
  distance_meters DECIMAL,
  cache_age_days INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pc.place_id,
    pc.name,
    pc.formatted_address,
    pc.latitude,
    pc.longitude,
    pc.rating,
    pc.user_ratings_total,
    pc.price_level,
    pc.place_types,
    ST_Distance(
      pc.location,
      ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography
    )::DECIMAL as distance_meters,
    EXTRACT(DAY FROM NOW() - pc.last_updated)::INTEGER as cache_age_days
  FROM public.places_cache pc
  WHERE pc.location IS NOT NULL
    AND ST_DWithin(
      pc.location,
      ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography,
      p_radius_meters
    )
    AND pc.cache_expires_at > NOW()
  ORDER BY distance_meters
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function 2: Find places by type within radius
CREATE OR REPLACE FUNCTION find_places_by_type(
  p_latitude DECIMAL,
  p_longitude DECIMAL,
  p_place_type TEXT,
  p_radius_meters INTEGER DEFAULT 2000,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  place_id TEXT,
  name TEXT,
  formatted_address TEXT,
  rating DECIMAL,
  distance_meters DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pc.place_id,
    pc.name,
    pc.formatted_address,
    pc.rating,
    ST_Distance(
      pc.location,
      ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography
    )::DECIMAL as distance_meters
  FROM public.places_cache pc
  WHERE pc.location IS NOT NULL
    AND ST_DWithin(
      pc.location,
      ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography,
      p_radius_meters
    )
    AND p_place_type = ANY(pc.place_types)
    AND pc.cache_expires_at > NOW()
  ORDER BY distance_meters
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function 3: Calculate route distance between places
CREATE OR REPLACE FUNCTION calculate_route_distance(
  p_from_lat DECIMAL,
  p_from_lng DECIMAL,
  p_to_lat DECIMAL,
  p_to_lng DECIMAL
)
RETURNS TABLE (
  distance_meters DECIMAL,
  bearing_degrees DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ST_Distance(
      ST_SetSRID(ST_MakePoint(p_from_lng, p_from_lat), 4326)::geography,
      ST_SetSRID(ST_MakePoint(p_to_lng, p_to_lat), 4326)::geography
    )::DECIMAL as distance_meters,
    ST_Azimuth(
      ST_SetSRID(ST_MakePoint(p_from_lng, p_from_lat), 4326)::geography,
      ST_SetSRID(ST_MakePoint(p_to_lng, p_to_lat), 4326)::geography
    ) * 180 / PI() as bearing_degrees;
END;
$$ LANGUAGE plpgsql;

-- Function 4: Find places along a route
CREATE OR REPLACE FUNCTION find_places_along_route(
  p_start_lat DECIMAL,
  p_start_lng DECIMAL,
  p_end_lat DECIMAL,
  p_end_lng DECIMAL,
  p_place_type TEXT,
  p_max_distance_meters INTEGER DEFAULT 500
)
RETURNS TABLE (
  place_id TEXT,
  name TEXT,
  formatted_address TEXT,
  rating DECIMAL,
  distance_to_route_meters DECIMAL
) AS $$
DECLARE
  route_line GEOMETRY;
BEGIN
  -- Create route line
  route_line := ST_MakeLine(
    ST_SetSRID(ST_MakePoint(p_start_lng, p_start_lat), 4326),
    ST_SetSRID(ST_MakePoint(p_end_lng, p_end_lat), 4326)
  );

  RETURN QUERY
  SELECT 
    pc.place_id,
    pc.name,
    pc.formatted_address,
    pc.rating,
    ST_Distance(pc.location, route_line::geography)::DECIMAL as distance_to_route_meters
  FROM public.places_cache pc
  WHERE pc.location IS NOT NULL
    AND ST_DWithin(
      pc.location,
      route_line::geography,
      p_max_distance_meters
    )
    AND p_place_type = ANY(pc.place_types)
    AND pc.cache_expires_at > NOW()
  ORDER BY distance_to_route_meters
  LIMIT 10;
END;
$$ LANGUAGE plpgsql;

-- Function 5: Get cache statistics
CREATE OR REPLACE FUNCTION get_cache_stats()
RETURNS TABLE (
  total_places INTEGER,
  expired_places INTEGER,
  avg_cache_age_days DECIMAL,
  most_common_types TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total_places,
    COUNT(*) FILTER (WHERE cache_expires_at < NOW())::INTEGER as expired_places,
    AVG(EXTRACT(DAY FROM NOW() - last_updated))::DECIMAL as avg_cache_age_days,
    ARRAY_AGG(DISTINCT unnest(place_types)) as most_common_types
  FROM public.places_cache;
END;
$$ LANGUAGE plpgsql;

-- Function 6: Smart cache refresh
CREATE OR REPLACE FUNCTION refresh_expired_cache()
RETURNS TABLE (
  refreshed_count INTEGER,
  failed_count INTEGER
) AS $$
DECLARE
  refreshed INTEGER := 0;
  failed INTEGER := 0;
  place_record RECORD;
BEGIN
  -- Get expired places
  FOR place_record IN 
    SELECT place_id, name 
    FROM public.places_cache 
    WHERE cache_expires_at < NOW() 
    LIMIT 10
  LOOP
    BEGIN
      -- Update cache expiry (simulate refresh)
      UPDATE public.places_cache 
      SET 
        cache_expires_at = NOW() + INTERVAL '30 days',
        last_updated = NOW()
      WHERE place_id = place_record.place_id;
      
      refreshed := refreshed + 1;
    EXCEPTION WHEN OTHERS THEN
      failed := failed + 1;
    END;
  END LOOP;

  RETURN QUERY SELECT refreshed, failed;
END;
$$ LANGUAGE plpgsql;

-- Function 7: Find popular places in area
CREATE OR REPLACE FUNCTION find_popular_places(
  p_latitude DECIMAL,
  p_longitude DECIMAL,
  p_radius_meters INTEGER DEFAULT 5000,
  p_min_rating DECIMAL DEFAULT 4.0,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  place_id TEXT,
  name TEXT,
  formatted_address TEXT,
  rating DECIMAL,
  user_ratings_total INTEGER,
  distance_meters DECIMAL,
  popularity_score DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pc.place_id,
    pc.name,
    pc.formatted_address,
    pc.rating,
    pc.user_ratings_total,
    ST_Distance(
      pc.location,
      ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography
    )::DECIMAL as distance_meters,
    (pc.rating * LOG(pc.user_ratings_total + 1))::DECIMAL as popularity_score
  FROM public.places_cache pc
  WHERE pc.location IS NOT NULL
    AND ST_DWithin(
      pc.location,
      ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography,
      p_radius_meters
    )
    AND pc.rating >= p_min_rating
    AND pc.cache_expires_at > NOW()
  ORDER BY popularity_score DESC, distance_meters
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function 8: Calculate trip statistics
CREATE OR REPLACE FUNCTION calculate_trip_stats(p_trip_id UUID)
RETURNS TABLE (
  total_distance_meters DECIMAL,
  estimated_duration_hours DECIMAL,
  avg_rating DECIMAL,
  total_estimated_cost DECIMAL,
  place_types_visited TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(rs.distance_meters), 0)::DECIMAL as total_distance_meters,
    COALESCE(SUM(rs.duration_seconds) / 3600.0, 0)::DECIMAL as estimated_duration_hours,
    AVG(d.rating)::DECIMAL as avg_rating,
    SUM(d.estimated_cost)::DECIMAL as total_estimated_cost,
    ARRAY_AGG(DISTINCT unnest(d.place_types)) as place_types_visited
  FROM public.destinations d
  LEFT JOIN public.route_segments rs ON d.trip_id = rs.trip_id
  WHERE d.trip_id = p_trip_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Indexes for Performance
-- ============================================

-- Spatial index for location
CREATE INDEX IF NOT EXISTS idx_places_cache_location_gist ON public.places_cache USING GIST(location);

-- Index for cache expiry
CREATE INDEX IF NOT EXISTS idx_places_cache_expires ON public.places_cache(cache_expires_at);

-- Index for place types
CREATE INDEX IF NOT EXISTS idx_places_cache_types ON public.places_cache USING GIN(place_types);

-- Index for rating
CREATE INDEX IF NOT EXISTS idx_places_cache_rating ON public.places_cache(rating DESC);

-- ============================================
-- Views for Common Queries
-- ============================================

-- View: Fresh places (recently updated)
CREATE OR REPLACE VIEW fresh_places AS
SELECT 
  place_id,
  name,
  formatted_address,
  rating,
  user_ratings_total,
  place_types,
  last_updated,
  EXTRACT(DAY FROM NOW() - last_updated) as days_since_update
FROM public.places_cache
WHERE cache_expires_at > NOW()
ORDER BY last_updated DESC;

-- View: Popular places by type
CREATE OR REPLACE VIEW popular_places_by_type AS
SELECT 
  unnest(place_types) as place_type,
  COUNT(*) as place_count,
  AVG(rating) as avg_rating,
  SUM(user_ratings_total) as total_reviews
FROM public.places_cache
WHERE cache_expires_at > NOW()
GROUP BY unnest(place_types)
ORDER BY place_count DESC;

-- ============================================
-- Triggers for Auto-Update
-- ============================================

-- Function to update location when lat/lng changes
CREATE OR REPLACE FUNCTION update_place_location()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.location := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for location update
CREATE TRIGGER trigger_update_place_location
  BEFORE INSERT OR UPDATE ON public.places_cache
  FOR EACH ROW
  EXECUTE FUNCTION update_place_location();

-- ============================================
-- Comments
-- ============================================

COMMENT ON FUNCTION find_nearby_places IS 'Find places within radius using PostGIS spatial queries';
COMMENT ON FUNCTION find_places_by_type IS 'Find places of specific type within radius';
COMMENT ON FUNCTION calculate_route_distance IS 'Calculate distance and bearing between two points';
COMMENT ON FUNCTION find_places_along_route IS 'Find places along a route path';
COMMENT ON FUNCTION get_cache_stats IS 'Get cache statistics and health';
COMMENT ON FUNCTION refresh_expired_cache IS 'Refresh expired cache entries';
COMMENT ON FUNCTION find_popular_places IS 'Find popular places with rating and review count';
COMMENT ON FUNCTION calculate_trip_stats IS 'Calculate comprehensive trip statistics';
