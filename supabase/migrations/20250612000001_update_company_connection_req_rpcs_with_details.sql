-- Migration: update_company_connection_req_rpcs_with_details
-- Description: Updates company connection request RPCs to include company details, avoiding N+1 queries.

-- 5. get_pending_company_connection_requests(p_for_company_id uuid)
-- For admins of p_for_company_id to see incoming requests with requester company details.
DROP FUNCTION IF EXISTS public.get_pending_company_connection_requests(UUID);
CREATE OR REPLACE FUNCTION public.get_pending_company_connection_requests(p_for_company_id UUID)
RETURNS TABLE (
    -- Fields from company_connections
    id UUID,
    requester_company_id UUID,
    addressee_company_id UUID,
    status public.connection_status_enum,
    requested_by_user_id UUID,
    responded_by_user_id UUID,
    notes TEXT,
    requested_at TIMESTAMPTZ,
    responded_at TIMESTAMPTZ,
    -- Details from requester company (public.companies)
    requester_company_name TEXT,
    requester_company_avatar_url TEXT,
    requester_company_industry TEXT,
    requester_company_verification_status TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, internal
AS $$
DECLARE
    v_current_user_id UUID := auth.uid();
BEGIN
    IF NOT public.check_if_user_is_company_admin(v_current_user_id, p_for_company_id) THEN
        RAISE EXCEPTION 'User does not have administrative privileges for the specified company to view pending requests.';
    END IF;

    RETURN QUERY
    SELECT 
        cc.id,
        cc.requester_company_id,
        cc.addressee_company_id,
        cc.status,
        cc.requested_by_user_id,
        cc.responded_by_user_id,
        cc.notes,
        cc.requested_at,
        cc.responded_at,
        req_comp.name AS requester_company_name,
        req_comp.avatar_url AS requester_company_avatar_url,
        req_comp.industry AS requester_company_industry,
        req_comp.verification_status AS requester_company_verification_status
    FROM public.company_connections cc
    JOIN public.companies req_comp ON cc.requester_company_id = req_comp.id
    WHERE cc.addressee_company_id = p_for_company_id 
      AND cc.status = 'PENDING'
      AND req_comp.deleted_at IS NULL -- Ensure requester company is not deleted
    ORDER BY cc.requested_at DESC;
END;
$$;

COMMENT ON FUNCTION public.get_pending_company_connection_requests(UUID) 
IS 'For admins of a company (p_for_company_id) to retrieve incoming pending connection requests, including details of the requesting company.';

-- 6. get_sent_company_connection_requests(p_from_company_id uuid)
-- For admins of p_from_company_id to see their company's outgoing requests with addressee company details.
DROP FUNCTION IF EXISTS public.get_sent_company_connection_requests(UUID);
CREATE OR REPLACE FUNCTION public.get_sent_company_connection_requests(p_from_company_id UUID)
RETURNS TABLE (
    -- Fields from company_connections
    id UUID,
    requester_company_id UUID,
    addressee_company_id UUID,
    status public.connection_status_enum,
    requested_by_user_id UUID,
    responded_by_user_id UUID,
    notes TEXT,
    requested_at TIMESTAMPTZ,
    responded_at TIMESTAMPTZ,
    -- Details from addressee company (public.companies)
    addressee_company_name TEXT,
    addressee_company_avatar_url TEXT,
    addressee_company_industry TEXT,
    addressee_company_verification_status TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, internal
AS $$
DECLARE
    v_current_user_id UUID := auth.uid();
BEGIN
    IF NOT public.check_if_user_is_company_admin(v_current_user_id, p_from_company_id) THEN
        RAISE EXCEPTION 'User does not have administrative privileges for the specified company to view sent requests.';
    END IF;

    RETURN QUERY
    SELECT 
        cc.id,
        cc.requester_company_id,
        cc.addressee_company_id,
        cc.status,
        cc.requested_by_user_id,
        cc.responded_by_user_id,
        cc.notes,
        cc.requested_at,
        cc.responded_at,
        addr_comp.name AS addressee_company_name,
        addr_comp.avatar_url AS addressee_company_avatar_url,
        addr_comp.industry AS addressee_company_industry,
        addr_comp.verification_status AS addressee_company_verification_status
    FROM public.company_connections cc
    JOIN public.companies addr_comp ON cc.addressee_company_id = addr_comp.id
    WHERE cc.requester_company_id = p_from_company_id 
      AND cc.status = 'PENDING'
      AND addr_comp.deleted_at IS NULL -- Ensure addressee company is not deleted
    ORDER BY cc.requested_at DESC;
END;
$$;

COMMENT ON FUNCTION public.get_sent_company_connection_requests(UUID) 
IS 'For admins of a company (p_from_company_id) to retrieve their outgoing pending connection requests, including details of the addressee company.'; 