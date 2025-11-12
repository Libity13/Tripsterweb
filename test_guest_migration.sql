-- Test Guest Trip Migration
-- ==========================

-- 1. Check if we can read guest trips (this should work after RLS fix)
SELECT 
  id, 
  title, 
  user_id, 
  guest_id,
  created_at
FROM public.trips 
WHERE guest_id IS NOT NULL 
ORDER BY created_at DESC 
LIMIT 5;

-- 2. Check if we can read destinations for guest trips
SELECT 
  d.id,
  d.name,
  d.trip_id,
  t.title as trip_title,
  t.guest_id
FROM public.destinations d
JOIN public.trips t ON t.id = d.trip_id
WHERE t.guest_id IS NOT NULL
ORDER BY d.created_at DESC
LIMIT 5;

-- 3. Check if we can read chat messages for guest trips
SELECT 
  cm.id,
  cm.role,
  cm.content,
  cm.trip_id,
  t.title as trip_title,
  t.guest_id
FROM public.chat_messages cm
JOIN public.trips t ON t.id = cm.trip_id
WHERE t.guest_id IS NOT NULL
ORDER BY cm.created_at DESC
LIMIT 5;

-- 4. Test migration query (this is what the app will run)
-- This should work after RLS fix
SELECT 
  'Migration test successful' as status,
  COUNT(*) as guest_trips_count
FROM public.trips 
WHERE guest_id IS NOT NULL;
