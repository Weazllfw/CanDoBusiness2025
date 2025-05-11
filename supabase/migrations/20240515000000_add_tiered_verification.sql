-- Migration: Setup tiered company verification system

-- Step 1: Add new columns to public.companies
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS self_attestation_completed BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS business_number TEXT NULL,
ADD COLUMN IF NOT EXISTS public_presence_links TEXT[] NULL;

-- Step 2: Standardize existing verification_status to 'UNVERIFIED'
-- This aligns all existing companies to the new Tier 0 baseline.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='verification_status') THEN
    UPDATE public.companies SET verification_status = 'UNVERIFIED';
  END IF;
END $$;

-- Step 3: Drop old CHECK constraint and add new one for verification_status
ALTER TABLE public.companies
DROP CONSTRAINT IF EXISTS check_verification_status; -- Matches the name from 20240510000001_add_company_verification.sql

ALTER TABLE public.companies
ADD CONSTRAINT check_verification_status CHECK (
  verification_status IN (
    'UNVERIFIED',         -- Tier 0
    'TIER1_PENDING',      -- User submitted for Tier 1
    'TIER1_VERIFIED',     -- Tier 1 (Standard)
    'TIER1_REJECTED',
    'TIER2_PENDING',      -- User submitted for Tier 2
    'TIER2_FULLY_VERIFIED', -- Tier 2 (Fully Verified)
    'TIER2_REJECTED'
  )
);

-- Ensure the default is UNVERIFIED (it should be from 20240510000001, but good to be explicit if creating table from scratch)
ALTER TABLE public.companies
ALTER COLUMN verification_status SET DEFAULT 'UNVERIFIED';


-- Step 4: Update companies_view
-- Drop dependent function first (if it wasn't dropped for other_metro_specify already - defensive)
DROP FUNCTION IF EXISTS public.get_user_companies(uuid);
DROP VIEW IF EXISTS public.companies_view;

CREATE OR REPLACE VIEW public.companies_view AS
SELECT
  id,
  created_at,
  name,
  description,
  website,
  industry,
  owner_id,
  avatar_url,
  verification_status, -- Updated values
  self_attestation_completed, -- New
  business_number, -- New
  public_presence_links, -- New
  street_address,
  city,
  province,
  postal_code,
  major_metropolitan_area,
  other_metropolitan_area_specify,
  contact_person_name,
  contact_person_email,
  contact_person_phone,
  services
  -- admin_notes is intentionally excluded
FROM
  public.companies;

-- Recreate the function that depends on the view
CREATE OR REPLACE FUNCTION public.get_user_companies(p_user_id UUID)
RETURNS SETOF public.companies_view
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT *
  FROM public.companies_view
  WHERE owner_id = p_user_id;
$$;
GRANT EXECUTE ON FUNCTION public.get_user_companies(uuid) TO authenticated, service_role;


-- Step 5: Update admin_company_details type and admin_get_all_companies_with_owner_info function
DROP FUNCTION IF EXISTS admin_get_all_companies_with_owner_info();
DROP TYPE IF EXISTS admin_company_details;

CREATE TYPE admin_company_details AS (
  company_id uuid,
  company_name text,
  company_created_at timestamptz,
  company_website text,
  company_industry text,
  owner_id uuid,
  owner_email text,
  profile_name text,
  verification_status character varying(20), -- Will reflect new tiered statuses
  admin_notes text,
  self_attestation_completed BOOLEAN, -- New
  business_number TEXT, -- New
  public_presence_links TEXT[], -- New
  street_address TEXT,
  city TEXT,
  province VARCHAR(2),
  postal_code VARCHAR(7),
  major_metropolitan_area TEXT,
  other_metropolitan_area_specify TEXT,
  contact_person_name TEXT,
  contact_person_email TEXT,
  contact_person_phone TEXT,
  services TEXT[]
);

CREATE OR REPLACE FUNCTION admin_get_all_companies_with_owner_info()
RETURNS SETOF admin_company_details
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT internal.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'User is not authorized to perform this action.';
  END IF;

  RETURN QUERY
  SELECT
    c.id AS company_id,
    c.name AS company_name,
    c.created_at AS company_created_at,
    c.website AS company_website,
    c.industry AS company_industry,
    c.owner_id,
    p.email AS owner_email,
    p.name AS profile_name,
    c.verification_status,
    c.admin_notes,
    c.self_attestation_completed, -- New
    c.business_number, -- New
    c.public_presence_links, -- New
    c.street_address,
    c.city,
    c.province,
    c.postal_code,
    c.major_metropolitan_area,
    c.other_metropolitan_area_specify,
    c.contact_person_name,
    c.contact_person_email,
    c.contact_person_phone,
    c.services
  FROM
    public.companies c
  LEFT JOIN
    public.profiles p ON c.owner_id = p.id
  ORDER BY
    c.created_at DESC;
END;
$$;
GRANT EXECUTE ON FUNCTION admin_get_all_companies_with_owner_info() TO authenticated, service_role;

-- The existing admin_update_company_verification function
-- (p_company_id UUID, p_new_status VARCHAR(20), p_new_admin_notes TEXT)
-- should continue to work as admins will pass one of the new status strings.
-- No change needed to its signature or direct logic, only to the allowed values for p_new_status.

DO $$ BEGIN
  RAISE NOTICE 'Tiered company verification system implemented. Columns added, verification_status updated, view and admin functions/types modified.';
END $$; 