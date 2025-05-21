-- Migration: Create RPC function for users to flag content (posts or comments)

DROP TYPE IF EXISTS public.flag_content_type_enum CASCADE;
CREATE TYPE public.flag_content_type_enum AS ENUM (
    'post',
    'comment'
);

DROP FUNCTION IF EXISTS public.create_content_flag(UUID, public.flag_content_type_enum, TEXT);

CREATE OR REPLACE FUNCTION public.create_content_flag(
    p_content_id UUID,
    p_content_type public.flag_content_type_enum,
    p_reason TEXT DEFAULT NULL
)
RETURNS JSON -- Returns the created flag record (from either table) as JSON
LANGUAGE plpgsql
SECURITY DEFINER -- Uses definer to check content existence and insert flag, but all actions are based on auth.uid()
SET search_path = public, internal
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_content_owner_id UUID;
    v_flag_record JSON;
BEGIN
    -- Ensure user is not flagging their own content
    IF p_content_type = 'post' THEN
        SELECT user_id INTO v_content_owner_id FROM public.posts WHERE id = p_content_id;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Post with ID % not found.', p_content_id;
        END IF;
        IF v_content_owner_id = v_user_id THEN
            RAISE EXCEPTION 'Users cannot flag their own posts.';
        END IF;
        
        -- Check post status (e.g., must be 'visible')
        IF NOT EXISTS (SELECT 1 FROM public.posts WHERE id = p_content_id AND status = 'visible') THEN
             RAISE EXCEPTION 'Post is not active or does not exist.';
        END IF;

        INSERT INTO public.post_flags (post_id, user_id, reason, status)
        VALUES (p_content_id, v_user_id, p_reason, 'pending_review')
        RETURNING json_build_object(
            'id', id, 
            'content_id', post_id, 
            'content_type', 'post', 
            'user_id', user_id, 
            'reason', reason, 
            'status', status, 
            'created_at', created_at
        ) INTO v_flag_record;

    ELSIF p_content_type = 'comment' THEN
        SELECT user_id INTO v_content_owner_id FROM public.post_comments WHERE id = p_content_id;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Comment with ID % not found.', p_content_id;
        END IF;
        IF v_content_owner_id = v_user_id THEN
            RAISE EXCEPTION 'Users cannot flag their own comments.';
        END IF;

        -- Check comment status (e.g., must be 'visible')
        IF NOT EXISTS (SELECT 1 FROM public.post_comments WHERE id = p_content_id AND status = 'visible') THEN
             RAISE EXCEPTION 'Comment is not active or does not exist.';
        END IF;

        INSERT INTO public.comment_flags (comment_id, user_id, reason, status)
        VALUES (p_content_id, v_user_id, p_reason, 'pending_review')
        RETURNING json_build_object(
            'id', id, 
            'content_id', comment_id, 
            'content_type', 'comment', 
            'user_id', user_id, 
            'reason', reason, 
            'status', status, 
            'created_at', created_at
        ) INTO v_flag_record;
    ELSE
        RAISE EXCEPTION 'Invalid content type. Must be "post" or "comment".';
    END IF;

    RETURN v_flag_record;

EXCEPTION
    WHEN unique_violation THEN
        RAISE EXCEPTION 'You have already flagged this content.';
    WHEN OTHERS THEN
        RAISE; -- Re-raise other exceptions
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_content_flag(UUID, public.flag_content_type_enum, TEXT) TO authenticated;

COMMENT ON FUNCTION public.create_content_flag(UUID, public.flag_content_type_enum, TEXT) 
IS 'Allows an authenticated user to flag a piece of content (post or comment). Users cannot flag their own content. Returns the created flag record as JSON.';

DO $$ BEGIN
  RAISE NOTICE 'RPC function create_content_flag created and granted.';
END $$; 