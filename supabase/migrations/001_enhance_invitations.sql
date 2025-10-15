-- Migration: Enhance invitations table with expiration and roles
-- Run this in Supabase SQL Editor (Database > SQL Editor > New Query)

-- Step 1: Add new columns to invitations table
ALTER TABLE invitations 
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS invited_role TEXT DEFAULT 'member' CHECK (invited_role IN ('admin', 'member'));

-- Step 2: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_invitations_status_expires 
ON invitations(status, expires_at) 
WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_invitations_group_email 
ON invitations(group_id, invitee_email);

CREATE INDEX IF NOT EXISTS idx_invitations_token 
ON invitations(token) WHERE status = 'pending';

-- Step 3: Add constraint to ensure expires_at is in future when created
ALTER TABLE invitations 
DROP CONSTRAINT IF EXISTS check_expires_at_future;

ALTER TABLE invitations 
ADD CONSTRAINT check_expires_at_future 
CHECK (expires_at IS NULL OR expires_at > created_at);

-- Step 4: Update existing pending invitations with default expiration (7 days)
UPDATE invitations 
SET expires_at = created_at + INTERVAL '7 days'
WHERE expires_at IS NULL AND status = 'pending';

-- Step 5: Create or replace RPC function for creating invitations with expiry
CREATE OR REPLACE FUNCTION create_invitation_with_expiry(
  p_group_id UUID,
  p_invitee_email TEXT,
  p_role TEXT DEFAULT 'member',
  p_expires_hours INTEGER DEFAULT 168
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_inviter_id UUID;
  v_group_name TEXT;
  v_token UUID;
  v_invitation_id UUID;
  v_expires_at TIMESTAMPTZ;
BEGIN
  -- Get current user
  v_inviter_id := auth.uid();
  IF v_inviter_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Verify inviter is admin/owner of the group
  IF NOT EXISTS (
    SELECT 1 FROM groups g
    LEFT JOIN group_members gm ON gm.group_id = g.id AND gm.user_id = v_inviter_id
    WHERE g.id = p_group_id 
    AND (g.created_by = v_inviter_id OR gm.role = 'admin')
  ) THEN
    RAISE EXCEPTION 'Only group owners/admins can invite members';
  END IF;

  -- Get group name
  SELECT name INTO v_group_name FROM groups WHERE id = p_group_id;

  -- Check if user is already a member
  IF EXISTS (
    SELECT 1 FROM group_members gm
    JOIN profiles p ON p.id = gm.user_id
    WHERE gm.group_id = p_group_id AND p.email = LOWER(p_invitee_email)
  ) THEN
    RAISE EXCEPTION 'User is already a member of this group';
  END IF;

  -- Check for existing pending invitation
  IF EXISTS (
    SELECT 1 FROM invitations
    WHERE group_id = p_group_id 
    AND invitee_email = LOWER(p_invitee_email)
    AND status = 'pending'
    AND (expires_at IS NULL OR expires_at > NOW())
  ) THEN
    RAISE EXCEPTION 'An active invitation already exists for this email';
  END IF;

  -- Calculate expiration
  v_expires_at := NOW() + (p_expires_hours || ' hours')::INTERVAL;
  v_token := gen_random_uuid();

  -- Create invitation
  INSERT INTO invitations (
    group_id, 
    inviter_id, 
    invitee_email, 
    token, 
    invited_role,
    expires_at,
    status
  )
  VALUES (
    p_group_id,
    v_inviter_id,
    LOWER(p_invitee_email),
    v_token,
    p_role,
    v_expires_at,
    'pending'
  )
  RETURNING id INTO v_invitation_id;

  -- Return invitation details
  RETURN json_build_object(
    'invitation_id', v_invitation_id,
    'token', v_token,
    'group_name', v_group_name,
    'expires_at', v_expires_at,
    'role', p_role
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_invitation_with_expiry TO authenticated;

-- Step 6: Enhanced accept_group_invitation with expiration check
-- Drop existing function first to allow return type change
DROP FUNCTION IF EXISTS accept_group_invitation(UUID);

CREATE OR REPLACE FUNCTION accept_group_invitation(p_token UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_user_email TEXT;
  v_invitation RECORD;
  v_group_name TEXT;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Get user email
  SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;

  -- Get invitation details
  SELECT * INTO v_invitation 
  FROM invitations 
  WHERE token = p_token;

  IF v_invitation IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invalid invitation token');
  END IF;

  -- Check if already accepted
  IF v_invitation.status = 'accepted' THEN
    RETURN json_build_object('success', false, 'error', 'Invitation already accepted');
  END IF;

  -- Check expiration
  IF v_invitation.expires_at IS NOT NULL AND v_invitation.expires_at < NOW() THEN
    -- Mark as expired
    UPDATE invitations SET status = 'expired' WHERE id = v_invitation.id;
    RETURN json_build_object('success', false, 'error', 'Invitation has expired');
  END IF;

  -- Verify email match
  IF LOWER(v_user_email) != LOWER(v_invitation.invitee_email) THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'This invitation is for ' || v_invitation.invitee_email
    );
  END IF;

  -- Check if already a member
  IF EXISTS (
    SELECT 1 FROM group_members 
    WHERE group_id = v_invitation.group_id AND user_id = v_user_id
  ) THEN
    -- Mark invitation as accepted anyway
    UPDATE invitations 
    SET status = 'accepted', accepted_at = NOW()
    WHERE id = v_invitation.id;
    
    RETURN json_build_object('success', false, 'error', 'You are already a member of this group');
  END IF;

  -- Add user to group with specified role
  INSERT INTO group_members (group_id, user_id, role, joined_at)
  VALUES (v_invitation.group_id, v_user_id, COALESCE(v_invitation.invited_role, 'member'), NOW());

  -- Update invitation status
  UPDATE invitations 
  SET status = 'accepted', accepted_at = NOW()
  WHERE id = v_invitation.id;

  -- Get group name for response
  SELECT name INTO v_group_name FROM groups WHERE id = v_invitation.group_id;

  -- Create notification for inviter
  INSERT INTO notifications (user_id, type, title, message, metadata)
  VALUES (
    v_invitation.inviter_id,
    'invitation_accepted',
    'Invitation Accepted',
    v_user_email || ' joined ' || v_group_name,
    json_build_object('group_id', v_invitation.group_id, 'accepter_email', v_user_email)
  );

  RETURN json_build_object(
    'success', true, 
    'group_id', v_invitation.group_id,
    'group_name', v_group_name,
    'role', COALESCE(v_invitation.invited_role, 'member')
  );
END;
$$;

GRANT EXECUTE ON FUNCTION accept_group_invitation TO authenticated;

-- Step 7: Function to expire old invitations (can be called manually or via cron)
CREATE OR REPLACE FUNCTION expire_old_invitations()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE invitations
  SET status = 'expired'
  WHERE status = 'pending'
  AND expires_at IS NOT NULL
  AND expires_at < NOW();
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION expire_old_invitations TO authenticated;

-- Step 8: Add RLS policies for invitations table (if not already present)
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their invitations" ON invitations;
DROP POLICY IF EXISTS "Admins can create invitations" ON invitations;
DROP POLICY IF EXISTS "Users can update their sent invitations" ON invitations;

-- Users can view invitations they sent or received
CREATE POLICY "Users can view their invitations"
ON invitations FOR SELECT
USING (
  auth.uid() = inviter_id 
  OR 
  (SELECT email FROM auth.users WHERE id = auth.uid()) = invitee_email
);

-- Only group admins/owners can create invitations
CREATE POLICY "Admins can create invitations"
ON invitations FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM groups g
    LEFT JOIN group_members gm ON gm.group_id = g.id AND gm.user_id = auth.uid()
    WHERE g.id = group_id
    AND (g.created_by = auth.uid() OR gm.role = 'admin')
  )
);

-- Users can update (revoke) their own sent invitations
CREATE POLICY "Users can update their sent invitations"
ON invitations FOR UPDATE
USING (auth.uid() = inviter_id)
WITH CHECK (auth.uid() = inviter_id);

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Migration completed successfully!';
  RAISE NOTICE 'Added columns: expires_at, invited_role';
  RAISE NOTICE 'Created functions: create_invitation_with_expiry, accept_group_invitation, expire_old_invitations';
  RAISE NOTICE 'Created RLS policies for invitations table';
END $$;
