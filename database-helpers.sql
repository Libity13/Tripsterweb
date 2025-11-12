-- ============================================
-- 🔧 Database Helper Functions
-- ============================================

-- Get installed extensions
CREATE OR REPLACE FUNCTION get_extensions()
RETURNS TABLE (
  extname TEXT,
  extversion TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.extname::TEXT,
    e.extversion::TEXT
  FROM pg_extension e
  WHERE e.extname IN ('postgis', 'http', 'pgcrypto')
  ORDER BY e.extname;
END;
$$ LANGUAGE plpgsql;

-- Test PostGIS functionality
CREATE OR REPLACE FUNCTION test_postgis()
RETURNS TABLE (
  test_name TEXT,
  result TEXT,
  success BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'PostGIS Version'::TEXT as test_name,
    PostGIS_Version()::TEXT as result,
    true as success
  UNION ALL
  SELECT 
    'Geometry Creation'::TEXT as test_name,
    ST_AsText(ST_MakePoint(100.5018, 13.7563))::TEXT as result,
    true as success
  UNION ALL
  SELECT 
    'Distance Calculation'::TEXT as test_name,
    ST_Distance(
      ST_SetSRID(ST_MakePoint(100.5018, 13.7563), 4326)::geography,
      ST_SetSRID(ST_MakePoint(100.5028, 13.7573), 4326)::geography
    )::TEXT as result,
    true as success;
END;
$$ LANGUAGE plpgsql;

-- Get table information (simplified)
CREATE OR REPLACE FUNCTION get_tables()
RETURNS TABLE (
  table_name TEXT,
  table_type TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.table_name::TEXT,
    'BASE TABLE'::TEXT as table_type
  FROM information_schema.tables t
  WHERE t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
  ORDER BY t.table_name;
END;
$$ LANGUAGE plpgsql;

-- Test database connectivity
CREATE OR REPLACE FUNCTION test_connection()
RETURNS TABLE (
  test_name TEXT,
  result TEXT,
  success BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'Database Connection'::TEXT as test_name,
    'Connected successfully'::TEXT as result,
    true as success
  UNION ALL
  SELECT 
    'Current Time'::TEXT as test_name,
    NOW()::TEXT as result,
    true as success
  UNION ALL
  SELECT 
    'Database Name'::TEXT as test_name,
    current_database()::TEXT as result,
    true as success;
END;
$$ LANGUAGE plpgsql;

-- Get content by language preference
CREATE OR REPLACE FUNCTION get_content_by_language(
  p_thai_content TEXT,
  p_english_content TEXT,
  p_language TEXT DEFAULT 'th'
)
RETURNS TEXT AS $$
BEGIN
  IF p_language = 'en' AND p_english_content IS NOT NULL AND p_english_content != '' THEN
    RETURN p_english_content;
  ELSE
    RETURN COALESCE(p_thai_content, p_english_content, '');
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Calculate distance between destinations (PostGIS)
CREATE OR REPLACE FUNCTION calculate_distance_between_destinations(
  p_from_destination_id UUID,
  p_to_destination_id UUID
)
RETURNS TABLE (
  distance_meters DECIMAL,
  distance_km DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ST_Distance(d1.location, d2.location)::DECIMAL as distance_meters,
    ROUND((ST_Distance(d1.location, d2.location) / 1000.0)::NUMERIC, 2) as distance_km
  FROM public.destinations d1
  CROSS JOIN public.destinations d2
  WHERE d1.id = p_from_destination_id
    AND d2.id = p_to_destination_id;
END;
$$ LANGUAGE plpgsql;

-- Find places nearby (PostGIS)
CREATE OR REPLACE FUNCTION find_places_nearby(
  p_latitude DECIMAL,
  p_longitude DECIMAL,
  p_radius_meters INTEGER DEFAULT 5000
)
RETURNS TABLE (
  place_id TEXT,
  name TEXT,
  formatted_address TEXT,
  distance_meters DECIMAL,
  rating DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pc.place_id,
    pc.name,
    pc.formatted_address,
    ST_Distance(
      pc.location,
      ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography
    )::DECIMAL as distance_meters,
    pc.rating
  FROM public.places_cache pc
  WHERE ST_DWithin(
    pc.location,
    ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography,
    p_radius_meters
  )
  ORDER BY distance_meters;
END;
$$ LANGUAGE plpgsql;

-- Get trip statistics
CREATE OR REPLACE FUNCTION get_trip_stats(p_trip_id UUID)
RETURNS TABLE (
  destination_count INTEGER,
  total_estimated_cost DECIMAL,
  avg_rating DECIMAL,
  date_range TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(d.id)::INTEGER as destination_count,
    SUM(d.estimated_cost) as total_estimated_cost,
    AVG(d.rating) as avg_rating,
    CASE 
      WHEN t.start_date IS NOT NULL AND t.end_date IS NOT NULL 
      THEN t.start_date::TEXT || ' - ' || t.end_date::TEXT
      ELSE 'Not set'
    END as date_range
  FROM public.destinations d
  RIGHT JOIN public.trips t ON d.trip_id = t.id
  WHERE t.id = p_trip_id
  GROUP BY t.id, t.start_date, t.end_date;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 📝 Comments
-- ============================================

COMMENT ON FUNCTION get_extensions IS 'Get installed extensions (PostGIS, HTTP, pgcrypto)';
COMMENT ON FUNCTION test_postgis IS 'Test PostGIS functionality and version';
COMMENT ON FUNCTION get_tables IS 'Get list of public tables';
COMMENT ON FUNCTION test_connection IS 'Test basic database connectivity';
COMMENT ON FUNCTION get_content_by_language IS 'Get content by language preference (Thai/English)';
COMMENT ON FUNCTION calculate_distance_between_destinations IS 'Calculate distance between two destinations using PostGIS';
COMMENT ON FUNCTION find_places_nearby IS 'Find places within radius using PostGIS spatial queries';
COMMENT ON FUNCTION get_trip_stats IS 'Get trip statistics (destinations, cost, rating, dates)';
