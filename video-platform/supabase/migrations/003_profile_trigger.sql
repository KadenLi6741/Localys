-- =====================================================
-- Automatic Profile Creation Trigger
-- =====================================================
-- This trigger automatically creates a profile entry
-- when a new user signs up via Supabase Auth.
-- 
-- This is optional but highly recommended to ensure
-- all authenticated users have a profile entry.
-- =====================================================

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert a new profile for the user
  -- Uses metadata from auth.users if available, otherwise generates defaults
  INSERT INTO public.profiles (
    id,
    username,
    full_name,
    avatar_url
  )
  VALUES (
    NEW.id,
    -- Try to get username from metadata, otherwise generate one
    COALESCE(
      NEW.raw_user_meta_data->>'username',
      'user_' || substring(NEW.id::text from 1 for 8)
    ),
    -- Try to get full_name from metadata
    NEW.raw_user_meta_data->>'full_name',
    -- Try to get avatar_url from metadata
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING; -- Prevent errors if profile already exists
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger that fires after a user is inserted into auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- NOTES
-- =====================================================
-- 1. This trigger runs with SECURITY DEFINER privileges,
--    allowing it to insert into the profiles table even
--    if the user doesn't have direct INSERT permissions.
--
-- 2. The ON CONFLICT clause prevents errors if a profile
--    is created manually before the trigger fires.
--
-- 3. Username defaults to 'user_' + first 8 chars of UUID
--    if not provided in metadata.
--
-- 4. You can pass custom metadata when creating users:
--    - username: User's preferred username
--    - full_name: User's display name
--    - avatar_url: URL to user's avatar image
--
-- 5. To update the profile after creation, use the
--    updateProfile function from the messaging utilities.
-- =====================================================

