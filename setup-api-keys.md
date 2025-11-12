# 🔑 API Keys Setup Guide

## Supabase Vault (Secrets)

ไปที่ **Supabase Dashboard** → **Settings** → **Vault** และเพิ่ม secrets:

### **Required API Keys:**
```env
# Google Places API
GOOGLE_PLACES_API_KEY=your-google-places-api-key

# OpenAI/Gemini API  
GEMINI_API_KEY=your-gemini-api-key

# Mapbox (Optional)
MAPBOX_ACCESS_TOKEN=your-mapbox-token
```

### **How to get API Keys:**

#### **Google Places API:**
1. ไปที่ [Google Cloud Console](https://console.cloud.google.com/)
2. สร้าง project ใหม่หรือเลือก project
3. เปิดใช้งาน **Places API**
4. สร้าง **API Key**
5. ตั้งค่า restrictions (optional)

#### **Gemini API:**
1. ไปที่ [Google AI Studio](https://aistudio.google.com/)
2. สร้าง API key
3. ตั้งค่า quota (optional)

#### **Mapbox (Optional):**
1. ไปที่ [Mapbox](https://www.mapbox.com/)
2. สร้าง account
3. สร้าง access token
