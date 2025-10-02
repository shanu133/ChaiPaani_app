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

- All database functions use `SECURITY DEFINER` to run with elevated privileges
- RLS policies ensure data isolation between users
- Authentication is handled by Supabase Auth
- All user inputs are validated before database operations