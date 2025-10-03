# Invite User Edge Function

This Edge Function handles group invitations with email delivery via Supabase Auth.

## Purpose

- Creates group invitations in the database using the `invite_user_to_group` RPC
- Sends invitation emails via Supabase Auth's `admin.inviteUserByEmail`
- Provides fallback for in-app only invitations if email fails

## API

### POST /

Invites a user to join a group.

**Request Body:**
```json
{
  "groupId": "uuid",
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "ok": true,
  "token": "invitation-token-uuid"
}
```

**Error Response:**
```json
{
  "ok": false,
  "error": "Error message"
}
```

## Authentication

- Requires `Authorization` header with user's JWT token
- Uses `FUNCTIONS_VERIFY_JWT=true` to verify the token
- Extracts user ID from the verified JWT

## Environment Variables

Required in Supabase project settings:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY`

## Flow

1. Verify user authentication via JWT
2. Call `invite_user_to_group` RPC to create invitation (RLS checks creator permission)
3. If successful, send email invite via admin API
4. Return success with invitation token for in-app tracking
5. Email delivery failure doesn't fail the request (graceful degradation)

## Deployment

```bash
supabase functions deploy invite-user
```

## Testing

```bash
# Local development
supabase functions serve invite-user

# Test with curl
curl -X POST 'http://localhost:54321/functions/v1/invite-user' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"groupId": "group-uuid", "email": "user@example.com"}'
```

## Error Handling

- Returns 401 if no authorization header
- Returns 400 for invalid request body or RPC errors
- Returns 500 for unexpected errors
- Email failures are logged but don't fail the invitation creation