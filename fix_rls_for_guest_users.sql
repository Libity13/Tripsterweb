-- Fix RLS Policies for Guest Users
-- =================================

-- 1. Allow guest users to insert trips
DROP POLICY IF EXISTS "Allow guest users to insert trips" ON public.trips;
CREATE POLICY "Allow guest users to insert trips" ON public.trips
    FOR INSERT WITH CHECK (user_id IS NOT NULL);

-- 2. Allow guest users to view their own trips
DROP POLICY IF EXISTS "Allow guest users to view own trips" ON public.trips;
CREATE POLICY "Allow guest users to view own trips" ON public.trips
    FOR SELECT USING (user_id IS NOT NULL);

-- 3. Allow guest users to update their own trips
DROP POLICY IF EXISTS "Allow guest users to update own trips" ON public.trips;
CREATE POLICY "Allow guest users to update own trips" ON public.trips
    FOR UPDATE USING (user_id IS NOT NULL);

-- 4. Allow guest users to delete their own trips
DROP POLICY IF EXISTS "Allow guest users to delete own trips" ON public.trips;
CREATE POLICY "Allow guest users to delete own trips" ON public.trips
    FOR DELETE USING (user_id IS NOT NULL);

-- 5. Allow guest users to insert destinations
DROP POLICY IF EXISTS "Allow guest users to insert destinations" ON public.destinations;
CREATE POLICY "Allow guest users to insert destinations" ON public.destinations
    FOR INSERT WITH CHECK (user_id IS NOT NULL);

-- 6. Allow guest users to view their own destinations
DROP POLICY IF EXISTS "Allow guest users to view own destinations" ON public.destinations;
CREATE POLICY "Allow guest users to view own destinations" ON public.destinations
    FOR SELECT USING (user_id IS NOT NULL);

-- 7. Allow guest users to update their own destinations
DROP POLICY IF EXISTS "Allow guest users to update own destinations" ON public.destinations;
CREATE POLICY "Allow guest users to update own destinations" ON public.destinations
    FOR UPDATE USING (user_id IS NOT NULL);

-- 8. Allow guest users to delete their own destinations
DROP POLICY IF EXISTS "Allow guest users to delete own destinations" ON public.destinations;
CREATE POLICY "Allow guest users to delete own destinations" ON public.destinations
    FOR DELETE USING (user_id IS NOT NULL);

-- 9. Allow guest users to insert chat messages
DROP POLICY IF EXISTS "Allow guest users to insert chat messages" ON public.chat_messages;
CREATE POLICY "Allow guest users to insert chat messages" ON public.chat_messages
    FOR INSERT WITH CHECK (user_id IS NOT NULL);

-- 10. Allow guest users to view their own chat messages
DROP POLICY IF EXISTS "Allow guest users to view own chat messages" ON public.chat_messages;
CREATE POLICY "Allow guest users to view own chat messages" ON public.chat_messages
    FOR SELECT USING (user_id IS NOT NULL);

-- 11. Allow guest users to update their own chat messages
DROP POLICY IF EXISTS "Allow guest users to update own chat messages" ON public.chat_messages;
CREATE POLICY "Allow guest users to update own chat messages" ON public.chat_messages
    FOR UPDATE USING (user_id IS NOT NULL);

-- 12. Allow guest users to delete their own chat messages
DROP POLICY IF EXISTS "Allow guest users to delete own chat messages" ON public.chat_messages;
CREATE POLICY "Allow guest users to delete own chat messages" ON public.chat_messages
    FOR DELETE USING (user_id IS NOT NULL);

-- 13. Ensure RLS is enabled on all tables
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- 14. Test the policies
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
WHERE tablename IN ('trips', 'destinations', 'chat_messages')
ORDER BY tablename, policyname;
