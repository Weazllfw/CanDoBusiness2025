-- Migration to create tables for flagging posts and comments, and related RLS policies.

-- 0. Make sure the internal schema and is_admin function exist (idempotent check)
-- This is assumed to be in place from previous migrations (e.g., 20240510000002_secure_companies_access.sql)
-- CREATE SCHEMA IF NOT EXISTS internal;
-- Ensure internal.is_admin() is available.

-- 1. Create an ENUM type for flag status
DROP TYPE IF EXISTS public.flag_status_enum CASCADE;
CREATE TYPE public.flag_status_enum AS ENUM (
    'pending_review',
    'resolved_no_action',
    'resolved_content_removed',
    'resolved_user_warned',
    'resolved_user_banned'
);

-- 2. Table for flagging posts
DROP TABLE IF EXISTS public.post_flags CASCADE;
CREATE TABLE public.post_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, -- User who flagged
    reason TEXT NULL, -- Optional reason provided by the user
    status public.flag_status_enum NOT NULL DEFAULT 'pending_review',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NULL,
    reviewed_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL, -- Admin who reviewed
    reviewed_at TIMESTAMPTZ NULL,
    admin_notes TEXT NULL, -- Notes by admin during review
    CONSTRAINT unique_post_flag_by_user UNIQUE (post_id, user_id) -- A user can only flag a specific post once
);

COMMENT ON TABLE public.post_flags IS 'Stores flags submitted by users for posts that may violate community guidelines.';
COMMENT ON COLUMN public.post_flags.post_id IS 'The post that was flagged.';
COMMENT ON COLUMN public.post_flags.user_id IS 'The user who submitted the flag.';
COMMENT ON COLUMN public.post_flags.reason IS 'The reason provided by the user for flagging.';
COMMENT ON COLUMN public.post_flags.status IS 'The current status of the flag (e.g., pending, resolved).';
COMMENT ON COLUMN public.post_flags.reviewed_by IS 'The admin user who reviewed and actioned the flag.';
COMMENT ON COLUMN public.post_flags.reviewed_at IS 'Timestamp when the flag was reviewed.';
COMMENT ON COLUMN public.post_flags.admin_notes IS 'Internal notes made by an administrator during the review of the flag.';

-- Indexes for post_flags
CREATE INDEX IF NOT EXISTS idx_post_flags_post_id ON public.post_flags(post_id);
CREATE INDEX IF NOT EXISTS idx_post_flags_user_id ON public.post_flags(user_id);
CREATE INDEX IF NOT EXISTS idx_post_flags_status ON public.post_flags(status);

-- 3. Table for flagging comments
DROP TABLE IF EXISTS public.comment_flags CASCADE;
CREATE TABLE public.comment_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID NOT NULL REFERENCES public.post_comments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, -- User who flagged
    reason TEXT NULL, -- Optional reason provided by the user
    status public.flag_status_enum NOT NULL DEFAULT 'pending_review',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NULL,
    reviewed_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL, -- Admin who reviewed
    reviewed_at TIMESTAMPTZ NULL,
    admin_notes TEXT NULL, -- Notes by admin during review
    CONSTRAINT unique_comment_flag_by_user UNIQUE (comment_id, user_id) -- A user can only flag a specific comment once
);

COMMENT ON TABLE public.comment_flags IS 'Stores flags submitted by users for comments that may violate community guidelines.';
COMMENT ON COLUMN public.comment_flags.comment_id IS 'The comment that was flagged.';
COMMENT ON COLUMN public.comment_flags.user_id IS 'The user who submitted the flag.';
COMMENT ON COLUMN public.comment_flags.reason IS 'The reason provided by the user for flagging.';
COMMENT ON COLUMN public.comment_flags.status IS 'The current status of the flag (e.g., pending, resolved).';
COMMENT ON COLUMN public.comment_flags.reviewed_by IS 'The admin user who reviewed and actioned the flag.';
COMMENT ON COLUMN public.comment_flags.reviewed_at IS 'Timestamp when the flag was reviewed.';
COMMENT ON COLUMN public.comment_flags.admin_notes IS 'Internal notes made by an administrator during the review of the flag.';

