// Environment Configuration
export const config = {
  // Supabase Configuration
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL || '',
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  },
  
  // API Keys
  apiKeys: {
    googlePlaces: import.meta.env.VITE_GOOGLE_PLACES_API_KEY || '',
    googleMaps: import.meta.env.VITE_GOOGLE_MAP_API_KEY || '',
    mapbox: import.meta.env.VITE_MAPBOX_TOKEN || '',
  },
  
  // Development Settings
  development: {
    useMockAi: import.meta.env.VITE_USE_MOCK_AI === 'true', // ใช้ Environment Variable
    debugMode: import.meta.env.DEV,
  },
  
  // Edge Functions URLs
  edgeFunctions: {
    aiChat: 'https://xgzuyyknptpnwslsslcz.supabase.co/functions/v1/ai-chat',
    googlePlaces: 'https://xgzuyyknptpnwslsslcz.supabase.co/functions/v1/google-places',
  },
  
  // Feature Flags
  features: {
    realTimeUpdates: true,
    dragAndDrop: true,
    mapIntegration: true,
    aiChat: true,
  }
};

// Helper functions
export const isDevelopment = () => config.development.debugMode;
export const useMockAi = () => config.development.useMockAi;
export const hasSupabase = () => !!(config.supabase.url && config.supabase.anonKey);
export const hasMapbox = () => !!config.apiKeys.mapbox;
export const hasGooglePlaces = () => !!config.apiKeys.googlePlaces;
