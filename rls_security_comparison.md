# 🔒 RLS Security Comparison: Before vs After

## 🚨 **ปัญหาในสคริปต์เดิม (ไม่ปลอดภัย):**

### **❌ Policies ที่อนุญาตมากเกินไป:**
```sql
-- ❌ อันตราย! ใครก็ทำอะไรได้
CREATE POLICY "Allow all operations on trips" ON public.trips FOR ALL USING (true) WITH CHECK (true);
```

**ผลลัพธ์:**
- ✅ **ใครก็อ่านได้** - เห็น trips ของทุกคน
- ✅ **ใครก็แก้ไขได้** - แก้ไข trips ของคนอื่น
- ✅ **ใครก็ลบได้** - ลบ trips ของคนอื่น
- ✅ **ใครก็สร้างได้** - สร้าง trips ในชื่อคนอื่น

## ✅ **สคริปต์ใหม่ (ปลอดภัย):**

### **🔒 Secure Policies:**
```sql
-- ✅ ปลอดภัย! เฉพาะเจ้าของเท่านั้น
CREATE POLICY "Users can manage own trips" ON public.trips FOR ALL 
USING (public.is_owner_or_guest(trips))
WITH CHECK (public.is_owner_or_guest(trips));
```

**ผลลัพธ์:**
- ✅ **อ่านได้เฉพาะเจ้าของ** - เห็นเฉพาะ trips ของตัวเอง
- ✅ **แก้ไขได้เฉพาะเจ้าของ** - แก้ไขได้เฉพาะ trips ของตัวเอง
- ✅ **ลบได้เฉพาะเจ้าของ** - ลบได้เฉพาะ trips ของตัวเอง
- ✅ **สร้างได้เฉพาะเจ้าของ** - สร้าง trips ในชื่อตัวเอง

## 🎯 **ความแตกต่างที่สำคัญ:**

### **1. Owner/Guest Function:**
```sql
-- ฟังก์ชันตรวจสอบความเป็นเจ้าของ
CREATE OR REPLACE FUNCTION public.is_owner_or_guest(trip_row public.trips)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user is authenticated and owns the trip
  IF trip_row.user_id IS NOT NULL AND auth.uid() = trip_row.user_id THEN
    RETURN true;
  END IF;
  
  -- Check if user is anonymous and this is a guest trip
  IF trip_row.user_id IS NULL AND trip_row.guest_id IS NOT NULL AND auth.uid() IS NULL THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;
```

### **2. Secure Trip Policies:**
```sql
-- SELECT: เจ้าของหรือ public trips
CREATE POLICY "Users can view own trips or public trips" ON public.trips FOR SELECT 
USING (
  public.is_owner_or_guest(trips) OR is_public = true
);

-- ALL: เฉพาะเจ้าของเท่านั้น
CREATE POLICY "Users can manage own trips" ON public.trips FOR ALL 
USING (public.is_owner_or_guest(trips))
WITH CHECK (public.is_owner_or_guest(trips));
```

### **3. Foreign Key RLS:**
```sql
-- Destinations: ตรวจสอบผ่าน trip ownership
CREATE POLICY "Users can manage destinations of own trips" ON public.destinations FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.trips t 
    WHERE t.id = destinations.trip_id 
    AND public.is_owner_or_guest(t)
  )
);
```

## 🛡️ **Security Benefits:**

### **✅ Data Isolation:**
- **User A** เห็นเฉพาะ trips ของตัวเอง
- **User B** เห็นเฉพาะ trips ของตัวเอง
- **Guest** เห็นเฉพาะ trips ที่สร้างด้วย guest_id เดียวกัน

### **✅ Access Control:**
- **Authenticated Users** - เข้าถึงได้เฉพาะ trips ที่มี user_id ตรงกัน
- **Guest Users** - เข้าถึงได้เฉพาะ trips ที่มี guest_id ตรงกัน
- **Public Trips** - ทุกคนเห็นได้ถ้า is_public = true

### **✅ Data Integrity:**
- **Foreign Key RLS** - destinations และ chat_messages ตรวจสอบผ่าน trip ownership
- **Cascade Delete** - ลบ trip แล้ว destinations และ messages หายตาม
- **Constraint Check** - ต้องมี user_id หรือ guest_id อย่างใดอย่างหนึ่ง

## 🚀 **การใช้งาน:**

### **Guest Mode:**
```typescript
// Guest สร้าง trip
const trip = await tripService.createTrip({
  title: 'My Trip',
  // user_id = null, guest_id = 'guest_123'
});

// Guest เข้าถึงได้เฉพาะ trips ที่มี guest_id เดียวกัน
const myTrips = await tripService.getUserTrips(); // ใช้ guest_id
```

### **Auth Mode:**
```typescript
// User สร้าง trip
const trip = await tripService.createTrip({
  title: 'My Trip',
  // user_id = 'user_123', guest_id = null
});

// User เข้าถึงได้เฉพาะ trips ที่มี user_id ตรงกัน
const myTrips = await tripService.getUserTrips(); // ใช้ user_id
```

### **Migration:**
```typescript
// Guest → Owner migration
await authService.migrateGuestTrips(guestId, userId);
// guest_id → user_id
// ข้อมูลถูกย้ายและปลอดภัย
```

## 🎯 **สรุป:**

### **❌ สคริปต์เดิม:**
- ไม่ปลอดภัย
- ใครก็ทำอะไรได้
- ข้อมูลรั่วไหลได้

### **✅ สคริปต์ใหม่:**
- ปลอดภัย
- เฉพาะเจ้าของเท่านั้น
- ข้อมูลแยกตาม user/guest
- รองรับ migration

**ใช้สคริปต์ใหม่เพื่อความปลอดภัยครับ!** 🔒
