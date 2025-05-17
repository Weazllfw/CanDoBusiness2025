-- Migration: Enhance company profile details

ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS street_address TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS province VARCHAR(2),
ADD COLUMN IF NOT EXISTS postal_code VARCHAR(7),
ADD COLUMN IF NOT EXISTS major_metropolitan_area TEXT,
ADD COLUMN IF NOT EXISTS contact_person_name TEXT,
ADD COLUMN IF NOT EXISTS contact_person_email TEXT,
ADD COLUMN IF NOT EXISTS contact_person_phone TEXT,
ADD COLUMN IF NOT EXISTS services TEXT[];

-- Add CHECK constraint for Canadian provinces/territories
-- Ensuring NU (Nunavut) and NL (Newfoundland and Labrador) are included.
ALTER TABLE public.companies
DROP CONSTRAINT IF EXISTS check_canadian_province;
ALTER TABLE public.companies
ADD CONSTRAINT check_canadian_province CHECK (province IN
  ('AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT')
);

-- Note: The 'industry' column already exists as TEXT.
-- The 'avatar_url' column already exists as TEXT and will be used for uploaded logo URLs.

-- Update the companies_view to include the new fields for general display
CREATE OR REPLACE VIEW public.companies_view AS
SELECT
  id,
  created_at,
  name,
  description,
  website,
  location, -- This might become redundant or used for a general textual location if different from structured address
  industry,
  owner_id,
  avatar_url,
  verification_status,
  -- New address and contact fields
  street_address,
  city,
  province,
  postal_code,
  major_metropolitan_area,
  contact_person_name,
  contact_person_email,
  contact_person_phone,
  services
FROM
  public.companies;

-- Since get_user_companies returns SETOF public.companies_view, it will automatically include these new fields.

-- Update the admin_company_details type and admin_get_all_companies_with_owner_info function
-- to include new fields for admin review, though primary focus is onboarding form for now.

-- Drop the old type and function if they exist to redefine them
DROP FUNCTION IF EXISTS public.admin_get_all_companies_with_owner_info();
DROP TYPE IF EXISTS public.admin_company_details CASCADE;

CREATE TYPE public.admin_company_details AS (
  company_id uuid,
  company_name text,
  company_created_at timestamptz,
  company_website text,
  company_industry text,
  company_location text, -- Original general location
  owner_id uuid,
  owner_email text,
  profile_name text,
  verification_status character varying(20),
  admin_notes text,
  -- New detailed fields for admin view
  street_address TEXT,
  city TEXT,
  province VARCHAR(2),
  postal_code VARCHAR(7),
  major_metropolitan_area TEXT,
  contact_person_name TEXT,
  contact_person_email TEXT,
  contact_person_phone TEXT,
  services TEXT[]
);

CREATE OR REPLACE FUNCTION public.admin_get_all_companies_with_owner_info()
RETURNS SETOF public.admin_company_details
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
    c.location AS company_location,
    c.owner_id,
    p.email AS owner_email,
    p.name AS profile_name, -- Corrected from p.full_name
    c.verification_status,
    c.admin_notes,
    -- New fields
    c.street_address,
    c.city,
    c.province,
    c.postal_code,
    c.major_metropolitan_area,
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
GRANT EXECUTE ON FUNCTION public.admin_get_all_companies_with_owner_info() TO authenticated, service_role;


DO $$ BEGIN
  RAISE NOTICE 'Enhanced company profile with new address, contact, and service fields. Views and admin functions updated.';
END $$; 