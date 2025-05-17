DROP TABLE IF EXISTS public.posts CASCADE;
-- Migration to create the posts table and set up initial RLS policies

-- 1. Create the posts table
CREATE TYPE public.content_status_enum AS ENUM (
    'visible',
    'removed_by_admin'
);
COMMENT ON TYPE public.content_status_enum IS 'Status of user-generated content like posts and comments.';

CREATE TABLE public.posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    company_id UUID NULL REFERENCES public.companies(id) ON DELETE CASCADE, -- Optional, if post is on behalf of a company
    rfq_id UUID NULL REFERENCES public.rfqs(id) ON DELETE SET NULL, -- Optional, if post is related to an RFQ
    content TEXT NOT NULL CHECK (char_length(content) > 0),
    media_url TEXT NULL, -- URL to image or video, if any
    media_type TEXT NULL, -- e.g., 'image/jpeg', 'video/mp4'
    author_subscription_tier TEXT NULL, -- e.g., 'REGULAR', 'PRO', 'PREMIUM' - captured at time of posting
    status public.content_status_enum NOT NULL DEFAULT 'visible',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add comments to table and columns for clarity
COMMENT ON TABLE public.posts IS 'Stores posts made by users or companies.';
COMMENT ON COLUMN public.posts.user_id IS 'The user who authored the post.';
COMMENT ON COLUMN public.posts.company_id IS 'The company on whose behalf the post is made (if applicable).';
COMMENT ON COLUMN public.posts.rfq_id IS 'The RFQ related to the post (if applicable).';
COMMENT ON COLUMN public.posts.content IS 'The main textual content of the post.';
COMMENT ON COLUMN public.posts.media_url IS 'URL to any attached media (image, video).';
COMMENT ON COLUMN public.posts.media_type IS 'Type of media (e.g., ''image/jpeg'', ''video/mp4'').';
COMMENT ON COLUMN public.posts.author_subscription_tier IS 'Subscription tier of the author at the time of posting, for feed prioritization.';
COMMENT ON COLUMN public.posts.status IS 'Moderation status of the post.';
COMMENT ON COLUMN public.posts.created_at IS 'Timestamp of post creation.';
COMMENT ON COLUMN public.posts.updated_at IS 'Timestamp of last post update.';

-- Create indexes for performance
DROP INDEX IF EXISTS idx_posts_user_id;
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON public.posts(user_id);
DROP INDEX IF EXISTS idx_posts_company_id;
CREATE INDEX IF NOT EXISTS idx_posts_company_id ON public.posts(company_id);
DROP INDEX IF EXISTS idx_posts_rfq_id;
CREATE INDEX IF NOT EXISTS idx_posts_rfq_id ON public.posts(rfq_id);
DROP INDEX IF EXISTS idx_posts_created_at;
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts(created_at DESC); -- For feed ordering

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies for posts

-- Allow authenticated users to read all posts
DROP POLICY IF EXISTS "Allow authenticated users to read posts" ON public.posts;
CREATE POLICY "Allow authenticated users to read posts"
ON public.posts
FOR SELECT
TO authenticated
USING (status = 'visible');

-- Allow users to insert their own posts
-- Note: The author_subscription_tier should ideally be set by a trigger or trusted RPC
-- to prevent users from setting it themselves to an incorrect value.
-- The check for company_id authorization (if posting as a company) will be added later
-- via RLS on an RPC or by refining this policy.
DROP POLICY IF EXISTS "Allow users to create their own posts" ON public.posts;
CREATE POLICY "Allow users to create their own posts"
ON public.posts
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own posts
DROP POLICY IF EXISTS "Allow users to update their own posts" ON public.posts;
CREATE POLICY "Allow users to update their own posts"
ON public.posts
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own posts
DROP POLICY IF EXISTS "Allow users to delete their own posts" ON public.posts;
CREATE POLICY "Allow users to delete their own posts"
ON public.posts
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to update updated_at on post update
DROP TRIGGER IF EXISTS handle_posts_updated_at ON public.posts;
CREATE TRIGGER handle_posts_updated_at
BEFORE UPDATE ON public.posts
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Grant usage on the enum type
GRANT USAGE ON TYPE public.content_status_enum TO authenticated, anon; 