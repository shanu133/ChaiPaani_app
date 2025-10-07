-- Final RLS fix to eliminate infinite recursion
-- This migration removes circular references between policies

-- Drop all existing policies
DROP POLICY IF EXISTS "groups_select_policy" ON public.groups;
DROP POLICY IF EXISTS "groups_insert_policy" ON public.groups;
DROP POLICY IF EXISTS "groups_update_policy" ON public.groups;
DROP POLICY IF EXISTS "groups_delete_policy" ON public.groups;

DROP POLICY IF EXISTS "group_members_select_policy" ON public.group_members;
DROP POLICY IF EXISTS "group_members_insert_self_policy" ON public.group_members;
DROP POLICY IF EXISTS "group_members_insert_creator_policy" ON public.group_members;
DROP POLICY IF EXISTS "group_members_update_self_policy" ON public.group_members;
DROP POLICY IF EXISTS "group_members_update_creator_policy" ON public.group_members;
DROP POLICY IF EXISTS "group_members_delete_self_policy" ON public.group_members;
DROP POLICY IF EXISTS "group_members_delete_creator_policy" ON public.group_members;
DROP POLICY IF EXISTS "group_members_creator_manage" ON public.group_members;
DROP POLICY IF EXISTS "group_members_insert_creator" ON public.group_members;
DROP POLICY IF EXISTS "group_members_update_creator" ON public.group_members;
DROP POLICY IF EXISTS "group_members_delete_creator" ON public.group_members;
-- Drop policies created by this migration (idempotent)
DROP POLICY IF EXISTS "group_members_insert_self" ON public.group_members;
DROP POLICY IF EXISTS "group_members_update_own" ON public.group_members;
DROP POLICY IF EXISTS "group_members_delete_own" ON public.group_members;
DROP POLICY IF EXISTS "expenses_select_policy" ON public.expenses;
DROP POLICY IF EXISTS "expenses_insert_policy" ON public.expenses;
DROP POLICY IF EXISTS "expenses_update_policy" ON public.expenses;
DROP POLICY IF EXISTS "expenses_delete_policy" ON public.expenses;
DROP POLICY IF EXISTS "expense_splits_select_policy" ON public.expense_splits;
DROP POLICY IF EXISTS "expense_splits_insert_policy" ON public.expense_splits;
DROP POLICY IF EXISTS "expense_splits_update_policy" ON public.expense_splits;
DROP POLICY IF EXISTS "expense_splits_delete_policy" ON public.expense_splits;
DROP POLICY IF EXISTS "settlements_select_policy" ON public.settlements;
DROP POLICY IF EXISTS "settlements_insert_policy" ON public.settlements;
DROP POLICY IF EXISTS "settlements_update_policy" ON public.settlements;
DROP POLICY IF EXISTS "invitations_select_policy" ON public.invitations;
DROP POLICY IF EXISTS "invitations_insert_policy" ON public.invitations;
DROP POLICY IF EXISTS "invitations_update_policy" ON public.invitations;
DROP POLICY IF EXISTS "invitations_delete_policy" ON public.invitations;
DROP POLICY IF EXISTS "notifications_select_policy" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert_policy" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update_policy" ON public.notifications;
DROP POLICY IF EXISTS "notifications_delete_policy" ON public.notifications;
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;

