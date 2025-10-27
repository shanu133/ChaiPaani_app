-- Fix: get_group_members_with_status to also include group creator
-- This ensures the creator is always shown even if not explicitly in group_members table

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
    -- Authorize if user is a member OR the creator of the group
    SELECT 1
    FROM public.group_members gm_auth
    WHERE gm_auth.group_id = p_group_id
      AND gm_auth.user_id = auth.uid()
    
    UNION
    
    SELECT 1
    FROM public.groups g
    WHERE g.id = p_group_id
      AND g.created_by = auth.uid()
  )
  -- Active members from group_members table
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

  UNION

  -- Include group creator if not already in group_members
  SELECT
    g.created_by AS user_id,
    COALESCE(p.display_name, p.full_name, split_part(p.email, '@', 1)) AS display_name,
    p.email,
    'active'::text AS status,
    'creator'::text AS source
  FROM public.groups g
  JOIN public.profiles p ON p.id = g.created_by
  WHERE g.id = p_group_id
    AND EXISTS (SELECT 1 FROM authorized)
    AND NOT EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = p_group_id
        AND gm.user_id = g.created_by
    )

  UNION ALL

  -- Pending invitations
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
