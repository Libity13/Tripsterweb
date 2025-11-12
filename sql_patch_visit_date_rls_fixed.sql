-- SQL Patch สำหรับ visit_date และ RLS
-- รันใน Supabase SQL Editor

-- 1) เพิ่มคอลัมน์วันที่ในทริปต่อจุดหมาย (ถ้ายังไม่มี)
-- ตรวจสอบว่าคอลัมน์ visit_date มีอยู่แล้วหรือไม่
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'destinations' 
    AND column_name = 'visit_date'
  ) THEN
    ALTER TABLE public.destinations ADD COLUMN visit_date INTEGER NOT NULL DEFAULT 1;
  END IF;
END$$;

-- 1.1) ถ้า visit_date เป็น date ให้แปลงเป็น integer (day number)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'destinations' 
    AND column_name = 'visit_date'
    AND data_type = 'date'
  ) THEN
    -- เพิ่มคอลัมน์ใหม่สำหรับ day number
    ALTER TABLE public.destinations ADD COLUMN IF NOT EXISTS visit_day INTEGER;
    
    -- คำนวณ day number จาก visit_date (จัดการ NULL values)
    UPDATE public.destinations 
    SET visit_day = CASE 
      WHEN visit_date IS NOT NULL THEN EXTRACT(DAY FROM visit_date)::INTEGER
      ELSE 1
    END
    WHERE visit_day IS NULL;
    
    -- ลบคอลัมน์ visit_date เดิมและเปลี่ยนชื่อ visit_day เป็น visit_date
    ALTER TABLE public.destinations DROP COLUMN IF EXISTS visit_date;
    ALTER TABLE public.destinations RENAME COLUMN visit_day TO visit_date;
    
    -- อัปเดตค่า NULL เป็น 1 ก่อนตั้ง NOT NULL
    UPDATE public.destinations SET visit_date = 1 WHERE visit_date IS NULL;
    
    ALTER TABLE public.destinations ALTER COLUMN visit_date SET NOT NULL;
    ALTER TABLE public.destinations ALTER COLUMN visit_date SET DEFAULT 1;
  END IF;
END$$;

-- 1.2) ถ้า visit_date เป็น integer แต่มี NULL values ให้แก้ไข
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

-- 2) Trigger: กำหนด order_index = max+1 ภายใน (trip_id, visit_date)
CREATE OR REPLACE FUNCTION public.destinations_set_order_per_day()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.order_index IS NULL THEN
    SELECT COALESCE(MAX(order_index), 0) + 1 INTO NEW.order_index
    FROM public.destinations
    WHERE trip_id = NEW.trip_id AND visit_date = NEW.visit_date;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_destinations_set_order_per_day ON public.destinations;
CREATE TRIGGER trg_destinations_set_order_per_day
BEFORE INSERT ON public.destinations
FOR EACH ROW EXECUTE FUNCTION public.destinations_set_order_per_day();

-- 3) ดัชนีช่วยเรียงและค้นต่อวัน
CREATE INDEX IF NOT EXISTS idx_destinations_trip_date
  ON public.destinations (trip_id, visit_date, order_index);

CREATE INDEX IF NOT EXISTS idx_destinations_trip_name
  ON public.destinations (trip_id, name);

-- 4) Backfill (ถ้าข้อมูลเก่าเคยไม่มี visit_date/order ต่อวัน)
-- จะกำหนด visit_date=1 และรีเซ็ต order_index ต่อวันตาม created_at
WITH ranked AS (
  SELECT id,
         COALESCE(visit_date, 1) AS vdate,
         ROW_NUMBER() OVER (PARTITION BY trip_id, COALESCE(visit_date,1)
                            ORDER BY created_at, id) AS rn
  FROM public.destinations
)
UPDATE public.destinations d
SET visit_date = r.vdate,
    order_index = r.rn
FROM ranked r
WHERE d.id = r.id;

-- 5) แก้ไขข้อมูลซ้ำใน order_index ก่อนสร้าง unique index
-- หาและแก้ไข order_index ที่ซ้ำกัน
WITH duplicates AS (
  SELECT id, trip_id, visit_date, order_index, 
         ROW_NUMBER() OVER (PARTITION BY trip_id, visit_date, order_index ORDER BY created_at, id) as rn
  FROM public.destinations
),
fixed_orders AS (
  SELECT d.id, d.trip_id, d.visit_date, d.order_index,
         CASE 
           WHEN dup.rn > 1 THEN 
             (SELECT COALESCE(MAX(order_index), 0) + dup.rn 
              FROM public.destinations d2 
              WHERE d2.trip_id = d.trip_id AND d2.visit_date = d.visit_date)
           ELSE d.order_index
         END as new_order_index
  FROM public.destinations d
  JOIN duplicates dup ON d.id = dup.id
)
UPDATE public.destinations d
SET order_index = fo.new_order_index
FROM fixed_orders fo
WHERE d.id = fo.id AND fo.new_order_index != d.order_index;

-- 6) สร้าง unique index หลังจากแก้ไขข้อมูลซ้ำแล้ว
CREATE UNIQUE INDEX IF NOT EXISTS uniq_destinations_trip_date_order
ON public.destinations (trip_id, visit_date, order_index);

-- 7) RLS ใหม่สำหรับแชร์แบบอ่านอย่างเดียว
--    (ลบของเดิมที่ "Allow all operations ..." ออกก่อน)
DROP POLICY IF EXISTS "Allow all operations on trips" ON public.trips;
DROP POLICY IF EXISTS "Allow all operations on destinations" ON public.destinations;
DROP POLICY IF EXISTS "Allow all operations on chat messages" ON public.chat_messages;

-- Trips: อ่านได้ถ้าเป็นเจ้าของ หรือ is_public = true
CREATE POLICY "Trips: owner read"
ON public.trips FOR SELECT
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Trips: public read"
ON public.trips FOR SELECT
USING (is_public = true);

-- แก้ไข/ลบ/เพิ่มเฉพาะเจ้าของ
CREATE POLICY "Trips: owner write"
ON public.trips FOR ALL
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id)
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Destinations: อ่านได้ถ้า trip เป็นสาธารณะ หรือเป็นเจ้าของทริป
CREATE POLICY "Destinations: owner read"
ON public.destinations FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.trips t
  WHERE t.id = trip_id AND auth.uid() = t.user_id
));

CREATE POLICY "Destinations: public read"
ON public.destinations FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.trips t
  WHERE t.id = trip_id AND t.is_public = true
));

-- เขียน/ลบได้เฉพาะเจ้าของทริป
CREATE POLICY "Destinations: owner write"
ON public.destinations FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.trips t
  WHERE t.id = trip_id AND auth.uid() = t.user_id
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.trips t
  WHERE t.id = trip_id AND auth.uid() = t.user_id
));

-- Chat messages: ให้เฉพาะเจ้าของ (ไม่จำเป็นต้อง public)
CREATE POLICY "Chat: owner read"
ON public.chat_messages FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.trips t
  WHERE t.id = trip_id AND auth.uid() = t.user_id
));

CREATE POLICY "Chat: owner write"
ON public.chat_messages FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.trips t
  WHERE t.id = trip_id AND auth.uid() = t.user_id
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.trips t
  WHERE t.id = trip_id AND auth.uid() = t.user_id
));
