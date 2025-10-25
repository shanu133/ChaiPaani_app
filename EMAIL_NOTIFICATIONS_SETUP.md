# Email Notifications Setup Guide

This guide explains how to set up email notifications for expenses and member additions in ChaiPaani.

## Overview

ChaiPaani now supports email notifications for:
1. **Group Invitations** (already implemented via `smtp-send` Edge function)
2. **New Expenses** - Members receive emails when expenses are added
3. **Member Additions** - Users receive welcome emails when added to groups

## Components

### 1. Database Triggers
**File**: `supabase/migrations/20250126000001_expense_notifications.sql`

Creates triggers that automatically:
- Generate in-app notifications when expenses are created
- Notify all group members (except the payer) about new expenses
- Store notification metadata for rich display

**To apply**: Run this migration in your Supabase dashboard or via Supabase CLI:
```bash
supabase db push
```

### 2. Edge Functions

#### notify-expense
**Path**: `supabase/functions/notify-expense/`

Sends email notifications to all members who owe money when an expense is created.

**Features**:
- Fetches expense details (payer, amount, description, category)
- Gets all expense splits (who owes what)
- Sends personalized emails to each member showing their share
- Uses the existing `smtp-send` function for email delivery

#### notify-member-added
**Path**: `supabase/functions/notify-member-added/`

Sends welcome emails when members are added to groups.

**Features**:
- Notifies users when they're added to a group
- Provides group details and what they can do
- Different from invitation emails (for direct additions vs invited members)

### 3. Frontend Integration

**File**: `src/lib/supabase-service.ts`

Updated `expenseService.createExpense()` to:
- Call `notify-expense` Edge function after creating an expense
- Send emails asynchronously (doesn't block expense creation)
- Fail gracefully if email service is unavailable

## Deployment Steps

### 1. Deploy Database Migration

```bash
cd "c:\Users\shanu\Downloads\BILL SPLITTING APP UI"
supabase db push
```

Or manually run the migration in Supabase Dashboard:
1. Go to SQL Editor
2. Copy contents of `supabase/migrations/20250126000001_expense_notifications.sql`
3. Execute the SQL

### 2. Deploy Edge Functions

Deploy the new Edge functions to Supabase:

```bash
# Deploy notify-expense function
supabase functions deploy notify-expense

# Deploy notify-member-added function  
supabase functions deploy notify-member-added
```

### 3. Set Environment Variables

Make sure these environment variables are set in your Supabase project:

**Edge Functions Environment** (Supabase Dashboard → Edge Functions → Settings):
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for bypassing RLS
- `VITE_PUBLIC_APP_URL` - Your app URL (e.g., `https://yourapp.com`)

**SMTP Configuration** (Already configured for smtp-send):
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASSWORD`
- `SMTP_FROM_EMAIL`
- `ALLOWED_ORIGIN` (for CORS)

### 4. Frontend Environment Variables

Add to your `.env` or `.env.local`:

```env
# Enable/disable expense email notifications (default: enabled)
VITE_ENABLE_EXPENSE_EMAILS=true
```

## Testing

### Test Expense Notifications

1. Log in to your app
2. Navigate to a group
3. Add a new expense with multiple members
4. Check:
   - ✅ In-app notifications appear in the dashboard
   - ✅ Email notifications sent to all members who owe money
   - ✅ Email shows correct amounts and details

### Test Member Addition Notifications

1. Invite or add a member to a group using their email
2. If they exist in the system:
   - ✅ They receive an in-app notification
   - ✅ They receive a welcome email
3. If they don't exist:
   - ✅ They receive an invitation email (existing functionality)

### Debugging

Check Edge Function logs in Supabase Dashboard → Edge Functions → Logs:

```bash
# Or use CLI
supabase functions logs notify-expense
supabase functions logs notify-member-added
```

## How It Works

### Expense Flow
```
1. User creates expense → Frontend calls expenseService.createExpense()
2. Expense inserted into DB → expense_splits created
3. Database trigger fires → create_expense_notifications() function runs
4. In-app notifications created for all members who owe money
5. Frontend calls notify-expense Edge function asynchronously
6. Edge function fetches expense details and splits
7. Sends personalized email to each member via smtp-send
```

### Member Addition Flow
```
1. Member added to group (via invitation acceptance or direct add)
2. Frontend/Backend calls notify-member-added Edge function
3. Edge function fetches group and user details
4. Sends welcome email via smtp-send
```

## Features

### In-App Notifications
- ✅ Real-time notifications in dashboard
- ✅ Shows expense amount, payer, and your share
- ✅ Links to expense/group for details
- ✅ Mark as read/unread functionality

### Email Notifications
- ✅ Beautiful HTML email templates
- ✅ Shows total expense amount and individual share
- ✅ Includes expense description, category, payer name
- ✅ Direct link to open app
- ✅ Graceful failure (doesn't block expense creation)

## Troubleshooting

### Emails Not Sending

1. **Check SMTP settings**: Verify in Supabase Dashboard → Edge Functions → Settings
2. **Check Edge function logs**: Look for errors in `notify-expense` logs
3. **Test smtp-send directly**: Use the SMTP Settings modal in your app
4. **Verify environment variables**: Ensure `VITE_ENABLE_EXPENSE_EMAILS` is not set to `false`

### In-App Notifications Not Appearing

1. **Check database triggers**: Ensure migration was applied successfully
2. **Check RLS policies**: Verify notifications table has correct policies
3. **Check browser console**: Look for errors fetching notifications
4. **Verify user permissions**: User must be a group member

### Performance Concerns

- Email sending is **asynchronous** and doesn't block expense creation
- Database triggers are lightweight and run in milliseconds
- Edge functions auto-scale with Supabase infrastructure
- If SMTP is slow, users still see in-app notifications immediately

## Future Enhancements

- [ ] Batch email notifications (daily/weekly digest)
- [ ] User preferences for notification types
- [ ] Push notifications for mobile
- [ ] SMS notifications
- [ ] Notification templates customization
- [ ] Email unsubscribe functionality

## Support

For issues or questions:
1. Check Supabase Edge Function logs
2. Review database trigger execution in Supabase Dashboard
3. Test SMTP configuration using the app's SMTP Settings modal
4. Check browser console for frontend errors
