-- Fix infinite recursion in RLS policies - Simplified Approach
-- This script completely replaces all problematic policies with simple, non-recursive ones

-- First, disable RLS temporarily to clear all policies
ALTER TABLE public.groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_splits DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlements DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "groups_creators_can_select" ON public.groups;
DROP POLICY IF EXISTS "groups_members_can_select" ON public.groups;
DROP POLICY IF EXISTS "groups_insert_policy" ON public.groups;
DROP POLICY IF EXISTS "groups_update_policy" ON public.groups;
DROP POLICY IF EXISTS "groups_delete_policy" ON public.groups;

DROP POLICY IF EXISTS "group_members_select_own" ON public.group_members;
DROP POLICY IF EXISTS "group_members_select_as_creator" ON public.group_members;
DROP POLICY IF EXISTS "group_members_insert_self" ON public.group_members;
DROP POLICY IF EXISTS "group_members_insert_as_creator" ON public.group_members;
DROP POLICY IF EXISTS "group_members_insert_via_invitation" ON public.group_members;
DROP POLICY IF EXISTS "group_members_insert_self_on_creation" ON public.group_members;
DROP POLICY IF EXISTS "group_members_update_own" ON public.group_members;
DROP POLICY IF EXISTS "group_members_update_as_creator" ON public.group_members;
DROP POLICY IF EXISTS "group_members_delete_own" ON public.group_members;
DROP POLICY IF EXISTS "group_members_delete_as_creator" ON public.group_members;

-- Drop all other table policies
DROP POLICY IF EXISTS "expenses_select_own" ON public.expenses;
DROP POLICY IF EXISTS "expenses_select_as_member" ON public.expenses;
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

-- Create simple, non-recursive policies

-- PROFILES - Allow everyone to read (needed for UI), users can update own
CREATE POLICY "profiles_read_all" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (id = auth.uid());

-- GROUPS - Simple owner-based access
CREATE POLICY "groups_owner_all" ON public.groups
  FOR ALL USING (created_by = auth.uid());

-- Allow reading groups if user is a member (simple subquery, no recursion)
CREATE POLICY "groups_member_read" ON public.groups
  FOR SELECT USING (
    id IN (
      SELECT group_id FROM public.group_members 
      WHERE user_id = auth.uid()
    )
  );

-- GROUP_MEMBERS - Simple policies without cross-references
CREATE POLICY "group_members_read_own" ON public.group_members
  FOR SELECT USING (user_id = auth.uid());

-- Allow group owners to see all members of their groups (direct ownership check)
CREATE POLICY "group_members_owner_read" ON public.group_members
  FOR SELECT USING (
    group_id IN (
      SELECT id FROM public.groups 
      WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "group_members_insert_own" ON public.group_members
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Allow group owners to add members (direct ownership check)
CREATE POLICY "group_members_owner_insert" ON public.group_members
  FOR INSERT WITH CHECK (
    group_id IN (
      SELECT id FROM public.groups 
      WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "group_members_update_own" ON public.group_members
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "group_members_owner_update" ON public.group_members
  FOR UPDATE USING (
    group_id IN (
      SELECT id FROM public.groups 
      WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "group_members_delete_own" ON public.group_members
  FOR DELETE USING (user_id = auth.uid());

CREATE POLICY "group_members_owner_delete" ON public.group_members
  FOR DELETE USING (
    group_id IN (
      SELECT id FROM public.groups 
      WHERE created_by = auth.uid()
    )
  );

-- EXPENSES - Simple member-based access
CREATE POLICY "expenses_member_all" ON public.expenses
  FOR ALL USING (
    group_id IN (
      SELECT group_id FROM public.group_members 
      WHERE user_id = auth.uid()
    )
  );

-- EXPENSE_SPLITS - Simple member-based access
CREATE POLICY "expense_splits_member_all" ON public.expense_splits
  FOR ALL USING (
    user_id = auth.uid()
    OR expense_id IN (
      SELECT id FROM public.expenses e
      WHERE e.group_id IN (
        SELECT group_id FROM public.group_members 
        WHERE user_id = auth.uid()
      )
    )
  );

-- SETTLEMENTS - Simple member-based access
CREATE POLICY "settlements_member_all" ON public.settlements
  FOR ALL USING (
    from_user_id = auth.uid()
    OR to_user_id = auth.uid()
    OR group_id IN (
      SELECT group_id FROM public.group_members 
      WHERE user_id = auth.uid()
    )
  );

-- INVITATIONS - Simple policies
CREATE POLICY "invitations_inviter_all" ON public.invitations
  FOR ALL USING (inviter_id = auth.uid());

CREATE POLICY "invitations_invitee_read" ON public.invitations
  FOR SELECT USING (
    invitee_email = (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
  );

-- NOTIFICATIONS - Simple user-based access
CREATE POLICY "notifications_user_all" ON public.notifications
  FOR ALL USING (user_id = auth.uid());

-- Re-enable RLS for all tables
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Ensure the invite RPC function exists with correct logic
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

  -- Check if invitation already exists
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

  -- Generate secure token
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

  -- Return success
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

-- Accept invitation function
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