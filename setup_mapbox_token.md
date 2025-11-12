# ตั้งค่า Mapbox Token

## วิธีตั้งค่า Mapbox Token:

### 1. สมัครสมาชิก Mapbox:
- ไปที่ [mapbox.com](https://mapbox.com)
- สมัครสมาชิก (ฟรี)
- เข้าสู่ระบบ

### 2. สร้าง Access Token:
- ไปที่ [Account → Access Tokens](https://account.mapbox.com/access-tokens/)
- คลิก "Create a token"
- ตั้งชื่อ token (เช่น "TravelMate AI")
- เลือก scopes: `styles:read`, `fonts:read`, `datasets:read`
- คลิก "Create token"
- Copy token ที่ได้

### 3. ตั้งค่าใน Environment Variables:
สร้างไฟล์ `.env.local` ในโฟลเดอร์ root:

```env
# Supabase
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Mapbox
VITE_MAPBOX_TOKEN=your_mapbox_token_here

# API Keys
VITE_OPENAI_API_KEY=your_openai_api_key
VITE_GEMINI_API_KEY=your_gemini_api_key
VITE_GOOGLE_PLACES_API_KEY=your_google_places_api_key
```

### 4. Restart Development Server:
```bash
npm run dev
```

## หมายเหตุ:
- Mapbox มี free tier ที่ให้ใช้ได้ 50,000 map loads ต่อเดือน
- สำหรับ development และ testing เพียงพอ
- หากต้องการ production ควร upgrade plan
