-- ============================================
-- 🔍 Verify Database Setup
-- ============================================

-- 1. Check if all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'profiles', 'trips', 'destinations', 'chat_messages',
    'chat_sessions', 'places_cache', 'ai_recommendations',
    'user_reviews', 'saved_places', 'api_usage_logs',
    'ai_provider_configs', 'ai_usage_analytics', 'data_modification_logs'
  )
ORDER BY table_name;

-- 2. Check if functions exist
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN (
    'get_user_ai_config', 'log_ai_usage', 'log_data_modification'
  );

-- 3. Test insert into profiles (should work)
INSERT INTO public.profiles (user_id, display_name, email) 
VALUES ('00000000-0000-0000-0000-000000000000', 'Test User', 'test@example.com')
ON CONFLICT (user_id) DO NOTHING;

-- 4. Test insert into trips (should work)
INSERT INTO public.trips (user_id, title, description) 
VALUES ('00000000-0000-0000-0000-000000000000', 'Test Trip', 'Test Description')
ON CONFLICT DO NOTHING;

-- 5. Test insert into chat_messages (should work)
INSERT INTO public.chat_messages (trip_id, user_id, role, content, language) 
VALUES (
  (SELECT id FROM public.trips WHERE user_id = '00000000-0000-0000-0000-000000000000' LIMIT 1),
  '00000000-0000-0000-0000-000000000000',
  'user',
  'Test message',
  'th'
);

-- 6. Test AI provider configs (should work)
INSERT INTO public.ai_provider_configs (user_id, provider, model, is_active) 
VALUES ('00000000-0000-0000-0000-000000000000', 'openai', 'gpt-4o-mini', true)
ON CONFLICT (user_id, provider) DO NOTHING;

-- 7. Test the get_user_ai_config function
SELECT * FROM public.get_user_ai_config('00000000-0000-0000-0000-000000000000');

-- 8. Clean up test data
DELETE FROM public.chat_messages WHERE user_id = '00000000-0000-0000-0000-000000000000';
DELETE FROM public.trips WHERE user_id = '00000000-0000-0000-0000-000000000000';
DELETE FROM public.profiles WHERE user_id = '00000000-0000-0000-0000-000000000000';
DELETE FROM public.ai_provider_configs WHERE user_id = '00000000-0000-0000-0000-000000000000';

-- ============================================
-- ✅ If all queries return results, database is ready!
-- ============================================
