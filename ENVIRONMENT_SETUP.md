# TripsterC Journey - Environment Setup

## Required Environment Variables

Create a `.env.local` file in the project root with the following variables:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://xgzuyyknptpnwslsslcz.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Google APIs
VITE_GOOGLE_PLACES_API_KEY=your_google_places_api_key_here
VITE_GOOGLE_MAP_API_KEY=your_google_maps_api_key_here

# Mapbox (Optional)
VITE_MAPBOX_TOKEN=your_mapbox_token_here

# Development Settings
VITE_USE_MOCK_AI=false
```

## Supabase Edge Functions

The application uses the following Edge Functions:
- `ai-chat` - AI chat functionality
- `google-places` - Google Places API integration

These are configured in `src/config/environment.ts` and should be deployed to your Supabase project.

## Troubleshooting

### 404 Error on Edge Functions
If you get a 404 error when calling Edge Functions:

1. Check that your Supabase project is running
2. Verify the Edge Functions are deployed
3. Ensure the URLs in `src/config/environment.ts` match your Supabase project URL
4. Check that your `VITE_SUPABASE_ANON_KEY` is correct

### Missing Environment Variables
Make sure all required environment variables are set in your `.env.local` file.
