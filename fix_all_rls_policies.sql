-- Fix ALL RLS Policies for anonymous users
-- ========================================

-- 1. Fix chat_messages table
DROP POLICY IF EXISTS "Allow anonymous users to insert chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Allow anonymous users to view chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Allow anonymous users to update chat messages" ON public.chat_messages;

CREATE POLICY "Allow anonymous users to insert chat messages" ON public.chat_messages
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anonymous users to view chat messages" ON public.chat_messages
    FOR SELECT USING (true);

CREATE POLICY "Allow anonymous users to update chat messages" ON public.chat_messages
    FOR UPDATE USING (true);

-- 2. Fix places_cache table
DROP POLICY IF EXISTS "Allow anonymous users to insert places cache" ON public.places_cache;
DROP POLICY IF EXISTS "Allow anonymous users to view places cache" ON public.places_cache;
DROP POLICY IF EXISTS "Allow anonymous users to update places cache" ON public.places_cache;

CREATE POLICY "Allow anonymous users to insert places cache" ON public.places_cache
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anonymous users to view places cache" ON public.places_cache
    FOR SELECT USING (true);

CREATE POLICY "Allow anonymous users to update places cache" ON public.places_cache
    FOR UPDATE USING (true);

-- 3. Fix trips table (if exists)
DROP POLICY IF EXISTS "Allow anonymous users to insert trips" ON public.trips;
DROP POLICY IF EXISTS "Allow anonymous users to view trips" ON public.trips;
DROP POLICY IF EXISTS "Allow anonymous users to update trips" ON public.trips;

CREATE POLICY "Allow anonymous users to insert trips" ON public.trips
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anonymous users to view trips" ON public.trips
    FOR SELECT USING (true);

CREATE POLICY "Allow anonymous users to update trips" ON public.trips
    FOR UPDATE USING (true);

-- 4. Fix destinations table (if exists)
DROP POLICY IF EXISTS "Allow anonymous users to insert destinations" ON public.destinations;
DROP POLICY IF EXISTS "Allow anonymous users to view destinations" ON public.destinations;
DROP POLICY IF EXISTS "Allow anonymous users to update destinations" ON public.destinations;

CREATE POLICY "Allow anonymous users to insert destinations" ON public.destinations
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anonymous users to view destinations" ON public.destinations
    FOR SELECT USING (true);

CREATE POLICY "Allow anonymous users to update destinations" ON public.destinations
    FOR UPDATE USING (true);

-- 5. Ensure RLS is enabled on all tables
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.places_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.destinations ENABLE ROW LEVEL SECURITY;

-- 6. Test the policies
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual, 
    with_check
FROM pg_policies 
WHERE tablename IN ('chat_messages', 'places_cache', 'trips', 'destinations')
ORDER BY tablename, policyname;
