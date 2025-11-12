# 🚨 แก้ไขปัญหา Environment Variables

## **ปัญหาที่พบ:**
1. ❌ Environment Variables ไม่ได้ตั้งค่า
2. ❌ ระบบใช้ Mock AI แทน Real AI
3. ❌ ข้อมูลไม่เข้า Database

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

### **2. ตั้งค่า Supabase Secrets:**

ใน **Supabase Dashboard** > **Settings** > **API** > **Secrets**:

```
OPENAI_API_KEY=your_openai_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

### **3. Restart Development Server:**

```bash
# หยุด server (Ctrl+C)
# แล้วรันใหม่
npm run dev
```

## **🔍 ตรวจสอบการตั้งค่า:**

### **ตรวจสอบ Environment Variables:**
```bash
echo $env:VITE_SUPABASE_URL
echo $env:VITE_SUPABASE_ANON_KEY
```

### **ตรวจสอบ Console Logs:**
- ควรเห็น: `🚀 Using Real AI Service (OpenAI + Gemini Fallback)`
- ไม่ควรเห็น: `🤖 Using Mock AI Service for development`

## **📋 ขั้นตอนต่อไป:**

1. ✅ สร้างไฟล์ `.env.local`
2. ✅ ตั้งค่า Supabase Secrets
3. ✅ Restart development server
4. ✅ ทดสอบการเชื่อมต่อ
5. ✅ ตรวจสอบข้อมูลใน Database

## **🎯 ผลลัพธ์ที่คาดหวัง:**

- ✅ ระบบใช้ Real AI (OpenAI + Gemini)
- ✅ ข้อมูลบันทึกใน Database
- ✅ AI ตอบคำถามได้จริง
- ✅ Google Places API ทำงาน
