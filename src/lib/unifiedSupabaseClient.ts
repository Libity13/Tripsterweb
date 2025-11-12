// Unified Supabase Client - Single source of truth
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { getSupabaseConfig } from '@/utils/supabaseConfig';

// Get configuration
const config = getSupabaseConfig();
console.log(`🔧 Supabase config source: ${config.source}`);

// Create unified client with proper configuration
export const supabase = createClient<Database>(config.url, config.anonKey, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Export types for consistency
export type { Database } from '@/integrations/supabase/types';
