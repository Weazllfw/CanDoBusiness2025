-- supabase/migrations/YYYYMMDDHHMMSS_create_simple_messaging.sql

-- 1. Create Messages Table
DROP TABLE IF EXISTS public.messages CASCADE;
CREATE TABLE public.messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    receiver_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content text NOT NULL,
    read boolean DEFAULT false NOT NULL,
    is_system_message BOOLEAN DEFAULT FALSE
);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Add indexes for performance
DROP INDEX IF EXISTS messages_sender_id_idx;
CREATE INDEX IF NOT EXISTS messages_sender_id_idx ON public.messages(sender_id);
DROP INDEX IF EXISTS messages_receiver_id_idx;
CREATE INDEX IF NOT EXISTS messages_receiver_id_idx ON public.messages(receiver_id);
DROP INDEX IF EXISTS messages_created_at_idx;
CREATE INDEX IF NOT EXISTS messages_created_at_idx ON public.messages(created_at DESC);

-- 2. RLS Policies for Messages
DROP POLICY IF EXISTS "Users can view their own messages" ON public.messages;
CREATE POLICY "Users can view their own messages" 
ON public.messages FOR SELECT
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Drop the old policy first if it exists to avoid conflicts
DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
-- Drop the potentially renamed policy if it exists to avoid conflicts before recreating the current one
DROP POLICY IF EXISTS "Users or System can send messages" ON public.messages;

-- Allow users to send messages as themselves, OR allow the system user to send messages.
CREATE POLICY "Users or System can send messages" 
ON public.messages FOR INSERT
WITH CHECK (
  (auth.uid() = sender_id AND is_system_message = FALSE) OR
  (
    -- For SECURITY DEFINER functions (like triggers or admin RPCs running as postgres/admin)
    -- that insert system messages. The sender_id must be the system admin profile.
    is_system_message = TRUE AND
    EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE public.profiles.id = sender_id AND public.profiles.email = 'rmarshall@itmarshall.net'
    )
  )
);

DROP POLICY IF EXISTS "Users can mark their received messages as read" ON public.messages;
CREATE POLICY "Users can mark their received messages as read" 
ON public.messages FOR UPDATE
USING (auth.uid() = receiver_id)
WITH CHECK (auth.uid() = receiver_id AND read = true AND is_system_message = FALSE);

-- 3. Create Message View (joining with profiles)
CREATE OR REPLACE VIEW public.message_view AS
SELECT
    m.id,
    m.created_at,
    m.content,
    m.sender_id,
    m.receiver_id,
    m.read,
    sender_profile.name AS sender_name,
    sender_profile.avatar_url AS sender_avatar,
    receiver_profile.name AS receiver_name,
    receiver_profile.avatar_url AS receiver_avatar
FROM
    public.messages m
JOIN
    public.profiles sender_profile ON m.sender_id = sender_profile.id
JOIN
    public.profiles receiver_profile ON m.receiver_id = receiver_profile.id;

-- 4. Create Get Conversations Function
-- DROP FUNCTION IF EXISTS public.get_conversations(uuid); -- Keep if signature changes
CREATE OR REPLACE FUNCTION public.get_conversations() -- Removed p_current_user_id parameter
RETURNS TABLE(
    other_user_id uuid,
    other_user_name text,
    other_user_avatar text,
    last_message_id uuid,
    last_message_content text,
    last_message_at timestamp with time zone,
    last_message_sender_id uuid,
    unread_count bigint
)
LANGUAGE plpgsql -- Ensure this is plpgsql
SECURITY INVOKER 
AS $$
BEGIN -- Ensure BEGIN is present
    RETURN QUERY
    WITH ranked_messages AS (
        SELECT
            m.id,
            m.created_at,
            m.content,
            m.sender_id,
            m.receiver_id,
            m.read,
            CASE
                WHEN m.sender_id = auth.uid() THEN m.receiver_id -- Ensure auth.uid() is used
                ELSE m.sender_id
            END AS other_user_id,
            ROW_NUMBER() OVER (PARTITION BY CASE WHEN m.sender_id = auth.uid() THEN m.receiver_id ELSE m.sender_id END ORDER BY m.created_at DESC) as rn
        FROM
            public.messages m
        WHERE
            (m.sender_id = auth.uid() OR m.receiver_id = auth.uid()) -- Ensure auth.uid() is used
            AND m.is_system_message = FALSE -- Exclude system messages from user conversations
    )
    SELECT
        rm.other_user_id,
        p.name AS other_user_name,
        p.avatar_url AS other_user_avatar,
        rm.id AS last_message_id,
        rm.content AS last_message_content,
        rm.created_at AS last_message_at,
        rm.sender_id AS last_message_sender_id,
        (SELECT COUNT(*) FROM public.messages unread_m 
            WHERE unread_m.receiver_id = auth.uid() -- Ensure auth.uid() is used
            AND unread_m.sender_id = rm.other_user_id 
            AND unread_m.read = false
            AND unread_m.is_system_message = FALSE) AS unread_count
    FROM
        ranked_messages rm
    JOIN
        public.profiles p ON rm.other_user_id = p.id
    WHERE
        rm.rn = 1
    ORDER BY
        rm.created_at DESC;
END; -- Ensure END is present
$$; 