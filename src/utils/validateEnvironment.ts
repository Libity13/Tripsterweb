// Environment validation utility
export const validateSupabaseConfig = () => {
  const requiredVars = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY'
  ];

  const missing = requiredVars.filter(varName => !import.meta.env[varName]);
  
  if (missing.length > 0) {
    console.warn('⚠️ Missing environment variables:', missing);
    console.log('🔧 Will use fallback configuration');
    return false;
  }

  // Validate URL format
  const url = import.meta.env.VITE_SUPABASE_URL;
  if (!url.includes('supabase.co')) {
    console.warn('⚠️ Invalid Supabase URL format');
    return false;
  }

  // Validate key format (should be JWT-like)
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!key.startsWith('eyJ')) {
    console.warn('⚠️ Invalid Supabase key format');
    return false;
  }

  console.log('✅ Supabase configuration is valid');
  return true;
};

export const logSupabaseConfig = () => {
  console.log('🔧 Supabase Configuration:');
  console.log('  URL:', import.meta.env.VITE_SUPABASE_URL);
  console.log('  Key:', import.meta.env.VITE_SUPABASE_ANON_KEY?.substring(0, 20) + '...');
  console.log('  Environment:', import.meta.env.MODE);
};
