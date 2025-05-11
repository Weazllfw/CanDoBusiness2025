-- Migration: Add other_metropolitan_area_specify to companies table and update related views/functions

ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS other_metropolitan_area_specify TEXT;

-- Drop dependent function first
DROP FUNCTION IF EXISTS public.get_user_companies(uuid);

-- Then drop the existing view
DROP VIEW IF EXISTS public.companies_view;

-- Recreate the companies_view to include the new field and exclude the old one
CREATE VIEW public.companies_view AS
SELECT
  id,
  created_at,
  name,
  description,
  website,
  -- location, -- This was removed, and its absence is handled by DROP/CREATE
  industry,
  owner_id,
  avatar_url,
  verification_status,
  street_address,
  city,
  province,
  postal_code,
  major_metropolitan_area,
  other_metropolitan_area_specify, -- Added new column
  contact_person_name,
  contact_person_email,
  contact_person_phone,
  services
FROM
  public.companies;

-- Recreate the function that depends on the view
CREATE OR REPLACE FUNCTION public.get_user_companies(p_user_id UUID)
RETURNS SETOF public.companies_view -- Return type is now the updated view
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT *
  FROM public.companies_view
  WHERE owner_id = p_user_id;
$$;
GRANT EXECUTE ON FUNCTION public.get_user_companies(uuid) TO authenticated, service_role;


-- Update the admin_company_details type and admin_get_all_companies_with_owner_info function
-- These also might depend on the view indirectly if their logic or types reference it,
-- so it's safer to drop and recreate them after the view is settled.

DROP FUNCTION IF EXISTS admin_get_all_companies_with_owner_info();
DROP TYPE IF EXISTS admin_company_details;

CREATE TYPE admin_company_details AS (
  company_id uuid,
  company_name text,
  company_created_at timestamptz,
  company_website text,
  company_industry text,
  -- company_location text, -- This was removed
  owner_id uuid,
  owner_email text,
  profile_name text,
  verification_status character varying(20),
  admin_notes text,
  street_address TEXT,
  city TEXT,
  province VARCHAR(2),
  postal_code VARCHAR(7),
  major_metropolitan_area TEXT,
  other_metropolitan_area_specify TEXT, -- Added new column
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
    -- c.location AS company_location, -- This was removed
    c.owner_id,
    p.email AS owner_email,
    p.name AS profile_name,
    c.verification_status,
    c.admin_notes,
    c.street_address,
    c.city,
    c.province,
    c.postal_code,
    c.major_metropolitan_area,
    c.other_metropolitan_area_specify, -- Added new column
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

DO $$ BEGIN
  RAISE NOTICE 'Column other_metropolitan_area_specify added to companies table and related views/functions updated.';
END $$;