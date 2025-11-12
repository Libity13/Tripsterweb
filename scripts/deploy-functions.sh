#!/bin/bash

# Deploy Supabase Edge Functions
echo "🚀 Deploying Supabase Edge Functions..."

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it first:"
    echo "npm install -g supabase"
    exit 1
fi

# Login to Supabase (if not already logged in)
echo "🔐 Checking Supabase login status..."
supabase status || supabase login

# Link to project
echo "🔗 Linking to project..."
supabase link --project-ref xgzuyyknptpnwslsslcz

# Deploy functions
echo "📦 Deploying ai-chat function..."
supabase functions deploy ai-chat

echo "📦 Deploying google-places function..."
supabase functions deploy google-places

echo "✅ All functions deployed successfully!"
echo ""
echo "🔧 Next steps:"
echo "1. Set up your API keys in Supabase Dashboard:"
echo "   https://supabase.com/dashboard/project/xgzuyyknptpnwslsslcz/settings/functions"
echo ""
echo "2. Add these secrets:"
echo "   - GEMINI_API_KEY (or OPENAI_API_KEY)"
echo "   - GOOGLE_MAPS_API_KEY"
echo ""
echo "3. Test your functions:"
echo "   - AI Chat: https://xgzuyyknptpnwslsslcz.supabase.co/functions/v1/ai-chat"
echo "   - Google Places: https://xgzuyyknptpnwslsslcz.supabase.co/functions/v1/google-places"
