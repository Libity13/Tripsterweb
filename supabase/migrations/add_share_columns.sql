-- Add share columns to trips table
-- Run this in Supabase SQL Editor

-- 1. Add share_token column (TEXT for shorter URLs with nanoid)
ALTER TABLE public.trips 
ADD COLUMN IF NOT EXISTS share_token TEXT DEFAULT NULL;

-- 2. Add shared_at column (timestamp when first shared)
ALTER TABLE public.trips 
ADD COLUMN IF NOT EXISTS shared_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- 3. Make sure is_public column exists (might already exist)
ALTER TABLE public.trips 
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE;

-- 4. Create unique index on share_token for fast lookups
CREATE UNIQUE INDEX IF NOT EXISTS trips_share_token_idx ON public.trips (share_token) WHERE share_token IS NOT NULL;

-- 5. RLS Policy: Allow public access to shared trips (SELECT only)
DROP POLICY IF EXISTS "Public can view shared trips" ON public.trips;
CREATE POLICY "Public can view shared trips" ON public.trips
  FOR SELECT
  USING (is_public = true AND share_token IS NOT NULL);

-- 6. RLS Policy: Allow public access to destinations of shared trips
DROP POLICY IF EXISTS "Public can view shared trip destinations" ON public.destinations;
CREATE POLICY "Public can view shared trip destinations" ON public.destinations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.trips 
      WHERE trips.id = destinations.trip_id 
      AND trips.is_public = true 
      AND trips.share_token IS NOT NULL
    )
  );

-- Done! ✅
SELECT 'Migration complete! share_token, shared_at, is_public columns added to trips table.' as result;

