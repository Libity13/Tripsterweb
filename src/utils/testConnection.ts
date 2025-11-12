// Test Supabase connection and database
import { supabase } from '@/lib/unifiedSupabaseClient';

export const testDatabaseConnection = async () => {
  try {
    console.log('🔍 Testing database connection...');
    
    // Test 1: Check extensions
    const { data: extensions, error: extError } = await supabase
      .rpc('get_extensions');
    
    if (extError) {
      console.warn('⚠️ Extensions check failed:', extError.message);
    } else {
      console.log('✅ Extensions:', extensions);
    }

    // Test 2: Check tables
    const { data: tables, error: tableError } = await supabase
      .rpc('get_tables');

    if (tableError) {
      console.error('❌ Tables check failed:', tableError.message);
      return false;
    }

    console.log('✅ Tables found:', tables?.map(t => t.table_name));
    
    // Test 3: Test PostGIS
    const { data: postgisTest, error: postgisError } = await supabase
      .rpc('test_postgis');

    if (postgisError) {
      console.warn('⚠️ PostGIS test failed:', postgisError.message);
    } else {
      console.log('✅ PostGIS working:', postgisTest);
    }

    // Test 4: Test basic connection
    const { data: connectionTest, error: connError } = await supabase
      .rpc('test_connection');

    if (connError) {
      console.warn('⚠️ Connection test failed:', connError.message);
    } else {
      console.log('✅ Connection test:', connectionTest);
    }

    // Test 5: Test RLS
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.log('🔐 No user logged in (expected for testing)');
    } else {
      console.log('👤 User logged in:', user?.email);
    }

    console.log('🎉 Database connection test completed!');
    return true;
  } catch (error) {
    console.error('❌ Connection test failed:', error);
    return false;
  }
};

// Test specific features
export const testFeatures = async () => {
  try {
    console.log('🧪 Testing features...');

    // Test 1: Create a test trip
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .insert({
        title: 'Test Trip',
        title_en: 'Test Trip',
        description: 'Testing database',
        description_en: 'Testing database',
        status: 'planning',
        language: 'th'
      })
      .select()
      .single();

    if (tripError) {
      console.error('❌ Trip creation failed:', tripError.message);
      return false;
    }

    console.log('✅ Trip created:', trip.id);

    // Test 2: Create a test destination
    const { data: destination, error: destError } = await supabase
      .from('destinations')
      .insert({
        trip_id: trip.id,
        name: 'Test Destination',
        name_en: 'Test Destination',
        order_index: 1,
        latitude: 13.7563,
        longitude: 100.5018,
        language: 'th'
      })
      .select()
      .single();

    if (destError) {
      console.error('❌ Destination creation failed:', destError.message);
      return false;
    }

    console.log('✅ Destination created:', destination.id);

    // Test 3: Test PostGIS function
    const { data: nearby, error: nearbyError } = await supabase
      .rpc('find_places_nearby', {
        p_latitude: 13.7563,
        p_longitude: 100.5018,
        p_radius_meters: 1000
      });

    if (nearbyError) {
      console.warn('⚠️ Nearby search failed:', nearbyError.message);
    } else {
      console.log('✅ Nearby search working:', nearby?.length || 0, 'places found');
    }

    // Cleanup test data
    await supabase.from('destinations').delete().eq('id', destination.id);
    await supabase.from('trips').delete().eq('id', trip.id);

    console.log('🎉 Feature tests completed!');
    return true;
  } catch (error) {
    console.error('❌ Feature test failed:', error);
    return false;
  }
};
