-- Simple RLS Fix - Allow all operations for development
-- =====================================================

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view own trips" ON public.trips;
DROP POLICY IF EXISTS "Users can insert own trips" ON public.trips;
DROP POLICY IF EXISTS "Users can update own trips" ON public.trips;
DROP POLICY IF EXISTS "Users can delete own trips" ON public.trips;
DROP POLICY IF EXISTS "Users can view own destinations" ON public.destinations;
DROP POLICY IF EXISTS "Users can insert own destinations" ON public.destinations;
DROP POLICY IF EXISTS "Users can update own destinations" ON public.destinations;
DROP POLICY IF EXISTS "Users can delete own destinations" ON public.destinations;
DROP POLICY IF EXISTS "Users can view own chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can insert own chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can update own chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can delete own chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Public read places cache" ON public.places_cache;
DROP POLICY IF EXISTS "Allow insert places cache" ON public.places_cache;
DROP POLICY IF EXISTS "Allow update places cache" ON public.places_cache;

-- Create simple policies that allow all operations
-- This is for development - in production, you'd want more restrictive policies

-- Trips policies
CREATE POLICY "Allow all trips operations" ON public.trips FOR ALL USING (true) WITH CHECK (true);

-- Destinations policies  
CREATE POLICY "Allow all destinations operations" ON public.destinations FOR ALL USING (true) WITH CHECK (true);

-- Chat messages policies
CREATE POLICY "Allow all chat messages operations" ON public.chat_messages FOR ALL USING (true) WITH CHECK (true);

-- Places cache policies
CREATE POLICY "Allow all places cache operations" ON public.places_cache FOR ALL USING (true) WITH CHECK (true);

-- Test the policies
SELECT 'RLS Policies updated successfully - All operations allowed' as status;
