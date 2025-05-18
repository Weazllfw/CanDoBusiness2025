-- Create post categories enum
CREATE TYPE post_category AS ENUM (
    'general',
    'business_update',
    'industry_news',
    'job_opportunity',
    'event',
    'question',
    'partnership',
    'product_launch'
);

-- Add category column to posts table
ALTER TABLE public.posts
ADD COLUMN category post_category NOT NULL DEFAULT 'general';

-- Drop all previous versions of get_feed_posts
DROP FUNCTION IF EXISTS get_feed_posts(UUID, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS get_feed_posts(UUID, INTEGER, INTEGER, post_category);
DROP FUNCTION IF EXISTS get_feed_posts(p_user_id UUID, p_limit INTEGER, p_offset INTEGER);

-- Update the get_feed_posts function to include category
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
    post_media_url TEXT,
    post_media_type TEXT,
    author_user_id UUID,
    author_name TEXT,
    author_avatar_url TEXT,
    company_id UUID,
    company_name TEXT,
    company_avatar_url TEXT,
    like_count BIGINT,
    comment_count BIGINT,
    bookmark_count BIGINT,
    is_liked_by_current_user BOOLEAN,
    is_bookmarked_by_current_user BOOLEAN,
    is_network_post INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_category post_category;
BEGIN
    -- Handle empty string as NULL
    IF p_category IS NOT NULL AND p_category::text = '' THEN
        v_category := NULL;
    ELSE
        v_category := p_category;
    END IF;

    RETURN QUERY
    WITH post_stats AS (
        SELECT 
            p2.id AS post_id,
            COALESCE(pl.like_count, 0)::BIGINT AS like_count,
            COALESCE(pc.comment_count, 0)::BIGINT AS comment_count,
            COALESCE(pb.bookmark_count, 0)::BIGINT AS bookmark_count,
            CASE WHEN ul.user_id IS NOT NULL THEN TRUE ELSE FALSE END AS is_liked,
            CASE WHEN ub.user_id IS NOT NULL THEN TRUE ELSE FALSE END AS is_bookmarked
        FROM public.posts p2
        LEFT JOIN (
            SELECT pl2.post_id, COUNT(*) AS like_count 
            FROM public.post_likes pl2
            GROUP BY pl2.post_id
        ) pl ON p2.id = pl.post_id
        LEFT JOIN (
            SELECT pc2.post_id, COUNT(*) AS comment_count 
            FROM public.post_comments pc2
            GROUP BY pc2.post_id
        ) pc ON p2.id = pc.post_id
        LEFT JOIN (
            SELECT pb2.post_id, COUNT(*) AS bookmark_count 
            FROM public.post_bookmarks pb2
            GROUP BY pb2.post_id
        ) pb ON p2.id = pb.post_id
        LEFT JOIN public.post_likes ul 
            ON p2.id = ul.post_id 
            AND ul.user_id = p_user_id
        LEFT JOIN public.post_bookmarks ub 
            ON p2.id = ub.post_id 
            AND ub.user_id = p_user_id
    )
    SELECT 
        p.id AS post_id,
        p.content AS post_content,
        p.created_at AS post_created_at,
        p.category AS post_category,
        p.media_url AS post_media_url,
        p.media_type AS post_media_type,
        prof.id AS author_user_id,
        prof.name AS author_name,
        prof.avatar_url AS author_avatar_url,
        p.company_id,
        c.name AS company_name,
        c.avatar_url AS company_avatar_url,
        ps.like_count,
        ps.comment_count,
        ps.bookmark_count,
        ps.is_liked AS is_liked_by_current_user,
        ps.is_bookmarked AS is_bookmarked_by_current_user,
        0 AS is_network_post
    FROM public.posts p
    JOIN public.profiles prof ON p.user_id = prof.id
    LEFT JOIN public.companies c ON p.company_id = c.id
    JOIN post_stats ps ON p.id = ps.post_id
    WHERE
        (v_category IS NULL OR p.category = v_category)
    ORDER BY p.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- Grant permission to authenticated users to execute this function
GRANT EXECUTE ON FUNCTION get_feed_posts(UUID, INTEGER, INTEGER, post_category) TO authenticated; 