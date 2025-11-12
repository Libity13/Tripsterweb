-- ============================================
-- Migration Script: TravelMate AI - Full Features
-- With PostGIS, HTTP, and pg_net Extensions
-- ============================================

-- Step 1: Enable Extensions
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Step 2: Modify Existing Tables
-- ============================================

-- Update profiles table
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{
    "language": "th",
    "currency": "THB",
    "preferred_activities": [],
    "dietary_restrictions": [],
    "accessibility_needs": []
  }'::jsonb;

-- Update trips table
ALTER TABLE public.trips
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'planning' CHECK (status IN ('planning', 'confirmed', 'ongoing', 'completed', 'cancelled')),
  ADD COLUMN IF NOT EXISTS budget_min DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS budget_max DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'THB',
  ADD COLUMN IF NOT EXISTS cover_image_url TEXT,
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS export_url TEXT,
  ADD COLUMN IF NOT EXISTS route_data JSONB,
  ADD COLUMN IF NOT EXISTS total_distance DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS total_duration INTEGER,
  ADD COLUMN IF NOT EXISTS last_exported_at TIMESTAMPTZ;

-- Rename budget to budget_max if exists
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'trips' AND column_name = 'budget') THEN
    ALTER TABLE public.trips RENAME COLUMN budget TO budget_max;
  END IF;
END $$;

-- Update destinations table with PostGIS
ALTER TABLE public.destinations
  ADD COLUMN IF NOT EXISTS place_id TEXT,
  ADD COLUMN IF NOT EXISTS formatted_address TEXT,
  ADD COLUMN IF NOT EXISTS location GEOGRAPHY(POINT, 4326),
  ADD COLUMN IF NOT EXISTS place_types TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS rating DECIMAL(2,1),
  ADD COLUMN IF NOT EXISTS user_ratings_total INTEGER,
  ADD COLUMN IF NOT EXISTS price_level INTEGER,
  ADD COLUMN IF NOT EXISTS photos JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS opening_hours JSONB,
  ADD COLUMN IF NOT EXISTS phone_number TEXT,
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS visit_date DATE,
  ADD COLUMN IF NOT EXISTS visit_time TIME,
  ADD COLUMN IF NOT EXISTS duration_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS estimated_cost DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS recommended_by_ai BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS ai_reason TEXT,
  ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_visited BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS user_rating DECIMAL(2,1);

-- Rename duration_hours to duration_minutes if exists
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'destinations' AND column_name = 'duration_hours') THEN
    ALTER TABLE public.destinations ADD COLUMN IF NOT EXISTS duration_minutes INTEGER;
    UPDATE public.destinations SET duration_minutes = duration_hours * 60 WHERE duration_hours IS NOT NULL;
    ALTER TABLE public.destinations DROP COLUMN duration_hours;
  END IF;
END $$;

-- Update location field with existing lat/lng using PostGIS
UPDATE public.destinations 
SET location = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
WHERE longitude IS NOT NULL AND latitude IS NOT NULL AND location IS NULL;

-- Add PostGIS indexes
CREATE INDEX IF NOT EXISTS idx_destinations_place_id ON public.destinations(place_id);
CREATE INDEX IF NOT EXISTS idx_destinations_location ON public.destinations USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_destinations_visit_date ON public.destinations(visit_date);

-- Step 3: Create New Tables
-- ============================================

-- Chat sessions table
CREATE TABLE IF NOT EXISTS public.chat_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  trip_id UUID REFERENCES public.trips(id) ON DELETE SET NULL,
  title TEXT,
  context JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_user ON public.chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_trip ON public.chat_sessions(trip_id);

-- Update chat_messages to reference sessions
ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS model TEXT DEFAULT 'gemini-1.5-flash',
  ADD COLUMN IF NOT EXISTS tokens_used INTEGER,
  ADD COLUMN IF NOT EXISTS intent TEXT,
  ADD COLUMN IF NOT EXISTS entities JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS actions JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Allow 'system' role
ALTER TABLE public.chat_messages DROP CONSTRAINT IF EXISTS chat_messages_role_check;
ALTER TABLE public.chat_messages ADD CONSTRAINT chat_messages_role_check 
  CHECK (role IN ('user', 'assistant', 'system'));

-- Places cache table with PostGIS
CREATE TABLE IF NOT EXISTS public.places_cache (
  place_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  formatted_address TEXT,
  location GEOGRAPHY(POINT, 4326),
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  place_types TEXT[],
  rating DECIMAL(2,1),
  user_ratings_total INTEGER,
  price_level INTEGER,
  photos JSONB,
  opening_hours JSONB,
  phone_number TEXT,
  website TEXT,
  reviews JSONB,
  google_data JSONB,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  cache_expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '30 days'
);

