-- supabase/migrations/20250515500000_create_ensure_admin_function.sql
CREATE OR REPLACE FUNCTION internal.ensure_admin()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = internal, public -- Ensure internal.is_admin is found
AS $$
BEGIN
  IF NOT internal.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'User is not authorized to perform this action.';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION internal.ensure_admin() TO authenticated, service_role;

DO $$ BEGIN
  RAISE NOTICE 'Function internal.ensure_admin() created and granted.';
END $$; 