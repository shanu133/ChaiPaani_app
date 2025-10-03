# QA Test Script - Bill Splitting App Backend

This script covers manual testing for the backend implementation including migrations, Edge Functions, and service APIs.

## Prerequisites

1. Supabase project with SMTP configured
2. Edge Functions deployed: `supabase functions deploy invite-user`
3. Environment variables set:
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `FUNCTIONS_VERIFY_JWT=true`
4. Database migrations applied:
   - `20250101000007_rls_tightening.sql`
   - `20250101000008_profiles_display_name.sql`

## Test Cases

### 1. User Signup & Profile Creation
**Steps:**
1. Sign up new user with email/password
2. Verify profile created with display_name fallback to email
3. Check auth triggers updated profile correctly

**Expected:**
- Profile created with display_name = email initially
- No errors in signup flow

### 2. Group Creation
**Steps:**
1. Login as authenticated user
2. Create group with name, description, category
3. Verify group created with created_by = user.id
4. Verify user added as admin member

**Expected:**
- Group created successfully
- Creator has admin role in group_members
- RLS policies allow creator to see their groups

### 3. Invitation System (Email + In-App)
**Steps:**
1. As group creator, invite user by email
2. Verify invitation created in database
3. Check email sent (if SMTP configured)
4. Verify invitation visible to invitee (if they have account)
5. Accept invitation by token
6. Verify group_members updated

**Expected:**
- Invitation row created with pending status
- Email sent via Supabase Auth (check logs if not received)
- Invitee can see invitation if email matches their account
- Acceptance adds user to group_members with member role
- Invitation status changes to accepted

### 4. Invitation by ID (In-App Flow)
**Steps:**
1. Get invitation ID from database
2. Call acceptInviteById helper
3. Verify same acceptance behavior as token flow

**Expected:**
- Invitation accepted without needing token
- User added to group
- Proper error if invitation not for current user

### 5. RLS Security
**Steps:**
1. Login as User A, create Group A
2. Login as User B, try to view Group A
3. Try to create expense in Group A as User B
4. Verify User B cannot see/access Group A data

**Expected:**
- User B cannot see Group A
- User B cannot create expenses in Group A
- User B cannot view expense splits in Group A

### 6. Activity Feed (Two-Phase Fetch)
**Steps:**
1. Create multiple expenses in a group
2. Call getActivitySafe API
3. Verify activity items composed correctly
4. Check no JOIN errors in logs

**Expected:**
- Activity items returned with group and payer info
- No recursive queries or JOIN failures
- Proper error handling if data missing

### 7. User Groups (Minimal Columns)
**Steps:**
1. Join multiple groups
2. Call getUserGroups API
3. Verify only minimal columns returned
4. Check no nested relations fetched

**Expected:**
- Groups returned with basic info only
- No expenses nested in response
- Fast query performance

### 8. Notifications
**Steps:**
1. Check getBadgeCount returns correct unread count
2. Mark notification as read
3. Verify badge count updates
4. Test notification creation flow

**Expected:**
- Badge count accurate
- Mark read works
- Notifications properly scoped to user

### 9. Profile Display Name
**Steps:**
1. Update user profile display_name
2. Verify display_name used in activity/group listings
3. Check fallback to full_name then email

**Expected:**
- Display name updates correctly
- Fallback chain works: display_name > full_name > email

### 10. Edge Function Fallback
**Steps:**
1. Disable Edge Functions temporarily
2. Try to send invitation
3. Verify RPC fallback works
4. Re-enable Edge Functions

**Expected:**
- Graceful fallback to RPC when Edge Function unavailable
- No invitation creation failures

## Error Scenarios

### Invalid Invitation Token
**Steps:**
1. Try to accept expired invitation
2. Try to accept already accepted invitation
3. Try to accept invitation for different email

**Expected:**
- Proper error messages
- No unauthorized group joins

### Missing Permissions
**Steps:**
1. Non-member tries to view group details
2. Non-creator tries to send invitations
3. User tries to update other's profile

**Expected:**
- RLS blocks unauthorized access
- Clear error responses

## Performance Checks

### Query Performance
**Steps:**
1. Create 10+ groups with expenses
2. Monitor query times for getUserGroups
3. Check getActivitySafe performance
4. Verify no N+1 query issues

**Expected:**
- Queries complete in <500ms
- No recursive policy evaluations
- Efficient data fetching

## Logs to Monitor

- Supabase Edge Function logs for invitation errors
- Database query logs for RLS policy evaluations
- Email delivery logs in Supabase dashboard
- Client-side console for API errors

## Success Criteria

- All test cases pass without errors
- No RLS policy violations
- Email invitations work (if SMTP configured)
- In-app invitations work as fallback
- Performance acceptable for production use
- Proper error handling and user feedback