-- Migration: Implement schema changes for Platform Interaction Model

BEGIN;

-- 1. Enhance public.messages table
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS acting_as_company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.messages.acting_as_company_id IS 'ID of the company the sender is acting on behalf of, if any.';

-- Add target_is_company to public.messages
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS target_is_company BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN public.messages.target_is_company IS 'Indicates if the receiver_id for this message refers to a company.';

-- 2. Implement User Trust/Verification System on public.profiles table

-- Create the ENUM type for user trust levels
CREATE TYPE public.user_trust_level_enum AS ENUM (
    'NEW',
    'BASIC',
    'ESTABLISHED',
    'VERIFIED_CONTRIBUTOR'
);

-- Add trust_level column to public.profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS trust_level public.user_trust_level_enum DEFAULT 'NEW';

COMMENT ON COLUMN public.profiles.trust_level IS 'Trust level of the user, influences platform interactions.';

-- Add is_verified column to public.profiles for general individual user verification
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN public.profiles.is_verified IS 'Indicates if the individual user account has been (generally) verified.';

-- Add is_email_verified column specifically for email confirmation status
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_email_verified BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN public.profiles.is_email_verified IS 'Indicates if the user''s email address has been confirmed via Supabase Auth.';

DO $$ BEGIN
  RAISE NOTICE 'Schema updates for Platform Interaction Model applied:';
  RAISE NOTICE '- acting_as_company_id added to public.messages';
  RAISE NOTICE '- target_is_company added to public.messages';
  RAISE NOTICE '- user_trust_level_enum created';
  RAISE NOTICE '- trust_level added to public.profiles';
  RAISE NOTICE '- is_verified added to public.profiles';
  RAISE NOTICE '- is_email_verified added to public.profiles';
END $$;

COMMIT; 