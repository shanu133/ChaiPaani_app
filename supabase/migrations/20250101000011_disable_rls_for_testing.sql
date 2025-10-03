-- TEMPORARILY DISABLE RLS FOR TESTING
-- This allows us to test the application functionality while we fix the policy issues
-- RLS will be re-enabled with proper policies after testing

-- Disable RLS on all tables
ALTER TABLE public.groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_splits DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlements DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;

-- Note: This is for testing only. RLS should be re-enabled with proper policies for production.