-- Completely Disable RLS for Development
-- ======================================

-- Disable RLS on all tables (only existing ones)
ALTER TABLE public.trips DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.destinations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.places_cache DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies
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
SELECT 'RLS completely disabled - All operations allowed' as status;
