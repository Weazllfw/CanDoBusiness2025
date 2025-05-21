-- Migration: create_company_connection_rpcs
-- Description: Creates RPC functions for managing company-to-company connections.

-- Helper function to check if a user is an admin or owner of a company
-- This assumes a public.company_users table with user_id, company_id, and role ('ADMIN', 'OWNER', 'MEMBER', etc.)
CREATE OR REPLACE FUNCTION internal.is_company_admin(p_user_id UUID, p_company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER -- To access company_users table
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.company_users cu
        WHERE cu.user_id = p_user_id
          AND cu.company_id = p_company_id
          AND cu.role IN ('ADMIN', 'OWNER') -- Define your admin-level roles here
    );
$$;

-- 1. send_company_connection_request(p_acting_company_id uuid, p_target_company_id uuid)
CREATE OR REPLACE FUNCTION public.send_company_connection_request(
    p_acting_company_id UUID,
    p_target_company_id UUID
)
RETURNS public.company_connections
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, internal
AS $$
DECLARE
    v_current_user_id UUID := internal.get_current_user_id();
    v_existing_connection public.company_connections;
    v_new_connection public.company_connections;
BEGIN
    IF p_acting_company_id = p_target_company_id THEN
        RAISE EXCEPTION 'Cannot send a connection request from a company to itself.';
    END IF;

    IF NOT internal.is_company_admin(v_current_user_id, p_acting_company_id) THEN
        RAISE EXCEPTION 'User does not have administrative privileges for the acting company.';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.companies WHERE id = p_target_company_id AND deleted_at IS NULL AND verification_status IN ('TIER1_VERIFIED', 'TIER2_FULLY_VERIFIED')) THEN
        RAISE EXCEPTION 'Target company does not exist, is not verified, or has been deleted.';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM public.companies WHERE id = p_acting_company_id AND deleted_at IS NULL AND verification_status IN ('TIER1_VERIFIED', 'TIER2_FULLY_VERIFIED')) THEN
        RAISE EXCEPTION 'Acting company does not exist, is not verified, or has been deleted.';
    END IF;

    -- RLS on company_connections handles insert check for admin privileges of requester_company_id
    INSERT INTO public.company_connections (requester_company_id, addressee_company_id, requested_by_user_id, status, requested_at)
    VALUES (p_acting_company_id, p_target_company_id, v_current_user_id, 'PENDING', NOW())
    RETURNING * INTO v_new_connection;

    RETURN v_new_connection;
EXCEPTION
    WHEN unique_violation THEN
        SELECT * INTO v_existing_connection FROM public.company_connections
        WHERE requester_company_id = p_acting_company_id AND addressee_company_id = p_target_company_id;
        
        IF v_existing_connection.status = 'PENDING' THEN
            RAISE EXCEPTION 'A connection request is already pending with this company.';
        ELSIF v_existing_connection.status = 'ACCEPTED' THEN
            RAISE EXCEPTION 'Your company is already connected with this company.';
        ELSIF v_existing_connection.status = 'DECLINED' THEN
            RAISE EXCEPTION 'Your company''s previous connection request was declined.';
        ELSIF v_existing_connection.status = 'BLOCKED' THEN
            RAISE EXCEPTION 'Unable to send connection request due to a block.';
        ELSE
            RAISE EXCEPTION 'A connection record already exists with this company (status: %).', v_existing_connection.status;
        END IF;
    WHEN OTHERS THEN
        RAISE;
END;
$$;

-- 2. respond_company_connection_request(p_request_id uuid, p_response text)
CREATE OR REPLACE FUNCTION public.respond_company_connection_request(
    p_request_id UUID,
    p_response TEXT -- 'accept' or 'decline'
)
RETURNS public.company_connections
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, internal
AS $$
DECLARE
    v_current_user_id UUID := internal.get_current_user_id();
    v_connection public.company_connections;
    v_addressee_company_id UUID;
    v_new_status public.connection_status_enum;
BEGIN
    SELECT cc.addressee_company_id INTO v_addressee_company_id
    FROM public.company_connections cc
    WHERE cc.id = p_request_id;

    IF v_addressee_company_id IS NULL THEN
        RAISE EXCEPTION 'Connection request not found.';
    END IF;

    IF NOT internal.is_company_admin(v_current_user_id, v_addressee_company_id) THEN
        RAISE EXCEPTION 'User does not have administrative privileges for the company to respond.';
    END IF;

    IF lower(p_response) = 'accept' THEN
        v_new_status := 'ACCEPTED';
    ELSIF lower(p_response) = 'decline' THEN
        v_new_status := 'DECLINED';
    ELSE
        RAISE EXCEPTION 'Invalid response. Must be "accept" or "decline".';
    END IF;

    -- RLS policy handles actual update permission check
    UPDATE public.company_connections
    SET status = v_new_status, responded_at = NOW()
    WHERE id = p_request_id AND status = 'PENDING' -- RLS also checks addressee_company_id link to user
    RETURNING * INTO v_connection;

    IF v_connection IS NULL THEN
        RAISE EXCEPTION 'Failed to update connection request. It might not be pending or not address your company.';
    END IF;

    RETURN v_connection;