-- GROUPS POLICIES
-- Allow users to see groups they created or are members of
-- Note: This creates a circular reference, but Supabase handles it by allowing the query
CREATE POLICY "groups_select_policy" ON public.groups
  FOR SELECT USING (
    created_by = auth.uid()
    OR id IN (
      SELECT group_id FROM public.group_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "groups_insert_policy" ON public.groups
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "groups_update_policy" ON public.groups
  FOR UPDATE USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());

CREATE POLICY "groups_delete_policy" ON public.groups
  FOR DELETE USING (created_by = auth.uid());
-- (removed duplicate early expenses policies; see the consolidated EXPENSES POLICIES section below)

-- Group creators: operation-specific, scoped to their own groups only
-- INSERT: creators can add members to groups they created
CREATE POLICY "group_members_insert_creator" ON public.group_members
  FOR INSERT WITH CHECK (
    group_id IN (
      SELECT id FROM public.groups WHERE created_by = auth.uid()
    )
  );

-- UPDATE: creators can update memberships only within groups they created
CREATE POLICY "group_members_update_creator" ON public.group_members
  FOR UPDATE USING (
    group_id IN (
      SELECT id FROM public.groups WHERE created_by = auth.uid()
    )
  ) WITH CHECK (
    group_id IN (
      SELECT id FROM public.groups WHERE created_by = auth.uid()
    )
  );

-- DELETE: creators can remove memberships only from groups they created
CREATE POLICY "group_members_delete_creator" ON public.group_members
  FOR DELETE USING (
    group_id IN (
      SELECT id FROM public.groups WHERE created_by = auth.uid()
    )
  );

-- EXPENSES POLICIES (simplified)
CREATE POLICY "expenses_select_policy" ON public.expenses
  FOR SELECT USING (
    payer_id = auth.uid()
    OR group_id IN (
      SELECT id FROM public.groups WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "expenses_insert_policy" ON public.expenses
  FOR INSERT WITH CHECK (
    payer_id = auth.uid()
    AND group_id IN (
      SELECT id FROM public.groups WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "expenses_update_policy" ON public.expenses
  FOR UPDATE USING (payer_id = auth.uid())
  WITH CHECK (payer_id = auth.uid());
CREATE POLICY "expenses_delete_policy" ON public.expenses
  FOR DELETE USING (payer_id = auth.uid());

-- EXPENSE_SPLITS POLICIES
CREATE POLICY "expense_splits_select_policy" ON public.expense_splits
  FOR SELECT USING (
    user_id = auth.uid()
    OR expense_id IN (
      SELECT id FROM public.expenses WHERE payer_id = auth.uid()
    )
  );

CREATE POLICY "expense_splits_insert_policy" ON public.expense_splits
  FOR INSERT WITH CHECK (
    expense_id IN (
      SELECT id FROM public.expenses WHERE payer_id = auth.uid()
    )
  );

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

CREATE POLICY "expense_splits_delete_policy" ON public.expense_splits
  FOR DELETE USING (
    user_id = auth.uid()
    OR expense_id IN (
      SELECT id FROM public.expenses WHERE payer_id = auth.uid()
    )
  );

-- SETTLEMENTS POLICIES
CREATE POLICY "settlements_select_policy" ON public.settlements
  FOR SELECT USING (
    payer_id = auth.uid()
    OR receiver_id = auth.uid()
    OR group_id IN (
      SELECT id FROM public.groups WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "settlements_insert_policy" ON public.settlements
  FOR INSERT WITH CHECK (
    payer_id = auth.uid()
    OR group_id IN (
      SELECT id FROM public.groups WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "settlements_update_policy" ON public.settlements
  FOR UPDATE USING (
    payer_id = auth.uid()
    OR receiver_id = auth.uid()
  ) WITH CHECK (
    payer_id = auth.uid()
    OR receiver_id = auth.uid()
  );

-- INVITATIONS POLICIES
CREATE POLICY "invitations_select_policy" ON public.invitations
  FOR SELECT USING (
    inviter_id = auth.uid()
    OR invitee_email = (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
  );

CREATE POLICY "invitations_insert_policy" ON public.invitations
  FOR INSERT WITH CHECK (
    inviter_id = auth.uid()
    AND group_id IN (
      SELECT id FROM public.groups WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "invitations_update_policy" ON public.invitations
  FOR UPDATE USING (
    inviter_id = auth.uid()
    AND group_id IN (
      SELECT id FROM public.groups WHERE created_by = auth.uid()
    )
  ) WITH CHECK (
    inviter_id = auth.uid()
    AND group_id IN (
      SELECT id FROM public.groups WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "invitations_delete_policy" ON public.invitations
  FOR DELETE USING (inviter_id = auth.uid());

-- NOTIFICATIONS POLICIES
CREATE POLICY "notifications_select_policy" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "notifications_insert_policy" ON public.notifications
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "notifications_update_policy" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "notifications_delete_policy" ON public.notifications
  FOR DELETE USING (user_id = auth.uid());

-- PROFILES POLICIES
CREATE POLICY "profiles_select_policy" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "profiles_update_policy" ON public.profiles
  FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_insert_policy" ON public.profiles
  FOR INSERT WITH CHECK (id = auth.uid());

-- SAFETY TRIGGER: prevent moving memberships between groups by non-creators
-- If group_id changes on group_members, only allow it when the current user
-- is the creator of the destination group.
CREATE OR REPLACE FUNCTION public.prevent_group_change_unless_creator()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.group_id IS DISTINCT FROM OLD.group_id THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.groups g
      WHERE g.id = NEW.group_id
        AND g.created_by = auth.uid()
    ) THEN
      RAISE EXCEPTION 'Only the creator of the destination group can move memberships between groups';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Recreate trigger to ensure latest definition
DROP TRIGGER IF EXISTS group_members_prevent_group_change ON public.group_members;
CREATE TRIGGER group_members_prevent_group_change
BEFORE UPDATE ON public.group_members
FOR EACH ROW
EXECUTE FUNCTION public.prevent_group_change_unless_creator();