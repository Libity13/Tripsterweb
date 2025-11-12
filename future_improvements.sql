-- ============================================
-- 🔮 Future Database Improvements
-- ============================================

-- 1. Add Foreign Key Constraints (Optional)
-- ============================================
-- Uncomment these when you want strict data integrity

-- ALTER TABLE public.trips 
-- ADD CONSTRAINT fk_trips_user_id 
-- FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) 
-- ON DELETE CASCADE;

-- ALTER TABLE public.chat_messages 
-- ADD CONSTRAINT fk_chat_messages_user_id 
-- FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) 
-- ON DELETE SET NULL;

-- 2. Add Indexes for Performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_trips_user_id ON public.trips(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON public.chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON public.chat_sessions(user_id);

-- 3. Add Data Validation Functions
-- ============================================
CREATE OR REPLACE FUNCTION public.validate_user_exists(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN EXISTS(SELECT 1 FROM public.profiles WHERE user_id = user_uuid);
END;
$$;

-- 4. Add Triggers for Data Integrity
-- ============================================
CREATE OR REPLACE FUNCTION public.check_user_exists()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only check if user_id is not null
  IF NEW.user_id IS NOT NULL THEN
    IF NOT public.validate_user_exists(NEW.user_id) THEN
      RAISE WARNING 'User % does not exist in profiles table', NEW.user_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Apply trigger to trips table
CREATE TRIGGER check_trips_user_exists
  BEFORE INSERT OR UPDATE ON public.trips
  FOR EACH ROW
  EXECUTE FUNCTION public.check_user_exists();

-- 5. Add Soft Delete Support
-- ============================================
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Add function to soft delete user
CREATE OR REPLACE FUNCTION public.soft_delete_user(user_uuid UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.profiles 
  SET deleted_at = now() 
  WHERE user_id = user_uuid;
  
  -- Optionally mark trips as archived
  UPDATE public.trips 
  SET status = 'archived' 
  WHERE user_id = user_uuid;
END;
$$;

-- 6. Add Data Cleanup Function
-- ============================================
CREATE OR REPLACE FUNCTION public.cleanup_orphaned_data()
RETURNS TABLE(
  table_name TEXT,
  orphaned_count BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'trips'::TEXT,
    COUNT(*)::BIGINT
  FROM public.trips t
  LEFT JOIN public.profiles p ON t.user_id = p.user_id
  WHERE p.user_id IS NULL
  
  UNION ALL
  
  SELECT 
    'chat_messages'::TEXT,
    COUNT(*)::BIGINT
  FROM public.chat_messages cm
  LEFT JOIN public.profiles p ON cm.user_id = p.user_id
  WHERE cm.user_id IS NOT NULL AND p.user_id IS NULL;
END;
$$;

-- 7. Add Monitoring Views
-- ============================================
CREATE OR REPLACE VIEW public.data_integrity_report AS
SELECT 
  'trips_without_users' as issue,
  COUNT(*) as count
FROM public.trips t
LEFT JOIN public.profiles p ON t.user_id = p.user_id
WHERE p.user_id IS NULL

UNION ALL

SELECT 
  'chat_messages_without_users' as issue,
  COUNT(*) as count
FROM public.chat_messages cm
LEFT JOIN public.profiles p ON cm.user_id = p.user_id
WHERE cm.user_id IS NOT NULL AND p.user_id IS NULL;

-- ============================================
-- 🎯 Usage Examples
-- ============================================

-- Check for orphaned data
-- SELECT * FROM public.cleanup_orphaned_data();

-- Check data integrity
-- SELECT * FROM public.data_integrity_report;

-- Soft delete a user
-- SELECT public.soft_delete_user('user-uuid-here');

-- Validate user exists before creating trip
-- SELECT public.validate_user_exists('user-uuid-here');
