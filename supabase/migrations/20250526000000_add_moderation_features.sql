-- Migration to add moderation features: new statuses, admin action log, and RLS updates.

BEGIN;

-- 1. Create new ENUM types

-- content_status_enum is now created in 20250520000000_create_posts_table.sql
-- CREATE TYPE public.content_status_enum AS ENUM (
--     'visible',
--     'removed_by_admin'
-- );
-- COMMENT ON TYPE public.content_status_enum IS 'Status of user-generated content like posts and comments.';

CREATE TYPE public.profile_status_enum AS ENUM (
    'active',
    'warned',
    'banned_temporarily',
    'banned_permanently'
);
COMMENT ON TYPE public.profile_status_enum IS 'Status of a user profile regarding moderation.';

CREATE TYPE public.admin_action_type_enum AS ENUM (
    'content_removed_post',
    'content_removed_comment',
    'user_warned',
    'user_banned_temporarily',
    'user_banned_permanently',
    'flag_status_changed', -- For general flag status updates not covered by specific actions
    'user_unbanned',       -- Future use
    'user_warning_cleared' -- Future use
);
COMMENT ON TYPE public.admin_action_type_enum IS 'Type of action performed by an administrator.';

CREATE TYPE public.admin_action_target_type_enum AS ENUM (
    'post',
    'comment',
    'profile',
    'flag'
);
COMMENT ON TYPE public.admin_action_target_type_enum IS 'The type of entity targeted by an admin action.';

-- 2. Add columns to existing tables

-- The 'status' column is now added to public.posts in 20250520000000_create_posts_table.sql
-- ALTER TABLE public.posts
-- ADD COLUMN IF NOT EXISTS status public.content_status_enum NOT NULL DEFAULT 'visible';
-- COMMENT ON COLUMN public.posts.status IS 'Moderation status of the post.';

ALTER TABLE public.post_comments
ADD COLUMN IF NOT EXISTS status public.content_status_enum NOT NULL DEFAULT 'visible';
COMMENT ON COLUMN public.post_comments.status IS 'Moderation status of the comment.';

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS status public.profile_status_enum NOT NULL DEFAULT 'active',
ADD COLUMN IF NOT EXISTS ban_expires_at TIMESTAMPTZ NULL,
ADD COLUMN IF NOT EXISTS last_warning_at TIMESTAMPTZ NULL;
COMMENT ON COLUMN public.profiles.status IS 'Moderation status of the user profile.';
COMMENT ON COLUMN public.profiles.ban_expires_at IS 'Timestamp when a temporary ban on the user expires.';
COMMENT ON COLUMN public.profiles.last_warning_at IS 'Timestamp of the last warning issued to the user.';

-- 3. Create admin_actions_log table

CREATE TABLE IF NOT EXISTS public.admin_actions_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL, -- Admin who performed the action
    action_type public.admin_action_type_enum NOT NULL,
    target_profile_id UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL, -- User profile affected or author of content
    target_content_id UUID NULL, -- ID of the post, comment, or flag that was actioned
    target_content_type public.admin_action_target_type_enum NULL, -- Type of content actioned (post, comment, profile, flag)
    reason_notes TEXT NULL, -- Admin's justification or notes for this action
    details JSONB NULL, -- Additional details, e.g., { "related_flag_id": "uuid", "ban_duration_days": 30 }
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.admin_actions_log IS 'Audit trail for actions performed by administrators.';
COMMENT ON COLUMN public.admin_actions_log.admin_user_id IS 'The administrator who performed the action.';
COMMENT ON COLUMN public.admin_actions_log.action_type IS 'The type of moderation action taken.';
COMMENT ON COLUMN public.admin_actions_log.target_profile_id IS 'The user profile that was the target of the action or the author of targeted content.';
COMMENT ON COLUMN public.admin_actions_log.target_content_id IS 'The ID of the specific content (post, comment, flag) or profile targeted.';
COMMENT ON COLUMN public.admin_actions_log.target_content_type IS 'The type of the targeted content or entity.';
COMMENT ON COLUMN public.admin_actions_log.reason_notes IS 'Notes or justification provided by the admin for the action.';
COMMENT ON COLUMN public.admin_actions_log.details IS 'A JSONB field for storing additional structured details about the action.';

