-- ============================================
-- 🧪 Verify Full Integration
-- ============================================

-- 1. ตรวจสอบ chat_messages
SELECT 
  COUNT(*) as total_messages,
  COUNT(DISTINCT role) as unique_roles,
  COUNT(CASE WHEN language = 'th' THEN 1 END) as thai_messages,
  COUNT(CASE WHEN language = 'en' THEN 1 END) as english_messages,
  MIN(created_at) as oldest_message,
  MAX(created_at) as newest_message
FROM public.chat_messages;

-- 2. ดูข้อความล่าสุด
SELECT 
  id,
  role,
  content,
  language,
  trip_id,
  user_id,
  session_id,
  created_at
FROM public.chat_messages 
ORDER BY created_at DESC 
LIMIT 5;

-- 3. ตรวจสอบ places_cache
SELECT 
  COUNT(*) as total_places,
  COUNT(DISTINCT place_id) as unique_places,
  MIN(last_updated) as oldest_cache,
  MAX(last_updated) as newest_cache
FROM public.places_cache;

-- 4. ดูสถานที่ล่าสุด
SELECT 
  place_id,
  name,
  formatted_address,
  rating,
  last_updated
FROM public.places_cache 
ORDER BY last_updated DESC 
LIMIT 5;

-- 5. ตรวจสอบ metadata ใน chat_messages
SELECT 
  id,
  content,
  metadata,
  created_at
FROM public.chat_messages 
WHERE metadata IS NOT NULL
ORDER BY created_at DESC 
LIMIT 3;
