-- ============================================
-- 🚀 TravelMate AI - Complete Supabase Migration
-- WITHOUT PostGIS dependencies (Free tier compatible)
-- ============================================

-- ============================================
-- STEP 0: Prerequisites
-- ============================================
-- UUID generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Generic updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- ============================================
-- STEP 1: Core Tables
-- ============================================

-- 1.1 profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  display_name TEXT,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  preferences JSONB DEFAULT '{
    "language": "th",
    "currency": "THB",
    "timezone": "Asia/Bangkok",
    "preferred_activities": [],
    "dietary_restrictions": [],
    "accessibility_needs": [],
    "ui_language": "th",
    "date_format": "DD/MM/YYYY",
    "number_format": "th-TH"
  }'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 1.2 trips
CREATE TABLE IF NOT EXISTS public.trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  title_en TEXT,
  description TEXT,
  description_en TEXT,
  start_date DATE,
  end_date DATE,
  budget_max NUMERIC(10,2),
  status TEXT DEFAULT 'planning',
  budget_min NUMERIC(10,2),
  currency TEXT DEFAULT 'THB',
  cover_image_url TEXT,
  is_public BOOLEAN DEFAULT false,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  tags_en TEXT[] DEFAULT ARRAY[]::TEXT[],
  metadata JSONB DEFAULT '{}'::jsonb,
  route_data JSONB,
  total_distance NUMERIC(10,2),
  total_duration INTEGER,
  language TEXT DEFAULT 'th',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 1.3 destinations (WITHOUT PostGIS geography)
CREATE TABLE IF NOT EXISTS public.destinations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_en TEXT,
  description TEXT,
  description_en TEXT,
  order_index INTEGER NOT NULL,
  latitude NUMERIC(10,8),
  longitude NUMERIC(11,8),
  duration_minutes INTEGER,
  notes TEXT,
  notes_en TEXT,
  place_id TEXT,
  formatted_address TEXT,
  place_types TEXT[] DEFAULT ARRAY[]::TEXT[],
  rating NUMERIC(3,2),
  user_ratings_total INTEGER,
  price_level INTEGER,
  photos JSONB DEFAULT '[]'::jsonb,
  opening_hours JSONB,
  phone_number TEXT,
  website TEXT,
  visit_date DATE,
  visit_time TIME,
  estimated_cost NUMERIC(10,2),
  recommended_by_ai BOOLEAN DEFAULT false,
  ai_reason TEXT,
  ai_reason_en TEXT,
  is_favorite BOOLEAN DEFAULT false,
  is_visited BOOLEAN DEFAULT false,
  user_rating NUMERIC(3,2),
  language TEXT DEFAULT 'th',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 1.4 chat_messages
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  content_en TEXT,
  session_id UUID,
  model TEXT DEFAULT 'gemini-1.5-flash',
  tokens_used INTEGER,
  intent TEXT,
  entities JSONB DEFAULT '{}'::jsonb,
  actions JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  language TEXT DEFAULT 'th',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- STEP 2: Feature Tables
-- ============================================

-- 2.1 chat_sessions
CREATE TABLE IF NOT EXISTS public.chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  trip_id UUID REFERENCES public.trips(id) ON DELETE SET NULL,
  title TEXT,
  title_en TEXT,
  context JSONB DEFAULT '{}'::jsonb,
  language TEXT DEFAULT 'th',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2.2 places_cache (WITHOUT PostGIS)
CREATE TABLE IF NOT EXISTS public.places_cache (
  place_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  name_en TEXT,
  formatted_address TEXT,
  latitude NUMERIC(10,8),
  longitude NUMERIC(11,8),
  place_types TEXT[],
  rating NUMERIC(3,2),
  user_ratings_total INTEGER,
  price_level INTEGER,
  photos JSONB,
  opening_hours JSONB,
  phone_number TEXT,
  website TEXT,
  reviews JSONB,
  google_data JSONB,
  last_updated TIMESTAMPTZ DEFAULT now(),
  cache_expires_at TIMESTAMPTZ DEFAULT now() + INTERVAL '30 days'
);

