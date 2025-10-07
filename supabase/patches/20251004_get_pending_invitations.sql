-- RPC: Return pending invitations for the current user with group info
-- Date: 2025-10-04

CREATE OR REPLACE FUNCTION public.get_pending_invitations()
RETURNS TABLE (
  group_id uuid,
  token uuid,
  group_name text,
  category text,
  created_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH me AS (
    SELECT email FROM auth.users WHERE id = auth.uid()
  )
  SELECT
    i.group_id,
    i.token,
    g.name AS group_name,
    g.category,
    i.created_at
  FROM public.invitations i
  JOIN me ON lower(i.invitee_email) = lower(me.email)
  JOIN public.groups g ON g.id = i.group_id
  WHERE i.status = 'pending'
    AND (i.expires_at IS NULL OR i.expires_at > now());
$$;
