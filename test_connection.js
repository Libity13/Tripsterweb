// Test Supabase Connection
console.log('🔍 Testing Supabase Connection...');

// Check Environment Variables
console.log('VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('VITE_SUPABASE_ANON_KEY:', import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Set' : 'Not Set');

// Test Supabase Client
import { supabase } from './src/lib/supabaseClient.js';

async function testConnection() {
  try {
    console.log('🚀 Testing Supabase connection...');
    
    // Test basic connection
    const { data, error } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('❌ Supabase connection failed:', error);
    } else {
      console.log('✅ Supabase connection successful!');
    }
  } catch (err) {
    console.error('❌ Connection test failed:', err);
  }
}

testConnection();
