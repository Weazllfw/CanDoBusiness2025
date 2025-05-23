-- Placeholder for admin_get_all_users RPC
-- This function should be secured to only allow admins.
CREATE OR REPLACE FUNCTION admin_get_all_users()
RETURNS TABLE (
    user_id UUID,
    email TEXT,
    name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
    -- Ensure only admins can call this if not using RLS on the function itself
    -- Example: IF NOT is_admin(auth.uid()) THEN RAISE EXCEPTION 'Admin only'; END IF;
    RETURN QUERY
    SELECT
        u.id as user_id,
        u.email,
        p.name,
        p.avatar_url,
        u.created_at
    FROM auth.users u
    LEFT JOIN public.profiles p ON u.id = p.id
    ORDER BY u.created_at DESC;
END;
$$;

-- Ensure to grant execute permission to the correct role, e.g., service_role or a dedicated admin role
-- Example: GRANT EXECUTE ON FUNCTION admin_get_all_users() TO service_role; 