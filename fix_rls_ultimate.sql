-- Ultimate RLS Fix - Force disable RLS
-- ====================================

-- Force disable RLS on all tables
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
DROP POLICY IF EXISTS "Allow all profiles operations" ON public.profiles;

-- Grant all permissions to authenticated users
GRANT ALL ON public.trips TO authenticated;
GRANT ALL ON public.destinations TO authenticated;
GRANT ALL ON public.chat_messages TO authenticated;
GRANT ALL ON public.places_cache TO authenticated;
GRANT ALL ON public.profiles TO authenticated;

-- Grant all permissions to anon users
GRANT ALL ON public.trips TO anon;
GRANT ALL ON public.destinations TO anon;
GRANT ALL ON public.chat_messages TO anon;
GRANT ALL ON public.places_cache TO anon;
GRANT ALL ON public.profiles TO anon;

-- Verify RLS is disabled
SELECT 
  schemaname, 
  tablename, 
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- Test message
SELECT 'RLS completely disabled with full permissions - All operations allowed' as status;
