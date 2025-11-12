-- ============================================
-- 🔧 Fix RLS Policies for Anonymous Users
-- ============================================

-- 1. Enable RLS on all tables
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.places_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;

-- 2. Create policies for anonymous users
-- Chat Messages - Allow anonymous users to insert and read
CREATE POLICY "Anonymous users can insert chat messages" ON public.chat_messages
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anonymous users can read chat messages" ON public.chat_messages
  FOR SELECT USING (true);

-- Places Cache - Allow anonymous users to insert, update, and read
CREATE POLICY "Anonymous users can insert places cache" ON public.places_cache
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anonymous users can update places cache" ON public.places_cache
  FOR UPDATE USING (true);

CREATE POLICY "Anonymous users can read places cache" ON public.places_cache
  FOR SELECT USING (true);

-- Trips - Allow anonymous users to insert and read
CREATE POLICY "Anonymous users can insert trips" ON public.trips
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anonymous users can read trips" ON public.trips
  FOR SELECT USING (true);

-- Destinations - Allow anonymous users to insert and read
CREATE POLICY "Anonymous users can insert destinations" ON public.destinations
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anonymous users can read destinations" ON public.destinations
  FOR SELECT USING (true);

-- Chat Sessions - Allow anonymous users to insert and read
CREATE POLICY "Anonymous users can insert chat sessions" ON public.chat_sessions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anonymous users can read chat sessions" ON public.chat_sessions
  FOR SELECT USING (true);

-- 3. Grant necessary permissions to anonymous role
GRANT INSERT, SELECT, UPDATE ON public.chat_messages TO anon;
GRANT INSERT, SELECT, UPDATE ON public.places_cache TO anon;
GRANT INSERT, SELECT ON public.trips TO anon;
GRANT INSERT, SELECT ON public.destinations TO anon;
GRANT INSERT, SELECT ON public.chat_sessions TO anon;

-- 4. Test insert
INSERT INTO public.chat_messages (
  role,
  content,
  language,
  created_at
) VALUES (
  'user',
  'Test message from SQL',
  'th',
  now()
) RETURNING id, created_at;