END;
$$;

-- 3. remove_company_connection(p_acting_company_id uuid, p_other_company_id uuid)
CREATE OR REPLACE FUNCTION public.remove_company_connection(
    p_acting_company_id UUID,
    p_other_company_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, internal
AS $$
DECLARE
    v_current_user_id UUID := internal.get_current_user_id();
    v_deleted_count INTEGER;
BEGIN
    IF NOT internal.is_company_admin(v_current_user_id, p_acting_company_id) THEN
        RAISE EXCEPTION 'User does not have administrative privileges for the acting company to remove connection.';
    END IF;

    -- RLS policy handles actual delete permission check
    DELETE FROM public.company_connections
    WHERE status = 'ACCEPTED' AND
          ((requester_company_id = p_acting_company_id AND addressee_company_id = p_other_company_id) OR
           (requester_company_id = p_other_company_id AND addressee_company_id = p_acting_company_id));
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    IF v_deleted_count = 0 THEN
        RAISE EXCEPTION 'No accepted connection found to remove or user lacks privileges for one of the companies.';
    END IF;
END;
$$;


-- 4. get_company_connection_status_with(p_acting_company_id uuid, p_other_company_id uuid)
-- Returns: 'PENDING_SENT', 'PENDING_RECEIVED', 'ACCEPTED', 'DECLINED_SENT', 'DECLINED_RECEIVED', 'BLOCKED', 'NONE'
-- User must be admin of p_acting_company_id to see detailed status.
CREATE OR REPLACE FUNCTION public.get_company_connection_status_with(p_acting_company_id UUID, p_other_company_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, internal
AS $$
DECLARE
    v_current_user_id UUID := internal.get_current_user_id();
    v_status public.connection_status_enum;
    v_requester_company_id UUID;
    v_is_admin BOOLEAN;
BEGIN
    v_is_admin := internal.is_company_admin(v_current_user_id, p_acting_company_id);

    IF NOT v_is_admin THEN
      -- Non-admins of the acting company can only know if they are connected or not (public info)
      -- or if a request is pending from their company to the other, if they are the one who sent it.
      -- For simplicity, let's return 'NONE' if not an admin of the acting company for detailed status.
      -- More granular public status (like just 'ACCEPTED' or 'NONE') could be exposed differently.
      -- The public count is a separate RPC.
       SELECT status INTO v_status FROM public.company_connections c
        WHERE 
            (c.requester_company_id = p_acting_company_id AND c.addressee_company_id = p_other_company_id) OR
            (c.requester_company_id = p_other_company_id AND c.addressee_company_id = p_acting_company_id);
        
        IF v_status = 'ACCEPTED' THEN RETURN 'ACCEPTED'; END IF;
        RETURN 'NONE'; -- Or 'UNKNOWN' if not admin of acting_company
    END IF;

    SELECT c.status, c.requester_company_id INTO v_status, v_requester_company_id
    FROM public.company_connections c
    WHERE 
        (c.requester_company_id = p_acting_company_id AND c.addressee_company_id = p_other_company_id) OR
        (c.requester_company_id = p_other_company_id AND c.addressee_company_id = p_acting_company_id);

    IF v_status IS NULL THEN
        RETURN 'NONE';
    END IF;

    IF v_status = 'PENDING' THEN
        IF v_requester_company_id = p_acting_company_id THEN RETURN 'PENDING_SENT'; ELSE RETURN 'PENDING_RECEIVED'; END IF;
    ELSIF v_status = 'ACCEPTED' THEN
        RETURN 'ACCEPTED';
    ELSIF v_status = 'DECLINED' THEN
        IF v_requester_company_id = p_acting_company_id THEN RETURN 'DECLINED_BY_THEM'; -- They declined acting company's request
        ELSE RETURN 'DECLINED_BY_US'; -- Acting company declined their request
        END IF;
    ELSIF v_status = 'BLOCKED' THEN
        RETURN 'BLOCKED'; -- Simplified
    ELSE
        RETURN 'NONE'; -- Should not happen
    END IF;
END;
$$;

-- 5. get_pending_company_connection_requests(p_for_company_id uuid)
-- For admins of p_for_company_id to see incoming requests.
CREATE OR REPLACE FUNCTION public.get_pending_company_connection_requests(p_for_company_id UUID)
RETURNS SETOF public.company_connections -- Consider projecting with requester company details
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, internal -- Keep internal for other potential uses, public is for the wrapper
AS $$
DECLARE
    v_current_user_id UUID := auth.uid(); -- Use auth.uid() directly as in the wrapper
BEGIN
    -- Use the public wrapper for the admin check
    IF NOT public.check_if_user_is_company_admin(v_current_user_id, p_for_company_id) THEN
        RAISE EXCEPTION 'User does not have administrative privileges for the specified company.';
    END IF;

    RETURN QUERY
    SELECT cc.* 
    FROM public.company_connections cc
    WHERE cc.addressee_company_id = p_for_company_id AND cc.status = 'PENDING'
    ORDER BY cc.requested_at DESC;
END;
$$;

-- 6. get_sent_company_connection_requests(p_from_company_id uuid)
-- For admins of p_from_company_id to see their company's outgoing requests.
CREATE OR REPLACE FUNCTION public.get_sent_company_connection_requests(p_from_company_id UUID)
RETURNS SETOF public.company_connections -- Consider projecting with addressee company details
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, internal -- Keep internal for other potential uses, public is for the wrapper
AS $$
DECLARE
    v_current_user_id UUID := auth.uid(); -- Use auth.uid() directly as in the wrapper
BEGIN
    -- Use the public wrapper for the admin check
    IF NOT public.check_if_user_is_company_admin(v_current_user_id, p_from_company_id) THEN
        RAISE EXCEPTION 'User does not have administrative privileges for the specified company.';
    END IF;

    RETURN QUERY
    SELECT cc.*
    FROM public.company_connections cc
    WHERE cc.requester_company_id = p_from_company_id AND cc.status = 'PENDING'
    ORDER BY cc.requested_at DESC;
END;
$$;

-- 7. get_company_network_count(p_company_id uuid)
-- Publicly visible count of accepted connections.
CREATE OR REPLACE FUNCTION public.get_company_network_count(p_company_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY INVOKER -- RLS on company_connections allows select for ACCEPTED status, so invoker is fine.
                 -- Or SECURITY DEFINER if RLS "Public can view accepted company connections" is restrictive.
                 -- The RLS policy "Public can view accepted company connections" allows authenticated to see accepted.
SET search_path = public
AS $$
    SELECT COUNT(*)::INTEGER
    FROM public.company_connections cc
    WHERE (cc.requester_company_id = p_company_id OR cc.addressee_company_id = p_company_id)
      AND cc.status = 'ACCEPTED';
$$;

-- 8. get_company_network_details(p_company_id uuid)
-- For admins of p_company_id to see details of connected companies.
-- Returns company details of connected companies for admins
CREATE OR REPLACE FUNCTION public.get_company_network_details(p_target_company_id UUID)
RETURNS TABLE (
    connection_id UUID,
    company_id UUID,
    name TEXT,
    logo_url TEXT,
    industry TEXT,
    connected_since TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, internal
AS $$
DECLARE
    v_current_user_id UUID := internal.get_current_user_id();
BEGIN
    IF NOT internal.is_company_admin(v_current_user_id, p_target_company_id) THEN
        RAISE EXCEPTION 'User does not have administrative privileges for the specified company to view network details.';
    END IF;

    RETURN QUERY
    SELECT
        cc.id AS connection_id,
        comp.id AS company_id,
        comp.name,
        comp.avatar_url AS logo_url,
        comp.industry, -- Assuming industry is a direct column on companies table
        cc.responded_at AS connected_since
    FROM public.company_connections cc
    JOIN public.companies comp ON 
        (cc.requester_company_id = p_target_company_id AND comp.id = cc.addressee_company_id) OR 
        (cc.addressee_company_id = p_target_company_id AND comp.id = cc.requester_company_id)
    WHERE cc.status = 'ACCEPTED'
      AND comp.deleted_at IS NULL -- Ensure connected company is not deleted
    ORDER BY comp.name;
END;
$$;


COMMENT ON FUNCTION public.send_company_connection_request(UUID, UUID) IS 'Sends a connection request from p_acting_company_id to p_target_company_id, initiated by an admin of the acting company.';
COMMENT ON FUNCTION public.respond_company_connection_request(UUID, TEXT) IS 'Allows an admin of the addressee company to accept or decline a pending connection request.';
COMMENT ON FUNCTION public.remove_company_connection(UUID, UUID) IS 'Removes an established connection between two companies, initiated by an admin of p_acting_company_id.';
COMMENT ON FUNCTION public.get_company_connection_status_with(UUID, UUID) IS 'Checks connection status between p_acting_company_id and p_other_company_id, for admins of p_acting_company_id.';
COMMENT ON FUNCTION public.get_pending_company_connection_requests(UUID) IS 'Fetches incoming pending connection requests for p_for_company_id, for its admins.';
COMMENT ON FUNCTION public.get_sent_company_connection_requests(UUID) IS 'Fetches outgoing pending connection requests from p_from_company_id, for its admins.';
COMMENT ON FUNCTION public.get_company_network_count(UUID) IS 'Publicly returns the number of accepted connections for a company.';
COMMENT ON FUNCTION public.get_company_network_details(UUID) IS 'Returns details of companies connected to p_target_company_id, for its admins.'; 