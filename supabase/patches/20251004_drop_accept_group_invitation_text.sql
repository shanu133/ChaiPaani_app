-- Drop the ambiguous TEXT overload so only the UUID version remains
-- Date: 2025-10-04

-- Old function signature created earlier (p_token TEXT)
DROP FUNCTION IF EXISTS public.accept_group_invitation(text);
-- Optionally, if created with named arg signature
DROP FUNCTION IF EXISTS public.accept_group_invitation(p_token text);