-- 2.3 route_segments
CREATE TABLE IF NOT EXISTS public.route_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE,
  from_destination_id UUID REFERENCES public.destinations(id) ON DELETE CASCADE,
  to_destination_id UUID REFERENCES public.destinations(id) ON DELETE CASCADE,
  distance_meters INTEGER,
  duration_seconds INTEGER,
  route_geometry JSONB,
  recommendations TEXT[],
  recommendations_en TEXT[],
  language TEXT DEFAULT 'th',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2.4 ai_recommendations
CREATE TABLE IF NOT EXISTS public.ai_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE,
  place_id TEXT REFERENCES public.places_cache(place_id),
  recommendation_type TEXT,
  score NUMERIC(3,2),
  reasoning TEXT,
  reasoning_en TEXT,
  based_on JSONB DEFAULT '{}'::jsonb,
  user_action TEXT,
  user_feedback TEXT,
  user_feedback_en TEXT,
  language TEXT DEFAULT 'th',
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT now() + INTERVAL '7 days',
  CONSTRAINT ai_recommendations_type_check 
    CHECK (recommendation_type IN ('destination', 'restaurant', 'activity', 'accommodation', 'route')),
  CONSTRAINT ai_recommendations_action_check 
    CHECK (user_action IN ('accepted', 'rejected', 'saved', 'ignored') OR user_action IS NULL)
);

-- 2.5 user_reviews
CREATE TABLE IF NOT EXISTS public.user_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  place_id TEXT REFERENCES public.places_cache(place_id) NOT NULL,
  trip_id UUID REFERENCES public.trips(id) ON DELETE SET NULL,
  rating NUMERIC(3,2) NOT NULL CHECK (rating >= 0 AND rating <= 5),
  review_text TEXT,
  review_text_en TEXT,
  photos TEXT[] DEFAULT ARRAY[]::TEXT[],
  visit_date DATE,
  helpful_count INTEGER DEFAULT 0,
  language TEXT DEFAULT 'th',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, place_id)
);

-- 2.6 saved_places
CREATE TABLE IF NOT EXISTS public.saved_places (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  place_id TEXT REFERENCES public.places_cache(place_id) NOT NULL,
  list_name TEXT DEFAULT 'favorites',
  list_name_en TEXT DEFAULT 'favorites',
  notes TEXT,
  notes_en TEXT,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  tags_en TEXT[] DEFAULT ARRAY[]::TEXT[],
  language TEXT DEFAULT 'th',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, place_id, list_name)
);

-- 2.7 api_usage_logs
CREATE TABLE IF NOT EXISTS public.api_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  api_type TEXT NOT NULL CHECK (api_type IN ('google_places', 'openai', 'gemini', 'claude', 'mock')),
  endpoint TEXT,
  request_data JSONB,
  response_status INTEGER,
  tokens_used INTEGER,
  cost_estimate NUMERIC(10,6),
  language TEXT DEFAULT 'th',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- STEP 3: AI Provider Tables
-- ============================================

-- 3.1 ai_provider_configs
CREATE TABLE IF NOT EXISTS public.ai_provider_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('openai', 'gemini', 'claude', 'mock')),
  model TEXT NOT NULL,
  api_key TEXT, -- Encrypted in production
  temperature DECIMAL(3,2) DEFAULT 0.7,
  max_tokens INTEGER DEFAULT 1000,
  system_prompt TEXT,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, provider)
);

-- 3.2 ai_usage_analytics
CREATE TABLE IF NOT EXISTS public.ai_usage_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  session_id UUID REFERENCES public.chat_sessions(id) ON DELETE SET NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  tokens_used INTEGER,
  cost_estimate DECIMAL(10,6),
  response_time_ms INTEGER,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3.3 data_modification_logs
CREATE TABLE IF NOT EXISTS public.data_modification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.chat_sessions(id) ON DELETE SET NULL,
  modification_type TEXT NOT NULL CHECK (modification_type IN ('add_destination', 'remove_destination', 'update_destination', 'reorder_destinations', 'update_trip_info')),
  target_id UUID, -- ID of the modified record
  old_data JSONB,
  new_data JSONB,
  chat_message TEXT, -- Original chat message that triggered the modification
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- STEP 4: Indexes
-- ============================================

