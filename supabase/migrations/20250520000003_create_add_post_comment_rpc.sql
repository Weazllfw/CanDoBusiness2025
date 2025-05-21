-- Migration: Create RPC function to add a comment to a post

DROP FUNCTION IF EXISTS public.add_post_comment(UUID, TEXT, UUID);

CREATE OR REPLACE FUNCTION public.add_post_comment(
    p_post_id UUID,
    p_content TEXT,
    p_parent_comment_id UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    post_id UUID,
    user_id UUID,
    parent_comment_id UUID,
    content TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    author_name TEXT,
    author_avatar_url TEXT,
    status public.content_status_enum -- Added status field
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_new_comment_id UUID;
    v_profile_status TEXT; -- To check profile status
BEGIN
    -- Check if the user's profile is active
    SELECT profiles.status INTO v_profile_status FROM public.profiles WHERE profiles.id = v_user_id;
    IF v_profile_status IS NULL OR v_profile_status NOT IN ('active', 'verified') THEN -- Assuming 'verified' is also an acceptable status
        RAISE EXCEPTION 'User profile is not active or verified. Cannot post comment.';
    END IF;

    -- Check if the post exists and is visible
    IF NOT EXISTS (SELECT 1 FROM public.posts WHERE posts.id = p_post_id AND posts.status = 'visible') THEN
        RAISE EXCEPTION 'Post not found or is not visible. Cannot add comment.';
    END IF;

    -- If it's a reply, check if the parent comment exists and is visible
    IF p_parent_comment_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM public.post_comments pc WHERE pc.id = p_parent_comment_id AND pc.post_id = p_post_id AND pc.status = 'visible') THEN
            RAISE EXCEPTION 'Parent comment not found or is not visible. Cannot add reply.';
        END IF;
    END IF;

    INSERT INTO public.post_comments (post_id, user_id, content, parent_comment_id)
    VALUES (p_post_id, v_user_id, p_content, p_parent_comment_id)
    RETURNING post_comments.id INTO v_new_comment_id;

    RETURN QUERY
    SELECT
        pc.id,
        pc.post_id,
        pc.user_id,
        pc.parent_comment_id,
        pc.content,
        pc.created_at,
        pc.updated_at,
        prof.name AS author_name,
        prof.avatar_url AS author_avatar_url,
        pc.status -- Return the status of the new comment
    FROM public.post_comments pc
    JOIN public.profiles prof ON pc.user_id = prof.id
    WHERE pc.id = v_new_comment_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_post_comment(UUID, TEXT, UUID) TO authenticated, service_role;

COMMENT ON FUNCTION public.add_post_comment(UUID, TEXT, UUID) IS 'Adds a comment to a post (or replies to another comment) and returns the new comment with author details.'; 