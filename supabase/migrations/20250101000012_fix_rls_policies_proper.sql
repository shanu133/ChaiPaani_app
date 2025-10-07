-- Fix RLS policies to prevent infinite recursion
-- This migration creates proper, non-recursive RLS policies

-- First, re-enable RLS on all tables
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "users_can_view_groups" ON public.groups;
DROP POLICY IF EXISTS "users_can_view_memberships" ON public.group_members;
DROP POLICY IF EXISTS "users_can_join_groups" ON public.group_members;
DROP POLICY IF EXISTS "group_members_view_expenses" ON public.expenses;
DROP POLICY IF EXISTS "group_members_view_splits" ON public.expense_splits;
DROP POLICY IF EXISTS "users_select_own_membership" ON public.group_members;
DROP POLICY IF EXISTS "group_members_select_via_groups" ON public.group_members;
DROP POLICY IF EXISTS "users_insert_own_membership" ON public.group_members;
DROP POLICY IF EXISTS "group_creators_insert_members" ON public.group_members;
DROP POLICY IF EXISTS "users_update_own_membership" ON public.group_members;
DROP POLICY IF EXISTS "group_creators_update_members" ON public.group_members;
DROP POLICY IF EXISTS "users_delete_own_membership" ON public.group_members;
DROP POLICY IF EXISTS "group_creators_delete_members" ON public.group_members;
DROP POLICY IF EXISTS "settlements_select_policy" ON public.settlements;
DROP POLICY IF EXISTS "settlements_insert_policy" ON public.settlements;
DROP POLICY IF EXISTS "settlements_update_policy" ON public.settlements;
DROP POLICY IF EXISTS "settlements_delete_policy" ON public.settlements;

-- Ensure idempotency: drop policies created by this migration if they already exist
-- Groups
DROP POLICY IF EXISTS "groups_select_policy" ON public.groups;
DROP POLICY IF EXISTS "groups_insert_policy" ON public.groups;
DROP POLICY IF EXISTS "groups_update_policy" ON public.groups;
DROP POLICY IF EXISTS "groups_delete_policy" ON public.groups;
-- Group members
DROP POLICY IF EXISTS "group_members_select_policy" ON public.group_members;
DROP POLICY IF EXISTS "group_members_insert_self_policy" ON public.group_members;
DROP POLICY IF EXISTS "group_members_insert_creator_policy" ON public.group_members;
DROP POLICY IF EXISTS "group_members_update_self_policy" ON public.group_members;
DROP POLICY IF EXISTS "group_members_update_creator_policy" ON public.group_members;
DROP POLICY IF EXISTS "group_members_delete_self_policy" ON public.group_members;
DROP POLICY IF EXISTS "group_members_delete_creator_policy" ON public.group_members;
-- Expenses
DROP POLICY IF EXISTS "expenses_select_policy" ON public.expenses;
DROP POLICY IF EXISTS "expenses_insert_policy" ON public.expenses;
DROP POLICY IF EXISTS "expenses_update_policy" ON public.expenses;
DROP POLICY IF EXISTS "expenses_delete_policy" ON public.expenses;
-- Expense splits
DROP POLICY IF EXISTS "expense_splits_select_policy" ON public.expense_splits;
DROP POLICY IF EXISTS "expense_splits_insert_policy" ON public.expense_splits;
DROP POLICY IF EXISTS "expense_splits_update_policy" ON public.expense_splits;
DROP POLICY IF EXISTS "expense_splits_delete_policy" ON public.expense_splits;
-- Invitations
DROP POLICY IF EXISTS "invitations_select_policy" ON public.invitations;
DROP POLICY IF EXISTS "invitations_insert_policy" ON public.invitations;
DROP POLICY IF EXISTS "invitations_update_policy" ON public.invitations;
DROP POLICY IF EXISTS "invitations_delete_policy" ON public.invitations;
-- Notifications
DROP POLICY IF EXISTS "notifications_select_policy" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert_policy" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update_policy" ON public.notifications;
DROP POLICY IF EXISTS "notifications_delete_policy" ON public.notifications;
-- Profiles
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;

-- GROUPS POLICIES
-- Users can view groups they created or are members of
CREATE POLICY "groups_select_policy" ON public.groups
  FOR SELECT USING (
    created_by = auth.uid()
    OR id IN (
      SELECT group_id FROM public.group_members 
      WHERE user_id = auth.uid()
    )
  );

