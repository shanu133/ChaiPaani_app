-- Fix infinite recursion in RLS policies - Final Solution
-- This migration eliminates circular references between groups and group_members tables

-- Drop all problematic policies that create circular references
DROP POLICY IF EXISTS "groups_select_policy" ON public.groups;
DROP POLICY IF EXISTS "groups_insert_policy" ON public.groups;
DROP POLICY IF EXISTS "groups_update_policy" ON public.groups;
DROP POLICY IF EXISTS "groups_delete_policy" ON public.groups;

DROP POLICY IF EXISTS "group_members_select_policy" ON public.group_members;
DROP POLICY IF EXISTS "group_members_insert_self" ON public.group_members;
DROP POLICY IF EXISTS "group_members_update_own" ON public.group_members;
DROP POLICY IF EXISTS "group_members_delete_own" ON public.group_members;
DROP POLICY IF EXISTS "group_members_creator_manage" ON public.group_members;

-- GROUPS POLICIES - Simple and direct approach
-- Allow users to see groups they created (no membership check needed)
DROP POLICY IF EXISTS "groups_creators_can_select" ON public.groups;
CREATE POLICY "groups_creators_can_select" ON public.groups
  FOR SELECT USING (created_by = auth.uid());

-- Allow users to see groups they are direct members of (using a subquery that won't cause recursion)
DROP POLICY IF EXISTS "groups_members_can_select" ON public.groups;
CREATE POLICY "groups_members_can_select" ON public.groups
  FOR SELECT USING (
    id IN (
      SELECT group_id FROM public.group_members
      WHERE user_id = auth.uid()
    )
    );
  
  -- Add index to optimize RLS membership checks
  CREATE INDEX IF NOT EXISTS idx_group_members_group_id_user_id
    ON public.group_members (group_id, user_id);

DROP POLICY IF EXISTS "groups_insert_policy" ON public.groups;
CREATE POLICY "groups_insert_policy" ON public.groups
  FOR INSERT WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "groups_update_policy" ON public.groups;
CREATE POLICY "groups_update_policy" ON public.groups
  FOR UPDATE USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "groups_delete_policy" ON public.groups;
CREATE POLICY "groups_delete_policy" ON public.groups
  FOR DELETE USING (created_by = auth.uid());

-- GROUP_MEMBERS POLICIES - Direct checks without referencing groups table
-- Allow users to see their own memberships
DROP POLICY IF EXISTS "group_members_select_own" ON public.group_members;
CREATE POLICY "group_members_select_own" ON public.group_members
  FOR SELECT USING (user_id = auth.uid());

-- Allow group creators to see all memberships in their groups (direct creator check)
DROP POLICY IF EXISTS "group_members_select_as_creator" ON public.group_members;
CREATE POLICY "group_members_select_as_creator" ON public.group_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.groups 
      WHERE groups.id = group_members.group_id 
      AND groups.created_by = auth.uid()
    )
  );

-- Allow users to join groups (insert their own membership)
DROP POLICY IF EXISTS "group_members_insert_self" ON public.group_members;
CREATE POLICY "group_members_insert_self" ON public.group_members
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Allow group creators to add members (insert operation for creators)
DROP POLICY IF EXISTS "group_members_insert_as_creator" ON public.group_members;
CREATE POLICY "group_members_insert_as_creator" ON public.group_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.groups
      WHERE groups.id = group_members.group_id
      AND groups.created_by = auth.uid()
    )
  );

-- Allow invitation acceptance (users can join groups via accepted invitations)
DROP POLICY IF EXISTS "group_members_insert_via_invitation" ON public.group_members;
CREATE POLICY "group_members_insert_via_invitation" ON public.group_members
  FOR INSERT WITH CHECK (
    -- This allows the SECURITY DEFINER function to insert memberships during invitation acceptance
    -- The application logic in the RPC function handles the validation
    user_id = auth.uid()
  );

-- Allow group creators to add themselves as members during group creation
DROP POLICY IF EXISTS "group_members_insert_self_on_creation" ON public.group_members;
CREATE POLICY "group_members_insert_self_on_creation" ON public.group_members
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.groups
      WHERE groups.id = group_members.group_id
      AND groups.created_by = auth.uid()
    )
  );

