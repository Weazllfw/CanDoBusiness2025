-- Migration: Update RPC function for "Companies You May Know" (CYMK) suggestions with fallback

-- Drop existing function (MUST match the original signature, including default for p_limit)
DROP FUNCTION IF EXISTS public.get_cymk_suggestions(UUID, INT);

-- Recreate with fallback logic
CREATE OR REPLACE FUNCTION public.get_cymk_suggestions(
    p_requesting_user_id UUID,
    p_limit INT DEFAULT 5
)
RETURNS TABLE (
    suggested_company_id UUID,
    company_name TEXT,
    company_avatar_url TEXT,
    company_industry TEXT,
    score BIGINT, -- Represents the number of the user's connections following this company or a fallback indicator
    reason TEXT   -- e.g., "X connections follow", "New on CanDoBusiness"
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
WITH
  -- 1. Current user's direct connections
  user_direct_connections AS (
    SELECT connected_user_id FROM internal.get_user_connection_ids(p_requesting_user_id)
  ),
  -- 2. Companies followed by the user's connections
  followed_companies_by_connections AS (
    SELECT
      ucf.company_id,
      COUNT(DISTINCT udc.connected_user_id) AS connections_following_count
    FROM user_direct_connections udc
    JOIN public.user_company_follows ucf ON udc.connected_user_id = ucf.user_id
    WHERE
      ucf.company_id NOT IN (SELECT company_id FROM public.user_company_follows WHERE user_id = p_requesting_user_id) -- Exclude companies already followed by the requesting user
      AND ucf.company_id NOT IN (SELECT id FROM public.companies WHERE owner_id = p_requesting_user_id)              -- Exclude companies owned by the requesting user
    GROUP BY ucf.company_id
  ),
  -- 3. Ranked connection-based company suggestions
  ranked_company_suggestions AS (
    SELECT
      fcc.company_id AS suggested_company_id,
      c.name AS company_name,
      c.avatar_url AS company_avatar_url,
      c.industry as company_industry,
      fcc.connections_following_count AS score,
      CASE
        WHEN fcc.connections_following_count = 1 THEN '1 connection follows'
        ELSE fcc.connections_following_count || ' connections follow'
      END AS reason,
      1 AS priority -- Higher priority for connection-based suggestions
    FROM followed_companies_by_connections fcc
    JOIN public.companies c ON fcc.company_id = c.id
    WHERE c.verification_status = 'TIER1_VERIFIED'
    ORDER BY fcc.connections_following_count DESC, c.created_at DESC
  ),
  -- 4. Fallback: Recently created companies (if not enough from connections)
  --    (Excluding those owned or followed by the requesting user)
  recent_companies_fallback AS (
    SELECT
      c.id AS suggested_company_id,
      c.name AS company_name,
      c.avatar_url AS company_avatar_url,
      c.industry AS company_industry,
      0 AS score, -- Lower score for fallback
      'New on CanDoBusiness' AS reason,
      2 AS priority -- Lower priority
    FROM public.companies c
    WHERE
      c.owner_id != p_requesting_user_id
      AND c.id NOT IN (SELECT company_id FROM public.user_company_follows WHERE user_id = p_requesting_user_id)
      AND c.id NOT IN (SELECT suggested_company_id FROM ranked_company_suggestions) -- Avoid duplicates
      AND c.created_at >= (NOW() - INTERVAL '30 days')
      AND c.verification_status = 'TIER1_VERIFIED'
    ORDER BY c.created_at DESC
  ),
  -- 5. Combine and limit
  combined_suggestions AS (
    (SELECT suggested_company_id, company_name, company_avatar_url, company_industry, score, reason, priority FROM ranked_company_suggestions)
    UNION ALL
    (SELECT suggested_company_id, company_name, company_avatar_url, company_industry, score, reason, priority FROM recent_companies_fallback)
  )
SELECT cs.suggested_company_id, cs.company_name, cs.company_avatar_url, cs.company_industry, cs.score, cs.reason
FROM (
    SELECT *, ROW_NUMBER() OVER (PARTITION BY suggested_company_id ORDER BY priority ASC, score DESC, company_name ASC) as rn
    FROM combined_suggestions
) cs
WHERE cs.rn = 1 -- Ensure unique suggestions
ORDER BY cs.priority ASC, cs.score DESC, cs.company_name ASC
LIMIT p_limit;
$$;

COMMENT ON FUNCTION public.get_cymk_suggestions(UUID, INT) IS 'Provides "Companies You May Know" suggestions based on companies followed by connections, with a fallback to recently created companies. Takes requesting user ID and a limit.';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_cymk_suggestions(UUID, INT) TO authenticated, service_role; 