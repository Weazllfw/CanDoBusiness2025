BEGIN;

-- Function to update public.profiles.is_email_verified based on auth.users
CREATE OR REPLACE FUNCTION internal.sync_profile_email_verification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER -- Important to access auth.users table
AS $$
BEGIN
    UPDATE public.profiles
    SET is_email_verified = (NEW.email_confirmed_at IS NOT NULL)
    WHERE id = NEW.id;
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION internal.sync_profile_email_verification() IS 'Sets public.profiles.is_email_verified based on auth.users.email_confirmed_at upon user creation or email confirmation.';

-- Trigger on auth.users
DROP TRIGGER IF EXISTS trg_sync_profile_email_verification ON auth.users;
CREATE TRIGGER trg_sync_profile_email_verification
AFTER INSERT OR UPDATE OF email_confirmed_at ON auth.users
FOR EACH ROW
EXECUTE FUNCTION internal.sync_profile_email_verification();

DO $$ BEGIN
  RAISE NOTICE 'Trigger to sync is_email_verified from auth.users to public.profiles created.';
END $$;

COMMIT; 