// Test Edge Functions using supabase-js
import { supabase } from '@/lib/unifiedSupabaseClient';

export const testEdgeFunctions = async () => {
  console.log('🧪 Testing Edge Functions...');

  // Test AI Chat Function
  try {
    console.log('🤖 Testing AI Chat...');
    const aiResponse = await supabase.functions.invoke('ai-chat', {
      body: {
        message: 'แนะนำคาเฟ่วิวดีในกรุงเทพ',
        conversationHistory: [],
        provider: 'gemini'
      },
      headers: {
        'Authorization': `Bearer ${await supabase.auth.getSession().then(s => s.data.session?.access_token || '')}`
      }
    });

    if (aiResponse.error) {
      console.error('❌ AI Chat failed:', aiResponse.error.status, aiResponse.error.message);
      console.error('Error details:', aiResponse.error);
    } else {
      console.log('✅ AI Chat working:', aiResponse.data);
    }
  } catch (error) {
    console.error('❌ AI Chat test error:', error);
  }

  // Test Google Places Function
  try {
    console.log('🔍 Testing Google Places...');
    const placesResponse = await supabase.functions.invoke('google-places', {
      body: {
        type: 'textsearch',
        q: 'cafe near ICONSIAM'
      }
    });

    if (placesResponse.error) {
      console.error('❌ Google Places failed:', placesResponse.error.status, placesResponse.error.message);
    } else {
      console.log('✅ Google Places working:', placesResponse.data?.status, placesResponse.data?.results?.length);
    }
  } catch (error) {
    console.error('❌ Google Places test error:', error);
  }
};