-- Core table indexes
CREATE INDEX IF NOT EXISTS idx_trips_user_id ON public.trips(user_id);
CREATE INDEX IF NOT EXISTS idx_trips_language ON public.trips(language);
CREATE INDEX IF NOT EXISTS idx_destinations_trip_id ON public.destinations(trip_id);
CREATE INDEX IF NOT EXISTS idx_destinations_order ON public.destinations(trip_id, order_index);
CREATE INDEX IF NOT EXISTS idx_destinations_place_id ON public.destinations(place_id);
CREATE INDEX IF NOT EXISTS idx_destinations_visit_date ON public.destinations(visit_date);
CREATE INDEX IF NOT EXISTS idx_destinations_rating ON public.destinations(rating);
CREATE INDEX IF NOT EXISTS idx_destinations_language ON public.destinations(language);
CREATE INDEX IF NOT EXISTS idx_chat_messages_trip_id ON public.chat_messages(trip_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages(trip_id, created_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_language ON public.chat_messages(language);

-- Feature table indexes
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user ON public.chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_trip ON public.chat_sessions(trip_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_language ON public.chat_sessions(language);
CREATE INDEX IF NOT EXISTS idx_places_cache_expires ON public.places_cache(cache_expires_at);
CREATE INDEX IF NOT EXISTS idx_route_segments_trip ON public.route_segments(trip_id);
CREATE INDEX IF NOT EXISTS idx_route_segments_language ON public.route_segments(language);
CREATE INDEX IF NOT EXISTS idx_recommendations_user_trip ON public.ai_recommendations(user_id, trip_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_score ON public.ai_recommendations(score DESC);
CREATE INDEX IF NOT EXISTS idx_recommendations_language ON public.ai_recommendations(language);
CREATE INDEX IF NOT EXISTS idx_reviews_place ON public.user_reviews(place_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user ON public.user_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_language ON public.user_reviews(language);
CREATE INDEX IF NOT EXISTS idx_saved_places_user ON public.saved_places(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_places_language ON public.saved_places(language);
CREATE INDEX IF NOT EXISTS idx_api_logs_user ON public.api_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_api_logs_type ON public.api_usage_logs(api_type);
CREATE INDEX IF NOT EXISTS idx_api_logs_created ON public.api_usage_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_logs_language ON public.api_usage_logs(language);

-- AI provider indexes
CREATE INDEX IF NOT EXISTS idx_ai_provider_configs_user ON public.ai_provider_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_provider_configs_provider ON public.ai_provider_configs(provider);
CREATE INDEX IF NOT EXISTS idx_ai_provider_configs_active ON public.ai_provider_configs(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_ai_usage_user ON public.ai_usage_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_provider ON public.ai_usage_analytics(provider);
CREATE INDEX IF NOT EXISTS idx_ai_usage_created ON public.ai_usage_analytics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_data_mod_logs_user ON public.data_modification_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_data_mod_logs_trip ON public.data_modification_logs(trip_id);
CREATE INDEX IF NOT EXISTS idx_data_mod_logs_type ON public.data_modification_logs(modification_type);
CREATE INDEX IF NOT EXISTS idx_data_mod_logs_created ON public.data_modification_logs(created_at DESC);

-- ============================================
-- STEP 5: Enable Row Level Security
-- ============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.places_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_places ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_provider_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_modification_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 6: RLS Policies
-- ============================================

-- Core table policies
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own trips" ON public.trips FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own trips" ON public.trips FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own trips" ON public.trips FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own trips" ON public.trips FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view destinations of own trips" ON public.destinations FOR SELECT
USING (EXISTS (SELECT 1 FROM public.trips t WHERE t.id = destinations.trip_id AND t.user_id = auth.uid()));
CREATE POLICY "Users can insert destinations to own trips" ON public.destinations FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM public.trips t WHERE t.id = destinations.trip_id AND t.user_id = auth.uid()));
CREATE POLICY "Users can update destinations of own trips" ON public.destinations FOR UPDATE
USING (EXISTS (SELECT 1 FROM public.trips t WHERE t.id = destinations.trip_id AND t.user_id = auth.uid()));
CREATE POLICY "Users can delete destinations of own trips" ON public.destinations FOR DELETE
USING (EXISTS (SELECT 1 FROM public.trips t WHERE t.id = destinations.trip_id AND t.user_id = auth.uid()));

CREATE POLICY "Users can view messages of own trips" ON public.chat_messages FOR SELECT
USING (EXISTS (SELECT 1 FROM public.trips t WHERE t.id = chat_messages.trip_id AND t.user_id = auth.uid()));
CREATE POLICY "Users can insert messages to own trips" ON public.chat_messages FOR INSERT
WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.trips t WHERE t.id = chat_messages.trip_id AND t.user_id = auth.uid()));

-- Feature table policies
CREATE POLICY "Users can view own chat sessions" ON public.chat_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own chat sessions" ON public.chat_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own chat sessions" ON public.chat_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own chat sessions" ON public.chat_sessions FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Public read places_cache" ON public.places_cache FOR SELECT USING (true);

CREATE POLICY "Owner reads route_segments" ON public.route_segments FOR SELECT
USING (EXISTS (SELECT 1 FROM public.trips t WHERE t.id = route_segments.trip_id AND t.user_id = auth.uid()));

CREATE POLICY "Users can view own recommendations" ON public.ai_recommendations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own recommendations" ON public.ai_recommendations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own recommendations" ON public.ai_recommendations FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view all reviews" ON public.user_reviews FOR SELECT USING (true);
CREATE POLICY "Users can insert own reviews" ON public.user_reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own reviews" ON public.user_reviews FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own reviews" ON public.user_reviews FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own saved places" ON public.saved_places FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own saved places" ON public.saved_places FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own saved places" ON public.saved_places FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Owner reads api_usage_logs" ON public.api_usage_logs FOR SELECT USING (auth.uid() = user_id);

-- AI provider policies
CREATE POLICY "Users can view own AI provider configs" ON public.ai_provider_configs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own AI provider configs" ON public.ai_provider_configs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own AI provider configs" ON public.ai_provider_configs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own AI provider configs" ON public.ai_provider_configs FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own AI usage analytics" ON public.ai_usage_analytics FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own AI usage analytics" ON public.ai_usage_analytics FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can view own data modification logs" ON public.data_modification_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own data modification logs" ON public.data_modification_logs FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- ============================================
-- STEP 7: Triggers
-- ============================================
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_trips_updated_at
  BEFORE UPDATE ON public.trips
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_destinations_updated_at
  BEFORE UPDATE ON public.destinations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_chat_sessions_updated_at
  BEFORE UPDATE ON public.chat_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_reviews_updated_at
  BEFORE UPDATE ON public.user_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_saved_places_updated_at
  BEFORE UPDATE ON public.saved_places
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ai_recommendations_updated_at
  BEFORE UPDATE ON public.ai_recommendations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ai_provider_configs_updated_at
  BEFORE UPDATE ON public.ai_provider_configs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- STEP 8: Views
-- ============================================
CREATE OR REPLACE VIEW trips_with_routes AS
SELECT 
  t.id,
  t.user_id,
  t.title,
  t.title_en,
  t.description,
  t.description_en,
  t.start_date,
  t.end_date,
  t.status,
  t.total_distance,
  t.total_duration,
  t.route_data,
  t.language,
  COUNT(d.id) AS destination_count,
  json_agg(
    json_build_object(
      'id', d.id,
      'name', d.name,
      'name_en', d.name_en,
      'latitude', d.latitude,
      'longitude', d.longitude,
      'order_index', d.order_index,
      'visit_date', d.visit_date,
      'rating', d.rating,
      'language', d.language
    ) ORDER BY d.order_index
  ) FILTER (WHERE d.id IS NOT NULL) AS destinations
FROM public.trips t
LEFT JOIN public.destinations d ON t.id = d.trip_id
GROUP BY t.id;

-- ============================================
-- STEP 9: Helper Functions
-- ============================================

-- Get user's active AI configuration
CREATE OR REPLACE FUNCTION public.get_user_ai_config(user_uuid UUID)
RETURNS TABLE (
  provider TEXT,
  model TEXT,
  temperature DECIMAL,
  max_tokens INTEGER,
  system_prompt TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    apc.provider,
    apc.model,
    apc.temperature,
    apc.max_tokens,
    apc.system_prompt
  FROM public.ai_provider_configs apc
  WHERE apc.user_id = user_uuid 
    AND apc.is_active = true
  ORDER BY apc.updated_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Log AI usage
CREATE OR REPLACE FUNCTION public.log_ai_usage(
  p_user_id UUID,
  p_session_id UUID,
  p_provider TEXT,
  p_model TEXT,
  p_tokens_used INTEGER,
  p_cost_estimate DECIMAL,
  p_response_time_ms INTEGER,
  p_success BOOLEAN,
  p_error_message TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO public.ai_usage_analytics (
    user_id, session_id, provider, model, tokens_used, 
    cost_estimate, response_time_ms, success, error_message
  ) VALUES (
    p_user_id, p_session_id, p_provider, p_model, p_tokens_used,
    p_cost_estimate, p_response_time_ms, p_success, p_error_message
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Log data modifications
CREATE OR REPLACE FUNCTION public.log_data_modification(
  p_user_id UUID,
  p_trip_id UUID,
  p_session_id UUID,
  p_modification_type TEXT,
  p_target_id UUID,
  p_old_data JSONB,
  p_new_data JSONB,
  p_chat_message TEXT,
  p_success BOOLEAN,
  p_error_message TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO public.data_modification_logs (
    user_id, trip_id, session_id, modification_type, target_id,
    old_data, new_data, chat_message, success, error_message
  ) VALUES (
    p_user_id, p_trip_id, p_session_id, p_modification_type, p_target_id,
    p_old_data, p_new_data, p_chat_message, p_success, p_error_message
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 10: Realtime
-- ============================================
DO $$ 
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.trips;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.destinations;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_sessions;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_provider_configs;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_usage_analytics;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.data_modification_logs;
EXCEPTION 
  WHEN duplicate_object THEN
    NULL;
  WHEN OTHERS THEN
    NULL;
END $$;

-- ============================================
-- STEP 11: Comments
-- ============================================
COMMENT ON TABLE public.profiles IS 'User profiles with preferences and settings (Thai/English support)';
COMMENT ON TABLE public.trips IS 'User trips with metadata and route information (Thai/English support)';
COMMENT ON TABLE public.destinations IS 'Trip destinations with location data (Thai/English support)';
COMMENT ON TABLE public.chat_messages IS 'AI chat messages for trip planning (Thai/English support)';
COMMENT ON TABLE public.places_cache IS 'Cache for Google Places API data to reduce API costs (30 days)';
COMMENT ON TABLE public.route_segments IS 'Store route information between destinations with AI recommendations (Thai/English support)';
COMMENT ON TABLE public.ai_recommendations IS 'AI-generated recommendations for users with expiry (7 days) (Thai/English support)';
COMMENT ON TABLE public.user_reviews IS 'User reviews and ratings for places (Thai/English support)';
COMMENT ON TABLE public.saved_places IS 'User saved places (favorites, wishlist, want-to-go) (Thai/English support)';
COMMENT ON TABLE public.api_usage_logs IS 'Track API usage for monitoring and cost optimization';
COMMENT ON TABLE public.ai_provider_configs IS 'User AI provider configurations (OpenAI, Gemini, Claude, Mock)';
COMMENT ON TABLE public.ai_usage_analytics IS 'AI usage tracking for cost monitoring and optimization';
COMMENT ON TABLE public.data_modification_logs IS 'Log of data modifications made through chat commands';
COMMENT ON FUNCTION public.get_user_ai_config(UUID) IS 'Get active AI configuration for a user';
COMMENT ON FUNCTION public.log_ai_usage(UUID, UUID, TEXT, TEXT, INTEGER, DECIMAL, INTEGER, BOOLEAN, TEXT) IS 'Log AI API usage for analytics';
COMMENT ON FUNCTION public.log_data_modification(UUID, UUID, UUID, TEXT, UUID, JSONB, JSONB, TEXT, BOOLEAN, TEXT) IS 'Log data modifications made through chat';

-- ============================================
-- ✅ Complete Migration Ready!
-- ============================================
