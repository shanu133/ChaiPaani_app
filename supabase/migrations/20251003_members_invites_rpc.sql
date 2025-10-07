-- Migration: members/invites RPC and notification on invite acceptance
-- Date: 2025-10-03

-- 1) RPC to return active members and pending invitations with display names and status
CREATE OR REPLACE FUNCTION public.get_group_members_with_status(p_group_id uuid)
RETURNS TABLE (
  user_id uuid,
  display_name text,
  email text,
  status text,
  source text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH authorized AS (
    SELECT 1
    FROM public.group_members gm_auth
    WHERE gm_auth.group_id = p_group_id
      AND gm_auth.user_id = auth.uid()
  )
  -- Active members (only if caller is authorized)
  SELECT
    gm.user_id,
    COALESCE(p.display_name, p.full_name, split_part(p.email, '@', 1)) AS display_name,
    p.email,
    'active'::text AS status,
    'member'::text AS source
  FROM public.group_members gm
  JOIN public.profiles p ON p.id = gm.user_id
  WHERE gm.group_id = p_group_id
    AND EXISTS (SELECT 1 FROM authorized)

  UNION ALL

  -- Pending invitations (only if caller is authorized)
  SELECT
    NULL::uuid AS user_id,
    COALESCE(p.display_name, p.full_name, split_part(i.invitee_email, '@', 1)) AS display_name,
    i.invitee_email AS email,
    'pending'::text AS status,
    'invitation'::text AS source
  FROM public.invitations i
  LEFT JOIN public.profiles p ON lower(p.email) = lower(i.invitee_email)
  WHERE i.group_id = p_group_id
    AND i.status = 'pending'
    AND i.expires_at > now()
    AND EXISTS (SELECT 1 FROM authorized);
$$;

-- 2) Update accept_group_invitation to insert a notification for inviter
CREATE OR REPLACE FUNCTION public.accept_group_invitation(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_invitation_id UUID;
  v_group_id UUID;
  v_invitee_email TEXT;
  v_membership_exists BOOLEAN;
  v_inviter_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  SELECT email INTO v_invitee_email
  FROM auth.users
  WHERE id = v_user_id;

  IF v_invitee_email IS NULL THEN
    RAISE EXCEPTION 'User email not found';
  END IF;

  SELECT id, group_id, inviter_id INTO v_invitation_id, v_group_id, v_inviter_id
  FROM invitations
  WHERE token = p_token
  SELECT EXISTS(
    SELECT 1 FROM group_members
    WHERE group_id = v_group_id AND user_id = v_user_id
  ) INTO v_membership_exists;

  IF NOT v_membership_exists THEN
    BEGIN
      INSERT INTO group_members (group_id, user_id, role, joined_at)
      VALUES (v_group_id, v_user_id, 'member', NOW());
    EXCEPTION
      WHEN unique_violation THEN
        -- Membership already exists from concurrent transaction, safe to ignore
        NULL;
    END;
  END IF;    SELECT 1 FROM group_members
    WHERE group_id = v_group_id AND user_id = v_user_id
  ) INTO v_membership_exists;

  IF NOT v_membership_exists THEN
    INSERT INTO group_members (group_id, user_id, role, joined_at)
    VALUES (v_group_id, v_user_id, 'member', NOW());
  END IF;

  UPDATE invitations
  SET status = 'accepted', accepted_at = NOW()
  WHERE id = v_invitation_id;

  -- Insert notification for inviter
  IF v_inviter_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, message, is_read, created_at, metadata)
    VALUES (
      v_inviter_id,
      'invitation_accepted',
      'Invitation accepted',
      format('Your invitation to %s has been accepted.', v_invitee_email),
      false,
      now(),
      jsonb_build_object('group_id', v_group_id, 'invitee_email', v_invitee_email)
    );
  END IF;

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

-- 3) Helpful indexes
CREATE INDEX IF NOT EXISTS invitations_group_status_expires_idx
  ON public.invitations (group_id, status, expires_at);
CREATE INDEX IF NOT EXISTS invitations_email_lower_idx
  ON public.invitations (lower(invitee_email));
CREATE UNIQUE INDEX IF NOT EXISTS group_members_unique_idx
  ON public.group_members (group_id, user_id);
CREATE INDEX IF NOT EXISTS expense_splits_expense_user_settled_idx
  ON public.expense_splits (expense_id, user_id, is_settled);
CREATE INDEX IF NOT EXISTS expense_splits_user_settled_idx
  ON public.expense_splits (user_id, is_settled);
