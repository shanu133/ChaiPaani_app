const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function testSMTPEmail() {
  console.log('🧪 Testing SMTP Email Function...');
  console.log('Using Supabase URL:', process.env.VITE_SUPABASE_URL);

  try {
    const { data, error } = await supabase.functions.invoke('smtp-send', {
      body: {
        to: 'test@example.com', // Replace with your actual test email
        subject: 'SMTP Test from ChaiPaani',
        html: '<h1>Test Email</h1><p>This is a test of the SMTP functionality.</p>',
        text: 'Test Email - This is a test of the SMTP functionality.'
      }
    });

    if (error) {
      console.error('❌ SMTP test failed:', error);
      console.error('Make sure SMTP environment variables are configured in Supabase Dashboard > Edge Functions > Environment variables');
    } else {
      console.log('✅ SMTP test result:', data);
      if (data?.ok) {
        console.log('🎉 Email sent successfully! Check your inbox.');
      } else {
        console.error('❌ Email sending failed:', data?.error);
      }
    }
  } catch (err) {
    console.error('❌ Test error:', err.message);
  }
}

testSMTPEmail();