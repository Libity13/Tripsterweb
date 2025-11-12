-- ============================================
-- 🧹 Clean Database - Remove All Tables and Dependencies
-- ============================================

-- 1. Drop all foreign key constraints first
ALTER TABLE IF EXISTS public.destinations DROP CONSTRAINT IF EXISTS destinations_trip_id_fkey;
ALTER TABLE IF EXISTS public.chat_messages DROP CONSTRAINT IF EXISTS chat_messages_trip_id_fkey;
ALTER TABLE IF EXISTS public.chat_sessions DROP CONSTRAINT IF EXISTS chat_sessions_trip_id_fkey;
ALTER TABLE IF EXISTS public.route_segments DROP CONSTRAINT IF EXISTS route_segments_trip_id_fkey;
ALTER TABLE IF EXISTS public.ai_recommendations DROP CONSTRAINT IF EXISTS ai_recommendations_trip_id_fkey;
ALTER TABLE IF EXISTS public.user_reviews DROP CONSTRAINT IF EXISTS user_reviews_trip_id_fkey;
ALTER TABLE IF EXISTS public.data_modification_logs DROP CONSTRAINT IF EXISTS data_modification_logs_trip_id_fkey;

-- 2. Drop all tables in reverse dependency order
DROP TABLE IF EXISTS public.data_modification_logs CASCADE;
DROP TABLE IF EXISTS public.ai_usage_analytics CASCADE;
DROP TABLE IF EXISTS public.ai_provider_configs CASCADE;
DROP TABLE IF EXISTS public.api_usage_logs CASCADE;
DROP TABLE IF EXISTS public.saved_places CASCADE;
DROP TABLE IF EXISTS public.user_reviews CASCADE;
DROP TABLE IF EXISTS public.ai_recommendations CASCADE;
DROP TABLE IF EXISTS public.route_segments CASCADE;
DROP TABLE IF EXISTS public.places_cache CASCADE;
DROP TABLE IF EXISTS public.chat_sessions CASCADE;
DROP TABLE IF EXISTS public.chat_messages CASCADE;
DROP TABLE IF EXISTS public.destinations CASCADE;
DROP TABLE IF EXISTS public.trips CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- 3. Drop all functions
DROP FUNCTION IF EXISTS public.get_user_ai_config(UUID);
DROP FUNCTION IF EXISTS public.log_ai_usage(UUID, UUID, TEXT, TEXT, INTEGER, DECIMAL, INTEGER, BOOLEAN, TEXT);
DROP FUNCTION IF EXISTS public.log_data_modification(UUID, UUID, UUID, TEXT, UUID, JSONB, JSONB, TEXT, BOOLEAN, TEXT);
DROP FUNCTION IF EXISTS public.update_updated_at_column();

-- 4. Drop all views
DROP VIEW IF EXISTS public.trips_with_routes;

-- 5. Drop all policies (if any remain)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own trips" ON public.trips;
DROP POLICY IF EXISTS "Users can insert own trips" ON public.trips;
DROP POLICY IF EXISTS "Users can update own trips" ON public.trips;
DROP POLICY IF EXISTS "Users can delete own trips" ON public.trips;
DROP POLICY IF EXISTS "Users can view destinations of own trips" ON public.destinations;
DROP POLICY IF EXISTS "Users can insert destinations to own trips" ON public.destinations;
DROP POLICY IF EXISTS "Users can update destinations of own trips" ON public.destinations;
DROP POLICY IF EXISTS "Users can delete destinations of own trips" ON public.destinations;
DROP POLICY IF EXISTS "Users can view messages of own trips" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can insert messages to own trips" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can view own chat sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "Users can insert own chat sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "Users can update own chat sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "Users can delete own chat sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "Public read places_cache" ON public.places_cache;
DROP POLICY IF EXISTS "Owner reads route_segments" ON public.route_segments;
DROP POLICY IF EXISTS "Users can view own recommendations" ON public.ai_recommendations;
DROP POLICY IF EXISTS "Users can insert own recommendations" ON public.ai_recommendations;
DROP POLICY IF EXISTS "Users can update own recommendations" ON public.ai_recommendations;
DROP POLICY IF EXISTS "Users can view all reviews" ON public.user_reviews;
DROP POLICY IF EXISTS "Users can insert own reviews" ON public.user_reviews;
DROP POLICY IF EXISTS "Users can update own reviews" ON public.user_reviews;
DROP POLICY IF EXISTS "Users can delete own reviews" ON public.user_reviews;
DROP POLICY IF EXISTS "Users can view own saved places" ON public.saved_places;
DROP POLICY IF EXISTS "Users can insert own saved places" ON public.saved_places;
DROP POLICY IF EXISTS "Users can delete own saved places" ON public.saved_places;
DROP POLICY IF EXISTS "Owner reads api_usage_logs" ON public.api_usage_logs;
DROP POLICY IF EXISTS "Users can view own AI provider configs" ON public.ai_provider_configs;
DROP POLICY IF EXISTS "Users can insert own AI provider configs" ON public.ai_provider_configs;
DROP POLICY IF EXISTS "Users can update own AI provider configs" ON public.ai_provider_configs;
DROP POLICY IF EXISTS "Users can delete own AI provider configs" ON public.ai_provider_configs;
DROP POLICY IF EXISTS "Users can view own AI usage analytics" ON public.ai_usage_analytics;
DROP POLICY IF EXISTS "Users can insert own AI usage analytics" ON public.ai_usage_analytics;
DROP POLICY IF EXISTS "Users can view own data modification logs" ON public.data_modification_logs;
DROP POLICY IF EXISTS "Users can insert own data modification logs" ON public.data_modification_logs;

-- ============================================
-- ✅ Database cleaned! Now you can run the migration
-- ============================================
