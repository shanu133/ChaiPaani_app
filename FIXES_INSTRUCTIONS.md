# Bill Splitting App - Critical Fixes Instructions

This document provides step-by-step instructions to resolve the infinite recursion and CORS issues affecting your bill splitting application.

## Issues Being Fixed

1. **Infinite Recursion in RLS Policies**: The main cause of HTTP 500 errors on group_members queries
2. **CORS Headers for Edge Function**: Missing proper CORS handling causing OPTIONS request failures
3. **Database Policy Conflicts**: Circular references between groups and group_members tables

## Prerequisites

- Access to your Supabase Dashboard
- Supabase CLI installed (optional, but recommended)

## Step 1: Apply Database Fixes

### Option A: Using Supabase Dashboard (Recommended)

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project: `edwjkqbrvcoqsrfxqtyu`
3. Navigate to **SQL Editor** in the left sidebar
4. Click **New query**
5. Copy the entire contents of `fix-rls-recursion.sql` (created in this project)
6. Paste the content into the SQL Editor
7. Click **Run** to execute the script

### Option B: Using Supabase CLI

If you have the Supabase CLI installed:

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Login to Supabase
supabase login

# Link your project (replace with your actual project reference)
supabase link --project-ref edwjkqbrvcoqsrfxqtyu

# Apply the database fix
supabase db reset --db-url "your-database-url"
```

## Step 2: Deploy Updated Edge Function

### Option A: Using Supabase Dashboard

1. In your Supabase Dashboard, go to **Edge Functions**
2. Find the `invite-user` function
3. Click **Edit**
4. Replace the entire content with the updated code from `supabase/functions/invite-user/index.ts`
5. Click **Deploy**

### Option B: Using Supabase CLI

```bash
# Deploy the updated Edge Function
supabase functions deploy invite-user
```

## Step 3: Verify the Fixes

After applying both fixes, test your application:

1. **Refresh your application** in the browser
2. **Check the browser console** - the infinite recursion errors should be gone
3. **Try creating a group** - should work without errors
4. **Try adding members** - should work without CORS errors
5. **Try adding expenses** - should work after member additions

## Expected Results

After applying these fixes:

- ✅ No more "infinite recursion detected in policy" errors
- ✅ Group member queries return HTTP 200 instead of 500
- ✅ CORS preflight requests succeed for invite-user function
- ✅ Member invitation flow works correctly
- ✅ Expense creation works for group creators and members
- ✅ Group details load properly with member information

## What the Fixes Do

### Database Policy Fixes (`fix-rls-recursion.sql`)

1. **Removes Circular References**: Eliminates policies that cause groups and group_members to reference each other recursively
2. **Simplifies RLS Policies**: Uses direct ownership checks and simple subqueries instead of complex joins
3. **Maintains Security**: Ensures users can only access groups and members they should see
4. **Fixes RPC Functions**: Updates invite functions to work with the new policy structure

### Edge Function Fixes (`supabase/functions/invite-user/index.ts`)

1. **Consolidated CORS Headers**: Creates a reusable `corsHeaders` object
2. **Proper OPTIONS Handling**: Returns correct status and headers for preflight requests
3. **Complete Header Coverage**: Ensures all response paths include proper CORS headers
4. **Extended Header Support**: Adds support for `apikey` and `x-client-info` headers

## Troubleshooting

### If you still see infinite recursion errors:

1. Check if the SQL script ran completely without errors
2. Verify all policies were dropped and recreated
3. Try refreshing your browser completely (Ctrl+F5 or Cmd+Shift+R)

### If CORS errors persist:

1. Ensure the Edge Function was deployed successfully
2. Check the function logs in Supabase Dashboard > Edge Functions > invite-user > Logs
3. Verify the function URL is correct in your frontend code

### If member invitations still don't work:

1. Check if the `invite_user_to_group` RPC function exists in your database
2. Verify the function has `SECURITY DEFINER` permissions
3. Test the function directly in the SQL Editor

## Database Schema Verification

After applying fixes, your database should have these policies:

- `profiles_read_all` - Allow reading all profiles
- `profiles_update_own` - Allow users to update their own profile
- `groups_owner_all` - Group creators can manage their groups
- `groups_member_read` - Members can read groups they belong to
- `group_members_*` - Various policies for member management without recursion
- `expenses_member_all` - Members can manage expenses in their groups
- And similar policies for other tables...

## Support

If you continue to experience issues after applying these fixes:

1. Check the browser console for any remaining errors
2. Look at the Supabase Dashboard logs for your project
3. Verify your environment variables are correct
4. Ensure your frontend is using the correct Supabase URL and keys

The fixes provided should resolve the core issues preventing your invitation and expense workflows from functioning correctly.