-- Migration: Update public.send_message to require users to be connected

DROP FUNCTION IF EXISTS public.send_message(UUID, TEXT);

CREATE OR REPLACE FUNCTION public.send_message(
    p_receiver_id UUID,
    p_content TEXT
)
RETURNS public.messages -- Returns the newly created message row
LANGUAGE plpgsql
SECURITY DEFINER -- Allows setting sender_id to auth.uid() and checking receiver profile status
SET search_path = public, internal -- Ensure 'internal' is in search_path
AS $$
DECLARE
    v_sender_id UUID := auth.uid();
    v_new_message public.messages;
BEGIN
    IF v_sender_id = p_receiver_id THEN
        RAISE EXCEPTION 'Cannot send a message to yourself.';
    END IF;

    IF p_content IS NULL OR trim(p_content) = '' THEN
        RAISE EXCEPTION 'Message content cannot be empty.';
    END IF;

    -- Check if receiver profile exists and is active
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = p_receiver_id AND status = 'active'
    ) THEN
        RAISE EXCEPTION 'Receiver profile not found or is not active.';
    END IF;

    -- Check if sender profile is active
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = v_sender_id AND status = 'active'
    ) THEN
        RAISE EXCEPTION 'Sender profile is not active.';
    END IF;

    -- Check if users are connected before allowing messaging
    IF NOT internal.are_users_connected(v_sender_id, p_receiver_id) THEN
        RAISE EXCEPTION 'You must be connected with the user to send a message.';
    END IF;

    INSERT INTO public.messages (sender_id, receiver_id, content, is_system_message, read)
    VALUES (v_sender_id, p_receiver_id, p_content, FALSE, FALSE)
    RETURNING * INTO v_new_message;

    RETURN v_new_message;
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_message(UUID, TEXT) TO authenticated;

COMMENT ON FUNCTION public.send_message(UUID, TEXT)
IS 'Allows an authenticated user to send a message to another active user, provided they are connected. Returns the created message.';

DO $$ BEGIN
  RAISE NOTICE 'RPC function send_message updated to require connection and granted.';
END $$; 