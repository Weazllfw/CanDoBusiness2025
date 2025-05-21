-- Migration: create_user_connection_rpcs
-- Description: Creates RPC functions for managing user-to-user connections.

-- Helper function to get the current authenticated user's ID
CREATE OR REPLACE FUNCTION internal.get_current_user_id()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$ SELECT auth.uid(); $$;

-- 1. send_user_connection_request(p_addressee_id uuid, p_message text default null)
CREATE OR REPLACE FUNCTION public.send_user_connection_request(
    p_addressee_id UUID,
    p_message TEXT DEFAULT NULL
)
RETURNS public.user_connections
LANGUAGE plpgsql
SECURITY DEFINER -- To bypass RLS for the existence check if needed, but insert will be checked by RLS of invoker context
SET search_path = public, internal
AS $$
DECLARE
    v_requester_id UUID := internal.get_current_user_id();
    v_existing_connection public.user_connections;
    v_new_connection public.user_connections;
BEGIN
    IF v_requester_id = p_addressee_id THEN
        RAISE EXCEPTION 'Cannot send a connection request to yourself.';
    END IF;

    -- Check if an identical pending or accepted request already exists
    -- The unique constraint (requester_id, addressee_id) handles this partially.
    -- If a DECLINED or BLOCKED request exists, this function might need to decide whether to allow a new PENDING one.
    -- For now, assume the unique constraint will prevent re-requesting if any record exists.
    -- To allow re-request after DECLINED, the unique constraint would need to be partial or an old record deleted.

    -- Check if target user exists
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_addressee_id) THEN
        RAISE EXCEPTION 'Target user does not exist.';
    END IF;

    -- Let RLS on user_connections handle the insert check for requester_id = auth.uid()
    INSERT INTO public.user_connections (requester_id, addressee_id, notes, status, requested_at)
    VALUES (v_requester_id, p_addressee_id, p_message, 'PENDING', NOW())
    RETURNING * INTO v_new_connection;

    RETURN v_new_connection;
EXCEPTION
    WHEN unique_violation THEN
        -- Check current status if unique violation occurs
        SELECT * INTO v_existing_connection FROM public.user_connections 
        WHERE requester_id = v_requester_id AND addressee_id = p_addressee_id;
        
        IF v_existing_connection.status = 'PENDING' THEN
            RAISE EXCEPTION 'A connection request is already pending with this user.';
        ELSIF v_existing_connection.status = 'ACCEPTED' THEN
            RAISE EXCEPTION 'You are already connected with this user.';
        ELSIF v_existing_connection.status = 'DECLINED' THEN
            RAISE EXCEPTION 'Your previous connection request was declined. To send a new request, the old one must be cleared or a different flow implemented.';
        ELSIF v_existing_connection.status = 'BLOCKED' THEN
            RAISE EXCEPTION 'Unable to send connection request due to a block by one of the users.';
        ELSE
             RAISE EXCEPTION 'A connection record already exists with this user (status: %). Cannot send new request.', v_existing_connection.status;
        END IF;
    WHEN OTHERS THEN
        RAISE;
END;
$$;

-- 2. respond_user_connection_request(p_request_id uuid, p_response text)
CREATE OR REPLACE FUNCTION public.respond_user_connection_request(
    p_request_id UUID,
    p_response TEXT -- 'accept' or 'decline'
)
RETURNS public.user_connections
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, internal
AS $$
DECLARE
    v_addressee_id UUID := internal.get_current_user_id();
    v_connection public.user_connections;
    v_new_status public.connection_status_enum;
BEGIN
    IF lower(p_response) = 'accept' THEN
        v_new_status := 'ACCEPTED';
    ELSIF lower(p_response) = 'decline' THEN
        v_new_status := 'DECLINED';
    ELSE
        RAISE EXCEPTION 'Invalid response. Must be "accept" or "decline".';
    END IF;

    -- RLS policy "Addressees can respond to pending connection requests" will check:
    -- addressee_id = auth.uid() AND status = 'PENDING'
    -- AND on update: status IN ('ACCEPTED', 'DECLINED') AND responded_at IS NOT NULL
    -- So, we set responded_at here.
    UPDATE public.user_connections
    SET status = v_new_status, responded_at = NOW()
    WHERE id = p_request_id AND addressee_id = v_addressee_id AND status = 'PENDING'
    RETURNING * INTO v_connection;

    IF v_connection IS NULL THEN
        RAISE EXCEPTION 'Connection request not found, not pending, or you are not the recipient.';
    END IF;

    RETURN v_connection;
END;
$$;

