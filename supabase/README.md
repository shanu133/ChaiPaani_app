# Supabase Backend Setup

This directory contains the database schema, migrations, and configuration for the ChaiPaani Bill Splitting App backend.

## Database Schema

The application uses the following main tables:

- **profiles**: User profiles linked to Supabase Auth
- **groups**: Bill splitting groups
- **group_members**: Group membership with roles
- **expenses**: Individual expenses within groups
- **expense_splits**: How expenses are split among group members
- **settlements**: Records of debt settlements

## Setup Instructions

### 1. Install Supabase CLI

```bash
npm install -g supabase
# or
npx supabase --version
```

### 2. Initialize Supabase Project (if not already done)

```bash
npx supabase init
```

### 3. Link to Your Supabase Project

```bash
npx supabase link --project-ref YOUR_PROJECT_REF
```

You can find your project ref in your Supabase dashboard URL.

### 4. Apply Migrations

```bash
npx supabase db push
```

This will apply all migrations in order:
1. `20250101000000_initial_schema.sql` - Creates all tables and indexes
2. `20250101000001_rls_policies.sql` - Sets up Row Level Security
3. `20250101000002_rpc_functions.sql` - Creates database functions
4. `20250101000003_auth_triggers.sql` - Sets up authentication triggers

### 5. Generate Types (Optional)

```bash
npx supabase gen types typescript --local > src/lib/database.types.ts
```

## Key Features

### Row Level Security (RLS)
All tables have RLS enabled with policies that ensure:
- Users can only see data from groups they're members of
- Users can only modify their own data
- Group admins have additional permissions

### RPC Functions
- `create_expense_with_splits()`: Creates expense with multiple splits
- `get_user_balance_in_group()`: Calculates user balances within a group
- `settle_expense_split()`: Marks expense splits as settled
- `get_group_summary()`: Provides group statistics

### Authentication Triggers
- Automatically creates user profiles on signup
- Updates profiles when user metadata changes
- Validates expense splits don't exceed expense amounts

## Environment Variables

Make sure your `.env.local` file contains:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Testing the Backend

You can test the backend functionality by:

1. Creating a user account through the frontend
2. Creating a group
3. Adding expenses with splits
4. Checking balances and settlements

## Database Functions Usage

### Creating an Expense with Splits

```sql
SELECT create_expense_with_splits(
  'group-uuid'::UUID,
  'Dinner at restaurant',
  120.00,
  'food',
  'Great meal!',
  '[
    {"user_id": "user1-uuid", "amount": 40.00},
    {"user_id": "user2-uuid", "amount": 40.00},
    {"user_id": "user3-uuid", "amount": 40.00}
  ]'::JSONB
);
```

### Getting User Balance in Group

```sql
SELECT * FROM get_user_balance_in_group('group-uuid'::UUID);
```

## Troubleshooting

### Migration Issues
If migrations fail, you can reset the database:

⚠️ **WARNING: `npx supabase db reset` is DESTRUCTIVE and will permanently delete ALL data!**

**NEVER run this against production databases!** Always verify your environment/database target first.

Before running reset:
- Create a backup: `npx supabase db dump -f backup.sql`
- Verify you're targeting the correct database (local/dev only)
- Consider safer alternatives:
  - Fix and re-run specific migrations (make them idempotent where possible)
  - Use a local/dev-only environment for testing
  - Restore from a dump if recovery is needed

```bash
# ONLY FOR LOCAL/DEV - verify first!
npx supabase db reset
```

### Permission Issues
Make sure your user has the correct permissions in Supabase dashboard under Authentication > Policies.

### Function Errors
Check the Supabase logs in your dashboard for detailed error messages.

## Development Workflow

1. Make changes to migration files
2. Test locally with `npx supabase start`
3. Apply changes with `npx supabase db push`
4. Update TypeScript types if schema changes

## Security Notes

⚠️ **SECURITY DEFINER Functions - Critical Security Considerations**

All database functions use `SECURITY DEFINER` to run with elevated privileges (the function owner's permissions). This has important security implications:

### Why SECURITY DEFINER is risky:
- Functions bypass the caller's permissions and run with the definer's (owner's) privileges
- This can enable **privilege escalation** if not properly secured
- SQL injection or logic errors have wider impact since the function runs with elevated access
- RLS policies on tables may be bypassed by the owner (unless `FORCE ROW LEVEL SECURITY` is set)

### Required Mitigations:
1. **Strict Input Validation**:
   - Validate all input types, UUIDs, ranges, and JSON shapes
   - Use parameterized queries; NEVER concatenate user input into SQL strings
   - Sanitize and whitelist allowed values

2. **Explicit Authorization Checks**:
   - Always verify `auth.uid()` matches the resource owner
   - Use joins to verify membership/ownership before allowing operations
   - Don't rely solely on RLS; enforce access checks explicitly in function logic

3. **Least Privilege**:
   - Set `search_path` to a safe schema to prevent function hijacking
   - Consider using `SECURITY INVOKER` when elevated privileges aren't needed
   - Use the least-privileged role as the function owner
   - Consider `ALTER TABLE ... FORCE ROW LEVEL SECURITY` for sensitive tables

4. **RLS Interaction**:
   - Table owners can bypass RLS unless FORCE RLS is enabled
   - Treat SECURITY DEFINER functions as privileged entry points
   - Functions should perform their own authorization checks, not rely on RLS alone

### Validation/Access Control Checklist for SECURITY DEFINER Functions:
- [ ] Validate all input parameters (types, ranges, formats)
- [ ] Check `auth.uid()` and verify caller is authorized
- [ ] Verify ownership or membership via explicit JOINs/EXISTS checks
- [ ] Use parameterized queries; avoid string concatenation
- [ ] Set explicit `search_path` if calling other functions
- [ ] Log security-relevant actions for audit trail
- [ ] Consider FORCE RLS for sensitive tables
- [ ] Test with different user roles to verify access controls

### References:
- [PostgreSQL SECURITY DEFINER documentation](https://www.postgresql.org/docs/current/sql-createfunction.html)
- [Supabase Row Level Security guide](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL security best practices](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)

- RLS policies ensure data isolation between users
- Authentication is handled by Supabase Auth
- All user inputs are validated before database operations