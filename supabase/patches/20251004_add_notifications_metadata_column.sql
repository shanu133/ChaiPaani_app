-- Ensure notifications.metadata exists
-- Date: 2025-10-04
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;