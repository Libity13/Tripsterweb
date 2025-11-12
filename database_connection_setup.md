# Database Connection Setup Guide

## 🎯 **ปัญหาที่พบ:**
ระบบยังไม่สามารถเชื่อมต่อกับ Supabase Database ได้อย่างสมบูรณ์

## 🔧 **การแก้ไข:**

### 1. **ตั้งค่า Environment Variables**

สร้างไฟล์ `.env.local` ใน root directory:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://apbkobhfnmcqqzqeeqss.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Development Settings
VITE_USE_MOCK_AI=false
VITE_DEBUG_MODE=true
```

### 2. **ตั้งค่า Supabase Secrets**

ใน Supabase Dashboard > Settings > API > Secrets:

```
OPENAI_API_KEY=your_openai_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

### 3. **Database Connection String**

สำหรับการเชื่อมต่อโดยตรงกับ PostgreSQL:

```
postgresql://postgres:[YOUR-PASSWORD]@db.apbkobhfnmcqqzqeeqss.supabase.co:5432/postgres
```

**หมายเหตุ:** 
- `[YOUR-PASSWORD]` = รหัสผ่านที่คุณตั้งไว้ใน Supabase
- ใช้สำหรับการเชื่อมต่อโดยตรงกับ Database (ไม่จำเป็นสำหรับ Frontend)
- Frontend ใช้ Supabase Client ที่ตั้งค่าใน `.env.local`

### 4. **ตรวจสอบการตั้งค่า**

1. **ตรวจสอบ Supabase URL:**
   - ไปที่ Supabase Dashboard > Settings > API
   - คัดลอก URL และ ANON KEY

2. **ตรวจสอบ Database:**
   - ไปที่ Supabase Dashboard > Database
   - ตรวจสอบว่ามีตารางที่สร้างไว้แล้ว

3. **ทดสอบการเชื่อมต่อ:**
   ```bash
   npm run dev
   ```

## 🚨 **สิ่งที่ต้องทำ:**

1. **สร้างไฟล์ `.env.local`** พร้อมใส่ Supabase URL และ ANON KEY
2. **ตั้งค่า API Keys** ใน Supabase Secrets
3. **ทดสอบการเชื่อมต่อ** ด้วย `npm run dev`
4. **ตรวจสอบ Database** ว่ามีข้อมูลหรือไม่

## 📋 **ขั้นตอนต่อไป:**

1. ตั้งค่า `.env.local`
2. ตั้งค่า Supabase Secrets
3. ทดสอบการเชื่อมต่อ
4. ตรวจสอบข้อมูลใน Database
