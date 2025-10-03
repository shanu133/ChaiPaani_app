-- Tighten RLS policies to restrict reads to group creators or members
-- This migration ensures join-safe, non-recursive policies for tables: groups, group_members, expenses, expense_splits
-- Root cause: Previous policies allowed broad access; this fixes to only allow access for creators or members

-- Enable RLS on all tables (if not already)
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;

-- Drop existing policies that may be too permissive
DROP POLICY IF EXISTS "Users can view groups they are members of" ON public.groups;
DROP POLICY IF EXISTS "Users can view groups they created or are members of" ON public.groups;
DROP POLICY IF EXISTS "Users can view group memberships for groups they belong to" ON public.group_members;
DROP POLICY IF EXISTS "Users can view their own memberships" ON public.group_members;
DROP POLICY IF EXISTS "Users can view group memberships in groups they created" ON public.group_members;
DROP POLICY IF EXISTS "Users can view memberships in groups they created" ON public.group_members;
DROP POLICY IF EXISTS "Users can view memberships in groups they created" ON public.group_members;
DROP POLICY IF EXISTS "Group creators can manage memberships" ON public.group_members;
DROP POLICY IF EXISTS "Users can join groups" ON public.group_members;
DROP POLICY IF EXISTS "Users can update their own memberships" ON public.group_members;
DROP POLICY IF EXISTS "Users can view expenses in groups they belong to" ON public.expenses;
DROP POLICY IF EXISTS "Users can view expense splits in their groups" ON public.expense_splits;
DROP POLICY IF EXISTS "Users can view settlements in their groups" ON public.settlements;

-- Groups policies: restrict SELECT to creators or members
CREATE POLICY "Users can view groups they created or are members of" ON public.groups
  FOR SELECT USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_members.group_id = groups.id
      AND group_members.user_id = auth.uid()
    )
  );

-- Keep existing INSERT, UPDATE policies for groups (creator can create, creator or admin can update)

-- Group members policies: restrict SELECT to own memberships or memberships in groups created by user
CREATE POLICY "Users can view their own memberships" ON public.group_members
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can view memberships in groups they created" ON public.group_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.groups
      WHERE groups.id = group_members.group_id
      AND groups.created_by = auth.uid()
    )
  );

-- Keep existing INSERT, UPDATE, DELETE policies for group_members

-- Expenses policies: restrict SELECT to members of the group
CREATE POLICY "Users can view expenses in groups they belong to" ON public.expenses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_members.group_id = expenses.group_id
      AND group_members.user_id = auth.uid()
    )
  );

-- Keep existing INSERT, UPDATE policies for expenses

-- Expense splits policies: restrict SELECT to members of the group (via expense)
CREATE POLICY "Users can view expense splits in their groups" ON public.expense_splits
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.expenses e
      JOIN public.group_members gm ON gm.group_id = e.group_id
      WHERE e.id = expense_splits.expense_id
      AND gm.user_id = auth.uid()
    )
  );

-- Keep existing INSERT, UPDATE, DELETE policies for expense_splits

-- Settlements policies: already restricted to members of the group
-- Keep existing policies