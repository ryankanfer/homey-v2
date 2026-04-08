-- PostgreSQL executes triggers in alphabetical order!
-- We must ensure the public.profiles row is created BEFORE any other triggers try to use it.

-- 1. Drop existing triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_agent_signup_link_invitations ON auth.users;

-- 2. Re-create them with numbered prefixes to force execution order

-- This MUST run first to create the base profile
CREATE TRIGGER "00_on_auth_user_created"
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- This runs safely after the profile exists
CREATE TRIGGER "10_on_agent_signup_link_invitations"
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_agent_invitation_on_signup();

-- NOTE: If you manually added an "auto_initialize_professional_profile" trigger 
-- via the Supabase Dashboard, you need to rename/recreate it to start with "20_" 
-- so it also fires AFTER the base profile is created.
