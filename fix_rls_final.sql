-- Final RLS Fix - Disable RLS temporarily for development
-- ========================================================

-- Disable RLS on all tables temporarily
ALTER TABLE public.trips DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.destinations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.places_cache DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Allow all trips operations" ON public.trips;
DROP POLICY IF EXISTS "Allow all destinations operations" ON public.destinations;
DROP POLICY IF EXISTS "Allow all chat messages operations" ON public.chat_messages;
DROP POLICY IF EXISTS "Allow all places cache operations" ON public.places_cache;

-- Test the setup
SELECT 'RLS disabled successfully - All operations allowed' as status;
