-- Fix: accept_group_invitation should accept UUID token to match invitations.token type
-- Date: 2025-10-04
-- This patch redefines the RPC with correct parameter type and keeps inviter notification logic.

CREATE OR REPLACE FUNCTION public.accept_group_invitation(p_token uuid)
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
    AND status = 'pending'
    AND expires_at > NOW()
    AND LOWER(invitee_email) = LOWER(v_invitee_email);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired invitation token';
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM group_members
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
