-- Function to retrieve a paginated and prioritized feed of posts
CREATE OR REPLACE FUNCTION public.get_feed_posts(
    p_current_user_id UUID,    -- ID of the user requesting the feed
    p_page_number INT,         -- For pagination (1-indexed)
    p_page_size INT            -- Number of posts per page
)
RETURNS TABLE (
    post_id UUID,
    post_content TEXT,
    post_media_url TEXT,
    post_media_type TEXT,
    post_created_at TIMESTAMPTZ,
    author_user_id UUID,
    author_name TEXT,
    author_avatar_url TEXT,
    author_subscription_tier TEXT,
    company_id UUID,
    company_name TEXT,
    company_avatar_url TEXT,
    like_count BIGINT,
    comment_count BIGINT,
    is_liked_by_current_user BOOLEAN,
    is_network_post INTEGER -- 0 for network post, 1 for general post (for sorting)
)
LANGUAGE sql
STABLE -- Indicates the function does not modify the database and returns the same results for the same arguments within a transaction.
SECURITY INVOKER -- Executes with the permissions of the calling user.
AS $$
WITH current_user_connections AS (
    -- Users connected to the current user
    SELECT addressee_id AS user_id FROM public.user_connections WHERE requester_id = p_current_user_id AND status = 'ACCEPTED'
    UNION
    SELECT requester_id AS user_id FROM public.user_connections WHERE addressee_id = p_current_user_id AND status = 'ACCEPTED'
),
current_user_followed_companies AS (
    -- Companies followed by the current user
    SELECT company_id FROM public.user_company_follows WHERE user_id = p_current_user_id
)
SELECT
    p.id AS post_id,
    p.content AS post_content,
    p.media_url AS post_media_url,
    p.media_type AS post_media_type,
    p.created_at AS post_created_at,
    p.user_id AS author_user_id,
    author_profile.name AS author_name,
    author_profile.avatar_url AS author_avatar_url,
    p.author_subscription_tier,
    p.company_id,
    comp.name AS company_name,
    comp.avatar_url AS company_avatar_url,
    (SELECT COUNT(*) FROM public.post_likes pl WHERE pl.post_id = p.id) AS like_count,
    (SELECT COUNT(*) FROM public.post_comments pc WHERE pc.post_id = p.id) AS comment_count,
    EXISTS (
        SELECT 1
        FROM public.post_likes pl_user
        WHERE pl_user.post_id = p.id AND pl_user.user_id = p_current_user_id
    ) AS is_liked_by_current_user,
    CASE
        WHEN p.user_id = p_current_user_id THEN 0 -- Own posts first
        WHEN p.user_id IN (SELECT user_id FROM current_user_connections) THEN 0 -- Posts from connected users
        WHEN p.company_id IN (SELECT company_id FROM current_user_followed_companies) THEN 0 -- Posts from followed companies
        ELSE 1
    END AS is_network_post
FROM
    public.posts p
JOIN
    public.profiles author_profile ON p.user_id = author_profile.id
LEFT JOIN
    public.companies comp ON p.company_id = comp.id
WHERE
    p.status = 'visible' -- Ensure only visible posts are selected
ORDER BY
    is_network_post ASC, -- Prioritize network posts (0 comes before 1)
    CASE p.author_subscription_tier
        WHEN 'PRO' THEN 1
        WHEN 'PREMIUM' THEN 2
        WHEN 'REGULAR' THEN 3
        ELSE 4 -- Fallback for any other/null tiers, including if the tier value is unexpected
    END ASC,
    p.created_at DESC
LIMIT p_page_size
OFFSET (GREATEST(p_page_number, 1) - 1) * p_page_size; -- Ensures page_number is at least 1 for offset calculation
$$;

-- Grant permission to authenticated users to execute this function
GRANT EXECUTE ON FUNCTION public.get_feed_posts(UUID, INT, INT) TO authenticated;

COMMENT ON FUNCTION public.get_feed_posts(UUID, INT, INT) IS 
'Retrieves a paginated feed of posts, prioritized first by network relevance (own posts, connections, follows), 
then by author subscription tier, and finally by recency.
Includes author details, company details (if applicable), like/comment counts, and whether the current user has liked each post.
Parameters: p_current_user_id, p_page_number (1-indexed), p_page_size.'; 