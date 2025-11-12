-- Fix chat_messages constraint issue
-- Allow trip_id to be NULL for initial chat messages

-- First, let's check the current constraint
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'chat_messages'::regclass 
AND conname LIKE '%trip_id%';

-- Drop the existing NOT NULL constraint on trip_id
ALTER TABLE chat_messages ALTER COLUMN trip_id DROP NOT NULL;

-- Add a check constraint to ensure trip_id is either NULL or a valid UUID
ALTER TABLE chat_messages 
ADD CONSTRAINT check_trip_id_format 
CHECK (trip_id IS NULL OR trip_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');

-- Add guest_id column if it doesn't exist
ALTER TABLE chat_messages 
ADD COLUMN IF NOT EXISTS guest_id TEXT;

-- Update RLS policies to allow NULL trip_id
DROP POLICY IF EXISTS "Users can insert their own messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can view their own messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON chat_messages;

-- Create new RLS policies that allow NULL trip_id
CREATE POLICY "Users can insert their own messages" ON chat_messages
    FOR INSERT WITH CHECK (
        auth.uid() = user_id OR 
        (user_id IS NULL AND guest_id IS NOT NULL)
    );

CREATE POLICY "Users can view their own messages" ON chat_messages
    FOR SELECT USING (
        auth.uid() = user_id OR 
        (user_id IS NULL AND guest_id IS NOT NULL)
    );

CREATE POLICY "Users can update their own messages" ON chat_messages
    FOR UPDATE USING (
        auth.uid() = user_id OR 
        (user_id IS NULL AND guest_id IS NOT NULL)
    );

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_trip_id ON chat_messages(trip_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_guest_id ON chat_messages(guest_id);

-- Verify the changes
SELECT 
    column_name,
    is_nullable,
    data_type,
    column_default
FROM information_schema.columns 
WHERE table_name = 'chat_messages' 
AND column_name = 'trip_id';
