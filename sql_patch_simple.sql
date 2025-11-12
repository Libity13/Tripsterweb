-- SQL Patch สำหรับ visit_date และ RLS (เวอร์ชันง่าย)
-- รันใน Supabase SQL Editor

-- 1) เพิ่มคอลัมน์ visit_date (ถ้ายังไม่มี)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'destinations' 
    AND column_name = 'visit_date'
  ) THEN
    ALTER TABLE public.destinations ADD COLUMN visit_date INTEGER DEFAULT 1;
  END IF;
END$$;

-- 2) แก้ไข NULL values ใน visit_date
UPDATE public.destinations 
SET visit_date = 1 
WHERE visit_date IS NULL;

-- 3) ตั้ง NOT NULL และ DEFAULT
ALTER TABLE public.destinations ALTER COLUMN visit_date SET NOT NULL;
ALTER TABLE public.destinations ALTER COLUMN visit_date SET DEFAULT 1;

-- 4) Trigger: กำหนด order_index = max+1 ภายใน (trip_id, visit_date)
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

-- 5) ดัชนีช่วยเรียงและค้นต่อวัน
CREATE INDEX IF NOT EXISTS idx_destinations_trip_date
  ON public.destinations (trip_id, visit_date, order_index);

CREATE INDEX IF NOT EXISTS idx_destinations_trip_name
  ON public.destinations (trip_id, name);

-- 6) แก้ไขข้อมูลซ้ำใน order_index (วิธีง่าย)
-- หาและแก้ไข order_index ที่ซ้ำกันทีละรายการ
DO $$
DECLARE
  rec RECORD;
  new_order INTEGER;
BEGIN
  FOR rec IN 
    SELECT id, trip_id, visit_date, order_index,
           ROW_NUMBER() OVER (PARTITION BY trip_id, visit_date, order_index ORDER BY created_at, id) as rn
    FROM public.destinations
    WHERE (trip_id, visit_date, order_index) IN (
      SELECT trip_id, visit_date, order_index
      FROM public.destinations
      GROUP BY trip_id, visit_date, order_index
      HAVING COUNT(*) > 1
    )
  LOOP
    IF rec.rn > 1 THEN
      -- หา order_index ใหม่
      SELECT COALESCE(MAX(order_index), 0) + rec.rn INTO new_order
      FROM public.destinations
      WHERE trip_id = rec.trip_id AND visit_date = rec.visit_date;
      
      -- อัปเดต order_index
      UPDATE public.destinations
      SET order_index = new_order
      WHERE id = rec.id;
    END IF;
  END LOOP;
END$$;

-- 7) สร้าง unique index หลังจากแก้ไขข้อมูลซ้ำแล้ว
CREATE UNIQUE INDEX IF NOT EXISTS uniq_destinations_trip_date_order
ON public.destinations (trip_id, visit_date, order_index);

-- 8) RLS ใหม่สำหรับแชร์แบบอ่านอย่างเดียว
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
