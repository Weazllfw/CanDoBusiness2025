-- Migration: Update get_feed_posts for Platform Interaction Model filtering and ranking

DROP FUNCTION IF EXISTS public.get_feed_posts(UUID, INTEGER, INTEGER, TEXT, public.user_trust_level_enum);
DROP FUNCTION IF EXISTS public.get_feed_posts(UUID, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION public.get_feed_posts(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 10,
    p_offset INTEGER DEFAULT 0,
    p_feed_type TEXT DEFAULT 'ALL', -- 'ALL', 'VERIFIED_COMPANIES', 'PEOPLE_ONLY', 'CONNECTIONS_ONLY', 'FOLLOWED_ONLY'
    p_minimum_trust_level public.user_trust_level_enum DEFAULT NULL,
    p_category public.post_category DEFAULT NULL -- Added category filter
)
RETURNS TABLE (
    post_id UUID,
    post_content TEXT,
    post_created_at TIMESTAMPTZ,
    post_category public.post_category, -- Added
    post_media_urls TEXT[], -- Added
    post_media_types TEXT[], -- Added
    author_user_id UUID, -- The user who authored (directly or on behalf of company)
    author_name TEXT,
    author_avatar_url TEXT,
    author_subscription_tier TEXT, -- Added
    author_trust_level public.user_trust_level_enum,
    author_is_verified BOOLEAN,
    acting_as_company_id UUID,
    acting_as_company_name TEXT,
    acting_as_company_logo_url TEXT,
    company_verification_status TEXT,
    like_count BIGINT,
    comment_count BIGINT,
    bookmark_count BIGINT,
    is_liked_by_current_user BOOLEAN,
    is_bookmarked_by_current_user BOOLEAN,
    feed_ranking_score NUMERIC -- Renamed from ranking_score
)
LANGUAGE plpgsql
SECURITY DEFINER -- Assuming it needs to access various tables; review if INVOKER is more appropriate
SET search_path = public, internal -- For trust level enum and connection checks
AS $$
DECLARE
    v_current_user_id UUID := p_user_id;
BEGIN
    RETURN QUERY
    WITH posts_with_details AS (
        SELECT
            p.id AS post_id,
            p.content AS post_content,
            p.created_at AS post_created_at,
            p.category AS post_category, -- Added
            p.media_urls AS post_media_urls, -- Added
            p.media_types AS post_media_types, -- Added
            p.user_id AS author_user_id,
            author_profile.name AS author_name,
            author_profile.avatar_url AS author_avatar_url,
            p.author_subscription_tier AS author_subscription_tier, -- Added (from posts table)
            author_profile.trust_level AS author_trust_level,
            author_profile.is_verified AS author_is_verified,
            p.acting_as_company_id,
            acting_company.name AS acting_as_company_name,
            acting_company.avatar_url AS acting_as_company_logo_url,
            acting_company.verification_status::TEXT AS company_verification_status,
            COALESCE(likes.like_count, 0)::BIGINT AS like_count,
            COALESCE(comments.comment_count, 0)::BIGINT AS comment_count,
            COALESCE(bookmarks.bookmark_count, 0)::BIGINT AS bookmark_count,
            CASE WHEN user_likes.user_id IS NOT NULL THEN TRUE ELSE FALSE END AS is_liked_by_current_user,
            CASE WHEN user_bookmarks.user_id IS NOT NULL THEN TRUE ELSE FALSE END AS is_bookmarked_by_current_user,
            p.status as post_status,
            author_profile.status as author_status
        FROM
            public.posts p
            JOIN public.profiles author_profile ON p.user_id = author_profile.id
            LEFT JOIN public.companies acting_company ON p.acting_as_company_id = acting_company.id
            LEFT JOIN (
                SELECT pl.post_id, COUNT(*) AS like_count
                FROM public.post_likes pl GROUP BY pl.post_id
            ) likes ON p.id = likes.post_id
            LEFT JOIN (
                SELECT pc.post_id, COUNT(*) AS comment_count
                FROM public.post_comments pc WHERE pc.status = 'visible' GROUP BY pc.post_id
            ) comments ON p.id = comments.post_id
            LEFT JOIN (
                SELECT pb.post_id, COUNT(*) AS bookmark_count
                FROM public.post_bookmarks pb GROUP BY pb.post_id
            ) bookmarks ON p.id = bookmarks.post_id
            LEFT JOIN public.post_likes user_likes
                ON p.id = user_likes.post_id AND user_likes.user_id = v_current_user_id
            LEFT JOIN public.post_bookmarks user_bookmarks
                ON p.id = user_bookmarks.post_id AND user_bookmarks.user_id = v_current_user_id
        WHERE p.status = 'visible' AND author_profile.status = 'active'
          AND (p_category IS NULL OR p.category = p_category) -- Added category filter logic
    )
    SELECT
        pwd.post_id,
        pwd.post_content,
        pwd.post_created_at,
        pwd.post_category, -- Added
        pwd.post_media_urls, -- Added
        pwd.post_media_types, -- Added
        pwd.author_user_id,
        pwd.author_name,
        pwd.author_avatar_url,
        pwd.author_subscription_tier, -- Added
        pwd.author_trust_level,
        pwd.author_is_verified,
        pwd.acting_as_company_id,
        pwd.acting_as_company_name,
        pwd.acting_as_company_logo_url,
        pwd.company_verification_status,
        pwd.like_count,
        pwd.comment_count,
        pwd.bookmark_count,
        pwd.is_liked_by_current_user,
        pwd.is_bookmarked_by_current_user,
        -- Ranking Score Calculation (as the 18th column)
        (
            EXTRACT(EPOCH FROM pwd.post_created_at) / 3600 + -- Recency (hours since epoch)
            (pwd.like_count * 2) +
            (pwd.comment_count * 3) +
            (CASE WHEN pwd.acting_as_company_id IS NOT NULL AND pwd.company_verification_status IN ('TIER1_VERIFIED', 'TIER2_FULLY_VERIFIED') THEN 100 ELSE 0 END) + -- Boost for verified company post
            (CASE WHEN pwd.acting_as_company_id IS NULL AND pwd.author_is_verified THEN 75 ELSE 0 END) + -- Boost for verified individual post
            (CASE WHEN pwd.acting_as_company_id IS NULL THEN
                CASE pwd.author_trust_level
                    WHEN 'VERIFIED_CONTRIBUTOR' THEN 50
                    WHEN 'ESTABLISHED' THEN 30
                    WHEN 'BASIC' THEN 10
                    ELSE 0
                END
             ELSE 0 END) +
            (CASE WHEN p_feed_type = 'CONNECTIONS_ONLY' AND EXISTS (SELECT 1 FROM internal.get_user_connection_ids(v_current_user_id) ucid WHERE ucid.connected_user_id = pwd.author_user_id) THEN 200 ELSE 0 END) + -- Corrected ucid access
            (CASE WHEN p_feed_type = 'FOLLOWED_ONLY' AND EXISTS (SELECT 1 FROM public.user_company_follows ucf WHERE ucf.user_id = v_current_user_id AND ucf.company_id = pwd.acting_as_company_id) THEN 150 ELSE 0 END) -- Boost for followed companies
            -- TODO: Add boost for posts from users followed by current user (requires user_follows_user table)
        ) AS feed_ranking_score -- Renamed alias
    FROM posts_with_details pwd
    WHERE
        -- Apply Filters
        (p_feed_type = 'ALL' OR
         (p_feed_type = 'VERIFIED_COMPANIES' AND pwd.acting_as_company_id IS NOT NULL AND pwd.company_verification_status IN ('TIER1_VERIFIED', 'TIER2_FULLY_VERIFIED')) OR
         (p_feed_type = 'PEOPLE_ONLY' AND pwd.acting_as_company_id IS NULL) OR
         (p_feed_type = 'CONNECTIONS_ONLY' AND pwd.acting_as_company_id IS NULL AND EXISTS (SELECT 1 FROM internal.get_user_connection_ids(v_current_user_id) ucid WHERE ucid.connected_user_id = pwd.author_user_id)) OR -- Corrected ucid access
         (p_feed_type = 'FOLLOWED_ONLY' AND pwd.acting_as_company_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.user_company_follows ucf WHERE ucf.user_id = v_current_user_id AND ucf.company_id = pwd.acting_as_company_id))
         -- TODO: Add filter for posts from users followed by current user
        )
        AND
        (p_minimum_trust_level IS NULL OR (pwd.acting_as_company_id IS NULL AND pwd.author_trust_level >= p_minimum_trust_level))

    ORDER BY feed_ranking_score DESC, pwd.post_created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- Drop the old grant if it exists with the old signature, then create new one
DROP FUNCTION IF EXISTS public.get_feed_posts(UUID, INTEGER, INTEGER, TEXT, public.user_trust_level_enum);
GRANT EXECUTE ON FUNCTION public.get_feed_posts(UUID, INTEGER, INTEGER, TEXT, public.user_trust_level_enum, public.post_category) TO authenticated;

COMMENT ON FUNCTION public.get_feed_posts(UUID, INTEGER, INTEGER, TEXT, public.user_trust_level_enum, public.post_category) IS 'Retrieves posts for a user feed with various filtering and ranking options. Includes author and company details, engagement counts, user interaction status, post category, media, and subscription tier.';

DO $$ BEGIN
  RAISE NOTICE 'RPC function get_feed_posts updated with category filter, media fields, subscription tier, and corrected ranking score name.';
END $$; 