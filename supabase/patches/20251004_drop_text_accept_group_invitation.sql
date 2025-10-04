-- Remove the ambiguous TEXT overload so only the UUID version remains
-- Date: 2025-10-04

DROP FUNCTION IF EXISTS public.accept_group_invitation(text);
