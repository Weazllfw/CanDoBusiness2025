CREATE OR REPLACE FUNCTION get_post_comments_threaded(p_post_id uuid)
RETURNS TABLE (
    id uuid,
    created_at timestamptz,
    content text,
    parent_comment_id uuid,
    user_id uuid,
    user_name text,
    user_avatar_url text,
    user_email text,
    depth int,
    sort_path timestamptz[]
)
AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE comment_thread AS (
        -- Anchor member: top-level comments
        SELECT
            pc.id,
            pc.created_at,
            pc.content,
            pc.parent_comment_id,
            pc.user_id,
            p.name as user_name,
            p.avatar_url as user_avatar_url,
            p.email as user_email,
            0 as depth,
            ARRAY[pc.created_at] as sort_path
        FROM
            public.post_comments pc
        JOIN
            public.profiles p ON pc.user_id = p.id
        WHERE
            pc.post_id = p_post_id AND pc.parent_comment_id IS NULL

        UNION ALL

        -- Recursive member: replies to comments
        SELECT
            pc.id,
            pc.created_at,
            pc.content,
            pc.parent_comment_id,
            pc.user_id,
            p.name as user_name,
            p.avatar_url as user_avatar_url,
            p.email as user_email,
            ct.depth + 1,
            ct.sort_path || pc.created_at
        FROM
            public.post_comments pc
        JOIN
            public.profiles p ON pc.user_id = p.id
        JOIN
            comment_thread ct ON pc.parent_comment_id = ct.id
    )
    SELECT
        ct.id,
        ct.created_at,
        ct.content,
        ct.parent_comment_id,
        ct.user_id,
        ct.user_name,
        ct.user_avatar_url,
        ct.user_email,
        ct.depth,
        ct.sort_path
    FROM
        comment_thread ct
    ORDER BY
        ct.sort_path;
END;
$$ LANGUAGE plpgsql STABLE; 