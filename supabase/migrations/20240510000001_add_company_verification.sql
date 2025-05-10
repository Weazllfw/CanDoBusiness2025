-- supabase/migrations/YYYYMMDDHHMMSS_add_company_verification.sql

ALTER TABLE public.companies
ADD COLUMN verification_status VARCHAR(20) DEFAULT 'unverified' NOT NULL,
ADD CONSTRAINT check_verification_status CHECK (verification_status IN ('unverified', 'pending', 'verified', 'rejected')),
ADD COLUMN admin_notes TEXT;

DO $$ BEGIN
  RAISE NOTICE 'Company verification columns added and constraint set.';
END $$; 