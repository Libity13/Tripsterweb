-- ============================================
-- 🔍 Debug Database Issues
-- ============================================

-- 1. ตรวจสอบ RLS Policies
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
WHERE schemaname = 'public' 
AND tablename IN ('chat_messages', 'places_cache', 'trips', 'destinations')
ORDER BY tablename, policyname;

-- 2. ตรวจสอบ Table Permissions
SELECT 
  table_name,
  privilege_type,
  grantee
FROM information_schema.table_privileges 
WHERE table_schema = 'public' 
AND table_name IN ('chat_messages', 'places_cache', 'trips', 'destinations')
ORDER BY table_name, privilege_type;

-- 3. ตรวจสอบ RLS Status
SELECT 
  schemaname,
  tablename,
  rowsecurity,
  forcerowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('chat_messages', 'places_cache', 'trips', 'destinations');

-- 4. ตรวจสอบ Anonymous User Access
SELECT 
  current_user,
  session_user,
  current_role;

-- 5. ทดสอบ Insert ข้อมูล
INSERT INTO public.chat_messages (
  role,
  content,
  language,
  created_at
) VALUES (
  'user',
  'Test message',
  'th',
  now()
) RETURNING id, created_at;

-- 6. ตรวจสอบข้อมูลที่เพิ่ง Insert
SELECT 
  id,
  role,
  content,
  language,
  created_at
FROM public.chat_messages 
ORDER BY created_at DESC 
LIMIT 5;
