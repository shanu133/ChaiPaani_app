-- Add profiles.display_name column with backfill and trigger updates
-- This migration adds a display_name column to profiles, backfills from full_name or email, and updates auth triggers to maintain it
-- Root cause: Need a consistent display name field for UI; full_name may be null, email fallback ensures non-empty

-- Add display_name column
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_name TEXT;

-- Backfill existing profiles: use full_name if present, otherwise email
UPDATE public.profiles
SET display_name = COALESCE(NULLIF(TRIM(full_name), ''), email)
WHERE display_name IS NULL;

-- Update handle_new_user trigger function to set display_name
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url',
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Update handle_user_update trigger function to maintain display_name
CREATE OR REPLACE FUNCTION public.handle_user_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET
    email = NEW.email,
    full_name = COALESCE(NEW.raw_user_meta_data->>'full_name', full_name),
    avatar_url = COALESCE(NEW.raw_user_meta_data->>'avatar_url', avatar_url),
    display_name = COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      display_name,
      NEW.email
    ),
    updated_at = NOW()
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

-- Ensure triggers are attached (they should already be from previous migration)
-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
-- CREATE TRIGGER on_auth_user_updated AFTER UPDATE ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_user_update();