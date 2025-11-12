-- SQL Patch แก้ไขข้อมูลซ้ำใน order_index ก่อนสร้าง unique index
-- รันใน Supabase SQL Editor

-- 1) ตรวจสอบข้อมูลซ้ำ
SELECT trip_id, visit_date, order_index, COUNT(*) as count
FROM public.destinations
GROUP BY trip_id, visit_date, order_index
HAVING COUNT(*) > 1
ORDER BY count DESC;

-- 2) แก้ไขข้อมูลซ้ำใน order_index
WITH duplicates AS (
  SELECT trip_id, visit_date, order_index, 
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

-- 3) ตรวจสอบว่าข้อมูลซ้ำหายไปแล้ว
SELECT trip_id, visit_date, order_index, COUNT(*) as count
FROM public.destinations
GROUP BY trip_id, visit_date, order_index
HAVING COUNT(*) > 1
ORDER BY count DESC;

-- 4) สร้าง unique index หลังจากแก้ไขข้อมูลซ้ำแล้ว
CREATE UNIQUE INDEX IF NOT EXISTS uniq_destinations_trip_date_order
ON public.destinations (trip_id, visit_date, order_index);