-- Users can create groups
CREATE POLICY "groups_insert_policy" ON public.groups
  FOR INSERT WITH CHECK (created_by = auth.uid());

-- Users can update groups they created
CREATE POLICY "groups_update_policy" ON public.groups
  FOR UPDATE USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());

-- Users can delete groups they created
CREATE POLICY "groups_delete_policy" ON public.groups
  FOR DELETE USING (created_by = auth.uid());

-- GROUP_MEMBERS POLICIES
-- Users can view memberships in groups they created or are members of
CREATE POLICY "group_members_select_policy" ON public.group_members
  FOR SELECT USING (
    user_id = auth.uid()
    OR group_id IN (
      SELECT id FROM public.groups WHERE created_by = auth.uid()
    )
    OR group_id IN (
      SELECT group_id FROM public.group_members WHERE user_id = auth.uid()
    )
  );

-- Users can join groups (insert their own membership)
CREATE POLICY "group_members_insert_self_policy" ON public.group_members
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.invitations i
      WHERE i.group_id = group_members.group_id
        AND i.status = 'accepted'
        AND lower(i.invitee_email) = lower(coalesce((auth.jwt() ->> 'email'), ''))
    )
  );

-- Group creators can add members
CREATE POLICY "group_members_insert_creator_policy" ON public.group_members
  FOR INSERT WITH CHECK (
    group_id IN (
      SELECT id FROM public.groups WHERE created_by = auth.uid()
    )
  );

-- Users can update their own memberships
CREATE POLICY "group_members_update_self_policy" ON public.group_members
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Group creators can update memberships
CREATE POLICY "group_members_update_creator_policy" ON public.group_members
  FOR UPDATE USING (
    group_id IN (
      SELECT id FROM public.groups WHERE created_by = auth.uid()
    )
  ) WITH CHECK (
    group_id IN (
      SELECT id FROM public.groups WHERE created_by = auth.uid()
    )
  );

-- Users can delete their own memberships
CREATE POLICY "group_members_delete_self_policy" ON public.group_members
  FOR DELETE USING (user_id = auth.uid());

-- Group creators can remove members
CREATE POLICY "group_members_delete_creator_policy" ON public.group_members
  FOR DELETE USING (
    group_id IN (
      SELECT id FROM public.groups WHERE created_by = auth.uid()
    )
  );

-- EXPENSES POLICIES
-- Users can view expenses in groups they're members of
CREATE POLICY "expenses_select_policy" ON public.expenses
  FOR SELECT USING (
    group_id IN (
      SELECT group_id FROM public.group_members WHERE user_id = auth.uid()
    )
  );

-- Users can create expenses in groups they're members of
CREATE POLICY "expenses_insert_policy" ON public.expenses
  FOR INSERT WITH CHECK (
    group_id IN (
      SELECT group_id FROM public.group_members WHERE user_id = auth.uid()
    )
  );

-- Users can update expenses they created
CREATE POLICY "expenses_update_policy" ON public.expenses
  FOR UPDATE USING (payer_id = auth.uid()) WITH CHECK (payer_id = auth.uid());

-- Users can delete expenses they created
CREATE POLICY "expenses_delete_policy" ON public.expenses
  FOR DELETE USING (payer_id = auth.uid());

-- EXPENSE_SPLITS POLICIES
-- Users can view splits for expenses in groups they're members of
CREATE POLICY "expense_splits_select_policy" ON public.expense_splits
  FOR SELECT USING (
    expense_id IN (
      SELECT e.id FROM public.expenses e
      JOIN public.group_members gm ON gm.group_id = e.group_id
      WHERE gm.user_id = auth.uid()
    )
  );

-- Users can create splits for expenses in groups they're members of
CREATE POLICY "expense_splits_insert_policy" ON public.expense_splits
  FOR INSERT WITH CHECK (
    expense_id IN (
      SELECT e.id FROM public.expenses e
      JOIN public.group_members gm ON gm.group_id = e.group_id
      WHERE gm.user_id = auth.uid()
    )
  );

-- Users can update splits they're involved in
CREATE POLICY "expense_splits_update_policy" ON public.expense_splits
  FOR UPDATE USING (
    user_id = auth.uid()
    OR expense_id IN (
      SELECT id FROM public.expenses WHERE payer_id = auth.uid()
    )
  ) WITH CHECK (
    user_id = auth.uid()
    OR expense_id IN (
      SELECT id FROM public.expenses WHERE payer_id = auth.uid()
    )
  );

