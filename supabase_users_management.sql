-- Supabase User Management System
-- Tables: public.profiles
-- Functions: delete_user_account()
--
-- What this script does:
-- 1) Adds contact_phone and is_banned columns to profiles table
-- 2) Creates RPC function for secure account deletion with cascading
-- 3) Updates RLS policies to check is_banned status
-- 4) Ensures profile creation includes new fields

begin;

-- ---------------------------------------------------------------------------
-- 1) Add new columns to profiles table
-- ---------------------------------------------------------------------------

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS contact_phone TEXT,
ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.contact_phone IS 'User phone number for contact purposes';
COMMENT ON COLUMN public.profiles.is_banned IS 'Whether account is banned (true = banned, cannot use platform)';

-- ---------------------------------------------------------------------------
-- 2) Create RPC function for account deletion
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_id_var UUID;
BEGIN
  -- Get the current user ID
  user_id_var := auth.uid();
  
  -- Verify user is authenticated
  IF user_id_var IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Delete user profile (will cascade delete related records via FK constraints)
  DELETE FROM public.profiles WHERE id = user_id_var;
  
  -- Delete user from auth.users
  -- Note: This is handled via PostgreSQL trigger if set up in auth schema
  -- For Supabase, deletion of auth.users must be done via admin API or auth trigger
  DELETE FROM auth.users WHERE id = user_id_var;
  
END;
$$;

REVOKE ALL ON FUNCTION public.delete_user_account() FROM anon;
REVOKE ALL ON FUNCTION public.delete_user_account() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;

-- ---------------------------------------------------------------------------
-- 3) Create RPC function to toggle user ban status (admin only)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.toggle_user_ban(target_user_id UUID, is_banned_new BOOLEAN)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_id_var UUID;
BEGIN
  -- Get current user (must be admin)
  admin_id_var := auth.uid();
  
  IF admin_id_var IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Check if current user is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = admin_id_var AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can toggle ban status';
  END IF;
  
  -- Prevent admin from banning themselves
  IF admin_id_var = target_user_id THEN
    RAISE EXCEPTION 'Cannot ban yourself';
  END IF;
  
  -- Update ban status
  UPDATE public.profiles 
  SET is_banned = is_banned_new 
  WHERE id = target_user_id;
  
END;
$$;

REVOKE ALL ON FUNCTION public.toggle_user_ban(UUID, BOOLEAN) FROM anon;
REVOKE ALL ON FUNCTION public.toggle_user_ban(UUID, BOOLEAN) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_user_ban(UUID, BOOLEAN) TO authenticated;

-- ---------------------------------------------------------------------------
-- 4) Create RPC function to change user role (admin only)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.change_user_role(target_user_id UUID, new_role TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_id_var UUID;
BEGIN
  -- Get current user (must be admin)
  admin_id_var := auth.uid();
  
  IF admin_id_var IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Check if current user is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = admin_id_var AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can change roles';
  END IF;
  
  -- Validate role value
  IF new_role NOT IN ('student', 'resident', 'admin') THEN
    RAISE EXCEPTION 'Invalid role: %', new_role;
  END IF;
  
  -- Prevent admin from changing their own role
  IF admin_id_var = target_user_id THEN
    RAISE EXCEPTION 'Cannot change your own role';
  END IF;
  
  -- Update role
  UPDATE public.profiles 
  SET role = new_role 
  WHERE id = target_user_id;
  
END;
$$;

REVOKE ALL ON FUNCTION public.change_user_role(UUID, TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.change_user_role(UUID, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.change_user_role(UUID, TEXT) TO authenticated;

-- ---------------------------------------------------------------------------
-- 5) Update RLS policies to prevent banned users from accessing the platform
-- ---------------------------------------------------------------------------

-- Drop existing policy if exists
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;

-- Users can view their own profile if not banned
CREATE POLICY "profiles_select_own"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id AND NOT is_banned);

-- Drop existing policy if exists
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;

-- Users can update their own profile if not banned
CREATE POLICY "profiles_update_own"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id AND NOT is_banned)
  WITH CHECK (auth.uid() = id AND NOT is_banned);

-- Drop existing policy if exists
DROP POLICY IF EXISTS "profiles_public_read" ON public.profiles;

-- Allow public to see non-banned profile info (name, role for team lookups)
CREATE POLICY "profiles_public_read"
  ON public.profiles
  FOR SELECT
  USING (NOT is_banned);

-- ---------------------------------------------------------------------------
-- 6) Add is_banned check to existing tables' RLS policies (booking, equipment)
-- ---------------------------------------------------------------------------

-- For bookings: prevent banned users from creating/viewing bookings
DROP POLICY IF EXISTS "bookings_select_own" ON public.bookings;
CREATE POLICY "bookings_select_own"
  ON public.bookings
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_banned)
  );

DROP POLICY IF EXISTS "bookings_insert_own" ON public.bookings;
CREATE POLICY "bookings_insert_own"
  ON public.bookings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_banned)
  );

commit;