-- 3. remove_user_connection(p_other_user_id uuid)
CREATE OR REPLACE FUNCTION public.remove_user_connection(
    p_other_user_id UUID
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
    -- RLS policy "Users can remove an accepted connection" will check:
    -- (requester_id = auth.uid() OR addressee_id = auth.uid()) AND status = 'ACCEPTED'
    DELETE FROM public.user_connections
    WHERE status = 'ACCEPTED' AND
          ((requester_id = v_current_user_id AND addressee_id = p_other_user_id) OR
           (requester_id = p_other_user_id AND addressee_id = v_current_user_id));

    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    IF v_deleted_count = 0 THEN
        RAISE EXCEPTION 'No accepted connection found with this user to remove, or deletion failed due to RLS.';
    END IF;
END;
$$;

-- 4. get_user_connection_status_with(p_other_user_id uuid)
-- Returns: 'PENDING_SENT', 'PENDING_RECEIVED', 'ACCEPTED', 'DECLINED_SENT', 'DECLINED_RECEIVED', 'BLOCKED', 'NONE'
CREATE OR REPLACE FUNCTION public.get_user_connection_status_with(p_other_user_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER -- To see status even if RLS would normally hide DECLINED/BLOCKED by other user.
SET search_path = public, internal
AS $$
SELECT
    CASE
        WHEN c.status = 'PENDING' AND c.requester_id = internal.get_current_user_id() THEN 'PENDING_SENT'
        WHEN c.status = 'PENDING' AND c.addressee_id = internal.get_current_user_id() THEN 'PENDING_RECEIVED'
        WHEN c.status = 'ACCEPTED' THEN 'ACCEPTED'
        WHEN c.status = 'DECLINED' AND c.requester_id = internal.get_current_user_id() THEN 'DECLINED_BY_THEM' -- They declined my request
        WHEN c.status = 'DECLINED' AND c.addressee_id = internal.get_current_user_id() THEN 'DECLINED_BY_ME' -- I declined their request
        WHEN c.status = 'BLOCKED' THEN 'BLOCKED' -- Simplified: assumes if a block record exists, it's 'BLOCKED'
        ELSE 'NONE'
    END
FROM public.user_connections c
WHERE 
    (c.requester_id = internal.get_current_user_id() AND c.addressee_id = p_other_user_id) OR
    (c.requester_id = p_other_user_id AND c.addressee_id = internal.get_current_user_id());
-- If no row matches, this will return NULL, which the frontend should also treat as 'NONE'.
-- Consider COALESCE( (SELECT ...), 'NONE') if a non-NULL value is always required.
$$;

-- 5. get_pending_user_connection_requests() (incoming for current user)
DROP FUNCTION IF EXISTS public.get_pending_user_connection_requests(); -- Drop old signature
CREATE OR REPLACE FUNCTION public.get_pending_user_connection_requests()
RETURNS TABLE (
    request_id UUID,
    requester_id UUID,
    requester_name TEXT,
    requester_avatar_url TEXT,
    notes TEXT,
    requested_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, internal
AS $$
    SELECT 
        uc.id AS request_id,
        uc.requester_id,
        p.name AS requester_name,
        p.avatar_url AS requester_avatar_url,
        uc.notes,
        uc.requested_at
    FROM public.user_connections uc
    JOIN public.profiles p ON uc.requester_id = p.id
    WHERE uc.addressee_id = internal.get_current_user_id() AND uc.status = 'PENDING'
      AND p.status = 'active' -- Ensure requester profile is active
    ORDER BY uc.requested_at DESC;
$$;

-- 6. get_sent_user_connection_requests() (outgoing for current user)
DROP FUNCTION IF EXISTS public.get_sent_user_connection_requests(); -- Drop old signature
CREATE OR REPLACE FUNCTION public.get_sent_user_connection_requests()
RETURNS TABLE (
    request_id UUID,
    addressee_id UUID,
    addressee_name TEXT,
    addressee_avatar_url TEXT,
    notes TEXT,
    requested_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, internal
AS $$
    SELECT 
        uc.id AS request_id,
        uc.addressee_id,
        p.name AS addressee_name,
        p.avatar_url AS addressee_avatar_url,
        uc.notes,
        uc.requested_at
    FROM public.user_connections uc
    JOIN public.profiles p ON uc.addressee_id = p.id
    WHERE uc.requester_id = internal.get_current_user_id() AND uc.status = 'PENDING'
      AND p.status = 'active' -- Ensure addressee profile is active
    ORDER BY uc.requested_at DESC;
$$;

-- 7. get_user_network(p_target_user_id uuid)
-- Returns profile details of users connected to p_target_user_id
CREATE OR REPLACE FUNCTION public.get_user_network(p_target_user_id UUID)
RETURNS TABLE (
    connection_id UUID,
    user_id UUID,
    name TEXT,
    avatar_url TEXT,
    -- Add other profile fields as needed, e.g., headline, current_role
    connected_since TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, internal
AS $$
    SELECT
        uc.id AS connection_id,
        p.id AS user_id,
        p.name,
        p.avatar_url,
        uc.responded_at AS connected_since
    FROM public.user_connections uc
    JOIN public.profiles p ON 
        (uc.requester_id = p_target_user_id AND p.id = uc.addressee_id) OR 
        (uc.addressee_id = p_target_user_id AND p.id = uc.requester_id)
    WHERE uc.status = 'ACCEPTED'
    ORDER BY p.name;
$$;

COMMENT ON FUNCTION public.send_user_connection_request(UUID, TEXT) IS 'Sends a connection request from the current user to the target addressee_id.';
COMMENT ON FUNCTION public.respond_user_connection_request(UUID, TEXT) IS 'Allows the current user (addressee) to accept or decline a pending connection request.';
COMMENT ON FUNCTION public.remove_user_connection(UUID) IS 'Removes an established connection between the current user and the specified other user.';
COMMENT ON FUNCTION public.get_user_connection_status_with(UUID) IS 'Checks the connection status (e.g., PENDING_SENT, ACCEPTED) between the current user and another user.';
COMMENT ON FUNCTION public.get_pending_user_connection_requests() IS 'Fetches all incoming pending connection requests for the current user.';
COMMENT ON FUNCTION public.get_sent_user_connection_requests() IS 'Fetches all outgoing pending connection requests made by the current user.';
COMMENT ON FUNCTION public.get_user_network(UUID) IS 'Fetches the profiles of users connected to the specified p_target_user_id.'; 