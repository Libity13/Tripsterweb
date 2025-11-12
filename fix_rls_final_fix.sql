-- Final RLS Fix - Enable RLS with permissive policies
-- ===================================================

-- Enable RLS on all tables
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.places_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Allow all trips operations" ON public.trips;
DROP POLICY IF EXISTS "Allow all destinations operations" ON public.destinations;
DROP POLICY IF EXISTS "Allow all chat messages operations" ON public.chat_messages;
DROP POLICY IF EXISTS "Allow all places cache operations" ON public.places_cache;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- Create permissive policies for development
CREATE POLICY "Allow all trips operations" ON public.trips FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all destinations operations" ON public.destinations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all chat messages operations" ON public.chat_messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all places cache operations" ON public.places_cache FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all profiles operations" ON public.profiles FOR ALL USING (true) WITH CHECK (true);

-- Test the policies
SELECT 'RLS enabled with permissive policies - All operations allowed' as status;
