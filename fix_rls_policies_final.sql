-- Fix RLS Policies for chat_messages table
-- =====================================

-- 1. Drop existing policies
DROP POLICY IF EXISTS "Allow anonymous users to insert chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Allow anonymous users to view chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Allow anonymous users to update chat messages" ON public.chat_messages;

-- 2. Create new policies for anonymous users
CREATE POLICY "Allow anonymous users to insert chat messages" ON public.chat_messages
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anonymous users to view chat messages" ON public.chat_messages
    FOR SELECT USING (true);

CREATE POLICY "Allow anonymous users to update chat messages" ON public.chat_messages
    FOR UPDATE USING (true);

-- 3. Ensure RLS is enabled
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- 4. Test the policies
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
WHERE tablename = 'chat_messages';
