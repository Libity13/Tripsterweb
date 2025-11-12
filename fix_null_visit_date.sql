-- SQL Patch แก้ไข NULL values ใน visit_date ก่อน
-- รันใน Supabase SQL Editor

-- 1) ตรวจสอบข้อมูล NULL ใน visit_date
SELECT COUNT(*) as null_count
FROM public.destinations 
WHERE visit_date IS NULL;

-- 2) แก้ไข NULL values ใน visit_date
-- ถ้า visit_date เป็น date
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'destinations' 
    AND column_name = 'visit_date'
    AND data_type = 'date'
  ) THEN
    -- อัปเดตค่า NULL เป็นวันที่ปัจจุบัน
    UPDATE public.destinations 
    SET visit_date = CURRENT_DATE 
    WHERE visit_date IS NULL;
    
    -- เพิ่มคอลัมน์ใหม่สำหรับ day number
    ALTER TABLE public.destinations ADD COLUMN IF NOT EXISTS visit_day INTEGER;
    
    -- คำนวณ day number จาก visit_date
    UPDATE public.destinations 
    SET visit_day = EXTRACT(DAY FROM visit_date)::INTEGER
    WHERE visit_day IS NULL;
    
    -- ลบคอลัมน์ visit_date เดิมและเปลี่ยนชื่อ visit_day เป็น visit_date
    ALTER TABLE public.destinations DROP COLUMN IF EXISTS visit_date;
    ALTER TABLE public.destinations RENAME COLUMN visit_day TO visit_date;
    ALTER TABLE public.destinations ALTER COLUMN visit_date SET NOT NULL;
    ALTER TABLE public.destinations ALTER COLUMN visit_date SET DEFAULT 1;
  END IF;
END$$;

-- ถ้า visit_date เป็น integer
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'destinations' 
    AND column_name = 'visit_date'
    AND data_type = 'integer'
  ) THEN
    -- อัปเดตค่า NULL เป็น 1
    UPDATE public.destinations SET visit_date = 1 WHERE visit_date IS NULL;
    
    -- ตั้ง NOT NULL และ DEFAULT
    ALTER TABLE public.destinations ALTER COLUMN visit_date SET NOT NULL;
    ALTER TABLE public.destinations ALTER COLUMN visit_date SET DEFAULT 1;
  END IF;
END$$;

-- 3) ตรวจสอบว่าข้อมูล NULL หายไปแล้ว
SELECT COUNT(*) as null_count
FROM public.destinations 
WHERE visit_date IS NULL;

-- 4) ตรวจสอบข้อมูลทั้งหมด
SELECT visit_date, COUNT(*) as count
FROM public.destinations 
GROUP BY visit_date
ORDER BY visit_date;
