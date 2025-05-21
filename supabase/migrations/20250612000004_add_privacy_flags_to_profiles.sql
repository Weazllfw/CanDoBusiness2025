-- Migration: add_privacy_flags_to_profiles
-- Description: Adds boolean flags to public.profiles for user-controlled privacy of network and followed companies.

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_network_public BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS is_followed_companies_public BOOLEAN DEFAULT TRUE;

COMMENT ON COLUMN public.profiles.is_network_public IS 'If TRUE, the user''''s network (connections) is publicly viewable. Defaults to TRUE.';
COMMENT ON COLUMN public.profiles.is_followed_companies_public IS 'If TRUE, the list of companies the user follows is publicly viewable. Defaults to TRUE.';

DO $$ BEGIN
  RAISE NOTICE 'Added privacy flags (is_network_public, is_followed_companies_public) to public.profiles table.';
END $$; 