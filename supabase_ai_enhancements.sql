-- AI Configuration Enhancements for Supabase
-- ===========================================

-- 1. AI Provider Configuration Table
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
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, provider)
);

-- Indexes for AI provider configs
CREATE INDEX IF NOT EXISTS idx_ai_provider_configs_user ON public.ai_provider_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_provider_configs_provider ON public.ai_provider_configs(provider);
CREATE INDEX IF NOT EXISTS idx_ai_provider_configs_active ON public.ai_provider_configs(user_id, is_active);

-- 2. AI Usage Analytics Table
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
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for AI usage analytics
CREATE INDEX IF NOT EXISTS idx_ai_usage_user ON public.ai_usage_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_provider ON public.ai_usage_analytics(provider);
CREATE INDEX IF NOT EXISTS idx_ai_usage_created ON public.ai_usage_analytics(created_at DESC);

-- 3. Data Modification Logs Table
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
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for data modification logs
CREATE INDEX IF NOT EXISTS idx_data_mod_logs_user ON public.data_modification_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_data_mod_logs_trip ON public.data_modification_logs(trip_id);
CREATE INDEX IF NOT EXISTS idx_data_mod_logs_type ON public.data_modification_logs(modification_type);
CREATE INDEX IF NOT EXISTS idx_data_mod_logs_created ON public.data_modification_logs(created_at DESC);

-- 4. Update chat_messages table for better AI tracking
ALTER TABLE public.chat_messages 
  ADD COLUMN IF NOT EXISTS ai_provider TEXT,
  ADD COLUMN IF NOT EXISTS ai_model TEXT,
  ADD COLUMN IF NOT EXISTS tokens_used INTEGER,
  ADD COLUMN IF NOT EXISTS cost_estimate DECIMAL(10,6),
  ADD COLUMN IF NOT EXISTS response_time_ms INTEGER,
  ADD COLUMN IF NOT EXISTS modification_type TEXT,
  ADD COLUMN IF NOT EXISTS modification_data JSONB;

-- 5. Update destinations table for better tracking
ALTER TABLE public.destinations
  ADD COLUMN IF NOT EXISTS estimated_cost DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS visit_duration DECIMAL(5,2) DEFAULT 2.0,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS photos JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS rating DECIMAL(2,1),
  ADD COLUMN IF NOT EXISTS user_rating DECIMAL(2,1),
  ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_by_ai BOOLEAN DEFAULT false;

-- 6. Enable RLS for new tables
ALTER TABLE public.ai_provider_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_modification_logs ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies for AI Provider Configs
CREATE POLICY "Users can view own AI provider configs" ON public.ai_provider_configs 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own AI provider configs" ON public.ai_provider_configs 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own AI provider configs" ON public.ai_provider_configs 
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own AI provider configs" ON public.ai_provider_configs 
  FOR DELETE USING (auth.uid() = user_id);

-- 8. RLS Policies for AI Usage Analytics
CREATE POLICY "Users can view own AI usage analytics" ON public.ai_usage_analytics 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own AI usage analytics" ON public.ai_usage_analytics 
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- 9. RLS Policies for Data Modification Logs
CREATE POLICY "Users can view own data modification logs" ON public.data_modification_logs 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own data modification logs" ON public.data_modification_logs 
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- 10. Update API usage logs to support new AI providers
ALTER TABLE public.api_usage_logs 
  DROP CONSTRAINT IF EXISTS api_usage_logs_api_type_check;

ALTER TABLE public.api_usage_logs 
  ADD CONSTRAINT api_usage_logs_api_type_check 
  CHECK (api_type IN ('google_places', 'openai', 'gemini', 'claude', 'mock'));

-- 11. Add updated_at triggers
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_ai_provider_configs_updated_at
  BEFORE UPDATE ON public.ai_provider_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 12. Create helper functions for AI operations
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

-- 13. Create function to log AI usage
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

-- 14. Create function to log data modifications
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

-- 15. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;
