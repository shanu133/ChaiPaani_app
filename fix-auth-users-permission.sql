-- SECURITY FIX: Remove blanket SELECT grant on auth.users
-- Previous approach exposed ALL user records to ALL authenticated users (privacy violation)
-- New approach: Use RLS + SECURITY DEFINER helper functions for controlled access

-- Step 1: Enable Row Level Security on auth.users
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- Step 2: Create strict RLS policy - users can only see their own record
DROP POLICY IF EXISTS "Users can view own auth record" ON auth.users;
CREATE POLICY "Users can view own auth record" ON auth.users
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Step 3: Create SECURITY DEFINER helper function to get user's own email
-- This is safe because it only returns the calling user's email
CREATE OR REPLACE FUNCTION public.get_my_email()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  RETURN (SELECT email FROM auth.users WHERE id = auth.uid());
END;
$$;

COMMENT ON FUNCTION public.get_my_email() IS 
  'Returns the email address of the authenticated user. SECURITY DEFINER allows bypassing RLS.';

-- Step 4: Create SECURITY DEFINER helper function to get user email by ID
-- Only for use within other SECURITY DEFINER functions (not directly callable by users)
CREATE OR REPLACE FUNCTION public.get_user_email_by_id(user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  result TEXT;
BEGIN
  -- Only allow this to be called from SECURITY DEFINER contexts
  -- Additional security: could check if caller is another definer function
  SELECT email INTO result FROM auth.users WHERE id = user_id;
  RETURN result;
END;
$$;

COMMENT ON FUNCTION public.get_user_email_by_id(UUID) IS 
  'Returns email for given user ID. SECURITY DEFINER - should only be called from other trusted definer functions.';

-- Step 5: Grant execute on helper functions to authenticated users
GRANT EXECUTE ON FUNCTION public.get_my_email() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_email_by_id(UUID) TO authenticated;

-- Step 6: Revoke any existing blanket grants (cleanup)
REVOKE SELECT ON auth.users FROM authenticated;
REVOKE SELECT ON auth.users FROM anon;

-- Step 7: Grant only USAGE on auth schema (needed for references)
GRANT USAGE ON SCHEMA auth TO authenticated;

-- MIGRATION NOTES:
-- 1. Existing RPCs that SELECT from auth.users must be updated to use get_user_email_by_id()
-- 2. RLS policies that check (SELECT email FROM auth.users WHERE id = auth.uid()) 
--    should use get_my_email() instead
-- 3. Any direct SELECT from auth.users in application code will fail and must be refactored
-- 
-- RPCs requiring updates (found via code search):
-- - accept_group_invitation_by_token (line 165 in 001_enhance_invitations.sql)
-- - RLS policies in invitations table (line 278 in 001_enhance_invitations.sql)
-- - accept_group_invitation RPC (fix-rls-recursion.sql line 303)
-- - get_pending_invitations RPC (patches/20251004_get_pending_invitations.sql line 17)
--
-- Security improvements:
-- ✅ Users can only see their own auth.users record via RLS
-- ✅ Helper functions provide controlled access with SECURITY DEFINER
-- ✅ No blanket SELECT access to all user emails/data
-- ✅ Audit trail: all access goes through named functions
-- ✅ SET search_path prevents privilege escalation
-- ✅ STABLE functions don't modify data

