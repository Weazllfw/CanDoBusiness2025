-- Migration: Update companies_view to include owner's name and avatar

BEGIN;

-- Drop functions dependent on companies_view first to avoid errors
-- Add any other functions that depend on companies_view if they exist
DROP FUNCTION IF EXISTS public.get_user_companies(UUID);
DROP FUNCTION IF EXISTS public.get_company_connections(UUID); -- Found this in search results as a dependency
-- Potentially others like: get_company_network_details, admin_get_all_companies_with_owner_info (if it uses companies_view and not companies table directly for some fields)
-- For safety, if admin_get_all_companies_with_owner_info uses it, it should be dropped and recreated too.
-- However, admin_get_all_companies_with_owner_info seems to join profiles directly.

DROP VIEW IF EXISTS public.companies_view CASCADE; 
-- Using CASCADE because other objects like get_user_administered_companies might depend on it.
-- We will recreate these dependent objects.

CREATE OR REPLACE VIEW public.companies_view AS
SELECT
    c.id,
    c.created_at,
    c.updated_at,
    c.name,
    c.description,
    c.website,
    c.industry,
    c.owner_id,
    p_owner.name AS owner_name,             -- ADDED: Joined owner name
    p_owner.avatar_url AS owner_avatar_url, -- ADDED: Joined owner avatar
    c.avatar_url,
    c.banner_url,
    c.year_founded,
    c.business_type,
    c.employee_count,
    c.revenue_range,
    c.social_media_links,
    c.certifications,
    c.tags,
    (c.verification_status IN ('TIER1_VERIFIED', 'TIER2_FULLY_VERIFIED')) AS is_verified,
    CASE
        WHEN c.verification_status = 'TIER2_FULLY_VERIFIED' THEN 'TIER2'
        WHEN c.verification_status = 'TIER1_VERIFIED' THEN 'TIER1'
        ELSE NULL
    END AS verification_tier,
    c.self_attestation_completed AS tier1_self_attestation_completed,
    c.business_number AS tier1_business_number,
    c.public_presence_links AS tier1_public_presence_links,
    c.tier2_submission_date,
    c.tier2_document_type,
    c.tier2_document_filename,
    c.tier2_document_storage_path,
    c.tier2_document_uploaded_at,
    c.verification_status,
    c.street_address,
    c.city,
    c.province,
    c.postal_code,
    c.country,
    c.major_metropolitan_area AS metro_area,
    c.other_metropolitan_area_specify AS other_metro_specify,
    c.contact_person_name AS contact_name,
    c.contact_person_email AS contact_email,
    c.contact_person_phone AS contact_phone,
    c.services
FROM
    public.companies c
LEFT JOIN 
    public.profiles p_owner ON c.owner_id = p_owner.id;

-- Recreate functions that were dropped or affected by CASCADE

-- Recreate public.get_user_companies function
CREATE OR REPLACE FUNCTION public.get_user_companies(user_id_param uuid)
RETURNS SETOF public.companies_view
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT *
  FROM public.companies_view
  WHERE owner_id = user_id_param;
$$;
GRANT EXECUTE ON FUNCTION public.get_user_companies(uuid) TO authenticated;

-- Recreate public.get_company_connections function
-- (Assuming its original definition is sound and only needs re-creation due to view change)
-- Definition from supabase/migrations/20250603000000_create_get_company_connections_rpc.sql
CREATE OR REPLACE FUNCTION get_company_connections(p_company_id UUID)
RETURNS TABLE (
    connected_company_id UUID,
    name TEXT,
    avatar_url TEXT,
    industry TEXT,
    connected_at TIMESTAMPTZ
)
LANGUAGE plpgsql STABLE SECURITY INVOKER -- Changed to SECURITY INVOKER if it doesn't need elevated privs
AS $$
BEGIN
    RETURN QUERY
    SELECT
        comp.id AS connected_company_id,
        comp.name,
        comp.avatar_url,
        comp.industry,
        cc.created_at AS connected_at -- Assuming this was the intended timestamp
    FROM public.company_connections cc
    -- Ensure correct join keys and that comp refers to companies_view if it needs owner details, or companies table if not
    JOIN public.companies_view comp ON (cc.company1_id = p_company_id AND comp.id = cc.company2_id) OR (cc.company2_id = p_company_id AND comp.id = cc.company1_id)
    WHERE (cc.company1_id = p_company_id OR cc.company2_id = p_company_id)
      AND cc.status = 'ACCEPTED' -- Assuming 'ACCEPTED' is the correct status string from your enum/type
      AND comp.id != p_company_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_company_connections(UUID) TO authenticated;

-- Recreate public.get_user_administered_companies function (if it was dropped by CASCADE)
-- Definition from supabase/migrations/20250613000000_create_get_user_administered_companies_rpc.sql
CREATE OR REPLACE FUNCTION public.get_user_administered_companies(p_user_id UUID)
RETURNS TABLE (
    id UUID,
    name TEXT,
    avatar_url TEXT
    -- If this needs owner_name/owner_avatar_url, it should return SETOF companies_view and filter
    -- For now, keeping its original simpler return type based on direct company fields
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
SELECT
    c.id,
    c.name,
    c.avatar_url
FROM
    public.companies c -- Original was public.companies, can be companies_view if extended info needed
JOIN
    public.company_users cu ON c.id = cu.company_id
WHERE
    cu.user_id = p_user_id
    AND cu.role IN ('OWNER', 'ADMIN');
$$;
GRANT EXECUTE ON FUNCTION public.get_user_administered_companies(UUID) TO authenticated;


GRANT SELECT ON public.companies_view TO authenticated;
-- service_role might also need it if backend functions use it directly
-- GRANT SELECT ON public.companies_view TO service_role; 

COMMIT;

DO $$ BEGIN
  RAISE NOTICE 'companies_view updated to include owner name/avatar. Dependent functions recreated.';
END $$; 