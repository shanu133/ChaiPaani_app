-- Adjust accept_group_invitation to not insert notifications (optional)
-- Date: 2025-10-04
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
  v_err_text TEXT;
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

  SELECT id, group_id INTO v_invitation_id, v_group_id
  FROM invitations
  WHERE token = p_token
    AND status = 'pending'
    AND expires_at > NOW()
    AND LOWER(invitee_email) = LOWER(v_invitee_email);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired invitation token';
  END IF;

  -- Atomically create membership if it doesn't exist (avoids race on concurrent acceptance)
  INSERT INTO group_members (group_id, user_id, role, joined_at)
  VALUES (v_group_id, v_user_id, 'member', NOW())
  ON CONFLICT (group_id, user_id) DO NOTHING;

  UPDATE invitations
  SET status = 'accepted', accepted_at = NOW()
  WHERE id = v_invitation_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Successfully joined group',
    'group_id', v_group_id
  );

EXCEPTION
  WHEN unique_violation THEN
    -- Likely already a member or invitation already processed; log details but return safe message
    RAISE LOG 'accept_group_invitation unique_violation: %', SQLERRM;
    RETURN jsonb_build_object(
      'success', false,
      'error', 'conflict',
      'message', 'Invitation already accepted or membership exists'
    );

  WHEN foreign_key_violation THEN
    RAISE LOG 'accept_group_invitation foreign_key_violation: %', SQLERRM;
    RETURN jsonb_build_object(
      'success', false,
      'error', 'invalid_reference',
      'message', 'Invalid or missing related record'
    );

  WHEN SQLSTATE 'P0001' THEN
    -- Application raised exception; map to safe messages
    GET STACKED DIAGNOSTICS v_err_text = MESSAGE_TEXT;
    RAISE LOG 'accept_group_invitation client error: %', v_err_text;
    IF v_err_text ILIKE 'invalid or expired invitation token%' THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'invalid_token',
        'message', 'Invalid or expired invitation'
      );
    ELSIF v_err_text ILIKE 'user not authenticated%' THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'unauthorized',
        'message', 'Authentication required'
      );
    ELSIF v_err_text ILIKE 'user email not found%' THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'unauthorized',
        'message', 'Authentication required'
      );
    ELSE
      RETURN jsonb_build_object(
        'success', false,
        'error', 'invalid_request',
        'message', 'Request could not be processed'
      );
    END IF;

  WHEN OTHERS THEN
    -- Log internal error details server-side, return sanitized error to client
    RAISE LOG 'accept_group_invitation internal error: %', SQLERRM;
    RETURN jsonb_build_object(
      'success', false,
      'error', 'internal_error',
      'message', 'Internal server error'
    );
END;
$$;