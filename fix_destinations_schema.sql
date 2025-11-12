-- Fix destinations table schema
-- Add missing columns to destinations table

-- Add user_id column if it doesn't exist
ALTER TABLE destinations 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Add guest_id column if it doesn't exist
ALTER TABLE destinations 
ADD COLUMN IF NOT EXISTS guest_id TEXT;

-- Add missing columns for destinations
ALTER TABLE destinations 
ADD COLUMN IF NOT EXISTS visit_duration INTEGER DEFAULT 60;

ALTER TABLE destinations 
ADD COLUMN IF NOT EXISTS estimated_cost DECIMAL(10,2) DEFAULT 0.00;

ALTER TABLE destinations 
ADD COLUMN IF NOT EXISTS place_types TEXT[] DEFAULT '{}';

ALTER TABLE destinations 
ADD COLUMN IF NOT EXISTS photos TEXT[] DEFAULT '{}';

-- Add order_index column for sorting destinations
ALTER TABLE destinations 
ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 1;

-- Update RLS policies for destinations
DROP POLICY IF EXISTS "Users can view their own destinations" ON destinations;
DROP POLICY IF EXISTS "Users can insert their own destinations" ON destinations;
DROP POLICY IF EXISTS "Users can update their own destinations" ON destinations;
DROP POLICY IF EXISTS "Users can delete their own destinations" ON destinations;

-- Create new RLS policies for destinations
CREATE POLICY "Users can view their own destinations" ON destinations
    FOR SELECT USING (
        auth.uid() = user_id OR 
        (user_id IS NULL AND guest_id IS NOT NULL)
    );

CREATE POLICY "Users can insert their own destinations" ON destinations
    FOR INSERT WITH CHECK (
        auth.uid() = user_id OR 
        (user_id IS NULL AND guest_id IS NOT NULL)
    );

CREATE POLICY "Users can update their own destinations" ON destinations
    FOR UPDATE USING (
        auth.uid() = user_id OR 
        (user_id IS NULL AND guest_id IS NOT NULL)
    );

CREATE POLICY "Users can delete their own destinations" ON destinations
    FOR DELETE USING (
        auth.uid() = user_id OR 
        (user_id IS NULL AND guest_id IS NOT NULL)
    );

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_destinations_trip_id ON destinations(trip_id);
CREATE INDEX IF NOT EXISTS idx_destinations_user_id ON destinations(user_id);
CREATE INDEX IF NOT EXISTS idx_destinations_guest_id ON destinations(guest_id);

-- Update existing destinations to have proper user_id/guest_id
-- This will be handled by the application logic
