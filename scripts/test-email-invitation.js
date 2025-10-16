/**
 * Email Invitation Flow Test Script
 * Tests the complete invitation flow from invitation creation to email delivery
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'YOUR_ANON_KEY';
const TEST_EMAIL = process.env.TEST_EMAIL || 'test@example.com';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testEmailInvitationFlow() {
  console.log('\n🔍 Starting Email Invitation Flow Test\n');
  console.log('=' .repeat(60));
  
  try {
    // Step 1: Check authentication
    console.log('\n📋 Step 1: Checking authentication...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('❌ Not authenticated. Please log in first.');
      console.log('   Run this script after logging into the app.');
      return;
    }
    console.log('✅ Authenticated as:', user.email);
    console.log('   User ID:', user.id);
    
    // Step 2: Check for existing groups
    console.log('\n📋 Step 2: Fetching user groups...');
    const { data: groups, error: groupsError } = await supabase
      .from('groups')
      .select('id, name, created_by')
      .eq('created_by', user.id)
      .limit(1);
      
    if (groupsError) {
      console.error('❌ Error fetching groups:', groupsError);
      return;
    }
    
    if (!groups || groups.length === 0) {
      console.log('❌ No groups found. Please create a group first.');
      return;
    }
    
    const testGroup = groups[0];
    console.log('✅ Found group:', testGroup.name);
    console.log('   Group ID:', testGroup.id);
    
    // Step 3: Check SMTP configuration
    console.log('\n📋 Step 3: Checking SMTP Edge Function...');
    try {
      const testSmtpResult = await supabase.functions.invoke('smtp-send', {
        body: {
          to: TEST_EMAIL,
          subject: 'ChaiPaani SMTP Test',
          html: '<p>This is a test email from ChaiPaani SMTP configuration test.</p>',
          text: 'This is a test email from ChaiPaani SMTP configuration test.'
        }
      });
      
      console.log('   SMTP Function Response:', JSON.stringify(testSmtpResult, null, 2));
      
      if (testSmtpResult.error) {
        console.error('❌ SMTP function error:', testSmtpResult.error);
      } else if (testSmtpResult.data?.ok) {
        console.log('✅ SMTP function is working!');
        console.log('   📧 Test email sent to:', TEST_EMAIL);
        console.log('   ⚠️  Check spam folder if not received in inbox');
      } else {
        console.log('⚠️  SMTP function returned:', testSmtpResult.data);
      }
    } catch (smtpError) {
      console.error('❌ SMTP function exception:', smtpError);
    }
    
    // Step 4: Check existing invitations
    console.log('\n📋 Step 4: Checking existing invitations...');
    const { data: existingInvites, error: invitesError } = await supabase
      .from('invitations')
      .select('id, invitee_email, status, created_at, token')
      .eq('group_id', testGroup.id)
      .order('created_at', { ascending: false })
      .limit(5);
      
    if (invitesError) {
      console.error('❌ Error fetching invitations:', invitesError);
    } else {
      console.log(`✅ Found ${existingInvites?.length || 0} existing invitations:`);
      existingInvites?.forEach((inv, idx) => {
        console.log(`   ${idx + 1}. ${inv.invitee_email} - ${inv.status} (${new Date(inv.created_at).toLocaleString()})`);
        if (inv.token) {
          console.log(`      Token: ${inv.token.substring(0, 20)}...`);
        }
      });
    }
    
    // Step 5: Test creating a new invitation
    console.log('\n📋 Step 5: Testing invitation creation...');
    console.log('   Target email:', TEST_EMAIL);
    
    const { data: newInvite, error: createError } = await supabase
      .from('invitations')
      .insert({
        group_id: testGroup.id,
        inviter_id: user.id,
        invitee_email: TEST_EMAIL.toLowerCase()
      })
      .select()
      .single();
      
    if (createError) {
      console.error('❌ Failed to create invitation:', createError);
      console.log('   This might be expected if invitation already exists.');
    } else {
      console.log('✅ Invitation created successfully!');
      console.log('   Invitation ID:', newInvite.id);
      console.log('   Token:', newInvite.token?.substring(0, 20) + '...');
      console.log('   Status:', newInvite.status);
      
      // Step 6: Simulate email sending
      console.log('\n📋 Step 6: Simulating email send...');
      const appUrl = process.env.VITE_PUBLIC_APP_URL || 'http://localhost:5173';
      const inviteUrl = `${appUrl}/#token=${encodeURIComponent(newInvite.token)}`;
      
      console.log('   📧 Invitation URL:', inviteUrl);
      console.log('   📧 Email would be sent to:', TEST_EMAIL);
      
      const emailHtml = `
        <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; line-height:1.6;">
          <h2>You're invited to join ${testGroup.name} on ChaiPaani</h2>
          <p>Hello,</p>
          <p>You have been invited to join <strong>${testGroup.name}</strong> on ChaiPaani.</p>
          <p>Click the button below to accept your invitation and get started:</p>
          <p style="margin:20px 0;">
            <a href="${inviteUrl}" style="background:#3b82f6;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;display:inline-block">Accept Invitation</a>
          </p>
          <p>Or copy and paste this link into your browser:</p>
          <p><a href="${inviteUrl}">${inviteUrl}</a></p>
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0" />
          <p style="color:#64748b;font-size:12px">If you didn't expect this invitation, you can ignore this email.</p>
        </div>
      `;
      
      // Try to send the actual email
      try {
        const emailResult = await supabase.functions.invoke('smtp-send', {
          body: {
            to: TEST_EMAIL,
            subject: `You're invited to join ${testGroup.name} on ChaiPaani`,
            html: emailHtml
          }
        });
        
        console.log('\n   📤 Email send result:', JSON.stringify(emailResult, null, 2));
        
        if (emailResult.error) {
          console.error('   ❌ Email send error:', emailResult.error);
        } else if (emailResult.data?.ok) {
          console.log('   ✅ Email sent successfully!');
          console.log('   📧 Check', TEST_EMAIL, 'inbox (and spam folder)');
        } else {
          console.log('   ⚠️  Unexpected response:', emailResult.data);
        }
      } catch (emailError) {
        console.error('   ❌ Email exception:', emailError);
      }
    }
    
    // Step 7: Environment check
    console.log('\n📋 Step 7: Environment Variables Check');
    console.log('   VITE_SUPABASE_URL:', SUPABASE_URL ? '✅ Set' : '❌ Not set');
    console.log('   VITE_SUPABASE_ANON_KEY:', SUPABASE_ANON_KEY ? '✅ Set' : '❌ Not set');
    console.log('   VITE_PUBLIC_APP_URL:', process.env.VITE_PUBLIC_APP_URL || '❌ Not set (using default)');
    console.log('   VITE_ENABLE_SMTP:', process.env.VITE_ENABLE_SMTP || '❌ Not set');
    console.log('   TEST_EMAIL:', TEST_EMAIL);
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Test completed!\n');
    console.log('📝 Summary:');
    console.log('   1. Authentication: Working');
    console.log('   2. Group access: Working');
    console.log('   3. SMTP function: Check response above');
    console.log('   4. Invitation creation: Check response above');
    console.log('   5. Email delivery: Check inbox and spam folder');
    console.log('\n⚠️  Important Notes:');
    console.log('   • Gmail may take 1-2 minutes to deliver');
    console.log('   • Check spam/junk folder');
    console.log('   • Verify SMTP secrets in Supabase dashboard');
    console.log('   • Ensure VITE_ENABLE_SMTP=true in .env');
    console.log('   • Check Edge Function logs in Supabase dashboard\n');
    
  } catch (error) {
    console.error('\n❌ Unexpected error:', error);
  }
}

// Run the test
testEmailInvitationFlow().then(() => {
  console.log('Test script finished.');
  process.exit(0);
}).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
