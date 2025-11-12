// Test Supabase connection
import { supabase } from '@/lib/unifiedSupabaseClient';

export const testSupabaseConnection = async () => {
  try {
    console.log('🔍 Testing Supabase connection...');
    
    // Test 1: Check if we can connect
    const { data, error } = await supabase
      .from('trips')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('❌ Supabase connection failed:', error.message);
      return false;
    }
    
    console.log('✅ Supabase connected successfully!');
    return true;
  } catch (error) {
    console.error('❌ Connection error:', error);
    return false;
  }
};

// Test authentication
export const testAuth = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      console.log('🔐 No user logged in:', error.message);
      return null;
    }
    
    console.log('👤 User logged in:', user?.email);
    return user;
  } catch (error) {
    console.error('❌ Auth error:', error);
    return null;
  }
};