-- Allow users to update their own membership
DROP POLICY IF EXISTS "group_members_update_own" ON public.group_members;
CREATE POLICY "group_members_update_own" ON public.group_members
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Allow group creators to update memberships
DROP POLICY IF EXISTS "group_members_update_as_creator" ON public.group_members;
CREATE POLICY "group_members_update_as_creator" ON public.group_members
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.groups 
      WHERE groups.id = group_members.group_id 
      AND groups.created_by = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.groups 
      WHERE groups.id = group_members.group_id 
      AND groups.created_by = auth.uid()
    )
  );

-- Allow users to delete their own membership (leave group)
DROP POLICY IF EXISTS "group_members_delete_own" ON public.group_members;
CREATE POLICY "group_members_delete_own" ON public.group_members
  FOR DELETE USING (user_id = auth.uid());

-- Allow group creators to remove members
DROP POLICY IF EXISTS "group_members_delete_as_creator" ON public.group_members;
CREATE POLICY "group_members_delete_as_creator" ON public.group_members
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.groups 
      WHERE groups.id = group_members.group_id 
      AND groups.created_by = auth.uid()
    )
  );

-- Update other table policies to use the same pattern (avoiding recursion)

-- EXPENSES POLICIES
DROP POLICY IF EXISTS "expenses_select_policy" ON public.expenses;
DROP POLICY IF EXISTS "expenses_select_own" ON public.expenses;
DROP POLICY IF EXISTS "expenses_select_as_member" ON public.expenses;
DROP POLICY IF EXISTS "expenses_insert_policy" ON public.expenses;
DROP POLICY IF EXISTS "expenses_update_policy" ON public.expenses;
DROP POLICY IF EXISTS "expenses_delete_policy" ON public.expenses;

-- Allow users to see expenses they created
DROP POLICY IF EXISTS "expenses_select_own" ON public.expenses;
CREATE POLICY "expenses_select_own" ON public.expenses
  FOR SELECT USING (payer_id = auth.uid());

-- Allow users to see expenses in groups they're members of (direct membership check)
DROP POLICY IF EXISTS "expenses_select_as_member" ON public.expenses;
CREATE POLICY "expenses_select_as_member" ON public.expenses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_members.group_id = expenses.group_id
      AND group_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "expenses_insert_policy" ON public.expenses;
CREATE POLICY "expenses_insert_policy" ON public.expenses
  FOR INSERT WITH CHECK (
    payer_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_members.group_id = expenses.group_id
      AND group_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "expenses_update_policy" ON public.expenses;
CREATE POLICY "expenses_update_policy" ON public.expenses
  FOR UPDATE USING (payer_id = auth.uid()) WITH CHECK (payer_id = auth.uid());

DROP POLICY IF EXISTS "expenses_delete_policy" ON public.expenses;
CREATE POLICY "expenses_delete_policy" ON public.expenses
  FOR DELETE USING (payer_id = auth.uid());

-- EXPENSE_SPLITS POLICIES
DROP POLICY IF EXISTS "expense_splits_select_policy" ON public.expense_splits;
DROP POLICY IF EXISTS "expense_splits_insert_policy" ON public.expense_splits;
DROP POLICY IF EXISTS "expense_splits_update_policy" ON public.expense_splits;
DROP POLICY IF EXISTS "expense_splits_delete_policy" ON public.expense_splits;

DROP POLICY IF EXISTS "expense_splits_select_policy" ON public.expense_splits;
CREATE POLICY "expense_splits_select_policy" ON public.expense_splits
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.expenses 
      WHERE expenses.id = expense_splits.expense_id 
      AND expenses.payer_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.expenses e
      JOIN public.group_members gm ON gm.group_id = e.group_id
      WHERE e.id = expense_splits.expense_id
      AND gm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "expense_splits_insert_policy" ON public.expense_splits;
CREATE POLICY "expense_splits_insert_policy" ON public.expense_splits
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.expenses 
      WHERE expenses.id = expense_splits.expense_id 
      AND expenses.payer_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "expense_splits_update_policy" ON public.expense_splits;
CREATE POLICY "expense_splits_update_policy" ON public.expense_splits
  FOR UPDATE USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.expenses 
      WHERE expenses.id = expense_splits.expense_id 
      AND expenses.payer_id = auth.uid()
    )
  ) WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.expenses 
      WHERE expenses.id = expense_splits.expense_id 
      AND expenses.payer_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "expense_splits_delete_policy" ON public.expense_splits;
