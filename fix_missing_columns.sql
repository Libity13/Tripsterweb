-- Fix Missing Columns in trips table
-- ==================================

-- Add missing columns to trips table
ALTER TABLE public.trips 
ADD COLUMN IF NOT EXISTS total_cost NUMERIC(10,2) DEFAULT 0;

-- Add missing columns to destinations table if needed
ALTER TABLE public.destinations 
ADD COLUMN IF NOT EXISTS estimated_cost NUMERIC(10,2) DEFAULT 0;

-- Verify the columns exist
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'trips'
ORDER BY ordinal_position;

-- Check destinations table too
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'destinations'
ORDER BY ordinal_position;
