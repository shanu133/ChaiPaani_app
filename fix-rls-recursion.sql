-- Fix infinite recursion in RLS policies - Non-recursive, one-directional approach
-- This script resets policies with a dynamic drop and recreates safe, non-recursive policies.

-- First, disable RLS temporarily to clear all policies
ALTER TABLE public.groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_splits DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlements DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.activities DISABLE ROW LEVEL SECURITY;

-- Cleanup: ensure any leftover helper views from prior runs are removed (RLS not supported on views)
DROP VIEW IF EXISTS public.owner_member_view;

-- Dynamically drop ALL existing policies on target tables to avoid leftovers with different names
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'groups','group_members','expenses','expense_splits','settlements',
        'invitations','notifications','profiles','activities'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END$$;

-- Create simple, non-recursive policies

-- Helper functions to avoid recursive policy evaluation.
-- These run as SECURITY DEFINER and bypass RLS for internal membership checks.
CREATE OR REPLACE FUNCTION public.is_group_member(p_group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = p_group_id AND gm.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_group_owner(p_group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.groups g
    WHERE g.id = p_group_id AND g.created_by = auth.uid()
  );
$$;

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

-- Allow reading groups if user is a member (via definer function to avoid recursion)
CREATE POLICY "groups_member_read" ON public.groups
  FOR SELECT USING (public.is_group_member(id));

-- GROUP_MEMBERS - allow self operations and owners to manage their group's members
CREATE POLICY "group_members_read_self_or_owner" ON public.group_members
  FOR SELECT USING (
    user_id = auth.uid() OR public.is_group_owner(group_id)
  );

CREATE POLICY "group_members_insert_self_or_owner" ON public.group_members
  FOR INSERT WITH CHECK (
    user_id = auth.uid() OR public.is_group_owner(group_id)
  );

CREATE POLICY "group_members_update_self_or_owner" ON public.group_members
  FOR UPDATE USING (
    user_id = auth.uid() OR public.is_group_owner(group_id)
  );

CREATE POLICY "group_members_delete_self_or_owner" ON public.group_members
  FOR DELETE USING (
    user_id = auth.uid() OR public.is_group_owner(group_id)
  );

-- EXPENSES - members or owners of the group
CREATE POLICY "expenses_member_all" ON public.expenses
  FOR ALL USING (
    public.is_group_member(group_id) OR public.is_group_owner(group_id)
  );

-- EXPENSE_SPLITS - a user can see their own, or members/owners of the parent expense's group
CREATE POLICY "expense_splits_member_all" ON public.expense_splits
  FOR ALL USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.expenses e
      WHERE e.id = expense_splits.expense_id
        AND (public.is_group_member(e.group_id) OR public.is_group_owner(e.group_id))
    )
  );

-- SETTLEMENTS - participants or members/owners of the group
CREATE POLICY "settlements_member_all" ON public.settlements
  FOR ALL USING (
    payer_id = auth.uid()
    OR receiver_id = auth.uid()
    OR public.is_group_member(group_id)
    OR public.is_group_owner(group_id)
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
ALTER TABLE IF EXISTS public.activities ENABLE ROW LEVEL SECURITY;

-- ACTIVITIES - simple read policy if your schema tracks group_id on activities
-- Safely allow members to read their groups' activities without referencing groups
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'activities' AND column_name = 'group_id'
  ) THEN
    -- Make idempotent: drop then create policy
    EXECUTE 'DROP POLICY IF EXISTS "activities_member_read" ON public.activities';
    EXECUTE 'CREATE POLICY "activities_member_read" ON public.activities '
         || 'FOR SELECT USING (public.is_group_member(group_id) OR public.is_group_owner(group_id))';
  END IF;
END$$;

-- Optional helper: Owner/admin visibility to group members via SECURITY DEFINER function
-- Use this function in RPC or server-side queries to fetch members for groups you own.
CREATE OR REPLACE FUNCTION public.get_owner_member_rows()
RETURNS SETOF public.group_members
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT gm.*
  FROM public.group_members gm
  WHERE EXISTS (
    SELECT 1 FROM public.groups g
    WHERE g.id = gm.group_id AND g.created_by = auth.uid()
  );
$$;

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
    JOIN auth.users u ON u.id = gm.user_id
    WHERE gm.group_id = p_group_id
    AND LOWER(u.email) = LOWER(p_invitee_email)
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