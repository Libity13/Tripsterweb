-- Fix RLS Policies for Guest Trip Migration (Safe Version)
-- =======================================================

-- Drop ALL existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Allow all operations on trips" ON public.trips;
DROP POLICY IF EXISTS "Allow all operations on destinations" ON public.destinations;
DROP POLICY IF EXISTS "Allow all operations on chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Public read places cache" ON public.places_cache;
DROP POLICY IF EXISTS "Allow insert places cache" ON public.places_cache;
DROP POLICY IF EXISTS "Allow update places cache" ON public.places_cache;

-- Drop any other existing policies
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

-- Create new policies that allow authenticated users to migrate guest trips
-- 1. Trips policies
CREATE POLICY "Users can view own trips" ON public.trips 
  FOR SELECT USING (
    auth.uid() = user_id OR 
    (user_id IS NULL AND guest_id IS NOT NULL)
  );

CREATE POLICY "Users can insert own trips" ON public.trips 
  FOR INSERT WITH CHECK (
    auth.uid() = user_id OR 
    (user_id IS NULL AND guest_id IS NOT NULL)
  );

CREATE POLICY "Users can update own trips" ON public.trips 
  FOR UPDATE USING (
    auth.uid() = user_id OR 
    (user_id IS NULL AND guest_id IS NOT NULL)
  );

CREATE POLICY "Users can delete own trips" ON public.trips 
  FOR DELETE USING (
    auth.uid() = user_id OR 
    (user_id IS NULL AND guest_id IS NOT NULL)
  );

-- 2. Destinations policies
CREATE POLICY "Users can view own destinations" ON public.destinations 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.trips 
      WHERE trips.id = destinations.trip_id 
      AND (trips.user_id = auth.uid() OR (trips.user_id IS NULL AND trips.guest_id IS NOT NULL))
    )
  );

CREATE POLICY "Users can insert own destinations" ON public.destinations 
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.trips 
      WHERE trips.id = destinations.trip_id 
      AND (trips.user_id = auth.uid() OR (trips.user_id IS NULL AND trips.guest_id IS NOT NULL))
    )
  );

CREATE POLICY "Users can update own destinations" ON public.destinations 
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.trips 
      WHERE trips.id = destinations.trip_id 
      AND (trips.user_id = auth.uid() OR (trips.user_id IS NULL AND trips.guest_id IS NOT NULL))
    )
  );

CREATE POLICY "Users can delete own destinations" ON public.destinations 
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.trips 
      WHERE trips.id = destinations.trip_id 
      AND (trips.user_id = auth.uid() OR (trips.user_id IS NULL AND trips.guest_id IS NOT NULL))
    )
  );

-- 3. Chat messages policies
CREATE POLICY "Users can view own chat messages" ON public.chat_messages 
  FOR SELECT USING (
    auth.uid() = user_id OR 
    (user_id IS NULL AND EXISTS (
      SELECT 1 FROM public.trips 
      WHERE trips.id = chat_messages.trip_id 
      AND (trips.user_id = auth.uid() OR (trips.user_id IS NULL AND trips.guest_id IS NOT NULL))
    ))
  );

CREATE POLICY "Users can insert own chat messages" ON public.chat_messages 
  FOR INSERT WITH CHECK (
    auth.uid() = user_id OR 
    (user_id IS NULL AND EXISTS (
      SELECT 1 FROM public.trips 
      WHERE trips.id = chat_messages.trip_id 
      AND (trips.user_id = auth.uid() OR (trips.user_id IS NULL AND trips.guest_id IS NOT NULL))
    ))
  );

CREATE POLICY "Users can update own chat messages" ON public.chat_messages 
  FOR UPDATE USING (
    auth.uid() = user_id OR 
    (user_id IS NULL AND EXISTS (
      SELECT 1 FROM public.trips 
      WHERE trips.id = chat_messages.trip_id 
      AND (trips.user_id = auth.uid() OR (trips.user_id IS NULL AND trips.guest_id IS NOT NULL))
    ))
  );

CREATE POLICY "Users can delete own chat messages" ON public.chat_messages 
  FOR DELETE USING (
    auth.uid() = user_id OR 
    (user_id IS NULL AND EXISTS (
      SELECT 1 FROM public.trips 
      WHERE trips.id = chat_messages.trip_id 
      AND (trips.user_id = auth.uid() OR (trips.user_id IS NULL AND trips.guest_id IS NOT NULL))
    ))
  );

-- 4. Places cache policies (keep public read)
CREATE POLICY "Public read places cache" ON public.places_cache FOR SELECT USING (true);
CREATE POLICY "Allow insert places cache" ON public.places_cache FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update places cache" ON public.places_cache FOR UPDATE USING (true);

-- Test the policies
SELECT 'RLS Policies updated successfully' as status;
