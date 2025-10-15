'use strict'

// Simple smoke tests for happy paths: invites, balances, settle-up.
// Usage: set SUPABASE_URL, SUPABASE_ANON_KEY, and TEST_USER_EMAIL/PASSWORD,
// TEST_INVITEE_EMAIL (secondary account), and TEST_GROUP_NAME in environment.
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
  const groupName = process.env.TEST_GROUP_NAME || 'Smoke Test Group'

  if (!primaryEmail || !primaryPassword || !inviteeEmail) {
    console.error('Missing TEST_USER_EMAIL, TEST_USER_PASSWORD, or TEST_INVITEE_EMAIL')
    process.exit(1)
  }

  console.log('Signing in as primary user...')
  await signIn(primaryEmail, primaryPassword)

  // 1) Create group
  console.log('Creating group:', groupName)
  const { data: group, error: groupErr } = await supabase
    .from('groups')
    .insert({ name: groupName, description: 'smoke', category: 'general', currency: 'INR', created_by: (await supabase.auth.getUser()).data.user.id })
    .select('*')
    .single()
  if (groupErr) throw groupErr

  // Add creator as member
  await supabase.from('group_members').insert({ group_id: group.id, user_id: (await supabase.auth.getUser()).data.user.id, role: 'admin' })

  // 2) Invite secondary user (record only; email send is out-of-band)
  console.log('Creating invitation for', inviteeEmail)
  const { data: invite, error: invErr } = await supabase
    .from('invitations')
    .insert({ group_id: group.id, inviter_id: (await supabase.auth.getUser()).data.user.id, invitee_email: inviteeEmail.toLowerCase() })
    .select('*')
    .single()
  if (invErr) throw invErr

  // 3) Simulate accept via RPC directly (no email)
  console.log('Accepting invite via RPC...')
  const { error: acceptErr } = await supabase.rpc('accept_group_invitation', { p_token: invite.token })
  if (acceptErr) throw acceptErr

  // 4) Add an expense and splits
  console.log('Adding expense and splits...')
  const user = (await supabase.auth.getUser()).data.user
  const { data: exp, error: expErr } = await supabase
    .from('expenses')
    .insert({ group_id: group.id, payer_id: user.id, description: 'Dinner', amount: 1000, category: 'food' })
    .select('*')
    .single()
  if (expErr) throw expErr

  // Find invitee profile id
  const { data: inviteeProfile } = await supabase.from('profiles').select('id').eq('email', inviteeEmail).single()
  const { error: splitErr } = await supabase
    .from('expense_splits')
    .insert([
      { expense_id: exp.id, user_id: user.id, amount: 500 },
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