-- Activities RLS policies: allow group members and group creators to insert/select
-- Date: 2025-10-04

-- Ensure RLS is enabled (idempotent in Supabase environments)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'activities'
  ) THEN
    EXECUTE 'ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY';
  END IF;
END $$;

-- Drop existing policies if any
DROP POLICY IF EXISTS "activities_select_policy" ON public.activities;
DROP POLICY IF EXISTS "activities_insert_policy" ON public.activities;
DROP POLICY IF EXISTS "activities_update_policy" ON public.activities;

-- Allow selecting activity rows if user is a group member or the group creator
CREATE POLICY "activities_select_policy" ON public.activities
  FOR SELECT USING (
    group_id IN (
      SELECT group_id FROM public.group_members WHERE user_id = auth.uid()
    )
    OR group_id IN (
      SELECT id FROM public.groups WHERE created_by = auth.uid()
    )
  );

-- Allow inserts if the activity is for a group the user belongs to or created (covers expense triggers)
CREATE POLICY "activities_insert_policy" ON public.activities
  FOR INSERT WITH CHECK (
    group_id IN (
      SELECT group_id FROM public.group_members WHERE user_id = auth.uid()
    )
    OR group_id IN (
      SELECT id FROM public.groups WHERE created_by = auth.uid()
    )
  );

-- Optional: allow updates by group creators or members (usually not needed)
CREATE POLICY "activities_update_policy" ON public.activities
  FOR UPDATE USING (
    group_id IN (
      SELECT group_id FROM public.group_members WHERE user_id = auth.uid()
    )
    OR group_id IN (
      SELECT id FROM public.groups WHERE created_by = auth.uid()
    )
  ) WITH CHECK (
    group_id IN (
      SELECT group_id FROM public.group_members WHERE user_id = auth.uid()
    )
    OR group_id IN (
      SELECT id FROM public.groups WHERE created_by = auth.uid()
    )
  );
