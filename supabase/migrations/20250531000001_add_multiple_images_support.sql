-- Rename existing columns to avoid conflicts
ALTER TABLE public.posts
RENAME COLUMN media_url TO old_media_url;

ALTER TABLE public.posts
RENAME COLUMN media_type TO old_media_type;

-- Add new array columns for multiple media
ALTER TABLE public.posts
ADD COLUMN media_urls text[] DEFAULT '{}',
ADD COLUMN media_types text[] DEFAULT '{}';

-- Migrate existing data
UPDATE public.posts
SET media_urls = ARRAY[old_media_url],
    media_types = ARRAY[old_media_type]
WHERE old_media_url IS NOT NULL AND old_media_type IS NOT NULL;

-- Drop old columns
ALTER TABLE public.posts
DROP COLUMN old_media_url,
DROP COLUMN old_media_type;

-- Add constraint to limit array size
ALTER TABLE public.posts
ADD CONSTRAINT max_media_items CHECK (array_length(media_urls, 1) <= 5 AND array_length(media_types, 1) <= 5);

-- Add constraint to ensure arrays have same length
ALTER TABLE public.posts
ADD CONSTRAINT media_arrays_same_length CHECK (array_length(media_urls, 1) = array_length(media_types, 1));

-- Drop existing function first to avoid return type conflict
DROP FUNCTION IF EXISTS get_feed_posts(UUID, INTEGER, INTEGER, post_category);
DROP FUNCTION IF EXISTS get_feed_posts(UUID, INTEGER, INTEGER);

-- Update the get_feed_posts function to return new media arrays
CREATE OR REPLACE FUNCTION get_feed_posts(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 10,
  p_offset INTEGER DEFAULT 0,
  p_category post_category DEFAULT NULL
)
RETURNS TABLE (
  post_id UUID,
  post_content TEXT,
  post_created_at TIMESTAMPTZ,
  post_category post_category,
  post_media_urls TEXT[],
  post_media_types TEXT[],
  author_user_id UUID,
  author_name TEXT,
  author_avatar_url TEXT,
  author_subscription_tier TEXT,
  company_id UUID,
  company_name TEXT,
  company_avatar_url TEXT,
  like_count BIGINT,
  comment_count BIGINT,
  bookmark_count BIGINT,
  is_liked_by_current_user BOOLEAN,
  is_bookmarked_by_current_user BOOLEAN,
  feed_ranking_score INTEGER -- Renamed from is_network_post for clarity and broader scope
)
LANGUAGE plpgsql
SECURITY INVOKER -- Explicitly set security context
AS $$
BEGIN
  RETURN QUERY
  WITH current_user_connections AS (
    -- Users connected to the current user
    SELECT addressee_id AS connected_user_id FROM public.user_connections WHERE requester_id = p_user_id AND status = 'ACCEPTED'
    UNION
    SELECT requester_id AS connected_user_id FROM public.user_connections WHERE addressee_id = p_user_id AND status = 'ACCEPTED'
  ),
  current_user_followed_companies AS (
    -- Companies followed by the current user
    SELECT ucf.company_id FROM public.user_company_follows ucf WHERE ucf.user_id = p_user_id
  ),
  post_stats AS (
    SELECT
      p_stats.id,
      COUNT(DISTINCT pl.user_id) as like_count,
      COUNT(DISTINCT pc.id) as comment_count,
      COUNT(DISTINCT pb.user_id) as bookmark_count,
      bool_or(pl.user_id = p_user_id) as is_liked,
      bool_or(pb.user_id = p_user_id) as is_bookmarked
    FROM posts p_stats -- aliased to avoid conflict with outer p
    LEFT JOIN post_likes pl ON p_stats.id = pl.post_id
    LEFT JOIN post_comments pc ON p_stats.id = pc.post_id
    LEFT JOIN post_bookmarks pb ON p_stats.id = pb.post_id
    GROUP BY p_stats.id
  )
  SELECT
    p.id::UUID as post_id,
    p.content as post_content,
    p.created_at as post_created_at,
    p.category as post_category,
    p.media_urls as post_media_urls,
    p.media_types as post_media_types,
    prof.id::UUID as author_user_id,
    prof.name as author_name,
    prof.avatar_url as author_avatar_url,
    p.author_subscription_tier,
    p.company_id::UUID,
    c.name as company_name,
    c.avatar_url as company_avatar_url,
    COALESCE(ps.like_count, 0) as like_count,
    COALESCE(ps.comment_count, 0) as comment_count,
    COALESCE(ps.bookmark_count, 0) as bookmark_count,
    COALESCE(ps.is_liked, false) as is_liked_by_current_user,
    COALESCE(ps.is_bookmarked, false) as is_bookmarked_by_current_user,
    CASE
        WHEN p.user_id = p_user_id THEN 0 -- Own posts highest
        WHEN p.user_id IN (SELECT connected_user_id FROM current_user_connections) THEN 1 -- Posts from connected users
        WHEN p.company_id IN (SELECT company_id FROM current_user_followed_companies) THEN 2 -- Posts from followed companies
        ELSE 3 -- General posts
    END as feed_ranking_score
  FROM posts p
  JOIN profiles prof ON p.user_id = prof.id
  LEFT JOIN companies c ON p.company_id = c.id
  LEFT JOIN post_stats ps ON p.id = ps.id -- ps.id refers to p_stats.id from the CTE
  WHERE 
    p.status = 'visible'
    AND (p_category IS NULL OR p.category = p_category)
  ORDER BY
    feed_ranking_score ASC, -- Prioritize based on the score (0 is highest)
    CASE p.author_subscription_tier -- Secondary sort by subscription tier
        WHEN 'PRO' THEN 1
        WHEN 'PREMIUM' THEN 2
        WHEN 'REGULAR' THEN 3
        ELSE 4 -- Fallback for any other/null tiers
    END ASC,
    p.created_at DESC -- Finally, by recency
  LIMIT p_limit
  OFFSET p_offset;
END;
$$; 