# Supabase Authentication Fix

## Problem
Getting 403 error with "bad_jwt" when accessing Supabase auth endpoints.

## Root Cause
The JWT token in the request is invalid or expired. This can happen when:
1. Environment variables are not set correctly
2. The anon key is incorrect or expired
3. The Supabase project configuration is wrong

## Solution

### 1. Environment Variables
Create a `.env.local` file in the project root:

```bash
VITE_SUPABASE_URL=https://xgzuyyknptpnwslsslcz.supabase.co
VITE_SUPABASE_ANON_KEY=your_actual_anon_key_here
```

### 2. Fallback Configuration
The app now includes fallback configuration in `src/utils/supabaseConfig.ts` that will work even without environment variables.

### 3. Testing Connection
Use the test function to verify Supabase connection:

```typescript
import { testSupabaseConnection } from '@/utils/supabaseConfig';

// Test connection
const isConnected = await testSupabaseConnection();
console.log('Supabase connected:', isConnected);
```

## Verification Steps

1. Check browser console for configuration source
2. Verify no 403 errors in network tab
3. Test basic Supabase operations (auth, database queries)

## Common Issues

- **Wrong anon key**: Make sure you're using the correct anon key from your Supabase project
- **Expired token**: The fallback token might be expired, update it in the config
- **CORS issues**: Ensure your domain is allowed in Supabase settings
