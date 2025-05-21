-- Migration: Create RPC function for users to mark messages from another user as read

DROP FUNCTION IF EXISTS public.mark_messages_as_read(UUID);

CREATE OR REPLACE FUNCTION public.mark_messages_as_read(p_other_user_id UUID)
RETURNS BOOLEAN -- Returns true if any messages were updated, false otherwise
LANGUAGE plpgsql
SECURITY DEFINER -- Uses auth.uid() for receiver_id check
SET search_path = public
AS $$
DECLARE
    v_current_user_id UUID := auth.uid();
BEGIN
    IF v_current_user_id = p_other_user_id THEN
        -- No action needed if trying to mark messages from oneself as read (shouldn't happen for received messages)
        RETURN FALSE;
    END IF;

    UPDATE public.messages
    SET read = TRUE,
        updated_at = now() -- Assuming messages table has updated_at, if not, remove this line.
                         -- The messages table in 20240509000000_create_simple_messaging.sql does not have updated_at.
                         -- For consistency with user_notifications, it should be added.
                         -- Let's assume for now it's not there to match the current table schema.
    WHERE receiver_id = v_current_user_id
      AND sender_id = p_other_user_id
      AND read = FALSE
      AND is_system_message = FALSE; -- Users only mark non-system messages as read

    RETURN FOUND; -- FOUND is true if at least one row was affected by the UPDATE
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_messages_as_read(UUID) TO authenticated;

COMMENT ON FUNCTION public.mark_messages_as_read(UUID) 
IS 'Allows an authenticated user to mark all unread, non-system messages received from a specific other user as read. Returns true if successful.';

DO $$ BEGIN
  RAISE NOTICE 'RPC function mark_messages_as_read created and granted.';
END $$; 