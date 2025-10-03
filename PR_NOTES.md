# PR: Backend Implementation - Migrations, Edge Functions, and Service APIs

## Summary

This PR implements the backend foundation for the bill splitting app, focusing on database schema improvements, security tightening, email invitations via Edge Functions, and optimized service APIs.

## Root Causes Addressed

### 1. RLS Policy Recursion Issues
**Problem:** Previous RLS policies for group_members caused infinite recursion when checking group membership.
**Solution:** Implemented join-safe, non-recursive policies that restrict reads to group creators or members only.

### 2. Missing Display Name Field
**Problem:** No consistent display name field for user profiles; relied on full_name which could be null.
**Solution:** Added profiles.display_name with automatic backfill and trigger maintenance.

### 3. No Email Invitations
**Problem:** Group invitations were in-app only with no email delivery mechanism.
**Solution:** Created Edge Function for SMTP email delivery with RPC fallback.

### 4. Inefficient Data Fetching
**Problem:** Service APIs used SELECT * and nested relations, causing performance issues and potential RLS recursion.
**Solution:** Refactored to columns-only, two-phase fetching with minimal data transfer.

### 5. Missing Creator Tracking
**Problem:** Group creation didn't explicitly set created_by, relying on implicit RLS behavior.
**Solution:** Explicitly set created_by=user.id in group creation.

## Applied Fixes

### Database Migrations

#### `20250101000007_rls_tightening.sql`
- **Purpose:** Tighten RLS policies to prevent unauthorized access
- **Changes:**
  - Drop permissive policies that allowed broad access
  - Add join-safe SELECT policies for groups, group_members, expenses, expense_splits
  - Restrict reads to creators or members only
  - Maintain existing INSERT/UPDATE policies

#### `20250101000008_profiles_display_name.sql`
- **Purpose:** Add display_name field with automatic maintenance
- **Changes:**
  - Add `display_name` column to profiles table
  - Backfill existing profiles with full_name or email fallback
  - Update auth triggers to maintain display_name on user updates
  - Ensure non-empty display names for UI consistency

### Edge Function Implementation

#### `supabase/functions/invite-user/index.ts`
- **Purpose:** Handle email invitations with SMTP delivery
- **Features:**
  - Authenticates user via JWT verification
  - Creates invitation via RPC (RLS-enforced)
  - Sends email via Supabase Auth admin API
  - Graceful fallback if email fails
  - Returns invitation token for in-app tracking

#### `supabase/functions/invite-user/README.md`
- **Purpose:** Documentation for Edge Function usage
- **Content:** API specification, authentication, deployment, testing

### Service API Improvements

#### `src/lib/supabase-service.ts`
- **invitationService.inviteUser():**
  - Updated to call Edge Function first
  - RPC fallback if Edge Function unavailable
  - Maintains backward compatibility

- **invitationService.acceptInviteById():**
  - New helper for accepting invitations by ID
  - Fetches token securely via RLS
  - Calls existing accept_invitation RPC

- **groupService.getUserGroups():**
  - Refactored to columns-only fetching
  - Two-phase approach: groups then memberships
  - No nested relations or SELECT *

- **expenseService.getActivitySafe():**
  - New two-phase activity fetching
  - Avoids JOINs that could trigger RLS recursion
  - Composes activity items client-side

- **groupService.createGroup():**
  - Explicitly sets created_by=user.id
  - Robust creator membership insertion
  - Better error handling

- **profileService.getCurrentProfile():**
  - Updated to include display_name in selections

### Type System Updates

#### `src/lib/supabase.ts`
- **profiles:** Added display_name to Row/Insert/Update types
- **invitations:** Added complete table type definitions
- **notifications:** Added complete table type definitions

### Environment Configuration

#### `.env.example`
- **SUPABASE_SERVICE_ROLE_KEY:** Required for Edge Functions
- **FUNCTIONS_VERIFY_JWT:** Guidance for enabling JWT verification
- **SMTP Configuration:** Notes about Supabase dashboard setup

## Migration Strategy

1. **Apply migrations in order:**
   ```sql
   -- Apply these migrations to existing database
   20250101000007_rls_tightening.sql
   20250101000008_profiles_display_name.sql
   ```

2. **Deploy Edge Function:**
   ```bash
   supabase functions deploy invite-user
   ```

3. **Update environment variables:**
   - Set SUPABASE_SERVICE_ROLE_KEY
   - Enable FUNCTIONS_VERIFY_JWT=true in Supabase dashboard
   - Configure SMTP in Supabase Auth settings

## Testing Instructions

### Automated Testing
- Run existing test suites to ensure no regressions
- Verify RLS policies don't break existing functionality

### Manual Testing
- Follow `QA_TEST_SCRIPT.md` for comprehensive testing
- Test invitation flows with and without Edge Functions
- Verify RLS security boundaries
- Check performance of new APIs

### Edge Cases
- Test with SMTP disabled (fallback behavior)
- Verify invitation acceptance by ID vs token
- Check display name fallbacks
- Test group creation and membership flows

## Breaking Changes

### API Changes
- `getUserGroups()` now returns minimal columns only
- `getActivitySafe()` is new; replace old activity fetching
- `acceptInviteById()` is new helper method

### Database Changes
- RLS policies are more restrictive (security improvement)
- New `display_name` column (backward compatible)
- Auth triggers updated (automatic)

## Rollback Plan

1. **If RLS too restrictive:**
   - Revert `20250101000007_rls_tightening.sql`
   - Restore previous policies with fixes

2. **If Edge Function issues:**
   - Keep RPC fallback in client code
   - Edge Function can be disabled without breaking invites

3. **If display_name issues:**
   - Column is nullable, can be dropped if needed
   - Triggers can be reverted

## Performance Impact

- **Positive:** Reduced data transfer with columns-only APIs
- **Positive:** Fewer database queries with two-phase fetching
- **Neutral:** RLS evaluation slightly more complex but more secure
- **Neutral:** Edge Function adds network hop but enables email delivery

## Security Improvements

- Tighter RLS prevents unauthorized data access
- JWT verification in Edge Functions
- Service role key properly scoped to server operations
- Invitation tokens properly validated

## Future Considerations

- Monitor Edge Function performance and costs
- Consider caching for frequently accessed group/member data
- Evaluate need for additional indexes on new columns
- Plan UI integration for invitation flows in next PR