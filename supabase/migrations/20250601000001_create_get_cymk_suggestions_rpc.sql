-- Migration: Create RPC function for "Companies You May Know" (CYMK) suggestions

-- Drop existing function if it exists (idempotency)
DROP FUNCTION IF EXISTS public.get_cymk_suggestions(UUID, INT);

-- RPC function to get "Companies You May Know" suggestions
CREATE OR REPLACE FUNCTION public.get_cymk_suggestions(
    p_requesting_user_id UUID,
    p_limit INT DEFAULT 5 -- Default to 5 suggestions if not specified
)
RETURNS TABLE (
    suggested_company_id UUID,
    company_name TEXT,
    company_avatar_url TEXT,
    company_industry TEXT,
    score BIGINT, -- Represents the number of the user's connections following this company
    reason TEXT
)
LANGUAGE sql
STABLE
SECURITY INVOKER -- Executes with the permissions of the calling user
AS $$
WITH
  -- 1. Current user's direct connections. Assumes internal.get_user_connection_ids from previous migration exists.
  current_user_direct_connections AS (
    SELECT cuid.connected_user_id
    FROM internal.get_user_connection_ids(p_requesting_user_id) AS cuid
  ),
  -- 2. Companies followed by the current user's direct connections, with a count of how many connections follow each.
  companies_followed_by_connections AS (
    SELECT
      ucf.company_id,
      COUNT(DISTINCT direct_conn.connected_user_id) AS connections_following_count
    FROM current_user_direct_connections direct_conn
    JOIN public.user_company_follows ucf ON direct_conn.connected_user_id = ucf.user_id
    GROUP BY ucf.company_id
    HAVING COUNT(DISTINCT direct_conn.connected_user_id) > 0
  ),
  -- 3. Companies already followed by or owned by the requesting user (these should be excluded from suggestions).
  excluded_companies AS (
    SELECT ucf.company_id FROM public.user_company_follows ucf WHERE ucf.user_id = p_requesting_user_id
    UNION
    SELECT c.id AS company_id FROM public.companies c WHERE c.owner_id = p_requesting_user_id
  )
-- 4. Select company details for the suggestions.
-- Filter out companies that are already followed/owned by the user.
-- Optionally, filter for verified companies.
-- Rank by the score (connections_following_count).
SELECT
  cfbc.company_id AS suggested_company_id,
  comp.name AS company_name,
  comp.avatar_url AS company_avatar_url,
  comp.industry AS company_industry,
  cfbc.connections_following_count AS score,
  cfbc.connections_following_count || ' of your connection' || CASE WHEN cfbc.connections_following_count > 1 THEN 's' ELSE '' END || ' follow this company' AS reason
FROM companies_followed_by_connections cfbc
JOIN public.companies comp ON cfbc.company_id = comp.id -- Using public.companies; can switch to companies_view if more fields are needed from the view.
WHERE cfbc.company_id NOT IN (SELECT ec.company_id FROM excluded_companies ec)
  -- AND comp.verification_status IN ('TIER1_VERIFIED', 'TIER2_FULLY_VERIFIED') -- Uncomment to suggest only verified companies. Consider if this is too restrictive initially.
ORDER BY
  score DESC,                     -- Primary sort: by score (number of connections following)
  comp.name ASC,                  -- Secondary sort: alphabetical by company name
  comp.id ASC                     -- Tertiary sort: ID for deterministic ordering
LIMIT p_limit;
$$;

-- Grant execute permission on the RPC function
GRANT EXECUTE ON FUNCTION public.get_cymk_suggestions(UUID, INT) TO authenticated, service_role;

COMMENT ON FUNCTION public.get_cymk_suggestions(UUID, INT) IS 'Provides "Companies You May Know" suggestions based primarily on companies followed by the user''s connections. Takes requesting user ID and a limit.'; 