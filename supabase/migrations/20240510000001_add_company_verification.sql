-- supabase/migrations/YYYYMMDDHHMMSS_add_company_verification.sql

-- Add verification_status column if it doesn't exist
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) DEFAULT 'unverified' NOT NULL;

-- Add admin_notes column if it doesn't exist
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- Drop the constraint if it exists, then add it
-- This ensures the constraint is correctly defined or redefined if necessary
ALTER TABLE public.companies
DROP CONSTRAINT IF EXISTS check_verification_status;

ALTER TABLE public.companies
ADD CONSTRAINT check_verification_status CHECK (verification_status IN ('unverified', 'pending', 'verified', 'rejected'));

DO $$ BEGIN
  RAISE NOTICE 'Company verification columns added and constraint set idempotently.';
END $$; 