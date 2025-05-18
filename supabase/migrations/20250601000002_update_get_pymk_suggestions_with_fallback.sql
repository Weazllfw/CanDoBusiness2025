-- Migration: Update RPC function for "People You May Know" (PYMK) suggestions with fallback

-- Drop existing function (MUST match the original signature, including default for p_limit)
DROP FUNCTION IF EXISTS public.get_pymk_suggestions(UUID, INT);

-- Recreate with fallback logic
CREATE OR REPLACE FUNCTION public.get_pymk_suggestions(
    p_requesting_user_id UUID,
    p_limit INT DEFAULT 5
)
RETURNS TABLE (
    suggested_user_id UUID,
    user_name TEXT,
    user_avatar_url TEXT,
    score BIGINT, -- Combined score (mutual connections count + secondary factors)
    reason TEXT -- e.g., "X mutual connections", "Recently joined"
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
  -- 2. Connections of the current user's direct connections (2nd degree)
  second_degree_connections AS (
    SELECT
      sdc.connected_user_id AS potential_suggestion_id,
      COUNT(DISTINCT udc.connected_user_id) AS mutual_connections_count -- Count of mutual 1st degree connections
    FROM user_direct_connections udc
    JOIN internal.get_user_connection_ids(udc.connected_user_id) sdc ON TRUE -- sdc.connected_user_id is the 2nd degree
    WHERE
      sdc.connected_user_id != p_requesting_user_id                      -- Not the requesting user
      AND sdc.connected_user_id NOT IN (SELECT connected_user_id FROM user_direct_connections) -- Not already a direct connection
    GROUP BY sdc.connected_user_id
  ),
  -- 3. Ranked 2nd-degree connections
  ranked_suggestions AS (
    SELECT
      sdc.potential_suggestion_id,
      p.name AS user_name,
      p.avatar_url AS user_avatar_url,
      sdc.mutual_connections_count AS score,
      CASE
        WHEN sdc.mutual_connections_count = 1 THEN '1 mutual connection'
        ELSE sdc.mutual_connections_count || ' mutual connections'
      END AS reason,
      1 as priority -- Higher priority for connection-based suggestions
    FROM second_degree_connections sdc
    JOIN public.profiles p ON sdc.potential_suggestion_id = p.id
    ORDER BY sdc.mutual_connections_count DESC, p.created_at DESC -- Prioritize by mutual connections, then by newest profile
  ),
  -- 4. Fallback: Recently joined users (if not enough from connections)
  --    (Excluding self and direct connections)
  recent_users_fallback AS (
    SELECT
      p.id AS potential_suggestion_id,
      p.name AS user_name,
      p.avatar_url AS user_avatar_url,
      0 AS score, -- Lower score for fallback
      'Recently joined CanDo' AS reason,
      2 as priority -- Lower priority for fallback suggestions
    FROM public.profiles p
    WHERE
      p.id != p_requesting_user_id
      AND p.id NOT IN (SELECT connected_user_id FROM user_direct_connections)
      AND p.id NOT IN (SELECT potential_suggestion_id FROM ranked_suggestions) -- Avoid duplicates if a recent user was somehow a 2nd degree connection
      AND p.created_at >= (NOW() - INTERVAL '30 days') -- Define "recent"
    ORDER BY p.created_at DESC
  ),
  -- 5. Combine and limit
  combined_suggestions AS (
    (SELECT potential_suggestion_id, user_name, user_avatar_url, score, reason, priority FROM ranked_suggestions)
    UNION ALL
    (SELECT potential_suggestion_id, user_name, user_avatar_url, score, reason, priority FROM recent_users_fallback)
  )
SELECT cs.potential_suggestion_id AS suggested_user_id, cs.user_name, cs.user_avatar_url, cs.score, cs.reason
FROM (
    SELECT *, ROW_NUMBER() OVER (PARTITION BY potential_suggestion_id ORDER BY priority ASC, score DESC, user_name ASC) as rn
    FROM combined_suggestions
) cs
WHERE cs.rn = 1 -- Ensure unique suggestions if somehow duplicated between primary and fallback
ORDER BY cs.priority ASC, cs.score DESC, cs.user_name ASC -- Order by priority, then score, then name
LIMIT p_limit;
$$;

COMMENT ON FUNCTION public.get_pymk_suggestions(UUID, INT) IS 'Provides "People You May Know" suggestions based on 2nd-degree connections, with a fallback to recently joined users. Takes requesting user ID and a limit.';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_pymk_suggestions(UUID, INT) TO authenticated, service_role; 