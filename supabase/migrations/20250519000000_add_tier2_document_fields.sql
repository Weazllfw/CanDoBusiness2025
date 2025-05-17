-- Migration: Add fields for Tier 2 verification documents to companies table and update related objects

-- Add new columns to public.companies
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS tier2_document_type TEXT NULL,
ADD COLUMN IF NOT EXISTS tier2_document_filename TEXT NULL,
ADD COLUMN IF NOT EXISTS tier2_document_storage_path TEXT NULL,
ADD COLUMN IF NOT EXISTS tier2_document_uploaded_at TIMESTAMPTZ NULL;

-- START DEPENDENCY HANDLING for companies_view
-- 1. Drop functions dependent on companies_view
DROP FUNCTION IF EXISTS public.get_user_companies(UUID);

-- 2. Now drop and recreate companies_view
DROP VIEW IF EXISTS public.companies_view;
CREATE OR REPLACE VIEW public.companies_view AS
SELECT
    id,
    created_at,
    owner_id,
    name,
    description,
    website,
    industry,
    avatar_url,
    verification_status,
    self_attestation_completed,
    business_number,
    public_presence_links,
    street_address,
    city,
    province,
    postal_code,
    major_metropolitan_area,
    other_metropolitan_area_specify,
    contact_person_name,
    contact_person_email,
    contact_person_phone,
    services,
    tier2_document_type,
    tier2_document_filename,
    tier2_document_storage_path,
    tier2_document_uploaded_at
FROM
    public.companies;

-- 3. Recreate functions that were dependent on companies_view
CREATE OR REPLACE FUNCTION public.get_user_companies(p_user_id UUID)
RETURNS SETOF public.companies_view -- Ensure it returns the recreated view type
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.companies_view
  WHERE owner_id = p_user_id;
$$;
GRANT EXECUTE ON FUNCTION public.get_user_companies(UUID) TO authenticated, service_role;
-- END DEPENDENCY HANDLING for companies_view


-- Update admin_company_details SQL TYPE to include new fields
-- 1. Drop dependent function(s) on admin_company_details type
DROP FUNCTION IF EXISTS public.admin_get_all_companies_with_owner_info();

-- 2. Drop the existing type
DROP TYPE IF EXISTS public.admin_company_details CASCADE;

-- 3. Recreate the type with new fields
CREATE TYPE public.admin_company_details AS (
  company_id uuid,
  company_name text,
  company_created_at timestamptz,
  company_website text,
  company_industry text,
  owner_id uuid,
  owner_email text,
  profile_name text,
  verification_status character varying(20),
  admin_notes text,
  self_attestation_completed boolean,
  business_number text,
  public_presence_links text[],
  street_address text,
  city text,
  province character varying(2),
  postal_code character varying(7),
  major_metropolitan_area text,
  other_metropolitan_area_specify text,
  contact_person_name text,
  contact_person_email text,
  contact_person_phone text,
  services text[],
  tier2_document_type text,
  tier2_document_filename text,
  tier2_document_storage_path text,
  tier2_document_uploaded_at timestamptz
);

-- 4. Recreate the function public.admin_get_all_companies_with_owner_info
CREATE OR REPLACE FUNCTION public.admin_get_all_companies_with_owner_info()
RETURNS SETOF public.admin_company_details
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, internal
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
    c.self_attestation_completed,
    c.business_number,
    c.public_presence_links,
    c.street_address,
    c.city,
    c.province,
    c.postal_code,
    c.major_metropolitan_area,
    c.other_metropolitan_area_specify,
    c.contact_person_name,
    c.contact_person_email,
    c.contact_person_phone,
    c.services,
    c.tier2_document_type,
    c.tier2_document_filename,
    c.tier2_document_storage_path,
    c.tier2_document_uploaded_at
  FROM
    public.companies c
  LEFT JOIN
    public.profiles p ON c.owner_id = p.id
  ORDER BY
    c.created_at DESC;
END;
$$;

-- Re-grant execute permission on the recreated function
GRANT EXECUTE ON FUNCTION public.admin_get_all_companies_with_owner_info() TO authenticated, service_role;

DO $$ BEGIN
  RAISE NOTICE 'Tier 2 document fields added to companies table and related objects updated.';
END $$; 