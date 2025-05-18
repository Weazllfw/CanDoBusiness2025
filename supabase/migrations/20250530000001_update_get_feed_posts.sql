CREATE OR REPLACE FUNCTION get_feed_posts(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 10,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    post_id UUID,
    post_content TEXT,
    post_created_at TIMESTAMPTZ,
    author_id UUID,
    author_name TEXT,
    author_avatar_url TEXT,
    like_count BIGINT,
    comment_count BIGINT,
    bookmark_count BIGINT,
    is_liked_by_current_user BOOLEAN,
    is_bookmarked_by_current_user BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id AS post_id,
        p.content AS post_content,
        p.created_at AS post_created_at,
        prof.id AS author_id,
        prof.name AS author_name,
        prof.avatar_url AS author_avatar_url,
        COALESCE(likes.like_count, 0)::BIGINT AS like_count,
        COALESCE(comments.comment_count, 0)::BIGINT AS comment_count,
        COALESCE(bookmarks.bookmark_count, 0)::BIGINT AS bookmark_count,
        CASE WHEN user_likes.user_id IS NOT NULL THEN TRUE ELSE FALSE END AS is_liked_by_current_user,
        CASE WHEN user_bookmarks.user_id IS NOT NULL THEN TRUE ELSE FALSE END AS is_bookmarked_by_current_user
    FROM 
        public.posts p
        JOIN public.profiles prof ON p.user_id = prof.id
        LEFT JOIN (
            SELECT post_id, COUNT(*) AS like_count 
            FROM public.post_likes 
            GROUP BY post_id
        ) likes ON p.id = likes.post_id
        LEFT JOIN (
            SELECT post_id, COUNT(*) AS comment_count 
            FROM public.post_comments 
            GROUP BY post_id
        ) comments ON p.id = comments.post_id
        LEFT JOIN (
            SELECT post_id, COUNT(*) AS bookmark_count 
            FROM public.post_bookmarks 
            GROUP BY post_id
        ) bookmarks ON p.id = bookmarks.post_id
        LEFT JOIN public.post_likes user_likes 
            ON p.id = user_likes.post_id 
            AND user_likes.user_id = p_user_id
        LEFT JOIN public.post_bookmarks user_bookmarks 
            ON p.id = user_bookmarks.post_id 
            AND user_bookmarks.user_id = p_user_id
    ORDER BY p.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$; 