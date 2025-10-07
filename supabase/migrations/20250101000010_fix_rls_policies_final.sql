-- Final RLS policy fix - allow users to see groups they're members of
-- This addresses the issue where users couldn't see groups they were invited to

-- Drop the overly restrictive policy
DROP POLICY IF EXISTS "users_can_view_own_groups" ON public.groups;
DROP POLICY IF EXISTS "users_can_view_groups" ON public.groups;

-- Create proper policy that allows users to see groups they created OR are members of
CREATE POLICY "users_can_view_groups" ON public.groups
  FOR SELECT USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_members.group_id = groups.id
      AND group_members.user_id = auth.uid()
    )
  );

-- Keep existing INSERT, UPDATE, DELETE policies for groups

-- Ensure group members policies allow proper access
DROP POLICY IF EXISTS "users_can_view_own_memberships" ON public.group_members;
DROP POLICY IF EXISTS "users_can_join_groups" ON public.group_members;
DROP POLICY IF EXISTS "users_can_view_memberships" ON public.group_members;

CREATE POLICY "users_can_view_memberships" ON public.group_members
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.groups
      WHERE groups.id = group_members.group_id
      AND groups.created_by = auth.uid()
    )
  );

CREATE POLICY "users_can_join_groups" ON public.group_members
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.invitations i
      WHERE i.group_id = group_members.group_id
        AND i.status = 'pending'
        AND (i.expires_at IS NULL OR i.expires_at > now())
        AND lower(i.invitee_email) = lower(coalesce((auth.jwt() ->> 'email'), ''))
    )
  );

-- Keep existing UPDATE, DELETE policies for group_members

-- Ensure expenses and splits are accessible to group members
DROP POLICY IF EXISTS "authenticated_users_view_expenses" ON public.expenses;
DROP POLICY IF EXISTS "authenticated_users_view_splits" ON public.expense_splits;
DROP POLICY IF EXISTS "group_members_view_expenses" ON public.expenses;
DROP POLICY IF EXISTS "group_members_view_splits" ON public.expense_splits;

CREATE POLICY "group_members_view_expenses" ON public.expenses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_members.group_id = expenses.group_id
      AND group_members.user_id = auth.uid()
    )
  );

CREATE POLICY "group_members_view_splits" ON public.expense_splits
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.expenses e
      JOIN public.group_members gm ON gm.group_id = e.group_id
      WHERE e.id = expense_splits.expense_id
      AND gm.user_id = auth.uid()
    )
  );
DROP POLICY IF EXISTS "users_can_view_memberships" ON group_members;
DROP POLICY IF EXISTS "users_can_join_groups" ON group_members;
DROP POLICY IF EXISTS "Group creators can manage memberships" ON group_members;
DROP POLICY IF EXISTS "group_creators_add_members" ON group_members;
DROP POLICY IF EXISTS "group_creators_remove_members" ON group_members;
DROP POLICY IF EXISTS "group_creators_update_memberships" ON group_members;
DROP POLICY IF EXISTS "group_creators_view_all_memberships" ON group_members;
DROP POLICY IF EXISTS "users_join_groups" ON group_members;
DROP POLICY IF EXISTS "users_leave_groups" ON group_members;
DROP POLICY IF EXISTS "users_update_own_memberships" ON group_members;
DROP POLICY IF EXISTS "users_view_own_memberships" ON group_members;
DROP POLICY IF EXISTS "users_select_own_membership" ON group_members;
DROP POLICY IF EXISTS "group_members_select_via_groups" ON group_members;
DROP POLICY IF EXISTS "users_insert_own_membership" ON group_members;
DROP POLICY IF EXISTS "group_creators_insert_members" ON group_members;
DROP POLICY IF EXISTS "users_update_own_membership" ON group_members;
DROP POLICY IF EXISTS "group_creators_update_members" ON group_members;
DROP POLICY IF EXISTS "users_delete_own_membership" ON group_members;
DROP POLICY IF EXISTS "group_creators_delete_members" ON group_members;DROP POLICY IF EXISTS "users_update_own_memberships" ON group_members;
DROP POLICY IF EXISTS "users_view_own_memberships" ON group_members;
DROP POLICY IF EXISTS "users_select_own_membership" ON group_members;
DROP POLICY IF EXISTS "group_members_select_via_groups" ON group_members;
DROP POLICY IF EXISTS "users_insert_own_membership" ON group_members;
DROP POLICY IF EXISTS "group_creators_insert_members" ON group_members;
DROP POLICY IF EXISTS "users_update_own_membership" ON group_members;
DROP POLICY IF EXISTS "group_creators_update_members" ON group_members;
DROP POLICY IF EXISTS "users_delete_own_membership" ON group_members;
DROP POLICY IF EXISTS "group_creators_delete_members" ON group_members;

-- Step 3: Create join-safe policies

-- SELECT Policies (Safe for joins)
CREATE POLICY "users_select_own_membership" ON group_members
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "group_members_select_via_groups" ON group_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM groups
      WHERE groups.id = group_members.group_id
      AND (
        groups.created_by = auth.uid()  -- Group creator
        OR groups.id IN (              -- Member of group (avoiding direct self-reference)
          SELECT gm2.group_id FROM group_members gm2
          WHERE gm2.user_id = auth.uid()
          AND gm2.group_id = groups.id
          LIMIT 1
        )
      )
    )
  );

-- INSERT Policies
CREATE POLICY "users_insert_own_membership" ON group_members
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM public.invitations i
      WHERE i.group_id = group_members.group_id
        AND i.status = 'pending'
        AND (i.expires_at IS NULL OR i.expires_at > now())
        AND lower(i.invitee_email) = lower(coalesce((auth.jwt() ->> 'email'), ''))
    )
  );

CREATE POLICY "group_creators_insert_members" ON group_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM groups
      WHERE groups.id = group_members.group_id
      AND groups.created_by = auth.uid()
    )
  );

-- UPDATE Policies
CREATE POLICY "users_update_own_membership" ON group_members
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "group_creators_update_members" ON group_members
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM groups
      WHERE groups.id = group_members.group_id
      AND groups.created_by = auth.uid()
    )
  );

-- DELETE Policies
CREATE POLICY "users_delete_own_membership" ON group_members
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "group_creators_delete_members" ON group_members
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM groups
      WHERE groups.id = group_members.group_id
      AND groups.created_by = auth.uid()
    )
  );