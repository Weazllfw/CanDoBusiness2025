-- Migration: Create RPC function for "People You May Know" (PYMK) suggestions

-- Drop existing functions if they exist (idempotency)
DROP FUNCTION IF EXISTS public.get_pymk_suggestions(UUID, INT);
DROP FUNCTION IF EXISTS internal.get_user_connection_ids(UUID);

-- Helper function to get all accepted connection IDs for a user
-- This function centralizes the logic for finding a user's direct connections.
CREATE OR REPLACE FUNCTION internal.get_user_connection_ids(user_id_param uuid)
RETURNS TABLE(connected_user_id uuid)
LANGUAGE sql
STABLE
SECURITY INVOKER -- Can be invoker as it only reads from user_connections based on the passed user_id_param
AS $$
  SELECT addressee_id AS connected_user_id FROM public.user_connections WHERE requester_id = user_id_param AND status = 'ACCEPTED'
  UNION -- Use UNION to combine two sets and remove duplicates (though requester/addressee logic should prevent functional duplicates for same pair)
  SELECT requester_id AS connected_user_id FROM public.user_connections WHERE addressee_id = user_id_param AND status = 'ACCEPTED';
$$;

-- Grant execute permission on the helper function
GRANT EXECUTE ON FUNCTION internal.get_user_connection_ids(UUID) TO authenticated, service_role;


-- RPC function to get "People You May Know" suggestions
CREATE OR REPLACE FUNCTION public.get_pymk_suggestions(
    p_requesting_user_id UUID,
    p_limit INT DEFAULT 5 -- Default to 5 suggestions if not specified
)
RETURNS TABLE (
    suggested_user_id UUID,
    user_name TEXT,
    user_avatar_url TEXT,
    mutual_connections_count BIGINT,
    reason TEXT
)
LANGUAGE sql
STABLE
SECURITY INVOKER -- Executes with the permissions of the calling user
AS $$
WITH
  -- 1. Current user's direct connections
  current_user_direct_connections AS (
    SELECT cuid.connected_user_id
    FROM internal.get_user_connection_ids(p_requesting_user_id) AS cuid
  ),
  -- 2. Connections of the current user's direct connections (friends of friends - CoCs)
  -- These are potential suggestions.
  connections_of_connections AS (
    SELECT
      coc.connected_user_id AS potential_suggestion_id
    FROM current_user_direct_connections direct_conn
    CROSS JOIN LATERAL internal.get_user_connection_ids(direct_conn.connected_user_id) AS coc
    WHERE
      coc.connected_user_id <> p_requesting_user_id -- Exclude the requesting user themselves
      AND coc.connected_user_id NOT IN (SELECT connected_user_id FROM current_user_direct_connections) -- Exclude users who are already direct connections
  ),
  -- 3. Count mutual connections for each potential suggestion
  -- This count forms the primary score for ranking.
  ranked_suggestions AS (
    SELECT
      cs.potential_suggestion_id,
      COUNT(*) AS mutual_connections
    FROM connections_of_connections cs
    GROUP BY cs.potential_suggestion_id
    HAVING COUNT(*) > 0 -- Ensure there is at least one mutual connection
  )
-- 4. Select profile details for the ranked suggestions and format the output
SELECT
  rs.potential_suggestion_id AS suggested_user_id,
  p.name AS user_name,
  p.avatar_url AS user_avatar_url,
  rs.mutual_connections AS mutual_connections_count,
  rs.mutual_connections || ' mutual connection' || CASE WHEN rs.mutual_connections > 1 THEN 's' ELSE '' END AS reason
FROM ranked_suggestions rs
JOIN public.profiles p ON rs.potential_suggestion_id = p.id
WHERE p.status = 'active' -- Only suggest active profiles
ORDER BY
  rs.mutual_connections DESC, -- Primary sort: number of mutual connections
  p.name ASC,                 -- Secondary sort: alphabetical by name for tie-breaking
  p.id ASC                    -- Tertiary sort: ID for deterministic ordering on full ties
LIMIT p_limit;
$$;

-- Grant execute permission on the RPC function
GRANT EXECUTE ON FUNCTION public.get_pymk_suggestions(UUID, INT) TO authenticated, service_role;

COMMENT ON FUNCTION public.get_pymk_suggestions(UUID, INT) IS 'Provides "People You May Know" suggestions based primarily on mutual connections. Takes requesting user ID and a limit.'; 