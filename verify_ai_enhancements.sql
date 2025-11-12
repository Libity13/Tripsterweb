-- ============================================
-- 🔍 Verify AI Enhancements Deployment
-- ============================================

-- 1. Check if new tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('ai_provider_configs', 'ai_usage_analytics', 'data_modification_logs')
ORDER BY table_name;

-- 2. Check if new columns were added to existing tables
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'chat_messages' 
  AND column_name IN ('ai_provider', 'ai_model', 'tokens_used', 'cost_estimate', 'response_time_ms', 'modification_type', 'modification_data');

-- 3. Check if new columns were added to destinations table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'destinations' 
  AND column_name IN ('estimated_cost', 'visit_duration', 'notes', 'tags', 'photos', 'rating', 'user_rating', 'is_favorite', 'created_by_ai');

-- 4. Check if functions exist
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN ('get_user_ai_config', 'log_ai_usage', 'log_data_modification');

-- 5. Check RLS policies for new tables
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('ai_provider_configs', 'ai_usage_analytics', 'data_modification_logs');

-- 6. Test insert into ai_provider_configs (should work)
INSERT INTO public.ai_provider_configs (user_id, provider, model, is_active) 
VALUES ('00000000-0000-0000-0000-000000000000', 'mock', 'mock-ai', true)
ON CONFLICT (user_id, provider) DO NOTHING;

-- 7. Test the get_user_ai_config function
SELECT * FROM public.get_user_ai_config('00000000-0000-0000-0000-000000000000');

-- 8. Clean up test data
DELETE FROM public.ai_provider_configs WHERE user_id = '00000000-0000-0000-0000-000000000000';

-- ============================================
-- ✅ If all queries return results, deployment was successful!
-- ============================================
