-- Fix infinite recursion in group_members RLS policies
-- This migration fixes the circular reference issue in the group_members policies

-- Drop the problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "Users can view group memberships for groups they belong to" ON group_members;
DROP POLICY IF EXISTS "Group admins can manage memberships" ON group_members;

-- Create simpler, non-recursive policies

-- Allow users to view their own memberships
CREATE POLICY "Users can view their own memberships" ON group_members
  FOR SELECT USING (auth.uid() = user_id);

-- Allow users to view all memberships in groups they created
CREATE POLICY "Users can view memberships in groups they created" ON group_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM groups
      WHERE groups.id = group_members.group_id
      AND groups.created_by = auth.uid()
    )
  );

-- Allow group creators to manage all memberships in their groups
CREATE POLICY "Group creators can manage memberships" ON group_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM groups
      WHERE groups.id = group_members.group_id
      AND groups.created_by = auth.uid()
    )
  );

-- Allow users to insert their own memberships (join groups)
CREATE POLICY "Users can join groups" ON group_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own membership roles/status
CREATE POLICY "Users can update their own memberships" ON group_members
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow users to leave groups by deleting their own membership rows
DROP POLICY IF EXISTS "Users can leave groups" ON group_members;
CREATE POLICY "Users can leave groups" ON group_members
  FOR DELETE USING (auth.uid() = user_id);