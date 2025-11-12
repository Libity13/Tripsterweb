-- Safe RLS Disable - Only for existing tables
-- ============================================

-- Disable RLS on core tables (only if they exist)
DO $$
BEGIN
    -- Disable RLS on trips table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'trips') THEN
        ALTER TABLE public.trips DISABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'Disabled RLS on trips table';
    END IF;
    
    -- Disable RLS on destinations table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'destinations') THEN
        ALTER TABLE public.destinations DISABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'Disabled RLS on destinations table';
    END IF;
    
    -- Disable RLS on chat_messages table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'chat_messages') THEN
        ALTER TABLE public.chat_messages DISABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'Disabled RLS on chat_messages table';
    END IF;
    
    -- Disable RLS on places_cache table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'places_cache') THEN
        ALTER TABLE public.places_cache DISABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'Disabled RLS on places_cache table';
    END IF;
    
    -- Disable RLS on profiles table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
        ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'Disabled RLS on profiles table';
    END IF;
END $$;

-- Drop ALL existing policies (only if they exist)
DROP POLICY IF EXISTS "Allow all trips operations" ON public.trips;
DROP POLICY IF EXISTS "Allow all destinations operations" ON public.destinations;
DROP POLICY IF EXISTS "Allow all chat messages operations" ON public.chat_messages;
DROP POLICY IF EXISTS "Allow all places cache operations" ON public.places_cache;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- Verify RLS is disabled
SELECT 
  schemaname, 
  tablename, 
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- Test message
SELECT 'RLS safely disabled - All operations allowed' as status;
