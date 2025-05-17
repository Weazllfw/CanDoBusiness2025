-- Migration to create user_notifications table and related types

BEGIN;

-- 1. Create notification_type ENUM
CREATE TYPE public.notification_type_enum AS ENUM (
    'system_alert',         -- General system announcements or alerts
    'content_moderation',   -- Warnings, content removals, bans
    'new_message_summary',  -- Future: e.g., "You have 3 unread messages"
    'connection_request',   -- Future: e.g., "X wants to connect with you"
    'rfq_update',           -- Future: Updates related to RFQs
    'default'               -- A generic default type
);

COMMENT ON TYPE public.notification_type_enum IS 'Categorizes different types of user notifications.';

-- 2. Create user_notifications table
CREATE TABLE IF NOT EXISTS public.user_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    link_to TEXT NULL, -- Optional URL path for navigation
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    notification_type public.notification_type_enum NOT NULL DEFAULT 'default',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT message_length_check CHECK (char_length(message) > 0),
    CONSTRAINT title_length_check CHECK (char_length(title) > 0)
);

COMMENT ON TABLE public.user_notifications IS 'Stores individual notifications for users.';
COMMENT ON COLUMN public.user_notifications.user_id IS 'The user who will receive this notification.';
COMMENT ON COLUMN public.user_notifications.title IS 'A short title for the notification.';
COMMENT ON COLUMN public.user_notifications.message IS 'The main content of the notification.';
COMMENT ON COLUMN public.user_notifications.link_to IS 'An optional relative path for the notification to link to upon click.';
COMMENT ON COLUMN public.user_notifications.is_read IS 'True if the user has marked the notification as read.';
COMMENT ON COLUMN public.user_notifications.notification_type IS 'The category of the notification.';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id_is_read ON public.user_notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id_created_at ON public.user_notifications(user_id, created_at DESC);

-- RLS Policies
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

-- Users can read their own notifications
DROP POLICY IF EXISTS "Users can read their own notifications" ON public.user_notifications;
CREATE POLICY "Users can read their own notifications"
ON public.user_notifications FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can update the is_read status of their own notifications (via RPC is safer)
-- For now, allowing direct update of is_read. RPC will be preferred method.
DROP POLICY IF EXISTS "Users can mark their own notifications as read/unread" ON public.user_notifications;
CREATE POLICY "Users can mark their own notifications as read/unread"
ON public.user_notifications FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id AND (NOT is_read OR is_read)); -- Allows only is_read to be changed by owner

-- No direct insert/delete for users; these will be system-generated or via specific actions.
-- Service role or specific RPCs will handle inserts.

-- Trigger for updated_at
-- Assuming public.handle_updated_at() function exists from previous migrations
DROP TRIGGER IF EXISTS handle_user_notifications_updated_at ON public.user_notifications;
CREATE TRIGGER handle_user_notifications_updated_at
BEFORE UPDATE ON public.user_notifications
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Grant usage on the enum type
GRANT USAGE ON TYPE public.notification_type_enum TO authenticated, anon;

COMMIT; 