-- Users can delete splits they're involved in
CREATE POLICY "expense_splits_delete_policy" ON public.expense_splits
  FOR DELETE USING (
    user_id = auth.uid()
    OR expense_id IN (
      SELECT id FROM public.expenses WHERE payer_id = auth.uid()
    )
  );

-- SETTLEMENTS POLICIES
-- Users can view settlements in groups they're members of
CREATE POLICY "settlements_select_policy" ON public.settlements
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = public.settlements.group_id
        AND gm.user_id = auth.uid()
    )
  );

-- Users can create settlements in groups they're members of, and only between members
CREATE POLICY "settlements_insert_policy" ON public.settlements
  FOR INSERT WITH CHECK (
    -- inserting user is a member of the group
    EXISTS (
      SELECT 1 FROM public.group_members gm_self
      WHERE gm_self.group_id = public.settlements.group_id
        AND gm_self.user_id = auth.uid()
    )
    -- both payer and receiver are members of the same group
    AND EXISTS (
      SELECT 1 FROM public.group_members gm_payer
      WHERE gm_payer.group_id = public.settlements.group_id
        AND gm_payer.user_id = public.settlements.payer_id
    )
    AND EXISTS (
      SELECT 1 FROM public.group_members gm_rcv
      WHERE gm_rcv.group_id = public.settlements.group_id
        AND gm_rcv.user_id = public.settlements.receiver_id
    )
    -- inserting user must be one of the parties
    AND (auth.uid() = public.settlements.payer_id OR auth.uid() = public.settlements.receiver_id)
  );

-- Users can update settlements only if they're a party and remain valid under the same checks
CREATE POLICY "settlements_update_policy" ON public.settlements
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = public.settlements.group_id
        AND gm.user_id = auth.uid()
    )
    AND (auth.uid() = public.settlements.payer_id OR auth.uid() = public.settlements.receiver_id)
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.group_members gm_self
      WHERE gm_self.group_id = public.settlements.group_id
        AND gm_self.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.group_members gm_payer
      WHERE gm_payer.group_id = public.settlements.group_id
        AND gm_payer.user_id = public.settlements.payer_id
    )
    AND EXISTS (
      SELECT 1 FROM public.group_members gm_rcv
      WHERE gm_rcv.group_id = public.settlements.group_id
        AND gm_rcv.user_id = public.settlements.receiver_id
    )
    AND (auth.uid() = public.settlements.payer_id OR auth.uid() = public.settlements.receiver_id)
  );

-- Users can delete settlements they created (payer)
CREATE POLICY "settlements_delete_policy" ON public.settlements
  FOR DELETE USING (payer_id = auth.uid());

-- INVITATIONS POLICIES
-- Users can view invitations they sent or received
CREATE POLICY "invitations_select_policy" ON public.invitations
  FOR SELECT USING (
    inviter_id = auth.uid()
    OR invitee_email = (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
  );

-- Users can create invitations for groups they created
CREATE POLICY "invitations_insert_policy" ON public.invitations
  FOR INSERT WITH CHECK (
    inviter_id = auth.uid()
    AND group_id IN (
      SELECT id FROM public.groups WHERE created_by = auth.uid()
    )
  );

-- Users can update invitations they sent
CREATE POLICY "invitations_update_policy" ON public.invitations
  FOR UPDATE USING (inviter_id = auth.uid()) WITH CHECK (inviter_id = auth.uid());

-- Users can delete invitations they sent
CREATE POLICY "invitations_delete_policy" ON public.invitations
  FOR DELETE USING (inviter_id = auth.uid());

-- NOTIFICATIONS POLICIES
-- Users can view their own notifications
CREATE POLICY "notifications_select_policy" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());

-- Users can create notifications for themselves
CREATE POLICY "notifications_insert_policy" ON public.notifications
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can update their own notifications
CREATE POLICY "notifications_update_policy" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Users can delete their own notifications
CREATE POLICY "notifications_delete_policy" ON public.notifications
  FOR DELETE USING (user_id = auth.uid());

-- PROFILES POLICIES
-- Users can view all profiles (for group member lists)
CREATE POLICY "profiles_select_policy" ON public.profiles
  FOR SELECT USING (true);

-- Users can update their own profile
CREATE POLICY "profiles_update_policy" ON public.profiles
  FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- Users can insert their own profile
CREATE POLICY "profiles_insert_policy" ON public.profiles
  FOR INSERT WITH CHECK (id = auth.uid());

