-- Complete Migration with DROP IF EXISTS
-- ======================================

-- 1. Enable UUID extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- 3. Create Core Tables
-- =====================

-- Profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  preferences JSONB DEFAULT '{"language": "th", "currency": "THB"}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Trips table (with guest support)
CREATE TABLE IF NOT EXISTS public.trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  guest_id TEXT,
  title TEXT NOT NULL,
  title_en TEXT,
  description TEXT,
  description_en TEXT,
  start_date DATE,
  end_date DATE,
  budget_max NUMERIC(10,2),
  status TEXT DEFAULT 'planning',
  budget_min NUMERIC(10,2),
  currency TEXT DEFAULT 'THB',
  cover_image_url TEXT,
  is_public BOOLEAN DEFAULT false,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  tags_en TEXT[] DEFAULT ARRAY[]::TEXT[],
  metadata JSONB DEFAULT '{}'::jsonb,
  route_data JSONB,
  total_distance NUMERIC(10,2),
  total_duration INTEGER,
  language TEXT DEFAULT 'th',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT check_owner_or_guest CHECK (user_id IS NOT NULL OR guest_id IS NOT NULL)
);

-- Destinations table
CREATE TABLE IF NOT EXISTS public.destinations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_en TEXT,
  description TEXT,
  description_en TEXT,
  order_index INTEGER NOT NULL,
  latitude NUMERIC(10,8),
  longitude NUMERIC(11,8),
  duration_minutes INTEGER,
  notes TEXT,
  notes_en TEXT,
  place_id TEXT,
  formatted_address TEXT,
  place_types TEXT[] DEFAULT ARRAY[]::TEXT[],
  rating NUMERIC(3,2),
  user_ratings_total INTEGER,
  price_level INTEGER,
  photos JSONB DEFAULT '[]'::jsonb,
  opening_hours JSONB,
  phone_number TEXT,
  website TEXT,
  visit_date DATE,
  visit_time TIME,
  estimated_cost NUMERIC(10,2),
  recommended_by_ai BOOLEAN DEFAULT false,
  ai_reason TEXT,
  ai_reason_en TEXT,
  is_favorite BOOLEAN DEFAULT false,
  is_visited BOOLEAN DEFAULT false,
  user_rating NUMERIC(3,2),
  language TEXT DEFAULT 'th',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Chat messages table
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  content_en TEXT,
  session_id UUID,
  model TEXT DEFAULT 'gemini-1.5-flash',
  tokens_used INTEGER,
  intent TEXT,
  entities JSONB DEFAULT '{}'::jsonb,
  actions JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  language TEXT DEFAULT 'th',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Places cache table
CREATE TABLE IF NOT EXISTS public.places_cache (
  place_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  name_en TEXT,
  formatted_address TEXT,
  latitude NUMERIC(10,8),
  longitude NUMERIC(11,8),
  place_types TEXT[],
  rating NUMERIC(3,2),
  user_ratings_total INTEGER,
  price_level INTEGER,
  photos JSONB,
  opening_hours JSONB,
  phone_number TEXT,
  website TEXT,
  reviews JSONB,
  google_data JSONB,
  last_updated TIMESTAMPTZ DEFAULT now(),
  cache_expires_at TIMESTAMPTZ DEFAULT now() + INTERVAL '30 days'
);

-- 4. Create Indexes
-- =================

CREATE INDEX IF NOT EXISTS idx_trips_user_id ON public.trips(user_id);
CREATE INDEX IF NOT EXISTS idx_trips_guest_id ON public.trips(guest_id);
CREATE INDEX IF NOT EXISTS idx_trips_language ON public.trips(language);
CREATE INDEX IF NOT EXISTS idx_trips_is_public ON public.trips(is_public);
CREATE INDEX IF NOT EXISTS idx_destinations_trip_id ON public.destinations(trip_id);
CREATE INDEX IF NOT EXISTS idx_destinations_order ON public.destinations(trip_id, order_index);
CREATE INDEX IF NOT EXISTS idx_destinations_place_id ON public.destinations(place_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_trip_id ON public.chat_messages(trip_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages(trip_id, created_at);
CREATE INDEX IF NOT EXISTS idx_places_cache_expires ON public.places_cache(cache_expires_at);

-- 5. Enable Row Level Security
-- ============================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.places_cache ENABLE ROW LEVEL SECURITY;

-- 6. Drop existing policies and function
-- ======================================

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;
DROP POLICY IF EXISTS "Owner or Guest can view trips" ON public.trips;
DROP POLICY IF EXISTS "Owner or Guest can manage own trips" ON public.trips;
DROP POLICY IF EXISTS "Allow all operations on trips" ON public.trips;
DROP POLICY IF EXISTS "Owner or Guest can manage destinations" ON public.destinations;
DROP POLICY IF EXISTS "Users can manage destinations of own trips" ON public.destinations;
DROP POLICY IF EXISTS "Allow all operations on destinations" ON public.destinations;
DROP POLICY IF EXISTS "Owner or Guest can manage chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can manage messages of own trips" ON public.chat_messages;
DROP POLICY IF EXISTS "Allow all operations on chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Public read places cache" ON public.places_cache;
DROP POLICY IF EXISTS "Allow insert places cache" ON public.places_cache;
DROP POLICY IF EXISTS "Allow update places cache" ON public.places_cache;
DROP POLICY IF EXISTS "Allow authenticated and anon write places cache" ON public.places_cache;

-- Drop existing function
DROP FUNCTION IF EXISTS public.is_owner_or_guest(public.trips);

-- 7. Create SECURE RLS Policies
-- =============================

-- SECURE Owner/Guest Check Function
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

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own profile" ON public.profiles FOR DELETE USING (auth.uid() = user_id);

-- Trips policies
CREATE POLICY "Owner or Guest can view trips"
  ON public.trips FOR SELECT
  USING (
    public.is_owner_or_guest(trips) OR is_public = true
  );

CREATE POLICY "Owner or Guest can manage own trips"
  ON public.trips FOR ALL
  USING ( public.is_owner_or_guest(trips) )
  WITH CHECK ( public.is_owner_or_guest(trips) );

-- Destinations policies
CREATE POLICY "Owner or Guest can manage destinations"
  ON public.destinations FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.trips t WHERE t.id = trip_id AND public.is_owner_or_guest(t))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.trips t WHERE t.id = trip_id AND public.is_owner_or_guest(t))
  );

-- Chat messages policies
CREATE POLICY "Owner or Guest can manage chat messages"
  ON public.chat_messages FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.trips t WHERE t.id = trip_id AND public.is_owner_or_guest(t))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.trips t WHERE t.id = trip_id AND public.is_owner_or_guest(t))
  );

-- Places cache policies
CREATE POLICY "Public read places cache" ON public.places_cache FOR SELECT USING (true);
CREATE POLICY "Allow authenticated and anon write places cache" ON public.places_cache FOR ALL USING (true) WITH CHECK (true);

-- 8. Drop existing triggers and recreate
-- ======================================

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS update_trips_updated_at ON public.trips;
DROP TRIGGER IF EXISTS update_destinations_updated_at ON public.destinations;

-- Create triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_trips_updated_at
  BEFORE UPDATE ON public.trips
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_destinations_updated_at
  BEFORE UPDATE ON public.destinations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 9. Test the setup
-- =================

SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

SELECT schemaname, tablename, triggername
FROM pg_triggers 
WHERE schemaname = 'public'
ORDER BY tablename, triggername;
