# Environment Setup Guide

## 1. สร้างไฟล์ `.env.local` ใน root directory

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://apbkobhfnmcqqzqeeqss.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Database Connection String (for reference)
# postgresql://postgres:[YOUR-PASSWORD]@db.apbkobhfnmcqqzqeeqss.supabase.co:5432/postgres

# API Keys (set these in Supabase Dashboard > Settings > API)
# OPENAI_API_KEY=your_openai_api_key_here
# GEMINI_API_KEY=your_gemini_api_key_here
# GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here

# Development Settings
VITE_USE_MOCK_AI=false
VITE_DEBUG_MODE=true
```

## 2. ตั้งค่า Supabase Secrets

ใน Supabase Dashboard > Settings > API > Secrets:

```
OPENAI_API_KEY=your_openai_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

## 3. ตรวจสอบการเชื่อมต่อ

รันคำสั่งนี้เพื่อทดสอบการเชื่อมต่อ:

```bash
npm run dev
```

## 4. Database Connection String

สำหรับการเชื่อมต่อโดยตรงกับ PostgreSQL:

```
postgresql://postgres:[YOUR-PASSWORD]@db.apbkobhfnmcqqzqeeqss.supabase.co:5432/postgres
```

**หมายเหตุ:** 
- `[YOUR-PASSWORD]` = รหัสผ่านที่คุณตั้งไว้ใน Supabase
- ใช้สำหรับการเชื่อมต่อโดยตรงกับ Database (ไม่จำเป็นสำหรับ Frontend)
- Frontend ใช้ Supabase Client ที่ตั้งค่าใน `.env.local`
