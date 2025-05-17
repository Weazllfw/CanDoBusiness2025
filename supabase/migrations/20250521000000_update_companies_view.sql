DROP VIEW IF EXISTS public.companies_view CASCADE;

-- Update public.companies_view to include new company profile fields

CREATE OR REPLACE VIEW public.companies_view AS
SELECT
    id,
    created_at,
    updated_at,
    name,
    description,
    website,
    industry,
    owner_id,
    avatar_url,
    banner_url,
    year_founded,
    business_type,
    employee_count,
    revenue_range,
    social_media_links,
    certifications,
    tags,
    (verification_status IN ('TIER1_VERIFIED', 'TIER2_FULLY_VERIFIED')) AS is_verified, -- Derived
    CASE
        WHEN verification_status = 'TIER2_FULLY_VERIFIED' THEN 'TIER2'
        WHEN verification_status = 'TIER1_VERIFIED' THEN 'TIER1'
        ELSE NULL
    END AS verification_tier, -- Derived
    self_attestation_completed AS tier1_self_attestation_completed,
    business_number AS tier1_business_number,
    public_presence_links AS tier1_public_presence_links,
    -- tier1_submission_date, -- Does not exist on companies table, only tier2_submission_date exists
    -- tier1_review_date, -- Does not exist
    -- tier1_rejection_reason, -- Does not exist
    tier2_submission_date,
    -- tier2_review_date, -- Does not exist
    -- tier2_rejection_reason, -- Does not exist
    tier2_document_type,
    tier2_document_filename,
    tier2_document_storage_path,
    tier2_document_uploaded_at,
    verification_status,
    street_address,
    city,
    province, -- Actual column name is 'province'
    postal_code,
    country, -- Actual column name
    major_metropolitan_area AS metro_area,
    other_metropolitan_area_specify AS other_metro_specify,
    contact_person_name AS contact_name,
    contact_person_email AS contact_email,
    contact_person_phone AS contact_phone,
    services -- Correct column name is 'services'
FROM
    public.companies;

-- Ensure the get_user_companies function still works with this view
-- (it should, as it returns SETOF public.companies_view)
-- The function is recreated below to ensure it exists after DROP VIEW CASCADE.

GRANT SELECT ON public.companies_view TO authenticated;
-- GRANT SELECT ON public.companies_view TO service_role; -- if needed for backend functions

-- Recreate the get_user_companies function because it was dropped by CASCADE
CREATE OR REPLACE FUNCTION public.get_user_companies(user_id_param uuid)
RETURNS SETOF public.companies_view
LANGUAGE sql STABLE
AS $$
  SELECT *
  FROM public.companies_view
  WHERE owner_id = user_id_param;
$$;
GRANT EXECUTE ON FUNCTION public.get_user_companies(uuid) TO authenticated; 