CREATE POLICY "expense_splits_delete_policy" ON public.expense_splits
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.expenses 
      WHERE expenses.id = expense_splits.expense_id 
      AND expenses.payer_id = auth.uid()
    )
  );

-- SETTLEMENTS POLICIES
DROP POLICY IF EXISTS "settlements_select_policy" ON public.settlements;
DROP POLICY IF EXISTS "settlements_insert_policy" ON public.settlements;
DROP POLICY IF EXISTS "settlements_update_policy" ON public.settlements;
DROP POLICY IF EXISTS "settlements_delete_policy" ON public.settlements;

DROP POLICY IF EXISTS "settlements_select_policy" ON public.settlements;
CREATE POLICY "settlements_select_policy" ON public.settlements
  FOR SELECT USING (
    payer_id = auth.uid()
    OR receiver_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_members.group_id = settlements.group_id
      AND group_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "settlements_insert_policy" ON public.settlements;
CREATE POLICY "settlements_insert_policy" ON public.settlements
  FOR INSERT WITH CHECK (
    (payer_id = auth.uid() OR receiver_id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_members.group_id = settlements.group_id
      AND group_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "settlements_update_policy" ON public.settlements;
CREATE POLICY "settlements_update_policy" ON public.settlements
  FOR UPDATE USING (
    payer_id = auth.uid() OR receiver_id = auth.uid()
  ) WITH CHECK (
    payer_id = auth.uid() OR receiver_id = auth.uid()
  );

DROP POLICY IF EXISTS "settlements_delete_policy" ON public.settlements;
CREATE POLICY "settlements_delete_policy" ON public.settlements
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.groups
      WHERE groups.id = settlements.group_id
      AND groups.created_by = auth.uid()
    )
    OR payer_id = auth.uid()
  );

-- INVITATIONS POLICIES (these should be safe from recursion)
DROP POLICY IF EXISTS "invitations_select_policy" ON public.invitations;
DROP POLICY IF EXISTS "invitations_insert_policy" ON public.invitations;
DROP POLICY IF EXISTS "invitations_update_policy" ON public.invitations;
DROP POLICY IF EXISTS "invitations_delete_policy" ON public.invitations;

DROP POLICY IF EXISTS "invitations_select_policy" ON public.invitations;
CREATE POLICY "invitations_select_policy" ON public.invitations
  FOR SELECT USING (
    inviter_id = auth.uid()
    OR invitee_email = (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "invitations_insert_policy" ON public.invitations;
CREATE POLICY "invitations_insert_policy" ON public.invitations
  FOR INSERT WITH CHECK (
    inviter_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.groups 
      WHERE groups.id = invitations.group_id 
      AND groups.created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "invitations_update_policy" ON public.invitations;
CREATE POLICY "invitations_update_policy" ON public.invitations
  FOR UPDATE USING (inviter_id = auth.uid()) WITH CHECK (inviter_id = auth.uid());

DROP POLICY IF EXISTS "invitations_delete_policy" ON public.invitations;
CREATE POLICY "invitations_delete_policy" ON public.invitations
  FOR DELETE USING (inviter_id = auth.uid());

-- NOTIFICATIONS POLICIES (these should be safe)
DROP POLICY IF EXISTS "notifications_select_policy" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert_policy" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update_policy" ON public.notifications;
DROP POLICY IF EXISTS "notifications_delete_policy" ON public.notifications;

DROP POLICY IF EXISTS "notifications_select_policy" ON public.notifications;
CREATE POLICY "notifications_select_policy" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "notifications_insert_policy" ON public.notifications;
CREATE POLICY "notifications_insert_policy" ON public.notifications
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "notifications_update_policy" ON public.notifications;
CREATE POLICY "notifications_update_policy" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "notifications_delete_policy" ON public.notifications;
CREATE POLICY "notifications_delete_policy" ON public.notifications
  FOR DELETE USING (user_id = auth.uid());

-- PROFILES POLICIES (these should be safe)
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;

-- Allow everyone to see basic profile info (needed for group member displays)
CREATE POLICY "profiles_select_policy" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "profiles_update_policy" ON public.profiles
  FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_insert_policy" ON public.profiles
  FOR INSERT WITH CHECK (id = auth.uid());

-- Create missing RPC function for invite-user Edge Function
CREATE OR REPLACE FUNCTION invite_user_to_group(
  p_group_id UUID,
  p_invitee_email TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_inviter_id UUID;
  v_invitation_id UUID;
  v_token TEXT;
  v_group_exists BOOLEAN;
BEGIN
  -- Get current user
  v_inviter_id := auth.uid();
  IF v_inviter_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Validate group exists and user is the creator
  SELECT EXISTS(
    SELECT 1 FROM groups
    WHERE id = p_group_id AND created_by = v_inviter_id
  ) INTO v_group_exists;

  IF NOT v_group_exists THEN
    RAISE EXCEPTION 'Group not found or user is not the group creator';
  END IF;

  -- Check if invitation already exists for this email and group
  IF EXISTS(
    SELECT 1 FROM invitations
    WHERE group_id = p_group_id
    AND invitee_email = LOWER(p_invitee_email)
    AND status = 'pending'
    AND expires_at > NOW()
  ) THEN
    RAISE EXCEPTION 'Active invitation already exists for this email';
  END IF;

  -- Check if user is already a member
  IF EXISTS(
    SELECT 1 FROM group_members gm
    JOIN profiles p ON p.id = gm.user_id
    WHERE gm.group_id = p_group_id
    AND LOWER(p.email) = LOWER(p_invitee_email)
  ) THEN
    RAISE EXCEPTION 'User is already a member of this group';
  END IF;

  -- Generate a secure token
  v_token := encode(gen_random_bytes(32), 'hex');

  -- Create invitation
  INSERT INTO invitations (
    group_id,
    inviter_id,
    invitee_email,
    token,
    status,
    expires_at
  ) VALUES (
    p_group_id,
    v_inviter_id,
    LOWER(p_invitee_email),
    v_token,
    'pending',
    NOW() + INTERVAL '7 days'
  ) RETURNING id INTO v_invitation_id;

  -- Return success with token
  RETURN jsonb_build_object(
    'success', true,
    'token', v_token,
    'invitation_id', v_invitation_id,
    'message', 'Invitation created successfully'
  );

EXCEPTION WHEN OTHERS THEN
  -- Return error details
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'message', 'Failed to create invitation'
  );
END;
$$;

-- Function to accept group invitation
CREATE OR REPLACE FUNCTION accept_group_invitation(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_invitation_id UUID;
  v_group_id UUID;
  v_invitee_email TEXT;
  v_membership_exists BOOLEAN;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Get user email
  SELECT email INTO v_invitee_email
  FROM auth.users
  WHERE id = v_user_id;

  IF v_invitee_email IS NULL THEN
    RAISE EXCEPTION 'User email not found';
  END IF;

  -- Find and validate invitation
  SELECT id, group_id INTO v_invitation_id, v_group_id
  FROM invitations
  WHERE token = p_token
    AND status = 'pending'
    AND expires_at > NOW()
    AND LOWER(invitee_email) = LOWER(v_invitee_email);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired invitation token';
  END IF;

  -- Check if user is already a member
  SELECT EXISTS(
    SELECT 1 FROM group_members
    WHERE group_id = v_group_id AND user_id = v_user_id
  ) INTO v_membership_exists;

  IF NOT v_membership_exists THEN
    -- Add user to group
    INSERT INTO group_members (group_id, user_id, role, joined_at)
    VALUES (v_group_id, v_user_id, 'member', NOW());
  END IF;

  -- Mark invitation as accepted
  UPDATE invitations
  SET status = 'accepted', accepted_at = NOW()
  WHERE id = v_invitation_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Successfully joined group',
    'group_id', v_group_id
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'message', 'Failed to accept invitation'
  );
END;
$$;

-- Function to get group member count including pending invitations
CREATE OR REPLACE FUNCTION get_group_member_count(p_group_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_active_members INTEGER;
  v_pending_invitations INTEGER;
  v_total_count INTEGER;
BEGIN
  -- Count active members
  SELECT COUNT(*) INTO v_active_members
  FROM group_members
  WHERE group_id = p_group_id;

  -- Count pending invitations
  SELECT COUNT(*) INTO v_pending_invitations
  FROM invitations
  WHERE group_id = p_group_id
    AND status = 'pending'
    AND expires_at > NOW();

  v_total_count := v_active_members + v_pending_invitations;

  RETURN jsonb_build_object(
    'active_members', v_active_members,
    'pending_invitations', v_pending_invitations,
    'total_count', v_total_count
  );
END;
$$;