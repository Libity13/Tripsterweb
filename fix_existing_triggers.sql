-- Fix Existing Triggers Error
-- ===========================

-- 1. Drop existing triggers first
-- ===============================

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS update_trips_updated_at ON public.trips;
DROP TRIGGER IF EXISTS update_destinations_updated_at ON public.destinations;
DROP TRIGGER IF EXISTS update_chat_sessions_updated_at ON public.chat_sessions;
DROP TRIGGER IF EXISTS update_user_reviews_updated_at ON public.user_reviews;
DROP TRIGGER IF EXISTS update_saved_places_updated_at ON public.saved_places;
DROP TRIGGER IF EXISTS update_ai_recommendations_updated_at ON public.ai_recommendations;
DROP TRIGGER IF EXISTS update_ai_provider_configs_updated_at ON public.ai_provider_configs;

-- 2. Create updated_at trigger function (if not exists)
-- ====================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- 3. Create triggers with IF NOT EXISTS equivalent
-- ===============================================

-- Profiles trigger
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_profiles_updated_at' 
        AND tgrelid = 'public.profiles'::regclass
    ) THEN
        CREATE TRIGGER update_profiles_updated_at
          BEFORE UPDATE ON public.profiles
          FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END $$;

-- Trips trigger
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_trips_updated_at' 
        AND tgrelid = 'public.trips'::regclass
    ) THEN
        CREATE TRIGGER update_trips_updated_at
          BEFORE UPDATE ON public.trips
          FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END $$;

-- Destinations trigger
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_destinations_updated_at' 
        AND tgrelid = 'public.destinations'::regclass
    ) THEN
        CREATE TRIGGER update_destinations_updated_at
          BEFORE UPDATE ON public.destinations
          FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END $$;

-- 4. Verify triggers exist
-- ========================

SELECT 
    schemaname,
    tablename,
    triggername,
    triggerdef
FROM pg_triggers 
WHERE schemaname = 'public'
AND triggername LIKE 'update_%_updated_at'
ORDER BY tablename, triggername;
