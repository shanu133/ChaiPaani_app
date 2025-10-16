-- Fix RLS policies for profiles table to allow invitation lookups
-- This allows authenticated users to read user information needed for invitations

-- Enable RLS on profiles table if not already enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view other users for invitations" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Allow authenticated users to read their own profile
CREATE POLICY "Users can view own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Allow authenticated users to read other users' basic info (needed for invitations)
CREATE POLICY "Users can view other users for invitations"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to insert their own profile
CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Allow authenticated users to update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Grant necessary permissions to authenticated role
GRANT SELECT ON profiles TO authenticated;
GRANT INSERT ON profiles TO authenticated;
GRANT UPDATE ON profiles TO authenticated;
