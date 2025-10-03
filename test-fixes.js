// Test script to verify the fixes work
// Run this in the browser console after applying database and Edge Function fixes

async function testGroupCreationFlow() {
  console.log('🧪 Testing Group Creation and Invitation Flow...\n');
  
  try {
    // Test 1: Check if Supabase client is available
    if (typeof window.supabase === 'undefined') {
      console.error('❌ Supabase client not found. Make sure you are on the app page.');
      return;
    }
    
    const supabase = window.supabase;
    console.log('✅ Supabase client found');
    
    // Test 2: Check current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('❌ User not authenticated:', userError);
      return;
    }
    console.log('✅ User authenticated:', user.email);
    
    // Test 3: Try to fetch user's group memberships (this was failing before)
    console.log('\n📋 Testing group membership queries...');
    const { data: memberships, error: membershipError } = await supabase
      .from('group_members')
      .select('group_id,role')
      .eq('user_id', user.id);
      
    if (membershipError) {
      console.error('❌ Group membership query failed:', membershipError);
      if (membershipError.message.includes('infinite recursion')) {
        console.error('🔄 Infinite recursion still detected - database fix may not be applied');
        return;
      }
    } else {
      console.log('✅ Group membership query successful');
      console.log('📊 Current memberships:', memberships);
    }
    
    // Test 4: Try to fetch user's groups with member details (complex query that was failing)
    console.log('\n🔍 Testing complex group queries...');
    const { data: groups, error: groupError } = await supabase
      .from('groups')
      .select(`
        *,
        group_members(
          id,
          user_id,
          role,
          joined_at,
          profiles(id,full_name,avatar_url,email)
        )
      `);
      
    if (groupError) {
      console.error('❌ Complex group query failed:', groupError);
      if (groupError.message.includes('infinite recursion')) {
        console.error('🔄 Infinite recursion still detected in complex queries');
        return;
      }
    } else {
      console.log('✅ Complex group query successful');
      console.log('📊 Groups with members:', groups);
    }
    
    // Test 5: Test the invite RPC function
    console.log('\n📧 Testing invite RPC function...');
    
    // First check if we have any groups to invite to
    if (groups && groups.length > 0) {
      const testGroupId = groups[0].id;
      const testEmail = 'test-invite@example.com';
      
      const { data: rpcResult, error: rpcError } = await supabase
        .rpc('invite_user_to_group', {
          p_group_id: testGroupId,
          p_invitee_email: testEmail
        });
        
      if (rpcError) {
        console.error('❌ RPC invite function failed:', rpcError);
      } else {
        console.log('✅ RPC invite function working');
        console.log('📊 RPC Result:', rpcResult);
        
        // Clean up test invitation if it was created
        if (rpcResult?.success) {
          await supabase
            .from('invitations')
            .delete()
            .eq('invitee_email', testEmail)
            .eq('group_id', testGroupId);
          console.log('🧹 Cleaned up test invitation');
        }
      }
    } else {
      console.log('ℹ️  No existing groups found to test invite function');
    }
    
    // Test 6: Test Edge Function CORS (if available)
    console.log('\n🌐 Testing Edge Function CORS...');
    
    // Use a configuration parameter or environment variable for the Edge Function URL
    const functionUrl = window.SUPABASE_EDGE_FUNCTION_URL || 'https://your-default-url.supabase.co/functions/v1/invite-user';
    
    try {
      // Test OPTIONS request (CORS preflight)
      const corsResponse = await fetch(functionUrl, {
        method: 'OPTIONS',
        headers: {
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type, Authorization'
        }
      });
      
      if (corsResponse.ok) {
        console.log('✅ CORS preflight request successful');
        console.log('📊 CORS Headers:', Object.fromEntries(corsResponse.headers.entries()));
      } else {
        console.error('❌ CORS preflight failed:', corsResponse.status, corsResponse.statusText);
      }
    } catch (corsError) {
      console.error('❌ CORS test failed:', corsError);
    }
    
    console.log('\n🎉 Test complete! Check results above.');
    
    // Summary
    console.log('\n📋 SUMMARY:');
    console.log('If you see ✅ for most tests, the fixes are working correctly.');
    console.log('If you see ❌ for database queries, apply the SQL fix from fix-rls-recursion.sql');
    console.log('If you see ❌ for CORS, deploy the updated Edge Function from supabase/functions/invite-user/index.ts');
    
  } catch (error) {
    console.error('❌ Test failed with unexpected error:', error);
  }
}

// Auto-run the test
console.log('🚀 Starting automated fix verification...');
testGroupCreationFlow();