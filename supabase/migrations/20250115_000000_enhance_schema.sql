-- Enhanced schema for multilingual support and guest mode
-- Add missing columns to existing tables

-- Update trips table
ALTER TABLE public.trips 
ADD COLUMN IF NOT EXISTS title_en TEXT,
ADD COLUMN IF NOT EXISTS description_en TEXT,
ADD COLUMN IF NOT EXISTS total_duration INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_cost DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'th',
ADD COLUMN IF NOT EXISTS guest_id TEXT,
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;

-- Update destinations table  
ALTER TABLE public.destinations
ADD COLUMN IF NOT EXISTS name_en TEXT,
ADD COLUMN IF NOT EXISTS description_en TEXT,
ADD COLUMN IF NOT EXISTS rating DECIMAL(3,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS visit_duration INTEGER DEFAULT 60,
ADD COLUMN IF NOT EXISTS estimated_cost DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS place_types TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS photos TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS place_id TEXT,
ADD COLUMN IF NOT EXISTS formatted_address TEXT,
ADD COLUMN IF NOT EXISTS opening_hours JSONB,
ADD COLUMN IF NOT EXISTS price_level INTEGER,
ADD COLUMN IF NOT EXISTS user_ratings_total INTEGER,
ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'th',
ADD COLUMN IF NOT EXISTS guest_id TEXT;

-- Update chat_messages table
ALTER TABLE public.chat_messages
ADD COLUMN IF NOT EXISTS content_en TEXT,
ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'th',
ADD COLUMN IF NOT EXISTS guest_id TEXT;

-- Make user_id nullable for guest mode
ALTER TABLE public.trips ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.chat_messages ALTER COLUMN user_id DROP NOT NULL;

-- Update RLS policies to support guest mode
DROP POLICY IF EXISTS "Users can view own trips" ON public.trips;
DROP POLICY IF EXISTS "Users can insert own trips" ON public.trips;
DROP POLICY IF EXISTS "Users can update own trips" ON public.trips;
DROP POLICY IF EXISTS "Users can delete own trips" ON public.trips;

-- New RLS policies for trips (supporting both authenticated and guest users)
CREATE POLICY "Users can view own trips or public trips"
  ON public.trips FOR SELECT
  USING (
    auth.uid() = user_id OR 
    is_public = true OR
    (user_id IS NULL AND guest_id = current_setting('app.guest_id', true))
  );

CREATE POLICY "Users can insert own trips"
  ON public.trips FOR INSERT
  WITH CHECK (
    auth.uid() = user_id OR
    (user_id IS NULL AND guest_id = current_setting('app.guest_id', true))
  );

CREATE POLICY "Users can update own trips"
  ON public.trips FOR UPDATE
  USING (
    auth.uid() = user_id OR
    (user_id IS NULL AND guest_id = current_setting('app.guest_id', true))
  );

CREATE POLICY "Users can delete own trips"
  ON public.trips FOR DELETE
  USING (
    auth.uid() = user_id OR
    (user_id IS NULL AND guest_id = current_setting('app.guest_id', true))
  );

-- Update destinations RLS policies
DROP POLICY IF EXISTS "Users can view destinations of own trips" ON public.destinations;
DROP POLICY IF EXISTS "Users can insert destinations to own trips" ON public.destinations;
DROP POLICY IF EXISTS "Users can update destinations of own trips" ON public.destinations;
DROP POLICY IF EXISTS "Users can delete destinations of own trips" ON public.destinations;

CREATE POLICY "Users can view destinations of own trips"
  ON public.destinations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.trips
      WHERE trips.id = destinations.trip_id
      AND (
        trips.user_id = auth.uid() OR
        trips.is_public = true OR
        (trips.user_id IS NULL AND trips.guest_id = current_setting('app.guest_id', true))
      )
    )
  );

CREATE POLICY "Users can insert destinations to own trips"
  ON public.destinations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.trips
      WHERE trips.id = destinations.trip_id
      AND (
        trips.user_id = auth.uid() OR
        (trips.user_id IS NULL AND trips.guest_id = current_setting('app.guest_id', true))
      )
    )
  );

CREATE POLICY "Users can update destinations of own trips"
  ON public.destinations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.trips
      WHERE trips.id = destinations.trip_id
      AND (
        trips.user_id = auth.uid() OR
        (trips.user_id IS NULL AND trips.guest_id = current_setting('app.guest_id', true))
      )
    )
  );

CREATE POLICY "Users can delete destinations of own trips"
  ON public.destinations FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.trips
      WHERE trips.id = destinations.trip_id
      AND (
        trips.user_id = auth.uid() OR
        (trips.user_id IS NULL AND trips.guest_id = current_setting('app.guest_id', true))
      )
    )
  );

-- Update chat_messages RLS policies
DROP POLICY IF EXISTS "Users can view messages of own trips" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can insert messages to own trips" ON public.chat_messages;

CREATE POLICY "Users can view messages of own trips"
  ON public.chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.trips
      WHERE trips.id = chat_messages.trip_id
      AND (
        trips.user_id = auth.uid() OR
        trips.is_public = true OR
        (trips.user_id IS NULL AND trips.guest_id = current_setting('app.guest_id', true))
      )
    )
  );

CREATE POLICY "Users can insert messages to own trips"
  ON public.chat_messages FOR INSERT
  WITH CHECK (
    (auth.uid() = user_id OR (user_id IS NULL AND guest_id = current_setting('app.guest_id', true))) AND
    EXISTS (
      SELECT 1 FROM public.trips
      WHERE trips.id = chat_messages.trip_id
      AND (
        trips.user_id = auth.uid() OR
        (trips.user_id IS NULL AND trips.guest_id = current_setting('app.guest_id', true))
      )
    )
  );

-- Create function to set guest_id in session
CREATE OR REPLACE FUNCTION public.set_guest_id(guest_id_param TEXT)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.guest_id', guest_id_param, false);
END;
$$ LANGUAGE plpgsql;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_trips_guest_id ON public.trips(guest_id);
CREATE INDEX IF NOT EXISTS idx_destinations_guest_id ON public.destinations(guest_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_guest_id ON public.chat_messages(guest_id);
CREATE INDEX IF NOT EXISTS idx_trips_language ON public.trips(language);
CREATE INDEX IF NOT EXISTS idx_destinations_language ON public.destinations(language);
CREATE INDEX IF NOT EXISTS idx_chat_messages_language ON public.chat_messages(language);
