-- ============================================
-- 🧪 ทดสอบ Google Places Database Integration
-- ============================================

-- 1. ตรวจสอบ places_cache table
SELECT 
  COUNT(*) as total_places,
  COUNT(DISTINCT place_id) as unique_places,
  MIN(last_updated) as oldest_cache,
  MAX(last_updated) as newest_cache
FROM public.places_cache;

-- 2. ดูข้อมูลสถานที่ล่าสุด
SELECT 
  place_id,
  name,
  formatted_address,
  rating,
  last_updated
FROM public.places_cache 
ORDER BY last_updated DESC 
LIMIT 5;

-- 3. ตรวจสอบ chat_messages ที่มี places
SELECT 
  id,
  content,
  language,
  metadata,
  created_at
FROM public.chat_messages 
WHERE metadata->>'intent' = 'search_place'
ORDER BY created_at DESC 
LIMIT 5;

-- 4. ตรวจสอบ error logs
SELECT 
  id,
  content,
  metadata,
  created_at
FROM public.chat_messages 
WHERE metadata->>'intent' = 'fallback_reply'
ORDER BY created_at DESC 
LIMIT 3;
