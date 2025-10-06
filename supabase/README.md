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
If migrations fail, you can reset the database. Important safety warning:

> Warning: `npx supabase db reset` is DESTRUCTIVE. It will drop and recreate your database schema, permanently deleting ALL data in the target database. Never run this against production.

Before using reset, verify your environment and target database:

- Confirm you are connected to a local or disposable dev instance (check project ref and connection URL)
- Consider safer alternatives first:
  - Create a backup (dump) before making changes
  - Attempt to fix and re-run specific migrations (idempotent changes are preferred)
  - Use a fresh local/dev environment to iterate safely
  - Restore from a previously taken dump if needed

If you still need to reset (dev/local only):

```bash
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

- About `SECURITY DEFINER` (important): Functions marked `SECURITY DEFINER` run with the privileges of the function owner, not the caller. This can increase blast radius if an input is not validated (think privilege escalation or SQL injection widening impact) and, depending on ownership and table settings, may evaluate RLS under the definer. Treat these as privileged entry points.
  - Risk highlights:
    - Definer’s privileges are used to access/modify data
    - Table owners can bypass RLS unless `FORCE ROW LEVEL SECURITY` is enabled on the table
    - Dynamic SQL or unsanitized inputs can lead to privilege escalation
  - Mitigations and best practices:
    - Validate inputs strictly (types, UUID formats, numeric ranges, JSON shapes) and fail fast with clear errors
    - Re-check authorization in the function: use `auth.uid()` and explicit membership/ownership checks (e.g., ensure caller is a group member or the group creator before touching rows)
    - Scope all DML with explicit WHERE clauses on trusted identifiers (e.g., `group_id`) after verifying membership
    - Avoid string concatenation for SQL; use parameters or safe casting and comparisons
    - Consider setting a safe search path in the function definition: `SET search_path = public` (or your trusted schema only)
    - Prefer a least-privilege owner role for functions instead of a superuser/table owner when possible
    - If appropriate, enable `FORCE ROW LEVEL SECURITY` on especially sensitive tables to apply RLS even to owners
    - Use `SECURITY INVOKER` where privileged behavior is not required

- RLS policies ensure data isolation between users. Even with `SECURITY DEFINER`, do not rely solely on RLS: implement explicit, non-recursive authorization checks inside the function (e.g., membership via `group_members`, ownership via `groups.created_by`).

- Authentication is handled by Supabase Auth. Use `auth.uid()` and, when needed, `auth.jwt() ->> 'email'` to match invitations/memberships.

- All user inputs should be validated before database operations. Example validation and access-control checklist for `SECURITY DEFINER` functions:
  1. Verify caller identity: `auth.uid()` is not null
  2. Validate identifiers (UUIDs) and enums/categories against known sets
  3. Re-check access: caller is member/owner of the target group/resource
  4. Enforce business rules (e.g., split sums match expense amount, non-negative numbers)
  5. Constrain updates/deletes with precise WHERE clauses on verified IDs
  6. Return minimal necessary data; avoid leaking other users’ info

References:
- PostgreSQL CREATE FUNCTION (SECURITY DEFINER, search_path): https://www.postgresql.org/docs/current/sql-createfunction.html
- PostgreSQL Row Level Security: https://www.postgresql.org/docs/current/ddl-rowsecurity.html
- Supabase RLS guide: https://supabase.com/docs/guides/auth/row-level-security
- Supabase Postgres functions: https://supabase.com/docs/guides/database/functions