-- Fix permission denied for auth.users table
-- This allows RPC functions to read from auth.users when needed

GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT SELECT ON auth.users TO authenticated;
