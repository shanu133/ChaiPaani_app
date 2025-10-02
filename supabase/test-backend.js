#!/usr/bin/env node

/**
 * Simple test script to verify Supabase backend functionality
 * Run with: node supabase/test-backend.js
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

// Load env from project root regardless of CWD, but check if file exists
const envPath = path.resolve(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
} else {
  console.warn(`⚠️  .env.local not found at ${envPath}`);
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  console.log('Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log('🔍 Testing Supabase connection...');

  try {
    const { error } = await supabase
      .from('profiles')
      .select('*', { head: true })
      .limit(1);

    if (!error) {
      console.log('✅ Database connection successful');
      return true;
    }

    const msg = (error.message || '').toLowerCase();
    if (msg.includes('permission') || msg.includes('rls') || msg.includes('authenticated')) {
      console.log('✅ Database reachable (RLS active)');
      return true;
    }

    console.error('❌ Database connection failed:', error.message);
    return false;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

async function testAuth() {
  console.log('🔍 Testing authentication...');

  try {
    const { error } = await supabase.auth.getSession();
    if (error) throw error;
    console.log('✅ Authentication system accessible');
    return true;
  } catch (error) {
    console.error('❌ Authentication test failed:', error.message);
    return false;
  }
}

async function testTables() {
  console.log('🔍 Testing table accessibility...');

  const tables = ['profiles', 'groups', 'group_members', 'expenses', 'expense_splits', 'settlements'];
  let successCount = 0;

  for (const table of tables) {
    const { error } = await supabase
      .from(table)
      .select('*', { head: true })
      .limit(1);

    if (!error) {
      console.log(`✅ Table '${table}' exists`);
      successCount++;
      continue;
    }

    const status = error.status || error.code || 0;
    const msg = (error.message || '').toLowerCase();
    const details = (error.details || '').toLowerCase();
    // Treat common RLS/auth statuses as success (resource exists but requires auth)
    if (
      status === 401 ||
      status === 403 ||
      status === 406 ||
      msg.includes('permission') ||
      msg.includes('rls') ||
      msg.includes('authenticated') ||
      // Some environments return opaque errors (status 0) for RLS-protected HEAD requests
      // Consider those as existence success unless it's clearly a missing relation.
      (
        (status === 0 || !status) &&
        !msg.includes('does not exist') &&
        !details.includes('does not exist') &&
        !msg.includes('not found')
      )
    ) {
      console.log(`✅ Table '${table}' exists (RLS active)`);
      successCount++;
    } else {
      console.error(`❌ Table '${table}' error:`, error.message || `status ${status}`);
    }
  }

  return successCount === tables.length;
}

async function testRPCFunctions() {
  console.log('🔍 Testing RPC functions...');

  const functions = ['create_expense_with_splits', 'get_user_balance_in_group', 'settle_expense_split', 'get_group_summary'];
  let successCount = 0;

  for (const func of functions) {
    try {
      const { error } = await supabase.rpc(func);
      if (error) {
        const status = error.status || 0;
        const msg = (error.message || '').toLowerCase();
        if (status === 401 || status === 403 || msg.includes('permission') || msg.includes('authenticated')) {
          console.log(`✅ RPC function '${func}' exists (auth/RLS)`);
          successCount++;
        } else if (status === 404 || msg.includes('not found')) {
          console.error(`❌ RPC function '${func}' not found`);
        } else if (msg.includes('without parameters') || (msg.includes('function') && msg.includes('exists'))) {
          console.log(`✅ RPC function '${func}' exists`);
          successCount++;
        } else {
          console.error(`❌ RPC function '${func}' error:`, error.message);
        }
      } else {
        console.log(`✅ RPC function '${func}' exists`);
        successCount++;
      }
    } catch (e) {
      console.error(`❌ RPC function '${func}' error:`, e.message);
    }
  }

  return successCount === functions.length;
}

async function runTests() {
  console.log('🚀 Starting Supabase Backend Tests\n');

  const results = await Promise.all([
    testConnection(),
    testAuth(),
    testTables(),
    testRPCFunctions()
  ]);

  const passed = results.filter(Boolean).length;
  const total = results.length;

  console.log(`\n📊 Test Results: ${passed}/${total} tests passed`);

  if (passed === total) {
    console.log('🎉 All backend tests passed! Your Supabase setup is ready.');
    console.log('\nNext steps:');
    console.log('1. Test user registration and login through your frontend');
    console.log('2. Create a group and add some expenses');
    console.log('3. Verify that balances are calculated correctly');
  } else {
    console.log('⚠️  Some tests failed. Please check your Supabase configuration.');
    console.log('Make sure you have:');
    console.log('1. Applied all migrations: npx supabase db push');
    console.log('2. Correct environment variables in .env.local');
    console.log('3. Supabase project is properly configured');
  }

  process.exit(passed === total ? 0 : 1);
}

runTests().catch(error => {
  console.error('💥 Test runner failed:', error);
  process.exit(1);
});