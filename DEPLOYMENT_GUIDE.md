# 🚀 Deployment Guide - Journey App

## 📋 Overview

คู่มือนี้จะแนะนำการ deploy Edge Functions และตั้งค่า environment variables ให้ถูกต้อง

---

## ✅ Prerequisites

ก่อน deploy ต้องมีสิ่งเหล่านี้:

- [x] Supabase CLI installed (`npm install -g supabase`)
- [x] Supabase account และ project
- [x] Git repository
- [x] API Keys:
  - Google Maps API Key
  - Google Places API Key  
  - Claude API Key
  - OpenAI API Key (optional)
  - Gemini API Key (optional)

---

## 🔧 Step 1: ตั้งค่า Supabase Environment Variables

### 1.1 เข้า Supabase Dashboard

1. ไปที่: https://supabase.com/dashboard
2. เลือก Project: `xgzuyyknptpnwslsslcz`
3. ไปที่: **Settings → Edge Functions → Environment Variables**

### 1.2 เพิ่ม Environment Variables

กด **"Add new secret"** และเพิ่มตัวแปรเหล่านี้:

```env
# CORS Configuration
ALLOWED_ORIGINS=http://localhost:8081,http://localhost:5173,http://localhost:3000,https://yourdomain.com

# Google APIs
GOOGLE_MAPS_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXX
GOOGLE_PLACES_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXX

# AI APIs
ANTHROPIC_API_KEY=sk-ant-api03-XXXXXXXXXXXXXXXXXXXX
OPENAI_API_KEY=sk-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
GEMINI_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXX

# App Configuration
DEFAULT_LANGUAGE=th
DEFAULT_GEO_REGION=th
```

⚠️ **สำคัญ**: หลังเพิ่ม environment variables แล้ว ต้อง **deploy Edge Functions ใหม่** จึงจะมีผล!

---

## 📦 Step 2: Deploy Edge Functions

### 2.1 Login to Supabase CLI

```bash
# Login (ถ้ายังไม่ได้ login)
npx supabase login

# Link project
npx supabase link --project-ref xgzuyyknptpnwslsslcz
```

### 2.2 Deploy All Functions

```bash
# เข้า functions directory
cd supabase/functions

# Deploy ทั้งหมด
npx supabase functions deploy

# หรือ deploy ทีละตัว
npx supabase functions deploy ai-chat
npx supabase functions deploy google-places
npx supabase functions deploy google-directions
```

### 2.3 ตรวจสอบว่า Deploy สำเร็จ

```bash
# List functions
npx supabase functions list

# ควรเห็นอะไรแบบนี้:
# ai-chat (version: 2)
# google-places (version: 1)
# google-directions (version: 1)
```

---

## 🧪 Step 3: ทดสอบการ Deploy

### 3.1 ทดสอบ CORS

```bash
# ใน terminal
curl -I -X OPTIONS https://xgzuyyknptpnwslsslcz.supabase.co/functions/v1/ai-chat

# ควรเห็น headers เหล่านี้:
# access-control-allow-origin: *
# access-control-allow-methods: POST, OPTIONS
# access-control-allow-headers: authorization, x-client-info, apikey, content-type
```

### 3.2 ทดสอบ AI Chat Function

```bash
curl -X POST https://xgzuyyknptpnwslsslcz.supabase.co/functions/v1/ai-chat \
  -H "Content-Type: application/json" \
  -H "apikey: YOUR_SUPABASE_ANON_KEY" \
  -d '{
    "message": "สวัสดี",
    "conversationHistory": [],
    "provider": "claude"
  }'
```

### 3.3 ทดสอบ Google Places Function

```bash
curl -X POST https://xgzuyyknptpnwslsslcz.supabase.co/functions/v1/google-places \
  -H "Content-Type: application/json" \
  -H "apikey: YOUR_SUPABASE_ANON_KEY" \
  -d '{
    "type": "textsearch",
    "q": "คาเฟ่ เชียงใหม่"
  }'
```

---

## 🔍 Step 4: Debugging

### 4.1 ดู Logs

```bash
# ดู logs แบบ real-time
npx supabase functions serve ai-chat --debug

# หรือดูใน Supabase Dashboard
# Settings → Edge Functions → Logs
```

### 4.2 Common Issues

#### ❌ Error: "CORS policy"
```
Problem: Access-Control-Allow-Origin header is missing
Solution: 
1. เช็คว่าตั้งค่า ALLOWED_ORIGINS แล้วหรือยัง
2. Deploy functions ใหม่
3. Clear browser cache
```

