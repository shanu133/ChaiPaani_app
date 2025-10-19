/**
 * Email Invitation Flow Test Script
 * Tests the complete invitation flow from invitation creation to email delivery
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const TEST_EMAIL = process.env.TEST_EMAIL || 'test@example.com';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing required environment variables:');
  if (!SUPABASE_URL) console.error('   - VITE_SUPABASE_URL');
  if (!SUPABASE_ANON_KEY) console.error('   - VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Wraps a promise with a timeout to prevent hanging operations
 * @param {Promise} promise - The promise to wrap
 * @param {number} timeoutMs - Timeout in milliseconds (default 30000)
 * @param {string} operationName - Name of the operation for error messages
 * @returns {Promise} The wrapped promise
 */
function withTimeout(promise, timeoutMs = 30000, operationName = 'operation') {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${operationName} timed out after ${timeoutMs}ms`)), timeoutMs)
    )
  ]);
}

/**
 * Sanitizes sensitive data for logging
 * @param {string} value - The value to sanitize
 * @param {number} showChars - Number of characters to show (default 4)
 * @returns {string} Sanitized value
 */
function sanitize(value, showChars = 4) {
  if (!value || typeof value !== 'string') return '[redacted]';
  if (value.length <= showChars) return '***';
  return value.substring(0, showChars) + '...';
}

/**
 * Sanitizes an email address for logging
 * @param {string} email - The email to sanitize
 * @returns {string} Sanitized email
 */
function sanitizeEmail(email) {
  if (!email || typeof email !== 'string') return '[redacted]';
  const parts = email.split('@');
  if (parts.length !== 2) return sanitize(email, 3);
  const localPart = parts[0].length > 3 ? parts[0].substring(0, 3) + '***' : '***';
  const domain = parts[1];
  return `${localPart}@${domain}`;
}

async function testEmailInvitationFlow() {
  console.log('\n🔍 Starting Email Invitation Flow Test\n');
  console.log('=' .repeat(60));
  
  try {
    // Step 1: Check authentication
    console.log('\n📋 Step 1: Checking authentication...');
    let user;
    try {
      const { data, error: authError } = await withTimeout(
        supabase.auth.getUser(),
        30000,
        'Authentication check'
      );
      
      if (authError) {
        console.error('❌ Authentication error:', {
          message: authError.message,
          stack: authError.stack
        });
        process.exit(1);
      }
      
      user = data?.user;
      if (!user) {
        console.error('❌ Not authenticated. Please log in first.');
        console.log('   Run this script after logging into the app.');
        process.exit(1);
      }
    } catch (authException) {
      console.error('❌ Authentication exception:', {
        message: authException.message,
        stack: authException.stack
      });
      process.exit(1);
    }
    
    console.log('✅ Authenticated as:', sanitizeEmail(user.email));
    console.log('   User ID:', sanitize(user.id, 8));
    
    // Step 2: Check for existing groups
    console.log('\n📋 Step 2: Fetching user groups...');
    let testGroup;
    try {
      const { data: groups, error: groupsError } = await withTimeout(
        supabase
          .from('groups')
          .select('id, name, created_by')
          .eq('created_by', user.id)
          .limit(1),
        30000,
        'Fetch user groups'
      );
      
      if (groupsError) {
        console.error('❌ Error fetching groups:', {
          message: groupsError.message,
          details: groupsError.details,
          hint: groupsError.hint,
          code: groupsError.code
        });
        process.exit(1);
      }
      
      if (!groups || groups.length === 0) {
        console.log('❌ No groups found. Please create a group first.');
        process.exit(1);
      }
      
      testGroup = groups[0];
      if (!testGroup?.id || !testGroup?.name) {
        console.error('❌ Invalid group data received:', testGroup);
        process.exit(1);
      }
    } catch (groupsException) {
      console.error('❌ Groups fetch exception:', {
        message: groupsException.message,
        stack: groupsException.stack
      });
      process.exit(1);
    }
    
    console.log('✅ Found group:', testGroup.name);
    console.log('   Group ID:', sanitize(testGroup.id, 8));
    
    // Step 3: Check SMTP configuration
    console.log('\n📋 Step 3: Checking SMTP Edge Function...');
    try {
      const testSmtpResult = await withTimeout(
        supabase.functions.invoke('smtp-send', {
          body: {
            to: TEST_EMAIL,
            subject: 'ChaiPaani SMTP Test',
            html: '<p>This is a test email from ChaiPaani SMTP configuration test.</p>',
            text: 'This is a test email from ChaiPaani SMTP configuration test.'
          }
        }),
        30000,
        'SMTP test email'
      );
      
      console.log('   SMTP Function Response:', JSON.stringify(testSmtpResult, null, 2));
      
      if (testSmtpResult?.error) {
        console.error('❌ SMTP function error:', {
          message: testSmtpResult.error.message ?? testSmtpResult.error,
          stack: testSmtpResult.error.stack
        });
      } else if (testSmtpResult?.data?.ok) {
        console.log('✅ SMTP function is working!');
        console.log('   📧 Test email sent to:', sanitizeEmail(TEST_EMAIL));
        console.log('   ⚠️  Check spam folder if not received in inbox');
      } else {
        console.log('⚠️  SMTP function returned:', testSmtpResult?.data ?? 'null/undefined');
      }
    } catch (smtpError) {
      console.error('❌ SMTP function exception:', {
        message: smtpError.message,
        stack: smtpError.stack
      });
    }
    
    // Step 4: Check existing invitations
    console.log('\n📋 Step 4: Checking existing invitations...');
    try {
      const { data: existingInvites, error: invitesError } = await withTimeout(
        supabase
          .from('invitations')
          .select('id, invitee_email, status, created_at, token')
          .eq('group_id', testGroup.id)
          .order('created_at', { ascending: false })
          .limit(5),
        30000,
        'Fetch existing invitations'
      );
      
      if (invitesError) {
        console.error('❌ Error fetching invitations:', {
          message: invitesError.message,
          details: invitesError.details,
          hint: invitesError.hint,
          code: invitesError.code
        });
      } else {
        console.log(`✅ Found ${existingInvites?.length ?? 0} existing invitations:`);
        if (existingInvites && Array.isArray(existingInvites)) {
          existingInvites.forEach((inv, idx) => {
            console.log(`   ${idx + 1}. ${sanitizeEmail(inv?.invitee_email ?? 'unknown')} - ${inv?.status ?? 'unknown'} (${inv?.created_at ? new Date(inv.created_at).toLocaleString() : 'unknown'})`);
            if (inv?.token) {
              console.log(`      Token: ${sanitize(inv.token, 8)}`);
            }
          });
        }
      }
    } catch (invitesException) {
      console.error('❌ Invitations fetch exception:', {
        message: invitesException.message,
        stack: invitesException.stack
      });
    }
    
    // Step 5: Test creating a new invitation
    console.log('\n📋 Step 5: Testing invitation creation...');
    console.log('   Target email:', sanitizeEmail(TEST_EMAIL));
    
    let newInvite;
    try {
      const { data, error: createError } = await withTimeout(
        supabase
          .from('invitations')
          .insert({
            group_id: testGroup.id,
            inviter_id: user.id,
            invitee_email: TEST_EMAIL.toLowerCase()
          })
          .select()
          .single(),
        30000,
        'Create invitation'
      );
      
      if (createError) {
        console.error('❌ Failed to create invitation:', {
          message: createError.message,
          details: createError.details,
          hint: createError.hint,
          code: createError.code
        });
        console.log('   This might be expected if invitation already exists.');
      } else {
        newInvite = data;
        if (!newInvite?.id || !newInvite?.token) {
          console.error('❌ Invalid invitation data received:', newInvite);
        } else {
          console.log('✅ Invitation created successfully!');
          console.log('   Invitation ID:', sanitize(newInvite.id, 8));
          console.log('   Token:', sanitize(newInvite.token, 8));
          console.log('   Status:', newInvite.status ?? 'unknown');
        }
      }
    } catch (createException) {
      console.error('❌ Invitation creation exception:', {
        message: createException.message,
        stack: createException.stack
      });
    }
    
    // Step 6: Simulate email sending
    if (newInvite?.token && newInvite?.id) {
      console.log('\n📋 Step 6: Simulating email send...');
      const appUrl = process.env.VITE_PUBLIC_APP_URL || 'http://localhost:5173';
      const inviteUrl = `${appUrl}/#token=${encodeURIComponent(newInvite.token)}`;
      
      // Sanitize URL for logging (redact token parameter)
      const sanitizedUrl = inviteUrl.replace(/token=[^&]+/, `token=${sanitize(newInvite.token, 8)}`);
      console.log('   📧 Invitation URL:', sanitizedUrl);
      console.log('   📧 Email would be sent to:', sanitizeEmail(TEST_EMAIL));
      
      const emailHtml = `
        <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; line-height:1.6;">
          <h2>You're invited to join ${testGroup?.name ?? 'a group'} on ChaiPaani</h2>
          <p>Hello,</p>
          <p>You have been invited to join <strong>${testGroup?.name ?? 'a group'}</strong> on ChaiPaani.</p>
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
        const emailResult = await withTimeout(
          supabase.functions.invoke('smtp-send', {
            body: {
              to: TEST_EMAIL,
              subject: `You're invited to join ${testGroup?.name ?? 'a group'} on ChaiPaani`,
              html: emailHtml
            }
          }),
          30000,
          'Send invitation email'
        );
        
        // Sanitize result before logging (remove any sensitive data)
        const sanitizedResult = {
          data: emailResult?.data ? { ok: emailResult.data.ok } : null,
          error: emailResult?.error ? 'Error occurred (see details below)' : null
        };
        console.log('\n   📤 Email send result:', JSON.stringify(sanitizedResult, null, 2));
        
        if (emailResult?.error) {
          console.error('   ❌ Email send error:', {
            message: emailResult.error.message ?? emailResult.error,
            stack: emailResult.error.stack
          });
        } else if (emailResult?.data?.ok) {
          console.log('   ✅ Email sent successfully!');
          console.log('   📧 Check', sanitizeEmail(TEST_EMAIL), 'inbox (and spam folder)');
        } else {
          console.log('   ⚠️  Unexpected response:', emailResult?.data ?? 'null/undefined');
        }
      } catch (emailError) {
        console.error('   ❌ Email exception:', {
          message: emailError.message,
          stack: emailError.stack
        });
      }
    } else {
      console.log('\n⚠️  Skipping Step 6: No valid invitation to send email for');
    }
    
    // Step 7: Environment check
    console.log('\n📋 Step 7: Environment Variables Check');
    console.log('   VITE_SUPABASE_URL:', SUPABASE_URL ? '✅ Set' : '❌ Not set');
    console.log('   VITE_SUPABASE_ANON_KEY:', SUPABASE_ANON_KEY ? `✅ Set (${sanitize(SUPABASE_ANON_KEY, 8)})` : '❌ Not set');
    console.log('   VITE_PUBLIC_APP_URL:', process.env.VITE_PUBLIC_APP_URL || '❌ Not set (using default)');
    console.log('   VITE_ENABLE_SMTP:', process.env.VITE_ENABLE_SMTP || '❌ Not set');
    console.log('   TEST_EMAIL:', sanitizeEmail(TEST_EMAIL));
    
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
