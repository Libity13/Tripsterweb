-- ============================================
-- 🔧 Fix NOT NULL Constraints
-- ============================================

-- 1. ตรวจสอบ constraints ปัจจุบัน
SELECT 
  table_name,
  column_name,
  is_nullable,
  data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'chat_messages'
ORDER BY ordinal_position;

-- 2. แก้ไข trip_id ให้เป็น nullable
ALTER TABLE public.chat_messages 
ALTER COLUMN trip_id DROP NOT NULL;

-- 3. แก้ไข user_id ให้เป็น nullable
ALTER TABLE public.chat_messages 
ALTER COLUMN user_id DROP NOT NULL;

-- 4. แก้ไข session_id ให้เป็น nullable
ALTER TABLE public.chat_messages 
ALTER COLUMN session_id DROP NOT NULL;

-- 5. ตรวจสอบ constraints ใหม่
SELECT 
  table_name,
  column_name,
  is_nullable,
  data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'chat_messages'
ORDER BY ordinal_position;

-- 6. ทดสอบ insert ข้อมูล
INSERT INTO public.chat_messages (
  role,
  content,
  language,
  created_at
) VALUES (
  'user',
  'Test message after fix',
  'th',
  now()
) RETURNING id, role, content, language, created_at;

-- 7. ตรวจสอบข้อมูลที่เพิ่ง insert
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
LIMIT 3;
