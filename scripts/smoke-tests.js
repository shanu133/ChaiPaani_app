'use strict'

// Simple smoke tests for happy paths: invites, balances, settle-up.
// Usage: set SUPABASE_URL, SUPABASE_ANON_KEY, TEST_USER_EMAIL/PASSWORD,
// TEST_INVITEE_EMAIL, TEST_INVITEE_PASSWORD (secondary account), and TEST_GROUP_NAME in environment.
// Then run via npm script: npm run test:smoke

const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY in env')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data.session
}

async function run() {
  const primaryEmail = process.env.TEST_USER_EMAIL
  const primaryPassword = process.env.TEST_USER_PASSWORD
  const inviteeEmail = process.env.TEST_INVITEE_EMAIL
  const inviteePassword = process.env.TEST_INVITEE_PASSWORD
  const groupName = process.env.TEST_GROUP_NAME || 'Smoke Test Group'

  if (!primaryEmail || !primaryPassword || !inviteeEmail || !inviteePassword) {
    console.error('Missing TEST_USER_EMAIL, TEST_USER_PASSWORD, TEST_INVITEE_EMAIL, or TEST_INVITEE_PASSWORD')
    process.exit(1)
  }

  console.log('Signing in as primary user...')
  await signIn(primaryEmail, primaryPassword)
  
  // Get current user once and reuse
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData?.user) {
    throw new Error('Failed to get authenticated user: ' + (userError?.message || 'User not found'))
  }
  const user = userData.user
  
  // 1) Create group
  console.log('Creating group:', groupName)
  const { data: group, error: groupErr } = await supabase
    .from('groups')
    .insert({ name: groupName, description: 'smoke', category: 'general', currency: 'INR', created_by: user.id })
    .select('*')
    .single()
  if (groupErr) throw groupErr

  // Add creator as member
  const { error: memberErr } = await supabase.from('group_members').insert({ group_id: group.id, user_id: user.id, role: 'admin' })
  if (memberErr) throw memberErr
  
  // 2) Invite secondary user (record only; email send is out-of-band)
  console.log('Creating invitation for', inviteeEmail)
  const { data: invite, error: invErr } = await supabase
    .from('invitations')
    .insert({ group_id: group.id, inviter_id: user.id, invitee_email: inviteeEmail.toLowerCase() })
    .select('*')
    .single()
  if (invErr) throw invErr

  // 3) Sign in as invitee and accept invitation
  // This tests the real invitee acceptance flow and ensures RLS policies are correct
  console.log('Signing out primary user...')
  await supabase.auth.signOut()
  
  console.log('Signing in as invitee:', inviteeEmail)
  await signIn(inviteeEmail, inviteePassword)
  
  // Get invitee's authenticated session
  const { data: inviteeUserData, error: inviteeUserError } = await supabase.auth.getUser()
  if (inviteeUserError || !inviteeUserData?.user) {
    throw new Error('Failed to authenticate as invitee: ' + (inviteeUserError?.message || 'User not found'))
  }
  const inviteeUser = inviteeUserData.user
  console.log('Invitee authenticated as:', inviteeUser.email)
  
  console.log('Accepting invite via RPC (as invitee)...')
  const { error: acceptErr } = await supabase.rpc('accept_group_invitation', { p_token: invite.token })
  if (acceptErr) throw acceptErr
  console.log('✅ Invitation accepted successfully by invitee')
  
  // Sign back in as primary user for remaining tests
  console.log('Signing out invitee...')
  await supabase.auth.signOut()
  
  console.log('Signing back in as primary user...')
  await signIn(primaryEmail, primaryPassword)
  
  // Re-fetch primary user session
  const { data: primaryUserData, error: primaryUserError } = await supabase.auth.getUser()
  if (primaryUserError || !primaryUserData?.user) {
    throw new Error('Failed to re-authenticate as primary user: ' + (primaryUserError?.message || 'User not found'))
  }
  const primaryUser = primaryUserData.user

  // 4) Add an expense and splits (as primary user)
  console.log('Adding expense and splits...')
  const { data: exp, error: expErr } = await supabase
    .from('expenses')
    .insert({ group_id: group.id, payer_id: primaryUser.id, description: 'Dinner', amount: 1000, category: 'food' })
    .select('*')
    .single()
  if (expErr) throw expErr

  // Find invitee profile id with proper error handling
  const { data: inviteeProfile, error: profileErr } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', inviteeEmail)
    .single()
  
  if (profileErr) {
    throw new Error(`Failed to query profile for ${inviteeEmail}: ${profileErr.message}`)
  }
  if (!inviteeProfile || !inviteeProfile.id) {
    throw new Error(`Profile not found for ${inviteeEmail}. User may not have completed signup.`)
  }
  
  const { error: splitErr } = await supabase
    .from('expense_splits')
    .insert([
      { expense_id: exp.id, user_id: primaryUser.id, amount: 500 },
      { expense_id: exp.id, user_id: inviteeProfile.id, amount: 500 },
    ])
  if (splitErr) throw splitErr

  // 5) Query balance for sanity
  console.log('Fetching computed balances...')
  const { data: splitsData, error: balErr } = await supabase
    .from('expense_splits')
    .select('amount, is_settled, expenses!inner(payer_id, group_id)')
    .eq('expenses.group_id', group.id)
  if (balErr) throw balErr
  if (!splitsData || splitsData.length < 2) throw new Error('Unexpected balance dataset')

  console.log('Smoke tests completed OK')
}

run().catch((e) => {
  console.error('Smoke test failed:', e)
  process.exit(1)
})