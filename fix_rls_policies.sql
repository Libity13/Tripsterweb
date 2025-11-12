-- Fix RLS Policies for Edge Functions
-- =====================================

-- Allow anonymous users to insert chat messages (for Edge Functions)
CREATE POLICY "Anonymous users can insert chat messages" ON public.chat_messages 
  FOR INSERT WITH CHECK (true);

-- Allow anonymous users to insert places cache
CREATE POLICY "Anonymous users can insert places cache" ON public.places_cache 
  FOR INSERT WITH CHECK (true);

-- Allow anonymous users to update places cache
CREATE POLICY "Anonymous users can update places cache" ON public.places_cache 
  FOR UPDATE USING (true);

-- Allow anonymous users to view places cache
CREATE POLICY "Anonymous users can view places cache" ON public.places_cache 
  FOR SELECT USING (true);