CREATE INDEX IF NOT EXISTS idx_places_cache_location ON public.places_cache USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_places_cache_expires ON public.places_cache(cache_expires_at);

-- Route segments table
CREATE TABLE IF NOT EXISTS public.route_segments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE,
  from_destination_id UUID REFERENCES public.destinations(id) ON DELETE CASCADE,
  to_destination_id UUID REFERENCES public.destinations(id) ON DELETE CASCADE,
  distance_meters INTEGER,
  duration_seconds INTEGER,
  route_geometry JSONB,
  recommendations TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_route_segments_trip ON public.route_segments(trip_id);

-- AI recommendations table
CREATE TABLE IF NOT EXISTS public.ai_recommendations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE,
  place_id TEXT REFERENCES public.places_cache(place_id),
  recommendation_type TEXT CHECK (recommendation_type IN (
    'destination', 'restaurant', 'activity', 'accommodation', 'route'
  )),
  score DECIMAL(3,2),
  reasoning TEXT,
  based_on JSONB DEFAULT '{}'::jsonb,
  user_action TEXT CHECK (user_action IN ('accepted', 'rejected', 'saved', 'ignored')),
  user_feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days'
);

CREATE INDEX IF NOT EXISTS idx_recommendations_user_trip ON public.ai_recommendations(user_id, trip_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_score ON public.ai_recommendations(score DESC);

-- User reviews table
CREATE TABLE IF NOT EXISTS public.user_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  place_id TEXT REFERENCES public.places_cache(place_id) NOT NULL,
  trip_id UUID REFERENCES public.trips(id) ON DELETE SET NULL,
  rating DECIMAL(2,1) NOT NULL CHECK (rating >= 0 AND rating <= 5),
  review_text TEXT,
  photos TEXT[] DEFAULT ARRAY[]::TEXT[],
  visit_date DATE,
  helpful_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, place_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_place ON public.user_reviews(place_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user ON public.user_reviews(user_id);

-- Saved places table
CREATE TABLE IF NOT EXISTS public.saved_places (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  place_id TEXT REFERENCES public.places_cache(place_id) NOT NULL,
  list_name TEXT DEFAULT 'favorites',
  notes TEXT,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, place_id, list_name)
);

CREATE INDEX IF NOT EXISTS idx_saved_places_user ON public.saved_places(user_id);

-- API usage logs table
CREATE TABLE IF NOT EXISTS public.api_usage_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID,
  api_type TEXT NOT NULL CHECK (api_type IN ('google_places', 'gemini')),
  endpoint TEXT,
  request_data JSONB,
  response_status INTEGER,
  tokens_used INTEGER,
  cost_estimate DECIMAL(10,6),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_logs_user ON public.api_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_api_logs_type ON public.api_usage_logs(api_type);
CREATE INDEX IF NOT EXISTS idx_api_logs_created ON public.api_usage_logs(created_at DESC);

-- Step 4: Enable RLS for New Tables
-- ============================================

ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_places ENABLE ROW LEVEL SECURITY;

-- Places cache is public read
ALTER TABLE public.places_cache DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_segments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_usage_logs DISABLE ROW LEVEL SECURITY;

-- Step 5: Create RLS Policies for New Tables
-- ============================================

-- Chat sessions policies
CREATE POLICY "Users can view own chat sessions" ON public.chat_sessions 
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own chat sessions" ON public.chat_sessions 
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own chat sessions" ON public.chat_sessions 
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own chat sessions" ON public.chat_sessions 
  FOR DELETE USING (auth.uid() = user_id);

-- Chat messages policies (update)
DROP POLICY IF EXISTS "Users can view messages of own trips" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can insert messages to own trips" ON public.chat_messages;

CREATE POLICY "Users can view own messages" ON public.chat_messages 
  FOR SELECT USING (
    session_id IN (SELECT id FROM public.chat_sessions WHERE user_id = auth.uid())
    OR trip_id IN (SELECT id FROM public.trips WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert own messages" ON public.chat_messages 
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND (
      session_id IN (SELECT id FROM public.chat_sessions WHERE user_id = auth.uid())
      OR trip_id IN (SELECT id FROM public.trips WHERE user_id = auth.uid())
    )
  );

-- AI recommendations policies
CREATE POLICY "Users can view own recommendations" ON public.ai_recommendations 
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own recommendations" ON public.ai_recommendations 
  FOR UPDATE USING (auth.uid() = user_id);

-- User reviews policies
CREATE POLICY "Users can view all reviews" ON public.user_reviews 
  FOR SELECT USING (true);
CREATE POLICY "Users can insert own reviews" ON public.user_reviews 
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own reviews" ON public.user_reviews 
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own reviews" ON public.user_reviews 
  FOR DELETE USING (auth.uid() = user_id);

-- Saved places policies
CREATE POLICY "Users can view own saved places" ON public.saved_places 
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own saved places" ON public.saved_places 
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own saved places" ON public.saved_places 
  FOR DELETE USING (auth.uid() = user_id);

-- Step 6: Create Database Trigger for Auto-Export
-- ============================================

CREATE OR REPLACE FUNCTION trigger_trip_update_export()
RETURNS TRIGGER AS $$
DECLARE
  v_trip_id UUID;
  v_supabase_url TEXT;
  v_service_key TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_trip_id := OLD.trip_id;
  ELSE
    v_trip_id := NEW.trip_id;
  END IF;

  IF v_trip_id IS NULL THEN
    RETURN NEW;
  END IF;

  BEGIN
    v_supabase_url := current_setting('app.supabase_url', true);
    v_service_key := current_setting('app.service_role_key', true);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Supabase settings not configured: %', SQLERRM;
    RETURN NEW;
  END;

  BEGIN
    PERFORM extensions.http_post(
      url := v_supabase_url || '/functions/v1/trip-update-export',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_service_key
      ),
      body := jsonb_build_object(
        'trip_id', v_trip_id,
        'trigger_type', TG_OP,
        'changed_at', NOW()
      )::text
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to call trip-update-export: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS on_destinations_change ON public.destinations;
CREATE TRIGGER on_destinations_change
  AFTER INSERT OR UPDATE OR DELETE ON public.destinations
  FOR EACH ROW
  EXECUTE FUNCTION trigger_trip_update_export();

-- Step 7: Create Helper Functions
-- ============================================

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
      THEN t.start_date || ' - ' || t.end_date
      ELSE 'Not set'
    END as date_range
  FROM public.destinations d
  RIGHT JOIN public.trips t ON d.trip_id = t.id
  WHERE t.id = p_trip_id
  GROUP BY t.id, t.start_date, t.end_date;
END;
$$ LANGUAGE plpgsql;

-- Find nearby places using PostGIS
CREATE OR REPLACE FUNCTION find_nearby_places(
  p_latitude DECIMAL,
  p_longitude DECIMAL,
  p_radius_meters INTEGER DEFAULT 1000,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  place_id TEXT,
  name TEXT,
  distance_meters DECIMAL,
  rating DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pc.place_id,
    pc.name,
    ST_Distance(
      pc.location,
      ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography
    )::DECIMAL as distance_meters,
    pc.rating
  FROM public.places_cache pc
  WHERE pc.location IS NOT NULL
    AND ST_DWithin(
      pc.location,
      ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography,
      p_radius_meters
    )
  ORDER BY distance_meters
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Step 8: Create Views
-- ============================================

CREATE OR REPLACE VIEW trips_with_routes AS
SELECT 
  t.id,
  t.user_id,
  t.title,
  t.description,
  t.start_date,
  t.end_date,
  t.status,
  t.export_url,
  t.total_distance,
  t.total_duration,
  t.route_data,
  t.last_exported_at,
  COUNT(d.id) as destination_count,
  json_agg(
    json_build_object(
      'id', d.id,
      'name', d.name,
      'latitude', d.latitude,
      'longitude', d.longitude,
      'order_index', d.order_index,
      'visit_date', d.visit_date,
      'rating', d.rating
    ) ORDER BY d.order_index
  ) FILTER (WHERE d.id IS NOT NULL) as destinations
FROM public.trips t
LEFT JOIN public.destinations d ON t.id = d.trip_id
GROUP BY t.id;

-- Step 9: Update Realtime Publications
-- ============================================

-- Add new tables to realtime
DO $$ 
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_sessions;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.route_segments;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- Step 10: Add Triggers
-- ============================================

-- Update chat_sessions updated_at trigger
CREATE TRIGGER update_chat_sessions_updated_at
  BEFORE UPDATE ON public.chat_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_reviews_updated_at
  BEFORE UPDATE ON public.user_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- Migration Complete!
-- ============================================

COMMENT ON TABLE public.places_cache IS 'Cache for Google Places API data to reduce API calls';
COMMENT ON TABLE public.route_segments IS 'Store route information between destinations';
COMMENT ON TABLE public.ai_recommendations IS 'AI-generated recommendations for users';
COMMENT ON TRIGGER on_destinations_change ON public.destinations IS 'Automatically triggers trip export when destinations change';
