-- Migration: Create helper function internal.are_users_connected

CREATE OR REPLACE FUNCTION internal.are_users_connected(
    p_user_id1 UUID,
    p_user_id2 UUID
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER -- Or SECURITY INVOKER if it doesn't need elevated privileges
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_connections
        WHERE
            ( (requester_id = p_user_id1 AND addressee_id = p_user_id2) OR
              (requester_id = p_user_id2 AND addressee_id = p_user_id1) )
            AND status = 'ACCEPTED'
    );
$$;

GRANT EXECUTE ON FUNCTION internal.are_users_connected(UUID, UUID) TO service_role, authenticated;

COMMENT ON FUNCTION internal.are_users_connected(UUID, UUID) 
IS 'Checks if two users are connected (status = ACCEPTED) in the user_connections table.';

DO $$ BEGIN
  RAISE NOTICE 'Helper function internal.are_users_connected created and granted.';
END $$; 