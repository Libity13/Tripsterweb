-- ============================================
-- 🔍 Check PostGIS Status
-- ============================================

-- 1. Check if PostGIS is already installed
SELECT extname, extversion 
FROM pg_extension 
WHERE extname = 'postgis';

-- 2. Check PostGIS functions
SELECT proname 
FROM pg_proc 
WHERE proname LIKE 'ST_%' 
LIMIT 5;

-- 3. Check if geography type exists
SELECT typname 
FROM pg_type 
WHERE typname = 'geography';

-- 4. Test PostGIS function
SELECT ST_AsText(ST_MakePoint(100.5018, 13.7563)) as test_point;

-- 5. Check if tables with geography columns exist
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE data_type = 'USER-DEFINED' 
  AND udt_name = 'geography';