CREATE INDEX IF NOT EXISTS idx_admin_actions_log_admin_user_id ON public.admin_actions_log(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_log_action_type ON public.admin_actions_log(action_type);
CREATE INDEX IF NOT EXISTS idx_admin_actions_log_target_profile_id ON public.admin_actions_log(target_profile_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_log_target_content_type_id ON public.admin_actions_log(target_content_type, target_content_id);

-- 4. RLS Updates for content creation/modification by banned users

-- Ensure internal.is_profile_banned function (or similar check) - for now, directly check profile status
-- We will assume admins are handled by their existing broad RLS policies.

-- For public.posts
-- RLS for insert and update on public.posts are now handled in 20250520000000_create_posts_table.sql
-- and will be updated here for ban checks

-- Allow insert if user is not banned (original policy in create_posts_table allows insert by owner)
DROP POLICY IF EXISTS "Allow users to create their own posts" ON public.posts;
CREATE POLICY "Allow authenticated user to insert posts if not banned"
ON public.posts FOR INSERT TO authenticated
WITH CHECK (
    auth.uid() = user_id AND
    (SELECT status FROM public.profiles WHERE id = auth.uid()) NOT IN ('banned_temporarily', 'banned_permanently')
);

-- Allow update if user is not banned and is owner (original policy in create_posts_table allows update by owner)
DROP POLICY IF EXISTS "Allow users to update their own posts" ON public.posts;
CREATE POLICY "Allow authenticated user to update their posts if not banned"
ON public.posts FOR UPDATE TO authenticated
USING (auth.uid() = user_id AND (SELECT status FROM public.profiles WHERE id = auth.uid()) NOT IN ('banned_temporarily', 'banned_permanently'))
WITH CHECK (auth.uid() = user_id);

-- Existing delete policy for posts (owner can delete) should be fine, but let's ensure it doesn't conflict or also add ban check if desired.
-- For now, assume banned users *can* still delete their own content if RLS allows.

-- For public.post_comments
-- Allow insert if user is not banned
DROP POLICY IF EXISTS "Allow authenticated user to insert comments if not banned" ON public.post_comments;
CREATE POLICY "Allow authenticated user to insert comments if not banned"
ON public.post_comments FOR INSERT TO authenticated
WITH CHECK (
    auth.uid() = user_id AND
    (SELECT status FROM public.profiles WHERE id = auth.uid()) NOT IN ('banned_temporarily', 'banned_permanently')
);

-- Allow update if user is not banned and is owner
DROP POLICY IF EXISTS "Allow authenticated user to update their comments if not banned" ON public.post_comments;
CREATE POLICY "Allow authenticated user to update their comments if not banned"
ON public.post_comments FOR UPDATE TO authenticated
USING (auth.uid() = user_id AND (SELECT status FROM public.profiles WHERE id = auth.uid()) NOT IN ('banned_temporarily', 'banned_permanently'))
WITH CHECK (auth.uid() = user_id);

-- Note: Existing admin RLS policies on posts, post_comments, post_flags, comment_flags that use internal.is_admin() 
-- will grant admins the necessary permissions to bypass these user-specific ban checks for management.

-- Grant usage on new types
-- GRANT USAGE ON TYPE public.content_status_enum TO authenticated, anon; -- Moved to 20250520000000_create_posts_table.sql
GRANT USAGE ON TYPE public.profile_status_enum TO authenticated, anon;
GRANT USAGE ON TYPE public.admin_action_type_enum TO authenticated, anon;
GRANT USAGE ON TYPE public.admin_action_target_type_enum TO authenticated, anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_actions_log TO authenticated; -- Admins will interact via RPCs mostly

COMMIT; 