DROP TABLE IF EXISTS public.post_comments CASCADE;
-- Migration to create the post_comments table and set up initial RLS policies

-- 1. Create the post_comments table
CREATE TABLE public.post_comments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    parent_comment_id uuid NULL REFERENCES public.post_comments(id) ON DELETE CASCADE, -- For threaded comments
    content text NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add comments to table and columns for clarity
COMMENT ON TABLE public.post_comments IS 'Stores comments made by users on posts, allowing for threaded conversations.';
COMMENT ON COLUMN public.post_comments.post_id IS 'The post to which the comment belongs.';
COMMENT ON COLUMN public.post_comments.user_id IS 'The user who authored the comment.';
COMMENT ON COLUMN public.post_comments.parent_comment_id IS 'For threaded replies, references the parent comment''s ID.';
COMMENT ON COLUMN public.post_comments.content IS 'The textual content of the comment.';
COMMENT ON COLUMN public.post_comments.created_at IS 'Timestamp of comment creation.';
COMMENT ON COLUMN public.post_comments.updated_at IS 'Timestamp of last comment update.';

-- Create indexes for performance
DROP INDEX IF EXISTS idx_post_comments_post_id;
CREATE INDEX IF NOT EXISTS idx_post_comments_post_id ON public.post_comments(post_id);
DROP INDEX IF EXISTS idx_post_comments_user_id;
CREATE INDEX IF NOT EXISTS idx_post_comments_user_id ON public.post_comments(user_id);
DROP INDEX IF EXISTS idx_post_comments_parent_comment_id;
CREATE INDEX IF NOT EXISTS idx_post_comments_parent_comment_id ON public.post_comments(parent_comment_id);
DROP INDEX IF EXISTS idx_post_comments_created_at;
CREATE INDEX IF NOT EXISTS idx_post_comments_created_at ON public.post_comments(created_at ASC); -- Comments usually shown oldest first or by thread

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies for post_comments

-- Allow authenticated users to read all comments
DROP POLICY IF EXISTS "Allow authenticated users to read comments" ON public.post_comments;
CREATE POLICY "Allow authenticated users to read comments"
ON public.post_comments
FOR SELECT
TO authenticated
USING (true);

-- Allow users to insert their own comments
DROP POLICY IF EXISTS "Allow users to create their own comments" ON public.post_comments;
CREATE POLICY "Allow users to create their own comments"
ON public.post_comments
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own comments
DROP POLICY IF EXISTS "Allow users to update their own comments" ON public.post_comments;
CREATE POLICY "Allow users to update their own comments"
ON public.post_comments
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own comments
DROP POLICY IF EXISTS "Allow users to delete their own comments" ON public.post_comments;
CREATE POLICY "Allow users to delete their own comments"
ON public.post_comments
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Trigger to update updated_at on comment update
-- Uses the same function defined in 20250520000000_create_posts_table.sql migration
DROP TRIGGER IF EXISTS handle_post_comments_updated_at ON public.post_comments;
CREATE TRIGGER handle_post_comments_updated_at
BEFORE UPDATE ON public.post_comments
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at(); 