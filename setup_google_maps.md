# ตั้งค่า Google Maps API

## วิธีตั้งค่า Google Maps API:

### 1. เปิดใช้งาน Google Maps Platform:
- ไปที่ [Google Cloud Console](https://console.cloud.google.com/)
- เลือกโปรเจคของคุณ
- ไปที่ **APIs & Services** → **Library**
- ค้นหา "Maps JavaScript API"
- คลิก **Enable**

### 2. สร้าง API Key:
- ไปที่ **APIs & Services** → **Credentials**
- คลิก **Create Credentials** → **API Key**
- Copy API Key ที่ได้

### 3. ตั้งค่า API Key ใน Environment Variables:
สร้างไฟล์ `.env.local` ในโฟลเดอร์ root:

```env
# Supabase
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Google Maps
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here

# API Keys
VITE_OPENAI_API_KEY=your_openai_api_key
VITE_GEMINI_API_KEY=your_gemini_api_key
VITE_GOOGLE_PLACES_API_KEY=your_google_places_api_key
```

### 4. ตั้งค่า API Restrictions (แนะนำ):
- ไปที่ **APIs & Services** → **Credentials**
- คลิกที่ API Key ของคุณ
- ตั้งค่า **Application restrictions**:
  - เลือก **HTTP referrers (web sites)**
  - เพิ่ม `http://localhost:*` สำหรับ development
  - เพิ่ม domain ของ production site
- ตั้งค่า **API restrictions**:
  - เลือก **Restrict key**
  - เลือก **Maps JavaScript API**
  - เลือก **Places API** (ถ้าใช้)

### 5. Restart Development Server:
```bash
npm run dev
```

## หมายเหตุ:
- Google Maps มี free tier ที่ให้ใช้ได้ 28,000 map loads ต่อเดือน
- สำหรับ development และ testing เพียงพอ
- หากต้องการ production ควรตั้งค่า billing account