-- Indexes for comment_flags
CREATE INDEX IF NOT EXISTS idx_comment_flags_comment_id ON public.comment_flags(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_flags_user_id ON public.comment_flags(user_id);
CREATE INDEX IF NOT EXISTS idx_comment_flags_status ON public.comment_flags(status);

-- 4. Enable RLS for the new tables
ALTER TABLE public.post_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_flags ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for post_flags

-- Allow users to insert a flag for a post (they must be the flagging user)
DROP POLICY IF EXISTS "Allow users to insert their own post flags" ON public.post_flags;
CREATE POLICY "Allow users to insert their own post flags"
ON public.post_flags
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow users to see their own submitted flags
DROP POLICY IF EXISTS "Allow users to select their own post flags" ON public.post_flags;
CREATE POLICY "Allow users to select their own post flags"
ON public.post_flags
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Allow users to update the reason for their own PENDING flags
DROP POLICY IF EXISTS "Allow users to update reason on their own pending post flags" ON public.post_flags;
CREATE POLICY "Allow users to update reason on their own pending post flags"
ON public.post_flags
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id AND status = 'pending_review')
WITH CHECK (auth.uid() = user_id AND status = 'pending_review'); -- Can only update 'reason' column effectively

-- Allow users to delete their own PENDING flags (retract a flag)
DROP POLICY IF EXISTS "Allow users to delete their own pending post flags" ON public.post_flags;
CREATE POLICY "Allow users to delete their own pending post flags"
ON public.post_flags
FOR DELETE
TO authenticated
USING (auth.uid() = user_id AND status = 'pending_review');

-- Admins can manage all post flags
DROP POLICY IF EXISTS "Allow admins to manage all post flags" ON public.post_flags;
CREATE POLICY "Allow admins to manage all post flags"
ON public.post_flags
FOR ALL -- SELECT, INSERT, UPDATE, DELETE
TO authenticated
USING (internal.is_admin(auth.uid()))
WITH CHECK (internal.is_admin(auth.uid()));


-- 6. RLS Policies for comment_flags

-- Allow users to insert a flag for a comment
DROP POLICY IF EXISTS "Allow users to insert their own comment flags" ON public.comment_flags;
CREATE POLICY "Allow users to insert their own comment flags"
ON public.comment_flags
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow users to see their own submitted flags
DROP POLICY IF EXISTS "Allow users to select their own comment flags" ON public.comment_flags;
CREATE POLICY "Allow users to select their own comment flags"
ON public.comment_flags
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Allow users to update the reason for their own PENDING flags
DROP POLICY IF EXISTS "Allow users to update reason on their own pending comment flags" ON public.comment_flags;
CREATE POLICY "Allow users to update reason on their own pending comment flags"
ON public.comment_flags
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id AND status = 'pending_review')
WITH CHECK (auth.uid() = user_id AND status = 'pending_review');

-- Allow users to delete their own PENDING flags (retract a flag)
DROP POLICY IF EXISTS "Allow users to delete their own pending comment flags" ON public.comment_flags;
CREATE POLICY "Allow users to delete their own pending comment flags"
ON public.comment_flags
FOR DELETE
TO authenticated
USING (auth.uid() = user_id AND status = 'pending_review');

-- Admins can manage all comment flags
DROP POLICY IF EXISTS "Allow admins to manage all comment flags" ON public.comment_flags;
CREATE POLICY "Allow admins to manage all comment flags"
ON public.comment_flags
FOR ALL -- SELECT, INSERT, UPDATE, DELETE
TO authenticated
USING (internal.is_admin(auth.uid()))
WITH CHECK (internal.is_admin(auth.uid()));

-- Grants for usage (authenticated role should be sufficient due to RLS)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.post_flags TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comment_flags TO authenticated;
GRANT USAGE ON TYPE public.flag_status_enum TO authenticated;

COMMENT ON POLICY "Allow users to update reason on their own pending post flags" ON public.post_flags IS 'Users can update the reason of their post flags only if status is pending_review. Actual column restrictions done at application/RPC level if needed beyond this.';
COMMENT ON POLICY "Allow users to update reason on their own pending comment flags" ON public.comment_flags IS 'Users can update the reason of their comment flags only if status is pending_review. Actual column restrictions done at application/RPC level if needed beyond this.'; 