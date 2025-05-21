-- Migration: update_get_user_network_with_profile_details
-- Description: Updates public.get_user_network to include trust_level and is_verified from the profiles table.

DROP FUNCTION IF EXISTS public.get_user_network(UUID);
CREATE OR REPLACE FUNCTION public.get_user_network(p_target_user_id UUID)
RETURNS TABLE (
    connection_id UUID,
    user_id UUID,
    name TEXT,
    avatar_url TEXT,
    trust_level public.user_trust_level_enum,
    is_verified BOOLEAN,
    connected_since TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, internal
AS $$
DECLARE
    v_is_network_public BOOLEAN;
    v_caller_is_target BOOLEAN;
    v_caller_is_admin BOOLEAN;
BEGIN
    SELECT profiles.is_network_public INTO v_is_network_public 
    FROM public.profiles WHERE id = p_target_user_id;

    IF NOT FOUND THEN -- Target profile does not exist
        RETURN; 
    END IF;

    v_caller_is_target := auth.uid() = p_target_user_id;
    v_caller_is_admin := internal.is_admin(auth.uid());

    IF v_is_network_public OR v_caller_is_target OR v_caller_is_admin THEN
        RETURN QUERY
        SELECT
            uc.id AS connection_id,
            p.id AS user_id,
            p.name,
            p.avatar_url,
            p.trust_level,
            p.is_verified,
            uc.responded_at AS connected_since
        FROM public.user_connections uc
        JOIN public.profiles p ON 
            (uc.requester_id = p_target_user_id AND p.id = uc.addressee_id AND p.status = 'active') OR 
            (uc.addressee_id = p_target_user_id AND p.id = uc.requester_id AND p.status = 'active')
        WHERE uc.status = 'ACCEPTED'
        ORDER BY p.name;
    ELSE
        -- If network is private and caller is not owner or admin, return empty set.
        RETURN;
    END IF;
END;
$$;

COMMENT ON FUNCTION public.get_user_network(UUID) 
IS 'Returns profile details (including trust level and verification status) of users connected to p_target_user_id, respecting the is_network_public privacy flag. Admins and profile owners can always view.'; 