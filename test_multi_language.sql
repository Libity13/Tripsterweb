-- ============================================
-- 🧪 ทดสอบ Multi-language Support
-- ============================================

-- 1. ตรวจสอบข้อความภาษาไทย
SELECT 
  id,
  content,
  language,
  role,
  created_at
FROM public.chat_messages 
WHERE language = 'th'
ORDER BY created_at DESC 
LIMIT 5;

-- 2. ตรวจสอบข้อความภาษาอังกฤษ
SELECT 
  id,
  content,
  language,
  role,
  created_at
FROM public.chat_messages 
WHERE language = 'en'
ORDER BY created_at DESC 
LIMIT 5;

-- 3. ตรวจสอบสถิติภาษา
SELECT 
  language,
  COUNT(*) as message_count,
  COUNT(CASE WHEN role = 'user' THEN 1 END) as user_messages,
  COUNT(CASE WHEN role = 'assistant' THEN 1 END) as assistant_messages
FROM public.chat_messages 
GROUP BY language
ORDER BY message_count DESC;

-- 4. ตรวจสอบ metadata
SELECT 
  id,
  content,
  language,
  metadata,
  created_at
FROM public.chat_messages 
WHERE metadata IS NOT NULL
ORDER BY created_at DESC 
LIMIT 3;
