-- SQL Patch สำหรับ visit_day และ RLS
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

-- 2) Trigger: กำหนด order_index = max+1 ภายใน (trip_id, visit_day)
CREATE OR REPLACE FUNCTION public.destinations_set_order_per_day()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.order_index IS NULL THEN
    SELECT COALESCE(MAX(order_index), 0) + 1 INTO NEW.order_index
    FROM public.destinations
    WHERE trip_id = NEW.trip_id AND visit_day = NEW.visit_day;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_destinations_set_order_per_day ON public.destinations;
CREATE TRIGGER trg_destinations_set_order_per_day
BEFORE INSERT ON public.destinations
FOR EACH ROW EXECUTE FUNCTION public.destinations_set_order_per_day();

-- 3) ดัชนีช่วยเรียงและค้นต่อวัน
CREATE INDEX IF NOT EXISTS idx_destinations_trip_day
  ON public.destinations (trip_id, visit_day, order_index);

CREATE INDEX IF NOT EXISTS idx_destinations_trip_name
  ON public.destinations (trip_id, name);

-- 4) (แนะนำ) บังคับลำดับภายในวันไม่ซ้ำ
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname='public' AND indexname='uniq_destinations_trip_day_order'
  ) THEN
    EXECUTE 'CREATE UNIQUE INDEX uniq_destinations_trip_day_order
             ON public.destinations (trip_id, visit_day, order_index)';
  END IF;
END$$;

-- 5) Backfill (ถ้าข้อมูลเก่าเคยไม่มี visit_day/order ต่อวัน)
-- จะกำหนด visit_day=1 และรีเซ็ต order_index ต่อวันตาม created_at
WITH ranked AS (
  SELECT id,
         COALESCE(visit_day, 1) AS vday,
         ROW_NUMBER() OVER (PARTITION BY trip_id, COALESCE(visit_day,1)
                            ORDER BY created_at, id) AS rn
  FROM public.destinations
)
UPDATE public.destinations d
SET visit_day = r.vday,
    order_index = r.rn
FROM ranked r
WHERE d.id = r.id;

-- 5.1) แก้ไขข้อมูลซ้ำใน order_index ก่อนสร้าง unique index
-- หาและแก้ไข order_index ที่ซ้ำกัน
WITH duplicates AS (
  SELECT trip_id, visit_day, order_index, 
         ROW_NUMBER() OVER (PARTITION BY trip_id, visit_day, order_index ORDER BY created_at, id) as rn
  FROM public.destinations
),
fixed_orders AS (
  SELECT d.id, d.trip_id, d.visit_day, d.order_index,
         CASE 
           WHEN dup.rn > 1 THEN 
             (SELECT COALESCE(MAX(order_index), 0) + dup.rn 
              FROM public.destinations d2 
              WHERE d2.trip_id = d.trip_id AND d2.visit_day = d.visit_day)
           ELSE d.order_index
         END as new_order_index
  FROM public.destinations d
  JOIN duplicates dup ON d.id = dup.id
)
UPDATE public.destinations d
SET order_index = fo.new_order_index
FROM fixed_orders fo
WHERE d.id = fo.id AND fo.new_order_index != d.order_index;

-- 6) RLS ใหม่สำหรับแชร์แบบอ่านอย่างเดียว
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
