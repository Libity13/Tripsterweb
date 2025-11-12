-- ============================================
-- 🔍 ตรวจสอบข้อมูลใน Database
-- ============================================

-- 1. ตรวจสอบ chat_messages
SELECT 
  id,
  role,
  content,
  language,
  created_at,
  trip_id,
  user_id
FROM public.chat_messages 
ORDER BY created_at DESC 
LIMIT 10;

-- 2. ตรวจสอบ places_cache
SELECT 
  place_id,
  name,
  formatted_address,
  latitude,
  longitude,
  last_updated
FROM public.places_cache 
ORDER BY last_updated DESC 
LIMIT 10;

-- 3. ตรวจสอบ trips
SELECT 
  id,
  title,
  language,
  created_at,
  user_id
FROM public.trips 
ORDER BY created_at DESC 
LIMIT 5;

-- 4. ตรวจสอบ destinations
SELECT 
  id,
  name,
  trip_id,
  order_index,
  created_at
FROM public.destinations 
ORDER BY created_at DESC 
LIMIT 5;

-- 5. ตรวจสอบ chat_sessions
SELECT 
  id,
  user_id,
  trip_id,
  created_at
FROM public.chat_sessions 
ORDER BY created_at DESC 
LIMIT 5;
