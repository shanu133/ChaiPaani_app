-- Relax expenses RLS so any group member (not only the creator) can insert/view expenses
-- Date: 2025-10-04

-- Replace INSERT policy: allow if user is the payer and is a member of the group
DROP POLICY IF EXISTS "expenses_insert_policy" ON public.expenses;
CREATE POLICY "expenses_insert_policy" ON public.expenses
  FOR INSERT WITH CHECK (
    payer_id = auth.uid()
    AND group_id IN (
      SELECT group_id FROM public.group_members WHERE user_id = auth.uid()
    )
  );

-- Replace SELECT policy: allow payers, group creators, and any group member to see expenses
DROP POLICY IF EXISTS "expenses_select_policy" ON public.expenses;
CREATE POLICY "expenses_select_policy" ON public.expenses
  FOR SELECT USING (
    payer_id = auth.uid()
    OR group_id IN (
      SELECT id FROM public.groups WHERE created_by = auth.uid()
    )
    OR group_id IN (
      SELECT group_id FROM public.group_members WHERE user_id = auth.uid()
    )
  );
