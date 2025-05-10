-- Migration: Admin tools for company verification

-- Function for admins to get all companies with owner details
CREATE TYPE admin_company_details AS (
  company_id uuid,
  company_name text,
  company_created_at timestamptz,
  company_website text,
  company_industry text,
  company_location text,
  owner_id uuid,
  owner_email text,
  profile_name text, -- Assuming profiles table has a 'name' or 'full_name' column
  verification_status character varying(20),
  admin_notes text
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
    c.location AS company_location,
    c.owner_id,
    p.email AS owner_email,
    p.name AS profile_name, -- Corrected from p.full_name to p.name
    c.verification_status,
    c.admin_notes
  FROM
    public.companies c
  LEFT JOIN
    public.profiles p ON c.owner_id = p.id
  ORDER BY
    c.created_at DESC;
END;
$$;
GRANT EXECUTE ON FUNCTION admin_get_all_companies_with_owner_info() TO authenticated, service_role; -- Grant to roles that admins will use

-- Function for admins to update company verification status and notes
CREATE OR REPLACE FUNCTION admin_update_company_verification(
  p_company_id UUID,
  p_new_status VARCHAR(20),
  p_new_admin_notes TEXT
)
RETURNS public.companies -- Returns the updated company row
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_company public.companies%ROWTYPE;
BEGIN
  IF NOT internal.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'User is not authorized to perform this action.';
  END IF;

  UPDATE public.companies
  SET
    verification_status = p_new_status,
    admin_notes = p_new_admin_notes
  WHERE
    id = p_company_id
  RETURNING * INTO updated_company;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Company with ID % not found.', p_company_id;
  END IF;

  RETURN updated_company;
END;
$$;
GRANT EXECUTE ON FUNCTION admin_update_company_verification(UUID, VARCHAR(20), TEXT) TO authenticated, service_role;

DO $$ BEGIN
  RAISE NOTICE 'Admin company verification tools (functions) added.';
END $$; 