-- Migration: Add detailed fields to public.profiles

BEGIN;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS bio TEXT NULL,
ADD COLUMN IF NOT EXISTS professional_headline TEXT NULL,
ADD COLUMN IF NOT EXISTS industry TEXT NULL,       -- Or perhaps a foreign key to an industries table if defined
ADD COLUMN IF NOT EXISTS skills TEXT[] NULL,         -- Array of text for skills
ADD COLUMN IF NOT EXISTS linkedin_url TEXT NULL;

COMMENT ON COLUMN public.profiles.bio IS 'User biography or summary.';
COMMENT ON COLUMN public.profiles.professional_headline IS 'Short professional headline for the user.';
COMMENT ON COLUMN public.profiles.industry IS 'Primary industry of the user.';
COMMENT ON COLUMN public.profiles.skills IS 'Array of skills possessed by the user.';
COMMENT ON COLUMN public.profiles.linkedin_url IS 'URL to the user''s LinkedIn profile.';

-- Also ensure `updated_at` trigger exists for profiles if these fields should bump it.
-- Assuming a generic `handle_updated_at` trigger function exists and is applied.
-- If not, one should be created and applied.
-- Example (if not already present from another migration for other columns):
-- CREATE TRIGGER trigger_profiles_updated_at
-- BEFORE UPDATE ON public.profiles
-- FOR EACH ROW
-- EXECUTE FUNCTION public.handle_updated_at();

COMMIT;

DO $$ BEGIN
  RAISE NOTICE 'Added detailed fields (bio, professional_headline, etc.) to public.profiles.';
END $$; 