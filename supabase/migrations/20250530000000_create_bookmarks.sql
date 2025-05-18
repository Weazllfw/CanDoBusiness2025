-- Create bookmarks table
CREATE TABLE public.post_bookmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(post_id, user_id)
);

-- Add RLS policies
ALTER TABLE public.post_bookmarks ENABLE ROW LEVEL SECURITY;

-- Users can see their own bookmarks
CREATE POLICY "Users can view own bookmarks" 
    ON public.post_bookmarks
    FOR SELECT 
    TO authenticated
    USING (auth.uid() = user_id);

-- Users can create their own bookmarks
CREATE POLICY "Users can create own bookmarks" 
    ON public.post_bookmarks
    FOR INSERT 
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own bookmarks
CREATE POLICY "Users can delete own bookmarks" 
    ON public.post_bookmarks
    FOR DELETE 
    TO authenticated
    USING (auth.uid() = user_id);

-- Create function to toggle bookmark
CREATE OR REPLACE FUNCTION toggle_post_bookmark(p_post_id UUID)
RETURNS TABLE (
    is_bookmarked BOOLEAN,
    bookmark_count BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_is_bookmarked BOOLEAN;
    v_bookmark_count BIGINT;
BEGIN
    -- Get the current user's ID
    v_user_id := auth.uid();
    
    -- Check if the post is already bookmarked
    IF EXISTS (
        SELECT 1 FROM public.post_bookmarks 
        WHERE post_id = p_post_id AND user_id = v_user_id
    ) THEN
        -- Remove bookmark
        DELETE FROM public.post_bookmarks 
        WHERE post_id = p_post_id AND user_id = v_user_id;
        v_is_bookmarked := false;
    ELSE
        -- Add bookmark
        INSERT INTO public.post_bookmarks (post_id, user_id)
        VALUES (p_post_id, v_user_id);
        v_is_bookmarked := true;
    END IF;

    -- Get updated bookmark count
    SELECT COUNT(*) INTO v_bookmark_count
    FROM public.post_bookmarks
    WHERE post_id = p_post_id;

    RETURN QUERY
    SELECT v_is_bookmarked, v_bookmark_count;
END;
$$; 