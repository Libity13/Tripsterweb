-- Fix Migration Errors
-- ====================

-- 1. Fix RLS Policies that use NEW incorrectly
-- ===========================================

-- Drop problematic policies first
DROP POLICY IF EXISTS "Users and Guests can manage their own trips" ON public.trips;
DROP POLICY IF EXISTS "Users and Guests can manage destinations of their trips" ON public.destinations;
DROP POLICY IF EXISTS "Users and Guests can manage messages of their trips" ON public.chat_messages;
DROP POLICY IF EXISTS "Users and Guests can manage own chat sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "Owner and Guest reads route_segments" ON public.route_segments;
DROP POLICY IF EXISTS "Users and Guests can manage own recommendations" ON public.ai_recommendations;

-- 2. Create Corrected RLS Policies
-- ===============================

-- TRIPS: Allow users to manage their own trips, guests to manage guest trips
CREATE POLICY "Users can manage own trips" ON public.trips
    FOR ALL USING (
        (auth.uid() = user_id AND user_id IS NOT NULL)
        OR (user_id IS NULL AND guest_id IS NOT NULL AND auth.uid() IS NULL)
    );

-- DESTINATIONS: Allow access based on trip ownership
CREATE POLICY "Users can manage destinations of own trips" ON public.destinations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.trips t 
            WHERE t.id = destinations.trip_id 
            AND (
                (t.user_id = auth.uid() AND t.user_id IS NOT NULL)
                OR (t.user_id IS NULL AND t.guest_id IS NOT NULL AND auth.uid() IS NULL)
            )
        )
    );

-- CHAT_MESSAGES: Allow access based on trip ownership
CREATE POLICY "Users can manage messages of own trips" ON public.chat_messages
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.trips t 
            WHERE t.id = chat_messages.trip_id 
            AND (
                (t.user_id = auth.uid() AND t.user_id IS NOT NULL)
                OR (t.user_id IS NULL AND t.guest_id IS NOT NULL AND auth.uid() IS NULL)
            )
        )
    );

-- CHAT_SESSIONS: Allow access based on ownership
CREATE POLICY "Users can manage own chat sessions" ON public.chat_sessions
    FOR ALL USING (
        (auth.uid() = user_id AND user_id IS NOT NULL)
        OR (
            user_id IS NULL 
            AND auth.uid() IS NULL 
            AND EXISTS (
                SELECT 1 FROM public.trips t 
                WHERE t.id = chat_sessions.trip_id 
                AND t.user_id IS NULL 
                AND t.guest_id IS NOT NULL
            )
        )
    );

-- ROUTE_SEGMENTS: Allow access based on trip ownership
CREATE POLICY "Users can manage route segments of own trips" ON public.route_segments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.trips t 
            WHERE t.id = route_segments.trip_id 
            AND (
                (t.user_id = auth.uid() AND t.user_id IS NOT NULL)
                OR (t.user_id IS NULL AND t.guest_id IS NOT NULL AND auth.uid() IS NULL)
            )
        )
    );

-- AI_RECOMMENDATIONS: Allow access based on ownership
CREATE POLICY "Users can manage own recommendations" ON public.ai_recommendations
    FOR ALL USING (
        (auth.uid() = user_id AND user_id IS NOT NULL)
        OR (
            user_id IS NULL 
            AND auth.uid() IS NULL 
            AND EXISTS (
                SELECT 1 FROM public.trips t 
                WHERE t.id = ai_recommendations.trip_id 
                AND t.user_id IS NULL 
                AND t.guest_id IS NOT NULL
            )
        )
    );

-- 3. Test the policies
-- ====================

-- Check if policies are created correctly
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
WHERE tablename IN ('trips', 'destinations', 'chat_messages', 'chat_sessions', 'route_segments', 'ai_recommendations')
ORDER BY tablename, policyname;

-- 4. Verify RLS is enabled
-- =======================

SELECT 
    schemaname, 
    tablename, 
    rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('trips', 'destinations', 'chat_messages', 'chat_sessions', 'route_segments', 'ai_recommendations')
ORDER BY tablename;
