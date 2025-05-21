-- Migration: Create RPC function to toggle a like on a post

DROP FUNCTION IF EXISTS public.toggle_post_like(UUID);

CREATE OR REPLACE FUNCTION public.toggle_post_like(p_post_id UUID)
RETURNS TABLE (
    is_liked BOOLEAN,
    like_count BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_is_liked BOOLEAN;
    v_like_count BIGINT;
BEGIN
    -- Get the current user's ID
    v_user_id := auth.uid();
    
    -- Check if the post is already liked by the current user
    IF EXISTS (
        SELECT 1 FROM public.post_likes 
        WHERE post_id = p_post_id AND user_id = v_user_id
    ) THEN
        -- Remove like (unlike)
        DELETE FROM public.post_likes 
        WHERE post_id = p_post_id AND user_id = v_user_id;
        v_is_liked := false;
    ELSE
        -- Add like
        INSERT INTO public.post_likes (post_id, user_id)
        VALUES (p_post_id, v_user_id);
        v_is_liked := true;
    END IF;

    -- Get updated like count for the post
    SELECT COUNT(*) INTO v_like_count
    FROM public.post_likes
    WHERE post_id = p_post_id;

    RETURN QUERY
    SELECT v_is_liked, v_like_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.toggle_post_like(UUID) TO authenticated, service_role;

COMMENT ON FUNCTION public.toggle_post_like(UUID) IS 'Toggles a like for the current user on a specific post and returns the new like state and total like count.'; 