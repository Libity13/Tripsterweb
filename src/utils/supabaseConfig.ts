// Configuration Helper - Get Supabase credentials
export const getSupabaseConfig = () => {
  // Try environment variables first
  const envUrl = import.meta.env.VITE_SUPABASE_URL;
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  if (envUrl && envKey) {
    return {
      url: envUrl,
      anonKey: envKey,
      source: 'environment'
    };
  }
  
  // Fallback to hardcoded values
  return {
    url: 'https://xgzuyyknptpnwslsslcz.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhnenV5eWtucHRwbndzbHNzbGN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzAwNzQyMjUsImV4cCI6MjA0NTY1MDIyNX0.ID_kgh...',
    source: 'fallback'
  };
};

// Test Supabase connection
export const testSupabaseConnection = async () => {
  try {
    const config = getSupabaseConfig();
    console.log(`🔧 Using Supabase config from: ${config.source}`);
    
    const response = await fetch(`${config.url}/rest/v1/`, {
      headers: {
        'apikey': config.anonKey,
        'Authorization': `Bearer ${config.anonKey}`
      }
    });
    
    if (response.ok) {
      console.log('✅ Supabase connection successful');
      return true;
    } else {
      console.error('❌ Supabase connection failed:', response.status);
      return false;
    }
  } catch (error) {
    console.error('❌ Supabase connection error:', error);
    return false;
  }
};
