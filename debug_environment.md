# 🚨 Debug Environment Variables

## **ปัญหาที่พบ:**
Environment Variables ไม่ได้ถูกตั้งค่า ทำให้ระบบไม่สามารถเชื่อมต่อกับ Supabase ได้

## **การแก้ไข:**

### **1. สร้างไฟล์ `.env.local` ใน root directory:**

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://xgzuyyknptpnwslsslcz.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Development Settings
VITE_USE_MOCK_AI=false
VITE_DEBUG_MODE=true
```

### **2. ตรวจสอบ Supabase URL และ ANON KEY:**

1. ไปที่ **Supabase Dashboard** > **Settings** > **API**
2. คัดลอก:
   - **URL**: `https://xgzuyyknptpnwslsslcz.supabase.co`
   - **anon public**: `eyJ...` (คีย์ยาวๆ)

### **3. ตั้งค่า Supabase Secrets:**

ใน **Supabase Dashboard** > **Settings** > **API** > **Secrets**:

```
OPENAI_API_KEY=your_openai_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

### **4. ทดสอบการเชื่อมต่อ:**

```bash
npm run dev
```

## **🔍 ตรวจสอบปัญหา:**

### **ถ้า Environment Variables ไม่ทำงาน:**
1. ตรวจสอบไฟล์ `.env.local` อยู่ใน root directory
2. ตรวจสอบชื่อตัวแปรถูกต้อง (VITE_)
3. Restart development server
4. ตรวจสอบ Supabase URL และ ANON KEY

### **ถ้า Database ไม่บันทึกข้อมูล:**
1. ตรวจสอบ RLS Policies
2. ตรวจสอบ Edge Functions
3. ตรวจสอบ API Keys ใน Supabase Secrets

## **📋 ขั้นตอนต่อไป:**

1. ✅ สร้างไฟล์ `.env.local`
2. ✅ ตั้งค่า Supabase Secrets
3. ✅ ทดสอบการเชื่อมต่อ
4. ✅ ตรวจสอบข้อมูลใน Database
