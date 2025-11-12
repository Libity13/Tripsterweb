-- Clean and Recreate RLS Policies
-- ===============================

-- 1. Drop ALL existing policies
-- =============================

-- Drop all policies on profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;

-- Drop all policies on trips
DROP POLICY IF EXISTS "Owner or Guest can view trips" ON public.trips;
DROP POLICY IF EXISTS "Owner or Guest can manage own trips" ON public.trips;
DROP POLICY IF EXISTS "Allow all operations on trips" ON public.trips;
DROP POLICY IF EXISTS "Users can view own trips or public trips" ON public.trips;
DROP POLICY IF EXISTS "Users can manage own trips" ON public.trips;

-- Drop all policies on destinations
DROP POLICY IF EXISTS "Owner or Guest can manage destinations" ON public.destinations;
DROP POLICY IF EXISTS "Users can manage destinations of own trips" ON public.destinations;
DROP POLICY IF EXISTS "Allow all operations on destinations" ON public.destinations;
DROP POLICY IF EXISTS "Users can manage destinations of own trips" ON public.destinations;

-- Drop all policies on chat_messages
DROP POLICY IF EXISTS "Owner or Guest can manage chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can manage messages of own trips" ON public.chat_messages;
DROP POLICY IF EXISTS "Allow all operations on chat messages" ON public.chat_messages;

-- Drop all policies on places_cache
DROP POLICY IF EXISTS "Public read places cache" ON public.places_cache;
DROP POLICY IF EXISTS "Allow insert places cache" ON public.places_cache;
DROP POLICY IF EXISTS "Allow update places cache" ON public.places_cache;
DROP POLICY IF EXISTS "Allow authenticated and anon write places cache" ON public.places_cache;

-- 2. Drop existing function
-- =========================
DROP FUNCTION IF EXISTS public.is_owner_or_guest(public.trips);

-- 3. Create SECURE Owner/Guest Check Function
-- ===========================================
CREATE OR REPLACE FUNCTION public.is_owner_or_guest(trip_row public.trips)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  -- Authenticated user owns the trip
  IF trip_row.user_id IS NOT NULL AND auth.uid() = trip_row.user_id THEN
    RETURN true;
  END IF;

  -- Anonymous user owns the guest trip
  IF trip_row.user_id IS NULL AND trip_row.guest_id IS NOT NULL AND auth.uid() IS NULL THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- 4. Create NEW Secure Policies
-- =============================

-- Profiles policies (user-specific)
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own profile" ON public.profiles FOR DELETE USING (auth.uid() = user_id);

-- Trips policies (secure owner/guest access)
CREATE POLICY "Owner or Guest can view trips"
  ON public.trips FOR SELECT
  USING (
    public.is_owner_or_guest(trips) OR is_public = true
  );

CREATE POLICY "Owner or Guest can manage own trips"
  ON public.trips FOR ALL
  USING ( public.is_owner_or_guest(trips) )
  WITH CHECK ( public.is_owner_or_guest(trips) );

-- Destinations policies (based on trip ownership)
CREATE POLICY "Owner or Guest can manage destinations"
  ON public.destinations FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.trips t WHERE t.id = trip_id AND public.is_owner_or_guest(t))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.trips t WHERE t.id = trip_id AND public.is_owner_or_guest(t))
  );

-- Chat messages policies (based on trip ownership)
CREATE POLICY "Owner or Guest can manage chat messages"
  ON public.chat_messages FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.trips t WHERE t.id = trip_id AND public.is_owner_or_guest(t))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.trips t WHERE t.id = trip_id AND public.is_owner_or_guest(t))
  );

-- Places cache policies (public read/write)
CREATE POLICY "Public read places cache" ON public.places_cache FOR SELECT USING (true);
CREATE POLICY "Allow authenticated and anon write places cache" ON public.places_cache FOR ALL USING (true) WITH CHECK (true);

-- 5. Verify the setup
-- ===================

-- Check that policies are created
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
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Check RLS is enabled
SELECT 
    schemaname, 
    tablename, 
    rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('profiles', 'trips', 'destinations', 'chat_messages', 'places_cache')
ORDER BY tablename;

-- Test the function (if there are any trips)
SELECT 
    public.is_owner_or_guest(trips) as is_owner, 
    user_id, 
    guest_id, 
    title 
FROM public.trips 
LIMIT 5;
