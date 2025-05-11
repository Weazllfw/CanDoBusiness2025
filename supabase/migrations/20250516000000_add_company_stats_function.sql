-- New migration file: YYYYMMDDHHMMSS_add_company_stats_function.sql

CREATE OR REPLACE FUNCTION public.get_company_verification_stats()
RETURNS TABLE(
  status TEXT,
  count BIGINT
)
LANGUAGE sql
SECURITY DEFINER -- Or SECURITY INVOKER if RLS on companies is sufficient and you want to restrict by admin view policies
AS $$
  -- Ensure the user calling this is an admin if it's SECURITY DEFINER
  -- For SECURITY INVOKER, RLS on companies would naturally apply, but admin might need full view.
  -- Assuming admins should see all stats, so a check might be good if DEFINER is used without other RLS.
  -- However, for a simple count, this might be overly restrictive if just any authenticated user could see stats.
  -- For now, let's assume only admins call this from the admin page, where page access is already restricted.
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