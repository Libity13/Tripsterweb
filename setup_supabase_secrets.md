# 🔧 Setup Supabase Secrets

## 📋 **Environment Variables ที่ต้องตั้งค่า:**

### **1. ไปที่ Supabase Dashboard:**
- URL: https://supabase.com/dashboard/project/xgzuyyknptpnwslsslcz/settings/functions

### **2. เพิ่ม Secrets:**

#### **OpenAI API:**
```
OPENAI_API_KEY = sk-... (API Key จาก OpenAI)
```

#### **Google AI (Gemini):**
```
GEMINI_API_KEY = AIza... (API Key จาก Google AI)
GEMINI_MODEL = gemini-1.5-flash
```

#### **Google Places:**
```
PLACES_API_KEY = AIza... (API Key จาก Google Places)
```

### **3. วิธีเพิ่ม Secrets:**
1. ไปที่ **Settings** → **Functions**
2. คลิก **Add new secret**
3. ใส่ **Name** และ **Value**
4. คลิก **Save**

## ✅ **ตรวจสอบ Secrets:**
```bash
# ตรวจสอบว่า secrets ถูกตั้งค่าแล้ว
npx supabase secrets list
```

## 🚀 **Deploy Edge Functions:**
```bash
# Deploy AI Chat Function
npx supabase functions deploy ai-chat

# Deploy Google Places Function  
npx supabase functions deploy google-places
```

## 🔍 **ทดสอบ Edge Functions:**
```bash
# Test AI Chat
curl -X POST https://xgzuyyknptpnwslsslcz.supabase.co/functions/v1/ai-chat \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"message": "สวัสดี"}'

# Test Google Places
curl -X POST https://xgzuyyknptpnwslsslcz.supabase.co/functions/v1/google-places \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query": "วัดโพธิ์"}'
```
