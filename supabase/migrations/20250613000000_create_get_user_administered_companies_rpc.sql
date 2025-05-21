-- Migration: create_get_user_administered_companies_rpc
-- Description: Creates an RPC function to get all companies a user is an admin or owner of.

CREATE OR REPLACE FUNCTION public.get_user_administered_companies(p_user_id UUID)
RETURNS TABLE (
    id UUID,
    name TEXT,
    avatar_url TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
SELECT
    c.id,
    c.name,
    c.avatar_url
FROM
    public.companies c
JOIN
    public.company_users cu ON c.id = cu.company_id
WHERE
    cu.user_id = p_user_id
    AND cu.role IN ('OWNER', 'ADMIN'); -- Removed: AND c.deleted_at IS NULL
$$;

GRANT EXECUTE ON FUNCTION public.get_user_administered_companies(UUID) TO authenticated;

DO $$ BEGIN
  RAISE NOTICE 'RPC get_user_administered_companies created and granted.';
END $$;

COMMENT ON FUNCTION public.get_user_administered_companies(UUID) IS 'Returns a list of companies (id, name, avatar_url) that the specified user is an OWNER or ADMIN of.'; 