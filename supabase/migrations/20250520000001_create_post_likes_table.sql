DROP TABLE IF EXISTS public.post_likes CASCADE;
-- Migration to create the post_likes table and set up initial RLS policies

-- 1. Create the post_likes table
CREATE TABLE public.post_likes (
    post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    PRIMARY KEY (post_id, user_id) -- Ensures a user can only like a post once
);

-- Add comments to table and columns for clarity
COMMENT ON TABLE public.post_likes IS 'Tracks likes given by users to posts.';
COMMENT ON COLUMN public.post_likes.post_id IS 'The post that was liked.';
COMMENT ON COLUMN public.post_likes.user_id IS 'The user who liked the post.';
COMMENT ON COLUMN public.post_likes.created_at IS 'Timestamp of when the like was given.';

-- Create indexes for performance (primary key already creates one for (post_id, user_id))
-- Index for querying likes by user might be useful, or likes by post (already covered by PK)
DROP INDEX IF EXISTS idx_post_likes_user_id;
CREATE INDEX IF NOT EXISTS idx_post_likes_user_id ON public.post_likes(user_id);
-- CREATE INDEX idx_post_likes_post_id ON public.post_likes(post_id); -- Covered by PK

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies for post_likes

-- Allow authenticated users to read all likes (e.g., for displaying like counts)
DROP POLICY IF EXISTS "Allow authenticated users to read likes" ON public.post_likes;
CREATE POLICY "Allow authenticated users to read likes"
ON public.post_likes
FOR SELECT
TO authenticated
USING (true);

-- Allow users to insert their own likes
DROP POLICY IF EXISTS "Allow users to like a post" ON public.post_likes;
CREATE POLICY "Allow users to like a post"
ON public.post_likes
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own likes (unlike a post)
DROP POLICY IF EXISTS "Allow users to unlike a post" ON public.post_likes;
CREATE POLICY "Allow users to unlike a post"
ON public.post_likes
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Note: Updates to likes are generally not needed; a user either likes or unlikes (deletes the row). 