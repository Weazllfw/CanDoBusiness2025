-- New migration file: YYYYMMDDHHMMSS_add_company_stats_function.sql

CREATE OR REPLACE FUNCTION public.get_company_verification_stats()
RETURNS TABLE(
  status TEXT,
  count BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, internal -- Added search_path
AS $$
  SELECT internal.ensure_admin(); -- Call the new helper function

  SELECT
    COALESCE(verification_status, 'UNKNOWN') as status,
    COUNT(*) as count
  FROM
    public.companies
  GROUP BY
    verification_status
  ORDER BY
    status;
$$;

GRANT EXECUTE ON FUNCTION public.get_company_verification_stats() TO authenticated; -- Or a specific admin role if you have one

DO $$ BEGIN
  RAISE NOTICE 'Function get_company_verification_stats() created and granted.';
END $$; 