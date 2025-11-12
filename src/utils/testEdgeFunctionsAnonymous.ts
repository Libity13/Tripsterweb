// Test Edge Functions without authentication
import { supabase } from '@/lib/unifiedSupabaseClient';

export const testEdgeFunctionsAnonymous = async () => {
  console.log('🧪 Testing Edge Functions (Anonymous)...');

  // Test AI Chat Function without auth
  try {
    console.log('🤖 Testing AI Chat (Anonymous)...');
    const aiResponse = await supabase.functions.invoke('ai-chat', {
      body: {
        message: 'แนะนำคาเฟ่วิวดีในกรุงเทพ',
        conversationHistory: [],
        provider: 'gemini'
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

// Test with mock data
export const testWithMockData = async () => {
  console.log('🎭 Testing with Mock Data...');
  
  try {
    // Test AI Chat with mock response
    const mockResponse = {
      reply: "นี่คือคาเฟ่วิวดีในกรุงเทพที่แนะนำ:",
      actions: [
        {
          action: "ADD_DESTINATIONS",
          destinations: [
            {
              name: "คาเฟ่ดูวิว ICONSIAM",
              hintAddress: "ICONSIAM, กรุงเทพ",
              minHours: 2
            }
          ]
        }
      ]
    };
    
    console.log('✅ Mock AI Response:', mockResponse);
    return mockResponse;
  } catch (error) {
    console.error('❌ Mock test error:', error);
    return null;
  }
};
