# Supabase Environment Variables Setup

## 🔧 Required Environment Variables

### 1. Supabase Dashboard Setup
Go to: https://supabase.com/dashboard/project/xgzuyyknptpnwslsslcz/settings/functions

### 2. Add these secrets:

```env
# Supabase (Required)
SUPABASE_URL=https://xgzuyyknptpnwslsslcz.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# AI Provider (Choose one)
GEMINI_API_KEY=your-gemini-api-key-here
# OPENAI_API_KEY=your-openai-api-key-here

# Google Maps (Required for google-places function)
GOOGLE_MAPS_API_KEY=your-google-maps-api-key-here
```

### 3. How to get API Keys:

#### Supabase Keys:
1. Go to Project Settings → API
2. Copy "anon public" key
3. Copy "service_role" key (keep this secret!)

#### Gemini API Key:
1. Go to https://makersuite.google.com/app/apikey
2. Create new API key
3. Copy the key

#### Google Maps API Key:
1. Go to https://console.cloud.google.com/
2. Enable Places API and Maps API
3. Create API key
4. Copy the key

## 🚀 Deploy Commands

```bash
# Install Supabase CLI (if not installed)
npm install -g supabase

# Login to Supabase
supabase login

# Link to project
supabase link --project-ref xgzuyyknptpnwslsslcz

# Deploy functions
supabase functions deploy ai-chat
supabase functions deploy google-places
```

## 🧪 Test Functions

### Test AI Chat:
```bash
curl -X POST https://xgzuyyknptpnwslsslcz.supabase.co/functions/v1/ai-chat \
  -H "Content-Type: application/json" \
  -d '{"message": "สวัสดี", "provider": "gemini"}'
```

### Test Google Places:
```bash
curl -X POST https://xgzuyyknptpnwslsslcz.supabase.co/functions/v1/google-places \
  -H "Content-Type: application/json" \
  -d '{"q": "วัดโพธิ์ กรุงเทพ", "type": "textsearch"}'
```

## 🔄 Development Mode

To use mock AI instead of real AI, set in your `.env.local`:
```env
VITE_USE_MOCK_AI=true
```

This will use the mock AI service for development.