#### ❌ Error: "Quota exceeded"
```
Problem: BigQuery quota เต็ม
Solution:
1. รอ 24 ชั่วโมงให้ quota reset
2. ตรวจสอบว่าปิด auto-test functions แล้วหรือยัง
3. ลด API calls ที่ไม่จำเป็น
```

#### ❌ Error: "Missing API key"
```
Problem: Environment variable ไม่ถูกต้อง
Solution:
1. เช็ค Supabase Dashboard → Settings → Edge Functions
2. ตรวจสอบว่าตั้งค่าครบถ้วน
3. Deploy functions ใหม่
```

#### ❌ Error: "Function not found"
```
Problem: Function ยังไม่ถูก deploy
Solution:
npx supabase functions deploy [function-name]
```

---

## 🎯 Step 5: Production Deployment

### 5.1 เตรียมความพร้อม

```bash
# 1. Build project
npm run build

# 2. ตรวจสอบ build output
ls -la dist/

# 3. ทดสอบ production build
npm run preview
```

### 5.2 Deploy Frontend

#### Option A: Vercel
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

#### Option B: Netlify
```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy
netlify deploy --prod
```

### 5.3 Update ALLOWED_ORIGINS

หลัง deploy frontend แล้ว อย่าลืมอัพเดท `ALLOWED_ORIGINS`:

```env
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

แล้ว **deploy Edge Functions ใหม่อีกครั้ง**!

---

## 📊 Step 6: Monitoring

### 6.1 Enable Logging

1. Supabase Dashboard → Settings → API
2. Enable "API Logs"
3. ตั้งค่า log retention (7-30 วัน)

### 6.2 Monitor Usage

1. Dashboard → Settings → Billing
2. ตรวจสอบ:
   - Edge Function Invocations
   - Database Size
   - Storage
   - API Requests

### 6.3 Set Up Alerts (Optional)

1. Dashboard → Settings → Integrations
2. เชื่อมกับ:
   - Slack
   - Discord
   - Email notifications

---

## 🔐 Security Best Practices

### 1. API Keys
- ✅ ใช้ environment variables (ไม่ hardcode)
- ✅ ใช้ Anon Key สำหรับ client-side
- ✅ ใช้ Service Role Key สำหรับ server-side เท่านั้น
- ❌ ไม่ commit API keys ใน Git

### 2. CORS
- ✅ ระบุ origins ที่ชัดเจน (ไม่ใช้ `*` ใน production)
- ✅ ใช้ `Vary: Origin` header
- ✅ Set `Access-Control-Max-Age` เพื่อ cache preflight

### 3. Rate Limiting
- ✅ ใช้ Supabase built-in rate limiting
- ✅ Monitor unusual traffic patterns
- ✅ Block suspicious IPs

### 4. Database Security
- ✅ ใช้ Row Level Security (RLS)
- ✅ Validate input ทุก request
- ✅ ใช้ prepared statements
- ✅ Log sensitive operations

---

## 🔄 Step 7: Rollback Plan

### 7.1 Rollback Edge Functions

```bash
# ดู function versions
npx supabase functions list

# Rollback to previous version
npx supabase functions delete [function-name]
npx supabase functions deploy [function-name]
```

### 7.2 Rollback Frontend

```bash
# Vercel
vercel rollback [deployment-url]

# Netlify
netlify rollback
```

---

## 📋 Deployment Checklist

### Before Deployment
- [ ] ทุก tests ผ่านหมด
- [ ] ไม่มี linter errors
- [ ] ไม่มี TypeScript errors
- [ ] Build สำเร็จ (`npm run build`)
- [ ] Preview build ทำงานถูกต้อง
- [ ] Environment variables ครบถ้วน

### During Deployment
- [ ] Deploy Edge Functions
- [ ] Deploy Frontend
- [ ] Update ALLOWED_ORIGINS
- [ ] Redeploy Edge Functions (หลัง update ALLOWED_ORIGINS)

### After Deployment
- [ ] ทดสอบ CORS
- [ ] ทดสอบ Edge Functions
- [ ] ทดสอบ Frontend features
- [ ] Monitor logs
- [ ] Check usage/quota

---

## 🆘 Support

### Resources
- Supabase Docs: https://supabase.com/docs
- Edge Functions: https://supabase.com/docs/guides/functions
- GitHub Issues: [your-repo]/issues

### Contact
- Email: support@example.com
- Discord: [your-server]
- Slack: [your-workspace]

---

**Last Updated**: 2024-11-24
**Version**: 1.0.0


